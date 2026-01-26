/**
 * Stock-X Sync Manager
 * Phase 2: Handles syncing offline operations with Supabase when online
 */

import { supabase } from '@/integrations/supabase/client';
import { offlineDB, SyncOperation, isOfflineId } from './offlineDB';
import { logger } from './logger';

// Sync configuration
const SYNC_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  batchSize: 10,
};

// Table sync priority (higher = sync first)
const TABLE_PRIORITY: Record<string, number> = {
  customers: 100,
  lpg_brands: 90,
  product_prices: 85,
  pos_transactions: 80,
  pos_transaction_items: 75,
  pob_transactions: 70,
  pob_transaction_items: 65,
  daily_expenses: 60,
  staff: 55,
  staff_payments: 50,
  vehicles: 45,
  vehicle_costs: 40,
  orders: 35,
  order_items: 30,
  customer_payments: 25,
  stock_movements: 20,
};

// Sync status types
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

// Sync result
export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

// Sync event types
export type SyncEventType = 'sync-start' | 'sync-complete' | 'sync-error' | 'sync-progress';

export interface SyncEvent {
  type: SyncEventType;
  detail: {
    total?: number;
    synced?: number;
    failed?: number;
    error?: string;
    table?: string;
  };
}

/**
 * Sync Manager class - handles offline to online data synchronization
 */
class SyncManager {
  private isSyncing = false;
  private listeners: Set<(event: SyncEvent) => void> = new Set();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  /**
   * Add a sync event listener
   */
  addListener(callback: (event: SyncEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Emit a sync event
   */
  private emit(event: SyncEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        logger.error('Sync listener error', error, { component: 'SyncManager' });
      }
    });
  }

  /**
   * Handle coming online
   */
  private handleOnline(): void {
    this.isOnline = true;
    logger.info('Network online - starting sync', { component: 'SyncManager' });
    this.syncAll();
  }

  /**
   * Handle going offline
   */
  private handleOffline(): void {
    this.isOnline = false;
    logger.info('Network offline - sync paused', { component: 'SyncManager' });
  }

  /**
   * Check if online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Check if currently syncing
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Calculate exponential backoff delay
   */
  private getBackoffDelay(retries: number): number {
    const delay = SYNC_CONFIG.baseDelay * Math.pow(2, retries);
    return Math.min(delay, SYNC_CONFIG.maxDelay);
  }

  /**
   * Sync a single operation to Supabase
   */
  private async syncOperation(operation: SyncOperation): Promise<boolean> {
    const { id, type, table, data } = operation;

    try {
      // Mark as syncing
      await offlineDB.markSyncing(id);

      switch (type) {
        case 'INSERT': {
          // If ID is offline-generated, we need to let Supabase generate the real ID
          const insertData = { ...data };
          if (isOfflineId(insertData.id)) {
            delete insertData.id;
          }

          const { error } = await supabase
            .from(table as any)
            .insert(insertData);

          if (error) throw error;
          break;
        }

        case 'UPDATE': {
          const { id: recordId, ...updateData } = data;
          
          // Skip if the ID is offline-generated (can't update something not synced)
          if (isOfflineId(recordId)) {
            logger.warn('Cannot update offline-only record', { component: 'SyncManager', recordId });
            await offlineDB.markFailed(id, 'Cannot update offline-only record');
            return false;
          }

          const { error } = await supabase
            .from(table as any)
            .update(updateData)
            .eq('id', recordId);

          if (error) throw error;
          break;
        }

        case 'DELETE': {
          const recordId = data.id;
          
          // Skip if the ID is offline-generated
          if (isOfflineId(recordId)) {
            // Just mark as synced since it was never on server
            await offlineDB.markSynced(id);
            return true;
          }

          const { error } = await supabase
            .from(table as any)
            .delete()
            .eq('id', recordId);

          if (error) throw error;
          break;
        }
      }

      // Success - mark as synced
      await offlineDB.markSynced(id);
      logger.info(`Synced operation: ${type} on ${table} (${id})`, null, { component: 'SyncManager' });
      return true;

    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      await offlineDB.markFailed(id, errorMessage);
      logger.error(`Failed to sync operation: ${type} on ${table} (${id})`, error, { component: 'SyncManager' });
      return false;
    }
  }

  /**
   * Sync all pending operations
   */
  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) {
      logger.info('Sync already in progress', { component: 'SyncManager' });
      return { success: false, synced: 0, failed: 0, errors: ['Sync already in progress'] };
    }

    if (!this.isOnline) {
      logger.info('Cannot sync - offline', { component: 'SyncManager' });
      return { success: false, synced: 0, failed: 0, errors: ['Device is offline'] };
    }

    this.isSyncing = true;
    const result: SyncResult = { success: true, synced: 0, failed: 0, errors: [] };

    try {
      // Get pending operations
      const pendingOps = await offlineDB.getPendingOperations();
      
      if (pendingOps.length === 0) {
        logger.info('No pending operations to sync', { component: 'SyncManager' });
        return result;
      }

      // Sort by priority (higher priority tables first)
      pendingOps.sort((a, b) => {
        const priorityA = TABLE_PRIORITY[a.table] || 0;
        const priorityB = TABLE_PRIORITY[b.table] || 0;
        if (priorityB !== priorityA) return priorityB - priorityA;
        return a.timestamp - b.timestamp; // Then by timestamp (oldest first)
      });

      this.emit({ 
        type: 'sync-start', 
        detail: { total: pendingOps.length } 
      });

      // Process operations in batches
      for (let i = 0; i < pendingOps.length; i += SYNC_CONFIG.batchSize) {
        if (!this.isOnline) {
          result.errors.push('Lost connection during sync');
          break;
        }

        const batch = pendingOps.slice(i, i + SYNC_CONFIG.batchSize);
        
        for (const operation of batch) {
          // Check retry limit
          if (operation.retries >= SYNC_CONFIG.maxRetries) {
            result.failed++;
            result.errors.push(`Max retries exceeded for ${operation.table}:${operation.id}`);
            continue;
          }

          const success = await this.syncOperation(operation);
          
          if (success) {
            result.synced++;
          } else {
            result.failed++;
          }

          this.emit({
            type: 'sync-progress',
            detail: {
              total: pendingOps.length,
              synced: result.synced,
              failed: result.failed,
              table: operation.table
            }
          });
        }

        // Small delay between batches to avoid overwhelming the server
        if (i + SYNC_CONFIG.batchSize < pendingOps.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Clear completed operations
      await offlineDB.clearCompletedOperations();

      result.success = result.failed === 0;

      this.emit({
        type: 'sync-complete',
        detail: {
          synced: result.synced,
          failed: result.failed
        }
      });

      logger.info('Sync completed', { 
        component: 'SyncManager', 
        synced: result.synced, 
        failed: result.failed 
      });

    } catch (error: any) {
      result.success = false;
      result.errors.push(error?.message || 'Sync failed');
      
      this.emit({
        type: 'sync-error',
        detail: { error: error?.message }
      });

      logger.error('Sync failed', error, { component: 'SyncManager' });
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Retry failed operations
   */
  async retryFailed(): Promise<SyncResult> {
    try {
      // Get failed operations
      const failedOps = await offlineDB.getOperationsByStatus('failed');
      
      // Reset them to pending
      for (const op of failedOps) {
        if (op.retries < SYNC_CONFIG.maxRetries) {
          await offlineDB.resetToPending(op.id);
        }
      }

      // Run sync
      return this.syncAll();
    } catch (error: any) {
      logger.error('Failed to retry operations', error, { component: 'SyncManager' });
      return { success: false, synced: 0, failed: 0, errors: [error?.message] };
    }
  }

  /**
   * Start periodic sync
   */
  startPeriodicSync(intervalMs: number = 60000): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncAll();
      }
    }, intervalMs);

    logger.info('Started periodic sync', { component: 'SyncManager', intervalMs });
  }

  /**
   * Stop periodic sync
   */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      logger.info('Stopped periodic sync', { component: 'SyncManager' });
    }
  }

  /**
   * Get sync statistics
   */
  async getStats(): Promise<{
    pending: number;
    syncing: number;
    failed: number;
    completed: number;
  }> {
    const [pending, syncing, failed, completed] = await Promise.all([
      offlineDB.getOperationsByStatus('pending'),
      offlineDB.getOperationsByStatus('syncing'),
      offlineDB.getOperationsByStatus('failed'),
      offlineDB.getOperationsByStatus('completed'),
    ]);

    return {
      pending: pending.length,
      syncing: syncing.length,
      failed: failed.length,
      completed: completed.length,
    };
  }
}

// Export singleton instance
export const syncManager = new SyncManager();
