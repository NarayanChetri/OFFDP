import AsyncStorage from '@react-native-async-storage/async-storage';
import { FieldRecord, SyncQueueItem, CensusData } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEYS = {
  RECORDS: '@offdp_records_v6_clean',
  QUEUE: '@offdp_sync_queue_v6_clean',
  LAST_SYNC: '@offdp_last_sync_v6_clean',
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

  // Gets records: loads local storage first, then syncs with Supabase if online
  static async getRecords(): Promise<FieldRecord[]> {
    let local = await this.getLocalRecords();

    // Pull from cloud if online
    if (isSupabaseConfigured()) {
      try {
        const { data: cloudRecords, error } = await supabase
          .from('field_records')
          .select('*')
          .order('updated_at', { ascending: false });

        if (!error && cloudRecords && cloudRecords.length >= 0) {
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

          // Preserve local drafts and pending queue items
          const localDraftsAndPending = local.filter(
            (l) => l.status === 'draft' || l.status === 'pending'
          );
          const combined = [...localDraftsAndPending];

          mappedCloud.forEach((mc) => {
            const existingIdx = combined.findIndex((c) => c.id === mc.id);
            if (existingIdx >= 0) {
              if (combined[existingIdx].status !== 'draft') {
                combined[existingIdx] = mc;
              }
            } else {
              combined.push(mc);
            }
          });

          await AsyncStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(combined));
          return combined;
        }
      } catch (err) {
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
          duplicateOwner: duplicate.data?.headName || duplicate.submittedByName || 'Another Household',
        };
      }
    }

    // Save or update in local storage
    const index = records.findIndex((r) => r.id === record.id);
    if (index >= 0) {
      records[index] = record;
    } else {
      records.unshift(record);
    }

    await this.saveRecords(records);
    return { success: true, isDuplicate: false };
  }

  // Supervisor edits census record details directly
  static async updateRecordDetails(
    recordId: string,
    updatedData: Partial<CensusData>,
    supervisorId: string,
    supervisorName: string,
    supervisorNotes?: string
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
    records[index].updatedAt = now;
    records[index].reviewedBy = supervisorId;
    records[index].reviewedByName = supervisorName;
    records[index].reviewedAt = now;
    if (supervisorNotes) {
      records[index].supervisorNotes = supervisorNotes;
    }

    await this.saveRecords(records);

    // Upload change to Supabase cloud if online
    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('field_records')
          .update({
            data: records[index].data,
            version: records[index].version,
            reviewed_by: supervisorId,
            reviewed_by_name: supervisorName,
            reviewed_at: now,
            supervisor_notes: records[index].supervisorNotes,
            updated_at: now,
          })
          .eq('id', recordId);
      } catch (err) {
        console.warn('Cloud update failed:', err);
      }
    }

    return true;
  }

  // Supervisor approves a worker submission
  static async approveRecord(
    recordId: string,
    supervisorId: string,
    supervisorName: string,
    notes?: string
  ): Promise<boolean> {
    const records = await this.getLocalRecords();
    const index = records.findIndex((r) => r.id === recordId);
    if (index === -1) return false;

    const now = new Date().toISOString();
    records[index].status = 'approved';
    records[index].reviewedBy = supervisorId;
    records[index].reviewedByName = supervisorName;
    records[index].reviewedAt = now;
    if (notes) records[index].supervisorNotes = notes;

    await this.saveRecords(records);

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('field_records')
          .update({
            status: 'approved',
            reviewed_by: supervisorId,
            reviewed_by_name: supervisorName,
            reviewed_at: now,
            supervisor_notes: notes || null,
            updated_at: now,
          })
          .eq('id', recordId);
      } catch (err) {}
    }

    return true;
  }

  // Supervisor rejects a worker submission
  static async rejectRecord(
    recordId: string,
    supervisorId: string,
    supervisorName: string,
    reason: string
  ): Promise<boolean> {
    const records = await this.getLocalRecords();
    const index = records.findIndex((r) => r.id === recordId);
    if (index === -1) return false;

    const now = new Date().toISOString();
    records[index].status = 'rejected';
    records[index].reviewedBy = supervisorId;
    records[index].reviewedByName = supervisorName;
    records[index].reviewedAt = now;
    records[index].supervisorNotes = reason;

    await this.saveRecords(records);

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('field_records')
          .update({
            status: 'rejected',
            reviewed_by: supervisorId,
            reviewed_by_name: supervisorName,
            reviewed_at: now,
            supervisor_notes: reason,
            updated_at: now,
          })
          .eq('id', recordId);
      } catch (err) {}
    }

    return true;
  }

  static async deleteRecord(recordId: string): Promise<void> {
    const records = await this.getLocalRecords();
    const filtered = records.filter((r) => r.id !== recordId);
    await this.saveRecords(filtered);

    const queue = await this.getSyncQueue();
    const filteredQueue = queue.filter((q) => q.recordId !== recordId);
    await this.saveSyncQueue(filteredQueue);

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('field_records').delete().eq('id', recordId);
      } catch {}
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
