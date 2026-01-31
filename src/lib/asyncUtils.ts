/**
 * Async Utilities for Resilient Loading
 * Provides timeout wrappers, debouncing, and safe fetch patterns
 * to prevent modules from getting stuck in loading states.
 */

import { logger } from './logger';

export class TimeoutError extends Error {
  constructor(
    message: string,
    public readonly label: string,
    public readonly timeoutMs: number
  ) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a hard timeout.
 * If the promise doesn't resolve within the timeout, throws a TimeoutError.
 * 
 * @param promise The promise to wrap
 * @param ms Timeout in milliseconds
 * @param label A label for logging/debugging
 */
export async function withTimeout<T>(
  promise: Promise<T> | PromiseLike<T>,
  ms: number,
  label: string = 'operation'
): Promise<T> {
  const start = Date.now();
  
  // Convert PromiseLike to Promise if needed
  const normalizedPromise = Promise.resolve(promise);
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      const elapsed = Date.now() - start;
      logger.warn(`[withTimeout] ${label} timed out after ${elapsed}ms (limit: ${ms}ms)`);
      reject(new TimeoutError(`${label} timed out after ${ms}ms`, label, ms));
    }, ms);
  });

  try {
    const result = await Promise.race([normalizedPromise, timeoutPromise]);
    const elapsed = Date.now() - start;
    if (elapsed > ms * 0.8) {
      logger.warn(`[withTimeout] ${label} completed but took ${elapsed}ms (near timeout)`);
    }
    return result;
  } catch (error) {
    if (error instanceof TimeoutError) {
      throw error;
    }
    throw error;
  }
}

/**
 * Wraps a promise with a soft timeout that returns a fallback value instead of throwing.
 * Useful for non-critical data where showing stale/default data is acceptable.
 * 
 * @param promise The promise to wrap
 * @param ms Timeout in milliseconds
 * @param fallbackValue Value to return if timeout occurs
 * @param label A label for logging/debugging
 */
export async function withSoftTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallbackValue: T,
  label: string = 'operation'
): Promise<T> {
  try {
    return await withTimeout(promise, ms, label);
  } catch (error) {
    if (error instanceof TimeoutError) {
      logger.warn(`[withSoftTimeout] ${label} using fallback value`);
      return fallbackValue;
    }
    throw error;
  }
}

/**
 * Creates a debounced version of a function.
 * Useful for debouncing realtime refetches to prevent UI flicker.
 * 
 * @param fn The function to debounce
 * @param ms Debounce delay in milliseconds
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, ms);
  };
}

/**
 * Creates a debounced function that returns a promise.
 * The promise resolves when the debounced function is actually called.
 * 
 * @param fn The async function to debounce
 * @param ms Debounce delay in milliseconds
 */
export function debouncedAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingResolve: ((value: Awaited<ReturnType<T>>) => void) | null = null;
  let pendingReject: ((error: any) => void) | null = null;
  
  return (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    return new Promise((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
      
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          pendingResolve?.(result);
        } catch (error) {
          pendingReject?.(error);
        }
        timeoutId = null;
      }, ms);
    });
  };
}

/**
 * Safe Promise.allSettled wrapper that extracts successful values
 * and logs failures without throwing.
 * 
 * @param promises Array of promises
 * @param labels Optional labels for each promise (for logging)
 */
export async function safeAllSettled<T>(
  promises: Promise<T>[],
  labels?: string[]
): Promise<(T | null)[]> {
  const results = await Promise.allSettled(promises);
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    const label = labels?.[index] || `Promise ${index}`;
    logger.warn(`[safeAllSettled] ${label} failed:`, result.reason);
    return null;
  });
}

/**
 * Fetches data with timeout and returns { data, error, timedOut } object.
 * Never throws - always returns a structured result.
 * 
 * @param fetchFn The fetch function
 * @param timeoutMs Timeout in milliseconds (default: 10000)
 * @param label Label for logging
 */
export async function safeFetch<T>(
  fetchFn: () => Promise<T>,
  timeoutMs: number = 10000,
  label: string = 'fetch'
): Promise<{ data: T | null; error: string | null; timedOut: boolean }> {
  try {
    const data = await withTimeout(fetchFn(), timeoutMs, label);
    return { data, error: null, timedOut: false };
  } catch (error) {
    if (error instanceof TimeoutError) {
      return { data: null, error: `Request timed out after ${timeoutMs}ms`, timedOut: true };
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { data: null, error: message, timedOut: false };
  }
}

/**
 * Get current timestamp in ms (for performance logging)
 */
export const nowMs = () => Date.now();

/**
 * Log elapsed time since a start timestamp
 */
export function logElapsed(start: number, label: string): void {
  const elapsed = Date.now() - start;
  if (elapsed > 3000) {
    logger.warn(`[Performance] ${label} took ${elapsed}ms (slow)`);
  } else {
    logger.debug(`[Performance] ${label} took ${elapsed}ms`);
  }
}
