import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, 
  MapPin, 
  Filter,
  Loader2,
  Store,
  Users,
  Star,
  TrendingUp
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
import { ShopCard } from "@/components/community/ShopCard";
import { useCommunityData, Shop, CartItem } from "@/hooks/useCommunityData";
import { DIVISIONS, getDistricts } from "@/lib/bangladeshConstants";

const Community = () => {
  const navigate = useNavigate();
  const { shops, loading, currentUser, userRole } = useCommunityData();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('lpg-community-cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Filter shops
  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        shop.shop_name.toLowerCase().includes(searchLower) ||
        shop.district.toLowerCase().includes(searchLower) ||
        shop.division.toLowerCase().includes(searchLower) ||
        shop.address.toLowerCase().includes(searchLower);

      // Division filter
      const matchesDivision = selectedDivision === "all" || shop.division === selectedDivision;

      // District filter
      const matchesDistrict = selectedDistrict === "all" || shop.district === selectedDistrict;

      return matchesSearch && matchesDivision && matchesDistrict;
    });
  }, [shops, searchQuery, selectedDivision, selectedDistrict]);

  // Analytics
  const analytics = useMemo(() => ({
    totalShops: shops.length,
    avgRating: shops.length > 0 
      ? (shops.reduce((sum, s) => sum + (s.rating || 0), 0) / shops.length).toFixed(1) 
      : '0.0',
    totalOrders: shops.reduce((sum, s) => sum + s.total_orders, 0)
  }), [shops]);

  const handleViewShop = (shop: Shop) => {
    navigate(`/community/shop/${shop.id}`);
  };

  const handleCartClick = () => {
    navigate('/community/cart');
  };

  // Get districts based on selected division
  const availableDistricts = selectedDivision !== "all" 
    ? getDistricts(selectedDivision)
    : [];

  // Reset district when division changes
  useEffect(() => {
    setSelectedDistrict("all");
  }, [selectedDivision]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading shops...</p>
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

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <div className="text-center space-y-4 py-8">
          <Badge variant="secondary" className="px-4 py-1">
            <MapPin className="h-3 w-3 mr-1" />
            LPG Shops Near You
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            Find Your <span className="text-primary">LPG Shop</span>
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Order LPG refills, packages, stoves and more from verified shops in Bangladesh
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <Store className="h-6 w-6 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold text-foreground">{analytics.totalShops}</p>
              <p className="text-xs text-muted-foreground">Active Shops</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 mx-auto text-amber-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{analytics.avgRating}</p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
              <p className="text-2xl font-bold text-foreground">{analytics.totalOrders}</p>
              <p className="text-xs text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-border">
          <CardContent className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shops, locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Location Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                <SelectTrigger className="flex-1">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Divisions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {DIVISIONS.map(division => (
                    <SelectItem key={division} value={division}>{division}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={selectedDistrict} 
                onValueChange={setSelectedDistrict}
                disabled={selectedDivision === "all"}
              >
                <SelectTrigger className="flex-1">
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Districts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Districts</SelectItem>
                  {availableDistricts.map(district => (
                    <SelectItem key={district} value={district}>{district}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredShops.length}</span> shops
          </p>
          {(selectedDivision !== "all" || searchQuery) && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedDivision("all");
                setSelectedDistrict("all");
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Shop Grid */}
        {filteredShops.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShops.map(shop => (
              <ShopCard 
                key={shop.id} 
                shop={shop} 
                onViewDetails={handleViewShop}
              />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No shops found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters to find shops
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      <CommunityBottomNav cartItemCount={cart.length} />
    </div>
  );
};

export default Community;
