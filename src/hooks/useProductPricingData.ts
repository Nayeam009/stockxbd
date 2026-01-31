import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { withTimeout, debounce, TimeoutError } from '@/lib/asyncUtils';
import { calculateDefaultPrices } from '@/lib/brandConstants';

// Constants
const FETCH_TIMEOUT_MS = 12000;

// Types
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
  is_active: boolean;
  owner_id?: string;
  created_by?: string;
}

export interface LpgBrand {
  id: string;
  name: string;
  color: string;
  size: string;
  weight: string | null;
}

export interface GroupedBrand {
  name: string;
  color: string;
  weight: string;
  brandIds: string[];
}

export interface NewProductData {
  product_type: string;
  brand_id: string;
  product_name: string;
  size: string;
  variant: string;
  company_price: number;
  distributor_price: number;
  retail_price: number;
  package_price: number;
}

// Weight options
export const WEIGHT_OPTIONS_22MM = [
  { value: "5.5kg", label: "5.5 KG", shortLabel: "5.5" },
  { value: "12kg", label: "12 KG", shortLabel: "12" },
  { value: "12.5kg", label: "12.5 KG", shortLabel: "12.5" },
  { value: "25kg", label: "25 KG", shortLabel: "25" },
  { value: "35kg", label: "35 KG", shortLabel: "35" },
  { value: "45kg", label: "45 KG", shortLabel: "45" },
];

export const WEIGHT_OPTIONS_20MM = [
  { value: "5kg", label: "5 KG", shortLabel: "5" },
  { value: "10kg", label: "10 KG", shortLabel: "10" },
  { value: "12kg", label: "12 KG", shortLabel: "12" },
  { value: "15kg", label: "15 KG", shortLabel: "15" },
  { value: "21kg", label: "21 KG", shortLabel: "21" },
  { value: "35kg", label: "35 KG", shortLabel: "35" },
];

// Normalize brand name for grouping
const normalizeBrandName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[\s-_]+/g, '')
    .replace(/lp\s*gas/gi, '')
    .replace(/h$/i, '')
    .replace(/o/g, 'u')
    .trim();
};

// Validate prices
export const validatePrices = (prices: Partial<ProductPrice>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (prices.company_price !== undefined && prices.company_price < 0) {
    errors.push("Company price cannot be negative");
  }
  if (prices.retail_price !== undefined && prices.company_price !== undefined && 
      prices.retail_price < prices.company_price) {
    errors.push("Retail price should be higher than company price");
  }
  if (prices.distributor_price !== undefined && prices.company_price !== undefined &&
      prices.distributor_price < prices.company_price) {
    errors.push("Wholesale price should be higher than company price");
  }
  
  return { valid: errors.length === 0, errors };
};

// Main hook
export function useProductPricingData() {
  const queryClient = useQueryClient();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editedPrices, setEditedPrices] = useState<Record<string, Partial<ProductPrice>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const autoFilledMissingRef = useRef<Set<string>>(new Set());

  // Products query with timeout
  const { 
    data: products = [], 
    isLoading: productsLoading, 
    error: productsError,
    refetch: refetchProducts,
    isFetching: productsFetching
  } = useQuery({
    queryKey: ['product-pricing-products'],
    queryFn: async () => {
      try {
        const fetchPromise = supabase
          .from('product_prices')
          .select('*')
          .eq('is_active', true)
          .order('product_name');
        
        const { data, error } = await withTimeout(fetchPromise, FETCH_TIMEOUT_MS, 'Product Pricing');
        if (error) throw error;
        return data || [];
      } catch (error) {
        if (error instanceof TimeoutError) {
          throw new Error("Loading took too long. Please retry.");
        }
        throw error;
      }
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  // LPG Brands query
  const { 
    data: lpgBrands = [],
    isLoading: brandsLoading,
    refetch: refetchBrands
  } = useQuery({
    queryKey: ['product-pricing-lpg-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lpg_brands')
        .select('id, name, color, size, weight')
        .eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
  });

  // Debounced refetch for real-time
  const debouncedRefetch = useMemo(
    () => debounce(() => {
      refetchProducts();
      refetchBrands();
    }, 1000),
    [refetchProducts, refetchBrands]
  );

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('pricing-realtime-v3')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'product_prices' },
        () => debouncedRefetch()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'lpg_brands' },
        () => debouncedRefetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [debouncedRefetch]);

  // Auto-fill missing LPG prices (only when DB values are 0) so owners immediately see defaults
  // and can still override before saving.
  useEffect(() => {
    if (products.length === 0) return;

    setEditedPrices(prev => {
      let changed = false;
      const next: Record<string, Partial<ProductPrice>> = { ...prev };

      for (const p of products) {
        if (p.product_type !== 'lpg') continue;

        const company = p.company_price ?? 0;
        if (company <= 0) continue;

        const needsWholesale = (p.distributor_price ?? 0) === 0 && next[p.id]?.distributor_price === undefined;
        const needsRetail = (p.retail_price ?? 0) === 0 && next[p.id]?.retail_price === undefined;
        if (!needsWholesale && !needsRetail) continue;

        const marker = `${p.id}:${company}:${p.variant ?? ''}`;
        if (autoFilledMissingRef.current.has(marker)) continue;

        const variant = p.variant === 'Package' ? 'package' : 'refill';
        const calculated = calculateDefaultPrices(company, variant);

        next[p.id] = {
          ...next[p.id],
          ...(needsWholesale ? { distributor_price: calculated.wholesale } : {}),
          ...(needsRetail ? { retail_price: calculated.retail } : {}),
        };
        autoFilledMissingRef.current.add(marker);
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [products]);

  // Filtered products by type
  const lpgProducts = useMemo(() => 
    products.filter(p => p.product_type === 'lpg'), [products]
  );
  const stoveProducts = useMemo(() => 
    products.filter(p => p.product_type === 'stove'), [products]
  );
  const regulatorProducts = useMemo(() => 
    products.filter(p => p.product_type === 'regulator'), [products]
  );

  // Group brands by normalized name
  const getGroupedBrands = useCallback((sizeTab: '22mm' | '20mm', selectedWeight: string): GroupedBrand[] => {
    const filtered = lpgBrands.filter(brand =>
      brand.size === sizeTab && brand.weight === selectedWeight
    );

    const groupMap = new Map<string, GroupedBrand>();
    filtered.forEach(brand => {
      const normalizedName = normalizeBrandName(brand.name);
      if (groupMap.has(normalizedName)) {
        groupMap.get(normalizedName)!.brandIds.push(brand.id);
      } else {
        groupMap.set(normalizedName, {
          name: brand.name.charAt(0).toUpperCase() + brand.name.slice(1),
          color: brand.color,
          weight: brand.weight || selectedWeight,
          brandIds: [brand.id]
        });
      }
    });

    return Array.from(groupMap.values());
  }, [lpgBrands]);

  // Get products for a brand group
  const getProductsForBrandGroup = useCallback((brandIds: string[], searchQuery: string = '') => {
    return products.filter(p =>
      p.product_type === 'lpg' &&
      brandIds.includes(p.brand_id || '') &&
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products]);

  // Price change handler with auto-calculate for LPG cylinders
  const handlePriceChange = useCallback((productId: string, field: keyof ProductPrice, value: number) => {
    // Find the product to check if it's LPG and needs auto-calculation
    const product = products.find(p => p.id === productId);
    
    // If changing company_price for LPG products, auto-calculate wholesale and retail
    if (field === 'company_price' && product?.product_type === 'lpg') {
      // Get current edited values or original values
      const currentEdits = editedPrices[productId] || {};
      const currentWholesale = currentEdits.distributor_price ?? product.distributor_price ?? 0;
      const currentRetail = currentEdits.retail_price ?? product.retail_price ?? 0;
      
      // Determine variant from product
      const variant = product.variant === 'Package' ? 'package' : 'refill';
      const calculated = calculateDefaultPrices(value, variant);
      
      // Only auto-fill if wholesale/retail are 0 or not yet edited by user
      const shouldAutoFillWholesale = currentWholesale === 0 || !currentEdits.distributor_price;
      const shouldAutoFillRetail = currentRetail === 0 || !currentEdits.retail_price;
      
      setEditedPrices(prev => ({
        ...prev,
        [productId]: { 
          ...prev[productId], 
          company_price: value,
          // Always auto-calculate when company price changes for LPG
          distributor_price: calculated.wholesale,
          retail_price: calculated.retail
        }
      }));
    } else {
      // For other fields or non-LPG products, just update the single field
      setEditedPrices(prev => ({
        ...prev,
        [productId]: { ...prev[productId], [field]: value }
      }));
    }
  }, [products, editedPrices]);

  // Get current value (edited or original)
  const getValue = useCallback((product: ProductPrice, field: keyof ProductPrice): number => {
    return (editedPrices[product.id]?.[field] as number) ?? (product[field] as number);
  }, [editedPrices]);

  // Save changes with Business Diary integration
  const saveChanges = useCallback(async () => {
    const updates = Object.entries(editedPrices);
    if (updates.length === 0) {
      toast.info("No changes to save");
      return;
    }

    // Validate all changes
    for (const [id, changes] of updates) {
      const product = products.find(p => p.id === id);
      if (product) {
        const merged = { ...product, ...changes };
        const { valid, errors } = validatePrices(merged);
        if (!valid) {
          toast.error(errors[0]);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      
      for (const [id, changes] of updates) {
        const product = products.find(p => p.id === id);
        const oldPrice = product?.retail_price || 0;
        const newPrice = changes.retail_price ?? oldPrice;

        // Update product price
        const { error } = await supabase
          .from('product_prices')
          .update(changes)
          .eq('id', id);
        
        if (error) throw error;

        // Log to stock_movements for Business Diary audit trail
        if (product && changes.retail_price !== undefined && changes.retail_price !== oldPrice) {
          await supabase.from('stock_movements').insert({
            movement_type: 'price_adjustment',
            notes: `Price updated: ${product.product_name} - ৳${oldPrice} → ৳${newPrice}`,
            quantity: 0,
            created_by: user?.user?.id,
            owner_id: product.owner_id
          });

          // Sync to shop_products for Online Ecosystem
          await syncToShopProducts(product.product_name, newPrice, user?.user?.id);
        }
      }
      
      toast.success("Prices updated successfully");
      setEditedPrices({});
      refetchProducts();
    } catch (error: any) {
      toast.error(error.message || "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [editedPrices, products, refetchProducts]);

  // Sync to shop_products for Online Ecosystem
  const syncToShopProducts = async (productName: string, newPrice: number, userId?: string) => {
    if (!userId) return;
    
    try {
      const { data: shop } = await supabase
        .from('shop_profiles')
        .select('id')
        .eq('owner_id', userId)
        .single();

      if (shop) {
        await supabase
          .from('shop_products')
          .update({ price: newPrice, updated_at: new Date().toISOString() })
          .eq('shop_id', shop.id)
          .ilike('brand_name', `%${productName.split(' ')[0]}%`);
      }
    } catch (error) {
      console.log('[Pricing] Shop products sync skipped:', error);
    }
  };

  // Add new product
  const addProduct = useCallback(async (newProduct: NewProductData) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      toast.error("Please log in first");
      return false;
    }

    try {
      const { data: ownerId } = await supabase.rpc("get_owner_id");

      const { error } = await supabase.from("product_prices").insert({
        ...newProduct,
        brand_id: newProduct.brand_id || null,
        created_by: user.user.id,
        owner_id: ownerId || user.user.id,
      });

      if (error) throw error;

      toast.success("Product added successfully");
      refetchProducts();
      return true;
    } catch (error: any) {
      toast.error(error.message || "Failed to add product");
      return false;
    }
  }, [refetchProducts]);

  // Delete product
  const deleteProduct = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from("product_prices")
        .update({ is_active: false })
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Product deleted");
      refetchProducts();
    } catch (error) {
      toast.error("Failed to delete product");
    }
  }, [refetchProducts]);

  // Computed stats
  const stats = useMemo(() => {
    const lpgCount = lpgProducts.length;
    const stoveCount = stoveProducts.length;
    const regulatorCount = regulatorProducts.length;
    
    const avgMargin = lpgProducts.length > 0
      ? lpgProducts.reduce((sum, p) => sum + (p.retail_price - p.company_price), 0) / lpgProducts.length
      : 0;

    return {
      totalProducts: products.length,
      lpgCount,
      stoveCount,
      regulatorCount,
      avgMargin: Math.round(avgMargin),
    };
  }, [products, lpgProducts, stoveProducts, regulatorProducts]);

  const hasChanges = Object.keys(editedPrices).length > 0;
  const pendingCount = Object.keys(editedPrices).length;
  const initialLoading = productsLoading && products.length === 0;
  const softLoading = productsFetching && products.length > 0;

  return {
    // Data
    products,
    lpgProducts,
    stoveProducts,
    regulatorProducts,
    lpgBrands,
    stats,
    
    // Loading states
    initialLoading,
    softLoading,
    loadError: productsError?.message || loadError,
    
    // Editing state
    editedPrices,
    hasChanges,
    pendingCount,
    isSaving,
    
    // Actions
    handlePriceChange,
    getValue,
    saveChanges,
    addProduct,
    deleteProduct,
    refetch: () => { refetchProducts(); refetchBrands(); },
    
    // Helpers
    getGroupedBrands,
    getProductsForBrandGroup,
  };
}
