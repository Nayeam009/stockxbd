/**
 * Auth Utilities - Simple timeout protection
 */

import { supabase } from "@/integrations/supabase/client";

// Maximum time to wait for auth operations
const AUTH_TIMEOUT = 10000; // 10 seconds

export class AuthTimeoutError extends Error {
  constructor() {
    super('Authentication timed out');
    this.name = 'AuthTimeoutError';
  }
}

/**
 * Wraps supabase.auth.getSession() with a timeout
 */
export const getSessionWithTimeout = async () => {
  const sessionPromise = supabase.auth.getSession();
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new AuthTimeoutError()), AUTH_TIMEOUT)
  );
  
  return Promise.race([sessionPromise, timeoutPromise]);
};

/**
 * Simple session fetch with timeout
 */
export const getSessionWithRetry = async (): Promise<{ data: { session: any } }> => {
  try {
    return await getSessionWithTimeout();
  } catch (error) {
    console.warn('[Auth] Session fetch failed:', error instanceof AuthTimeoutError ? 'timeout' : error);
    throw error;
  }
};

/**
 * Wraps supabase.auth.getUser() with a timeout
 */
export const getUserWithTimeout = async () => {
  const userPromise = supabase.auth.getUser();
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new AuthTimeoutError()), AUTH_TIMEOUT)
  );
  
  return Promise.race([userPromise, timeoutPromise]);
};

/**
 * Simple user fetch with timeout
 */
export const getUserWithRetry = async (): Promise<{ data: { user: any } }> => {
  try {
    return await getUserWithTimeout();
  } catch (error) {
    console.warn('[Auth] User fetch failed:', error instanceof AuthTimeoutError ? 'timeout' : error);
    throw error;
  }
};

/**
 * Safe session check that doesn't throw - returns null on any failure
 */
export const safeGetSession = async () => {
  try {
    const { data: { session } } = await getSessionWithTimeout();
    return session;
  } catch (error) {
    console.warn('[Auth] Session check failed:', error instanceof AuthTimeoutError ? 'timeout' : error);
    return null;
  }
};

/**
 * Safe user check that doesn't throw - returns null on any failure
 */
export const safeGetUser = async () => {
  try {
    const { data: { user } } = await getUserWithTimeout();
    return user;
  } catch (error) {
    console.warn('[Auth] User check failed:', error instanceof AuthTimeoutError ? 'timeout' : error);
    return null;
  }
};

/**
 * Clear auth cache (stub for compatibility)
 */
export const clearAuthCache = (): void => {
  // No-op - caching removed
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
