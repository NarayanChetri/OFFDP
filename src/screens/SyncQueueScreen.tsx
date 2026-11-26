import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { SyncQueueItem } from '../types';
import { SyncService } from '../services/syncService';
import { StorageService } from '../services/storageService';

interface SyncQueueScreenProps {
  syncQueue: SyncQueueItem[];
  lastSyncTime: string;
  isOnline: boolean;
  onBack: () => void;
  onOpenMenu: () => void;
  onSyncCompleted: () => void;
  onNavigateConflict: () => void;
}

export const SyncQueueScreen: React.FC<SyncQueueScreenProps> = ({
  syncQueue,
  lastSyncTime,
  isOnline,
  onBack,
  onOpenMenu,
  onSyncCompleted,
  onNavigateConflict,
}) => {
  const [backgroundSync, setBackgroundSync] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState('');

  useEffect(() => {
    StorageService.getSyncSettings().then((settings) => {
      setBackgroundSync(settings.backgroundSync);
      setWifiOnly(settings.wifiOnly);
    });
  }, []);

  const handleToggleBackgroundSync = async (val: boolean) => {
    setBackgroundSync(val);
    await StorageService.saveSyncSettings({ backgroundSync: val, wifiOnly });
  };

  const handleToggleWifiOnly = async (val: boolean) => {
    setWifiOnly(val);
    await StorageService.saveSyncSettings({ backgroundSync, wifiOnly: val });
  };

  const pendingItems = syncQueue.filter(
    (q) => q.status === 'pending' || q.status === 'failed'
  );
  const pendingCount = pendingItems.length;

  const handleSyncNow = async () => {
    if (pendingCount === 0) {
      Alert.alert('Queue Empty', 'There are no pending records to synchronize.');
      return;
    }

    if (!isOnline) {
      Alert.alert(
        'Offline',
        'Cannot synchronize because your device has no active internet connection. Connect to Wi-Fi or cellular data to upload pending records.'
      );
      return;
    }

    setIsSyncing(true);
    setSyncProgressMsg('Connecting to central database...');

    try {
      const result = await SyncService.executeSync((curr, total, msg) => {
        setSyncProgressMsg(`(${curr}/${total}) ${msg}`);
      });

      setIsSyncing(false);
      onSyncCompleted();
      if (result.failedCount > 0) {
        Alert.alert(
          'Partial Sync',
          `${result.syncedCount} synced, ${result.failedCount} failed. Failed items remain queued for retry.`
        );
      } else {
        Alert.alert(
          'Sync Successful',
          `All ${result.syncedCount} pending records were synchronized successfully.`
        );
      }
    } catch {
      setIsSyncing(false);
      Alert.alert('Sync Error', 'Network error occurred. Operations remain safely queued in local storage.');
    }
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Synchronization"
        showBack={true}
        onBack={onBack}
        onOpenMenu={onOpenMenu}
        isOnline={isOnline}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={async () => {
              setIsRefreshing(true);
              if (isOnline && pendingCount > 0) {
                await handleSyncNow();
              } else {
                onSyncCompleted();
              }
              setIsRefreshing(false);
            }}
            colors={['#7c3aed']}
            tintColor="#7c3aed"
          />
        }
      >
        {/* Cloud Upload Hero Graphic */}
        <View style={styles.heroSection}>
          <View style={styles.cloudIconCircle}>
            <Ionicons name="cloud-upload-outline" size={54} color={COLORS.primary} />
          </View>
          <Text style={styles.pendingRecordsTitle}>
            {pendingCount} {pendingCount === 1 ? 'Record' : 'Records'} Pending
          </Text>
          <Text style={styles.pendingRecordsSubtitle}>
            {isOnline
              ? pendingCount > 0
                ? 'Ready to upload changes to the central database.'
                : 'All changes are fully synchronized.'
              : 'Records will be uploaded automatically when internet connectivity is restored.'}
          </Text>

          {/* Sync Now Button */}
          <TouchableOpacity
            style={[
              styles.syncNowBtn,
              (isSyncing || pendingCount === 0 || !isOnline) && styles.syncNowBtnDisabled,
            ]}
            onPress={handleSyncNow}
            activeOpacity={0.85}
            disabled={isSyncing || pendingCount === 0 || !isOnline}
          >
            {isSyncing ? (
              <View style={styles.syncingRow}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.syncNowBtnText}>Synchronizing...</Text>
              </View>
            ) : (
              <Text style={styles.syncNowBtnText}>
                {!isOnline ? 'Offline (Cannot Sync)' : pendingCount === 0 ? 'Up To Date' : 'Sync Now'}
              </Text>
            )}
          </TouchableOpacity>

          {isSyncing && (
            <Text style={styles.syncProgressText}>{syncProgressMsg}</Text>
          )}
        </View>

        {/* Sync Settings Section */}
        <View style={styles.settingsCard}>
          {/* Setting 1: Background Sync */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconCol}>
              <Ionicons name="refresh-outline" size={22} color={COLORS.textPrimary} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Background Sync</Text>
              <Text style={styles.settingSubtitle}>Sync automatically when online</Text>
            </View>
            <Switch
              value={backgroundSync}
              onValueChange={handleToggleBackgroundSync}
              trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
              thumbColor={backgroundSync ? COLORS.primary : '#f3f4f6'}
            />
          </View>

          <View style={styles.divider} />

          {/* Setting 2: Wi-Fi Only */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconCol}>
              <Ionicons name="wifi-outline" size={22} color={COLORS.textPrimary} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Sync on Wi-Fi Only</Text>
              <Text style={styles.settingSubtitle}>Conserve mobile data bandwidth</Text>
            </View>
            <Switch
              value={wifiOnly}
              onValueChange={handleToggleWifiOnly}
              trackColor={{ false: '#d1d5db', true: '#c4b5fd' }}
              thumbColor={wifiOnly ? COLORS.primary : '#f3f4f6'}
            />
          </View>

          <View style={styles.divider} />

          {/* Setting 3: Last Sync */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconCol}>
              <Ionicons name="information-circle-outline" size={22} color={COLORS.textSecondary} />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Last Sync</Text>
              <Text style={styles.settingSubtitle}>{lastSyncTime}</Text>
            </View>
          </View>
        </View>

        {/* Queue List Header */}
        <View style={styles.queueHeader}>
          <Text style={styles.queueHeaderTitle}>Local Persistent Queue</Text>
          <Text style={styles.queueHeaderSubtitle}>FR-3.1 Delta Payloads</Text>
        </View>

        {syncQueue.length === 0 ? (
          <View style={styles.emptyQueueCard}>
            <Ionicons name="checkmark-done-circle-outline" size={32} color="#16a34a" />
            <Text style={styles.emptyQueueTitle}>Queue is Empty</Text>
            <Text style={styles.emptyQueueSubtitle}>
              New field entries saved while offline will queue here automatically.
            </Text>
          </View>
        ) : (
          syncQueue.map((item) => (
            <View key={item.id} style={styles.queueCard}>
              <View style={styles.queueCardLeft}>
                <View
                  style={[
                    styles.queueStatusDot,
                    item.status === 'pending' && { backgroundColor: '#ea580c' },
                    item.status === 'failed' && { backgroundColor: '#dc2626' },
                    item.status === 'synced' && { backgroundColor: '#16a34a' },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.queueItemTitle} numberOfLines={1}>
                    {item.siteName}
                  </Text>
                  <Text style={styles.queueItemDetail}>
                    {item.operation} • {item.observationType}
                    {item.status === 'failed' && item.errorReason ? ` • ${item.errorReason}` : ''}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.queueItemStatus,
                  item.status === 'pending' && { color: '#ea580c' },
                  item.status === 'failed' && { color: '#dc2626' },
                  item.status === 'synced' && { color: '#16a34a' },
                ]}
              >
                {item.status}
              </Text>
            </View>
          ))
        )}
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
    padding: 20,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  cloudIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#c4b5fd',
    backgroundColor: '#faf5ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  pendingRecordsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  pendingRecordsSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  syncNowBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 70,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  syncNowBtnDisabled: {
    backgroundColor: '#9ca3af',
    opacity: 0.8,
  },
  syncingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncNowBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  syncProgressText: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#f0f1f5',
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 24,
    ...SHADOWS.card,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIconCol: {
    marginRight: 14,
  },
  settingTextCol: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  settingSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f3f4f6',
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  queueHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  queueHeaderSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  emptyQueueCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  emptyQueueTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptyQueueSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  queueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  queueCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  queueStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  queueItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  queueItemDetail: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  queueItemStatus: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  resolveChip: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  resolveChipText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '700',
  },
});
