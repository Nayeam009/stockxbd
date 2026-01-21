import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingBag, 
  ShoppingCart,
  Loader2,
  Cylinder,
  CheckCircle2,
  Building2,
  Undo2,
  Calculator,
  Sparkles,
  Save,
  CircleDot,
  CircleDashed,
  Flame,
  ChefHat,
  Gauge
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { LPG_BRANDS, STOVE_BRANDS, REGULATOR_BRANDS, getLpgBrandColor } from "@/lib/brandConstants";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

// Interfaces
interface LPGBrand {
  id: string;
  name: string;
  size: string;
  weight: string;
  refill_cylinder: number;
  package_cylinder: number;
  empty_cylinder: number;
  problem_cylinder: number;
  color: string;
}

interface Stove {
  id: string;
  brand: string;
  model: string;
  burners: number;
  price: number;
  quantity: number;
}

interface Regulator {
  id: string;
  brand: string;
  type: string;
  quantity: number;
  price?: number;
}

interface PurchaseItem {
  id: string;
  type: 'lpg' | 'stove' | 'regulator';
  name: string;
  details: string;
  companyPrice: number;
  quantity: number;
  cylinderType?: 'refill' | 'package';
  brandId?: string;
  stoveId?: string;
  regulatorId?: string;
  weight?: string;
  valveSize?: string;
  brandColor?: string;
  burnerType?: 'single' | 'double';
  model?: string;
  regulatorType?: string;
}

// RecentPurchase interface removed - void system disabled

interface InventoryPOBDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productType: 'lpg' | 'stove' | 'regulator';
  onPurchaseComplete: () => void;
}

// Weight options
const WEIGHT_OPTIONS_22MM = ["5.5kg", "12kg", "12.5kg", "25kg", "35kg", "45kg"];
const WEIGHT_OPTIONS_20MM = ["5kg", "10kg", "12kg", "15kg", "21kg", "35kg"];

// Common supplier names
const SUPPLIERS = [
  "Bashundhara LP Gas Ltd.",
  "Omera Petroleum Ltd.",
  "Jamuna Oil Company",
  "TotalEnergies Bangladesh",
  "Petromax LPG Ltd.",
  "Laugfs Gas Bangladesh",
  "Beximco LPG",
  "INDEX LPG",
  "BM Energy",
  "Fresh LPG",
  "Navana LPG"
];

export const InventoryPOBDrawer = ({ 
  open, 
  onOpenChange, 
  productType, 
  onPurchaseComplete 
}: InventoryPOBDrawerProps) => {
  const isMobile = useIsMobile();
  
  // Data state
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  
  // Mobile step and POB mode
  const [mobileStep, setMobileStep] = useState<'product' | 'cart' | 'checkout'>('product');
  const [pobMode, setPobMode] = useState<'buy' | 'add'>('buy');
  
  // LPG Config
  const [lpgBrandName, setLpgBrandName] = useState("");
  const [lpgCylinderType, setLpgCylinderType] = useState<'refill' | 'package'>("refill");
  const [lpgWeight, setLpgWeight] = useState("12kg");
  const [lpgQty22mm, setLpgQty22mm] = useState(0);
  const [lpgQty20mm, setLpgQty20mm] = useState(0);
  const [lpgTotalDO, setLpgTotalDO] = useState(0);
  
  // Stove Config
  const [stoveBrand, setStoveBrand] = useState("");
  const [stoveModel, setStoveModel] = useState("");
  const [stoveQtySingle, setStoveQtySingle] = useState(0);
  const [stoveQtyDouble, setStoveQtyDouble] = useState(0);
  const [stoveTotalAmount, setStoveTotalAmount] = useState(0);
  
  // Regulator Config
  const [regulatorBrand, setRegulatorBrand] = useState("");
  const [regQty22mm, setRegQty22mm] = useState(0);
  const [regQty20mm, setRegQty20mm] = useState(0);
  const [regulatorTotalAmount, setRegulatorTotalAmount] = useState(0);
  
  // Cart
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  
  // Supplier
  const [supplierName, setSupplierName] = useState("Bashundhara LP Gas Ltd.");
  
  // Void system removed - purchases are permanent

  // Computed totals
  const lpgTotalQty = lpgQty22mm + lpgQty20mm;
  const stoveTotalQty = stoveQtySingle + stoveQtyDouble;
  const regTotalQty = regQty22mm + regQty20mm;

  // Fetch data
  const fetchData = useCallback(async () => {
    const [brandsRes, stovesRes, regulatorsRes] = await Promise.all([
      supabase.from('lpg_brands').select('*').eq('is_active', true),
      supabase.from('stoves').select('*').eq('is_active', true),
      supabase.from('regulators').select('*').eq('is_active', true)
    ]);

    if (brandsRes.data) setLpgBrands(brandsRes.data);
    if (stovesRes.data) setStoves(stovesRes.data);
    if (regulatorsRes.data) setRegulators(regulatorsRes.data);

    // Void system removed - no recent transactions tracking needed
  }, []);

  useEffect(() => {
    if (open) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
      setMobileStep('product');
    }
  }, [open, fetchData]);

  // Stock stats
  const valveSizeStats = useMemo(() => {
    const stats22mm = lpgBrands
      .filter(b => b.size === "22mm")
      .reduce((acc, b) => ({
        refill: acc.refill + b.refill_cylinder,
        package: acc.package + b.package_cylinder,
        total: acc.total + b.refill_cylinder + b.package_cylinder
      }), { refill: 0, package: 0, total: 0 });

    const stats20mm = lpgBrands
      .filter(b => b.size === "20mm")
      .reduce((acc, b) => ({
        refill: acc.refill + b.refill_cylinder,
        package: acc.package + b.package_cylinder,
        total: acc.total + b.refill_cylinder + b.package_cylinder
      }), { refill: 0, package: 0, total: 0 });

    return { "22mm": stats22mm, "20mm": stats20mm };
  }, [lpgBrands]);

  const regulatorValveStats = useMemo(() => {
    const stats22mm = regulators.filter(r => r.type === "22mm").reduce((sum, r) => sum + r.quantity, 0);
    const stats20mm = regulators.filter(r => r.type === "20mm").reduce((sum, r) => sum + r.quantity, 0);
    return { "22mm": stats22mm, "20mm": stats20mm };
  }, [regulators]);

  const stoveBurnerStats = useMemo(() => {
    const singleBurner = stoves.filter(s => s.burners === 1).reduce((sum, s) => sum + s.quantity, 0);
    const doubleBurner = stoves.filter(s => s.burners === 2).reduce((sum, s) => sum + s.quantity, 0);
    return { single: singleBurner, double: doubleBurner };
  }, [stoves]);

  // Calculated prices
  const lpgCompanyPrice = useMemo(() => {
    if (lpgTotalQty <= 0 || lpgTotalDO <= 0) return 0;
    return Math.round(lpgTotalDO / lpgTotalQty);
  }, [lpgTotalQty, lpgTotalDO]);

  const stoveCompanyPrice = useMemo(() => {
    if (stoveTotalQty <= 0 || stoveTotalAmount <= 0) return 0;
    return Math.round(stoveTotalAmount / stoveTotalQty);
  }, [stoveTotalQty, stoveTotalAmount]);

  const regulatorCompanyPrice = useMemo(() => {
    if (regTotalQty <= 0 || regulatorTotalAmount <= 0) return 0;
    return Math.round(regulatorTotalAmount / regTotalQty);
  }, [regTotalQty, regulatorTotalAmount]);

  // Cart calculations
  const subtotal = purchaseItems.reduce((sum, item) => sum + item.companyPrice * item.quantity, 0);
  const total = subtotal;
  const purchaseItemsCount = purchaseItems.reduce((s, i) => s + i.quantity, 0);

  // Brand options
  const lpgBrandOptions = useMemo(() => {
    const allBrands = new Set<string>();
    LPG_BRANDS.forEach(b => allBrands.add(b.name));
    return Array.from(allBrands);
  }, []);

  // Update product pricing
  const updateProductPricing = async (
    type: 'lpg' | 'stove' | 'regulator',
    productName: string,
    companyPrice: number,
    options: {
      brandId?: string;
      weight?: string;
      valveSize?: string;
      cylinderType?: 'refill' | 'package';
      burnerType?: string;
      regulatorType?: string;
    }
  ) => {
    try {
      if (type === 'lpg' && options.brandId) {
        const variant = options.cylinderType === 'refill' ? 'Refill' : 'Package';
        const fullProductName = `${productName} LP Gas ${options.weight} Cylinder (${options.valveSize}) ${variant}`;

        const { data: existingPrice } = await supabase
          .from('product_prices')
          .select('id')
          .eq('brand_id', options.brandId)
          .eq('variant', variant)
          .eq('product_type', 'lpg')
          .eq('is_active', true)
          .maybeSingle();

        if (existingPrice) {
          const updateData: Record<string, unknown> = { 
            updated_at: new Date().toISOString(),
            product_name: fullProductName
          };
          
          if (options.cylinderType === 'package') {
            updateData.package_price = companyPrice;
          } else {
            updateData.company_price = companyPrice;
          }
          
          await supabase
            .from('product_prices')
            .update(updateData)
            .eq('id', existingPrice.id);
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
        }
      } else if (type === 'stove') {
        const burnerText = options.burnerType === 'single' ? 'Single' : 'Double';
        const fullProductName = `${productName} - ${burnerText} Burner`;
        
        const { data: existingPrice } = await supabase
          .from('product_prices')
          .select('id')
          .ilike('product_name', `%${productName}%`)
          .eq('product_type', 'stove')
          .eq('is_active', true)
          .maybeSingle();

        if (existingPrice) {
          await supabase
            .from('product_prices')
            .update({ 
              company_price: companyPrice, 
              product_name: fullProductName,
              size: `${burnerText} Burner`,
              updated_at: new Date().toISOString() 
            })
            .eq('id', existingPrice.id);
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
        }
      } else if (type === 'regulator') {
        const fullProductName = `${productName} Regulator - ${options.regulatorType}`;
        
        const { data: existingPrice } = await supabase
          .from('product_prices')
          .select('id')
          .ilike('product_name', `%${productName}%`)
          .eq('size', options.regulatorType)
          .eq('product_type', 'regulator')
          .eq('is_active', true)
          .maybeSingle();

        if (existingPrice) {
          await supabase
            .from('product_prices')
            .update({ 
              company_price: companyPrice, 
              product_name: fullProductName,
              updated_at: new Date().toISOString() 
            })
            .eq('id', existingPrice.id);
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
        }
      }
    } catch (error) {
      console.error('Error updating product pricing:', error);
    }
  };

  // Add LPG to cart
  const addLPGToCart = async () => {
    if (!lpgBrandName || lpgTotalQty <= 0 || lpgTotalDO <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const companyPrice = lpgCompanyPrice;
    const brandColor = getLpgBrandColor(lpgBrandName);
    const itemsToAdd: PurchaseItem[] = [];

    for (const valveSize of ['22mm', '20mm'] as const) {
      const qty = valveSize === '22mm' ? lpgQty22mm : lpgQty20mm;
      if (qty <= 0) continue;

      let brandId = "";
      const existingBrand = lpgBrands.find(b => 
        b.name.toLowerCase() === lpgBrandName.toLowerCase() && 
        b.size === valveSize && 
        b.weight === lpgWeight
      );

      if (existingBrand) {
        brandId = existingBrand.id;
      } else {
        const { data: newBrand, error } = await supabase
          .from('lpg_brands')
          .insert({
            name: lpgBrandName,
            size: valveSize,
            weight: lpgWeight,
            color: brandColor,
            refill_cylinder: 0,
            package_cylinder: 0,
            empty_cylinder: 0,
            problem_cylinder: 0
          })
          .select()
          .single();

        if (error) {
          toast({ title: `Error creating brand for ${valveSize}`, variant: "destructive" });
          continue;
        }
        brandId = newBrand.id;
      }

      await updateProductPricing('lpg', lpgBrandName, companyPrice, {
        brandId,
        weight: lpgWeight,
        valveSize,
        cylinderType: lpgCylinderType
      });

      itemsToAdd.push({
        id: `lpg-${valveSize}-${Date.now()}`,
        type: 'lpg',
        name: lpgBrandName,
        details: `${lpgWeight} • ${valveSize} • ${lpgCylinderType === 'refill' ? 'Refill' : 'Package'}`,
        companyPrice,
        quantity: qty,
        cylinderType: lpgCylinderType,
        brandId,
        weight: lpgWeight,
        valveSize,
        brandColor
      });
    }

    if (itemsToAdd.length === 0) {
      toast({ title: "No items to add", variant: "destructive" });
      return;
    }

    setPurchaseItems([...purchaseItems, ...itemsToAdd]);
    toast({ title: "Added to cart!", description: `${lpgTotalQty}x ${lpgBrandName}` });
    if (isMobile) setMobileStep('cart');
    resetLPGForm();
  };

  // Add Stove to cart
  const addStoveToCart = async () => {
    if (!stoveBrand || !stoveModel || stoveTotalQty <= 0 || stoveTotalAmount <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const companyPrice = stoveCompanyPrice;
    const itemsToAdd: PurchaseItem[] = [];

    for (const burnerType of ['single', 'double'] as const) {
      const qty = burnerType === 'single' ? stoveQtySingle : stoveQtyDouble;
      if (qty <= 0) continue;

      const burners = burnerType === 'single' ? 1 : 2;
      let stoveId = "";
      
      const existingStove = stoves.find(s => 
        s.brand.toLowerCase() === stoveBrand.toLowerCase() && 
        s.model.toLowerCase() === stoveModel.toLowerCase() &&
        s.burners === burners
      );

      if (existingStove) {
        stoveId = existingStove.id;
      } else {
        const { data: newStove, error } = await supabase
          .from('stoves')
          .insert({
            brand: stoveBrand,
            model: stoveModel,
            burners,
            price: 0,
            quantity: 0
          })
          .select()
          .single();

        if (error) {
          toast({ title: `Error creating stove`, variant: "destructive" });
          continue;
        }
        stoveId = newStove.id;
      }

      await updateProductPricing('stove', `${stoveBrand} ${stoveModel}`, companyPrice, { burnerType });

      itemsToAdd.push({
        id: `stove-${burnerType}-${Date.now()}`,
        type: 'stove',
        name: `${stoveBrand} ${stoveModel}`,
        details: `${burnerType === 'single' ? 'Single' : 'Double'} Burner`,
        companyPrice,
        quantity: qty,
        stoveId,
        burnerType,
        model: stoveModel
      });
    }

    if (itemsToAdd.length === 0) {
      toast({ title: "No items to add", variant: "destructive" });
      return;
    }

    setPurchaseItems([...purchaseItems, ...itemsToAdd]);
    toast({ title: "Added to cart!", description: `${stoveTotalQty}x ${stoveBrand} ${stoveModel}` });
    if (isMobile) setMobileStep('cart');
    resetStoveForm();
  };

  // Add Regulator to cart
  const addRegulatorToCart = async () => {
    if (!regulatorBrand || regTotalQty <= 0 || regulatorTotalAmount <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const companyPrice = regulatorCompanyPrice;
    const itemsToAdd: PurchaseItem[] = [];

    for (const valveType of ['22mm', '20mm'] as const) {
      const qty = valveType === '22mm' ? regQty22mm : regQty20mm;
      if (qty <= 0) continue;

      let regId = "";
      const existingReg = regulators.find(r => 
        r.brand.toLowerCase() === regulatorBrand.toLowerCase() && 
        r.type === valveType
      );

      if (existingReg) {
        regId = existingReg.id;
      } else {
        const { data: newReg, error } = await supabase
          .from('regulators')
          .insert({
            brand: regulatorBrand,
            type: valveType,
            quantity: 0,
            price: 0
          })
          .select()
          .single();

        if (error) {
          toast({ title: `Error creating regulator`, variant: "destructive" });
          continue;
        }
        regId = newReg.id;
      }

      await updateProductPricing('regulator', regulatorBrand, companyPrice, { regulatorType: valveType });

      itemsToAdd.push({
        id: `regulator-${valveType}-${Date.now()}`,
        type: 'regulator',
        name: `${regulatorBrand} Regulator`,
        details: `${valveType} Valve`,
        companyPrice,
        quantity: qty,
        regulatorId: regId,
        regulatorType: valveType
      });
    }

    if (itemsToAdd.length === 0) {
      toast({ title: "No items to add", variant: "destructive" });
      return;
    }

    setPurchaseItems([...purchaseItems, ...itemsToAdd]);
    toast({ title: "Added to cart!", description: `${regTotalQty}x ${regulatorBrand}` });
    if (isMobile) setMobileStep('cart');
    resetRegulatorForm();
  };

  // Reset forms
  const resetLPGForm = () => {
    setLpgBrandName("");
    setLpgCylinderType("refill");
    setLpgWeight("12kg");
    setLpgQty22mm(0);
    setLpgQty20mm(0);
    setLpgTotalDO(0);
  };

  const resetStoveForm = () => {
    setStoveBrand("");
    setStoveModel("");
    setStoveQtySingle(0);
    setStoveQtyDouble(0);
    setStoveTotalAmount(0);
  };

  const resetRegulatorForm = () => {
    setRegulatorBrand("");
    setRegQty22mm(0);
    setRegQty20mm(0);
    setRegulatorTotalAmount(0);
  };

  // Cart actions
  const removeItem = (id: string) => {
    setPurchaseItems(purchaseItems.filter(i => i.id !== id));
  };

  const clearCart = () => {
    setPurchaseItems([]);
    toast({ title: "Cart cleared" });
  };

  // Complete purchase
  const handleCompletePurchase = async (paymentStatus: 'completed' | 'pending') => {
    if (purchaseItems.length === 0) {
      toast({ title: "No items to purchase", variant: "destructive" });
      return;
    }

    setProcessing(true);

    try {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const { count } = await supabase
        .from('pob_transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString().slice(0, 10));
      const txnNumber = `POB-${dateStr}-${String((count || 0) + 1).padStart(4, '0')}`;

      const { data: txnData, error: txnError } = await supabase
        .from('pob_transactions')
        .insert({
          transaction_number: txnNumber,
          supplier_name: supplierName,
          subtotal: subtotal,
          total: total,
          payment_method: 'cash',
          payment_status: paymentStatus
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
        size: item.valveSize || item.regulatorType || (item.burnerType ? `${item.burnerType === 'single' ? 'Single' : 'Double'} Burner` : null)
      }));

      await supabase.from('pob_transaction_items').insert(items);

      // Update inventory - INCREASE stock
      for (const item of purchaseItems) {
        if (item.type === 'lpg' && item.brandId) {
          const stockField = item.cylinderType === 'refill' ? 'refill_cylinder' : 'package_cylinder';
          const brand = lpgBrands.find(b => b.id === item.brandId);
          if (brand) {
            const currentStock = brand[stockField as keyof LPGBrand] as number;
            await supabase
              .from('lpg_brands')
              .update({ [stockField]: currentStock + item.quantity })
              .eq('id', item.brandId);
          }
        } else if (item.type === 'stove' && item.stoveId) {
          const stove = stoves.find(s => s.id === item.stoveId);
          if (stove) {
            await supabase
              .from('stoves')
              .update({ quantity: stove.quantity + item.quantity })
              .eq('id', item.stoveId);
          }
        } else if (item.type === 'regulator' && item.regulatorId) {
          const reg = regulators.find(r => r.id === item.regulatorId);
          if (reg) {
            await supabase
              .from('regulators')
              .update({ quantity: reg.quantity + item.quantity })
              .eq('id', item.regulatorId);
          }
        }
      }

      // Create expense entry
      const expenseCategory = purchaseItems.some(i => i.type === 'lpg') ? 'LPG Purchase' : 'Inventory Purchase';
      const itemNames = purchaseItems.map(i => `${i.quantity}x ${i.name}`).join(', ');
      
      await supabase.from('daily_expenses').insert({
        category: expenseCategory,
        amount: total,
        description: `${txnNumber}: ${supplierName} - ${itemNames}`,
        expense_date: today.toISOString().slice(0, 10)
      });

      toast({
        title: paymentStatus === 'completed' ? "Purchase Completed!" : "Purchase Saved as Credit",
        description: `${txnNumber} • ${BANGLADESHI_CURRENCY_SYMBOL}${total.toLocaleString()}`
      });

      setPurchaseItems([]);
      onPurchaseComplete();
      onOpenChange(false);

    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({ title: "Error completing purchase", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // Void system removed - purchases are permanent

  // Valve Size Quantity Card - Compact for mobile
  const ValveSizeQuantityCard = ({ 
    value, 
    onChange, 
    valveSize, 
    stockLabel
  }: { 
    value: number; 
    onChange: (v: number) => void;
    valveSize: '22mm' | '20mm';
    stockLabel?: string;
  }) => {
    const is22mm = valveSize === '22mm';
    const borderColor = is22mm ? 'border-primary/30' : 'border-warning/30';
    const badgeBg = is22mm ? 'bg-primary' : 'bg-warning';
    const textColor = is22mm ? 'text-primary' : 'text-warning';
    
    return (
      <Card className={`overflow-hidden border-2 ${borderColor}`}>
        <div className={`p-2 text-center border-b ${borderColor} bg-gradient-to-br ${is22mm ? 'from-primary/10 to-primary/5' : 'from-warning/10 to-warning/5'}`}>
          <div className={`inline-flex items-center justify-center ${badgeBg} text-white px-2.5 py-1 rounded-full`}>
            <CircleDot className="h-3 w-3 mr-1" />
            <span className="text-xs font-bold">{valveSize}</span>
          </div>
          {stockLabel && (
            <p className="text-[10px] font-medium text-muted-foreground mt-1">
              Stock: <span className={`font-bold ${textColor}`}>{stockLabel}</span>
            </p>
          )}
        </div>
        <CardContent className="p-2 space-y-1.5">
          <Input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            className={`w-full h-12 text-center text-xl font-extrabold border-2 ${borderColor} ${textColor}`}
            placeholder="0"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <Button type="button" variant="outline" className="h-9 font-bold text-xs" onClick={() => onChange(Math.max(0, value - 10))}>
              -10
            </Button>
            <Button type="button" variant="outline" className="h-9 font-bold text-xs" onClick={() => onChange(value + 10)}>
              +10
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Burner Type Quantity Card - Compact for mobile
  const BurnerTypeQuantityCard = ({ 
    value, 
    onChange, 
    burnerType, 
    stockLabel
  }: { 
    value: number; 
    onChange: (v: number) => void;
    burnerType: 'single' | 'double';
    stockLabel?: string;
  }) => {
    const isSingle = burnerType === 'single';
    const borderColor = isSingle ? 'border-warning/40' : 'border-orange-500/40';
    const badgeBg = isSingle ? 'bg-warning' : 'bg-orange-500';
    const textColor = isSingle ? 'text-warning' : 'text-orange-500';
    const label = isSingle ? 'Single' : 'Double';
    
    return (
      <Card className={`overflow-hidden border-2 ${borderColor}`}>
        <div className={`p-2 text-center border-b ${borderColor} bg-gradient-to-br ${isSingle ? 'from-warning/10 to-warning/5' : 'from-orange-500/10 to-orange-500/5'}`}>
          <div className={`inline-flex items-center justify-center ${badgeBg} text-white px-2.5 py-1 rounded-full`}>
            <Flame className="h-3 w-3 mr-1" />
            <span className="text-xs font-bold">{label}</span>
          </div>
          {stockLabel && (
            <p className="text-[10px] font-medium text-muted-foreground mt-1">
              Stock: <span className={`font-bold ${textColor}`}>{stockLabel}</span>
            </p>
          )}
        </div>
        <CardContent className="p-2 space-y-1.5">
          <Input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
            className={`w-full h-12 text-center text-xl font-extrabold border-2 ${borderColor} ${textColor}`}
            placeholder="0"
          />
          <div className="grid grid-cols-2 gap-1.5">
            <Button type="button" variant="outline" className="h-9 font-bold text-xs" onClick={() => onChange(Math.max(0, value - 10))}>
              -10
            </Button>
            <Button type="button" variant="outline" className="h-9 font-bold text-xs" onClick={() => onChange(value + 10)}>
              +10
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Product form based on type
  const renderProductForm = () => {
    if (productType === 'lpg') {
      return (
        <div className="space-y-3">
          {/* Unified Row: Cylinder Type + Weight */}
          <div className="flex items-center gap-2">
            {/* Cylinder Type + Separator */}
            <div className="flex bg-muted/60 rounded-full p-1 border border-border/50 flex-1">
              <button
                type="button"
                onClick={() => setLpgCylinderType("refill")}
                className={`flex-1 h-9 px-2 rounded-full font-semibold text-xs transition-all ${
                  lpgCylinderType === 'refill' 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Refill
              </button>
              <button
                type="button"
                onClick={() => setLpgCylinderType("package")}
                className={`flex-1 h-9 px-2 rounded-full font-semibold text-xs transition-all ${
                  lpgCylinderType === 'package' 
                    ? 'bg-secondary text-secondary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Package
              </button>
            </div>
            
            {/* Weight Dropdown */}
            <Select value={lpgWeight} onValueChange={setLpgWeight}>
              <SelectTrigger className="h-9 w-24 text-xs"><SelectValue /></SelectTrigger>
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
            <Select value={lpgBrandName} onValueChange={setLpgBrandName}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Select brand..." /></SelectTrigger>
              <SelectContent>
                {lpgBrandOptions.map(brand => (
                  <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity by Valve Size */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 pb-1 border-b">
              <CircleDashed className="h-4 w-4 text-primary" />
              <Label className="text-sm font-bold">Quantity (By Valve Size)</Label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <ValveSizeQuantityCard value={lpgQty22mm} onChange={setLpgQty22mm} valveSize="22mm" stockLabel={`${valveSizeStats["22mm"].refill}R + ${valveSizeStats["22mm"].package}P`} />
              <ValveSizeQuantityCard value={lpgQty20mm} onChange={setLpgQty20mm} valveSize="20mm" stockLabel={`${valveSizeStats["20mm"].refill}R + ${valveSizeStats["20mm"].package}P`} />
            </div>
            {lpgTotalQty > 0 && (
              <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg border border-primary/20">
                <span className="font-medium text-sm">Total: {lpgTotalQty} cylinders</span>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-[10px]">22mm: {lpgQty22mm}</Badge>
                  <Badge variant="outline" className="text-[10px]">20mm: {lpgQty20mm}</Badge>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Total D.O. */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Total D.O. Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
            <Input type="number" inputMode="numeric" placeholder="Enter total amount..." value={lpgTotalDO || ""} onChange={(e) => setLpgTotalDO(parseInt(e.target.value) || 0)} className="h-12 text-lg font-semibold" />
          </div>

          {/* Unit Price */}
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-xl border border-primary/20">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Unit Price</span>
            </div>
            <span className="text-xl font-extrabold text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{lpgCompanyPrice.toLocaleString()}</span>
          </div>

          {/* Add to Cart */}
          <Button type="button" size="lg" className="w-full h-12 font-semibold" onClick={addLPGToCart} disabled={!lpgBrandName || lpgTotalQty <= 0 || lpgTotalDO <= 0}>
            <Plus className="h-5 w-5 mr-2" />Add to Cart
          </Button>
        </div>
      );
    }

    if (productType === 'stove') {
      return (
        <div className="space-y-4">
          {/* Brand */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Brand Name</Label>
            <Select value={stoveBrand} onValueChange={setStoveBrand}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Select brand..." /></SelectTrigger>
              <SelectContent>
                {STOVE_BRANDS.map(brand => (
                  <SelectItem key={brand.name} value={brand.name}>{brand.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Model Number</Label>
            <Input value={stoveModel} onChange={(e) => setStoveModel(e.target.value)} placeholder="e.g., GS-102" className="h-12" />
          </div>

          {/* Quantity by Burner Type */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b">
              <Flame className="h-5 w-5 text-warning" />
              <Label className="text-base font-bold">Quantity (By Burner Type)</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <BurnerTypeQuantityCard value={stoveQtySingle} onChange={setStoveQtySingle} burnerType="single" stockLabel={`${stoveBurnerStats.single}`} />
              <BurnerTypeQuantityCard value={stoveQtyDouble} onChange={setStoveQtyDouble} burnerType="double" stockLabel={`${stoveBurnerStats.double}`} />
            </div>
            {stoveTotalQty > 0 && (
              <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20">
                <span className="font-medium">Total: {stoveTotalQty} stoves</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Total Amount */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Total D.O. Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
            <Input type="number" inputMode="numeric" placeholder="Enter total amount..." value={stoveTotalAmount || ""} onChange={(e) => setStoveTotalAmount(parseInt(e.target.value) || 0)} className="h-14 text-lg font-semibold" />
          </div>

          {/* Unit Price */}
          <div className="flex items-center justify-between p-4 bg-warning/10 rounded-xl border border-warning/20">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-warning" />
              <span className="font-medium">Unit Price</span>
            </div>
            <span className="text-2xl font-extrabold text-warning">{BANGLADESHI_CURRENCY_SYMBOL}{stoveCompanyPrice.toLocaleString()}</span>
          </div>

          {/* Add to Cart */}
          <Button type="button" size="lg" className="w-full h-14 font-semibold bg-gradient-to-r from-warning to-orange-500 text-white" onClick={addStoveToCart} disabled={!stoveBrand || !stoveModel || stoveTotalQty <= 0 || stoveTotalAmount <= 0}>
            <Plus className="h-5 w-5 mr-2" />Add to Cart
          </Button>
        </div>
      );
    }

    if (productType === 'regulator') {
      return (
        <div className="space-y-4">
          {/* Brand */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Brand Name</Label>
            <Select value={regulatorBrand} onValueChange={setRegulatorBrand}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Select brand..." /></SelectTrigger>
              <SelectContent>
                {REGULATOR_BRANDS.map(brand => (
                  <SelectItem key={brand.name} value={brand.name}>{brand.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity by Valve Type */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b">
              <Gauge className="h-5 w-5 text-info" />
              <Label className="text-base font-bold">Quantity (By Valve Type)</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <ValveSizeQuantityCard value={regQty22mm} onChange={setRegQty22mm} valveSize="22mm" stockLabel={`${regulatorValveStats["22mm"]} pcs`} />
              <ValveSizeQuantityCard value={regQty20mm} onChange={setRegQty20mm} valveSize="20mm" stockLabel={`${regulatorValveStats["20mm"]} pcs`} />
            </div>
            {regTotalQty > 0 && (
              <div className="flex items-center justify-between p-3 bg-info/10 rounded-lg border border-info/20">
                <span className="font-medium">Total: {regTotalQty} regulators</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Total Amount */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Total D.O. Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
            <Input type="number" inputMode="numeric" placeholder="Enter total amount..." value={regulatorTotalAmount || ""} onChange={(e) => setRegulatorTotalAmount(parseInt(e.target.value) || 0)} className="h-14 text-lg font-semibold" />
          </div>

          {/* Unit Price */}
          <div className="flex items-center justify-between p-4 bg-info/10 rounded-xl border border-info/20">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-info" />
              <span className="font-medium">Unit Price</span>
            </div>
            <span className="text-2xl font-extrabold text-info">{BANGLADESHI_CURRENCY_SYMBOL}{regulatorCompanyPrice.toLocaleString()}</span>
          </div>

          {/* Add to Cart */}
          <Button type="button" size="lg" className="w-full h-14 font-semibold bg-gradient-to-r from-info to-cyan-500 text-white" onClick={addRegulatorToCart} disabled={!regulatorBrand || regTotalQty <= 0 || regulatorTotalAmount <= 0}>
            <Plus className="h-5 w-5 mr-2" />Add to Cart
          </Button>
        </div>
      );
    }

    return null;
  };

  // Cart view
  const renderCart = () => (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        {purchaseItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ShoppingBag className="h-16 w-16 opacity-30 mb-4" />
            <p className="font-semibold">Cart is empty</p>
            <p className="text-sm">Add products to get started</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {purchaseItems.map((item) => (
              <Card key={item.id} className="overflow-hidden border" style={{ borderLeftWidth: '4px', borderLeftColor: item.brandColor || (item.type === 'stove' ? 'hsl(var(--warning))' : item.type === 'regulator' ? 'hsl(var(--info))' : 'hsl(var(--primary))') }}>
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted">
                      {item.type === 'lpg' && <Cylinder className="h-5 w-5" style={{ color: item.brandColor || 'hsl(var(--primary))' }} />}
                      {item.type === 'stove' && <ChefHat className="h-5 w-5 text-warning" />}
                      {item.type === 'regulator' && <Gauge className="h-5 w-5 text-info" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.details}</p>
                      <p className="text-xs font-medium text-primary">{item.quantity} × {BANGLADESHI_CURRENCY_SYMBOL}{item.companyPrice.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{BANGLADESHI_CURRENCY_SYMBOL}{(item.quantity * item.companyPrice).toLocaleString()}</p>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
      
      {purchaseItems.length > 0 && (
        <div className="p-4 bg-muted/50 border-t space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-2 border-success/30 bg-success/10">
              <CardContent className="p-3 text-center">
                <p className="text-xs font-bold text-success">Total Qty</p>
                <p className="text-2xl font-black text-success">{purchaseItemsCount}</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-primary/30 bg-primary/10">
              <CardContent className="p-3 text-center">
                <p className="text-xs font-bold text-primary">Total D.O.</p>
                <p className="text-xl font-black text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
          {isMobile && (
            <Button type="button" size="lg" className="w-full h-12 font-bold" onClick={() => setMobileStep('checkout')}>
              <CheckCircle2 className="h-5 w-5 mr-2" />Proceed to Checkout
            </Button>
          )}
        </div>
      )}
    </div>
  );

  // Checkout view (optimized for mobile)
  const renderCheckout = () => (
    <div className="space-y-4">
      {/* Supplier */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5" />Supplier
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <Select value={supplierName} onValueChange={setSupplierName}>
            <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SUPPLIERS.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-primary/20">
        <CardHeader className="py-3 px-4 bg-primary/5 border-b">
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Items</span>
            <span className="font-medium">{purchaseItemsCount}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-baseline">
            <span className="font-semibold">Total D.O.</span>
            <span className="text-2xl font-extrabold text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</span>
          </div>

          <div className="space-y-3 pt-2">
            <Button 
              type="button" 
              size="lg" 
              className="w-full h-14 font-semibold" 
              onClick={() => handleCompletePurchase('completed')} 
              disabled={processing || purchaseItems.length === 0}
            >
              {processing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
              Complete (Paid)
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="lg" 
              className="w-full h-14 font-semibold border-warning text-warning hover:bg-warning/10" 
              onClick={() => handleCompletePurchase('pending')} 
              disabled={processing || purchaseItems.length === 0}
            >
              <Save className="h-5 w-5 mr-2" />Save as Credit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Purchases section removed - void system disabled */}
    </div>
  );

  // Get title based on product type
  const getTitle = () => {
    switch (productType) {
      case 'lpg': return 'Buy LPG Cylinders';
      case 'stove': return 'Buy Gas Stoves';
      case 'regulator': return 'Buy Regulators';
      default: return 'Buy Products';
    }
  };

  const getIcon = () => {
    switch (productType) {
      case 'lpg': return <Cylinder className="h-5 w-5" />;
      case 'stove': return <ChefHat className="h-5 w-5" />;
      case 'regulator': return <Gauge className="h-5 w-5" />;
      default: return <ShoppingBag className="h-5 w-5" />;
    }
  };

  // Mobile cart view (without h-full constraint)
  const renderCartMobile = () => (
    <div className="pb-6">
      {purchaseItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ShoppingBag className="h-16 w-16 opacity-30 mb-4" />
          <p className="font-semibold">Cart is empty</p>
          <p className="text-sm">Add products to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {purchaseItems.map((item) => (
            <Card key={item.id} className="overflow-hidden border" style={{ borderLeftWidth: '4px', borderLeftColor: item.brandColor || (item.type === 'stove' ? 'hsl(var(--warning))' : item.type === 'regulator' ? 'hsl(var(--info))' : 'hsl(var(--primary))') }}>
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-muted">
                    {item.type === 'lpg' && <Cylinder className="h-5 w-5" style={{ color: item.brandColor || 'hsl(var(--primary))' }} />}
                    {item.type === 'stove' && <ChefHat className="h-5 w-5 text-warning" />}
                    {item.type === 'regulator' && <Gauge className="h-5 w-5 text-info" />}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.details}</p>
                    <p className="text-xs font-medium text-primary">{item.quantity} × {BANGLADESHI_CURRENCY_SYMBOL}{item.companyPrice.toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{BANGLADESHI_CURRENCY_SYMBOL}{(item.quantity * item.companyPrice).toLocaleString()}</p>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          
          {/* Cart Summary */}
          <div className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-2 border-success/30 bg-success/10">
                <CardContent className="p-3 text-center">
                  <p className="text-xs font-bold text-success">Total Qty</p>
                  <p className="text-2xl font-black text-success">{purchaseItemsCount}</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-primary/30 bg-primary/10">
                <CardContent className="p-3 text-center">
                  <p className="text-xs font-bold text-primary">Total D.O.</p>
                  <p className="text-xl font-black text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>
            <Button type="button" size="lg" className="w-full h-14 font-bold" onClick={() => setMobileStep('checkout')}>
              <CheckCircle2 className="h-5 w-5 mr-2" />Proceed to Checkout
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  // Quick Add to Stock (without cart/checkout flow)
  const quickAddToStock = async () => {
    setProcessing(true);
    try {
      if (productType === 'lpg') {
        if (!lpgBrandName || lpgTotalQty <= 0) {
          toast({ title: "Please select brand and enter quantity", variant: "destructive" });
          return;
        }

        for (const valveSize of ['22mm', '20mm'] as const) {
          const qty = valveSize === '22mm' ? lpgQty22mm : lpgQty20mm;
          if (qty <= 0) continue;

          const existingBrand = lpgBrands.find(b => 
            b.name.toLowerCase() === lpgBrandName.toLowerCase() && 
            b.size === valveSize && 
            b.weight === lpgWeight
          );

          if (existingBrand) {
            const stockField = lpgCylinderType === 'refill' ? 'refill_cylinder' : 'package_cylinder';
            await supabase
              .from('lpg_brands')
              .update({ [stockField]: existingBrand[stockField] + qty })
              .eq('id', existingBrand.id);
          } else {
            const brandColor = getLpgBrandColor(lpgBrandName);
            await supabase
              .from('lpg_brands')
              .insert({
                name: lpgBrandName,
                size: valveSize,
                weight: lpgWeight,
                color: brandColor,
                refill_cylinder: lpgCylinderType === 'refill' ? qty : 0,
                package_cylinder: lpgCylinderType === 'package' ? qty : 0,
                empty_cylinder: 0,
                problem_cylinder: 0
              });
          }
        }
        toast({ title: "Stock Added!", description: `${lpgTotalQty} ${lpgBrandName} cylinders added` });
      } else if (productType === 'stove') {
        if (!stoveBrand || !stoveModel || stoveTotalQty <= 0) {
          toast({ title: "Please fill brand, model and quantity", variant: "destructive" });
          return;
        }

        const existingStove = stoves.find(s => 
          s.brand.toLowerCase() === stoveBrand.toLowerCase() && 
          s.model.toLowerCase() === stoveModel.toLowerCase()
        );

        if (existingStove) {
          await supabase
            .from('stoves')
            .update({ quantity: existingStove.quantity + stoveTotalQty })
            .eq('id', existingStove.id);
        } else {
          const burners = stoveQtySingle > 0 ? 1 : 2;
          await supabase
            .from('stoves')
            .insert({
              brand: stoveBrand,
              model: stoveModel,
              burners,
              quantity: stoveTotalQty,
              price: 0
            });
        }
        toast({ title: "Stock Added!", description: `${stoveTotalQty} ${stoveBrand} stoves added` });
      } else if (productType === 'regulator') {
        if (!regulatorBrand || regTotalQty <= 0) {
          toast({ title: "Please select brand and enter quantity", variant: "destructive" });
          return;
        }

        for (const valveType of ['22mm', '20mm'] as const) {
          const qty = valveType === '22mm' ? regQty22mm : regQty20mm;
          if (qty <= 0) continue;

          const existingReg = regulators.find(r => 
            r.brand.toLowerCase() === regulatorBrand.toLowerCase() && 
            r.type === valveType
          );

          if (existingReg) {
            await supabase
              .from('regulators')
              .update({ quantity: existingReg.quantity + qty })
              .eq('id', existingReg.id);
          } else {
            await supabase
              .from('regulators')
              .insert({
                brand: regulatorBrand,
                type: valveType,
                quantity: qty
              });
          }
        }
        toast({ title: "Stock Added!", description: `${regTotalQty} ${regulatorBrand} regulators added` });
      }

      // Reset form and close
      resetFormFields();
      onPurchaseComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Quick add error:', error);
      toast({ title: "Error adding stock", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // Reset form fields helper
  const resetFormFields = () => {
    setLpgBrandName("");
    setLpgQty22mm(0);
    setLpgQty20mm(0);
    setLpgTotalDO(0);
    setStoveBrand("");
    setStoveModel("");
    setStoveQtySingle(0);
    setStoveQtyDouble(0);
    setStoveTotalAmount(0);
    setRegulatorBrand("");
    setRegQty22mm(0);
    setRegQty20mm(0);
    setRegulatorTotalAmount(0);
    setPurchaseItems([]);
    setMobileStep('product');
    setPobMode('buy');
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side={isMobile ? "bottom" : "right"} 
          className={isMobile 
            ? "h-[95vh] rounded-t-2xl flex flex-col overflow-hidden p-0" 
            : "w-full sm:max-w-xl flex flex-col p-0"
          }
        >
          {/* Compact Fixed Header */}
          <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b bg-background">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                  productType === 'lpg' ? 'bg-primary/10 text-primary' :
                  productType === 'stove' ? 'bg-orange-500/10 text-orange-500' :
                  'bg-violet-500/10 text-violet-500'
                }`}>
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
              <Button 
                type="button"
                variant={pobMode === 'buy' ? 'default' : 'ghost'} 
                size="sm" 
                className="flex-1 h-9 text-xs font-medium gap-1.5" 
                onClick={() => setPobMode('buy')}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Buy from Company
              </Button>
              <Button 
                type="button"
                variant={pobMode === 'add' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="flex-1 h-9 text-xs font-medium gap-1.5" 
                onClick={() => setPobMode('add')}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Existing Stock
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64 flex-shrink-0">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pobMode === 'add' ? (
            /* Quick Add Mode - Simplified Form */
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 pb-8 space-y-4">
                {renderProductForm()}
                
                {/* Quick Add Button */}
                <Button 
                  type="button" 
                  size="lg" 
                  className="w-full h-14 font-bold bg-gradient-to-r from-success to-emerald-600 hover:from-success/90 hover:to-emerald-600/90" 
                  onClick={quickAddToStock}
                  disabled={processing || (productType === 'lpg' && (!lpgBrandName || lpgTotalQty <= 0)) || 
                    (productType === 'stove' && (!stoveBrand || !stoveModel || stoveTotalQty <= 0)) ||
                    (productType === 'regulator' && (!regulatorBrand || regTotalQty <= 0))}
                >
                  {processing ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-5 w-5 mr-2" />
                  )}
                  Add to Inventory
                </Button>
              </div>
            </ScrollArea>
          ) : (
            /* Buy Mode - Full Cart/Checkout Flow */
            <>
              {/* Mobile Step Navigation - Compact */}
              {isMobile && (
                <div className="flex items-center bg-muted/30 p-1 mx-3 mt-2 rounded-lg flex-shrink-0">
                  <Button 
                    type="button"
                    variant={mobileStep === 'product' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="flex-1 h-9 text-xs font-medium" 
                    onClick={() => setMobileStep('product')}
                  >
                    1. Product
                  </Button>
                  <Button 
                    type="button"
                    variant={mobileStep === 'cart' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="flex-1 h-9 relative text-xs font-medium" 
                    onClick={() => setMobileStep('cart')}
                  >
                    2. Cart
                    {purchaseItemsCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[9px]">{purchaseItemsCount}</Badge>
                    )}
                  </Button>
                  <Button 
                    type="button"
                    variant={mobileStep === 'checkout' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="flex-1 h-9 text-xs font-medium" 
                    onClick={() => setMobileStep('checkout')}
                  >
                    3. Pay
                  </Button>
                </div>
              )}

              {/* Mobile: Scrollable Content Area */}
              {isMobile ? (
                <ScrollArea className="flex-1 min-h-0">
                  <div className="px-4 pb-8 pt-3">
                    {mobileStep === 'product' && (
                      <div className="space-y-4">
                        {renderProductForm()}
                      </div>
                    )}
                    {mobileStep === 'cart' && renderCartMobile()}
                    {mobileStep === 'checkout' && (
                      <div>
                        {renderCheckout()}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                /* Desktop: Side-by-side scrollable */
                <div className="flex flex-col flex-1 min-h-0">
                  <ScrollArea className="flex-1">
                    <div className="p-4 space-y-4">
                      {renderProductForm()}
                      <Separator className="my-4" />
                      {renderCart()}
                      <Separator className="my-4" />
                      {renderCheckout()}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Void Dialog removed - void system disabled */}
    </>
  );
};
