/**
 * Auth Utilities with Timeout Protection & Retry Logic
 * 
 * These wrappers prevent the "stuck forever" issue caused by invalid refresh tokens
 * by enforcing a timeout on all auth operations with automatic retry.
 */

import { supabase } from "@/integrations/supabase/client";

// Maximum time to wait for auth operations (12 seconds - increased for slow networks)
const AUTH_TIMEOUT = 12000;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export class AuthTimeoutError extends Error {
  constructor() {
    super('Authentication timed out');
    this.name = 'AuthTimeoutError';
  }
}

/**
 * Wraps supabase.auth.getSession() with a timeout
 * Returns session or null if timeout/error occurs
 */
export const getSessionWithTimeout = async () => {
  const sessionPromise = supabase.auth.getSession();
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new AuthTimeoutError()), AUTH_TIMEOUT)
  );
  
  return Promise.race([sessionPromise, timeoutPromise]);
};

/**
 * Get session with automatic retry and exponential backoff
 * Retries up to MAX_RETRIES times with increasing delays
 */
export const getSessionWithRetry = async (retries = MAX_RETRIES): Promise<{ data: { session: any } }> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await getSessionWithTimeout();
    } catch (error) {
      lastError = error as Error;
      console.warn(`[Auth] Session attempt ${attempt + 1}/${retries} failed:`, 
        error instanceof AuthTimeoutError ? 'timeout' : error);
      
      // Don't delay on last attempt
      if (attempt < retries - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new AuthTimeoutError();
};

/**
 * Wraps supabase.auth.getUser() with a timeout
 * Returns user or null if timeout/error occurs
 */
export const getUserWithTimeout = async () => {
  const userPromise = supabase.auth.getUser();
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new AuthTimeoutError()), AUTH_TIMEOUT)
  );
  
  return Promise.race([userPromise, timeoutPromise]);
};

/**
 * Get user with automatic retry and exponential backoff
 */
export const getUserWithRetry = async (retries = MAX_RETRIES): Promise<{ data: { user: any } }> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await getUserWithTimeout();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < retries - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new AuthTimeoutError();
};

/**
 * Safe session check that doesn't throw - returns null on any failure
 * Uses retry logic for better resilience
 */
export const safeGetSession = async () => {
  try {
    const { data: { session } } = await getSessionWithRetry(2); // 2 retries for safe version
    return session;
  } catch (error) {
    console.warn('[Auth] Session check failed after retries:', 
      error instanceof AuthTimeoutError ? 'timeout' : error);
    return null;
  }
};

/**
 * Safe user check that doesn't throw - returns null on any failure
 * Uses retry logic for better resilience
 */
export const safeGetUser = async () => {
  try {
    const { data: { user } } = await getUserWithRetry(2); // 2 retries for safe version
    return user;
  } catch (error) {
    console.warn('[Auth] User check failed after retries:', 
      error instanceof AuthTimeoutError ? 'timeout' : error);
    return null;
  }
};

/**
 * Check if the browser is online
 */
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};
