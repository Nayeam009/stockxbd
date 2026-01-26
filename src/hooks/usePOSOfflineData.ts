/**
 * POS Offline Data Hook
 * Provides offline-first data for POS module with local caching and sync
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { offlineDB, generateOfflineId } from '@/lib/offlineDB';
import { syncManager } from '@/lib/syncManager';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { useNetwork } from '@/contexts/NetworkContext';

export interface LPGBrand {
  id: string;
  name: string;
  size: string;
  weight: string;
  refill_cylinder: number;
  package_cylinder: number;
  empty_cylinder: number;
  problem_cylinder: number;
  color: string;
  owner_id?: string;
}

export interface Stove {
  id: string;
  brand: string;
  model: string;
  burners: number;
  price: number;
  quantity: number;
  owner_id?: string;
}

export interface Regulator {
  id: string;
  brand: string;
  type: string;
  quantity: number;
  price?: number;
  owner_id?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  total_due: number;
  cylinders_due: number;
  owner_id?: string;
}

export interface ProductPrice {
  id: string;
  product_type: string;
  brand_id: string | null;
  product_name: string;
  size: string | null;
  variant: string | null;
  company_price: number;
  distributor_price: number;
  retail_price: number;
  package_price: number;
  owner_id?: string;
}

export interface POSTransaction {
  id: string;
  transaction_number: string;
  customer_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: string;
  payment_status: string;
  created_by: string;
  owner_id: string;
  created_at?: string;
}

export interface UsePOSOfflineDataResult {
  // Data
  lpgBrands: LPGBrand[];
  stoves: Stove[];
  regulators: Regulator[];
  customers: Customer[];
  productPrices: ProductPrice[];
  
  // State
  loading: boolean;
  isOffline: boolean;
  lastSynced: Date | null;
  
  // Operations
  saveSale: (transaction: Partial<POSTransaction>, items: any[], inventoryUpdates: any[]) => Promise<string | null>;
  saveCustomer: (customer: Partial<Customer>) => Promise<Customer | null>;
  refreshData: () => Promise<void>;
}

export function usePOSOfflineData(): UsePOSOfflineDataResult {
  const { isOnline } = useNetwork();
  const [loading, setLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);

  // Load data from IndexedDB first, then sync with server
  const loadData = useCallback(async () => {
    setLoading(true);
    
    try {
      // Step 1: Load from IndexedDB instantly
      const [
        localBrands,
        localStoves,
        localRegulators,
        localCustomers,
        localPrices,
      ] = await Promise.all([
        offlineDB.getAll<LPGBrand>('lpg_brands'),
        offlineDB.getAll<Stove>('stoves'),
        offlineDB.getAll<Regulator>('regulators'),
        offlineDB.getAll<Customer>('customers'),
        offlineDB.getAll<ProductPrice>('product_prices'),
      ]);
      
      // Update state with local data immediately
      if (localBrands.length) setLpgBrands(localBrands);
      if (localStoves.length) setStoves(localStoves);
      if (localRegulators.length) setRegulators(localRegulators);
      if (localCustomers.length) setCustomers(localCustomers);
      if (localPrices.length) setProductPrices(localPrices);
      
      // Get last sync time
      const syncTime = await offlineDB.getLastSync('pos_data');
      if (syncTime) setLastSynced(new Date(syncTime));
      
      // Step 2: If online, fetch fresh data
      if (navigator.onLine) {
        const [brandsRes, stovesRes, regulatorsRes, customersRes, pricesRes] = await Promise.all([
          supabase.from('lpg_brands').select('*').eq('is_active', true),
          supabase.from('stoves').select('*').eq('is_active', true),
          supabase.from('regulators').select('*').eq('is_active', true),
          supabase.from('customers').select('*').order('name'),
          supabase.from('product_prices').select('*').eq('is_active', true),
        ]);
        
        // Update state and cache
        if (brandsRes.data) {
          setLpgBrands(brandsRes.data);
          await offlineDB.bulkPut('lpg_brands', brandsRes.data);
        }
        if (stovesRes.data) {
          setStoves(stovesRes.data);
          await offlineDB.bulkPut('stoves', stovesRes.data);
        }
        if (regulatorsRes.data) {
          setRegulators(regulatorsRes.data);
          await offlineDB.bulkPut('regulators', regulatorsRes.data);
        }
        if (customersRes.data) {
          setCustomers(customersRes.data);
          await offlineDB.bulkPut('customers', customersRes.data);
        }
        if (pricesRes.data) {
          setProductPrices(pricesRes.data);
          await offlineDB.bulkPut('product_prices', pricesRes.data);
        }
        
        // Update sync time
        await offlineDB.setLastSync('pos_data');
        setLastSynced(new Date());
      }
    } catch (error) {
      logger.error('Failed to load POS data', error, { component: 'usePOSOfflineData' });
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
      supabase.channel('pos-lpg-offline').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lpg_brands' }, 
        async () => {
          const { data } = await supabase.from('lpg_brands').select('*').eq('is_active', true);
          if (data) {
            setLpgBrands(data);
            await offlineDB.bulkPut('lpg_brands', data);
          }
        }
      ).subscribe(),
      
      supabase.channel('pos-customers-offline').on('postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        async () => {
          const { data } = await supabase.from('customers').select('*').order('name');
          if (data) {
            setCustomers(data);
            await offlineDB.bulkPut('customers', data);
          }
        }
      ).subscribe(),
      
      supabase.channel('pos-prices-offline').on('postgres_changes',
        { event: '*', schema: 'public', table: 'product_prices' },
        async () => {
          const { data } = await supabase.from('product_prices').select('*').eq('is_active', true);
          if (data) {
            setProductPrices(data);
            await offlineDB.bulkPut('product_prices', data);
          }
        }
      ).subscribe(),
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [isOnline]);

  // Save a sale (works offline)
  const saveSale = useCallback(async (
    transaction: Partial<POSTransaction>,
    items: any[],
    inventoryUpdates: any[]
  ): Promise<string | null> => {
    try {
      const transactionId = transaction.id || generateOfflineId();
      const fullTransaction = {
        ...transaction,
        id: transactionId,
        created_at: new Date().toISOString(),
      } as POSTransaction;
      
      // Save to IndexedDB immediately
      await offlineDB.put('pos_transactions', fullTransaction);
      
      // Save items
      for (const item of items) {
        await offlineDB.put('pos_transaction_items', {
          ...item,
          id: item.id || generateOfflineId(),
          transaction_id: transactionId,
        });
      }
      
      // Apply inventory updates locally
      for (const update of inventoryUpdates) {
        if (update.table === 'lpg_brands') {
          const brand = lpgBrands.find(b => b.id === update.id);
          if (brand) {
            const updated = { ...brand, [update.field]: update.value };
            await offlineDB.put('lpg_brands', updated);
            setLpgBrands(prev => prev.map(b => b.id === update.id ? updated : b));
          }
        } else if (update.table === 'stoves') {
          const stove = stoves.find(s => s.id === update.id);
          if (stove) {
            const updated = { ...stove, quantity: update.value };
            await offlineDB.put('stoves', updated);
            setStoves(prev => prev.map(s => s.id === update.id ? updated : s));
          }
        } else if (update.table === 'regulators') {
          const regulator = regulators.find(r => r.id === update.id);
          if (regulator) {
            const updated = { ...regulator, quantity: update.value };
            await offlineDB.put('regulators', updated);
            setRegulators(prev => prev.map(r => r.id === update.id ? updated : r));
          }
        }
      }
      
      // Queue for sync
      await offlineDB.queueOperation({
        type: 'INSERT',
        table: 'pos_transactions',
        data: { transaction: fullTransaction, items, inventoryUpdates },
      });
      
      // Trigger sync if online
      if (navigator.onLine) {
        syncManager.syncAll();
      }
      
      return transactionId;
    } catch (error) {
      logger.error('Failed to save sale offline', error, { component: 'usePOSOfflineData' });
      return null;
    }
  }, [lpgBrands, stoves, regulators]);

  // Save a new customer (works offline)
  const saveCustomer = useCallback(async (customer: Partial<Customer>): Promise<Customer | null> => {
    try {
      const customerId = customer.id || generateOfflineId();
      const fullCustomer = {
        ...customer,
        id: customerId,
        total_due: customer.total_due || 0,
        cylinders_due: customer.cylinders_due || 0,
      } as Customer;
      
      // Save locally
      await offlineDB.put('customers', fullCustomer);
      setCustomers(prev => [...prev, fullCustomer]);
      
      // Queue for sync
      await offlineDB.queueOperation({
        type: 'INSERT',
        table: 'customers',
        data: fullCustomer,
      });
      
      // Trigger sync if online
      if (navigator.onLine) {
        syncManager.syncAll();
      }
      
      return fullCustomer;
    } catch (error) {
      logger.error('Failed to save customer offline', error, { component: 'usePOSOfflineData' });
      return null;
    }
  }, []);

  return {
    lpgBrands,
    stoves,
    regulators,
    customers,
    productPrices,
    loading,
    isOffline: !isOnline,
    lastSynced,
    saveSale,
    saveCustomer,
    refreshData: loadData,
  };
}
