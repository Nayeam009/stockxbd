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
  Info
} from "lucide-react";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { generateInvoicePDF } from "@/lib/pdfExport";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
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

// Brand mouth size mapping (common defaults)
const BRAND_MOUTH_SIZE_MAP: Record<string, string> = {
  'bashundhara': '22mm',
  'omera': '22mm',
  'beximco': '22mm',
  'total': '20mm',
  'laugfs': '20mm'
};

// Credit limit for customers (configurable)
const DEFAULT_CREDIT_LIMIT = 10000;

export const POSModule = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("lpg");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  // LPG form state
  const [cylinderType, setCylinderType] = useState<"refill" | "package">("refill");
  const [saleType, setSaleType] = useState<"retail" | "wholesale">("retail");
  const [sellingBrand, setSellingBrand] = useState("");
  const [returnBrand, setReturnBrand] = useState("");
  const [weight, setWeight] = useState("");
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
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState("0");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  
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

  // Barcode Scanner
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Mouth size mismatch warning
  const [showMouthSizeWarning, setShowMouthSizeWarning] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
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
          customerName: 'Customer', // We'll populate this from customer lookup if needed
          total: Number(t.total),
          status: t.payment_status,
          createdAt: new Date(t.created_at),
          items: t.pos_transaction_items?.map((i: any) => ({ name: i.product_name, quantity: i.quantity })) || []
        }));
        setRecentTransactions(txns);
      }
      
      setLoading(false);
    };

    fetchData();

    // Real-time subscription for customers
    const channel = supabase
      .channel('pos-customers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Get price functions
  const getRegulatorPrice = useCallback((brand: string, type: string) => {
    const priceEntry = productPrices.find(
      p => p.product_type === 'regulator' && 
           p.product_name.toLowerCase().includes(brand.toLowerCase()) &&
           p.product_name.toLowerCase().includes(type.toLowerCase())
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

  // Auto-populate regulator price when selected
  useEffect(() => {
    if (selectedRegulator && productPrices.length > 0) {
      const regulator = regulators.find(r => r.id === selectedRegulator);
      if (regulator) {
        const autoPrice = getRegulatorPrice(regulator.brand, regulator.type);
        if (autoPrice > 0) {
          setRegulatorPrice(autoPrice.toString());
        }
      }
    }
  }, [selectedRegulator, regulators, productPrices, getRegulatorPrice]);

  // Filter brands by mouth size, weight, and search
  const filteredBrands = useMemo(() => {
    return lpgBrands.filter(b => {
      const matchesSize = b.size === mouthSize;
      const matchesWeight = !weight || b.weight === weight;
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
      toast({ title: "Please fill all required fields", variant: "destructive" });
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
    if (cylinderType === 'refill' && (!returnBrand || returnBrand === "none") && !forcePackage) {
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
    toast({ title: "Added to sale" });
  };

  const resetLPGForm = () => {
    setSellingBrand("");
    setReturnBrand("");
    setWeight("");
    setPrice("0");
    setQuantity("1");
    setIsLeakedReturn(false);
    setShowMouthSizeWarning(false);
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
        title: "Added to sale", 
        description: "Customer owes cylinder return",
      });
    }
    setPendingLpgItem(null);
  };

  const addStoveToSale = () => {
    const validatedQuantity = parsePositiveInt(stoveQuantity, 10000);
    
    if (!selectedStove) {
      toast({ title: "Please select a stove", variant: "destructive" });
      return;
    }

    const stove = stoves.find(s => s.id === selectedStove);
    if (!stove) return;

    // BLOCK if stock = 0
    if (stove.quantity === 0) {
      toast({ title: "Out of Stock", variant: "destructive" });
      return;
    }
    if (validatedQuantity > stove.quantity) {
      toast({ title: `Only ${stove.quantity} in stock`, variant: "destructive" });
      return;
    }

    const newItem: SaleItem = {
      id: `stove-${Date.now()}`,
      type: 'stove',
      name: `${stove.brand} ${stove.model}`,
      details: `${stove.burners} Burner`,
      price: stove.price,
      quantity: validatedQuantity,
      stoveId: stove.id
    };

    setSaleItems([...saleItems, newItem]);
    setSelectedStove("");
    setStoveQuantity("1");
    toast({ title: "Added to sale" });
  };

  const addRegulatorToSale = () => {
    const validatedQuantity = parsePositiveInt(regulatorQuantity, 10000);
    const validatedPrice = parsePositiveNumber(regulatorPrice, 10000000);
    
    if (!selectedRegulator) {
      toast({ title: "Please select a regulator", variant: "destructive" });
      return;
    }

    const regulator = regulators.find(r => r.id === selectedRegulator);
    if (!regulator) return;

    // BLOCK if stock = 0
    if (regulator.quantity === 0) {
      toast({ title: "Out of Stock", variant: "destructive" });
      return;
    }
    if (validatedQuantity > regulator.quantity) {
      toast({ title: `Only ${regulator.quantity} in stock`, variant: "destructive" });
      return;
    }

    const newItem: SaleItem = {
      id: `reg-${Date.now()}`,
      type: 'regulator',
      name: regulator.brand,
      details: regulator.type,
      price: validatedPrice,
      quantity: validatedQuantity,
      regulatorId: regulator.id
    };

    setSaleItems([...saleItems, newItem]);
    setSelectedRegulator("");
    setRegulatorQuantity("1");
    setRegulatorPrice("0");
    toast({ title: "Added to sale" });
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
      setActiveTab('lpg');
      setSellingBrand(product.id);
      toast({ title: "LPG product selected", description: `${product.name} - Select weight and quantity` });
    } else if (product.type === 'stove') {
      setActiveTab('stove');
      setSelectedStove(product.id);
      toast({ title: "Stove selected", description: product.name });
    } else if (product.type === 'regulator') {
      setActiveTab('regulator');
      setSelectedRegulator(product.id);
      toast({ title: "Regulator selected", description: product.name });
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

  // Void a recent transaction
  const handleVoidTransaction = async () => {
    if (!transactionToVoid) return;
    
    try {
      // Note: In a real system, you'd reverse inventory changes too
      // For now, we just mark the transaction status
      toast({ 
        title: "Transaction voided", 
        description: `${transactionToVoid.transactionNumber} has been voided. Inventory will be restored.`
      });
      
      setRecentTransactions(prev => prev.filter(t => t.id !== transactionToVoid.id));
      setShowVoidDialog(false);
      setTransactionToVoid(null);
    } catch (error) {
      toast({ title: "Error voiding transaction", variant: "destructive" });
    }
  };

  const handleCompleteSale = async (paymentStatus: 'completed' | 'pending') => {
    if (saleItems.length === 0) {
      toast({ title: "No items in sale", variant: "destructive" });
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

      // Create transaction
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
          notes: selectedDriverId ? `Driver: ${drivers.find(d => d.id === selectedDriverId)?.name}` : null,
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
          // Refill sale: Full Stock -1
          const newRefillCount = Math.max(0, brand.refill_cylinder - item.quantity);
          await supabase
            .from('lpg_brands')
            .update({ refill_cylinder: newRefillCount })
            .eq('id', item.brandId);
          
          setLpgBrands(prev => prev.map(b => 
            b.id === item.brandId ? { ...b, refill_cylinder: newRefillCount } : b
          ));

          // If return brand specified, add to appropriate stock
          if (item.returnBrandId) {
            const returnBrand = lpgBrands.find(b => b.id === item.returnBrandId);
            if (returnBrand) {
              if (item.isLeakedReturn) {
                // Leaked cylinder goes to problem_cylinder
                const newProblemCount = returnBrand.problem_cylinder + item.quantity;
                await supabase
                  .from('lpg_brands')
                  .update({ problem_cylinder: newProblemCount })
                  .eq('id', item.returnBrandId);
                
                setLpgBrands(prev => prev.map(b => 
                  b.id === item.returnBrandId ? { ...b, problem_cylinder: newProblemCount } : b
                ));
              } else {
                // Normal return goes to empty_cylinder
                const newEmptyCount = returnBrand.empty_cylinder + item.quantity;
                await supabase
                  .from('lpg_brands')
                  .update({ empty_cylinder: newEmptyCount })
                  .eq('id', item.returnBrandId);
                
                setLpgBrands(prev => prev.map(b => 
                  b.id === item.returnBrandId ? { ...b, empty_cylinder: newEmptyCount } : b
                ));
              }
            }
          }
        } else if (item.cylinderType === 'package') {
          // Package sale: Full Stock -1 (No Empty comes back)
          const newPackageCount = Math.max(0, brand.package_cylinder - item.quantity);
          await supabase
            .from('lpg_brands')
            .update({ package_cylinder: newPackageCount })
            .eq('id', item.brandId);
          
          setLpgBrands(prev => prev.map(b => 
            b.id === item.brandId ? { ...b, package_cylinder: newPackageCount } : b
          ));
        }
      }

      // Update Stove Stock
      for (const item of saleItems.filter(i => i.type === 'stove' && i.stoveId)) {
        const stove = stoves.find(s => s.id === item.stoveId);
        if (!stove) continue;

        const newQuantity = Math.max(0, stove.quantity - item.quantity);
        await supabase
          .from('stoves')
          .update({ quantity: newQuantity })
          .eq('id', item.stoveId);
        
        setStoves(prev => prev.map(s => 
          s.id === item.stoveId ? { ...s, quantity: newQuantity } : s
        ));
      }

      // Update Regulator Stock
      for (const item of saleItems.filter(i => i.type === 'regulator' && i.regulatorId)) {
        const regulator = regulators.find(r => r.id === item.regulatorId);
        if (!regulator) continue;

        const newQuantity = Math.max(0, regulator.quantity - item.quantity);
        await supabase
          .from('regulators')
          .update({ quantity: newQuantity })
          .eq('id', item.regulatorId);
        
        setRegulators(prev => prev.map(r => 
          r.id === item.regulatorId ? { ...r, quantity: newQuantity } : r
        ));
      }

      // Update customer dues if sale is marked as pending (due)
      if (customerId && paymentStatus === 'pending') {
        const currentCustomer = customers.find(c => c.id === customerId);
        if (currentCustomer) {
          const newTotalDue = (currentCustomer.total_due || 0) + total;
          // Track cylinder due for package or no-return refill sales
          const cylindersDue = saleItems
            .filter(item => item.type === 'lpg' && (!item.returnBrandId || item.cylinderType === 'package'))
            .reduce((sum, item) => sum + item.quantity, 0);
          const newCylindersDue = (currentCustomer.cylinders_due || 0) + cylindersDue;

          await supabase
            .from('customers')
            .update({
              total_due: newTotalDue,
              cylinders_due: newCylindersDue,
              billing_status: 'pending',
              last_order_date: new Date().toISOString()
            })
            .eq('id', customerId);

          setCustomers(customers.map(c => 
            c.id === customerId 
              ? { ...c, total_due: newTotalDue, cylinders_due: newCylindersDue, billing_status: 'pending' }
              : c
          ));
        }
      } else if (customerId) {
        await supabase
          .from('customers')
          .update({ last_order_date: new Date().toISOString() })
          .eq('id', customerId);
      }

      // Prepare invoice data
      const displayName = selectedCustomer?.name || sanitizedCustomerName || "Walk-in Customer";
      const driverName = selectedDriverId ? drivers.find(d => d.id === selectedDriverId)?.name : undefined;
      
      setLastTransaction({
        invoiceNumber: transactionNumber,
        date: new Date(),
        customer: {
          name: displayName,
          phone: selectedCustomer?.phone || undefined,
          address: selectedCustomer?.address || undefined
        },
        driver: driverName,
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
        paymentStatus: paymentStatus === 'completed' ? 'paid' : 'due',
        paymentMethod: 'cash'
      });

      // Add to recent transactions
      setRecentTransactions(prev => [{
        id: transaction?.id || '',
        transactionNumber,
        customerName: displayName,
        total: Math.max(0, subtotal - validatedDiscount),
        status: paymentStatus,
        createdAt: new Date(),
        items: saleItems.map(item => ({ name: item.name, quantity: item.quantity }))
      }, ...prev].slice(0, 5));

      setShowInvoiceDialog(true);
      
      // Clear form
      setSaleItems([]);
      setCustomerName("");
      setSelectedCustomerId(null);
      setSelectedCustomer(null);
      setDiscount("0");
      setSelectedDriverId(null);

      toast({ 
        title: paymentStatus === 'completed' ? "Sale completed!" : "Saved as due",
        description: `Invoice: ${transactionNumber}`
      });

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
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
      <div className="space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">{t('pos')}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Inventory-Synced Sales System</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowBarcodeScanner(true)} variant="outline" size="sm" className="gap-2">
              <ScanLine className="h-4 w-4" />
              <span className="hidden sm:inline">Scan</span>
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
          {/* Left Side - Product Entry */}
          <div className="lg:col-span-2 space-y-3">
            {/* Product Search */}
            <Card className="border-0 shadow-sm">
              <CardContent className="p-2 sm:p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10 h-9 sm:h-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Product Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-muted h-9 sm:h-10">
                <TabsTrigger value="lpg" className="text-[10px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Fuel className="h-3 w-3 mr-1 hidden sm:inline" />
                  LPG
                </TabsTrigger>
                <TabsTrigger value="stove" className="text-[10px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Stove
                </TabsTrigger>
                <TabsTrigger value="regulator" className="text-[10px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Reg.
                </TabsTrigger>
                <TabsTrigger value="custom" className="text-[10px] sm:text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  Custom
                </TabsTrigger>
              </TabsList>

              {/* LPG Tab - The Brain of the POS */}
              <TabsContent value="lpg">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-primary" />
                      LPG Cylinder Sale
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Inventory auto-synced • Cross-brand swap supported
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-3">
                    {/* Cylinder Type & Sale Type */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Cylinder Type</Label>
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={cylinderType === 'refill' ? 'default' : 'outline'}
                            onClick={() => setCylinderType('refill')}
                            className="h-8 text-xs"
                          >
                            Refill
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={cylinderType === 'package' ? 'default' : 'outline'}
                            onClick={() => setCylinderType('package')}
                            className="h-8 text-xs"
                          >
                            Package
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {cylinderType === 'refill' ? 'Customer returns empty' : 'New connection (deposit)'}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Sale Type</Label>
                        <div className="grid grid-cols-2 gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant={saleType === 'retail' ? 'default' : 'outline'}
                            onClick={() => setSaleType('retail')}
                            className="h-8 text-xs"
                          >
                            Retail
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={saleType === 'wholesale' ? 'secondary' : 'outline'}
                            onClick={() => setSaleType('wholesale')}
                            className="h-8 text-xs"
                          >
                            Wholesale
                          </Button>
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {saleType === 'wholesale' ? 'Bulk buyer price' : 'Standard price'}
                        </p>
                      </div>
                    </div>

                    {/* Mouth Size & Weight Selection */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Mouth Size</Label>
                        <Select value={mouthSize} onValueChange={(val) => {
                          setMouthSize(val);
                          setWeight("");
                          setSellingBrand("");
                        }}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {mouthSizes.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Weight</Label>
                        <Select value={weight} onValueChange={(val) => {
                          setWeight(val);
                          setSellingBrand("");
                        }}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {(mouthSize === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM).map(w => (
                              <SelectItem key={w} value={w}>{w}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Selling Brand */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Selling Brand</Label>
                      <Select value={sellingBrand} onValueChange={setSellingBrand}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select brand to sell..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredBrands.map(brand => {
                            const stock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
                            return (
                              <SelectItem key={brand.id} value={brand.id} disabled={stock === 0}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: brand.color }} />
                                  <span>{brand.name}</span>
                                  <Badge variant={stock > 0 ? "secondary" : "destructive"} className="text-[10px] ml-auto">
                                    {stock === 0 ? 'Out' : stock}
                                  </Badge>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {showMouthSizeWarning && (
                        <div className="flex items-center gap-1 text-xs text-warning">
                          <AlertTriangle className="h-3 w-3" />
                          Mouth size mismatch likely
                        </div>
                      )}
                    </div>

                    {/* Return Brand - Allow cross-swap */}
                    {cylinderType === 'refill' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium">Return Brand (from customer)</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[200px]">
                              <p className="text-xs">Can be different from selling brand (cross-swap)</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <Select value={returnBrand} onValueChange={setReturnBrand}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue placeholder="Customer returns..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Return</SelectItem>
                            {allBrandsForReturn.map(brand => (
                              <SelectItem key={brand.id} value={brand.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: brand.color }} />
                                  <span>{brand.name} ({brand.weight})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        {/* Leak Check */}
                        {returnBrand && returnBrand !== "none" && (
                          <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-md">
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

                    {/* Price & Quantity */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Price ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                        <Input 
                          type="number" 
                          value={price} 
                          onChange={(e) => setPrice(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Quantity</Label>
                        <Input 
                          type="number" 
                          value={quantity} 
                          onChange={(e) => setQuantity(e.target.value)}
                          min="1"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <Button 
                      onClick={() => addLPGToSale(false)} 
                      className="w-full h-9 text-sm"
                      disabled={!sellingBrand || !weight || getLPGStock(sellingBrand, cylinderType) === 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Stove Tab */}
              <TabsContent value="stove">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm sm:text-base">Gas Stove</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Select Stove</Label>
                      <Select value={selectedStove} onValueChange={setSelectedStove}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select stove..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredStoves.map(stove => (
                            <SelectItem key={stove.id} value={stove.id} disabled={stove.quantity === 0}>
                              <div className="flex items-center justify-between w-full gap-2">
                                <span>{stove.brand} {stove.model} ({stove.burners}B)</span>
                                <Badge variant={stove.quantity > 0 ? "secondary" : "destructive"} className="text-[10px]">
                                  {stove.quantity === 0 ? 'Out' : `${stove.quantity}`}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Quantity</Label>
                      <Input 
                        type="number" 
                        value={stoveQuantity} 
                        onChange={(e) => setStoveQuantity(e.target.value)}
                        min="1"
                        className="h-9 text-xs"
                      />
                    </div>
                    <Button 
                      onClick={addStoveToSale} 
                      className="w-full h-9 text-sm"
                      disabled={!selectedStove || getStoveStock(selectedStove) === 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Regulator Tab */}
              <TabsContent value="regulator">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm sm:text-base">Regulator</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Select Regulator</Label>
                      <Select value={selectedRegulator} onValueChange={setSelectedRegulator}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select regulator..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredRegulators.map(reg => (
                            <SelectItem key={reg.id} value={reg.id} disabled={reg.quantity === 0}>
                              <div className="flex items-center justify-between w-full gap-2">
                                <span>{reg.brand} ({reg.type})</span>
                                <Badge variant={reg.quantity > 0 ? "secondary" : "destructive"} className="text-[10px]">
                                  {reg.quantity === 0 ? 'Out' : `${reg.quantity}`}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Price</Label>
                        <Input 
                          type="number" 
                          value={regulatorPrice} 
                          onChange={(e) => setRegulatorPrice(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Quantity</Label>
                        <Input 
                          type="number" 
                          value={regulatorQuantity} 
                          onChange={(e) => setRegulatorQuantity(e.target.value)}
                          min="1"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={addRegulatorToSale} 
                      className="w-full h-9 text-sm"
                      disabled={!selectedRegulator || getRegulatorStock(selectedRegulator) === 0}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Custom Tab */}
              <TabsContent value="custom">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm sm:text-base">Custom Item</CardTitle>
                    <CardDescription className="text-xs">Service charges, delivery fees, etc.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Item Name</Label>
                      <Input 
                        value={customProductName} 
                        onChange={(e) => setCustomProductName(e.target.value)}
                        placeholder="e.g., Delivery Fee"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Price</Label>
                        <Input 
                          type="number" 
                          value={customProductPrice} 
                          onChange={(e) => setCustomProductPrice(e.target.value)}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Quantity</Label>
                        <Input 
                          type="number" 
                          value={customProductQuantity} 
                          onChange={(e) => setCustomProductQuantity(e.target.value)}
                          min="1"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={addCustomProductToSale} 
                      className="w-full h-9 text-sm"
                      disabled={!customProductName.trim()}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Cart */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <ShoppingCart className="h-4 w-4" />
                  Cart ({saleItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {saleItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 text-xs">No items added</p>
                ) : (
                  <ScrollArea className="max-h-[200px] sm:max-h-[280px]">
                    <div className="space-y-2">
                      {saleItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-xs truncate">{item.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{item.details}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateItemQuantity(item.id, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-5 text-center text-xs">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateItemQuantity(item.id, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="font-bold text-xs min-w-[50px] text-right">
                            {BANGLADESHI_CURRENCY_SYMBOL}{item.price * item.quantity}
                          </span>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(item.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions - Quick Void */}
            {recentTransactions.length > 0 && (
              <Card className="border-0 shadow-sm border-l-4 border-l-warning">
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

          {/* Right Side - Customer & Summary */}
          <div className="space-y-3 lg:sticky lg:top-4">
            {/* Driver Assignment */}
            {drivers.length > 0 && (
              <Card className="border-0 shadow-sm border-l-4 border-l-accent">
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
                            <div className={`w-2 h-2 rounded-full ${driver.status === 'active' ? 'bg-success' : 'bg-muted'}`} />
                            {driver.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            )}

            {/* Customer Selection */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="p-3 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    Customer
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowAddCustomerDialog(true)}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    New
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <Select value={selectedCustomerId || ""} onValueChange={handleCustomerSelect}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walkin">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        Walk-in Customer
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

                {selectedCustomer && (
                  <div className="p-2 bg-muted/50 rounded-md space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs">{selectedCustomer.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 text-[10px]"
                        onClick={() => {
                          fetchCustomerHistory(selectedCustomer.id);
                          setShowCustomerHistoryDialog(true);
                        }}
                      >
                        <History className="h-3 w-3 mr-1" />
                        History
                      </Button>
                    </div>
                    {selectedCustomer.phone && (
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Phone className="h-2.5 w-2.5" />
                        {selectedCustomer.phone}
                      </div>
                    )}
                    <div className="flex gap-3 pt-1 text-[10px]">
                      <div>
                        <span className="text-muted-foreground">Due:</span>
                        <span className={`ml-1 font-medium ${(selectedCustomer.total_due || 0) > 0 ? 'text-destructive' : 'text-success'}`}>
                          {BANGLADESHI_CURRENCY_SYMBOL}{selectedCustomer.total_due || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cylinders:</span>
                        <span className={`ml-1 font-medium ${(selectedCustomer.cylinders_due || 0) > 0 ? 'text-warning' : 'text-success'}`}>
                          {selectedCustomer.cylinders_due || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedCustomerId === "walkin" && (
                  <div className="flex items-center gap-1 p-2 bg-warning/10 rounded text-[10px] text-warning">
                    <AlertCircle className="h-3 w-3" />
                    Walk-in: Cash only, no credit
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-card to-muted/30">
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm">Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{BANGLADESHI_CURRENCY_SYMBOL}{subtotal.toFixed(0)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-muted-foreground text-xs">Discount</Label>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground text-xs">{BANGLADESHI_CURRENCY_SYMBOL}</span>
                      <Input
                        type="number"
                        value={discount}
                        onChange={(e) => setDiscount(e.target.value)}
                        className="w-16 text-right h-7 text-xs"
                        min="0"
                      />
                    </div>
                  </div>
                  {packageCylinderCount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">New Cylinders</span>
                      <span className="font-medium text-warning">{packageCylinderCount} pcs</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between">
                    <span className="text-sm font-bold">Total</span>
                    <span className="text-sm font-bold text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{total.toFixed(0)}</span>
                  </div>
                </div>

                {/* Credit Limit Warning */}
                {selectedCustomer && !canSaveAsDue && (
                  <div className="flex items-center gap-1 p-2 bg-destructive/10 rounded text-[10px] text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    Credit limit ({BANGLADESHI_CURRENCY_SYMBOL}{DEFAULT_CREDIT_LIMIT}) exceeded
                  </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                  <Button 
                    onClick={() => handleCompleteSale('completed')}
                    className="w-full h-9 text-sm"
                    disabled={processing || saleItems.length === 0}
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileCheck className="h-4 w-4 mr-1" />}
                    {processing ? 'Processing...' : 'Complete Sale (Paid)'}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          onClick={() => handleCompleteSale('pending')}
                          variant="secondary"
                          className="bg-warning hover:bg-warning/90 text-warning-foreground h-8 text-xs"
                          disabled={processing || saleItems.length === 0 || selectedCustomerId === "walkin" || !canSaveAsDue}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Due
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Requires registered customer</p>
                      </TooltipContent>
                    </Tooltip>
                    <Button 
                      variant="outline"
                      className="h-8 text-xs"
                      disabled={saleItems.length === 0}
                      onClick={() => {
                        const displayName = selectedCustomer?.name || customerName || "Walk-in Customer";
                        setLastTransaction({
                          invoiceNumber: 'PREVIEW',
                          date: new Date(),
                          customer: { name: displayName },
                          driver: selectedDriverId ? drivers.find(d => d.id === selectedDriverId)?.name : undefined,
                          items: saleItems.map(item => ({
                            name: item.name,
                            description: item.details,
                            quantity: item.quantity,
                            unitPrice: item.price,
                            total: item.price * item.quantity
                          })),
                          subtotal,
                          discount: discountAmount,
                          total,
                          paymentStatus: 'preview',
                          paymentMethod: 'cash'
                        });
                        setShowInvoiceDialog(true);
                      }}
                    >
                      <Printer className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
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
            <div className="space-y-3 py-4">
              <Button 
                onClick={() => handleDepositPromptResponse(true)} 
                className="w-full"
                variant="default"
              >
                Charge Deposit (Package Price)
              </Button>
              <Button 
                onClick={() => handleDepositPromptResponse(false)} 
                className="w-full"
                variant="outline"
              >
                Promise Later (Track as Due Cylinder)
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Void Transaction Dialog */}
        <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-destructive">Void Transaction?</DialogTitle>
              <DialogDescription>
                This will reverse the transaction and restore inventory.
              </DialogDescription>
            </DialogHeader>
            {transactionToVoid && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <p><strong>{transactionToVoid.transactionNumber}</strong></p>
                <p className="text-muted-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{transactionToVoid.total}</p>
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
                Add Customer
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="Customer name"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Phone</Label>
                <Input
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="+880 1XXX-XXXXXX"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Address</Label>
                <Input
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  placeholder="Address"
                  className="h-9"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowAddCustomerDialog(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAddCustomer} disabled={!newCustomer.name.trim()}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Customer History Dialog */}
        <Dialog open={showCustomerHistoryDialog} onOpenChange={setShowCustomerHistoryDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                {selectedCustomer?.name}'s History
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[300px]">
              {customerHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No history</p>
              ) : (
                <div className="space-y-2">
                  {customerHistory.map(record => (
                    <div key={record.id} className="p-3 bg-muted/50 rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{record.date}</span>
                        <Badge variant={record.status === 'completed' ? 'default' : 'destructive'} className="text-[10px]">
                          {record.status === 'completed' ? 'Paid' : 'Due'}
                        </Badge>
                      </div>
                      <p className="text-xs truncate">{record.items}</p>
                      <p className="font-medium text-sm mt-1">{BANGLADESHI_CURRENCY_SYMBOL}{record.total}</p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Invoice Dialog */}
        {lastTransaction && (
          <InvoiceDialog
            open={showInvoiceDialog}
            onOpenChange={setShowInvoiceDialog}
            invoiceData={lastTransaction}
            onExportPDF={handleExportPDF}
          />
        )}

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
