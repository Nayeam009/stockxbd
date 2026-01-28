import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
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
  RotateCcw,
  UserCircle,
  Sparkles,
  Users,
  AlertTriangle
} from "lucide-react";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { getBrandMouthSizeMap, getLpgColorByValveSize } from "@/lib/brandConstants";
import { supabase } from "@/integrations/supabase/client";
import { parsePositiveNumber, sanitizeString } from "@/lib/validationSchemas";
import { formatBDPhone } from "@/lib/phoneValidation";
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { logger } from "@/lib/logger";
import { useNetwork } from "@/contexts/NetworkContext";

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

// RecentTransaction interface removed - void system disabled

// Weight options
const WEIGHT_OPTIONS_22MM = ["5.5kg", "12kg", "12.5kg", "25kg", "35kg", "45kg"];
const WEIGHT_OPTIONS_20MM = ["5kg", "10kg", "12kg", "15kg", "21kg", "35kg"];
const DEFAULT_CREDIT_LIMIT = 10000;

// ============= POS MODULE PROPS =============
interface POSModuleProps {
  userRole?: 'owner' | 'manager';
  userName?: string;
}

// Role display config
const ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  owner: { label: 'Owner', color: 'text-emerald-700', bgColor: 'bg-emerald-100 border-emerald-300' },
  manager: { label: 'Manager', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-300' },
};

// ============= MAIN POS MODULE =============
export const POSModule = ({ userRole = 'owner', userName = 'User' }: POSModuleProps) => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const { isOnline } = useNetwork();

  // ===== DATA STATE =====
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);

  // ===== ACTIVE TABLE STATE (Sale or Return) =====
  const [activeTable, setActiveTable] = useState<'sale' | 'return'>('sale');

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

  // ===== PHONE-FIRST CUSTOMER STATE =====
  const [phoneQuery, setPhoneQuery] = useState("");
  const [customerStatus, setCustomerStatus] = useState<'idle' | 'searching' | 'found' | 'new'>('idle');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");

  // ===== LEGACY CUSTOMER STATE (kept for compatibility) =====
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [discount, setDiscount] = useState("0");
  const [showAddCustomerDialog, setShowAddCustomerDialog] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerListDialog, setShowCustomerListDialog] = useState(false);

  // ===== PAYMENT MODAL STATE =====
  const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");

  // ===== UI STATE =====
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [showPrintTypeDialog, setShowPrintTypeDialog] = useState(false);
  // Recent transactions removed - void system disabled

  // ============= PHONE-FIRST CUSTOMER LOOKUP =============
  // Normalize phone for lookup - handles +880, 880, and 01 formats
  const normalizePhoneForLookup = useCallback((phone: string): string[] => {
    const cleaned = phone.replace(/[\s\-().]/g, '');
    const normalized = formatBDPhone(cleaned);

    // Return multiple formats to search for (handles both old and new data)
    const formats: string[] = [];
    if (normalized.startsWith('01') && normalized.length === 11) {
      formats.push(normalized); // 01XXXXXXXXX
      formats.push(`+880${normalized.slice(1)}`); // +8801XXXXXXXXX
      formats.push(`880${normalized.slice(1)}`); // 8801XXXXXXXXX
    }
    return formats.length > 0 ? formats : [cleaned];
  }, []);

  useEffect(() => {
    // Only search when we have exactly 11 digits (complete BD phone)
    if (phoneQuery.length >= 11) {
      setCustomerStatus('searching');
      const timer = setTimeout(async () => {
        try {
          // Get all possible phone formats to search
          const phoneFormats = normalizePhoneForLookup(phoneQuery);

          // Search for customer with any of the phone formats
          // Use 'or' filter to match any format, get most recent if duplicates exist
          const { data, error } = await supabase
            .from('customers')
            .select('*')
            .or(phoneFormats.map(p => `phone.eq.${p}`).join(','))
            .order('created_at', { ascending: false })
            .limit(1);

          if (error) {
            console.error('Customer lookup error:', error);
            setCustomerStatus('new');
            return;
          }

          const customer = data && data.length > 0 ? data[0] : null;

          if (customer) {
            // Old customer found - auto-fill all fields
            setCustomerStatus('found');
            setFoundCustomer(customer);
            setSelectedCustomerId(customer.id);
            setSelectedCustomer(customer);
            setCustomerName(customer.name);
            setCustomerPhone(customer.phone || "");
            setCustomerAddress(customer.address || "");
            // Auto-fill editable fields too
            setNewCustomerName(customer.name);
            setNewCustomerAddress(customer.address || "");

            logger.info('Old customer found', {
              component: 'POS',
              customerId: customer.id,
              customerName: customer.name,
              phone: customer.phone
            });
          } else {
            // New customer - phone not in system
            setCustomerStatus('new');
            setFoundCustomer(null);
            setSelectedCustomerId(null);
            setSelectedCustomer(null);
            setCustomerPhone(phoneQuery);
            setNewCustomerName("");
            setNewCustomerAddress("");
          }
        } catch (err) {
          console.error('Customer lookup failed:', err);
          setCustomerStatus('new');
        }
      }, 300);
      return () => clearTimeout(timer);
    } else if (phoneQuery.length > 0 && phoneQuery.length < 11) {
      // Partial phone entry - show idle state
      setCustomerStatus('idle');
      setFoundCustomer(null);
    } else {
      // Empty phone - reset to idle
      setCustomerStatus('idle');
      setFoundCustomer(null);
      setNewCustomerName("");
      setNewCustomerAddress("");
    }
  }, [phoneQuery, normalizePhoneForLookup]);

  // ============= HANDLE CUSTOM WEIGHT SELECTION =============
  useEffect(() => {
    if (weight === 'custom') {
      setShowCustomWeightInput(true);
      // Reset to first weight option while dialog shows
      setWeight(mouthSize === '22mm' ? WEIGHT_OPTIONS_22MM[0] : WEIGHT_OPTIONS_20MM[0]);
    }
  }, [weight, mouthSize]);

  // ============= DATA FETCHING =============
  const hasFetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
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
    } catch (error) {
      logger.error('Error fetching POS data', error, { component: 'POS' });
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const initData = async () => {
      setLoading(true);
      await fetchData();
      setLoading(false);
    };
    initData();
  }, [fetchData]);

  // Real-time subscriptions - debounced to prevent excessive refetches
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Skip subscriptions when offline to prevent connection errors
    if (!isOnline) return;

    const debouncedFetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchData(), 1000);
    };

    const channels = [
      supabase.channel('pos-lpg-v2').on('postgres_changes', { event: '*', schema: 'public', table: 'lpg_brands' }, debouncedFetch).subscribe(),
      supabase.channel('pos-stoves-v2').on('postgres_changes', { event: '*', schema: 'public', table: 'stoves' }, debouncedFetch).subscribe(),
      supabase.channel('pos-regulators-v2').on('postgres_changes', { event: '*', schema: 'public', table: 'regulators' }, debouncedFetch).subscribe(),
      supabase.channel('pos-customers-v2').on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, debouncedFetch).subscribe(),
      supabase.channel('pos-prices-v2').on('postgres_changes', { event: '*', schema: 'public', table: 'product_prices' }, debouncedFetch).subscribe()
    ];

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, [isOnline, fetchData]);

  // ============= PRICE HELPERS =============
  // Enhanced price lookup based on cylinder type (refill/package) and sale type (retail/wholesale)
  const getLPGPrice = useCallback((brandId: string, weightVal: string, cylType: 'refill' | 'package', saleTp: 'retail' | 'wholesale') => {
    // Find pricing entry matching brand + variant (Refill or Package)
    const variant = cylType === 'refill' ? 'Refill' : 'Package';

    // First try to find exact match with brand_id and variant
    let priceEntry = productPrices.find(
      p => p.product_type === 'lpg' &&
        p.brand_id === brandId &&
        p.variant === variant
    );

    // Fallback: find by brand_id only (legacy records)
    if (!priceEntry) {
      priceEntry = productPrices.find(
        p => p.product_type === 'lpg' && p.brand_id === brandId && p.size?.includes(weightVal)
      );
    }

    if (!priceEntry) return 0;

    // For Package cylinder: use retail_price or distributor_price based on sale type
    // For Refill cylinder: use retail_price or distributor_price based on sale type
    if (saleTp === 'wholesale') {
      return priceEntry.distributor_price || 0;
    }
    return priceEntry.retail_price || 0;
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

  // ============= STOCK PREVIEW CALCULATIONS =============
  // Calculate pending stock changes for real-time visual feedback
  const getPendingStock = useCallback((brandId: string, cylType: 'refill' | 'package') => {
    return saleItems
      .filter(i => i.type === 'lpg' && i.brandId === brandId && i.cylinderType === cylType)
      .reduce((sum, i) => sum + i.quantity, 0);
  }, [saleItems]);

  // Calculate pending return cylinders for a brand
  const getPendingReturns = useCallback((brandId: string) => {
    return returnItems
      .filter(r => r.brandId === brandId && !r.isLeaked)
      .reduce((sum, r) => sum + r.quantity, 0);
  }, [returnItems]);

  // Calculate pending problem cylinders for a brand
  const getPendingProblem = useCallback((brandId: string) => {
    return returnItems
      .filter(r => r.brandId === brandId && r.isLeaked)
      .reduce((sum, r) => sum + r.quantity, 0);
  }, [returnItems]);

  const subtotal = saleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = parsePositiveNumber(discount, 10000000);
  const total = Math.max(0, subtotal - discountAmount);

  // Payment status calculation
  const paidAmount = parseFloat(paymentAmount) || 0;
  const paymentStatus = useMemo(() => {
    if (paidAmount >= total) return 'paid';
    if (paidAmount === 0) return 'due';
    return 'partial';
  }, [paidAmount, total]);

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
    if (customerId === "walkin" || !customerId) {
      setSelectedCustomerId(null);
      setSelectedCustomer(null);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setPhoneQuery("");
      setCustomerStatus('idle');
      setFoundCustomer(null);
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

    // Normalize phone before saving
    const normalizedPhone = customerPhone ? formatBDPhone(customerPhone) : null;

    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: sanitizeString(customerName),
        phone: normalizedPhone,
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
  const handleCompleteSale = async () => {
    // Use calculated payment status based on amount paid vs total
    const finalPaymentStatus = paymentStatus; // 'paid' | 'partial' | 'due'
    const actualAmountPaid = paidAmount;
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

    // Partial or Due requires a registered customer (phone number entered)
    const hasCustomer = phoneQuery.length >= 11 || selectedCustomerId;

    if ((finalPaymentStatus === 'due' || finalPaymentStatus === 'partial') && !hasCustomer) {
      toast({
        title: "Cannot save with outstanding balance",
        description: "Credit/partial payment requires a registered customer with phone number",
        variant: "destructive"
      });
      return;
    }

    // Credit limit check for partial/due payments
    const remainingDue = finalPaymentStatus === 'paid' ? 0 : (total - actualAmountPaid);

    if ((finalPaymentStatus === 'due' || finalPaymentStatus === 'partial') && selectedCustomer) {
      const currentDue = selectedCustomer.total_due || 0;
      const limit = selectedCustomer.credit_limit || DEFAULT_CREDIT_LIMIT;
      if (currentDue + remainingDue > limit) {
        toast({
          title: "Credit limit exceeded",
          description: `Limit: ${BANGLADESHI_CURRENCY_SYMBOL}${limit}. This sale would add ${BANGLADESHI_CURRENCY_SYMBOL}${remainingDue} to dues.`,
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

      let customerId = selectedCustomerId;

      // Create customer if new (from phone-first flow)
      // Always normalize phone to 01XXXXXXXXX format before saving
      const normalizedPhone = phoneQuery ? formatBDPhone(phoneQuery) : null;

      if (!customerId && customerStatus === 'new' && newCustomerName) {
        const { data: newCust } = await supabase
          .from('customers')
          .insert({
            name: sanitizeString(newCustomerName),
            phone: normalizedPhone,
            address: newCustomerAddress || null,
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
          payment_status: finalPaymentStatus,
          notes: finalPaymentStatus === 'partial' ? `Paid: ৳${actualAmountPaid}, Remaining: ৳${remainingDue}` : null,
          driver_id: null,
          created_by: user.id,
          owner_id: ownerId || user.id
        })
        .select()
        .single();

      if (txnError) throw txnError;

      // Insert items with error handling - product_id is nullable, don't force invalid UUIDs
      if (transaction) {
        const items = saleItems.map(item => ({
          transaction_id: transaction.id,
          product_id: item.brandId || item.stoveId || item.regulatorId || null,
          product_name: `${item.name} - ${item.details}`,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          created_by: user.id
        }));

        const { error: itemsError } = await supabase.from('pos_transaction_items').insert(items);
        if (itemsError) {
          logger.error('Failed to insert transaction items', itemsError, { component: 'POS' });
        }
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

      // Update customer dues (track both money AND cylinders including refill debt)
      // For partial payments, only add the REMAINING amount to dues, not the full total
      if ((finalPaymentStatus === 'due' || finalPaymentStatus === 'partial') && customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          // Package cylinders = always owed (customer gets new cylinder)
          const packageCylindersSold = saleItems
            .filter(i => i.type === 'lpg' && i.cylinderType === 'package')
            .reduce((sum, i) => sum + i.quantity, 0);

          // Refill cylinders = owed ONLY if empty not returned (refill needs exchange)
          const refillCylindersSold = saleItems
            .filter(i => i.type === 'lpg' && i.cylinderType === 'refill')
            .reduce((sum, i) => sum + i.quantity, 0);

          const emptyReturned = returnItems.reduce((sum, r) => sum + r.quantity, 0);

          // Missing refill returns = cylinders the customer owes
          const missingRefillReturns = Math.max(0, refillCylindersSold - emptyReturned);

          // Total cylinder debt = packages (always) + missing refill returns
          const totalCylinderDebt = packageCylindersSold + missingRefillReturns;

          // Add only the REMAINING due amount (not full total for partial payments)
          await supabase.from('customers')
            .update({
              total_due: (customer.total_due || 0) + remainingDue,
              cylinders_due: (customer.cylinders_due || 0) + totalCylinderDebt,
              billing_status: remainingDue > 0 ? 'pending' : 'clear',
              last_order_date: new Date().toISOString()
            })
            .eq('id', customerId);
        }
      }

      // Prepare invoice with return items
      const finalCustomerName = foundCustomer?.name || newCustomerName || customerName || "Customer";
      const finalPhone = foundCustomer?.phone || phoneQuery || customerPhone || "";
      const finalAddress = foundCustomer?.address || newCustomerAddress || customerAddress || "";

      setLastTransaction({
        invoiceNumber: transactionNumber,
        date: new Date(),
        customer: { name: finalCustomerName, phone: finalPhone, address: finalAddress },
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
        paymentStatus: finalPaymentStatus,
        paymentMethod: 'cash'
      });
      setShowPaymentDrawer(false);
      setShowPrintTypeDialog(true);

      // Reset
      setSaleItems([]);
      setReturnItems([]);
      setDiscount("0");
      setPaymentAmount("");
      setSelectedCustomerId("walkin");
      setSelectedCustomer(null);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setPhoneQuery("");
      setNewCustomerName("");
      setNewCustomerAddress("");
      setCustomerStatus('idle');
      setFoundCustomer(null);

      toast({
        title: finalPaymentStatus === 'paid' ? "Sale completed!" :
          finalPaymentStatus === 'partial' ? "Partial payment saved!" : "Saved as due",
        description: transactionNumber
      });

    } catch (error: any) {
      logger.error('POS sale error', error, { component: 'POS' });
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // Void system removed - transactions are permanent

  const clearAll = () => {
    setSaleItems([]);
    setReturnItems([]);
    setDiscount("0");
    setPaymentAmount("");
    toast({ title: "Cart cleared" });
  };

  // Get weight options based on mouth size
  const weightOptions = mouthSize === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM;

  // ============= RENDER =============
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading POS...</span>
      </div>
    );
  }

  // Determine products to show based on active table
  const isSaleMode = activeTable === 'sale';
  const displayBrands = isSaleMode ? filteredBrands : brandsForReturn;

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

        {/* ===== CONTROL BAR: Compact Layout ===== */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-3 space-y-3">
            {/* Row 1: Retail/Wholesale Toggle + Weight Dropdown + Search */}
            <div className="flex items-center gap-2">
              {/* Retail/Wholesale Toggle */}
              <div className="flex-1 bg-muted/80 rounded-lg p-0.5 border border-border/50">
                <div className="grid grid-cols-2 gap-0.5">
                  <Button
                    size="sm"
                    variant={saleType === 'retail' ? 'default' : 'ghost'}
                    onClick={() => setSaleType('retail')}
                    className={`h-10 font-semibold ${saleType === 'retail' ? 'bg-primary shadow-md' : ''}`}
                  >
                    Retail
                  </Button>
                  <Button
                    size="sm"
                    variant={saleType === 'wholesale' ? 'default' : 'ghost'}
                    onClick={() => setSaleType('wholesale')}
                    className={`h-10 font-semibold ${saleType === 'wholesale' ? 'bg-primary shadow-md' : ''}`}
                  >
                    Wholesale
                  </Button>
                </div>
              </div>

              {/* Weight Dropdown */}
              <Select value={weight} onValueChange={setWeight}>
                <SelectTrigger className="w-24 sm:w-28 h-10 font-semibold bg-primary text-primary-foreground border-primary">
                  <SelectValue placeholder="Weight" />
                </SelectTrigger>
                <SelectContent>
                  {weightOptions.map((w) => (
                    <SelectItem key={w} value={w} className="font-medium">
                      {w}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="font-medium text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Plus className="h-3 w-3" /> Custom
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Search on Desktop */}
              <div className="hidden sm:flex relative w-40">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search..."
                  className="h-10 pl-8 text-sm"
                />
              </div>
            </div>

            {/* Row 2: Unified Cylinder Type & Valve Size (Single Row for Mobile) */}
            <div className="flex items-center">
              <div className="flex bg-muted/60 rounded-full p-1 border border-border/50 w-full">
                {/* Cylinder Type Buttons */}
                <button
                  onClick={() => setCylinderType('refill')}
                  className={`flex-1 h-9 px-2 sm:px-4 rounded-full font-semibold text-xs sm:text-sm transition-all min-w-0 ${cylinderType === 'refill'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Refill
                </button>
                <button
                  onClick={() => setCylinderType('package')}
                  className={`flex-1 h-9 px-2 sm:px-4 rounded-full font-semibold text-xs sm:text-sm transition-all min-w-0 ${cylinderType === 'package'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  Package
                </button>

                {/* Visual Separator */}
                <div className="w-px h-6 bg-border/70 self-center mx-1 sm:mx-2 flex-shrink-0" />

                {/* Valve Size Buttons */}
                <button
                  onClick={() => setMouthSize('22mm')}
                  className={`flex-1 h-9 px-2 sm:px-4 rounded-full font-semibold text-xs sm:text-sm transition-all min-w-0 ${mouthSize === '22mm'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  22mm
                </button>
                <button
                  onClick={() => setMouthSize('20mm')}
                  className={`flex-1 h-9 px-2 sm:px-4 rounded-full font-semibold text-xs sm:text-sm transition-all min-w-0 ${mouthSize === '20mm'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  20mm
                </button>
              </div>
            </div>

            {/* Row 3: Selling/Return Switch (Desktop Only) + Product Type Tabs */}
            <div className="flex items-center gap-3">
              {/* Desktop Selling/Return Switch */}
              <div className="hidden lg:flex items-center bg-muted/60 rounded-full p-1 border border-border/50">
                <button
                  onClick={() => setActiveTable('sale')}
                  className={`flex items-center gap-2 h-9 px-4 rounded-full font-semibold text-sm transition-all ${isSaleMode
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Selling
                  {saleItemsCount > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-white/20 text-white text-[10px] px-1.5">
                      {saleItemsCount}
                    </Badge>
                  )}
                </button>
                <button
                  onClick={() => setActiveTable('return')}
                  className={`flex items-center gap-2 h-9 px-4 rounded-full font-semibold text-sm transition-all ${!isSaleMode
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                  Return
                  {returnCylindersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-white/20 text-white text-[10px] px-1.5">
                      {returnCylindersCount}
                    </Badge>
                  )}
                </button>
              </div>

              {/* Product Type Tabs (Only in Sale Mode) */}
              {isSaleMode && (
                <div className="flex flex-1 gap-2">
                  {[
                    { id: 'lpg', label: 'LPG', icon: Cylinder },
                    { id: 'stove', label: 'Stove', icon: ChefHat },
                    { id: 'regulator', label: 'Regulator', icon: Gauge },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-medium transition-all border ${activeTab === tab.id
                        ? 'bg-muted border-border text-foreground shadow-sm'
                        : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/50'
                        }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Return Mode Label (Desktop) */}
              {!isSaleMode && (
                <div className="hidden lg:flex items-center gap-2 flex-1 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <Cylinder className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Select cylinders to add as return
                  </span>
                </div>
              )}
            </div>

            {/* Mobile Search */}
            <div className="sm:hidden relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products..."
                className="h-10 pl-8 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* ===== PRODUCT GRID ===== */}
        <Card>
          <CardContent className="p-3">
            <ScrollArea className="h-[280px] sm:h-[320px]">
              {/* LPG Cylinders */}
              {(activeTab === 'lpg' || !isSaleMode) && (
                <div className="mb-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {displayBrands.map(brand => {
                      const baseStock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
                      const pendingQty = getPendingStock(brand.id, cylinderType);
                      const displayStock = baseStock - pendingQty;
                      const price = getLPGPrice(brand.id, weight, cylinderType, saleType);

                      // Return mode: show empty cylinder preview
                      const pendingReturns = getPendingReturns(brand.id);
                      const pendingProblem = getPendingProblem(brand.id);
                      const previewEmpty = brand.empty_cylinder + pendingReturns;

                      return (
                        <button
                          key={brand.id}
                          onClick={() => isSaleMode ? addLPGToCart(brand) : addReturnCylinder(brand)}
                          disabled={isSaleMode && displayStock <= 0}
                          className={`p-2.5 rounded-lg text-left transition-all hover:shadow-md relative overflow-hidden ${isSaleMode && displayStock <= 0
                            ? 'opacity-50 cursor-not-allowed border border-muted'
                            : isSaleMode
                              ? 'border border-transparent hover:border-emerald-500/50 bg-card'
                              : 'border border-transparent hover:border-amber-500/50 bg-card'
                            }`}
                        >
                          {/* Left Border Color Strip */}
                          <div
                            className="absolute top-0 left-0 bottom-0 w-1.5 rounded-l-lg"
                            style={{ backgroundColor: brand.color }}
                          />
                          <div className="pl-2">
                            <div className="flex items-start justify-between gap-1">
                              <div
                                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: brand.color }}
                              >
                                <Cylinder className="h-4 w-4 text-white" />
                              </div>
                              {isSaleMode ? (
                                <Badge
                                  variant={displayStock > 5 ? "secondary" : displayStock > 0 ? "outline" : "destructive"}
                                  className="text-[9px] px-1.5 h-5"
                                >
                                  {displayStock > 0 ? (
                                    <span className="flex items-center gap-0.5">
                                      {displayStock}
                                      {pendingQty > 0 && (
                                        <span className="text-amber-600 dark:text-amber-400">(-{pendingQty})</span>
                                      )}
                                    </span>
                                  ) : 'Out'}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1.5 h-5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                >
                                  Empty: {previewEmpty}
                                  {pendingReturns > 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400">(+{pendingReturns})</span>
                                  )}
                                </Badge>
                              )}
                            </div>
                            <div className="mt-1.5">
                              <p className="font-semibold text-xs truncate">{brand.name}</p>
                              <p className="text-[10px] text-muted-foreground">{weight}</p>
                            </div>
                            {isSaleMode ? (
                              <p className="font-bold text-sm text-emerald-600 mt-1.5">{BANGLADESHI_CURRENCY_SYMBOL}{price}</p>
                            ) : (
                              <div className="mt-1.5">
                                <p className="text-[10px] text-amber-600 font-medium">Tap to add return</p>
                                {pendingProblem > 0 && (
                                  <p className="text-[9px] text-rose-500">Leaked: +{pendingProblem}</p>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    {/* Custom Brand Button */}
                    {isSaleMode && (
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
                    {!isSaleMode && (
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
                  </div>
                </div>
              )}

              {/* Stoves - Only in Sale Mode */}
              {activeTab === 'stove' && isSaleMode && (
                <div className="mb-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {filteredStoves.map(stove => {
                      const price = getStovePrice(stove.brand, stove.model) || stove.price;
                      return (
                        <button
                          key={stove.id}
                          onClick={() => addStoveToCart(stove)}
                          disabled={stove.quantity === 0}
                          className={`p-2.5 rounded-lg text-left transition-all hover:shadow-md relative overflow-hidden ${stove.quantity === 0 ? 'opacity-50 cursor-not-allowed border border-muted' : 'border border-transparent hover:border-orange-500/50 bg-card'
                            }`}
                        >
                          <div className="absolute top-0 left-0 bottom-0 w-1.5 rounded-l-lg bg-orange-500" />
                          <div className="pl-2">
                            <div className="flex items-start justify-between gap-1">
                              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                                <ChefHat className="h-4 w-4 text-white" />
                              </div>
                              <Badge variant="secondary" className="text-[9px] px-1.5 h-5">{stove.quantity}</Badge>
                            </div>
                            <div className="mt-1.5">
                              <p className="font-semibold text-xs truncate">{stove.brand}</p>
                              <p className="text-[10px] text-muted-foreground">{stove.burners}B • {stove.model}</p>
                            </div>
                            <p className="font-bold text-sm text-orange-600 mt-1.5">{BANGLADESHI_CURRENCY_SYMBOL}{price}</p>
                          </div>
                        </button>
                      );
                    })}
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
              {activeTab === 'regulator' && isSaleMode && (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {filteredRegulators.map(reg => {
                      const price = getRegulatorPrice(reg.brand, reg.type) || reg.price || 0;
                      return (
                        <button
                          key={reg.id}
                          onClick={() => addRegulatorToCart(reg)}
                          disabled={reg.quantity === 0}
                          className={`p-2.5 rounded-lg text-left transition-all hover:shadow-md relative overflow-hidden ${reg.quantity === 0 ? 'opacity-50 cursor-not-allowed border border-muted' : 'border border-transparent hover:border-violet-500/50 bg-card'
                            }`}
                        >
                          <div className="absolute top-0 left-0 bottom-0 w-1.5 rounded-l-lg bg-violet-500" />
                          <div className="pl-2">
                            <div className="flex items-start justify-between gap-1">
                              <div className="w-8 h-8 rounded-lg bg-violet-500 flex items-center justify-center flex-shrink-0">
                                <Gauge className="h-4 w-4 text-white" />
                              </div>
                              <Badge variant="secondary" className="text-[9px] px-1.5 h-5">{reg.quantity}</Badge>
                            </div>
                            <div className="mt-1.5">
                              <p className="font-semibold text-xs truncate">{reg.brand}</p>
                              <p className="text-[10px] text-muted-foreground">{reg.type}</p>
                            </div>
                            <p className="font-bold text-sm text-violet-600 mt-1.5">{BANGLADESHI_CURRENCY_SYMBOL}{price}</p>
                          </div>
                        </button>
                      );
                    })}
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

              {/* Empty State */}
              {displayBrands.length === 0 && activeTab === 'lpg' && (
                <div className="text-center py-8 text-muted-foreground">
                  <Cylinder className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No cylinders found for {mouthSize} / {weight}</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ===== UNIFIED CUSTOMER FORM ===== */}
        <Card className="border-border/50">
          <CardContent className="p-3 space-y-3">
            {/* Customer Status Badge - Shows Old/New customer state */}
            <div className="flex items-center gap-2 flex-wrap">
              {customerStatus === 'idle' && phoneQuery.length === 0 && (
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  <User className="h-3 w-3 mr-1" />
                  Enter Phone Number
                </Badge>
              )}
              {customerStatus === 'idle' && phoneQuery.length > 0 && phoneQuery.length < 11 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <Phone className="h-3 w-3 mr-1" />
                  {11 - phoneQuery.length} digits remaining
                </Badge>
              )}
              {customerStatus === 'searching' && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Searching...
                </Badge>
              )}
              {customerStatus === 'found' && foundCustomer && (
                <Badge variant="secondary" className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                  <UserCircle className="h-3 w-3 mr-1" />
                  Old Customer
                </Badge>
              )}
              {customerStatus === 'new' && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Sparkles className="h-3 w-3 mr-1" />
                  New Customer
                </Badge>
              )}
              {foundCustomer && (foundCustomer.total_due || 0) > 0 && (
                <Badge variant="destructive" className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Due: {BANGLADESHI_CURRENCY_SYMBOL}{(foundCustomer.total_due || 0).toLocaleString()}
                </Badge>
              )}
              {foundCustomer && (foundCustomer.cylinders_due || 0) > 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700">
                  {foundCustomer.cylinders_due} Cylinder{foundCustomer.cylinders_due > 1 ? 's' : ''} Due
                </Badge>
              )}
            </div>

            {/* Unified Customer Details Form - Phone, Name, Location */}
            <div className="grid grid-cols-1 gap-3">
              {/* Phone Field - Primary lookup key */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Phone Number
                  <span className="text-primary ml-1">(auto-lookup)</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    value={phoneQuery}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setPhoneQuery(value);
                    }}
                    placeholder="01XXXXXXXXX"
                    className="h-11 pl-10 text-base font-medium input-accessible"
                    maxLength={11}
                    autoComplete="tel"
                  />
                  {customerStatus === 'searching' && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {customerStatus === 'found' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-sky-500 flex items-center justify-center">
                      <UserCircle className="h-3.5 w-3.5 text-white" />
                    </div>
                  )}
                  {customerStatus === 'new' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Name & Location in same row on larger screens */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Name Field - Auto-filled for old customers, editable for new */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Name {customerStatus === 'new' && <span className="text-destructive">*</span>}
                  </Label>
                  {customerStatus === 'found' && foundCustomer ? (
                    <div className="h-11 px-3 flex items-center gap-2 rounded-md border bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sm font-medium text-foreground">
                      <UserCircle className="h-4 w-4 text-sky-500 shrink-0" />
                      <span className="truncate">{foundCustomer.name}</span>
                    </div>
                  ) : (
                    <Input
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      placeholder="Customer name"
                      className="h-11 input-accessible"
                      autoComplete="name"
                    />
                  )}
                </div>

                {/* Location/Address Field - Auto-filled for old customers, editable for new */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">Location</Label>
                  {customerStatus === 'found' && foundCustomer ? (
                    <div className="h-11 px-3 flex items-center gap-2 rounded-md border bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 text-sky-500 shrink-0" />
                      <span className="truncate">{foundCustomer.address || 'No address'}</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={newCustomerAddress}
                        onChange={(e) => setNewCustomerAddress(e.target.value)}
                        placeholder="Address/Location"
                        className="h-11 pl-10 input-accessible"
                        autoComplete="street-address"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Settlement & Seller Row */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Settlement</Label>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Seller</Label>
                <div className={`h-10 px-3 flex items-center gap-2 rounded-md border ${ROLE_CONFIG[userRole]?.bgColor || 'bg-muted border-border'}`}>
                  <User className={`h-3.5 w-3.5 ${ROLE_CONFIG[userRole]?.color || 'text-foreground'}`} />
                  <span className={`text-sm font-medium ${ROLE_CONFIG[userRole]?.color || 'text-foreground'}`}>
                    {ROLE_CONFIG[userRole]?.label || 'User'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions section removed - void system disabled */}

        {/* ===== STICKY FOOTER (Mobile) ===== */}
        {saleItems.length > 0 && (
          <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-card border-t border-border shadow-lg safe-area-pb">
            <div className="flex items-center justify-between p-3 max-w-7xl mx-auto">
              <div>
                <p className="text-2xl font-bold text-foreground tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{saleItemsCount} item{saleItemsCount > 1 ? 's' : ''}</p>
              </div>
              <Button
                size="lg"
                onClick={() => {
                  setPaymentAmount(total.toString());
                  setShowPaymentDrawer(true);
                }}
                disabled={processing || !isReturnCountMatched}
                className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold"
              >
                {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'PROCEED TO PAY →'}
              </Button>
            </div>
          </div>
        )}

        {/* ===== PAYMENT DRAWER ===== */}
        <Drawer open={showPaymentDrawer} onOpenChange={setShowPaymentDrawer}>
          <DrawerContent>
            <DrawerHeader className="text-left">
              <DrawerTitle>Complete Payment</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              {/* Total Display */}
              <div className="text-center py-4 bg-muted/50 rounded-xl">
                <p className="text-sm text-muted-foreground">Total Bill</p>
                <p className="text-4xl font-bold text-foreground tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</p>
              </div>

              {/* Amount Input */}
              <div>
                <Label className="text-sm font-medium">Amount Paid</Label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount..."
                  className="h-12 text-xl font-semibold mt-1.5"
                  autoFocus
                />
              </div>

              {/* Payment Status Indicator */}
              <div className="flex items-center justify-center gap-4 py-3">
                {[
                  { id: 'paid', label: 'PAID', color: 'bg-emerald-500' },
                  { id: 'partial', label: 'PARTIAL', color: 'bg-amber-500' },
                  { id: 'due', label: 'DUE', color: 'bg-rose-500' },
                ].map((status) => (
                  <div
                    key={status.id}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full ${paymentStatus === status.id
                      ? `${status.color} text-white`
                      : 'bg-muted text-muted-foreground'
                      }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${paymentStatus === status.id ? 'bg-white' : 'bg-muted-foreground/50'}`} />
                    <span className="text-sm font-medium">{status.label}</span>
                  </div>
                ))}
              </div>

              {/* Due Warning - Show when no customer selected */}
              {paymentStatus === 'due' && phoneQuery.length < 11 && !selectedCustomerId && (
                <p className="text-xs text-destructive text-center">
                  ⚠ Due requires a customer with phone number
                </p>
              )}
            </div>
            <DrawerFooter className="flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={() => setShowPaymentDrawer(false)}
              >
                Cancel
              </Button>
              {paymentStatus === 'paid' ? (
                <Button
                  className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleCompleteSale()}
                  disabled={processing}
                >
                  {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm & Print'}
                </Button>
              ) : paymentStatus === 'partial' ? (
                <Button
                  className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => handleCompleteSale()}
                  disabled={processing || (phoneQuery.length < 11 && !selectedCustomerId)}
                >
                  {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : `Save Partial (৳${paidAmount} paid)`}
                </Button>
              ) : (
                <Button
                  className="flex-1 h-12"
                  variant="outline"
                  onClick={() => handleCompleteSale()}
                  disabled={processing || (phoneQuery.length < 11 && !selectedCustomerId)}
                >
                  {processing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save as Due'}
                </Button>
              )}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

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

        {/* Customer List Dialog (Browse) */}
        <Dialog open={showCustomerListDialog} onOpenChange={setShowCustomerListDialog}>
          <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Browse Customers
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="h-11 pl-9"
                />
              </div>

              {/* Customer List */}
              <ScrollArea className="flex-1 h-[300px] pr-2">
                <div className="space-y-2">
                  {filteredCustomers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No customers found</p>
                    </div>
                  ) : (
                    filteredCustomers.map(customer => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setPhoneQuery(customer.phone || "");
                          setCustomerStatus('found');
                          setFoundCustomer(customer);
                          setSelectedCustomerId(customer.id);
                          setSelectedCustomer(customer);
                          setCustomerName(customer.name);
                          setCustomerPhone(customer.phone || "");
                          setCustomerAddress(customer.address || "");
                          setNewCustomerName(customer.name);
                          setNewCustomerAddress(customer.address || "");
                          setShowCustomerListDialog(false);
                          toast({ title: "Customer selected", description: customer.name });
                        }}
                        className="w-full p-3 rounded-lg border bg-card hover:bg-muted/50 text-left transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-primary">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{customer.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {customer.phone || 'No phone'} • {customer.address || 'No address'}
                            </p>
                          </div>
                          {(customer.total_due || 0) > 0 && (
                            <Badge variant="destructive" className="flex-shrink-0 text-xs">
                              Due: {BANGLADESHI_CURRENCY_SYMBOL}{(customer.total_due || 0).toLocaleString()}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
            <DialogFooter className="border-t pt-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowCustomerListDialog(false);
                  setShowAddCustomerDialog(true);
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add New Customer
              </Button>
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

        {/* Void dialog removed - void system disabled */}

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
