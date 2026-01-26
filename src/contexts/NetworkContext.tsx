/**
 * Network Context Provider
 * Phase 7: Provides network status and sync information to the entire app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { syncManager, SyncEvent, SyncStatus, SyncResult } from '@/lib/syncManager';
import { offlineDB } from '@/lib/offlineDB';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface NetworkContextValue {
  isOnline: boolean;
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  syncNow: () => Promise<SyncResult>;
  retryFailed: () => Promise<SyncResult>;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

// Key for storing last sync time
const LAST_SYNC_KEY = 'stockx.lastSyncedAt';

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LAST_SYNC_KEY);
      return stored ? new Date(stored) : null;
    }
    return null;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Refs to track toast state
  const wasOffline = useRef(false);
  const hasShownOnlineToast = useRef(false);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await offlineDB.getPendingSyncCount();
      setPendingSyncCount(count);
    } catch (error) {
      logger.error('Failed to get pending sync count', error, { component: 'NetworkContext' });
    }
  }, []);

  // Handle online status change
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('idle');
      
      // Show toast only when coming back online (was offline before)
      if (wasOffline.current && !hasShownOnlineToast.current) {
        hasShownOnlineToast.current = true;
        toast.success('Back online! Syncing your changes...', {
          duration: 3000,
          id: 'network-status'
        });
        
        // Reset after delay
        setTimeout(() => {
          hasShownOnlineToast.current = false;
        }, 5000);
      }
      
      wasOffline.current = false;
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
      wasOffline.current = true;
      hasShownOnlineToast.current = false;
      
      toast.warning('You\'re offline. Changes will sync when connected.', {
        duration: 4000,
        id: 'network-status'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial offline state
    if (!navigator.onLine) {
      wasOffline.current = true;
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to sync events
  useEffect(() => {
    const handleSyncEvent = (event: SyncEvent) => {
      switch (event.type) {
        case 'sync-start':
          setIsSyncing(true);
          setSyncStatus('syncing');
          break;
          
        case 'sync-complete':
          setIsSyncing(false);
          setSyncStatus('idle');
          const now = new Date();
          setLastSyncedAt(now);
          localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
          
          if (event.detail.synced && event.detail.synced > 0) {
            toast.success(`Synced ${event.detail.synced} changes`, {
              duration: 2000,
            });
          }
          updatePendingCount();
          break;
          
        case 'sync-error':
          setIsSyncing(false);
          setSyncStatus('error');
          toast.error('Sync failed. Will retry later.', {
            duration: 3000,
          });
          break;
          
        case 'sync-progress':
          updatePendingCount();
          break;
      }
    };

    const unsubscribe = syncManager.addListener(handleSyncEvent);
    return () => unsubscribe();
  }, [updatePendingCount]);

  // Initialize and start periodic sync
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize offline database
        await offlineDB.init();
        
        // Update pending count
        await updatePendingCount();
        
        // Start periodic sync (every 2 minutes)
        syncManager.startPeriodicSync(120000);
        
        // Initial sync if online and has pending
        const count = await offlineDB.getPendingSyncCount();
        if (navigator.onLine && count > 0) {
          syncManager.syncAll();
        }
        
        logger.info('Network context initialized', { component: 'NetworkContext' });
      } catch (error) {
        logger.error('Failed to initialize network context', error, { component: 'NetworkContext' });
      }
    };

    init();

    return () => {
      syncManager.stopPeriodicSync();
    };
  }, [updatePendingCount]);

  // Sync now function
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return { success: false, synced: 0, failed: 0, errors: ['Offline'] };
    }
    
    return syncManager.syncAll();
  }, [isOnline]);

  // Retry failed function
  const retryFailed = useCallback(async (): Promise<SyncResult> => {
    if (!isOnline) {
      toast.error('Cannot retry while offline');
      return { success: false, synced: 0, failed: 0, errors: ['Offline'] };
    }
    
    return syncManager.retryFailed();
  }, [isOnline]);

  const value: NetworkContextValue = {
    isOnline,
    syncStatus,
    pendingSyncCount,
    lastSyncedAt,
    isSyncing,
    syncNow,
    retryFailed,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};

// Hook to use network context
export const useNetwork = (): NetworkContextValue => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

// Convenience hook to check if online
export const useIsOnline = (): boolean => {
  const { isOnline } = useNetwork();
  return isOnline;
};
