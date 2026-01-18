import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Trash2, Clock, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth } from "date-fns";

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

  useEffect(() => {
    fetchData();
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
      toast({ title: "Payment recorded successfully" });
      setPayDialogOpen(false);
      setPayAmount(0);
      setPayNote("");
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

  const openHistoryDialog = (staff: StaffWithPayments) => {
    setSelectedStaff(staff);
    setHistoryDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return <Badge className="bg-green-600 hover:bg-green-600 text-white">Paid</Badge>;
      case "Partial":
        return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Partial</Badge>;
      default:
        return <Badge variant="destructive">Unpaid</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Staff Salary Management</h2>
          <p className="text-muted-foreground">Manage payroll and track salary payments for all staff members.</p>
        </div>
        <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add New Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg">Add New Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Name</Label>
                <Input 
                  value={newStaff.name}
                  onChange={e => setNewStaff({...newStaff, name: e.target.value})}
                  placeholder="e.g., Md. Razu"
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Role</Label>
                <Input 
                  value={newStaff.role}
                  onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                  placeholder="e.g., Manager, Driver, Staff"
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Monthly Salary (৳)</Label>
                <Input 
                  type="number"
                  value={newStaff.salary}
                  onChange={e => setNewStaff({...newStaff, salary: Number(e.target.value)})}
                  className="h-11 text-base"
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Phone (Optional)</Label>
                <Input 
                  value={newStaff.phone}
                  onChange={e => setNewStaff({...newStaff, phone: e.target.value})}
                  placeholder="e.g., 01XXXXXXXXX"
                  className="h-11 text-base"
                  inputMode="tel"
                />
              </div>
              <Button onClick={handleAddStaff} className="w-full h-11 text-base">Add Staff</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Staff Table */}
      <Card className="border-border">
        <CardContent className="pt-6">
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
                  <TableCell className="text-center">৳{Number(staff.salary).toLocaleString()}</TableCell>
                  <TableCell className="text-center text-green-500">
                    ৳{staff.totalPaid.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center text-destructive">
                    ৳{staff.remaining.toLocaleString()}
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
                        variant="ghost" 
                        size="icon"
                        onClick={() => openHistoryDialog(staff)}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteStaff(staff.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {staffList.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No staff members found. Add your first staff to get started.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pay Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg">Pay {selectedStaff?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Monthly Salary</span>
                <span>৳{selectedStaff?.salary.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Already Paid</span>
                <span className="text-green-500">৳{selectedStaff?.totalPaid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t border-border pt-2 mt-2">
                <span>Remaining</span>
                <span className="text-destructive">৳{selectedStaff?.remaining.toLocaleString()}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Amount (৳)</Label>
              <Input 
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(Number(e.target.value))}
                className="h-11 text-base"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Note (Optional)</Label>
              <Input 
                value={payNote}
                onChange={e => setPayNote(e.target.value)}
                placeholder="e.g., Advance payment"
                className="h-11 text-base"
              />
            </div>
            <Button onClick={handlePay} className="w-full h-11 text-base">Confirm Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-md">
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
                      <p className="font-medium">৳{Number(payment.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.payment_date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  {payment.notes && (
                    <span className="text-xs text-muted-foreground">{payment.notes}</span>
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