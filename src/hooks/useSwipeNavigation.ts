import { useState, useCallback, TouchEvent } from 'react';

interface SwipeConfig {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export const useSwipeNavigation = (config: SwipeConfig = {}) => {
  const { threshold = 50, onSwipeLeft, onSwipeRight } = config;
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const onTouchStart = useCallback((e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > threshold;
    const isRightSwipe = distance < -threshold;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  }, [touchStart, touchEnd, threshold, onSwipeLeft, onSwipeRight]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};

// Module navigation order for swipe gestures
export const getModuleNavigationOrder = (userRole: 'owner' | 'manager' | 'driver') => {
  const allModules = [
    { id: 'overview', roles: ['owner', 'manager', 'driver'] },
    { id: 'pos', roles: ['owner', 'manager', 'driver'] },
    { id: 'daily-sales', roles: ['owner', 'manager'] },
    { id: 'daily-expenses', roles: ['owner', 'manager'] },
    { id: 'analytics', roles: ['owner', 'manager'] },
    { id: 'lpg-stock', roles: ['owner', 'manager'] },
    { id: 'lpg-stock-20mm', roles: ['owner', 'manager'] },
    { id: 'stove-stock', roles: ['owner', 'manager'] },
    { id: 'regulators', roles: ['owner', 'manager'] },
    { id: 'product-pricing', roles: ['owner', 'manager'] },
    { id: 'orders', roles: ['owner', 'manager', 'driver'] },
    { id: 'exchange', roles: ['owner', 'manager', 'driver'] },
    { id: 'customers', roles: ['owner', 'manager'] },
    { id: 'staff-salary', roles: ['owner', 'manager'] },
    { id: 'vehicle-cost', roles: ['owner', 'manager'] },
    { id: 'community', roles: ['owner', 'manager', 'driver'] },
    { id: 'settings', roles: ['owner', 'manager'] },
  ];

  return allModules.filter(m => m.roles.includes(userRole)).map(m => m.id);
};

export const getNextModule = (currentModule: string, direction: 'left' | 'right', userRole: 'owner' | 'manager' | 'driver') => {
  const modules = getModuleNavigationOrder(userRole);
  const currentIndex = modules.indexOf(currentModule);
  
  if (currentIndex === -1) return modules[0];
  
  if (direction === 'left') {
    // Swipe left = go to next module
    return modules[(currentIndex + 1) % modules.length];
  } else {
    // Swipe right = go to previous module
    return modules[(currentIndex - 1 + modules.length) % modules.length];
  }
};
