import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, Trash2, History, Gift, Banknote, Users, Truck, 
  Fuel, Wallet, TrendingUp, Calendar, Receipt, Wrench,
  ChevronRight, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

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
  const [activeTab, setActiveTab] = useState("staff");
  const mountedRef = useRef(true);
  
  // Staff State
  const [staffList, setStaffList] = useState<StaffWithPayments[]>([]);
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

  // Vehicle State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [costs, setCosts] = useState<VehicleCost[]>([]);
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

  const [loading, setLoading] = useState(true);

  // ==================== Data Fetching ====================
  const fetchStaffData = useCallback(async () => {
    const currentMonth = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const [staffRes, paymentsRes] = await Promise.all([
      supabase.from("staff").select("*").eq("is_active", true).order("name"),
      supabase.from("staff_payments").select("*")
        .gte("payment_date", format(currentMonth, "yyyy-MM-dd"))
        .lte("payment_date", format(monthEnd, "yyyy-MM-dd")),
    ]);

    if (!mountedRef.current) return;

    if (staffRes.data && paymentsRes.data) {
      const staffWithPayments: StaffWithPayments[] = staffRes.data.map(staff => {
        const payments = paymentsRes.data.filter(p => p.staff_id === staff.id);
        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const remaining = Number(staff.salary) - totalPaid;
        const lastPayment = payments.sort((a, b) => 
          new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        )[0];
        
        let status: "Paid" | "Partial" | "Unpaid" = "Unpaid";
        if (remaining <= 0) status = "Paid";
        else if (totalPaid > 0) status = "Partial";

        return { ...staff, payments, totalPaid, remaining: Math.max(0, remaining), lastPaid: lastPayment?.payment_date || null, status };
      });
      setStaffList(staffWithPayments);
    }
  }, []);

  const fetchVehicleData = useCallback(async () => {
    const [vehiclesRes, costsRes] = await Promise.all([
      supabase.from("vehicles").select("*").eq("is_active", true).order("name"),
      supabase.from("vehicle_costs").select("*, vehicle:vehicles(*)").order("cost_date", { ascending: false }),
    ]);

    if (!mountedRef.current) return;

    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    if (costsRes.data) setCosts(costsRes.data as VehicleCost[]);
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStaffData(), fetchVehicleData()]);
    if (mountedRef.current) setLoading(false);
  }, [fetchStaffData, fetchVehicleData]);

  useEffect(() => {
    mountedRef.current = true;
    fetchAllData();
    return () => { mountedRef.current = false; };
  }, [fetchAllData]);

  // Real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('utility-expense-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchStaffData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_payments' }, fetchStaffData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, fetchVehicleData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicle_costs' }, fetchVehicleData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_expenses' }, fetchAllData)
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [fetchStaffData, fetchVehicleData, fetchAllData]);

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
      // Auto-sync to daily expenses
      await supabase.from("daily_expenses").insert({
        expense_date: format(new Date(), "yyyy-MM-dd"),
        category: "Staff",
        description: `Salary Payment - ${selectedStaff.name}${payNote ? ': ' + payNote : ''}`,
        amount: payAmount,
        created_by: user.user.id,
      });
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
    const costData: any = {
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
      // Auto-sync to daily expenses
      await supabase.from("daily_expenses").insert({
        expense_date: newCost.cost_date,
        category: "Transport",
        description: `${newCost.cost_type} - ${vehicle?.name || 'Vehicle'}${newCost.description ? ': ' + newCost.description : ''}`,
        amount: newCost.amount,
        created_by: user.user.id,
      });
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

  if (loading) return <UtilityExpenseSkeleton />;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Professional Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Wallet className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">{t('utility_expense')}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Manage staff salary and vehicle costs</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded-full">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Real-time sync</span>
          </div>
        </div>
      </div>

      {/* KPI Cards - Premium Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Monthly Total */}
        <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30">
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

        {/* Staff Paid */}
        <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
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

        {/* Staff Due */}
        <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
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

        {/* Vehicle Cost */}
        <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30">
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

      {/* Tabs - Modern Design */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 p-1 rounded-xl">
          <TabsTrigger 
            value="staff" 
            className="gap-2 h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Staff Salary</span>
            <span className="sm:hidden">Staff</span>
          </TabsTrigger>
          <TabsTrigger 
            value="vehicles" 
            className="gap-2 h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm font-medium"
          >
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Vehicles</span>
            <span className="sm:hidden">Vehicles</span>
          </TabsTrigger>
        </TabsList>

        {/* Staff Tab Content */}
        <TabsContent value="staff" className="mt-4 space-y-4">
          {/* Action Button */}
          <div className="flex justify-end">
            <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-11 shadow-md">
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
                  <Button onClick={handleAddStaff} className="w-full h-11">Add Staff</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Staff Cards - Mobile Optimized */}
          {staffList.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground font-medium">No staff members yet</p>
                <p className="text-sm text-muted-foreground/70">Add your first staff member to get started</p>
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
                    
                    {/* Stats Grid */}
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

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4">
                      <Button 
                        size="sm"
                        className="flex-1 h-10"
                        onClick={() => { setSelectedStaff(staff); setPayAmount(staff.remaining); setPayDialogOpen(true); }}
                        disabled={staff.status === "Paid"}
                      >
                        <Banknote className="h-4 w-4 mr-1.5" />
                        Pay Salary
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={() => { setSelectedStaff(staff); setBonusDialogOpen(true); }}
                      >
                        <Gift className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-10 w-10 p-0"
                        onClick={() => { setSelectedStaff(staff); setHistoryDialogOpen(true); }}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-10 w-10 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
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

        {/* Vehicles Tab Content */}
        <TabsContent value="vehicles" className="mt-4 space-y-4">
          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 h-11">
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
                  <Button onClick={handleAddVehicle} className="w-full h-11">Add Vehicle</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 h-11 shadow-md">
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
                  <Button onClick={handleAddCost} className="w-full h-11">Add Cost</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Vehicle Costs List */}
          {costs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Truck className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground font-medium">No vehicle costs yet</p>
                <p className="text-sm text-muted-foreground/70">Add a vehicle and log your first cost</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {costs.slice(0, 20).map(cost => (
                <Card key={cost.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center",
                          cost.cost_type === "Fuel" ? "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400" :
                          cost.cost_type === "Maintenance" ? "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400" :
                          "bg-muted text-muted-foreground"
                        )}>
                          {getCostTypeIcon(cost.cost_type)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm">{cost.vehicle?.name || 'Unknown Vehicle'}</p>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{cost.cost_type}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{cost.description || 'No description'}</p>
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(cost.cost_date), 'dd MMM yyyy')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-base tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{Number(cost.amount).toLocaleString()}</p>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteCost(cost.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Pay Salary - {selectedStaff?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-xl space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly Salary</span>
                <span className="font-medium tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{Number(selectedStaff?.salary || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Already Paid</span>
                <span className="font-medium text-emerald-600 tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{(selectedStaff?.totalPaid || 0).toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-sm">
                <span className="font-medium">Remaining Due</span>
                <span className="font-bold text-rose-600 tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{(selectedStaff?.remaining || 0).toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
              <Input className="h-12 text-lg text-center font-bold" type="number" inputMode="numeric" value={payAmount || ""} onChange={e => setPayAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Note (Optional)</Label>
              <Input className="h-11 text-base" value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="e.g., January salary" />
            </div>
            <Button onClick={handlePay} className="w-full h-11">Confirm Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bonus Dialog */}
      <Dialog open={bonusDialogOpen} onOpenChange={setBonusDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Give Bonus - {selectedStaff?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Bonus Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
              <Input className="h-12 text-lg text-center font-bold" type="number" inputMode="numeric" value={bonusAmount || ""} onChange={e => setBonusAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Reason</Label>
              <Input className="h-11 text-base" value={bonusNote} onChange={e => setBonusNote(e.target.value)} placeholder="e.g., Performance bonus" />
            </div>
            <Button onClick={handleBonus} className="w-full h-11">Give Bonus</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader><DialogTitle>Payment History - {selectedStaff?.name}</DialogTitle></DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 py-4">
              {selectedStaff?.payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No payments recorded this month</p>
              ) : (
                selectedStaff?.payments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                        <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{format(new Date(payment.payment_date), 'dd MMM yyyy')}</p>
                        <p className="text-xs text-muted-foreground">{payment.notes || 'Salary payment'}</p>
                      </div>
                    </div>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{BANGLADESHI_CURRENCY_SYMBOL}{Number(payment.amount).toLocaleString()}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
