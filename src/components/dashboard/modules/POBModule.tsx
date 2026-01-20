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
  Undo2,
  RotateCcw,
  Calculator,
  Sparkles,
  Save,
  Fuel,
  ArrowDown
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
  
  // ===== ACTIVE TAB =====
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading POB...</p>
        </div>
      </div>
    );
  }

  // ============= RENDER =============
  return (
    <div className="min-h-screen pb-32 lg:pb-6">
      {/* ===== HEADER ===== */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border -mx-3 sm:-mx-4 px-3 sm:px-4 py-3 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
              <ArrowDown className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Point of Buy</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Purchase inventory from suppliers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {purchaseItems.length > 0 && (
              <Button onClick={clearCart} variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Badge className="h-9 px-3 bg-primary text-primary-foreground font-medium gap-1.5">
              <ShoppingBag className="h-4 w-4" />
              <span>{purchaseItemsCount}</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* ===== MAIN LAYOUT ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: Product Selection */}
        <div className="lg:col-span-5 space-y-4">
          {/* Product Type Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lpg' | 'stove' | 'regulator')} className="w-full">
            <TabsList className="w-full h-12 p-1 bg-muted/50 grid grid-cols-3 gap-1">
              <TabsTrigger 
                value="lpg" 
                className="h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg gap-1.5 text-xs sm:text-sm font-medium"
              >
                <Cylinder className="h-4 w-4" />
                <span className="hidden xs:inline">LPG</span>
              </TabsTrigger>
              <TabsTrigger 
                value="stove" 
                className="h-full data-[state=active]:bg-warning data-[state=active]:text-warning-foreground rounded-lg gap-1.5 text-xs sm:text-sm font-medium"
              >
                <ChefHat className="h-4 w-4" />
                <span className="hidden xs:inline">Stove</span>
              </TabsTrigger>
              <TabsTrigger 
                value="regulator" 
                className="h-full data-[state=active]:bg-info data-[state=active]:text-info-foreground rounded-lg gap-1.5 text-xs sm:text-sm font-medium"
              >
                <Gauge className="h-4 w-4" />
                <span className="hidden xs:inline">Regulator</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* LPG FORM */}
          {activeTab === 'lpg' && (
            <Card className="border-primary/20 shadow-sm">
              <CardHeader className="py-3 px-4 bg-primary/5 border-b border-primary/10">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Fuel className="h-5 w-5 text-primary" />
                  LPG Cylinder Purchase
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Valve Size */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Valve Size</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={lpgValveSize === "22mm" ? "default" : "outline"}
                      className="h-11 font-medium"
                      onClick={() => { setLpgValveSize("22mm"); setLpgWeight("12kg"); }}
                    >
                      22mm
                    </Button>
                    <Button
                      type="button"
                      variant={lpgValveSize === "20mm" ? "default" : "outline"}
                      className="h-11 font-medium"
                      onClick={() => { setLpgValveSize("20mm"); setLpgWeight("12kg"); }}
                    >
                      20mm
                    </Button>
                  </div>
                </div>

                {/* Cylinder Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={lpgCylinderType === "refill" ? "success" : "outline"}
                      className="h-11 font-medium gap-2"
                      onClick={() => setLpgCylinderType("refill")}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Refill
                    </Button>
                    <Button
                      type="button"
                      variant={lpgCylinderType === "package" ? "warning" : "outline"}
                      className="h-11 font-medium gap-2"
                      onClick={() => setLpgCylinderType("package")}
                    >
                      <Package className="h-4 w-4" />
                      Package
                    </Button>
                  </div>
                </div>

                {/* Brand Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Brand Name</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-primary hover:text-primary"
                      onClick={() => setShowCustomLpgBrand(!showCustomLpgBrand)}
                    >
                      {showCustomLpgBrand ? "← Select" : "+ Custom"}
                    </Button>
                  </div>
                  {showCustomLpgBrand ? (
                    <Input
                      placeholder="Enter custom brand name..."
                      value={customLpgBrand}
                      onChange={(e) => setCustomLpgBrand(e.target.value)}
                      className="h-11"
                    />
                  ) : (
                    <Select value={lpgBrandName} onValueChange={setLpgBrandName}>
                      <SelectTrigger className="h-11">
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

                {/* Weight Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Weight</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-primary hover:text-primary"
                      onClick={() => setShowCustomLpgWeight(!showCustomLpgWeight)}
                    >
                      {showCustomLpgWeight ? "← Select" : "+ Custom"}
                    </Button>
                  </div>
                  {showCustomLpgWeight ? (
                    <Input
                      placeholder="e.g., 15kg"
                      value={customLpgWeight}
                      onChange={(e) => setCustomLpgWeight(e.target.value)}
                      className="h-11"
                    />
                  ) : (
                    <Select value={lpgWeight} onValueChange={setLpgWeight}>
                      <SelectTrigger className="h-11">
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
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Quantity</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => setLpgQuantity(Math.max(1, lpgQuantity - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={lpgQuantity}
                        onChange={(e) => setLpgQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-11 text-center font-semibold"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => setLpgQuantity(lpgQuantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Total D.O. ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="Amount paid..."
                      value={lpgTotalDO || ""}
                      onChange={(e) => setLpgTotalDO(parseInt(e.target.value) || 0)}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Auto-calculated Company Price */}
                <div className="flex items-center justify-between p-3.5 bg-primary/10 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Unit Price</span>
                  </div>
                  <span className="text-xl font-bold text-primary">
                    {BANGLADESHI_CURRENCY_SYMBOL}{lpgCompanyPrice.toLocaleString()}
                  </span>
                </div>

                {/* Add to Cart Button */}
                <Button
                  type="button"
                  size="lg"
                  className="w-full h-12 font-semibold"
                  onClick={addLPGToCart}
                  disabled={!getEffectiveLpgBrand() || lpgQuantity <= 0 || lpgTotalDO <= 0}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          )}

          {/* STOVE FORM */}
          {activeTab === 'stove' && (
            <Card className="border-warning/20 shadow-sm">
              <CardHeader className="py-3 px-4 bg-warning/5 border-b border-warning/10">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <ChefHat className="h-5 w-5 text-warning" />
                  Gas Stove Purchase
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Brand Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Brand Name</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-warning hover:text-warning"
                      onClick={() => setShowCustomStoveBrand(!showCustomStoveBrand)}
                    >
                      {showCustomStoveBrand ? "← Select" : "+ Custom"}
                    </Button>
                  </div>
                  {showCustomStoveBrand ? (
                    <Input
                      placeholder="Enter custom brand name..."
                      value={customStoveBrand}
                      onChange={(e) => setCustomStoveBrand(e.target.value)}
                      className="h-11"
                    />
                  ) : (
                    <Select value={stoveBrand} onValueChange={setStoveBrand}>
                      <SelectTrigger className="h-11">
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
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Model Number</Label>
                  <Input
                    placeholder="e.g., RFL-101, Walton GS-01..."
                    value={stoveModel}
                    onChange={(e) => setStoveModel(e.target.value)}
                    className="h-11"
                  />
                </div>

                {/* Burner Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Burner Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={stoveBurnerType === "single" ? "warning" : "outline"}
                      className="h-11 font-medium"
                      onClick={() => setStoveBurnerType("single")}
                    >
                      Single Burner
                    </Button>
                    <Button
                      type="button"
                      variant={stoveBurnerType === "double" ? "warning" : "outline"}
                      className="h-11 font-medium"
                      onClick={() => setStoveBurnerType("double")}
                    >
                      Double Burner
                    </Button>
                  </div>
                </div>

                {/* Quantity & Total Amount */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Quantity</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => setStoveQuantity(Math.max(1, stoveQuantity - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={stoveQuantity}
                        onChange={(e) => setStoveQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-11 text-center font-semibold"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => setStoveQuantity(stoveQuantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Total ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="Amount paid..."
                      value={stoveTotalAmount || ""}
                      onChange={(e) => setStoveTotalAmount(parseInt(e.target.value) || 0)}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Auto-calculated Company Price */}
                <div className="flex items-center justify-between p-3.5 bg-warning/10 rounded-xl border border-warning/20">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium text-foreground">Unit Price</span>
                  </div>
                  <span className="text-xl font-bold text-warning">
                    {BANGLADESHI_CURRENCY_SYMBOL}{stoveCompanyPrice.toLocaleString()}
                  </span>
                </div>

                {/* Add to Cart Button */}
                <Button
                  type="button"
                  size="lg"
                  variant="warning"
                  className="w-full h-12 font-semibold"
                  onClick={addStoveToCart}
                  disabled={!getEffectiveStoveBrand() || !stoveModel || stoveQuantity <= 0 || stoveTotalAmount <= 0}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          )}

          {/* REGULATOR FORM */}
          {activeTab === 'regulator' && (
            <Card className="border-info/20 shadow-sm">
              <CardHeader className="py-3 px-4 bg-info/5 border-b border-info/10">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Gauge className="h-5 w-5 text-info" />
                  Regulator Purchase
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Brand Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Brand Name</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-info hover:text-info"
                      onClick={() => setShowCustomRegulatorBrand(!showCustomRegulatorBrand)}
                    >
                      {showCustomRegulatorBrand ? "← Select" : "+ Custom"}
                    </Button>
                  </div>
                  {showCustomRegulatorBrand ? (
                    <Input
                      placeholder="Enter custom brand name..."
                      value={customRegulatorBrand}
                      onChange={(e) => setCustomRegulatorBrand(e.target.value)}
                      className="h-11"
                    />
                  ) : (
                    <Select value={regulatorBrand} onValueChange={setRegulatorBrand}>
                      <SelectTrigger className="h-11">
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

                {/* Valve Size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Valve Size</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-info hover:text-info"
                      onClick={() => setShowCustomRegulatorType(!showCustomRegulatorType)}
                    >
                      {showCustomRegulatorType ? "← Select" : "+ Custom"}
                    </Button>
                  </div>
                  {showCustomRegulatorType ? (
                    <Input
                      placeholder="e.g., 25mm..."
                      value={customRegulatorType}
                      onChange={(e) => setCustomRegulatorType(e.target.value)}
                      className="h-11"
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant={regulatorType === "22mm" ? "info" : "outline"}
                        className="h-11 font-medium"
                        onClick={() => setRegulatorType("22mm")}
                      >
                        22mm
                      </Button>
                      <Button
                        type="button"
                        variant={regulatorType === "20mm" ? "info" : "outline"}
                        className="h-11 font-medium"
                        onClick={() => setRegulatorType("20mm")}
                      >
                        20mm
                      </Button>
                    </div>
                  )}
                </div>

                {/* Quantity & Total Amount */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Quantity</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => setRegulatorQuantity(Math.max(1, regulatorQuantity - 1))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={regulatorQuantity}
                        onChange={(e) => setRegulatorQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-11 text-center font-semibold"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 shrink-0"
                        onClick={() => setRegulatorQuantity(regulatorQuantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Total ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="Amount paid..."
                      value={regulatorTotalAmount || ""}
                      onChange={(e) => setRegulatorTotalAmount(parseInt(e.target.value) || 0)}
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Auto-calculated Company Price */}
                <div className="flex items-center justify-between p-3.5 bg-info/10 rounded-xl border border-info/20">
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-info" />
                    <span className="text-sm font-medium text-foreground">Unit Price</span>
                  </div>
                  <span className="text-xl font-bold text-info">
                    {BANGLADESHI_CURRENCY_SYMBOL}{regulatorCompanyPrice.toLocaleString()}
                  </span>
                </div>

                {/* Add to Cart Button */}
                <Button
                  type="button"
                  size="lg"
                  variant="info"
                  className="w-full h-12 font-semibold"
                  onClick={addRegulatorToCart}
                  disabled={!getEffectiveRegulatorBrand() || regulatorQuantity <= 0 || regulatorTotalAmount <= 0}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* MIDDLE COLUMN: Cart */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="py-3 px-4 bg-primary/5 border-b border-primary/10">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2 font-semibold">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                  Purchase Cart
                </span>
                <Badge className="bg-primary text-primary-foreground">
                  {purchaseItemsCount} items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[280px] sm:h-[340px]">
                {purchaseItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                    <ShoppingBag className="h-12 w-12 opacity-20 mb-3" />
                    <p className="text-sm font-medium">Cart is empty</p>
                    <p className="text-xs">Add products from the left panel</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {purchaseItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: item.brandColor ? `${item.brandColor}20` : 'hsl(var(--primary) / 0.1)' }}
                        >
                          {item.type === 'lpg' && <Cylinder className="h-5 w-5" style={{ color: item.brandColor || 'hsl(var(--primary))' }} />}
                          {item.type === 'stove' && <ChefHat className="h-5 w-5 text-warning" />}
                          {item.type === 'regulator' && <Gauge className="h-5 w-5 text-info" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.details}</p>
                          <p className="text-xs font-medium text-primary mt-0.5">
                            {BANGLADESHI_CURRENCY_SYMBOL}{item.companyPrice.toLocaleString()}/pc
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateItemQuantity(item.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateItemQuantity(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-right min-w-[70px]">
                          <p className="text-sm font-bold">{BANGLADESHI_CURRENCY_SYMBOL}{(item.companyPrice * item.quantity).toLocaleString()}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              
              {/* Cart Total */}
              {purchaseItems.length > 0 && (
                <div className="p-4 bg-muted/30 border-t border-border">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Total D.O.</span>
                    <span className="text-2xl font-bold text-primary">
                      {BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Supplier & Checkout */}
        <div className="lg:col-span-3 space-y-4">
          {/* Supplier Selection */}
          <Card className="shadow-sm">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                Supplier
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Select Supplier</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-primary hover:text-primary"
                  onClick={() => setShowCustomSupplierInput(!showCustomSupplierInput)}
                >
                  {showCustomSupplierInput ? "← Select" : "+ Custom"}
                </Button>
              </div>
              {showCustomSupplierInput ? (
                <Input
                  placeholder="Enter supplier name..."
                  value={customSupplier}
                  onChange={(e) => setCustomSupplier(e.target.value)}
                  className="h-11"
                />
              ) : (
                <Select value={supplierName} onValueChange={setSupplierName}>
                  <SelectTrigger className="h-11">
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
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="py-3 px-4 bg-primary/5 border-b border-primary/10">
              <CardTitle className="text-base font-semibold">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items</span>
                  <span className="font-medium">{purchaseItemsCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{BANGLADESHI_CURRENCY_SYMBOL}{subtotal.toLocaleString()}</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between items-baseline">
                <span className="text-base font-semibold">Total D.O.</span>
                <span className="text-2xl font-bold text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  size="lg"
                  className="w-full h-12 font-semibold"
                  onClick={() => handleCompletePurchase('completed')}
                  disabled={processing || purchaseItems.length === 0}
                >
                  {processing ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                  )}
                  Complete (Paid)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full h-12 font-semibold border-warning text-warning hover:bg-warning/10 hover:text-warning"
                  onClick={() => handleCompletePurchase('pending')}
                  disabled={processing || purchaseItems.length === 0}
                >
                  <Save className="h-5 w-5 mr-2" />
                  Save as Credit
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Purchases */}
          {recentPurchases.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-warning" />
                  Recent (5 min void)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                <ScrollArea className="h-[120px]">
                  <div className="space-y-1">
                    {recentPurchases.map(purchase => (
                      <div key={purchase.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div>
                          <p className="text-xs font-semibold">{purchase.transactionNumber}</p>
                          <p className="text-xs text-muted-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{purchase.total.toLocaleString()}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setPurchaseToVoid(purchase);
                            setShowVoidDialog(true);
                          }}
                        >
                          <Undo2 className="h-4 w-4" />
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Undo2 className="h-5 w-5" />
              Void Purchase
            </DialogTitle>
            <DialogDescription>
              This will reverse all stock and expense entries for this purchase.
            </DialogDescription>
          </DialogHeader>
          {purchaseToVoid && (
            <div className="p-4 bg-muted rounded-xl">
              <p className="font-semibold">{purchaseToVoid.transactionNumber}</p>
              <p className="text-sm text-muted-foreground">{purchaseToVoid.supplierName}</p>
              <p className="text-xl font-bold text-destructive mt-2">
                {BANGLADESHI_CURRENCY_SYMBOL}{purchaseToVoid.total.toLocaleString()}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setShowVoidDialog(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleVoidPurchase}>
              Confirm Void
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
