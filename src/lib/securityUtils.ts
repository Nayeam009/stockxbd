/**
 * Security utilities for handling sensitive data storage
 */

// Keys that contain sensitive data and should be cleared on logout
const SENSITIVE_STORAGE_KEYS = [
  'lpg-customer-data',
  'business-settings',
  'notification-settings',
  // Shop settings use dynamic keys - handled separately
];

// Keys that should persist (non-sensitive preferences)
const PERSISTENT_KEYS = [
  'theme',
  'language',
  'theme-preference',
  'sidebar-state',
];

/**
 * Clear all sensitive data from localStorage
 * Called on logout to prevent data leakage on shared devices
 */
export const clearSensitiveStorage = (): void => {
  // Clear known sensitive keys
  SENSITIVE_STORAGE_KEYS.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear dynamic shop settings keys
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('shop_settings_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Clear session storage entirely
  sessionStorage.clear();
};

/**
 * Clear all localStorage except persistent preferences
 * Used for full data reset
 */
export const clearAllExceptPreferences = (): void => {
  const keysToRemove: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !PERSISTENT_KEYS.includes(key)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  sessionStorage.clear();
};

/**
 * Check if we're on a shared/public computer
 * Returns true if certain browser characteristics suggest shared usage
 */
export const isPotentiallySharedDevice = (): boolean => {
  // Check for common public computer indicators
  const isIncognito = !navigator.cookieEnabled;
  const hasNoHistory = window.history.length <= 2;
  
  return isIncognito || hasNoHistory;
};

/**
 * Show security warning for shared devices
 */
export const getSharedDeviceWarning = (): string | null => {
  if (isPotentiallySharedDevice()) {
    return 'You may be on a shared or public computer. Remember to log out when finished.';
  }
  return null;
};
