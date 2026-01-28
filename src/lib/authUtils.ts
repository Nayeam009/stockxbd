/**
 * Auth Utilities - Simple helpers
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Supabase stores the auth session in localStorage under a key like:
 *   sb-<project-ref>-auth-token
 *
 * In some environments (preview/published/custom domain), hardcoding the key can
 * lead to "no session" detection and infinite loading. These helpers find the
 * correct key dynamically.
 */
export const getAuthTokenStorageKey = (): string | null => {
  try {
    if (typeof window === 'undefined') return null;
    const keys = Object.keys(window.localStorage);
    const key = keys.find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
    return key || null;
  } catch {
    return null;
  }
};

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

export const getStoredSessionSnapshot = (): { userId: string; email: string; expiresAt: number } | null => {
  const parsed = readAuthTokenFromStorage();
  const expiresAt = parsed?.expires_at;
  const userId = parsed?.user?.id;
  const email = parsed?.user?.email;
  if (!expiresAt || !userId) return null;
  return { userId, email: email || '', expiresAt };
};

export const hasValidStoredSession = (): boolean => {
  const snapshot = getStoredSessionSnapshot();
  if (!snapshot) return false;
  // 60s buffer
  const now = Math.floor(Date.now() / 1000);
  return snapshot.expiresAt > now - 60;
};

export const clearStoredAuthSession = (): void => {
  try {
    if (typeof window === 'undefined') return;

    const snapshot = getStoredSessionSnapshot();
    const key = getAuthTokenStorageKey();
    if (key) window.localStorage.removeItem(key);

    // Clear cached role for this user (used only for fast UI routing)
    if (snapshot?.userId) {
      window.sessionStorage.removeItem(`user-role-${snapshot.userId}`);
    }
  } catch {
    // no-op
  }
};

/**
 * Get current session - simple wrapper
 */
export const getSessionWithRetry = async () => {
  return supabase.auth.getSession();
};

/**
 * Get current user - simple wrapper
 */
export const getUserWithRetry = async () => {
  return supabase.auth.getUser();
};

/**
 * Safe session check that doesn't throw - returns null on any failure
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
 * Safe user check that doesn't throw - returns null on any failure
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
 * Clear auth cache (stub for compatibility)
 */
export const clearAuthCache = (): void => {
  // No-op
};

/**
 * Get cached user ID (stub for compatibility)
 */
export const getCachedUserId = (): string | null => {
  return null;
};

/**
 * Check if the browser is online
 */
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

// For backward compatibility
export class AuthTimeoutError extends Error {
  constructor() {
    super('Authentication timed out');
    this.name = 'AuthTimeoutError';
  }
}
