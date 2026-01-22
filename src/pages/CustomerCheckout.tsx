import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Truck,
  CreditCard,
  Wallet,
  CheckCircle2,
  Loader2,
  MapPin
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CartItem, useCommunityData } from "@/hooks/useCommunityData";
import { DIVISIONS, getDistricts, getThanas } from "@/lib/bangladeshConstants";
import { toast } from "@/hooks/use-toast";

const CustomerCheckout = () => {
  const navigate = useNavigate();
  const { placeOrder, currentUser, userRole } = useCommunityData();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");
  const [notes, setNotes] = useState("");

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('lpg-community-cart');
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      if (parsedCart.length === 0) {
        navigate('/community/cart');
        return;
      }
      setCart(parsedCart);
    } else {
      navigate('/community/cart');
    }
  }, [navigate]);

  // Get available districts and thanas
  const availableDistricts = division ? getDistricts(division) : [];
  const availableThanas = district ? getThanas(district) : [];

  // Reset dependent fields
  useEffect(() => {
    setDistrict("");
    setThana("");
  }, [division]);

  useEffect(() => {
    setThana("");
  }, [district]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = 50;
  const total = subtotal + deliveryFee;

  const shopId = cart.length > 0 ? cart[0].shop_id : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !phone || !address || !division || !district) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    if (!shopId) {
      toast({ title: "Invalid cart", variant: "destructive" });
      return;
    }

    setLoading(true);

    const result = await placeOrder(shopId, cart, {
      name,
      phone,
      address,
      division,
      district,
      thana: thana || undefined,
      notes: notes || undefined
    });

    setLoading(false);

    if (result.success) {
      setOrderPlaced(true);
      setOrderId(result.orderId || null);
      // Clear cart
      localStorage.removeItem('lpg-community-cart');
      setCart([]);
    } else {
      toast({ 
        title: "Failed to place order", 
        description: result.error,
        variant: "destructive" 
      });
    }
  };

  // Order success screen
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-background">
        <CommunityHeader userRole={userRole} userName={currentUser?.email} />
        
        <main className="container mx-auto px-4 py-12 max-w-lg text-center">
          <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/20">
            <CardContent className="p-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Order Placed!</h2>
                <p className="text-muted-foreground">
                  Your order has been sent to the shop. They will confirm it shortly.
                </p>
              </div>

              {orderId && (
                <p className="font-mono text-sm text-muted-foreground">
                  Order reference will be visible in your orders
                </p>
              )}

              <div className="space-y-3 pt-4">
                <Button 
                  className="w-full"
                  onClick={() => navigate('/community/orders')}
                >
                  Track My Orders
                </Button>
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate('/community')}
                >
                  Continue Shopping
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <CommunityHeader 
        cartItemCount={cart.length} 
        userRole={userRole}
        userName={currentUser?.email}
      />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Badge variant="secondary">1. Cart</Badge>
          <div className="h-px w-8 bg-primary" />
          <Badge className="bg-primary">2. Checkout</Badge>
          <div className="h-px w-8 bg-muted" />
          <Badge variant="outline">3. Done</Badge>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/community/cart')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Checkout</h1>
            <p className="text-muted-foreground">Complete your order</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Shipping Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Shipping Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        placeholder="01XXXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Street Address *</Label>
                    <Textarea
                      id="address"
                      placeholder="House no, Road no, Area"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Division *</Label>
                      <Select value={division} onValueChange={setDivision}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {DIVISIONS.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>District *</Label>
                      <Select value={district} onValueChange={setDistrict} disabled={!division}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDistricts.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Thana</Label>
                      <Select value={thana} onValueChange={setThana} disabled={!district}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableThanas.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Order Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Special instructions for delivery..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-4 rounded-lg border-2 border-primary bg-primary/5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Cash on Delivery</p>
                      <p className="text-sm text-muted-foreground">Pay when you receive</p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  </div>

                  <div className="p-4 rounded-lg border border-muted flex items-center gap-3 opacity-50">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-muted-foreground">bKash / Nagad</p>
                      <p className="text-sm text-muted-foreground">Coming soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cart Items Summary */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cart.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.brand_name} {item.weight} x{item.quantity}
                        </span>
                        <span>৳{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>৳{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center">
                        <Truck className="h-4 w-4 mr-1" />
                        Delivery Fee
                      </span>
                      <span>৳{deliveryFee}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary">৳{total.toLocaleString()}</span>
                  </div>

                  <Button 
                    type="submit"
                    className="w-full h-12 text-lg bg-gradient-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Placing Order...
                      </>
                    ) : (
                      `Place Order • ৳${total.toLocaleString()}`
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By placing this order, you agree to our terms of service
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CustomerCheckout;
