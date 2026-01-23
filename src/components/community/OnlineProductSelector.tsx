import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Flame, 
  Package,
  RotateCcw,
  AlertCircle,
  ChefHat,
  Gauge,
  CheckCircle2
} from "lucide-react";
import { ShopProduct, CartItem } from "@/hooks/useCommunityData";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SaleItem {
  id: string;
  product: ShopProduct;
  quantity: number;
}

interface ReturnItem {
  id: string;
  productId: string;
  brandName: string;
  weight: string;
  quantity: number;
  type: 'empty' | 'leaked';
}

interface OnlineProductSelectorProps {
  products: ShopProduct[];
  onCheckout: (items: CartItem[]) => void;
  isWholesale?: boolean;
}

export const OnlineProductSelector = ({ 
  products, 
  onCheckout,
  isWholesale = false 
}: OnlineProductSelectorProps) => {
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [activeTable, setActiveTable] = useState<'sale' | 'return'>('sale');
  const [selectedWeight, setSelectedWeight] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Group products by type
  const lpgProducts = useMemo(() => 
    products.filter(p => p.product_type === 'lpg_refill' || p.product_type === 'lpg_package'),
    [products]
  );

  const stoveProducts = useMemo(() => 
    products.filter(p => p.product_type === 'stove'),
    [products]
  );

  const regulatorProducts = useMemo(() => 
    products.filter(p => p.product_type === 'regulator'),
    [products]
  );

  // Get unique weights for filter
  const availableWeights = useMemo(() => {
    const weights = new Set(lpgProducts.map(p => p.weight).filter(Boolean));
    return Array.from(weights);
  }, [lpgProducts]);

  // Filter products
  const filteredLpgProducts = useMemo(() => {
    return lpgProducts.filter(p => {
      if (selectedWeight !== 'all' && p.weight !== selectedWeight) return false;
      if (selectedType !== 'all') {
        if (selectedType === 'refill' && p.product_type !== 'lpg_refill') return false;
        if (selectedType === 'package' && p.product_type !== 'lpg_package') return false;
      }
      return true;
    });
  }, [lpgProducts, selectedWeight, selectedType]);

  // Calculate totals
  const totalRefillQty = saleItems
    .filter(i => i.product.product_type === 'lpg_refill')
    .reduce((sum, i) => sum + i.quantity, 0);

  const totalReturnQty = returnItems.reduce((sum, i) => sum + i.quantity, 0);

  const totalAmount = saleItems.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);

  const returnBalanced = totalRefillQty === 0 || totalRefillQty === totalReturnQty;

  // Add product to sale
  const addToSale = (product: ShopProduct) => {
    const existing = saleItems.find(i => i.product.id === product.id);
    
    if (existing) {
      setSaleItems(saleItems.map(i => 
        i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setSaleItems([...saleItems, {
        id: `sale-${Date.now()}`,
        product,
        quantity: 1
      }]);
    }

    // Auto-add return item for refill
    if (product.product_type === 'lpg_refill') {
      const existingReturn = returnItems.find(r => 
        r.brandName === product.brand_name && r.weight === product.weight
      );
      
      if (existingReturn) {
        setReturnItems(returnItems.map(r => 
          r.id === existingReturn.id ? { ...r, quantity: r.quantity + 1 } : r
        ));
      } else {
        setReturnItems([...returnItems, {
          id: `return-${Date.now()}`,
          productId: product.id,
          brandName: product.brand_name,
          weight: product.weight || '',
          quantity: 1,
          type: 'empty'
        }]);
      }
      
      toast({ 
        title: "Added to Order",
        description: `${product.brand_name} + Return cylinder added` 
      });
    } else {
      toast({ title: "Added to Order" });
    }
  };

  // Update sale quantity
  const updateSaleQty = (id: string, delta: number) => {
    const item = saleItems.find(i => i.id === id);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeSaleItem(id);
      return;
    }

    setSaleItems(saleItems.map(i => 
      i.id === id ? { ...i, quantity: newQty } : i
    ));

    // Sync return qty for refills
    if (item.product.product_type === 'lpg_refill') {
      const existingReturn = returnItems.find(r => 
        r.brandName === item.product.brand_name && r.weight === item.product.weight
      );
      if (existingReturn) {
        const newReturnQty = existingReturn.quantity + delta;
        if (newReturnQty <= 0) {
          setReturnItems(returnItems.filter(r => r.id !== existingReturn.id));
        } else {
          setReturnItems(returnItems.map(r => 
            r.id === existingReturn.id ? { ...r, quantity: newReturnQty } : r
          ));
        }
      }
    }
  };

  // Remove sale item
  const removeSaleItem = (id: string) => {
    const item = saleItems.find(i => i.id === id);
    setSaleItems(saleItems.filter(i => i.id !== id));
    
    // Remove linked return for refills
    if (item?.product.product_type === 'lpg_refill') {
      setReturnItems(returnItems.filter(r => 
        !(r.brandName === item.product.brand_name && r.weight === item.product.weight)
      ));
    }
  };

  // Add return item manually
  const addReturnItem = (product: ShopProduct) => {
    if (product.product_type !== 'lpg_refill' && product.product_type !== 'lpg_package') return;

    const existing = returnItems.find(r => 
      r.brandName === product.brand_name && r.weight === product.weight
    );

    if (existing) {
      setReturnItems(returnItems.map(r => 
        r.id === existing.id ? { ...r, quantity: r.quantity + 1 } : r
      ));
    } else {
      setReturnItems([...returnItems, {
        id: `return-${Date.now()}`,
        productId: product.id,
        brandName: product.brand_name,
        weight: product.weight || '',
        quantity: 1,
        type: 'empty'
      }]);
    }
    toast({ title: "Return cylinder added" });
  };

  // Update return quantity
  const updateReturnQty = (id: string, delta: number) => {
    const item = returnItems.find(i => i.id === id);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      setReturnItems(returnItems.filter(i => i.id !== id));
      return;
    }

    setReturnItems(returnItems.map(i => 
      i.id === id ? { ...i, quantity: newQty } : i
    ));
  };

  // Toggle return type
  const toggleReturnType = (id: string) => {
    setReturnItems(returnItems.map(i => 
      i.id === id ? { ...i, type: i.type === 'empty' ? 'leaked' : 'empty' } : i
    ));
  };

  // Handle checkout
  const handleCheckout = () => {
    if (saleItems.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }

    // Check refill return balance
    const refillItems = saleItems.filter(i => i.product.product_type === 'lpg_refill');
    const refillQty = refillItems.reduce((sum, i) => sum + i.quantity, 0);
    
    if (refillQty > 0 && totalReturnQty !== refillQty) {
      toast({ 
        title: "Return Cylinder Required",
        description: `Please select ${refillQty} return cylinder(s) for your refill order`,
        variant: "destructive"
      });
      setActiveTable('return');
      return;
    }

    // Convert to cart items
    const cartItems: CartItem[] = saleItems.map(item => {
      const linkedReturn = returnItems.find(r => 
        r.brandName === item.product.brand_name && r.weight === item.product.weight
      );

      return {
        ...item.product,
        quantity: item.quantity,
        return_cylinder_qty: linkedReturn?.quantity || 0,
        return_cylinder_type: linkedReturn?.type || null
      };
    });

    onCheckout(cartItems);
  };

  // Clear all
  const clearAll = () => {
    setSaleItems([]);
    setReturnItems([]);
  };

  return (
    <div className="space-y-4">
      {/* Mobile Table Toggle */}
      <div className="sm:hidden">
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={activeTable === 'sale' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "h-12 flex-col gap-0.5",
              activeTable === 'sale' && "bg-emerald-600 hover:bg-emerald-700"
            )}
            onClick={() => setActiveTable('sale')}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="text-xs">Order ({saleItems.length})</span>
          </Button>
          <Button
            variant={activeTable === 'return' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "h-12 flex-col gap-0.5",
              activeTable === 'return' && "bg-amber-600 hover:bg-amber-700"
            )}
            onClick={() => setActiveTable('return')}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="text-xs">Return ({returnItems.length})</span>
          </Button>
        </div>
      </div>

      {/* Desktop: Side by Side Tables */}
      <div className="hidden sm:grid sm:grid-cols-2 gap-4">
        {/* Sale Items Table */}
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardHeader className="py-3 bg-emerald-50 dark:bg-emerald-950/30">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-emerald-600" />
              Your Order
              <Badge variant="secondary">{saleItems.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {saleItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select products below</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center w-24">Qty</TableHead>
                    <TableHead className="text-right w-20">Price</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.product.brand_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.product.weight} • {item.product.product_type === 'lpg_refill' ? 'Refill' : 'Package'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => updateSaleQty(item.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center font-medium">{item.quantity}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => updateSaleQty(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ৳{(item.product.price * item.quantity).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeSaleItem(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Return Items Table */}
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="py-3 bg-amber-50 dark:bg-amber-950/30">
            <CardTitle className="text-sm flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-600" />
              Return Cylinders
              <Badge variant="secondary">{returnItems.length}</Badge>
              {totalRefillQty > 0 && (
                <Badge 
                  variant={returnBalanced ? "default" : "destructive"}
                  className={cn(
                    "ml-auto",
                    returnBalanced && "bg-emerald-500"
                  )}
                >
                  {returnBalanced ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" /> Matched</>
                  ) : (
                    <><AlertCircle className="h-3 w-3 mr-1" /> Need {totalRefillQty - totalReturnQty}</>
                  )}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {returnItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No return cylinders</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cylinder</TableHead>
                    <TableHead className="text-center w-24">Qty</TableHead>
                    <TableHead className="text-center w-20">Type</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.brandName}</div>
                        <div className="text-xs text-muted-foreground">{item.weight}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => updateReturnQty(item.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center font-medium">{item.quantity}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={() => updateReturnQty(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant={item.type === 'leaked' ? 'destructive' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => toggleReturnType(item.id)}
                        >
                          {item.type === 'empty' ? 'Empty' : 'Leaked'}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setReturnItems(returnItems.filter(r => r.id !== item.id))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile: Single Table View */}
      <div className="sm:hidden">
        {activeTable === 'sale' ? (
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardHeader className="py-3 bg-emerald-50 dark:bg-emerald-950/30">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-600" />
                Your Order
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {saleItems.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Select products below</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {saleItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.product.brand_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.product.weight} • ৳{item.product.price}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-9 w-9"
                          onClick={() => updateSaleQty(item.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-9 w-9"
                          onClick={() => updateSaleQty(item.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-9 w-9 text-destructive"
                        onClick={() => removeSaleItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-amber-200 dark:border-amber-800">
            <CardHeader className="py-3 bg-amber-50 dark:bg-amber-950/30">
              <CardTitle className="text-sm flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-amber-600" />
                Return Cylinders
                {totalRefillQty > 0 && (
                  <Badge 
                    variant={returnBalanced ? "default" : "destructive"}
                    className={cn("ml-auto", returnBalanced && "bg-emerald-500")}
                  >
                    {returnBalanced ? "Matched" : `Need ${totalRefillQty - totalReturnQty}`}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              {returnItems.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No return cylinders selected</p>
                  {totalRefillQty > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Select {totalRefillQty} empty cylinder(s) to return
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {returnItems.map(item => (
                    <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.brandName}</div>
                        <div className="text-xs text-muted-foreground">{item.weight}</div>
                      </div>
                      <Button
                        variant={item.type === 'leaked' ? 'destructive' : 'outline'}
                        size="sm"
                        className="h-9 text-xs px-3"
                        onClick={() => toggleReturnType(item.id)}
                      >
                        {item.type === 'empty' ? 'Empty' : 'Leaked'}
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-9 w-9"
                          onClick={() => updateReturnQty(item.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-9 w-9"
                          onClick={() => updateReturnQty(item.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Product Selection Grid */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Select Products</CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <Tabs defaultValue="lpg" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-11">
              <TabsTrigger value="lpg" className="text-xs sm:text-sm h-10">
                <Flame className="h-4 w-4 mr-1" />
                LPG ({lpgProducts.length})
              </TabsTrigger>
              <TabsTrigger value="stove" className="text-xs sm:text-sm h-10">
                <ChefHat className="h-4 w-4 mr-1" />
                Stoves ({stoveProducts.length})
              </TabsTrigger>
              <TabsTrigger value="regulator" className="text-xs sm:text-sm h-10">
                <Gauge className="h-4 w-4 mr-1" />
                Regulators ({regulatorProducts.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="lpg" className="mt-4 space-y-3">
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <div className="flex gap-1 flex-wrap">
                  <Button
                    variant={selectedType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    className="h-9"
                    onClick={() => setSelectedType('all')}
                  >
                    All
                  </Button>
                  <Button
                    variant={selectedType === 'refill' ? 'default' : 'outline'}
                    size="sm"
                    className="h-9"
                    onClick={() => setSelectedType('refill')}
                  >
                    Refill
                  </Button>
                  <Button
                    variant={selectedType === 'package' ? 'default' : 'outline'}
                    size="sm"
                    className="h-9"
                    onClick={() => setSelectedType('package')}
                  >
                    Package
                  </Button>
                </div>
                <div className="h-9 w-px bg-border hidden sm:block" />
                <div className="flex gap-1 flex-wrap">
                  <Button
                    variant={selectedWeight === 'all' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-9"
                    onClick={() => setSelectedWeight('all')}
                  >
                    All Weights
                  </Button>
                  {availableWeights.map(weight => (
                    <Button
                      key={weight}
                      variant={selectedWeight === weight ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-9"
                      onClick={() => setSelectedWeight(weight!)}
                    >
                      {weight}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Product Grid */}
              {filteredLpgProducts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Flame className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No LPG products available</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {filteredLpgProducts.map(product => {
                    const inCart = saleItems.find(i => i.product.id === product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => activeTable === 'return' ? addReturnItem(product) : addToSale(product)}
                        className={cn(
                          "p-3 rounded-lg border-2 text-left transition-all",
                          "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                          inCart 
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" 
                            : "border-border hover:border-primary/50",
                          activeTable === 'return' && "border-amber-300 hover:border-amber-500"
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <Flame className={cn(
                            "h-5 w-5 flex-shrink-0",
                            product.product_type === 'lpg_refill' ? "text-orange-500" : "text-blue-500"
                          )} />
                          {inCart && (
                            <Badge className="bg-emerald-500 text-white text-[10px] px-1.5">
                              ×{inCart.quantity}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2">
                          <div className="font-semibold text-sm truncate">{product.brand_name}</div>
                          <div className="text-xs text-muted-foreground">{product.weight}</div>
                          <Badge variant="outline" className="text-[10px] mt-1">
                            {product.product_type === 'lpg_refill' ? 'Refill' : 'Package'}
                          </Badge>
                        </div>
                        <div className="mt-2 font-bold text-primary">
                          ৳{product.price.toLocaleString()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="stove" className="mt-4">
              {stoveProducts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <ChefHat className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No stoves available</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {stoveProducts.map(product => {
                    const inCart = saleItems.find(i => i.product.id === product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => addToSale(product)}
                        className={cn(
                          "p-3 rounded-lg border-2 text-left transition-all",
                          "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                          inCart 
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <ChefHat className="h-5 w-5 text-amber-600 flex-shrink-0" />
                          {inCart && (
                            <Badge className="bg-emerald-500 text-white text-[10px] px-1.5">
                              ×{inCart.quantity}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2">
                          <div className="font-semibold text-sm truncate">{product.brand_name}</div>
                          <div className="text-xs text-muted-foreground">{product.description || 'Stove'}</div>
                        </div>
                        <div className="mt-2 font-bold text-primary">
                          ৳{product.price.toLocaleString()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="regulator" className="mt-4">
              {regulatorProducts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Gauge className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No regulators available</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {regulatorProducts.map(product => {
                    const inCart = saleItems.find(i => i.product.id === product.id);
                    return (
                      <button
                        key={product.id}
                        onClick={() => addToSale(product)}
                        className={cn(
                          "p-3 rounded-lg border-2 text-left transition-all",
                          "hover:shadow-md hover:scale-[1.02] active:scale-[0.98]",
                          inCart 
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <Gauge className="h-5 w-5 text-blue-500 flex-shrink-0" />
                          {inCart && (
                            <Badge className="bg-emerald-500 text-white text-[10px] px-1.5">
                              ×{inCart.quantity}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2">
                          <div className="font-semibold text-sm truncate">{product.brand_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {product.valve_size || 'Regulator'}
                          </div>
                        </div>
                        <div className="mt-2 font-bold text-primary">
                          ৳{product.price.toLocaleString()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Checkout Footer */}
      {saleItems.length > 0 && (
        <div className="sticky bottom-20 sm:bottom-4 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t sm:border sm:rounded-xl sm:shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-muted-foreground">
                {saleItems.reduce((sum, i) => sum + i.quantity, 0)} items
              </div>
              <div className="text-xl font-bold">৳{totalAmount.toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear
              </Button>
              <Button 
                className="h-12 px-6 bg-gradient-primary"
                onClick={handleCheckout}
                disabled={!returnBalanced && totalRefillQty > 0}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Checkout
              </Button>
            </div>
          </div>
          
          {/* Return Warning */}
          {totalRefillQty > 0 && !returnBalanced && (
            <div className="mt-2 p-2 bg-amber-100 dark:bg-amber-950/50 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-400 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              Select {totalRefillQty - totalReturnQty} more return cylinder(s) for refill order
            </div>
          )}
        </div>
      )}
    </div>
  );
};
