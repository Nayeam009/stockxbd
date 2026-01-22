import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Trash2, Clock, History, Gift, Banknote, Users, Truck, Gauge, 
  AlertTriangle, Fuel, Wallet, TrendingUp 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { useLanguage } from "@/contexts/LanguageContext";
import { PremiumStatCard } from "@/components/shared/PremiumStatCard";

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
const FUEL_EFFICIENCY_THRESHOLD = 3;

export const UtilityExpenseModule = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("staff");
  
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
  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    const channels = [
      supabase.channel('staff-utility-realtime').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'staff' }, 
        () => fetchStaffData()
      ).subscribe(),
      supabase.channel('staff-payments-utility-realtime').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'staff_payments' }, 
        () => fetchStaffData()
      ).subscribe(),
      supabase.channel('vehicles-utility-realtime').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'vehicles' }, 
        () => fetchVehicleData()
      ).subscribe(),
      supabase.channel('vehicle-costs-utility-realtime').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'vehicle_costs' }, 
        () => fetchVehicleData()
      ).subscribe(),
    ];
    
    return () => channels.forEach(ch => supabase.removeChannel(ch));
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchStaffData(), fetchVehicleData()]);
    setLoading(false);
  };

  const fetchStaffData = async () => {
    const currentMonth = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());

    const [staffRes, paymentsRes] = await Promise.all([
      supabase.from("staff").select("*").eq("is_active", true).order("name"),
      supabase.from("staff_payments").select("*")
        .gte("payment_date", format(currentMonth, "yyyy-MM-dd"))
        .lte("payment_date", format(monthEnd, "yyyy-MM-dd")),
    ]);

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
  };

  const fetchVehicleData = async () => {
    const [vehiclesRes, costsRes] = await Promise.all([
      supabase.from("vehicles").select("*").eq("is_active", true).order("name"),
      supabase.from("vehicle_costs").select("*, vehicle:vehicles(*)").order("cost_date", { ascending: false }),
    ]);

    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    if (costsRes.data) setCosts(costsRes.data as VehicleCost[]);
  };

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid": return <Badge className="bg-success hover:bg-success text-white text-[10px] sm:text-xs">Paid</Badge>;
      case "Partial": return <Badge className="bg-warning hover:bg-warning text-white text-[10px] sm:text-xs">Partial</Badge>;
      default: return <Badge variant="destructive" className="text-[10px] sm:text-xs">Unpaid</Badge>;
    }
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
            <Wallet className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">{t('utility_expense')}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Manage staff salary and vehicle costs</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <PremiumStatCard
          title="Monthly Total"
          value={`${BANGLADESHI_CURRENCY_SYMBOL}${getTotalMonthlyExpense().toLocaleString()}`}
          subtitle="Staff + Vehicle"
          icon={<TrendingUp className="h-5 w-5" />}
          colorScheme="rose"
        />
        <PremiumStatCard
          title="Staff Paid"
          value={`${BANGLADESHI_CURRENCY_SYMBOL}${getTotalStaffPaidThisMonth().toLocaleString()}`}
          subtitle={`${staffList.length} staff members`}
          icon={<Users className="h-5 w-5" />}
          colorScheme="emerald"
        />
        <PremiumStatCard
          title="Staff Due"
          value={`${BANGLADESHI_CURRENCY_SYMBOL}${getTotalStaffDue().toLocaleString()}`}
          subtitle="Remaining salary"
          icon={<Banknote className="h-5 w-5" />}
          colorScheme="amber"
        />
        <PremiumStatCard
          title="Vehicle Cost"
          value={`${BANGLADESHI_CURRENCY_SYMBOL}${getThisMonthVehicleTotal().toLocaleString()}`}
          subtitle={`${vehicles.length} vehicles`}
          icon={<Truck className="h-5 w-5" />}
          colorScheme="purple"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-11">
          <TabsTrigger value="staff" className="gap-2 h-10">
            <Users className="h-4 w-4" />
            Staff Salary
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="gap-2 h-10">
            <Truck className="h-4 w-4" />
            Vehicles
          </TabsTrigger>
        </TabsList>

        {/* Staff Tab */}
        <TabsContent value="staff" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 h-10">
                  <Plus className="h-4 w-4" /> Add Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
                <DialogHeader><DialogTitle>Add New Staff Member</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} placeholder="e.g., Md. Razu" />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Input value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} placeholder="e.g., Manager, Driver" />
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Salary ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                    <Input type="number" inputMode="numeric" value={newStaff.salary || ""} onChange={e => setNewStaff({...newStaff, salary: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone (Optional)</Label>
                    <Input value={newStaff.phone} onChange={e => setNewStaff({...newStaff, phone: e.target.value})} placeholder="e.g., 01XXXXXXXXX" />
                  </div>
                  <Button onClick={handleAddStaff} className="w-full">Add Staff</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Staff Cards (Mobile) / Table (Desktop) */}
          <Card className="border-border">
            <CardContent className="p-0 sm:p-4">
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3 p-3">
                {staffList.map(staff => (
                  <div key={staff.id} className="p-3 border border-border rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 bg-muted"><AvatarFallback className="text-sm">{getInitials(staff.name)}</AvatarFallback></Avatar>
                        <div>
                          <p className="font-medium text-sm">{staff.name}</p>
                          <p className="text-xs text-muted-foreground">{staff.role}</p>
                        </div>
                      </div>
                      {getStatusBadge(staff.status)}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Salary</p>
                        <p className="text-sm font-medium">{BANGLADESHI_CURRENCY_SYMBOL}{Number(staff.salary).toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-success/10 rounded-lg">
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="text-sm font-medium text-success">{BANGLADESHI_CURRENCY_SYMBOL}{staff.totalPaid.toLocaleString()}</p>
                      </div>
                      <div className="p-2 bg-destructive/10 rounded-lg">
                        <p className="text-xs text-muted-foreground">Due</p>
                        <p className="text-sm font-medium text-destructive">{BANGLADESHI_CURRENCY_SYMBOL}{staff.remaining.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-10" onClick={() => { setSelectedStaff(staff); setPayAmount(staff.remaining); setPayDialogOpen(true); }} disabled={staff.status === "Paid"}>Pay Salary</Button>
                      <Button variant="outline" size="sm" className="h-10" onClick={() => { setSelectedStaff(staff); setBonusDialogOpen(true); }}><Gift className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="h-10" onClick={() => { setSelectedStaff(staff); setHistoryDialogOpen(true); }}><History className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                {staffList.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No staff members yet</p>
                    <p className="text-xs">Add your first staff member to get started</p>
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Salary</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffList.map(staff => (
                      <TableRow key={staff.id}>
                        <TableCell className="font-medium">{staff.name}</TableCell>
                        <TableCell>{staff.role}</TableCell>
                        <TableCell className="text-right">{BANGLADESHI_CURRENCY_SYMBOL}{Number(staff.salary).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-success">{BANGLADESHI_CURRENCY_SYMBOL}{staff.totalPaid.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-destructive">{BANGLADESHI_CURRENCY_SYMBOL}{staff.remaining.toLocaleString()}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(staff.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedStaff(staff); setPayAmount(staff.remaining); setPayDialogOpen(true); }} disabled={staff.status === "Paid"}><Banknote className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedStaff(staff); setBonusDialogOpen(true); }}><Gift className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedStaff(staff); setHistoryDialogOpen(true); }}><History className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteStaff(staff.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicles Tab */}
        <TabsContent value="vehicles" className="mt-4 space-y-4">
          <div className="flex justify-end gap-2">
            <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 h-10"><Truck className="h-4 w-4" /> Add Vehicle</Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md">
                <DialogHeader><DialogTitle>Add New Vehicle</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Vehicle Name</Label>
                    <Input value={newVehicle.name} onChange={e => setNewVehicle({...newVehicle, name: e.target.value})} placeholder="e.g., Truck 1" />
                  </div>
                  <div className="space-y-2">
                    <Label>License Plate (Optional)</Label>
                    <Input value={newVehicle.license_plate} onChange={e => setNewVehicle({...newVehicle, license_plate: e.target.value})} placeholder="e.g., DHA-1234" />
                  </div>
                  <Button onClick={handleAddVehicle} className="w-full">Add Vehicle</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 h-10"><Plus className="h-4 w-4" /> Add Cost</Button>
              </DialogTrigger>
              <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Add Vehicle Cost</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Vehicle</Label>
                    <Select value={newCost.vehicle_id} onValueChange={v => setNewCost({...newCost, vehicle_id: v})}>
                      <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                      <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Type</Label>
                    <Select value={newCost.cost_type} onValueChange={v => setNewCost({...newCost, cost_type: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{COST_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  {newCost.cost_type === "Fuel" && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium"><Fuel className="h-4 w-4 text-primary" /> Fuel Details</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Liters Filled</Label>
                          <Input type="number" inputMode="decimal" value={newCost.liters_filled || ""} onChange={e => setNewCost({...newCost, liters_filled: Number(e.target.value)})} className="h-10" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Odometer (km)</Label>
                          <Input type="number" inputMode="numeric" value={newCost.odometer_reading || ""} onChange={e => setNewCost({...newCost, odometer_reading: Number(e.target.value)})} className="h-10" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input value={newCost.description} onChange={e => setNewCost({...newCost, description: e.target.value})} placeholder="e.g., Diesel top-up" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                      <Input type="number" inputMode="numeric" value={newCost.amount || ""} onChange={e => setNewCost({...newCost, amount: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={newCost.cost_date} onChange={e => setNewCost({...newCost, cost_date: e.target.value})} />
                    </div>
                  </div>
                  <Button onClick={handleAddCost} className="w-full">Add Cost</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Vehicle Costs Table */}
          <Card className="border-border">
            <CardContent className="p-0 sm:p-4">
              {/* Mobile Card View */}
              <div className="sm:hidden space-y-3 p-3">
                {costs.slice(0, 10).map(cost => (
                  <div key={cost.id} className="p-3 border border-border rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={cost.cost_type === "Fuel" ? "default" : "secondary"}>{cost.cost_type}</Badge>
                        <span className="text-sm font-medium">{cost.vehicle?.name || 'Unknown'}</span>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDeleteCost(cost.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{cost.description || 'No description'}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{format(new Date(cost.cost_date), "dd MMM yyyy")}</span>
                      <span className="text-base font-bold text-destructive">{BANGLADESHI_CURRENCY_SYMBOL}{Number(cost.amount).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {costs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No vehicle costs recorded</p>
                    <p className="text-xs">Start by adding vehicles and logging costs</p>
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costs.slice(0, 20).map(cost => (
                      <TableRow key={cost.id}>
                        <TableCell>{format(new Date(cost.cost_date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="font-medium">{cost.vehicle?.name || 'Unknown'}</TableCell>
                        <TableCell><Badge variant={cost.cost_type === "Fuel" ? "default" : "secondary"}>{cost.cost_type}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{cost.description || '-'}</TableCell>
                        <TableCell className="text-right font-bold">{BANGLADESHI_CURRENCY_SYMBOL}{Number(cost.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteCost(cost.id)}><Trash2 className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Pay Salary - {selectedStaff?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Remaining Due</p>
              <p className="text-2xl font-bold text-destructive">{BANGLADESHI_CURRENCY_SYMBOL}{selectedStaff?.remaining.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <Label>Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
              <Input type="number" inputMode="numeric" value={payAmount || ""} onChange={e => setPayAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Note (Optional)</Label>
              <Input value={payNote} onChange={e => setPayNote(e.target.value)} placeholder="e.g., Advance payment" />
            </div>
            <Button onClick={handlePay} className="w-full">Confirm Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bonus Dialog */}
      <Dialog open={bonusDialogOpen} onOpenChange={setBonusDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Add Bonus - {selectedStaff?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bonus Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
              <Input type="number" inputMode="numeric" value={bonusAmount || ""} onChange={e => setBonusAmount(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Input value={bonusNote} onChange={e => setBonusNote(e.target.value)} placeholder="e.g., Eid bonus" />
            </div>
            <Button onClick={handleBonus} className="w-full">Add Bonus</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Payment History - {selectedStaff?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4">
            {selectedStaff?.payments.length === 0 && <p className="text-center text-muted-foreground py-4">No payments yet</p>}
            {selectedStaff?.payments.map(payment => (
              <div key={payment.id} className="p-3 border border-border rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{format(new Date(payment.payment_date), "dd MMM yyyy")}</p>
                  <p className="text-sm">{payment.notes || 'Salary payment'}</p>
                </div>
                <p className="text-base font-bold text-success">{BANGLADESHI_CURRENCY_SYMBOL}{Number(payment.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
