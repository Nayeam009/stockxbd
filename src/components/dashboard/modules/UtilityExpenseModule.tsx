import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, Trash2, History, Gift, Banknote, Users, Truck, 
  Fuel, Wallet, TrendingUp, Receipt, Wrench
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { EmptyStateCard } from "@/components/shared/EmptyStateCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { sharedKeys } from "@/hooks/useSharedQueries";
import { dispatchModuleEvent } from "@/lib/moduleEvents";
import { PremiumModuleHeader } from "@/components/shared/PremiumModuleHeader";

// ==================== Types ====================
interface Staff {
  id: string;
  name: string;
  role: string;
  salary: number;
  phone: string | null;
  is_active: boolean;
}

interface StaffPayment {
  id: string;
  staff_id: string;
  amount: number;
  payment_date: string;
  notes: string | null;
}

interface StaffWithPayments extends Staff {
  payments: StaffPayment[];
  totalPaid: number;
  remaining: number;
  lastPaid: string | null;
  status: "Paid" | "Partial" | "Unpaid";
}

interface Vehicle {
  id: string;
  name: string;
  license_plate: string | null;
  is_active: boolean;
  last_odometer: number | null;
}

interface VehicleCost {
  id: string;
  vehicle_id: string;
  cost_type: string;
  description: string | null;
  amount: number;
  cost_date: string;
  liters_filled: number | null;
  odometer_reading: number | null;
  vehicle?: Vehicle;
}

const COST_TYPES = ["Fuel", "Maintenance", "Repairs", "Insurance", "Registration", "Other"];

// ==================== Fetch Functions ====================
async function fetchStaffWithPayments(): Promise<StaffWithPayments[]> {
  const currentMonth = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const [staffRes, paymentsRes] = await Promise.all([
    supabase.from("staff").select("*").eq("is_active", true).order("name"),
    supabase.from("staff_payments").select("*")
      .gte("payment_date", format(currentMonth, "yyyy-MM-dd"))
      .lte("payment_date", format(monthEnd, "yyyy-MM-dd")),
  ]);

  const staffData = staffRes.data ?? [];
  const paymentsData = paymentsRes.data ?? [];

  return staffData.map(staff => {
    const payments = paymentsData.filter(p => p.staff_id === staff.id);
    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(staff.salary) - totalPaid;
    const lastPayment = [...payments].sort((a, b) => 
      new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    )[0];
    
    let status: "Paid" | "Partial" | "Unpaid" = "Unpaid";
    if (remaining <= 0) status = "Paid";
    else if (totalPaid > 0) status = "Partial";

    return { ...staff, payments, totalPaid, remaining: Math.max(0, remaining), lastPaid: lastPayment?.payment_date || null, status };
  });
}

async function fetchVehiclesAndCosts(): Promise<{ vehicles: Vehicle[]; costs: VehicleCost[] }> {
  const [vehiclesRes, costsRes] = await Promise.all([
    supabase.from("vehicles").select("*").eq("is_active", true).order("name"),
    supabase.from("vehicle_costs").select("*, vehicle:vehicles(*)").order("cost_date", { ascending: false }),
  ]);

  return {
    vehicles: vehiclesRes.data ?? [],
    costs: (costsRes.data as VehicleCost[]) ?? [],
  };
}

// ==================== Skeleton Component ====================
const UtilityExpenseSkeleton = () => (
  <div className="space-y-4 sm:space-y-6 animate-pulse">
    <div className="flex items-center gap-3">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-12 w-full rounded-lg" />
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  </div>
);

// ==================== Main Component ====================
export const UtilityExpenseModule = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("staff");
  
  // Staff Dialog State
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [bonusDialogOpen, setBonusDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffWithPayments | null>(null);
  const [newStaff, setNewStaff] = useState({ name: "", role: "Staff", salary: 0, phone: "" });
  const [payAmount, setPayAmount] = useState(0);
  const [payNote, setPayNote] = useState("");
  const [bonusAmount, setBonusAmount] = useState(0);
  const [bonusNote, setBonusNote] = useState("");

  // Vehicle Dialog State
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);
  const [newCost, setNewCost] = useState({
    vehicle_id: "",
    cost_type: "Fuel",
    description: "",
    amount: 0,
    cost_date: format(new Date(), "yyyy-MM-dd"),
    liters_filled: 0,
    odometer_reading: 0,
  });
  const [newVehicle, setNewVehicle] = useState({ name: "", license_plate: "" });

  // ==================== TanStack Query Data Fetching ====================
  const { data: staffList = [], isLoading: staffLoading, refetch: refetchStaff } = useQuery({
    queryKey: ['utility', 'staff'],
    queryFn: fetchStaffWithPayments,
    staleTime: 2 * 60 * 1000,
  });

  const { data: vehicleData = { vehicles: [], costs: [] }, isLoading: vehicleLoading, refetch: refetchVehicles } = useQuery({
    queryKey: ['utility', 'vehicles'],
    queryFn: fetchVehiclesAndCosts,
    staleTime: 2 * 60 * 1000,
  });

  const vehicles = vehicleData.vehicles;
  const costs = vehicleData.costs;
  const isLoading = staffLoading || vehicleLoading;

  // ==================== Staff Actions ====================
  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.salary) {
      toast({ title: "Name and salary are required", variant: "destructive" });
      return;
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase.from("staff").insert({ ...newStaff, created_by: user.user.id });
    if (error) {
      toast({ title: "Error adding staff", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Staff added successfully" });
      setStaffDialogOpen(false);
      setNewStaff({ name: "", role: "Staff", salary: 0, phone: "" });
      queryClient.invalidateQueries({ queryKey: ['utility', 'staff'] });
    }
  };

  const handlePay = async () => {
    if (!selectedStaff || payAmount <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase.from("staff_payments").insert({
      staff_id: selectedStaff.id,
      amount: payAmount,
      notes: payNote || null,
      payment_date: format(new Date(), "yyyy-MM-dd"),
      created_by: user.user.id,
    });

    if (error) {
      toast({ title: "Error processing payment", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("daily_expenses").insert({
        expense_date: format(new Date(), "yyyy-MM-dd"),
        category: "Staff",
        description: `Salary Payment - ${selectedStaff.name}${payNote ? ': ' + payNote : ''}`,
        amount: payAmount,
        created_by: user.user.id,
      });
      // Invalidate shared cache + fire expense event for instant overview refresh
      queryClient.invalidateQueries({ queryKey: sharedKeys.overview() });
      queryClient.invalidateQueries({ queryKey: ['utility', 'staff'] });
      dispatchModuleEvent('expense-added', { amount: payAmount, category: 'Staff' });
      toast({ title: "Payment recorded successfully" });
      setPayDialogOpen(false);
      setPayAmount(0);
      setPayNote("");
      setSelectedStaff(null);
    }
  };

  const handleBonus = async () => {
    if (!selectedStaff || bonusAmount <= 0) {
      toast({ title: "Please enter a valid bonus amount", variant: "destructive" });
      return;
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase.from("staff_payments").insert({
      staff_id: selectedStaff.id,
      amount: bonusAmount,
      notes: `Bonus: ${bonusNote || 'Performance bonus'}`,
      payment_date: format(new Date(), "yyyy-MM-dd"),
      created_by: user.user.id,
    });

    if (error) {
      toast({ title: "Error processing bonus", description: error.message, variant: "destructive" });
    } else {
      await supabase.from("daily_expenses").insert({
        expense_date: format(new Date(), "yyyy-MM-dd"),
        category: "Staff",
        description: `Bonus - ${selectedStaff.name}: ${bonusNote || 'Performance bonus'}`,
        amount: bonusAmount,
        created_by: user.user.id,
      });
      queryClient.invalidateQueries({ queryKey: sharedKeys.overview() });
      queryClient.invalidateQueries({ queryKey: ['utility', 'staff'] });
      dispatchModuleEvent('expense-added', { amount: bonusAmount, category: 'Staff' });
      toast({ title: "Bonus recorded successfully" });
      setBonusDialogOpen(false);
      setBonusAmount(0);
      setBonusNote("");
      setSelectedStaff(null);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    const { error } = await supabase.from("staff").update({ is_active: false }).eq("id", id);
    if (error) {
      toast({ title: "Error deleting staff", variant: "destructive" });
    } else {
      toast({ title: "Staff removed" });
      queryClient.invalidateQueries({ queryKey: ['utility', 'staff'] });
    }
  };

  // ==================== Vehicle Actions ====================
  const handleAddVehicle = async () => {
    if (!newVehicle.name) {
      toast({ title: "Vehicle name is required", variant: "destructive" });
      return;
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase.from("vehicles").insert({ ...newVehicle, created_by: user.user.id });
    if (error) {
      toast({ title: "Error adding vehicle", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vehicle added successfully" });
      setVehicleDialogOpen(false);
      setNewVehicle({ name: "", license_plate: "" });
      queryClient.invalidateQueries({ queryKey: ['utility', 'vehicles'] });
    }
  };

  const handleAddCost = async () => {
    if (!newCost.vehicle_id || !newCost.amount) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const vehicle = vehicles.find(v => v.id === newCost.vehicle_id);
    const costData: {
      vehicle_id: string;
      cost_type: string;
      description: string | null;
      amount: number;
      cost_date: string;
      created_by: string;
      liters_filled?: number | null;
      odometer_reading?: number | null;
    } = {
      vehicle_id: newCost.vehicle_id,
      cost_type: newCost.cost_type,
      description: newCost.description || null,
      amount: newCost.amount,
      cost_date: newCost.cost_date,
      created_by: user.user.id,
    };

    if (newCost.cost_type === "Fuel") {
      costData.liters_filled = newCost.liters_filled || null;
      costData.odometer_reading = newCost.odometer_reading || null;
    }

    const { error } = await supabase.from("vehicle_costs").insert(costData);
    if (error) {
      toast({ title: "Error adding cost", description: error.message, variant: "destructive" });
    } else {
      if (newCost.cost_type === "Fuel" && newCost.odometer_reading > 0) {
        await supabase.from("vehicles").update({ last_odometer: newCost.odometer_reading }).eq("id", newCost.vehicle_id);
      }
      await supabase.from("daily_expenses").insert({
        expense_date: newCost.cost_date,
        category: "Transport",
        description: `${newCost.cost_type} - ${vehicle?.name || 'Vehicle'}${newCost.description ? ': ' + newCost.description : ''}`,
        amount: newCost.amount,
        created_by: user.user.id,
      });
      queryClient.invalidateQueries({ queryKey: sharedKeys.overview() });
      queryClient.invalidateQueries({ queryKey: ['utility', 'vehicles'] });
      dispatchModuleEvent('expense-added', { amount: newCost.amount, category: 'Transport' });
      toast({ title: "Cost added successfully" });
      setCostDialogOpen(false);
      setNewCost({ vehicle_id: "", cost_type: "Fuel", description: "", amount: 0, cost_date: format(new Date(), "yyyy-MM-dd"), liters_filled: 0, odometer_reading: 0 });
    }
  };

  const handleDeleteCost = async (id: string) => {
    const { error } = await supabase.from("vehicle_costs").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting cost", variant: "destructive" });
    } else {
      toast({ title: "Cost deleted" });
      queryClient.invalidateQueries({ queryKey: ['utility', 'vehicles'] });
    }
  };

  // ==================== Calculations ====================
  const getTotalStaffPaidThisMonth = () => staffList.reduce((sum, s) => sum + s.totalPaid, 0);
  const getTotalStaffDue = () => staffList.reduce((sum, s) => sum + s.remaining, 0);
  
  const getThisMonthVehicleTotal = () => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return costs.filter(c => {
      const date = new Date(c.cost_date);
      return date >= start && date <= end;
    }).reduce((sum, c) => sum + Number(c.amount), 0);
  };

  const getTotalMonthlyExpense = () => getTotalStaffPaidThisMonth() + getThisMonthVehicleTotal();
  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid": return <Badge className="bg-emerald-500/90 hover:bg-emerald-500 text-white text-[10px] font-medium px-2 py-0.5">Paid</Badge>;
      case "Partial": return <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white text-[10px] font-medium px-2 py-0.5">Partial</Badge>;
      default: return <Badge className="bg-rose-500/90 hover:bg-rose-500 text-white text-[10px] font-medium px-2 py-0.5">Unpaid</Badge>;
    }
  };

  const getCostTypeIcon = (type: string) => {
    switch (type) {
      case "Fuel": return <Fuel className="h-3.5 w-3.5" />;
      case "Maintenance": return <Wrench className="h-3.5 w-3.5" />;
      case "Repairs": return <Wrench className="h-3.5 w-3.5" />;
      default: return <Receipt className="h-3.5 w-3.5" />;
    }
  };

  if (isLoading) return <UtilityExpenseSkeleton />;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Standardized PremiumModuleHeader */}
      <PremiumModuleHeader
        title={t('utility_expense')}
        subtitle="Staff salary & vehicle cost management"
        icon={<Wallet className="h-6 w-6 text-primary-foreground" />}
        gradientFrom="from-amber-500/5"
        gradientTo="to-rose-500/5"
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['utility', 'staff'] });
          queryClient.invalidateQueries({ queryKey: ['utility', 'vehicles'] });
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="relative overflow-hidden border border-border/20 shadow-sm bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-400 to-pink-500" />
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  {BANGLADESHI_CURRENCY_SYMBOL}{getTotalMonthlyExpense().toLocaleString()}
                </p>
                <p className="text-xs font-medium text-rose-600/70 dark:text-rose-400/70 uppercase tracking-wide">Monthly Total</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Staff + Vehicle</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-border/20 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {BANGLADESHI_CURRENCY_SYMBOL}{getTotalStaffPaidThisMonth().toLocaleString()}
                </p>
                <p className="text-xs font-medium text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wide">Staff Paid</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{staffList.length} staff members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-border/20 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                <Banknote className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {BANGLADESHI_CURRENCY_SYMBOL}{getTotalStaffDue().toLocaleString()}
                </p>
                <p className="text-xs font-medium text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wide">Staff Due</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Remaining salary</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border border-border/20 shadow-sm bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 to-purple-500" />
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center">
                <Truck className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl sm:text-3xl font-bold text-violet-600 dark:text-violet-400 tabular-nums">
                  {BANGLADESHI_CURRENCY_SYMBOL}{getThisMonthVehicleTotal().toLocaleString()}
                </p>
                <p className="text-xs font-medium text-violet-600/70 dark:text-violet-400/70 uppercase tracking-wide">Vehicle Cost</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{vehicles.length} vehicles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="staff" className="gap-2 h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Staff Salary</span>
            <span className="sm:hidden">Staff</span>
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="gap-2 h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium">
            <Truck className="h-4 w-4" />
            <span>Vehicles</span>
          </TabsTrigger>
        </TabsList>

        {/* Staff Tab */}
        <TabsContent value="staff" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-12 shadow-md">
                  <Plus className="h-4 w-4" /> Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
                <DialogHeader><DialogTitle>Add New Staff Member</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Name</Label>
                    <Input className="h-11 text-base" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} placeholder="e.g., Md. Razu" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Role</Label>
                    <Input className="h-11 text-base" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} placeholder="e.g., Manager, Driver" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Monthly Salary ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                    <Input className="h-11 text-base" type="number" inputMode="numeric" value={newStaff.salary || ""} onChange={e => setNewStaff({...newStaff, salary: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Phone (Optional)</Label>
                    <Input className="h-11 text-base" value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} placeholder="e.g., 01XXXXXXXXX" />
                  </div>
                  <Button onClick={handleAddStaff} className="w-full h-12">Add Staff</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {staffList.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground font-medium">No staff members yet</p>
                <p className="text-sm text-muted-foreground/70">Add your first staff member to get started</p>
                <Button className="mt-4 h-12 gap-2" onClick={() => setStaffDialogOpen(true)}>
                  <Plus className="h-4 w-4" /> Add Staff
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {staffList.map(staff => (
                <Card key={staff.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-11 w-11 border-2 border-background shadow-sm">
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-sm">
                            {getInitials(staff.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{staff.name}</p>
                          <p className="text-xs text-muted-foreground">{staff.role}</p>
                        </div>
                      </div>
                      {getStatusBadge(staff.status)}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div className="p-2.5 bg-muted/50 rounded-lg text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Salary</p>
                        <p className="text-sm font-bold tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{Number(staff.salary).toLocaleString()}</p>
                      </div>
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg text-center">
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Paid</p>
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{staff.totalPaid.toLocaleString()}</p>
                      </div>
                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 rounded-lg text-center">
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 uppercase tracking-wide">Due</p>
                        <p className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{staff.remaining.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        size="sm"
                        className="flex-1 h-12"
                        onClick={() => { setSelectedStaff(staff); setPayAmount(staff.remaining); setPayDialogOpen(true); }}
                        disabled={staff.status === "Paid"}
                      >
                        <Banknote className="h-4 w-4 mr-1.5" />
                        Pay Salary
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="h-12 w-12 p-0"
                        onClick={() => { setSelectedStaff(staff); setBonusDialogOpen(true); }}
                      >
                        <Gift className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-12 w-12 p-0"
                        onClick={() => { setSelectedStaff(staff); setHistoryDialogOpen(true); }}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-12 w-12 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteStaff(staff.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="mt-4 space-y-4">
          <div className="flex justify-end gap-2">
            <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 h-12">
                  <Truck className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Vehicle</span>
                  <span className="sm:hidden">Vehicle</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
                <DialogHeader><DialogTitle>Add New Vehicle</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Vehicle Name</Label>
                    <Input className="h-11 text-base" value={newVehicle.name} onChange={e => setNewVehicle({...newVehicle, name: e.target.value})} placeholder="e.g., Truck 01" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">License Plate (Optional)</Label>
                    <Input className="h-11 text-base" value={newVehicle.license_plate} onChange={e => setNewVehicle({...newVehicle, license_plate: e.target.value})} placeholder="e.g., DHA-1234" />
                  </div>
                  <Button onClick={handleAddVehicle} className="w-full h-12">Add Vehicle</Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-12 shadow-md">
                  <Plus className="h-4 w-4" /> Add Cost
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add Vehicle Cost</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Vehicle</Label>
                    <Select value={newCost.vehicle_id} onValueChange={v => setNewCost({...newCost, vehicle_id: v})}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                      <SelectContent>
                        {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Cost Type</Label>
                    <Select value={newCost.cost_type} onValueChange={v => setNewCost({...newCost, cost_type: v})}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COST_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {newCost.cost_type === "Fuel" && (
                    <div className="p-3 bg-muted/50 rounded-xl space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Fuel className="h-4 w-4 text-primary" />
                        Fuel Details
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Liters Filled</Label>
                          <Input className="h-10" type="number" inputMode="decimal" value={newCost.liters_filled || ""} onChange={e => setNewCost({...newCost, liters_filled: Number(e.target.value)})} placeholder="0" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Odometer (km)</Label>
                          <Input className="h-10" type="number" inputMode="numeric" value={newCost.odometer_reading || ""} onChange={e => setNewCost({...newCost, odometer_reading: Number(e.target.value)})} placeholder="0" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Description</Label>
                    <Input className="h-11 text-base" value={newCost.description} onChange={e => setNewCost({...newCost, description: e.target.value})} placeholder="e.g., Diesel top-up" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                      <Input className="h-11 text-base" type="number" inputMode="numeric" value={newCost.amount || ""} onChange={e => setNewCost({...newCost, amount: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Date</Label>
                      <Input className="h-11" type="date" value={newCost.cost_date} onChange={e => setNewCost({...newCost, cost_date: e.target.value})} />
                    </div>
                  </div>
                  <Button onClick={handleAddCost} className="w-full h-12">Add Cost</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {costs.length === 0 ? (
            <EmptyStateCard
              icon={<Truck className="h-10 w-10" />}
              title="No vehicle costs yet"
              subtitle="Add your delivery vehicle and track fuel and maintenance costs"
              colorScheme="muted"
              actionLabel="Add Cost"
              onAction={() => setCostDialogOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {costs.slice(0, 20).map(cost => (
                <Card key={cost.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                          {getCostTypeIcon(cost.cost_type)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">{cost.cost_type}</p>
                          <p className="text-xs text-muted-foreground">{(cost.vehicle as Vehicle)?.name || 'Vehicle'}</p>
                          {cost.description && <p className="text-xs text-muted-foreground truncate">{cost.description}</p>}
                          <p className="text-xs text-muted-foreground">{format(new Date(cost.cost_date), 'MMM dd, yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <p className="font-bold text-foreground tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{Number(cost.amount).toLocaleString()}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteCost(cost.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {cost.cost_type === "Fuel" && cost.liters_filled && (
                      <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                        {cost.liters_filled > 0 && <span>{cost.liters_filled}L filled</span>}
                        {cost.odometer_reading && cost.odometer_reading > 0 && <span>• {cost.odometer_reading} km</span>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader><DialogTitle>Pay Salary — {selectedStaff?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Salary:</span><span className="font-semibold">{BANGLADESHI_CURRENCY_SYMBOL}{selectedStaff?.salary.toLocaleString()}</span></div>
              <div className="flex justify-between mt-1"><span className="text-muted-foreground">Remaining:</span><span className="font-semibold text-rose-600">{BANGLADESHI_CURRENCY_SYMBOL}{selectedStaff?.remaining.toLocaleString()}</span></div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
              <Input className="h-12 text-base" type="number" inputMode="numeric" value={payAmount || ""} onChange={e => setPayAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Note (Optional)</Label>
              <Input className="h-11 text-base" value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="e.g., October salary" />
            </div>
            <Button onClick={handlePay} className="w-full h-12" disabled={payAmount <= 0}>
              <Banknote className="h-4 w-4 mr-2" /> Confirm Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bonus Dialog */}
      <Dialog open={bonusDialogOpen} onOpenChange={setBonusDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader><DialogTitle>Give Bonus — {selectedStaff?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Bonus Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
              <Input className="h-12 text-base" type="number" inputMode="numeric" value={bonusAmount || ""} onChange={e => setBonusAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reason</Label>
              <Input className="h-11 text-base" value={bonusNote} onChange={e => setBonusNote(e.target.value)} placeholder="e.g., Eid bonus" />
            </div>
            <Button onClick={handleBonus} className="w-full h-12" disabled={bonusAmount <= 0}>
              <Gift className="h-4 w-4 mr-2" /> Confirm Bonus
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader><DialogTitle>Payment History — {selectedStaff?.name}</DialogTitle></DialogHeader>
          <div className="py-4">
            {selectedStaff?.payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No payments this month</p>
            ) : (
              <div className="space-y-2">
                {selectedStaff?.payments.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{format(new Date(p.payment_date), 'MMM dd, yyyy')}</p>
                      {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                    </div>
                    <p className="font-bold text-emerald-600 tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{Number(p.amount).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
