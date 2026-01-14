/**
 * Environment-aware logger utility
 * Suppresses detailed error logging in production to prevent information disclosure
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogOptions {
  component?: string;
  userId?: string;
}

const isDev = import.meta.env.DEV;

/**
 * Sanitizes error objects to remove sensitive details
 */
const sanitizeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof Error) {
    return {
      message: error.message || 'Unknown error',
      name: error.name,
      // Exclude: stack traces, error details, hints in production
    };
  }
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    return {
      message: err.message || 'Unknown error',
      code: err.code,
      // Exclude detailed database errors, query info, etc.
    };
  }
  return { message: String(error) };
};

/**
 * Logger that only outputs to console in development mode
 * In production, sensitive error details are suppressed
 */
export const logger = {
  error: (message: string, error?: unknown, options?: LogOptions): void => {
    if (isDev) {
      console.error(`[${options?.component || 'App'}] ${message}`, error);
    }
    // In production, you could optionally send to a monitoring service
    // if (import.meta.env.PROD && typeof window !== 'undefined') {
    //   // Send sanitized error to monitoring service
    // }
  },

  warn: (message: string, details?: unknown, options?: LogOptions): void => {
    if (isDev) {
      console.warn(`[${options?.component || 'App'}] ${message}`, details);
    }
  },

  info: (message: string, details?: unknown, options?: LogOptions): void => {
    if (isDev) {
      console.info(`[${options?.component || 'App'}] ${message}`, details);
    }
  },

  debug: (message: string, details?: unknown, options?: LogOptions): void => {
    if (isDev) {
      console.debug(`[${options?.component || 'App'}] ${message}`, details);
    }
  },

  /**
   * For logging that should appear in production (non-sensitive)
   */
  log: (message: string, details?: unknown): void => {
    console.log(message, details);
  },
};

export default logger;
