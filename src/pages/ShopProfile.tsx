import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Star, 
  MapPin, 
  Phone, 
  Clock,
  Shield,
  MessageCircle,
  Flame,
  Package,
  Loader2,
  Edit,
  Sparkles,
  RefreshCcw
} from "lucide-react";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CommunityBottomNav } from "@/components/community/CommunityBottomNav";
import { OnlineProductSelector } from "@/components/community/OnlineProductSelector";
import { CylinderExchangeRequestCard } from "@/components/community/CylinderExchangeRequestCard";
import { useCommunityData, Shop, ShopProduct, CartItem } from "@/hooks/useCommunityData";
import { toast } from "@/hooks/use-toast";

const ShopProfile = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const { fetchShopById, fetchShopProducts, currentUser, userRole, userShop } = useCommunityData();

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState("products");

  // Check if this is the owner's own shop
  const isOwnShop = userShop?.id === shopId;
  const isOwner = userRole === 'owner';
  const isWholesaleCustomer = userRole === 'owner' || userRole === 'manager';

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

  // Fetch shop data
  useEffect(() => {
    const loadData = async () => {
      if (!shopId) return;
      
      setLoading(true);
      const [shopData, productsData] = await Promise.all([
        fetchShopById(shopId),
        fetchShopProducts(shopId)
      ]);
      
      setShop(shopData);
      setProducts(productsData);
      setLoading(false);
    };

    loadData();
  }, [shopId, fetchShopById, fetchShopProducts]);

  // Handle checkout from POS-style selector
  const handleCheckout = (items: CartItem[]) => {
    if (!shop) return;
    
    // Add shop info to all items
    const itemsWithShop = items.map(item => ({ ...item, shop }));
    setCart(itemsWithShop);
    
    toast({
      title: "Cart Updated",
      description: `${items.length} item(s) ready for checkout`,
    });
    
    navigate('/community/cart');
  };

  const handleAddToCart = (item: CartItem) => {
    // Check if adding from different shop
    if (cart.length > 0 && cart[0].shop_id !== item.shop_id) {
      toast({
        title: "Different shop",
        description: "Clear your cart first to order from a different shop",
        variant: "destructive"
      });
      return;
    }

    // Add shop info to item
    const itemWithShop = { ...item, shop };

    // Check if item already in cart
    const existingIndex = cart.findIndex(c => c.id === item.id);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex] = itemWithShop;
      setCart(newCart);
    } else {
      setCart([...cart, itemWithShop]);
    }

    toast({
      title: "Added to cart",
      description: `${item.brand_name} ${item.weight || ''} x${item.quantity}`,
    });
  };

  const handleCartClick = () => {
    navigate('/community/cart');
  };

  // No longer needed - OnlineProductSelector handles grouping internally

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen bg-background">
        <CommunityHeader cartItemCount={cart.length} userRole={userRole} onCartClick={handleCartClick} />
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Shop not found</h2>
          <Button onClick={() => navigate('/community')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shops
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <CommunityHeader 
        cartItemCount={cart.length} 
        userRole={userRole}
        userName={currentUser?.email}
        onCartClick={handleCartClick} 
      />

      {/* Back Button */}
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/community')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Shops
        </Button>
        
        {/* Owner badges and actions */}
        <div className="flex items-center gap-2">
          {isOwnShop && (
            <>
              <Badge className="bg-purple-500/15 text-purple-600 border-purple-500/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Your Shop
              </Badge>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => navigate('/dashboard?module=my-shop')}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </>
          )}
          {isWholesaleCustomer && !isOwnShop && (
            <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">
              Wholesale Customer
            </Badge>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {shop.cover_image_url ? (
          <img 
            src={shop.cover_image_url} 
            alt={shop.shop_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Flame className="h-24 w-24 text-primary/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Shop Info */}
      <div className="container mx-auto px-4 -mt-16 relative z-10">
        <Card className="border-border">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Logo */}
              {shop.logo_url ? (
                <img 
                  src={shop.logo_url} 
                  alt={shop.shop_name}
                  className="w-20 h-20 rounded-xl object-cover border-4 border-background shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center border-4 border-background shadow-lg">
                  <span className="text-2xl font-bold text-primary-foreground">
                    {shop.shop_name.charAt(0)}
                  </span>
                </div>
              )}

              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">{shop.shop_name}</h1>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {shop.is_open && (
                        <Badge className="bg-emerald-500 text-white border-0">
                          <Clock className="h-3 w-3 mr-1" />
                          Open Now
                        </Badge>
                      )}
                      {shop.is_verified && (
                        <Badge className="bg-blue-500 text-white border-0">
                          <Shield className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-full">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{shop.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-muted-foreground text-sm">({shop.total_reviews})</span>
                  </div>
                </div>

                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1 flex-shrink-0" />
                  <span>{shop.address}, {shop.district}, {shop.division}</span>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <a href={`tel:${shop.phone}`}>
                    <Button size="sm" variant="outline">
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                  </a>
                  {shop.whatsapp && (
                    <a href={`https://wa.me/${shop.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="products" className="flex-1 sm:flex-none">
              <Package className="h-4 w-4 mr-2" />
              Products
            </TabsTrigger>
            {isOwner && !isOwnShop && userShop && currentUser && (
              <TabsTrigger value="exchange" className="flex-1 sm:flex-none">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Exchange
              </TabsTrigger>
            )}
            <TabsTrigger value="about" className="flex-1 sm:flex-none">
              About
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex-1 sm:flex-none">
              Reviews ({shop.total_reviews})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-6">
            {products.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold">No products listed yet</h3>
                  <p className="text-muted-foreground">This shop hasn't added any products</p>
                  {isOwnShop && (
                    <Button 
                      className="mt-4"
                      onClick={() => navigate('/dashboard?module=my-shop')}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Add Products
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <OnlineProductSelector
                products={products}
                onCheckout={handleCheckout}
                isWholesale={isWholesaleCustomer}
              />
            )}
          </TabsContent>

          {/* Cylinder Exchange Tab - Only for owners viewing other shops */}
          {isOwner && !isOwnShop && userShop && currentUser && (
            <TabsContent value="exchange" className="mt-6">
              <div className="max-w-md mx-auto">
                <CylinderExchangeRequestCard
                  targetShopId={shop.id}
                  requesterShopId={userShop.id}
                  requesterId={currentUser.id}
                  targetShopName={shop.shop_name}
                />
              </div>
            </TabsContent>
          )}

          <TabsContent value="about" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>About {shop.shop_name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {shop.description && (
                  <p className="text-muted-foreground">{shop.description}</p>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold">{shop.total_orders}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground">Delivery Fee</p>
                    <p className="text-2xl font-bold">৳{shop.delivery_fee}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Contact</h4>
                  <p className="text-muted-foreground flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {shop.phone}
                  </p>
                  <p className="text-muted-foreground flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {shop.address}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold">Reviews coming soon</h3>
                <p className="text-muted-foreground">Customer reviews will appear here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating cart removed - OnlineProductSelector has built-in checkout */}

      <CommunityBottomNav cartItemCount={cart.length} userRole={userRole} />
    </div>
  );
};

export default ShopProfile;
