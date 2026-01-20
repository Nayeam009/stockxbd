import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingBag, 
  Loader2,
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
  Calculator,
  Sparkles,
  Save,
  ArrowLeftRight,
  Fuel
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
  
  // ===== ACTIVE TABLE (like POS) =====
  const [activeTab, setActiveTab] = useState<'lpg' | 'stove' | 'regulator'>('lpg');
  
  // ===== LPG CONFIGURATION STATE =====
  const [lpgBrandName, setLpgBrandName] = useState("");
  const [lpgCylinderType, setLpgCylinderType] = useState<'refill' | 'package'>("refill");
  const [lpgWeight, setLpgWeight] = useState("12kg");
  const [lpgValveSize, setLpgValveSize] = useState("22mm");
  const [lpgQuantity, setLpgQuantity] = useState(1);
  const [lpgTotalDO, setLpgTotalDO] = useState(0);
  const [customLpgBrand, setCustomLpgBrand] = useState("");
  const [showCustomLpgBrand, setShowCustomLpgBrand] = useState(false);
  const [customLpgWeight, setCustomLpgWeight] = useState("");
  const [showCustomLpgWeight, setShowCustomLpgWeight] = useState(false);
  
  // ===== STOVE CONFIGURATION STATE =====
  const [stoveBrand, setStoveBrand] = useState("");
  const [stoveModel, setStoveModel] = useState("");
  const [stoveBurnerType, setStoveBurnerType] = useState<'single' | 'double'>("single");
  const [stoveQuantity, setStoveQuantity] = useState(1);
  const [stoveTotalAmount, setStoveTotalAmount] = useState(0);
  const [customStoveBrand, setCustomStoveBrand] = useState("");
  const [showCustomStoveBrand, setShowCustomStoveBrand] = useState(false);
  
  // ===== REGULATOR CONFIGURATION STATE =====
  const [regulatorBrand, setRegulatorBrand] = useState("");
  const [regulatorType, setRegulatorType] = useState("22mm");
  const [regulatorQuantity, setRegulatorQuantity] = useState(1);
  const [regulatorTotalAmount, setRegulatorTotalAmount] = useState(0);
  const [customRegulatorBrand, setCustomRegulatorBrand] = useState("");
  const [showCustomRegulatorBrand, setShowCustomRegulatorBrand] = useState(false);
  const [customRegulatorType, setCustomRegulatorType] = useState("");
  const [showCustomRegulatorType, setShowCustomRegulatorType] = useState(false);
  
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

  // ============= GET EFFECTIVE VALUES (custom or selected) =============
  const getEffectiveLpgBrand = () => showCustomLpgBrand ? customLpgBrand : lpgBrandName;
  const getEffectiveLpgWeight = () => showCustomLpgWeight ? customLpgWeight : lpgWeight;
  const getEffectiveStoveBrand = () => showCustomStoveBrand ? customStoveBrand : stoveBrand;
  const getEffectiveRegulatorBrand = () => showCustomRegulatorBrand ? customRegulatorBrand : regulatorBrand;
  const getEffectiveRegulatorType = () => showCustomRegulatorType ? customRegulatorType : regulatorType;
  const getEffectiveSupplier = () => showCustomSupplierInput ? customSupplier : supplierName;

  // ============= ADD PRODUCT TO CART & UPDATE PRICING =============
  const addLPGToCart = async () => {
    const effectiveBrand = getEffectiveLpgBrand();
    const effectiveWeight = getEffectiveLpgWeight();
    
    if (!effectiveBrand || lpgQuantity <= 0 || lpgTotalDO <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const companyPrice = lpgCompanyPrice;
    const brandColor = getBrandColor(effectiveBrand);

    // Find or create brand in inventory
    let brandId = "";
    const existingBrand = lpgBrands.find(b => 
      b.name.toLowerCase() === effectiveBrand.toLowerCase() && 
      b.size === lpgValveSize && 
      b.weight === effectiveWeight
    );

    if (existingBrand) {
      brandId = existingBrand.id;
    } else {
      // Create new brand entry
      const { data: newBrand, error } = await supabase
        .from('lpg_brands')
        .insert({
          name: effectiveBrand,
          size: lpgValveSize,
          weight: effectiveWeight,
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
    await updateProductPricing('lpg', effectiveBrand, companyPrice, {
      brandId,
      weight: effectiveWeight,
      valveSize: lpgValveSize,
      cylinderType: lpgCylinderType
    });

    // Add to cart
    const itemId = `lpg-${Date.now()}`;
    const newItem: PurchaseItem = {
      id: itemId,
      type: 'lpg',
      name: effectiveBrand,
      details: `${effectiveWeight} • ${lpgValveSize} • ${lpgCylinderType === 'refill' ? 'Refill' : 'Package'}`,
      companyPrice,
      quantity: lpgQuantity,
      cylinderType: lpgCylinderType,
      brandId,
      weight: effectiveWeight,
      valveSize: lpgValveSize,
      brandColor
    };

    setPurchaseItems([...purchaseItems, newItem]);
    toast({ 
      title: "Added to cart!", 
      description: `${lpgQuantity}x ${effectiveBrand} @ ${BANGLADESHI_CURRENCY_SYMBOL}${companyPrice}/pc` 
    });

    // Reset form
    resetLPGForm();
  };

  const addStoveToCart = async () => {
    const effectiveBrand = getEffectiveStoveBrand();
    
    if (!effectiveBrand || !stoveModel || stoveQuantity <= 0 || stoveTotalAmount <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const companyPrice = stoveCompanyPrice;
    const burners = stoveBurnerType === 'single' ? 1 : 2;

    // Find or create stove in inventory
    let stoveId = "";
    const existingStove = stoves.find(s => 
      s.brand.toLowerCase() === effectiveBrand.toLowerCase() && 
      s.model.toLowerCase() === stoveModel.toLowerCase()
    );

    if (existingStove) {
      stoveId = existingStove.id;
    } else {
      const { data: newStove, error } = await supabase
        .from('stoves')
        .insert({
          brand: effectiveBrand,
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
    await updateProductPricing('stove', `${effectiveBrand} ${stoveModel}`, companyPrice, {
      burnerType: stoveBurnerType
    });

    const newItem: PurchaseItem = {
      id: `stove-${Date.now()}`,
      type: 'stove',
      name: `${effectiveBrand} ${stoveModel}`,
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
      description: `${stoveQuantity}x ${effectiveBrand} ${stoveModel} @ ${BANGLADESHI_CURRENCY_SYMBOL}${companyPrice}/pc` 
    });

    resetStoveForm();
  };

  const addRegulatorToCart = async () => {
    const effectiveBrand = getEffectiveRegulatorBrand();
    const effectiveType = getEffectiveRegulatorType();
    
    if (!effectiveBrand || regulatorQuantity <= 0 || regulatorTotalAmount <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const companyPrice = regulatorCompanyPrice;

    // Find or create regulator in inventory
    let regId = "";
    const existingReg = regulators.find(r => 
      r.brand.toLowerCase() === effectiveBrand.toLowerCase() && 
      r.type === effectiveType
    );

    if (existingReg) {
      regId = existingReg.id;
    } else {
      const { data: newReg, error } = await supabase
        .from('regulators')
        .insert({
          brand: effectiveBrand,
          type: effectiveType,
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
    await updateProductPricing('regulator', `${effectiveBrand} ${effectiveType}`, companyPrice, {
      regulatorType: effectiveType
    });

    const newItem: PurchaseItem = {
      id: `regulator-${Date.now()}`,
      type: 'regulator',
      name: `${effectiveBrand} Regulator`,
      details: `${effectiveType} Valve`,
      companyPrice,
      quantity: regulatorQuantity,
      regulatorId: regId,
      regulatorType: effectiveType
    };

    setPurchaseItems([...purchaseItems, newItem]);
    toast({ 
      title: "Added to cart!", 
      description: `${regulatorQuantity}x ${effectiveBrand} @ ${BANGLADESHI_CURRENCY_SYMBOL}${companyPrice}/pc` 
    });

    resetRegulatorForm();
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

        const { data: existingPrice } = await supabase
          .from('product_prices')
          .select('id')
          .eq('brand_id', options.brandId)
          .eq('variant', variant)
          .eq('product_type', 'lpg')
          .maybeSingle();

        if (existingPrice) {
          const updateField = options.cylinderType === 'package' ? 'package_price' : 'company_price';
          await supabase
            .from('product_prices')
            .update({ [updateField]: companyPrice, updated_at: new Date().toISOString() })
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
    setCustomLpgBrand("");
    setShowCustomLpgBrand(false);
    setCustomLpgWeight("");
    setShowCustomLpgWeight(false);
  };

  const resetStoveForm = () => {
    setStoveBrand("");
    setStoveModel("");
    setStoveBurnerType("single");
    setStoveQuantity(1);
    setStoveTotalAmount(0);
    setCustomStoveBrand("");
    setShowCustomStoveBrand(false);
  };

  const resetRegulatorForm = () => {
    setRegulatorBrand("");
    setRegulatorType("22mm");
    setRegulatorQuantity(1);
    setRegulatorTotalAmount(0);
    setCustomRegulatorBrand("");
    setShowCustomRegulatorBrand(false);
    setCustomRegulatorType("");
    setShowCustomRegulatorType(false);
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

      const finalSupplier = getEffectiveSupplier();

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

  const weightOptions = lpgValveSize === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM;

  // ============= LOADING STATE =============
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-2 text-muted-foreground">Loading POB...</span>
      </div>
    );
  }

  // ============= RENDER =============
  return (
    <div className="space-y-3 pb-28 lg:pb-4">
      {/* ===== HEADER ===== */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <ArrowDownToLine className="h-4 w-4 text-white" />
          </div>
          <h1 className="text-lg font-bold">Point of Buy</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge className="bg-indigo-600 text-white h-8 px-3 text-sm">
            <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
            Cart ({purchaseItemsCount})
          </Badge>
          {purchaseItems.length > 0 && (
            <Button onClick={clearCart} variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ===== PURCHASE CART TABLE (Like POS Sale Table) ===== */}
      <Card className="border-2 border-indigo-200 dark:border-indigo-900">
        <CardHeader className="py-2 px-3 bg-indigo-50 dark:bg-indigo-950/30">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-indigo-600" />
              Purchase Cart
            </span>
            <div className="flex items-center gap-2">
              <Badge className="bg-indigo-600">{purchaseItemsCount}</Badge>
              {total > 0 && (
                <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                  {BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}
                </span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2">
          <ScrollArea className="h-[120px] sm:h-[140px]">
            {purchaseItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-6">
                <ShoppingBag className="h-8 w-8 opacity-30 mb-2" />
                <p className="text-xs">Add products below to cart</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {purchaseItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border">
                    <div 
                      className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: item.brandColor ? `${item.brandColor}20` : '#e0e7ff' }}
                    >
                      {item.type === 'lpg' && <Cylinder className="h-4 w-4" style={{ color: item.brandColor || '#6366f1' }} />}
                      {item.type === 'stove' && <ChefHat className="h-4 w-4 text-amber-600" />}
                      {item.type === 'regulator' && <Gauge className="h-4 w-4 text-blue-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.details}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => updateItemQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => updateItemQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{BANGLADESHI_CURRENCY_SYMBOL}{(item.companyPrice * item.quantity).toLocaleString()}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => removeItem(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ===== PRODUCT TYPE TABS (Like POS) ===== */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-11">
          <TabsTrigger value="lpg" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            <Fuel className="h-4 w-4 mr-2" />
            LPG Cylinder
          </TabsTrigger>
          <TabsTrigger value="stove" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
            <ChefHat className="h-4 w-4 mr-2" />
            Gas Stove
          </TabsTrigger>
          <TabsTrigger value="regulator" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            <Gauge className="h-4 w-4 mr-2" />
            Regulator
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ===== MAIN CONTENT: 2 COLUMN LAYOUT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        
        {/* LEFT: Product Configuration Form */}
        <div className="lg:col-span-2">
          {/* LPG FORM */}
          {activeTab === 'lpg' && (
            <Card className="border-2 border-indigo-200 dark:border-indigo-900">
              <CardHeader className="py-2 px-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Fuel className="h-4 w-4 text-indigo-600" />
                  LPG Cylinder Purchase
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                {/* Valve Size */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={lpgValveSize === "22mm" ? "default" : "outline"}
                    className={`h-10 ${lpgValveSize === "22mm" ? "bg-indigo-600" : ""}`}
                    onClick={() => { setLpgValveSize("22mm"); setLpgWeight("12kg"); }}
                  >
                    22mm Valve
                  </Button>
                  <Button
                    variant={lpgValveSize === "20mm" ? "default" : "outline"}
                    className={`h-10 ${lpgValveSize === "20mm" ? "bg-indigo-600" : ""}`}
                    onClick={() => { setLpgValveSize("20mm"); setLpgWeight("12kg"); }}
                  >
                    20mm Valve
                  </Button>
                </div>

                {/* Cylinder Type */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={lpgCylinderType === "refill" ? "default" : "outline"}
                    className={`h-10 ${lpgCylinderType === "refill" ? "bg-emerald-600" : ""}`}
                    onClick={() => setLpgCylinderType("refill")}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Refill
                  </Button>
                  <Button
                    variant={lpgCylinderType === "package" ? "default" : "outline"}
                    className={`h-10 ${lpgCylinderType === "package" ? "bg-amber-500" : ""}`}
                    onClick={() => setLpgCylinderType("package")}
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Package (New)
                  </Button>
                </div>

                {/* Brand Selection with Custom Option */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Brand Name</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-indigo-600"
                      onClick={() => setShowCustomLpgBrand(!showCustomLpgBrand)}
                    >
                      {showCustomLpgBrand ? "Select from list" : "+ Custom Brand"}
                    </Button>
                  </div>
                  {showCustomLpgBrand ? (
                    <Input
                      placeholder="Enter custom brand name..."
                      value={customLpgBrand}
                      onChange={(e) => setCustomLpgBrand(e.target.value)}
                      className="h-10"
                    />
                  ) : (
                    <Select value={lpgBrandName} onValueChange={setLpgBrandName}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select brand..." />
                      </SelectTrigger>
                      <SelectContent>
                        {lpgBrandOptions.map(brand => (
                          <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Weight Selection with Custom Option */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Weight</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-indigo-600"
                      onClick={() => setShowCustomLpgWeight(!showCustomLpgWeight)}
                    >
                      {showCustomLpgWeight ? "Select from list" : "+ Custom Weight"}
                    </Button>
                  </div>
                  {showCustomLpgWeight ? (
                    <Input
                      placeholder="e.g., 15kg"
                      value={customLpgWeight}
                      onChange={(e) => setCustomLpgWeight(e.target.value)}
                      className="h-10"
                    />
                  ) : (
                    <Select value={lpgWeight} onValueChange={setLpgWeight}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {weightOptions.map(w => (
                          <SelectItem key={w} value={w}>{w}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Quantity & Total DO */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Quantity</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={() => setLpgQuantity(Math.max(1, lpgQuantity - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={lpgQuantity}
                        onChange={(e) => setLpgQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-10 text-center"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={() => setLpgQuantity(lpgQuantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Total D.O. Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                    <Input
                      type="number"
                      placeholder="Total amount paid..."
                      value={lpgTotalDO || ""}
                      onChange={(e) => setLpgTotalDO(parseInt(e.target.value) || 0)}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Auto-calculated Company Price */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-medium">Company Price (per unit)</span>
                  </div>
                  <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                    {BANGLADESHI_CURRENCY_SYMBOL}{lpgCompanyPrice.toLocaleString()}
                  </span>
                </div>

                {/* Add to Cart Button */}
                <Button
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium"
                  onClick={addLPGToCart}
                  disabled={!getEffectiveLpgBrand() || lpgQuantity <= 0 || lpgTotalDO <= 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add LPG to Cart
                </Button>
              </CardContent>
            </Card>
          )}

          {/* STOVE FORM */}
          {activeTab === 'stove' && (
            <Card className="border-2 border-amber-200 dark:border-amber-900">
              <CardHeader className="py-2 px-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ChefHat className="h-4 w-4 text-amber-600" />
                  Gas Stove Purchase
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                {/* Brand Selection with Custom Option */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Brand Name</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-amber-600"
                      onClick={() => setShowCustomStoveBrand(!showCustomStoveBrand)}
                    >
                      {showCustomStoveBrand ? "Select from list" : "+ Custom Brand"}
                    </Button>
                  </div>
                  {showCustomStoveBrand ? (
                    <Input
                      placeholder="Enter custom brand name..."
                      value={customStoveBrand}
                      onChange={(e) => setCustomStoveBrand(e.target.value)}
                      className="h-10"
                    />
                  ) : (
                    <Select value={stoveBrand} onValueChange={setStoveBrand}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select brand..." />
                      </SelectTrigger>
                      <SelectContent>
                        {STOVE_BRANDS.map(brand => (
                          <SelectItem key={brand.name} value={brand.name}>{brand.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Model Number */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Model Number</Label>
                  <Input
                    placeholder="e.g., RFL-101, Walton GS-01..."
                    value={stoveModel}
                    onChange={(e) => setStoveModel(e.target.value)}
                    className="h-10"
                  />
                </div>

                {/* Burner Type */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={stoveBurnerType === "single" ? "default" : "outline"}
                    className={`h-10 ${stoveBurnerType === "single" ? "bg-amber-500" : ""}`}
                    onClick={() => setStoveBurnerType("single")}
                  >
                    Single Burner
                  </Button>
                  <Button
                    variant={stoveBurnerType === "double" ? "default" : "outline"}
                    className={`h-10 ${stoveBurnerType === "double" ? "bg-amber-500" : ""}`}
                    onClick={() => setStoveBurnerType("double")}
                  >
                    Double Burner
                  </Button>
                </div>

                {/* Quantity & Total Amount */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Quantity</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={() => setStoveQuantity(Math.max(1, stoveQuantity - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={stoveQuantity}
                        onChange={(e) => setStoveQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-10 text-center"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={() => setStoveQuantity(stoveQuantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Total Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                    <Input
                      type="number"
                      placeholder="Total amount paid..."
                      value={stoveTotalAmount || ""}
                      onChange={(e) => setStoveTotalAmount(parseInt(e.target.value) || 0)}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Auto-calculated Company Price */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/50 dark:to-orange-900/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium">Company Price (per unit)</span>
                  </div>
                  <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
                    {BANGLADESHI_CURRENCY_SYMBOL}{stoveCompanyPrice.toLocaleString()}
                  </span>
                </div>

                {/* Add to Cart Button */}
                <Button
                  className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium"
                  onClick={addStoveToCart}
                  disabled={!getEffectiveStoveBrand() || !stoveModel || stoveQuantity <= 0 || stoveTotalAmount <= 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stove to Cart
                </Button>
              </CardContent>
            </Card>
          )}

          {/* REGULATOR FORM */}
          {activeTab === 'regulator' && (
            <Card className="border-2 border-blue-200 dark:border-blue-900">
              <CardHeader className="py-2 px-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Gauge className="h-4 w-4 text-blue-600" />
                  Regulator Purchase
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-3">
                {/* Brand Selection with Custom Option */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Brand Name</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-blue-600"
                      onClick={() => setShowCustomRegulatorBrand(!showCustomRegulatorBrand)}
                    >
                      {showCustomRegulatorBrand ? "Select from list" : "+ Custom Brand"}
                    </Button>
                  </div>
                  {showCustomRegulatorBrand ? (
                    <Input
                      placeholder="Enter custom brand name..."
                      value={customRegulatorBrand}
                      onChange={(e) => setCustomRegulatorBrand(e.target.value)}
                      className="h-10"
                    />
                  ) : (
                    <Select value={regulatorBrand} onValueChange={setRegulatorBrand}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select brand..." />
                      </SelectTrigger>
                      <SelectContent>
                        {REGULATOR_BRANDS.map(brand => (
                          <SelectItem key={brand.name} value={brand.name}>{brand.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Valve Size with Custom Option */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Valve Size</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-blue-600"
                      onClick={() => setShowCustomRegulatorType(!showCustomRegulatorType)}
                    >
                      {showCustomRegulatorType ? "Select from list" : "+ Custom Size"}
                    </Button>
                  </div>
                  {showCustomRegulatorType ? (
                    <Input
                      placeholder="e.g., 25mm..."
                      value={customRegulatorType}
                      onChange={(e) => setCustomRegulatorType(e.target.value)}
                      className="h-10"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={regulatorType === "22mm" ? "default" : "outline"}
                        className={`h-10 ${regulatorType === "22mm" ? "bg-blue-600" : ""}`}
                        onClick={() => setRegulatorType("22mm")}
                      >
                        22mm Valve
                      </Button>
                      <Button
                        variant={regulatorType === "20mm" ? "default" : "outline"}
                        className={`h-10 ${regulatorType === "20mm" ? "bg-blue-600" : ""}`}
                        onClick={() => setRegulatorType("20mm")}
                      >
                        20mm Valve
                      </Button>
                    </div>
                  )}
                </div>

                {/* Quantity & Total Amount */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Quantity</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={() => setRegulatorQuantity(Math.max(1, regulatorQuantity - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={regulatorQuantity}
                        onChange={(e) => setRegulatorQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-10 text-center"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={() => setRegulatorQuantity(regulatorQuantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Total Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                    <Input
                      type="number"
                      placeholder="Total amount paid..."
                      value={regulatorTotalAmount || ""}
                      onChange={(e) => setRegulatorTotalAmount(parseInt(e.target.value) || 0)}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Auto-calculated Company Price */}
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Company Price (per unit)</span>
                  </div>
                  <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                    {BANGLADESHI_CURRENCY_SYMBOL}{regulatorCompanyPrice.toLocaleString()}
                  </span>
                </div>

                {/* Add to Cart Button */}
                <Button
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium"
                  onClick={addRegulatorToCart}
                  disabled={!getEffectiveRegulatorBrand() || regulatorQuantity <= 0 || regulatorTotalAmount <= 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Regulator to Cart
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RIGHT: Supplier & Checkout */}
        <div className="space-y-3">
          {/* Supplier Selection */}
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Supplier
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Select Supplier</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-indigo-600"
                  onClick={() => setShowCustomSupplierInput(!showCustomSupplierInput)}
                >
                  {showCustomSupplierInput ? "Select from list" : "+ Custom"}
                </Button>
              </div>
              {showCustomSupplierInput ? (
                <Input
                  placeholder="Enter supplier name..."
                  value={customSupplier}
                  onChange={(e) => setCustomSupplier(e.target.value)}
                  className="h-10"
                />
              ) : (
                <Select value={supplierName} onValueChange={setSupplierName}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPLIERS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Order Summary & Checkout */}
          <Card className="border-2 border-indigo-200 dark:border-indigo-900">
            <CardHeader className="py-2 px-3 bg-indigo-50 dark:bg-indigo-950/30">
              <CardTitle className="text-sm">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="flex justify-between text-sm">
                <span>Items</span>
                <span className="font-medium">{purchaseItemsCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-medium">{BANGLADESHI_CURRENCY_SYMBOL}{subtotal.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total D.O.</span>
                <span className="text-indigo-600">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 gap-2 pt-2">
                <Button
                  className="h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium"
                  onClick={() => handleCompletePurchase('completed')}
                  disabled={processing || purchaseItems.length === 0}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Complete Purchase (Paid)
                </Button>
                <Button
                  variant="outline"
                  className="h-12 border-amber-500 text-amber-700 hover:bg-amber-50"
                  onClick={() => handleCompletePurchase('pending')}
                  disabled={processing || purchaseItems.length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Credit
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Purchases */}
          {recentPurchases.length > 0 && (
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Recent (5 min void window)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[120px]">
                  <div className="space-y-1.5">
                    {recentPurchases.map(purchase => (
                      <div key={purchase.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                        <div>
                          <p className="font-medium">{purchase.transactionNumber}</p>
                          <p className="text-muted-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{purchase.total.toLocaleString()}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive"
                          onClick={() => {
                            setPurchaseToVoid(purchase);
                            setShowVoidDialog(true);
                          }}
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ===== VOID DIALOG ===== */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Undo2 className="h-5 w-5" />
              Void Purchase
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to void this purchase? This will reverse all stock and expense entries.
            </DialogDescription>
          </DialogHeader>
          {purchaseToVoid && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{purchaseToVoid.transactionNumber}</p>
              <p className="text-sm text-muted-foreground">{purchaseToVoid.supplierName}</p>
              <p className="text-lg font-bold text-destructive mt-1">
                {BANGLADESHI_CURRENCY_SYMBOL}{purchaseToVoid.total.toLocaleString()}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowVoidDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleVoidPurchase}>
              Confirm Void
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
