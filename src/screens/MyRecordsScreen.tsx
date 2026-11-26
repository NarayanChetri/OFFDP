import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  Image,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { FieldRecord } from '../types';

interface MyRecordsScreenProps {
  records: FieldRecord[];
  isOnline: boolean;
  onBack: () => void;
  onOpenMenu: () => void;
  onDeleteRecord: (recordId: string) => void;
  onNavigateConflict: () => void;
  onNavigateNewEntry: () => void;
  onEditDraft?: (record: FieldRecord) => void;
  onRefresh?: () => Promise<void>;
}

type FilterTab = 'all' | 'draft' | 'pending' | 'synced' | 'rejected';

export const MyRecordsScreen: React.FC<MyRecordsScreenProps> = ({
  records,
  isOnline,
  onBack,
  onOpenMenu,
  onDeleteRecord,
  onNavigateConflict,
  onNavigateNewEntry,
  onEditDraft,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<FieldRecord | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handlePullRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  const draftsCount = records.filter((r) => r.status === 'draft').length;
  const pendingCount = records.filter((r) => r.status === 'pending').length;
  const syncedCount = records.filter((r) => r.status === 'synced' || r.status === 'approved').length;
  const rejectedCount = records.filter((r) => r.status === 'rejected').length;

  const filteredRecords = records.filter((r) => {
    if (activeTab === 'draft' && r.status !== 'draft') return false;
    if (activeTab === 'pending' && r.status !== 'pending') return false;
    if (activeTab === 'synced' && r.status !== 'synced' && r.status !== 'approved') return false;
    if (activeTab === 'rejected' && r.status !== 'rejected') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchHead = r.data?.headName?.toLowerCase().includes(q);
      const matchAadhar = r.data?.aadharNumber?.toLowerCase().includes(q);
      const matchSite = r.siteName?.toLowerCase().includes(q);
      return matchHead || matchAadhar || matchSite;
    }
    return true;
  });

  const handleDelete = (rec: FieldRecord) => {
    Alert.alert(
      'Delete Draft Record',
      `Are you sure you want to delete the draft census survey for ${rec.data?.headName || rec.siteName || 'this household'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSelectedRecord(null);
            onDeleteRecord(rec.id);
          },
        },
      ]
    );
  };

  const handleResumeDraft = (rec: FieldRecord) => {
    setSelectedRecord(null);
    if (onEditDraft) {
      onEditDraft(rec);
    }
  };

  const renderItem = ({ item }: { item: FieldRecord }) => {
    const isApproved = item.status === 'approved';
    const isDraft = item.status === 'draft';
    const isPending = item.status === 'pending';
    const isRejected = item.status === 'rejected';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => setSelectedRecord(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardHeaderRow}>
          <View
            style={[
              styles.avatarBox,
              isApproved && { backgroundColor: '#dcfce7' },
              isDraft && { backgroundColor: '#f1f5f9' },
              isRejected && { backgroundColor: '#fee2e2' },
            ]}
          >
            <Ionicons
              name={
                isApproved
                  ? 'shield-checkmark'
                  : isDraft
                  ? 'create-outline'
                  : isRejected
                  ? 'alert-circle'
                  : 'person'
              }
              size={20}
              color={
                isApproved
                  ? '#16a34a'
                  : isDraft
                  ? '#4b5563'
                  : isRejected
                  ? '#dc2626'
                  : '#7c3aed'
              }
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.data?.headName || 'Unnamed Household'}</Text>
            <Text style={styles.cardAadhar}>
              {item.data?.aadharNumber ? `Aadhaar: ${item.data.aadharNumber}` : item.siteName}
            </Text>
          </View>

          <View
            style={[
              styles.badge,
              isApproved && styles.badgeApproved,
              isDraft && styles.badgeDraft,
              isPending && styles.badgePending,
              isRejected && { backgroundColor: '#fee2e2' },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isApproved && { color: '#16a34a' },
                isDraft && { color: '#6b7280' },
                isPending && { color: '#d97706' },
                isRejected && { color: '#dc2626' },
              ]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {(isDraft || isRejected) && (
          <TouchableOpacity
            style={[styles.resumeDraftBar, isRejected && { backgroundColor: '#fef2f2' }]}
            onPress={() => handleResumeDraft(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="create" size={14} color={isRejected ? '#dc2626' : '#7c3aed'} />
            <Text style={[styles.resumeDraftBarText, isRejected && { color: '#dc2626' }]}>
              {isRejected
                ? 'Returned by supervisor — tap to edit & resubmit'
                : 'Tap to resume & complete this draft'}
            </Text>
            <Ionicons name="arrow-forward" size={14} color={isRejected ? '#dc2626' : '#7c3aed'} />
          </TouchableOpacity>
        )}

        {item.photoUri && (
          <View style={styles.thumbnailWrap}>
            <Image source={{ uri: item.photoUri }} style={styles.thumbnail} resizeMode="cover" />
          </View>
        )}

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            <Ionicons name="location-outline" size={12} color="#6b7280" /> {item.siteName}
          </Text>
          <Text style={styles.metaText}>
            <Ionicons name="people-outline" size={12} color="#6b7280" /> {item.data?.totalMembers || '1'} Members
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Census Records"
        showBack={true}
        onBack={onBack}
        onOpenMenu={onOpenMenu}
        isOnline={isOnline}
      />

      {/* Search Input */}
      <View style={styles.searchBarContainer}>
        <Ionicons name="search" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Head Name, Aadhaar UID, or Ward..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'all' && styles.filterChipActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.filterChipText, activeTab === 'all' && styles.filterChipTextActive]}>
            All ({records.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'pending' && styles.filterChipActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.filterChipText, activeTab === 'pending' && styles.filterChipTextActive]}>
            Pending ({pendingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'synced' && styles.filterChipActive]}
          onPress={() => setActiveTab('synced')}
        >
          <Text style={[styles.filterChipText, activeTab === 'synced' && styles.filterChipTextActive]}>
            Synced ({syncedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'draft' && styles.filterChipActive]}
          onPress={() => setActiveTab('draft')}
        >
          <Text style={[styles.filterChipText, activeTab === 'draft' && styles.filterChipTextActive]}>
            Drafts ({draftsCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'rejected' && styles.filterChipActive]}
          onPress={() => setActiveTab('rejected')}
        >
          <Text style={[styles.filterChipText, activeTab === 'rejected' && styles.filterChipTextActive]}>
            Rejected ({rejectedCount})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handlePullRefresh}
            colors={['#7c3aed']}
            tintColor="#7c3aed"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={54} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Household Records Found</Text>
            <Text style={styles.emptySubtitle}>
              Pull down to refresh or tap below to record a new household survey.
            </Text>
            <TouchableOpacity
              style={styles.newEntryButton}
              onPress={onNavigateNewEntry}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={18} color="#ffffff" />
              <Text style={styles.newEntryButtonText}>New Census Survey</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* DETAIL MODAL */}
      {selectedRecord && (
        <Modal visible={true} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {selectedRecord.data?.headName || selectedRecord.siteName || 'Household Survey'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Aadhaar UID: {selectedRecord.data?.aadharNumber || 'N/A'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedRecord(null)}>
                  <Ionicons name="close-circle" size={28} color="#9ca3af" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {selectedRecord.photoUri && (
                  <View style={styles.modalPhotoBox}>
                    <Image
                      source={{ uri: selectedRecord.photoUri }}
                      style={styles.modalPhoto}
                      resizeMode="cover"
                    />
                  </View>
                )}

                <View style={styles.infoCard}>
                  <Text style={styles.infoCardTitle}>Household Summary</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Head of Family:</Text>
                    <Text style={styles.infoVal}>{selectedRecord.data?.headName || 'Not filled'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Aadhaar Number:</Text>
                    <Text style={[styles.infoVal, { color: '#7c3aed', fontWeight: '800' }]}>
                      {selectedRecord.data?.aadharNumber || 'Not filled'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mobile Number:</Text>
                    <Text style={styles.infoVal}>{selectedRecord.data?.phoneNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Family Size:</Text>
                    <Text style={styles.infoVal}>{selectedRecord.data?.totalMembers || '1'} Persons</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>House Type:</Text>
                    <Text style={styles.infoVal}>{selectedRecord.data?.houseType || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text style={[styles.infoVal, { fontWeight: '800' }]}>{selectedRecord.status.toUpperCase()}</Text>
                  </View>
                </View>

                {selectedRecord.supervisorNotes && (
                  <View style={styles.supervisorNotesBox}>
                    <Text style={styles.supervisorNotesTitle}>Supervisor Verification Remarks:</Text>
                    <Text style={styles.supervisorNotesText}>{selectedRecord.supervisorNotes}</Text>
                  </View>
                )}

                {/* If it's a draft or rejected, allow editing/resubmitting */}
                {(selectedRecord.status === 'draft' || selectedRecord.status === 'rejected') && (
                  <TouchableOpacity
                    style={styles.editDraftBtn}
                    onPress={() => handleResumeDraft(selectedRecord)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="create" size={18} color="#ffffff" />
                    <Text style={styles.editDraftBtnText}>
                      {selectedRecord.status === 'rejected'
                        ? 'Edit & Resubmit Survey'
                        : 'Edit & Complete Draft'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Only drafts can be deleted by field workers (Requirement 3) */}
                {selectedRecord.status === 'draft' ? (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(selectedRecord)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="trash-outline" size={18} color="#dc2626" />
                    <Text style={styles.deleteButtonText}>Delete Draft</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.lockedNoticeBox}>
                    <Ionicons name="lock-closed" size={16} color="#6b7280" />
                    <Text style={styles.lockedNoticeText}>
                      Submitted survey is recorded. Field workers cannot delete submitted records.
                    </Text>
                  </View>
                )}

                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.card,
  },
  cardConflict: {
    borderColor: '#fed7aa',
    backgroundColor: '#fffaf5',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardAadhar: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  badgeConflict: {
    backgroundColor: '#ffedd5',
  },
  badgeApproved: {
    backgroundColor: '#dcfce7',
  },
  badgeDraft: {
    backgroundColor: '#f1f5f9',
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  resumeDraftBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  resumeDraftBarText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  itemConflictAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  itemConflictText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c2410c',
    flex: 1,
  },
  thumbnailWrap: {
    marginTop: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: 110,
    backgroundColor: '#e2e8f0',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 10,
    paddingTop: 8,
  },
  metaText: {
    fontSize: 11,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  newEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  newEntryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#7c3aed',
    fontWeight: '700',
    marginTop: 2,
  },
  modalScroll: {
    marginTop: 10,
  },
  modalPhotoBox: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  modalPhoto: {
    width: '100%',
    height: 180,
    backgroundColor: '#e2e8f0',
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.8,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoVal: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '600',
  },
  supervisorNotesBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  supervisorNotesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
    marginBottom: 4,
  },
  supervisorNotesText: {
    fontSize: 12,
    color: '#166534',
  },
  editDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 12,
    ...SHADOWS.card,
  },
  editDraftBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  deleteButtonText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 13,
  },
  lockedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  lockedNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 16,
  },
});
