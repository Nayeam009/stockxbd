import { useState, useEffect } from "react";
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
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { supabase } from "@/integrations/supabase/client";

interface LPGBrand {
  id: string;
  name: string;
  size: string;
  refill_cylinder: number;
  package_cylinder: number;
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

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface SaleItem {
  id: string;
  type: 'lpg' | 'stove' | 'regulator';
  name: string;
  details: string;
  price: number;
  quantity: number;
  returnBrand?: string;
}

const lpgWeights = ["5.5", "12", "22.7", "35"];
const mouthSizes = ["20mm", "22mm"];

export const POSModule = () => {
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
  
  // Data
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Cart & Customer
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [discount, setDiscount] = useState("0");
  
  // Receipt
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const [brandsRes, stovesRes, regulatorsRes, customersRes] = await Promise.all([
        supabase.from('lpg_brands').select('*').eq('is_active', true),
        supabase.from('stoves').select('*').eq('is_active', true),
        supabase.from('regulators').select('*').eq('is_active', true),
        supabase.from('customers').select('*').order('name')
      ]);

      if (brandsRes.data) setLpgBrands(brandsRes.data);
      if (stovesRes.data) setStoves(stovesRes.data);
      if (regulatorsRes.data) setRegulators(regulatorsRes.data);
      if (customersRes.data) setCustomers(customersRes.data);
      
      setLoading(false);
    };

    fetchData();
  }, []);

  const filteredBrands = lpgBrands.filter(b => b.size === mouthSize);

  const addLPGToSale = () => {
    if (!sellingBrand || !weight || !price || parseInt(quantity) < 1) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const brand = lpgBrands.find(b => b.id === sellingBrand);
    if (!brand) return;

    const returnBrandName = returnBrand && returnBrand !== "none" ? lpgBrands.find(b => b.id === returnBrand)?.name : undefined;
    
    const newItem: SaleItem = {
      id: `lpg-${Date.now()}`,
      type: 'lpg',
      name: `${brand.name} - ${cylinderType === 'refill' ? 'Refill' : 'Package'}`,
      details: `${weight}kg, ${mouthSize}, ${saleType}${returnBrandName ? `, Return: ${returnBrandName}` : ''}`,
      price: parseFloat(price),
      quantity: parseInt(quantity),
      returnBrand: returnBrandName
    };

    setSaleItems([...saleItems, newItem]);
    
    // Reset form
    setSellingBrand("");
    setReturnBrand("");
    setWeight("");
    setPrice("0");
    setQuantity("1");
    
    toast({ title: "Added to sale" });
  };

  const addStoveToSale = () => {
    if (!selectedStove || parseInt(stoveQuantity) < 1) {
      toast({ title: "Please select a stove", variant: "destructive" });
      return;
    }

    const stove = stoves.find(s => s.id === selectedStove);
    if (!stove) return;

    const newItem: SaleItem = {
      id: `stove-${Date.now()}`,
      type: 'stove',
      name: `${stove.brand} ${stove.model}`,
      details: `${stove.burners} Burner`,
      price: stove.price,
      quantity: parseInt(stoveQuantity)
    };

    setSaleItems([...saleItems, newItem]);
    setSelectedStove("");
    setStoveQuantity("1");
    
    toast({ title: "Added to sale" });
  };

  const addRegulatorToSale = () => {
    if (!selectedRegulator || parseInt(regulatorQuantity) < 1) {
      toast({ title: "Please select a regulator", variant: "destructive" });
      return;
    }

    const regulator = regulators.find(r => r.id === selectedRegulator);
    if (!regulator) return;

    const newItem: SaleItem = {
      id: `reg-${Date.now()}`,
      type: 'regulator',
      name: regulator.brand,
      details: regulator.type,
      price: 0, // Can set price manually
      quantity: parseInt(regulatorQuantity)
    };

    setSaleItems([...saleItems, newItem]);
    setSelectedRegulator("");
    setRegulatorQuantity("1");
    
    toast({ title: "Added to sale" });
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

  const handleCompleteSale = async (paymentStatus: 'completed' | 'pending') => {
    if (saleItems.length === 0) {
      toast({ title: "No items in sale", variant: "destructive" });
      return;
    }

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

      // Create or get customer
      let customerId = selectedCustomerId;
      if (!customerId && customerName.trim()) {
        const { data: customer, error } = await supabase
          .from('customers')
          .insert({ name: customerName.trim(), created_by: user.id })
          .select()
          .single();
        
        if (!error && customer) customerId = customer.id;
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
          created_by: user.id
        })
        .select()
        .single();

      if (txnError) throw txnError;

      // Get first product for items (simplified - in production, map properly)
      const { data: defaultProduct } = await supabase
        .from('products')
        .select('id')
        .limit(1)
        .single();

      // Insert items
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

      // Create receipt
      const receipt = {
        id: transactionNumber,
        date: new Date().toLocaleString('en-BD'),
        customer: customerName || "Walk-in Customer",
        items: saleItems,
        subtotal,
        discount: discountAmount,
        total,
        status: paymentStatus === 'completed' ? 'Paid' : 'Due'
      };

      setLastReceipt(receipt);
      setShowReceiptModal(true);
      
      // Clear form
      setSaleItems([]);
      setCustomerName("");
      setSelectedCustomerId(null);
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

  const printReceipt = () => {
    if (!lastReceipt) return;

    const receiptContent = `
      <html>
        <head>
          <style>
            body { font-family: 'Courier New', monospace; width: 80mm; margin: 0; padding: 10px; font-size: 12px; }
            .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .header h1 { margin: 0; font-size: 18px; }
            .info p { margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { text-align: left; padding: 4px 0; font-size: 11px; }
            th:last-child, td:last-child { text-align: right; }
            .totals { border-top: 1px dashed #000; padding-top: 10px; }
            .totals p { display: flex; justify-content: space-between; margin: 4px 0; }
            .total-row { font-weight: bold; font-size: 14px; }
            .status { text-align: center; font-weight: bold; margin-top: 10px; padding: 5px; border: 1px solid #000; }
            .footer { text-align: center; margin-top: 15px; border-top: 1px dashed #000; padding-top: 10px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Stock-X LPG</h1>
            <p>LPG Dealer & Distributor</p>
          </div>
          <div class="info">
            <p><strong>Invoice:</strong> ${lastReceipt.id}</p>
            <p><strong>Date:</strong> ${lastReceipt.date}</p>
            <p><strong>Customer:</strong> ${lastReceipt.customer}</p>
          </div>
          <table>
            <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr>
            ${lastReceipt.items.map((item: SaleItem) => `
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
            ${lastReceipt.discount > 0 ? `<p><span>Discount:</span><span>-${BANGLADESHI_CURRENCY_SYMBOL}${lastReceipt.discount}</span></p>` : ''}
            <p class="total-row"><span>Total:</span><span>${BANGLADESHI_CURRENCY_SYMBOL}${lastReceipt.total}</span></p>
          </div>
          <div class="status">${lastReceipt.status}</div>
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>ধন্যবাদ!</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (printWindow) {
      printWindow.document.write(receiptContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
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
        <h2 className="text-3xl font-bold text-foreground">Point of Sale</h2>
        <p className="text-muted-foreground">Quick sales and billing system</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Side - Product Entry */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted">
              <TabsTrigger value="lpg" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                LPG Cylinder
              </TabsTrigger>
              <TabsTrigger value="stove" className="data-[state=active]:bg-muted-foreground/20">
                Gas Stove
              </TabsTrigger>
              <TabsTrigger value="regulator" className="data-[state=active]:bg-muted-foreground/20">
                Regulator
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
                          <Label htmlFor="package" className="cursor-pointer">Package</Label>
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
                          <SelectValue placeholder="Select or type brand..." />
                        </SelectTrigger>
                        <SelectContent>
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
                    <div className="space-y-2">
                      <Label>Return Brand (Optional)</Label>
                      <Select value={returnBrand} onValueChange={setReturnBrand}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select or type brand..." />
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
                      <Label>Weight (kg)</Label>
                      <Select value={weight} onValueChange={setWeight}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select weight" />
                        </SelectTrigger>
                        <SelectContent>
                          {lpgWeights.map(w => (
                            <SelectItem key={w} value={w}>{w} kg</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Mouth Size</Label>
                      <Select value={mouthSize} onValueChange={setMouthSize}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          {mouthSizes.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
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
                          {stoves.map(stove => (
                            <SelectItem key={stove.id} value={stove.id}>
                              {stove.brand} {stove.model} ({stove.burners} Burner) - {BANGLADESHI_CURRENCY_SYMBOL}{stove.price}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input 
                        type="number" 
                        value={stoveQuantity} 
                        onChange={(e) => setStoveQuantity(e.target.value)}
                        min="1"
                      />
                    </div>
                  </div>
                  <Button onClick={addStoveToSale} className="w-full bg-primary hover:bg-primary/90">
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
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Select Regulator</Label>
                      <Select value={selectedRegulator} onValueChange={setSelectedRegulator}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select regulator..." />
                        </SelectTrigger>
                        <SelectContent>
                          {regulators.map(reg => (
                            <SelectItem key={reg.id} value={reg.id}>
                              {reg.brand} ({reg.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input 
                        type="number" 
                        value={regulatorQuantity} 
                        onChange={(e) => setRegulatorQuantity(e.target.value)}
                        min="1"
                      />
                    </div>
                  </div>
                  <Button onClick={addRegulatorToSale} className="w-full bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Sale
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
                Sale Items
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
          {/* Customer */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Customer</CardTitle>
              <p className="text-sm text-muted-foreground">Select an existing customer or type a new name.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Select value={selectedCustomerId || ""} onValueChange={(v) => {
                  if (v) {
                    setSelectedCustomerId(v);
                    const customer = customers.find(c => c.id === v);
                    if (customer) setCustomerName(customer.name);
                  } else {
                    setSelectedCustomerId(null);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select or type customer name..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Walk-in Customer</SelectItem>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} {customer.phone && `(${customer.phone})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!selectedCustomerId && (
                <Input
                  placeholder="Or type new customer name..."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Summary & Actions</CardTitle>
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
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-24 text-right"
                      min="0"
                    />
                    <span className="text-muted-foreground">{BANGLADESHI_CURRENCY_SYMBOL}</span>
                  </div>
                </div>
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
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
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
                    // Just show print preview without completing
                    setLastReceipt({
                      id: 'PREVIEW',
                      date: new Date().toLocaleString('en-BD'),
                      customer: customerName || "Walk-in Customer",
                      items: saleItems,
                      subtotal,
                      discount: discountAmount,
                      total,
                      status: 'Preview'
                    });
                    printReceipt();
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Memo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Sale Complete
            </DialogTitle>
          </DialogHeader>
          {lastReceipt && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Badge variant={lastReceipt.status === 'Paid' ? 'default' : 'secondary'} className="text-lg px-4 py-2">
                  {lastReceipt.status}
                </Badge>
                <p className="mt-2 text-2xl font-bold">{BANGLADESHI_CURRENCY_SYMBOL}{lastReceipt.total}</p>
                <p className="text-sm text-muted-foreground">Invoice: {lastReceipt.id}</p>
              </div>
              <div className="flex gap-3">
                <Button onClick={printReceipt} className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
                <Button variant="outline" onClick={() => setShowReceiptModal(false)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
