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
import { Plus, Minus, Trash2, Search, ChefHat, Package, DollarSign, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

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
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStove, setNewStove] = useState({
    brand: "",
    burners: 1, // 1 = Single, 2 = Double
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

  // Filter stoves based on search
  const filteredStoves = stoves.filter(
    (stove) =>
      stove.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate summary stats
  const totalQuantity = stoves.reduce((sum, s) => sum + s.quantity, 0);
  const totalValue = stoves.reduce((sum, s) => sum + s.quantity * s.price, 0);
  const inStockCount = stoves.filter((s) => s.quantity >= 30).length;
  const lowStockCount = stoves.filter((s) => s.quantity > 0 && s.quantity < 30).length;
  const outOfStockCount = stoves.filter((s) => s.quantity === 0).length;

  const getStatus = (quantity: number) => {
    if (quantity === 0) return { label: "Out of Stock", color: "destructive" };
    if (quantity < 30) return { label: "Low Stock", color: "warning" };
    return { label: "In Stock", color: "success" };
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
      
      // Check if this brand + burner combo already exists
      const existing = stoves.find(
        s => s.brand.toLowerCase() === newStove.brand.trim().toLowerCase() && s.burners === newStove.burners
      );
      
      if (existing) {
        // Update quantity instead
        const newQuantity = existing.quantity + newStove.quantity;
        const { error } = await supabase
          .from("stoves")
          .update({ quantity: newQuantity })
          .eq("id", existing.id);
        
        if (error) throw error;
        toast.success("Stove quantity updated");
      } else {
        // Create new stove
        const { error } = await supabase.from("stoves").insert({
          brand: newStove.brand.trim(),
          model: getBurnerLabel(newStove.burners), // Use burner type as model
          burners: newStove.burners,
          quantity: newStove.quantity,
          price: 0, // Price will be set in Product Pricing
          created_by: userData.user?.id,
        });

        if (error) throw error;
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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalQuantity}</p>
                <p className="text-xs text-muted-foreground">Total Stoves</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{totalValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ChefHat className="h-5 w-5 text-green-500" />
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
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
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
                <ChefHat className="h-5 w-5 text-destructive" />
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
          <h2 className="text-2xl font-bold text-foreground">Gas Stove Stock</h2>
          <p className="text-muted-foreground text-sm">Manage gas stove inventory by brand and burner type</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stoves..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-border"
            />
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 whitespace-nowrap">
                <Plus className="h-4 w-4" />
                Add New Stove
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Add New Stove</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Brand Name *</Label>
                  <Input
                    placeholder="e.g., Walton, RFL, Minister"
                    value={newStove.brand}
                    onChange={(e) =>
                      setNewStove({ ...newStove, brand: e.target.value })
                    }
                    className="bg-background border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Burner Type *</Label>
                  <Select
                    value={newStove.burners.toString()}
                    onValueChange={(value) =>
                      setNewStove({ ...newStove, burners: parseInt(value) })
                    }
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select burner type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Single Burner</SelectItem>
                      <SelectItem value="2">Double Burner</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Initial Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    value={newStove.quantity}
                    onChange={(e) =>
                      setNewStove({
                        ...newStove,
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="bg-background border-border"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Note: Set prices in the Product Pricing page
                </p>
                <Button onClick={handleAddStove} className="w-full">
                  Add Stove
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stoves Table */}
      <Card className="bg-card border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Brand</TableHead>
              <TableHead className="text-muted-foreground font-medium">Burner Type</TableHead>
              <TableHead className="text-muted-foreground font-medium">Quantity</TableHead>
              <TableHead className="text-muted-foreground font-medium">Status</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStoves.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No stoves found matching your search" : "No stoves added yet"}
                </TableCell>
              </TableRow>
            ) : (
              filteredStoves.map((stove) => {
                const status = getStatus(stove.quantity);
                return (
                  <TableRow key={stove.id} className="border-border">
                    <TableCell className="font-medium text-foreground">
                      {stove.brand}
                    </TableCell>
                    <TableCell className="text-foreground">
                      <Badge variant="outline" className="bg-primary/10 border-primary/20">
                        {getBurnerLabel(stove.burners)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground font-semibold">
                      {stove.quantity}
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
                          onClick={() => handleUpdateQuantity(stove.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-border hover:bg-primary/10 hover:text-primary"
                          onClick={() => handleUpdateQuantity(stove.id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                          onClick={() => handleDeleteStove(stove.id)}
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
    </div>
  );
};
