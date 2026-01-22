import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Minus, Flame, Package } from "lucide-react";
import { ShopProduct, CartItem } from "@/hooks/useCommunityData";
import { useState } from "react";

interface ProductCardProps {
  product: ShopProduct;
  onAddToCart: (item: CartItem) => void;
  cartItem?: CartItem;
}

export const ProductCard = ({ product, onAddToCart, cartItem }: ProductCardProps) => {
  const [quantity, setQuantity] = useState(cartItem?.quantity || 1);
  const [returnQty, setReturnQty] = useState(cartItem?.return_cylinder_qty || 0);
  const [returnType, setReturnType] = useState<'empty' | 'leaked' | null>(cartItem?.return_cylinder_type || null);

  const isLpg = product.product_type === 'lpg_refill' || product.product_type === 'lpg_package';

  const getProductIcon = () => {
    switch (product.product_type) {
      case 'lpg_refill':
      case 'lpg_package':
        return <Flame className="h-8 w-8 text-orange-500" />;
      default:
        return <Package className="h-8 w-8 text-primary" />;
    }
  };

  const getProductTypeLabel = () => {
    switch (product.product_type) {
      case 'lpg_refill':
        return 'Refill';
      case 'lpg_package':
        return 'Package';
      case 'stove':
        return 'Stove';
      case 'regulator':
        return 'Regulator';
      default:
        return 'Accessory';
    }
  };

  const handleAddToCart = () => {
    const item: CartItem = {
      ...product,
      quantity,
      return_cylinder_qty: returnQty,
      return_cylinder_type: returnType
    };
    onAddToCart(item);
  };

  return (
    <Card className="overflow-hidden border-border bg-card hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        {/* Product Image/Icon */}
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center flex-shrink-0">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.brand_name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              getProductIcon()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <Badge variant="secondary" className="text-xs mb-1">
              {getProductTypeLabel()}
            </Badge>
            <h4 className="font-semibold text-foreground">{product.brand_name}</h4>
            {product.weight && (
              <p className="text-sm text-muted-foreground">{product.weight}</p>
            )}
            {product.valve_size && (
              <p className="text-xs text-muted-foreground">Valve: {product.valve_size}</p>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-primary">৳{product.price}</span>
            <span className="text-sm text-muted-foreground">/unit</span>
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Quantity</span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium">{quantity}</span>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Return Cylinder (for LPG products) */}
          {isLpg && (
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Returning cylinder?</span>
              <div className="flex items-center gap-2">
                <Button 
                  variant={returnType === 'empty' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    setReturnType(returnType === 'empty' ? null : 'empty');
                    setReturnQty(returnType === 'empty' ? 0 : quantity);
                  }}
                >
                  Empty
                </Button>
                <Button 
                  variant={returnType === 'leaked' ? 'destructive' : 'outline'}
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    setReturnType(returnType === 'leaked' ? null : 'leaked');
                    setReturnQty(returnType === 'leaked' ? 0 : quantity);
                  }}
                >
                  Leaked
                </Button>
              </div>
              {returnType && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Return qty</span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => setReturnQty(Math.max(0, returnQty - 1))}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{returnQty}</span>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => setReturnQty(Math.min(quantity, returnQty + 1))}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add to Cart */}
        <Button 
          className="w-full bg-gradient-primary hover:opacity-90" 
          onClick={handleAddToCart}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Add to Cart • ৳{(product.price * quantity).toLocaleString()}
        </Button>
      </CardContent>
    </Card>
  );
};
