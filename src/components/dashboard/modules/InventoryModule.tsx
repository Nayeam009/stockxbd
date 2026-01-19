import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Search,
  Plus,
  Minus,
  Trash2,
  Package,
  AlertTriangle,
  Loader2,
  Cylinder,
  Truck,
  ArrowUpFromLine,
  ArrowDownToLine,
  Save,
  ChefHat,
  Wrench,
  Flame,
  Gauge,
  Edit
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { syncLpgBrandToPricing, syncStoveToPricing, syncRegulatorToPricing } from "@/hooks/useInventoryPricingSync";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

// Interfaces
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
}

interface Stove {
  id: string;
  brand: string;
  model: string;
  burners: number;
  quantity: number;
  price: number;
  is_damaged: boolean | null;
  warranty_months: number | null;
}

interface Regulator {
  id: string;
  brand: string;
  type: string;
  quantity: number;
  price: number | null;
}

// Weight options
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

export const InventoryModule = () => {
  // Main tabs
  const [activeTab, setActiveTab] = useState("lpg");
  const [loading, setLoading] = useState(true);
  
  // LPG State
  const [sizeTab, setSizeTab] = useState<"22mm" | "20mm">("22mm");
  const [selectedWeight, setSelectedWeight] = useState("12kg");
  const [lpgBrands, setLpgBrands] = useState<LPGBrand[]>([]);
  const [lpgSearchQuery, setLpgSearchQuery] = useState("");
  const [isAddLpgDialogOpen, setIsAddLpgDialogOpen] = useState(false);
  const [isSendToPlantOpen, setIsSendToPlantOpen] = useState(false);
  const [isReceiveFromPlantOpen, setIsReceiveFromPlantOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{id: string, field: string, type: 'lpg' | 'stove' | 'regulator'} | null>(null);
  
  // Send/Receive plant state
  const [sendToBrand, setSendToBrand] = useState("");
  const [sendQuantity, setSendQuantity] = useState(0);
  const [receiveFromBrand, setReceiveFromBrand] = useState("");
  const [receiveQuantity, setReceiveQuantity] = useState(0);
  const [receiveType, setReceiveType] = useState<'refill' | 'package'>('refill');
  
  // Stove State
  const [stoves, setStoves] = useState<Stove[]>([]);
  const [stoveSearchQuery, setStoveSearchQuery] = useState("");
  const [filterBurner, setFilterBurner] = useState<string>("all");
  const [showDamagedOnly, setShowDamagedOnly] = useState(false);
  const [isAddStoveDialogOpen, setIsAddStoveDialogOpen] = useState(false);
  
  // Regulator State
  const [regulators, setRegulators] = useState<Regulator[]>([]);
  const [regulatorSearchQuery, setRegulatorSearchQuery] = useState("");
  const [regulatorSizeFilter, setRegulatorSizeFilter] = useState<string>("all");
  const [isAddRegulatorDialogOpen, setIsAddRegulatorDialogOpen] = useState(false);
  
  // Form states
  const [newLpgBrand, setNewLpgBrand] = useState({
    name: "", color: "#22c55e", size: "22mm", weight: "12kg",
    package_cylinder: 0, refill_cylinder: 0, empty_cylinder: 0, problem_cylinder: 0,
  });
  const [newStove, setNewStove] = useState({ brand: "", burners: 1, quantity: 0, warranty_months: 12 });
  const [newRegulator, setNewRegulator] = useState({ brand: "", type: "22mm", quantity: 0 });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const weightOptions = sizeTab === "22mm" ? WEIGHT_OPTIONS_22MM : WEIGHT_OPTIONS_20MM;

  const getOwnerIdForWrite = useCallback(async () => {
    const { data: ownerId, error } = await supabase.rpc("get_owner_id");
    if (error) throw error;
    return ownerId;
  }, []);

  // Update weight when size changes
  useEffect(() => {
    const defaultWeight = sizeTab === "22mm" ? "12kg" : "12kg";
    setSelectedWeight(defaultWeight);
    setNewLpgBrand((prev) => ({ ...prev, size: sizeTab, weight: defaultWeight }));
  }, [sizeTab]);

  useEffect(() => {
    setNewLpgBrand((prev) => ({ ...prev, weight: selectedWeight }));
  }, [selectedWeight]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [lpgRes, stovesRes, regulatorsRes] = await Promise.all([
        supabase
          .from("lpg_brands")
          .select("*")
          .eq("is_active", true)
          .eq("size", sizeTab)
          .eq("weight", selectedWeight)
          .order("name"),
        supabase.from("stoves").select("*").eq("is_active", true).order("brand"),
        supabase.from("regulators").select("*").eq("is_active", true).order("brand"),
      ]);

      if (lpgRes.error) throw lpgRes.error;
      if (stovesRes.error) throw stovesRes.error;
      if (regulatorsRes.error) throw regulatorsRes.error;

      setLpgBrands(lpgRes.data ?? []);
      setStoves(stovesRes.data ?? []);
      setRegulators(regulatorsRes.data ?? []);
    } catch (error: any) {
      console.error("Failed to load inventory data:", error);
      toast.error(error?.message || "Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  }, [sizeTab, selectedWeight]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered data
  const filteredLpgBrands = lpgBrands.filter(b => b.name.toLowerCase().includes(lpgSearchQuery.toLowerCase()));
  
  const filteredStoves = stoves.filter(s => {
    const matchesSearch = s.brand.toLowerCase().includes(stoveSearchQuery.toLowerCase());
    const matchesBurner = filterBurner === "all" || s.burners.toString() === filterBurner;
    const matchesDamaged = !showDamagedOnly || s.is_damaged === true;
    return matchesSearch && matchesBurner && matchesDamaged;
  });
  
  const filteredRegulators = regulators.filter(r => {
    const matchesSearch = r.brand.toLowerCase().includes(regulatorSearchQuery.toLowerCase());
    const matchesSize = regulatorSizeFilter === "all" || r.type === regulatorSizeFilter;
    return matchesSearch && matchesSize;
  });

  // LPG Totals
  const lpgTotals = filteredLpgBrands.reduce((acc, b) => ({
    package: acc.package + b.package_cylinder,
    refill: acc.refill + b.refill_cylinder,
    empty: acc.empty + b.empty_cylinder,
    problem: acc.problem + b.problem_cylinder,
    inTransit: acc.inTransit + (b.in_transit_cylinder || 0),
  }), { package: 0, refill: 0, empty: 0, problem: 0, inTransit: 0 });

  // Stove Totals
  const stoveTotals = {
    total: stoves.reduce((sum, s) => sum + s.quantity, 0),
    singleBurner: stoves.filter(s => s.burners === 1).reduce((sum, s) => sum + s.quantity, 0),
    doubleBurner: stoves.filter(s => s.burners === 2).reduce((sum, s) => sum + s.quantity, 0),
    damaged: stoves.filter(s => s.is_damaged).reduce((sum, s) => sum + s.quantity, 0),
  };

  // Regulator Totals
  const regulatorTotals = {
    total: regulators.reduce((sum, r) => sum + r.quantity, 0),
    size22mm: regulators.filter(r => r.type === "22mm").reduce((sum, r) => sum + r.quantity, 0),
    size20mm: regulators.filter(r => r.type === "20mm").reduce((sum, r) => sum + r.quantity, 0),
  };

  // Status helpers
  const getLpgStatus = (brand: LPGBrand) => {
    const total = brand.package_cylinder + brand.refill_cylinder;
    if (total === 0) return { label: "Out of Stock", color: "bg-red-500" };
    if (total < 10) return { label: "Low Stock", color: "bg-yellow-500" };
    return { label: "In Stock", color: "bg-green-500" };
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: "Out of Stock", bgClass: "bg-destructive/10 text-destructive" };
    if (quantity < 10) return { label: "Low Stock", bgClass: "bg-amber-500/10 text-amber-600" };
    return { label: "In Stock", bgClass: "bg-emerald-500/10 text-emerald-600" };
  };

  // CRUD Operations
  const handleAddLpgBrand = async () => {
    if (!newLpgBrand.name.trim()) {
      toast.error("Brand name is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("You must be logged in");

      const ownerId = (await getOwnerIdForWrite().catch(() => userData.user!.id)) || userData.user.id;

      const { data: insertedBrand, error } = await supabase
        .from("lpg_brands")
        .insert({
          ...newLpgBrand,
          created_by: userData.user.id,
          owner_id: ownerId,
        })
        .select()
        .single();

      if (error) throw error;

      if (insertedBrand) {
        await syncLpgBrandToPricing(
          newLpgBrand.name.trim(),
          insertedBrand.id,
          newLpgBrand.size,
          newLpgBrand.weight
        );
      }

      toast.success("Brand added successfully");
      setIsAddLpgDialogOpen(false);
      setNewLpgBrand({
        name: "",
        color: "#22c55e",
        size: sizeTab,
        weight: selectedWeight,
        package_cylinder: 0,
        refill_cylinder: 0,
        empty_cylinder: 0,
        problem_cylinder: 0,
      });
      await fetchData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to add brand");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddStove = async () => {
    if (!newStove.brand.trim()) {
      toast.error("Please enter brand name");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("You must be logged in");

      const ownerId = (await getOwnerIdForWrite().catch(() => userData.user!.id)) || userData.user.id;
      const burnerLabel = newStove.burners === 1 ? "Single Burner" : "Double Burner";

      const existing = stoves.find(
        (s) =>
          s.brand.toLowerCase() === newStove.brand.trim().toLowerCase() &&
          s.burners === newStove.burners
      );

      if (existing) {
        const { error } = await supabase
          .from("stoves")
          .update({ quantity: existing.quantity + newStove.quantity })
          .eq("id", existing.id);
        if (error) throw error;

        toast.success("Stove quantity updated");
      } else {
        const { error } = await supabase.from("stoves").insert({
          brand: newStove.brand.trim(),
          model: burnerLabel,
          burners: newStove.burners,
          quantity: newStove.quantity,
          price: 0,
          warranty_months: newStove.warranty_months,
          created_by: userData.user.id,
          owner_id: ownerId,
        });
        if (error) throw error;

        await syncStoveToPricing(newStove.brand.trim(), burnerLabel);
        toast.success("Stove added successfully");
      }

      setNewStove({ brand: "", burners: 1, quantity: 0, warranty_months: 12 });
      setIsAddStoveDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to add stove");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRegulator = async () => {
    if (!newRegulator.brand.trim()) {
      toast.error("Please enter brand name");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("You must be logged in");

      const ownerId = (await getOwnerIdForWrite().catch(() => userData.user!.id)) || userData.user.id;

      const existing = regulators.find(
        (r) =>
          r.brand.toLowerCase() === newRegulator.brand.trim().toLowerCase() &&
          r.type === newRegulator.type
      );

      if (existing) {
        const { error } = await supabase
          .from("regulators")
          .update({ quantity: existing.quantity + newRegulator.quantity })
          .eq("id", existing.id);
        if (error) throw error;

        toast.success("Regulator quantity updated");
      } else {
        const { error } = await supabase.from("regulators").insert({
          brand: newRegulator.brand.trim(),
          type: newRegulator.type,
          quantity: newRegulator.quantity,
          price: 0,
          created_by: userData.user.id,
          owner_id: ownerId,
        });
        if (error) throw error;

        await syncRegulatorToPricing(newRegulator.brand.trim(), newRegulator.type);
        toast.success("Regulator added successfully");
      }

      setNewRegulator({ brand: "", type: "22mm", quantity: 0 });
      setIsAddRegulatorDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error?.message || "Failed to add regulator");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update operations
  const handleUpdateLpg = async (id: string, field: string, value: number) => {
    try {
      const { error } = await supabase.from("lpg_brands").update({ [field]: value }).eq("id", id);
      if (error) throw error;

      setLpgBrands((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
      setEditingCell(null);
      toast.success("Updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update");
    }
  };

  const handleUpdateStove = async (id: string, value: number) => {
    try {
      const { error } = await supabase.from("stoves").update({ quantity: value }).eq("id", id);
      if (error) throw error;

      setStoves((prev) => prev.map((s) => (s.id === id ? { ...s, quantity: value } : s)));
      setEditingCell(null);
      toast.success("Updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update");
    }
  };

  const handleUpdateRegulator = async (id: string, value: number) => {
    try {
      const { error } = await supabase.from("regulators").update({ quantity: value }).eq("id", id);
      if (error) throw error;

      setRegulators((prev) => prev.map((r) => (r.id === id ? { ...r, quantity: value } : r)));
      setEditingCell(null);
      toast.success("Updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update");
    }
  };

  // Delete operations
  const handleDeleteLpg = async (id: string) => {
    try {
      const { error } = await supabase.from("lpg_brands").update({ is_active: false }).eq("id", id);
      if (error) throw error;

      setLpgBrands((prev) => prev.filter((b) => b.id !== id));
      toast.success("Brand removed");
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove brand");
    }
  };

  const handleDeleteStove = async (id: string) => {
    try {
      const { error } = await supabase.from("stoves").update({ is_active: false }).eq("id", id);
      if (error) throw error;

      setStoves((prev) => prev.filter((s) => s.id !== id));
      toast.success("Stove removed");
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove stove");
    }
  };

  const handleDeleteRegulator = async (id: string) => {
    try {
      const { error } = await supabase.from("regulators").update({ is_active: false }).eq("id", id);
      if (error) throw error;

      setRegulators((prev) => prev.filter((r) => r.id !== id));
      toast.success("Regulator removed");
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove regulator");
    }
  };

  // Send to Plant
  const handleSendToPlant = async () => {
    if (!sendToBrand || sendQuantity <= 0) {
      toast.error("Select brand and enter quantity");
      return;
    }
    const brand = lpgBrands.find(b => b.id === sendToBrand);
    if (!brand || brand.empty_cylinder < sendQuantity) {
      toast.error("Not enough empty cylinders");
      return;
    }
    setIsSubmitting(true);
    try {
      await supabase.from("lpg_brands").update({
        empty_cylinder: brand.empty_cylinder - sendQuantity,
        in_transit_cylinder: (brand.in_transit_cylinder || 0) + sendQuantity,
      }).eq("id", sendToBrand);
      toast.success(`${sendQuantity} cylinders sent to plant`);
      setIsSendToPlantOpen(false);
      setSendToBrand("");
      setSendQuantity(0);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to send");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Receive from Plant
  const handleReceiveFromPlant = async () => {
    if (!receiveFromBrand || receiveQuantity <= 0) {
      toast.error("Select brand and enter quantity");
      return;
    }
    const brand = lpgBrands.find(b => b.id === receiveFromBrand);
    if (!brand || (brand.in_transit_cylinder || 0) < receiveQuantity) {
      toast.error("Quantity exceeds in-transit stock");
      return;
    }
    setIsSubmitting(true);
    try {
      const updates: any = { in_transit_cylinder: (brand.in_transit_cylinder || 0) - receiveQuantity };
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
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to receive");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Editable Stock Cell
  const EditableStockCell = ({ 
    value, itemId, field, icon: Icon, label, bgColor = "bg-muted", type, onUpdate
  }: { 
    value: number; itemId: string; field: string; icon: React.ElementType; label: string; bgColor?: string;
    type: 'lpg' | 'stove' | 'regulator'; onUpdate: (id: string, field: string, value: number) => void;
  }) => {
    const [localValue, setLocalValue] = useState(value);
    const isEditing = editingCell?.id === itemId && editingCell?.field === field && editingCell?.type === type;

    useEffect(() => { setLocalValue(value); }, [value]);

    if (isEditing) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
            <Icon className="h-3 w-3" />{label}
          </span>
          <Input
            type="number" value={localValue}
            onChange={(e) => setLocalValue(parseInt(e.target.value) || 0)}
            onBlur={() => onUpdate(itemId, field, localValue)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onUpdate(itemId, field, localValue);
              if (e.key === "Escape") { setEditingCell(null); setLocalValue(value); }
            }}
            className="h-8 w-full text-center font-medium" autoFocus min={0}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
          <Icon className="h-3 w-3" />{label}
        </span>
        <div
          onClick={() => setEditingCell({ id: itemId, field, type })}
          className={`px-2 sm:px-3 py-2 rounded-md cursor-pointer transition-all text-center font-medium text-sm sm:text-base ${bgColor} hover:opacity-80`}
        >
          {value}
        </div>
      </div>
    );
  };

  // LPG Brand Card
  const LpgBrandCard = ({ brand }: { brand: LPGBrand }) => {
    const status = getLpgStatus(brand);
    return (
      <Card className="border-border hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
              <span className="h-3 w-3 sm:h-4 sm:w-4 rounded-full flex-shrink-0" style={{ backgroundColor: brand.color }} />
              <span className="truncate">{brand.name}</span>
            </CardTitle>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={`${status.color} text-white text-[10px] sm:text-xs border-0`}>{status.label}</Badge>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => handleDeleteLpg(brand.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] sm:text-xs w-fit mt-1">{selectedWeight}</Badge>
        </CardHeader>
        <CardContent className="space-y-3 px-3 sm:px-6 pb-3 sm:pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <EditableStockCell value={brand.package_cylinder} itemId={brand.id} field="package_cylinder" icon={Package} label="Package" bgColor="bg-green-100 dark:bg-green-900/30" type="lpg" onUpdate={handleUpdateLpg} />
            <EditableStockCell value={brand.refill_cylinder} itemId={brand.id} field="refill_cylinder" icon={Cylinder} label="Refill" bgColor="bg-blue-100 dark:bg-blue-900/30" type="lpg" onUpdate={handleUpdateLpg} />
            <EditableStockCell value={brand.empty_cylinder} itemId={brand.id} field="empty_cylinder" icon={Package} label="Empty" bgColor="bg-gray-100 dark:bg-gray-800/50" type="lpg" onUpdate={handleUpdateLpg} />
            <EditableStockCell value={brand.problem_cylinder} itemId={brand.id} field="problem_cylinder" icon={AlertTriangle} label="Problem" bgColor="bg-red-100 dark:bg-red-900/30" type="lpg" onUpdate={handleUpdateLpg} />
          </div>
          {(brand.in_transit_cylinder || 0) > 0 && (
            <div className="flex items-center justify-between p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-md">
              <span className="text-xs sm:text-sm flex items-center gap-2"><Truck className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />In Transit</span>
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300">{brand.in_transit_cylinder}</Badge>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Stove Card with full features
  const StoveCard = ({ stove }: { stove: Stove }) => {
    const status = getStockStatus(stove.quantity);
    
    const handleQuickAdjust = async (delta: number) => {
      const newValue = Math.max(0, stove.quantity + delta);
      await handleUpdateStove(stove.id, newValue);
    };

    const handleMarkDamaged = async () => {
      try {
        const { error } = await supabase.from("stoves").update({ is_damaged: !stove.is_damaged }).eq("id", stove.id);
        if (error) throw error;
        setStoves(prev => prev.map(s => s.id === stove.id ? { ...s, is_damaged: !s.is_damaged } : s));
        toast.success(stove.is_damaged ? "Marked as functional" : "Marked as damaged");
      } catch (error: any) {
        toast.error(error?.message || "Failed to update");
      }
    };

    return (
      <Card className={`border-border hover:shadow-md transition-shadow ${stove.is_damaged ? 'border-destructive/50 bg-destructive/5' : ''}`}>
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <ChefHat className={`h-4 w-4 ${stove.is_damaged ? 'text-destructive' : 'text-orange-500'}`} />
              <span className="truncate">{stove.brand}</span>
            </CardTitle>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Badge className={`${status.bgClass} text-[10px] sm:text-xs border-0`}>{status.label}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              <Flame className="h-3 w-3 mr-1" />
              {stove.burners === 1 ? "Single" : "Double"} Burner
            </Badge>
            <Badge variant="outline" className="text-[10px] sm:text-xs">{stove.model}</Badge>
            {stove.is_damaged && <Badge variant="destructive" className="text-[10px] sm:text-xs">Damaged</Badge>}
            {stove.warranty_months && stove.warranty_months > 0 && (
              <Badge variant="outline" className="text-[10px] sm:text-xs bg-green-500/10 text-green-600 border-green-500/30">
                {stove.warranty_months}mo Warranty
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4 space-y-3">
          {/* Quantity with quick adjust buttons */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 shrink-0"
              onClick={() => handleQuickAdjust(-1)}
              disabled={stove.quantity <= 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <EditableStockCell 
                value={stove.quantity} 
                itemId={stove.id} 
                field="quantity" 
                icon={Package} 
                label="Stock" 
                bgColor="bg-orange-100 dark:bg-orange-900/30" 
                type="stove" 
                onUpdate={(id, _, val) => handleUpdateStove(id, val)} 
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 shrink-0"
              onClick={() => handleQuickAdjust(1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Price display if available */}
          {stove.price > 0 && (
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
              <span className="text-xs text-muted-foreground">Price</span>
              <span className="text-sm font-medium">৳{stove.price.toLocaleString()}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <Button 
              variant={stove.is_damaged ? "default" : "outline"} 
              size="sm" 
              className={`flex-1 text-xs h-8 ${stove.is_damaged ? 'bg-green-600 hover:bg-green-700' : ''}`}
              onClick={handleMarkDamaged}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {stove.is_damaged ? "Mark OK" : "Mark Damaged"}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" 
              onClick={() => handleDeleteStove(stove.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Regulator Card with full features
  const RegulatorCard = ({ regulator }: { regulator: Regulator }) => {
    const status = getStockStatus(regulator.quantity);
    const isSize22 = regulator.type === "22mm";
    
    const handleQuickAdjust = async (delta: number) => {
      const newValue = Math.max(0, regulator.quantity + delta);
      await handleUpdateRegulator(regulator.id, newValue);
    };

    return (
      <Card className="border-border hover:shadow-md transition-shadow">
        <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6 pt-3 sm:pt-4">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Gauge className={`h-4 w-4 ${isSize22 ? "text-violet-500" : "text-cyan-500"}`} />
              <span className="truncate">{regulator.brand}</span>
            </CardTitle>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Badge className={`${status.bgClass} text-[10px] sm:text-xs border-0`}>{status.label}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            <Badge variant="outline" className={`text-[10px] sm:text-xs ${isSize22 ? "bg-violet-500/10 text-violet-600 border-violet-500/30" : "bg-cyan-500/10 text-cyan-600 border-cyan-500/30"}`}>
              <Wrench className="h-3 w-3 mr-1" />
              {regulator.type}
            </Badge>
            {isSize22 ? (
              <Badge variant="outline" className="text-[10px] sm:text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                Omera/Bashundhara
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] sm:text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                TotalGaz/Petromax
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-4 space-y-3">
          {/* Quantity with quick adjust buttons */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 shrink-0"
              onClick={() => handleQuickAdjust(-1)}
              disabled={regulator.quantity <= 0}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <EditableStockCell 
                value={regulator.quantity} 
                itemId={regulator.id} 
                field="quantity" 
                icon={Package} 
                label="Stock" 
                bgColor={isSize22 ? "bg-violet-100 dark:bg-violet-900/30" : "bg-cyan-100 dark:bg-cyan-900/30"} 
                type="regulator" 
                onUpdate={(id, _, val) => handleUpdateRegulator(id, val)} 
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8 shrink-0"
              onClick={() => handleQuickAdjust(1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Price display if available */}
          {regulator.price && regulator.price > 0 && (
            <div className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
              <span className="text-xs text-muted-foreground">Price</span>
              <span className="text-sm font-medium">৳{regulator.price.toLocaleString()}</span>
            </div>
          )}

          {/* Compatibility info */}
          <div className="p-2 bg-muted/30 rounded-md">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              💡 Compatible with {isSize22 ? "22mm valve cylinders (Omera, Bashundhara, Jamuna)" : "20mm valve cylinders (TotalGaz, Petromax)"}
            </p>
          </div>

          {/* Delete button */}
          <div className="flex justify-end pt-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" 
              onClick={() => handleDeleteRegulator(regulator.id)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Remove
            </Button>
          </div>
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
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg flex-shrink-0">
            <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Inventory</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Manage LPG cylinders, stoves & regulators</p>
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="lpg" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1 sm:gap-2 text-xs sm:text-sm">
            <Flame className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">LPG Cylinders</span>
            <span className="sm:hidden">LPG</span>
          </TabsTrigger>
          <TabsTrigger value="stoves" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white gap-1 sm:gap-2 text-xs sm:text-sm">
            <ChefHat className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Gas Stoves</span>
            <span className="sm:hidden">Stoves</span>
          </TabsTrigger>
          <TabsTrigger value="regulators" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white gap-1 sm:gap-2 text-xs sm:text-sm">
            <Wrench className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Regulators</span>
            <span className="sm:hidden">Reg.</span>
          </TabsTrigger>
        </TabsList>

        {/* LPG Tab Content */}
        <TabsContent value="lpg" className="space-y-4 mt-4">
          {/* Size Tabs */}
          <Tabs value={sizeTab} onValueChange={(v) => setSizeTab(v as "22mm" | "20mm")} className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <TabsList className="bg-muted/50 p-1">
                <TabsTrigger value="22mm" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">22mm</TabsTrigger>
                <TabsTrigger value="20mm" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">20mm</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center gap-2 flex-wrap">
                {/* Send/Receive Dialogs */}
                <Dialog open={isSendToPlantOpen} onOpenChange={setIsSendToPlantOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 text-xs sm:text-sm">
                      <ArrowUpFromLine className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Send to Plant</span>
                      <span className="sm:hidden">Send</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-md">
                    <DialogHeader><DialogTitle>Send Empties to Plant</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Select Brand</Label>
                        <Select value={sendToBrand} onValueChange={setSendToBrand}>
                          <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                          <SelectContent>
                            {lpgBrands.filter(b => b.empty_cylinder > 0).map(b => (
                              <SelectItem key={b.id} value={b.id}>{b.name} ({b.empty_cylinder} empties)</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input type="number" min={0} value={sendQuantity} onChange={(e) => setSendQuantity(parseInt(e.target.value) || 0)} />
                      </div>
                      <Button onClick={handleSendToPlant} className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send to Plant"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isReceiveFromPlantOpen} onOpenChange={setIsReceiveFromPlantOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 text-xs sm:text-sm">
                      <ArrowDownToLine className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Receive from Plant</span>
                      <span className="sm:hidden">Receive</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-md">
                    <DialogHeader><DialogTitle>Receive from Plant</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Select Brand</Label>
                        <Select value={receiveFromBrand} onValueChange={setReceiveFromBrand}>
                          <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                          <SelectContent>
                            {lpgBrands.filter(b => (b.in_transit_cylinder || 0) > 0).map(b => (
                              <SelectItem key={b.id} value={b.id}>{b.name} ({b.in_transit_cylinder} in transit)</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Receive As</Label>
                        <Select value={receiveType} onValueChange={(v) => setReceiveType(v as 'refill' | 'package')}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="refill">Refill</SelectItem>
                            <SelectItem value="package">Package (New)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input type="number" min={0} value={receiveQuantity} onChange={(e) => setReceiveQuantity(parseInt(e.target.value) || 0)} />
                      </div>
                      <Button onClick={handleReceiveFromPlant} className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Receive from Plant"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isAddLpgDialogOpen} onOpenChange={setIsAddLpgDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-2 bg-gradient-to-r from-primary to-primary/80 text-xs sm:text-sm">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Add Brand</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] sm:max-w-md">
                    <DialogHeader><DialogTitle>Add New LPG Brand</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Brand Name *</Label>
                        <Input placeholder="e.g., Bashundhara, Omera" value={newLpgBrand.name} onChange={(e) => setNewLpgBrand({ ...newLpgBrand, name: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Color</Label>
                          <Input type="color" value={newLpgBrand.color} onChange={(e) => setNewLpgBrand({ ...newLpgBrand, color: e.target.value })} className="h-10" />
                        </div>
                        <div className="space-y-2">
                          <Label>Weight</Label>
                          <Select value={newLpgBrand.weight} onValueChange={(v) => setNewLpgBrand({ ...newLpgBrand, weight: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {weightOptions.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Package</Label>
                          <Input type="number" min={0} value={newLpgBrand.package_cylinder} onChange={(e) => setNewLpgBrand({ ...newLpgBrand, package_cylinder: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Refill</Label>
                          <Input type="number" min={0} value={newLpgBrand.refill_cylinder} onChange={(e) => setNewLpgBrand({ ...newLpgBrand, refill_cylinder: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Empty</Label>
                          <Input type="number" min={0} value={newLpgBrand.empty_cylinder} onChange={(e) => setNewLpgBrand({ ...newLpgBrand, empty_cylinder: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Problem</Label>
                          <Input type="number" min={0} value={newLpgBrand.problem_cylinder} onChange={(e) => setNewLpgBrand({ ...newLpgBrand, problem_cylinder: parseInt(e.target.value) || 0 })} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        💡 Prices are set in the Product Pricing module and will be auto-synced
                      </p>
                      <Button onClick={handleAddLpgBrand} className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Brand"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </Tabs>

          {/* Weight Selector */}
          <div className="flex flex-wrap gap-2">
            {weightOptions.map(w => (
              <Button
                key={w.value}
                variant={selectedWeight === w.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedWeight(w.value)}
                className={`text-xs sm:text-sm ${selectedWeight === w.value ? "bg-primary text-primary-foreground" : ""}`}
              >
                {w.shortLabel} KG
              </Button>
            ))}
          </div>

          {/* LPG Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-green-500" />
                  <div>
                    <p className="text-lg sm:text-2xl font-bold">{lpgTotals.package}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Package</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Cylinder className="h-4 w-4 text-blue-500" />
                  <div>
                    <p className="text-lg sm:text-2xl font-bold">{lpgTotals.refill}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Refill</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-gray-500/10 to-gray-500/5 border-gray-500/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-lg sm:text-2xl font-bold">{lpgTotals.empty}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Empty</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <div>
                    <p className="text-lg sm:text-2xl font-bold">{lpgTotals.problem}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Problem</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 col-span-2 sm:col-span-1">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-lg sm:text-2xl font-bold">{lpgTotals.inTransit}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">In Transit</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search brands..." value={lpgSearchQuery} onChange={(e) => setLpgSearchQuery(e.target.value)} className="pl-10" />
          </div>

          {/* LPG Brand Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLpgBrands.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Flame className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">No brands found for {sizeTab} / {selectedWeight}</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsAddLpgDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />Add Brand
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredLpgBrands.map(brand => <LpgBrandCard key={brand.id} brand={brand} />)
            )}
          </div>
        </TabsContent>

        {/* Stoves Tab Content */}
        <TabsContent value="stoves" className="space-y-4 mt-4">
          {/* Stove Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-lg sm:text-2xl font-bold">{stoveTotals.total}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Units</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-lg sm:text-2xl font-bold">{stoveTotals.singleBurner}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Single Burner</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-purple-500" />
                  <div>
                    <p className="text-lg sm:text-2xl font-bold">{stoveTotals.doubleBurner}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Double Burner</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <div>
                    <p className="text-lg sm:text-2xl font-bold">{stoveTotals.damaged}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Damaged</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stove Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search stoves..." value={stoveSearchQuery} onChange={(e) => setStoveSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Select value={filterBurner} onValueChange={setFilterBurner}>
                <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Filter by type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="1">Single Burner</SelectItem>
                  <SelectItem value="2">Double Burner</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
                <Switch checked={showDamagedOnly} onCheckedChange={setShowDamagedOnly} id="damaged-filter" />
                <Label htmlFor="damaged-filter" className="text-xs cursor-pointer">Damaged</Label>
              </div>
              <Dialog open={isAddStoveDialogOpen} onOpenChange={setIsAddStoveDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 bg-gradient-to-r from-orange-500 to-red-500">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Stove</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-md">
                  <DialogHeader><DialogTitle>Add New Stove</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Brand Name *</Label>
                      <Input placeholder="e.g., Walton, RFL" value={newStove.brand} onChange={(e) => setNewStove({ ...newStove, brand: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Burner Type *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {[1, 2].map((burner) => (
                          <button key={burner} onClick={() => setNewStove({ ...newStove, burners: burner })}
                            className={`p-3 sm:p-4 rounded-xl border-2 transition-all ${newStove.burners === burner ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
                            <div className="flex flex-col items-center gap-2">
                              <Flame className={`h-5 w-5 ${newStove.burners === burner ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span className="text-xs sm:text-sm font-medium">{burner === 1 ? "Single Burner" : "Double Burner"}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" min={0} value={newStove.quantity} onChange={(e) => setNewStove({ ...newStove, quantity: parseInt(e.target.value) || 0 })} />
                    </div>
                    <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      💡 Prices are set in the Product Pricing module
                    </p>
                    <Button onClick={handleAddStove} className="w-full bg-gradient-to-r from-orange-500 to-red-500" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Stove"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stove Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStoves.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ChefHat className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">No stoves found</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsAddStoveDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />Add Stove
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredStoves.map(stove => <StoveCard key={stove.id} stove={stove} />)
            )}
          </div>
        </TabsContent>

        {/* Regulators Tab Content */}
        <TabsContent value="regulators" className="space-y-4 mt-4">
          {/* Regulator Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-violet-500" />
                  <div>
                    <p className="text-lg sm:text-2xl font-bold">{regulatorTotals.total}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Units</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-violet-500" />
                  <div>
                    <p className="text-lg sm:text-2xl font-bold">{regulatorTotals.size22mm}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">22mm Size</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border-cyan-500/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-cyan-500" />
                  <div>
                    <p className="text-lg sm:text-2xl font-bold">{regulatorTotals.size20mm}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">20mm Size</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Regulator Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex w-full sm:w-auto rounded-lg bg-muted/50 p-1">
              <Button
                type="button"
                size="sm"
                variant={regulatorSizeFilter === "all" ? "default" : "ghost"}
                className="h-8 flex-1 sm:flex-none"
                onClick={() => setRegulatorSizeFilter("all")}
              >
                All Sizes
              </Button>
              <Button
                type="button"
                size="sm"
                variant={regulatorSizeFilter === "22mm" ? "default" : "ghost"}
                className="h-8 flex-1 sm:flex-none"
                onClick={() => setRegulatorSizeFilter("22mm")}
              >
                22mm
              </Button>
              <Button
                type="button"
                size="sm"
                variant={regulatorSizeFilter === "20mm" ? "default" : "ghost"}
                className="h-8 flex-1 sm:flex-none"
                onClick={() => setRegulatorSizeFilter("20mm")}
              >
                20mm
              </Button>
            </div>
            <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search regulators..." value={regulatorSearchQuery} onChange={(e) => setRegulatorSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Dialog open={isAddRegulatorDialogOpen} onOpenChange={setIsAddRegulatorDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 whitespace-nowrap bg-gradient-to-r from-violet-500 to-purple-600">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Regulator</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-md">
                  <DialogHeader><DialogTitle>Add New Regulator</DialogTitle></DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Brand Name *</Label>
                      <Input placeholder="e.g., Sena, Pamir, Bono" value={newRegulator.brand} onChange={(e) => setNewRegulator({ ...newRegulator, brand: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Size *</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {["22mm", "20mm"].map((size) => (
                          <button key={size} onClick={() => setNewRegulator({ ...newRegulator, type: size })}
                            className={`p-4 rounded-xl border-2 transition-all ${newRegulator.type === size ? (size === "22mm" ? 'border-violet-500 bg-violet-500/10' : 'border-cyan-500 bg-cyan-500/10') : 'border-border hover:border-primary/50'}`}>
                            <div className="flex flex-col items-center gap-2">
                              <Gauge className={`h-6 w-6 ${newRegulator.type === size ? (size === "22mm" ? 'text-violet-500' : 'text-cyan-500') : 'text-muted-foreground'}`} />
                              <span className="text-sm font-medium">{size}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Initial Quantity</Label>
                      <Input type="number" min={0} value={newRegulator.quantity} onChange={(e) => setNewRegulator({ ...newRegulator, quantity: parseInt(e.target.value) || 0 })} />
                    </div>
                    <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      💡 Prices are set in the Product Pricing module
                    </p>
                    <Button onClick={handleAddRegulator} className="w-full bg-gradient-to-r from-violet-500 to-purple-600" disabled={isSubmitting}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Regulator"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Regulator Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRegulators.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Wrench className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground text-center">No regulators found</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsAddRegulatorDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />Add Regulator
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredRegulators.map(regulator => <RegulatorCard key={regulator.id} regulator={regulator} />)
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
