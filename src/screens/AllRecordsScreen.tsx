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
import { FieldRecord, CensusData, CensusAmenities } from '../types';

interface AllRecordsScreenProps {
  records: FieldRecord[];
  isOnline: boolean;
  onBack: () => void;
  onOpenMenu: () => void;
  onEditRecord?: (recordId: string, updatedData: Partial<CensusData>, supervisorNotes?: string) => void;
  onRefresh?: () => Promise<void>;
}

type FilterTab = 'all' | 'approved' | 'synced' | 'pending' | 'draft';

export const AllRecordsScreen: React.FC<AllRecordsScreenProps> = ({
  records,
  isOnline,
  onBack,
  onOpenMenu,
  onEditRecord,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<FieldRecord | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editHeadName, setEditHeadName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTotalMembers, setEditTotalMembers] = useState('4');
  const [editHouseType, setEditHouseType] = useState<'Pucca (Concrete)' | 'Semi-Pucca' | 'Kutcha (Mud/Thatch)'>('Pucca (Concrete)');
  const [editIncome, setEditIncome] = useState<'< ₹50,000' | '₹50,000 - ₹1,50,000' | '₹1,50,000 - ₹3,00,000' | '> ₹3,00,000'>('₹50,000 - ₹1,50,000');
  const [editCategory, setEditCategory] = useState<'General' | 'OBC' | 'SC' | 'ST'>('General');
  const [editSupervisorRemark, setEditSupervisorRemark] = useState('');

  const handlePullRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (activeTab === 'approved' && r.status !== 'approved') return false;
    if (activeTab === 'synced' && r.status !== 'synced') return false;
    if (activeTab === 'pending' && r.status !== 'pending') return false;
    if (activeTab === 'draft' && r.status !== 'draft') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchHead = r.data?.headName?.toLowerCase().includes(q);
      const matchAadhar = r.data?.aadharNumber?.toLowerCase().includes(q);
      const matchSite = r.siteName?.toLowerCase().includes(q);
      const matchSurveyor = r.submittedByName?.toLowerCase().includes(q);
      return matchHead || matchAadhar || matchSite || matchSurveyor;
    }
    return true;
  });

  const openInspection = (rec: FieldRecord) => {
    setSelectedRecord(rec);
  };

  const openEditModal = (rec: FieldRecord) => {
    const data = rec.data || ({} as any);
    setEditHeadName(data.headName || '');
    setEditPhone(data.phoneNumber || '');
    setEditTotalMembers(data.totalMembers || '1');
    setEditHouseType(data.houseType || 'Pucca (Concrete)');
    setEditIncome(data.annualIncomeBracket || '< ₹50,000');
    setEditCategory(data.socialCategory || 'General');
    setEditSupervisorRemark(rec.supervisorNotes || '');
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!selectedRecord) return;
    if (!editHeadName.trim()) {
      Alert.alert('Validation Error', 'Head of Family Name cannot be empty.');
      return;
    }

    const updatedCensus: Partial<CensusData> = {
      headName: editHeadName.trim(),
      phoneNumber: editPhone.trim(),
      totalMembers: editTotalMembers.trim(),
      houseType: editHouseType,
      annualIncomeBracket: editIncome,
      socialCategory: editCategory,
    };

    if (onEditRecord) {
      onEditRecord(selectedRecord.id, updatedCensus, editSupervisorRemark);
    }

    setSelectedRecord({
      ...selectedRecord,
      data: {
        ...selectedRecord.data,
        ...updatedCensus,
      },
      supervisorNotes: editSupervisorRemark,
    });

    setIsEditModalVisible(false);
    Alert.alert('Record Updated', 'Household survey data has been successfully updated.');
  };

  const renderItem = ({ item }: { item: FieldRecord }) => {
    const isApproved = item.status === 'approved';
    const isPending = item.status === 'pending';
    const isDraft = item.status === 'draft';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openInspection(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.avatarBox}>
            <Ionicons name="person" size={20} color="#7c3aed" />
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
              isPending && styles.badgePending,
              isDraft && styles.badgeDraft,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isApproved && { color: '#16a34a' },
                isPending && { color: '#d97706' },
                isDraft && { color: '#6b7280' },
              ]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Thumbnail if present */}
        {item.photoUri && (
          <View style={styles.thumbnailWrap}>
            <Image source={{ uri: item.photoUri }} style={styles.thumbnail} resizeMode="cover" />
          </View>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Ionicons name="people-outline" size={12} color="#4b5563" />
            <Text style={styles.metaPillText}>{item.data?.totalMembers || '1'} Members</Text>
          </View>
          <View style={styles.metaPill}>
            <Ionicons name="home-outline" size={12} color="#4b5563" />
            <Text style={styles.metaPillText}>{item.data?.houseType?.split(' ')[0] || 'Pucca'}</Text>
          </View>
          <View style={styles.metaPill}>
            <Ionicons name="location-outline" size={12} color="#4b5563" />
            <Text style={styles.metaPillText} numberOfLines={1}>{item.siteName}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerSurveyor}>
            Surveyor: <Text style={{ fontWeight: '700', color: '#1f2937' }}>{item.submittedByName}</Text>
          </Text>
          <View style={styles.viewDetailsRow}>
            <Text style={styles.viewDetailsText}>Full Details</Text>
            <Ionicons name="chevron-forward" size={14} color="#7c3aed" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title="All Master Census Data"
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
          placeholder="Search by Head Name, Aadhaar UID, Ward, Surveyor..."
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
          style={[styles.filterChip, activeTab === 'approved' && styles.filterChipActive]}
          onPress={() => setActiveTab('approved')}
        >
          <Text style={[styles.filterChipText, activeTab === 'approved' && styles.filterChipTextActive]}>
            Verified ({records.filter((r) => r.status === 'approved').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'pending' && styles.filterChipActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.filterChipText, activeTab === 'pending' && styles.filterChipTextActive]}>
            Pending ({records.filter((r) => r.status === 'pending').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeTab === 'synced' && styles.filterChipActive]}
          onPress={() => setActiveTab('synced')}
        >
          <Text style={[styles.filterChipText, activeTab === 'synced' && styles.filterChipTextActive]}>
            Synced ({records.filter((r) => r.status === 'synced').length})
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
            <Ionicons name="file-tray-outline" size={54} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Census Records Found</Text>
            <Text style={styles.emptySubtitle}>
              Pull down to refresh or check back after field workers submit surveys.
            </Text>
          </View>
        }
      />

      {/* DETAIL INSPECTION MODAL (Requirement 5) */}
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
                  <Text style={styles.infoCardTitle}>Full Census Verification</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Head of Family:</Text>
                    <Text style={styles.infoVal}>{selectedRecord.data?.headName}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Aadhaar Card Number:</Text>
                    <Text style={[styles.infoVal, { color: '#7c3aed', fontWeight: '800' }]}>
                      {selectedRecord.data?.aadharNumber}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mobile Number:</Text>
                    <Text style={styles.infoVal}>{selectedRecord.data?.phoneNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Gender / Age:</Text>
                    <Text style={styles.infoVal}>
                      {selectedRecord.data?.gender || 'N/A'}, {selectedRecord.data?.age || 'N/A'} yrs
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Total Members:</Text>
                    <Text style={styles.infoVal}>
                      {selectedRecord.data?.totalMembers || '1'} Persons ({selectedRecord.data?.adultCount || '1'} Adults, {selectedRecord.data?.childCount || '0'} Children)
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Social Category:</Text>
                    <Text style={styles.infoVal}>{selectedRecord.data?.socialCategory || 'General'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>House Construction:</Text>
                    <Text style={styles.infoVal}>{selectedRecord.data?.houseType || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Annual Income:</Text>
                    <Text style={styles.infoVal}>{selectedRecord.data?.annualIncomeBracket || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Primary Occupation:</Text>
                    <Text style={styles.infoVal}>{selectedRecord.data?.primaryOccupation || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Census Ward / Site:</Text>
                    <Text style={styles.infoVal}>{selectedRecord.siteName}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text style={[styles.infoVal, { fontWeight: '800' }]}>
                      {selectedRecord.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {selectedRecord.supervisorNotes && (
                  <View style={styles.supervisorNotesBox}>
                    <Text style={styles.supervisorNotesTitle}>Supervisor Audit Notes:</Text>
                    <Text style={styles.supervisorNotesText}>{selectedRecord.supervisorNotes}</Text>
                  </View>
                )}

                {/* EDIT BUTTON (Requirement 5) */}
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => openEditModal(selectedRecord)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={18} color="#ffffff" />
                  <Text style={styles.editBtnText}>Edit Record Details</Text>
                </TouchableOpacity>

                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* SUPERVISOR EDIT MODAL */}
      <Modal visible={isEditModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Edit Master Census Data</Text>
                <Text style={styles.modalSubtitle}>Supervisor Corrections</Text>
              </View>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Head of Family Name</Text>
              <TextInput
                style={styles.input}
                value={editHeadName}
                onChangeText={setEditHeadName}
                placeholder="Full Name"
              />

              <Text style={styles.fieldLabel}>Contact Mobile Number</Text>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="10-digit number"
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>Total Family Members</Text>
              <TextInput
                style={styles.input}
                value={editTotalMembers}
                onChangeText={setEditTotalMembers}
                placeholder="e.g. 5"
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>House Construction Type</Text>
              <View style={styles.chipRow}>
                {(['Pucca (Concrete)', 'Semi-Pucca', 'Kutcha (Mud/Thatch)'] as const).map((ht) => (
                  <TouchableOpacity
                    key={ht}
                    style={[styles.chip, editHouseType === ht && styles.chipActive]}
                    onPress={() => setEditHouseType(ht)}
                  >
                    <Text style={[styles.chipText, editHouseType === ht && styles.chipTextActive]}>
                      {ht}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Annual Household Income</Text>
              <View style={styles.chipRow}>
                {(['< ₹50,000', '₹50,000 - ₹1,50,000', '₹1,50,000 - ₹3,00,000', '> ₹3,00,000'] as const).map((inc) => (
                  <TouchableOpacity
                    key={inc}
                    style={[styles.chip, editIncome === inc && styles.chipActive]}
                    onPress={() => setEditIncome(inc)}
                  >
                    <Text style={[styles.chipText, editIncome === inc && styles.chipTextActive]}>
                      {inc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Supervisor Correction Audit Note</Text>
              <TextInput
                style={[styles.input, { height: 65, textAlignVertical: 'top' }]}
                value={editSupervisorRemark}
                onChangeText={setEditSupervisorRemark}
                placeholder="Audit remarks or reason for editing..."
                multiline={true}
              />

              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setIsEditModalVisible(false)}
                >
                  <Text style={{ color: '#4b5563', fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveEdit}
                >
                  <Ionicons name="checkmark" size={18} color="#ffffff" />
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  cardTopRow: {
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
    gap: 8,
    marginTop: 10,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  metaPillText: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 10,
    paddingTop: 8,
  },
  footerSurveyor: {
    fontSize: 12,
    color: '#6b7280',
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
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
    paddingVertical: 5,
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
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
    ...SHADOWS.card,
  },
  editBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  chipActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 12,
  },
  saveBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 6,
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});

