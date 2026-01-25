/**
 * Auth Utilities with Timeout Protection
 * 
 * These wrappers prevent the "stuck forever" issue caused by invalid refresh tokens
 * by enforcing a timeout on all auth operations.
 */

import { supabase } from "@/integrations/supabase/client";

// Maximum time to wait for auth operations (8 seconds)
const AUTH_TIMEOUT = 8000;

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
