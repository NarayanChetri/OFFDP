import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';
import { AuthService } from '../services/authService';
import { User, UserRole } from '../types';

const { width } = Dimensions.get('window');

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
  isOnline: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, isOnline }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('supervisor');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setUsername('');
    setPassword('');
  };

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Sign In Error', 'Please enter your username and password.');
      return;
    }

    setLoading(true);
    const result = await AuthService.login(username, password, rememberMe, isOnline);
    setLoading(false);

    if (result.success && result.user) {
      if (result.user.role !== selectedRole) {
        Alert.alert(
          'Role Mismatch',
          `This account has the role "${result.user.role === 'supervisor' ? 'Supervisor' : 'Field Worker'}". You are signing in as "${selectedRole === 'supervisor' ? 'Supervisor' : 'Field Worker'}".`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: `Continue as ${result.user.role === 'supervisor' ? 'Supervisor' : 'Worker'}`,
              onPress: () => onLoginSuccess(result.user!),
            },
          ]
        );
        return;
      }
      onLoginSuccess(result.user);
    } else if (result.requiresInternet) {
      Alert.alert(
        'Internet Required for First Sign-In',
        result.error ||
          'An internet connection is required for your first sign-in on this device. Once signed in, your credentials are saved locally for offline access.'
      );
    } else {
      Alert.alert(
        'Authentication Failed',
        result.error || 'Invalid credentials. Please verify your username and password.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header Landscape Backdrop */}
          <View style={styles.headerHero}>
            <LinearGradient
              colors={['#371b69', '#572b99', '#8a4fe0', '#d8b4fe', '#ffffff']}
              locations={[0, 0.38, 0.72, 0.92, 1]}
              style={styles.headerGradient}
            >
              <View style={styles.headerMountainBack} />
              <View style={styles.headerMountainFront} />

              {/* Real network badge at top right */}
              <View style={styles.topStatusBadge}>
                <Ionicons
                  name={isOnline ? 'wifi' : 'cloud-offline'}
                  size={12}
                  color="#ffffff"
                />
                <Text style={styles.topStatusText}>
                  {isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>

              {/* Brand Center */}
              <View style={styles.brandContainer}>
                <View style={styles.brandIconBox}>
                  <Ionicons name="cloud-offline" size={26} color={COLORS.primary} />
                </View>
                <Text style={styles.brandTitle}>OFFDP</Text>
                <Text style={styles.brandSubtitle}>Offline-First Field Data Platform</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Form Card */}
          <View style={styles.formContainer}>
            {/* Modern Role Switcher Pill Tabs */}
            <View style={styles.roleTabsContainer}>
              <TouchableOpacity
                style={[
                  styles.roleTab,
                  selectedRole === 'field_worker' && styles.roleTabActive,
                ]}
                onPress={() => handleRoleSelect('field_worker')}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="construct"
                  size={16}
                  color={selectedRole === 'field_worker' ? '#ffffff' : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.roleTabText,
                    selectedRole === 'field_worker' && styles.roleTabTextActive,
                  ]}
                >
                  Field Worker
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleTab,
                  selectedRole === 'supervisor' && styles.roleTabActive,
                ]}
                onPress={() => handleRoleSelect('supervisor')}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={selectedRole === 'supervisor' ? '#ffffff' : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.roleTabText,
                    selectedRole === 'supervisor' && styles.roleTabTextActive,
                  ]}
                >
                  Supervisor
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.formInstruction}>
              Sign in to your {selectedRole === 'supervisor' ? 'Supervisor' : 'Field Worker'} account
            </Text>

            {/* Username Field */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconBox}>
                <Ionicons
                  name={selectedRole === 'supervisor' ? 'shield-outline' : 'person-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </View>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder={
                  selectedRole === 'supervisor'
                    ? 'Supervisor ID / Username'
                    : 'Worker ID / Username'
                }
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputWrapper}>
              <View style={styles.inputIconBox}>
                <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeIconBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              <Text style={styles.loginBtnText}>
                {loading ? 'Authenticating...' : `Sign In as ${selectedRole === 'supervisor' ? 'Supervisor' : 'Worker'}`}
              </Text>
            </TouchableOpacity>

            {/* Remember Me Checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkboxBox, rememberMe && styles.checkboxActive]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>Remember me on this device (offline cache)</Text>
            </TouchableOpacity>

            {/* Offline Login Notice Card */}
            <View style={styles.offlineNoticeBox}>
              <Ionicons name="shield-checkmark" size={18} color="#15803d" />
              <Text style={styles.offlineNoticeText}>
                First sign-in requires internet to verify your account. After that, your credentials are cached locally for instant offline sign-in.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerHero: {
    height: 250,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
  },
  topStatusBadge: {
    position: 'absolute',
    top: 24,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 14,
  },
  topStatusText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  headerMountainBack: {
    position: 'absolute',
    bottom: 0,
    left: -40,
    width: width + 80,
    height: 120,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderTopLeftRadius: 160,
    borderTopRightRadius: 140,
    transform: [{ rotate: '-6deg' }],
  },
  headerMountainFront: {
    position: 'absolute',
    bottom: -15,
    right: -40,
    width: width + 60,
    height: 90,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 120,
    borderTopRightRadius: 180,
    transform: [{ rotate: '4deg' }],
  },
  brandContainer: {
    alignItems: 'center',
    zIndex: 2,
    marginBottom: 10,
  },
  brandIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...SHADOWS.card,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#26124a',
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4a2e80',
    marginTop: 2,
  },
  formContainer: {
    paddingHorizontal: 26,
    paddingTop: 8,
    paddingBottom: 40,
  },
  roleTabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 11,
  },
  roleTabActive: {
    backgroundColor: COLORS.primary,
    ...SHADOWS.card,
  },
  roleTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  roleTabTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  formInstruction: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 18,
    textAlign: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    marginBottom: 16,
    height: 52,
    paddingHorizontal: 14,
  },
  inputIconBox: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    height: '100%',
  },
  eyeIconBtn: {
    padding: 6,
  },
  loginBtn: {
    backgroundColor: COLORS.primary,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 18,
    ...SHADOWS.card,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.8,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  offlineNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  offlineNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#15803d',
    fontWeight: '500',
    lineHeight: 17,
  },
});
