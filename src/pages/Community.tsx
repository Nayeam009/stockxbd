import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  MapPin, 
  Filter,
  Store,
  Star,
  TrendingUp,
  ShoppingBag,
  X,
  Flame
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
import { ShopCardSkeletonGrid } from "@/components/community/ShopCardSkeleton";
import { LocationSearchCombobox } from "@/components/community/LocationSearchCombobox";
import { useCommunityData, Shop, CartItem } from "@/hooks/useCommunityData";
import { DIVISIONS, getDistricts, getThanas, POPULAR_LOCATIONS } from "@/lib/bangladeshConstants";

const Community = () => {
  const navigate = useNavigate();
  const { shops, loading, currentUser, userRole, fetchShops } = useCommunityData();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedThana, setSelectedThana] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showFilters, setShowFilters] = useState(false);

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
      // Text search filter (shop name, address)
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        shop.shop_name.toLowerCase().includes(searchLower) ||
        shop.address.toLowerCase().includes(searchLower);

      // Location search filter (division, district, thana)
      const locationLower = locationSearch.toLowerCase();
      const matchesLocationSearch = !locationSearch ||
        shop.district.toLowerCase().includes(locationLower) ||
        shop.division.toLowerCase().includes(locationLower) ||
        shop.thana?.toLowerCase().includes(locationLower) ||
        shop.address.toLowerCase().includes(locationLower);

      // Division filter
      const matchesDivision = selectedDivision === "all" || shop.division === selectedDivision;

      // District filter
      const matchesDistrict = selectedDistrict === "all" || shop.district === selectedDistrict;

      // Thana filter
      const matchesThana = selectedThana === "all" || 
        shop.thana?.toLowerCase() === selectedThana.toLowerCase() ||
        shop.address.toLowerCase().includes(selectedThana.toLowerCase());

      return matchesSearch && matchesLocationSearch && matchesDivision && matchesDistrict && matchesThana;
    });
  }, [shops, searchQuery, locationSearch, selectedDivision, selectedDistrict, selectedThana]);

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

  // Get thanas based on selected district
  const availableThanas = selectedDistrict !== "all"
    ? getThanas(selectedDistrict)
    : [];

  // Reset district when division changes
  useEffect(() => {
    setSelectedDistrict("all");
    setSelectedThana("all");
  }, [selectedDivision]);

  // Reset thana when district changes
  useEffect(() => {
    setSelectedThana("all");
  }, [selectedDistrict]);

  // Handle popular location click
  const handlePopularLocationClick = (location: string) => {
    setLocationSearch(location);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery("");
    setLocationSearch("");
    setSelectedDivision("all");
    setSelectedDistrict("all");
    setSelectedThana("all");
  };

  const hasActiveFilters = searchQuery || locationSearch || selectedDivision !== "all";

  // Stats Skeleton for loading state
  const StatsLoadingSkeleton = () => (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="bg-muted/30">
          <CardContent className="p-3 sm:p-4 text-center space-y-2">
            <Skeleton className="h-5 w-5 sm:h-6 sm:w-6 mx-auto rounded" />
            <Skeleton className="h-6 w-12 mx-auto" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <CommunityHeader 
        cartItemCount={cart.length}
        userRole={userRole}
        userName={currentUser?.email}
        onCartClick={handleCartClick}
      />

      <main className="container mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Hero Section - Compact on mobile */}
        <div className="text-center space-y-3 py-4 sm:py-8">
          <Badge variant="secondary" className="px-3 py-1 text-xs sm:text-sm">
            <Flame className="h-3 w-3 mr-1 text-orange-500" />
            LPG Shops Near You
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground">
            Find Your <span className="text-primary">LPG Shop</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            Order refills, packages, stoves and more from verified shops
          </p>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <StatsLoadingSkeleton />
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4 text-center">
                <Store className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-primary mb-1 sm:mb-2" aria-hidden="true" />
                <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{analytics.totalShops}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Active Shops</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20 hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4 text-center">
                <Star className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-amber-500 mb-1 sm:mb-2" aria-hidden="true" />
                <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{analytics.avgRating}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Avg Rating</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4 text-center">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 mx-auto text-emerald-500 mb-1 sm:mb-2" aria-hidden="true" />
                <p className="text-xl sm:text-2xl font-bold text-foreground tabular-nums">{analytics.totalOrders}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Orders</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filters */}
        <Card className="border-border overflow-hidden">
          <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            {/* Search Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              {/* Shop Name Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Search shop name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base input-accessible"
                  aria-label="Search shops by name"
                  autoComplete="off"
                />
              </div>

              {/* Location Search Combobox */}
              <LocationSearchCombobox
                value={locationSearch}
                onValueChange={setLocationSearch}
                placeholder="Search location..."
              />
            </div>

            {/* Popular Location Chips - Scrollable on mobile with fade edges */}
            <div className="relative">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide scroll-smooth" role="group" aria-label="Popular locations">
                <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">Popular:</span>
                {POPULAR_LOCATIONS.slice(0, 5).map(location => (
                  <Badge 
                    key={location}
                    variant={locationSearch === location ? "default" : "outline"}
                    className="cursor-pointer transition-all hover:bg-accent whitespace-nowrap flex-shrink-0 h-8 touch-target active:scale-95"
                    onClick={() => handlePopularLocationClick(location)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handlePopularLocationClick(location)}
                  >
                    <MapPin className="h-3 w-3 mr-1" aria-hidden="true" />
                    {location}
                  </Badge>
                ))}
              </div>
              {/* Fade edge indicator */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent pointer-events-none sm:hidden" aria-hidden="true" />
            </div>

            {/* Collapsible Filters */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {hasActiveFilters && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-primary" />
                )}
              </Button>
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-9 text-destructive hover:text-destructive"
                  onClick={clearAllFilters}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Three-Tier Location Filters - Collapsible */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-2 border-t">
                {/* Division Filter */}
                <Select value={selectedDivision} onValueChange={setSelectedDivision}>
                  <SelectTrigger className="h-11 sm:h-12 text-base">
                    <SelectValue placeholder="All Divisions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Divisions</SelectItem>
                    {DIVISIONS.map(division => (
                      <SelectItem key={division} value={division}>{division}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* District Filter */}
                <Select 
                  value={selectedDistrict} 
                  onValueChange={setSelectedDistrict}
                  disabled={selectedDivision === "all"}
                >
                  <SelectTrigger className="h-11 sm:h-12 text-base">
                    <SelectValue placeholder="All Districts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Districts</SelectItem>
                    {availableDistricts.map(district => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Thana Filter */}
                <Select 
                  value={selectedThana} 
                  onValueChange={setSelectedThana}
                  disabled={selectedDistrict === "all"}
                >
                  <SelectTrigger className="h-11 sm:h-12 text-base">
                    <SelectValue placeholder="All Thanas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Thanas</SelectItem>
                    {availableThanas.map(thana => (
                      <SelectItem key={thana} value={thana}>{thana}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Header */}
        <div className="flex items-center justify-between px-1">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredShops.length}</span> shops
          </p>
        </div>

        {/* Shop Grid */}
        {loading ? (
          <ShopCardSkeletonGrid count={6} />
        ) : filteredShops.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
            <CardContent className="p-8 sm:p-12 text-center">
              {/* Empty State Illustration */}
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center mb-4 relative">
                <Store className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-2">No shops found</h3>
              <p className="text-muted-foreground mb-4 max-w-xs mx-auto">
                {hasActiveFilters 
                  ? "Try adjusting your search or filters to find more shops"
                  : "There are no shops listed in this area yet"
                }
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearAllFilters} className="h-11 touch-target">
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <CommunityBottomNav cartItemCount={cart.length} userRole={userRole} />
    </div>
  );
};

export default Community;
