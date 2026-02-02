/**
 * useGlobalSearch Hook
 * 
 * Database-powered search using the search_all_entities RPC function.
 * Searches across customers, sales, staff, vehicles, orders, and stock.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

export interface SearchResult {
  entity_type: 'customer' | 'sale' | 'staff' | 'vehicle' | 'order' | 'stock';
  entity_id: string;
  title: string;
  subtitle: string;
  metadata: {
    due?: number;
    cylinders_due?: number;
    total?: number;
    date?: string;
    salary?: number;
    phone?: string;
    odometer?: number;
    status?: string;
    package?: number;
    refill?: number;
    empty?: number;
  };
}

interface UseGlobalSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
}

export const useGlobalSearch = (options: UseGlobalSearchOptions = {}) => {
  const { debounceMs = 300, minQueryLength = 2 } = options;
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Get owner ID for RPC call
  const getOwnerId = useCallback(async (): Promise<string | null> => {
    try {
      const { data } = await supabase.rpc('get_owner_id');
      return data;
    } catch {
      return null;
    }
  }, []);

  // Database-powered search
  const search = useCallback(async (query: string) => {
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Validate query length
    if (!query || query.trim().length < minQueryLength) {
      setResults([]);
      setLoading(false);
      return;
    }

    // Debounce the search
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      abortControllerRef.current = new AbortController();

      try {
        const ownerId = await getOwnerId();
        if (!ownerId) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        // Call the unified search RPC
        const { data, error: rpcError } = await supabase.rpc('search_all_entities', {
          p_query: query.trim(),
          p_owner_id: ownerId
        });

        if (rpcError) throw rpcError;

        // Transform results
        const searchResults: SearchResult[] = (data || []).map((item: any) => ({
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          title: item.title,
          subtitle: item.subtitle,
          metadata: item.metadata || {}
        }));

        setResults(searchResults);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          logger.error('Search error:', err);
          setError(err.message || 'Search failed');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, debounceMs);
  }, [debounceMs, minQueryLength, getOwnerId]);

  // Clear search results
  const clearSearch = useCallback(() => {
    setResults([]);
    setError(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearSearch
  };
};

// Helper to get icon name for entity type
export const getEntityIcon = (type: SearchResult['entity_type']): string => {
  const icons: Record<SearchResult['entity_type'], string> = {
    customer: 'Users',
    sale: 'Receipt',
    staff: 'UserCog',
    vehicle: 'Truck',
    order: 'ShoppingCart',
    stock: 'Package'
  };
  return icons[type] || 'Search';
};

// Helper to get module ID for navigation
export const getEntityModule = (type: SearchResult['entity_type']): string => {
  const modules: Record<SearchResult['entity_type'], string> = {
    customer: 'customers',
    sale: 'business-diary',
    staff: 'utility-expense',
    vehicle: 'vehicle-cost',
    order: 'marketplace-orders',
    stock: 'inventory'
  };
  return modules[type] || 'overview';
};
