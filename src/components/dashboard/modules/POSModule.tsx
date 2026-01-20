import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  Loader2,
  X,
  User,
  Phone,
  MapPin,
  UserPlus,
  Search,
  Package,
  ScanLine,
  Undo2,
  Fuel,
  ChefHat,
  Gauge,
  ArrowLeftRight,
  Cylinder,
  CreditCard,
  Wallet,
  CheckCircle2,
  RotateCcw
} from "lucide-react";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { getBrandMouthSizeMap } from "@/lib/brandConstants";
import { supabase } from "@/integrations/supabase/client";
import { parsePositiveNumber, sanitizeString } from "@/lib/validationSchemas";
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";
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

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  total_due: number;
  cylinders_due: number;
  billing_status: string;
  last_order_date: string | null;
  credit_limit?: number;
}

interface SaleItem {
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

interface ReturnItem {
  id: string;
  brandId: string;
  brandName: string;
  brandColor: string;
  quantity: number;
  isLeaked: boolean;
  weight: string;
}

interface RecentTransaction {
  id: string;
  transactionNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: Date;
  items: { name: string; quantity: number }[];
}

// Weight options
const WEIGHT_OPTIONS_22MM = ["5.5kg", "12kg", "12.5kg", "25kg", "35kg", "45kg"];
const WEIGHT_OPTIONS_20MM = ["5kg", "10kg", "12kg", "15kg", "21kg", "35kg"];
const DEFAULT_CREDIT_LIMIT = 10000;

// ============= POS MODULE PROPS =============
interface POSModuleProps {
  userRole?: 'owner' | 'manager' | 'driver';
  userName?: string;
}

// Role display config
const ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  owner: { label: 'Owner', color: 'text-emerald-700', bgColor: 'bg-emerald-100 border-emerald-300' },
  manager: { label: 'Manager', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-300' },
  driver: { label: 'Driver', color: 'text-amber-700', bgColor: 'bg-amber-100 border-amber-300' },
  staff: { label: 'Staff', color: 'text-purple-700', bgColor: 'bg-purple-100 border-purple-300' },
};

// ============= MAIN POS MODULE =============
export const POSModule = ({ userRole = 'owner', userName = 'User' }: POSModuleProps) => {
  const { t, language } = useLanguage();
  
  // ===== DATA STATE =====
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);
  // Drivers no longer needed for POS - seller role comes from userRole prop
  
  // ===== ACTIVE TABLE STATE (Sale or Return) =====
  const [activeTable, setActiveTable] = useState<'sale' | 'return'>('sale');
  
  // ===== PRODUCT SELECTION STATE =====
  const [activeTab, setActiveTab] = useState("all");
  const [cylinderType, setCylinderType] = useState<"refill" | "package">("refill");
  const [saleType, setSaleType] = useState<"retail" | "wholesale">("retail");
  const [mouthSize, setMouthSize] = useState("22mm");
  const [weight, setWeight] = useState("12kg");
  const [productSearch, setProductSearch] = useState("");
  
  // ===== CART STATE (Selling Items) =====
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  
  // ===== RETURN CYLINDER STATE =====
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [customReturnBrand, setCustomReturnBrand] = useState("");
  const [showCustomBrandInput, setShowCustomBrandInput] = useState(false);
  
  // ===== CUSTOM SELLING BRAND STATE =====
  const [showCustomSellingBrandInput, setShowCustomSellingBrandInput] = useState(false);
  const [customSellingBrand, setCustomSellingBrand] = useState("");
  const [customSellingPrice, setCustomSellingPrice] = useState("");
  
  // ===== CUSTOM STOVE/REGULATOR STATE =====
  const [showCustomStoveInput, setShowCustomStoveInput] = useState(false);
  const [customStove, setCustomStove] = useState({ brand: "", burners: 1, price: "" });
  const [showCustomRegulatorInput, setShowCustomRegulatorInput] = useState(false);
  const [customRegulator, setCustomRegulator] = useState({ brand: "", type: "22mm", price: "" });
  
  // ===== CUSTOM WEIGHT STATE =====
  const [showCustomWeightInput, setShowCustomWeightInput] = useState(false);
  const [customWeight, setCustomWeight] = useState("");
  
  // ===== CUSTOMER STATE =====
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>("walkin");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [discount, setDiscount] = useState("0");
  // Driver assignment removed - seller identified by userRole and created_by
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  
  // ===== UI STATE =====
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [showPrintTypeDialog, setShowPrintTypeDialog] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [transactionToVoid, setTransactionToVoid] = useState<RecentTransaction | null>(null);

  // ============= DATA FETCHING =============
  const fetchData = useCallback(async () => {
    const [brandsRes, stovesRes, regulatorsRes, customersRes, pricesRes] = await Promise.all([
      supabase.from('lpg_brands').select('*').eq('is_active', true),
      supabase.from('stoves').select('*').eq('is_active', true),
      supabase.from('regulators').select('*').eq('is_active', true),
      supabase.from('customers').select('*').order('name'),
      supabase.from('product_prices').select('*').eq('is_active', true)
    ]);

    if (brandsRes.data) setLpgBrands(brandsRes.data);
    if (stovesRes.data) setStoves(stovesRes.data);
    if (regulatorsRes.data) setRegulators(regulatorsRes.data);
    if (customersRes.data) setCustomers(customersRes.data);
    if (pricesRes.data) setProductPrices(pricesRes.data);

    // Fetch recent transactions
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentTxns } = await supabase
      .from('pos_transactions')
      .select(`id, transaction_number, total, payment_status, created_at, pos_transaction_items (product_name, quantity)`)
      .gte('created_at', fiveMinutesAgo)
      .eq('is_voided', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentTxns) {
      setRecentTransactions(recentTxns.map(t => ({
        id: t.id,
        transactionNumber: t.transaction_number,
        customerName: 'Customer',
        total: Number(t.total),
        status: t.payment_status,
        createdAt: new Date(t.created_at),
        items: t.pos_transaction_items?.map((i: any) => ({ name: i.product_name, quantity: i.quantity })) || []
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
      supabase.channel('pos-lpg').on('postgres_changes', { event: '*', schema: 'public', table: 'lpg_brands' }, () => {
        supabase.from('lpg_brands').select('*').eq('is_active', true).then(({ data }) => data && setLpgBrands(data));
      }).subscribe(),
      supabase.channel('pos-stoves').on('postgres_changes', { event: '*', schema: 'public', table: 'stoves' }, () => {
        supabase.from('stoves').select('*').eq('is_active', true).then(({ data }) => data && setStoves(data));
      }).subscribe(),
      supabase.channel('pos-regulators').on('postgres_changes', { event: '*', schema: 'public', table: 'regulators' }, () => {
        supabase.from('regulators').select('*').eq('is_active', true).then(({ data }) => data && setRegulators(data));
      }).subscribe(),
      supabase.channel('pos-customers').on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        supabase.from('customers').select('*').order('name').then(({ data }) => data && setCustomers(data));
      }).subscribe(),
      supabase.channel('pos-prices').on('postgres_changes', { event: '*', schema: 'public', table: 'product_prices' }, () => {
        supabase.from('product_prices').select('*').eq('is_active', true).then(({ data }) => data && setProductPrices(data));
      }).subscribe()
    ];

    return () => channels.forEach(ch => supabase.removeChannel(ch));
  }, [fetchData]);

  // ============= PRICE HELPERS =============
  const getLPGPrice = useCallback((brandId: string, weightVal: string, cylType: 'refill' | 'package', saleTp: 'retail' | 'wholesale') => {
    const priceEntry = productPrices.find(
      p => p.product_type === 'lpg' && p.brand_id === brandId && p.size?.includes(weightVal)
    );
    if (!priceEntry) return 0;
    if (cylType === 'package') return priceEntry.package_price || priceEntry.retail_price;
    return saleTp === 'wholesale' ? priceEntry.distributor_price : priceEntry.retail_price;
  }, [productPrices]);

  const getStovePrice = useCallback((brand: string, model: string) => {
    const priceEntry = productPrices.find(
      p => p.product_type === 'stove' && 
           p.product_name.toLowerCase().includes(brand.toLowerCase()) &&
           p.product_name.toLowerCase().includes(model.toLowerCase())
    );
    return priceEntry?.retail_price || 0;
  }, [productPrices]);

  const getRegulatorPrice = useCallback((brand: string, type: string) => {
    const priceEntry = productPrices.find(
      p => p.product_type === 'regulator' && 
           p.product_name.toLowerCase().includes(brand.toLowerCase()) &&
           p.product_name.toLowerCase().includes(type.toLowerCase())
    );
    return priceEntry?.retail_price || 0;
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

  // All brands for return (matching current weight selection)
  const brandsForReturn = useMemo(() => {
    return lpgBrands.filter(b => b.weight === weight);
  }, [lpgBrands, weight]);

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

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone?.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  // ============= CART CALCULATIONS =============
  const refillCylindersCount = useMemo(() => {
    return saleItems
      .filter(i => i.type === 'lpg' && i.cylinderType === 'refill')
      .reduce((sum, i) => sum + i.quantity, 0);
  }, [saleItems]);

  const packageCylindersCount = useMemo(() => {
    return saleItems
      .filter(i => i.type === 'lpg' && i.cylinderType === 'package')
      .reduce((sum, i) => sum + i.quantity, 0);
  }, [saleItems]);

  const returnCylindersCount = useMemo(() => {
    return returnItems.reduce((sum, i) => sum + i.quantity, 0);
  }, [returnItems]);

  const saleItemsCount = useMemo(() => {
    return saleItems.reduce((s, i) => s + i.quantity, 0);
  }, [saleItems]);

  const isReturnCountMatched = refillCylindersCount === 0 || refillCylindersCount === returnCylindersCount;
  const hasRefillInCart = refillCylindersCount > 0;
  // Wholesale condition: more than 1 product in cart allows "Due" payment (cylinder credit)
  const isWholesaleEligible = saleItemsCount > 1;

  const subtotal = saleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = parsePositiveNumber(discount, 10000000);
  const total = Math.max(0, subtotal - discountAmount);

  // ============= PRODUCT ACTIONS =============
  const addLPGToCart = (brand: LPGBrand) => {
    const stock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
    if (stock === 0) {
      toast({ title: "Out of Stock", variant: "destructive" });
      return;
    }

    const price = getLPGPrice(brand.id, weight, cylinderType, saleType);
    
    const existingItem = saleItems.find(
      i => i.type === 'lpg' && i.brandId === brand.id && i.cylinderType === cylinderType && i.weight === weight
    );

    if (existingItem) {
      if (existingItem.quantity >= stock) {
        toast({ title: `Only ${stock} in stock`, variant: "destructive" });
        return;
      }
      setSaleItems(saleItems.map(i => 
        i.id === existingItem.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
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
      setSaleItems([...saleItems, newItem]);
    }
    toast({ title: `${brand.name} added to sale` });
  };

  const addStoveToCart = (stove: Stove) => {
    if (stove.quantity === 0) {
      toast({ title: "Out of Stock", variant: "destructive" });
      return;
    }

    const price = getStovePrice(stove.brand, stove.model) || stove.price;
    const existingItem = saleItems.find(i => i.stoveId === stove.id);

    if (existingItem) {
      if (existingItem.quantity >= stove.quantity) {
        toast({ title: `Only ${stove.quantity} in stock`, variant: "destructive" });
        return;
      }
      setSaleItems(saleItems.map(i => 
        i.id === existingItem.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      const newItem: SaleItem = {
        id: `stove-${Date.now()}`,
        type: 'stove',
        name: `${stove.brand} ${stove.model}`,
        details: `${stove.burners} Burner`,
        price,
        quantity: 1,
        stoveId: stove.id
      };
      setSaleItems([...saleItems, newItem]);
    }
    toast({ title: "Stove added to sale" });
  };

  const addRegulatorToCart = (regulator: Regulator) => {
    if (regulator.quantity === 0) {
      toast({ title: "Out of Stock", variant: "destructive" });
      return;
    }

    const price = getRegulatorPrice(regulator.brand, regulator.type) || regulator.price || 0;
    const existingItem = saleItems.find(i => i.regulatorId === regulator.id);

    if (existingItem) {
      if (existingItem.quantity >= regulator.quantity) {
        toast({ title: `Only ${regulator.quantity} in stock`, variant: "destructive" });
        return;
      }
      setSaleItems(saleItems.map(i => 
        i.id === existingItem.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      const newItem: SaleItem = {
        id: `reg-${Date.now()}`,
        type: 'regulator',
        name: regulator.brand,
        details: regulator.type,
        price,
        quantity: 1,
        regulatorId: regulator.id
      };
      setSaleItems([...saleItems, newItem]);
    }
    toast({ title: "Regulator added to sale" });
  };

  const updateItemQuantity = (id: string, change: number) => {
    setSaleItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + change;
        if (newQty < 1) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setSaleItems(prev => prev.filter(item => item.id !== id));
  };

  // ============= RETURN CYLINDER ACTIONS =============
  const addReturnCylinder = (brand: LPGBrand) => {
    const existingReturn = returnItems.find(r => r.brandId === brand.id && !r.isLeaked);
    
    if (existingReturn) {
      setReturnItems(prev => prev.map(r => 
        r.id === existingReturn.id ? { ...r, quantity: r.quantity + 1 } : r
      ));
    } else {
      setReturnItems([...returnItems, {
        id: `return-${Date.now()}`,
        brandId: brand.id,
        brandName: brand.name,
        brandColor: brand.color,
        quantity: 1,
        isLeaked: false,
        weight: weight
      }]);
    }
    toast({ title: `${brand.name} added to return` });
  };

  const updateReturnQuantity = (id: string, change: number) => {
    setReturnItems(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + change;
        if (newQty < 1) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeReturnItem = (id: string) => {
    setReturnItems(prev => prev.filter(item => item.id !== id));
  };

  const toggleReturnLeaked = (id: string) => {
    setReturnItems(prev => prev.map(item => 
      item.id === id ? { ...item, isLeaked: !item.isLeaked } : item
    ));
  };

  // ============= CUSTOM BRAND HANDLER (RETURN) =============
  const handleAddCustomBrand = async () => {
    if (!customReturnBrand.trim()) {
      toast({ title: "Enter brand name", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: ownerId } = await supabase.rpc("get_owner_id");

      // Create new brand
      const { data: newBrand, error: brandError } = await supabase
        .from('lpg_brands')
        .insert({
          name: sanitizeString(customReturnBrand),
          size: mouthSize,
          weight: weight,
          color: '#6b7280',
          package_cylinder: 0,
          refill_cylinder: 0,
          empty_cylinder: 0,
          problem_cylinder: 0,
          created_by: user.id,
          owner_id: ownerId || user.id
        })
        .select()
        .single();

      if (brandError) throw brandError;

      // Create pricing entry
      await supabase.from('product_prices').insert({
        product_type: 'lpg',
        product_name: `${customReturnBrand} ${weight}`,
        brand_id: newBrand.id,
        size: weight,
        variant: 'Refill',
        company_price: 0,
        distributor_price: 0,
        retail_price: 0,
        package_price: 0,
        created_by: user.id,
        owner_id: ownerId || user.id
      });

      // Add to return items
      setReturnItems([...returnItems, {
        id: `return-${Date.now()}`,
        brandId: newBrand.id,
        brandName: newBrand.name,
        brandColor: newBrand.color,
        quantity: 1,
        isLeaked: false,
        weight: weight
      }]);

      toast({ title: "Custom brand added" });
      setShowCustomBrandInput(false);
      setCustomReturnBrand("");
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // ============= CUSTOM SELLING BRAND HANDLER =============
  const handleAddCustomSellingBrand = async () => {
    if (!customSellingBrand.trim()) {
      toast({ title: "Enter brand name", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: ownerId } = await supabase.rpc("get_owner_id");
      const price = parsePositiveNumber(customSellingPrice, 10000000) || 0;

      // Create new brand with stock
      const { data: newBrand, error: brandError } = await supabase
        .from('lpg_brands')
        .insert({
          name: sanitizeString(customSellingBrand),
          size: mouthSize,
          weight: weight,
          color: '#6b7280',
          package_cylinder: cylinderType === 'package' ? 10 : 0,
          refill_cylinder: cylinderType === 'refill' ? 10 : 0,
          empty_cylinder: 0,
          problem_cylinder: 0,
          created_by: user.id,
          owner_id: ownerId || user.id
        })
        .select()
        .single();

      if (brandError) throw brandError;

      // Create pricing entries
      await supabase.from('product_prices').insert([
        {
          product_type: 'lpg',
          product_name: `${customSellingBrand} ${weight}`,
          brand_id: newBrand.id,
          size: weight,
          variant: 'Refill',
          company_price: 0,
          distributor_price: price * 0.95,
          retail_price: price,
          package_price: 0,
          created_by: user.id,
          owner_id: ownerId || user.id
        },
        {
          product_type: 'lpg',
          product_name: `${customSellingBrand} ${weight}`,
          brand_id: newBrand.id,
          size: weight,
          variant: 'Package',
          company_price: 0,
          distributor_price: price * 0.95,
          retail_price: price,
          package_price: price + 1500,
          created_by: user.id,
          owner_id: ownerId || user.id
        }
      ]);

      // Add to cart
      const newItem: SaleItem = {
        id: `lpg-${Date.now()}`,
        type: 'lpg',
        name: newBrand.name,
        details: `${weight} • ${cylinderType === 'refill' ? 'Refill' : 'Package'} • ${saleType}`,
        price: cylinderType === 'package' ? price + 1500 : price,
        quantity: 1,
        cylinderType,
        brandId: newBrand.id,
        weight,
        mouthSize,
        brandColor: newBrand.color
      };
      setSaleItems([...saleItems, newItem]);

      toast({ title: "Custom brand created & added to cart" });
      setShowCustomSellingBrandInput(false);
      setCustomSellingBrand("");
      setCustomSellingPrice("");
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // ============= CUSTOM STOVE HANDLER =============
  const handleAddCustomStove = async () => {
    if (!customStove.brand.trim()) {
      toast({ title: "Enter stove brand", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: ownerId } = await supabase.rpc("get_owner_id");
      const price = parsePositiveNumber(customStove.price, 10000000) || 0;
      const burnerLabel = customStove.burners === 1 ? "Single Burner" : "Double Burner";

      // Create stove
      const { data: newStove, error: stoveError } = await supabase
        .from('stoves')
        .insert({
          brand: sanitizeString(customStove.brand),
          model: burnerLabel,
          burners: customStove.burners,
          quantity: 5,
          price: price,
          created_by: user.id,
          owner_id: ownerId || user.id
        })
        .select()
        .single();

      if (stoveError) throw stoveError;

      // Create pricing entry
      await supabase.from('product_prices').insert({
        product_type: 'stove',
        product_name: `${customStove.brand} ${burnerLabel}`,
        company_price: 0,
        distributor_price: price * 0.9,
        retail_price: price,
        package_price: price,
        created_by: user.id,
        owner_id: ownerId || user.id
      });

      // Add to cart
      const newItem: SaleItem = {
        id: `stove-${Date.now()}`,
        type: 'stove',
        name: `${newStove.brand} ${newStove.model}`,
        details: `${newStove.burners} Burner`,
        price,
        quantity: 1,
        stoveId: newStove.id
      };
      setSaleItems([...saleItems, newItem]);

      toast({ title: "Custom stove created & added to cart" });
      setShowCustomStoveInput(false);
      setCustomStove({ brand: "", burners: 1, price: "" });
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // ============= CUSTOM REGULATOR HANDLER =============
  const handleAddCustomRegulator = async () => {
    if (!customRegulator.brand.trim()) {
      toast({ title: "Enter regulator brand", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: ownerId } = await supabase.rpc("get_owner_id");
      const price = parsePositiveNumber(customRegulator.price, 10000000) || 0;

      // Create regulator
      const { data: newRegulator, error: regError } = await supabase
        .from('regulators')
        .insert({
          brand: sanitizeString(customRegulator.brand),
          type: customRegulator.type,
          quantity: 5,
          price: price,
          created_by: user.id,
          owner_id: ownerId || user.id
        })
        .select()
        .single();

      if (regError) throw regError;

      // Create pricing entry
      await supabase.from('product_prices').insert({
        product_type: 'regulator',
        product_name: `${customRegulator.brand} ${customRegulator.type}`,
        company_price: 0,
        distributor_price: price * 0.9,
        retail_price: price,
        package_price: price,
        created_by: user.id,
        owner_id: ownerId || user.id
      });

      // Add to cart
      const newItem: SaleItem = {
        id: `reg-${Date.now()}`,
        type: 'regulator',
        name: newRegulator.brand,
        details: newRegulator.type,
        price,
        quantity: 1,
        regulatorId: newRegulator.id
      };
      setSaleItems([...saleItems, newItem]);

      toast({ title: "Custom regulator created & added to cart" });
      setShowCustomRegulatorInput(false);
      setCustomRegulator({ brand: "", type: "22mm", price: "" });
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // ============= CUSTOM WEIGHT HANDLER =============
  const handleAddCustomWeight = () => {
    if (!customWeight.trim()) {
      toast({ title: "Enter weight", variant: "destructive" });
      return;
    }
    const weightVal = customWeight.trim().toLowerCase().replace(/\s/g, '');
    const normalizedWeight = weightVal.includes('kg') ? weightVal : `${weightVal}kg`;
    setWeight(normalizedWeight);
    setShowCustomWeightInput(false);
    setCustomWeight("");
    toast({ title: `Weight set to ${normalizedWeight}` });
  };

  // ============= CUSTOMER ACTIONS =============
  const handleCustomerSelect = (customerId: string) => {
    if (customerId === "walkin") {
      setSelectedCustomerId("walkin");
      setSelectedCustomer(null);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      return;
    }

    if (customerId === "new") {
      setShowAddCustomerDialog(true);
      return;
    }

    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      setSelectedCustomerId(customerId);
      setSelectedCustomer(customer);
      setCustomerName(customer.name);
      setCustomerPhone(customer.phone || "");
      setCustomerAddress(customer.address || "");
    }
  };

  const handleAddCustomer = async () => {
    if (!customerName.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: ownerId } = await supabase.rpc("get_owner_id");
    
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: sanitizeString(customerName),
        phone: customerPhone || null,
        address: customerAddress || null,
        created_by: user?.id,
        owner_id: ownerId || user?.id
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Customer added" });
    setShowAddCustomerDialog(false);
    
    if (data) {
      setSelectedCustomerId(data.id);
      setSelectedCustomer(data);
      setCustomers([...customers, data]);
    }
  };

  // ============= COMPLETE SALE =============
  const handleCompleteSale = async (paymentStatus: 'completed' | 'pending') => {
    if (saleItems.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }

    // Check return count for refill sales
    if (hasRefillInCart && !isReturnCountMatched) {
      toast({ 
        title: "Return count mismatch", 
        description: `Selling ${refillCylindersCount} cylinders, but returning ${returnCylindersCount}`,
        variant: "destructive" 
      });
      return;
    }

    if (paymentStatus === 'pending' && selectedCustomerId === "walkin") {
      toast({ 
        title: "Cannot save as due", 
        description: "Credit requires a registered customer",
        variant: "destructive" 
      });
      return;
    }

    // Credit limit check
    if (paymentStatus === 'pending' && selectedCustomer) {
      const currentDue = selectedCustomer.total_due || 0;
      const limit = selectedCustomer.credit_limit || DEFAULT_CREDIT_LIMIT;
      if (currentDue + total > limit) {
        toast({ 
          title: "Credit limit exceeded", 
          description: `Limit: ${BANGLADESHI_CURRENCY_SYMBOL}${limit}`,
          variant: "destructive" 
        });
        return;
      }
    }

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in");

      const { data: ownerId } = await supabase.rpc("get_owner_id");
      const { data: txnNum } = await supabase.rpc('generate_transaction_number');
      const transactionNumber = txnNum || `TXN-${Date.now()}`;

      let customerId = selectedCustomerId === "walkin" ? null : selectedCustomerId;

      // Create customer if needed
      if (!customerId && customerName) {
        const { data: newCust } = await supabase
          .from('customers')
          .insert({ 
            name: sanitizeString(customerName),
            phone: customerPhone || null,
            address: customerAddress || null,
            created_by: user.id,
            owner_id: ownerId || user.id
          })
          .select()
          .single();
        if (newCust) customerId = newCust.id;
      }

      // Create transaction
      const { data: transaction, error: txnError } = await supabase
        .from('pos_transactions')
        .insert({
          transaction_number: transactionNumber,
          customer_id: customerId,
          subtotal,
          discount: discountAmount,
          total,
          payment_method: 'cash' as const,
          payment_status: paymentStatus,
          driver_id: null, // Seller tracked via created_by and userRole
          created_by: user.id,
          owner_id: ownerId || user.id
        })
        .select()
        .single();

      if (txnError) throw txnError;

      // Insert items
      if (transaction) {
        const items = saleItems.map(item => ({
          transaction_id: transaction.id,
          product_id: item.brandId || item.stoveId || item.regulatorId || transaction.id,
          product_name: `${item.name} - ${item.details}`,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          created_by: user.id
        }));
        await supabase.from('pos_transaction_items').insert(items);
      }

      // Update inventory for LPG sales
      for (const item of saleItems.filter(i => i.type === 'lpg' && i.brandId)) {
        const brand = lpgBrands.find(b => b.id === item.brandId);
        if (!brand) continue;

        if (item.cylinderType === 'refill') {
          await supabase.from('lpg_brands')
            .update({ refill_cylinder: Math.max(0, brand.refill_cylinder - item.quantity) })
            .eq('id', brand.id);
        } else {
          await supabase.from('lpg_brands')
            .update({ package_cylinder: Math.max(0, brand.package_cylinder - item.quantity) })
            .eq('id', brand.id);
        }
      }

      // Update inventory for return cylinders
      for (const returnItem of returnItems) {
        const brand = lpgBrands.find(b => b.id === returnItem.brandId);
        if (!brand) continue;

        const field = returnItem.isLeaked ? 'problem_cylinder' : 'empty_cylinder';
        const currentVal = returnItem.isLeaked ? brand.problem_cylinder : brand.empty_cylinder;
        await supabase.from('lpg_brands')
          .update({ [field]: currentVal + returnItem.quantity })
          .eq('id', returnItem.brandId);
      }

      // Update stove/regulator stock
      for (const item of saleItems.filter(i => i.type === 'stove' && i.stoveId)) {
        const stove = stoves.find(s => s.id === item.stoveId);
        if (stove) {
          await supabase.from('stoves')
            .update({ quantity: Math.max(0, stove.quantity - item.quantity) })
            .eq('id', stove.id);
        }
      }

      for (const item of saleItems.filter(i => i.type === 'regulator' && i.regulatorId)) {
        const regulator = regulators.find(r => r.id === item.regulatorId);
        if (regulator) {
          await supabase.from('regulators')
            .update({ quantity: Math.max(0, regulator.quantity - item.quantity) })
            .eq('id', regulator.id);
        }
      }

      // Update customer dues (track both money and cylinders)
      if (paymentStatus === 'pending' && customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          // Count package cylinders sold on due (these are cylinder assets owed by customer)
          const packageCylindersSold = saleItems
            .filter(i => i.type === 'lpg' && i.cylinderType === 'package')
            .reduce((sum, i) => sum + i.quantity, 0);
          
          await supabase.from('customers')
            .update({ 
              total_due: (customer.total_due || 0) + total,
              cylinders_due: (customer.cylinders_due || 0) + packageCylindersSold,
              billing_status: 'pending',
              last_order_date: new Date().toISOString()
            })
            .eq('id', customerId);
        }
      }

      // Prepare invoice with return items
      setLastTransaction({
        invoiceNumber: transactionNumber,
        date: new Date(),
        customer: { name: customerName || "Walk-in", phone: customerPhone, address: customerAddress },
        items: saleItems.map(i => ({
          name: i.name,
          description: i.details,
          quantity: i.quantity,
          unitPrice: i.price,
          total: i.price * i.quantity
        })),
        returnItems: returnItems.map(r => ({
          brandName: r.brandName,
          quantity: r.quantity,
          isLeaked: r.isLeaked
        })),
        subtotal,
        discount: discountAmount,
        total,
        paymentStatus,
        paymentMethod: 'cash'
      });
      setShowPrintTypeDialog(true);

      // Reset
      setSaleItems([]);
      setReturnItems([]);
      setDiscount("0");
      setSelectedCustomerId("walkin");
      setSelectedCustomer(null);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");

      toast({ 
        title: paymentStatus === 'completed' ? "Sale completed!" : "Saved as due",
        description: transactionNumber
      });

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // ============= VOID TRANSACTION =============
  const handleVoidTransaction = async () => {
    if (!transactionToVoid) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in");

      await supabase.from('pos_transactions')
        .update({ is_voided: true, voided_at: new Date().toISOString(), voided_by: user.id })
        .eq('id', transactionToVoid.id);

      toast({ title: "Transaction voided" });
      setRecentTransactions(prev => prev.filter(t => t.id !== transactionToVoid.id));
      setShowVoidDialog(false);
      setTransactionToVoid(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const clearAll = () => {
    setSaleItems([]);
    setReturnItems([]);
    setDiscount("0");
    toast({ title: "Cart cleared" });
  };

  // ============= RENDER =============
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading POS...</span>
      </div>
    );
  }


  return (
    <TooltipProvider>
      <div className="space-y-3 pb-24 lg:pb-4">
        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-bold">{t('pos')}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <Button onClick={() => setShowBarcodeScanner(true)} variant="outline" size="sm" className="h-8 w-8 p-0">
              <ScanLine className="h-4 w-4" />
            </Button>
            {(saleItems.length > 0 || returnItems.length > 0) && (
              <Button onClick={clearAll} variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* ===== MOBILE TABLE TOGGLE ===== */}
        <div className="lg:hidden">
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={activeTable === 'sale' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTable('sale')}
              className={`h-10 ${activeTable === 'sale' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Selling
              {saleItemsCount > 0 && <Badge className="ml-2 bg-white/20">{saleItemsCount}</Badge>}
            </Button>
            <Button
              variant={activeTable === 'return' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTable('return')}
              className={`h-10 ${activeTable === 'return' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Return
              {returnCylindersCount > 0 && <Badge className="ml-2 bg-white/20">{returnCylindersCount}</Badge>}
            </Button>
          </div>
        </div>

        {/* ===== TOP SECTION: TWO TABLES (Desktop: side-by-side, Mobile: one at a time) ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* SALE TABLE */}
          <Card className={`border-2 border-emerald-200 dark:border-emerald-900 ${activeTable !== 'sale' ? 'hidden lg:block' : ''}`}>
            <CardHeader 
              className="py-2 px-3 bg-emerald-50 dark:bg-emerald-950/30 cursor-pointer" 
              onClick={() => setActiveTable('sale')}
            >
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-emerald-600" />
                  Products Sold
                </span>
                <Badge className="bg-emerald-600">{saleItemsCount}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[140px] sm:h-[160px]">
                {saleItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-6">
                    <ShoppingCart className="h-8 w-8 opacity-30 mb-2" />
                    <p className="text-xs">Select products below</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {saleItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border">
                        <div 
                          className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: item.brandColor || (item.type === 'stove' ? '#f97316' : item.type === 'regulator' ? '#8b5cf6' : '#10b981') }}
                        >
                          {item.type === 'lpg' && <Cylinder className="h-3.5 w-3.5 text-white" />}
                          {item.type === 'stove' && <ChefHat className="h-3.5 w-3.5 text-white" />}
                          {item.type === 'regulator' && <Gauge className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{item.details}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-muted rounded px-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateItemQuantity(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateItemQuantity(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="font-bold text-xs text-emerald-600 w-14 sm:w-16 text-right flex-shrink-0">{BANGLADESHI_CURRENCY_SYMBOL}{(item.price * item.quantity).toLocaleString()}</p>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 min-w-[28px] text-destructive hover:bg-destructive/10 flex-shrink-0" 
                          onClick={() => removeItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              {saleItems.length > 0 && (
                <div className="mt-2 pt-2 border-t flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="font-bold text-emerald-600">{BANGLADESHI_CURRENCY_SYMBOL}{subtotal.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RETURN TABLE */}
          <Card className={`border-2 ${hasRefillInCart ? 'border-amber-200 dark:border-amber-900' : 'border-muted'} ${activeTable !== 'return' ? 'hidden lg:block' : ''}`}>
            <CardHeader 
              className={`py-2 px-3 cursor-pointer ${hasRefillInCart ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-muted/30'}`}
              onClick={() => setActiveTable('return')}
            >
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-amber-600" />
                  Cylinders Return
                </span>
                <Badge variant={isReturnCountMatched ? "secondary" : "destructive"}>
                  {returnCylindersCount}/{refillCylindersCount}
                </Badge>
              </CardTitle>
              {hasRefillInCart && !isReturnCountMatched && (
                <p className="text-[10px] text-destructive">⚠ Must return {refillCylindersCount} cylinder(s)</p>
              )}
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[140px] sm:h-[160px]">
                {returnItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-6">
                    <ArrowLeftRight className="h-8 w-8 opacity-30 mb-2" />
                    <p className="text-xs">{hasRefillInCart ? 'Select return cylinders below' : 'Return applies to Refill sales'}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {returnItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-card border">
                        <div 
                          className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: item.brandColor }}
                        >
                          <Cylinder className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs truncate">{item.brandName}</p>
                          <div className="flex items-center gap-1">
                            <Checkbox 
                              checked={item.isLeaked}
                              onCheckedChange={() => toggleReturnLeaked(item.id)}
                              className="h-3 w-3"
                            />
                            <span className="text-[9px] text-muted-foreground">Leaked</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-muted rounded px-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateReturnQuantity(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateReturnQuantity(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 min-w-[28px] text-destructive hover:bg-destructive/10 flex-shrink-0" 
                          onClick={() => removeReturnItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* ===== MIDDLE SECTION: TYPE TOGGLES & FILTERS ===== */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Cylinder Type */}
          <div className="flex bg-muted rounded-lg p-0.5">
            <Button
              size="sm"
              variant={cylinderType === 'refill' ? 'default' : 'ghost'}
              onClick={() => setCylinderType('refill')}
              className="h-7 text-xs px-2.5"
            >
              Refill
            </Button>
            <Button
              size="sm"
              variant={cylinderType === 'package' ? 'default' : 'ghost'}
              onClick={() => setCylinderType('package')}
              className={`h-7 text-xs px-2.5 ${cylinderType === 'package' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            >
              Package
            </Button>
          </div>
          {/* Sale Type */}
          <div className="flex bg-muted rounded-lg p-0.5">
            <Button
              size="sm"
              variant={saleType === 'retail' ? 'default' : 'ghost'}
              onClick={() => setSaleType('retail')}
              className="h-7 text-xs px-2.5"
            >
              Retail
            </Button>
            <Button
              size="sm"
              variant={saleType === 'wholesale' ? 'default' : 'ghost'}
              onClick={() => setSaleType('wholesale')}
              className={`h-7 text-xs px-2.5 ${saleType === 'wholesale' ? 'bg-violet-600 hover:bg-violet-700' : ''}`}
            >
              Wholesale
            </Button>
          </div>
          {/* Mouth Size */}
          <div className="flex bg-muted rounded-lg p-0.5">
            <Button size="sm" variant={mouthSize === "22mm" ? "default" : "ghost"} className="h-7 text-xs px-2" onClick={() => { setMouthSize("22mm"); setWeight("12kg"); }}>22mm</Button>
            <Button size="sm" variant={mouthSize === "20mm" ? "default" : "ghost"} className="h-7 text-xs px-2" onClick={() => { setMouthSize("20mm"); setWeight("12kg"); }}>20mm</Button>
          </div>
          {/* Weight */}
          <div className="flex flex-wrap gap-1">
            {(mouthSize === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM).slice(0, 5).map(w => (
              <Button
                key={w}
                size="sm"
                variant={weight === w ? "default" : "outline"}
                className="h-7 text-xs px-2"
                onClick={() => setWeight(w)}
              >
                {w}
              </Button>
            ))}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-2"
              onClick={() => setShowCustomWeightInput(true)}
            >
              <Plus className="h-3 w-3 mr-1" />Other
            </Button>
          </div>
        </div>

        {/* ===== PRODUCT CARDS SECTION ===== */}
        <Card>
          <CardHeader className="pb-2 px-3 pt-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="h-9 pl-8"
                />
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
              <TabsList className="h-9 w-full grid grid-cols-4">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="lpg" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  <Fuel className="h-3.5 w-3.5 mr-1" />LPG
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
                      const stock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
                      const price = getLPGPrice(brand.id, weight, cylinderType, saleType);
                      const isSaleMode = activeTable === 'sale';
                      
                      return (
                        <button
                          key={brand.id}
                          onClick={() => isSaleMode ? addLPGToCart(brand) : addReturnCylinder(brand)}
                          disabled={isSaleMode && stock === 0}
                          className={`p-2.5 rounded-lg border-2 text-left transition-all hover:shadow-md relative ${
                            isSaleMode && stock === 0 
                              ? 'opacity-50 cursor-not-allowed border-muted' 
                              : isSaleMode 
                                ? 'border-transparent hover:border-emerald-500/50 bg-card' 
                                : 'border-transparent hover:border-amber-500/50 bg-card'
                          }`}
                        >
                          {/* Brand Color Header */}
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
                          {isSaleMode ? (
                            <div className="flex items-center justify-between mt-2">
                              <span className="font-bold text-sm text-emerald-600">{BANGLADESHI_CURRENCY_SYMBOL}{price}</span>
                              <Badge variant={stock > 5 ? "secondary" : stock > 0 ? "outline" : "destructive"} className="text-[9px] px-1.5">
                                {stock > 0 ? stock : 'Out'}
                              </Badge>
                            </div>
                          ) : (
                            <div className="mt-2 text-center">
                              <Badge variant="outline" className="text-[9px]">Tap to add</Badge>
                            </div>
                          )}
                        </button>
                      );
                    })}
                    {/* Custom Brand for Return */}
                    {activeTable === 'return' && (
                      <button
                        onClick={() => setShowCustomBrandInput(true)}
                        className="p-2.5 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-amber-500/50 bg-card text-left transition-all"
                      >
                        <div className="flex items-center justify-center h-full min-h-[60px]">
                          <div className="text-center">
                            <Plus className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                            <p className="text-xs text-muted-foreground">Custom</p>
                          </div>
                        </div>
                      </button>
                    )}
                    {/* Custom Brand for Sale */}
                    {activeTable === 'sale' && (
                      <button
                        onClick={() => setShowCustomSellingBrandInput(true)}
                        className="p-2.5 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-emerald-500/50 bg-card text-left transition-all"
                      >
                        <div className="flex items-center justify-center h-full min-h-[60px]">
                          <div className="text-center">
                            <Plus className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
                            <p className="text-xs text-emerald-600">Add New</p>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Stoves - Only in Sale Mode */}
              {(activeTab === 'stove' || activeTab === 'all') && activeTable === 'sale' && (
                <div className="mb-3">
                  {activeTab === 'all' && <p className="text-xs font-medium text-muted-foreground mb-2">Gas Stoves</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {(activeTab === 'all' ? filteredStoves.slice(0, 3) : filteredStoves).map(stove => {
                      const price = getStovePrice(stove.brand, stove.model) || stove.price;
                      return (
                        <button
                          key={stove.id}
                          onClick={() => addStoveToCart(stove)}
                          disabled={stove.quantity === 0}
                          className={`p-2.5 rounded-lg border-2 text-left transition-all hover:shadow-md relative ${
                            stove.quantity === 0 ? 'opacity-50 cursor-not-allowed border-muted' : 'border-transparent hover:border-orange-500/50 bg-card'
                          }`}
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
                            <span className="font-bold text-sm text-orange-600">{BANGLADESHI_CURRENCY_SYMBOL}{price}</span>
                            <Badge variant="secondary" className="text-[9px] px-1.5">{stove.quantity}</Badge>
                          </div>
                        </button>
                      );
                    })}
                    {/* Custom Stove Button */}
                    <button
                      onClick={() => setShowCustomStoveInput(true)}
                      className="p-2.5 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-orange-500/50 bg-card text-left transition-all"
                    >
                      <div className="flex items-center justify-center h-full min-h-[60px]">
                        <div className="text-center">
                          <Plus className="h-5 w-5 mx-auto text-orange-500 mb-1" />
                          <p className="text-xs text-orange-500">Add Stove</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Regulators - Only in Sale Mode */}
              {(activeTab === 'regulator' || activeTab === 'all') && activeTable === 'sale' && (
                <div>
                  {activeTab === 'all' && <p className="text-xs font-medium text-muted-foreground mb-2">Regulators</p>}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {(activeTab === 'all' ? filteredRegulators.slice(0, 3) : filteredRegulators).map(reg => {
                      const price = getRegulatorPrice(reg.brand, reg.type) || reg.price || 0;
                      return (
                        <button
                          key={reg.id}
                          onClick={() => addRegulatorToCart(reg)}
                          disabled={reg.quantity === 0}
                          className={`p-2.5 rounded-lg border-2 text-left transition-all hover:shadow-md relative ${
                            reg.quantity === 0 ? 'opacity-50 cursor-not-allowed border-muted' : 'border-transparent hover:border-violet-500/50 bg-card'
                          }`}
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
                            <span className="font-bold text-sm text-violet-600">{BANGLADESHI_CURRENCY_SYMBOL}{price}</span>
                            <Badge variant="secondary" className="text-[9px] px-1.5">{reg.quantity}</Badge>
                          </div>
                        </button>
                      );
                    })}
                    {/* Custom Regulator Button */}
                    <button
                      onClick={() => setShowCustomRegulatorInput(true)}
                      className="p-2.5 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-violet-500/50 bg-card text-left transition-all"
                    >
                      <div className="flex items-center justify-center h-full min-h-[60px]">
                        <div className="text-center">
                          <Plus className="h-5 w-5 mx-auto text-violet-500 mb-1" />
                          <p className="text-xs text-violet-500">Add Regulator</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Return Mode Message for Non-LPG */}
              {activeTable === 'return' && (activeTab === 'stove' || activeTab === 'regulator') && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <ArrowLeftRight className="h-10 w-10 opacity-30 mb-2" />
                  <p className="text-sm">Only LPG cylinders can be returned</p>
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
              {/* Customer Selection */}
              <div className="space-y-1.5">
                <Label className="text-xs">Customer</Label>
                <div className="flex gap-1.5">
                  <Select value={selectedCustomerId || "walkin"} onValueChange={handleCustomerSelect}>
                    <SelectTrigger className="h-9 flex-1">
                      <SelectValue placeholder="Select customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walkin">
                        <span className="flex items-center gap-2"><User className="h-3 w-3" /> Walk-in</span>
                      </SelectItem>
                      {customers.slice(0, 20).map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center justify-between w-full">
                            <span>{c.name}</span>
                            {(c.total_due || 0) > 0 && <Badge variant="destructive" className="ml-2 text-[9px]">Due: {BANGLADESHI_CURRENCY_SYMBOL}{c.total_due}</Badge>}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" className="h-9 w-9 p-0" onClick={() => setShowAddCustomerDialog(true)}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-1.5">
                <Label className="text-xs">Settlement</Label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="h-9"
                />
              </div>

              {/* Seller Role Indicator */}
              <div className="space-y-1.5">
                <Label className="text-xs">Seller</Label>
                <div className={`h-9 px-3 flex items-center gap-2 rounded-md border ${ROLE_CONFIG[userRole]?.bgColor || 'bg-muted border-border'}`}>
                  <User className={`h-4 w-4 ${ROLE_CONFIG[userRole]?.color || 'text-foreground'}`} />
                  <span className={`text-sm font-medium ${ROLE_CONFIG[userRole]?.color || 'text-foreground'}`}>
                    {ROLE_CONFIG[userRole]?.label || 'User'}
                  </span>
                </div>
              </div>

              {/* Summary & Actions */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Grand Total</Label>
                  <span className="font-bold text-lg text-emerald-600">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Button
                    onClick={() => handleCompleteSale('completed')}
                    disabled={processing || saleItems.length === 0}
                    className="h-9 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wallet className="h-4 w-4 mr-1" /> Cash</>}
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="w-full">
                        <Button
                          onClick={() => handleCompleteSale('pending')}
                          disabled={processing || saleItems.length === 0 || selectedCustomerId === "walkin" || !isWholesaleEligible}
                          variant="outline"
                          className="h-9 w-full border-amber-500 text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                        >
                          <CreditCard className="h-4 w-4 mr-1" /> Due
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!isWholesaleEligible && saleItems.length > 0 && (
                      <TooltipContent>
                        <p className="text-xs">Due requires 2+ items (wholesale)</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== RECENT TRANSACTIONS ===== */}
        {recentTransactions.length > 0 && (
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-xs flex items-center gap-2">
                <Undo2 className="h-3.5 w-3.5" /> Recent (Void within 5 min)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recentTransactions.map(txn => (
                  <div key={txn.id} className="flex-shrink-0 p-2 rounded-lg border bg-card min-w-[140px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">{txn.transactionNumber}</span>
                      <Badge variant={txn.status === 'completed' ? 'secondary' : 'outline'} className="text-[8px]">
                        {txn.status === 'completed' ? 'Paid' : 'Due'}
                      </Badge>
                    </div>
                    <p className="font-bold text-sm">{BANGLADESHI_CURRENCY_SYMBOL}{txn.total.toLocaleString()}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full h-6 mt-1 text-destructive text-[10px]"
                      onClick={() => { setTransactionToVoid(txn); setShowVoidDialog(true); }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Void
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== DIALOGS ===== */}
        {/* Barcode Scanner */}
        <BarcodeScanner
          open={showBarcodeScanner}
          onOpenChange={setShowBarcodeScanner}
          onProductFound={(product) => {
            if (product.type === 'lpg') {
              const brand = lpgBrands.find(b => b.name.toLowerCase() === product.name.toLowerCase());
              if (brand) addLPGToCart(brand);
            } else if (product.type === 'stove') {
              const stove = stoves.find(s => `${s.brand} ${s.model}`.toLowerCase() === product.name.toLowerCase());
              if (stove) addStoveToCart(stove);
            } else if (product.type === 'regulator') {
              const reg = regulators.find(r => r.brand.toLowerCase() === product.name.toLowerCase());
              if (reg) addRegulatorToCart(reg);
            }
            toast({ title: "Product added", description: product.name });
            setShowBarcodeScanner(false);
          }}
        />

        {/* Add Customer Dialog */}
        <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="01XXXXXXXXX" />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Address" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCustomerDialog(false)}>Cancel</Button>
              <Button onClick={handleAddCustomer}>Add Customer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Brand Dialog */}
        <Dialog open={showCustomBrandInput} onOpenChange={setShowCustomBrandInput}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Custom Brand</DialogTitle>
              <DialogDescription>Enter the brand name for the returned cylinder.</DialogDescription>
            </DialogHeader>
            <Input
              value={customReturnBrand}
              onChange={(e) => setCustomReturnBrand(e.target.value)}
              placeholder="Brand name"
              autoFocus
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomBrandInput(false)}>Cancel</Button>
              <Button onClick={handleAddCustomBrand}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Selling Brand Dialog */}
        <Dialog open={showCustomSellingBrandInput} onOpenChange={setShowCustomSellingBrandInput}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Custom LPG Brand</DialogTitle>
              <DialogDescription>Create a new brand and add to cart.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Brand Name *</Label>
                <Input
                  value={customSellingBrand}
                  onChange={(e) => setCustomSellingBrand(e.target.value)}
                  placeholder="Enter brand name"
                  autoFocus
                />
              </div>
              <div>
                <Label>Retail Price ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                <Input
                  type="number"
                  value={customSellingPrice}
                  onChange={(e) => setCustomSellingPrice(e.target.value)}
                  placeholder="1450"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Weight: {weight} | Size: {mouthSize} | Type: {cylinderType}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomSellingBrandInput(false)}>Cancel</Button>
              <Button onClick={handleAddCustomSellingBrand}>Create & Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Stove Dialog */}
        <Dialog open={showCustomStoveInput} onOpenChange={setShowCustomStoveInput}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Custom Stove</DialogTitle>
              <DialogDescription>Create a new stove and add to cart.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Brand Name *</Label>
                <Input
                  value={customStove.brand}
                  onChange={(e) => setCustomStove({ ...customStove, brand: e.target.value })}
                  placeholder="RFL, Walton, etc."
                  autoFocus
                />
              </div>
              <div>
                <Label>Burner Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={customStove.burners === 1 ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setCustomStove({ ...customStove, burners: 1 })}
                  >
                    Single
                  </Button>
                  <Button
                    type="button"
                    variant={customStove.burners === 2 ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setCustomStove({ ...customStove, burners: 2 })}
                  >
                    Double
                  </Button>
                </div>
              </div>
              <div>
                <Label>Price ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                <Input
                  type="number"
                  value={customStove.price}
                  onChange={(e) => setCustomStove({ ...customStove, price: e.target.value })}
                  placeholder="2500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomStoveInput(false)}>Cancel</Button>
              <Button onClick={handleAddCustomStove}>Create & Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Regulator Dialog */}
        <Dialog open={showCustomRegulatorInput} onOpenChange={setShowCustomRegulatorInput}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Custom Regulator</DialogTitle>
              <DialogDescription>Create a new regulator and add to cart.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Brand Name *</Label>
                <Input
                  value={customRegulator.brand}
                  onChange={(e) => setCustomRegulator({ ...customRegulator, brand: e.target.value })}
                  placeholder="IGT, RFL, etc."
                  autoFocus
                />
              </div>
              <div>
                <Label>Size Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={customRegulator.type === "22mm" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setCustomRegulator({ ...customRegulator, type: "22mm" })}
                  >
                    22mm
                  </Button>
                  <Button
                    type="button"
                    variant={customRegulator.type === "20mm" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setCustomRegulator({ ...customRegulator, type: "20mm" })}
                  >
                    20mm
                  </Button>
                </div>
              </div>
              <div>
                <Label>Price ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                <Input
                  type="number"
                  value={customRegulator.price}
                  onChange={(e) => setCustomRegulator({ ...customRegulator, price: e.target.value })}
                  placeholder="500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomRegulatorInput(false)}>Cancel</Button>
              <Button onClick={handleAddCustomRegulator}>Create & Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Weight Dialog */}
        <Dialog open={showCustomWeightInput} onOpenChange={setShowCustomWeightInput}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Custom Weight</DialogTitle>
              <DialogDescription>Enter a non-standard cylinder weight.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                value={customWeight}
                onChange={(e) => setCustomWeight(e.target.value)}
                placeholder="e.g., 8kg, 18kg"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enter weight with or without "kg" suffix
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomWeightInput(false)}>Cancel</Button>
              <Button onClick={handleAddCustomWeight}>Set Weight</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Void Confirmation */}
        <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Void Transaction?</DialogTitle>
              <DialogDescription>
                This will void {transactionToVoid?.transactionNumber}. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVoidDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleVoidTransaction}>Void</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Print Type Dialog */}
        <Dialog open={showPrintTypeDialog} onOpenChange={setShowPrintTypeDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Sale Complete!
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => { setShowInvoiceDialog(true); setShowPrintTypeDialog(false); }}>
                Print Invoice
              </Button>
              <Button variant="outline" onClick={() => setShowPrintTypeDialog(false)}>
                Skip Print
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invoice Dialog */}
        {lastTransaction && (
          <InvoiceDialog
            open={showInvoiceDialog}
            onOpenChange={setShowInvoiceDialog}
            invoiceData={lastTransaction}
          />
        )}
      </div>
    </TooltipProvider>
  );
};
