/**
 * Data Hydration Hook
 * Phase 9: Handles initial data loading from server to IndexedDB
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { offlineDB } from '@/lib/offlineDB';
import { logger } from '@/lib/logger';

// Tables to hydrate with their priorities (higher = hydrate first)
const HYDRATION_TABLES = [
  { table: 'lpg_brands', priority: 100, ownerField: 'owner_id' },
  { table: 'product_prices', priority: 95, ownerField: 'owner_id' },
  { table: 'customers', priority: 90, ownerField: 'owner_id' },
  { table: 'stoves', priority: 85, ownerField: 'owner_id' },
  { table: 'regulators', priority: 80, ownerField: 'owner_id' },
  { table: 'products', priority: 75, ownerField: 'owner_id' },
  { table: 'staff', priority: 70, ownerField: 'owner_id' },
  { table: 'vehicles', priority: 65, ownerField: 'owner_id' },
  { table: 'inventory_summary', priority: 60, ownerField: 'owner_id' },
];

// Transaction tables (loaded with limit for performance)
const TRANSACTION_TABLES = [
  { table: 'pos_transactions', limit: 500, ownerField: 'owner_id' },
  { table: 'pob_transactions', limit: 200, ownerField: 'owner_id' },
  { table: 'daily_expenses', limit: 500, ownerField: 'owner_id' },
  { table: 'staff_payments', limit: 200, ownerField: 'owner_id' },
  { table: 'vehicle_costs', limit: 200, ownerField: 'owner_id' },
  { table: 'orders', limit: 200, ownerField: 'owner_id' },
];

export interface HydrationProgress {
  total: number;
  completed: number;
  currentTable: string;
  percentage: number;
}

export interface HydrationResult {
  success: boolean;
  tablesHydrated: number;
  recordsStored: number;
  errors: string[];
  duration: number;
}

/**
 * Hook for initial data hydration
 */
export function useDataHydration() {
  const [isHydrating, setIsHydrating] = useState(false);
  const [progress, setProgress] = useState<HydrationProgress>({
    total: 0,
    completed: 0,
    currentTable: '',
    percentage: 0,
  });
  const [lastHydration, setLastHydration] = useState<Date | null>(null);
  const [needsHydration, setNeedsHydration] = useState(false);
  
  const ownerIdRef = useRef<string | null>(null);

  // Get owner ID
  const getOwnerId = useCallback(async (): Promise<string | null> => {
    if (ownerIdRef.current) return ownerIdRef.current;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if owner
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (role?.role === 'owner') {
        ownerIdRef.current = user.id;
      } else {
        // Get from team
        const { data: team } = await supabase
          .from('team_members')
          .select('owner_id')
          .eq('member_user_id', user.id)
          .maybeSingle();
        
        ownerIdRef.current = team?.owner_id || user.id;
      }
    } catch (err) {
      logger.error('Failed to get owner ID for hydration', err, { component: 'useDataHydration' });
    }
    
    return ownerIdRef.current;
  }, []);

  // Check if hydration is needed
  useEffect(() => {
    const checkHydration = async () => {
      try {
        const lastSync = await offlineDB.getMeta<number>('lastFullHydration');
        
        if (lastSync) {
          setLastHydration(new Date(lastSync));
          
          // If last hydration was more than 24 hours ago, suggest re-hydration
          const hoursSinceHydration = (Date.now() - lastSync) / (1000 * 60 * 60);
          setNeedsHydration(hoursSinceHydration > 24);
        } else {
          setNeedsHydration(true);
        }
      } catch (err) {
        logger.error('Failed to check hydration status', err, { component: 'useDataHydration' });
        setNeedsHydration(true);
      }
    };

    checkHydration();
  }, []);

  // Hydrate a single table
  const hydrateTable = async (
    tableName: string,
    ownerField: string | null,
    ownerId: string,
    limit?: number
  ): Promise<number> => {
    try {
      let query = supabase.from(tableName as any).select('*');
      
      if (ownerField) {
        query = query.eq(ownerField, ownerId);
      }
      
      if (limit) {
        query = query.limit(limit).order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        await offlineDB.bulkPut(tableName, data as unknown as { id: string }[]);
        await offlineDB.setLastSync(tableName);
        return data.length;
      }
      
      return 0;
    } catch (err) {
      logger.error(`Failed to hydrate ${tableName}`, err, { component: 'useDataHydration' });
      throw err;
    }
  };

  // Full hydration
  const hydrateAll = useCallback(async (): Promise<HydrationResult> => {
    if (!navigator.onLine) {
      return {
        success: false,
        tablesHydrated: 0,
        recordsStored: 0,
        errors: ['Cannot hydrate while offline'],
        duration: 0,
      };
    }

    const startTime = Date.now();
    setIsHydrating(true);
    
    const result: HydrationResult = {
      success: true,
      tablesHydrated: 0,
      recordsStored: 0,
      errors: [],
      duration: 0,
    };

    try {
      const ownerId = await getOwnerId();
      if (!ownerId) {
        throw new Error('Not authenticated');
      }

      const totalTables = HYDRATION_TABLES.length + TRANSACTION_TABLES.length;
      let completed = 0;

      setProgress({
        total: totalTables,
        completed: 0,
        currentTable: 'Preparing...',
        percentage: 0,
      });

      // Hydrate master data tables first
      for (const { table, ownerField } of HYDRATION_TABLES) {
        setProgress({
          total: totalTables,
          completed,
          currentTable: table,
          percentage: Math.round((completed / totalTables) * 100),
        });

        try {
          const count = await hydrateTable(table, ownerField, ownerId);
          result.recordsStored += count;
          result.tablesHydrated++;
        } catch (err: any) {
          result.errors.push(`${table}: ${err?.message || 'Unknown error'}`);
        }

        completed++;
      }

      // Hydrate transaction tables with limits
      for (const { table, limit, ownerField } of TRANSACTION_TABLES) {
        setProgress({
          total: totalTables,
          completed,
          currentTable: table,
          percentage: Math.round((completed / totalTables) * 100),
        });

        try {
          const count = await hydrateTable(table, ownerField, ownerId, limit);
          result.recordsStored += count;
          result.tablesHydrated++;
        } catch (err: any) {
          result.errors.push(`${table}: ${err?.message || 'Unknown error'}`);
        }

        completed++;
      }

      // Mark hydration complete
      await offlineDB.setMeta('lastFullHydration', Date.now());
      setLastHydration(new Date());
      setNeedsHydration(false);

      result.duration = Date.now() - startTime;
      result.success = result.errors.length === 0;

      setProgress({
        total: totalTables,
        completed: totalTables,
        currentTable: 'Complete',
        percentage: 100,
      });

      logger.info('Data hydration complete', result, { component: 'useDataHydration' });

    } catch (err: any) {
      result.success = false;
      result.errors.push(err?.message || 'Hydration failed');
      result.duration = Date.now() - startTime;
      
      logger.error('Data hydration failed', err, { component: 'useDataHydration' });
    } finally {
      setIsHydrating(false);
    }

    return result;
  }, [getOwnerId]);

  // Quick sync (only fetch recent changes)
  const quickSync = useCallback(async (): Promise<{ updated: number }> => {
    if (!navigator.onLine) {
      return { updated: 0 };
    }

    try {
      const ownerId = await getOwnerId();
      if (!ownerId) return { updated: 0 };

      let updated = 0;
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - 1); // Last hour

      // Only sync frequently changing tables
      const quickTables = ['pos_transactions', 'lpg_brands', 'customers', 'inventory_summary'];

      for (const table of quickTables) {
        try {
          const { data } = await supabase
            .from(table as any)
            .select('*')
            .eq('owner_id', ownerId)
            .gte('updated_at', cutoff.toISOString())
            .limit(100);

          if (data && data.length > 0) {
            await offlineDB.bulkPut(table, data as unknown as { id: string }[]);
            await offlineDB.setLastSync(table);
            updated += data.length;
          }
        } catch (err) {
          logger.warn(`Quick sync failed for ${table}`, err, { component: 'useDataHydration' });
        }
      }

      return { updated };
    } catch (err) {
      logger.error('Quick sync failed', err, { component: 'useDataHydration' });
      return { updated: 0 };
    }
  }, [getOwnerId]);

  // Clear all local data
  const clearLocalData = useCallback(async (): Promise<void> => {
    try {
      await offlineDB.deleteDatabase();
      await offlineDB.init();
      setLastHydration(null);
      setNeedsHydration(true);
      logger.info('Local data cleared', null, { component: 'useDataHydration' });
    } catch (err) {
      logger.error('Failed to clear local data', err, { component: 'useDataHydration' });
      throw err;
    }
  }, []);

  return {
    isHydrating,
    progress,
    lastHydration,
    needsHydration,
    hydrateAll,
    quickSync,
    clearLocalData,
  };
}
