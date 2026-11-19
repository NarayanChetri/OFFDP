import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ScreenName, User } from '../types';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(width * 0.82, 340);

interface NavigationDrawerProps {
  visible: boolean;
  currentScreen: ScreenName;
  user: User | null;
  isOnline: boolean;
  onSelectScreen: (screen: ScreenName) => void;
  onClose: () => void;
  onLogout: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  visible,
  currentScreen,
  user,
  isOnline,
  onSelectScreen,
  onClose,
  onLogout,
}) => {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const navigateTo = (screen: ScreenName) => {
    handleClose();
    setTimeout(() => {
      onSelectScreen(screen);
    }, 150);
  };

  if (!visible) return null;

  const isSupervisor = user?.role === 'supervisor';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.drawerContainer,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <SafeAreaView style={styles.drawerContent}>
            {/* Header: User Profile & App Info */}
            <View style={styles.drawerHeader}>
              <View style={styles.brandRow}>
                <View style={styles.logoCircle}>
                  <Ionicons name="shield-checkmark" size={20} color="#ffffff" />
                </View>
                <View>
                  <Text style={styles.appTitle}>OFFDP</Text>
                  <Text style={styles.appSubtitle}>Field Data Platform</Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {user && (
                <View style={styles.userCard}>
                  <View style={styles.userAvatar}>
                    <Ionicons
                      name={isSupervisor ? 'shield-checkmark' : 'person'}
                      size={20}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {user.name}
                    </Text>
                    <Text style={styles.userHandle}>@{user.username}</Text>
                  </View>
                  <View style={[styles.roleBadge, isSupervisor ? styles.roleSupervisor : styles.roleWorker]}>
                    <Text style={styles.roleBadgeText}>
                      {isSupervisor ? 'Supervisor' : 'Field Worker'}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.networkStatusRow}>
                <View
                  style={[
                    styles.statusIndicator,
                    { backgroundColor: isOnline ? '#22c55e' : '#ef4444' },
                  ]}
                />
                <Text style={styles.statusText}>
                  {isOnline ? 'Online • Supabase Cloud Active' : 'Offline • Local SQLite Active'}
                </Text>
              </View>
            </View>

            {/* Navigation Menu Items — STRICT ROLE-BASED ACCESS */}
            <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sectionHeading}>
                {isSupervisor ? 'SUPERVISOR PORTAL' : 'FIELD WORKER PORTAL'}
              </Text>

              {/* 1. Dashboard (For everyone) */}
              <TouchableOpacity
                style={[styles.menuItem, currentScreen === 'Dashboard' && styles.menuItemActive]}
                onPress={() => navigateTo('Dashboard')}
              >
                <Ionicons
                  name="grid-outline"
                  size={20}
                  color={currentScreen === 'Dashboard' ? COLORS.primary : COLORS.textPrimary}
                />
                <Text style={[styles.menuItemText, currentScreen === 'Dashboard' && styles.menuItemTextActive]}>
                  Dashboard
                </Text>
              </TouchableOpacity>

              {/* WORKER-ONLY OPTIONS */}
              {!isSupervisor && (
                <>
                  <TouchableOpacity
                    style={[styles.menuItem, currentScreen === 'DataCollection' && styles.menuItemActive]}
                    onPress={() => navigateTo('DataCollection')}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color={currentScreen === 'DataCollection' ? COLORS.primary : COLORS.textPrimary}
                    />
                    <Text style={[styles.menuItemText, currentScreen === 'DataCollection' && styles.menuItemTextActive]}>
                      New Field Entry
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuItem, currentScreen === 'MyRecords' && styles.menuItemActive]}
                    onPress={() => navigateTo('MyRecords')}
                  >
                    <Ionicons
                      name="list-outline"
                      size={20}
                      color={currentScreen === 'MyRecords' ? COLORS.primary : COLORS.textPrimary}
                    />
                    <Text style={[styles.menuItemText, currentScreen === 'MyRecords' && styles.menuItemTextActive]}>
                      My Field Records
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuItem, currentScreen === 'SyncQueue' && styles.menuItemActive]}
                    onPress={() => navigateTo('SyncQueue')}
                  >
                    <Ionicons
                      name="cloud-upload-outline"
                      size={20}
                      color={currentScreen === 'SyncQueue' ? COLORS.primary : COLORS.textPrimary}
                    />
                    <Text style={[styles.menuItemText, currentScreen === 'SyncQueue' && styles.menuItemTextActive]}>
                      Synchronization & Queue
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* SUPERVISOR-ONLY OPTIONS */}
              {isSupervisor && (
                <>
                  <TouchableOpacity
                    style={[styles.menuItem, currentScreen === 'SupervisorReview' && styles.menuItemActive]}
                    onPress={() => navigateTo('SupervisorReview')}
                  >
                    <Ionicons
                      name="clipboard-outline"
                      size={20}
                      color={currentScreen === 'SupervisorReview' ? COLORS.primary : COLORS.textPrimary}
                    />
                    <Text style={[styles.menuItemText, currentScreen === 'SupervisorReview' && styles.menuItemTextActive]}>
                      Review Submissions
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuItem, currentScreen === 'AllRecords' && styles.menuItemActive]}
                    onPress={() => navigateTo('AllRecords')}
                  >
                    <Ionicons
                      name="file-tray-full-outline"
                      size={20}
                      color={currentScreen === 'AllRecords' ? COLORS.primary : COLORS.textPrimary}
                    />
                    <Text style={[styles.menuItemText, currentScreen === 'AllRecords' && styles.menuItemTextActive]}>
                      All Master Census Data
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.menuItem, currentScreen === 'UserManagement' && styles.menuItemActive]}
                    onPress={() => navigateTo('UserManagement')}
                  >
                    <Ionicons
                      name="people-outline"
                      size={20}
                      color={currentScreen === 'UserManagement' ? COLORS.primary : COLORS.textPrimary}
                    />
                    <Text style={[styles.menuItemText, currentScreen === 'UserManagement' && styles.menuItemTextActive]}>
                      User Management
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.menuDivider} />
            </ScrollView>

            {/* Logout Footer */}
            <View style={styles.drawerFooter}>
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() => {
                  handleClose();
                  setTimeout(onLogout, 200);
                }}
              >
                <Ionicons name="log-out-outline" size={20} color="#dc2626" />
                <Text style={styles.logoutBtnText}>Sign Out</Text>
              </TouchableOpacity>
              <Text style={styles.versionText}>OFFDP Enterprise Mobile v1.0</Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  drawerContainer: {
    width: DRAWER_WIDTH,
    backgroundColor: '#ffffff',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  drawerContent: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  drawerHeader: {
    backgroundColor: COLORS.primaryDark,
    paddingTop: 24,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  appSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  closeBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  userHandle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  roleSupervisor: {
    backgroundColor: '#fef08a',
  },
  roleWorker: {
    backgroundColor: '#bbf7d0',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1a1a2e',
  },
  networkStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  menuScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: COLORS.primarySoft,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  menuItemTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 12,
  },
  drawerFooter: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  versionText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 8,
  },
});
