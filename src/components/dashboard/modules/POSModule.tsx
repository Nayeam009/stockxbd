import { useState, useEffect, useMemo, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { supabase } from "@/integrations/supabase/client";
import { parsePositiveNumber, sanitizeString, customerSchema } from "@/lib/validationSchemas";
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { POSProductGrid } from "@/components/pos/POSProductGrid";
import { POSQuickCart, CartItem } from "@/components/pos/POSQuickCart";
import { POSCheckoutBar } from "@/components/pos/POSCheckoutBar";
import { POSEditSheet } from "@/components/pos/POSEditSheet";
import { ProductCardData } from "@/components/pos/POSProductCard";
import { generateInvoicePDF } from "@/lib/pdfExport";

// Types
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

export const POSModule = () => {
  const { t } = useLanguage();
  
  // Data states
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [productPrices, setProductPrices] = useState<ProductPrice[]>([]);
  
  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>("walkin");
  const [discount, setDiscount] = useState("0");
  
  // UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  // Fetch data on mount
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

    // Real-time subscription
    const channel = supabase
      .channel('pos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lpg_brands' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stoves' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regulators' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Price helper functions
  const getLPGPrice = useCallback((brandId: string, cylType: 'refill' | 'package', saleTp: 'retail' | 'wholesale') => {
    const brand = lpgBrands.find(b => b.id === brandId);
    if (!brand) return 0;
    
    const priceEntry = productPrices.find(
      p => p.product_type === 'lpg' && 
           p.brand_id === brandId
    );
    
    if (!priceEntry) return 0;
    
    if (cylType === 'package') {
      return priceEntry.package_price || priceEntry.retail_price;
    }
    return saleTp === 'wholesale' ? priceEntry.distributor_price : priceEntry.retail_price;
  }, [lpgBrands, productPrices]);

  const getStovePrice = useCallback((brand: string, burners: number) => {
    const burnerType = burners === 1 ? 'Single' : 'Double';
    const priceEntry = productPrices.find(
      p => p.product_type === 'stove' && 
           p.product_name.toLowerCase().includes(brand.toLowerCase()) &&
           p.product_name.toLowerCase().includes(burnerType.toLowerCase())
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

  // Transform data to product cards
  const products: ProductCardData[] = useMemo(() => {
    const lpgProducts: ProductCardData[] = lpgBrands.map(brand => {
      const price = getLPGPrice(brand.id, 'refill', 'retail');
      return {
        id: `lpg-${brand.id}`,
        type: 'lpg',
        name: brand.name,
        subtitle: `${brand.weight} • ${brand.size}`,
        price: price,
        stock: brand.refill_cylinder + brand.package_cylinder,
        color: brand.color,
        weight: brand.weight,
        brandId: brand.id,
        cylinderType: 'refill',
      };
    });

    const stoveProducts: ProductCardData[] = stoves.map(stove => {
      const price = getStovePrice(stove.brand, stove.burners) || stove.price;
      return {
        id: `stove-${stove.id}`,
        type: 'stove',
        name: `${stove.brand} ${stove.model}`,
        subtitle: `${stove.burners} Burner`,
        price: price,
        stock: stove.quantity,
        stoveId: stove.id,
        burners: stove.burners,
      };
    });

    const regulatorProducts: ProductCardData[] = regulators.map(reg => {
      const price = getRegulatorPrice(reg.brand, reg.type);
      return {
        id: `reg-${reg.id}`,
        type: 'regulator',
        name: reg.brand,
        subtitle: reg.type,
        price: price,
        stock: reg.quantity,
        regulatorId: reg.id,
        regulatorType: reg.type,
      };
    });

    return [...lpgProducts, ...stoveProducts, ...regulatorProducts];
  }, [lpgBrands, stoves, regulators, getLPGPrice, getStovePrice, getRegulatorPrice]);

  // Quick add to cart (one-tap)
  const handleQuickAdd = useCallback((product: ProductCardData) => {
    // Check if same product already in cart
    const existingIndex = cartItems.findIndex(item => {
      if (product.type === 'lpg') return item.brandId === product.brandId && item.cylinderType === 'refill';
      if (product.type === 'stove') return item.stoveId === product.stoveId;
      if (product.type === 'regulator') return item.regulatorId === product.regulatorId;
      return false;
    });

    if (existingIndex >= 0) {
      // Increase quantity
      const updated = [...cartItems];
      const item = updated[existingIndex];
      
      // Check stock
      let maxStock = product.stock;
      if (product.type === 'lpg') {
        const brand = lpgBrands.find(b => b.id === product.brandId);
        maxStock = brand?.refill_cylinder || 0;
      }
      
      if (item.quantity >= maxStock) {
        toast({ title: "Maximum stock reached", variant: "destructive" });
        return;
      }
      
      updated[existingIndex] = { ...item, quantity: item.quantity + 1 };
      setCartItems(updated);
      toast({ title: `${product.name} quantity updated` });
      return;
    }

    // Add new item with smart defaults
    const newItem: CartItem = {
      id: `${product.type}-${Date.now()}`,
      type: product.type,
      name: product.type === 'lpg' 
        ? `${product.name} - Refill` 
        : product.name,
      details: product.subtitle,
      price: product.price,
      quantity: 1,
      brandId: product.brandId,
      stoveId: product.stoveId,
      regulatorId: product.regulatorId,
      cylinderType: product.type === 'lpg' ? 'refill' : undefined,
    };

    setCartItems(prev => [...prev, newItem]);
    toast({ title: `Added ${product.name}`, description: `${BANGLADESHI_CURRENCY_SYMBOL}${product.price}` });
  }, [cartItems, lpgBrands]);

  // Update cart item quantity
  const handleUpdateQuantity = useCallback((id: string, change: number) => {
    setCartItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const newQty = item.quantity + change;
      if (newQty < 1) return item;
      
      // Check stock
      if (item.type === 'lpg' && item.brandId) {
        const brand = lpgBrands.find(b => b.id === item.brandId);
        const maxStock = item.cylinderType === 'refill' 
          ? brand?.refill_cylinder || 0 
          : brand?.package_cylinder || 0;
        if (newQty > maxStock) {
          toast({ title: `Only ${maxStock} in stock`, variant: "destructive" });
          return item;
        }
      } else if (item.type === 'stove' && item.stoveId) {
        const stove = stoves.find(s => s.id === item.stoveId);
        if (newQty > (stove?.quantity || 0)) {
          toast({ title: `Only ${stove?.quantity} in stock`, variant: "destructive" });
          return item;
        }
      } else if (item.type === 'regulator' && item.regulatorId) {
        const reg = regulators.find(r => r.id === item.regulatorId);
        if (newQty > (reg?.quantity || 0)) {
          toast({ title: `Only ${reg?.quantity} in stock`, variant: "destructive" });
          return item;
        }
      }
      
      return { ...item, quantity: newQty };
    }));
  }, [lpgBrands, stoves, regulators]);

  // Remove item from cart
  const handleRemoveItem = useCallback((id: string) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  }, []);

  // Update edited item
  const handleUpdateItem = useCallback((updatedItem: CartItem) => {
    setCartItems(prev => prev.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
    setEditingItem(null);
  }, []);

  // Customer selection
  const handleCustomerSelect = useCallback((customerId: string) => {
    if (customerId === "walkin") {
      setSelectedCustomerId("walkin");
    } else {
      setSelectedCustomerId(customerId);
    }
  }, []);

  // Add new customer
  const handleAddCustomer = useCallback(async (newCustomer: { name: string; phone: string; address: string }) => {
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
      throw error;
    }

    toast({ title: "Customer added" });
    setCustomers(prev => [...prev, data]);
    setSelectedCustomerId(data.id);
  }, []);

  // Barcode scanner result
  const handleBarcodeProductFound = useCallback((product: any) => {
    const matchedProduct = products.find(p => {
      if (product.type === 'lpg') return p.brandId === product.id;
      if (product.type === 'stove') return p.stoveId === product.id;
      if (product.type === 'regulator') return p.regulatorId === product.id;
      return false;
    });

    if (matchedProduct) {
      handleQuickAdd(matchedProduct);
    }
    setShowBarcodeScanner(false);
  }, [products, handleQuickAdd]);

  // Calculate totals
  const subtotal = useMemo(() => 
    cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cartItems]
  );
  const discountAmount = parsePositiveNumber(discount, 10000000);
  const total = Math.max(0, subtotal - discountAmount);

  // Complete sale
  const handleCompleteSale = useCallback(async (paymentStatus: 'completed' | 'pending') => {
    if (cartItems.length === 0) {
      toast({ title: "No items in cart", variant: "destructive" });
      return;
    }

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in", variant: "destructive" });
        return;
      }

      // Generate transaction number
      const { data: txnNum } = await supabase.rpc('generate_transaction_number');
      const transactionNumber = txnNum || `TXN-${Date.now()}`;

      const customerId = selectedCustomerId === "walkin" ? null : selectedCustomerId;
      const selectedCustomer = customerId ? customers.find(c => c.id === customerId) : null;

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
          created_by: user.id
        })
        .select()
        .single();

      if (txnError) throw txnError;

      // Get default product ID for items
      const { data: defaultProduct } = await supabase
        .from('products')
        .select('id')
        .limit(1)
        .single();

      // Insert transaction items
      if (transaction) {
        const items = cartItems.map(item => ({
          transaction_id: transaction.id,
          product_id: defaultProduct?.id || item.brandId || item.stoveId || item.regulatorId || transaction.id,
          product_name: `${item.name} - ${item.details}`,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          created_by: user.id
        }));

        await supabase.from('pos_transaction_items').insert(items);
      }

      // Update inventory
      for (const item of cartItems) {
        if (item.type === 'lpg' && item.brandId) {
          const brand = lpgBrands.find(b => b.id === item.brandId);
          if (!brand) continue;

          if (item.cylinderType === 'refill') {
            const newCount = Math.max(0, brand.refill_cylinder - item.quantity);
            await supabase.from('lpg_brands').update({ refill_cylinder: newCount }).eq('id', item.brandId);
            setLpgBrands(prev => prev.map(b => b.id === item.brandId ? { ...b, refill_cylinder: newCount } : b));

            // Handle return cylinder
            if (item.returnBrandId) {
              const returnBrand = lpgBrands.find(b => b.id === item.returnBrandId);
              if (returnBrand) {
                const newEmptyCount = returnBrand.empty_cylinder + item.quantity;
                await supabase.from('lpg_brands').update({ empty_cylinder: newEmptyCount }).eq('id', item.returnBrandId);
                setLpgBrands(prev => prev.map(b => b.id === item.returnBrandId ? { ...b, empty_cylinder: newEmptyCount } : b));
              }
            }
          } else {
            const newCount = Math.max(0, brand.package_cylinder - item.quantity);
            await supabase.from('lpg_brands').update({ package_cylinder: newCount }).eq('id', item.brandId);
            setLpgBrands(prev => prev.map(b => b.id === item.brandId ? { ...b, package_cylinder: newCount } : b));
          }
        } else if (item.type === 'stove' && item.stoveId) {
          const stove = stoves.find(s => s.id === item.stoveId);
          if (stove) {
            const newQty = Math.max(0, stove.quantity - item.quantity);
            await supabase.from('stoves').update({ quantity: newQty }).eq('id', item.stoveId);
            setStoves(prev => prev.map(s => s.id === item.stoveId ? { ...s, quantity: newQty } : s));
          }
        } else if (item.type === 'regulator' && item.regulatorId) {
          const reg = regulators.find(r => r.id === item.regulatorId);
          if (reg) {
            const newQty = Math.max(0, reg.quantity - item.quantity);
            await supabase.from('regulators').update({ quantity: newQty }).eq('id', item.regulatorId);
            setRegulators(prev => prev.map(r => r.id === item.regulatorId ? { ...r, quantity: newQty } : r));
          }
        }
      }

      // Update customer dues if pending
      if (customerId && paymentStatus === 'pending') {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          const packageCount = cartItems.filter(i => i.type === 'lpg' && i.cylinderType === 'package').reduce((s, i) => s + i.quantity, 0);
          await supabase.from('customers').update({
            total_due: (customer.total_due || 0) + total,
            cylinders_due: (customer.cylinders_due || 0) + packageCount,
            billing_status: 'pending',
            last_order_date: new Date().toISOString()
          }).eq('id', customerId);
        }
      }

      // Prepare invoice
      setLastTransaction({
        invoiceNumber: transactionNumber,
        date: new Date(),
        customer: {
          name: selectedCustomer?.name || "Walk-in Customer",
          phone: selectedCustomer?.phone,
          address: selectedCustomer?.address
        },
        items: cartItems.map(item => ({
          name: item.name,
          description: item.details,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.price * item.quantity
        })),
        subtotal,
        discount: discountAmount,
        total,
        paymentStatus: paymentStatus === 'completed' ? 'paid' : 'due',
        paymentMethod: 'cash'
      });

      setShowInvoiceDialog(true);
      setCartItems([]);
      setSelectedCustomerId("walkin");
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
  }, [cartItems, selectedCustomerId, customers, subtotal, discountAmount, total, lpgBrands, stoves, regulators]);

  // Export PDF
  const handleExportPDF = useCallback(async () => {
    if (!lastTransaction) return;
    try {
      await generateInvoicePDF(lastTransaction);
      toast({ title: "PDF exported successfully" });
    } catch {
      toast({ title: "Failed to export PDF", variant: "destructive" });
    }
  }, [lastTransaction]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4">
      {/* Product Grid - Main Area */}
      <div className="flex-1 min-h-0 lg:min-w-0">
        <POSProductGrid
          products={products}
          onQuickAdd={handleQuickAdd}
          onScanClick={() => setShowBarcodeScanner(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      {/* Cart & Checkout - Sidebar on desktop, bottom on mobile */}
      <div className="lg:w-[400px] xl:w-[450px] flex flex-col bg-card rounded-xl border shadow-sm overflow-hidden">
        {/* Cart */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <POSQuickCart
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onEditItem={(item) => setEditingItem(item)}
          />
        </div>

        {/* Checkout Bar */}
        <POSCheckoutBar
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          onCustomerSelect={handleCustomerSelect}
          onAddCustomer={handleAddCustomer}
          subtotal={subtotal}
          discount={discount}
          onDiscountChange={setDiscount}
          total={total}
          onCompleteSale={handleCompleteSale}
          isProcessing={processing}
          itemCount={cartItems.length}
        />
      </div>

      {/* Modals */}
      <BarcodeScanner
        open={showBarcodeScanner}
        onOpenChange={setShowBarcodeScanner}
        onProductFound={handleBarcodeProductFound}
      />

      <POSEditSheet
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        item={editingItem}
        lpgBrands={lpgBrands}
        onUpdate={handleUpdateItem}
        getPrice={getLPGPrice}
      />

      <InvoiceDialog
        open={showInvoiceDialog}
        onOpenChange={setShowInvoiceDialog}
        invoiceData={lastTransaction}
        onExportPDF={handleExportPDF}
      />
    </div>
  );
};
