import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingCart,
  Truck,
  Store,
  ArrowRight,
  RefreshCcw,
  Flame,
  Package,
  ChefHat,
  Gauge
} from "lucide-react";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CommunityBottomNav } from "@/components/community/CommunityBottomNav";
import { CartItem, useCommunityData } from "@/hooks/useCommunityData";
import { toast } from "@/hooks/use-toast";

const CustomerCart = () => {
  const navigate = useNavigate();
  const { currentUser, userRole } = useCommunityData();
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('lpg-community-cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    localStorage.setItem('lpg-community-cart', JSON.stringify(cart));
  }, [cart]);

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const newCart = [...cart];
    const item = newCart[index];
    
    // For refills, sync return cylinder quantity
    if (item.product_type === 'lpg_refill' && item.return_cylinder_qty > 0) {
      newCart[index] = { 
        ...item, 
        quantity: newQuantity,
        return_cylinder_qty: newQuantity 
      };
    } else {
      newCart[index] = { ...item, quantity: newQuantity };
    }
    
    setCart(newCart);
  };

  const removeItem = (index: number) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    toast({ title: "Item removed from cart" });
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('lpg-community-cart');
    toast({ title: "Cart cleared" });
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const deliveryFee = cart.length > 0 ? 50 : 0;
  const total = subtotal + deliveryFee;

  const shopInfo = cart.length > 0 && cart[0].shop ? cart[0].shop : null;

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    navigate('/community/checkout');
  };

  const getProductIcon = (type: string) => {
    switch (type) {
      case 'lpg_refill':
      case 'lpg_package':
        return <Flame className="h-5 w-5 text-orange-500" />;
      case 'stove':
        return <ChefHat className="h-5 w-5 text-amber-600" />;
      case 'regulator':
        return <Gauge className="h-5 w-5 text-blue-500" />;
      default:
        return <Package className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      <CommunityHeader 
        cartItemCount={cart.length} 
        userRole={userRole}
        userName={currentUser?.email}
      />

      <main className="container mx-auto px-4 py-4 sm:py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Shopping Cart</h1>
            <p className="text-sm text-muted-foreground">{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
          </div>
          {cart.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              className="text-destructive hover:text-destructive h-10"
              onClick={clearCart}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
        </div>

        {cart.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 sm:p-12 text-center">
              {/* Enhanced Empty Cart Illustration */}
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mb-4 relative animate-pulse">
                <ShoppingCart className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">0</span>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
                Browse shops and add LPG cylinders, stoves, or regulators to your cart
              </p>
              <Button onClick={() => navigate('/community')} className="h-12 px-6 touch-target">
                <Store className="h-5 w-5 mr-2" />
                Browse Shops
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {/* Shop Info */}
              {shopInfo && (
                <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Store className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{shopInfo.shop_name}</p>
                        <p className="text-sm text-muted-foreground">{shopInfo.district}, {shopInfo.division}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Items */}
              {cart.map((item, index) => (
                <Card key={`${item.id}-${index}`} className="overflow-hidden border-border">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex gap-3 sm:gap-4">
                      {/* Product Image/Icon */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center flex-shrink-0">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.brand_name}
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          getProductIcon(item.product_type)
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-foreground truncate">{item.brand_name}</h4>
                            {item.weight && (
                              <p className="text-sm text-muted-foreground">{item.weight}</p>
                            )}
                            <Badge variant="secondary" className="text-[10px] sm:text-xs mt-1">
                              {item.product_type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Return Info */}
                        {item.return_cylinder_type && item.return_cylinder_qty > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <RefreshCcw className="h-3 w-3" />
                            <span>Returning: {item.return_cylinder_qty} {item.return_cylinder_type} cylinder{item.return_cylinder_qty > 1 ? 's' : ''}</span>
                          </div>
                        )}

                        {/* Quantity & Price */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1" role="group" aria-label="Quantity controls">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-10 w-10 touch-target transition-transform active:scale-90"
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-12 text-center font-semibold tabular-nums text-lg">{item.quantity}</span>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-10 w-10 touch-target transition-transform active:scale-90"
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                              aria-label="Increase quantity"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="font-bold text-primary text-lg tabular-nums">
                            ৳{(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="lg:sticky lg:top-24 border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal ({cart.length} items)</span>
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
                    className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-primary"
                    onClick={handleCheckout}
                  >
                    Proceed to Checkout
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    💳 Cash on Delivery available
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      <CommunityBottomNav cartItemCount={cart.length} userRole={userRole} />
    </div>
  );
};

export default CustomerCart;
