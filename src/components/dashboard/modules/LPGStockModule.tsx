import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Search,
  Plus,
  Trash2,
  Package,
  AlertTriangle,
  Loader2,
  Cylinder
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InventoryPricingCard } from "./InventoryPricingCard";

interface LPGBrand {
  id: string;
  name: string;
  color: string;
  size: string;
  weight: string;
  package_cylinder: number;
  refill_cylinder: number;
  empty_cylinder: number;
  problem_cylinder: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LPGStockModuleProps {
  size?: "22mm" | "20mm";
}

// Cylinder weight options
const WEIGHT_OPTIONS_22MM = [
  { value: "5.5kg", label: "5.5 KG", shortLabel: "5.5" },
  { value: "12kg", label: "12 KG", shortLabel: "12" },
  { value: "12.5kg", label: "12.5 KG", shortLabel: "12.5" },
  { value: "25kg", label: "25 KG", shortLabel: "25" },
  { value: "35kg", label: "35 KG", shortLabel: "35" },
  { value: "45kg", label: "45 KG", shortLabel: "45" },
];

const WEIGHT_OPTIONS_20MM = [
  { value: "5kg", label: "5 KG", shortLabel: "5" },
  { value: "10kg", label: "10 KG", shortLabel: "10" },
  { value: "12kg", label: "12 KG", shortLabel: "12" },
  { value: "15kg", label: "15 KG", shortLabel: "15" },
  { value: "21kg", label: "21 KG", shortLabel: "21" },
  { value: "35kg", label: "35 KG", shortLabel: "35" },
];

export const LPGStockModule = ({ size = "22mm" }: LPGStockModuleProps) => {
  const [brands, setBrands] = useState<LPGBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWeight, setSelectedWeight] = useState("12kg");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  
  const weightOptions = size === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM;

  const [newBrand, setNewBrand] = useState({
    name: "",
    color: "#22c55e",
    size: size,
    weight: selectedWeight,
    package_cylinder: 0,
    refill_cylinder: 0,
    empty_cylinder: 0,
    problem_cylinder: 0,
  });

  // Fetch LPG brands filtered by size and weight
  const fetchBrands = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("lpg_brands")
        .select("*")
        .eq("is_active", true)
        .eq("size", size)
        .eq("weight", selectedWeight)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setBrands(data || []);
    } catch (error: any) {
      toast.error("Failed to load LPG brands");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, [size, selectedWeight]);

  // Update newBrand weight when selectedWeight changes
  useEffect(() => {
    setNewBrand(prev => ({ ...prev, weight: selectedWeight }));
  }, [selectedWeight]);

  // Filter brands based on search
  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate totals
  const totals = filteredBrands.reduce(
    (acc, brand) => ({
      package: acc.package + brand.package_cylinder,
      refill: acc.refill + brand.refill_cylinder,
      empty: acc.empty + brand.empty_cylinder,
      problem: acc.problem + brand.problem_cylinder,
    }),
    { package: 0, refill: 0, empty: 0, problem: 0 }
  );

  // Get status based on stock levels
  const getStatus = (brand: LPGBrand) => {
    const total = brand.package_cylinder + brand.refill_cylinder;
    if (total === 0) return { label: "Out of Stock", variant: "destructive" as const, color: "bg-red-500" };
    if (total < 30) return { label: "Low Stock", variant: "warning" as const, color: "bg-yellow-500" };
    return { label: "In Stock", variant: "success" as const, color: "bg-green-500" };
  };

  // Add new brand
  const handleAddBrand = async () => {
    if (!newBrand.name.trim()) {
      toast.error("Brand name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("lpg_brands").insert({
        ...newBrand,
        created_by: userData.user?.id,
      });

      if (error) throw error;

      toast.success("Brand added successfully");
      setIsAddDialogOpen(false);
      setNewBrand({
        name: "",
        color: "#22c55e",
        size: size,
        weight: selectedWeight,
        package_cylinder: 0,
        refill_cylinder: 0,
        empty_cylinder: 0,
        problem_cylinder: 0,
      });
      fetchBrands();
    } catch (error: any) {
      toast.error(error.message || "Failed to add brand");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update cylinder count
  const handleUpdateCylinder = async (id: string, field: string, value: number) => {
    try {
      const { error } = await supabase
        .from("lpg_brands")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;

      setBrands(prev =>
        prev.map(brand =>
          brand.id === id ? { ...brand, [field]: value } : brand
        )
      );
      setEditingCell(null);
    } catch (error: any) {
      toast.error("Failed to update");
      console.error(error);
    }
  };

  // Delete brand
  const handleDeleteBrand = async (id: string) => {
    try {
      const { error } = await supabase
        .from("lpg_brands")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("Brand removed");
      setBrands(prev => prev.filter(brand => brand.id !== id));
    } catch (error: any) {
      toast.error("Failed to delete brand");
    }
  };

  // Editable cell component
  const EditableCell = ({ 
    value, 
    brandId, 
    field,
    isProblem = false 
  }: { 
    value: number; 
    brandId: string; 
    field: string;
    isProblem?: boolean;
  }) => {
    const [localValue, setLocalValue] = useState(value);
    const isEditing = editingCell?.id === brandId && editingCell?.field === field;

    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    if (isEditing) {
      return (
        <Input
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(parseInt(e.target.value) || 0)}
          onBlur={() => handleUpdateCylinder(brandId, field, localValue)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleUpdateCylinder(brandId, field, localValue);
            }
            if (e.key === "Escape") {
              setEditingCell(null);
              setLocalValue(value);
            }
          }}
          className="w-20 h-8 text-center bg-background"
          autoFocus
          min={0}
        />
      );
    }

    return (
      <div
        onClick={() => setEditingCell({ id: brandId, field })}
        className={`
          px-3 py-2 rounded-md cursor-pointer transition-colors min-w-[60px] text-center font-medium
          ${isProblem 
            ? "bg-destructive/20 text-destructive hover:bg-destructive/30" 
            : "bg-muted hover:bg-muted/80"
          }
        `}
      >
        {value}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weight Selection */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-primary/5 via-background to-secondary/5">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Cylinder className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Select Cylinder Weight</h3>
              <Badge variant="outline" className="ml-2 text-xs">
                {size}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {weightOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={selectedWeight === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedWeight(option.value)}
                  className={`transition-all duration-200 ${
                    selectedWeight === option.value 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "hover:bg-primary/10 hover:border-primary/50"
                  }`}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            LPG Stock ({size})
            <Badge className="bg-primary/10 text-primary border-0 text-sm font-medium">
              {selectedWeight}
            </Badge>
          </h2>
          <p className="text-muted-foreground text-sm">Manage cylinder inventory for {selectedWeight} cylinders</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64 bg-muted/50"
            />
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-500 hover:bg-orange-600 text-white shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                New Brand
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Add New LPG Brand
                  <Badge variant="outline">{selectedWeight}</Badge>
                </DialogTitle>
                <DialogDescription>
                  Enter the brand details and initial cylinder counts for {selectedWeight} cylinders.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Brand Name</Label>
                  <Input
                    id="name"
                    value={newBrand.name}
                    onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                    className="col-span-3"
                    placeholder="e.g., Total Energies"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="color" className="text-right">Color</Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <input
                      type="color"
                      id="color"
                      value={newBrand.color}
                      onChange={(e) => setNewBrand({ ...newBrand, color: e.target.value })}
                      className="w-10 h-10 rounded cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">Brand indicator color</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="package" className="text-right">Package</Label>
                  <Input
                    id="package"
                    type="number"
                    value={newBrand.package_cylinder}
                    onChange={(e) => setNewBrand({ ...newBrand, package_cylinder: parseInt(e.target.value) || 0 })}
                    className="col-span-3"
                    min={0}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="refill" className="text-right">Refill</Label>
                  <Input
                    id="refill"
                    type="number"
                    value={newBrand.refill_cylinder}
                    onChange={(e) => setNewBrand({ ...newBrand, refill_cylinder: parseInt(e.target.value) || 0 })}
                    className="col-span-3"
                    min={0}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="empty" className="text-right">Empty</Label>
                  <Input
                    id="empty"
                    type="number"
                    value={newBrand.empty_cylinder}
                    onChange={(e) => setNewBrand({ ...newBrand, empty_cylinder: parseInt(e.target.value) || 0 })}
                    className="col-span-3"
                    min={0}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="problem" className="text-right">Problem</Label>
                  <Input
                    id="problem"
                    type="number"
                    value={newBrand.problem_cylinder}
                    onChange={(e) => setNewBrand({ ...newBrand, problem_cylinder: parseInt(e.target.value) || 0 })}
                    className="col-span-3"
                    min={0}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddBrand} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Brand
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Package Cylinders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{totals.package.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Refill Cylinders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-accent">{totals.refill.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Empty Cylinders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-muted-foreground">{totals.empty.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Problem Cylinders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{totals.problem.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-16 text-muted-foreground">Sl. NO.</TableHead>
                  <TableHead className="text-muted-foreground">Brand</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-center text-muted-foreground">Package cylinder</TableHead>
                  <TableHead className="text-center text-muted-foreground">Refill cylinder</TableHead>
                  <TableHead className="text-center text-muted-foreground">Empty cylinder</TableHead>
                  <TableHead className="text-center text-muted-foreground">Problem Cylinder</TableHead>
                  <TableHead className="text-center text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBrands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No brands found. Add your first LPG brand.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBrands.map((brand, index) => {
                    const status = getStatus(brand);
                    return (
                      <TableRow key={brand.id} className="border-b border-border/50">
                        <TableCell className="font-medium text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}.
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-8 rounded-full"
                              style={{ backgroundColor: brand.color }}
                            />
                            <span className="font-medium text-foreground">{brand.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={`${status.color} hover:opacity-90 text-white border-0`}
                          >
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <EditableCell
                              value={brand.package_cylinder}
                              brandId={brand.id}
                              field="package_cylinder"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <EditableCell
                              value={brand.refill_cylinder}
                              brandId={brand.id}
                              field="refill_cylinder"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <EditableCell
                              value={brand.empty_cylinder}
                              brandId={brand.id}
                              field="empty_cylinder"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <EditableCell
                              value={brand.problem_cylinder}
                              brandId={brand.id}
                              field="problem_cylinder"
                              isProblem
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteBrand(brand.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Card */}
      <InventoryPricingCard
        productType="lpg"
        title="LPG Cylinder Pricing"
        description="Quick access to view and edit cylinder prices"
        sizeFilter={selectedWeight}
      />
    </div>
  );
};
