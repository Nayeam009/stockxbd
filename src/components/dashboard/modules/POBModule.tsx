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
  Fuel,
  ChefHat,
  Gauge,
  Cylinder,
  CreditCard,
  Wallet,
  CheckCircle2,
  Building2,
  PackagePlus,
  Undo2,
  TrendingUp
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { supabase } from "@/integrations/supabase/client";
import { parsePositiveNumber } from "@/lib/validationSchemas";
import { useLanguage } from "@/contexts/LanguageContext";

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
  owner: { label: 'Owner', color: 'text-emerald-700', bgColor: 'bg-emerald-100 border-emerald-300' },
  manager: { label: 'Manager', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-300' },
};

// ============= MAIN POB MODULE =============
export const POBModule = ({ userRole = 'owner', userName = 'User' }: POBModuleProps) => {
  const { t, language } = useLanguage();
  
  // ===== DATA STATE =====
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);
  
  // ===== PRODUCT SELECTION STATE =====
  const [activeTab, setActiveTab] = useState("all");
  const [cylinderType, setCylinderType] = useState<"refill" | "package" | "empty">("refill");
  const [mouthSize, setMouthSize] = useState("22mm");
  const [weight, setWeight] = useState("12kg");
  const [productSearch, setProductSearch] = useState("");
  
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
  const getLPGCompanyPrice = useCallback((brandId: string, weightVal: string) => {
    const priceEntry = productPrices.find(
      p => p.product_type === 'lpg' && p.brand_id === brandId && p.size?.includes(weightVal)
    );
    return priceEntry?.company_price || 0;
  }, [productPrices]);

  const getStoveCompanyPrice = useCallback((brand: string, model: string) => {
    const priceEntry = productPrices.find(
      p => p.product_type === 'stove' && 
           p.product_name.toLowerCase().includes(brand.toLowerCase()) &&
           p.product_name.toLowerCase().includes(model.toLowerCase())
    );
    return priceEntry?.company_price || 0;
  }, [productPrices]);

  const getRegulatorCompanyPrice = useCallback((brand: string, type: string) => {
    const priceEntry = productPrices.find(
      p => p.product_type === 'regulator' && 
           p.product_name.toLowerCase().includes(brand.toLowerCase()) &&
           p.product_name.toLowerCase().includes(type.toLowerCase())
    );
    return priceEntry?.company_price || 0;
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

  // ============= PRODUCT ACTIONS =============
  const addLPGToCart = (brand: LPGBrand) => {
    const companyPrice = getLPGCompanyPrice(brand.id, weight);
    
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
        details: `${weight} • ${cylinderType === 'refill' ? 'Refill' : cylinderType === 'package' ? 'Package' : 'Empty'}`,
        companyPrice,
        quantity: 1,
        cylinderType,
        brandId: brand.id,
        weight,
        mouthSize,
        brandColor: brand.color
      };
      setPurchaseItems([...purchaseItems, newItem]);
    }
    toast({ title: `${brand.name} added to purchase` });
  };

  const addStoveToCart = (stove: Stove) => {
    const companyPrice = getStoveCompanyPrice(stove.brand, stove.model) || stove.price * 0.7;
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
    const companyPrice = getRegulatorCompanyPrice(regulator.brand, regulator.type) || (regulator.price || 0) * 0.7;
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
      // Generate POB number
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const { count } = await supabase
        .from('pob_transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString().slice(0, 10));
      const txnNumber = `POB-${dateStr}-${String((count || 0) + 1).padStart(4, '0')}`;

      const finalSupplier = showCustomSupplierInput ? customSupplier : supplierName;

      // Create POB transaction
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

      // Create transaction items
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

      // Clear cart and refresh
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
      // Mark transaction as voided
      await supabase
        .from('pob_transactions')
        .update({ is_voided: true, voided_at: new Date().toISOString() })
        .eq('id', purchaseToVoid.id);

      // Reverse inventory changes
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

      // Delete the expense entry
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
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading Point of Buy...</p>
        </div>
      </div>
    );
  }

  // ============= RENDER =============
  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* ===== HEADER ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <PackagePlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Point of Buy</h1>
              <p className="text-xs text-muted-foreground">Purchase products from suppliers</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-700 border-blue-300">
              <Building2 className="h-3 w-3 mr-1" />
              {purchaseItemsCount} Items
            </Badge>
            {purchaseItems.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearCart} className="h-8">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>

        {/* ===== PURCHASE CART ===== */}
        <Card className="border-blue-200 bg-gradient-to-b from-blue-50/50 to-background">
          <CardHeader className="py-2 px-3 border-b border-blue-100">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
              <ShoppingBag className="h-4 w-4" />
              Products to Buy ({purchaseItemsCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {purchaseItems.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <PackagePlus className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select products below to add to purchase</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[200px]">
                <div className="space-y-1.5">
                  {purchaseItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: item.brandColor || (item.type === 'stove' ? '#f97316' : item.type === 'regulator' ? '#8b5cf6' : '#3b82f6') }}
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
                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateItemQuantity(item.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateItemQuantity(item.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="font-bold text-xs text-blue-600 w-16 text-right">
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

        {/* ===== FILTERS ===== */}
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Cylinder Type */}
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Cylinder Type</Label>
                <Tabs value={cylinderType} onValueChange={(v) => setCylinderType(v as 'refill' | 'package' | 'empty')}>
                  <TabsList className="grid grid-cols-3 h-8">
                    <TabsTrigger value="refill" className="text-[10px] data-[state=active]:bg-blue-500 data-[state=active]:text-white">Refill</TabsTrigger>
                    <TabsTrigger value="package" className="text-[10px] data-[state=active]:bg-blue-500 data-[state=active]:text-white">Package</TabsTrigger>
                    <TabsTrigger value="empty" className="text-[10px] data-[state=active]:bg-blue-500 data-[state=active]:text-white">Empty</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Valve Size */}
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Valve Size</Label>
                <Tabs value={mouthSize} onValueChange={setMouthSize}>
                  <TabsList className="grid grid-cols-2 h-8">
                    <TabsTrigger value="22mm" className="text-[10px] data-[state=active]:bg-blue-500 data-[state=active]:text-white">22mm</TabsTrigger>
                    <TabsTrigger value="20mm" className="text-[10px] data-[state=active]:bg-blue-500 data-[state=active]:text-white">20mm</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Weight */}
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

              {/* Search */}
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

        {/* ===== PRODUCTS GRID ===== */}
        <Card>
          <CardHeader className="py-2 px-3 border-b">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-8">
                <TabsTrigger value="all" className="text-xs data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  <Package className="h-3.5 w-3.5 mr-1" />All
                </TabsTrigger>
                <TabsTrigger value="lpg" className="text-xs data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                  <Cylinder className="h-3.5 w-3.5 mr-1" />LPG
                </TabsTrigger>
                <TabsTrigger value="stove" className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                  <ChefHat className="h-3.5 w-3.5 mr-1" />Stove
                </TabsTrigger>
                <TabsTrigger value="regulator" className="text-xs data-[state=active]:bg-violet-500 data-[state=active]:text-white">
                  <Gauge className="h-3.5 w-3.5 mr-1" />Reg
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <ScrollArea className="h-[240px] sm:h-[280px]">
              {/* LPG Cylinders */}
              {(activeTab === 'lpg' || activeTab === 'all') && (
                <div className="mb-3">
                  {activeTab === 'all' && <p className="text-xs font-medium text-muted-foreground mb-2">LPG Cylinders</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {(activeTab === 'all' ? filteredBrands.slice(0, 5) : filteredBrands).map(brand => {
                      const companyPrice = getLPGCompanyPrice(brand.id, weight);
                      const currentStock = cylinderType === 'refill' ? brand.refill_cylinder 
                        : cylinderType === 'package' ? brand.package_cylinder 
                        : brand.empty_cylinder;
                      
                      return (
                        <button
                          key={brand.id}
                          onClick={() => addLPGToCart(brand)}
                          className="p-2.5 rounded-lg border-2 text-left transition-all hover:shadow-md relative border-transparent hover:border-blue-500/50 bg-card"
                        >
                          <div 
                            className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                            style={{ backgroundColor: brand.color }}
                          />
                          <div className="flex items-start gap-2 pt-1">
                            <div 
                              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: brand.color }}
                            >
                              <Cylinder className="h-5 w-5 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-xs truncate">{brand.name}</p>
                              <p className="text-[10px] text-muted-foreground">{weight}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-sm text-blue-600">{BANGLADESHI_CURRENCY_SYMBOL}{companyPrice}</span>
                            <Badge variant="secondary" className="text-[9px] px-1.5">
                              <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                              {currentStock}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stoves */}
              {(activeTab === 'stove' || activeTab === 'all') && (
                <div className="mb-3">
                  {activeTab === 'all' && <p className="text-xs font-medium text-muted-foreground mb-2">Gas Stoves</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {(activeTab === 'all' ? filteredStoves.slice(0, 3) : filteredStoves).map(stove => {
                      const companyPrice = getStoveCompanyPrice(stove.brand, stove.model) || stove.price * 0.7;
                      return (
                        <button
                          key={stove.id}
                          onClick={() => addStoveToCart(stove)}
                          className="p-2.5 rounded-lg border-2 text-left transition-all hover:shadow-md relative border-transparent hover:border-orange-500/50 bg-card"
                        >
                          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-orange-500" />
                          <div className="flex items-start gap-2 pt-1">
                            <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                              <ChefHat className="h-5 w-5 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-xs truncate">{stove.brand}</p>
                              <p className="text-[10px] text-muted-foreground">{stove.burners}B • {stove.model}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-sm text-orange-600">{BANGLADESHI_CURRENCY_SYMBOL}{Math.round(companyPrice)}</span>
                            <Badge variant="secondary" className="text-[9px] px-1.5">
                              <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                              {stove.quantity}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Regulators */}
              {(activeTab === 'regulator' || activeTab === 'all') && (
                <div>
                  {activeTab === 'all' && <p className="text-xs font-medium text-muted-foreground mb-2">Regulators</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {(activeTab === 'all' ? filteredRegulators.slice(0, 3) : filteredRegulators).map(reg => {
                      const companyPrice = getRegulatorCompanyPrice(reg.brand, reg.type) || (reg.price || 0) * 0.7;
                      return (
                        <button
                          key={reg.id}
                          onClick={() => addRegulatorToCart(reg)}
                          className="p-2.5 rounded-lg border-2 text-left transition-all hover:shadow-md relative border-transparent hover:border-violet-500/50 bg-card"
                        >
                          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg bg-violet-500" />
                          <div className="flex items-start gap-2 pt-1">
                            <div className="w-9 h-9 rounded-lg bg-violet-500 flex items-center justify-center flex-shrink-0">
                              <Gauge className="h-5 w-5 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-xs truncate">{reg.brand}</p>
                              <p className="text-[10px] text-muted-foreground">{reg.type}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-sm text-violet-600">{BANGLADESHI_CURRENCY_SYMBOL}{Math.round(companyPrice)}</span>
                            <Badge variant="secondary" className="text-[9px] px-1.5">
                              <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                              {reg.quantity}
                            </Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {filteredBrands.length === 0 && activeTab === 'lpg' && (
                <div className="text-center py-8 text-muted-foreground">
                  <Cylinder className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No cylinders found for {mouthSize} / {weight}</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ===== CHECKOUT SECTION ===== */}
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Supplier Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs">Supplier</Label>
                {showCustomSupplierInput ? (
                  <div className="flex gap-1.5">
                    <Input 
                      value={customSupplier}
                      onChange={(e) => setCustomSupplier(e.target.value)}
                      placeholder="Enter supplier name"
                      className="h-9 flex-1"
                    />
                    <Button size="sm" variant="ghost" className="h-9" onClick={() => setShowCustomSupplierInput(false)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
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

              {/* Buyer Role Indicator */}
              <div className="space-y-1.5">
                <Label className="text-xs">Buyer</Label>
                <div className={`h-9 px-3 flex items-center gap-2 rounded-md border ${ROLE_CONFIG[userRole]?.bgColor || 'bg-muted border-border'}`}>
                  <User className={`h-4 w-4 ${ROLE_CONFIG[userRole]?.color || 'text-foreground'}`} />
                  <span className={`text-sm font-medium ${ROLE_CONFIG[userRole]?.color || 'text-foreground'}`}>
                    {ROLE_CONFIG[userRole]?.label || 'User'}
                  </span>
                </div>
              </div>

              {/* Total Display */}
              <div className="space-y-1.5">
                <Label className="text-xs">Total Purchase</Label>
                <div className="h-9 px-3 flex items-center justify-between rounded-md border bg-blue-50 border-blue-200">
                  <span className="text-sm text-blue-600">Grand Total</span>
                  <span className="font-bold text-lg text-blue-700">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-1.5">
                <Label className="text-xs">Complete Purchase</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    onClick={() => handleCompletePurchase('completed')}
                    disabled={processing || purchaseItems.length === 0}
                    className="h-9 bg-blue-600 hover:bg-blue-700"
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wallet className="h-4 w-4 mr-1" /> Paid</>}
                  </Button>
                  <Button
                    onClick={() => handleCompletePurchase('pending')}
                    disabled={processing || purchaseItems.length === 0}
                    variant="outline"
                    className="h-9 border-amber-500 text-amber-600 hover:bg-amber-50"
                  >
                    <CreditCard className="h-4 w-4 mr-1" /> Credit
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== RECENT PURCHASES ===== */}
        {recentPurchases.length > 0 && (
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <Undo2 className="h-3.5 w-3.5" /> Recent (Void within 5 min)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recentPurchases.map(txn => (
                  <div key={txn.id} className="flex-shrink-0 p-2 rounded-lg border bg-card min-w-[140px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">{txn.transactionNumber}</span>
                      <Badge variant={txn.status === 'completed' ? 'secondary' : 'outline'} className="text-[8px]">
                        {txn.status === 'completed' ? 'Paid' : 'Credit'}
                      </Badge>
                    </div>
                    <p className="font-bold text-sm text-blue-600">{BANGLADESHI_CURRENCY_SYMBOL}{txn.total.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{txn.supplierName}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full h-6 mt-1 text-destructive text-[10px]"
                      onClick={() => { setPurchaseToVoid(txn); setShowVoidDialog(true); }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Void
                    </Button>
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
                <p className="text-lg font-bold text-blue-600">{BANGLADESHI_CURRENCY_SYMBOL}{purchaseToVoid.total.toLocaleString()}</p>
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
