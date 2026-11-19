import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const AUTH_STORAGE_KEY = '@offdp_authenticated_user_v2';
const USERS_STORAGE_KEY = '@offdp_registered_users_v2';
const REMEMBER_ME_KEY = '@offdp_remember_me_v2';

export const DEFAULT_SUPERVISOR: User = {
  id: 'user-narayan-001',
  username: 'narayan',
  password: 'admin',
  name: 'Narayan Chetri',
  role: 'supervisor',
  email: 'narayan@tezu.ac.in',
  cachedOffline: true,
  token: 'jwt_offline_narayan_admin_sec',
  createdAt: '2026-11-01T00:00:00Z',
};

export class AuthService {
  // Sync users between Supabase (online) and AsyncStorage (offline cache)
  static async getUsers(): Promise<User[]> {
    let localUsers: User[] = [];
    try {
      const data = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      localUsers = data ? JSON.parse(data) : [DEFAULT_SUPERVISOR];
    } catch {
      localUsers = [DEFAULT_SUPERVISOR];
    }

    // Always ensure default supervisor exists in local store
    if (!localUsers.some((u) => u.username.toLowerCase() === 'narayan')) {
      localUsers.unshift(DEFAULT_SUPERVISOR);
    }

    // If Supabase is connected, perform 2-way sync with cloud!
    if (isSupabaseConfigured()) {
      try {
        // 1. Fetch cloud users
        const { data: cloudUsers, error } = await supabase
          .from('app_users')
          .select('*');

        if (!error && cloudUsers) {
          // 2. Upload any local users that are missing from cloud (e.g. user created on this phone before cloud table was created!)
          for (const lu of localUsers) {
            const alreadyInCloud = cloudUsers.some(
              (cu: any) => cu.username.toLowerCase() === lu.username.toLowerCase()
            );
            if (!alreadyInCloud) {
              await supabase.from('app_users').upsert({
                id: lu.id,
                username: lu.username,
                password: lu.password || 'password123',
                name: lu.name,
                role: lu.role,
                email: lu.email,
                created_at: lu.createdAt || new Date().toISOString(),
              });
              cloudUsers.push({
                id: lu.id,
                username: lu.username,
                password: lu.password || 'password123',
                name: lu.name,
                role: lu.role,
                email: lu.email,
                created_at: lu.createdAt,
              });
            }
          }

          // 3. Map all cloud users into local cache
          const mergedUsers: User[] = cloudUsers.map((cu: any) => ({
            id: cu.id,
            username: cu.username,
            password: cu.password,
            name: cu.name,
            role: cu.role as UserRole,
            email: cu.email,
            cachedOffline: true,
            token: `jwt_${cu.username}`,
            createdAt: cu.created_at,
          }));

          if (!mergedUsers.some((u) => u.username.toLowerCase() === 'narayan')) {
            mergedUsers.unshift(DEFAULT_SUPERVISOR);
          }

          await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(mergedUsers));
          return mergedUsers;
        }
      } catch (err) {
        console.warn('Cloud user sync fallback to local cache:', err);
      }
    }

    return localUsers;
  }

  // Create new user (Worker or Supervisor)
  static async createUser(userData: {
    username: string;
    password: string;
    name: string;
    role: UserRole;
    email?: string;
  }): Promise<{ success: boolean; user?: User; error?: string }> {
    const users = await this.getUsers();
    const cleanUsername = userData.username.trim().toLowerCase();

    if (!cleanUsername) {
      return { success: false, error: 'Username is required' };
    }
    if (!userData.password.trim()) {
      return { success: false, error: 'Password is required' };
    }
    if (users.some((u) => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, error: 'Username already exists' };
    }

    const newUser: User = {
      id: `user-${Date.now().toString().slice(-6)}`,
      username: cleanUsername,
      password: userData.password,
      name: userData.name.trim() || cleanUsername,
      role: userData.role,
      email: userData.email || `${cleanUsername}@field.offdp.org`,
      cachedOffline: true,
      token: `jwt_${cleanUsername}_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    // 1. Save in local cache
    users.push(newUser);
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    // 2. Push to Supabase immediately so ANY other phone can login!
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('app_users').upsert({
          id: newUser.id,
          username: newUser.username,
          password: newUser.password,
          name: newUser.name,
          role: newUser.role,
          email: newUser.email,
          created_at: newUser.createdAt,
        });

        if (error) {
          console.warn('Supabase createUser warning:', error.message);
        }
      } catch (err) {
        console.warn('Cloud user sync deferred:', err);
      }
    }

    return { success: true, user: newUser };
  }

  // Edit existing user
  static async updateUser(
    id: string,
    updates: { name?: string; password?: string; role?: UserRole; email?: string }
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    const users = await this.getUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
      return { success: false, error: 'User not found' };
    }

    const current = users[index];
    const updatedUser: User = {
      ...current,
      name: updates.name !== undefined ? updates.name.trim() : current.name,
      password: updates.password !== undefined && updates.password.trim() ? updates.password : current.password,
      role: updates.role !== undefined ? updates.role : current.role,
      email: updates.email !== undefined ? updates.email : current.email,
    };

    users[index] = updatedUser;
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    // Sync update to Supabase
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('app_users').upsert({
          id: updatedUser.id,
          username: updatedUser.username,
          password: updatedUser.password,
          name: updatedUser.name,
          role: updatedUser.role,
          email: updatedUser.email,
        });
      } catch (err) {
        console.warn('Cloud user update deferred:', err);
      }
    }

    const currentSession = await this.getCurrentUser();
    if (currentSession && currentSession.id === id) {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
    }

    return { success: true, user: updatedUser };
  }

  // Delete user
  static async deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
    const users = await this.getUsers();
    const userToDelete = users.find((u) => u.id === id);
    if (!userToDelete) {
      return { success: false, error: 'User not found' };
    }

    if (userToDelete.username === 'narayan') {
      return { success: false, error: 'The primary default supervisor "narayan" cannot be deleted' };
    }

    const filtered = users.filter((u) => u.id !== id);
    await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(filtered));

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('app_users').delete().eq('id', id);
      } catch (err) {
        console.warn('Cloud user delete deferred:', err);
      }
    }

    return { success: true };
  }

  // Login with username and password
  static async login(
    usernameInput: string,
    passwordInput: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; user?: User; error?: string }> {
    // Refresh user list from Supabase first
    const users = await this.getUsers();
    const uClean = usernameInput.trim().toLowerCase();
    const pClean = passwordInput.trim();

    const matched = users.find(
      (u) => u.username.toLowerCase() === uClean && u.password === pClean
    );

    if (!matched) {
      return { success: false, error: 'Invalid username or password' };
    }

    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(matched));
    await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
    return { success: true, user: matched };
  }

  // Get current active session
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

  // Logout
  static async logout(): Promise<void> {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }
}
