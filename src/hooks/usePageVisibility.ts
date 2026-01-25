import { useEffect, useRef, useCallback } from 'react';

interface UsePageVisibilityOptions {
  onVisible?: () => void;
  onHidden?: () => void;
  staleThreshold?: number; // Time in ms before data is considered stale
}

interface UsePageVisibilityReturn {
  isVisible: boolean;
  lastVisibleTime: number;
  isStale: boolean;
}

/**
 * Hook to detect page visibility changes (tab switching)
 * Optimized for instant recovery when users return to the tab
 */
export const usePageVisibility = (options: UsePageVisibilityOptions = {}) => {
  const { onVisible, onHidden, staleThreshold = 30000 } = options;
  
  const lastVisibleTimeRef = useRef<number>(Date.now());
  const isVisibleRef = useRef<boolean>(true);

  const handleVisibilityChange = useCallback(() => {
    const isNowVisible = document.visibilityState === 'visible';
    
    if (isNowVisible && !isVisibleRef.current) {
      // User returned to the tab
      const timeSinceLastVisible = Date.now() - lastVisibleTimeRef.current;
      const isStale = timeSinceLastVisible > staleThreshold;
      
      if (onVisible) {
        onVisible();
      }
      
      lastVisibleTimeRef.current = Date.now();
    } else if (!isNowVisible && isVisibleRef.current) {
      // User left the tab
      lastVisibleTimeRef.current = Date.now();
      
      if (onHidden) {
        onHidden();
      }
    }
    
    isVisibleRef.current = isNowVisible;
  }, [onVisible, onHidden, staleThreshold]);

  useEffect(() => {
    // Set initial state
    isVisibleRef.current = document.visibilityState === 'visible';
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also handle focus/blur for additional reliability
    window.addEventListener('focus', () => {
      if (!isVisibleRef.current) {
        handleVisibilityChange();
      }
    });
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  return {
    isVisible: isVisibleRef.current,
    lastVisibleTime: lastVisibleTimeRef.current,
    isStale: Date.now() - lastVisibleTimeRef.current > staleThreshold
  };
};

/**
 * Simplified hook that just triggers a callback when page becomes visible
 */
export const useOnPageVisible = (callback: () => void, deps: React.DependencyList = []) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, deps);
};
