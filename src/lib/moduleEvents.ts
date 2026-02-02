/**
 * Cross-Module Event System for Stock-X
 * 
 * Simple pub/sub for real-time module communication.
 * Allows modules to notify each other of important state changes.
 */

// ============= EVENT TYPES =============
export type ModuleEventType = 
  | 'sale-completed'
  | 'purchase-completed'
  | 'inventory-updated'
  | 'customer-updated'
  | 'order-status-changed'
  | 'expense-added'
  | 'price-updated'
  | 'navigate-module';

export interface ModuleEventPayload {
  'sale-completed': { 
    transactionId: string; 
    total: number; 
    customerId?: string;
    items?: Array<{ productName: string; quantity: number }>;
  };
  'purchase-completed': { 
    transactionId: string; 
    total: number; 
    supplierName?: string;
  };
  'inventory-updated': { 
    brandId?: string; 
    type: 'lpg' | 'stove' | 'regulator';
    change: 'increase' | 'decrease';
  };
  'customer-updated': { 
    customerId: string; 
    type: 'created' | 'updated' | 'settled';
  };
  'order-status-changed': { 
    orderId: string; 
    newStatus: string;
    previousStatus?: string;
  };
  'expense-added': { 
    amount: number; 
    category: string; 
  };
  'price-updated': { 
    productType: string; 
    brandId?: string;
  };
  'navigate-module': string;
}

// ============= EVENT DISPATCHING =============

/**
 * Dispatch a module event
 * @param type - Event type
 * @param payload - Event data
 */
export function dispatchModuleEvent<T extends ModuleEventType>(
  type: T,
  payload: ModuleEventPayload[T]
) {
  const event = new CustomEvent(`stockx:${type}`, {
    detail: payload,
    bubbles: true,
  });
  window.dispatchEvent(event);
}

// ============= EVENT LISTENING =============

/**
 * Subscribe to a module event
 * @param type - Event type to listen for
 * @param handler - Callback function
 * @returns Cleanup function
 */
export function subscribeToModuleEvent<T extends ModuleEventType>(
  type: T,
  handler: (payload: ModuleEventPayload[T]) => void
): () => void {
  const eventName = `stockx:${type}`;
  
  const listener = (e: Event) => {
    const customEvent = e as CustomEvent<ModuleEventPayload[T]>;
    handler(customEvent.detail);
  };

  window.addEventListener(eventName, listener);
  
  return () => {
    window.removeEventListener(eventName, listener);
  };
}

// ============= REACT HOOK =============
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { sharedKeys } from '@/hooks/useSharedQueries';

/**
 * React hook to listen for module events
 * Automatically handles cleanup on unmount
 */
export function useModuleEvent<T extends ModuleEventType>(
  type: T,
  handler: (payload: ModuleEventPayload[T]) => void,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    const cleanup = subscribeToModuleEvent(type, handler);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, ...deps]);
}

/**
 * Hook that auto-syncs module data based on cross-module events
 * Place this in Dashboard.tsx to enable automatic cache invalidation
 */
export function useModuleEventSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Sale completed → refresh overview & customers
    const unsubSale = subscribeToModuleEvent('sale-completed', () => {
      queryClient.invalidateQueries({ queryKey: sharedKeys.overview() });
      queryClient.invalidateQueries({ queryKey: sharedKeys.customers() });
      queryClient.invalidateQueries({ queryKey: sharedKeys.lpgBrands() });
    });

    // Purchase completed → refresh inventory & overview
    const unsubPurchase = subscribeToModuleEvent('purchase-completed', () => {
      queryClient.invalidateQueries({ queryKey: sharedKeys.overview() });
      queryClient.invalidateQueries({ queryKey: sharedKeys.lpgBrands() });
    });

    // Inventory updated → refresh brands
    const unsubInventory = subscribeToModuleEvent('inventory-updated', () => {
      queryClient.invalidateQueries({ queryKey: sharedKeys.lpgBrands() });
      queryClient.invalidateQueries({ queryKey: sharedKeys.stoves() });
      queryClient.invalidateQueries({ queryKey: sharedKeys.regulators() });
    });

    // Customer updated → refresh customers
    const unsubCustomer = subscribeToModuleEvent('customer-updated', () => {
      queryClient.invalidateQueries({ queryKey: sharedKeys.customers() });
    });

    // Price updated → refresh prices
    const unsubPrice = subscribeToModuleEvent('price-updated', () => {
      queryClient.invalidateQueries({ queryKey: sharedKeys.prices() });
    });

    return () => {
      unsubSale();
      unsubPurchase();
      unsubInventory();
      unsubCustomer();
      unsubPrice();
    };
  }, [queryClient]);
}

// ============= CONVENIENCE FUNCTIONS =============

/**
 * Notify that a POS sale was completed
 */
export function notifySaleCompleted(
  transactionId: string, 
  total: number, 
  customerId?: string
) {
  dispatchModuleEvent('sale-completed', { transactionId, total, customerId });
}

/**
 * Notify that a POB purchase was completed
 */
export function notifyPurchaseCompleted(
  transactionId: string, 
  total: number,
  supplierName?: string
) {
  dispatchModuleEvent('purchase-completed', { transactionId, total, supplierName });
}

/**
 * Notify that inventory was updated
 */
export function notifyInventoryUpdated(
  type: 'lpg' | 'stove' | 'regulator',
  change: 'increase' | 'decrease',
  brandId?: string
) {
  dispatchModuleEvent('inventory-updated', { type, change, brandId });
}

/**
 * Navigate to a different module
 */
export function navigateToModule(module: string) {
  dispatchModuleEvent('navigate-module', module);
}
