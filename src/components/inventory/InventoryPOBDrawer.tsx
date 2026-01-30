import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  ShoppingCart,
  Loader2,
  Cylinder,
  Calculator,
  CircleDashed,
  Flame,
  ChefHat,
  Gauge,
  Info
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { getLpgBrandColor, validateCustomBrand } from "@/lib/brandConstants";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { logger } from "@/lib/logger";
import { BrandSelect } from "@/components/shared/BrandSelect";
import { usePOBCart, type POBCartItem } from "@/hooks/usePOBCart";
import { POBCartView } from "./POBCartView";
import { ValveSizeQuantityCard, BurnerTypeQuantityCard } from "./POBQuantityCard";
import { cn } from "@/lib/utils";

// Weight options
const WEIGHT_OPTIONS_22MM = ["5.5kg", "12kg", "12.5kg", "25kg", "35kg", "45kg"];
const WEIGHT_OPTIONS_20MM = ["5kg", "10kg", "12kg", "15kg", "21kg", "35kg"];

interface InventoryPOBDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productType: 'lpg' | 'stove' | 'regulator';
  onPurchaseComplete: () => void;
}

export const InventoryPOBDrawer = ({ 
  open, 
  onOpenChange, 
  productType, 
  onPurchaseComplete 
}: InventoryPOBDrawerProps) => {
  const isMobile = useIsMobile();
  
  // Use centralized cart hook
  const {
    items: purchaseItems,
    addItems,
    removeItem,
    subtotal,
    totalQty: purchaseItemsCount,
    supplierName,
    setSupplierName,
    pobMode,
    setPobMode,
    mobileStep,
    setMobileStep,
    showSupplierInput,
    setShowSupplierInput,
    formState,
    updateFormField,
    lpgTotalQty,
    stoveTotalQty,
    regTotalQty,
    lpgCompanyPrice,
    stoveCompanyPrice,
    regulatorCompanyPrice,
    resetLPGForm,
    resetStoveForm,
    resetRegulatorForm,
    resetAllForms
  } = usePOBCart();
  
  // Local state
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // Fetched data for stock stats
  const [lpgBrands, setLpgBrands] = useState<any[]>([]);
  const [stoves, setStoves] = useState<any[]>([]);
  const [regulators, setRegulators] = useState<any[]>([]);

  // Fetch data on open
  const fetchData = useCallback(async () => {
    const [brandsRes, stovesRes, regulatorsRes] = await Promise.all([
      supabase.from('lpg_brands').select('*').eq('is_active', true),
      supabase.from('stoves').select('*').eq('is_active', true),
      supabase.from('regulators').select('*').eq('is_active', true)
    ]);
    if (brandsRes.data) setLpgBrands(brandsRes.data);
    if (stovesRes.data) setStoves(stovesRes.data);
    if (regulatorsRes.data) setRegulators(regulatorsRes.data);
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
      setMobileStep('product');
    }
  }, [open, fetchData, setMobileStep]);

  // Stock stats computations
  const valveSizeStats = useMemo(() => {
    const stats22mm = lpgBrands.filter(b => b.size === "22mm").reduce((acc, b) => ({
      refill: acc.refill + b.refill_cylinder,
      package: acc.package + b.package_cylinder,
      total: acc.total + b.refill_cylinder + b.package_cylinder
    }), { refill: 0, package: 0, total: 0 });

    const stats20mm = lpgBrands.filter(b => b.size === "20mm").reduce((acc, b) => ({
      refill: acc.refill + b.refill_cylinder,
      package: acc.package + b.package_cylinder,
      total: acc.total + b.refill_cylinder + b.package_cylinder
    }), { refill: 0, package: 0, total: 0 });

    return { "22mm": stats22mm, "20mm": stats20mm };
  }, [lpgBrands]);

  const regulatorValveStats = useMemo(() => ({
    "22mm": regulators.filter(r => r.type === "22mm").reduce((sum, r) => sum + r.quantity, 0),
    "20mm": regulators.filter(r => r.type === "20mm").reduce((sum, r) => sum + r.quantity, 0)
  }), [regulators]);

  const stoveBurnerStats = useMemo(() => ({
    single: stoves.filter(s => s.burners === 1).reduce((sum, s) => sum + s.quantity, 0),
    double: stoves.filter(s => s.burners === 2).reduce((sum, s) => sum + s.quantity, 0)
  }), [stoves]);

  // Update product pricing helper
  const updateProductPricing = async (
    type: 'lpg' | 'stove' | 'regulator',
    productName: string,
    companyPrice: number,
    options: { brandId?: string; weight?: string; valveSize?: string; cylinderType?: 'refill' | 'package'; burnerType?: string; regulatorType?: string }
  ): Promise<{ priceChanged: boolean; oldPrice?: number }> => {
    try {
      if (type === 'lpg' && options.brandId) {
        const variant = options.cylinderType === 'refill' ? 'Refill' : 'Package';
        const fullProductName = `${productName} LP Gas ${options.weight} Cylinder (${options.valveSize}) ${variant}`;
        
        const { data: existingPrice } = await supabase
          .from('product_prices')
          .select('id, company_price, package_price')
          .ilike('product_name', `%${productName}%`)
          .eq('variant', variant)
          .eq('product_type', 'lpg')
          .eq('is_active', true)
          .maybeSingle();

        if (existingPrice) {
          const currentPrice = options.cylinderType === 'package' ? existingPrice.package_price : existingPrice.company_price;
          const priceChanged = currentPrice !== companyPrice && currentPrice > 0;
          const updateData: Record<string, unknown> = { 
            updated_at: new Date().toISOString(),
            product_name: fullProductName,
            brand_id: options.brandId
          };
          if (options.cylinderType === 'package') {
            updateData.package_price = companyPrice;
          } else {
            updateData.company_price = companyPrice;
          }
          await supabase.from('product_prices').update(updateData).eq('id', existingPrice.id);
          return { priceChanged, oldPrice: currentPrice };
        } else {
          await supabase.from('product_prices').insert({
            product_type: 'lpg',
            product_name: fullProductName,
            brand_id: options.brandId,
            size: options.weight,
            variant,
            company_price: options.cylinderType === 'refill' ? companyPrice : 0,
            package_price: options.cylinderType === 'package' ? companyPrice : 0,
            distributor_price: 0,
            retail_price: 0,
            is_active: true
          });
          return { priceChanged: false };
        }
      } else if (type === 'stove') {
        const burnerText = options.burnerType === 'single' ? 'Single' : 'Double';
        const fullProductName = `${productName} - ${burnerText} Burner`;
        
        const { data: existingPrice } = await supabase
          .from('product_prices')
          .select('id, company_price')
          .ilike('product_name', `%${productName}%`)
          .eq('product_type', 'stove')
          .eq('is_active', true)
          .maybeSingle();

        if (existingPrice) {
          const priceChanged = existingPrice.company_price !== companyPrice && existingPrice.company_price > 0;
          await supabase.from('product_prices').update({ 
            company_price: companyPrice, 
            product_name: fullProductName,
            size: `${burnerText} Burner`,
            updated_at: new Date().toISOString() 
          }).eq('id', existingPrice.id);
          return { priceChanged, oldPrice: existingPrice.company_price };
        } else {
          await supabase.from('product_prices').insert({
            product_type: 'stove',
            product_name: fullProductName,
            size: `${burnerText} Burner`,
            company_price: companyPrice,
            distributor_price: 0,
            retail_price: 0,
            package_price: 0,
            is_active: true
          });
          return { priceChanged: false };
        }
      } else if (type === 'regulator') {
        const fullProductName = `${productName} Regulator - ${options.regulatorType}`;
        
        const { data: existingPrice } = await supabase
          .from('product_prices')
          .select('id, company_price')
          .ilike('product_name', `%${productName}%`)
          .eq('size', options.regulatorType)
          .eq('product_type', 'regulator')
          .eq('is_active', true)
          .maybeSingle();

        if (existingPrice) {
          const priceChanged = existingPrice.company_price !== companyPrice && existingPrice.company_price > 0;
          await supabase.from('product_prices').update({ 
            company_price: companyPrice, 
            product_name: fullProductName,
            updated_at: new Date().toISOString() 
          }).eq('id', existingPrice.id);
          return { priceChanged, oldPrice: existingPrice.company_price };
        } else {
          await supabase.from('product_prices').insert({
            product_type: 'regulator',
            product_name: fullProductName,
            size: options.regulatorType,
            company_price: companyPrice,
            distributor_price: 0,
            retail_price: 0,
            package_price: 0,
            is_active: true
          });
          return { priceChanged: false };
        }
      }
      return { priceChanged: false };
    } catch (error) {
      logger.error('Error updating product pricing', error, { component: 'POBDrawer' });
      return { priceChanged: false };
    }
  };

  // Add LPG to cart
  const addLPGToCart = async () => {
    if (!formState.lpgBrandName || lpgTotalQty <= 0 || formState.lpgTotalDO <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    const validation = validateCustomBrand(formState.lpgBrandName);
    if (!validation.valid) {
      toast({ title: validation.error, variant: "destructive" });
      return;
    }

    const brandColor = getLpgBrandColor(formState.lpgBrandName);
    const itemsToAdd: POBCartItem[] = [];
    let priceChangedNotification = false;
    let oldPriceValue = 0;

    for (const valveSize of ['22mm', '20mm'] as const) {
      const qty = valveSize === '22mm' ? formState.lpgQty22mm : formState.lpgQty20mm;
      if (qty <= 0) continue;

      let brandId = "";
      const { data: existingBrand } = await supabase
        .from('lpg_brands')
        .select('*')
        .ilike('name', formState.lpgBrandName)
        .eq('size', valveSize)
        .eq('weight', formState.lpgWeight)
        .eq('is_active', true)
        .maybeSingle();

      if (existingBrand) {
        brandId = existingBrand.id;
      } else {
        const { data: newBrand, error } = await supabase
          .from('lpg_brands')
          .insert({
            name: formState.lpgBrandName,
            size: valveSize,
            weight: formState.lpgWeight,
            color: brandColor,
            refill_cylinder: 0,
            package_cylinder: 0,
            empty_cylinder: 0,
            problem_cylinder: 0
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            const { data: existing } = await supabase
              .from('lpg_brands')
              .select('id')
              .ilike('name', formState.lpgBrandName)
              .eq('size', valveSize)
              .eq('weight', formState.lpgWeight)
              .maybeSingle();
            if (existing) brandId = existing.id;
          } else {
            toast({ title: `Error creating brand for ${valveSize}`, variant: "destructive" });
            continue;
          }
        } else {
          brandId = newBrand.id;
        }
      }

      const { priceChanged, oldPrice } = await updateProductPricing('lpg', formState.lpgBrandName, lpgCompanyPrice, {
        brandId,
        weight: formState.lpgWeight,
        valveSize,
        cylinderType: formState.lpgCylinderType
      });
      if (priceChanged && oldPrice) {
        priceChangedNotification = true;
        oldPriceValue = oldPrice;
      }

      itemsToAdd.push({
        id: `lpg-${valveSize}-${Date.now()}`,
        type: 'lpg',
        name: formState.lpgBrandName,
        details: `${formState.lpgWeight} • ${valveSize} • ${formState.lpgCylinderType === 'refill' ? 'Refill' : 'Package'}`,
        companyPrice: lpgCompanyPrice,
        quantity: qty,
        cylinderType: formState.lpgCylinderType,
        brandId,
        weight: formState.lpgWeight,
        valveSize,
        brandColor
      });
    }

    if (itemsToAdd.length === 0) {
      toast({ title: "No items to add", variant: "destructive" });
      return;
    }

    addItems(itemsToAdd);
    if (priceChangedNotification) {
      toast({ title: "Price Updated!", description: `${formState.lpgBrandName}: ৳${oldPriceValue.toLocaleString()} → ৳${lpgCompanyPrice.toLocaleString()}` });
    } else {
      toast({ title: "Added to cart!", description: `${lpgTotalQty}x ${formState.lpgBrandName}` });
    }
    if (isMobile) setMobileStep('cart');
    resetLPGForm();
  };

  // Add Stove to cart
  const addStoveToCart = async () => {
    if (!formState.stoveBrand || !formState.stoveModel || stoveTotalQty <= 0 || formState.stoveTotalAmount <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const itemsToAdd: POBCartItem[] = [];
    let priceChangedNotification = false;
    let oldPriceValue = 0;

    for (const burnerType of ['single', 'double'] as const) {
      const qty = burnerType === 'single' ? formState.stoveQtySingle : formState.stoveQtyDouble;
      if (qty <= 0) continue;

      const burners = burnerType === 'single' ? 1 : 2;
      let stoveId = "";
      
      const { data: existingStove } = await supabase
        .from('stoves')
        .select('*')
        .ilike('brand', formState.stoveBrand)
        .ilike('model', formState.stoveModel)
        .eq('burners', burners)
        .eq('is_active', true)
        .maybeSingle();

      if (existingStove) {
        stoveId = existingStove.id;
      } else {
        const { data: newStove, error } = await supabase
          .from('stoves')
          .insert({ brand: formState.stoveBrand, model: formState.stoveModel, burners, price: 0, quantity: 0 })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            const { data: existing } = await supabase
              .from('stoves')
              .select('id')
              .ilike('brand', formState.stoveBrand)
              .ilike('model', formState.stoveModel)
              .eq('burners', burners)
              .maybeSingle();
            if (existing) stoveId = existing.id;
          } else {
            toast({ title: `Error creating stove`, variant: "destructive" });
            continue;
          }
        } else {
          stoveId = newStove.id;
        }
      }

      const { priceChanged, oldPrice } = await updateProductPricing('stove', `${formState.stoveBrand} ${formState.stoveModel}`, stoveCompanyPrice, { burnerType });
      if (priceChanged && oldPrice) {
        priceChangedNotification = true;
        oldPriceValue = oldPrice;
      }

      itemsToAdd.push({
        id: `stove-${burnerType}-${Date.now()}`,
        type: 'stove',
        name: `${formState.stoveBrand} ${formState.stoveModel}`,
        details: `${burnerType === 'single' ? 'Single' : 'Double'} Burner`,
        companyPrice: stoveCompanyPrice,
        quantity: qty,
        stoveId,
        burnerType,
        model: formState.stoveModel
      });
    }

    if (itemsToAdd.length === 0) {
      toast({ title: "No items to add", variant: "destructive" });
      return;
    }

    addItems(itemsToAdd);
    if (priceChangedNotification) {
      toast({ title: "Price Updated!", description: `${formState.stoveBrand} ${formState.stoveModel}: ৳${oldPriceValue.toLocaleString()} → ৳${stoveCompanyPrice.toLocaleString()}` });
    } else {
      toast({ title: "Added to cart!", description: `${stoveTotalQty}x ${formState.stoveBrand} ${formState.stoveModel}` });
    }
    if (isMobile) setMobileStep('cart');
    resetStoveForm();
  };

  // Add Regulator to cart
  const addRegulatorToCart = async () => {
    if (!formState.regulatorBrand || regTotalQty <= 0 || formState.regulatorTotalAmount <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const itemsToAdd: POBCartItem[] = [];
    let priceChangedNotification = false;
    let oldPriceValue = 0;

    for (const valveType of ['22mm', '20mm'] as const) {
      const qty = valveType === '22mm' ? formState.regQty22mm : formState.regQty20mm;
      if (qty <= 0) continue;

      let regId = "";
      const { data: existingReg } = await supabase
        .from('regulators')
        .select('*')
        .ilike('brand', formState.regulatorBrand)
        .eq('type', valveType)
        .eq('is_active', true)
        .maybeSingle();

      if (existingReg) {
        regId = existingReg.id;
      } else {
        const { data: newReg, error } = await supabase
          .from('regulators')
          .insert({ brand: formState.regulatorBrand, type: valveType, quantity: 0, price: 0 })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            const { data: existing } = await supabase
              .from('regulators')
              .select('id')
              .ilike('brand', formState.regulatorBrand)
              .eq('type', valveType)
              .maybeSingle();
            if (existing) regId = existing.id;
          } else {
            toast({ title: `Error creating regulator`, variant: "destructive" });
            continue;
          }
        } else {
          regId = newReg.id;
        }
      }

      const { priceChanged, oldPrice } = await updateProductPricing('regulator', formState.regulatorBrand, regulatorCompanyPrice, { regulatorType: valveType });
      if (priceChanged && oldPrice) {
        priceChangedNotification = true;
        oldPriceValue = oldPrice;
      }

      itemsToAdd.push({
        id: `regulator-${valveType}-${Date.now()}`,
        type: 'regulator',
        name: `${formState.regulatorBrand} Regulator`,
        details: `${valveType} Valve`,
        companyPrice: regulatorCompanyPrice,
        quantity: qty,
        regulatorId: regId,
        regulatorType: valveType
      });
    }

    if (itemsToAdd.length === 0) {
      toast({ title: "No items to add", variant: "destructive" });
      return;
    }

    addItems(itemsToAdd);
    if (priceChangedNotification) {
      toast({ title: "Price Updated!", description: `${formState.regulatorBrand}: ৳${oldPriceValue.toLocaleString()} → ৳${regulatorCompanyPrice.toLocaleString()}` });
    } else {
      toast({ title: "Added to cart!", description: `${regTotalQty}x ${formState.regulatorBrand}` });
    }
    if (isMobile) setMobileStep('cart');
    resetRegulatorForm();
  };

  // Complete purchase
  const handleCompletePurchase = async (paymentStatus: 'completed' | 'pending') => {
    if (purchaseItems.length === 0) {
      toast({ title: "No items to purchase", variant: "destructive" });
      return;
    }

    setProcessing(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || null;

      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const { count } = await supabase.from('pob_transactions').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString().slice(0, 10));
      const txnNumber = `POB-${dateStr}-${String((count || 0) + 1).padStart(4, '0')}`;

      const defaultSupplier = purchaseItems[0]?.name || 'Direct Purchase';
      const { data: txnData, error: txnError } = await supabase
        .from('pob_transactions')
        .insert({
          transaction_number: txnNumber,
          supplier_name: supplierName.trim() || defaultSupplier,
          subtotal: subtotal,
          total: subtotal,
          payment_method: 'cash',
          payment_status: paymentStatus,
          created_by: userId
        })
        .select()
        .single();

      if (txnError) throw txnError;

      const items = purchaseItems.map(item => ({
        transaction_id: txnData.id,
        product_type: item.type,
        product_name: item.name,
        brand_id: item.brandId || null,
        quantity: item.quantity,
        unit_price: item.companyPrice,
        total_price: item.companyPrice * item.quantity,
        cylinder_type: item.cylinderType || null,
        weight: item.weight || null,
        size: item.valveSize || item.regulatorType || (item.burnerType ? `${item.burnerType === 'single' ? 'Single' : 'Double'} Burner` : null),
        created_by: userId
      }));

      await supabase.from('pob_transaction_items').insert(items);

      // Update inventory
      for (const item of purchaseItems) {
        if (item.type === 'lpg' && item.brandId) {
          const stockField = item.cylinderType === 'refill' ? 'refill_cylinder' : 'package_cylinder';
          const { data: currentBrand } = await supabase
            .from('lpg_brands')
            .select(`${stockField}, empty_cylinder`)
            .eq('id', item.brandId)
            .single();
          
          if (currentBrand) {
            const currentStock = currentBrand[stockField as keyof typeof currentBrand] as number || 0;
            const currentEmpty = currentBrand.empty_cylinder || 0;
            
            if (pobMode === 'buy' && item.cylinderType === 'refill') {
              await supabase.from('lpg_brands').update({ 
                [stockField]: currentStock + item.quantity,
                empty_cylinder: Math.max(0, currentEmpty - item.quantity),
                updated_at: new Date().toISOString()
              }).eq('id', item.brandId);
            } else {
              await supabase.from('lpg_brands').update({ 
                [stockField]: currentStock + item.quantity,
                updated_at: new Date().toISOString()
              }).eq('id', item.brandId);
            }
          }
        } else if (item.type === 'stove' && item.stoveId) {
          const { data: currentStove } = await supabase.from('stoves').select('quantity').eq('id', item.stoveId).single();
          if (currentStove) {
            await supabase.from('stoves').update({ 
              quantity: (currentStove.quantity || 0) + item.quantity,
              updated_at: new Date().toISOString()
            }).eq('id', item.stoveId);
          }
        } else if (item.type === 'regulator' && item.regulatorId) {
          const { data: currentReg } = await supabase.from('regulators').select('quantity').eq('id', item.regulatorId).single();
          if (currentReg) {
            await supabase.from('regulators').update({ 
              quantity: (currentReg.quantity || 0) + item.quantity
            }).eq('id', item.regulatorId);
          }
        }
      }

      // Create expense entry for Business Diary sync
      const expenseCategory = purchaseItems.some(i => i.type === 'lpg') ? 'LPG Purchase' : 'Inventory Purchase';
      const itemNames = purchaseItems.map(i => `${i.quantity}x ${i.name}`).join(', ');
      const finalSupplier = supplierName.trim() || defaultSupplier;
      
      await supabase.from('daily_expenses').insert({
        category: expenseCategory,
        amount: subtotal,
        description: `${txnNumber}: ${finalSupplier} - ${itemNames}`,
        expense_date: today.toISOString().slice(0, 10),
        created_by: userId
      });

      toast({
        title: paymentStatus === 'completed' ? "Purchase Completed!" : "Purchase Saved as Credit",
        description: `${txnNumber} • ${BANGLADESHI_CURRENCY_SYMBOL}${subtotal.toLocaleString()}`
      });

      resetAllForms();
      onPurchaseComplete();
      onOpenChange(false);

    } catch (error: any) {
      logger.error('Purchase error', error, { component: 'POBDrawer' });
      toast({ title: "Error completing purchase", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // Quick add to stock (Add mode)
  const quickAddToStock = async () => {
    setProcessing(true);
    try {
      if (productType === 'lpg') {
        if (!formState.lpgBrandName || lpgTotalQty <= 0) {
          toast({ title: "Please select brand and enter quantity", variant: "destructive" });
          setProcessing(false);
          return;
        }
        const validation = validateCustomBrand(formState.lpgBrandName);
        if (!validation.valid) {
          toast({ title: validation.error, variant: "destructive" });
          setProcessing(false);
          return;
        }

        for (const valveSize of ['22mm', '20mm'] as const) {
          const qty = valveSize === '22mm' ? formState.lpgQty22mm : formState.lpgQty20mm;
          if (qty <= 0) continue;

          const { data: existingBrand } = await supabase
            .from('lpg_brands')
            .select('id, refill_cylinder, package_cylinder')
            .ilike('name', formState.lpgBrandName)
            .eq('size', valveSize)
            .eq('weight', formState.lpgWeight)
            .eq('is_active', true)
            .maybeSingle();

          if (existingBrand) {
            const stockField = formState.lpgCylinderType === 'refill' ? 'refill_cylinder' : 'package_cylinder';
            const currentStock = existingBrand[stockField as keyof typeof existingBrand] as number || 0;
            await supabase.from('lpg_brands').update({ 
              [stockField]: currentStock + qty,
              updated_at: new Date().toISOString()
            }).eq('id', existingBrand.id);
          } else {
            const brandColor = getLpgBrandColor(formState.lpgBrandName);
            await supabase.from('lpg_brands').insert({
              name: formState.lpgBrandName,
              size: valveSize,
              weight: formState.lpgWeight,
              color: brandColor,
              refill_cylinder: formState.lpgCylinderType === 'refill' ? qty : 0,
              package_cylinder: formState.lpgCylinderType === 'package' ? qty : 0,
              empty_cylinder: 0,
              problem_cylinder: 0
            });
          }
        }
        toast({ title: "Stock Added!", description: `${lpgTotalQty} ${formState.lpgBrandName} cylinders added` });
      } else if (productType === 'stove') {
        if (!formState.stoveBrand || !formState.stoveModel || stoveTotalQty <= 0) {
          toast({ title: "Please fill brand, model and quantity", variant: "destructive" });
          setProcessing(false);
          return;
        }

        for (const burnerType of ['single', 'double'] as const) {
          const qty = burnerType === 'single' ? formState.stoveQtySingle : formState.stoveQtyDouble;
          if (qty <= 0) continue;
          const burners = burnerType === 'single' ? 1 : 2;
          
          const { data: existingStove } = await supabase
            .from('stoves')
            .select('id, quantity')
            .ilike('brand', formState.stoveBrand)
            .ilike('model', formState.stoveModel)
            .eq('burners', burners)
            .eq('is_active', true)
            .maybeSingle();

          if (existingStove) {
            await supabase.from('stoves').update({ 
              quantity: (existingStove.quantity || 0) + qty,
              updated_at: new Date().toISOString()
            }).eq('id', existingStove.id);
          } else {
            await supabase.from('stoves').insert({ brand: formState.stoveBrand, model: formState.stoveModel, burners, quantity: qty, price: 0 });
          }
        }
        toast({ title: "Stock Added!", description: `${stoveTotalQty} ${formState.stoveBrand} stoves added` });
      } else if (productType === 'regulator') {
        if (!formState.regulatorBrand || regTotalQty <= 0) {
          toast({ title: "Please select brand and enter quantity", variant: "destructive" });
          setProcessing(false);
          return;
        }

        for (const valveType of ['22mm', '20mm'] as const) {
          const qty = valveType === '22mm' ? formState.regQty22mm : formState.regQty20mm;
          if (qty <= 0) continue;

          const { data: existingReg } = await supabase
            .from('regulators')
            .select('id, quantity')
            .ilike('brand', formState.regulatorBrand)
            .eq('type', valveType)
            .eq('is_active', true)
            .maybeSingle();

          if (existingReg) {
            await supabase.from('regulators').update({ quantity: (existingReg.quantity || 0) + qty }).eq('id', existingReg.id);
          } else {
            await supabase.from('regulators').insert({ brand: formState.regulatorBrand, type: valveType, quantity: qty });
          }
        }
        toast({ title: "Stock Added!", description: `${regTotalQty} ${formState.regulatorBrand} regulators added` });
      }

      resetAllForms();
      onPurchaseComplete();
      onOpenChange(false);
    } catch (error: any) {
      logger.error('Quick add error', error, { component: 'POBDrawer' });
      toast({ title: "Error adding stock", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // Render product form based on type
  const renderProductForm = () => {
    const isBuyMode = pobMode === 'buy';

    if (productType === 'lpg') {
      return (
        <div className="space-y-3">
          {/* Cylinder Type + Weight */}
          <div className="flex items-center gap-2">
            <div className="flex bg-muted/60 rounded-full p-1 border border-border/50 flex-1">
              <button
                type="button"
                onClick={() => updateFormField('lpgCylinderType', 'refill')}
                className={cn(
                  "flex-1 h-10 px-2 rounded-full font-semibold text-xs transition-all",
                  formState.lpgCylinderType === 'refill' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Refill
              </button>
              <button
                type="button"
                onClick={() => updateFormField('lpgCylinderType', 'package')}
                className={cn(
                  "flex-1 h-10 px-2 rounded-full font-semibold text-xs transition-all",
                  formState.lpgCylinderType === 'package' 
                    ? 'bg-secondary text-secondary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Package
              </button>
            </div>
            <Select value={formState.lpgWeight} onValueChange={(v) => updateFormField('lpgWeight', v)}>
              <SelectTrigger className="h-10 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[...new Set([...WEIGHT_OPTIONS_22MM, ...WEIGHT_OPTIONS_20MM])].sort((a, b) => parseFloat(a) - parseFloat(b)).map(w => (
                  <SelectItem key={w} value={w}>{w}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Brand Name</Label>
            <BrandSelect
              type="lpg"
              value={formState.lpgBrandName}
              onChange={(v) => updateFormField('lpgBrandName', v)}
              allowCustom={true}
              className="h-12"
            />
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b">
              <CircleDashed className="h-4 w-4 text-primary" />
              <Label className="text-sm font-bold">Quantity (By Valve Size)</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ValveSizeQuantityCard 
                value={formState.lpgQty22mm} 
                onChange={(v) => updateFormField('lpgQty22mm', v)} 
                valveSize="22mm" 
                stockLabel={`${valveSizeStats["22mm"].refill}R + ${valveSizeStats["22mm"].package}P`} 
              />
              <ValveSizeQuantityCard 
                value={formState.lpgQty20mm} 
                onChange={(v) => updateFormField('lpgQty20mm', v)} 
                valveSize="20mm" 
                stockLabel={`${valveSizeStats["20mm"].refill}R + ${valveSizeStats["20mm"].package}P`} 
              />
            </div>
            <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground bg-muted/50 rounded-md py-1.5 px-2">
              <Info className="h-3 w-3" />
              <span><strong>R</strong> = Refill</span>
              <span><strong>P</strong> = Package</span>
            </div>
            {lpgTotalQty > 0 && (
              <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg border border-primary/20">
                <span className="font-medium text-sm">Total: {lpgTotalQty} cylinders</span>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-[10px]">22mm: {formState.lpgQty22mm}</Badge>
                  <Badge variant="outline" className="text-[10px]">20mm: {formState.lpgQty20mm}</Badge>
                </div>
              </div>
            )}
          </div>

          {/* D.O. Amount - Buy Mode Only */}
          {isBuyMode && (
            <>
              <Separator />
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Total D.O. Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                <Input 
                  type="number" 
                  inputMode="numeric" 
                  placeholder="Enter total amount..." 
                  value={formState.lpgTotalDO || ""} 
                  onChange={(e) => updateFormField('lpgTotalDO', parseInt(e.target.value) || 0)} 
                  className="h-12 text-lg font-semibold" 
                />
              </div>
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl border border-primary/20">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Unit Price</span>
                </div>
                <span className="text-xl font-extrabold text-primary tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{lpgCompanyPrice.toLocaleString()}</span>
              </div>
              <Button 
                type="button" 
                size="lg" 
                className="w-full h-12 font-semibold" 
                onClick={addLPGToCart} 
                disabled={!formState.lpgBrandName || lpgTotalQty <= 0 || formState.lpgTotalDO <= 0}
              >
                <Plus className="h-5 w-5 mr-2" />Add to Cart
              </Button>
            </>
          )}
        </div>
      );
    }

    if (productType === 'stove') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Brand Name</Label>
            <BrandSelect type="stove" value={formState.stoveBrand} onChange={(v) => updateFormField('stoveBrand', v)} allowCustom={true} className="h-12" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Model Number</Label>
            <Input placeholder="e.g., GS-102, RFL-200..." value={formState.stoveModel} onChange={(e) => updateFormField('stoveModel', e.target.value)} className="h-12" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b">
              <Flame className="h-5 w-5 text-amber-500" />
              <Label className="text-base font-bold">Quantity (By Burner Type)</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <BurnerTypeQuantityCard value={formState.stoveQtySingle} onChange={(v) => updateFormField('stoveQtySingle', v)} burnerType="single" stockLabel={`${stoveBurnerStats.single} pcs`} />
              <BurnerTypeQuantityCard value={formState.stoveQtyDouble} onChange={(v) => updateFormField('stoveQtyDouble', v)} burnerType="double" stockLabel={`${stoveBurnerStats.double} pcs`} />
            </div>
          </div>
          {isBuyMode && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Total D.O. Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                <Input type="number" inputMode="numeric" placeholder="Enter total amount..." value={formState.stoveTotalAmount || ""} onChange={(e) => updateFormField('stoveTotalAmount', parseInt(e.target.value) || 0)} className="h-14 text-lg font-semibold" />
              </div>
              <div className="flex items-center justify-between p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-amber-500" /><span className="font-medium">Unit Price</span></div>
                <span className="text-2xl font-extrabold text-amber-500 tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{stoveCompanyPrice.toLocaleString()}</span>
              </div>
              <Button type="button" size="lg" className="w-full h-14 font-semibold bg-gradient-to-r from-amber-500 to-orange-500 text-white" onClick={addStoveToCart} disabled={!formState.stoveBrand || !formState.stoveModel || stoveTotalQty <= 0 || formState.stoveTotalAmount <= 0}>
                <Plus className="h-5 w-5 mr-2" />Add to Cart
              </Button>
            </>
          )}
        </div>
      );
    }

    if (productType === 'regulator') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Brand Name</Label>
            <BrandSelect type="regulator" value={formState.regulatorBrand} onChange={(v) => updateFormField('regulatorBrand', v)} allowCustom={true} className="h-12" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b">
              <Gauge className="h-5 w-5 text-blue-500" />
              <Label className="text-base font-bold">Quantity (By Valve Type)</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ValveSizeQuantityCard value={formState.regQty22mm} onChange={(v) => updateFormField('regQty22mm', v)} valveSize="22mm" stockLabel={`${regulatorValveStats["22mm"]} pcs`} />
              <ValveSizeQuantityCard value={formState.regQty20mm} onChange={(v) => updateFormField('regQty20mm', v)} valveSize="20mm" stockLabel={`${regulatorValveStats["20mm"]} pcs`} />
            </div>
          </div>
          {isBuyMode && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-medium">Total D.O. Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                <Input type="number" inputMode="numeric" placeholder="Enter total amount..." value={formState.regulatorTotalAmount || ""} onChange={(e) => updateFormField('regulatorTotalAmount', parseInt(e.target.value) || 0)} className="h-14 text-lg font-semibold" />
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <div className="flex items-center gap-2"><Calculator className="h-5 w-5 text-blue-500" /><span className="font-medium">Unit Price</span></div>
                <span className="text-2xl font-extrabold text-blue-500 tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{regulatorCompanyPrice.toLocaleString()}</span>
              </div>
              <Button type="button" size="lg" className="w-full h-14 font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white" onClick={addRegulatorToCart} disabled={!formState.regulatorBrand || regTotalQty <= 0 || formState.regulatorTotalAmount <= 0}>
                <Plus className="h-5 w-5 mr-2" />Add to Cart
              </Button>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  // Helper functions
  const getIcon = () => {
    if (productType === 'lpg') return <Cylinder className="h-5 w-5" />;
    if (productType === 'stove') return <ChefHat className="h-5 w-5" />;
    return <Gauge className="h-5 w-5" />;
  };

  const getTitle = () => {
    if (productType === 'lpg') return 'LPG Cylinder';
    if (productType === 'stove') return 'Gas Stove';
    return 'Regulator';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side={isMobile ? "bottom" : "right"} 
        className={cn(
          isMobile 
            ? "h-[95vh] rounded-t-2xl flex flex-col overflow-hidden p-0" 
            : "w-full sm:max-w-xl flex flex-col p-0",
          "pb-[env(safe-area-inset-bottom)]"
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b bg-background">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center",
                productType === 'lpg' ? 'bg-primary/10 text-primary' :
                productType === 'stove' ? 'bg-orange-500/10 text-orange-500' :
                'bg-violet-500/10 text-violet-500'
              )}>
                {getIcon()}
              </div>
              <div>
                <h2 className="font-bold text-base leading-tight">{getTitle()}</h2>
                <p className="text-[11px] text-muted-foreground">Buy from company or add existing stock</p>
              </div>
            </div>
            {purchaseItemsCount > 0 && pobMode === 'buy' && (
              <Badge className="bg-primary text-primary-foreground">{purchaseItemsCount}</Badge>
            )}
          </div>
          
          {/* Mode Toggle */}
          <div className="flex bg-muted/50 rounded-lg p-1 mt-3">
            <Button type="button" variant={pobMode === 'buy' ? 'default' : 'ghost'} size="sm" className="flex-1 h-10 text-xs font-medium gap-1.5" onClick={() => setPobMode('buy')}>
              <ShoppingCart className="h-3.5 w-3.5" />Buy from Company
            </Button>
            <Button type="button" variant={pobMode === 'add' ? 'secondary' : 'ghost'} size="sm" className="flex-1 h-10 text-xs font-medium gap-1.5" onClick={() => setPobMode('add')}>
              <Plus className="h-3.5 w-3.5" />Add Existing Stock
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 flex-shrink-0">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : pobMode === 'add' ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 pb-8 space-y-4">
              {renderProductForm()}
              <Button 
                type="button" 
                size="lg" 
                className="w-full h-14 font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-500/90 hover:to-emerald-600/90" 
                onClick={quickAddToStock}
                disabled={processing || (productType === 'lpg' && (!formState.lpgBrandName || lpgTotalQty <= 0)) || 
                  (productType === 'stove' && (!formState.stoveBrand || !formState.stoveModel || stoveTotalQty <= 0)) ||
                  (productType === 'regulator' && (!formState.regulatorBrand || regTotalQty <= 0))}
              >
                {processing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
                Add to Inventory
              </Button>
            </div>
          </ScrollArea>
        ) : (
          <>
            {/* Mobile Step Navigation */}
            {isMobile && (
              <div className="flex items-center bg-muted/30 p-1 mx-3 mt-2 rounded-lg flex-shrink-0">
                <Button type="button" variant={mobileStep === 'product' ? 'default' : 'ghost'} size="sm" className="flex-1 h-10 text-xs font-medium" onClick={() => setMobileStep('product')}>
                  1. Product
                </Button>
                <Button type="button" variant={mobileStep === 'cart' ? 'default' : 'ghost'} size="sm" className="flex-1 h-10 relative text-xs font-medium" onClick={() => setMobileStep('cart')}>
                  2. Cart & Pay
                  {purchaseItemsCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[9px]">{purchaseItemsCount}</Badge>
                  )}
                </Button>
              </div>
            )}

            {isMobile ? (
              <ScrollArea className="flex-1 min-h-0">
                <div className="px-4 pb-8 pt-3">
                  {mobileStep === 'product' && <div className="space-y-4">{renderProductForm()}</div>}
                  {mobileStep === 'cart' && (
                    <POBCartView
                      items={purchaseItems}
                      onRemoveItem={removeItem}
                      subtotal={subtotal}
                      totalQty={purchaseItemsCount}
                      supplierName={supplierName}
                      onSupplierChange={setSupplierName}
                      showSupplierInput={showSupplierInput}
                      onShowSupplierInputChange={setShowSupplierInput}
                      onCompletePurchase={handleCompletePurchase}
                      processing={processing}
                    />
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {renderProductForm()}
                    <Separator className="my-4" />
                    <POBCartView
                      items={purchaseItems}
                      onRemoveItem={removeItem}
                      subtotal={subtotal}
                      totalQty={purchaseItemsCount}
                      supplierName={supplierName}
                      onSupplierChange={setSupplierName}
                      showSupplierInput={showSupplierInput}
                      onShowSupplierInputChange={setShowSupplierInput}
                      onCompletePurchase={handleCompletePurchase}
                      processing={processing}
                    />
                  </div>
                </ScrollArea>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
