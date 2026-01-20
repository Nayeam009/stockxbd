import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingBag, 
  Loader2,
  X,
  User,
  Search,
  Package,
  ChefHat,
  Gauge,
  Cylinder,
  CreditCard,
  Wallet,
  CheckCircle2,
  Building2,
  PackagePlus,
  Undo2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Banknote,
  ArrowDownToLine,
  RefreshCcw
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { supabase } from "@/integrations/supabase/client";
import { parsePositiveNumber } from "@/lib/validationSchemas";
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
  cylinderType?: 'refill' | 'package' | 'empty';
  brandId?: string;
  stoveId?: string;
  regulatorId?: string;
  weight?: string;
  mouthSize?: string;
  brandColor?: string;
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

// Common supplier names in Bangladesh
const SUPPLIERS = [
  "Bashundhara LP Gas Ltd.",
  "Omera Petroleum Ltd.",
  "Jamuna Oil Company",
  "TotalEnergies Bangladesh",
  "Petromax LPG Ltd.",
  "Laugfs Gas Bangladesh",
  "Beximco LPG"
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
  
  // ===== PRODUCT SELECTION STATE =====
  const [activeTab, setActiveTab] = useState("lpg");
  const [cylinderType, setCylinderType] = useState<"refill" | "package" | "empty">("refill");
  const [mouthSize, setMouthSize] = useState("22mm");
  const [weight, setWeight] = useState("12kg");
  const [productSearch, setProductSearch] = useState("");
  
  // ===== MOBILE VIEW STATE =====
  const [mobileView, setMobileView] = useState<'products' | 'cart'>('products');
  
  // ===== CART STATE (Purchase Items) =====
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

  // ============= PRICE HELPERS =============
  const normalizeSize = useCallback((size: string): string => {
    return size.toLowerCase().replace(/\s+/g, '').trim();
  }, []);

  const getVariantFromCylinderType = useCallback((cylType: 'refill' | 'package' | 'empty'): string => {
    if (cylType === 'refill' || cylType === 'empty') return 'Refill';
    return 'Package';
  }, []);

  const getLPGCompanyPrice = useCallback((
    brandId: string, 
    weightVal: string, 
    cylType: 'refill' | 'package' | 'empty',
    valveSize: string
  ): { price: number; found: boolean; priceType: string } => {
    const normalizedWeight = normalizeSize(weightVal);
    const targetVariant = getVariantFromCylinderType(cylType);
    
    const priceEntry = productPrices.find(p => {
      const isLPG = p.product_type.toLowerCase() === 'lpg';
      const matchesBrand = p.brand_id === brandId;
      const matchesSize = p.size ? normalizeSize(p.size).includes(normalizedWeight.replace('kg', '')) : false;
      const matchesVariant = p.variant?.toLowerCase() === targetVariant.toLowerCase();
      const matchesValve = p.product_name?.includes(`(${valveSize})`) || !p.product_name?.includes('mm)');
      
      return isLPG && matchesBrand && matchesSize && matchesVariant && matchesValve;
    });

    const fallbackEntry = !priceEntry ? productPrices.find(p => {
      const isLPG = p.product_type.toLowerCase() === 'lpg';
      const matchesBrand = p.brand_id === brandId;
      const matchesSize = p.size ? normalizeSize(p.size).includes(normalizedWeight.replace('kg', '')) : false;
      const matchesVariant = p.variant?.toLowerCase() === targetVariant.toLowerCase();
      
      return isLPG && matchesBrand && matchesSize && matchesVariant;
    }) : null;

    const minimalEntry = !priceEntry && !fallbackEntry ? productPrices.find(p => {
      const isLPG = p.product_type.toLowerCase() === 'lpg';
      const matchesBrand = p.brand_id === brandId;
      const matchesSize = p.size ? normalizeSize(p.size).includes(normalizedWeight.replace('kg', '')) : false;
      
      return isLPG && matchesBrand && matchesSize;
    }) : null;

    const entry = priceEntry || fallbackEntry || minimalEntry;
    
    let price = 0;
    let priceType = 'Company';
    if (entry) {
      if (cylType === 'package' && entry.package_price > 0) {
        price = entry.package_price;
        priceType = 'Package';
      } else {
        price = entry.company_price;
        priceType = 'Company';
      }
    }
    
    return { price, found: !!entry && price > 0, priceType };
  }, [productPrices, normalizeSize, getVariantFromCylinderType]);

  const getStoveCompanyPrice = useCallback((brand: string, model: string): { price: number; found: boolean } => {
    const priceEntry = productPrices.find(
      p => p.product_type.toLowerCase() === 'stove' && 
           p.product_name.toLowerCase().includes(brand.toLowerCase()) &&
           p.product_name.toLowerCase().includes(model.toLowerCase())
    );
    return { price: priceEntry?.company_price || 0, found: !!priceEntry && (priceEntry?.company_price || 0) > 0 };
  }, [productPrices]);

  const getRegulatorCompanyPrice = useCallback((brand: string, type: string): { price: number; found: boolean } => {
    const priceEntry = productPrices.find(
      p => p.product_type.toLowerCase() === 'regulator' && 
           p.product_name.toLowerCase().includes(brand.toLowerCase()) &&
           p.product_name.toLowerCase().includes(type.toLowerCase())
    );
    return { price: priceEntry?.company_price || 0, found: !!priceEntry && (priceEntry?.company_price || 0) > 0 };
  }, [productPrices]);

  // ============= FILTERED DATA =============
  const filteredBrands = useMemo(() => {
    return lpgBrands.filter(b => {
      const matchesSize = b.size === mouthSize;
      const matchesWeight = b.weight === weight;
      const matchesSearch = !productSearch || b.name.toLowerCase().includes(productSearch.toLowerCase());
      return matchesSize && matchesWeight && matchesSearch;
    });
  }, [lpgBrands, mouthSize, weight, productSearch]);

  const filteredStoves = useMemo(() => {
    if (!productSearch) return stoves;
    return stoves.filter(s => 
      s.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
      s.model.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [stoves, productSearch]);

  const filteredRegulators = useMemo(() => {
    if (!productSearch) return regulators;
    return regulators.filter(r => 
      r.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
      r.type.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [regulators, productSearch]);

  // ============= CART CALCULATIONS =============
  const purchaseItemsCount = useMemo(() => {
    return purchaseItems.reduce((s, i) => s + i.quantity, 0);
  }, [purchaseItems]);

  const subtotal = purchaseItems.reduce((sum, item) => sum + item.companyPrice * item.quantity, 0);
  const total = subtotal;

  // ============= KPI ANALYTICS =============
  const analytics = useMemo(() => {
    const totalLpgStock = lpgBrands.reduce((sum, b) => sum + b.refill_cylinder + b.package_cylinder, 0);
    const lowStockBrands = lpgBrands.filter(b => (b.refill_cylinder + b.package_cylinder) < 10).length;
    const totalStoveStock = stoves.reduce((sum, s) => sum + s.quantity, 0);
    const totalRegulatorStock = regulators.reduce((sum, r) => sum + r.quantity, 0);
    
    return {
      totalLpgStock,
      lowStockBrands,
      totalStoveStock,
      totalRegulatorStock,
      totalProducts: lpgBrands.length + stoves.length + regulators.length
    };
  }, [lpgBrands, stoves, regulators]);

  // ============= PRODUCT ACTIONS =============
  const addLPGToCart = (brand: LPGBrand) => {
    const priceResult = getLPGCompanyPrice(brand.id, weight, cylinderType, mouthSize);
    
    if (!priceResult.found) {
      toast({ 
        title: "Price not configured", 
        description: `Please set ${priceResult.priceType} Price for ${brand.name} (${weight}, ${mouthSize}, ${cylinderType}) in Product Pricing first.`,
        variant: "destructive" 
      });
      return;
    }
    
    const existingItem = purchaseItems.find(
      i => i.type === 'lpg' && i.brandId === brand.id && i.cylinderType === cylinderType && i.weight === weight
    );

    if (existingItem) {
      setPurchaseItems(purchaseItems.map(i => 
        i.id === existingItem.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      const newItem: PurchaseItem = {
        id: `lpg-${Date.now()}`,
        type: 'lpg',
        name: brand.name,
        details: `${weight} • ${mouthSize} • ${cylinderType === 'refill' ? 'Refill' : cylinderType === 'package' ? 'Package' : 'Empty'}`,
        companyPrice: priceResult.price,
        quantity: 1,
        cylinderType,
        brandId: brand.id,
        weight,
        mouthSize,
        brandColor: brand.color
      };
      setPurchaseItems([...purchaseItems, newItem]);
    }
    
    if (isMobile && mobileView === 'products') {
      // Show brief toast on mobile
      toast({ title: `${brand.name} added` });
    } else {
      toast({ title: `${brand.name} (${cylinderType}) added to purchase` });
    }
  };

  const addStoveToCart = (stove: Stove) => {
    const priceResult = getStoveCompanyPrice(stove.brand, stove.model);
    const companyPrice = priceResult.found ? priceResult.price : stove.price * 0.7;
    const existingItem = purchaseItems.find(i => i.stoveId === stove.id);

    if (existingItem) {
      setPurchaseItems(purchaseItems.map(i => 
        i.id === existingItem.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      const newItem: PurchaseItem = {
        id: `stove-${Date.now()}`,
        type: 'stove',
        name: `${stove.brand} ${stove.model}`,
        details: `${stove.burners} Burner`,
        companyPrice,
        quantity: 1,
        stoveId: stove.id
      };
      setPurchaseItems([...purchaseItems, newItem]);
    }
    toast({ title: "Stove added to purchase" });
  };

  const addRegulatorToCart = (regulator: Regulator) => {
    const priceResult = getRegulatorCompanyPrice(regulator.brand, regulator.type);
    const companyPrice = priceResult.found ? priceResult.price : (regulator.price || 0) * 0.7;
    const existingItem = purchaseItems.find(i => i.regulatorId === regulator.id);

    if (existingItem) {
      setPurchaseItems(purchaseItems.map(i => 
        i.id === existingItem.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      const newItem: PurchaseItem = {
        id: `regulator-${Date.now()}`,
        type: 'regulator',
        name: `${regulator.brand} ${regulator.type}`,
        details: regulator.type,
        companyPrice,
        quantity: 1,
        regulatorId: regulator.id
      };
      setPurchaseItems([...purchaseItems, newItem]);
    }
    toast({ title: "Regulator added to purchase" });
  };

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
        size: item.mouthSize || null
      }));

      await supabase.from('pob_transaction_items').insert(items);

      // Update inventory - INCREASE stock
      for (const item of purchaseItems) {
        if (item.type === 'lpg' && item.brandId) {
          const stockField = item.cylinderType === 'refill' ? 'refill_cylinder' 
            : item.cylinderType === 'package' ? 'package_cylinder' 
            : 'empty_cylinder';
          
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
            const stockField = item.cylinder_type === 'refill' ? 'refill_cylinder' 
              : item.cylinder_type === 'package' ? 'package_cylinder' 
              : 'empty_cylinder';
            
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

  // ============= LOADING STATE =============
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
          <p className="text-muted-foreground">Loading Point of Buy...</p>
        </div>
      </div>
    );
  }

  // ============= RENDER =============
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* ===== HEADER WITH KPIs ===== */}
        <div className="flex flex-col gap-4">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <ArrowDownToLine className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Point of Buy</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Purchase products from suppliers at Company Price</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${ROLE_CONFIG[userRole]?.bgColor} ${ROLE_CONFIG[userRole]?.color} border`}>
                <User className="h-3 w-3 mr-1" />
                Buyer: {userName}
              </Badge>
              <Button variant="outline" size="sm" onClick={() => fetchData()} className="h-8">
                <RefreshCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-card dark:from-indigo-950/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Cylinder className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs text-muted-foreground">LPG Stock</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-indigo-700 dark:text-indigo-300">{analytics.totalLpgStock}</p>
              </CardContent>
            </Card>
            <Card className={`border-amber-200 dark:border-amber-800 ${analytics.lowStockBrands > 0 ? 'bg-gradient-to-br from-amber-50 to-card dark:from-amber-950/30' : ''}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${analytics.lowStockBrands > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
                  <span className="text-xs text-muted-foreground">Low Stock</span>
                </div>
                <p className={`text-lg sm:text-xl font-bold ${analytics.lowStockBrands > 0 ? 'text-amber-700 dark:text-amber-300' : ''}`}>{analytics.lowStockBrands}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <ChefHat className="h-4 w-4 text-orange-600" />
                  <span className="text-xs text-muted-foreground">Stoves</span>
                </div>
                <p className="text-lg sm:text-xl font-bold">{analytics.totalStoveStock}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-purple-600" />
                  <span className="text-xs text-muted-foreground">Regulators</span>
                </div>
                <p className="text-lg sm:text-xl font-bold">{analytics.totalRegulatorStock}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ===== MOBILE VIEW TOGGLE ===== */}
        {isMobile && (
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={mobileView === 'products' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-9"
              onClick={() => setMobileView('products')}
            >
              <Package className="h-4 w-4 mr-2" />
              Products
            </Button>
            <Button
              variant={mobileView === 'cart' ? 'default' : 'ghost'}
              size="sm"
              className="flex-1 h-9 relative"
              onClick={() => setMobileView('cart')}
            >
              <ShoppingBag className="h-4 w-4 mr-2" />
              Cart
              {purchaseItemsCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-indigo-600 text-white text-xs">
                  {purchaseItemsCount}
                </Badge>
              )}
            </Button>
          </div>
        )}

        {/* ===== MAIN CONTENT ===== */}
        <div className={`grid gap-4 ${isMobile ? '' : 'lg:grid-cols-3'}`}>
          {/* Products Section */}
          {(!isMobile || mobileView === 'products') && (
            <div className={`space-y-4 ${isMobile ? '' : 'lg:col-span-2'}`}>
              {/* Filters */}
              <Card>
                <CardContent className="p-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Cylinder Type</Label>
                      <Tabs value={cylinderType} onValueChange={(v) => setCylinderType(v as 'refill' | 'package' | 'empty')}>
                        <TabsList className="grid grid-cols-3 h-8">
                          <TabsTrigger value="refill" className="text-[10px] data-[state=active]:bg-indigo-500 data-[state=active]:text-white">Refill</TabsTrigger>
                          <TabsTrigger value="package" className="text-[10px] data-[state=active]:bg-indigo-500 data-[state=active]:text-white">Package</TabsTrigger>
                          <TabsTrigger value="empty" className="text-[10px] data-[state=active]:bg-indigo-500 data-[state=active]:text-white">Empty</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Valve Size</Label>
                      <Tabs value={mouthSize} onValueChange={setMouthSize}>
                        <TabsList className="grid grid-cols-2 h-8">
                          <TabsTrigger value="22mm" className="text-[10px] data-[state=active]:bg-indigo-500 data-[state=active]:text-white">22mm</TabsTrigger>
                          <TabsTrigger value="20mm" className="text-[10px] data-[state=active]:bg-indigo-500 data-[state=active]:text-white">20mm</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Weight</Label>
                      <Select value={weight} onValueChange={setWeight}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(mouthSize === '22mm' ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM).map(w => (
                            <SelectItem key={w} value={w}>{w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Search</Label>
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input 
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search..."
                          className="h-8 pl-7 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Products Grid */}
              <Card>
                <CardHeader className="py-2 px-3 border-b">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="h-8">
                      <TabsTrigger value="lpg" className="text-xs data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
                        <Cylinder className="h-3.5 w-3.5 mr-1" />LPG
                      </TabsTrigger>
                      <TabsTrigger value="stove" className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                        <ChefHat className="h-3.5 w-3.5 mr-1" />Stoves
                      </TabsTrigger>
                      <TabsTrigger value="regulator" className="text-xs data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                        <Gauge className="h-3.5 w-3.5 mr-1" />Regulators
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent className="p-3">
                  <ScrollArea className="h-[300px] sm:h-[400px]">
                    {/* LPG Cylinders */}
                    {activeTab === 'lpg' && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
                        {filteredBrands.map(brand => {
                          const priceResult = getLPGCompanyPrice(brand.id, weight, cylinderType, mouthSize);
                          const currentStock = cylinderType === 'refill' ? brand.refill_cylinder 
                            : cylinderType === 'package' ? brand.package_cylinder 
                            : brand.empty_cylinder;
                          
                          return (
                            <button
                              key={brand.id}
                              onClick={() => addLPGToCart(brand)}
                              className={`p-3 rounded-xl border-2 text-left transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] relative bg-card ${
                                priceResult.found ? 'border-transparent hover:border-indigo-400' : 'border-destructive/30 opacity-75'
                              }`}
                            >
                              <div 
                                className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl"
                                style={{ backgroundColor: brand.color }}
                              />
                              <div className="flex items-start gap-2 pt-1">
                                <div 
                                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                                  style={{ backgroundColor: brand.color }}
                                >
                                  <Cylinder className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-sm truncate">{brand.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{weight} • {mouthSize}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <div className="flex flex-col">
                                  <span className={`font-bold text-base ${priceResult.found ? 'text-indigo-600 dark:text-indigo-400' : 'text-destructive'}`}>
                                    {priceResult.found ? `${BANGLADESHI_CURRENCY_SYMBOL}${priceResult.price.toLocaleString()}` : 'No Price'}
                                  </span>
                                  {priceResult.found && (
                                    <span className="text-[9px] text-muted-foreground">{priceResult.priceType} Price</span>
                                  )}
                                </div>
                                <Badge variant={currentStock < 10 ? "destructive" : "secondary"} className="text-[9px] px-1.5">
                                  {currentStock < 10 ? <AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> : <TrendingUp className="h-2.5 w-2.5 mr-0.5" />}
                                  {currentStock}
                                </Badge>
                              </div>
                            </button>
                          );
                        })}
                        {filteredBrands.length === 0 && (
                          <div className="col-span-full text-center py-8 text-muted-foreground">
                            <Cylinder className="h-10 w-10 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No cylinders found for {mouthSize} / {weight}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Stoves */}
                    {activeTab === 'stove' && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
                        {filteredStoves.map(stove => {
                          const priceResult = getStoveCompanyPrice(stove.brand, stove.model);
                          const companyPrice = priceResult.found ? priceResult.price : stove.price * 0.7;
                          return (
                            <button
                              key={stove.id}
                              onClick={() => addStoveToCart(stove)}
                              className="p-3 rounded-xl border-2 text-left transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] relative border-transparent hover:border-orange-400 bg-card"
                            >
                              <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl bg-orange-500" />
                              <div className="flex items-start gap-2 pt-1">
                                <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <ChefHat className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-sm truncate">{stove.brand}</p>
                                  <p className="text-[10px] text-muted-foreground">{stove.burners}B • {stove.model}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <span className="font-bold text-base text-orange-600 dark:text-orange-400">{BANGLADESHI_CURRENCY_SYMBOL}{Math.round(companyPrice)}</span>
                                <Badge variant="secondary" className="text-[9px] px-1.5">
                                  <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                  {stove.quantity}
                                </Badge>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Regulators */}
                    {activeTab === 'regulator' && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2">
                        {filteredRegulators.map(reg => {
                          const priceResult = getRegulatorCompanyPrice(reg.brand, reg.type);
                          const companyPrice = priceResult.found ? priceResult.price : (reg.price || 0) * 0.7;
                          return (
                            <button
                              key={reg.id}
                              onClick={() => addRegulatorToCart(reg)}
                              className="p-3 rounded-xl border-2 text-left transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] relative border-transparent hover:border-purple-400 bg-card"
                            >
                              <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl bg-purple-500" />
                              <div className="flex items-start gap-2 pt-1">
                                <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                                  <Gauge className="h-5 w-5 text-white" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-sm truncate">{reg.brand}</p>
                                  <p className="text-[10px] text-muted-foreground">{reg.type}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-3">
                                <span className="font-bold text-base text-purple-600 dark:text-purple-400">{BANGLADESHI_CURRENCY_SYMBOL}{Math.round(companyPrice)}</span>
                                <Badge variant="secondary" className="text-[9px] px-1.5">
                                  <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                                  {reg.quantity}
                                </Badge>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Cart Section */}
          {(!isMobile || mobileView === 'cart') && (
            <div className="space-y-4">
              {/* Purchase Cart */}
              <Card className="border-indigo-200 dark:border-indigo-800">
                <CardHeader className="py-3 px-4 border-b border-indigo-100 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                      <ShoppingBag className="h-4 w-4" />
                      Purchase Cart ({purchaseItemsCount})
                    </CardTitle>
                    {purchaseItems.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={clearCart} className="h-7 text-xs text-destructive hover:text-destructive">
                        <Trash2 className="h-3 w-3 mr-1" /> Clear
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  {purchaseItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <PackagePlus className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Select products to add to purchase</p>
                      <p className="text-xs mt-1">Products are bought at Company Price</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[250px]">
                      <div className="space-y-2">
                        {purchaseItems.map(item => (
                          <div key={item.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/50 border">
                            <div 
                              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
                              style={{ backgroundColor: item.brandColor || (item.type === 'stove' ? '#f97316' : item.type === 'regulator' ? '#8b5cf6' : '#6366f1') }}
                            >
                              {item.type === 'lpg' ? <Cylinder className="h-4 w-4 text-white" /> :
                               item.type === 'stove' ? <ChefHat className="h-4 w-4 text-white" /> :
                               <Gauge className="h-4 w-4 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-xs truncate">{item.name}</p>
                              <p className="text-[10px] text-muted-foreground">{item.details}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="outline" className="h-7 w-7 min-w-[28px]" onClick={() => updateItemQuantity(item.id, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                              <Button size="icon" variant="outline" className="h-7 w-7 min-w-[28px]" onClick={() => updateItemQuantity(item.id, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400 w-16 text-right">
                              {BANGLADESHI_CURRENCY_SYMBOL}{(item.companyPrice * item.quantity).toLocaleString()}
                            </span>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 min-w-[28px] text-destructive hover:bg-destructive/10" 
                              onClick={() => removeItem(item.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Checkout Section */}
              <Card>
                <CardContent className="p-4 space-y-4">
                  {/* Supplier Selection */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Supplier</Label>
                    {showCustomSupplierInput ? (
                      <div className="flex gap-2">
                        <Input 
                          value={customSupplier}
                          onChange={(e) => setCustomSupplier(e.target.value)}
                          placeholder="Enter supplier name"
                          className="h-9 flex-1"
                        />
                        <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => setShowCustomSupplierInput(false)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Select value={supplierName} onValueChange={setSupplierName}>
                          <SelectTrigger className="h-9 flex-1">
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            {SUPPLIERS.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={() => setShowCustomSupplierInput(true)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Total */}
                  <div className="p-3 rounded-lg bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Total Purchase</span>
                      <span className="font-bold text-xl text-indigo-700 dark:text-indigo-300">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleCompletePurchase('completed')}
                      disabled={processing || purchaseItems.length === 0}
                      className="h-11 bg-indigo-600 hover:bg-indigo-700"
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wallet className="h-4 w-4 mr-2" /> Pay Now</>}
                    </Button>
                    <Button
                      onClick={() => handleCompletePurchase('pending')}
                      disabled={processing || purchaseItems.length === 0}
                      variant="outline"
                      className="h-11 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                    >
                      <CreditCard className="h-4 w-4 mr-2" /> Save as Credit
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Purchases */}
              {recentPurchases.length > 0 && (
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-xs flex items-center gap-2 text-muted-foreground">
                      <Undo2 className="h-3.5 w-3.5" /> Recent (Void within 5 min)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    <div className="space-y-2">
                      {recentPurchases.map(txn => (
                        <div key={txn.id} className="flex items-center justify-between p-2 rounded-lg border bg-card">
                          <div>
                            <span className="text-[10px] font-mono text-muted-foreground">{txn.transactionNumber}</span>
                            <p className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{BANGLADESHI_CURRENCY_SYMBOL}{txn.total.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={txn.status === 'completed' ? 'secondary' : 'outline'} className="text-[9px]">
                              {txn.status === 'completed' ? 'Paid' : 'Credit'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-destructive text-[10px]"
                              onClick={() => { setPurchaseToVoid(txn); setShowVoidDialog(true); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* ===== VOID DIALOG ===== */}
        <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-5 w-5" /> Void Purchase
              </DialogTitle>
              <DialogDescription>
                This will reverse all inventory changes and remove the expense entry.
              </DialogDescription>
            </DialogHeader>
            {purchaseToVoid && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="font-mono text-sm">{purchaseToVoid.transactionNumber}</p>
                <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{BANGLADESHI_CURRENCY_SYMBOL}{purchaseToVoid.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{purchaseToVoid.supplierName}</p>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowVoidDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleVoidPurchase}>
                <Trash2 className="h-4 w-4 mr-1" /> Confirm Void
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};
