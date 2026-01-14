import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, DollarSign, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface InventoryPricingCardProps {
  productType: "lpg" | "stove" | "regulator";
  title: string;
  description: string;
  brandFilter?: string;
  sizeFilter?: string;
}

export const InventoryPricingCard = ({
  productType,
  title,
  description,
  brandFilter,
  sizeFilter,
}: InventoryPricingCardProps) => {
  const [products, setProducts] = useState<ProductPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedPrices, setEditedPrices] = useState<Record<string, Partial<ProductPrice>>>({});
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("product_prices")
        .select("*")
        .eq("is_active", true)
        .eq("product_type", productType)
        .order("product_name");

      if (sizeFilter) {
        query = query.ilike("size", `%${sizeFilter}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }, [productType, sizeFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handlePriceChange = (productId: string, field: keyof ProductPrice, value: number) => {
    setEditedPrices(prev => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value }
    }));
  };

  const saveChanges = async () => {
    const updates = Object.entries(editedPrices);
    if (updates.length === 0) {
      toast.info("No changes to save");
      return;
    }

    setSaving(true);
    try {
      for (const [id, changes] of updates) {
        const { error } = await supabase
          .from("product_prices")
          .update(changes)
          .eq("id", id);
        if (error) throw error;
      }

      toast.success("Prices updated successfully");
      setEditedPrices({});
      fetchProducts();
    } catch (error) {
      console.error("Error saving prices:", error);
      toast.error("Failed to update prices");
    } finally {
      setSaving(false);
    }
  };

  const getValue = (product: ProductPrice, field: keyof ProductPrice) => {
    return editedPrices[product.id]?.[field] ?? product[field];
  };

  const hasChanges = Object.keys(editedPrices).length > 0;

  if (loading) {
    return (
      <Card className="border-border bg-card/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="border-border bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No pricing data found. Add products in the Product Pricing page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={saveChanges}
            disabled={!hasChanges || saving}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground font-medium text-xs">Product</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs text-center">Company</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs text-center">Distributor</TableHead>
                <TableHead className="text-muted-foreground font-medium text-xs text-center">Retail</TableHead>
                {productType === "lpg" && (
                  <TableHead className="text-muted-foreground font-medium text-xs text-center">Package</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} className="border-border">
                  <TableCell className="py-2">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-sm text-foreground truncate max-w-[180px]">
                        {product.product_name}
                      </span>
                      <div className="flex gap-1.5">
                        {product.size && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {product.size}
                          </Badge>
                        )}
                        {product.variant && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {product.variant}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <Input
                      type="number"
                      value={getValue(product, "company_price") as number}
                      onChange={(e) => handlePriceChange(product.id, "company_price", Number(e.target.value))}
                      className="w-16 h-8 text-center text-xs mx-auto bg-background"
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <Input
                      type="number"
                      value={getValue(product, "distributor_price") as number}
                      onChange={(e) => handlePriceChange(product.id, "distributor_price", Number(e.target.value))}
                      className="w-16 h-8 text-center text-xs mx-auto bg-background"
                    />
                  </TableCell>
                  <TableCell className="py-2">
                    <Input
                      type="number"
                      value={getValue(product, "retail_price") as number}
                      onChange={(e) => handlePriceChange(product.id, "retail_price", Number(e.target.value))}
                      className="w-16 h-8 text-center text-xs mx-auto bg-background"
                    />
                  </TableCell>
                  {productType === "lpg" && (
                    <TableCell className="py-2">
                      <Input
                        type="number"
                        value={getValue(product, "package_price") as number}
                        onChange={(e) => handlePriceChange(product.id, "package_price", Number(e.target.value))}
                        className="w-16 h-8 text-center text-xs mx-auto bg-background"
                      />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
