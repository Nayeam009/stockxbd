import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  Download
} from "lucide-react";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { generateInvoicePDF } from "@/lib/pdfExport";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { supabase } from "@/integrations/supabase/client";
import { parsePositiveNumber, parsePositiveInt, sanitizeString, posTransactionSchema, customerSchema } from "@/lib/validationSchemas";
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

interface CustomProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
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
  brandId?: string;  // LPG brand ID for inventory tracking
  stoveId?: string;  // Stove ID for inventory tracking
  regulatorId?: string;  // Regulator ID for inventory tracking
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
const mouthSizes = ["20mm", "22mm"];

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
  
  // Cart & Customer
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState("0");
  
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

  // Barcode Scanner
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
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

  // Auto-populate LPG price when brand/weight/type changes
  useEffect(() => {
    if (sellingBrand && weight && productPrices.length > 0) {
      const autoPrice = getLPGPrice(sellingBrand, weight, cylinderType, saleType);
      if (autoPrice > 0) {
        setPrice(autoPrice.toString());
      }
    }
  }, [sellingBrand, weight, cylinderType, saleType, productPrices]);

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
  }, [selectedRegulator, regulators, productPrices]);

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

  // Get price from product_prices table
  const getStovePrice = (brand: string, burners: number) => {
    const burnerType = burners === 1 ? 'Single' : 'Double';
    const priceEntry = productPrices.find(
      p => p.product_type === 'stove' && 
           p.product_name.toLowerCase().includes(brand.toLowerCase()) &&
           p.product_name.toLowerCase().includes(burnerType.toLowerCase())
    );
    return priceEntry?.retail_price || 0;
  };

  const getRegulatorPrice = (brand: string, type: string) => {
    const priceEntry = productPrices.find(
      p => p.product_type === 'regulator' && 
           p.product_name.toLowerCase().includes(brand.toLowerCase()) &&
           p.product_name.toLowerCase().includes(type.toLowerCase())
    );
    return priceEntry?.retail_price || 0;
  };

  const getLPGPrice = (brandId: string, weight: string, cylinderType: 'refill' | 'package', saleType: 'retail' | 'wholesale') => {
    const brand = lpgBrands.find(b => b.id === brandId);
    if (!brand) return 0;
    
    const priceEntry = productPrices.find(
      p => p.product_type === 'lpg' && 
           p.brand_id === brandId &&
           p.size?.includes(weight)
    );
    
    if (!priceEntry) return 0;
    
    if (cylinderType === 'package') {
      return priceEntry.package_price || priceEntry.retail_price;
    }
    return saleType === 'wholesale' ? priceEntry.distributor_price : priceEntry.retail_price;
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

  const addLPGToSale = () => {
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

    // Check stock availability
    const availableStock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
    if (validatedQuantity > availableStock) {
      toast({ title: `Only ${availableStock} cylinders available in stock`, variant: "destructive" });
      return;
    }

    const returnBrandObj = returnBrand && returnBrand !== "none" ? lpgBrands.find(b => b.id === returnBrand) : undefined;
    
    const newItem: SaleItem = {
      id: `lpg-${Date.now()}`,
      type: 'lpg',
      name: `${brand.name} - ${cylinderType === 'refill' ? 'Refill' : 'Package'}`,
      details: `${weight}kg, ${mouthSize}, ${saleType}${returnBrandObj ? `, Return: ${returnBrandObj.name}` : ''}`,
      price: validatedPrice,
      quantity: validatedQuantity,
      returnBrand: returnBrandObj?.name,
      returnBrandId: returnBrandObj?.id,
      cylinderType,
      brandId: sellingBrand
    };

    setSaleItems([...saleItems, newItem]);
    setSellingBrand("");
    setReturnBrand("");
    setWeight("");
    setPrice("0");
    setQuantity("1");
    toast({ title: "Added to sale" });
  };

  const addStoveToSale = () => {
    const validatedQuantity = parsePositiveInt(stoveQuantity, 10000);
    
    if (!selectedStove) {
      toast({ title: "Please select a stove", variant: "destructive" });
      return;
    }

    const stove = stoves.find(s => s.id === selectedStove);
    if (!stove) return;

    // Check stock
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

    // Check stock
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
      details: 'Custom Product',
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
      // Set up LPG form with scanned product
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

  const handleCompleteSale = async (paymentStatus: 'completed' | 'pending') => {
    if (saleItems.length === 0) {
      toast({ title: "No items in sale", variant: "destructive" });
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
          created_by: user.id
        })
        .select()
        .single();

      if (txnError) throw txnError;

      // Get a product to link items
      const { data: defaultProduct } = await supabase
        .from('products')
        .select('id')
        .limit(1)
        .single();

      // Insert transaction items
      if (transaction && defaultProduct) {
        const items = saleItems.map(item => ({
          transaction_id: transaction.id,
          product_id: defaultProduct.id,
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
          // Refill sale: deduct from refill_cylinder
          const newRefillCount = Math.max(0, brand.refill_cylinder - item.quantity);
          await supabase
            .from('lpg_brands')
            .update({ refill_cylinder: newRefillCount })
            .eq('id', item.brandId);
          
          // Update local state
          setLpgBrands(prev => prev.map(b => 
            b.id === item.brandId ? { ...b, refill_cylinder: newRefillCount } : b
          ));

          // If return brand specified, add to empty_cylinder of return brand
          if (item.returnBrandId) {
            const returnBrand = lpgBrands.find(b => b.id === item.returnBrandId);
            if (returnBrand) {
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
        } else if (item.cylinderType === 'package') {
          // Package sale (new connection): deduct from package_cylinder
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
          const newCylindersDue = (currentCustomer.cylinders_due || 0) + packageCylinderCount;

          await supabase
            .from('customers')
            .update({
              total_due: newTotalDue,
              cylinders_due: newCylindersDue,
              billing_status: 'pending',
              last_order_date: new Date().toISOString()
            })
            .eq('id', customerId);

          // Update local state
          setCustomers(customers.map(c => 
            c.id === customerId 
              ? { ...c, total_due: newTotalDue, cylinders_due: newCylindersDue, billing_status: 'pending' }
              : c
          ));
        }
      } else if (customerId) {
        // Update last order date for paid sales
        await supabase
          .from('customers')
          .update({ last_order_date: new Date().toISOString() })
          .eq('id', customerId);
      }

      // Prepare invoice data
      const displayName = selectedCustomer?.name || sanitizedCustomerName || "Walk-in Customer";
      setLastTransaction({
        invoiceNumber: transactionNumber,
        date: new Date(),
        customer: {
          name: displayName,
          phone: selectedCustomer?.phone || undefined,
          address: selectedCustomer?.address || undefined
        },
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

      setShowInvoiceDialog(true);
      
      // Clear form
      setSaleItems([]);
      setCustomerName("");
      setSelectedCustomerId(null);
      setSelectedCustomer(null);
      setDiscount("0");

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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">{t('pos')}</h2>
        <p className="text-muted-foreground">Quick sales and billing system with customer integration</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Side - Product Entry */}
        <div className="lg:col-span-2 space-y-4">
          {/* Product Search Bar with Barcode Scanner */}
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products by name or SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => setShowBarcodeScanner(true)} variant="outline" className="gap-2">
                  <ScanLine className="h-4 w-4" />
                  Scan
                </Button>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted">
              <TabsTrigger value="lpg" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                LPG Cylinder
              </TabsTrigger>
              <TabsTrigger value="stove" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Gas Stove
              </TabsTrigger>
              <TabsTrigger value="regulator" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Regulator
              </TabsTrigger>
              <TabsTrigger value="custom" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Custom
              </TabsTrigger>
            </TabsList>

            {/* LPG Cylinder Tab */}
            <TabsContent value="lpg">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Add LPG Cylinder Sale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Cylinder Type & Sale Type */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Cylinder Type</Label>
                      <RadioGroup value={cylinderType} onValueChange={(v) => setCylinderType(v as "refill" | "package")} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="refill" id="refill" className="text-primary border-primary" />
                          <Label htmlFor="refill" className="cursor-pointer">Refill</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="package" id="package" />
                          <Label htmlFor="package" className="cursor-pointer">Package (New Cylinder)</Label>
                        </div>
                      </RadioGroup>
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Sale Type</Label>
                      <RadioGroup value={saleType} onValueChange={(v) => setSaleType(v as "retail" | "wholesale")} className="flex gap-4">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="retail" id="retail" className="text-primary border-primary" />
                          <Label htmlFor="retail" className="cursor-pointer">Retail</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="wholesale" id="wholesale" />
                          <Label htmlFor="wholesale" className="cursor-pointer">Wholesale</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  {/* Brand Selection */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Selling Brand</Label>
                      <Select value={sellingBrand} onValueChange={setSellingBrand}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select brand..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredBrands.map(brand => {
                            const stock = cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
                            return (
                              <SelectItem key={brand.id} value={brand.id}>
                                <div className="flex items-center gap-2 justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }} />
                                    {brand.name}
                                  </div>
                                  <Badge variant={stock > 0 ? "secondary" : "destructive"} className="ml-2">
                                    {stock} in stock
                                  </Badge>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      {sellingBrand && (
                        <div className="flex items-center gap-1 text-xs mt-1">
                          <Package className="h-3 w-3" />
                          <span className={getLPGStock(sellingBrand, cylinderType) > 0 ? "text-green-600" : "text-destructive"}>
                            {getLPGStock(sellingBrand, cylinderType)} available
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Return Brand (Optional)</Label>
                      <Select value={returnBrand} onValueChange={setReturnBrand}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select brand..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {filteredBrands.map(brand => (
                            <SelectItem key={brand.id} value={brand.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.color }} />
                                {brand.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Weight, Size, Price, Quantity */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Mouth Size</Label>
                      <Select value={mouthSize} onValueChange={(val) => {
                        setMouthSize(val);
                        setWeight(""); // Reset weight when mouth size changes
                        setSellingBrand(""); // Reset brand
                      }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {mouthSizes.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Weight</Label>
                      <Select value={weight} onValueChange={(val) => {
                        setWeight(val);
                        setSellingBrand(""); // Reset brand when weight changes
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {(mouthSize === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM).map(w => (
                            <SelectItem key={w} value={w}>{w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input 
                        type="number" 
                        value={price} 
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input 
                        type="number" 
                        value={quantity} 
                        onChange={(e) => setQuantity(e.target.value)}
                        min="1"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={addLPGToSale} 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Sale
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gas Stove Tab */}
            <TabsContent value="stove">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Add Gas Stove Sale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select Stove</Label>
                      <Select value={selectedStove} onValueChange={setSelectedStove}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stove..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredStoves.map(stove => (
                            <SelectItem key={stove.id} value={stove.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{stove.brand} {stove.model} ({stove.burners} Burner) - {BANGLADESHI_CURRENCY_SYMBOL}{stove.price}</span>
                                <Badge variant={stove.quantity > 0 ? "secondary" : "destructive"} className="ml-2">
                                  {stove.quantity} in stock
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedStove && (
                        <div className="flex items-center gap-1 text-xs mt-1">
                          <Package className="h-3 w-3" />
                          <span className={getStoveStock(selectedStove) > 0 ? "text-green-600" : "text-destructive"}>
                            {getStoveStock(selectedStove)} available
                          </span>
                          {getStoveStock(selectedStove) <= 5 && getStoveStock(selectedStove) > 0 && (
                            <span className="flex items-center text-warning ml-2">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Low stock
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input 
                        type="number" 
                        value={stoveQuantity} 
                        onChange={(e) => setStoveQuantity(e.target.value)}
                        min="1"
                        max={selectedStove ? getStoveStock(selectedStove) : undefined}
                      />
                    </div>
                  </div>
                  <Button onClick={addStoveToSale} className="w-full bg-primary hover:bg-primary/90" disabled={selectedStove && getStoveStock(selectedStove) === 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Sale
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Regulator Tab */}
            <TabsContent value="regulator">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Add Regulator Sale</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Select Regulator</Label>
                      <Select value={selectedRegulator} onValueChange={setSelectedRegulator}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select regulator..." />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredRegulators.map(reg => (
                            <SelectItem key={reg.id} value={reg.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{reg.brand} ({reg.type})</span>
                                <Badge variant={reg.quantity > 0 ? "secondary" : "destructive"} className="ml-2">
                                  {reg.quantity} in stock
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedRegulator && (
                        <div className="flex items-center gap-1 text-xs mt-1">
                          <Package className="h-3 w-3" />
                          <span className={getRegulatorStock(selectedRegulator) > 0 ? "text-green-600" : "text-destructive"}>
                            {getRegulatorStock(selectedRegulator)} available
                          </span>
                          {getRegulatorStock(selectedRegulator) <= 5 && getRegulatorStock(selectedRegulator) > 0 && (
                            <span className="flex items-center text-warning ml-2">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Low stock
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input 
                        type="number" 
                        value={regulatorPrice} 
                        onChange={(e) => setRegulatorPrice(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input 
                        type="number" 
                        value={regulatorQuantity} 
                        onChange={(e) => setRegulatorQuantity(e.target.value)}
                        min="1"
                        max={selectedRegulator ? getRegulatorStock(selectedRegulator) : undefined}
                      />
                    </div>
                  </div>
                  <Button onClick={addRegulatorToSale} className="w-full bg-primary hover:bg-primary/90" disabled={selectedRegulator && getRegulatorStock(selectedRegulator) === 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Sale
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Custom Product Tab */}
            <TabsContent value="custom">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-xl">Add Custom Product</CardTitle>
                  <p className="text-sm text-muted-foreground">Add products not in inventory</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Product Name *</Label>
                      <Input 
                        value={customProductName} 
                        onChange={(e) => setCustomProductName(e.target.value)}
                        placeholder="Enter product name..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Price *</Label>
                      <Input 
                        type="number" 
                        value={customProductPrice} 
                        onChange={(e) => setCustomProductPrice(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input 
                        type="number" 
                        value={customProductQuantity} 
                        onChange={(e) => setCustomProductQuantity(e.target.value)}
                        min="1"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={addCustomProductToSale} 
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={!customProductName.trim() || parseFloat(customProductPrice) <= 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Custom Product
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Sale Items */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Sale Items ({saleItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {saleItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No items added yet</p>
              ) : (
                <div className="space-y-3">
                  {saleItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.details}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateItemQuantity(item.id, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateItemQuantity(item.id, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="font-bold w-24 text-right">
                          {BANGLADESHI_CURRENCY_SYMBOL}{item.price * item.quantity}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side - Customer & Summary */}
        <div className="space-y-4">
          {/* Customer Selection */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowAddCustomerDialog(true)}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Customer</Label>
                <Select
                  value={selectedCustomerId || "walkin"}
                  onValueChange={handleCustomerSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walkin">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Walk-in Customer
                      </div>
                    </SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{customer.name}</span>
                          {customer.total_due > 0 && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Due: ৳{customer.total_due}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Customer Info */}
              {selectedCustomer && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{selectedCustomer.name}</p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        fetchCustomerHistory(selectedCustomer.id);
                        setShowCustomerHistoryDialog(true);
                      }}
                    >
                      <History className="h-4 w-4 mr-1" />
                      History
                    </Button>
                  </div>
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {selectedCustomer.phone}
                    </div>
                  )}
                  {selectedCustomer.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {selectedCustomer.address}
                    </div>
                  )}
                  <div className="flex gap-4 pt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Due Amount:</span>
                      <span className={`ml-1 font-medium ${selectedCustomer.total_due > 0 ? 'text-destructive' : 'text-green-500'}`}>
                        ৳{selectedCustomer.total_due || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cylinders Due:</span>
                      <span className={`ml-1 font-medium ${selectedCustomer.cylinders_due > 0 ? 'text-warning' : 'text-green-500'}`}>
                        {selectedCustomer.cylinders_due || 0}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* New customer name input for walk-in */}
              {selectedCustomerId === "walkin" && (
                <Input
                  placeholder="Enter customer name (optional)..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{BANGLADESHI_CURRENCY_SYMBOL}{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-muted-foreground">Discount</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{BANGLADESHI_CURRENCY_SYMBOL}</span>
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-24 text-right"
                      min="0"
                    />
                  </div>
                </div>
                {packageCylinderCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cylinders (Package)</span>
                    <span className="font-medium text-warning">{packageCylinderCount} pcs</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-lg font-bold text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                <Button 
                  onClick={() => handleCompleteSale('completed')}
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={processing || saleItems.length === 0}
                >
                  {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                  Complete Sale (Paid)
                </Button>
                <Button 
                  onClick={() => handleCompleteSale('pending')}
                  variant="secondary"
                  className="w-full bg-warning hover:bg-warning/90 text-warning-foreground"
                  disabled={processing || saleItems.length === 0}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Save as Due (Unpaid)
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  disabled={saleItems.length === 0}
                  onClick={() => {
                    const displayName = selectedCustomer?.name || customerName || "Walk-in Customer";
                    setLastTransaction({
                      invoiceNumber: 'PREVIEW',
                      date: new Date(),
                      customer: {
                        name: displayName,
                        phone: selectedCustomer?.phone || undefined,
                        address: selectedCustomer?.address || undefined
                      },
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
                  <Printer className="h-4 w-4 mr-2" />
                  Preview Invoice
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={showAddCustomerDialog} onOpenChange={setShowAddCustomerDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New Customer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                placeholder="Enter customer name"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                placeholder="+880 1XXX-XXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={newCustomer.address}
                onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                placeholder="Enter address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCustomerDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCustomer} disabled={!newCustomer.name.trim()}>
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer History Dialog */}
      <Dialog open={showCustomerHistoryDialog} onOpenChange={setShowCustomerHistoryDialog}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Purchase History - {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {customerHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No purchase history found</p>
            ) : (
              customerHistory.map(record => (
                <div key={record.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{record.date}</span>
                    <Badge variant={record.status === 'completed' ? 'default' : 'destructive'}>
                      {record.status === 'completed' ? 'Paid' : 'Due'}
                    </Badge>
                  </div>
                  <p className="text-sm">{record.items}</p>
                  <p className="font-medium mt-1">Total: ৳{record.total}</p>
                </div>
              ))
            )}
          </div>
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
  );
};
