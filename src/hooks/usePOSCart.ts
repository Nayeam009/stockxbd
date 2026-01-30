import { useState, useCallback, useMemo } from "react";
import { toast } from "@/hooks/use-toast";
import type { LPGBrand, Stove, Regulator } from "./usePOSData";

// ============= INTERFACES =============
export interface SaleItem {
  id: string;
  type: 'lpg' | 'stove' | 'regulator' | 'custom';
  name: string;
  details: string;
  price: number;
  quantity: number;
  cylinderType?: 'refill' | 'package';
  brandId?: string;
  stoveId?: string;
  regulatorId?: string;
  weight?: string;
  mouthSize?: string;
  brandColor?: string;
}

export interface ReturnItem {
  id: string;
  brandId: string;
  brandName: string;
  brandColor: string;
  quantity: number;
  isLeaked: boolean;
  weight: string;
}

// ============= MAIN HOOK =============
export function usePOSCart() {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [discount, setDiscount] = useState(0);

  // ===== Calculations =====
  const subtotal = useMemo(() => 
    saleItems.reduce((sum, item) => sum + item.price * item.quantity, 0), 
    [saleItems]
  );

  const total = useMemo(() => 
    Math.max(0, subtotal - discount), 
    [subtotal, discount]
  );

  const saleItemsCount = useMemo(() => 
    saleItems.reduce((s, i) => s + i.quantity, 0), 
    [saleItems]
  );

  const refillCylindersCount = useMemo(() => 
    saleItems
      .filter(i => i.type === 'lpg' && i.cylinderType === 'refill')
      .reduce((sum, i) => sum + i.quantity, 0),
    [saleItems]
  );

  const packageCylindersCount = useMemo(() => 
    saleItems
      .filter(i => i.type === 'lpg' && i.cylinderType === 'package')
      .reduce((sum, i) => sum + i.quantity, 0),
    [saleItems]
  );

  const returnCylindersCount = useMemo(() => 
    returnItems.reduce((sum, i) => sum + i.quantity, 0), 
    [returnItems]
  );

  const isReturnCountMatched = refillCylindersCount === 0 || refillCylindersCount === returnCylindersCount;
  const hasRefillInCart = refillCylindersCount > 0;

  // ===== Cart Actions =====
  const addLPGToCart = useCallback((
    brand: LPGBrand,
    cylinderType: 'refill' | 'package',
    saleType: 'retail' | 'wholesale',
    weight: string,
    mouthSize: string,
    price: number
  ) => {
    const stock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
    
    setSaleItems(prev => {
      const existing = prev.find(
        i => i.type === 'lpg' && i.brandId === brand.id && i.cylinderType === cylinderType && i.weight === weight
      );

      if (existing) {
        if (existing.quantity >= stock) {
          toast({ title: `Only ${stock} in stock`, variant: "destructive" });
          return prev;
        }
        return prev.map(i =>
          i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }

      const newItem: SaleItem = {
        id: `lpg-${Date.now()}`,
        type: 'lpg',
        name: brand.name,
        details: `${weight} • ${cylinderType === 'refill' ? 'Refill' : 'Package'} • ${saleType}`,
        price,
        quantity: 1,
        cylinderType,
        brandId: brand.id,
        weight,
        mouthSize,
        brandColor: brand.color
      };
      return [...prev, newItem];
    });
    
    toast({ title: `${brand.name} added to sale` });
  }, []);

  const addStoveToCart = useCallback((stove: Stove, price: number) => {
    setSaleItems(prev => {
      const existing = prev.find(i => i.stoveId === stove.id);

      if (existing) {
        if (existing.quantity >= stove.quantity) {
          toast({ title: `Only ${stove.quantity} in stock`, variant: "destructive" });
          return prev;
        }
        return prev.map(i =>
          i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }

      const newItem: SaleItem = {
        id: `stove-${Date.now()}`,
        type: 'stove',
        name: `${stove.brand} ${stove.model}`,
        details: `${stove.burners} Burner`,
        price,
        quantity: 1,
        stoveId: stove.id
      };
      return [...prev, newItem];
    });
    
    toast({ title: "Stove added to sale" });
  }, []);

  const addRegulatorToCart = useCallback((regulator: Regulator, price: number) => {
    setSaleItems(prev => {
      const existing = prev.find(i => i.regulatorId === regulator.id);

      if (existing) {
        if (existing.quantity >= regulator.quantity) {
          toast({ title: `Only ${regulator.quantity} in stock`, variant: "destructive" });
          return prev;
        }
        return prev.map(i =>
          i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }

      const newItem: SaleItem = {
        id: `reg-${Date.now()}`,
        type: 'regulator',
        name: regulator.brand,
        details: regulator.type,
        price,
        quantity: 1,
        regulatorId: regulator.id
      };
      return [...prev, newItem];
    });
    
    toast({ title: "Regulator added to sale" });
  }, []);

  const addCustomItem = useCallback((item: SaleItem) => {
    setSaleItems(prev => [...prev, item]);
    toast({ title: `${item.name} added to sale` });
  }, []);

  const updateItemQuantity = useCallback((id: string, change: number) => {
    setSaleItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + change;
        if (newQty < 1) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setSaleItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // ===== Return Cylinder Actions =====
  const addReturnCylinder = useCallback((brand: LPGBrand, weight: string) => {
    setReturnItems(prev => {
      const existing = prev.find(r => r.brandId === brand.id && !r.isLeaked);

      if (existing) {
        return prev.map(r =>
          r.id === existing.id ? { ...r, quantity: r.quantity + 1 } : r
        );
      }

      return [...prev, {
        id: `return-${Date.now()}`,
        brandId: brand.id,
        brandName: brand.name,
        brandColor: brand.color,
        quantity: 1,
        isLeaked: false,
        weight
      }];
    });
    
    toast({ title: `${brand.name} added to return` });
  }, []);

  const updateReturnQuantity = useCallback((id: string, change: number) => {
    setReturnItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + change;
        if (newQty < 1) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  }, []);

  const removeReturnItem = useCallback((id: string) => {
    setReturnItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const toggleReturnLeaked = useCallback((id: string) => {
    setReturnItems(prev => prev.map(item =>
      item.id === id ? { ...item, isLeaked: !item.isLeaked } : item
    ));
  }, []);

  // ===== Stock Preview Calculations =====
  const getPendingStock = useCallback((brandId: string, cylType: 'refill' | 'package') => {
    return saleItems
      .filter(i => i.type === 'lpg' && i.brandId === brandId && i.cylinderType === cylType)
      .reduce((sum, i) => sum + i.quantity, 0);
  }, [saleItems]);

  const getPendingReturns = useCallback((brandId: string) => {
    return returnItems
      .filter(r => r.brandId === brandId && !r.isLeaked)
      .reduce((sum, r) => sum + r.quantity, 0);
  }, [returnItems]);

  const getPendingProblem = useCallback((brandId: string) => {
    return returnItems
      .filter(r => r.brandId === brandId && r.isLeaked)
      .reduce((sum, r) => sum + r.quantity, 0);
  }, [returnItems]);

  // ===== Clear Cart =====
  const clearCart = useCallback(() => {
    setSaleItems([]);
    setReturnItems([]);
    setDiscount(0);
    toast({ title: "Cart cleared" });
  }, []);

  const resetCart = useCallback(() => {
    setSaleItems([]);
    setReturnItems([]);
    setDiscount(0);
  }, []);

  return {
    // State
    saleItems,
    returnItems,
    discount,
    // Calculations
    subtotal,
    total,
    saleItemsCount,
    refillCylindersCount,
    packageCylindersCount,
    returnCylindersCount,
    isReturnCountMatched,
    hasRefillInCart,
    // Sale Actions
    addLPGToCart,
    addStoveToCart,
    addRegulatorToCart,
    addCustomItem,
    updateItemQuantity,
    removeItem,
    // Return Actions
    addReturnCylinder,
    updateReturnQuantity,
    removeReturnItem,
    toggleReturnLeaked,
    // Stock Preview
    getPendingStock,
    getPendingReturns,
    getPendingProblem,
    // Cart Management
    setDiscount,
    clearCart,
    resetCart,
    setSaleItems,
    setReturnItems,
  };
}
