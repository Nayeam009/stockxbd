import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  Printer, 
  CreditCard,
  Banknote,
  Smartphone,
  Search,
  X,
  Check,
  Receipt,
  Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { supabase } from "@/integrations/supabase/client";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock_quantity: number;
  unit: string;
}

interface CartItem extends Product {
  quantity: number;
}

const categoryMap: Record<string, string> = {
  'lpg_cylinder': 'LPG Cylinder',
  'stove': 'Gas Stove',
  'regulator': 'Regulator',
  'accessory': 'Accessories'
};

const paymentMethodMap: Record<string, string> = {
  'Cash': 'cash',
  'bKash': 'bkash',
  'Nagad': 'nagad',
  'Rocket': 'rocket',
  'Card': 'card',
  'Bank Transfer': 'card'
};

const categories = ["All", "LPG Cylinder", "Gas Stove", "Regulator", "Accessories"];

export const POSModule = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  // Fetch products from database
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) {
        toast({ title: "Error loading products", description: error.message, variant: "destructive" });
      } else {
        setProducts(data.map(p => ({
          id: p.id,
          name: p.name,
          category: categoryMap[p.category] || p.category,
          price: Number(p.price),
          stock_quantity: p.stock_quantity,
          unit: p.unit
        })));
      }
      setLoading(false);
    };

    fetchProducts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setProducts(prev => prev.map(p => 
              p.id === updated.id 
                ? { ...p, stock_quantity: updated.stock_quantity, price: Number(updated.price) }
                : p
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        toast({ title: "Stock limit reached", variant: "destructive" });
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(cart.map(item => {
      if (item.id === productId) {
        const newQuantity = item.quantity + change;
        if (newQuantity <= 0) return item;
        if (newQuantity > item.stock_quantity) {
          toast({ title: "Stock limit reached", variant: "destructive" });
          return item;
        }
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = 0; // No VAT for LPG in Bangladesh
  const total = subtotal + tax;

  const handlePayment = async () => {
    if (!selectedPaymentMethod) {
      toast({ title: "Please select a payment method", variant: "destructive" });
      return;
    }

    const received = parseFloat(receivedAmount) || 0;
    if (selectedPaymentMethod === "Cash" && received < total) {
      toast({ title: "Insufficient amount received", variant: "destructive" });
      return;
    }

    setProcessing(true);

    try {
      // Generate transaction number
      const { data: txnNumData, error: txnNumError } = await supabase.rpc('generate_transaction_number');
      if (txnNumError) throw txnNumError;

      const transactionNumber = txnNumData || `TXN-${Date.now()}`;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in to complete transaction", variant: "destructive" });
        setProcessing(false);
        return;
      }

      // Create transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('pos_transactions')
        .insert({
          transaction_number: transactionNumber,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          subtotal: subtotal,
          discount: 0,
          total: total,
          payment_method: paymentMethodMap[selectedPaymentMethod] as any,
          payment_status: 'completed',
          created_by: user.id
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      // Insert transaction items
      const transactionItems = cart.map(item => ({
        transaction_id: transaction.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('pos_transaction_items')
        .insert(transactionItems);

      if (itemsError) throw itemsError;

      // Update stock quantities
      for (const item of cart) {
        const { error: stockError } = await supabase
          .from('products')
          .update({ stock_quantity: item.stock_quantity - item.quantity })
          .eq('id', item.id);

        if (stockError) throw stockError;
      }

      // Generate receipt
      const receipt = {
        id: transactionNumber,
        date: new Date().toLocaleString('en-BD'),
        customer: customerName || "Walk-in Customer",
        phone: customerPhone || "-",
        items: cart,
        subtotal,
        tax,
        total,
        paymentMethod: selectedPaymentMethod,
        received: received || total,
        change: Math.max(0, received - total),
      };

      setLastReceipt(receipt);
      setShowPaymentModal(false);
      setShowReceiptModal(true);

      toast({ title: "Payment successful!", description: `Invoice: ${receipt.id}` });
    } catch (error: any) {
      toast({ title: "Payment failed", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = () => {
    if (!lastReceipt) return;

    const receiptContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; width: 80mm; margin: 0; padding: 10px; font-size: 12px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .header h1 { margin: 0; font-size: 18px; }
            .header p { margin: 2px 0; font-size: 10px; }
            .info { margin-bottom: 10px; }
            .info p { margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { text-align: left; padding: 2px 0; }
            th:last-child, td:last-child { text-align: right; }
            .totals { border-top: 1px dashed #000; padding-top: 10px; }
            .totals p { display: flex; justify-content: space-between; margin: 2px 0; }
            .total-row { font-weight: bold; font-size: 14px; }
            .footer { text-align: center; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Stock-X LPG</h1>
            <p>LPG Dealer & Distributor</p>
            <p>Dhaka, Bangladesh</p>
            <p>Phone: 01XXXXXXXXX</p>
          </div>
          <div class="info">
            <p><strong>Invoice:</strong> ${lastReceipt.id}</p>
            <p><strong>Date:</strong> ${lastReceipt.date}</p>
            <p><strong>Customer:</strong> ${lastReceipt.customer}</p>
            <p><strong>Phone:</strong> ${lastReceipt.phone}</p>
          </div>
          <table>
            <tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr>
            ${lastReceipt.items.map((item: CartItem) => `
              <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${BANGLADESHI_CURRENCY_SYMBOL}${item.price}</td>
                <td>${BANGLADESHI_CURRENCY_SYMBOL}${item.price * item.quantity}</td>
              </tr>
            `).join('')}
          </table>
          <div class="totals">
            <p><span>Subtotal:</span><span>${BANGLADESHI_CURRENCY_SYMBOL}${lastReceipt.subtotal}</span></p>
            <p class="total-row"><span>Total:</span><span>${BANGLADESHI_CURRENCY_SYMBOL}${lastReceipt.total}</span></p>
            <p><span>Payment:</span><span>${lastReceipt.paymentMethod}</span></p>
            <p><span>Received:</span><span>${BANGLADESHI_CURRENCY_SYMBOL}${lastReceipt.received}</span></p>
            ${lastReceipt.change > 0 ? `<p><span>Change:</span><span>${BANGLADESHI_CURRENCY_SYMBOL}${lastReceipt.change}</span></p>` : ''}
          </div>
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>ধন্যবাদ আপনার ক্রয়ের জন্য</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const completeTransaction = () => {
    clearCart();
    setShowReceiptModal(false);
    setLastReceipt(null);
    setSelectedPaymentMethod("");
    setReceivedAmount("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading products...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-primary">Point of Sale</h2>
          <p className="text-muted-foreground">Quick sales and billing system</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and Categories */}
          <Card className="border-0 shadow-elegant">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {categories.map(category => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <Card
                key={product.id}
                className="border border-border hover:border-primary/40 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4 text-center">
                  <div className="h-12 w-12 mx-auto mb-3 bg-primary/10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ShoppingCart className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-sm text-foreground line-clamp-2 mb-1">{product.name}</h3>
                  <p className="text-lg font-bold text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{product.price}</p>
                  <Badge variant={product.stock_quantity > 10 ? "secondary" : "destructive"} className="mt-2 text-xs">
                    Stock: {product.stock_quantity}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="space-y-4">
          <Card className="border-0 shadow-elegant sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-primary">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Cart ({cart.length})
                </div>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer Info */}
              <div className="space-y-2">
                <Input
                  placeholder="Customer Name (optional)"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <Input
                  placeholder="Phone Number (optional)"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              {/* Cart Items */}
              <div className="max-h-[300px] overflow-y-auto space-y-3">
                {cart.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Cart is empty</p>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {BANGLADESHI_CURRENCY_SYMBOL}{item.price} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals */}
              {cart.length > 0 && (
                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{BANGLADESHI_CURRENCY_SYMBOL}{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</span>
                  </div>
                  <Button
                    className="w-full mt-4"
                    size="lg"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    Proceed to Payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-4 bg-surface rounded-lg">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-3xl font-bold text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Select Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                {["Cash", "bKash", "Nagad", "Rocket", "Bank Transfer", "Card"].map(method => (
                  <Button
                    key={method}
                    variant={selectedPaymentMethod === method ? "default" : "outline"}
                    className="justify-start"
                    onClick={() => setSelectedPaymentMethod(method)}
                  >
                    {method === "Cash" && <Banknote className="h-4 w-4 mr-2" />}
                    {(method === "bKash" || method === "Nagad" || method === "Rocket") && <Smartphone className="h-4 w-4 mr-2" />}
                    {(method === "Bank Transfer" || method === "Card") && <CreditCard className="h-4 w-4 mr-2" />}
                    {method}
                  </Button>
                ))}
              </div>
            </div>

            {selectedPaymentMethod === "Cash" && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Amount Received</p>
                <Input
                  type="number"
                  placeholder="Enter amount received"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                />
                {receivedAmount && parseFloat(receivedAmount) >= total && (
                  <p className="text-sm text-green-600 font-medium">
                    Change: {BANGLADESHI_CURRENCY_SYMBOL}{(parseFloat(receivedAmount) - total).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <Button 
              className="w-full" 
              size="lg" 
              onClick={handlePayment}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Complete Payment
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Receipt className="h-5 w-5" />
              Transaction Complete
            </DialogTitle>
          </DialogHeader>
          {lastReceipt && (
            <div className="space-y-4">
              <div className="bg-surface rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-medium">{lastReceipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{lastReceipt.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customer</span>
                  <span>{lastReceipt.customer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span>{lastReceipt.items.length}</span>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{BANGLADESHI_CURRENCY_SYMBOL}{lastReceipt.total.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Paid via</span>
                  <span className="font-medium">{lastReceipt.paymentMethod}</span>
                </div>
                {lastReceipt.change > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Change</span>
                    <span>{BANGLADESHI_CURRENCY_SYMBOL}{lastReceipt.change.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={printReceipt}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
                <Button className="flex-1" onClick={completeTransaction}>
                  <Check className="h-4 w-4 mr-2" />
                  New Sale
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
