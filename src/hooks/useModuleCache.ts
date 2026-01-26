/**
 * Module-Level Persistent Cache
 * 
 * Provides instant restoration of module data across module switches
 * and tab changes. Prevents any loading states after initial visit.
 */

// Global cache that persists across component unmounts
const moduleCache = new Map<string, { data: any; timestamp: number }>();
const MODULE_CACHE_TTL = 600000; // 10 minutes

/**
 * Get cached data for a module
 */
export function getModuleCache<T>(key: string): T | null {
  const cached = moduleCache.get(key);
  if (cached && Date.now() - cached.timestamp < MODULE_CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

/**
 * Set cached data for a module
 */
export function setModuleCache<T>(key: string, data: T): void {
  moduleCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Check if module has valid cache
 */
export function hasValidCache(key: string): boolean {
  const cached = moduleCache.get(key);
  return !!(cached && Date.now() - cached.timestamp < MODULE_CACHE_TTL);
}

/**
 * Clear specific module cache
 */
export function clearModuleCache(key: string): void {
  moduleCache.delete(key);
}

/**
 * SessionStorage-backed cache for persistence across page refreshes
 */
const STORAGE_PREFIX = 'stockx.module.';

export function getStorageCache<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.ts && Date.now() - parsed.ts < MODULE_CACHE_TTL) {
      return parsed.data as T;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

export function setStorageCache<T>(key: string, data: T): void {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify({
      data,
      ts: Date.now()
    }));
  } catch {
    // Ignore quota errors
  }
}

/**
 * Combined cache: memory first, then storage
 */
export function getCombinedCache<T>(key: string): T | null {
  // Memory cache is fastest
  const memoryCache = getModuleCache<T>(key);
  if (memoryCache) return memoryCache;
  
  // Fall back to storage
  const storageCache = getStorageCache<T>(key);
  if (storageCache) {
    // Restore to memory for faster subsequent access
    setModuleCache(key, storageCache);
    return storageCache;
  }
  
  return null;
}

export function setCombinedCache<T>(key: string, data: T): void {
  setModuleCache(key, data);
  setStorageCache(key, data);
}
