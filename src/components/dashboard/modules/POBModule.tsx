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
  ArrowDown,
  CircleDot,
  CircleDashed,
  Flame
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
  burnerType?: 'single' | 'double';
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
  
  // ===== MOBILE STEP (for step-based mobile navigation) =====
  const [mobileStep, setMobileStep] = useState<'product' | 'cart' | 'checkout'>('product');
  
  // ===== LPG CONFIGURATION STATE (DUAL VALVE SIZE) =====
  const [lpgBrandName, setLpgBrandName] = useState("");
  const [lpgCylinderType, setLpgCylinderType] = useState<'refill' | 'package'>("refill");
  const [lpgWeight, setLpgWeight] = useState("12kg");
  // Dual valve size quantities
  const [lpgQty22mm, setLpgQty22mm] = useState(0);
  const [lpgQty20mm, setLpgQty20mm] = useState(0);
  const [lpgTotalDO, setLpgTotalDO] = useState(0);
  const [customLpgBrand, setCustomLpgBrand] = useState("");
  const [showCustomLpgBrand, setShowCustomLpgBrand] = useState(false);
  const [customLpgWeight, setCustomLpgWeight] = useState("");
  const [showCustomLpgWeight, setShowCustomLpgWeight] = useState(false);
  
  // ===== STOVE CONFIGURATION STATE (DUAL BURNER TYPE) =====
  const [stoveBrand, setStoveBrand] = useState("");
  const [stoveModel, setStoveModel] = useState("");
  // NEW: Dual burner type quantities
  const [stoveQtySingle, setStoveQtySingle] = useState(0);
  const [stoveQtyDouble, setStoveQtyDouble] = useState(0);
  const [stoveTotalAmount, setStoveTotalAmount] = useState(0);
  const [customStoveBrand, setCustomStoveBrand] = useState("");
  const [showCustomStoveBrand, setShowCustomStoveBrand] = useState(false);
  
  // ===== REGULATOR CONFIGURATION STATE (DUAL VALVE SIZE) =====
  const [regulatorBrand, setRegulatorBrand] = useState("");
  // Dual valve size quantities for regulators
  const [regQty22mm, setRegQty22mm] = useState(0);
  const [regQty20mm, setRegQty20mm] = useState(0);
  const [regulatorTotalAmount, setRegulatorTotalAmount] = useState(0);
  const [customRegulatorBrand, setCustomRegulatorBrand] = useState("");
  const [showCustomRegulatorBrand, setShowCustomRegulatorBrand] = useState(false);
  
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

  // ============= COMPUTED TOTALS =============
  const lpgTotalQty = lpgQty22mm + lpgQty20mm;
  const stoveTotalQty = stoveQtySingle + stoveQtyDouble;
  const regTotalQty = regQty22mm + regQty20mm;

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

  // ============= VALVE SIZE STOCK COUNTS (LPG) =============
  const valveSizeStats = useMemo(() => {
    const stats22mm = lpgBrands
      .filter(b => b.size === "22mm")
      .reduce((acc, b) => ({
        refill: acc.refill + b.refill_cylinder,
        package: acc.package + b.package_cylinder,
        empty: acc.empty + b.empty_cylinder,
        total: acc.total + b.refill_cylinder + b.package_cylinder
      }), { refill: 0, package: 0, empty: 0, total: 0 });

    const stats20mm = lpgBrands
      .filter(b => b.size === "20mm")
      .reduce((acc, b) => ({
        refill: acc.refill + b.refill_cylinder,
        package: acc.package + b.package_cylinder,
        empty: acc.empty + b.empty_cylinder,
        total: acc.total + b.refill_cylinder + b.package_cylinder
      }), { refill: 0, package: 0, empty: 0, total: 0 });

    return { "22mm": stats22mm, "20mm": stats20mm };
  }, [lpgBrands]);

  // ============= REGULATOR STOCK COUNTS BY VALVE =============
  const regulatorValveStats = useMemo(() => {
    const stats22mm = regulators.filter(r => r.type === "22mm").reduce((sum, r) => sum + r.quantity, 0);
    const stats20mm = regulators.filter(r => r.type === "20mm").reduce((sum, r) => sum + r.quantity, 0);
    return { "22mm": stats22mm, "20mm": stats20mm };
  }, [regulators]);

  // ============= STOVE STOCK COUNTS BY BURNER TYPE =============
  const stoveBurnerStats = useMemo(() => {
    const singleBurner = stoves.filter(s => s.burners === 1).reduce((sum, s) => sum + s.quantity, 0);
    const doubleBurner = stoves.filter(s => s.burners === 2).reduce((sum, s) => sum + s.quantity, 0);
    return { single: singleBurner, double: doubleBurner };
  }, [stoves]);

  // ============= CALCULATED PRICES =============
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
  const getEffectiveSupplier = () => showCustomSupplierInput ? customSupplier : supplierName;

  // ============= ADD LPG TO CART (DUAL VALVE SIZE) =============
  const addLPGToCart = async () => {
    const effectiveBrand = getEffectiveLpgBrand();
    const effectiveWeight = getEffectiveLpgWeight();
    
    if (!effectiveBrand || lpgTotalQty <= 0 || lpgTotalDO <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const companyPrice = lpgCompanyPrice;
    const brandColor = getBrandColor(effectiveBrand);

    // Add items for each valve size that has quantity
    const itemsToAdd: PurchaseItem[] = [];

    for (const valveSize of ['22mm', '20mm'] as const) {
      const qty = valveSize === '22mm' ? lpgQty22mm : lpgQty20mm;
      if (qty <= 0) continue;

      // Find or create brand in inventory for this valve size
      let brandId = "";
      const existingBrand = lpgBrands.find(b => 
        b.name.toLowerCase() === effectiveBrand.toLowerCase() && 
        b.size === valveSize && 
        b.weight === effectiveWeight
      );

      if (existingBrand) {
        brandId = existingBrand.id;
      } else {
        const { data: newBrand, error } = await supabase
          .from('lpg_brands')
          .insert({
            name: effectiveBrand,
            size: valveSize,
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
          toast({ title: `Error creating brand for ${valveSize}`, variant: "destructive" });
          continue;
        }
        brandId = newBrand.id;
      }

      // Update product pricing
      await updateProductPricing('lpg', effectiveBrand, companyPrice, {
        brandId,
        weight: effectiveWeight,
        valveSize,
        cylinderType: lpgCylinderType
      });

      const itemId = `lpg-${valveSize}-${Date.now()}`;
      itemsToAdd.push({
        id: itemId,
        type: 'lpg',
        name: effectiveBrand,
        details: `${effectiveWeight} • ${valveSize} • ${lpgCylinderType === 'refill' ? 'Refill' : 'Package'}`,
        companyPrice,
        quantity: qty,
        cylinderType: lpgCylinderType,
        brandId,
        weight: effectiveWeight,
        valveSize,
        brandColor
      });
    }

    if (itemsToAdd.length === 0) {
      toast({ title: "No items to add", variant: "destructive" });
      return;
    }

    setPurchaseItems([...purchaseItems, ...itemsToAdd]);
    toast({ 
      title: "Added to cart!", 
      description: `${lpgTotalQty}x ${effectiveBrand} @ ${BANGLADESHI_CURRENCY_SYMBOL}${companyPrice.toLocaleString()}/pc` 
    });

    // On mobile, show cart after adding
    if (isMobile) setMobileStep('cart');
    resetLPGForm();
  };

  // ============= ADD STOVE TO CART (DUAL BURNER TYPE) =============
  const addStoveToCart = async () => {
    const effectiveBrand = getEffectiveStoveBrand();
    
    if (!effectiveBrand || !stoveModel || stoveTotalQty <= 0 || stoveTotalAmount <= 0) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const companyPrice = stoveCompanyPrice;
    const itemsToAdd: PurchaseItem[] = [];

    // Add items for each burner type that has quantity
    for (const burnerType of ['single', 'double'] as const) {
      const qty = burnerType === 'single' ? stoveQtySingle : stoveQtyDouble;
      if (qty <= 0) continue;

      const burners = burnerType === 'single' ? 1 : 2;
      let stoveId = "";
      
      const existingStove = stoves.find(s => 
        s.brand.toLowerCase() === effectiveBrand.toLowerCase() && 
        s.model.toLowerCase() === stoveModel.toLowerCase() &&
        s.burners === burners
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
          toast({ title: `Error creating stove for ${burnerType} burner`, variant: "destructive" });
          continue;
        }
        stoveId = newStove.id;
      }

      await updateProductPricing('stove', `${effectiveBrand} ${stoveModel}`, companyPrice, {
        burnerType
      });

      itemsToAdd.push({
        id: `stove-${burnerType}-${Date.now()}`,
        type: 'stove',
        name: `${effectiveBrand} ${stoveModel}`,
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
    toast({ 
      title: "Added to cart!", 
      description: `${stoveTotalQty}x ${effectiveBrand} ${stoveModel} @ ${BANGLADESHI_CURRENCY_SYMBOL}${companyPrice.toLocaleString()}/pc` 
    });

    if (isMobile) setMobileStep('cart');
    resetStoveForm();
  };

  // ============= ADD REGULATOR TO CART (DUAL VALVE SIZE) =============
  const addRegulatorToCart = async () => {
    const effectiveBrand = getEffectiveRegulatorBrand();
    
    if (!effectiveBrand || regTotalQty <= 0 || regulatorTotalAmount <= 0) {
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
        r.brand.toLowerCase() === effectiveBrand.toLowerCase() && 
        r.type === valveType
      );

      if (existingReg) {
        regId = existingReg.id;
      } else {
        const { data: newReg, error } = await supabase
          .from('regulators')
          .insert({
            brand: effectiveBrand,
            type: valveType,
            quantity: 0,
            price: 0
          })
          .select()
          .single();

        if (error) {
          toast({ title: `Error creating regulator for ${valveType}`, variant: "destructive" });
          continue;
        }
        regId = newReg.id;
      }

      await updateProductPricing('regulator', `${effectiveBrand} ${valveType}`, companyPrice, {
        regulatorType: valveType
      });

      itemsToAdd.push({
        id: `regulator-${valveType}-${Date.now()}`,
        type: 'regulator',
        name: `${effectiveBrand} Regulator`,
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
    toast({ 
      title: "Added to cart!", 
      description: `${regTotalQty}x ${effectiveBrand} @ ${BANGLADESHI_CURRENCY_SYMBOL}${companyPrice.toLocaleString()}/pc` 
    });

    if (isMobile) setMobileStep('cart');
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
        const variant = options.cylinderType === 'refill' ? 'Refill' : 'Package';
        const fullProductName = `${productName} LP Gas ${options.weight} Cylinder (${options.valveSize}) ${variant}`;

        // First try to find by brand_id and variant
        let existingPrice = null;
        const { data: byBrandId } = await supabase
          .from('product_prices')
          .select('id, company_price, package_price')
          .eq('brand_id', options.brandId)
          .eq('variant', variant)
          .eq('product_type', 'lpg')
          .eq('is_active', true)
          .maybeSingle();

        existingPrice = byBrandId;

        // If not found, try to find by matching size and variant
        if (!existingPrice) {
          const { data: bySize } = await supabase
            .from('product_prices')
            .select('id, company_price, package_price')
            .eq('brand_id', options.brandId)
            .eq('size', options.weight)
            .eq('product_type', 'lpg')
            .eq('is_active', true)
            .maybeSingle();
          
          existingPrice = bySize;
        }

        if (existingPrice) {
          // Update: For Refill type update company_price, for Package update package_price
          const updateData: Record<string, unknown> = { 
            updated_at: new Date().toISOString(),
            product_name: fullProductName
          };
          
          if (options.cylinderType === 'package') {
            updateData.package_price = companyPrice;
          } else {
            updateData.company_price = companyPrice;
          }
          
          const { error } = await supabase
            .from('product_prices')
            .update(updateData)
            .eq('id', existingPrice.id);
            
          if (error) {
            console.error('Error updating LPG price:', error);
          }
        } else {
          // Create new pricing entry
          const { error } = await supabase.from('product_prices').insert({
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
          
          if (error) {
            console.error('Error creating LPG price:', error);
          }
        }
      } else if (type === 'stove') {
        const burnerText = options.burnerType === 'single' ? 'Single' : 'Double';
        const fullProductName = `${productName} - ${burnerText} Burner`;
        
        // Try to find existing stove price - use ilike for case-insensitive match
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
        
        // Try to find existing regulator price
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
    setLpgQty22mm(0);
    setLpgQty20mm(0);
    setLpgTotalDO(0);
    setCustomLpgBrand("");
    setShowCustomLpgBrand(false);
    setCustomLpgWeight("");
    setShowCustomLpgWeight(false);
  };

  const resetStoveForm = () => {
    setStoveBrand("");
    setStoveModel("");
    setStoveQtySingle(0);
    setStoveQtyDouble(0);
    setStoveTotalAmount(0);
    setCustomStoveBrand("");
    setShowCustomStoveBrand(false);
  };

  const resetRegulatorForm = () => {
    setRegulatorBrand("");
    setRegQty22mm(0);
    setRegQty20mm(0);
    setRegulatorTotalAmount(0);
    setCustomRegulatorBrand("");
    setShowCustomRegulatorBrand(false);
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
      if (isMobile) setMobileStep('product');
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
    // Get all unique brands from both valve sizes
    const allBrands = new Set<string>();
    LPG_BRANDS.forEach(b => allBrands.add(b.name));
    return Array.from(allBrands);
  }, []);

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

  // ============= ENHANCED VALVE SIZE QUANTITY CARD COMPONENT =============
  const ValveSizeQuantityCard = ({ 
    value, 
    onChange, 
    valveSize, 
    stockLabel,
    variant = 'primary'
  }: { 
    value: number; 
    onChange: (v: number) => void;
    valveSize: '22mm' | '20mm';
    stockLabel?: string;
    variant?: 'primary' | 'secondary' | 'info';
  }) => {
    const is22mm = valveSize === '22mm';
    const bgGradient = is22mm 
      ? 'from-primary/15 via-primary/10 to-primary/5' 
      : 'from-warning/15 via-warning/10 to-warning/5';
    const borderColor = is22mm ? 'border-primary/30' : 'border-warning/30';
    const badgeBg = is22mm ? 'bg-primary' : 'bg-warning';
    const textColor = is22mm ? 'text-primary' : 'text-warning';
    
    return (
      <Card className={`overflow-hidden border-2 ${borderColor} shadow-sm`}>
        {/* Valve Size Header Badge */}
        <div className={`bg-gradient-to-br ${bgGradient} p-3 sm:p-4 text-center border-b ${borderColor}`}>
          <div className={`inline-flex items-center justify-center ${badgeBg} text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-md`}>
            <CircleDot className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="text-sm sm:text-base font-bold">{valveSize}</span>
          </div>
          {stockLabel && (
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mt-1.5 sm:mt-2">
              Current Stock: <span className={`font-bold ${textColor}`}>{stockLabel}</span>
            </p>
          )}
        </div>
        
        {/* Quantity Input Section */}
        <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          {/* Large Quantity Display */}
          <div className="relative">
            <Input
              type="number"
              inputMode="numeric"
              value={value}
              onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
              className={`w-full h-14 sm:h-16 text-center text-2xl sm:text-3xl font-extrabold border-2 ${borderColor} ${textColor}`}
              placeholder="0"
            />
          </div>
          
          {/* Stepper Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className={`h-11 sm:h-12 w-full text-sm font-bold ${borderColor}`}
              onClick={() => onChange(Math.max(0, value - 10))}
            >
              -10
            </Button>
            <Button
              type="button"
              variant="outline"
              className={`h-11 sm:h-12 w-full text-sm font-bold ${borderColor}`}
              onClick={() => onChange(value + 10)}
            >
              +10
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============= BURNER TYPE QUANTITY CARD COMPONENT (For Stoves) =============
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
    const bgGradient = isSingle 
      ? 'from-warning/15 via-warning/10 to-warning/5' 
      : 'from-orange-500/15 via-orange-500/10 to-orange-500/5';
    const borderColor = isSingle ? 'border-warning/40' : 'border-orange-500/40';
    const badgeBg = isSingle ? 'bg-warning' : 'bg-orange-500';
    const textColor = isSingle ? 'text-warning' : 'text-orange-500';
    const label = isSingle ? 'Single Burner' : 'Double Burner';
    
    return (
      <Card className={`overflow-hidden border-2 ${borderColor} shadow-sm`}>
        {/* Burner Type Header Badge */}
        <div className={`bg-gradient-to-br ${bgGradient} p-3 sm:p-4 text-center border-b ${borderColor}`}>
          <div className={`inline-flex items-center justify-center ${badgeBg} text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-md`}>
            <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            <span className="text-xs sm:text-sm font-bold">{label}</span>
          </div>
          {stockLabel && (
            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mt-1.5 sm:mt-2">
              Current Stock: <span className={`font-bold ${textColor}`}>{stockLabel}</span>
            </p>
          )}
        </div>
        
        {/* Quantity Input Section */}
        <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          {/* Large Quantity Display */}
          <div className="relative">
            <Input
              type="number"
              inputMode="numeric"
              value={value}
              onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
              className={`w-full h-14 sm:h-16 text-center text-2xl sm:text-3xl font-extrabold border-2 ${borderColor} ${textColor}`}
              placeholder="0"
            />
          </div>
          
          {/* Stepper Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className={`h-11 sm:h-12 w-full text-sm font-bold ${borderColor}`}
              onClick={() => onChange(Math.max(0, value - 10))}
            >
              -10
            </Button>
            <Button
              type="button"
              variant="outline"
              className={`h-11 sm:h-12 w-full text-sm font-bold ${borderColor}`}
              onClick={() => onChange(value + 10)}
            >
              +10
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ============= RENDER PRODUCT SELECTION =============
  const renderProductSelection = () => (
    <div className="space-y-4">
      {/* Product Type Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lpg' | 'stove' | 'regulator')}>
        <TabsList className="w-full h-12 p-1 bg-muted/50 rounded-xl">
          <TabsTrigger 
            value="lpg" 
            className="flex-1 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg gap-1.5 text-xs sm:text-sm font-medium"
          >
            <Cylinder className="h-4 w-4" />
            <span>LPG</span>
          </TabsTrigger>
          <TabsTrigger 
            value="stove" 
            className="flex-1 h-full data-[state=active]:bg-warning data-[state=active]:text-warning-foreground rounded-lg gap-1.5 text-xs sm:text-sm font-medium"
          >
            <ChefHat className="h-4 w-4" />
            <span>Stove</span>
          </TabsTrigger>
          <TabsTrigger 
            value="regulator" 
            className="flex-1 h-full data-[state=active]:bg-info data-[state=active]:text-info-foreground rounded-lg gap-1.5 text-xs sm:text-sm font-medium"
          >
            <Gauge className="h-4 w-4" />
            <span>Regulator</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* LPG FORM - Redesigned with Dual Valve Quantity */}
      {activeTab === 'lpg' && (
        <Card className="border-primary/20 shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 bg-gradient-to-r from-primary/10 to-secondary/5 border-b border-primary/10">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Cylinder className="h-5 w-5 text-primary" />
              LPG Cylinder Purchase
            </CardTitle>
            <p className="text-xs text-muted-foreground">Configure your cylinder requirements</p>
          </CardHeader>
          <CardContent className="p-4 space-y-5">
            {/* Row 1: Cylinder Type & Weight (Side by Side) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cylinder Type</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    type="button"
                    variant={lpgCylinderType === "refill" ? "default" : "outline"}
                    size="sm"
                    className="h-11 font-medium text-xs"
                    onClick={() => setLpgCylinderType("refill")}
                  >
                    Refill
                  </Button>
                  <Button
                    type="button"
                    variant={lpgCylinderType === "package" ? "secondary" : "outline"}
                    size="sm"
                    className="h-11 font-medium text-xs"
                    onClick={() => setLpgCylinderType("package")}
                  >
                    Package
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Weight</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[10px] text-primary"
                    onClick={() => setShowCustomLpgWeight(!showCustomLpgWeight)}
                  >
                    {showCustomLpgWeight ? "← Select" : "+ Custom"}
                  </Button>
                </div>
                {showCustomLpgWeight ? (
                  <Input
                    placeholder="e.g., 14kg"
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
                      {[...new Set([...WEIGHT_OPTIONS_22MM, ...WEIGHT_OPTIONS_20MM])].sort((a, b) => 
                        parseFloat(a) - parseFloat(b)
                      ).map(w => (
                        <SelectItem key={w} value={w}>{w}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Row 2: Brand Name (Full Width) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Brand Name</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-primary"
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
                  className="h-12"
                />
              ) : (
                <Select value={lpgBrandName} onValueChange={setLpgBrandName}>
                  <SelectTrigger className="h-12">
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

            {/* Row 3: QUANTITY BY VALVE SIZE (The Key Feature) - Enhanced Cards */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border">
                <CircleDashed className="h-5 w-5 text-primary" />
                <Label className="text-base font-bold">Quantity (By Valve Size)</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <ValveSizeQuantityCard
                  value={lpgQty22mm}
                  onChange={setLpgQty22mm}
                  valveSize="22mm"
                  stockLabel={`${valveSizeStats["22mm"].refill}R + ${valveSizeStats["22mm"].package}P`}
                  variant="primary"
                />
                <ValveSizeQuantityCard
                  value={lpgQty20mm}
                  onChange={setLpgQty20mm}
                  valveSize="20mm"
                  stockLabel={`${valveSizeStats["20mm"].refill}R + ${valveSizeStats["20mm"].package}P`}
                  variant="secondary"
                />
              </div>
              
              {/* Total Summary Bar - Enhanced */}
              {lpgTotalQty > 0 && (
                <Card className="border-2 border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent overflow-hidden">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                          <Cylinder className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cylinders</p>
                          <p className="text-2xl sm:text-3xl font-black text-primary">{lpgTotalQty.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs sm:text-sm">
                        <div className="flex items-center gap-1 sm:gap-2 justify-end">
                          <Badge variant="outline" className="border-primary/50 text-primary font-semibold text-[10px] sm:text-xs h-5 sm:h-6">
                            22mm: {lpgQty22mm}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 justify-end mt-1">
                          <Badge variant="outline" className="border-warning/50 text-warning font-semibold text-[10px] sm:text-xs h-5 sm:h-6">
                            20mm: {lpgQty20mm}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Row 4: Total D.O. Amount */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Total D.O. Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Enter total amount paid..."
                value={lpgTotalDO || ""}
                onChange={(e) => setLpgTotalDO(parseInt(e.target.value) || 0)}
                className="h-14 text-lg font-semibold"
              />
            </div>

            {/* Auto-calculated Unit Price */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-secondary/5 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Unit Price</span>
              </div>
              <span className="text-2xl sm:text-3xl font-extrabold text-primary">
                {BANGLADESHI_CURRENCY_SYMBOL}{lpgCompanyPrice.toLocaleString()}
              </span>
            </div>

            {/* Add to Cart Button */}
            <Button
              type="button"
              size="lg"
              className="w-full h-14 font-semibold text-base"
              onClick={addLPGToCart}
              disabled={!getEffectiveLpgBrand() || lpgTotalQty <= 0 || lpgTotalDO <= 0}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>
          </CardContent>
        </Card>
      )}

      {/* STOVE FORM - Redesigned with Dual Burner Type Quantity */}
      {activeTab === 'stove' && (
        <Card className="border-warning/20 shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 bg-gradient-to-r from-warning/10 to-orange-500/5 border-b border-warning/10">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <ChefHat className="h-5 w-5 text-warning" />
              Gas Stove Purchase
            </CardTitle>
            <p className="text-xs text-muted-foreground">Configure your stove requirements</p>
          </CardHeader>
          <CardContent className="p-4 space-y-5">
            {/* Brand Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Brand Name</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-warning hover:text-warning"
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
                  className="h-12"
                />
              ) : (
                <Select value={stoveBrand} onValueChange={setStoveBrand}>
                  <SelectTrigger className="h-12">
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
                className="h-12"
              />
            </div>

            {/* QUANTITY BY BURNER TYPE (The Key Feature for Stoves) - Enhanced Cards */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-warning/30">
                <Flame className="h-5 w-5 text-warning" />
                <Label className="text-base font-bold">Quantity (By Burner Type)</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <BurnerTypeQuantityCard
                  value={stoveQtySingle}
                  onChange={setStoveQtySingle}
                  burnerType="single"
                  stockLabel={`${stoveBurnerStats.single} pcs`}
                />
                <BurnerTypeQuantityCard
                  value={stoveQtyDouble}
                  onChange={setStoveQtyDouble}
                  burnerType="double"
                  stockLabel={`${stoveBurnerStats.double} pcs`}
                />
              </div>
              
              {/* Total Summary Bar - Enhanced for Stoves */}
              {stoveTotalQty > 0 && (
                <Card className="border-2 border-warning/30 bg-gradient-to-r from-warning/10 via-warning/5 to-transparent overflow-hidden">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-warning/20 flex items-center justify-center">
                          <ChefHat className="h-5 w-5 sm:h-6 sm:w-6 text-warning" />
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Stoves</p>
                          <p className="text-2xl sm:text-3xl font-black text-warning">{stoveTotalQty.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs sm:text-sm">
                        <div className="flex items-center gap-1 sm:gap-2 justify-end">
                          <Badge variant="outline" className="border-warning/50 text-warning font-semibold text-[10px] sm:text-xs h-5 sm:h-6">
                            Single: {stoveQtySingle}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 justify-end mt-1">
                          <Badge variant="outline" className="border-orange-500/50 text-orange-500 font-semibold text-[10px] sm:text-xs h-5 sm:h-6">
                            Double: {stoveQtyDouble}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Total Amount */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Total D.O. Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Enter total amount paid..."
                value={stoveTotalAmount || ""}
                onChange={(e) => setStoveTotalAmount(parseInt(e.target.value) || 0)}
                className="h-14 text-lg font-semibold"
              />
            </div>

            {/* Auto-calculated Company Price */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-warning/10 to-orange-500/5 rounded-xl border border-warning/20">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-warning" />
                <span className="text-sm font-medium text-foreground">Unit Price</span>
              </div>
              <span className="text-2xl sm:text-3xl font-extrabold text-warning">
                {BANGLADESHI_CURRENCY_SYMBOL}{stoveCompanyPrice.toLocaleString()}
              </span>
            </div>

            {/* Add to Cart Button */}
            <Button
              type="button"
              size="lg"
              variant="warning"
              className="w-full h-14 font-semibold text-base"
              onClick={addStoveToCart}
              disabled={!getEffectiveStoveBrand() || !stoveModel || stoveTotalQty <= 0 || stoveTotalAmount <= 0}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>
          </CardContent>
        </Card>
      )}

      {/* REGULATOR FORM - Redesigned with Dual Valve Quantity */}
      {activeTab === 'regulator' && (
        <Card className="border-info/20 shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 bg-gradient-to-r from-info/10 to-cyan-500/5 border-b border-info/10">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <Gauge className="h-5 w-5 text-info" />
              Regulator Purchase
            </CardTitle>
            <p className="text-xs text-muted-foreground">Configure your regulator requirements</p>
          </CardHeader>
          <CardContent className="p-4 space-y-5">
            {/* Brand Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Brand Name</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-[10px] text-info hover:text-info"
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
                  className="h-12"
                />
              ) : (
                <Select value={regulatorBrand} onValueChange={setRegulatorBrand}>
                  <SelectTrigger className="h-12">
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

            {/* QUANTITY BY VALVE TYPE (The Key Feature for Regulators) - Enhanced Cards */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-info/30">
                <CircleDashed className="h-5 w-5 text-info" />
                <Label className="text-base font-bold">Quantity (By Valve Type)</Label>
              </div>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <ValveSizeQuantityCard
                  value={regQty22mm}
                  onChange={setRegQty22mm}
                  valveSize="22mm"
                  stockLabel={`${regulatorValveStats["22mm"]} pcs`}
                  variant="primary"
                />
                <ValveSizeQuantityCard
                  value={regQty20mm}
                  onChange={setRegQty20mm}
                  valveSize="20mm"
                  stockLabel={`${regulatorValveStats["20mm"]} pcs`}
                  variant="secondary"
                />
              </div>
              
              {/* Total Summary Bar - Enhanced for Regulators */}
              {regTotalQty > 0 && (
                <Card className="border-2 border-info/30 bg-gradient-to-r from-info/10 via-info/5 to-transparent overflow-hidden">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-info/20 flex items-center justify-center">
                          <Gauge className="h-5 w-5 sm:h-6 sm:w-6 text-info" />
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Regulators</p>
                          <p className="text-2xl sm:text-3xl font-black text-info">{regTotalQty.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right text-xs sm:text-sm">
                        <div className="flex items-center gap-1 sm:gap-2 justify-end">
                          <Badge variant="outline" className="border-primary/50 text-primary font-semibold text-[10px] sm:text-xs h-5 sm:h-6">
                            22mm: {regQty22mm}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-2 justify-end mt-1">
                          <Badge variant="outline" className="border-warning/50 text-warning font-semibold text-[10px] sm:text-xs h-5 sm:h-6">
                            20mm: {regQty20mm}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Total Amount */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Total D.O. Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Enter total amount paid..."
                value={regulatorTotalAmount || ""}
                onChange={(e) => setRegulatorTotalAmount(parseInt(e.target.value) || 0)}
                className="h-14 text-lg font-semibold"
              />
            </div>

            {/* Auto-calculated Company Price */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-info/10 to-cyan-500/5 rounded-xl border border-info/20">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-info" />
                <span className="text-sm font-medium text-foreground">Unit Price</span>
              </div>
              <span className="text-2xl sm:text-3xl font-extrabold text-info">
                {BANGLADESHI_CURRENCY_SYMBOL}{regulatorCompanyPrice.toLocaleString()}
              </span>
            </div>

            {/* Add to Cart Button */}
            <Button
              type="button"
              size="lg"
              variant="info"
              className="w-full h-14 font-semibold text-base"
              onClick={addRegulatorToCart}
              disabled={!getEffectiveRegulatorBrand() || regTotalQty <= 0 || regulatorTotalAmount <= 0}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ============= RENDER CART (Professional Memo-Style) =============
  const renderCart = () => {
    const totalQuantity = purchaseItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalDO = purchaseItems.reduce((sum, item) => sum + (item.companyPrice * item.quantity), 0);
    const productCount = purchaseItems.length;
    
    return (
      <Card className="border-primary/20 shadow-sm h-full flex flex-col">
        <CardHeader className="py-3 px-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-b border-primary/10 shrink-0">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2 font-bold">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Purchase Cart
            </span>
            <Badge className="bg-primary text-primary-foreground text-sm px-3">
              {productCount} {productCount === 1 ? 'product' : 'products'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            {purchaseItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
                <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <ShoppingBag className="h-10 w-10 opacity-30" />
                </div>
                <p className="text-base font-semibold">Cart is empty</p>
                <p className="text-sm">Add products to get started</p>
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {purchaseItems.map((item) => (
                  <Card 
                    key={item.id} 
                    className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow"
                    style={{ borderLeftWidth: '4px', borderLeftColor: item.brandColor || (item.type === 'stove' ? 'hsl(var(--warning))' : item.type === 'regulator' ? 'hsl(var(--info))' : 'hsl(var(--primary))') }}
                  >
                    {/* Card Header with Brand & Delete */}
                    <div 
                      className="flex items-center justify-between px-4 py-2.5"
                      style={{ backgroundColor: item.brandColor ? `${item.brandColor}10` : (item.type === 'stove' ? 'hsl(var(--warning) / 0.05)' : item.type === 'regulator' ? 'hsl(var(--info) / 0.05)' : 'hsl(var(--primary) / 0.05)') }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="h-9 w-9 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: item.brandColor ? `${item.brandColor}20` : (item.type === 'stove' ? 'hsl(var(--warning) / 0.15)' : item.type === 'regulator' ? 'hsl(var(--info) / 0.15)' : 'hsl(var(--primary) / 0.15)') }}
                        >
                          {item.type === 'lpg' && <Cylinder className="h-5 w-5" style={{ color: item.brandColor || 'hsl(var(--primary))' }} />}
                          {item.type === 'stove' && <ChefHat className="h-5 w-5 text-warning" />}
                          {item.type === 'regulator' && <Gauge className="h-5 w-5 text-info" />}
                        </div>
                        <span className="font-bold text-sm">{item.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Card Body - Product Details */}
                    <div className="px-4 py-3 space-y-3">
                      {/* Attributes Grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                        {item.type === 'lpg' && (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">Weight:</span>
                              <span className="font-semibold">{item.weight}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">Type:</span>
                              <Badge variant={item.cylinderType === 'refill' ? 'success' : 'warning'} className="text-xs h-5">
                                {item.cylinderType === 'refill' ? 'Refill' : 'Package'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">Valve:</span>
                              <span className="font-semibold">{item.valveSize}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">Qty:</span>
                              <span className="font-bold text-primary">{item.quantity.toLocaleString()} pcs</span>
                            </div>
                          </>
                        )}
                        {item.type === 'stove' && (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">Model:</span>
                              <span className="font-semibold">{item.model || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">Burner:</span>
                              <Badge variant="warning" className="text-xs h-5">
                                {item.burnerType === 'single' ? 'Single' : 'Double'}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 col-span-2">
                              <span className="text-muted-foreground">Qty:</span>
                              <span className="font-bold text-warning">{item.quantity.toLocaleString()} pcs</span>
                            </div>
                          </>
                        )}
                        {item.type === 'regulator' && (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">Type:</span>
                              <Badge variant="info" className="text-xs h-5">{item.regulatorType}</Badge>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">Qty:</span>
                              <span className="font-bold text-info">{item.quantity.toLocaleString()} pcs</span>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <Separator />
                      
                      {/* Price Row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-2 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-0.5">Unit Price</p>
                          <p className="font-bold text-sm">{BANGLADESHI_CURRENCY_SYMBOL}{item.companyPrice.toLocaleString()}/pc</p>
                        </div>
                        <div className="text-center p-2 bg-primary/10 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-0.5">Total D.O.</p>
                          <p className="font-bold text-base text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{(item.companyPrice * item.quantity).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      {/* Quantity Stepper */}
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => updateItemQuantity(item.id, -10)}
                        >
                          <span className="text-xs font-bold">-10</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => updateItemQuantity(item.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="w-16 text-center">
                          <span className="text-lg font-bold">{item.quantity.toLocaleString()}</span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => updateItemQuantity(item.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => updateItemQuantity(item.id, 10)}
                        >
                          <span className="text-xs font-bold">+10</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
          
          {/* Cart Summary - Extra Large Prominent Cards with Better Spacing */}
          {purchaseItems.length > 0 && (
            <div className="p-4 sm:p-5 bg-gradient-to-t from-muted/60 to-transparent border-t-2 border-border shrink-0 space-y-4 sm:space-y-5">
              {/* Summary Cards Grid - Extra Large with Better Visual Hierarchy */}
              <div className="grid grid-cols-2 gap-3 sm:gap-5">
                {/* Total Quantity Card - Green Theme */}
                <Card className="border-2 sm:border-3 border-success/50 bg-gradient-to-br from-success/15 via-success/10 to-success/5 shadow-lg overflow-hidden">
                  <CardContent className="p-3 sm:p-5 text-center relative">
                    {/* Decorative corner */}
                    <div className="absolute top-0 right-0 w-10 h-10 sm:w-16 sm:h-16 bg-success/10 rounded-bl-full" />
                    <p className="text-[10px] sm:text-xs font-bold text-success uppercase tracking-widest mb-1 sm:mb-2">Total Quantity</p>
                    <p className="text-3xl sm:text-5xl font-black text-success leading-none">{totalQuantity.toLocaleString()}</p>
                    <p className="text-xs sm:text-sm text-success/70 font-medium mt-1 sm:mt-2">
                      {productCount} {productCount === 1 ? 'product' : 'products'}
                    </p>
                  </CardContent>
                </Card>
                
                {/* Total D.O. Card - Indigo/Primary Theme */}
                <Card className="border-2 sm:border-3 border-primary/50 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 shadow-lg overflow-hidden">
                  <CardContent className="p-3 sm:p-5 text-center relative">
                    {/* Decorative corner */}
                    <div className="absolute top-0 right-0 w-10 h-10 sm:w-16 sm:h-16 bg-primary/10 rounded-bl-full" />
                    <p className="text-[10px] sm:text-xs font-bold text-primary uppercase tracking-widest mb-1 sm:mb-2">Total D.O.</p>
                    <p className="text-2xl sm:text-4xl font-black text-primary leading-none">
                      {BANGLADESHI_CURRENCY_SYMBOL}{totalDO.toLocaleString()}
                    </p>
                    {totalQuantity > 0 && (
                      <p className="text-xs sm:text-sm text-primary/70 font-medium mt-1 sm:mt-2">
                        Avg: {BANGLADESHI_CURRENCY_SYMBOL}{Math.round(totalDO / totalQuantity).toLocaleString()}/pc
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Mobile: Proceed to Checkout */}
              {isMobile && (
                <Button
                  type="button"
                  size="lg"
                  className="w-full h-14 font-bold text-base shadow-lg"
                  onClick={() => setMobileStep('checkout')}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Proceed to Checkout
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // ============= RENDER CHECKOUT =============
  const renderCheckout = () => (
    <div className="space-y-4">
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
              className="h-12"
            />
          ) : (
            <Select value={supplierName} onValueChange={setSupplierName}>
              <SelectTrigger className="h-12">
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
              <span className="font-medium">{purchaseItemsCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{BANGLADESHI_CURRENCY_SYMBOL}{subtotal.toLocaleString()}</span>
            </div>
          </div>
          <Separator />
          <div className="flex justify-between items-baseline">
            <span className="text-base font-semibold">Total D.O.</span>
            <span className="text-2xl sm:text-3xl font-extrabold text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Button
              type="button"
              size="lg"
              className="w-full h-14 font-semibold text-base"
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
              className="w-full h-14 font-semibold text-base border-warning text-warning hover:bg-warning/10 hover:text-warning"
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
              Recent (5 min void window)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <ScrollArea className="max-h-[160px]">
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
                      className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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
  );

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
              <Button onClick={clearCart} variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
            <Badge className="h-10 px-4 bg-primary text-primary-foreground font-medium gap-2 text-sm">
              <ShoppingBag className="h-4 w-4" />
              <span>{purchaseItemsCount.toLocaleString()}</span>
            </Badge>
          </div>
        </div>
      </div>

      {/* ===== MOBILE STEP NAVIGATION ===== */}
      {isMobile && (
        <div className="mb-4">
          <div className="flex items-center justify-between bg-muted/50 rounded-xl p-1">
            <Button
              variant={mobileStep === 'product' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-11 gap-1.5"
              onClick={() => setMobileStep('product')}
            >
              <CircleDot className="h-4 w-4" />
              <span className="text-xs">Product</span>
            </Button>
            <Button
              variant={mobileStep === 'cart' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-11 gap-1.5 relative"
              onClick={() => setMobileStep('cart')}
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="text-xs">Cart</span>
              {purchaseItemsCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] bg-primary">
                  {purchaseItemsCount}
                </Badge>
              )}
            </Button>
            <Button
              variant={mobileStep === 'checkout' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-11 gap-1.5"
              onClick={() => setMobileStep('checkout')}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs">Checkout</span>
            </Button>
          </div>
        </div>
      )}

      {/* ===== DESKTOP LAYOUT (3-column) ===== */}
      <div className="hidden lg:grid lg:grid-cols-12 gap-4">
        {/* LEFT: Product Selection */}
        <div className="lg:col-span-5">
          {renderProductSelection()}
        </div>

        {/* MIDDLE: Cart */}
        <div className="lg:col-span-4">
          {renderCart()}
        </div>

        {/* RIGHT: Checkout */}
        <div className="lg:col-span-3">
          {renderCheckout()}
        </div>
      </div>

      {/* ===== MOBILE LAYOUT (Step-based) ===== */}
      <div className="lg:hidden">
        {mobileStep === 'product' && renderProductSelection()}
        {mobileStep === 'cart' && renderCart()}
        {mobileStep === 'checkout' && renderCheckout()}
      </div>

      {/* ===== VOID DIALOG ===== */}
      <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Purchase?</DialogTitle>
            <DialogDescription>
              This will reverse the stock changes and remove the expense entry for {purchaseToVoid?.transactionNumber}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowVoidDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleVoidPurchase}>
              <Undo2 className="h-4 w-4 mr-2" />
              Void Purchase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POBModule;
