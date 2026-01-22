import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Clock, ChevronRight, Shield } from "lucide-react";
import { Shop } from "@/hooks/useCommunityData";

interface ShopCardProps {
  shop: Shop;
  onViewDetails: (shop: Shop) => void;
}

export const ShopCard = ({ shop, onViewDetails }: ShopCardProps) => {
  return (
    <Card 
      className="group overflow-hidden border-border bg-card hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => onViewDetails(shop)}
    >
      {/* Cover Image */}
      <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {shop.cover_image_url ? (
          <img 
            src={shop.cover_image_url} 
            alt={shop.shop_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {shop.shop_name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
        
        {/* Status Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {shop.is_open && (
            <Badge className="bg-emerald-500 text-white border-0 text-xs px-2 py-0.5">
              <Clock className="h-3 w-3 mr-1" />
              Open
            </Badge>
          )}
          {shop.is_verified && (
            <Badge className="bg-blue-500 text-white border-0 text-xs px-2 py-0.5">
              <Shield className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>

        {/* Rating */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-foreground">
            <Star className="h-3 w-3 mr-1 fill-amber-400 text-amber-400" />
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
              className="w-12 h-12 rounded-lg object-cover border border-border"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">
                {shop.shop_name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{shop.shop_name}</h3>
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">{shop.district}, {shop.division}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        {shop.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{shop.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{shop.total_orders} orders</span>
            <span>•</span>
            <span>{shop.total_reviews} reviews</span>
          </div>
          <Button size="sm" variant="ghost" className="text-primary hover:text-primary">
            View
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
