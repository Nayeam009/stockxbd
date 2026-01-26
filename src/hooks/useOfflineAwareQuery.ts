/**
 * Offline-Aware Query Hook
 * Provides TanStack Query wrapper with IndexedDB fallback
 */

import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { offlineDB } from '@/lib/offlineDB';
import { useNetwork } from '@/contexts/NetworkContext';
import { useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

interface OfflineQueryOptions<TData> {
  queryKey: string[];
  queryFn: () => Promise<TData>;
  storeName: string;
  staleTime?: number;
  enabled?: boolean;
  fallbackData?: TData;
}

interface OfflineQueryResult<TData> extends Omit<UseQueryResult<TData, Error>, 'data'> {
  data: TData;
  isFromCache: boolean;
  isOffline: boolean;
}

/**
 * Custom hook that wraps TanStack Query with offline-first IndexedDB fallback
 */
export function useOfflineAwareQuery<TData>({
  queryKey,
  queryFn,
  storeName,
  staleTime = 1000 * 60 * 5, // 5 minutes default
  enabled = true,
  fallbackData,
}: OfflineQueryOptions<TData>): OfflineQueryResult<TData> {
  const { isOnline } = useNetwork();
  const isFromCacheRef = useRef(false);

  // Create cache-aware query function
  const offlineAwareQueryFn = useCallback(async (): Promise<TData> => {
    const cacheKey = queryKey.join(':');
    
    // If offline, immediately return cached data
    if (!isOnline) {
      isFromCacheRef.current = true;
      try {
        const cached = await offlineDB.getMeta<TData>(cacheKey);
        if (cached) {
          logger.info(`Returning cached data for ${cacheKey}`, { component: 'OfflineAwareQuery' });
          return cached;
        }
        
        // Try store-level fallback
        if (storeName) {
          const storeData = await offlineDB.getAll<any>(storeName);
          if (storeData && storeData.length > 0) {
            return storeData as unknown as TData;
          }
        }
      } catch (err) {
        logger.warn(`Cache read failed for ${cacheKey}`, err, { component: 'OfflineAwareQuery' });
      }
      
      // Return fallback data if available
      if (fallbackData !== undefined) {
        return fallbackData;
      }
      
      throw new Error('No cached data available offline');
    }

    // Online: fetch fresh data
    isFromCacheRef.current = false;
    try {
      const data = await queryFn();
      
      // Cache the result in IndexedDB
      try {
        await offlineDB.setMeta(cacheKey, data);
        
        // If it's an array and we have a store name, bulk put
        if (Array.isArray(data) && storeName && data.length > 0) {
          await offlineDB.bulkPut(storeName, data as any);
        }
      } catch (cacheErr) {
        logger.warn(`Failed to cache ${cacheKey}`, cacheErr, { component: 'OfflineAwareQuery' });
      }
      
      return data;
    } catch (error) {
      // On network error, try to return cached data
      logger.warn(`Network error for ${cacheKey}, trying cache`, error, { component: 'OfflineAwareQuery' });
      isFromCacheRef.current = true;
      
      try {
        const cached = await offlineDB.getMeta<TData>(cacheKey);
        if (cached) return cached;
        
        if (storeName) {
          const storeData = await offlineDB.getAll<any>(storeName);
          if (storeData && storeData.length > 0) {
            return storeData as unknown as TData;
          }
        }
      } catch (cacheErr) {
        logger.error(`Cache fallback failed for ${cacheKey}`, cacheErr, { component: 'OfflineAwareQuery' });
      }
      
      throw error;
    }
  }, [isOnline, queryKey, queryFn, storeName, fallbackData]);

  const queryResult = useQuery({
    queryKey,
    queryFn: offlineAwareQueryFn,
    staleTime: isOnline ? staleTime : Infinity, // Never stale when offline
    gcTime: 1000 * 60 * 60, // 1 hour garbage collection
    enabled,
    networkMode: 'always', // Don't pause when offline
    retry: isOnline ? 2 : 0, // No retries when offline
  });

  return {
    ...queryResult,
    data: queryResult.data ?? fallbackData as TData,
    isFromCache: isFromCacheRef.current,
    isOffline: !isOnline,
  };
}

/**
 * Simplified hook for single-value queries (like RPC totals)
 */
export function useOfflineValue<T>(
  key: string,
  fetchFn: () => Promise<T>,
  defaultValue: T
): { value: T; isLoading: boolean; isFromCache: boolean; isOffline: boolean } {
  const result = useOfflineAwareQuery<T>({
    queryKey: ['offline-value', key],
    queryFn: fetchFn,
    storeName: 'meta',
    fallbackData: defaultValue,
  });

  return {
    value: result.data ?? defaultValue,
    isLoading: result.isLoading,
    isFromCache: result.isFromCache,
    isOffline: result.isOffline,
  };
}
