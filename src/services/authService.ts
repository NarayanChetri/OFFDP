import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { generateUUID, hashCredential } from '../utils/helpers';

const AUTH_STORAGE_KEY = '@offdp_authenticated_user_v2';
const USERS_STORAGE_KEY = '@offdp_registered_users_v3';
const CACHED_CREDENTIALS_KEY = '@offdp_cached_credentials_v1';
const REMEMBER_ME_KEY = '@offdp_remember_me_v2';

interface CachedCredential {
  user: User;
  passwordHash: string;
  cachedAt: string;
}

export class AuthService {
  private static async getCachedCredentialsMap(): Promise<Record<string, CachedCredential>> {
    try {
      const raw = await AsyncStorage.getItem(CACHED_CREDENTIALS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private static async saveCachedCredential(user: User, plainPassword: string): Promise<void> {
    const map = await this.getCachedCredentialsMap();
    const key = user.username.trim().toLowerCase();
    const safeUser: User = { ...user, password: '', cachedOffline: true };
    map[key] = {
      user: safeUser,
      passwordHash: hashCredential(plainPassword, user.id),
      cachedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(CACHED_CREDENTIALS_KEY, JSON.stringify(map));
  }

  private static async removeCachedCredential(username: string): Promise<void> {
    const map = await this.getCachedCredentialsMap();
    const key = username.trim().toLowerCase();
    if (map[key]) {
      delete map[key];
      await AsyncStorage.setItem(CACHED_CREDENTIALS_KEY, JSON.stringify(map));
    }
  }

  // Fetch user directory (passwords stripped before caching)
  static async getUsers(isOnline: boolean = true): Promise<User[]> {
    let localUsers: User[] = [];
    try {
      const data = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      localUsers = data ? JSON.parse(data) : [];
    } catch {
      localUsers = [];
    }

    if (isOnline && isSupabaseConfigured()) {
      try {
        const { data: cloudUsers, error } = await supabase
          .from('app_users')
          .select('*');

        if (!error && cloudUsers) {
          const mappedUsers: User[] = cloudUsers.map((cu: any) => ({
            id: cu.id,
            username: cu.username,
            name: cu.name,
            role: cu.role as UserRole,
            email: cu.email,
            cachedOffline: false,
            token: `jwt_${cu.username}`,
            createdAt: cu.created_at,
          }));

          await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(mappedUsers));
          return mappedUsers;
        }
      } catch (err) {
        console.warn('Cloud user fetch fallback to local cache:', err);
      }
    }

    return localUsers;
  }

  // Create new user (REQUIRES INTERNET)
  static async createUser(
    userData: {
      username: string;
      password: string;
      name: string;
      role: UserRole;
      email?: string;
    },
    isOnline: boolean
  ): Promise<{ success: boolean; user?: User; error?: string; offlineBlocked?: boolean }> {
    if (!isOnline) {
      return {
        success: false,
        offlineBlocked: true,
        error: 'Internet connection is required to create a new user account.',
      };
    }

    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Cloud backend is not configured.' };
    }

    const cleanUsername = userData.username.trim().toLowerCase();
    if (!cleanUsername) {
      return { success: false, error: 'Username is required.' };
    }
    if (!userData.password.trim()) {
      return { success: false, error: 'Password is required.' };
    }

    try {
      const { data: existing, error: checkError } = await supabase
        .from('app_users')
        .select('id')
        .ilike('username', cleanUsername)
        .limit(1);

      if (checkError) {
        return { success: false, error: checkError.message };
      }

      if (existing && existing.length > 0) {
        return { success: false, error: 'Username already exists.' };
      }

      const newUser: User = {
        id: `user-${generateUUID()}`,
        username: cleanUsername,
        name: userData.name.trim() || cleanUsername,
        role: userData.role,
        email: userData.email || `${cleanUsername}@field.offdp.org`,
        cachedOffline: false,
        token: `jwt_${cleanUsername}_${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      const { error } = await supabase.from('app_users').insert({
        id: newUser.id,
        username: newUser.username,
        password: userData.password.trim(),
        name: newUser.name,
        role: newUser.role,
        email: newUser.email,
        created_at: newUser.createdAt,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      await this.getUsers(true);
      return { success: true, user: newUser };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error while creating user. Please try again when online.',
      };
    }
  }

  // Edit existing user (REQUIRES INTERNET)
  static async updateUser(
    id: string,
    updates: { name?: string; password?: string; role?: UserRole; email?: string },
    isOnline: boolean
  ): Promise<{ success: boolean; user?: User; error?: string; offlineBlocked?: boolean }> {
    if (!isOnline) {
      return {
        success: false,
        offlineBlocked: true,
        error: 'Internet connection is required to update user accounts.',
      };
    }

    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Cloud backend is not configured.' };
    }

    try {
      const payload: Record<string, any> = {};
      if (updates.name !== undefined) payload.name = updates.name.trim();
      if (updates.password !== undefined && updates.password.trim()) {
        payload.password = updates.password.trim();
      }
      if (updates.role !== undefined) payload.role = updates.role;
      if (updates.email !== undefined) payload.email = updates.email;

      const { data, error } = await supabase
        .from('app_users')
        .update(payload)
        .eq('id', id)
        .select('*')
        .limit(1);

      if (error || !data || data.length === 0) {
        return { success: false, error: error?.message || 'User not found.' };
      }

      const row = data[0];
      const updatedUser: User = {
        id: row.id,
        username: row.username,
        name: row.name,
        role: row.role as UserRole,
        email: row.email,
        cachedOffline: true,
        token: `jwt_${row.username}`,
        createdAt: row.created_at,
      };

      if (updates.password && updates.password.trim()) {
        const creds = await this.getCachedCredentialsMap();
        if (creds[updatedUser.username.toLowerCase()]) {
          await this.saveCachedCredential(updatedUser, updates.password.trim());
        }
      }

      const currentSession = await this.getCurrentUser();
      if (currentSession && currentSession.id === id) {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      }

      await this.getUsers(true);
      return { success: true, user: updatedUser };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update user.' };
    }
  }

  // Delete user (REQUIRES INTERNET)
  static async deleteUser(
    id: string,
    isOnline: boolean
  ): Promise<{ success: boolean; error?: string; offlineBlocked?: boolean }> {
    if (!isOnline) {
      return {
        success: false,
        offlineBlocked: true,
        error: 'Internet connection is required to delete user accounts.',
      };
    }

    const users = await this.getUsers(true);
    const userToDelete = users.find((u) => u.id === id);
    if (!userToDelete) {
      return { success: false, error: 'User not found.' };
    }

    if (userToDelete.username.toLowerCase() === 'narayan') {
      return { success: false, error: 'The primary default supervisor "narayan" cannot be deleted.' };
    }

    try {
      const { error } = await supabase.from('app_users').delete().eq('id', id);
      if (error) {
        return { success: false, error: error.message };
      }

      await this.removeCachedCredential(userToDelete.username);
      await this.getUsers(true);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete user.' };
    }
  }

  /**
   * Login flow:
   * - First sign-in on a device REQUIRES internet to authenticate against Supabase.
   * - Upon successful online sign-in, caches hashed credentials locally for that user.
   * - Subsequent logins work even offline using the locally cached credentials.
   */
  static async login(
    usernameInput: string,
    passwordInput: string,
    rememberMe: boolean = true,
    isOnline: boolean = true
  ): Promise<{ success: boolean; user?: User; error?: string; requiresInternet?: boolean }> {
    const uClean = usernameInput.trim().toLowerCase();
    const pClean = passwordInput.trim();

    if (!uClean || !pClean) {
      return { success: false, error: 'Username and password are required.' };
    }

    const cachedMap = await this.getCachedCredentialsMap();
    const cachedEntry = cachedMap[uClean];

    // 1. If online, verify against Supabase so role/password updates are always respected
    if (isOnline && isSupabaseConfigured()) {
      try {
        const { data: rows, error } = await supabase
          .from('app_users')
          .select('*')
          .ilike('username', uClean)
          .limit(1);

        if (error) {
          const isNetworkErr =
            error.message?.toLowerCase().includes('fetch') ||
            error.message?.toLowerCase().includes('network');

          if (!isNetworkErr) {
            return { success: false, error: `Server error: ${error.message}` };
          }
          // If it's a real network failure, fall through to offline cache check below
        } else {
          if (!rows || rows.length === 0) {
            return { success: false, error: 'Invalid username or password.' };
          }

          const cloudUser = rows[0];
          if (cloudUser.password !== pClean) {
            return { success: false, error: 'Invalid username or password.' };
          }

          const authenticatedUser: User = {
            id: cloudUser.id,
            username: cloudUser.username,
            name: cloudUser.name,
            role: cloudUser.role as UserRole,
            email: cloudUser.email,
            cachedOffline: true,
            token: `jwt_${cloudUser.username}_${Date.now()}`,
            createdAt: cloudUser.created_at,
          };

          await this.saveCachedCredential(authenticatedUser, pClean);
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authenticatedUser));
          await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
          return { success: true, user: authenticatedUser };
        }
      } catch (err) {
        console.warn('Online auth check failed, checking local cache:', err);
      }
    }

    // 2. Offline (or network unreachable): only allow if user has already signed in online before
    if (!cachedEntry) {
      return {
        success: false,
        requiresInternet: true,
        error: isOnline
          ? 'Unable to reach the authentication server. Please check your internet connection and try again.'
          : 'Internet connection is required for your first sign-in on this device. Connect to Wi-Fi or mobile data and sign in once to enable offline access.',
      };
    }

    const inputHash = hashCredential(pClean, cachedEntry.user.id);
    if (inputHash !== cachedEntry.passwordHash) {
      return { success: false, error: 'Invalid username or password.' };
    }

    const offlineUser: User = {
      ...cachedEntry.user,
      cachedOffline: true,
    };

    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(offlineUser));
    await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
    return { success: true, user: offlineUser };
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch {
      return null;
    }
  }

  static async shouldAutoLogin(): Promise<boolean> {
    try {
      const remember = await AsyncStorage.getItem(REMEMBER_ME_KEY);
      if (remember !== 'true') return false;
      const user = await this.getCurrentUser();
      return Boolean(user);
    } catch {
      return false;
    }
  }

  static async logout(): Promise<void> {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    await AsyncStorage.setItem(REMEMBER_ME_KEY, 'false');
  }
}
