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
import { Separator } from "@/components/ui/separator";
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
  Cylinder,
  ChevronRight,
  ChevronLeft,
  Check,
  CreditCard,
  Wallet,
  ArrowRight,
  CheckCircle2,
  CircleDot
} from "lucide-react";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { generateInvoicePDF } from "@/lib/pdfExport";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { getBrandMouthSizeMap, getDefaultMouthSize, LPG_BRANDS } from "@/lib/brandConstants";
import { supabase } from "@/integrations/supabase/client";
import { parsePositiveNumber, parsePositiveInt, sanitizeString, customerSchema } from "@/lib/validationSchemas";
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

interface RecentTransaction {
  id: string;
  transactionNumber: string;
  customerName: string;
  total: number;
  status: string;
  createdAt: Date;
  items: { name: string; quantity: number }[];
}

// Weight options for 22mm and 20mm
const WEIGHT_OPTIONS_22MM = ["5.5kg", "12kg", "12.5kg", "25kg", "35kg", "45kg"];
const WEIGHT_OPTIONS_20MM = ["5kg", "10kg", "12kg", "15kg", "21kg", "35kg"];

// Brand mouth size mapping
const BRAND_MOUTH_SIZE_MAP = getBrandMouthSizeMap();

// Credit limit for customers (default)
const DEFAULT_CREDIT_LIMIT = 10000;

// ============= STEP COMPONENT =============
const StepIndicator = ({ 
  currentStep, 
  onStepClick,
  hasLPG 
}: { 
  currentStep: number;
  onStepClick: (step: number) => void;
  hasLPG: boolean;
}) => {
  const steps = [
    { num: 1, label: "Products", mobileLabel: "1", icon: ShoppingCart },
    { num: 2, label: "Return", mobileLabel: "2", icon: ArrowLeftRight, skip: !hasLPG },
    { num: 3, label: "Checkout", mobileLabel: "3", icon: CreditCard }
  ];

  return (
    <Card className="p-3 sm:p-4 bg-gradient-to-r from-muted/50 to-muted/30">
      <div className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isActive = currentStep === step.num;
          const isCompleted = currentStep > step.num;
          const Icon = step.icon;
          const isSkipped = step.skip;
          
          return (
            <div key={step.num} className="flex items-center flex-1">
              <button
                onClick={() => onStepClick(step.num)}
                disabled={isSkipped}
                className={`flex items-center gap-1.5 sm:gap-2 transition-all ${
                  isSkipped ? "opacity-40 cursor-not-allowed" :
                  isActive 
                    ? "text-primary font-semibold" 
                    : isCompleted 
                      ? "text-emerald-600 cursor-pointer hover:scale-105" 
                      : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all shadow-sm ${
                  isSkipped ? "bg-muted/50" :
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20" 
                    : isCompleted 
                      ? "bg-emerald-600 text-white shadow-md" 
                      : "bg-background border-2 border-muted-foreground/30"
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                  ) : (
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs sm:text-sm font-medium leading-tight">{step.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {step.num === 1 ? "Select items" : step.num === 2 ? "Empty swap" : "Pay now"}
                  </p>
                </div>
                <span className="sm:hidden text-xs font-medium">{step.mobileLabel}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 sm:mx-3 rounded-full transition-colors ${
                  currentStep > step.num ? "bg-emerald-500" : "bg-muted"
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ============= PRODUCT CARD COMPONENT =============
interface ProductCardProps {
  type: 'lpg' | 'stove' | 'regulator';
  name: string;
  subtitle?: string;
  price: number;
  stock: number;
  color?: string;
  icon: React.ReactNode;
  isSelected?: boolean;
  isDisabled?: boolean;
  onClick: () => void;
  badge?: string;
}

const ProductCard = ({ 
  type, 
  name, 
  subtitle, 
  price, 
  stock, 
  color, 
  icon, 
  isSelected, 
  isDisabled,
  onClick,
  badge
}: ProductCardProps) => {
  const getStockStyle = () => {
    if (stock === 0) return { bg: "bg-destructive/10", text: "text-destructive", label: "Out" };
    if (stock < 5) return { bg: "bg-amber-500/10", text: "text-amber-600", label: `${stock} left` };
    return { bg: "bg-emerald-500/10", text: "text-emerald-600", label: `${stock} in stock` };
  };

  const stockStyle = getStockStyle();
  const isOutOfStock = stock === 0;

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-xl hover:-translate-y-1 border-2 overflow-hidden group ${
        isSelected 
          ? 'border-primary ring-2 ring-primary/30 bg-primary/5' 
          : isOutOfStock
            ? 'opacity-50 cursor-not-allowed border-muted'
            : 'border-transparent hover:border-primary/60 bg-card shadow-sm'
      }`}
      onClick={() => !isDisabled && !isOutOfStock && onClick()}
    >
      <CardContent className="p-0">
        {/* Colored Header Strip */}
        <div 
          className="h-2 w-full"
          style={{ backgroundColor: color || (type === 'stove' ? '#f97316' : type === 'regulator' ? '#8b5cf6' : '#22c55e') }}
        />
        
        <div className="p-3 flex flex-col items-center text-center space-y-2">
          {/* Icon Container */}
          <div 
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"
            style={{ backgroundColor: color || (type === 'stove' ? '#f97316' : type === 'regulator' ? '#8b5cf6' : '#22c55e') }}
          >
            {icon}
          </div>
          
          {/* Product Info */}
          <div className="space-y-0.5 min-h-[40px]">
            <p className="font-bold text-sm leading-tight line-clamp-1">{name}</p>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground line-clamp-1">{subtitle}</p>
            )}
          </div>
          
          {/* Price Tag */}
          <div className="bg-primary/10 text-primary font-bold text-base sm:text-lg px-3 py-1 rounded-full">
            {BANGLADESHI_CURRENCY_SYMBOL}{price.toLocaleString()}
          </div>
          
          {/* Stock Badge */}
          <Badge 
            variant="secondary" 
            className={`text-[10px] px-2 py-0.5 ${stockStyle.bg} ${stockStyle.text} border-0`}
          >
            {stockStyle.label}
          </Badge>
          
          {/* Optional Badge */}
          {badge && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">
              {badge}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ============= RETURN CYLINDER CARD =============
interface ReturnCylinderCardProps {
  brand: LPGBrand | { name: string; color: string; id?: string };
  isSelected: boolean;
  onClick: () => void;
  isCustom?: boolean;
  isNoReturn?: boolean;
}

const ReturnCylinderCard = ({ brand, isSelected, onClick, isCustom, isNoReturn }: ReturnCylinderCardProps) => (
  <Card 
    className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border-2 overflow-hidden ${
      isSelected 
        ? 'border-primary bg-primary/5 ring-2 ring-primary/30 shadow-lg' 
        : 'border-transparent hover:border-primary/60 bg-card shadow-sm'
    }`}
    onClick={onClick}
  >
    <CardContent className="p-0">
      {/* Colored top strip */}
      <div 
        className="h-1.5 w-full"
        style={{ backgroundColor: isNoReturn ? '#6b7280' : brand.color }}
      />
      <div className="p-3 flex flex-col items-center gap-2">
        <div 
          className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shadow-md"
          style={{ backgroundColor: isNoReturn ? '#6b7280' : brand.color }}
        >
          {isNoReturn ? (
            <X className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          ) : (
            <Cylinder className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          )}
        </div>
        <span className="text-xs sm:text-sm font-semibold text-center leading-tight line-clamp-1">
          {brand.name}
        </span>
        {isCustom && (
          <Badge variant="secondary" className="text-[9px] px-1.5">Custom</Badge>
        )}
        {isSelected && !isNoReturn && (
          <Badge className="text-[9px] px-1.5 bg-primary">Selected</Badge>
        )}
      </div>
    </CardContent>
  </Card>
);

// ============= MAIN POS MODULE =============
export const POSModule = () => {
  const { t } = useLanguage();
  
  // ===== STEP STATE =====
  const [currentStep, setCurrentStep] = useState(1);
  
  // ===== DATA STATE =====
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  
  // ===== PRODUCT SELECTION STATE (STEP 1) =====
  const [activeTab, setActiveTab] = useState("lpg");
  const [cylinderType, setCylinderType] = useState<"refill" | "package">("refill");
  const [saleType, setSaleType] = useState<"retail" | "wholesale">("retail");
  const [mouthSize, setMouthSize] = useState("22mm");
  const [weight, setWeight] = useState("12kg");
  const [productSearch, setProductSearch] = useState("");
  
  // ===== CART STATE =====
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  
  // ===== RETURN CYLINDER STATE (STEP 2) =====
  const [selectedReturnBrand, setSelectedReturnBrand] = useState<string | null>(null);
  const [isLeakedReturn, setIsLeakedReturn] = useState(false);
  const [customReturnBrand, setCustomReturnBrand] = useState("");
  const [showCustomBrandInput, setShowCustomBrandInput] = useState(false);
  
  // ===== CUSTOMER STATE (STEP 3) =====
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
  const [printType, setPrintType] = useState<'bill' | 'gatepass'>('bill');
  const [showPrintTypeDialog, setShowPrintTypeDialog] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [transactionToVoid, setTransactionToVoid] = useState<RecentTransaction | null>(null);

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

    // Fetch recent transactions (last 5 minutes)
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

  const allBrandsForReturn = useMemo(() => {
    // Get the weight from the first LPG item in cart, or use current weight
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

  // ============= CART HELPERS =============
  const hasLPGInCart = saleItems.some(i => i.type === 'lpg' && i.cylinderType === 'refill');
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
        name: `${brand.name} - ${cylinderType === 'refill' ? 'Refill' : 'Package'}`,
        details: `${weight}, ${mouthSize}, ${saleType}`,
        price,
        quantity: 1,
        cylinderType,
        brandId: brand.id,
        weight,
        mouthSize
      };
      setSaleItems([...saleItems, newItem]);
    }
    toast({ title: "Added to cart" });
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
    toast({ title: "Added to cart" });
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
    toast({ title: "Added to cart" });
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
      toast({ title: "Customer name is required", variant: "destructive" });
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
      toast({ title: "Error adding customer", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Customer added successfully" });
    setShowAddCustomerDialog(false);
    
    if (data) {
      setSelectedCustomerId(data.id);
      setSelectedCustomer(data);
      setCustomers([...customers, data]);
    }
  };

  // ============= CUSTOM BRAND HANDLER =============
  const handleAddCustomBrand = async () => {
    if (!customReturnBrand.trim()) {
      toast({ title: "Please enter brand name", variant: "destructive" });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get owner ID
      const { data: ownerId } = await supabase.rpc("get_owner_id");

      // Create new brand in inventory
      const { data: newBrand, error: brandError } = await supabase
        .from('lpg_brands')
        .insert({
          name: sanitizeString(customReturnBrand),
          size: mouthSize,
          weight: saleItems.find(i => i.type === 'lpg')?.weight || weight,
          color: '#6b7280', // Gray for custom
          package_cylinder: 0,
          refill_cylinder: 0,
          empty_cylinder: 1, // Start with 1 since customer is returning
          problem_cylinder: 0,
          created_by: user.id,
          owner_id: ownerId || user.id
        })
        .select()
        .single();

      if (brandError) throw brandError;

      // Also create pricing entry
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

      toast({ title: "Custom brand added to inventory" });
      setSelectedReturnBrand(newBrand.id);
      setShowCustomBrandInput(false);
      setCustomReturnBrand("");
      await fetchData();
    } catch (error: any) {
      toast({ title: "Error adding brand", description: error.message, variant: "destructive" });
    }
  };

  // ============= APPLY RETURN BRAND TO CART =============
  const applyReturnBrandToCart = () => {
    if (!selectedReturnBrand && !isLeakedReturn) {
      // No return selected, continue without
      setCurrentStep(3);
      return;
    }

    const returnBrand = lpgBrands.find(b => b.id === selectedReturnBrand);
    
    setSaleItems(prev => prev.map(item => {
      if (item.type === 'lpg' && item.cylinderType === 'refill') {
        return {
          ...item,
          returnBrand: returnBrand?.name,
          returnBrandId: selectedReturnBrand || undefined,
          isLeakedReturn,
          details: `${item.details}${returnBrand ? `, Return: ${returnBrand.name}${isLeakedReturn ? ' (Leaked)' : ''}` : ''}`
        };
      }
      return item;
    }));

    setCurrentStep(3);
  };

  // ============= COMPLETE SALE =============
  const handleCompleteSale = async (paymentStatus: 'completed' | 'pending') => {
    if (saleItems.length === 0) {
      toast({ title: "No items in cart", variant: "destructive" });
      return;
    }

    if (paymentStatus === 'pending' && selectedCustomerId === "walkin") {
      toast({ 
        title: "Cannot save as due", 
        description: "Credit sales require a registered customer",
        variant: "destructive" 
      });
      return;
    }

    // Check credit limit
    if (paymentStatus === 'pending' && selectedCustomer) {
      const currentDue = selectedCustomer.total_due || 0;
      const limit = selectedCustomer.credit_limit || DEFAULT_CREDIT_LIMIT;
      if (currentDue + total > limit) {
        toast({ 
          title: "Credit limit exceeded", 
          description: `Would exceed limit of ${BANGLADESHI_CURRENCY_SYMBOL}${limit}`,
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

      // Create customer if new name entered
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

      // Update inventory
      for (const item of saleItems.filter(i => i.type === 'lpg' && i.brandId)) {
        const brand = lpgBrands.find(b => b.id === item.brandId);
        if (!brand) continue;

        if (item.cylinderType === 'refill') {
          await supabase.from('lpg_brands')
            .update({ refill_cylinder: Math.max(0, brand.refill_cylinder - item.quantity) })
            .eq('id', brand.id);

          // Handle return brand
          if (item.returnBrandId) {
            const returnBrand = lpgBrands.find(b => b.id === item.returnBrandId);
            if (returnBrand) {
              const field = item.isLeakedReturn ? 'problem_cylinder' : 'empty_cylinder';
              const currentVal = item.isLeakedReturn ? returnBrand.problem_cylinder : returnBrand.empty_cylinder;
              await supabase.from('lpg_brands')
                .update({ [field]: currentVal + item.quantity })
                .eq('id', returnBrand.id);
            }
          }
        } else {
          await supabase.from('lpg_brands')
            .update({ package_cylinder: Math.max(0, brand.package_cylinder - item.quantity) })
            .eq('id', brand.id);
        }
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
        const reg = regulators.find(r => r.id === item.regulatorId);
        if (reg) {
          await supabase.from('regulators')
            .update({ quantity: Math.max(0, reg.quantity - item.quantity) })
            .eq('id', reg.id);
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
      setDiscount("0");
      setSelectedCustomerId("walkin");
      setSelectedCustomer(null);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setSelectedReturnBrand(null);
      setIsLeakedReturn(false);
      setCurrentStep(1);

      toast({ 
        title: paymentStatus === 'completed' ? "Sale completed!" : "Saved as due",
        description: `Transaction: ${transactionNumber}`
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
      <div className="space-y-4 pb-24 sm:pb-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <ShoppingCart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t('pos')}</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">3-Step Easy Checkout</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowBarcodeScanner(true)} variant="outline" size="sm" className="gap-2">
              <ScanLine className="h-4 w-4" />
              <span className="hidden sm:inline">Scan</span>
            </Button>
          </div>
        </div>

        {/* Step Indicator */}
        <StepIndicator 
          currentStep={currentStep} 
          hasLPG={hasLPGInCart}
          onStepClick={(step) => {
            if (step < currentStep || saleItems.length > 0) setCurrentStep(step);
          }} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* ===== STEP 1: PRODUCT SELECTION ===== */}
            {currentStep === 1 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CircleDot className="h-5 w-5 text-primary" />
                      Step 1: Select Products
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {/* Cylinder Type Toggle */}
                      <div className="flex bg-muted rounded-lg p-0.5">
                        <Button
                          size="sm"
                          variant={cylinderType === 'refill' ? 'default' : 'ghost'}
                          onClick={() => setCylinderType('refill')}
                          className="h-7 text-xs px-3"
                        >
                          Refill
                        </Button>
                        <Button
                          size="sm"
                          variant={cylinderType === 'package' ? 'default' : 'ghost'}
                          onClick={() => setCylinderType('package')}
                          className={`h-7 text-xs px-3 ${cylinderType === 'package' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        >
                          Package
                        </Button>
                      </div>
                      {/* Customer Type Toggle */}
                      <div className="flex bg-muted rounded-lg p-0.5">
                        <Button
                          size="sm"
                          variant={saleType === 'retail' ? 'default' : 'ghost'}
                          onClick={() => setSaleType('retail')}
                          className="h-7 text-xs px-3"
                        >
                          Retail
                        </Button>
                        <Button
                          size="sm"
                          variant={saleType === 'wholesale' ? 'default' : 'ghost'}
                          onClick={() => setSaleType('wholesale')}
                          className={`h-7 text-xs px-3 ${saleType === 'wholesale' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                        >
                          Wholesale
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Product Tabs */}
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-4 w-full">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="lpg" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
                        <Fuel className="h-4 w-4 mr-1" />
                        LPG
                      </TabsTrigger>
                      <TabsTrigger value="stove" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white">
                        <ChefHat className="h-4 w-4 mr-1" />
                        Stove
                      </TabsTrigger>
                      <TabsTrigger value="regulator" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white">
                        <Gauge className="h-4 w-4 mr-1" />
                        Reg.
                      </TabsTrigger>
                    </TabsList>

                    {/* LPG Tab */}
                    <TabsContent value="lpg" className="space-y-4 mt-4">
                      {/* LPG Filters */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <div className="flex bg-muted rounded-lg p-1">
                          <Button size="sm" variant={mouthSize === "22mm" ? "default" : "ghost"} className="h-7 text-xs" onClick={() => { setMouthSize("22mm"); setWeight("12kg"); }}>22mm</Button>
                          <Button size="sm" variant={mouthSize === "20mm" ? "default" : "ghost"} className="h-7 text-xs" onClick={() => { setMouthSize("20mm"); setWeight("12kg"); }}>20mm</Button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(mouthSize === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM).map(w => (
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
                        </div>
                      </div>

                      {/* LPG Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredBrands.map(brand => {
                          const stock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
                          const price = getLPGPrice(brand.id, weight, cylinderType, saleType);
                          return (
                            <ProductCard
                              key={brand.id}
                              type="lpg"
                              name={brand.name}
                              subtitle={`${weight} • ${cylinderType}`}
                              price={price}
                              stock={stock}
                              color={brand.color}
                              icon={<Cylinder className="h-6 w-6 text-white" />}
                              onClick={() => addLPGToCart(brand)}
                              badge={mouthSize}
                            />
                          );
                        })}
                      </div>
                      {filteredBrands.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <Cylinder className="h-12 w-12 mx-auto mb-2 opacity-30" />
                          <p>No cylinders found for {mouthSize} / {weight}</p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Stove Tab */}
                    <TabsContent value="stove" className="mt-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredStoves.map(stove => {
                          const price = getStovePrice(stove.brand, stove.model) || stove.price;
                          return (
                            <ProductCard
                              key={stove.id}
                              type="stove"
                              name={stove.brand}
                              subtitle={`${stove.burners}B • ${stove.model}`}
                              price={price}
                              stock={stove.quantity}
                              icon={<ChefHat className="h-6 w-6 text-white" />}
                              onClick={() => addStoveToCart(stove)}
                              badge={`${stove.burners}B`}
                            />
                          );
                        })}
                      </div>
                    </TabsContent>

                    {/* Regulator Tab */}
                    <TabsContent value="regulator" className="mt-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {filteredRegulators.map(reg => {
                          const price = getRegulatorPrice(reg.brand, reg.type) || reg.price || 0;
                          return (
                            <ProductCard
                              key={reg.id}
                              type="regulator"
                              name={reg.brand}
                              subtitle={reg.type}
                              price={price}
                              stock={reg.quantity}
                              icon={<Gauge className="h-6 w-6 text-white" />}
                              onClick={() => addRegulatorToCart(reg)}
                              badge={reg.type}
                            />
                          );
                        })}
                      </div>
                    </TabsContent>

                    {/* All Tab */}
                    <TabsContent value="all" className="mt-4 space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <div className="flex bg-muted rounded-lg p-1">
                          <Button size="sm" variant={mouthSize === "22mm" ? "default" : "ghost"} className="h-7 text-xs" onClick={() => { setMouthSize("22mm"); setWeight("12kg"); }}>22mm</Button>
                          <Button size="sm" variant={mouthSize === "20mm" ? "default" : "ghost"} className="h-7 text-xs" onClick={() => { setMouthSize("20mm"); setWeight("12kg"); }}>20mm</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {/* LPG */}
                        {filteredBrands.slice(0, 6).map(brand => {
                          const stock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
                          const price = getLPGPrice(brand.id, weight, cylinderType, saleType);
                          return (
                            <ProductCard
                              key={brand.id}
                              type="lpg"
                              name={brand.name}
                              subtitle={weight}
                              price={price}
                              stock={stock}
                              color={brand.color}
                              icon={<Cylinder className="h-5 w-5 text-white" />}
                              onClick={() => addLPGToCart(brand)}
                            />
                          );
                        })}
                        {/* Stoves */}
                        {filteredStoves.slice(0, 3).map(stove => (
                          <ProductCard
                            key={stove.id}
                            type="stove"
                            name={stove.brand}
                            subtitle={`${stove.burners}B`}
                            price={getStovePrice(stove.brand, stove.model) || stove.price}
                            stock={stove.quantity}
                            icon={<ChefHat className="h-5 w-5 text-white" />}
                            onClick={() => addStoveToCart(stove)}
                          />
                        ))}
                        {/* Regulators */}
                        {filteredRegulators.slice(0, 3).map(reg => (
                          <ProductCard
                            key={reg.id}
                            type="regulator"
                            name={reg.brand}
                            subtitle={reg.type}
                            price={getRegulatorPrice(reg.brand, reg.type) || reg.price || 0}
                            stock={reg.quantity}
                            icon={<Gauge className="h-5 w-5 text-white" />}
                            onClick={() => addRegulatorToCart(reg)}
                          />
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* ===== STEP 2: RETURN CYLINDER ===== */}
            {currentStep === 2 && (
              <Card className="border-t-4 border-t-amber-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ArrowLeftRight className="h-5 w-5 text-amber-600" />
                        Step 2: Return Cylinder
                      </CardTitle>
                      <CardDescription>
                        Select the empty cylinder brand customer is returning
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs">Optional</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasLPGInCart ? (
                    <>
                      {/* Selected Return Summary */}
                      {selectedReturnBrand && (
                        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                                  style={{ backgroundColor: lpgBrands.find(b => b.id === selectedReturnBrand)?.color || '#6b7280' }}
                                >
                                  <Cylinder className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <p className="font-bold text-emerald-800 dark:text-emerald-200">
                                    Return: {lpgBrands.find(b => b.id === selectedReturnBrand)?.name || 'Selected'}
                                  </p>
                                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                    {isLeakedReturn ? '→ Problem Stock' : '→ Empty Stock'} • {saleItems.find(i => i.type === 'lpg')?.weight || weight}
                                  </p>
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-emerald-600"
                                onClick={() => setSelectedReturnBrand(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Return Cylinder Grid */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {/* No Return Option */}
                        <ReturnCylinderCard
                          brand={{ name: "Skip", color: "#6b7280" }}
                          isSelected={selectedReturnBrand === null}
                          onClick={() => setSelectedReturnBrand(null)}
                          isNoReturn
                        />
                        {/* Available Brands */}
                        {allBrandsForReturn.map(brand => (
                          <ReturnCylinderCard
                            key={brand.id}
                            brand={brand}
                            isSelected={selectedReturnBrand === brand.id}
                            onClick={() => setSelectedReturnBrand(brand.id)}
                          />
                        ))}
                        {/* Custom Brand Option */}
                        <Card 
                          className={`cursor-pointer transition-all duration-200 border-2 border-dashed hover:-translate-y-1 ${
                            showCustomBrandInput ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/60'
                          }`}
                          onClick={() => setShowCustomBrandInput(true)}
                        >
                          <CardContent className="p-0">
                            <div className="h-1.5 w-full bg-muted" />
                            <div className="p-3 flex flex-col items-center gap-2">
                              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-muted flex items-center justify-center">
                                <Plus className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" />
                              </div>
                              <span className="text-xs sm:text-sm font-semibold text-muted-foreground">
                                Add New
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Custom Brand Input */}
                      {showCustomBrandInput && (
                        <Card className="border-primary/50 bg-primary/5">
                          <CardContent className="p-4 space-y-3">
                            <Label className="font-semibold">Enter Custom Brand Name</Label>
                            <div className="flex gap-2">
                              <Input
                                value={customReturnBrand}
                                onChange={(e) => setCustomReturnBrand(e.target.value)}
                                placeholder="e.g., Local Brand XYZ"
                                className="flex-1"
                              />
                              <Button onClick={handleAddCustomBrand} disabled={!customReturnBrand.trim()}>
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                              <Button variant="outline" onClick={() => { setShowCustomBrandInput(false); setCustomReturnBrand(""); }}>
                                Cancel
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              Creates a new entry in inventory with 1 empty cylinder
                            </p>
                          </CardContent>
                        </Card>
                      )}

                      {/* Leak Check Option */}
                      {selectedReturnBrand && (
                        <Card className={`border-2 transition-colors ${isLeakedReturn ? 'border-destructive bg-destructive/5' : 'border-amber-300 bg-amber-50 dark:bg-amber-950/20'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id="leakCheck"
                                checked={isLeakedReturn}
                                onCheckedChange={(checked) => setIsLeakedReturn(checked as boolean)}
                                className="h-5 w-5"
                              />
                              <Label htmlFor="leakCheck" className="cursor-pointer flex-1">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className={`h-4 w-4 ${isLeakedReturn ? 'text-destructive' : 'text-amber-600'}`} />
                                  <span className="font-semibold">Leaked / Problem Cylinder</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Routes to Problem Stock instead of Empty Stock for claims
                                </p>
                              </Label>
                              {isLeakedReturn && (
                                <Badge variant="destructive" className="ml-auto">
                                  Problem Stock
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="py-12 text-center">
                        <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
                        <p className="text-lg font-medium text-muted-foreground">No LPG Refill in Cart</p>
                        <p className="text-sm text-muted-foreground mt-1">This step only applies to Refill transactions</p>
                        <Button className="mt-4" onClick={() => setCurrentStep(3)}>
                          Skip to Checkout
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ===== STEP 3: CUSTOMER & CHECKOUT ===== */}
            {currentStep === 3 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Step 3: Customer Details & Checkout
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Customer Search */}
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search customers by name or phone..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Customer Selection */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                      {/* Walk-in Option */}
                      <Card 
                        className={`cursor-pointer transition-all border-2 ${
                          selectedCustomerId === 'walkin' ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                        onClick={() => handleCustomerSelect('walkin')}
                      >
                        <CardContent className="p-3 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Walk-in</p>
                            <p className="text-[10px] text-muted-foreground">Cash Only</p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Add New Customer */}
                      <Card 
                        className="cursor-pointer transition-all border-2 border-dashed border-border hover:border-primary/50"
                        onClick={() => setShowAddCustomerDialog(true)}
                      >
                        <CardContent className="p-3 flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserPlus className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">New Customer</p>
                            <p className="text-[10px] text-muted-foreground">Add new</p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Existing Customers */}
                      {filteredCustomers.slice(0, 10).map(customer => (
                        <Card 
                          key={customer.id}
                          className={`cursor-pointer transition-all border-2 ${
                            selectedCustomerId === customer.id ? 'border-primary bg-primary/5' : 'border-border'
                          }`}
                          onClick={() => handleCustomerSelect(customer.id)}
                        >
                          <CardContent className="p-3 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{customer.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{customer.phone}</p>
                            </div>
                            {customer.total_due > 0 && (
                              <Badge variant="destructive" className="text-[9px] px-1">
                                Due: ৳{customer.total_due}
                              </Badge>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Customer Form (Auto-filled) */}
                  {selectedCustomerId !== 'walkin' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg">
                      <div>
                        <Label className="text-xs">Name</Label>
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
                  )}

                  {/* Driver Selection (Optional) */}
                  {drivers.length > 0 && (
                    <div>
                      <Label className="text-xs mb-1 block">Assign Driver (Optional)</Label>
                      <Select value={selectedDriverId || ""} onValueChange={(v) => setSelectedDriverId(v || null)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select driver for delivery..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No Driver</SelectItem>
                          {drivers.map(d => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Discount */}
                  <div>
                    <Label className="text-xs">Discount (৳)</Label>
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ===== RIGHT SIDEBAR: CART ===== */}
          <div className="space-y-4">
            <Card className="sticky top-4 shadow-lg border-2">
              <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-primary/5">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                      <ShoppingCart className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <span>Cart</span>
                  </span>
                  <Badge variant="default" className="text-sm px-3">{saleItems.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {saleItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                      <ShoppingCart className="h-8 w-8 opacity-30" />
                    </div>
                    <p className="font-medium">Cart is empty</p>
                    <p className="text-xs mt-1">Select products to add</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[280px] pr-2">
                    <div className="space-y-2">
                      {saleItems.map(item => (
                        <Card key={item.id} className="border shadow-sm">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm leading-tight">{item.name}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{item.details}</p>
                                {/* Show return brand if assigned */}
                                {item.returnBrand && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <ArrowLeftRight className="h-3 w-3 text-amber-600" />
                                    <span className="text-[10px] text-amber-600 font-medium">
                                      Return: {item.returnBrand} {item.isLeakedReturn && '(Leaked)'}
                                    </span>
                                  </div>
                                )}
                                <p className="text-base font-bold text-primary mt-1">
                                  {BANGLADESHI_CURRENCY_SYMBOL}{(item.price * item.quantity).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateItemQuantity(item.id, -1)}>
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-7 text-center text-sm font-bold">{item.quantity}</span>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateItemQuantity(item.id, 1)}>
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => removeItem(item.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Return Cylinder Summary (visible in Step 2+) */}
                {selectedReturnBrand && currentStep >= 2 && (
                  <>
                    <Separator />
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4 text-amber-600" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">Return Cylinder</p>
                          <p className="text-sm font-bold text-amber-700 dark:text-amber-300">
                            {lpgBrands.find(b => b.id === selectedReturnBrand)?.name || 'Custom'}
                            {isLeakedReturn && <span className="text-destructive ml-1">(Leaked)</span>}
                          </p>
                        </div>
                        <Cylinder className="h-5 w-5 text-amber-600" />
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Totals */}
                <div className="space-y-2 bg-muted/30 p-3 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{BANGLADESHI_CURRENCY_SYMBOL}{subtotal.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span>Discount</span>
                      <span className="font-medium">-{BANGLADESHI_CURRENCY_SYMBOL}{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Action Buttons based on Step */}
                <div className="space-y-2 pt-2">
                  {currentStep === 1 && (
                    <Button 
                      className="w-full h-12 text-base font-semibold shadow-lg" 
                      size="lg"
                      disabled={saleItems.length === 0}
                      onClick={() => setCurrentStep(hasLPGInCart ? 2 : 3)}
                    >
                      {hasLPGInCart ? 'Select Return Cylinder' : 'Proceed to Checkout'}
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                  )}
                  
                  {currentStep === 2 && (
                    <div className="space-y-2">
                      <Button className="w-full h-12 text-base font-semibold shadow-lg" onClick={applyReturnBrandToCart}>
                        Proceed to Checkout
                        <ChevronRight className="h-5 w-5 ml-2" />
                      </Button>
                      <Button variant="outline" className="w-full" onClick={() => setCurrentStep(1)}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back to Products
                      </Button>
                    </div>
                  )}
                  
                  {currentStep === 3 && (
                    <div className="space-y-3">
                      {/* Customer Summary */}
                      <div className="p-3 bg-muted/30 rounded-lg text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {selectedCustomer?.name || customerName || 'Walk-in Customer'}
                          </span>
                        </div>
                        {(selectedCustomer?.phone || customerPhone) && (
                          <p className="text-xs text-muted-foreground ml-6">
                            {selectedCustomer?.phone || customerPhone}
                          </p>
                        )}
                      </div>

                      {/* Complete Sale Button */}
                      <Button 
                        className="w-full h-14 text-lg font-bold shadow-xl bg-emerald-600 hover:bg-emerald-700" 
                        size="lg"
                        disabled={processing || saleItems.length === 0}
                        onClick={() => handleCompleteSale('completed')}
                      >
                        {processing ? (
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                        )}
                        Complete Sale
                      </Button>

                      {/* Save as Due Button */}
                      {selectedCustomerId !== 'walkin' && (
                        <Button 
                          variant="outline" 
                          className="w-full h-11 font-semibold border-2 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          disabled={processing}
                          onClick={() => handleCompleteSale('pending')}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Save as Due (Credit)
                        </Button>
                      )}

                      {/* Back Button */}
                      <Button variant="ghost" className="w-full" onClick={() => setCurrentStep(hasLPGInCart ? 2 : 1)}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            {recentTransactions.length > 0 && (
              <Card className="border-l-4 border-l-amber-500 shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="h-4 w-4 text-amber-600" />
                    <span>Recent Transactions</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">Void in 5min</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentTransactions.slice(0, 3).map(txn => (
                    <Card key={txn.id} className="border">
                      <CardContent className="p-2 flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-xs">{txn.transactionNumber}</p>
                          <p className="text-primary font-bold text-sm">৳{txn.total.toLocaleString()}</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs border-destructive/50 text-destructive hover:bg-destructive/10"
                          onClick={() => { setTransactionToVoid(txn); setShowVoidDialog(true); }}
                        >
                          <Undo2 className="h-3 w-3 mr-1" />
                          Void
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* ===== DIALOGS ===== */}
        
        {/* Add Customer Dialog */}
        <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Name *</Label>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
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

        {/* Void Confirmation Dialog */}
        <Dialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Void Transaction?</DialogTitle>
              <DialogDescription>
                This will cancel {transactionToVoid?.transactionNumber} and restore inventory.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVoidDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleVoidTransaction}>Void Transaction</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Print Type Dialog */}
        <Dialog open={showPrintTypeDialog} onOpenChange={setShowPrintTypeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Print Receipt</DialogTitle>
            </DialogHeader>
            <div className="flex gap-4 py-4">
              <Button className="flex-1" onClick={() => { setPrintType('bill'); setShowPrintTypeDialog(false); setShowInvoiceDialog(true); }}>
                <FileText className="h-4 w-4 mr-2" />
                Print Bill
              </Button>
              <Button className="flex-1" variant="outline" onClick={() => { setPrintType('gatepass'); setShowPrintTypeDialog(false); setShowInvoiceDialog(true); }}>
                <Truck className="h-4 w-4 mr-2" />
                Gate Pass
              </Button>
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setShowPrintTypeDialog(false)}>
              Skip Printing
            </Button>
          </DialogContent>
        </Dialog>

        {/* Invoice Dialog */}
        {showInvoiceDialog && lastTransaction && (
          <InvoiceDialog
            open={showInvoiceDialog}
            onOpenChange={setShowInvoiceDialog}
            invoiceData={lastTransaction}
          />
        )}

        {/* Barcode Scanner */}
        <BarcodeScanner
          open={showBarcodeScanner}
          onOpenChange={setShowBarcodeScanner}
          onProductFound={(product) => {
            if (product.type === 'lpg') {
              const brand = lpgBrands.find(b => b.id === product.id);
              if (brand) addLPGToCart(brand);
            }
            setShowBarcodeScanner(false);
          }}
        />
      </div>
    </TooltipProvider>
  );
};
