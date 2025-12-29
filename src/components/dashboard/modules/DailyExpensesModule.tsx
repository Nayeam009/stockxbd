import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  description: string | null;
  amount: number;
}

const EXPENSE_CATEGORIES = [
  "LPG Purchase",
  "Transport",
  "Staff",
  "Utilities",
  "Maintenance",
  "Rent",
  "Marketing",
  "Other"
];

export const DailyExpensesModule = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    category: '',
    description: '',
    amount: ''
  });

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();

    const channel = supabase
      .channel('daily_expenses_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_expenses' }, () => {
        fetchExpenses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const monthlyTotal = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    return expenses
      .filter(expense => {
        const expenseDate = new Date(expense.expense_date);
        return expenseDate >= monthStart && expenseDate <= monthEnd;
      })
      .reduce((sum, expense) => sum + Number(expense.amount), 0);
  }, [expenses]);

  const handleAddExpense = async () => {
    if (!newExpense.category || !newExpense.amount) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('daily_expenses')
        .insert({
          expense_date: newExpense.expense_date,
          category: newExpense.category,
          description: newExpense.description || null,
          amount: parseFloat(newExpense.amount),
          created_by: user?.id
        });

      if (error) throw error;

      toast.success("Expense added successfully");
      setDialogOpen(false);
      setNewExpense({
        expense_date: format(new Date(), 'yyyy-MM-dd'),
        category: '',
        description: '',
        amount: ''
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to add expense");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('daily_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Expense deleted successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete expense");
    }
  };

  const getCategoryBadgeStyle = (category: string) => {
    const styles: Record<string, string> = {
      "LPG Purchase": "bg-blue-600/20 text-blue-400 border-blue-600/30",
      "Transport": "bg-purple-600/20 text-purple-400 border-purple-600/30",
      "Staff": "bg-green-600/20 text-green-400 border-green-600/30",
      "Utilities": "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
      "Maintenance": "bg-orange-600/20 text-orange-400 border-orange-600/30",
      "Rent": "bg-pink-600/20 text-pink-400 border-pink-600/30",
      "Marketing": "bg-cyan-600/20 text-cyan-400 border-cyan-600/30",
      "Other": "bg-gray-600/20 text-gray-400 border-gray-600/30"
    };
    return styles[category] || styles["Other"];
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Daily Expenses</h2>
          <p className="text-muted-foreground">Log and monitor all your operational costs.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">Add New Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newExpense.expense_date}
                  onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={newExpense.category} onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Enter description"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (৳)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="bg-background border-border"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddExpense}>Add Expense</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Monthly Total Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-foreground">Total Expenses (This Month)</CardTitle>
            </div>
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">৳{monthlyTotal.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-1">Total expenses recorded for the current month.</p>
        </CardContent>
      </Card>

      {/* Expense History */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-foreground">Expense History</CardTitle>
          <CardDescription className="text-muted-foreground">A log of all your daily operational expenses.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-muted/50">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Category</TableHead>
                <TableHead className="text-muted-foreground">Description</TableHead>
                <TableHead className="text-muted-foreground text-right">Amount</TableHead>
                <TableHead className="text-muted-foreground text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No expense records found
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id} className="border-border hover:bg-muted/50">
                    <TableCell className="text-foreground">
                      {format(new Date(expense.expense_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getCategoryBadgeStyle(expense.category)}>
                        {expense.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{expense.description || '-'}</TableCell>
                    <TableCell className="text-foreground text-right font-semibold">
                      ৳{Number(expense.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
