import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Clock, ChevronRight, Shield, TrendingUp, Truck } from "lucide-react";
import { Shop } from "@/hooks/useCommunityData";

interface ShopCardProps {
  shop: Shop;
  onViewDetails: (shop: Shop) => void;
}

export const ShopCard = ({ shop, onViewDetails }: ShopCardProps) => {
  const isPopular = shop.total_orders >= 50;
  const hasHighRating = (shop.rating || 0) >= 4.5;

  return (
    <Card 
      className="group overflow-hidden border-border bg-card hover:shadow-elegant-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]"
      onClick={() => onViewDetails(shop)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onViewDetails(shop)}
      role="article"
      aria-label={`${shop.shop_name} - ${shop.is_open ? 'Open' : 'Closed'} - Rating: ${shop.rating?.toFixed(1) || '0.0'}`}
    >
      {/* Cover Image */}
      <div className="relative h-36 sm:h-40 bg-gradient-to-br from-primary/20 via-primary/10 to-accent/5 overflow-hidden">
        {shop.cover_image_url ? (
          <img 
            src={shop.cover_image_url} 
            alt=""
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <span className="text-2xl font-bold text-primary" aria-hidden="true">
                {shop.shop_name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
          {shop.is_open && (
            <Badge className="bg-emerald-500 text-white border-0 text-xs px-2 py-0.5 shadow-sm">
              <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
              Open
            </Badge>
          )}
          {shop.is_verified && (
            <Badge className="bg-blue-500 text-white border-0 text-xs px-2 py-0.5 shadow-sm">
              <Shield className="h-3 w-3 mr-1" aria-hidden="true" />
              Verified
            </Badge>
          )}
          {isPopular && (
            <Badge className="bg-amber-500 text-white border-0 text-xs px-2 py-0.5 shadow-sm">
              <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />
              Popular
            </Badge>
          )}
        </div>

        {/* Rating Badge */}
        <div className="absolute top-2 right-2">
          <Badge 
            variant="secondary" 
            className={`bg-background/95 backdrop-blur-sm text-foreground shadow-sm ${hasHighRating ? 'ring-1 ring-amber-400/50' : ''}`}
          >
            <Star className={`h-3 w-3 mr-1 ${hasHighRating ? 'fill-amber-400 text-amber-400' : 'fill-muted-foreground/30 text-muted-foreground'}`} aria-hidden="true" />
            {shop.rating?.toFixed(1) || '0.0'}
          </Badge>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Shop Name & Logo */}
        <div className="flex items-start gap-3">
          {shop.logo_url ? (
            <img 
              src={shop.logo_url} 
              alt={shop.shop_name}
              className="w-12 h-12 rounded-lg object-cover border border-border shadow-sm group-hover:shadow-md transition-shadow"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <span className="text-lg font-bold text-primary-foreground">
                {shop.shop_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">{shop.shop_name}</h3>
            <div className="flex items-center text-sm text-muted-foreground mt-0.5">
              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{shop.district}, {shop.division}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {shop.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{shop.description}</p>
        )}

        {/* Delivery Info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Truck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>৳{shop.delivery_fee || 50} delivery</span>
          <span aria-hidden="true">•</span>
          <span>~30 min</span>
        </div>

        {/* Stats & Action */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
            <span>{shop.total_orders} orders</span>
            <span aria-hidden="true">•</span>
            <span>{shop.total_reviews} reviews</span>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-primary hover:text-primary hover:bg-primary/10 h-9 touch-target group-hover:bg-primary group-hover:text-primary-foreground transition-colors" 
            aria-label={`View ${shop.shop_name} details`}
          >
            View
            <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
