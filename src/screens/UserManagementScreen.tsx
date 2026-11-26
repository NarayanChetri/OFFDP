import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../constants/theme';
import { HeaderBar } from '../components/HeaderBar';
import { User, UserRole } from '../types';
import { AuthService } from '../services/authService';
import { StyledAlertModal, AlertButton, AlertType } from '../components/StyledAlertModal';

interface UserManagementScreenProps {
  onBack: () => void;
  onOpenMenu: () => void;
  isOnline: boolean;
}

export const UserManagementScreen: React.FC<UserManagementScreenProps> = ({
  onBack,
  onOpenMenu,
  isOnline,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('field_worker');
  const [showPassword, setShowPassword] = useState(false);
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: AlertType;
    buttons: AlertButton[];
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: [{ text: 'OK' }],
  });

  const showAlert = (
    title: string,
    message: string,
    type: AlertType = 'info',
    buttons: AlertButton[] = [{ text: 'OK' }]
  ) => {
    setAlertState({ visible: true, title, message, type, buttons });
  };

  const loadUsers = async () => {
    const list = await AuthService.getUsers(isOnline);
    setUsers(list);
  };

  useEffect(() => {
    loadUsers();
  }, [isOnline]);

  const showOfflineAlert = (action: string) => {
    showAlert(
      'Internet Connection Required',
      `You are currently offline. An active internet connection is required to ${action} user accounts.`,
      'warning'
    );
  };

  const openCreateModal = () => {
    if (!isOnline) {
      showOfflineAlert('create new');
      return;
    }
    setEditingUser(null);
    setName('');
    setUsername('');
    setPassword('');
    setRole('field_worker');
    setShowPassword(false);
    setModalVisible(true);
  };

  const openEditModal = (u: User) => {
    if (!isOnline) {
      showOfflineAlert('edit');
      return;
    }
    setEditingUser(u);
    setName(u.name);
    setUsername(u.username);
    setPassword('');
    setRole(u.role);
    setShowPassword(false);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!isOnline) {
      showOfflineAlert(editingUser ? 'update' : 'create');
      return;
    }

    if (editingUser) {
      if (!name.trim()) {
        showAlert('Validation Error', 'Full Name is required.', 'error');
        return;
      }
      const result = await AuthService.updateUser(
        editingUser.id,
        {
          name,
          ...(password.trim() ? { password } : {}),
          role,
        },
        isOnline
      );

      if (result.success) {
        setModalVisible(false);
        await loadUsers();
        showAlert('User Updated', `User @${username} was updated successfully.`, 'success');
      } else {
        showAlert(
          result.offlineBlocked ? 'Internet Required' : 'Error',
          result.error || 'Failed to update user.',
          result.offlineBlocked ? 'warning' : 'error'
        );
      }
    } else {
      if (!name.trim() || !username.trim() || !password.trim()) {
        showAlert('Validation Error', 'Full Name, Username, and Password are all required.', 'error');
        return;
      }
      const result = await AuthService.createUser(
        {
          name,
          username,
          password,
          role,
        },
        isOnline
      );

      if (result.success) {
        setModalVisible(false);
        await loadUsers();
        showAlert(
          'User Created',
          `User @${username} registered successfully as ${role === 'supervisor' ? 'Supervisor' : 'Field Worker'}.`,
          'success'
        );
      } else {
        showAlert(
          result.offlineBlocked ? 'Internet Required' : 'Error',
          result.error || 'Failed to create user.',
          result.offlineBlocked ? 'warning' : 'error'
        );
      }
    }
  };

  const handleDelete = (u: User) => {
    if (!isOnline) {
      showOfflineAlert('delete');
      return;
    }
    if (u.username.toLowerCase() === 'narayan') {
      showAlert('Action Forbidden', 'The default supervisor "narayan" cannot be deleted.', 'error');
      return;
    }

    showAlert(
      'Confirm Delete',
      `Are you sure you want to delete user @${u.username} (${u.name})?`,
      'warning',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await AuthService.deleteUser(u.id, isOnline);
            if (res.success) {
              await loadUsers();
              showAlert('Deleted', `User @${u.username} was removed.`, 'success');
            } else {
              showAlert(
                res.offlineBlocked ? 'Internet Required' : 'Error',
                res.error || 'Failed to delete user.',
                res.offlineBlocked ? 'warning' : 'error'
              );
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: User }) => {
    const isSupervisor = item.role === 'supervisor';
    return (
      <View style={styles.userCard}>
        <View style={styles.userCardLeft}>
          <View style={[styles.avatarBox, isSupervisor ? styles.avatarSupervisor : styles.avatarWorker]}>
            <Ionicons
              name={isSupervisor ? 'shield-checkmark' : 'person'}
              size={20}
              color={isSupervisor ? '#7c3aed' : '#2563eb'}
            />
          </View>
          <View style={styles.userMeta}>
            <Text style={styles.userFullName}>{item.name}</Text>
            <Text style={styles.userUsername}>@{item.username}</Text>
            <View style={[styles.roleChip, isSupervisor ? styles.roleChipSup : styles.roleChipWorker]}>
              <Text style={styles.roleChipText}>
                {isSupervisor ? 'Supervisor' : 'Field Worker'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsCol}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={() => openEditModal(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>

          {item.username !== 'narayan' && (
            <TouchableOpacity
              style={styles.actionIconBtn}
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={20} color="#dc2626" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <HeaderBar
        title="User Management"
        showBack={true}
        onBack={onBack}
        onOpenMenu={onOpenMenu}
        isOnline={isOnline}
      />

      <View style={styles.topBar}>
        <View>
          <Text style={styles.summaryTitle}>Registered Accounts ({users.length})</Text>
          <Text style={styles.summarySubtitle}>RBAC Access Control (FR-1.3)</Text>
        </View>
        <TouchableOpacity style={styles.addUserBtn} onPress={openCreateModal} activeOpacity={0.85}>
          <Ionicons name="person-add" size={16} color="#ffffff" />
          <Text style={styles.addUserBtnText}>Add User</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={async () => {
              setIsRefreshing(true);
              await loadUsers();
              setIsRefreshing(false);
            }}
            colors={['#7c3aed']}
            tintColor="#7c3aed"
          />
        }
      />

      {/* Add / Edit User Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingUser ? 'Edit User' : 'Create New User'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Full Name */}
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Reetik Sil"
              value={name}
              onChangeText={setName}
            />

            {/* Username */}
            <Text style={styles.inputLabel}>Username (Unique ID)</Text>
            <TextInput
              style={[styles.input, editingUser && styles.inputDisabled]}
              placeholder="e.g. reetik"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              editable={!editingUser}
            />

            {/* Password */}
            <Text style={styles.inputLabel}>
              {editingUser ? 'New Password (optional)' : 'Password'}
            </Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={styles.passwordInput}
                placeholder={editingUser ? 'Leave blank to keep current password' : 'Password'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Role Selector */}
            <Text style={styles.inputLabel}>Role (Permissions)</Text>
            <View style={styles.roleSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  role === 'field_worker' && styles.roleOptionActive,
                ]}
                onPress={() => setRole('field_worker')}
              >
                <Ionicons
                  name="construct-outline"
                  size={18}
                  color={role === 'field_worker' ? COLORS.primary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.roleOptionText,
                    role === 'field_worker' && styles.roleOptionTextActive,
                  ]}
                >
                  Field Worker
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.roleOption,
                  role === 'supervisor' && styles.roleOptionActive,
                ]}
                onPress={() => setRole('supervisor')}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={role === 'supervisor' ? COLORS.primary : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.roleOptionText,
                    role === 'supervisor' && styles.roleOptionTextActive,
                  ]}
                >
                  Supervisor
                </Text>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalBtnsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>
                  {editingUser ? 'Save Changes' : 'Create User'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <StyledAlertModal
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onDismiss={() => setAlertState((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summarySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  addUserBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    ...SHADOWS.card,
  },
  addUserBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.2,
    borderColor: '#f0f1f5',
    ...SHADOWS.card,
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSupervisor: {
    backgroundColor: '#f3e8ff',
  },
  avatarWorker: {
    backgroundColor: '#eff6ff',
  },
  userMeta: {
    flex: 1,
  },
  userFullName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userUsername: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleChipSup: {
    backgroundColor: '#fef08a',
  },
  roleChipWorker: {
    backgroundColor: '#dbeafe',
  },
  roleChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1e293b',
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 10,
  },
  actionIconBtn: {
    padding: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1.2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: COLORS.textMuted,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  eyeBtn: {
    padding: 6,
  },
  roleSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  roleOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  roleOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  roleOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  modalBtnsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});

