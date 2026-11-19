import { StorageService } from './storageService';
import { SyncQueueItem } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  timestamp: string;
}

export class SyncService {
  private static isOnlineState: boolean = true;
  private static isSyncingInProgress: boolean = false;

  static isOnline(): boolean {
    return this.isOnlineState;
  }

  static setOnline(online: boolean) {
    this.isOnlineState = online;
  }

  // Executes synchronization of pending queue
  static async executeSync(
    onProgress?: (current: number, total: number, message: string) => void
  ): Promise<SyncResult> {
    if (this.isSyncingInProgress) {
      return { syncedCount: 0, failedCount: 0, timestamp: '' };
    }

    this.isSyncingInProgress = true;
    let syncedCount = 0;
    let failedCount = 0;

    try {
      const queue = await StorageService.getSyncQueue();
      const pendingItems = queue.filter((item) => item.status === 'pending');
      const records = await StorageService.getLocalRecords();
      const isCloudConnected = isSupabaseConfigured() && this.isOnlineState;

      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];
        const rec = records.find((r) => r.id === item.recordId);

        if (!rec) {
          item.status = 'synced';
          continue;
        }

        if (onProgress) {
          onProgress(
            i + 1,
            pendingItems.length,
            isCloudConnected
              ? `Syncing ${rec.data?.headName || item.siteName}...`
              : `Synchronizing locally...`
          );
        }

        if (isCloudConnected) {
          try {
            const { error } = await supabase.from('field_records').upsert({
              id: rec.id,
              site_name: rec.siteName,
              latitude: rec.coordinates.latitude,
              longitude: rec.coordinates.longitude,
              observation_type: rec.observationType || 'Digital Census 2026',
              data: rec.data,
              photo_url: rec.photoUri || null,
              status: rec.status === 'approved' ? 'approved' : 'synced',
              version: rec.version,
              vector_clock: rec.vectorClock,
              submitted_by: rec.submittedBy,
              submitted_by_name: rec.submittedByName,
              reviewed_by: rec.reviewedBy || null,
              reviewed_by_name: rec.reviewedByName || null,
              reviewed_at: rec.reviewedAt || null,
              supervisor_notes: rec.supervisorNotes || null,
              updated_at: new Date().toISOString(),
            });

            if (error) {
              console.warn('Supabase sync error:', error.message);
              failedCount++;
              item.status = 'failed';
              item.errorReason = error.message;
              continue;
            }
          } catch (err) {
            console.warn('Network sync error:', err);
            failedCount++;
            item.status = 'failed';
            continue;
          }
        }

        syncedCount++;
        item.status = 'synced';
        item.lastAttempt = new Date().toISOString();
        if (rec) {
          rec.status = rec.status === 'approved' ? 'approved' : 'synced';
        }
      }

      await StorageService.saveRecords(records);
      await StorageService.saveSyncQueue(queue);

      const now = new Date();
      const timeString =
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) +
        ', ' +
        now.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
      await StorageService.setLastSyncTime(timeString);

      return {
        syncedCount,
        failedCount,
        timestamp: timeString,
      };
    } finally {
      this.isSyncingInProgress = false;
    }
  }
}
