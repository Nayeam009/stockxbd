/**
 * Network Context Provider
 * Provides network status information to the app
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface NetworkContextValue {
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error' | 'offline';
  pendingSyncCount: number;
  lastSyncedAt: Date | null;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  retryFailed: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'offline'>('idle');
  
  // Refs to track toast state
  const wasOffline = useRef(false);
  const hasShownOnlineToast = useRef(false);

  // Handle online status change
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncStatus('idle');
      
      // Show toast only when coming back online
      if (wasOffline.current && !hasShownOnlineToast.current) {
        hasShownOnlineToast.current = true;
        toast.success('Back online!', {
          duration: 3000,
          id: 'network-status'
        });
        
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
      
      toast.warning('You\'re offline. Some features may be limited.', {
        duration: 4000,
        id: 'network-status'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      wasOffline.current = true;
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncNow = useCallback(async (): Promise<void> => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }
  }, [isOnline]);

  const retryFailed = useCallback(async (): Promise<void> => {
    if (!isOnline) {
      toast.error('Cannot retry while offline');
      return;
    }
  }, [isOnline]);

  const value: NetworkContextValue = {
    isOnline,
    syncStatus,
    pendingSyncCount: 0,
    lastSyncedAt: null,
    isSyncing: false,
    syncNow,
    retryFailed,
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = (): NetworkContextValue => {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

export const useIsOnline = (): boolean => {
  const { isOnline } = useNetwork();
  return isOnline;
};
