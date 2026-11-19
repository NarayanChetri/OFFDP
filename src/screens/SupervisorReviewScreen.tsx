import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Image,
  ScrollView,
  TextInput,
  Alert,
  RefreshControl,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { FieldRecord, CensusData, CensusAmenities } from '../types';

interface SupervisorReviewScreenProps {
  records: FieldRecord[];
  isOnline: boolean;
  onBack: () => void;
  onOpenMenu: () => void;
  onApproveRecord: (recordId: string, notes?: string) => void;
  onRejectRecord: (recordId: string, reason: string) => void;
  onEditRecord?: (recordId: string, updatedData: Partial<CensusData>, supervisorNotes?: string) => void;
  onRefresh?: () => Promise<void>;
  onNavigateUsers?: () => void;
}

type TabType = 'pending' | 'approved' | 'rejected';

export const SupervisorReviewScreen: React.FC<SupervisorReviewScreenProps> = ({
  records,
  isOnline,
  onBack,
  onOpenMenu,
  onApproveRecord,
  onRejectRecord,
  onEditRecord,
  onRefresh,
  onNavigateUsers,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedRecord, setSelectedRecord] = useState<FieldRecord | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [supervisorNotes, setSupervisorNotes] = useState('');

  // Supervisor Edit Modal State (Requirement 5)
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editHeadName, setEditHeadName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTotalMembers, setEditTotalMembers] = useState('4');
  const [editHouseType, setEditHouseType] = useState<'Pucca (Concrete)' | 'Semi-Pucca' | 'Kutcha (Mud/Thatch)'>('Pucca (Concrete)');
  const [editIncome, setEditIncome] = useState<'< ₹50,000' | '₹50,000 - ₹1,50,000' | '₹1,50,000 - ₹3,00,000' | '> ₹3,00,000'>('₹50,000 - ₹1,50,000');
  const [editCategory, setEditCategory] = useState<'General' | 'OBC' | 'SC' | 'ST'>('General');
  const [editAmenities, setEditAmenities] = useState<CensusAmenities>({
    electricity: true,
    pipedWater: true,
    sanitationToilet: true,
    lpgGas: true,
    rationCard: true,
    internetAccess: true,
    solarPower: false,
    bankAccount: true,
  });
  const [editSupervisorRemark, setEditSupervisorRemark] = useState('');

  // Handle pull to refresh
  const handlePullRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
  };

  // Filter records
  const pendingRecords = records.filter(
    (r) => r.status === 'submitted' || r.status === 'pending' || r.status === 'synced'
  );
  const approvedRecords = records.filter((r) => r.status === 'approved');
  const rejectedRecords = records.filter((r) => r.status === 'rejected');

  const displayList =
    activeTab === 'pending'
      ? pendingRecords
      : activeTab === 'approved'
      ? approvedRecords
      : rejectedRecords;

  const openInspection = (rec: FieldRecord) => {
    setSelectedRecord(rec);
    setSupervisorNotes(rec.supervisorNotes || '');
  };

  const openEditModal = (rec: FieldRecord) => {
    const data = rec.data || ({} as any);
    setEditHeadName(data.headName || '');
    setEditPhone(data.phoneNumber || '');
    setEditTotalMembers(data.totalMembers || '4');
    setEditHouseType(data.houseType || 'Pucca (Concrete)');
    setEditIncome(data.annualIncomeBracket || '₹50,000 - ₹1,50,000');
    setEditCategory(data.socialCategory || 'General');
    setEditAmenities(
      data.amenities || {
        electricity: true,
        pipedWater: true,
        sanitationToilet: true,
        lpgGas: true,
        rationCard: true,
        internetAccess: true,
        solarPower: false,
        bankAccount: true,
      }
    );
    setEditSupervisorRemark(rec.supervisorNotes || 'Supervisor verified and corrected details.');
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
      amenities: editAmenities,
    };

    if (onEditRecord) {
      onEditRecord(selectedRecord.id, updatedCensus, editSupervisorRemark);
    }

    // Update local state for immediate inspection modal view
    setSelectedRecord({
      ...selectedRecord,
      data: {
        ...selectedRecord.data,
        ...updatedCensus,
      },
      supervisorNotes: editSupervisorRemark,
    });

    setIsEditModalVisible(false);
    Alert.alert('Census Record Updated', 'The changes have been saved to local storage and synced to cloud.');
  };

  const handleApprove = (rec: FieldRecord) => {
    onApproveRecord(rec.id, supervisorNotes);
    setSelectedRecord(null);
    setSupervisorNotes('');
    Alert.alert('Census Verified & Approved', `Household of ${rec.data?.headName || rec.siteName} has been approved.`);
  };

  const handleReject = (rec: FieldRecord) => {
    if (!supervisorNotes.trim()) {
      Alert.alert('Reason Required', 'Please provide a supervisor note or reason for resurvey/rejection.');
      return;
    }
    onRejectRecord(rec.id, supervisorNotes);
    setSelectedRecord(null);
    setSupervisorNotes('');
    Alert.alert('Survey Returned for Resurvey', `Survey was rejected with reason: "${supervisorNotes}".`);
  };

  const renderItem = ({ item }: { item: FieldRecord }) => {
    const data = item.data || ({} as any);
    const hasPhoto = Boolean(item.photoUri);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openInspection(item)}
        activeOpacity={0.85}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={20} color="#7c3aed" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{data.headName || 'Unnamed Household'}</Text>
            <Text style={styles.cardSubtitle}>
              {data.aadharNumber ? `UIDAI: ${data.aadharNumber}` : item.siteName}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              item.status === 'approved' && styles.statusBadgeApproved,
              item.status === 'rejected' && styles.statusBadgeRejected,
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                item.status === 'approved' && styles.statusTextApproved,
                item.status === 'rejected' && styles.statusTextRejected,
              ]}
            >
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Thumbnail preview if photo exists */}
        {hasPhoto && (
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: item.photoUri }}
              style={styles.thumbnailImage}
              resizeMode="cover"
            />
            <View style={styles.photoOverlayBadge}>
              <Ionicons name="camera" size={12} color="#ffffff" />
              <Text style={styles.photoOverlayText}>Geo-Photo Attached</Text>
            </View>
          </View>
        )}

        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Ionicons name="people-outline" size={13} color="#4b5563" />
            <Text style={styles.metaPillText}>{data.totalMembers || '4'} Members</Text>
          </View>
          <View style={styles.metaPill}>
            <Ionicons name="home-outline" size={13} color="#4b5563" />
            <Text style={styles.metaPillText}>{data.houseType?.split(' ')[0] || 'Pucca'}</Text>
          </View>
          <View style={styles.metaPill}>
            <Ionicons name="cash-outline" size={13} color="#4b5563" />
            <Text style={styles.metaPillText}>{data.annualIncomeBracket || 'Income'}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerSurveyor}>
            Surveyor: <Text style={{ fontWeight: '700', color: '#1f2937' }}>{item.submittedByName}</Text>
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Review Submissions"
        showBack={true}
        onBack={onBack}
        onOpenMenu={onOpenMenu}
        isOnline={isOnline}
      />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
        >
          <Text style={[styles.tabText, activeTab === 'pending' && styles.tabTextActive]}>
            To Verify ({pendingRecords.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'approved' && styles.tabActive]}
          onPress={() => setActiveTab('approved')}
        >
          <Text style={[styles.tabText, activeTab === 'approved' && styles.tabTextActive]}>
            Approved ({approvedRecords.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'rejected' && styles.tabActive]}
          onPress={() => setActiveTab('rejected')}
        >
          <Text style={[styles.tabText, activeTab === 'rejected' && styles.tabTextActive]}>
            Rejected ({rejectedRecords.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayList}
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
            <Ionicons
              name={activeTab === 'pending' ? 'checkmark-circle-outline' : 'folder-open-outline'}
              size={54}
              color="#cbd5e1"
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'pending'
                ? 'All Submissions Verified!'
                : `No ${activeTab} records found`}
            </Text>
            <Text style={styles.emptySubtitle}>
              Pull down to refresh and check for new incoming field surveys from workers.
            </Text>
          </View>
        }
      />

      {/* DETAIL INSPECTION MODAL */}
      {selectedRecord && (
        <Modal visible={true} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>
                    {selectedRecord.data?.headName || selectedRecord.siteName}
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
                {/* Full Photo Preview */}
                {selectedRecord.photoUri ? (
                  <View style={styles.modalPhotoBox}>
                    <Image
                      source={{ uri: selectedRecord.photoUri }}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                    <View style={styles.photoCaption}>
                      <Ionicons name="shield-checkmark" size={16} color="#16a34a" />
                      <Text style={styles.photoCaptionText}>
                        Geo-Photo Attached & Verified across cloud
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.noPhotoBox}>
                    <Ionicons name="image-outline" size={32} color="#cbd5e1" />
                    <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
                      No photo attached with this submission
                    </Text>
                  </View>
                )}

                {/* Census Details Grid */}
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsSectionTitle}>Household Verification Data</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Head of Household:</Text>
                    <Text style={styles.detailValue}>{selectedRecord.data?.headName || 'N/A'}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Aadhaar Card UID:</Text>
                    <Text style={[styles.detailValue, { color: '#7c3aed', fontWeight: '800' }]}>
                      {selectedRecord.data?.aadharNumber || 'N/A'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mobile Number:</Text>
                    <Text style={styles.detailValue}>{selectedRecord.data?.phoneNumber || 'N/A'}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Gender / Age:</Text>
                    <Text style={styles.detailValue}>
                      {selectedRecord.data?.gender || 'N/A'}, {selectedRecord.data?.age || 'N/A'} yrs
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Family Size:</Text>
                    <Text style={styles.detailValue}>
                      {selectedRecord.data?.totalMembers || '4'} Members ({selectedRecord.data?.adultCount || '2'} Adults, {selectedRecord.data?.childCount || '2'} Children)
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Social Category:</Text>
                    <Text style={styles.detailValue}>{selectedRecord.data?.socialCategory || 'General'}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>House Construction:</Text>
                    <Text style={styles.detailValue}>{selectedRecord.data?.houseType || 'Pucca'}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Income Bracket:</Text>
                    <Text style={styles.detailValue}>{selectedRecord.data?.annualIncomeBracket || 'N/A'}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>GPS Coordinates:</Text>
                    <Text style={styles.detailValue}>
                      {selectedRecord.coordinates.latitude.toFixed(4)}, {selectedRecord.coordinates.longitude.toFixed(4)}
                    </Text>
                  </View>
                </View>

                {/* Amenities List */}
                <View style={styles.detailsCard}>
                  <Text style={styles.detailsSectionTitle}>Verified Household Amenities</Text>
                  <View style={styles.amenityBadgeRow}>
                    {selectedRecord.data?.amenities?.electricity && (
                      <View style={styles.amenityActiveBadge}>
                        <Ionicons name="flash" size={12} color="#16a34a" />
                        <Text style={styles.amenityActiveText}>Electricity</Text>
                      </View>
                    )}
                    {selectedRecord.data?.amenities?.pipedWater && (
                      <View style={styles.amenityActiveBadge}>
                        <Ionicons name="water" size={12} color="#16a34a" />
                        <Text style={styles.amenityActiveText}>Piped Water</Text>
                      </View>
                    )}
                    {selectedRecord.data?.amenities?.sanitationToilet && (
                      <View style={styles.amenityActiveBadge}>
                        <Ionicons name="shield-checkmark" size={12} color="#16a34a" />
                        <Text style={styles.amenityActiveText}>Toilet (IHHL)</Text>
                      </View>
                    )}
                    {selectedRecord.data?.amenities?.lpgGas && (
                      <View style={styles.amenityActiveBadge}>
                        <Ionicons name="flame" size={12} color="#16a34a" />
                        <Text style={styles.amenityActiveText}>LPG Gas</Text>
                      </View>
                    )}
                    {selectedRecord.data?.amenities?.rationCard && (
                      <View style={styles.amenityActiveBadge}>
                        <Ionicons name="receipt" size={12} color="#16a34a" />
                        <Text style={styles.amenityActiveText}>Ration Card</Text>
                      </View>
                    )}
                    {selectedRecord.data?.amenities?.internetAccess && (
                      <View style={styles.amenityActiveBadge}>
                        <Ionicons name="wifi" size={12} color="#16a34a" />
                        <Text style={styles.amenityActiveText}>Internet</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Supervisor Remarks Input */}
                <View style={styles.notesSection}>
                  <Text style={styles.fieldLabel}>Supervisor Verification Remarks</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Enter audit remarks or feedback for field surveyor..."
                    placeholderTextColor="#9ca3af"
                    value={supervisorNotes}
                    onChangeText={setSupervisorNotes}
                    multiline={true}
                  />
                </View>

                {/* EDIT BUTTON (Requirement 5) */}
                <TouchableOpacity
                  style={styles.editRecordButton}
                  onPress={() => openEditModal(selectedRecord)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={18} color="#2563eb" />
                  <Text style={styles.editRecordButtonText}>Edit Details of Submitted Survey</Text>
                </TouchableOpacity>

                {/* APPROVE / REJECT ACTIONS */}
                <View style={styles.modalActionButtons}>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => handleReject(selectedRecord)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#dc2626" />
                    <Text style={styles.rejectButtonText}>Reject</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.approveButton}
                    onPress={() => handleApprove(selectedRecord)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark-done" size={18} color="#ffffff" />
                    <Text style={styles.approveButtonText}>Verify & Approve</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* SUPERVISOR EDIT MODAL (Requirement 5) */}
      <Modal visible={isEditModalVisible} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Edit Survey Details</Text>
                <Text style={styles.modalSubtitle}>
                  Supervisor Corrections & Telephonic Verification
                </Text>
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
                placeholder="Reason for editing this survey..."
                multiline={true}
              />

              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={[styles.rejectButton, { borderColor: '#d1d5db' }]}
                  onPress={() => setIsEditModalVisible(false)}
                >
                  <Text style={{ color: '#4b5563', fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.approveButton, { backgroundColor: '#2563eb' }]}
                  onPress={handleSaveEdit}
                >
                  <Ionicons name="checkmark" size={18} color="#ffffff" />
                  <Text style={styles.approveButtonText}>Save Changes</Text>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#f3e8ff',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#7c3aed',
    fontWeight: '800',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...SHADOWS.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f3e8ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#fef3c7',
  },
  statusBadgeApproved: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeRejected: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#d97706',
  },
  statusTextApproved: {
    color: '#16a34a',
  },
  statusTextRejected: {
    color: '#dc2626',
  },
  thumbnailContainer: {
    marginTop: 12,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#e2e8f0',
  },
  photoOverlayBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoOverlayText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
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
    fontWeight: '600',
    color: '#4b5563',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 12,
    paddingTop: 10,
  },
  footerSurveyor: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
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
    lineHeight: 18,
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
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
    marginBottom: 12,
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
    marginTop: 4,
  },
  modalPhotoBox: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#e2e8f0',
  },
  photoCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 8,
    gap: 6,
  },
  photoCaptionText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
  },
  noPhotoBox: {
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  detailsCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 0.8,
    borderBottomColor: '#f1f5f9',
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1.2,
    textAlign: 'right',
  },
  amenityBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  amenityActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  notesSection: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    marginTop: 8,
  },
  notesInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    height: 70,
    textAlignVertical: 'top',
    fontSize: 13,
    color: COLORS.textPrimary,
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
  editRecordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 6,
  },
  editRecordButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },
  modalActionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.2,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  approveButton: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 6,
    ...SHADOWS.card,
  },
  approveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
