import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Minus, Trash2, Search, Wrench, Package, AlertTriangle, Gauge } from "lucide-react";
import { toast } from "sonner";
import { syncRegulatorToPricing } from "@/hooks/useInventoryPricingSync";
import { useLanguage } from "@/contexts/LanguageContext";

interface Regulator {
  id: string;
  brand: string;
  type: string;
  quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const RegulatorsModule = () => {
  const { t } = useLanguage();
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSize, setActiveSize] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newRegulator, setNewRegulator] = useState({
    brand: "",
    type: "22mm",
    quantity: 0,
  });

  const fetchRegulators = async () => {
    try {
      const { data, error } = await supabase
        .from("regulators")
        .select("*")
        .eq("is_active", true)
        .order("brand", { ascending: true })
        .order("type", { ascending: true });

      if (error) throw error;
      setRegulators(data || []);
    } catch (error) {
      console.error("Error fetching regulators:", error);
      toast.error("Failed to load regulators");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegulators();
  }, []);

  // Filter regulators based on search and size
  const filteredRegulators = regulators.filter((regulator) => {
    const matchesSearch = regulator.brand.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSize = activeSize === "all" || regulator.type === activeSize;
    return matchesSearch && matchesSize;
  });

  // Calculate summary stats
  const totalQuantity = regulators.reduce((sum, r) => sum + r.quantity, 0);
  const size22mmCount = regulators.filter(r => r.type === "22mm").reduce((sum, r) => sum + r.quantity, 0);
  const size20mmCount = regulators.filter(r => r.type === "20mm").reduce((sum, r) => sum + r.quantity, 0);
  const lowStockCount = regulators.filter((r) => r.quantity > 0 && r.quantity < 10).length;
  const outOfStockCount = regulators.filter((r) => r.quantity === 0).length;
  const uniqueBrands = [...new Set(regulators.map(r => r.brand))].length;
  const maxQuantity = Math.max(...regulators.map(r => r.quantity), 1);

  const getStatus = (quantity: number) => {
    if (quantity === 0) return { label: "Out of Stock", color: "destructive", bgClass: "bg-destructive/10 text-destructive" };
    if (quantity < 10) return { label: "Low Stock", color: "warning", bgClass: "bg-amber-500/10 text-amber-600" };
    return { label: "In Stock", color: "success", bgClass: "bg-emerald-500/10 text-emerald-600" };
  };

  const handleAddRegulator = async () => {
    if (!newRegulator.brand.trim()) {
      toast.error("Please enter a brand name");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const existing = regulators.find(
        r => r.brand.toLowerCase() === newRegulator.brand.trim().toLowerCase() && r.type === newRegulator.type
      );
      
      if (existing) {
        const newQuantity = existing.quantity + newRegulator.quantity;
        const { error } = await supabase
          .from("regulators")
          .update({ quantity: newQuantity })
          .eq("id", existing.id);
        
        if (error) throw error;
        toast.success("Regulator quantity updated");
      } else {
        const { error } = await supabase.from("regulators").insert({
          brand: newRegulator.brand.trim(),
          type: newRegulator.type,
          quantity: newRegulator.quantity,
          created_by: userData.user?.id,
        });

        if (error) throw error;
        
        await syncRegulatorToPricing(newRegulator.brand.trim(), newRegulator.type);
        toast.success("Regulator added successfully");
      }

      setNewRegulator({ brand: "", type: "22mm", quantity: 0 });
      setIsAddDialogOpen(false);
      fetchRegulators();
    } catch (error) {
      console.error("Error adding regulator:", error);
      toast.error("Failed to add regulator");
    }
  };

  const handleUpdateQuantity = async (id: string, change: number) => {
    const regulator = regulators.find((r) => r.id === id);
    if (!regulator) return;

    const newQuantity = Math.max(0, regulator.quantity + change);

    try {
      const { error } = await supabase
        .from("regulators")
        .update({ quantity: newQuantity })
        .eq("id", id);

      if (error) throw error;

      setRegulators((prev) =>
        prev.map((r) => (r.id === id ? { ...r, quantity: newQuantity } : r))
      );
      toast.success("Quantity updated");
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity");
    }
  };

  const handleDeleteRegulator = async (id: string) => {
    try {
      const { error } = await supabase
        .from("regulators")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      setRegulators((prev) => prev.filter((r) => r.id !== id));
      toast.success("Regulator removed");
    } catch (error) {
      console.error("Error deleting regulator:", error);
      toast.error("Failed to remove regulator");
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
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Wrench className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Regulator Inventory</h1>
            <p className="text-muted-foreground text-sm">Manage regulators by brand and size (20mm/22mm)</p>
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

        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                <Gauge className="h-6 w-6 text-violet-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{size22mmCount}</p>
                <p className="text-xs text-muted-foreground font-medium">22mm Size</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Gauge className="h-6 w-6 text-cyan-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{size20mmCount}</p>
                <p className="text-xs text-muted-foreground font-medium">20mm Size</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{uniqueBrands}</p>
                <p className="text-xs text-muted-foreground font-medium">Brands</p>
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

      {/* Actions Bar with Tabs */}
      <div className="space-y-4">
        <Tabs value={activeSize} onValueChange={setActiveSize} className="w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                All Sizes
              </TabsTrigger>
              <TabsTrigger value="22mm" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white">
                22mm
              </TabsTrigger>
              <TabsTrigger value="20mm" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
                20mm
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search brands..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background border-border"
                />
              </div>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 whitespace-nowrap bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700">
                    <Plus className="h-4 w-4" />
                    Add Regulator
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-card border-border">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Wrench className="h-5 w-5 text-violet-500" />
                      Add New Regulator
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Brand Name *</Label>
                      <Input
                        placeholder="e.g., Sena, Pamir, Bono"
                        value={newRegulator.brand}
                        onChange={(e) => setNewRegulator({ ...newRegulator, brand: e.target.value })}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Size *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {["22mm", "20mm"].map((size) => (
                          <button
                            key={size}
                            onClick={() => setNewRegulator({ ...newRegulator, type: size })}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              newRegulator.type === size
                                ? size === "22mm" 
                                  ? 'border-violet-500 bg-violet-500/10'
                                  : 'border-cyan-500 bg-cyan-500/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <Gauge className={`h-6 w-6 ${
                                newRegulator.type === size 
                                  ? size === "22mm" ? 'text-violet-500' : 'text-cyan-500'
                                  : 'text-muted-foreground'
                              }`} />
                              <span className="text-sm font-medium">{size}</span>
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
                        value={newRegulator.quantity}
                        onChange={(e) => setNewRegulator({ ...newRegulator, quantity: parseInt(e.target.value) || 0 })}
                        className="bg-background border-border"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      💡 Prices are set in the Product Pricing module
                    </p>
                    <Button onClick={handleAddRegulator} className="w-full bg-gradient-to-r from-violet-500 to-purple-600">
                      Add Regulator
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Tabs>
      </div>

      {/* Regulator Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRegulators.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Wrench className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center">
                {searchQuery || activeSize !== "all" ? "No regulators found matching your filters" : "No regulators added yet"}
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Regulator
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredRegulators.map((regulator) => {
            const status = getStatus(regulator.quantity);
            const stockPercent = (regulator.quantity / maxQuantity) * 100;
            const isSize22 = regulator.type === "22mm";
            
            return (
              <Card key={regulator.id} className="group hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/30 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        isSize22 ? 'bg-violet-500/10' : 'bg-cyan-500/10'
                      }`}>
                        <Gauge className={`h-5 w-5 ${isSize22 ? 'text-violet-500' : 'text-cyan-500'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">{regulator.brand}</CardTitle>
                        <Badge variant="outline" className={`mt-1 text-xs ${
                          isSize22 ? 'bg-violet-500/10 text-violet-600 border-violet-500/30' : 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30'
                        }`}>
                          {regulator.type}
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
                      <span className="text-2xl font-bold text-foreground">{regulator.quantity}</span>
                    </div>
                    <Progress 
                      value={stockPercent} 
                      className="h-2"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      onClick={() => handleUpdateQuantity(regulator.id, -1)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-9 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      onClick={() => handleUpdateQuantity(regulator.id, 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      onClick={() => handleDeleteRegulator(regulator.id)}
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
