/**
 * Auth Utilities - Simple helpers
 */

import { supabase } from "@/integrations/supabase/client";

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
