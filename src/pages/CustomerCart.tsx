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
  Store
} from "lucide-react";
import { CommunityHeader } from "@/components/community/CommunityHeader";
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
    newCart[index] = { ...newCart[index], quantity: newQuantity };
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

  return (
    <div className="min-h-screen bg-background">
      <CommunityHeader 
        cartItemCount={cart.length} 
        userRole={userRole}
        userName={currentUser?.email}
      />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Shopping Cart</h1>
            <p className="text-muted-foreground">{cart.length} items</p>
          </div>
        </div>

        {cart.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-4">
                Browse shops and add products to your cart
              </p>
              <Button onClick={() => navigate('/community')}>
                Browse Shops
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Shop Info */}
              {shopInfo && (
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Store className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">{shopInfo.shop_name}</p>
                        <p className="text-sm text-muted-foreground">{shopInfo.district}, {shopInfo.division}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Items */}
              {cart.map((item, index) => (
                <Card key={`${item.id}-${index}`} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center flex-shrink-0">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.brand_name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <ShoppingCart className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="font-semibold text-foreground">{item.brand_name}</h4>
                            {item.weight && (
                              <p className="text-sm text-muted-foreground">{item.weight}</p>
                            )}
                            <Badge variant="secondary" className="text-xs mt-1">
                              {item.product_type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Return Info */}
                        {item.return_cylinder_type && item.return_cylinder_qty > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Returning: {item.return_cylinder_qty} {item.return_cylinder_type} cylinder(s)
                          </p>
                        )}

                        {/* Quantity & Price */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => updateQuantity(index, item.quantity - 1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => updateQuantity(index, item.quantity + 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="font-semibold text-primary">
                            ৳{(item.price * item.quantity).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Clear Cart */}
              <Button 
                variant="ghost" 
                className="text-destructive hover:text-destructive w-full"
                onClick={clearCart}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Cart
              </Button>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                    className="w-full h-12 text-lg bg-gradient-primary"
                    onClick={handleCheckout}
                  >
                    Proceed to Checkout
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Cash on Delivery available
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerCart;
