import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Minus, Trash2, Search, ChefHat, Package, TrendingUp, AlertTriangle, Flame } from "lucide-react";
import { toast } from "sonner";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { syncStoveToPricing } from "@/hooks/useInventoryPricingSync";
import { useLanguage } from "@/contexts/LanguageContext";

interface Stove {
  id: string;
  brand: string;
  model: string;
  burners: number;
  quantity: number;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const StoveStockModule = () => {
  const { t } = useLanguage();
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBurner, setFilterBurner] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStove, setNewStove] = useState({
    brand: "",
    burners: 1,
    quantity: 0,
  });

  const fetchStoves = async () => {
    try {
      const { data, error } = await supabase
        .from("stoves")
        .select("*")
        .eq("is_active", true)
        .order("brand", { ascending: true })
        .order("burners", { ascending: true });

      if (error) throw error;
      setStoves(data || []);
    } catch (error) {
      console.error("Error fetching stoves:", error);
      toast.error("Failed to load stoves");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoves();
  }, []);

  // Filter stoves based on search and burner type
  const filteredStoves = stoves.filter((stove) => {
    const matchesSearch = stove.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesBurner = filterBurner === "all" || stove.burners.toString() === filterBurner;
    return matchesSearch && matchesBurner;
  });

  // Calculate summary stats
  const totalQuantity = stoves.reduce((sum, s) => sum + s.quantity, 0);
  const totalValue = stoves.reduce((sum, s) => sum + s.quantity * s.price, 0);
  const singleBurnerCount = stoves.filter(s => s.burners === 1).reduce((sum, s) => sum + s.quantity, 0);
  const doubleBurnerCount = stoves.filter(s => s.burners === 2).reduce((sum, s) => sum + s.quantity, 0);
  const lowStockCount = stoves.filter((s) => s.quantity > 0 && s.quantity < 10).length;
  const outOfStockCount = stoves.filter((s) => s.quantity === 0).length;
  const maxQuantity = Math.max(...stoves.map(s => s.quantity), 1);

  const getStatus = (quantity: number) => {
    if (quantity === 0) return { label: "Out of Stock", color: "destructive", bgClass: "bg-destructive/10 text-destructive" };
    if (quantity < 10) return { label: "Low Stock", color: "warning", bgClass: "bg-amber-500/10 text-amber-600" };
    return { label: "In Stock", color: "success", bgClass: "bg-emerald-500/10 text-emerald-600" };
  };

  const getBurnerLabel = (burners: number) => {
    return burners === 1 ? "Single Burner" : "Double Burner";
  };

  const handleAddStove = async () => {
    if (!newStove.brand.trim()) {
      toast.error("Please enter brand name");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const existing = stoves.find(
        s => s.brand.toLowerCase() === newStove.brand.trim().toLowerCase() && s.burners === newStove.burners
      );
      
      if (existing) {
        const newQuantity = existing.quantity + newStove.quantity;
        const { error } = await supabase
          .from("stoves")
          .update({ quantity: newQuantity })
          .eq("id", existing.id);
        
        if (error) throw error;
        toast.success("Stove quantity updated");
      } else {
        const burnerLabel = getBurnerLabel(newStove.burners);
        const { error } = await supabase.from("stoves").insert({
          brand: newStove.brand.trim(),
          model: burnerLabel,
          burners: newStove.burners,
          quantity: newStove.quantity,
          price: 0,
          created_by: userData.user?.id,
        });

        if (error) throw error;
        
        await syncStoveToPricing(newStove.brand.trim(), burnerLabel);
        toast.success("Stove added successfully");
      }

      setNewStove({ brand: "", burners: 1, quantity: 0 });
      setIsAddDialogOpen(false);
      fetchStoves();
    } catch (error) {
      console.error("Error adding stove:", error);
      toast.error("Failed to add stove");
    }
  };

  const handleUpdateQuantity = async (id: string, change: number) => {
    const stove = stoves.find((s) => s.id === id);
    if (!stove) return;

    const newQuantity = Math.max(0, stove.quantity + change);

    try {
      const { error } = await supabase
        .from("stoves")
        .update({ quantity: newQuantity })
        .eq("id", id);

      if (error) throw error;

      setStoves((prev) =>
        prev.map((s) => (s.id === id ? { ...s, quantity: newQuantity } : s))
      );
      toast.success("Quantity updated");
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity");
    }
  };

  const handleDeleteStove = async (id: string) => {
    try {
      const { error } = await supabase
        .from("stoves")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      setStoves((prev) => prev.filter((s) => s.id !== id));
      toast.success("Stove removed");
    } catch (error) {
      console.error("Error deleting stove:", error);
      toast.error("Failed to remove stove");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg">
            <ChefHat className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gas Stove Inventory</h1>
            <p className="text-muted-foreground text-sm">Manage stoves by brand and burner type</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{totalQuantity}</p>
                <p className="text-xs text-muted-foreground font-medium">Total Units</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{totalValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground font-medium">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Flame className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{singleBurnerCount}</p>
                <p className="text-xs text-muted-foreground font-medium">Single Burner</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Flame className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{doubleBurnerCount}</p>
                <p className="text-xs text-muted-foreground font-medium">Double Burner</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-600">{lowStockCount} items low stock</span>
            </div>
          )}
          {outOfStockCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-xl">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">{outOfStockCount} items out of stock</span>
            </div>
          )}
        </div>
      )}

      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background border-border"
          />
        </div>

        <Select value={filterBurner} onValueChange={setFilterBurner}>
          <SelectTrigger className="w-full sm:w-40 bg-background border-border">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="1">Single Burner</SelectItem>
            <SelectItem value="2">Double Burner</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
              <Plus className="h-4 w-4" />
              Add Stove
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" />
                Add New Stove
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Brand Name *</Label>
                <Input
                  placeholder="e.g., Walton, RFL, Minister"
                  value={newStove.brand}
                  onChange={(e) => setNewStove({ ...newStove, brand: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Burner Type *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2].map((burner) => (
                    <button
                      key={burner}
                      onClick={() => setNewStove({ ...newStove, burners: burner })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        newStove.burners === burner
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Flame className={`h-6 w-6 ${newStove.burners === burner ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-medium">{getBurnerLabel(burner)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Initial Quantity</Label>
                <Input
                  type="number"
                  min="0"
                  value={newStove.quantity}
                  onChange={(e) => setNewStove({ ...newStove, quantity: parseInt(e.target.value) || 0 })}
                  className="bg-background border-border"
                />
              </div>
              <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                💡 Prices are set in the Product Pricing module
              </p>
              <Button onClick={handleAddStove} className="w-full">
                Add Stove
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stove Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStoves.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ChefHat className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">
                {searchQuery || filterBurner !== "all" ? "No stoves found matching your filters" : "No stoves added yet"}
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Stove
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredStoves.map((stove) => {
            const status = getStatus(stove.quantity);
            const stockPercent = (stove.quantity / maxQuantity) * 100;
            
            return (
              <Card key={stove.id} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        stove.burners === 1 ? 'bg-orange-500/10' : 'bg-purple-500/10'
                      }`}>
                        <Flame className={`h-5 w-5 ${stove.burners === 1 ? 'text-orange-500' : 'text-purple-500'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">{stove.brand}</CardTitle>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {getBurnerLabel(stove.burners)}
                        </Badge>
                      </div>
                    </div>
                    <Badge className={status.bgClass}>
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Stock Level</span>
                      <span className="text-2xl font-bold text-foreground">{stove.quantity}</span>
                    </div>
                    <Progress 
                      value={stockPercent} 
                      className="h-2"
                    />
                  </div>

                  {stove.price > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Unit Price</span>
                      <span className="font-semibold">{BANGLADESHI_CURRENCY_SYMBOL}{stove.price.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      onClick={() => handleUpdateQuantity(stove.id, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      onClick={() => handleUpdateQuantity(stove.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      onClick={() => handleDeleteStove(stove.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
