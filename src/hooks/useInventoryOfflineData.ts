/**
 * Inventory Offline Data Hook
 * Provides offline-first inventory management with local caching and sync
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { offlineDB, generateOfflineId, isOfflineId } from '@/lib/offlineDB';
import { syncManager } from '@/lib/syncManager';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useNetwork } from '@/contexts/NetworkContext';

export interface LPGBrand {
  id: string;
  name: string;
  color: string;
  size: string;
  weight: string;
  package_cylinder: number;
  refill_cylinder: number;
  empty_cylinder: number;
  problem_cylinder: number;
  in_transit_cylinder: number;
  is_active: boolean;
  owner_id?: string;
}

export interface Stove {
  id: string;
  brand: string;
  model: string;
  burners: number;
  quantity: number;
  price: number;
  is_damaged: boolean | null;
  warranty_months: number | null;
  owner_id?: string;
}

export interface Regulator {
  id: string;
  brand: string;
  type: string;
  quantity: number;
  price: number | null;
  is_defective: boolean | null;
  owner_id?: string;
}

export interface UseInventoryOfflineDataResult {
  // Data
  lpgBrands: LPGBrand[];
  stoves: Stove[];
  regulators: Regulator[];
  
  // State
  loading: boolean;
  isOffline: boolean;
  lastSynced: Date | null;
  
  // LPG Operations
  updateLpgBrand: (id: string, field: string, value: number) => Promise<boolean>;
  deleteLpgBrand: (id: string) => Promise<boolean>;
  
  // Stove Operations
  updateStove: (id: string, quantity: number) => Promise<boolean>;
  deleteStove: (id: string) => Promise<boolean>;
  
  // Regulator Operations
  updateRegulator: (id: string, quantity: number) => Promise<boolean>;
  deleteRegulator: (id: string) => Promise<boolean>;
  
  // Filtered data helpers
  getFilteredBrands: (sizeTab: string, weightTab: string, searchQuery: string) => LPGBrand[];
  
  // Refresh
  refreshData: () => Promise<void>;
}

export function useInventoryOfflineData(): UseInventoryOfflineDataResult {
  const { isOnline } = useNetwork();
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [regulators, setRegulators] = useState<Regulator[]>([]);

  // Load data from IndexedDB first, then sync with server
  const loadData = useCallback(async () => {
    setLoading(true);
    
    try {
      // Step 1: Load from IndexedDB instantly
      const [localBrands, localStoves, localRegulators] = await Promise.all([
        offlineDB.getAll<LPGBrand>('lpg_brands'),
        offlineDB.getAll<Stove>('stoves'),
        offlineDB.getAll<Regulator>('regulators'),
      ]);
      
      // Filter active items
      const activeBrands = localBrands.filter(b => b.is_active !== false);
      const activeStoves = localStoves.filter(s => (s as any).is_active !== false);
      const activeRegulators = localRegulators.filter(r => (r as any).is_active !== false);
      
      if (activeBrands.length) setLpgBrands(activeBrands);
      if (activeStoves.length) setStoves(activeStoves);
      if (activeRegulators.length) setRegulators(activeRegulators);
      
      // Get last sync time
      const syncTime = await offlineDB.getLastSync('inventory_data');
      if (syncTime) setLastSynced(new Date(syncTime));
      
      // Step 2: If online, fetch fresh data
      if (navigator.onLine) {
        const [lpgRes, stovesRes, regulatorsRes] = await Promise.all([
          supabase.from('lpg_brands').select('*').eq('is_active', true).order('name'),
          supabase.from('stoves').select('*').eq('is_active', true).order('brand'),
          supabase.from('regulators').select('*').eq('is_active', true).order('brand'),
        ]);
        
        if (lpgRes.data) {
          setLpgBrands(lpgRes.data);
          await offlineDB.bulkPut('lpg_brands', lpgRes.data);
        }
        if (stovesRes.data) {
          setStoves(stovesRes.data);
          await offlineDB.bulkPut('stoves', stovesRes.data);
        }
        if (regulatorsRes.data) {
          setRegulators(regulatorsRes.data);
          await offlineDB.bulkPut('regulators', regulatorsRes.data);
        }
        
        // Update sync time
        await offlineDB.setLastSync('inventory_data');
        setLastSynced(new Date());
      }
    } catch (error) {
      logger.error('Failed to load inventory data', error, { component: 'useInventoryOfflineData' });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set up realtime subscriptions when online
  useEffect(() => {
    if (!isOnline) return;

    const channels = [
      supabase.channel('inv-lpg-offline').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lpg_brands' }, 
        async () => {
          const { data } = await supabase.from('lpg_brands').select('*').eq('is_active', true).order('name');
          if (data) {
            setLpgBrands(data);
            await offlineDB.bulkPut('lpg_brands', data);
          }
        }
      ).subscribe(),
      
      supabase.channel('inv-stoves-offline').on('postgres_changes',
        { event: '*', schema: 'public', table: 'stoves' },
        async () => {
          const { data } = await supabase.from('stoves').select('*').eq('is_active', true).order('brand');
          if (data) {
            setStoves(data);
            await offlineDB.bulkPut('stoves', data);
          }
        }
      ).subscribe(),
      
      supabase.channel('inv-regulators-offline').on('postgres_changes',
        { event: '*', schema: 'public', table: 'regulators' },
        async () => {
          const { data } = await supabase.from('regulators').select('*').eq('is_active', true).order('brand');
          if (data) {
            setRegulators(data);
            await offlineDB.bulkPut('regulators', data);
          }
        }
      ).subscribe(),
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [isOnline]);

  // Update LPG brand (works offline)
  const updateLpgBrand = useCallback(async (id: string, field: string, value: number): Promise<boolean> => {
    try {
      // Update locally first
      const brand = lpgBrands.find(b => b.id === id);
      if (!brand) return false;
      
      const updated = { ...brand, [field]: value };
      await offlineDB.put('lpg_brands', updated);
      setLpgBrands(prev => prev.map(b => b.id === id ? updated : b));
      
      // Queue for sync
      await offlineDB.queueOperation({
        type: 'UPDATE',
        table: 'lpg_brands',
        data: { id, [field]: value },
      });
      
      // Sync if online
      if (navigator.onLine) {
        await supabase.from('lpg_brands').update({ [field]: value }).eq('id', id);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to update LPG brand', error, { component: 'useInventoryOfflineData' });
      return false;
    }
  }, [lpgBrands]);

  // Delete LPG brand (soft delete, works offline)
  const deleteLpgBrand = useCallback(async (id: string): Promise<boolean> => {
    try {
      // Soft delete locally
      const brand = lpgBrands.find(b => b.id === id);
      if (!brand) return false;
      
      const updated = { ...brand, is_active: false };
      await offlineDB.put('lpg_brands', updated);
      setLpgBrands(prev => prev.filter(b => b.id !== id));
      
      // Queue for sync
      await offlineDB.queueOperation({
        type: 'UPDATE',
        table: 'lpg_brands',
        data: { id, is_active: false },
      });
      
      // Sync if online
      if (navigator.onLine) {
        await supabase.from('lpg_brands').update({ is_active: false }).eq('id', id);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to delete LPG brand', error, { component: 'useInventoryOfflineData' });
      return false;
    }
  }, [lpgBrands]);

  // Update stove (works offline)
  const updateStove = useCallback(async (id: string, quantity: number): Promise<boolean> => {
    try {
      const stove = stoves.find(s => s.id === id);
      if (!stove) return false;
      
      const updated = { ...stove, quantity };
      await offlineDB.put('stoves', updated);
      setStoves(prev => prev.map(s => s.id === id ? updated : s));
      
      await offlineDB.queueOperation({
        type: 'UPDATE',
        table: 'stoves',
        data: { id, quantity },
      });
      
      if (navigator.onLine) {
        await supabase.from('stoves').update({ quantity }).eq('id', id);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to update stove', error, { component: 'useInventoryOfflineData' });
      return false;
    }
  }, [stoves]);

  // Delete stove (soft delete, works offline)
  const deleteStove = useCallback(async (id: string): Promise<boolean> => {
    try {
      const stove = stoves.find(s => s.id === id);
      if (!stove) return false;
      
      await offlineDB.put('stoves', { ...stove, is_active: false });
      setStoves(prev => prev.filter(s => s.id !== id));
      
      await offlineDB.queueOperation({
        type: 'UPDATE',
        table: 'stoves',
        data: { id, is_active: false },
      });
      
      if (navigator.onLine) {
        await supabase.from('stoves').update({ is_active: false }).eq('id', id);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to delete stove', error, { component: 'useInventoryOfflineData' });
      return false;
    }
  }, [stoves]);

  // Update regulator (works offline)
  const updateRegulator = useCallback(async (id: string, quantity: number): Promise<boolean> => {
    try {
      const regulator = regulators.find(r => r.id === id);
      if (!regulator) return false;
      
      const updated = { ...regulator, quantity };
      await offlineDB.put('regulators', updated);
      setRegulators(prev => prev.map(r => r.id === id ? updated : r));
      
      await offlineDB.queueOperation({
        type: 'UPDATE',
        table: 'regulators',
        data: { id, quantity },
      });
      
      if (navigator.onLine) {
        await supabase.from('regulators').update({ quantity }).eq('id', id);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to update regulator', error, { component: 'useInventoryOfflineData' });
      return false;
    }
  }, [regulators]);

  // Delete regulator (soft delete, works offline)
  const deleteRegulator = useCallback(async (id: string): Promise<boolean> => {
    try {
      const regulator = regulators.find(r => r.id === id);
      if (!regulator) return false;
      
      await offlineDB.put('regulators', { ...regulator, is_active: false });
      setRegulators(prev => prev.filter(r => r.id !== id));
      
      await offlineDB.queueOperation({
        type: 'UPDATE',
        table: 'regulators',
        data: { id, is_active: false },
      });
      
      if (navigator.onLine) {
        await supabase.from('regulators').update({ is_active: false }).eq('id', id);
      }
      
      return true;
    } catch (error) {
      logger.error('Failed to delete regulator', error, { component: 'useInventoryOfflineData' });
      return false;
    }
  }, [regulators]);

  // Get filtered brands helper
  const getFilteredBrands = useCallback((sizeTab: string, weightTab: string, searchQuery: string): LPGBrand[] => {
    return lpgBrands.filter(b => {
      const matchesSize = b.size === sizeTab;
      const matchesWeight = b.weight === weightTab;
      const matchesSearch = !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSize && matchesWeight && matchesSearch;
    });
  }, [lpgBrands]);

  return {
    lpgBrands,
    stoves,
    regulators,
    loading,
    isOffline: !isOnline,
    lastSynced,
    updateLpgBrand,
    deleteLpgBrand,
    updateStove,
    deleteStove,
    updateRegulator,
    deleteRegulator,
    getFilteredBrands,
    refreshData: loadData,
  };
}
