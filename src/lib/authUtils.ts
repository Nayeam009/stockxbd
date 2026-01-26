/**
 * Auth Utilities with Timeout Protection & Retry Logic
 * 
 * These wrappers prevent the "stuck forever" issue caused by invalid refresh tokens
 * by enforcing a timeout on all auth operations with automatic retry.
 */

import { supabase } from "@/integrations/supabase/client";

// Maximum time to wait for auth operations (20 seconds - very generous for slow networks)
const AUTH_TIMEOUT = 20000;
const MAX_RETRIES = 2; // Reduced to 2 attempts with longer timeout
const INITIAL_RETRY_DELAY = 2000; // 2 seconds

// LocalStorage keys for persistent cache
const CACHE_KEY_SESSION = 'stockx.auth.session.cache';
const CACHE_KEY_TIMESTAMP = 'stockx.auth.timestamp';
const CACHE_TTL = 300000; // 5 minutes

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
 * Get cached session from localStorage
 */
const getCachedSession = (): any => {
  try {
    const cached = localStorage.getItem(CACHE_KEY_SESSION);
    const timestamp = localStorage.getItem(CACHE_KEY_TIMESTAMP);
    
    if (cached && timestamp) {
      const age = Date.now() - parseInt(timestamp);
      if (age < CACHE_TTL) {
        return JSON.parse(cached);
      }
    }
  } catch (error) {
    console.warn('[Auth] Cache read error:', error);
  }
  return null;
};

/**
 * Save session to localStorage cache
 */
const setCachedSession = (session: any): void => {
  try {
    if (session) {
      localStorage.setItem(CACHE_KEY_SESSION, JSON.stringify(session));
      localStorage.setItem(CACHE_KEY_TIMESTAMP, Date.now().toString());
    }
  } catch (error) {
    console.warn('[Auth] Cache write error:', error);
  }
};

/**
 * Clear cached session
 */
export const clearAuthCache = (): void => {
  try {
    localStorage.removeItem(CACHE_KEY_SESSION);
    localStorage.removeItem(CACHE_KEY_TIMESTAMP);
  } catch (error) {
    console.warn('[Auth] Cache clear error:', error);
  }
};

/**
 * Get session with automatic retry and exponential backoff
 * Retries up to MAX_RETRIES times with increasing delays
 * Falls back to cached session if all attempts fail
 */
export const getSessionWithRetry = async (retries = MAX_RETRIES, useCache = true): Promise<{ data: { session: any } }> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await getSessionWithTimeout();
      
      // Cache successful result
      if (result?.data?.session) {
        setCachedSession(result.data.session);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      console.warn(`[Auth] Session attempt ${attempt + 1}/${retries} failed:`, 
        error instanceof AuthTimeoutError ? 'timeout' : error);
      
      // Don't delay on last attempt
      if (attempt < retries - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        console.log(`[Auth] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed - try to use cached session
  if (useCache) {
    const cachedSession = getCachedSession();
    if (cachedSession) {
      console.warn('[Auth] All retries failed, using cached session');
      return { data: { session: cachedSession } };
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
