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
import { Switch } from "@/components/ui/switch";
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  Printer, 
  Loader2,
  FileText,
  Clock,
  X,
  User,
  Phone,
  MapPin,
  History,
  UserPlus,
  Search,
  Package,
  AlertTriangle,
  ScanLine,
  Truck,
  AlertCircle,
  Undo2,
  FileCheck,
  Fuel,
  Info,
  ChefHat,
  Gauge,
  ArrowLeftRight,
  Cylinder
} from "lucide-react";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { generateInvoicePDF } from "@/lib/pdfExport";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { getBrandMouthSizeMap, getDefaultMouthSize } from "@/lib/brandConstants";
import { supabase } from "@/integrations/supabase/client";
import { parsePositiveNumber, parsePositiveInt, sanitizeString, customerSchema } from "@/lib/validationSchemas";
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";
import { useLanguage } from "@/contexts/LanguageContext";

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

interface CustomerSalesHistory {
  id: string;
  date: string;
  items: string;
  total: number;
  status: string;
}

// Weight options for 22mm and 20mm
const WEIGHT_OPTIONS_22MM = ["5.5kg", "12kg", "12.5kg", "25kg", "35kg", "45kg"];
const WEIGHT_OPTIONS_20MM = ["5kg", "10kg", "12kg", "15kg", "21kg", "35kg"];
const mouthSizes = ["22mm", "20mm"];

// Brand mouth size mapping (generated from brand constants)
const BRAND_MOUTH_SIZE_MAP = getBrandMouthSizeMap();

// Credit limit for customers (configurable)
const DEFAULT_CREDIT_LIMIT = 10000;

export const POSModule = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // LPG form state - defaults set to refill, retail, 22mm
  const [cylinderType, setCylinderType] = useState<"refill" | "package">("refill");
  const [saleType, setSaleType] = useState<"retail" | "wholesale">("retail");
  const [sellingBrand, setSellingBrand] = useState("");
  const [returnBrand, setReturnBrand] = useState("");
  const [weight, setWeight] = useState("12kg");
  const [mouthSize, setMouthSize] = useState("22mm");
  const [price, setPrice] = useState("0");
  const [quantity, setQuantity] = useState("1");
  const [isLeakedReturn, setIsLeakedReturn] = useState(false);
  
  // Stove/Regulator state
  const [selectedStove, setSelectedStove] = useState("");
  const [stoveQuantity, setStoveQuantity] = useState("1");
  const [selectedRegulator, setSelectedRegulator] = useState("");
  const [regulatorQuantity, setRegulatorQuantity] = useState("1");
  const [regulatorPrice, setRegulatorPrice] = useState("0");
  
  // Search/Filter state
  const [productSearch, setProductSearch] = useState("");
  
  // Custom product state
  const [customProductName, setCustomProductName] = useState("");
  const [customProductPrice, setCustomProductPrice] = useState("0");
  const [customProductQuantity, setCustomProductQuantity] = useState("1");
  
  // Data
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  
  // Cart & Customer
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>("walkin");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState("0");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  
  // Configuration Panel state
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [exchangeEmpty, setExchangeEmpty] = useState(true);
  
  // Recent Transactions for void/undo
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [transactionToVoid, setTransactionToVoid] = useState<RecentTransaction | null>(null);
  
  // Deposit prompt for refill without return
  const [showDepositPrompt, setShowDepositPrompt] = useState(false);
  const [pendingLpgItem, setPendingLpgItem] = useState<any>(null);
  
  // Customer dialogs
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [showCustomerHistoryDialog, setShowCustomerHistoryDialog] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<CustomerSalesHistory[]>([]);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: ""
  });
  
  // Invoice
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [printType, setPrintType] = useState<'bill' | 'gatepass'>('bill');
  const [showPrintTypeDialog, setShowPrintTypeDialog] = useState(false);

  // Barcode Scanner
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Mouth size mismatch warning
  const [showMouthSizeWarning, setShowMouthSizeWarning] = useState(false);

  // Fetch data with real-time subscriptions
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
    
    // Fetch driver profiles
    if (driversRes.data && driversRes.data.length > 0) {
      const driverIds = driversRes.data.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone')
        .in('user_id', driverIds);
      
      if (profiles) {
        const formattedDrivers: Driver[] = profiles.map(p => ({
          id: p.user_id,
          name: p.full_name || 'Driver',
          phone: p.phone || '',
          status: 'active' as const
        }));
        setDrivers(formattedDrivers);
      }
    }

    // Fetch recent transactions (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: recentTxns } = await supabase
      .from('pos_transactions')
      .select(`
        id,
        transaction_number,
        total,
        payment_status,
        created_at,
        customer_id,
        pos_transaction_items (product_name, quantity)
      `)
      .gte('created_at', fiveMinutesAgo)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentTxns) {
      const txns: RecentTransaction[] = recentTxns.map(t => ({
        id: t.id,
        transactionNumber: t.transaction_number,
        customerName: 'Customer',
        total: Number(t.total),
        status: t.payment_status,
        createdAt: new Date(t.created_at),
        items: t.pos_transaction_items?.map((i: any) => ({ name: i.product_name, quantity: i.quantity })) || []
      }));
      setRecentTransactions(txns);
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    initData();

    // Real-time subscriptions for inventory changes - NO DELAY
    const lpgChannel = supabase
      .channel('pos-lpg-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lpg_brands' }, () => {
        supabase.from('lpg_brands').select('*').eq('is_active', true).then(({ data }) => {
          if (data) setLpgBrands(data);
        });
      })
      .subscribe();

    const stoveChannel = supabase
      .channel('pos-stoves-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stoves' }, () => {
        supabase.from('stoves').select('*').eq('is_active', true).then(({ data }) => {
          if (data) setStoves(data);
        });
      })
      .subscribe();

    const regulatorChannel = supabase
      .channel('pos-regulators-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regulators' }, () => {
        supabase.from('regulators').select('*').eq('is_active', true).then(({ data }) => {
          if (data) setRegulators(data);
        });
      })
      .subscribe();

    const customerChannel = supabase
      .channel('pos-customers-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        supabase.from('customers').select('*').order('name').then(({ data }) => {
          if (data) setCustomers(data);
        });
      })
      .subscribe();

    const priceChannel = supabase
      .channel('pos-prices-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_prices' }, () => {
        supabase.from('product_prices').select('*').eq('is_active', true).then(({ data }) => {
          if (data) setProductPrices(data);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(lpgChannel);
      supabase.removeChannel(stoveChannel);
      supabase.removeChannel(regulatorChannel);
      supabase.removeChannel(customerChannel);
      supabase.removeChannel(priceChannel);
    };
  }, [fetchData]);

  // Get price functions
  const getRegulatorPrice = useCallback((brand: string, type: string) => {
    const priceEntry = productPrices.find(
      p => p.product_type === 'regulator' && 
           p.product_name.toLowerCase().includes(brand.toLowerCase()) &&
           p.product_name.toLowerCase().includes(type.toLowerCase())
    );
    return priceEntry?.retail_price || 0;
  }, [productPrices]);

  const getStovePrice = useCallback((brand: string, model: string) => {
    const priceEntry = productPrices.find(
      p => p.product_type === 'stove' && 
           p.product_name.toLowerCase().includes(brand.toLowerCase()) &&
           p.product_name.toLowerCase().includes(model.toLowerCase())
    );
    return priceEntry?.retail_price || 0;
  }, [productPrices]);

  const getLPGPrice = useCallback((brandId: string, weightVal: string, cylType: 'refill' | 'package', saleTp: 'retail' | 'wholesale') => {
    const brand = lpgBrands.find(b => b.id === brandId);
    if (!brand) return 0;
    
    const priceEntry = productPrices.find(
      p => p.product_type === 'lpg' && 
           p.brand_id === brandId &&
           p.size?.includes(weightVal)
    );
    
    if (!priceEntry) return 0;
    
    // Package = Gas Price + Cylinder Deposit
    if (cylType === 'package') {
      return priceEntry.package_price || priceEntry.retail_price;
    }
    // Refill = Gas Price Only
    return saleTp === 'wholesale' ? priceEntry.distributor_price : priceEntry.retail_price;
  }, [lpgBrands, productPrices]);

  // Auto-populate LPG price when brand/weight/type changes
  useEffect(() => {
    if (sellingBrand && weight && productPrices.length > 0) {
      const autoPrice = getLPGPrice(sellingBrand, weight, cylinderType, saleType);
      if (autoPrice > 0) {
        setPrice(autoPrice.toString());
      }
    }
  }, [sellingBrand, weight, cylinderType, saleType, productPrices, getLPGPrice]);

  // Check for mouth size mismatch when brand is selected
  useEffect(() => {
    if (sellingBrand) {
      const brand = lpgBrands.find(b => b.id === sellingBrand);
      if (brand) {
        const expectedSize = BRAND_MOUTH_SIZE_MAP[brand.name.toLowerCase()];
        if (expectedSize && expectedSize !== mouthSize) {
          setShowMouthSizeWarning(true);
        } else {
          setShowMouthSizeWarning(false);
        }
      }
    }
  }, [sellingBrand, mouthSize, lpgBrands]);

  // Filter brands by mouth size, weight, and search
  const filteredBrands = useMemo(() => {
    return lpgBrands.filter(b => {
      const matchesSize = b.size === mouthSize;
      const matchesWeight = b.weight === weight;
      const matchesSearch = productSearch === "" || 
        b.name.toLowerCase().includes(productSearch.toLowerCase());
      return matchesSize && matchesWeight && matchesSearch;
    });
  }, [lpgBrands, mouthSize, weight, productSearch]);

  // All brands for return (cross-swap allowed)
  const allBrandsForReturn = useMemo(() => {
    return lpgBrands.filter(b => {
      const matchesSearch = productSearch === "" || 
        b.name.toLowerCase().includes(productSearch.toLowerCase());
      return matchesSearch;
    });
  }, [lpgBrands, productSearch]);

  // Filter stoves by search
  const filteredStoves = useMemo(() => {
    if (productSearch === "") return stoves;
    return stoves.filter(s => 
      s.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
      s.model.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [stoves, productSearch]);

  // Filter regulators by search
  const filteredRegulators = useMemo(() => {
    if (productSearch === "") return regulators;
    return regulators.filter(r => 
      r.brand.toLowerCase().includes(productSearch.toLowerCase()) ||
      r.type.toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [regulators, productSearch]);

  // Calculate total LPG stock
  const getLPGStock = (brandId: string, type: 'refill' | 'package') => {
    const brand = lpgBrands.find(b => b.id === brandId);
    if (!brand) return 0;
    return type === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
  };

  // Get stove stock
  const getStoveStock = (stoveId: string) => {
    const stove = stoves.find(s => s.id === stoveId);
    return stove?.quantity || 0;
  };

  // Get regulator stock
  const getRegulatorStock = (regulatorId: string) => {
    const regulator = regulators.find(r => r.id === regulatorId);
    return regulator?.quantity || 0;
  };

  // Fetch customer sales history
  const fetchCustomerHistory = async (customerId: string) => {
    const { data } = await supabase
      .from('pos_transactions')
      .select(`
        id,
        created_at,
        total,
        payment_status,
        pos_transaction_items (product_name, quantity)
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      const history: CustomerSalesHistory[] = data.map(t => ({
        id: t.id,
        date: new Date(t.created_at).toLocaleDateString('en-BD'),
        items: t.pos_transaction_items?.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', ') || 'N/A',
        total: Number(t.total),
        status: t.payment_status
      }));
      setCustomerHistory(history);
    }
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    if (customerId === "walkin") {
      setSelectedCustomerId("walkin");
      setSelectedCustomer(null);
      setCustomerName("");
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
    }
  };

  // Add new customer
  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast({ title: "Customer name is required", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: sanitizeString(newCustomer.name),
        phone: newCustomer.phone || null,
        address: newCustomer.address || null,
        created_by: user?.id
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error adding customer", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Customer added successfully" });
    setShowAddCustomerDialog(false);
    setNewCustomer({ name: "", phone: "", address: "" });
    
    if (data) {
      setSelectedCustomerId(data.id);
      setSelectedCustomer(data);
      setCustomerName(data.name);
      setCustomers([...customers, data]);
    }
  };

  // Add LPG to sale with refill/package logic validation
  const addLPGToSale = (forcePackage: boolean = false) => {
    if (!sellingBrand || !weight) {
      toast({ title: "Please select a brand first", variant: "destructive" });
      return;
    }

    const validatedPrice = parsePositiveNumber(price, 10000000);
    const validatedQuantity = parsePositiveInt(quantity, 10000);

    if (validatedPrice <= 0) {
      toast({ title: "Price must be greater than 0", variant: "destructive" });
      return;
    }

    const brand = lpgBrands.find(b => b.id === sellingBrand);
    if (!brand) return;

    // Check stock availability - BLOCK if stock = 0
    const availableStock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
    if (availableStock === 0) {
      toast({ 
        title: "Out of Stock", 
        description: `${brand.name} ${cylinderType} cylinders are out of stock`,
        variant: "destructive" 
      });
      return;
    }
    if (validatedQuantity > availableStock) {
      toast({ title: `Only ${availableStock} cylinders available in stock`, variant: "destructive" });
      return;
    }

    // CRITICAL LOGIC: Refill requires return brand unless customer pays deposit
    if (cylinderType === 'refill' && exchangeEmpty && (!returnBrand || returnBrand === "none") && !forcePackage) {
      // Show deposit prompt
      setPendingLpgItem({
        brand,
        validatedPrice,
        validatedQuantity,
        weight
      });
      setShowDepositPrompt(true);
      return;
    }

    const returnBrandObj = returnBrand && returnBrand !== "none" ? lpgBrands.find(b => b.id === returnBrand) : undefined;
    const finalCylinderType = forcePackage ? 'package' : cylinderType;
    
    // Calculate final price (if forced to package, add deposit)
    let finalPrice = validatedPrice;
    if (forcePackage && cylinderType === 'refill') {
      // Get package price instead
      finalPrice = getLPGPrice(sellingBrand, weight, 'package', saleType);
    }
    
    const newItem: SaleItem = {
      id: `lpg-${Date.now()}`,
      type: 'lpg',
      name: `${brand.name} - ${finalCylinderType === 'refill' ? 'Refill' : 'Package (New)'}`,
      details: `${weight}, ${mouthSize}, ${saleType}${returnBrandObj ? `, Return: ${returnBrandObj.name}${isLeakedReturn ? ' (Leaked)' : ''}` : ''}`,
      price: finalPrice,
      quantity: validatedQuantity,
      returnBrand: returnBrandObj?.name,
      returnBrandId: returnBrandObj?.id,
      cylinderType: finalCylinderType,
      brandId: sellingBrand,
      isLeakedReturn: isLeakedReturn && !!returnBrandObj
    };

    setSaleItems([...saleItems, newItem]);
    resetLPGForm();
    toast({ title: "Added to cart" });
  };

  const resetLPGForm = () => {
    setSellingBrand("");
    setReturnBrand("");
    setPrice("0");
    setQuantity("1");
    setIsLeakedReturn(false);
    setShowMouthSizeWarning(false);
    setShowConfigPanel(false);
  };

  // Handle deposit prompt response
  const handleDepositPromptResponse = (chargeDeposit: boolean) => {
    setShowDepositPrompt(false);
    if (chargeDeposit && pendingLpgItem) {
      // Add as package (customer pays deposit)
      addLPGToSale(true);
    } else if (pendingLpgItem) {
      // Log as "Due Cylinder" to customer profile - add item but track cylinder
      const brand = pendingLpgItem.brand;
      const newItem: SaleItem = {
        id: `lpg-${Date.now()}`,
        type: 'lpg',
        name: `${brand.name} - Refill (Cylinder Due)`,
        details: `${pendingLpgItem.weight}, ${mouthSize}, ${saleType} - ⚠️ No Return`,
        price: pendingLpgItem.validatedPrice,
        quantity: pendingLpgItem.validatedQuantity,
        cylinderType: 'refill',
        brandId: sellingBrand
      };
      setSaleItems([...saleItems, newItem]);
      resetLPGForm();
      toast({ 
        title: "Added to cart", 
        description: "Customer owes cylinder return",
      });
    }
    setPendingLpgItem(null);
  };

  // Quick add LPG from card
  const handleQuickAddLPG = (brand: LPGBrand) => {
    setSellingBrand(brand.id);
    const autoPrice = getLPGPrice(brand.id, weight, cylinderType, saleType);
    setPrice(autoPrice.toString());
    setShowConfigPanel(true);
  };

  // Add stove to sale
  const addStoveToSale = (stove: Stove) => {
    if (stove.quantity === 0) {
      toast({ title: "Out of Stock", variant: "destructive" });
      return;
    }

    const stovePrice = getStovePrice(stove.brand, stove.model) || stove.price;

    const existingItem = saleItems.find(item => item.stoveId === stove.id);
    if (existingItem) {
      if (existingItem.quantity >= stove.quantity) {
        toast({ title: `Only ${stove.quantity} in stock`, variant: "destructive" });
        return;
      }
      setSaleItems(saleItems.map(item => 
        item.stoveId === stove.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: SaleItem = {
        id: `stove-${Date.now()}`,
        type: 'stove',
        name: `${stove.brand} ${stove.model}`,
        details: `${stove.burners} Burner`,
        price: stovePrice,
        quantity: 1,
        stoveId: stove.id
      };
      setSaleItems([...saleItems, newItem]);
    }
    toast({ title: "Added to cart" });
  };

  // Add regulator to sale
  const addRegulatorToSale = (regulator: Regulator) => {
    if (regulator.quantity === 0) {
      toast({ title: "Out of Stock", variant: "destructive" });
      return;
    }

    const regPrice = getRegulatorPrice(regulator.brand, regulator.type) || regulator.price || 0;

    const existingItem = saleItems.find(item => item.regulatorId === regulator.id);
    if (existingItem) {
      if (existingItem.quantity >= regulator.quantity) {
        toast({ title: `Only ${regulator.quantity} in stock`, variant: "destructive" });
        return;
      }
      setSaleItems(saleItems.map(item => 
        item.regulatorId === regulator.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: SaleItem = {
        id: `reg-${Date.now()}`,
        type: 'regulator',
        name: regulator.brand,
        details: regulator.type,
        price: regPrice,
        quantity: 1,
        regulatorId: regulator.id
      };
      setSaleItems([...saleItems, newItem]);
    }
    toast({ title: "Added to cart" });
  };

  const addCustomProductToSale = () => {
    if (!customProductName.trim()) {
      toast({ title: "Please enter product name", variant: "destructive" });
      return;
    }

    const validatedQuantity = parsePositiveInt(customProductQuantity, 10000);
    const validatedPrice = parsePositiveNumber(customProductPrice, 10000000);

    if (validatedPrice <= 0) {
      toast({ title: "Price must be greater than 0", variant: "destructive" });
      return;
    }

    const newItem: SaleItem = {
      id: `custom-${Date.now()}`,
      type: 'custom',
      name: customProductName.trim(),
      details: 'Service/Fee',
      price: validatedPrice,
      quantity: validatedQuantity
    };

    setSaleItems([...saleItems, newItem]);
    setCustomProductName("");
    setCustomProductPrice("0");
    setCustomProductQuantity("1");
    toast({ title: "Custom product added" });
  };

  // Handle barcode scanner product found
  const handleBarcodeProductFound = (product: any) => {
    if (product.type === 'lpg') {
      const brand = lpgBrands.find(b => b.id === product.id);
      if (brand) handleQuickAddLPG(brand);
    } else if (product.type === 'stove') {
      const stove = stoves.find(s => s.id === product.id);
      if (stove) addStoveToSale(stove);
    } else if (product.type === 'regulator') {
      const regulator = regulators.find(r => r.id === product.id);
      if (regulator) addRegulatorToSale(regulator);
    }
    setShowBarcodeScanner(false);
  };

  // Export invoice to PDF
  const handleExportPDF = async () => {
    if (!lastTransaction) return;
    try {
      await generateInvoicePDF(lastTransaction);
      toast({ title: "PDF exported successfully" });
    } catch (error) {
      toast({ title: "Failed to export PDF", variant: "destructive" });
    }
  };

  const removeItem = (id: string) => {
    setSaleItems(saleItems.filter(item => item.id !== id));
  };

  const updateItemQuantity = (id: string, change: number) => {
    setSaleItems(saleItems.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + change;
        if (newQty < 1) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const subtotal = saleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountAmount);

  // Count cylinders for package sales (to track cylinder dues)
  const packageCylinderCount = saleItems
    .filter(item => item.type === 'lpg' && item.cylinderType === 'package')
    .reduce((sum, item) => sum + item.quantity, 0);

  // Check credit limit for due sales
  const canSaveAsDue = useMemo(() => {
    if (selectedCustomerId === "walkin" || !selectedCustomer) return false;
    const currentDue = selectedCustomer.total_due || 0;
    const newTotal = currentDue + total;
    return newTotal <= DEFAULT_CREDIT_LIMIT;
  }, [selectedCustomerId, selectedCustomer, total]);

  // Void a recent transaction with full inventory reversal
  const handleVoidTransaction = async () => {
    if (!transactionToVoid) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in", variant: "destructive" });
        return;
      }

      // Get transaction items for inventory reversal
      const { data: txnItems } = await supabase
        .from('pos_transaction_items')
        .select('*')
        .eq('transaction_id', transactionToVoid.id);

      // Mark transaction as voided in database
      const { error: voidError } = await supabase
        .from('pos_transactions')
        .update({
          is_voided: true,
          voided_at: new Date().toISOString(),
          voided_by: user.id,
          void_reason: 'Voided by user within 5 minutes'
        })
        .eq('id', transactionToVoid.id);

      if (voidError) throw voidError;

      // Reverse inventory for each item
      if (txnItems) {
        for (const item of txnItems) {
          const productName = item.product_name.toLowerCase();
          
          // Check if it's an LPG item
          if (productName.includes('refill') || productName.includes('package')) {
            // Find the brand from the product name
            const brandMatch = lpgBrands.find(b => productName.includes(b.name.toLowerCase()));
            if (brandMatch) {
              if (productName.includes('refill')) {
                // Reverse: Add back to refill, subtract from empty
                await supabase
                  .from('lpg_brands')
                  .update({ 
                    refill_cylinder: brandMatch.refill_cylinder + item.quantity,
                    empty_cylinder: Math.max(0, brandMatch.empty_cylinder - item.quantity)
                  })
                  .eq('id', brandMatch.id);
              } else if (productName.includes('package')) {
                // Reverse: Add back to package stock
                await supabase
                  .from('lpg_brands')
                  .update({ package_cylinder: brandMatch.package_cylinder + item.quantity })
                  .eq('id', brandMatch.id);
              }
            }
          }
        }
      }

      // Record stock movement for audit
      await supabase
        .from('stock_movements')
        .insert({
          movement_type: 'void',
          notes: `Voided transaction: ${transactionToVoid.transactionNumber}`,
          reference_id: transactionToVoid.id,
          created_by: user.id
        });

      toast({ 
        title: "Transaction voided", 
        description: `${transactionToVoid.transactionNumber} has been voided. Inventory restored.`
      });
      
      setRecentTransactions(prev => prev.filter(t => t.id !== transactionToVoid.id));
      setShowVoidDialog(false);
      setTransactionToVoid(null);
      
    } catch (error: any) {
      toast({ title: "Error voiding transaction", description: error.message, variant: "destructive" });
    }
  };

  const handleCompleteSale = async (paymentStatus: 'completed' | 'pending') => {
    if (saleItems.length === 0) {
      toast({ title: "No items in cart", variant: "destructive" });
      return;
    }

    // Block due sales for walk-in customers
    if (paymentStatus === 'pending' && selectedCustomerId === "walkin") {
      toast({ 
        title: "Cannot save as due", 
        description: "Credit sales require a registered customer",
        variant: "destructive" 
      });
      return;
    }

    // Check credit limit
    if (paymentStatus === 'pending' && !canSaveAsDue) {
      toast({ 
        title: "Credit limit exceeded", 
        description: `Customer's total due would exceed ${BANGLADESHI_CURRENCY_SYMBOL}${DEFAULT_CREDIT_LIMIT}`,
        variant: "destructive" 
      });
      return;
    }

    const validatedDiscount = parsePositiveNumber(discount, 10000000);

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in", variant: "destructive" });
        setProcessing(false);
        return;
      }

      // Generate transaction number
      const { data: txnNum } = await supabase.rpc('generate_transaction_number');
      const transactionNumber = txnNum || `TXN-${Date.now()}`;

      const sanitizedCustomerName = customerName ? sanitizeString(customerName) : '';
      let customerId = selectedCustomerId === "walkin" ? null : selectedCustomerId;

      // If new customer name entered without selecting, create customer
      if (!customerId && sanitizedCustomerName) {
        const customerValidation = customerSchema.safeParse({ name: sanitizedCustomerName });
        if (customerValidation.success) {
          const { data: newCust } = await supabase
            .from('customers')
            .insert({ name: sanitizedCustomerName, created_by: user.id })
            .select()
            .single();
          
          if (newCust) {
            customerId = newCust.id;
            setCustomers([...customers, newCust]);
          }
        }
      }

      // Create transaction with driver_id
      const { data: transaction, error: txnError } = await supabase
        .from('pos_transactions')
        .insert({
          transaction_number: transactionNumber,
          customer_id: customerId,
          subtotal,
          discount: validatedDiscount,
          total: Math.max(0, subtotal - validatedDiscount),
          payment_method: 'cash' as const,
          payment_status: paymentStatus,
          driver_id: selectedDriverId && selectedDriverId !== 'none' ? selectedDriverId : null,
          notes: selectedDriverId && selectedDriverId !== 'none' ? `Driver: ${drivers.find(d => d.id === selectedDriverId)?.name}` : null,
          created_by: user.id
        })
        .select()
        .single();

      if (txnError) throw txnError;

      // Get a product to link items (or use a fallback)
      let productId: string | null = null;
      const { data: defaultProduct } = await supabase
        .from('products')
        .select('id')
        .limit(1)
        .single();

      if (defaultProduct) {
        productId = defaultProduct.id;
      }

      // Insert transaction items
      if (transaction) {
        const items = saleItems.map(item => ({
          transaction_id: transaction.id,
          product_id: productId || item.brandId || item.stoveId || item.regulatorId || transaction.id,
          product_name: `${item.name} - ${item.details}`,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          created_by: user.id
        }));

        await supabase.from('pos_transaction_items').insert(items);
      }

      // === UPDATE INVENTORY AFTER SALE ===
      
      // Update LPG Stock
      for (const item of saleItems.filter(i => i.type === 'lpg' && i.brandId)) {
        const brand = lpgBrands.find(b => b.id === item.brandId);
        if (!brand) continue;

        if (item.cylinderType === 'refill') {
          // Refill: Full Stock -1, Empty Stock +1 (or Problem Stock if leaked)
          const newRefill = Math.max(0, brand.refill_cylinder - item.quantity);
          
          if (item.returnBrandId) {
            // Customer returned an empty - add to appropriate stock
            const returnBrand = lpgBrands.find(b => b.id === item.returnBrandId);
            if (returnBrand) {
              if (item.isLeakedReturn) {
                // Goes to problem stock
                await supabase
                  .from('lpg_brands')
                  .update({ problem_cylinder: returnBrand.problem_cylinder + item.quantity })
                  .eq('id', returnBrand.id);
              } else {
                // Goes to empty stock
                await supabase
                  .from('lpg_brands')
                  .update({ empty_cylinder: returnBrand.empty_cylinder + item.quantity })
                  .eq('id', returnBrand.id);
              }
            }
          }
          
          await supabase
            .from('lpg_brands')
            .update({ refill_cylinder: newRefill })
            .eq('id', brand.id);
            
        } else {
          // Package: Just deduct from package stock
          const newPackage = Math.max(0, brand.package_cylinder - item.quantity);
          await supabase
            .from('lpg_brands')
            .update({ package_cylinder: newPackage })
            .eq('id', brand.id);
        }
      }

      // Update Stove Stock
      for (const item of saleItems.filter(i => i.type === 'stove' && i.stoveId)) {
        const stove = stoves.find(s => s.id === item.stoveId);
        if (stove) {
          const newQty = Math.max(0, stove.quantity - item.quantity);
          await supabase
            .from('stoves')
            .update({ quantity: newQty })
            .eq('id', stove.id);
        }
      }

      // Update Regulator Stock
      for (const item of saleItems.filter(i => i.type === 'regulator' && i.regulatorId)) {
        const regulator = regulators.find(r => r.id === item.regulatorId);
        if (regulator) {
          const newQty = Math.max(0, regulator.quantity - item.quantity);
          await supabase
            .from('regulators')
            .update({ quantity: newQty })
            .eq('id', regulator.id);
        }
      }

      // Update customer dues if pending
      if (paymentStatus === 'pending' && customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          const newDue = (customer.total_due || 0) + total;
          const newCylindersDue = (customer.cylinders_due || 0) + packageCylinderCount;
          await supabase
            .from('customers')
            .update({ 
              total_due: newDue,
              cylinders_due: newCylindersDue,
              last_order_date: new Date().toISOString()
            })
            .eq('id', customerId);
        }
      }

      // Stock movement record
      await supabase
        .from('stock_movements')
        .insert({
          movement_type: 'sale',
          notes: `POS Sale: ${transactionNumber}`,
          reference_id: transaction?.id,
          created_by: user.id
        });

      // Prepare invoice data
      const displayName = selectedCustomer?.name || customerName || "Walk-in Customer";
      const invoiceData = {
        invoiceNumber: transactionNumber,
        date: new Date(),
        customer: { 
          name: displayName,
          phone: selectedCustomer?.phone,
          address: selectedCustomer?.address
        },
        driver: selectedDriverId ? drivers.find(d => d.id === selectedDriverId)?.name : undefined,
        items: saleItems.map(item => ({
          name: item.name,
          description: item.details,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.price * item.quantity
        })),
        subtotal,
        discount: validatedDiscount,
        total: Math.max(0, subtotal - validatedDiscount),
        paymentStatus,
        paymentMethod: 'cash'
      };

      setLastTransaction(invoiceData);
      setShowPrintTypeDialog(true);

      // Reset form
      setSaleItems([]);
      setDiscount("0");
      setSelectedCustomerId("walkin");
      setSelectedCustomer(null);
      setCustomerName("");
      setSelectedDriverId(null);
      
      toast({ 
        title: paymentStatus === 'completed' ? "Sale completed!" : "Saved as due",
        description: `Transaction: ${transactionNumber}`
      });

    } catch (error: any) {
      console.error('Sale error:', error);
      toast({ title: "Error processing sale", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // Get stock status styling
  const getStockStatusStyle = (stock: number) => {
    if (stock === 0) return { bg: "bg-red-500/10", text: "text-red-500", label: "Out" };
    if (stock < 5) return { bg: "bg-amber-500/10", text: "text-amber-600", label: `${stock}` };
    return { bg: "bg-emerald-500/10", text: "text-emerald-600", label: `${stock}` };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3 sm:space-y-4 pb-20 sm:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg flex-shrink-0">
              <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t('pos')}</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">Real-Time Inventory Sync</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Mode:</span>
              <Badge variant={saleType === 'retail' ? 'default' : 'secondary'} className="text-xs cursor-pointer" onClick={() => setSaleType(saleType === 'retail' ? 'wholesale' : 'retail')}>
                {saleType === 'retail' ? 'Retail' : 'Wholesale'}
              </Badge>
            </div>
            <Button onClick={() => setShowBarcodeScanner(true)} variant="outline" size="sm" className="gap-2">
              <ScanLine className="h-4 w-4" />
              <span className="hidden sm:inline">Scan</span>
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Left Side - Product Selection */}
          <div className="lg:col-span-2 space-y-3">
            {/* Search & Quick Filters */}
            <Card className="border-border">
              <CardContent className="p-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Scan QR / Type Product Name..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10 h-10 bg-background"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Refill/Package Toggle */}
                    <div className="flex items-center bg-muted rounded-lg p-1">
                      <Button
                        size="sm"
                        variant={cylinderType === 'refill' ? 'default' : 'ghost'}
                        onClick={() => setCylinderType('refill')}
                        className="h-8 text-xs"
                      >
                        Refill
                      </Button>
                      <Button
                        size="sm"
                        variant={cylinderType === 'package' ? 'default' : 'ghost'}
                        onClick={() => setCylinderType('package')}
                        className={`h-8 text-xs ${cylinderType === 'package' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
                      >
                        Package
                      </Button>
                    </div>
                    {/* Retail/Wholesale Toggle */}
                    <div className="flex items-center bg-muted rounded-lg p-1">
                      <Button
                        size="sm"
                        variant={saleType === 'retail' ? 'default' : 'ghost'}
                        onClick={() => setSaleType('retail')}
                        className="h-8 text-xs"
                      >
                        Retail
                      </Button>
                      <Button
                        size="sm"
                        variant={saleType === 'wholesale' ? 'default' : 'ghost'}
                        onClick={() => setSaleType('wholesale')}
                        className={`h-8 text-xs ${saleType === 'wholesale' ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                      >
                        Wholesale
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Product Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-muted/50 p-1 w-full grid grid-cols-4 h-auto">
                <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1 text-xs sm:text-sm py-2">
                  All
                </TabsTrigger>
                <TabsTrigger value="lpg" className="data-[state=active]:bg-green-600 data-[state=active]:text-white gap-1 text-xs sm:text-sm py-2">
                  <Fuel className="h-3 w-3 sm:h-4 sm:w-4" />
                  LPG
                </TabsTrigger>
                <TabsTrigger value="stove" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-1 text-xs sm:text-sm py-2">
                  <ChefHat className="h-3 w-3 sm:h-4 sm:w-4" />
                  Stove
                </TabsTrigger>
                <TabsTrigger value="regulator" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white gap-1 text-xs sm:text-sm py-2">
                  <Gauge className="h-3 w-3 sm:h-4 sm:w-4" />
                  Reg.
                </TabsTrigger>
              </TabsList>

              {/* LPG Products */}
              <TabsContent value="lpg" className="mt-3 space-y-3">
                {/* LPG Controls */}
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Valve Size */}
                  <div className="flex bg-muted rounded-lg p-1">
                    <Button
                      size="sm"
                      variant={mouthSize === "22mm" ? "default" : "ghost"}
                      className="h-7 text-xs px-3"
                      onClick={() => { setMouthSize("22mm"); setWeight("12kg"); }}
                    >
                      22mm
                    </Button>
                    <Button
                      size="sm"
                      variant={mouthSize === "20mm" ? "default" : "ghost"}
                      className={`h-7 text-xs px-3 ${mouthSize === "20mm" ? "bg-cyan-500 text-white" : ""}`}
                      onClick={() => { setMouthSize("20mm"); setWeight("12kg"); }}
                    >
                      20mm
                    </Button>
                  </div>
                  {/* Weight */}
                  <div className="flex flex-wrap gap-1">
                    {(mouthSize === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM).map(w => (
                      <Button
                        key={w}
                        variant={weight === w ? "default" : "outline"}
                        size="sm"
                        onClick={() => setWeight(w)}
                        className={`h-7 text-xs px-2 ${weight === w ? "" : "bg-muted/50"}`}
                      >
                        {w}
                      </Button>
                    ))}
                  </div>
                  {/* Cylinder Type */}
                  <div className="flex bg-muted rounded-lg p-1 ml-auto">
                    <Button
                      size="sm"
                      variant={cylinderType === "refill" ? "default" : "ghost"}
                      className="h-7 text-xs px-3"
                      onClick={() => setCylinderType("refill")}
                    >
                      Refill
                    </Button>
                    <Button
                      size="sm"
                      variant={cylinderType === "package" ? "default" : "ghost"}
                      className={`h-7 text-xs px-3 ${cylinderType === "package" ? "bg-green-600 text-white" : ""}`}
                      onClick={() => setCylinderType("package")}
                    >
                      Package
                    </Button>
                  </div>
                </div>

                {/* LPG Product Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {filteredBrands.map(brand => {
                    const stock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
                    const stockStyle = getStockStatusStyle(stock);
                    const brandPrice = getLPGPrice(brand.id, weight, cylinderType, saleType);
                    
                    return (
                      <Card 
                        key={brand.id}
                        className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 ${
                          sellingBrand === brand.id ? 'border-primary ring-2 ring-primary/20' : 'border-border'
                        } ${stock === 0 ? 'opacity-50' : ''}`}
                        onClick={() => stock > 0 && handleQuickAddLPG(brand)}
                      >
                        <CardContent className="p-3">
                          <div className="flex flex-col items-center text-center space-y-2">
                            {/* Brand Color Icon */}
                            <div 
                              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shadow-sm"
                              style={{ backgroundColor: brand.color }}
                            >
                              <Cylinder className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                            </div>
                            
                            {/* Brand Name */}
                            <div className="space-y-0.5 min-h-[36px]">
                              <p className="font-semibold text-xs sm:text-sm leading-tight line-clamp-2">{brand.name}</p>
                              <p className="text-[10px] text-muted-foreground">{weight}</p>
                            </div>
                            
                            {/* Price */}
                            <div className="text-primary font-bold text-sm sm:text-base">
                              {BANGLADESHI_CURRENCY_SYMBOL}{brandPrice.toLocaleString()}
                            </div>
                            
                            {/* Stock Badge */}
                            <Badge 
                              variant="secondary" 
                              className={`text-[10px] ${stockStyle.bg} ${stockStyle.text} border-0`}
                            >
                              Stock: {stockStyle.label}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {filteredBrands.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No LPG brands found for {weight} ({mouthSize})</p>
                  </div>
                )}
              </TabsContent>

              {/* Stove Products */}
              <TabsContent value="stove" className="mt-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {filteredStoves.map(stove => {
                    const stockStyle = getStockStatusStyle(stove.quantity);
                    const stovePrice = getStovePrice(stove.brand, stove.model) || stove.price;
                    
                    return (
                      <Card 
                        key={stove.id}
                        className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 border-border ${stove.quantity === 0 ? 'opacity-50' : ''}`}
                        onClick={() => addStoveToSale(stove)}
                      >
                        <CardContent className="p-3">
                          <div className="flex flex-col items-center text-center space-y-2">
                            {/* Stove Icon */}
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-orange-500/20 flex items-center justify-center">
                              <ChefHat className="h-6 w-6 sm:h-7 sm:w-7 text-orange-600" />
                            </div>
                            
                            {/* Brand & Model */}
                            <div className="space-y-0.5 min-h-[36px]">
                              <p className="font-semibold text-xs sm:text-sm leading-tight">{stove.brand}</p>
                              <p className="text-[10px] text-muted-foreground">{stove.model}</p>
                            </div>
                            
                            {/* Burner Badge */}
                            <Badge variant="outline" className="text-[10px]">
                              {stove.burners} Burner
                            </Badge>
                            
                            {/* Price */}
                            <div className="text-primary font-bold text-sm sm:text-base">
                              {BANGLADESHI_CURRENCY_SYMBOL}{stovePrice.toLocaleString()}
                            </div>
                            
                            {/* Stock Badge */}
                            <Badge 
                              variant="secondary" 
                              className={`text-[10px] ${stockStyle.bg} ${stockStyle.text} border-0`}
                            >
                              Stock: {stockStyle.label}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {filteredStoves.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <ChefHat className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No stoves found</p>
                  </div>
                )}
              </TabsContent>

              {/* Regulator Products */}
              <TabsContent value="regulator" className="mt-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {filteredRegulators.map(regulator => {
                    const stockStyle = getStockStatusStyle(regulator.quantity);
                    const regPrice = getRegulatorPrice(regulator.brand, regulator.type) || regulator.price || 0;
                    
                    return (
                      <Card 
                        key={regulator.id}
                        className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 border-border ${regulator.quantity === 0 ? 'opacity-50' : ''}`}
                        onClick={() => addRegulatorToSale(regulator)}
                      >
                        <CardContent className="p-3">
                          <div className="flex flex-col items-center text-center space-y-2">
                            {/* Regulator Icon */}
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-violet-500/20 flex items-center justify-center">
                              <Gauge className="h-6 w-6 sm:h-7 sm:w-7 text-violet-600" />
                            </div>
                            
                            {/* Brand */}
                            <div className="space-y-0.5 min-h-[36px]">
                              <p className="font-semibold text-xs sm:text-sm leading-tight">{regulator.brand}</p>
                              <p className="text-[10px] text-muted-foreground">Regulator</p>
                            </div>
                            
                            {/* Size Badge */}
                            <Badge variant="outline" className="text-[10px]">
                              {regulator.type}
                            </Badge>
                            
                            {/* Price */}
                            <div className="text-primary font-bold text-sm sm:text-base">
                              {BANGLADESHI_CURRENCY_SYMBOL}{regPrice.toLocaleString()}
                            </div>
                            
                            {/* Stock Badge */}
                            <Badge 
                              variant="secondary" 
                              className={`text-[10px] ${stockStyle.bg} ${stockStyle.text} border-0`}
                            >
                              Stock: {stockStyle.label}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {filteredRegulators.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gauge className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No regulators found</p>
                  </div>
                )}
              </TabsContent>

              {/* All Products Tab */}
              <TabsContent value="all" className="mt-3 space-y-4">
                {/* LPG Quick Filters for All tab */}
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="flex bg-muted rounded-lg p-1">
                    <Button size="sm" variant={mouthSize === "22mm" ? "default" : "ghost"} className="h-7 text-xs px-3" onClick={() => { setMouthSize("22mm"); setWeight("12kg"); }}>22mm</Button>
                    <Button size="sm" variant={mouthSize === "20mm" ? "default" : "ghost"} className={`h-7 text-xs px-3 ${mouthSize === "20mm" ? "bg-cyan-500 text-white" : ""}`} onClick={() => { setMouthSize("20mm"); setWeight("12kg"); }}>20mm</Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(mouthSize === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM).slice(0, 3).map(w => (
                      <Button key={w} variant={weight === w ? "default" : "outline"} size="sm" onClick={() => setWeight(w)} className={`h-7 text-xs px-2`}>{w}</Button>
                    ))}
                  </div>
                </div>

                {/* Combined Products Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                  {/* LPG Brands */}
                  {filteredBrands.slice(0, 4).map(brand => {
                    const stock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
                    const stockStyle = getStockStatusStyle(stock);
                    const brandPrice = getLPGPrice(brand.id, weight, cylinderType, saleType);
                    
                    return (
                      <Card 
                        key={brand.id}
                        className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 ${sellingBrand === brand.id ? 'border-primary' : 'border-border'} ${stock === 0 ? 'opacity-50' : ''}`}
                        onClick={() => stock > 0 && handleQuickAddLPG(brand)}
                      >
                        <CardContent className="p-2 sm:p-3">
                          <div className="flex flex-col items-center text-center space-y-1.5">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: brand.color }}>
                              <Cylinder className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                            </div>
                            <p className="font-semibold text-[10px] sm:text-xs leading-tight line-clamp-1">{brand.name}</p>
                            <div className="text-primary font-bold text-xs sm:text-sm">{BANGLADESHI_CURRENCY_SYMBOL}{brandPrice.toLocaleString()}</div>
                            <Badge variant="secondary" className={`text-[9px] ${stockStyle.bg} ${stockStyle.text} border-0`}>
                              Stock: {stockStyle.label}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Stoves */}
                  {filteredStoves.slice(0, 2).map(stove => {
                    const stockStyle = getStockStatusStyle(stove.quantity);
                    const stovePrice = getStovePrice(stove.brand, stove.model) || stove.price;
                    
                    return (
                      <Card key={stove.id} className={`cursor-pointer transition-all hover:shadow-lg border-2 border-border ${stove.quantity === 0 ? 'opacity-50' : ''}`} onClick={() => addStoveToSale(stove)}>
                        <CardContent className="p-2 sm:p-3">
                          <div className="flex flex-col items-center text-center space-y-1.5">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                              <ChefHat className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                            </div>
                            <p className="font-semibold text-[10px] sm:text-xs leading-tight line-clamp-1">{stove.brand}</p>
                            <div className="text-primary font-bold text-xs sm:text-sm">{BANGLADESHI_CURRENCY_SYMBOL}{stovePrice.toLocaleString()}</div>
                            <Badge variant="secondary" className={`text-[9px] ${stockStyle.bg} ${stockStyle.text} border-0`}>Stock: {stockStyle.label}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {/* Regulators */}
                  {filteredRegulators.slice(0, 2).map(regulator => {
                    const stockStyle = getStockStatusStyle(regulator.quantity);
                    const regPrice = getRegulatorPrice(regulator.brand, regulator.type) || regulator.price || 0;
                    
                    return (
                      <Card key={regulator.id} className={`cursor-pointer transition-all hover:shadow-lg border-2 border-border ${regulator.quantity === 0 ? 'opacity-50' : ''}`} onClick={() => addRegulatorToSale(regulator)}>
                        <CardContent className="p-2 sm:p-3">
                          <div className="flex flex-col items-center text-center space-y-1.5">
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-violet-500/20 flex items-center justify-center">
                              <Gauge className="h-5 w-5 sm:h-6 sm:w-6 text-violet-600" />
                            </div>
                            <p className="font-semibold text-[10px] sm:text-xs leading-tight line-clamp-1">{regulator.brand}</p>
                            <div className="text-primary font-bold text-xs sm:text-sm">{BANGLADESHI_CURRENCY_SYMBOL}{regPrice.toLocaleString()}</div>
                            <Badge variant="secondary" className={`text-[9px] ${stockStyle.bg} ${stockStyle.text} border-0`}>Stock: {stockStyle.label}</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>

            {/* Configuration Panel - Shows when LPG brand is selected */}
            {showConfigPanel && sellingBrand && (
              <Card className="border-2 border-primary/30 bg-primary/5">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ArrowLeftRight className="h-4 w-4" />
                      Configuration Panel
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">
                      Selected: {lpgBrands.find(b => b.id === sellingBrand)?.name}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Weight */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Weight</Label>
                      <Select value={weight} onValueChange={setWeight}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(mouthSize === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM).map(w => (
                            <SelectItem key={w} value={w}>{w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Valve */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valve Size</Label>
                      <Select value={mouthSize} onValueChange={(v) => { setMouthSize(v); setWeight(v === "22mm" ? "12kg" : "12kg"); }}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="22mm">22mm</SelectItem>
                          <SelectItem value="20mm">20mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Exchange Empty Toggle */}
                  <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs cursor-pointer">Exchange Empty?</Label>
                      <Badge variant={exchangeEmpty ? "default" : "secondary"} className="text-[10px]">
                        {exchangeEmpty ? "YES" : "NO"}
                      </Badge>
                    </div>
                    <Switch checked={exchangeEmpty} onCheckedChange={setExchangeEmpty} />
                  </div>

                  {/* Return Brand Selection - Only if Exchange Empty is YES */}
                  {exchangeEmpty && cylinderType === 'refill' && (
                    <div className="space-y-2">
                      <Label className="text-xs">Return Cylinder Brand (from customer)</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {allBrandsForReturn.slice(0, 6).map(brand => (
                          <Card 
                            key={brand.id}
                            className={`cursor-pointer transition-all hover:shadow border ${returnBrand === brand.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                            onClick={() => setReturnBrand(brand.id)}
                          >
                            <CardContent className="p-2 flex items-center gap-2">
                              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: brand.color }}>
                                <Cylinder className="h-3 w-3 text-white" />
                              </div>
                              <span className="text-[10px] font-medium truncate">{brand.name}</span>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      
                      {/* Leak Check */}
                      {returnBrand && (
                        <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-md">
                          <Checkbox
                            id="leakCheck"
                            checked={isLeakedReturn}
                            onCheckedChange={(checked) => setIsLeakedReturn(checked as boolean)}
                          />
                          <label htmlFor="leakCheck" className="text-xs cursor-pointer">
                            Leaked/Problem Cylinder
                          </label>
                          {isLeakedReturn && (
                            <Badge variant="destructive" className="text-[10px] ml-auto">
                              → Problem Stock
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Add to Cart Button */}
                  <Button onClick={() => addLPGToSale()} className="w-full h-10" disabled={!sellingBrand}>
                    <Plus className="h-4 w-4 mr-2" />
                    ADD TO CART
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Recent Transactions - Quick Void */}
            {recentTransactions.length > 0 && (
              <Card className="border-l-4 border-l-warning">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <History className="h-4 w-4" />
                    Recent (Void within 5 min)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="space-y-1.5">
                    {recentTransactions.slice(0, 3).map(txn => (
                      <div key={txn.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                        <div>
                          <span className="font-medium">{txn.transactionNumber}</span>
                          <span className="text-muted-foreground ml-2">{BANGLADESHI_CURRENCY_SYMBOL}{txn.total}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs text-warning hover:text-warning"
                          onClick={() => {
                            setTransactionToVoid(txn);
                            setShowVoidDialog(true);
                          }}
                        >
                          <Undo2 className="h-3 w-3 mr-1" />
                          Void
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Side - Billing Panel */}
          <div className="space-y-3 lg:sticky lg:top-4">
            {/* Billing Header */}
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-base">Billing</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
                {/* Customer Selection */}
                <Select value={selectedCustomerId || ""} onValueChange={handleCustomerSelect}>
                  <SelectTrigger className="h-10">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select customer..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walkin">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        Walk-in (Cash)
                      </div>
                    </SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div className="flex items-center justify-between w-full gap-2">
                          <span>{customer.name}</span>
                          {(customer.total_due || 0) > 0 && (
                            <Badge variant="destructive" className="text-[10px]">
                              Due: {BANGLADESHI_CURRENCY_SYMBOL}{customer.total_due}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Customer Info */}
                {selectedCustomer && (
                  <div className="p-2 bg-muted/50 rounded-md space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{selectedCustomer.name}</span>
                      <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={() => { fetchCustomerHistory(selectedCustomer.id); setShowCustomerHistoryDialog(true); }}>
                        <History className="h-3 w-3 mr-1" />
                        History
                      </Button>
                    </div>
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Phone className="h-2.5 w-2.5" />
                        {selectedCustomer.phone}
                      </div>
                    )}
                    <div className="flex gap-3 pt-1">
                      <span className="text-muted-foreground">Due: <span className={`font-medium ${(selectedCustomer.total_due || 0) > 0 ? 'text-destructive' : 'text-success'}`}>{BANGLADESHI_CURRENCY_SYMBOL}{selectedCustomer.total_due || 0}</span></span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cart Summary */}
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm">Cart Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {saleItems.length === 0 ? (
                  <div className="text-center py-6">
                    <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground text-sm">Cart is empty</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-2">
                      {saleItems.map((item, index) => (
                        <div key={item.id} className="flex items-start justify-between gap-2 p-2 bg-muted/30 rounded-md">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-1">
                              <span className="text-xs text-muted-foreground">{index + 1}.</span>
                              <div>
                                <p className="font-medium text-xs line-clamp-1">{item.name}</p>
                                <p className="text-[10px] text-muted-foreground">{item.details}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" className="h-5 w-5" onClick={() => updateItemQuantity(item.id, -1)}>
                                <Minus className="h-2.5 w-2.5" />
                              </Button>
                              <span className="w-4 text-center text-xs">{item.quantity}</span>
                              <Button variant="outline" size="icon" className="h-5 w-5" onClick={() => updateItemQuantity(item.id, 1)}>
                                <Plus className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                            <span className="font-semibold text-xs min-w-[45px] text-right">
                              -{BANGLADESHI_CURRENCY_SYMBOL}{(item.price * item.quantity).toLocaleString()}
                            </span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive" onClick={() => removeItem(item.id)}>
                              <X className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Totals & Actions */}
            <Card className="bg-gradient-to-br from-card to-muted/30">
              <CardContent className="p-3 space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">{BANGLADESHI_CURRENCY_SYMBOL}{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-sm">Discount:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground text-sm">{BANGLADESHI_CURRENCY_SYMBOL}</span>
                      <Input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="w-20 text-right h-8 text-sm"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="border-t pt-2 flex justify-between items-center">
                    <span className="text-base font-bold">GRAND TOTAL:</span>
                    <span className="text-lg font-bold text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Payment Mode */}
                <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <span className="text-sm">Payment Mode</span>
                  <Badge variant="default" className="bg-green-600">CASH</Badge>
                </div>

                {/* Action Button */}
                <Button 
                  onClick={() => handleCompleteSale('completed')}
                  className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90"
                  disabled={processing || saleItems.length === 0}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Printer className="h-5 w-5 mr-2" />
                      CONFIRM SALE (PRINT)
                    </>
                  )}
                </Button>

                {/* Secondary Actions */}
                {selectedCustomerId !== "walkin" && canSaveAsDue && (
                  <Button 
                    onClick={() => handleCompleteSale('pending')}
                    variant="outline"
                    className="w-full h-9 text-sm border-warning text-warning hover:bg-warning/10"
                    disabled={processing || saleItems.length === 0}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Save as Due
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Driver Assignment */}
            {drivers.length > 0 && (
              <Card>
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4" />
                    Assign Driver
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <Select value={selectedDriverId || ""} onValueChange={setSelectedDriverId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select driver for delivery..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Shop Sale (No Driver)</SelectItem>
                      {drivers.map(driver => (
                        <SelectItem key={driver.id} value={driver.id}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${driver.status === 'active' ? 'bg-green-500' : 'bg-muted'}`} />
                            {driver.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Dialogs */}
        {/* Deposit Prompt Dialog */}
        <Dialog open={showDepositPrompt} onOpenChange={setShowDepositPrompt}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5" />
                No Return Cylinder
              </DialogTitle>
              <DialogDescription>
                Customer is not returning an empty cylinder. How should we proceed?
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Button 
                onClick={() => handleDepositPromptResponse(true)} 
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Package className="h-4 w-4 mr-2" />
                Charge Deposit (Package Price)
              </Button>
              <Button 
                onClick={() => handleDepositPromptResponse(false)} 
                variant="outline"
                className="w-full"
              >
                <Clock className="h-4 w-4 mr-2" />
                Promise Later (Track Cylinder)
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Void Confirmation Dialog */}
        <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-warning">
                <Undo2 className="h-5 w-5" />
                Void Transaction?
              </DialogTitle>
              <DialogDescription>
                This will reverse the transaction and restore inventory.
              </DialogDescription>
            </DialogHeader>
            {transactionToVoid && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p><strong>Transaction:</strong> {transactionToVoid.transactionNumber}</p>
                <p><strong>Total:</strong> {BANGLADESHI_CURRENCY_SYMBOL}{transactionToVoid.total}</p>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setShowVoidDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleVoidTransaction}>Void Transaction</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Customer Dialog */}
        <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Add New Customer
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Input
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Address"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCustomerDialog(false)}>Cancel</Button>
              <Button onClick={handleAddCustomer}>Add Customer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Customer History Dialog */}
        <Dialog open={showCustomerHistoryDialog} onOpenChange={setShowCustomerHistoryDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Purchase History
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[300px]">
              {customerHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No purchase history</p>
              ) : (
                <div className="space-y-2">
                  {customerHistory.map(h => (
                    <div key={h.id} className="p-2 bg-muted/50 rounded-md text-xs">
                      <div className="flex justify-between">
                        <span>{h.date}</span>
                        <Badge variant={h.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">
                          {h.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1">{h.items}</p>
                      <p className="font-medium mt-1">{BANGLADESHI_CURRENCY_SYMBOL}{h.total}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Print Type Dialog */}
        <Dialog open={showPrintTypeDialog} onOpenChange={setShowPrintTypeDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Print Receipt
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  setPrintType('bill');
                  setShowPrintTypeDialog(false);
                  setShowInvoiceDialog(true);
                }}
              >
                <FileText className="h-6 w-6" />
                <span className="text-xs">Customer Bill</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2"
                onClick={() => {
                  setPrintType('gatepass');
                  setShowPrintTypeDialog(false);
                  setShowInvoiceDialog(true);
                }}
              >
                <Truck className="h-6 w-6" />
                <span className="text-xs">Gate Pass</span>
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setShowPrintTypeDialog(false)}>
              Skip Printing
            </Button>
          </DialogContent>
        </Dialog>

        {/* Invoice Dialog */}
        <InvoiceDialog
          open={showInvoiceDialog}
          onOpenChange={setShowInvoiceDialog}
          invoiceData={lastTransaction}
        />

        {/* Barcode Scanner */}
        <BarcodeScanner
          open={showBarcodeScanner}
          onOpenChange={setShowBarcodeScanner}
          onProductFound={handleBarcodeProductFound}
        />
      </div>
    </TooltipProvider>
  );
};
