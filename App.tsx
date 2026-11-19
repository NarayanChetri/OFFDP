import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import NetInfo from '@react-native-community/netinfo';
import { ScreenName, User, FieldRecord, SyncQueueItem, CensusData } from './src/types';
import { StorageService } from './src/services/storageService';
import { AuthService, DEFAULT_SUPERVISOR } from './src/services/authService';
import { SyncService } from './src/services/syncService';

// Screens
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { DataCollectionScreen } from './src/screens/DataCollectionScreen';
import { MyRecordsScreen } from './src/screens/MyRecordsScreen';
import { SyncQueueScreen } from './src/screens/SyncQueueScreen';
import { AllRecordsScreen } from './src/screens/AllRecordsScreen';
import { SupervisorReviewScreen } from './src/screens/SupervisorReviewScreen';
import { UserManagementScreen } from './src/screens/UserManagementScreen';

// Sliding Drawer Menu
import { NavigationDrawer } from './src/components/NavigationDrawer';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenName>('Splash');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(DEFAULT_SUPERVISOR);
  const [records, setRecords] = useState<FieldRecord[]>([]);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState('Never');

  // Draft being resumed/edited
  const [editingDraft, setEditingDraft] = useState<FieldRecord | null>(null);

  // Real-time network state
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const isOnlineRef = useRef(true);

  // Monitor network connectivity
  useEffect(() => {
    NetInfo.fetch().then((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      isOnlineRef.current = online;
      SyncService.setOnline(online);
    });

    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      isOnlineRef.current = online;
      SyncService.setOnline(online);
      if (online) {
        triggerAutoSync();
      }
    });

    return () => unsubscribe();
  }, []);

  const loadData = async () => {
    const loadedRecords = await StorageService.getRecords();
    const loadedQueue = await StorageService.getSyncQueue();
    const loadedTime = await StorageService.getLastSyncTime();
    const activeUser = await AuthService.getCurrentUser();

    setRecords(loadedRecords);
    setSyncQueue(loadedQueue);
    setLastSyncTime(loadedTime);
    if (activeUser) {
      setCurrentUser(activeUser);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Background auto sync
  const triggerAutoSync = async () => {
    if (!isOnlineRef.current) return;
    try {
      await SyncService.executeSync();
      const local = await StorageService.getLocalRecords();
      const loadedQueue = await StorageService.getSyncQueue();
      const loadedTime = await StorageService.getLastSyncTime();
      setRecords(local);
      setSyncQueue(loadedQueue);
      setLastSyncTime(loadedTime);
    } catch {}
  };

  // Periodic background sync interval (every 15 seconds)
  useEffect(() => {
    const syncTimer = setInterval(() => {
      if (isOnlineRef.current) {
        triggerAutoSync();
      }
    }, 15000);

    return () => clearInterval(syncTimer);
  }, []);

  // Save or update census record (Draft or Final)
  const handleSaveRecord = async (newRecordData: Partial<FieldRecord>, isDraft: boolean) => {
    const authorId = currentUser ? currentUser.id : 'worker-001';
    const authorName = currentUser ? currentUser.name : 'Field Worker';
    const now = new Date().toISOString();

    const targetId = newRecordData.id || `rec-${Date.now().toString().slice(-6)}`;

    const fullRecord: FieldRecord = {
      id: targetId,
      siteName: newRecordData.siteName || 'Survey Site',
      coordinates: newRecordData.coordinates || { latitude: 26.634, longitude: 92.791 },
      observationType: 'Digital Census 2026',
      data: (newRecordData.data as CensusData) || ({} as any),
      photoUri: newRecordData.photoUri,
      photoCompressedSize: newRecordData.photoCompressedSize,
      status: isDraft ? 'draft' : 'pending',
      version: 1,
      vectorClock: { [authorId]: 1 },
      createdAt: newRecordData.createdAt || now,
      updatedAt: now,
      submittedBy: authorId,
      submittedByName: authorName,
    };

    // Save locally (NEVER BLOCKS ON NETWORK - WORKS OFFLINE!)
    const saveResult = await StorageService.saveRecord(fullRecord, isDraft);

    // If duplicate Aadhaar UID exists, alert and halt (Requirement 4)
    if (!saveResult.success && saveResult.isDuplicate) {
      Alert.alert(
        'Aadhaar Already Registered',
        `A census household with Aadhaar UID ${fullRecord.data.aadharNumber} is already registered in the system (Head of Family: ${saveResult.duplicateOwner || 'Existing Record'}).\n\nDuplicate submissions with the same Aadhaar card are prohibited.`,
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isDraft) {
      const queueItem: SyncQueueItem = {
        id: `q-${Date.now().toString().slice(-6)}`,
        recordId: fullRecord.id,
        siteName: fullRecord.siteName,
        observationType: fullRecord.observationType,
        operation: 'CREATE',
        deltaPayload: {
          siteName: fullRecord.siteName,
          observationType: fullRecord.observationType,
          data: fullRecord.data,
        },
        retryCount: 0,
        status: 'pending',
      };
      await StorageService.addToSyncQueue(queueItem);

      // Trigger background sync if online
      if (isOnlineRef.current) {
        triggerAutoSync();
      }
    }

    setEditingDraft(null);
    const local = await StorageService.getLocalRecords();
    const loadedQueue = await StorageService.getSyncQueue();
    setRecords(local);
    setSyncQueue(loadedQueue);

    Alert.alert(
      isDraft ? 'Draft Saved' : 'Survey Submitted',
      isDraft
        ? 'Your survey draft has been saved locally. You can resume and complete it anytime.'
        : 'Census survey has been recorded in offline store and queued for cloud sync.'
    );
    setCurrentScreen('MyRecords');
  };

  // Supervisor edits census record details directly
  const handleEditRecord = async (
    recordId: string,
    updatedData: Partial<CensusData>,
    supervisorNotes?: string
  ) => {
    if (!currentUser) return;
    await StorageService.updateRecordDetails(
      recordId,
      updatedData,
      currentUser.id,
      currentUser.name,
      supervisorNotes
    );
    const local = await StorageService.getLocalRecords();
    setRecords(local);
  };

  // Delete draft record
  const handleDeleteRecord = async (recordId: string) => {
    await StorageService.deleteRecord(recordId);
    const local = await StorageService.getLocalRecords();
    setRecords(local);
  };

  // Supervisor approves record
  const handleApproveRecord = async (recordId: string, notes?: string) => {
    if (!currentUser) return;
    await StorageService.approveRecord(recordId, currentUser.id, currentUser.name, notes);
    const local = await StorageService.getLocalRecords();
    setRecords(local);
  };

  // Supervisor rejects record
  const handleRejectRecord = async (recordId: string, reason: string) => {
    if (!currentUser) return;
    await StorageService.rejectRecord(recordId, currentUser.id, currentUser.name, reason);
    const local = await StorageService.getLocalRecords();
    setRecords(local);
  };

  // Logout handler
  const handleLogout = async () => {
    await AuthService.logout();
    setCurrentUser(null);
    setCurrentScreen('Login');
  };

  // Render screens
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'Splash':
        return (
          <SplashScreen
            onContinue={() => setCurrentScreen('Login')}
          />
        );

      case 'Login':
        return (
          <LoginScreen
            onLoginSuccess={(user) => {
              setCurrentUser(user);
              setCurrentScreen('Dashboard');
            }}
            isOnline={isOnline}
          />
        );

      case 'Dashboard':
        return (
          <DashboardScreen
            user={currentUser || DEFAULT_SUPERVISOR}
            records={records}
            syncQueue={syncQueue}
            lastSyncTime={lastSyncTime}
            isOnline={isOnline}
            onRefresh={loadData}
            onOpenMenu={() => setDrawerVisible(true)}
            onNavigateNewEntry={() => {
              setEditingDraft(null);
              setCurrentScreen('DataCollection');
            }}
            onNavigateMyRecords={() => setCurrentScreen('MyRecords')}
            onNavigateSyncQueue={() => setCurrentScreen('SyncQueue')}
            onNavigateUserManagement={() => setCurrentScreen('UserManagement')}
            onNavigateSupervisorReview={() => setCurrentScreen('SupervisorReview')}
            onNavigateAllRecords={() => setCurrentScreen('AllRecords')}
          />
        );

      case 'DataCollection':
        return (
          <DataCollectionScreen
            onBack={() => {
              setEditingDraft(null);
              setCurrentScreen('Dashboard');
            }}
            onOpenMenu={() => setDrawerVisible(true)}
            isOnline={isOnline}
            onSaveRecord={handleSaveRecord}
            initialRecord={editingDraft}
          />
        );

      case 'MyRecords':
        return (
          <MyRecordsScreen
            records={records}
            isOnline={isOnline}
            onBack={() => setCurrentScreen('Dashboard')}
            onOpenMenu={() => setDrawerVisible(true)}
            onDeleteRecord={handleDeleteRecord}
            onNavigateConflict={() => {}}
            onNavigateNewEntry={() => {
              setEditingDraft(null);
              setCurrentScreen('DataCollection');
            }}
            onEditDraft={(draft) => {
              setEditingDraft(draft);
              setCurrentScreen('DataCollection');
            }}
            onRefresh={loadData}
          />
        );

      case 'SyncQueue':
        return (
          <SyncQueueScreen
            syncQueue={syncQueue}
            lastSyncTime={lastSyncTime}
            isOnline={isOnline}
            onBack={() => setCurrentScreen('Dashboard')}
            onOpenMenu={() => setDrawerVisible(true)}
            onSyncCompleted={loadData}
            onNavigateConflict={() => {}}
          />
        );

      case 'AllRecords':
        return (
          <AllRecordsScreen
            records={records}
            isOnline={isOnline}
            onBack={() => setCurrentScreen('Dashboard')}
            onOpenMenu={() => setDrawerVisible(true)}
            onEditRecord={handleEditRecord}
            onRefresh={loadData}
          />
        );

      case 'SupervisorReviewScreen' as any:
      case 'SupervisorReview':
        return (
          <SupervisorReviewScreen
            records={records}
            isOnline={isOnline}
            onBack={() => setCurrentScreen('Dashboard')}
            onOpenMenu={() => setDrawerVisible(true)}
            onApproveRecord={handleApproveRecord}
            onRejectRecord={handleRejectRecord}
            onEditRecord={handleEditRecord}
            onRefresh={loadData}
            onNavigateUsers={() => setCurrentScreen('UserManagement')}
          />
        );

      case 'UserManagement':
        return (
          <UserManagementScreen
            onBack={() => setCurrentScreen('Dashboard')}
            onOpenMenu={() => setDrawerVisible(true)}
            isOnline={isOnline}
          />
        );

      default:
        return (
          <DashboardScreen
            user={currentUser || DEFAULT_SUPERVISOR}
            records={records}
            syncQueue={syncQueue}
            lastSyncTime={lastSyncTime}
            isOnline={isOnline}
            onRefresh={loadData}
            onOpenMenu={() => setDrawerVisible(true)}
            onNavigateNewEntry={() => {
              setEditingDraft(null);
              setCurrentScreen('DataCollection');
            }}
            onNavigateMyRecords={() => setCurrentScreen('MyRecords')}
            onNavigateSyncQueue={() => setCurrentScreen('SyncQueue')}
            onNavigateUserManagement={() => setCurrentScreen('UserManagement')}
            onNavigateSupervisorReview={() => setCurrentScreen('SupervisorReview')}
            onNavigateAllRecords={() => setCurrentScreen('AllRecords')}
          />
        );
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {renderCurrentScreen()}

      {/* Smooth Sliding Hamburger Drawer */}
      <NavigationDrawer
        visible={drawerVisible}
        currentScreen={currentScreen}
        user={currentUser}
        isOnline={isOnline}
        onSelectScreen={(screen) => setCurrentScreen(screen)}
        onClose={() => setDrawerVisible(false)}
        onLogout={handleLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
