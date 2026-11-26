import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { User, FieldRecord, SyncQueueItem } from '../types';

const { width } = Dimensions.get('window');

interface DashboardScreenProps {
  user: User;
  records: FieldRecord[];
  syncQueue: SyncQueueItem[];
  lastSyncTime: string;
  isOnline: boolean;
  onOpenMenu: () => void;
  onRefresh?: () => Promise<void>;
  onNavigateNewEntry: () => void;
  onNavigateMyRecords: () => void;
  onNavigateSyncQueue: () => void;
  onNavigateUserManagement: () => void;
  onNavigateSupervisorReview: () => void;
  onNavigateAllRecords: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  user,
  records,
  syncQueue,
  lastSyncTime,
  isOnline,
  onOpenMenu,
  onRefresh,
  onNavigateNewEntry,
  onNavigateMyRecords,
  onNavigateSyncQueue,
  onNavigateUserManagement,
  onNavigateSupervisorReview,
  onNavigateAllRecords,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isSupervisor = user.role === 'supervisor';
  const pendingSyncCount = syncQueue.filter(
    (q) => q.status === 'pending' || q.status === 'failed'
  ).length;

  // Supervisor metrics
  const pendingReviewCount = records.filter(
    (r) => r.status === 'submitted' || r.status === 'pending' || r.status === 'synced'
  ).length;
  const approvedCount = records.filter((r) => r.status === 'approved').length;

  const handlePullRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title="OFFDP"
        showBack={false}
        onOpenMenu={onOpenMenu}
        isOnline={isOnline}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handlePullRefresh}
            colors={['#7c3aed']}
            tintColor="#7c3aed"
          />
        }
      >
        {/* COMPACT CLEAN HEADER (Requirement 8) */}
        <View style={styles.compactHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userNameText}>{user.name}</Text>
          </View>
          <View
            style={[
              styles.roleBadgeCompact,
              isSupervisor ? styles.roleBadgeSupervisor : styles.roleBadgeWorker,
            ]}
          >
            <Ionicons
              name={isSupervisor ? 'shield-checkmark' : 'person'}
              size={14}
              color={isSupervisor ? '#7c3aed' : '#2563eb'}
            />
            <Text
              style={[
                styles.roleBadgeText,
                isSupervisor ? { color: '#7c3aed' } : { color: '#2563eb' },
              ]}
            >
              {isSupervisor ? 'Supervisor' : 'Field Worker'}
            </Text>
          </View>
        </View>

        {/* 2x2 ACTION TILES GRID */}
        {isSupervisor ? (
          /* ================= SUPERVISOR TILES ================= */
          <View style={styles.gridContainer}>
            {/* Tile 1: Review Submissions */}
            <TouchableOpacity
              style={styles.gridCard}
              onPress={onNavigateSupervisorReview}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: '#7c3aed' }]}>
                <Ionicons name="clipboard" size={24} color="#ffffff" />
              </View>
              <Text style={styles.tileTitle}>Review Surveys</Text>
              <Text style={[styles.tileSubtitle, { color: pendingReviewCount > 0 ? '#7c3aed' : COLORS.textSecondary, fontWeight: '700' }]}>
                {pendingReviewCount} To Verify
              </Text>
              {pendingReviewCount > 0 && (
                <View style={styles.tileNotificationDot} />
              )}
            </TouchableOpacity>

            {/* Tile 2: Approved Archive */}
            <TouchableOpacity
              style={styles.gridCard}
              onPress={onNavigateSupervisorReview}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: '#16a34a' }]}>
                <Ionicons name="checkmark-done" size={24} color="#ffffff" />
              </View>
              <Text style={styles.tileTitle}>Approved Data</Text>
              <Text style={styles.tileSubtitle}>
                {approvedCount} Verified
              </Text>
            </TouchableOpacity>

            {/* Tile 3: All Master Census Records (Replaced Conflict Resolution - Requirement 5) */}
            <TouchableOpacity
              style={styles.gridCard}
              onPress={onNavigateAllRecords}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: '#0284c7' }]}>
                <Ionicons name="file-tray-full" size={22} color="#ffffff" />
              </View>
              <Text style={styles.tileTitle}>All Census Data</Text>
              <Text style={styles.tileSubtitle}>
                {records.length} Master Records
              </Text>
            </TouchableOpacity>

            {/* Tile 4: User Management */}
            <TouchableOpacity
              style={styles.gridCard}
              onPress={onNavigateUserManagement}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: '#6366f1' }]}>
                <Ionicons name="people" size={22} color="#ffffff" />
              </View>
              <Text style={styles.tileTitle}>User Management</Text>
              <Text style={styles.tileSubtitle}>Surveyor Accounts</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ================= FIELD WORKER TILES ================= */
          <View style={styles.gridContainer}>
            {/* Tile 1: New Census Entry */}
            <TouchableOpacity
              style={styles.gridCard}
              onPress={onNavigateNewEntry}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: '#7c3aed' }]}>
                <Ionicons name="add" size={26} color="#ffffff" />
              </View>
              <Text style={styles.tileTitle}>New Census Form</Text>
              <Text style={styles.tileSubtitle}>Survey Household</Text>
            </TouchableOpacity>

            {/* Tile 2: My Records */}
            <TouchableOpacity
              style={styles.gridCard}
              onPress={onNavigateMyRecords}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: '#2563eb' }]}>
                <Ionicons name="list" size={22} color="#ffffff" />
              </View>
              <Text style={styles.tileTitle}>My Surveys</Text>
              <Text style={styles.tileSubtitle}>{records.length} Recorded</Text>
            </TouchableOpacity>

            {/* Tile 3: Sync */}
            <TouchableOpacity
              style={styles.gridCard}
              onPress={onNavigateSyncQueue}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: '#f97316' }]}>
                <Ionicons name="cloud-upload" size={22} color="#ffffff" />
              </View>
              <Text style={styles.tileTitle}>Cloud Sync</Text>
              <Text style={[styles.tileSubtitle, { color: pendingSyncCount > 0 ? '#ea580c' : '#16a34a', fontWeight: '700' }]}>
                Pending: {pendingSyncCount}
              </Text>
            </TouchableOpacity>

            {/* Tile 4: Sync Status */}
            <TouchableOpacity
              style={styles.gridCard}
              onPress={onNavigateSyncQueue}
              activeOpacity={0.85}
            >
              <View style={[styles.tileIconCircle, { backgroundColor: '#059669' }]}>
                <Ionicons name="time" size={22} color="#ffffff" />
              </View>
              <Text style={styles.tileTitle}>Sync Queue</Text>
              <Text style={styles.tileSubtitle} numberOfLines={1}>
                {lastSyncTime === 'Never' ? 'Not synced' : lastSyncTime.split(',')[0]}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STATUS CALLOUT BANNER */}
        {isSupervisor ? (
          <TouchableOpacity
            style={styles.statusBanner}
            onPress={onNavigateSupervisorReview}
            activeOpacity={0.85}
          >
            <View style={styles.bannerLeft}>
              <View style={[styles.bannerIconBox, { backgroundColor: '#f3e8ff' }]}>
                <Ionicons name="shield-checkmark" size={24} color="#7c3aed" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerMainTitle}>Supervisor Quality Assurance</Text>
                <Text style={styles.bannerMainSubtitle}>
                  {pendingReviewCount > 0
                    ? `${pendingReviewCount} surveys waiting for verification`
                    : 'All field submissions verified'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.statusBanner,
              pendingSyncCount === 0 && styles.statusBannerClean,
            ]}
            onPress={onNavigateSyncQueue}
            activeOpacity={0.85}
          >
            <View style={styles.bannerLeft}>
              <View
                style={[
                  styles.bannerIconBox,
                  pendingSyncCount === 0 ? { backgroundColor: '#f0fdf4' } : { backgroundColor: '#fee2e2' },
                ]}
              >
                <Ionicons
                  name={pendingSyncCount > 0 ? 'cloud-offline' : 'checkmark-circle'}
                  size={24}
                  color={pendingSyncCount > 0 ? '#dc2626' : '#16a34a'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerMainTitle}>
                  {pendingSyncCount > 0 ? 'Offline Queue Active' : 'Storage Synchronized'}
                </Text>
                <Text
                  style={[
                    styles.bannerMainSubtitle,
                    pendingSyncCount === 0 && { color: '#16a34a' },
                  ]}
                >
                  {pendingSyncCount > 0
                    ? `${pendingSyncCount} survey${pendingSyncCount === 1 ? '' : 's'} queued for cloud upload`
                    : `Last synced: ${lastSyncTime}`}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 16,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  welcomeText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  roleBadgeCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  roleBadgeSupervisor: {
    backgroundColor: '#f3e8ff',
  },
  roleBadgeWorker: {
    backgroundColor: '#eff6ff',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridCard: {
    width: (width - 48) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1.2,
    borderColor: '#f0f1f5',
    alignItems: 'center',
    position: 'relative',
    ...SHADOWS.card,
  },
  tileNotificationDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7c3aed',
  },
  tileIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tileTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3,
    textAlign: 'center',
  },
  tileSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#f0f1f5',
    marginHorizontal: 16,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...SHADOWS.card,
  },
  statusBannerClean: {
    borderColor: '#bbf7d0',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  bannerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerMainTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  bannerMainSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 2,
  },
});
