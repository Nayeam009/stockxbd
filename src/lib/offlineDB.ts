/**
 * Stock-X Offline Database (IndexedDB Wrapper)
 * Phase 1: Local-first data storage for offline-capable app
 */

import { logger } from './logger';

// Database configuration
const DB_NAME = 'stockx-offline-db';
const DB_VERSION = 1;

// Store definitions with indexes
const STORE_CONFIGS: Record<string, { keyPath: string; indexes: { name: string; keyPath: string; unique?: boolean }[] }> = {
  lpg_brands: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'name', keyPath: 'name' },
      { name: 'is_active', keyPath: 'is_active' }
    ]
  },
  stoves: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'brand', keyPath: 'brand' }
    ]
  },
  regulators: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'brand', keyPath: 'brand' }
    ]
  },
  customers: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'phone', keyPath: 'phone' },
      { name: 'name', keyPath: 'name' }
    ]
  },
  products: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'category', keyPath: 'category' }
    ]
  },
  product_prices: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'product_type', keyPath: 'product_type' },
      { name: 'brand_id', keyPath: 'brand_id' }
    ]
  },
  pos_transactions: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'created_at', keyPath: 'created_at' },
      { name: 'customer_id', keyPath: 'customer_id' },
      { name: 'transaction_number', keyPath: 'transaction_number', unique: true }
    ]
  },
  pos_transaction_items: {
    keyPath: 'id',
    indexes: [
      { name: 'transaction_id', keyPath: 'transaction_id' }
    ]
  },
  pob_transactions: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'created_at', keyPath: 'created_at' },
      { name: 'transaction_number', keyPath: 'transaction_number', unique: true }
    ]
  },
  pob_transaction_items: {
    keyPath: 'id',
    indexes: [
      { name: 'transaction_id', keyPath: 'transaction_id' }
    ]
  },
  daily_expenses: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'expense_date', keyPath: 'expense_date' },
      { name: 'category', keyPath: 'category' }
    ]
  },
  staff: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'is_active', keyPath: 'is_active' }
    ]
  },
  staff_payments: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'staff_id', keyPath: 'staff_id' },
      { name: 'payment_date', keyPath: 'payment_date' }
    ]
  },
  vehicles: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'is_active', keyPath: 'is_active' }
    ]
  },
  vehicle_costs: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'vehicle_id', keyPath: 'vehicle_id' },
      { name: 'cost_date', keyPath: 'cost_date' }
    ]
  },
  customer_payments: {
    keyPath: 'id',
    indexes: [
      { name: 'customer_id', keyPath: 'customer_id' },
      { name: 'payment_date', keyPath: 'payment_date' }
    ]
  },
  orders: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'customer_id', keyPath: 'customer_id' },
      { name: 'status', keyPath: 'status' }
    ]
  },
  order_items: {
    keyPath: 'id',
    indexes: [
      { name: 'order_id', keyPath: 'order_id' }
    ]
  },
  inventory_summary: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'brand_name', keyPath: 'brand_name' }
    ]
  },
  stock_movements: {
    keyPath: 'id',
    indexes: [
      { name: 'owner_id', keyPath: 'owner_id' },
      { name: 'brand_id', keyPath: 'brand_id' },
      { name: 'movement_type', keyPath: 'movement_type' }
    ]
  },
  // Sync queue for offline operations
  sync_queue: {
    keyPath: 'id',
    indexes: [
      { name: 'status', keyPath: 'status' },
      { name: 'table', keyPath: 'table' },
      { name: 'timestamp', keyPath: 'timestamp' }
    ]
  },
  // Metadata store
  meta: {
    keyPath: 'key',
    indexes: []
  }
};

// Sync operation types
export interface SyncOperation {
  id: string;
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  errorMessage?: string;
}

// Meta record type
interface MetaRecord {
  key: string;
  value: any;
  updatedAt: number;
}

// Custom error class
export class OfflineDBError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly store?: string
  ) {
    super(message);
    this.name = 'OfflineDBError';
  }
}

// Generate UUID for offline records
export const generateOfflineId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `offline_${crypto.randomUUID()}`;
  }
  // Fallback for older browsers
  return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

/**
 * Main OfflineDB class - IndexedDB wrapper for offline-first data storage
 */
export class OfflineDB {
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isInitialized = false;

  /**
   * Initialize the database
   */
  async init(): Promise<IDBDatabase> {
    if (this.db && this.isInitialized) {
      return this.db;
    }

    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new OfflineDBError('IndexedDB is not supported in this browser', 'init'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        logger.error('Failed to open IndexedDB', request.error, { component: 'OfflineDB' });
        reject(new OfflineDBError(`Failed to open database: ${request.error?.message}`, 'init'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        logger.info('IndexedDB initialized successfully', { component: 'OfflineDB', stores: Object.keys(STORE_CONFIGS).length });
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create all object stores
        for (const [storeName, config] of Object.entries(STORE_CONFIGS)) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: config.keyPath });
            
            // Create indexes
            for (const index of config.indexes) {
              store.createIndex(index.name, index.keyPath, { unique: index.unique || false });
            }
            
            logger.info(`Created store: ${storeName}`, { component: 'OfflineDB' });
          }
        }
      };

      request.onblocked = () => {
        logger.warn('Database upgrade blocked - close other tabs', { component: 'OfflineDB' });
      };
    });

    return this.dbPromise;
  }

  /**
   * Ensure database is ready
   */
  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db || !this.isInitialized) {
      await this.init();
    }
    if (!this.db) {
      throw new OfflineDBError('Database not initialized', 'ensureDB');
    }
    return this.db;
  }

  /**
   * Get a single record by ID
   */
  async get<T>(storeName: string, id: string): Promise<T | null> {
    const db = await this.ensureDB();
    
    return new Promise<T | null>((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          logger.error(`Failed to get record from ${storeName}`, request.error, { component: 'OfflineDB' });
          reject(new OfflineDBError(`Failed to get record: ${request.error?.message}`, 'get', storeName));
        };
      } catch (error) {
        reject(new OfflineDBError(`Transaction failed: ${error}`, 'get', storeName));
      }
    });
  }

  /**
   * Get all records from a store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await this.ensureDB();
    
    return new Promise<T[]>((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          logger.error(`Failed to get all records from ${storeName}`, request.error, { component: 'OfflineDB' });
          reject(new OfflineDBError(`Failed to get all records: ${request.error?.message}`, 'getAll', storeName));
        };
      } catch (error) {
        reject(new OfflineDBError(`Transaction failed: ${error}`, 'getAll', storeName));
      }
    });
  }

  /**
   * Get records by index
   */
  async getByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
    const db = await this.ensureDB();
    
    return new Promise<T[]>((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          logger.error(`Failed to get records by index from ${storeName}`, request.error, { component: 'OfflineDB' });
          reject(new OfflineDBError(`Failed to get by index: ${request.error?.message}`, 'getByIndex', storeName));
        };
      } catch (error) {
        reject(new OfflineDBError(`Transaction failed: ${error}`, 'getByIndex', storeName));
      }
    });
  }

  /**
   * Get records within an index range
   */
  async getByIndexRange<T>(
    storeName: string, 
    indexName: string, 
    lowerBound?: IDBValidKey, 
    upperBound?: IDBValidKey
  ): Promise<T[]> {
    const db = await this.ensureDB();
    
    return new Promise<T[]>((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        
        let range: IDBKeyRange | undefined;
        if (lowerBound && upperBound) {
          range = IDBKeyRange.bound(lowerBound, upperBound);
        } else if (lowerBound) {
          range = IDBKeyRange.lowerBound(lowerBound);
        } else if (upperBound) {
          range = IDBKeyRange.upperBound(upperBound);
        }
        
        const request = index.getAll(range);

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          reject(new OfflineDBError(`Failed to get by index range: ${request.error?.message}`, 'getByIndexRange', storeName));
        };
      } catch (error) {
        reject(new OfflineDBError(`Transaction failed: ${error}`, 'getByIndexRange', storeName));
      }
    });
  }

  /**
   * Insert or update a record
   */
  async put<T extends { id: string }>(storeName: string, item: T): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          logger.error(`Failed to put record in ${storeName}`, request.error, { component: 'OfflineDB' });
          reject(new OfflineDBError(`Failed to put record: ${request.error?.message}`, 'put', storeName));
        };
      } catch (error) {
        reject(new OfflineDBError(`Transaction failed: ${error}`, 'put', storeName));
      }
    });
  }

  /**
   * Delete a record by ID
   */
  async delete(storeName: string, id: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          logger.error(`Failed to delete record from ${storeName}`, request.error, { component: 'OfflineDB' });
          reject(new OfflineDBError(`Failed to delete record: ${request.error?.message}`, 'delete', storeName));
        };
      } catch (error) {
        reject(new OfflineDBError(`Transaction failed: ${error}`, 'delete', storeName));
      }
    });
  }

  /**
   * Bulk insert/update records
   */
  async bulkPut<T extends { id: string }>(storeName: string, items: T[]): Promise<void> {
    if (items.length === 0) return;
    
    const db = await this.ensureDB();
    
    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        
        let completed = 0;
        let hasError = false;

        for (const item of items) {
          const request = store.put(item);
          
          request.onsuccess = () => {
            completed++;
            if (completed === items.length && !hasError) {
              resolve();
            }
          };
          
          request.onerror = () => {
            if (!hasError) {
              hasError = true;
              logger.error(`Failed to bulk put in ${storeName}`, request.error, { component: 'OfflineDB' });
              reject(new OfflineDBError(`Failed to bulk put: ${request.error?.message}`, 'bulkPut', storeName));
            }
          };
        }

        transaction.onerror = () => {
          if (!hasError) {
            reject(new OfflineDBError(`Transaction failed: ${transaction.error?.message}`, 'bulkPut', storeName));
          }
        };
      } catch (error) {
        reject(new OfflineDBError(`Transaction failed: ${error}`, 'bulkPut', storeName));
      }
    });
  }

  /**
   * Clear all records from a store
   */
  async clear(storeName: string): Promise<void> {
    const db = await this.ensureDB();
    
    return new Promise<void>((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => {
          logger.info(`Cleared store: ${storeName}`, { component: 'OfflineDB' });
          resolve();
        };

        request.onerror = () => {
          logger.error(`Failed to clear ${storeName}`, request.error, { component: 'OfflineDB' });
          reject(new OfflineDBError(`Failed to clear store: ${request.error?.message}`, 'clear', storeName));
        };
      } catch (error) {
        reject(new OfflineDBError(`Transaction failed: ${error}`, 'clear', storeName));
      }
    });
  }

  /**
   * Count records in a store
   */
  async count(storeName: string): Promise<number> {
    const db = await this.ensureDB();
    
    return new Promise<number>((resolve, reject) => {
      try {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(new OfflineDBError(`Failed to count records: ${request.error?.message}`, 'count', storeName));
        };
      } catch (error) {
        reject(new OfflineDBError(`Transaction failed: ${error}`, 'count', storeName));
      }
    });
  }

  // ==================== SYNC QUEUE OPERATIONS ====================

  /**
   * Queue a new operation for sync
   */
  async queueOperation(
    operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries' | 'status'>
  ): Promise<string> {
    const syncOp: SyncOperation = {
      id: generateOfflineId(),
      ...operation,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };

    await this.put('sync_queue', syncOp as any);
    logger.info(`Queued sync operation: ${syncOp.type} on ${syncOp.table}`, { component: 'OfflineDB', id: syncOp.id });
    
    return syncOp.id;
  }

  /**
   * Get all pending operations
   */
  async getPendingOperations(): Promise<SyncOperation[]> {
    const operations = await this.getByIndex<SyncOperation>('sync_queue', 'status', 'pending');
    // Sort by timestamp (oldest first)
    return operations.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get all operations by status
   */
  async getOperationsByStatus(status: SyncOperation['status']): Promise<SyncOperation[]> {
    return this.getByIndex<SyncOperation>('sync_queue', 'status', status);
  }

  /**
   * Mark an operation as syncing
   */
  async markSyncing(operationId: string): Promise<void> {
    const operation = await this.get<SyncOperation>('sync_queue', operationId);
    if (operation) {
      operation.status = 'syncing';
      await this.put('sync_queue', operation as any);
    }
  }

  /**
   * Mark an operation as synced (completed)
   */
  async markSynced(operationId: string): Promise<void> {
    const operation = await this.get<SyncOperation>('sync_queue', operationId);
    if (operation) {
      operation.status = 'completed';
      await this.put('sync_queue', operation as any);
      logger.info(`Marked operation as synced: ${operationId}`, { component: 'OfflineDB' });
    }
  }

  /**
   * Mark an operation as failed
   */
  async markFailed(operationId: string, errorMessage: string): Promise<void> {
    const operation = await this.get<SyncOperation>('sync_queue', operationId);
    if (operation) {
      operation.status = 'failed';
      operation.retries += 1;
      operation.errorMessage = errorMessage;
      await this.put('sync_queue', operation as any);
      logger.warn(`Marked operation as failed: ${operationId}`, { component: 'OfflineDB', error: errorMessage, retries: operation.retries });
    }
  }

  /**
   * Reset failed operation to pending (for retry)
   */
  async resetToPending(operationId: string): Promise<void> {
    const operation = await this.get<SyncOperation>('sync_queue', operationId);
    if (operation) {
      operation.status = 'pending';
      await this.put('sync_queue', operation as any);
    }
  }

  /**
   * Get pending sync count
   */
  async getPendingSyncCount(): Promise<number> {
    const pending = await this.getByIndex<SyncOperation>('sync_queue', 'status', 'pending');
    const syncing = await this.getByIndex<SyncOperation>('sync_queue', 'status', 'syncing');
    return pending.length + syncing.length;
  }

  /**
   * Clear completed operations
   */
  async clearCompletedOperations(): Promise<void> {
    const completed = await this.getByIndex<SyncOperation>('sync_queue', 'status', 'completed');
    for (const op of completed) {
      await this.delete('sync_queue', op.id);
    }
    logger.info(`Cleared ${completed.length} completed sync operations`, { component: 'OfflineDB' });
  }

  /**
   * Clear all sync queue
   */
  async clearSyncQueue(): Promise<void> {
    await this.clear('sync_queue');
  }

  // ==================== META OPERATIONS ====================

  /**
   * Set last sync timestamp for a table
   */
  async setLastSync(table: string, timestamp: number = Date.now()): Promise<void> {
    const record: MetaRecord = {
      key: `lastSync_${table}`,
      value: timestamp,
      updatedAt: Date.now()
    };
    await this.put('meta', record as any);
  }

  /**
   * Get last sync timestamp for a table
   */
  async getLastSync(table: string): Promise<number | null> {
    const record = await this.get<MetaRecord>('meta', `lastSync_${table}`);
    return record?.value || null;
  }

  /**
   * Set any metadata value
   */
  async setMeta(key: string, value: any): Promise<void> {
    const record: MetaRecord = {
      key,
      value,
      updatedAt: Date.now()
    };
    await this.put('meta', record as any);
  }

  /**
   * Get any metadata value
   */
  async getMeta<T = any>(key: string): Promise<T | null> {
    const record = await this.get<MetaRecord>('meta', key);
    return record?.value || null;
  }

  /**
   * Delete metadata
   */
  async deleteMeta(key: string): Promise<void> {
    await this.delete('meta', key);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Check if database is initialized
   */
  isReady(): boolean {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};
    
    for (const storeName of Object.keys(STORE_CONFIGS)) {
      try {
        stats[storeName] = await this.count(storeName);
      } catch {
        stats[storeName] = -1;
      }
    }
    
    return stats;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      this.dbPromise = null;
      logger.info('IndexedDB connection closed', { component: 'OfflineDB' });
    }
  }

  /**
   * Delete the entire database (use with caution!)
   */
  async deleteDatabase(): Promise<void> {
    this.close();
    
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DB_NAME);
      
      request.onsuccess = () => {
        logger.info('IndexedDB deleted', { component: 'OfflineDB' });
        resolve();
      };
      
      request.onerror = () => {
        reject(new OfflineDBError(`Failed to delete database: ${request.error?.message}`, 'deleteDatabase'));
      };
      
      request.onblocked = () => {
        logger.warn('Database deletion blocked - close other tabs', { component: 'OfflineDB' });
      };
    });
  }
}

// Export singleton instance
export const offlineDB = new OfflineDB();

// Export store names for type safety
export const OFFLINE_STORES = Object.keys(STORE_CONFIGS) as readonly string[];

// Export utility function to check if ID is offline-generated
export const isOfflineId = (id: string): boolean => {
  return id.startsWith('offline_');
};
