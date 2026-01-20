import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingBag, 
  Loader2,
  X,
  User,
  Package,
  ChefHat,
  Gauge,
  Cylinder,
  CheckCircle2,
  Building2,
  PackagePlus,
  Undo2,
  ArrowDownToLine,
  RotateCcw,
  ArrowRight,
  Calculator,
  Sparkles,
  Save
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { LPG_BRANDS, STOVE_BRANDS, REGULATOR_BRANDS, getLpgBrandColor, getLpgBrandsByMouthSize } from "@/lib/brandConstants";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";

// ============= INTERFACES =============
interface LPGBrand {
  id: string;
  name: string;
  size: string;
  weight: string;
  refill_cylinder: number;
  package_cylinder: number;
  empty_cylinder: number;
  problem_cylinder: number;
  in_transit_cylinder?: number;
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

interface ProductPrice {
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
  burnerType?: string;
  model?: string;
  regulatorType?: string;
}

interface RecentPurchase {
  id: string;
  transactionNumber: string;
  supplierName: string;
  total: number;
  status: string;
  createdAt: Date;
  items: { name: string; quantity: number }[];
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

// ============= POB MODULE PROPS =============
interface POBModuleProps {
  userRole?: 'owner' | 'manager' | 'driver';
  userName?: string;
}

// Role display config
const ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  owner: { label: 'Owner', color: 'text-indigo-700 dark:text-indigo-300', bgColor: 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700' },
  manager: { label: 'Manager', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700' },
  driver: { label: 'Driver', color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700' },
};

// ============= MAIN POB MODULE =============
export const POBModule = ({ userRole = 'owner', userName = 'User' }: POBModuleProps) => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  
  // ===== DATA STATE =====
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);
  
  // ===== STEP-BASED FLOW STATE =====
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [productType, setProductType] = useState<'lpg' | 'stove' | 'regulator' | null>(null);
  
  // ===== LPG CONFIGURATION STATE =====
  const [lpgBrandName, setLpgBrandName] = useState("");
  const [lpgCylinderType, setLpgCylinderType] = useState<'refill' | 'package'>("refill");
  const [lpgWeight, setLpgWeight] = useState("12kg");
  const [lpgValveSize, setLpgValveSize] = useState("22mm");
  const [lpgQuantity, setLpgQuantity] = useState(1);
  const [lpgTotalDO, setLpgTotalDO] = useState(0);
  
  // ===== STOVE CONFIGURATION STATE =====
  const [stoveBrand, setStoveBrand] = useState("");
  const [stoveModel, setStoveModel] = useState("");
  const [stoveBurnerType, setStoveBurnerType] = useState<'single' | 'double'>("single");
  const [stoveQuantity, setStoveQuantity] = useState(1);
  const [stoveTotalAmount, setStoveTotalAmount] = useState(0);
  
  // ===== REGULATOR CONFIGURATION STATE =====
  const [regulatorBrand, setRegulatorBrand] = useState("");
  const [regulatorType, setRegulatorType] = useState("22mm");
  const [regulatorQuantity, setRegulatorQuantity] = useState(1);
  const [regulatorTotalAmount, setRegulatorTotalAmount] = useState(0);
  
  // ===== CART STATE =====
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  
  // ===== SUPPLIER STATE =====
  const [supplierName, setSupplierName] = useState("Bashundhara LP Gas Ltd.");
  const [customSupplier, setCustomSupplier] = useState("");
  const [showCustomSupplierInput, setShowCustomSupplierInput] = useState(false);
  
  // ===== UI STATE =====
  const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [purchaseToVoid, setPurchaseToVoid] = useState<RecentPurchase | null>(null);

  // ============= DATA FETCHING =============
  const fetchData = useCallback(async () => {
    const [brandsRes, stovesRes, regulatorsRes, pricesRes] = await Promise.all([
      supabase.from('lpg_brands').select('*').eq('is_active', true),
      supabase.from('stoves').select('*').eq('is_active', true),
      supabase.from('regulators').select('*').eq('is_active', true),
      supabase.from('product_prices').select('*').eq('is_active', true)
    ]);

    if (brandsRes.data) setLpgBrands(brandsRes.data);
    if (stovesRes.data) setStoves(stovesRes.data);
    if (regulatorsRes.data) setRegulators(regulatorsRes.data);
    if (pricesRes.data) setProductPrices(pricesRes.data);

    // Fetch recent POB transactions
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentTxns } = await supabase
      .from('pob_transactions')
      .select(`id, transaction_number, supplier_name, total, payment_status, created_at, pob_transaction_items (product_name, quantity)`)
      .gte('created_at', fiveMinutesAgo)
      .eq('is_voided', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentTxns) {
      setRecentPurchases(recentTxns.map(t => ({
        id: t.id,
        transactionNumber: t.transaction_number,
        supplierName: t.supplier_name,
        total: Number(t.total),
        status: t.payment_status,
        createdAt: new Date(t.created_at),
        items: t.pob_transaction_items?.map((i: any) => ({ name: i.product_name, quantity: i.quantity })) || []
      })));
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    initData();

    // Real-time subscriptions
    const channels = [
      supabase.channel('pob-lpg').on('postgres_changes', { event: '*', schema: 'public', table: 'lpg_brands' }, () => {
        supabase.from('lpg_brands').select('*').eq('is_active', true).then(({ data }) => data && setLpgBrands(data));
      }).subscribe(),
      supabase.channel('pob-stoves').on('postgres_changes', { event: '*', schema: 'public', table: 'stoves' }, () => {
        supabase.from('stoves').select('*').eq('is_active', true).then(({ data }) => data && setStoves(data));
      }).subscribe(),
      supabase.channel('pob-regulators').on('postgres_changes', { event: '*', schema: 'public', table: 'regulators' }, () => {
        supabase.from('regulators').select('*').eq('is_active', true).then(({ data }) => data && setRegulators(data));
      }).subscribe(),
      supabase.channel('pob-prices').on('postgres_changes', { event: '*', schema: 'public', table: 'product_prices' }, () => {
        supabase.from('product_prices').select('*').eq('is_active', true).then(({ data }) => data && setProductPrices(data));
      }).subscribe()
    ];

    return () => channels.forEach(ch => supabase.removeChannel(ch));
  }, [fetchData]);

  // ============= CALCULATED PRICES =============
  const lpgCompanyPrice = useMemo(() => {
    if (lpgQuantity <= 0 || lpgTotalDO <= 0) return 0;
    return Math.round(lpgTotalDO / lpgQuantity);
  }, [lpgQuantity, lpgTotalDO]);

  const stoveCompanyPrice = useMemo(() => {
    if (stoveQuantity <= 0 || stoveTotalAmount <= 0) return 0;
    return Math.round(stoveTotalAmount / stoveQuantity);
  }, [stoveQuantity, stoveTotalAmount]);

  const regulatorCompanyPrice = useMemo(() => {
    if (regulatorQuantity <= 0 || regulatorTotalAmount <= 0) return 0;
    return Math.round(regulatorTotalAmount / regulatorQuantity);
  }, [regulatorQuantity, regulatorTotalAmount]);

  // ============= CART CALCULATIONS =============
  const purchaseItemsCount = useMemo(() => {
    return purchaseItems.reduce((s, i) => s + i.quantity, 0);
  }, [purchaseItems]);

  const subtotal = purchaseItems.reduce((sum, item) => sum + item.companyPrice * item.quantity, 0);
  const total = subtotal;

  // ============= GET BRAND COLOR =============
  const getBrandColor = (brandName: string): string => {
    return getLpgBrandColor(brandName);
  };

  // ============= ADD PRODUCT TO CART & UPDATE PRICING =============
  const addLPGToCart = async () => {
    if (!lpgBrandName || lpgQuantity <= 0 || lpgTotalDO <= 0) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    const companyPrice = lpgCompanyPrice;
    const brandColor = getBrandColor(lpgBrandName);

    // Find or create brand in inventory
    let brandId = "";
    const existingBrand = lpgBrands.find(b => 
      b.name.toLowerCase() === lpgBrandName.toLowerCase() && 
      b.size === lpgValveSize && 
      b.weight === lpgWeight
    );

    if (existingBrand) {
      brandId = existingBrand.id;
    } else {
      // Create new brand entry
      const { data: newBrand, error } = await supabase
        .from('lpg_brands')
        .insert({
          name: lpgBrandName,
          size: lpgValveSize,
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
        toast({ title: "Error creating brand", variant: "destructive" });
        return;
      }
      brandId = newBrand.id;
    }

    // Update product pricing
    await updateProductPricing('lpg', lpgBrandName, companyPrice, {
      brandId,
      weight: lpgWeight,
      valveSize: lpgValveSize,
      cylinderType: lpgCylinderType
    });

    // Add to cart
    const itemId = `lpg-${Date.now()}`;
    const newItem: PurchaseItem = {
      id: itemId,
      type: 'lpg',
      name: lpgBrandName,
      details: `${lpgWeight} • ${lpgValveSize} • ${lpgCylinderType === 'refill' ? 'Refill' : 'Package'}`,
      companyPrice,
      quantity: lpgQuantity,
      cylinderType: lpgCylinderType,
      brandId,
      weight: lpgWeight,
      valveSize: lpgValveSize,
      brandColor
    };

    setPurchaseItems([...purchaseItems, newItem]);
    toast({ 
      title: "Added to cart!", 
      description: `${lpgQuantity}x ${lpgBrandName} @ ${BANGLADESHI_CURRENCY_SYMBOL}${companyPrice}/pc` 
    });

    // Reset form and go to step 3
    resetLPGForm();
    setCurrentStep(3);
  };

  const addStoveToCart = async () => {
    if (!stoveBrand || !stoveModel || stoveQuantity <= 0 || stoveTotalAmount <= 0) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    const companyPrice = stoveCompanyPrice;
    const burners = stoveBurnerType === 'single' ? 1 : 2;

    // Find or create stove in inventory
    let stoveId = "";
    const existingStove = stoves.find(s => 
      s.brand.toLowerCase() === stoveBrand.toLowerCase() && 
      s.model.toLowerCase() === stoveModel.toLowerCase()
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
        toast({ title: "Error creating stove", variant: "destructive" });
        return;
      }
      stoveId = newStove.id;
    }

    // Update product pricing
    await updateProductPricing('stove', `${stoveBrand} ${stoveModel}`, companyPrice, {
      burnerType: stoveBurnerType
    });

    const newItem: PurchaseItem = {
      id: `stove-${Date.now()}`,
      type: 'stove',
      name: `${stoveBrand} ${stoveModel}`,
      details: `${stoveBurnerType === 'single' ? 'Single' : 'Double'} Burner`,
      companyPrice,
      quantity: stoveQuantity,
      stoveId,
      burnerType: stoveBurnerType,
      model: stoveModel
    };

    setPurchaseItems([...purchaseItems, newItem]);
    toast({ 
      title: "Added to cart!", 
      description: `${stoveQuantity}x ${stoveBrand} ${stoveModel} @ ${BANGLADESHI_CURRENCY_SYMBOL}${companyPrice}/pc` 
    });

    resetStoveForm();
    setCurrentStep(3);
  };

  const addRegulatorToCart = async () => {
    if (!regulatorBrand || regulatorQuantity <= 0 || regulatorTotalAmount <= 0) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    const companyPrice = regulatorCompanyPrice;

    // Find or create regulator in inventory
    let regId = "";
    const existingReg = regulators.find(r => 
      r.brand.toLowerCase() === regulatorBrand.toLowerCase() && 
      r.type === regulatorType
    );

    if (existingReg) {
      regId = existingReg.id;
    } else {
      const { data: newReg, error } = await supabase
        .from('regulators')
        .insert({
          brand: regulatorBrand,
          type: regulatorType,
          quantity: 0,
          price: 0
        })
        .select()
        .single();

      if (error) {
        toast({ title: "Error creating regulator", variant: "destructive" });
        return;
      }
      regId = newReg.id;
    }

    // Update product pricing
    await updateProductPricing('regulator', `${regulatorBrand} ${regulatorType}`, companyPrice, {
      regulatorType
    });

    const newItem: PurchaseItem = {
      id: `regulator-${Date.now()}`,
      type: 'regulator',
      name: `${regulatorBrand} Regulator`,
      details: `${regulatorType} Valve`,
      companyPrice,
      quantity: regulatorQuantity,
      regulatorId: regId,
      regulatorType
    };

    setPurchaseItems([...purchaseItems, newItem]);
    toast({ 
      title: "Added to cart!", 
      description: `${regulatorQuantity}x ${regulatorBrand} @ ${BANGLADESHI_CURRENCY_SYMBOL}${companyPrice}/pc` 
    });

    resetRegulatorForm();
    setCurrentStep(3);
  };

  // ============= UPDATE PRODUCT PRICING =============
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
        const fullProductName = `${productName} LP Gas ${options.weight} Cylinder (${options.valveSize}) ${options.cylinderType === 'refill' ? 'Refill' : 'Package'}`;
        const variant = options.cylinderType === 'refill' ? 'Refill' : 'Package';

        // Check if pricing entry exists
        const { data: existingPrice } = await supabase
          .from('product_prices')
          .select('id')
          .eq('brand_id', options.brandId)
          .eq('variant', variant)
          .eq('product_type', 'lpg')
          .maybeSingle();

        if (existingPrice) {
          // Update existing price
          const updateField = options.cylinderType === 'package' ? 'package_price' : 'company_price';
          await supabase
            .from('product_prices')
            .update({ [updateField]: companyPrice, updated_at: new Date().toISOString() })
            .eq('id', existingPrice.id);
        } else {
          // Create new pricing entry
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
        const fullProductName = `${productName} - ${options.burnerType === 'single' ? 'Single' : 'Double'} Burner`;
        
        const { data: existingPrice } = await supabase
          .from('product_prices')
          .select('id')
          .eq('product_name', fullProductName)
          .eq('product_type', 'stove')
          .maybeSingle();

        if (existingPrice) {
          await supabase
            .from('product_prices')
            .update({ company_price: companyPrice, updated_at: new Date().toISOString() })
            .eq('id', existingPrice.id);
        } else {
          await supabase.from('product_prices').insert({
            product_type: 'stove',
            product_name: fullProductName,
            size: options.burnerType === 'single' ? 'Single Burner' : 'Double Burner',
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
          .eq('product_name', fullProductName)
          .eq('product_type', 'regulator')
          .maybeSingle();

        if (existingPrice) {
          await supabase
            .from('product_prices')
            .update({ company_price: companyPrice, updated_at: new Date().toISOString() })
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

      console.log(`Product pricing updated for ${productName}: ${BANGLADESHI_CURRENCY_SYMBOL}${companyPrice}`);
    } catch (error) {
      console.error('Error updating product pricing:', error);
    }
  };

  // ============= RESET FORMS =============
  const resetLPGForm = () => {
    setLpgBrandName("");
    setLpgCylinderType("refill");
    setLpgWeight("12kg");
    setLpgValveSize("22mm");
    setLpgQuantity(1);
    setLpgTotalDO(0);
  };

  const resetStoveForm = () => {
    setStoveBrand("");
    setStoveModel("");
    setStoveBurnerType("single");
    setStoveQuantity(1);
    setStoveTotalAmount(0);
  };

  const resetRegulatorForm = () => {
    setRegulatorBrand("");
    setRegulatorType("22mm");
    setRegulatorQuantity(1);
    setRegulatorTotalAmount(0);
  };

  // ============= CART ACTIONS =============
  const updateItemQuantity = (id: string, delta: number) => {
    setPurchaseItems(purchaseItems.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setPurchaseItems(purchaseItems.filter(i => i.id !== id));
  };

  const clearCart = () => {
    setPurchaseItems([]);
    setCurrentStep(1);
    setProductType(null);
    toast({ title: "Cart cleared" });
  };

  // ============= COMPLETE PURCHASE =============
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

      const finalSupplier = showCustomSupplierInput ? customSupplier : supplierName;

      const { data: txnData, error: txnError } = await supabase
        .from('pob_transactions')
        .insert({
          transaction_number: txnNumber,
          supplier_name: finalSupplier,
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
        size: item.valveSize || null
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

      // Create expense entry in daily_expenses
      const expenseCategory = purchaseItems.some(i => i.type === 'lpg') ? 'LPG Purchase' : 'Inventory Purchase';
      const itemNames = purchaseItems.map(i => `${i.quantity}x ${i.name}`).join(', ');
      
      await supabase.from('daily_expenses').insert({
        category: expenseCategory,
        amount: total,
        description: `${txnNumber}: ${finalSupplier} - ${itemNames}`,
        expense_date: today.toISOString().slice(0, 10)
      });

      toast({
        title: paymentStatus === 'completed' ? "Purchase Completed!" : "Purchase Saved as Credit",
        description: `${txnNumber} • ${BANGLADESHI_CURRENCY_SYMBOL}${total.toLocaleString()}`
      });

      setPurchaseItems([]);
      setCurrentStep(1);
      setProductType(null);
      await fetchData();

    } catch (error: any) {
      console.error('Purchase error:', error);
      toast({ title: "Error completing purchase", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // ============= VOID PURCHASE =============
  const handleVoidPurchase = async () => {
    if (!purchaseToVoid) return;

    try {
      await supabase
        .from('pob_transactions')
        .update({ is_voided: true, voided_at: new Date().toISOString() })
        .eq('id', purchaseToVoid.id);

      const { data: items } = await supabase
        .from('pob_transaction_items')
        .select('*')
        .eq('transaction_id', purchaseToVoid.id);

      if (items) {
        for (const item of items) {
          if (item.product_type === 'lpg' && item.brand_id) {
            const stockField = item.cylinder_type === 'refill' ? 'refill_cylinder' : 'package_cylinder';
            
            const { data: brand } = await supabase
              .from('lpg_brands')
              .select(stockField)
              .eq('id', item.brand_id)
              .single();
            
            if (brand) {
              await supabase
                .from('lpg_brands')
                .update({ [stockField]: (brand[stockField] as number) - item.quantity })
                .eq('id', item.brand_id);
            }
          } else if (item.product_type === 'stove') {
            const stove = stoves.find(s => `${s.brand} ${s.model}` === item.product_name);
            if (stove) {
              await supabase
                .from('stoves')
                .update({ quantity: stove.quantity - item.quantity })
                .eq('id', stove.id);
            }
          } else if (item.product_type === 'regulator') {
            const reg = regulators.find(r => `${r.brand} ${r.type}` === item.product_name);
            if (reg) {
              await supabase
                .from('regulators')
                .update({ quantity: reg.quantity - item.quantity })
                .eq('id', reg.id);
            }
          }
        }
      }

      await supabase
        .from('daily_expenses')
        .delete()
        .ilike('description', `${purchaseToVoid.transactionNumber}%`);

      toast({ title: "Purchase voided", description: purchaseToVoid.transactionNumber });
      setShowVoidDialog(false);
      setPurchaseToVoid(null);
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error voiding purchase", variant: "destructive" });
    }
  };

  // ============= GET AVAILABLE BRANDS =============
  const lpgBrandOptions = useMemo(() => {
    const brands = getLpgBrandsByMouthSize(lpgValveSize as "22mm" | "20mm");
    return brands.map(b => b.name);
  }, [lpgValveSize]);

  // ============= LOADING STATE =============
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-muted-foreground">Loading POB...</span>
      </div>
    );
  }

  // ============= MOBILE STEP NAVIGATION =============
  const goToStep = (step: 1 | 2 | 3) => {
    setCurrentStep(step);
  };

  const goBack = () => {
    if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(1);
      setProductType(null);
    }
  };

  // ============= RENDER =============
  return (
    <div className="space-y-3 pb-28 lg:pb-4">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 -mt-2 -mx-1 px-1">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <ArrowDownToLine className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Point of Buy</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Purchase from company</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-indigo-600 text-white h-8 px-3">
            <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
            {purchaseItemsCount}
          </Badge>
          {isMobile && purchaseItems.length > 0 && currentStep !== 3 && (
            <Button 
              size="sm" 
              className="h-8 bg-indigo-600"
              onClick={() => setCurrentStep(3)}
            >
              Checkout
            </Button>
          )}
        </div>
      </div>

      {/* ===== MOBILE STEP INDICATOR ===== */}
      {isMobile && (
        <div className="flex items-center justify-between bg-muted/50 rounded-lg p-2">
          <div className="flex items-center gap-2">
            {currentStep > 1 && (
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={goBack}>
                <ArrowRight className="h-4 w-4 rotate-180" />
              </Button>
            )}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((step) => (
                <button
                  key={step}
                  onClick={() => {
                    if (step === 1) goToStep(1);
                    else if (step === 2 && productType) goToStep(2);
                    else if (step === 3 && purchaseItems.length > 0) goToStep(3);
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    currentStep === step 
                      ? 'bg-indigo-600 text-white scale-110' 
                      : step < currentStep || (step === 3 && purchaseItems.length > 0)
                        ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>
          </div>
          <span className="text-xs font-medium">
            {currentStep === 1 ? 'Select Type' : currentStep === 2 ? 'Configure' : 'Summary'}
          </span>
        </div>
      )}

      {/* ===== DESKTOP 3-COLUMN / MOBILE SINGLE VIEW ===== */}
      <div className={isMobile ? 'space-y-3' : 'grid grid-cols-3 gap-3'}>
        
        {/* ===== PART 1: SELECT PRODUCT TYPE ===== */}
        {(!isMobile || currentStep === 1) && (
          <Card className={`border-2 transition-all ${currentStep === 1 ? 'border-indigo-500 shadow-lg' : 'border-muted'}`}>
            <CardHeader className="py-3 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
              <CardTitle className="flex items-center gap-2 text-sm">
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                Select Product Type
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-1 gap-3">
                <button
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all min-h-[72px] ${
                    productType === 'lpg' 
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-md' 
                      : 'border-muted hover:border-indigo-300 hover:bg-muted/50'
                  }`}
                  onClick={() => { setProductType('lpg'); setCurrentStep(2); }}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    productType === 'lpg' ? 'bg-indigo-600' : 'bg-indigo-100 dark:bg-indigo-900/50'
                  }`}>
                    <Cylinder className={`h-6 w-6 ${productType === 'lpg' ? 'text-white' : 'text-indigo-600'}`} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold">LPG Cylinder</p>
                    <p className="text-xs text-muted-foreground">Refill / Package</p>
                  </div>
                  {productType === 'lpg' && <CheckCircle2 className="h-5 w-5 text-indigo-600" />}
                </button>

                <button
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all min-h-[72px] ${
                    productType === 'stove' 
                      ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 shadow-md' 
                      : 'border-muted hover:border-orange-300 hover:bg-muted/50'
                  }`}
                  onClick={() => { setProductType('stove'); setCurrentStep(2); }}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    productType === 'stove' ? 'bg-orange-500' : 'bg-orange-100 dark:bg-orange-900/50'
                  }`}>
                    <ChefHat className={`h-6 w-6 ${productType === 'stove' ? 'text-white' : 'text-orange-600'}`} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold">Gas Stove</p>
                    <p className="text-xs text-muted-foreground">Single / Double Burner</p>
                  </div>
                  {productType === 'stove' && <CheckCircle2 className="h-5 w-5 text-orange-500" />}
                </button>

                <button
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all min-h-[72px] ${
                    productType === 'regulator' 
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 shadow-md' 
                      : 'border-muted hover:border-purple-300 hover:bg-muted/50'
                  }`}
                  onClick={() => { setProductType('regulator'); setCurrentStep(2); }}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    productType === 'regulator' ? 'bg-purple-500' : 'bg-purple-100 dark:bg-purple-900/50'
                  }`}>
                    <Gauge className={`h-6 w-6 ${productType === 'regulator' ? 'text-white' : 'text-purple-600'}`} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold">Regulator</p>
                    <p className="text-xs text-muted-foreground">22mm / 20mm</p>
                  </div>
                  {productType === 'regulator' && <CheckCircle2 className="h-5 w-5 text-purple-500" />}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== PART 2: CONFIGURE PRODUCT ===== */}
        {(!isMobile || currentStep === 2) && (
          <Card className={`border-2 transition-all ${currentStep === 2 ? 'border-indigo-500 shadow-lg' : 'border-muted'}`}>
            <CardHeader className="py-3 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
              <CardTitle className="flex items-center gap-2 text-sm">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground'}`}>2</div>
                Configure Purchase
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {!productType ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <Package className="h-16 w-16 opacity-20 mb-3" />
                  <p className="text-sm font-medium">Select a product type first</p>
                  <p className="text-xs mt-1">Choose from LPG, Stove, or Regulator</p>
                </div>
              ) : productType === 'lpg' ? (
                <ScrollArea className={isMobile ? "h-[calc(100vh-320px)]" : "h-[400px]"}>
                  <div className="space-y-4 pr-2">
                    {/* Brand Name */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brand Name</Label>
                      <Select value={lpgBrandName} onValueChange={setLpgBrandName}>
                        <SelectTrigger className="h-12 mt-1.5 text-base">
                          <SelectValue placeholder="Select brand..." />
                        </SelectTrigger>
                        <SelectContent>
                          {lpgBrandOptions.map(brand => (
                            <SelectItem key={brand} value={brand} className="h-11">{brand}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cylinder Type */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cylinder Type</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1.5">
                        <button
                          type="button"
                          className={`h-12 rounded-lg border-2 font-medium transition-all ${
                            lpgCylinderType === 'refill' 
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' 
                              : 'border-muted hover:border-indigo-300'
                          }`}
                          onClick={() => setLpgCylinderType('refill')}
                        >
                          Refill
                        </button>
                        <button
                          type="button"
                          className={`h-12 rounded-lg border-2 font-medium transition-all ${
                            lpgCylinderType === 'package' 
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' 
                              : 'border-muted hover:border-indigo-300'
                          }`}
                          onClick={() => setLpgCylinderType('package')}
                        >
                          Package
                        </button>
                      </div>
                    </div>

                    {/* Valve Size */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valve Size</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1.5">
                        <button
                          type="button"
                          className={`h-12 rounded-lg border-2 font-medium transition-all ${
                            lpgValveSize === '22mm' 
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' 
                              : 'border-muted hover:border-indigo-300'
                          }`}
                          onClick={() => { setLpgValveSize('22mm'); setLpgBrandName(''); }}
                        >
                          22mm
                        </button>
                        <button
                          type="button"
                          className={`h-12 rounded-lg border-2 font-medium transition-all ${
                            lpgValveSize === '20mm' 
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' 
                              : 'border-muted hover:border-indigo-300'
                          }`}
                          onClick={() => { setLpgValveSize('20mm'); setLpgBrandName(''); }}
                        >
                          20mm
                        </button>
                      </div>
                    </div>

                    {/* Weight */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Weight</Label>
                      <div className="grid grid-cols-3 gap-2 mt-1.5">
                        {(lpgValveSize === '22mm' ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM).map(w => (
                          <button
                            key={w}
                            type="button"
                            className={`h-11 rounded-lg border-2 text-sm font-medium transition-all ${
                              lpgWeight === w 
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' 
                                : 'border-muted hover:border-indigo-300'
                            }`}
                            onClick={() => setLpgWeight(w)}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Number of Cylinders */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Number of Cylinders</Label>
                      <div className="flex items-center gap-3 mt-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-xl"
                          onClick={() => setLpgQuantity(Math.max(1, lpgQuantity - 1))}
                        >
                          <Minus className="h-5 w-5" />
                        </Button>
                        <Input
                          type="number"
                          value={lpgQuantity}
                          onChange={(e) => setLpgQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-12 text-center font-bold text-xl flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-xl"
                          onClick={() => setLpgQuantity(lpgQuantity + 1)}
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Total D.O. Amount */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total D.O. Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="Enter total amount paid..."
                        value={lpgTotalDO || ''}
                        onChange={(e) => setLpgTotalDO(parseFloat(e.target.value) || 0)}
                        className="h-14 mt-1.5 text-xl font-semibold"
                      />
                    </div>

                    {/* Calculated Company Price */}
                    {lpgTotalDO > 0 && lpgQuantity > 0 && (
                      <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-xl border-2 border-indigo-200 dark:border-indigo-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="h-5 w-5 text-indigo-600" />
                          <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Auto-calculated</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-muted-foreground">Per Cylinder:</span>
                          <span className="text-2xl font-bold text-indigo-600">{BANGLADESHI_CURRENCY_SYMBOL}{lpgCompanyPrice.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5" />
                          Updates Product Pricing automatically
                        </p>
                      </div>
                    )}

                    {/* Add to Cart Button */}
                    <Button
                      className="w-full h-14 text-base bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                      disabled={!lpgBrandName || lpgQuantity <= 0 || lpgTotalDO <= 0}
                      onClick={addLPGToCart}
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </ScrollArea>
              ) : productType === 'stove' ? (
                <ScrollArea className={isMobile ? "h-[calc(100vh-320px)]" : "h-[400px]"}>
                  <div className="space-y-4 pr-2">
                    {/* Brand Name */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brand Name</Label>
                      <Select value={stoveBrand} onValueChange={setStoveBrand}>
                        <SelectTrigger className="h-12 mt-1.5 text-base">
                          <SelectValue placeholder="Select brand..." />
                        </SelectTrigger>
                        <SelectContent>
                          {STOVE_BRANDS.map(brand => (
                            <SelectItem key={brand.name} value={brand.name} className="h-11">{brand.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Model Number */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model Number</Label>
                      <Input
                        placeholder="e.g., RFL-101, GS-2000..."
                        value={stoveModel}
                        onChange={(e) => setStoveModel(e.target.value)}
                        className="h-12 mt-1.5 text-base"
                      />
                    </div>

                    {/* Burner Type */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Burner Type</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1.5">
                        <button
                          type="button"
                          className={`h-12 rounded-lg border-2 font-medium transition-all ${
                            stoveBurnerType === 'single' 
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300' 
                              : 'border-muted hover:border-orange-300'
                          }`}
                          onClick={() => setStoveBurnerType('single')}
                        >
                          Single
                        </button>
                        <button
                          type="button"
                          className={`h-12 rounded-lg border-2 font-medium transition-all ${
                            stoveBurnerType === 'double' 
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-300' 
                              : 'border-muted hover:border-orange-300'
                          }`}
                          onClick={() => setStoveBurnerType('double')}
                        >
                          Double
                        </button>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Number of Stoves</Label>
                      <div className="flex items-center gap-3 mt-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-xl"
                          onClick={() => setStoveQuantity(Math.max(1, stoveQuantity - 1))}
                        >
                          <Minus className="h-5 w-5" />
                        </Button>
                        <Input
                          type="number"
                          value={stoveQuantity}
                          onChange={(e) => setStoveQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-12 text-center font-bold text-xl flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-xl"
                          onClick={() => setStoveQuantity(stoveQuantity + 1)}
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Total Amount */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="Enter total amount..."
                        value={stoveTotalAmount || ''}
                        onChange={(e) => setStoveTotalAmount(parseFloat(e.target.value) || 0)}
                        className="h-14 mt-1.5 text-xl font-semibold"
                      />
                    </div>

                    {/* Calculated Price */}
                    {stoveTotalAmount > 0 && stoveQuantity > 0 && (
                      <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-xl border-2 border-orange-200 dark:border-orange-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="h-5 w-5 text-orange-600" />
                          <span className="text-sm font-semibold text-orange-700 dark:text-orange-300">Auto-calculated</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-muted-foreground">Per Stove:</span>
                          <span className="text-2xl font-bold text-orange-600">{BANGLADESHI_CURRENCY_SYMBOL}{stoveCompanyPrice.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5" />
                          Updates Product Pricing automatically
                        </p>
                      </div>
                    )}

                    {/* Add Button */}
                    <Button
                      className="w-full h-14 text-base bg-orange-500 hover:bg-orange-600 rounded-xl"
                      disabled={!stoveBrand || !stoveModel || stoveQuantity <= 0 || stoveTotalAmount <= 0}
                      onClick={addStoveToCart}
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </ScrollArea>
              ) : productType === 'regulator' ? (
                <ScrollArea className={isMobile ? "h-[calc(100vh-320px)]" : "h-[400px]"}>
                  <div className="space-y-4 pr-2">
                    {/* Brand Name */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Brand Name</Label>
                      <Select value={regulatorBrand} onValueChange={setRegulatorBrand}>
                        <SelectTrigger className="h-12 mt-1.5 text-base">
                          <SelectValue placeholder="Select brand..." />
                        </SelectTrigger>
                        <SelectContent>
                          {REGULATOR_BRANDS.map(brand => (
                            <SelectItem key={brand.name} value={brand.name} className="h-11">{brand.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Valve Type */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valve Type</Label>
                      <div className="grid grid-cols-2 gap-2 mt-1.5">
                        <button
                          type="button"
                          className={`h-12 rounded-lg border-2 font-medium transition-all ${
                            regulatorType === '22mm' 
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300' 
                              : 'border-muted hover:border-purple-300'
                          }`}
                          onClick={() => setRegulatorType('22mm')}
                        >
                          22mm
                        </button>
                        <button
                          type="button"
                          className={`h-12 rounded-lg border-2 font-medium transition-all ${
                            regulatorType === '20mm' 
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300' 
                              : 'border-muted hover:border-purple-300'
                          }`}
                          onClick={() => setRegulatorType('20mm')}
                        >
                          20mm
                        </button>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Number of Regulators</Label>
                      <div className="flex items-center gap-3 mt-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-xl"
                          onClick={() => setRegulatorQuantity(Math.max(1, regulatorQuantity - 1))}
                        >
                          <Minus className="h-5 w-5" />
                        </Button>
                        <Input
                          type="number"
                          value={regulatorQuantity}
                          onChange={(e) => setRegulatorQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-12 text-center font-bold text-xl flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-12 w-12 rounded-xl"
                          onClick={() => setRegulatorQuantity(regulatorQuantity + 1)}
                        >
                          <Plus className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    {/* Total Amount */}
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="Enter total amount..."
                        value={regulatorTotalAmount || ''}
                        onChange={(e) => setRegulatorTotalAmount(parseFloat(e.target.value) || 0)}
                        className="h-14 mt-1.5 text-xl font-semibold"
                      />
                    </div>

                    {/* Calculated Price */}
                    {regulatorTotalAmount > 0 && regulatorQuantity > 0 && (
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/30 dark:to-violet-950/30 rounded-xl border-2 border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="h-5 w-5 text-purple-600" />
                          <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Auto-calculated</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-muted-foreground">Per Regulator:</span>
                          <span className="text-2xl font-bold text-purple-600">{BANGLADESHI_CURRENCY_SYMBOL}{regulatorCompanyPrice.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5" />
                          Updates Product Pricing automatically
                        </p>
                      </div>
                    )}

                    {/* Add Button */}
                    <Button
                      className="w-full h-14 text-base bg-purple-500 hover:bg-purple-600 rounded-xl"
                      disabled={!regulatorBrand || regulatorQuantity <= 0 || regulatorTotalAmount <= 0}
                      onClick={addRegulatorToCart}
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add to Cart
                    </Button>
                  </div>
                </ScrollArea>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* ===== PART 3: PURCHASE SUMMARY ===== */}
        {(!isMobile || currentStep === 3) && (
          <Card className={`border-2 transition-all ${currentStep === 3 || purchaseItems.length > 0 ? 'border-indigo-500 shadow-lg' : 'border-muted'}`}>
            <CardHeader className="py-3 px-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${purchaseItems.length > 0 ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground'}`}>3</div>
                  Purchase Summary
                </span>
                {purchaseItems.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-8 text-destructive hover:bg-destructive/10" onClick={clearCart}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              {purchaseItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                  <ShoppingBag className="h-16 w-16 opacity-20 mb-3" />
                  <p className="text-sm font-medium">Your cart is empty</p>
                  <p className="text-xs mt-1">Add products to see summary</p>
                  {isMobile && (
                    <Button variant="outline" className="mt-4" onClick={() => setCurrentStep(1)}>
                      Start Shopping
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Cart Items */}
                  <ScrollArea className={isMobile ? "h-[calc(100vh-480px)] min-h-[150px]" : "h-[200px]"}>
                    <div className="space-y-2">
                      {purchaseItems.map(item => (
                        <div key={item.id} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: item.brandColor || (item.type === 'stove' ? '#f97316' : item.type === 'regulator' ? '#8b5cf6' : '#6366f1') }}
                          >
                            {item.type === 'lpg' && <Cylinder className="h-5 w-5 text-white" />}
                            {item.type === 'stove' && <ChefHat className="h-5 w-5 text-white" />}
                            {item.type === 'regulator' && <Gauge className="h-5 w-5 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.details}</p>
                          </div>
                          <div className="flex items-center gap-1 bg-background rounded-lg p-1">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateItemQuantity(item.id, -1)}>
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => updateItemQuantity(item.id, 1)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-right min-w-[70px]">
                            <p className="font-bold text-sm text-indigo-600">
                              {BANGLADESHI_CURRENCY_SYMBOL}{(item.companyPrice * item.quantity).toLocaleString()}
                            </p>
                          </div>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeItem(item.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <Separator />

                  {/* Supplier Selection */}
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Supplier</Label>
                    {!showCustomSupplierInput ? (
                      <Select value={supplierName} onValueChange={(val) => {
                        if (val === 'custom') {
                          setShowCustomSupplierInput(true);
                        } else {
                          setSupplierName(val);
                        }
                      }}>
                        <SelectTrigger className="h-11 mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPLIERS.map(s => (
                            <SelectItem key={s} value={s} className="h-10">{s}</SelectItem>
                          ))}
                          <SelectItem value="custom" className="h-10">+ Add Custom Supplier</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          placeholder="Custom supplier name..."
                          value={customSupplier}
                          onChange={(e) => setCustomSupplier(e.target.value)}
                          className="h-11"
                        />
                        <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setShowCustomSupplierInput(false)}>
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="p-4 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Purchase</span>
                      <span className="text-3xl font-bold text-indigo-600">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-14 text-base rounded-xl"
                      onClick={() => handleCompletePurchase('pending')}
                      disabled={processing}
                    >
                      {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5 mr-2" />}
                      Credit
                    </Button>
                    <Button
                      className="h-14 text-base bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                      onClick={() => handleCompletePurchase('completed')}
                      disabled={processing}
                    >
                      {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                      Complete
                    </Button>
                  </div>

                  {/* Add More Button on Mobile */}
                  {isMobile && (
                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-xl"
                      onClick={() => setCurrentStep(1)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add More Products
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== RECENT PURCHASES (Void within 5 mins) ===== */}
      {recentPurchases.length > 0 && (!isMobile || currentStep === 1) && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Recent Purchases
              <Badge variant="secondary" className="ml-auto text-xs">5 min void</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-2">
              {recentPurchases.map(purchase => (
                <div key={purchase.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{purchase.transactionNumber}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {purchase.supplierName}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-indigo-600">{BANGLADESHI_CURRENCY_SYMBOL}{purchase.total.toLocaleString()}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-destructive hover:bg-destructive/10"
                      onClick={() => { setPurchaseToVoid(purchase); setShowVoidDialog(true); }}
                    >
                      <Undo2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== VOID DIALOG ===== */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Void Purchase?</DialogTitle>
            <DialogDescription>
              This will reverse inventory changes and remove the expense entry for {purchaseToVoid?.transactionNumber}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" className="h-11" onClick={() => setShowVoidDialog(false)}>Cancel</Button>
            <Button variant="destructive" className="h-11" onClick={handleVoidPurchase}>Void Purchase</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POBModule;
