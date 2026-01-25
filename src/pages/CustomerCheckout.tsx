import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  ArrowLeft, 
  Truck,
  CreditCard,
  Wallet,
  CheckCircle2,
  Loader2,
  MapPin,
  Bookmark,
  X,
  Sparkles,
  Copy,
  Check,
  AlertCircle
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CommunityBottomNav } from "@/components/community/CommunityBottomNav";
import { CartItem, useCommunityData } from "@/hooks/useCommunityData";
import { useCustomerData } from "@/hooks/useCustomerData";
import { DIVISIONS, getDistricts, getThanas } from "@/lib/bangladeshConstants";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ShopPaymentInfo {
  bkash_number: string | null;
  nagad_number: string | null;
  rocket_number: string | null;
  online_payment_only: boolean;
}

const CustomerCheckout = () => {
  const navigate = useNavigate();
  const { placeOrder, currentUser, userRole } = useCommunityData();
  const { 
    profile: savedProfile, 
    defaultAddress: savedAddress, 
    hasSavedData,
    saveCustomerData,
    isLoaded: customerDataLoaded 
  } = useCustomerData();
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [useSavedAddress, setUseSavedAddress] = useState(true);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [shopPaymentInfo, setShopPaymentInfo] = useState<ShopPaymentInfo | null>(null);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bkash' | 'nagad' | 'rocket'>('cod');
  const [paymentTrxId, setPaymentTrxId] = useState("");

  // Load cart from localStorage and fetch shop payment info
  useEffect(() => {
    const savedCart = localStorage.getItem('lpg-community-cart');
    if (savedCart) {
      const parsedCart = JSON.parse(savedCart);
      if (parsedCart.length === 0) {
        navigate('/community/cart');
        return;
      }
      setCart(parsedCart);
      
      // Fetch shop payment info
      const shopId = parsedCart[0]?.shop_id;
      if (shopId) {
        fetchShopPaymentInfo(shopId);
      }
    } else {
      navigate('/community/cart');
    }
  }, [navigate]);

  const fetchShopPaymentInfo = async (shopId: string) => {
    try {
      const { data, error } = await supabase
        .from('shop_profiles')
        .select('bkash_number, nagad_number, rocket_number, online_payment_only')
        .eq('id', shopId)
        .maybeSingle();
      
      if (!error && data) {
        setShopPaymentInfo(data);
        // If shop requires online payment only, set default to bkash
        if (data.online_payment_only && (data.bkash_number || data.nagad_number || data.rocket_number)) {
          setPaymentMethod('bkash');
        }
      }
    } catch (error) {
      console.error('Error fetching shop payment info:', error);
    }
  };

  const handleCopyNumber = (number: string) => {
    navigator.clipboard.writeText(number);
    setCopiedNumber(number);
    toast({ title: "Number copied!" });
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  // Auto-fill from saved customer data
  useEffect(() => {
    if (customerDataLoaded && hasSavedData && useSavedAddress) {
      // Only auto-fill if fields are empty (first load)
      if (!name && savedProfile.name) {
        setName(savedProfile.name);
        setIsAutoFilled(true);
      }
      if (!phone && savedProfile.phone) {
        setPhone(savedProfile.phone);
        setIsAutoFilled(true);
      }
      if (!division && savedAddress.division) {
        setDivision(savedAddress.division);
        setIsAutoFilled(true);
      }
      if (!district && savedAddress.district) {
        setDistrict(savedAddress.district);
        setIsAutoFilled(true);
      }
      if (!thana && savedAddress.thana) {
        setThana(savedAddress.thana);
        setIsAutoFilled(true);
      }
      if (!address && savedAddress.streetAddress) {
        setAddress(savedAddress.streetAddress);
        setIsAutoFilled(true);
      }
    }
  }, [customerDataLoaded, hasSavedData, useSavedAddress, savedProfile, savedAddress]);

  // Get available districts and thanas
  const availableDistricts = division ? getDistricts(division) : [];
  const availableThanas = district ? getThanas(district) : [];

  // Reset dependent fields
  useEffect(() => {
    if (!customerDataLoaded) return;
    // Only reset if user manually changed division
    if (division !== savedAddress.division) {
      setDistrict("");
      setThana("");
    }
  }, [division]);

  useEffect(() => {
    if (!customerDataLoaded) return;
    // Only reset if user manually changed district
    if (district !== savedAddress.district) {
      setThana("");
    }
  }, [district]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = 50;
  const total = subtotal + deliveryFee;

  const shopId = cart.length > 0 ? cart[0].shop_id : null;

  const handleClearAutoFill = () => {
    setUseSavedAddress(false);
    setIsAutoFilled(false);
    setName("");
    setPhone("");
    setAddress("");
    setDivision("");
    setDistrict("");
    setThana("");
  };

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

    // Validate online payment requires TrxID
    if (paymentMethod !== 'cod' && !paymentTrxId.trim()) {
      toast({ 
        title: "Transaction ID required", 
        description: "Please enter your payment transaction ID",
        variant: "destructive" 
      });
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
      notes: notes || undefined,
      paymentMethod,
      paymentTrxId: paymentMethod !== 'cod' ? paymentTrxId : undefined
    });

    setLoading(false);

    if (result.success) {
      // Save customer data for next time
      saveCustomerData({
        profile: { name, phone, email: savedProfile.email || currentUser?.email || '' },
        defaultAddress: { division, district, thana, streetAddress: address }
      }, true);

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
        
        <main className="container mx-auto px-4 py-8 sm:py-12 max-w-lg text-center">
          <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center animate-in zoom-in duration-300">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Order Placed!</h2>
                <p className="text-muted-foreground">
                  Your order has been sent to the shop. They will confirm it shortly.
                </p>
              </div>

              {orderId && (
                <div className="p-3 rounded-lg bg-background/80 border">
                  <p className="text-xs text-muted-foreground mb-1">Order Reference</p>
                  <p className="font-mono font-semibold">{orderId.slice(0, 8).toUpperCase()}</p>
                </div>
              )}

              <div className="space-y-3 pt-4">
                <Button 
                  className="w-full h-12 text-base"
                  onClick={() => navigate('/community/orders')}
                >
                  Track My Orders
                </Button>
                <Button 
                  variant="outline"
                  className="w-full h-12 text-base"
                  onClick={() => navigate('/community')}
                >
                  Continue Shopping
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <CommunityBottomNav userRole={userRole} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      <CommunityHeader 
        cartItemCount={cart.length} 
        userRole={userRole}
        userName={currentUser?.email}
      />

      <main className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
          <div className="flex items-center gap-1 text-sm">
            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-medium">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-muted-foreground hidden sm:inline">Cart</span>
          </div>
          <div className="h-px w-6 sm:w-10 bg-primary" />
          <div className="flex items-center gap-1 text-sm">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              2
            </div>
            <span className="font-medium hidden sm:inline">Checkout</span>
          </div>
          <div className="h-px w-6 sm:w-10 bg-muted" />
          <div className="flex items-center gap-1 text-sm">
            <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-medium">
              3
            </div>
            <span className="text-muted-foreground hidden sm:inline">Done</span>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate('/community/cart')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Checkout</h1>
            <p className="text-sm text-muted-foreground">Complete your order</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Shipping Form */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <MapPin className="h-5 w-5 text-primary" />
                      Shipping Information
                    </CardTitle>
                    {isAutoFilled && (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                          <Bookmark className="h-3 w-3" />
                          <span className="hidden sm:inline">Saved Address</span>
                          <span className="sm:hidden">Saved</span>
                        </Badge>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                          onClick={handleClearAutoFill}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm font-medium">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        autoComplete="name"
                        className="h-12 text-base input-accessible"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium">Phone Number *</Label>
                      <Input
                        id="phone"
                        placeholder="01XXXXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        autoComplete="tel"
                        inputMode="tel"
                        className="h-12 text-base input-accessible"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm font-medium">Street Address *</Label>
                    <Textarea
                      id="address"
                      placeholder="House no, Road no, Area"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      autoComplete="street-address"
                      className="min-h-[80px] text-base resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Division *</Label>
                      <Select value={division} onValueChange={setDivision}>
                        <SelectTrigger className="h-12 text-base">
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
                      <Label className="text-sm font-medium">District *</Label>
                      <Select value={district} onValueChange={setDistrict} disabled={!division}>
                        <SelectTrigger className="h-12 text-base">
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
                      <Label className="text-sm font-medium">Thana</Label>
                      <Select value={thana} onValueChange={setThana} disabled={!district}>
                        <SelectTrigger className="h-12 text-base">
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
                    <Label htmlFor="notes" className="text-sm font-medium">Order Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Special instructions for delivery..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-[60px] text-base resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card className="border-border overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Wallet className="h-5 w-5 text-primary" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Online Payment Only Warning */}
                  {shopPaymentInfo?.online_payment_only && (
                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        This shop requires <strong>online payment only</strong>. Please pay via bKash/Nagad/Rocket before placing your order.
                      </p>
                    </div>
                  )}

                  <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
                    {/* Cash on Delivery - hide if shop requires online payment */}
                    {!shopPaymentInfo?.online_payment_only && (
                      <div 
                        className={`p-4 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-colors ${
                          paymentMethod === 'cod' 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setPaymentMethod('cod')}
                      >
                        <RadioGroupItem value="cod" id="cod" className="sr-only" />
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Truck className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">Cash on Delivery</p>
                          <p className="text-sm text-muted-foreground">Pay when you receive your order</p>
                        </div>
                        {paymentMethod === 'cod' && (
                          <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0" />
                        )}
                      </div>
                    )}

                    {/* bKash */}
                    {shopPaymentInfo?.bkash_number && (
                      <div 
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                          paymentMethod === 'bkash' 
                            ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30' 
                            : 'border-border hover:border-rose-500/50'
                        }`}
                        onClick={() => setPaymentMethod('bkash')}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="bkash" id="bkash" className="sr-only" />
                          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">🔴</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">bKash</p>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-sm font-mono bg-background px-2 py-0.5 rounded border">
                                {shopPaymentInfo.bkash_number}
                              </code>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyNumber(shopPaymentInfo.bkash_number!);
                                }}
                              >
                                {copiedNumber === shopPaymentInfo.bkash_number ? (
                                  <Check className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          {paymentMethod === 'bkash' && (
                            <CheckCircle2 className="h-6 w-6 text-rose-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Nagad */}
                    {shopPaymentInfo?.nagad_number && (
                      <div 
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                          paymentMethod === 'nagad' 
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30' 
                            : 'border-border hover:border-orange-500/50'
                        }`}
                        onClick={() => setPaymentMethod('nagad')}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="nagad" id="nagad" className="sr-only" />
                          <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">🟠</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">Nagad</p>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-sm font-mono bg-background px-2 py-0.5 rounded border">
                                {shopPaymentInfo.nagad_number}
                              </code>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyNumber(shopPaymentInfo.nagad_number!);
                                }}
                              >
                                {copiedNumber === shopPaymentInfo.nagad_number ? (
                                  <Check className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          {paymentMethod === 'nagad' && (
                            <CheckCircle2 className="h-6 w-6 text-orange-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Rocket */}
                    {shopPaymentInfo?.rocket_number && (
                      <div 
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                          paymentMethod === 'rocket' 
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30' 
                            : 'border-border hover:border-purple-500/50'
                        }`}
                        onClick={() => setPaymentMethod('rocket')}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="rocket" id="rocket" className="sr-only" />
                          <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-2xl">🟣</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold">Rocket</p>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-sm font-mono bg-background px-2 py-0.5 rounded border">
                                {shopPaymentInfo.rocket_number}
                              </code>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyNumber(shopPaymentInfo.rocket_number!);
                                }}
                              >
                                {copiedNumber === shopPaymentInfo.rocket_number ? (
                                  <Check className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          {paymentMethod === 'rocket' && (
                            <CheckCircle2 className="h-6 w-6 text-purple-500 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    )}
                  </RadioGroup>

                  {/* No Online Payment Available */}
                  {!shopPaymentInfo?.bkash_number && !shopPaymentInfo?.nagad_number && !shopPaymentInfo?.rocket_number && shopPaymentInfo?.online_payment_only && (
                    <div className="p-4 rounded-lg border-2 border-dashed border-destructive/50 bg-destructive/5 text-center">
                      <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                      <p className="text-sm text-destructive font-medium">
                        No online payment methods available
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Please contact the shop for payment options
                      </p>
                    </div>
                  )}

                  {/* Transaction ID Input */}
                  {paymentMethod !== 'cod' && (
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="trxId" className="text-sm font-medium">
                        Transaction ID <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="trxId"
                        placeholder="Enter your payment TrxID"
                        value={paymentTrxId}
                        onChange={(e) => setPaymentTrxId(e.target.value)}
                        className="h-12 text-base font-mono"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        ⚠️ Pay first to the number above, then enter your TrxID
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary - Sticky on desktop, fixed on mobile */}
            <div className="lg:col-span-1">
              <Card className="lg:sticky lg:top-24 border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cart Items Summary */}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {cart.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate mr-2">
                          {item.brand_name} {item.weight} ×{item.quantity}
                        </span>
                        <span className="font-medium tabular-nums">৳{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="tabular-nums">৳{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground flex items-center">
                        <Truck className="h-4 w-4 mr-1" />
                        Delivery Fee
                      </span>
                      <span className="tabular-nums">৳{deliveryFee}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary tabular-nums">৳{total.toLocaleString()}</span>
                  </div>

                  <Button 
                    type="submit"
                    className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Placing Order...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Place Order • ৳{total.toLocaleString()}
                      </>
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

      <CommunityBottomNav userRole={userRole} />
    </div>
  );
};

export default CustomerCheckout;
