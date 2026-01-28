/**
 * Auth Utilities - Robust session helpers with dynamic key detection
 * 
 * CRITICAL: This module handles session detection for Supabase auth.
 * The storage key changes based on environment (preview vs published).
 */

import { supabase } from "@/integrations/supabase/client";

// Cache the detected key for performance
let cachedStorageKey: string | null = null;

/**
 * Dynamically find the Supabase auth token storage key.
 * Supabase uses: sb-<project-ref>-auth-token
 */
export const getAuthTokenStorageKey = (): string | null => {
  // Return cached key if available
  if (cachedStorageKey) return cachedStorageKey;
  
  try {
    if (typeof window === 'undefined') return null;
    
    const keys = Object.keys(window.localStorage);
    const key = keys.find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
    
    if (key) {
      cachedStorageKey = key;
      return key;
    }
    
    return null;
  } catch {
    return null;
  }
};

/**
 * Read the raw auth token from localStorage
 */
export const readAuthTokenFromStorage = (): any | null => {
  try {
    if (typeof window === 'undefined') return null;
    
    const key = getAuthTokenStorageKey();
    if (!key) return null;
    
    const stored = window.localStorage.getItem(key);
    if (!stored) return null;
    
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

/**
 * Extract session snapshot from stored token
 */
export const getStoredSessionSnapshot = (): { userId: string; email: string; expiresAt: number } | null => {
  try {
    const parsed = readAuthTokenFromStorage();
    if (!parsed) return null;
    
    const expiresAt = parsed?.expires_at;
    const userId = parsed?.user?.id;
    const email = parsed?.user?.email;
    
    if (!expiresAt || !userId) return null;
    
    return { userId, email: email || '', expiresAt };
  } catch {
    return null;
  }
};

/**
 * Check if there's a potentially valid session in localStorage
 * Uses 60-second buffer for token expiry
 */
export const hasValidStoredSession = (): boolean => {
  try {
    const snapshot = getStoredSessionSnapshot();
    if (!snapshot) return false;
    
    const now = Math.floor(Date.now() / 1000);
    // Allow 60 second buffer before expiry
    return snapshot.expiresAt > now - 60;
  } catch {
    return false;
  }
};

/**
 * Clear the stored auth session from localStorage
 * Also clears cached role data
 */
export const clearStoredAuthSession = (): void => {
  try {
    if (typeof window === 'undefined') return;
    
    // Get snapshot before clearing to get userId for role cache
    const snapshot = getStoredSessionSnapshot();
    
    // Clear the auth token
    const key = getAuthTokenStorageKey();
    if (key) {
      window.localStorage.removeItem(key);
      cachedStorageKey = null; // Clear cache
    }
    
    // Clear cached role for this user
    if (snapshot?.userId) {
      window.sessionStorage.removeItem(`user-role-${snapshot.userId}`);
    }
    
    // Clear any other auth-related items
    const keysToRemove = Object.keys(window.localStorage).filter(k => 
      k.startsWith('sb-') || k.includes('supabase')
    );
    keysToRemove.forEach(k => window.localStorage.removeItem(k));
    
  } catch (e) {
    console.warn('[AuthUtils] Error clearing session:', e);
  }
};

/**
 * Get current session with timeout protection
 */
export const getSessionWithTimeout = async (timeoutMs = 8000): Promise<{ session: any; error: any }> => {
  try {
    const timeoutPromise = new Promise<{ session: null; error: Error }>((resolve) => {
      setTimeout(() => resolve({ session: null, error: new Error('Session check timeout') }), timeoutMs);
    });
    
    const sessionPromise = supabase.auth.getSession().then(({ data, error }) => ({
      session: data?.session || null,
      error
    }));
    
    return await Promise.race([sessionPromise, timeoutPromise]);
  } catch (error) {
    return { session: null, error };
  }
};

/**
 * Simple session check - doesn't throw
 */
export const safeGetSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch (error) {
    console.warn('[Auth] Session check failed:', error);
    return null;
  }
};

/**
 * Simple user check - doesn't throw
 */
export const safeGetUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.warn('[Auth] User check failed:', error);
    return null;
  }
};

/**
 * Check if error indicates invalid/stale refresh token
 */
export const isRefreshTokenError = (error: any): boolean => {
  if (!error) return false;
  
  const message = String(error?.message || '').toLowerCase();
  const code = error?.code;
  
  return (
    message.includes('refresh_token_not_found') ||
    message.includes('refresh token') ||
    message.includes('invalid refresh token') ||
    code === 'refresh_token_not_found'
  );
};

/**
 * Check if the browser is online
 */
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

// Legacy exports for compatibility
export const getSessionWithRetry = async () => supabase.auth.getSession();
export const getUserWithRetry = async () => supabase.auth.getUser();
export const clearAuthCache = (): void => { cachedStorageKey = null; };
export const getCachedUserId = (): string | null => getStoredSessionSnapshot()?.userId || null;

export class AuthTimeoutError extends Error {
  constructor() {
    super('Authentication timed out');
    this.name = 'AuthTimeoutError';
  }
}
