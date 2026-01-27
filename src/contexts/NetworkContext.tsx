/**
 * Network Context Provider
 * Simple online/offline detection
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface NetworkContextValue {
  isOnline: boolean;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const wasOffline = useRef(false);
  const hasShownOnlineToast = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      
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

  return (
    <NetworkContext.Provider value={{ isOnline }}>
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
