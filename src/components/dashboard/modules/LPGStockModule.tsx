import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search,
  Plus,
  Trash2,
  Package,
  AlertTriangle,
  Loader2,
  Cylinder,
  Truck,
  ArrowUpFromLine,
  ArrowDownToLine,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { syncLpgBrandToPricing } from "@/hooks/useInventoryPricingSync";

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
  in_transit_cylinder: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

export const LPGStockModule = () => {
  const [sizeTab, setSizeTab] = useState<"22mm" | "20mm">("22mm");
  const [selectedWeight, setSelectedWeight] = useState("12kg");
  const [brands, setBrands] = useState<LPGBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSendToPlantOpen, setIsSendToPlantOpen] = useState(false);
  const [isReceiveFromPlantOpen, setIsReceiveFromPlantOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCell, setEditingCell] = useState<{id: string, field: string} | null>(null);
  
  // Send to Plant state
  const [sendToBrand, setSendToBrand] = useState("");
  const [sendQuantity, setSendQuantity] = useState(0);
  
  // Receive from Plant state
  const [receiveFromBrand, setReceiveFromBrand] = useState("");
  const [receiveQuantity, setReceiveQuantity] = useState(0);
  const [receiveType, setReceiveType] = useState<'refill' | 'package'>('refill');
  
  const weightOptions = sizeTab === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM;

  const [newBrand, setNewBrand] = useState({
    name: "",
    color: "#22c55e",
    size: sizeTab,
    weight: selectedWeight,
    package_cylinder: 0,
    refill_cylinder: 0,
    empty_cylinder: 0,
    problem_cylinder: 0,
  });

  // Update weight options when size changes
  useEffect(() => {
    const defaultWeight = sizeTab === "22mm" ? "12kg" : "12kg";
    setSelectedWeight(defaultWeight);
    setNewBrand(prev => ({ ...prev, size: sizeTab, weight: defaultWeight }));
  }, [sizeTab]);

  // Update newBrand weight when selectedWeight changes
  useEffect(() => {
    setNewBrand(prev => ({ ...prev, weight: selectedWeight }));
  }, [selectedWeight]);

  // Fetch LPG brands filtered by size and weight
  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("lpg_brands")
        .select("*")
        .eq("is_active", true)
        .eq("size", sizeTab)
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
  }, [sizeTab, selectedWeight]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Filter brands based on search
  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate totals including in-transit
  const totals = filteredBrands.reduce(
    (acc, brand) => ({
      package: acc.package + brand.package_cylinder,
      refill: acc.refill + brand.refill_cylinder,
      empty: acc.empty + brand.empty_cylinder,
      problem: acc.problem + brand.problem_cylinder,
      inTransit: acc.inTransit + (brand.in_transit_cylinder || 0),
    }),
    { package: 0, refill: 0, empty: 0, problem: 0, inTransit: 0 }
  );

  // Get status based on stock levels
  const getStatus = (brand: LPGBrand) => {
    const total = brand.package_cylinder + brand.refill_cylinder;
    if (total === 0) return { label: "Out of Stock", variant: "destructive" as const, color: "bg-red-500" };
    if (total < 10) return { label: "Low Stock", variant: "warning" as const, color: "bg-yellow-500" };
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
      
      const { data: insertedBrand, error } = await supabase.from("lpg_brands").insert({
        ...newBrand,
        created_by: userData.user?.id,
      }).select().single();

      if (error) throw error;

      // Auto-sync to product pricing
      if (insertedBrand) {
        await syncLpgBrandToPricing(
          newBrand.name.trim(),
          insertedBrand.id,
          newBrand.size,
          newBrand.weight
        );
      }

      toast.success("Brand added successfully");
      setIsAddDialogOpen(false);
      setNewBrand({
        name: "",
        color: "#22c55e",
        size: sizeTab,
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
      toast.success("Updated successfully");
    } catch (error: any) {
      toast.error("Failed to update");
      console.error(error);
    }
  };

  // Send to Plant - Move empties to in-transit
  const handleSendToPlant = async () => {
    if (!sendToBrand || sendQuantity <= 0) {
      toast.error("Select brand and enter quantity");
      return;
    }

    const brand = brands.find(b => b.id === sendToBrand);
    if (!brand || brand.empty_cylinder < sendQuantity) {
      toast.error("Not enough empty cylinders");
      return;
    }

    setIsSubmitting(true);
    try {
      const newEmpty = brand.empty_cylinder - sendQuantity;
      const newInTransit = (brand.in_transit_cylinder || 0) + sendQuantity;

      await supabase
        .from("lpg_brands")
        .update({ empty_cylinder: newEmpty, in_transit_cylinder: newInTransit })
        .eq("id", sendToBrand);

      toast.success(`${sendQuantity} cylinders sent to plant`);
      setIsSendToPlantOpen(false);
      setSendToBrand("");
      setSendQuantity(0);
      fetchBrands();
    } catch (error: any) {
      toast.error(error.message || "Failed to send");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Receive from Plant - Move in-transit to refill/package
  const handleReceiveFromPlant = async () => {
    if (!receiveFromBrand || receiveQuantity <= 0) {
      toast.error("Select brand and enter quantity");
      return;
    }

    const brand = brands.find(b => b.id === receiveFromBrand);
    if (!brand || (brand.in_transit_cylinder || 0) < receiveQuantity) {
      toast.error("Quantity exceeds in-transit stock");
      return;
    }

    setIsSubmitting(true);
    try {
      const newInTransit = (brand.in_transit_cylinder || 0) - receiveQuantity;
      const updates: any = { in_transit_cylinder: newInTransit };
      
      if (receiveType === 'refill') {
        updates.refill_cylinder = brand.refill_cylinder + receiveQuantity;
      } else {
        updates.package_cylinder = brand.package_cylinder + receiveQuantity;
      }

      await supabase.from("lpg_brands").update(updates).eq("id", receiveFromBrand);

      toast.success(`${receiveQuantity} cylinders received from plant`);
      setIsReceiveFromPlantOpen(false);
      setReceiveFromBrand("");
      setReceiveQuantity(0);
      fetchBrands();
    } catch (error: any) {
      toast.error(error.message || "Failed to receive");
    } finally {
      setIsSubmitting(false);
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

  // Editable Stock Cell Component
  const EditableStockCell = ({ 
    value, 
    brandId, 
    field,
    icon: Icon,
    label,
    bgColor = "bg-muted"
  }: { 
    value: number; 
    brandId: string; 
    field: string;
    icon: React.ElementType;
    label: string;
    bgColor?: string;
  }) => {
    const [localValue, setLocalValue] = useState(value);
    const isEditing = editingCell?.id === brandId && editingCell?.field === field;

    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    if (isEditing) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
            <Icon className="h-3 w-3" />
            {label}
          </span>
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
            className="h-8 w-full text-center font-medium"
            autoFocus
            min={0}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
          <Icon className="h-3 w-3" />
          {label}
        </span>
        <div
          onClick={() => setEditingCell({ id: brandId, field })}
          className={`
            px-2 sm:px-3 py-2 rounded-md cursor-pointer transition-all text-center font-medium text-sm sm:text-base
            ${bgColor} hover:opacity-80
          `}
        >
          {value}
        </div>
      </div>
    );
  };

  // Brand Stock Card Component
  const BrandStockCard = ({ brand }: { brand: LPGBrand }) => {
    const status = getStatus(brand);

    return (
      <Card className="border-border hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
              <span 
                className="h-3 w-3 sm:h-4 sm:w-4 rounded-full flex-shrink-0" 
                style={{ backgroundColor: brand.color }}
              />
              <span className="truncate">{brand.name}</span>
            </CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`${status.color} text-white text-[10px] sm:text-xs border-0`}>
                {status.label}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={() => handleDeleteBrand(brand.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] sm:text-xs w-fit mt-1">
            {selectedWeight}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3 px-3 sm:px-6 pb-3 sm:pb-4">
          {/* Stock Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <EditableStockCell 
              value={brand.package_cylinder} 
              brandId={brand.id}
              field="package_cylinder"
              icon={Package}
              label="Package"
              bgColor="bg-green-100 dark:bg-green-900/30"
            />
            <EditableStockCell 
              value={brand.refill_cylinder} 
              brandId={brand.id}
              field="refill_cylinder"
              icon={Cylinder}
              label="Refill"
              bgColor="bg-blue-100 dark:bg-blue-900/30"
            />
            <EditableStockCell 
              value={brand.empty_cylinder} 
              brandId={brand.id}
              field="empty_cylinder"
              icon={Package}
              label="Empty"
              bgColor="bg-gray-100 dark:bg-gray-800/50"
            />
            <EditableStockCell 
              value={brand.problem_cylinder} 
              brandId={brand.id}
              field="problem_cylinder"
              icon={AlertTriangle}
              label="Problem"
              bgColor="bg-red-100 dark:bg-red-900/30"
            />
          </div>

          {/* In-Transit Row (if any) */}
          {(brand.in_transit_cylinder || 0) > 0 && (
            <div className="flex items-center justify-between p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-md">
              <span className="text-xs sm:text-sm flex items-center gap-2">
                <Truck className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
                In Transit
              </span>
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                {brand.in_transit_cylinder}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
            <Cylinder className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
            LPG Cylinder Stock
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Click on any count to edit. Manage your cylinder inventory.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Send to Plant */}
          <Dialog open={isSendToPlantOpen} onOpenChange={setIsSendToPlantOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm gap-1">
                <ArrowUpFromLine className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Send to Plant</span>
                <span className="sm:hidden">Send</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md mx-4">
              <DialogHeader>
                <DialogTitle>Send Cylinders to Plant</DialogTitle>
                <DialogDescription>
                  Move empty cylinders to in-transit for refilling.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Brand</Label>
                  <Select value={sendToBrand} onValueChange={setSendToBrand}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Choose brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.filter(b => b.empty_cylinder > 0).map(brand => (
                        <SelectItem key={brand.id} value={brand.id}>
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: brand.color }} />
                            {brand.name} (Empty: {brand.empty_cylinder})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={sendQuantity}
                    onChange={(e) => setSendQuantity(parseInt(e.target.value) || 0)}
                    min={1}
                    className="h-9"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsSendToPlantOpen(false)}>Cancel</Button>
                <Button onClick={handleSendToPlant} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Send
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Receive from Plant */}
          <Dialog open={isReceiveFromPlantOpen} onOpenChange={setIsReceiveFromPlantOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm gap-1">
                <ArrowDownToLine className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Receive</span>
                <span className="sm:hidden">Rcv</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md mx-4">
              <DialogHeader>
                <DialogTitle>Receive from Plant</DialogTitle>
                <DialogDescription>
                  Receive cylinders from in-transit to refill or package.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Brand</Label>
                  <Select value={receiveFromBrand} onValueChange={setReceiveFromBrand}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Choose brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.filter(b => (b.in_transit_cylinder || 0) > 0).map(brand => (
                        <SelectItem key={brand.id} value={brand.id}>
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: brand.color }} />
                            {brand.name} (Transit: {brand.in_transit_cylinder})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Receive As</Label>
                  <Select value={receiveType} onValueChange={(v) => setReceiveType(v as 'refill' | 'package')}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="refill">Refill</SelectItem>
                      <SelectItem value="package">Package (New)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={receiveQuantity}
                    onChange={(e) => setReceiveQuantity(parseInt(e.target.value) || 0)}
                    min={1}
                    className="h-9"
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsReceiveFromPlantOpen(false)}>Cancel</Button>
                <Button onClick={handleReceiveFromPlant} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Receive
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Brand */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90 h-8 sm:h-9 text-xs sm:text-sm gap-1">
                <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">New Brand</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto mx-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                  Add New LPG Brand
                  <Badge variant="outline" className="text-xs">{sizeTab} - {selectedWeight}</Badge>
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm">
                  Enter the brand details for {selectedWeight} cylinders.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 sm:gap-4 py-3 sm:py-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label htmlFor="name" className="sm:text-right text-sm">Brand Name</Label>
                  <Input
                    id="name"
                    value={newBrand.name}
                    onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })}
                    className="sm:col-span-3 h-9"
                    placeholder="e.g., Total Energies"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-2 sm:gap-4">
                  <Label htmlFor="color" className="sm:text-right text-sm">Color</Label>
                  <div className="sm:col-span-3 flex items-center gap-2">
                    <input
                      type="color"
                      id="color"
                      value={newBrand.color}
                      onChange={(e) => setNewBrand({ ...newBrand, color: e.target.value })}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm text-muted-foreground">Brand color</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="package" className="text-xs sm:text-sm">Package</Label>
                    <Input
                      id="package"
                      type="number"
                      value={newBrand.package_cylinder}
                      onChange={(e) => setNewBrand({ ...newBrand, package_cylinder: parseInt(e.target.value) || 0 })}
                      className="h-9"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="refill" className="text-xs sm:text-sm">Refill</Label>
                    <Input
                      id="refill"
                      type="number"
                      value={newBrand.refill_cylinder}
                      onChange={(e) => setNewBrand({ ...newBrand, refill_cylinder: parseInt(e.target.value) || 0 })}
                      className="h-9"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="empty" className="text-xs sm:text-sm">Empty</Label>
                    <Input
                      id="empty"
                      type="number"
                      value={newBrand.empty_cylinder}
                      onChange={(e) => setNewBrand({ ...newBrand, empty_cylinder: parseInt(e.target.value) || 0 })}
                      className="h-9"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="problem" className="text-xs sm:text-sm">Problem</Label>
                    <Input
                      id="problem"
                      type="number"
                      value={newBrand.problem_cylinder}
                      onChange={(e) => setNewBrand({ ...newBrand, problem_cylinder: parseInt(e.target.value) || 0 })}
                      className="h-9"
                      min={0}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="h-9">
                  Cancel
                </Button>
                <Button onClick={handleAddBrand} disabled={isSubmitting} className="h-9">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Add Brand
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="icon" onClick={fetchBrands} className="h-8 w-8 sm:h-9 sm:w-9">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Size Tabs (22mm / 20mm) */}
      <Tabs value={sizeTab} onValueChange={(v) => setSizeTab(v as "22mm" | "20mm")} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid h-9">
            <TabsTrigger value="22mm" className="text-xs sm:text-sm h-8 px-4 sm:px-6">22mm</TabsTrigger>
            <TabsTrigger value="20mm" className="text-xs sm:text-sm h-8 px-4 sm:px-6">20mm</TabsTrigger>
          </TabsList>
          
          {/* Weight Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Weight:</span>
            <div className="flex gap-1">
              {weightOptions.map(option => (
                <Button
                  key={option.value}
                  variant={selectedWeight === option.value ? "default" : "outline"}
                  size="sm"
                  className={`h-7 px-2 sm:px-3 text-xs whitespace-nowrap transition-all ${
                    selectedWeight === option.value 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-primary/10"
                  }`}
                  onClick={() => setSelectedWeight(option.value)}
                >
                  {option.shortLabel}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Content for both tabs is the same (brands are filtered by state) */}
        <TabsContent value="22mm" className="space-y-4 mt-4">
          <StockContent />
        </TabsContent>
        <TabsContent value="20mm" className="space-y-4 mt-4">
          <StockContent />
        </TabsContent>
      </Tabs>
    </div>
  );

  // Stock Content Component (reused for both tabs)
  function StockContent() {
    return (
      <>
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search brands..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10 h-9 bg-muted/50"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <Card className="bg-gradient-to-br from-green-500/10 via-card to-card border-green-500/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Package</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground">{totals.package}</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 via-card to-card border-blue-500/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Refill</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground">{totals.refill}</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Cylinder className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-border">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Empty</p>
                  <p className="text-lg sm:text-2xl font-bold text-foreground">{totals.empty}</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-destructive/10 via-card to-card border-destructive/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Problem</p>
                  <p className="text-lg sm:text-2xl font-bold text-destructive">{totals.problem}</p>
                </div>
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* In Transit Alert */}
        {totals.inTransit > 0 && (
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-3 sm:p-4 flex items-center gap-3">
              <Truck className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Cylinders In Transit</p>
                <p className="text-xs text-muted-foreground">{totals.inTransit} cylinders are being transported</p>
              </div>
              <Badge variant="outline" className="ml-auto bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">
                {totals.inTransit}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Brand Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filteredBrands.map(brand => (
            <BrandStockCard key={brand.id} brand={brand} />
          ))}
        </div>

        {filteredBrands.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
              <Cylinder className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm sm:text-base text-muted-foreground">
                No brands found for {sizeTab} - {selectedWeight}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Click "New Brand" to add your first LPG brand.
              </p>
            </CardContent>
          </Card>
        )}
      </>
    );
  }
};
