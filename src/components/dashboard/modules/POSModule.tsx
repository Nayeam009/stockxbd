import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  Printer, 
  Loader2,
  FileText,
  X,
  User,
  Phone,
  MapPin,
  UserPlus,
  Search,
  Package,
  AlertTriangle,
  ScanLine,
  AlertCircle,
  Undo2,
  Fuel,
  ChefHat,
  Gauge,
  ArrowLeftRight,
  Cylinder,
  ChevronRight,
  Check,
  CreditCard,
  Wallet,
  CheckCircle2,
  ArrowDown,
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

interface Driver {
  id: string;
  name: string;
  phone: string;
  status: 'active' | 'break' | 'offline';
}

interface SaleItem {
  id: string;
  type: 'lpg' | 'stove' | 'regulator' | 'custom';
  name: string;
  details: string;
  price: number;
  quantity: number;
  returnBrand?: string;
  returnBrandId?: string;
  cylinderType?: 'refill' | 'package';
  brandId?: string;
  stoveId?: string;
  regulatorId?: string;
  isLeakedReturn?: boolean;
  weight?: string;
  mouthSize?: string;
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
const BRAND_MOUTH_SIZE_MAP = getBrandMouthSizeMap();
const DEFAULT_CREDIT_LIMIT = 10000;

// ============= MAIN POS MODULE =============
export const POSModule = () => {
  const { t } = useLanguage();
  
  // ===== DATA STATE =====
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  
  // ===== PRODUCT SELECTION STATE =====
  const [activeTab, setActiveTab] = useState("lpg");
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
  
  // ===== CUSTOMER STATE =====
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>("walkin");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [discount, setDiscount] = useState("0");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
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
  const [showCheckoutPanel, setShowCheckoutPanel] = useState(false);

  // ============= DATA FETCHING =============
  const fetchData = useCallback(async () => {
    const [brandsRes, stovesRes, regulatorsRes, customersRes, pricesRes, driversRes] = await Promise.all([
      supabase.from('lpg_brands').select('*').eq('is_active', true),
      supabase.from('stoves').select('*').eq('is_active', true),
      supabase.from('regulators').select('*').eq('is_active', true),
      supabase.from('customers').select('*').order('name'),
      supabase.from('product_prices').select('*').eq('is_active', true),
      supabase.from('user_roles').select('user_id').eq('role', 'driver')
    ]);

    if (brandsRes.data) setLpgBrands(brandsRes.data);
    if (stovesRes.data) setStoves(stovesRes.data);
    if (regulatorsRes.data) setRegulators(regulatorsRes.data);
    if (customersRes.data) setCustomers(customersRes.data);
    if (pricesRes.data) setProductPrices(pricesRes.data);
    
    if (driversRes.data && driversRes.data.length > 0) {
      const driverIds = driversRes.data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', driverIds);
      
      if (profiles) {
        setDrivers(profiles.map(p => ({
          id: p.user_id,
          name: p.full_name || 'Driver',
          phone: p.phone || '',
          status: 'active' as const
        })));
      }
    }

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

  // Brands available for return (matching weight of items being sold)
  const brandsForReturn = useMemo(() => {
    const lpgItem = saleItems.find(i => i.type === 'lpg');
    const targetWeight = lpgItem?.weight || weight;
    return lpgBrands.filter(b => b.weight === targetWeight);
  }, [lpgBrands, saleItems, weight]);

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
  // Count of refill LPG cylinders being sold
  const refillCylindersCount = useMemo(() => {
    return saleItems
      .filter(i => i.type === 'lpg' && i.cylinderType === 'refill')
      .reduce((sum, i) => sum + i.quantity, 0);
  }, [saleItems]);

  // Count of return cylinders
  const returnCylindersCount = useMemo(() => {
    return returnItems.reduce((sum, i) => sum + i.quantity, 0);
  }, [returnItems]);

  // Check if return count matches (for Refill sales)
  const isReturnCountMatched = refillCylindersCount === 0 || refillCylindersCount === returnCylindersCount;
  const hasRefillInCart = refillCylindersCount > 0;

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
        mouthSize
      };
      setSaleItems([...saleItems, newItem]);
    }
    toast({ title: `${brand.name} added` });
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
    toast({ title: "Stove added" });
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
    toast({ title: "Regulator added" });
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
      const lpgItem = saleItems.find(i => i.type === 'lpg');
      setReturnItems([...returnItems, {
        id: `return-${Date.now()}`,
        brandId: brand.id,
        brandName: brand.name,
        brandColor: brand.color,
        quantity: 1,
        isLeaked: false,
        weight: lpgItem?.weight || weight
      }]);
    }
    toast({ title: `Return: ${brand.name}` });
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

  // ============= CUSTOM BRAND HANDLER =============
  const handleAddCustomBrand = async () => {
    if (!customReturnBrand.trim()) {
      toast({ title: "Enter brand name", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: ownerId } = await supabase.rpc("get_owner_id");
      const lpgItem = saleItems.find(i => i.type === 'lpg');

      // Create new brand
      const { data: newBrand, error: brandError } = await supabase
        .from('lpg_brands')
        .insert({
          name: sanitizeString(customReturnBrand),
          size: mouthSize,
          weight: lpgItem?.weight || weight,
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
        product_name: `${customReturnBrand} ${lpgItem?.weight || weight}`,
        brand_id: newBrand.id,
        size: lpgItem?.weight || weight,
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
        weight: lpgItem?.weight || weight
      }]);

      toast({ title: "Custom brand added" });
      setShowCustomBrandInput(false);
      setCustomReturnBrand("");
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
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
    
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: sanitizeString(customerName),
        phone: customerPhone || null,
        address: customerAddress || null,
        created_by: user?.id
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
            created_by: user.id 
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
          driver_id: selectedDriverId || null,
          created_by: user.id
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

      // Update customer dues
      if (paymentStatus === 'pending' && customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          await supabase.from('customers')
            .update({ 
              total_due: (customer.total_due || 0) + total,
              last_order_date: new Date().toISOString()
            })
            .eq('id', customerId);
        }
      }

      // Prepare invoice
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
      setShowCheckoutPanel(false);

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
      <div className="space-y-4 pb-24 lg:pb-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-primary flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold">{t('pos')}</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Quick & Easy Sales</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowBarcodeScanner(true)} variant="outline" size="sm" className="h-9">
              <ScanLine className="h-4 w-4" />
            </Button>
            {saleItems.length > 0 && (
              <Button onClick={clearAll} variant="ghost" size="sm" className="h-9 text-destructive">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Type Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Cylinder Type */}
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              size="sm"
              variant={cylinderType === 'refill' ? 'default' : 'ghost'}
              onClick={() => setCylinderType('refill')}
              className="h-8 text-xs px-3"
            >
              Refill
            </Button>
            <Button
              size="sm"
              variant={cylinderType === 'package' ? 'default' : 'ghost'}
              onClick={() => setCylinderType('package')}
              className={`h-8 text-xs px-3 ${cylinderType === 'package' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            >
              <Package className="h-3 w-3 mr-1" />
              Package
            </Button>
          </div>
          {/* Sale Type */}
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              size="sm"
              variant={saleType === 'retail' ? 'default' : 'ghost'}
              onClick={() => setSaleType('retail')}
              className="h-8 text-xs px-3"
            >
              Retail
            </Button>
            <Button
              size="sm"
              variant={saleType === 'wholesale' ? 'default' : 'ghost'}
              onClick={() => setSaleType('wholesale')}
              className={`h-8 text-xs px-3 ${saleType === 'wholesale' ? 'bg-violet-600 hover:bg-violet-700' : ''}`}
            >
              Wholesale
            </Button>
          </div>
          {/* Mouth Size & Weight */}
          <div className="flex bg-muted rounded-lg p-1">
            <Button size="sm" variant={mouthSize === "22mm" ? "default" : "ghost"} className="h-8 text-xs" onClick={() => { setMouthSize("22mm"); setWeight("12kg"); }}>22mm</Button>
            <Button size="sm" variant={mouthSize === "20mm" ? "default" : "ghost"} className="h-8 text-xs" onClick={() => { setMouthSize("20mm"); setWeight("12kg"); }}>20mm</Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {(mouthSize === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM).slice(0, 4).map(w => (
              <Button
                key={w}
                size="sm"
                variant={weight === w ? "default" : "outline"}
                className="h-8 text-xs px-2"
                onClick={() => setWeight(w)}
              >
                {w}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Grid: Products | Selling Cart | Return Cart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Product Selection */}
          <div className="lg:col-span-5">
            <Card className="h-full">
              <CardHeader className="pb-2 px-3 pt-3">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="h-9"
                  />
                </div>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
                  <TabsList className="grid grid-cols-4 h-9">
                    <TabsTrigger value="lpg" className="text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                      <Fuel className="h-3.5 w-3.5 mr-1" />LPG
                    </TabsTrigger>
                    <TabsTrigger value="stove" className="text-xs data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                      <ChefHat className="h-3.5 w-3.5 mr-1" />Stove
                    </TabsTrigger>
                    <TabsTrigger value="regulator" className="text-xs data-[state=active]:bg-violet-500 data-[state=active]:text-white">
                      <Gauge className="h-3.5 w-3.5 mr-1" />Reg
                    </TabsTrigger>
                    <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <ScrollArea className="h-[300px] sm:h-[400px]">
                  {/* LPG Products */}
                  {(activeTab === 'lpg' || activeTab === 'all') && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                      {(activeTab === 'all' ? filteredBrands.slice(0, 6) : filteredBrands).map(brand => {
                        const stock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
                        const price = getLPGPrice(brand.id, weight, cylinderType, saleType);
                        return (
                          <button
                            key={brand.id}
                            onClick={() => addLPGToCart(brand)}
                            disabled={stock === 0}
                            className={`p-2 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                              stock === 0 ? 'opacity-50 cursor-not-allowed border-muted' : 'border-transparent hover:border-primary/50 bg-card'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div 
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: brand.color }}
                              >
                                <Cylinder className="h-4 w-4 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-xs truncate">{brand.name}</p>
                                <p className="text-[10px] text-muted-foreground">{weight}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{price}</span>
                              <Badge variant={stock > 5 ? "secondary" : stock > 0 ? "outline" : "destructive"} className="text-[9px] px-1.5">
                                {stock > 0 ? stock : 'Out'}
                              </Badge>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Stoves */}
                  {(activeTab === 'stove' || activeTab === 'all') && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                      {(activeTab === 'all' ? filteredStoves.slice(0, 3) : filteredStoves).map(stove => {
                        const price = getStovePrice(stove.brand, stove.model) || stove.price;
                        return (
                          <button
                            key={stove.id}
                            onClick={() => addStoveToCart(stove)}
                            disabled={stove.quantity === 0}
                            className={`p-2 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                              stove.quantity === 0 ? 'opacity-50 cursor-not-allowed border-muted' : 'border-transparent hover:border-orange-500/50 bg-card'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                                <ChefHat className="h-4 w-4 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-xs truncate">{stove.brand}</p>
                                <p className="text-[10px] text-muted-foreground">{stove.burners}B • {stove.model}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-orange-600">{BANGLADESHI_CURRENCY_SYMBOL}{price}</span>
                              <Badge variant="secondary" className="text-[9px] px-1.5">{stove.quantity}</Badge>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Regulators */}
                  {(activeTab === 'regulator' || activeTab === 'all') && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(activeTab === 'all' ? filteredRegulators.slice(0, 3) : filteredRegulators).map(reg => {
                        const price = getRegulatorPrice(reg.brand, reg.type) || reg.price || 0;
                        return (
                          <button
                            key={reg.id}
                            onClick={() => addRegulatorToCart(reg)}
                            disabled={reg.quantity === 0}
                            className={`p-2 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                              reg.quantity === 0 ? 'opacity-50 cursor-not-allowed border-muted' : 'border-transparent hover:border-violet-500/50 bg-card'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center flex-shrink-0">
                                <Gauge className="h-4 w-4 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-xs truncate">{reg.brand}</p>
                                <p className="text-[10px] text-muted-foreground">{reg.type}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-sm text-violet-600">{BANGLADESHI_CURRENCY_SYMBOL}{price}</span>
                              <Badge variant="secondary" className="text-[9px] px-1.5">{reg.quantity}</Badge>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {filteredBrands.length === 0 && activeTab === 'lpg' && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Cylinder className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No cylinders found</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Selling Cart */}
          <div className="lg:col-span-4">
            <Card className="h-full border-2 border-emerald-200 dark:border-emerald-900">
              <CardHeader className="pb-2 px-3 pt-3 bg-emerald-50 dark:bg-emerald-950/30">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-emerald-600" />
                    Selling
                  </span>
                  <Badge className="bg-emerald-600">{saleItems.reduce((s, i) => s + i.quantity, 0)}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <ScrollArea className="h-[200px] sm:h-[280px]">
                  {saleItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs">Select products to sell</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {saleItems.map(item => (
                        <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs truncate">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{item.details}</p>
                            <p className="font-bold text-sm text-emerald-600">{BANGLADESHI_CURRENCY_SYMBOL}{(item.price * item.quantity).toLocaleString()}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-0.5 bg-background rounded p-0.5">
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateItemQuantity(item.id, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-5 text-center text-xs font-bold">{item.quantity}</span>
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateItemQuantity(item.id, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => removeItem(item.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <Separator className="my-3" />

                {/* Totals */}
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{BANGLADESHI_CURRENCY_SYMBOL}{subtotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount</span>
                      <span>-{BANGLADESHI_CURRENCY_SYMBOL}{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-1 border-t">
                    <span>Total</span>
                    <span className="text-emerald-600">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Return Cart */}
          <div className="lg:col-span-3">
            <Card className={`h-full border-2 ${hasRefillInCart ? 'border-amber-200 dark:border-amber-900' : 'border-muted'}`}>
              <CardHeader className={`pb-2 px-3 pt-3 ${hasRefillInCart ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-muted/30'}`}>
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4 text-amber-600" />
                    Return
                  </span>
                  <Badge variant={isReturnCountMatched ? "secondary" : "destructive"}>
                    {returnCylindersCount}/{refillCylindersCount}
                  </Badge>
                </CardTitle>
                {hasRefillInCart && !isReturnCountMatched && (
                  <p className="text-[10px] text-destructive mt-1">
                    ⚠ Must return {refillCylindersCount} cylinder(s)
                  </p>
                )}
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {!hasRefillInCart ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">Return applies to Refill only</p>
                  </div>
                ) : (
                  <>
                    {/* Return Items List */}
                    <ScrollArea className="h-[120px] sm:h-[150px] mb-3">
                      {returnItems.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground">
                          <p className="text-xs">Select return cylinders below</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {returnItems.map(item => (
                            <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border">
                              <div 
                                className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center"
                                style={{ backgroundColor: item.brandColor }}
                              >
                                <Cylinder className="h-3 w-3 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-xs truncate">{item.brandName}</p>
                                <div className="flex items-center gap-1">
                                  <Checkbox 
                                    checked={item.isLeaked}
                                    onCheckedChange={() => toggleReturnLeaked(item.id)}
                                    className="h-3 w-3"
                                  />
                                  <span className="text-[9px] text-muted-foreground">Leaked</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 bg-background rounded p-0.5">
                                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => updateReturnQuantity(item.id, -1)}>
                                  <Minus className="h-2.5 w-2.5" />
                                </Button>
                                <span className="w-4 text-center text-xs font-bold">{item.quantity}</span>
                                <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => updateReturnQuantity(item.id, 1)}>
                                  <Plus className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                              <Button size="icon" variant="ghost" className="h-5 w-5 text-destructive" onClick={() => removeReturnItem(item.id)}>
                                <X className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>

                    <Separator className="my-2" />

                    {/* Available Brands for Return */}
                    <p className="text-[10px] text-muted-foreground mb-2">Quick Add:</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {brandsForReturn.slice(0, 6).map(brand => (
                        <button
                          key={brand.id}
                          onClick={() => addReturnCylinder(brand)}
                          className="p-1.5 rounded border hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all"
                        >
                          <div 
                            className="w-6 h-6 mx-auto rounded flex items-center justify-center"
                            style={{ backgroundColor: brand.color }}
                          >
                            <Cylinder className="h-3 w-3 text-white" />
                          </div>
                          <p className="text-[9px] text-center mt-1 truncate">{brand.name}</p>
                        </button>
                      ))}
                    </div>

                    {/* Custom Brand */}
                    {showCustomBrandInput ? (
                      <div className="mt-2 flex gap-1">
                        <Input
                          value={customReturnBrand}
                          onChange={(e) => setCustomReturnBrand(e.target.value)}
                          placeholder="Brand name"
                          className="h-7 text-xs"
                        />
                        <Button size="sm" className="h-7 px-2" onClick={handleAddCustomBrand}>
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setShowCustomBrandInput(false)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2 h-7 text-xs"
                        onClick={() => setShowCustomBrandInput(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Custom Brand
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Checkout Panel */}
        <Card className="border-2">
          <CardHeader className="pb-3 px-4 pt-4">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Checkout
              </span>
              {selectedCustomer && (
                <Badge variant="outline">Due: {BANGLADESHI_CURRENCY_SYMBOL}{selectedCustomer.total_due || 0}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label className="text-xs">Customer</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCustomerId === 'walkin' ? 'default' : 'outline'}
                  size="sm"
                  className="h-8"
                  onClick={() => handleCustomerSelect('walkin')}
                >
                  <User className="h-3 w-3 mr-1" />
                  Walk-in
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setShowAddCustomerDialog(true)}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  New
                </Button>
                <div className="flex-1 min-w-[150px]">
                  <Select value={selectedCustomerId === 'walkin' ? '' : selectedCustomerId || ''} onValueChange={handleCustomerSelect}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select customer..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Search..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                      {filteredCustomers.slice(0, 10).map(c => (
                        <SelectItem key={c.id} value={c.id} className="text-xs">
                          {c.name} {c.phone && `• ${c.phone}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Customer Details (if selected) */}
            {selectedCustomer && (
              <div className="grid grid-cols-3 gap-2 p-2 bg-muted/30 rounded-lg text-xs">
                <div>
                  <span className="text-muted-foreground">Name:</span>
                  <p className="font-medium">{selectedCustomer.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone:</span>
                  <p className="font-medium">{selectedCustomer.phone || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Due:</span>
                  <p className="font-medium text-destructive">{BANGLADESHI_CURRENCY_SYMBOL}{selectedCustomer.total_due || 0}</p>
                </div>
              </div>
            )}

            {/* Discount & Driver */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Discount (৳)</Label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
              {drivers.length > 0 && (
                <div>
                  <Label className="text-xs">Driver</Label>
                  <Select value={selectedDriverId || ""} onValueChange={(v) => setSelectedDriverId(v || null)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {drivers.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Validation Warning */}
            {hasRefillInCart && !isReturnCountMatched && (
              <div className="flex items-center gap-2 p-2 bg-destructive/10 text-destructive rounded-lg text-xs">
                <AlertTriangle className="h-4 w-4" />
                <span>Return {refillCylindersCount} cylinder(s) to complete sale</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                className="h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700" 
                disabled={processing || saleItems.length === 0 || (hasRefillInCart && !isReturnCountMatched)}
                onClick={() => handleCompleteSale('completed')}
              >
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Wallet className="h-4 w-4 mr-2" />
                )}
                Pay Now
              </Button>
              <Button 
                variant="outline"
                className="h-12 text-sm font-bold border-amber-500 text-amber-600 hover:bg-amber-50"
                disabled={processing || saleItems.length === 0 || selectedCustomerId === 'walkin' || (hasRefillInCart && !isReturnCountMatched)}
                onClick={() => handleCompleteSale('pending')}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Save Due
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        {recentTransactions.length > 0 && (
          <Card>
            <CardHeader className="pb-2 px-4 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Recent (Last 5 min)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {recentTransactions.map(txn => (
                  <div key={txn.id} className="flex-shrink-0 p-2 rounded-lg border bg-muted/30 min-w-[140px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">{txn.transactionNumber}</span>
                      <Badge variant={txn.status === 'completed' ? 'default' : 'secondary'} className="text-[8px] h-4">
                        {txn.status === 'completed' ? 'Paid' : 'Due'}
                      </Badge>
                    </div>
                    <p className="font-bold text-sm">{BANGLADESHI_CURRENCY_SYMBOL}{txn.total}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[9px] text-muted-foreground">
                        {txn.items.length} item(s)
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 px-1 text-[9px] text-destructive hover:text-destructive"
                        onClick={() => { setTransactionToVoid(txn); setShowVoidDialog(true); }}
                      >
                        <Undo2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialogs */}
        <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Phone number" />
              </div>
              <div>
                <Label className="text-xs">Address</Label>
                <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Address" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCustomerDialog(false)}>Cancel</Button>
              <Button onClick={handleAddCustomer}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Void Transaction?</DialogTitle>
              <DialogDescription>
                This will reverse {transactionToVoid?.transactionNumber}. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVoidDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleVoidTransaction}>Void</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showPrintTypeDialog} onOpenChange={setShowPrintTypeDialog}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Print Receipt</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-16 flex-col" onClick={() => { setShowPrintTypeDialog(false); setShowInvoiceDialog(true); }}>
                <FileText className="h-5 w-5 mb-1" />
                <span className="text-xs">Customer Bill</span>
              </Button>
              <Button variant="outline" className="h-16 flex-col" onClick={() => { setShowPrintTypeDialog(false); setShowInvoiceDialog(true); }}>
                <Printer className="h-5 w-5 mb-1" />
                <span className="text-xs">Gate Pass</span>
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setShowPrintTypeDialog(false)}>
              Skip
            </Button>
          </DialogContent>
        </Dialog>

        <BarcodeScanner
          open={showBarcodeScanner}
          onOpenChange={setShowBarcodeScanner}
          onProductFound={(product) => {
            toast({ title: "Found", description: product.name });
            setShowBarcodeScanner(false);
          }}
        />

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
