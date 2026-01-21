import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2, Clock, History, Gift, Banknote, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

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

export const StaffSalaryModule = () => {
  const [staffList, setStaffList] = useState<StaffWithPayments[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [bonusDialogOpen, setBonusDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffWithPayments | null>(null);

  const [newStaff, setNewStaff] = useState({
    name: "",
    role: "Staff",
    salary: 0,
    phone: "",
  });

  const [payAmount, setPayAmount] = useState(0);
  const [payNote, setPayNote] = useState("");
  const [bonusAmount, setBonusAmount] = useState(0);
  const [bonusNote, setBonusNote] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time staff sync
  useEffect(() => {
    const channels = [
      supabase.channel('staff-realtime').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'staff' }, 
        () => fetchData()
      ).subscribe(),
      supabase.channel('staff-payments-realtime').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'staff_payments' }, 
        () => fetchData()
      ).subscribe(),
    ];
    
    return () => channels.forEach(ch => supabase.removeChannel(ch));
  }, []);

  const fetchData = async () => {
    setLoading(true);
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

        return {
          ...staff,
          payments,
          totalPaid,
          remaining: Math.max(0, remaining),
          lastPaid: lastPayment?.payment_date || null,
          status,
        };
      });
      setStaffList(staffWithPayments);
    }
    setLoading(false);
  };

  const handleAddStaff = async () => {
    if (!newStaff.name || !newStaff.salary) {
      toast({ title: "Name and salary are required", variant: "destructive" });
      return;
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase.from("staff").insert({
      ...newStaff,
      created_by: user.user.id,
    });

    if (error) {
      toast({ title: "Error adding staff", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Staff added successfully" });
      setStaffDialogOpen(false);
      setNewStaff({ name: "", role: "Staff", salary: 0, phone: "" });
      fetchData();
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
      fetchData();
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
      // Auto-sync bonus to daily expenses
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
      fetchData();
    }
  };

  const handleDeleteStaff = async (id: string) => {
    const { error } = await supabase.from("staff").update({ is_active: false }).eq("id", id);
    if (error) {
      toast({ title: "Error deleting staff", variant: "destructive" });
    } else {
      toast({ title: "Staff removed" });
      fetchData();
    }
  };

  const openPayDialog = (staff: StaffWithPayments) => {
    setSelectedStaff(staff);
    setPayAmount(staff.remaining);
    setPayDialogOpen(true);
  };

  const openBonusDialog = (staff: StaffWithPayments) => {
    setSelectedStaff(staff);
    setBonusAmount(0);
    setBonusNote("");
    setBonusDialogOpen(true);
  };

  const openHistoryDialog = (staff: StaffWithPayments) => {
    setSelectedStaff(staff);
    setHistoryDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] sm:text-xs">Paid</Badge>;
      case "Partial":
        return <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px] sm:text-xs">Partial</Badge>;
      default:
        return <Badge variant="destructive" className="text-[10px] sm:text-xs">Unpaid</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getTotalSalaryDue = () => {
    return staffList.reduce((sum, s) => sum + s.remaining, 0);
  };

  const getTotalPaidThisMonth = () => {
    return staffList.reduce((sum, s) => sum + s.totalPaid, 0);
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Staff Salary Management</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage payroll and track salary payments.</p>
        </div>
        <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 h-9 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input 
                  value={newStaff.name}
                  onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                  placeholder="e.g., Md. Razu"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input 
                  value={newStaff.role}
                  onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                  placeholder="e.g., Manager, Driver, Staff"
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Salary ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                <Input 
                  type="number"
                  inputMode="numeric"
                  value={newStaff.salary || ""}
                  onChange={e => setNewStaff({...newStaff, salary: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone (Optional)</Label>
                <Input 
                  value={newStaff.phone}
                  onChange={e => setNewStaff({...newStaff, phone: e.target.value})}
                  placeholder="e.g., 01XXXXXXXXX"
                />
              </div>
              <Button onClick={handleAddStaff} className="w-full">Add Staff</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{staffList.length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-success/20 flex items-center justify-center flex-shrink-0">
                <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-success">{BANGLADESHI_CURRENCY_SYMBOL}{getTotalPaidThisMonth().toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Paid This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-destructive">{BANGLADESHI_CURRENCY_SYMBOL}{getTotalSalaryDue().toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Remaining Due</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{staffList.filter(s => s.status === "Partial").length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Partial Paid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Cards (Mobile) / Table (Desktop) */}
      <Card className="border-border">
        <CardContent className="p-0 sm:p-4 sm:pt-4">
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3 p-3">
            {staffList.map(staff => (
              <div key={staff.id} className="p-3 border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 bg-muted">
                      <AvatarFallback className="text-sm">{getInitials(staff.name)}</AvatarFallback>
                    </Avatar>
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
                  <Button 
                    size="sm"
                    className="flex-1 h-9"
                    onClick={() => openPayDialog(staff)}
                    disabled={staff.status === "Paid"}
                  >
                    Pay Salary
                  </Button>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => openBonusDialog(staff)}
                  >
                    <Gift className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-9"
                    onClick={() => openHistoryDialog(staff)}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Salary</TableHead>
                  <TableHead className="text-center">Paid</TableHead>
                  <TableHead className="text-center">Remaining</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Last Paid</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map(staff => (
                  <TableRow key={staff.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 bg-muted">
                          <AvatarFallback className="text-sm">{getInitials(staff.name)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{staff.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{staff.role}</TableCell>
                    <TableCell className="text-center">{BANGLADESHI_CURRENCY_SYMBOL}{Number(staff.salary).toLocaleString()}</TableCell>
                    <TableCell className="text-center text-green-500">
                      {BANGLADESHI_CURRENCY_SYMBOL}{staff.totalPaid.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center text-destructive">
                      {BANGLADESHI_CURRENCY_SYMBOL}{staff.remaining.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(staff.status)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {staff.lastPaid ? format(new Date(staff.lastPaid), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openPayDialog(staff)}
                          disabled={staff.status === "Paid"}
                        >
                          Pay
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openBonusDialog(staff)}
                        >
                          <Gift className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openHistoryDialog(staff)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="text-destructive hover:text-destructive h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {staffList.length === 0 && (
            <div className="text-center py-8 sm:py-12 text-muted-foreground text-sm">
              No staff members found. Add your first staff to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay {selectedStaff?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Monthly Salary</span>
                <span>{BANGLADESHI_CURRENCY_SYMBOL}{selectedStaff?.salary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Already Paid</span>
                <span className="text-green-500">{BANGLADESHI_CURRENCY_SYMBOL}{selectedStaff?.totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t border-border pt-2 mt-2">
                <span>Remaining</span>
                <span className="text-destructive">{BANGLADESHI_CURRENCY_SYMBOL}{selectedStaff?.remaining.toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Payment Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
              <Input 
                type="number"
                inputMode="numeric"
                value={payAmount || ""}
                onChange={e => setPayAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Note (Optional)</Label>
              <Input 
                value={payNote}
                onChange={e => setPayNote(e.target.value)}
                placeholder="e.g., Advance payment"
              />
            </div>
            <Button onClick={handlePay} className="w-full">Confirm Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bonus Dialog */}
      <Dialog open={bonusDialogOpen} onOpenChange={setBonusDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Add Bonus for {selectedStaff?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bonus Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
              <Input 
                type="number"
                inputMode="numeric"
                value={bonusAmount || ""}
                onChange={e => setBonusAmount(Number(e.target.value))}
                placeholder="Enter bonus amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input 
                value={bonusNote}
                onChange={e => setBonusNote(e.target.value)}
                placeholder="e.g., Eid Bonus, Performance Bonus"
              />
            </div>
            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              💡 Bonus will be recorded separately and added to Daily Expenses
            </p>
            <Button onClick={handleBonus} className="w-full">Add Bonus</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment History - {selectedStaff?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-80 overflow-auto">
            {selectedStaff?.payments && selectedStaff.payments.length > 0 ? (
              selectedStaff.payments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{BANGLADESHI_CURRENCY_SYMBOL}{Number(payment.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.payment_date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  {payment.notes && (
                    <Badge variant="outline" className="text-xs">
                      {payment.notes.includes('Bonus') ? '🎁 Bonus' : 'Salary'}
                    </Badge>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                No payments recorded this month.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};