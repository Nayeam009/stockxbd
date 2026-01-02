import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Minus, Trash2, Search, Wrench, Package } from "lucide-react";
import { toast } from "sonner";
import { InventoryPricingCard } from "./InventoryPricingCard";
import { syncRegulatorToPricing } from "@/hooks/useInventoryPricingSync";

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
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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

  // Filter regulators based on search
  const filteredRegulators = regulators.filter((regulator) =>
    regulator.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate summary stats
  const totalQuantity = regulators.reduce((sum, r) => sum + r.quantity, 0);
  const inStockCount = regulators.filter((r) => r.quantity >= 30).length;
  const lowStockCount = regulators.filter((r) => r.quantity > 0 && r.quantity < 30).length;
  const outOfStockCount = regulators.filter((r) => r.quantity === 0).length;

  const getStatus = (quantity: number) => {
    if (quantity === 0) return { label: "Out of Stock", color: "destructive" };
    if (quantity < 30) return { label: "Low Stock", color: "warning" };
    return { label: "In Stock", color: "success" };
  };

  const handleAddRegulator = async () => {
    if (!newRegulator.brand.trim()) {
      toast.error("Please enter a brand name");
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      
      // Check if this brand + type combo already exists
      const existing = regulators.find(
        r => r.brand.toLowerCase() === newRegulator.brand.trim().toLowerCase() && r.type === newRegulator.type
      );
      
      if (existing) {
        // Update quantity instead
        const newQuantity = existing.quantity + newRegulator.quantity;
        const { error } = await supabase
          .from("regulators")
          .update({ quantity: newQuantity })
          .eq("id", existing.id);
        
        if (error) throw error;
        toast.success("Regulator quantity updated");
      } else {
        // Create new regulator
        const { error } = await supabase.from("regulators").insert({
          brand: newRegulator.brand.trim(),
          type: newRegulator.type,
          quantity: newRegulator.quantity,
          created_by: userData.user?.id,
        });

        if (error) throw error;
        
        // Auto-sync to product pricing
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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalQuantity}</p>
                <p className="text-xs text-muted-foreground">Total Regulators</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Wrench className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{inStockCount}</p>
                <p className="text-xs text-muted-foreground">In Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Wrench className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{lowStockCount}</p>
                <p className="text-xs text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Wrench className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{outOfStockCount}</p>
                <p className="text-xs text-muted-foreground">Out of Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header with Search and Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Regulators Stock</h2>
          <p className="text-muted-foreground text-sm">Manage regulator inventory by brand and size (20mm/22mm)</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
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
              <Button className="gap-2 whitespace-nowrap">
                <Plus className="h-4 w-4" />
                Add New Regulator
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Add New Regulator</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Brand Name *</Label>
                  <Input
                    placeholder="e.g., Sena, Pamir, Bono"
                    value={newRegulator.brand}
                    onChange={(e) =>
                      setNewRegulator({ ...newRegulator, brand: e.target.value })
                    }
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Size *</Label>
                  <Select
                    value={newRegulator.type}
                    onValueChange={(value) =>
                      setNewRegulator({ ...newRegulator, type: value })
                    }
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20mm">20mm</SelectItem>
                      <SelectItem value="22mm">22mm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Initial Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newRegulator.quantity}
                    onChange={(e) =>
                      setNewRegulator({
                        ...newRegulator,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="bg-background border-border"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Note: Set prices in the Product Pricing page
                </p>
                <Button onClick={handleAddRegulator} className="w-full">
                  Add Regulator
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Regulators Table */}
      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Brand</TableHead>
              <TableHead className="text-muted-foreground font-medium">Size</TableHead>
              <TableHead className="text-muted-foreground font-medium">Quantity</TableHead>
              <TableHead className="text-muted-foreground font-medium">Status</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRegulators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No regulators found matching your search" : "No regulators added yet"}
                </TableCell>
              </TableRow>
            ) : (
              filteredRegulators.map((regulator) => {
                const status = getStatus(regulator.quantity);
                return (
                  <TableRow key={regulator.id} className="border-border">
                    <TableCell className="font-medium text-foreground">
                      {regulator.brand}
                    </TableCell>
                    <TableCell className="text-foreground">
                      <Badge variant="outline" className="bg-primary/10 border-primary/20">
                        {regulator.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground font-semibold">
                      {regulator.quantity}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          status.color === "success"
                            ? "bg-green-500/20 text-green-500 border-green-500/30"
                            : status.color === "warning"
                            ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
                            : "bg-destructive/20 text-destructive border-destructive/30"
                        }
                      >
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-border hover:bg-primary/10 hover:text-primary"
                          onClick={() => handleUpdateQuantity(regulator.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-border hover:bg-primary/10 hover:text-primary"
                          onClick={() => handleUpdateQuantity(regulator.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                          onClick={() => handleDeleteRegulator(regulator.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pricing Card */}
      <InventoryPricingCard
        productType="regulator"
        title="Regulator Pricing"
        description="Quick access to view and edit regulator prices"
      />
    </div>
  );
};
