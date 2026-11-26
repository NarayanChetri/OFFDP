import AsyncStorage from '@react-native-async-storage/async-storage';
import { FieldRecord, SyncQueueItem, CensusData, User } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { generateUUID } from '../utils/helpers';

const STORAGE_KEYS = {
  RECORDS: '@offdp_records_v6_clean',
  QUEUE: '@offdp_sync_queue_v6_clean',
  LAST_SYNC: '@offdp_last_sync_v6_clean',
  SYNC_SETTINGS: '@offdp_sync_settings_v1',
};

export interface SyncSettings {
  backgroundSync: boolean;
  wifiOnly: boolean;
}

const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  backgroundSync: true,
  wifiOnly: false,
};

// Normalize Aadhaar UID for strict de-duplication (12 digits, no spaces/dashes)
export const normalizeAadhar = (raw?: string): string => {
  if (!raw) return '';
  return raw.replace(/[^0-9]/g, '').trim();
};

export class StorageService {
  // Pure local instant read - NEVER BLOCKS ON NETWORK
  static async getLocalRecords(): Promise<FieldRecord[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.RECORDS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async getSyncSettings(): Promise<SyncSettings> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_SETTINGS);
      return raw ? { ...DEFAULT_SYNC_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SYNC_SETTINGS;
    } catch {
      return DEFAULT_SYNC_SETTINGS;
    }
  }

  static async saveSyncSettings(settings: SyncSettings): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_SETTINGS, JSON.stringify(settings));
  }

  // Gets records: loads local storage first, then pulls from Supabase if online.
  // Field workers only pull their own records from cloud; supervisors pull all records.
  static async getRecords(
    isOnline: boolean = true,
    currentUser?: User | null,
    forceCloud: boolean = false
  ): Promise<FieldRecord[]> {
    const local = await this.getLocalRecords();

    if ((isOnline || forceCloud) && isSupabaseConfigured() && currentUser) {
      try {
        let query = supabase
          .from('field_records')
          .select('*')
          .order('updated_at', { ascending: false });

        if (currentUser.role !== 'supervisor') {
          query = query.eq('submitted_by', currentUser.id);
        }

        const { data: cloudRecords, error } = await query;

        if (!error && cloudRecords) {
          const queue = await this.getSyncQueue();
          const unsyncedQueueItems = queue.filter(
            (q) => q.status === 'pending' || q.status === 'failed'
          );
          const pendingDeleteIds = new Set(
            unsyncedQueueItems
              .filter((q) => q.operation === 'DELETE')
              .map((q) => q.recordId)
          );
          const pendingModifyIds = new Set(
            unsyncedQueueItems
              .filter((q) => q.operation !== 'DELETE')
              .map((q) => q.recordId)
          );

          const mappedCloud: FieldRecord[] = cloudRecords.map((cr: any) => ({
            id: cr.id,
            siteName: cr.site_name,
            coordinates: {
              latitude: cr.latitude,
              longitude: cr.longitude,
            },
            observationType: cr.observation_type || 'Digital Census 2026',
            data: cr.data || {},
            photoUri: cr.photo_url || undefined,
            status: cr.status || 'synced',
            version: cr.version || 1,
            vectorClock: cr.vector_clock || {},
            createdAt: cr.created_at || cr.updated_at,
            updatedAt: cr.updated_at,
            submittedBy: cr.submitted_by || 'Field Worker',
            submittedByName: cr.submitted_by_name || 'Field Worker',
            reviewedBy: cr.reviewed_by,
            reviewedByName: cr.reviewed_by_name,
            reviewedAt: cr.reviewed_at,
            supervisorNotes: cr.supervisor_notes,
          }));

          // Preserve local drafts, pending items, and any record with unsynced local edits
          const preservedLocal = local.filter(
            (l) =>
              !pendingDeleteIds.has(l.id) &&
              (l.status === 'draft' || l.status === 'pending' || pendingModifyIds.has(l.id))
          );
          const combined = [...preservedLocal];

          mappedCloud.forEach((mc) => {
            if (pendingDeleteIds.has(mc.id)) return;
            const existingIdx = combined.findIndex((c) => c.id === mc.id);
            if (existingIdx >= 0) {
              // Keep local version if it's a draft or has unsynced local mutations
              if (
                combined[existingIdx].status !== 'draft' &&
                !pendingModifyIds.has(mc.id)
              ) {
                combined[existingIdx] = mc;
              }
            } else {
              combined.push(mc);
            }
          });

          await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(combined));
          return combined;
        }
      } catch {
        // Offline fallback
      }
    }

    return local;
  }

  static async saveRecords(records: FieldRecord[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
  }

  // Robust offline save - checks for duplicate Aadhaar UID
  static async saveRecord(
    record: FieldRecord,
    isDraft: boolean
  ): Promise<{ success: boolean; isDuplicate: boolean; duplicateOwner?: string }> {
    const records = await this.getLocalRecords();
    const cleanAadhar = normalizeAadhar(record.data?.aadharNumber);

    // If submitting a completed survey (not draft), verify no duplicate Aadhaar exists
    if (!isDraft && cleanAadhar.length === 12) {
      const duplicate = records.find(
        (r) => r.id !== record.id && normalizeAadhar(r.data?.aadharNumber) === cleanAadhar
      );

      if (duplicate) {
        return {
          success: false,
          isDuplicate: true,
          duplicateOwner:
            duplicate.data?.headName || duplicate.submittedByName || 'Another Household',
        };
      }
    }

    const index = records.findIndex((r) => r.id === record.id);
    if (index >= 0) {
      records[index] = record;
    } else {
      records.unshift(record);
    }

    await this.saveRecords(records);
    return { success: true, isDuplicate: false };
  }

  private static async queueRecordMutation(
    record: FieldRecord,
    operation: 'CREATE' | 'UPDATE' | 'DELETE'
  ): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: `q-${generateUUID()}`,
      recordId: record.id,
      siteName: record.siteName,
      observationType: record.observationType || 'Digital Census 2026',
      operation,
      deltaPayload:
        operation === 'DELETE'
          ? { id: record.id }
          : {
              siteName: record.siteName,
              observationType: record.observationType,
              data: record.data,
              status: record.status,
            },
      retryCount: 0,
      status: 'pending',
    };
    await this.addToSyncQueue(queueItem);
  }

  // Supervisor edits census record details directly
  static async updateRecordDetails(
    recordId: string,
    updatedData: Partial<CensusData>,
    supervisorId: string,
    supervisorName: string,
    supervisorNotes?: string,
    isOnline: boolean = true
  ): Promise<boolean> {
    const records = await this.getLocalRecords();
    const index = records.findIndex((r) => r.id === recordId);
    if (index === -1) return false;

    const now = new Date().toISOString();
    records[index].data = {
      ...records[index].data,
      ...updatedData,
    };
    records[index].version = (records[index].version || 1) + 1;
    records[index].vectorClock = {
      ...(records[index].vectorClock || {}),
      [supervisorId]: ((records[index].vectorClock || {})[supervisorId] || 0) + 1,
    };
    records[index].updatedAt = now;
    records[index].reviewedBy = supervisorId;
    records[index].reviewedByName = supervisorName;
    records[index].reviewedAt = now;
    if (supervisorNotes !== undefined) {
      records[index].supervisorNotes = supervisorNotes;
    }

    await this.saveRecords(records);

    let syncedToCloud = false;
    if (isOnline && isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('field_records')
          .update({
            data: records[index].data,
            version: records[index].version,
            vector_clock: records[index].vectorClock,
            reviewed_by: supervisorId,
            reviewed_by_name: supervisorName,
            reviewed_at: now,
            supervisor_notes: records[index].supervisorNotes || null,
            updated_at: now,
          })
          .eq('id', recordId);
        if (!error) syncedToCloud = true;
      } catch (err) {
        console.warn('Cloud update deferred to sync queue:', err);
      }
    }

    if (!syncedToCloud) {
      await this.queueRecordMutation(records[index], 'UPDATE');
    }

    return true;
  }

  // Supervisor approves a worker submission
  static async approveRecord(
    recordId: string,
    supervisorId: string,
    supervisorName: string,
    notes?: string,
    isOnline: boolean = true
  ): Promise<boolean> {
    const records = await this.getLocalRecords();
    const index = records.findIndex((r) => r.id === recordId);
    if (index === -1) return false;

    const now = new Date().toISOString();
    records[index].status = 'approved';
    records[index].version = (records[index].version || 1) + 1;
    records[index].updatedAt = now;
    records[index].reviewedBy = supervisorId;
    records[index].reviewedByName = supervisorName;
    records[index].reviewedAt = now;
    if (notes !== undefined) records[index].supervisorNotes = notes;

    await this.saveRecords(records);

    let syncedToCloud = false;
    if (isOnline && isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('field_records')
          .update({
            status: 'approved',
            version: records[index].version,
            reviewed_by: supervisorId,
            reviewed_by_name: supervisorName,
            reviewed_at: now,
            supervisor_notes: notes || null,
            updated_at: now,
          })
          .eq('id', recordId);
        if (!error) syncedToCloud = true;
      } catch {}
    }

    if (!syncedToCloud) {
      await this.queueRecordMutation(records[index], 'UPDATE');
    }

    return true;
  }

  // Supervisor rejects a worker submission
  static async rejectRecord(
    recordId: string,
    supervisorId: string,
    supervisorName: string,
    reason: string,
    isOnline: boolean = true
  ): Promise<boolean> {
    const records = await this.getLocalRecords();
    const index = records.findIndex((r) => r.id === recordId);
    if (index === -1) return false;

    const now = new Date().toISOString();
    records[index].status = 'rejected';
    records[index].version = (records[index].version || 1) + 1;
    records[index].updatedAt = now;
    records[index].reviewedBy = supervisorId;
    records[index].reviewedByName = supervisorName;
    records[index].reviewedAt = now;
    records[index].supervisorNotes = reason;

    await this.saveRecords(records);

    let syncedToCloud = false;
    if (isOnline && isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('field_records')
          .update({
            status: 'rejected',
            version: records[index].version,
            reviewed_by: supervisorId,
            reviewed_by_name: supervisorName,
            reviewed_at: now,
            supervisor_notes: reason,
            updated_at: now,
          })
          .eq('id', recordId);
        if (!error) syncedToCloud = true;
      } catch {}
    }

    if (!syncedToCloud) {
      await this.queueRecordMutation(records[index], 'UPDATE');
    }

    return true;
  }

  static async deleteRecord(recordId: string, isOnline: boolean = true): Promise<void> {
    const records = await this.getLocalRecords();
    const target = records.find((r) => r.id === recordId);
    const wasOnlyLocalDraft = target?.status === 'draft';

    const filtered = records.filter((r) => r.id !== recordId);
    await this.saveRecords(filtered);

    const queue = await this.getSyncQueue();
    const filteredQueue = queue.filter((q) => q.recordId !== recordId);
    await this.saveSyncQueue(filteredQueue);

    if (wasOnlyLocalDraft) {
      return;
    }

    let deletedInCloud = false;
    if (isOnline && isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('field_records').delete().eq('id', recordId);
        if (!error) deletedInCloud = true;
      } catch {}
    }

    if (!deletedInCloud && target) {
      await this.queueRecordMutation(target, 'DELETE');
    }
  }

  static async getSyncQueue(): Promise<SyncQueueItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async saveSyncQueue(queue: SyncQueueItem[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  }

  static async addToSyncQueue(item: SyncQueueItem): Promise<void> {
    const queue = await this.getSyncQueue();
    const existingIndex = queue.findIndex((q) => q.recordId === item.recordId);
    if (existingIndex >= 0) {
      queue[existingIndex] = item;
    } else {
      queue.push(item);
    }
    await this.saveSyncQueue(queue);
  }

  static async getLastSyncTime(): Promise<string> {
    const time = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return time || 'Never';
  }

  static async setLastSyncTime(timestamp: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp);
  }
}
