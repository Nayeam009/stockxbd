/**
 * Offline Data Hook
 * Phase 4: Universal hook for offline-first data operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineDB, generateOfflineId, isOfflineId } from '@/lib/offlineDB';
import { syncManager } from '@/lib/syncManager';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface UseOfflineDataConfig<T> {
  table: string;
  ownerIdField?: string;
  syncOnMount?: boolean;
  realtimeEnabled?: boolean;
  orderBy?: { column: string; ascending?: boolean };
  filter?: { column: string; value: any };
}

export interface UseOfflineDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  isOffline: boolean;
  pendingSyncCount: number;
  lastSyncedAt: Date | null;
  
  // Operations (work offline)
  insert: (item: Partial<T>) => Promise<T | null>;
  update: (id: string, changes: Partial<T>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  
  // Refresh
  refresh: () => Promise<void>;
  
  // Get single item
  getById: (id: string) => Promise<T | null>;
}

/**
 * Hook for offline-first data operations
 */
export function useOfflineData<T extends { id: string }>(
  config: UseOfflineDataConfig<T>
): UseOfflineDataResult<T> {
  const {
    table,
    ownerIdField = 'owner_id',
    syncOnMount = true,
    realtimeEnabled = false,
    orderBy,
    filter,
  } = config;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  
  const mountedRef = useRef(true);
  const ownerIdRef = useRef<string | null>(null);

  // Get owner ID
  const getOwnerId = useCallback(async (): Promise<string | null> => {
    if (ownerIdRef.current) return ownerIdRef.current;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check if user is owner or get owner from team
        const { data: role } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (role?.role === 'owner') {
          ownerIdRef.current = user.id;
        } else {
          // Get owner ID from team_members
          const { data: team } = await supabase
            .from('team_members')
            .select('owner_id')
            .eq('member_user_id', user.id)
            .maybeSingle();
          
          ownerIdRef.current = team?.owner_id || user.id;
        }
      }
    } catch (err) {
      logger.error('Failed to get owner ID', err, { component: 'useOfflineData' });
    }
    
    return ownerIdRef.current;
  }, []);

  // Load data from IndexedDB
  const loadFromLocal = useCallback(async (): Promise<T[]> => {
    try {
      const ownerId = await getOwnerId();
      if (!ownerId) return [];
      
      const localData = await offlineDB.getByIndex<T>(table, ownerIdField, ownerId);
      return localData;
    } catch (err) {
      logger.error(`Failed to load from local DB: ${table}`, err, { component: 'useOfflineData' });
      return [];
    }
  }, [table, ownerIdField, getOwnerId]);

  // Fetch from Supabase and cache locally
  const fetchAndCache = useCallback(async (): Promise<void> => {
    if (!navigator.onLine) {
      setIsOffline(true);
      return;
    }

    try {
      setIsOffline(false);
      const ownerId = await getOwnerId();
      if (!ownerId) return;

      let query = supabase
        .from(table as any)
        .select('*')
        .eq(ownerIdField, ownerId);

      if (filter) {
        query = query.eq(filter.column, filter.value);
      }

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? false });
      }

      const { data: serverData, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (serverData && mountedRef.current) {
        // Cache to IndexedDB
        await offlineDB.bulkPut(table, serverData as unknown as T[]);
        
        // Update last sync time
        await offlineDB.setLastSync(table);
        const syncTime = await offlineDB.getLastSync(table);
        setLastSyncedAt(syncTime ? new Date(syncTime) : new Date());
        
        setData(serverData as unknown as T[]);
      }
    } catch (err: any) {
      logger.error(`Failed to fetch from server: ${table}`, err, { component: 'useOfflineData' });
      setError(err?.message || 'Failed to fetch data');
    }
  }, [table, ownerIdField, filter, orderBy, getOwnerId]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    
    const init = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Always load from local first (instant render)
        const localData = await loadFromLocal();
        if (mountedRef.current) {
          setData(localData);
        }
        
        // Get last sync time
        const syncTime = await offlineDB.getLastSync(table);
        if (syncTime) {
          setLastSyncedAt(new Date(syncTime));
        }
        
        // If online and syncOnMount, fetch fresh data
        if (navigator.onLine && syncOnMount) {
          await fetchAndCache();
        }
        
        // Update pending count
        const count = await offlineDB.getPendingSyncCount();
        setPendingSyncCount(count);
        
      } catch (err: any) {
        logger.error(`Failed to initialize offline data: ${table}`, err, { component: 'useOfflineData' });
        setError(err?.message || 'Failed to load data');
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mountedRef.current = false;
    };
  }, [table, loadFromLocal, fetchAndCache, syncOnMount]);

  // Network status listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      fetchAndCache();
    };
    
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchAndCache]);

  // Realtime subscription
  useEffect(() => {
    if (!realtimeEnabled || !navigator.onLine) return;

    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        async () => {
          // Refresh data on any change
          await fetchAndCache();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, realtimeEnabled, fetchAndCache]);

  // Insert operation
  const insert = useCallback(async (item: Partial<T>): Promise<T | null> => {
    try {
      const ownerId = await getOwnerId();
      if (!ownerId) throw new Error('Not authenticated');

      const newItem = {
        ...item,
        id: generateOfflineId(),
        [ownerIdField]: ownerId,
        created_at: new Date().toISOString(),
      } as unknown as T;

      // Save to local DB immediately
      await offlineDB.put(table, newItem);
      
      // Queue for sync
      await offlineDB.queueOperation({
        type: 'INSERT',
        table,
        data: newItem,
      });
      
      // Update local state
      setData(prev => [newItem, ...prev]);
      
      // Update pending count
      const count = await offlineDB.getPendingSyncCount();
      setPendingSyncCount(count);
      
      // If online, trigger sync
      if (navigator.onLine) {
        syncManager.syncAll();
      }
      
      return newItem;
    } catch (err: any) {
      logger.error(`Failed to insert: ${table}`, err, { component: 'useOfflineData' });
      setError(err?.message || 'Failed to insert');
      return null;
    }
  }, [table, ownerIdField, getOwnerId]);

  // Update operation
  const update = useCallback(async (id: string, changes: Partial<T>): Promise<boolean> => {
    try {
      // Get existing item
      const existing = await offlineDB.get<T>(table, id);
      if (!existing) {
        throw new Error('Item not found');
      }

      const updatedItem: T = {
        ...existing,
        ...changes,
        updated_at: new Date().toISOString(),
      } as T;

      // Save to local DB
      await offlineDB.put(table, updatedItem);
      
      // Queue for sync
      await offlineDB.queueOperation({
        type: 'UPDATE',
        table,
        data: updatedItem,
      });
      
      // Update local state
      setData(prev => prev.map(item => item.id === id ? updatedItem : item));
      
      // Update pending count
      const count = await offlineDB.getPendingSyncCount();
      setPendingSyncCount(count);
      
      // If online, trigger sync
      if (navigator.onLine) {
        syncManager.syncAll();
      }
      
      return true;
    } catch (err: any) {
      logger.error(`Failed to update: ${table}`, err, { component: 'useOfflineData' });
      setError(err?.message || 'Failed to update');
      return false;
    }
  }, [table]);

  // Delete operation
  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Delete from local DB
      await offlineDB.delete(table, id);
      
      // Queue for sync (only if it was synced to server)
      if (!isOfflineId(id)) {
        await offlineDB.queueOperation({
          type: 'DELETE',
          table,
          data: { id },
        });
      }
      
      // Update local state
      setData(prev => prev.filter(item => item.id !== id));
      
      // Update pending count
      const count = await offlineDB.getPendingSyncCount();
      setPendingSyncCount(count);
      
      // If online, trigger sync
      if (navigator.onLine) {
        syncManager.syncAll();
      }
      
      return true;
    } catch (err: any) {
      logger.error(`Failed to delete: ${table}`, err, { component: 'useOfflineData' });
      setError(err?.message || 'Failed to delete');
      return false;
    }
  }, [table]);

  // Refresh data
  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      if (navigator.onLine) {
        await fetchAndCache();
      } else {
        const localData = await loadFromLocal();
        setData(localData);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchAndCache, loadFromLocal]);

  // Get single item by ID
  const getById = useCallback(async (id: string): Promise<T | null> => {
    try {
      // First try local
      const local = await offlineDB.get<T>(table, id);
      if (local) return local;
      
      // If online, try server
      if (navigator.onLine) {
        const { data: serverItem } = await supabase
          .from(table as any)
          .select('*')
          .eq('id', id)
          .maybeSingle();
        
        if (serverItem) {
          // Cache it
          await offlineDB.put(table, serverItem as unknown as T);
          return serverItem as unknown as T;
        }
      }
      
      return null;
    } catch (err) {
      logger.error(`Failed to get by ID: ${table}:${id}`, err, { component: 'useOfflineData' });
      return null;
    }
  }, [table]);

  return {
    data,
    loading,
    error,
    isOffline,
    pendingSyncCount,
    lastSyncedAt,
    insert,
    update,
    remove,
    refresh,
    getById,
  };
}
