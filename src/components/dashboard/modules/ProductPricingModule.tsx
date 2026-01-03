import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, Trash2, Search, Package, ChefHat, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ProductPrice {
  id: string;
  product_type: string;
  brand_id: string | null;
  product_name: string;
  size: string | null;
  variant: string | null;
  company_price: number;
  distributor_price: number;
  retail_price: number;
  package_price: number;
  is_active: boolean;
}

interface LpgBrand {
  id: string;
  name: string;
  color: string;
}

export const ProductPricingModule = () => {
  const [activeTab, setActiveTab] = useState("lpg");
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<ProductPrice[]>([]);
  const [lpgBrands, setLpgBrands] = useState<LpgBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editedPrices, setEditedPrices] = useState<Record<string, Partial<ProductPrice>>>({});
  
  const [newProduct, setNewProduct] = useState({
    product_type: "lpg",
    brand_id: "",
    product_name: "",
    size: "12 kg",
    variant: "Refill",
    company_price: 0,
    distributor_price: 0,
    retail_price: 0,
    package_price: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [productsRes, brandsRes] = await Promise.all([
      supabase.from("product_prices").select("*").eq("is_active", true).order("product_name"),
      supabase.from("lpg_brands").select("id, name, color").eq("is_active", true),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (brandsRes.data) setLpgBrands(brandsRes.data);
    setLoading(false);
  };

  const handlePriceChange = (productId: string, field: keyof ProductPrice, value: number) => {
    setEditedPrices(prev => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value }
    }));
  };

  const saveChanges = async () => {
    const updates = Object.entries(editedPrices);
    if (updates.length === 0) {
      toast({ title: "No changes to save" });
      return;
    }

    for (const [id, changes] of updates) {
      await supabase.from("product_prices").update(changes).eq("id", id);
    }

    toast({ title: "Prices updated successfully" });
    setEditedPrices({});
    fetchData();
  };

  const handleAddProduct = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase.from("product_prices").insert({
      ...newProduct,
      brand_id: newProduct.brand_id || null,
      created_by: user.user.id,
    });

    if (error) {
      toast({ title: "Error adding product", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Product added successfully" });
      setDialogOpen(false);
      setNewProduct({
        product_type: "lpg",
        brand_id: "",
        product_name: "",
        size: "12 kg",
        variant: "Refill",
        company_price: 0,
        distributor_price: 0,
        retail_price: 0,
        package_price: 0,
      });
      fetchData();
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from("product_prices").update({ is_active: false }).eq("id", id);
    if (error) {
      toast({ title: "Error deleting product", variant: "destructive" });
    } else {
      toast({ title: "Product deleted" });
      fetchData();
    }
  };

  const getFilteredProducts = () => {
    return products
      .filter(p => p.product_type === activeTab)
      .filter(p => p.product_name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const groupProductsByBrand = () => {
    const filtered = getFilteredProducts();
    const grouped: Record<string, ProductPrice[]> = {};
    
    filtered.forEach(product => {
      const brand = lpgBrands.find(b => b.id === product.brand_id);
      const brandName = brand?.name || "Other";
      if (!grouped[brandName]) grouped[brandName] = [];
      grouped[brandName].push(product);
    });
    
    return grouped;
  };

  const getValue = (product: ProductPrice, field: keyof ProductPrice) => {
    return editedPrices[product.id]?.[field] ?? product[field];
  };

  const hasChanges = Object.keys(editedPrices).length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Product Pricing</h2>
          <p className="text-muted-foreground">Manage and update prices for all your products</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Product Type</Label>
                  <Select 
                    value={newProduct.product_type} 
                    onValueChange={v => setNewProduct({...newProduct, product_type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lpg">LPG Cylinder</SelectItem>
                      <SelectItem value="stove">Gas Stove</SelectItem>
                      <SelectItem value="regulator">Regulator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newProduct.product_type === "lpg" && (
                  <div className="space-y-2">
                    <Label>Brand</Label>
                    <Select 
                      value={newProduct.brand_id} 
                      onValueChange={v => setNewProduct({...newProduct, brand_id: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {lpgBrands.map(brand => (
                          <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Product Name</Label>
                  <Input 
                    value={newProduct.product_name}
                    onChange={e => setNewProduct({...newProduct, product_name: e.target.value})}
                    placeholder="e.g., Bashundhara LP Gas 12kg Cylinder (22mm) Refill"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Size</Label>
                    <Input 
                      value={newProduct.size || ""}
                      onChange={e => setNewProduct({...newProduct, size: e.target.value})}
                      placeholder="12 kg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Variant</Label>
                    <Select 
                      value={newProduct.variant || "Refill"} 
                      onValueChange={v => setNewProduct({...newProduct, variant: v})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Refill">Refill</SelectItem>
                        <SelectItem value="Package">Package</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Company Price</Label>
                    <Input 
                      type="number"
                      value={newProduct.company_price}
                      onChange={e => setNewProduct({...newProduct, company_price: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Distributor Price</Label>
                    <Input 
                      type="number"
                      value={newProduct.distributor_price}
                      onChange={e => setNewProduct({...newProduct, distributor_price: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Retail Price (Refill)</Label>
                    <Input 
                      type="number"
                      value={newProduct.retail_price}
                      onChange={e => setNewProduct({...newProduct, retail_price: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Package Price (New Connection)</Label>
                    <Input 
                      type="number"
                      value={newProduct.package_price}
                      onChange={e => setNewProduct({...newProduct, package_price: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <Button onClick={handleAddProduct} className="w-full">Add Product</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button 
            onClick={saveChanges} 
            disabled={!hasChanges}
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            Save Changes
            {hasChanges && <Badge variant="secondary" className="ml-1 text-xs">{Object.keys(editedPrices).length}</Badge>}
          </Button>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
            <TabsTrigger value="lpg" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">LPG Cylinders</span>
              <span className="sm:hidden">LPG</span>
            </TabsTrigger>
            <TabsTrigger value="stove" className="gap-2">
              <ChefHat className="h-4 w-4" />
              <span className="hidden sm:inline">Gas Stoves</span>
              <span className="sm:hidden">Stoves</span>
            </TabsTrigger>
            <TabsTrigger value="regulator" className="gap-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Regulators</span>
              <span className="sm:hidden">Reg.</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search products..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/50"
          />
        </div>
      </div>

      {/* Product Tables */}
      {activeTab === "lpg" ? (
        <div className="space-y-6">
          {Object.entries(groupProductsByBrand()).map(([brandName, brandProducts]) => {
            const brand = lpgBrands.find(b => b.name === brandName);
            return (
              <Card key={brandName} className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {brand && (
                      <span 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: brand.color }}
                      />
                    )}
                    {brandName}
                  </CardTitle>
                  <CardDescription>Pricing for all {brandName} cylinder types.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[30%]">Product Name</TableHead>
                        <TableHead className="text-center">Company (/-)</TableHead>
                        <TableHead className="text-center">Distributor (/-)</TableHead>
                        <TableHead className="text-center">Retail/Refill (/-)</TableHead>
                        <TableHead className="text-center">Package (/-)</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {brandProducts.map(product => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{product.product_name}</span>
                              <div className="flex gap-2">
                                {product.size && (
                                  <Badge variant="secondary" className="text-xs">{product.size}</Badge>
                                )}
                                {product.variant && (
                                  <Badge variant="outline" className="text-xs">{product.variant}</Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={getValue(product, "company_price") as number}
                              onChange={e => handlePriceChange(product.id, "company_price", Number(e.target.value))}
                              className="w-20 text-center mx-auto"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={getValue(product, "distributor_price") as number}
                              onChange={e => handlePriceChange(product.id, "distributor_price", Number(e.target.value))}
                              className="w-20 text-center mx-auto"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={getValue(product, "retail_price") as number}
                              onChange={e => handlePriceChange(product.id, "retail_price", Number(e.target.value))}
                              className="w-20 text-center mx-auto"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={getValue(product, "package_price") as number}
                              onChange={e => handlePriceChange(product.id, "package_price", Number(e.target.value))}
                              className="w-20 text-center mx-auto"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
          {Object.keys(groupProductsByBrand()).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No LPG products found. Add your first product to get started.
            </div>
          )}
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40%]">Product Name</TableHead>
                  <TableHead className="text-center">Company Price (/-)</TableHead>
                  <TableHead className="text-center">Distributor Price (/-)</TableHead>
                  <TableHead className="text-center">Retail Price (/-)</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getFilteredProducts().map(product => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{product.product_name}</span>
                        {product.size && (
                          <Badge variant="secondary" className="text-xs w-fit">{product.size}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={getValue(product, "company_price") as number}
                        onChange={e => handlePriceChange(product.id, "company_price", Number(e.target.value))}
                        className="w-24 text-center mx-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={getValue(product, "distributor_price") as number}
                        onChange={e => handlePriceChange(product.id, "distributor_price", Number(e.target.value))}
                        className="w-24 text-center mx-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={getValue(product, "retail_price") as number}
                        onChange={e => handlePriceChange(product.id, "retail_price", Number(e.target.value))}
                        className="w-24 text-center mx-auto"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {getFilteredProducts().length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No {activeTab === "stove" ? "stoves" : "regulators"} found. Add your first product to get started.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};