import { useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  ShoppingCart, Search, ScanLine, RotateCcw, ArrowLeftRight, Cylinder, ChefHat, Gauge, Plus
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeString, parsePositiveNumber } from "@/lib/validationSchemas";
import { formatBDPhone } from "@/lib/phoneValidation";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { logger } from "@/lib/logger";

// Import modular components
import { usePOSData } from "@/hooks/usePOSData";
import { usePOSCart } from "@/hooks/usePOSCart";
import { POSSkeleton } from "@/components/pos/POSSkeleton";
import { POSQuickStats } from "@/components/pos/POSQuickStats";
import { POSStickyFooter } from "@/components/pos/POSStickyFooter";
import { LPGProductCard, StoveProductCard, RegulatorProductCard, CustomAddCard } from "@/components/pos/POSProductCard";
import { POSSaleTable } from "@/components/pos/POSSaleTable";
import { POSReturnTable } from "@/components/pos/POSReturnTable";
import { POSPaymentDrawer } from "@/components/pos/POSPaymentDrawer";
import { POSCustomerLookup, type CustomerState } from "@/components/pos/POSCustomerLookup";
import { BarcodeScanner } from "@/components/pos/BarcodeScanner";
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";

// Weight options
const WEIGHT_OPTIONS_22MM = ["5.5kg", "12kg", "12.5kg", "25kg", "35kg", "45kg"];
const WEIGHT_OPTIONS_20MM = ["5kg", "10kg", "12kg", "15kg", "21kg", "35kg"];
const DEFAULT_CREDIT_LIMIT = 10000;

interface POSModuleProps {
  userRole?: 'owner' | 'manager';
  userName?: string;
}

export const POSModule = ({ userRole = 'owner', userName = 'User' }: POSModuleProps) => {
  const { t } = useLanguage();
  const isMobile = useIsMobile();

  // Data hook
  const { lpgBrands, stoves, regulators, customers, todayStats, isLoading, getLPGPrice, getStovePrice, getRegulatorPrice } = usePOSData();
  
  // Cart hook
  const cart = usePOSCart();

  // UI State
  const [activeTable, setActiveTable] = useState<'sale' | 'return'>('sale');
  const [activeTab, setActiveTab] = useState("lpg");
  const [cylinderType, setCylinderType] = useState<"refill" | "package">("refill");
  const [saleType, setSaleType] = useState<"retail" | "wholesale">("retail");
  const [mouthSize, setMouthSize] = useState("22mm");
  const [weight, setWeight] = useState("12kg");
  const [productSearch, setProductSearch] = useState("");
  const [processing, setProcessing] = useState(false);

  // Payment State
  const [showPaymentDrawer, setShowPaymentDrawer] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");

  // Customer State
  const [customerState, setCustomerState] = useState<CustomerState>({
    status: 'idle',
    customer: null,
    phoneQuery: '',
    newCustomerName: '',
    newCustomerAddress: ''
  });

  // Dialog State
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showPrintTypeDialog, setShowPrintTypeDialog] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  
  // Custom product dialogs
  const [showCustomBrandDialog, setShowCustomBrandDialog] = useState(false);
  const [customBrand, setCustomBrand] = useState({ name: '', price: '' });

  // Derived state
  const isSaleMode = activeTable === 'sale';
  const weightOptions = mouthSize === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM;
  const hasCustomer = customerState.phoneQuery.length >= 11 || customerState.customer !== null;

  // Filtered products
  const filteredBrands = useMemo(() => {
    return lpgBrands.filter(b => {
      const matchesSize = b.size === mouthSize;
      const matchesWeight = b.weight === weight;
      const matchesSearch = !productSearch || b.name.toLowerCase().includes(productSearch.toLowerCase());
      return matchesSize && matchesWeight && matchesSearch;
    });
  }, [lpgBrands, mouthSize, weight, productSearch]);

  const brandsForReturn = useMemo(() => lpgBrands.filter(b => b.weight === weight), [lpgBrands, weight]);
  
  const filteredStoves = useMemo(() => {
    if (!productSearch) return stoves;
    return stoves.filter(s => s.brand.toLowerCase().includes(productSearch.toLowerCase()) || s.model.toLowerCase().includes(productSearch.toLowerCase()));
  }, [stoves, productSearch]);

  const filteredRegulators = useMemo(() => {
    if (!productSearch) return regulators;
    return regulators.filter(r => r.brand.toLowerCase().includes(productSearch.toLowerCase()));
  }, [regulators, productSearch]);

  // Complete Sale Handler
  const handleCompleteSale = useCallback(async () => {
    const paidAmount = parseFloat(paymentAmount) || 0;
    const finalPaymentStatus = paidAmount >= cart.total ? 'paid' : paidAmount === 0 ? 'due' : 'partial';
    const remainingDue = finalPaymentStatus === 'paid' ? 0 : (cart.total - paidAmount);

    if (cart.saleItems.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }

    if (cart.hasRefillInCart && !cart.isReturnCountMatched) {
      toast({ title: "Return count mismatch", description: `Selling ${cart.refillCylindersCount} but returning ${cart.returnCylindersCount}`, variant: "destructive" });
      return;
    }

    if ((finalPaymentStatus === 'due' || finalPaymentStatus === 'partial') && !hasCustomer) {
      toast({ title: "Credit requires customer", description: "Enter phone number for credit sales", variant: "destructive" });
      return;
    }

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in");

      const { data: ownerId } = await supabase.rpc("get_owner_id");
      const { data: txnNum } = await supabase.rpc('generate_transaction_number');
      const transactionNumber = txnNum || `TXN-${Date.now()}`;

      let customerId = customerState.customer?.id || null;
      const normalizedPhone = customerState.phoneQuery ? formatBDPhone(customerState.phoneQuery) : null;

      // Create new customer if needed
      if (!customerId && customerState.status === 'new' && customerState.newCustomerName) {
        const { data: newCust } = await supabase.from('customers').insert({
          name: sanitizeString(customerState.newCustomerName),
          phone: normalizedPhone,
          address: customerState.newCustomerAddress || null,
          created_by: user.id,
          owner_id: ownerId || user.id
        }).select().single();
        if (newCust) customerId = newCust.id;
      }

      // Create transaction
      const { data: transaction, error: txnError } = await supabase.from('pos_transactions').insert({
        transaction_number: transactionNumber,
        customer_id: customerId,
        subtotal: cart.subtotal,
        discount: cart.discount,
        total: cart.total,
        payment_method: 'cash' as const,
        payment_status: finalPaymentStatus,
        notes: finalPaymentStatus === 'partial' ? `Paid: ৳${paidAmount}, Due: ৳${remainingDue}` : null,
        created_by: user.id,
        owner_id: ownerId || user.id
      }).select().single();

      if (txnError) throw txnError;

      // Insert items
      if (transaction) {
        const items = cart.saleItems.map(item => ({
          transaction_id: transaction.id,
          product_id: item.brandId || item.stoveId || item.regulatorId || null,
          product_name: `${item.name} - ${item.details}`,
          quantity: item.quantity,
          unit_price: item.price,
          total_price: item.price * item.quantity,
          created_by: user.id
        }));
        await supabase.from('pos_transaction_items').insert(items);
      }

      // Update inventory for LPG
      for (const item of cart.saleItems.filter(i => i.type === 'lpg' && i.brandId)) {
        const brand = lpgBrands.find(b => b.id === item.brandId);
        if (!brand) continue;
        const field = item.cylinderType === 'refill' ? 'refill_cylinder' : 'package_cylinder';
        const current = item.cylinderType === 'refill' ? brand.refill_cylinder : brand.package_cylinder;
        await supabase.from('lpg_brands').update({ [field]: Math.max(0, current - item.quantity) }).eq('id', brand.id);
      }

      // Update return cylinders
      for (const returnItem of cart.returnItems) {
        const brand = lpgBrands.find(b => b.id === returnItem.brandId);
        if (!brand) continue;
        const field = returnItem.isLeaked ? 'problem_cylinder' : 'empty_cylinder';
        const current = returnItem.isLeaked ? brand.problem_cylinder : brand.empty_cylinder;
        await supabase.from('lpg_brands').update({ [field]: current + returnItem.quantity }).eq('id', returnItem.brandId);
      }

      // Update customer dues
      if ((finalPaymentStatus === 'due' || finalPaymentStatus === 'partial') && customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
          await supabase.from('customers').update({
            total_due: (customer.total_due || 0) + remainingDue,
            billing_status: remainingDue > 0 ? 'pending' : 'clear',
            last_order_date: new Date().toISOString()
          }).eq('id', customerId);
        }
      }

      // Prepare invoice
      setLastTransaction({
        invoiceNumber: transactionNumber,
        date: new Date(),
        customer: { name: customerState.customer?.name || customerState.newCustomerName || "Customer", phone: customerState.phoneQuery, address: customerState.customer?.address || customerState.newCustomerAddress || "" },
        items: cart.saleItems.map(i => ({ name: i.name, description: i.details, quantity: i.quantity, unitPrice: i.price, total: i.price * i.quantity })),
        returnItems: cart.returnItems.map(r => ({ brandName: r.brandName, quantity: r.quantity, isLeaked: r.isLeaked })),
        subtotal: cart.subtotal,
        discount: cart.discount,
        total: cart.total,
        paymentStatus: finalPaymentStatus,
        paymentMethod: 'cash'
      });

      setShowPaymentDrawer(false);
      setShowPrintTypeDialog(true);

      // Reset
      cart.resetCart();
      setPaymentAmount("");
      setCustomerState({ status: 'idle', customer: null, phoneQuery: '', newCustomerName: '', newCustomerAddress: '' });

      toast({ title: finalPaymentStatus === 'paid' ? "Sale completed!" : finalPaymentStatus === 'partial' ? "Partial payment saved!" : "Saved as due", description: transactionNumber });

    } catch (error: any) {
      logger.error('POS sale error', error, { component: 'POS' });
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  }, [cart, paymentAmount, customerState, lpgBrands, customers, hasCustomer]);

  // Loading state
  if (isLoading) return <POSSkeleton />;

  return (
    <TooltipProvider>
      <div className="space-y-3 pb-24 lg:pb-4">
        {/* Header */}
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
            {(cart.saleItemsCount > 0 || cart.returnCylindersCount > 0) && (
              <Button onClick={cart.clearCart} variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <POSQuickStats stats={todayStats} />

        {/* Mobile Table Toggle */}
        <div className="lg:hidden">
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
            <Button variant={activeTable === 'sale' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTable('sale')} className={`h-10 ${activeTable === 'sale' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}>
              <ShoppingCart className="h-4 w-4 mr-2" />Selling
              {cart.saleItemsCount > 0 && <Badge className="ml-2 bg-white/20">{cart.saleItemsCount}</Badge>}
            </Button>
            <Button variant={activeTable === 'return' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTable('return')} className={`h-10 ${activeTable === 'return' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}>
              <ArrowLeftRight className="h-4 w-4 mr-2" />Return
              {cart.returnCylindersCount > 0 && <Badge className="ml-2 bg-white/20">{cart.returnCylindersCount}</Badge>}
            </Button>
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <POSSaleTable items={cart.saleItems} itemsCount={cart.saleItemsCount} isActive={activeTable === 'sale'} onActivate={() => setActiveTable('sale')} onUpdateQuantity={cart.updateItemQuantity} onRemove={cart.removeItem} />
          <POSReturnTable items={cart.returnItems} itemsCount={cart.returnCylindersCount} refillCylindersCount={cart.refillCylindersCount} hasRefillInCart={cart.hasRefillInCart} isReturnCountMatched={cart.isReturnCountMatched} isActive={activeTable === 'return'} onActivate={() => setActiveTable('return')} onUpdateQuantity={cart.updateReturnQuantity} onRemove={cart.removeReturnItem} onToggleLeaked={cart.toggleReturnLeaked} />
        </div>

        {/* Control Bar */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-3 space-y-3">
            {/* Row 1: Sale Type + Weight + Search */}
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted/80 rounded-lg p-0.5 border border-border/50">
                <div className="grid grid-cols-2 gap-0.5">
                  <Button size="sm" variant={saleType === 'retail' ? 'default' : 'ghost'} onClick={() => setSaleType('retail')} className={`h-10 font-semibold ${saleType === 'retail' ? 'bg-primary shadow-md' : ''}`}>Retail</Button>
                  <Button size="sm" variant={saleType === 'wholesale' ? 'default' : 'ghost'} onClick={() => setSaleType('wholesale')} className={`h-10 font-semibold ${saleType === 'wholesale' ? 'bg-primary shadow-md' : ''}`}>Wholesale</Button>
                </div>
              </div>
              <Select value={weight} onValueChange={setWeight}>
                <SelectTrigger className="w-24 sm:w-28 h-10 font-semibold bg-primary text-primary-foreground border-primary"><SelectValue /></SelectTrigger>
                <SelectContent>{weightOptions.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
              </Select>
              <div className="hidden sm:flex relative w-40">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search..." className="h-10 pl-8" />
              </div>
            </div>

            {/* Row 2: Cylinder + Valve */}
            <div className="flex bg-muted/60 rounded-full p-1 border border-border/50">
              <button onClick={() => setCylinderType('refill')} className={`flex-1 h-9 px-2 sm:px-4 rounded-full font-semibold text-xs sm:text-sm transition-all ${cylinderType === 'refill' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>Refill</button>
              <button onClick={() => setCylinderType('package')} className={`flex-1 h-9 px-2 sm:px-4 rounded-full font-semibold text-xs sm:text-sm transition-all ${cylinderType === 'package' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>Package</button>
              <div className="w-px h-6 bg-border/70 self-center mx-1" />
              <button onClick={() => setMouthSize('22mm')} className={`flex-1 h-9 px-2 sm:px-4 rounded-full font-semibold text-xs sm:text-sm transition-all ${mouthSize === '22mm' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>22mm</button>
              <button onClick={() => setMouthSize('20mm')} className={`flex-1 h-9 px-2 sm:px-4 rounded-full font-semibold text-xs sm:text-sm transition-all ${mouthSize === '20mm' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>20mm</button>
            </div>

            {/* Row 3: Mode + Tabs */}
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center bg-muted/60 rounded-full p-1 border border-border/50">
                <button onClick={() => setActiveTable('sale')} className={`flex items-center gap-2 h-9 px-4 rounded-full font-semibold text-sm transition-all ${isSaleMode ? 'bg-emerald-600 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
                  <ShoppingCart className="h-4 w-4" />Selling{cart.saleItemsCount > 0 && <Badge className="ml-1 bg-white/20 text-white text-[10px]">{cart.saleItemsCount}</Badge>}
                </button>
                <button onClick={() => setActiveTable('return')} className={`flex items-center gap-2 h-9 px-4 rounded-full font-semibold text-sm transition-all ${!isSaleMode ? 'bg-amber-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}>
                  <ArrowLeftRight className="h-4 w-4" />Return{cart.returnCylindersCount > 0 && <Badge className="ml-1 bg-white/20 text-white text-[10px]">{cart.returnCylindersCount}</Badge>}
                </button>
              </div>
              {isSaleMode && (
                <div className="flex flex-1 gap-2">
                  {[{ id: 'lpg', label: 'LPG', icon: Cylinder }, { id: 'stove', label: 'Stove', icon: ChefHat }, { id: 'regulator', label: 'Regulator', icon: Gauge }].map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex items-center justify-center gap-2 h-10 px-4 rounded-lg text-sm font-medium transition-all border ${activeTab === tab.id ? 'bg-muted border-border text-foreground shadow-sm' : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/50'}`}>
                      <tab.icon className="h-4 w-4" />{tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Search */}
            <div className="sm:hidden relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products..." className="h-10 pl-8" />
            </div>
          </CardContent>
        </Card>

        {/* Product Grid */}
        <Card>
          <CardContent className="p-3">
            <ScrollArea className="h-[280px] sm:h-[320px]">
              {(activeTab === 'lpg' || !isSaleMode) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {(isSaleMode ? filteredBrands : brandsForReturn).map(brand => (
                    <LPGProductCard key={brand.id} brand={brand} cylinderType={cylinderType} weight={weight} price={getLPGPrice(brand.id, weight, cylinderType, saleType)} pendingStock={cart.getPendingStock(brand.id, cylinderType)} pendingReturns={cart.getPendingReturns(brand.id)} pendingProblem={cart.getPendingProblem(brand.id)} isSaleMode={isSaleMode} onClick={() => isSaleMode ? cart.addLPGToCart(brand, cylinderType, saleType, weight, mouthSize, getLPGPrice(brand.id, weight, cylinderType, saleType)) : cart.addReturnCylinder(brand, weight)} />
                  ))}
                  {isSaleMode && <CustomAddCard label="Custom Brand" icon={<Plus className="h-4 w-4 text-muted-foreground" />} onClick={() => setShowCustomBrandDialog(true)} />}
                </div>
              )}
              {activeTab === 'stove' && isSaleMode && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {filteredStoves.map(stove => <StoveProductCard key={stove.id} stove={stove} price={getStovePrice(stove.brand, stove.model) || stove.price} onClick={() => cart.addStoveToCart(stove, getStovePrice(stove.brand, stove.model) || stove.price)} />)}
                </div>
              )}
              {activeTab === 'regulator' && isSaleMode && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {filteredRegulators.map(reg => <RegulatorProductCard key={reg.id} regulator={reg} price={getRegulatorPrice(reg.brand, reg.type) || reg.price || 0} onClick={() => cart.addRegulatorToCart(reg, getRegulatorPrice(reg.brand, reg.type) || reg.price || 0)} />)}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Customer Section */}
        <POSCustomerLookup customers={customers} discount={cart.discount} onDiscountChange={cart.setDiscount} userRole={userRole} userName={userName} customerState={customerState} onCustomerChange={setCustomerState} />

        {/* Sticky Footer */}
        <POSStickyFooter total={cart.total} itemCount={cart.saleItemsCount} onProceed={() => { setPaymentAmount(cart.total.toString()); setShowPaymentDrawer(true); }} disabled={!cart.isReturnCountMatched} processing={processing} />

        {/* Payment Drawer */}
        <POSPaymentDrawer open={showPaymentDrawer} onOpenChange={setShowPaymentDrawer} total={cart.total} paymentAmount={paymentAmount} onPaymentAmountChange={setPaymentAmount} onComplete={handleCompleteSale} processing={processing} hasCustomer={hasCustomer} />

        {/* Barcode Scanner */}
        <BarcodeScanner open={showBarcodeScanner} onOpenChange={setShowBarcodeScanner} onProductFound={(product) => { setShowBarcodeScanner(false); toast({ title: "Product scanned", description: product.name }); }} />

        {/* Invoice Dialog */}
        <InvoiceDialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog} transaction={lastTransaction} />

        {/* Print Type Dialog */}
        <Dialog open={showPrintTypeDialog} onOpenChange={setShowPrintTypeDialog}>
          <DialogContent className="max-w-xs">
            <DialogHeader><DialogTitle>Print Invoice?</DialogTitle></DialogHeader>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowPrintTypeDialog(false)}>Skip</Button>
              <Button className="flex-1" onClick={() => { setShowPrintTypeDialog(false); setShowInvoiceDialog(true); }}>Print</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Custom Brand Dialog */}
        <Dialog open={showCustomBrandDialog} onOpenChange={setShowCustomBrandDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Custom Brand</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Brand Name *</Label><Input value={customBrand.name} onChange={e => setCustomBrand(p => ({ ...p, name: e.target.value }))} placeholder="Enter brand name" /></div>
              <div><Label>Price ({BANGLADESHI_CURRENCY_SYMBOL})</Label><Input type="number" value={customBrand.price} onChange={e => setCustomBrand(p => ({ ...p, price: e.target.value }))} placeholder="Enter price" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomBrandDialog(false)}>Cancel</Button>
              <Button onClick={async () => {
                if (!customBrand.name) { toast({ title: "Enter brand name", variant: "destructive" }); return; }
                const { data: { user } } = await supabase.auth.getUser();
                const { data: ownerId } = await supabase.rpc("get_owner_id");
                const price = parsePositiveNumber(customBrand.price, 100000) || 0;
                const { data: newBrand } = await supabase.from('lpg_brands').insert({ name: sanitizeString(customBrand.name), size: mouthSize, weight, color: '#6b7280', package_cylinder: 10, refill_cylinder: 10, created_by: user?.id, owner_id: ownerId }).select().single();
                if (newBrand) cart.addLPGToCart(newBrand as any, cylinderType, saleType, weight, mouthSize, price);
                setShowCustomBrandDialog(false);
                setCustomBrand({ name: '', price: '' });
              }}>Add & Use</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};
