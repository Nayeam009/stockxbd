import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2, Plus, Trash2, TrendingDown, TrendingUp, DollarSign, Calendar, Filter, Download, PieChart as PieChartIcon, RefreshCcw, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, subMonths, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  description: string | null;
  amount: number;
}

const EXPENSE_CATEGORIES = [
  { value: "LPG Purchase", label: "LPG Purchase", icon: "🛢️", color: "#3b82f6" },
  { value: "Transport", label: "Transport", icon: "🚛", color: "#8b5cf6" },
  { value: "Staff", label: "Staff Salary", icon: "👥", color: "#22c55e" },
  { value: "Utilities", label: "Utilities", icon: "💡", color: "#eab308" },
  { value: "Maintenance", label: "Maintenance", icon: "🔧", color: "#f97316" },
  { value: "Rent", label: "Rent", icon: "🏠", color: "#ec4899" },
  { value: "Marketing", label: "Marketing", icon: "📢", color: "#06b6d4" },
  { value: "Other", label: "Other", icon: "📦", color: "#6b7280" }
];

export const DailyExpensesModule = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDate, setFilterDate] = useState("");
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

  // Analytics calculations
  const analytics = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));
    const todayStr = format(today, 'yyyy-MM-dd');

    const thisMonthExpenses = expenses.filter(e => {
      const date = new Date(e.expense_date);
      return date >= monthStart && date <= monthEnd;
    });

    const lastMonthExpenses = expenses.filter(e => {
      const date = new Date(e.expense_date);
      return date >= lastMonthStart && date <= lastMonthEnd;
    });

    const todayExpenses = expenses.filter(e => e.expense_date === todayStr);

    const monthlyTotal = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const lastMonthTotal = lastMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const todayTotal = todayExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const growth = lastMonthTotal > 0 
      ? ((monthlyTotal - lastMonthTotal) / lastMonthTotal) * 100 
      : 0;

    // Category breakdown
    const categoryBreakdown = EXPENSE_CATEGORIES.map(cat => {
      const amount = thisMonthExpenses
        .filter(e => e.category === cat.value)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      return { ...cat, amount };
    }).filter(c => c.amount > 0);

    // Daily average
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dailyAverage = monthlyTotal / Math.min(today.getDate(), daysInMonth);

    // Top category
    const topCategory = categoryBreakdown.sort((a, b) => b.amount - a.amount)[0];

    return {
      monthlyTotal,
      lastMonthTotal,
      todayTotal,
      growth,
      categoryBreakdown,
      dailyAverage,
      topCategory,
      expenseCount: thisMonthExpenses.length
    };
  }, [expenses]);

  // Weekly chart data
  const weeklyChartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return format(date, 'yyyy-MM-dd');
    });

    return last7Days.map(date => {
      const dayExpenses = expenses.filter(e => e.expense_date === date);
      return {
        name: format(new Date(date), 'EEE'),
        amount: dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
      };
    });
  }, [expenses]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (filterCategory !== 'all' && e.category !== filterCategory) return false;
      if (filterDate && e.expense_date !== filterDate) return false;
      return true;
    });
  }, [expenses, filterCategory, filterDate]);

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

  const getCategoryInfo = (category: string) => {
    return EXPENSE_CATEGORIES.find(c => c.value === category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Daily Expenses</h2>
          <p className="text-muted-foreground">Track and manage your operational costs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchExpenses}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
                <DialogDescription>Record a new business expense</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newExpense.expense_date}
                    onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={newExpense.category} onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Enter description (optional)"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
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
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-destructive/10 via-card to-card border-destructive/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Monthly Expenses</p>
                <p className="text-xl sm:text-3xl font-bold text-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.monthlyTotal.toLocaleString()}</p>
                <div className="flex items-center gap-1 text-xs">
                  {analytics.growth > 0 ? (
                    <TrendingUp className="h-3 w-3 text-red-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-green-500" />
                  )}
                  <span className={analytics.growth > 0 ? "text-red-500" : "text-green-500"}>
                    {Math.abs(analytics.growth).toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs last month</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Today's Expenses</p>
                <p className="text-xl sm:text-3xl font-bold text-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.todayTotal.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Avg: {BANGLADESHI_CURRENCY_SYMBOL}{analytics.dailyAverage.toFixed(0)}/day</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Calendar className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Top Category</p>
                <p className="text-sm sm:text-lg font-bold text-foreground truncate">
                  {analytics.topCategory?.icon} {analytics.topCategory?.label || 'N/A'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {BANGLADESHI_CURRENCY_SYMBOL}{analytics.topCategory?.amount.toLocaleString() || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <PieChartIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">Expense Entries</p>
                <p className="text-xl sm:text-3xl font-bold text-foreground">{analytics.expenseCount}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Weekly Expense Trend</CardTitle>
            <CardDescription>Last 7 days spending</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${BANGLADESHI_CURRENCY_SYMBOL}${value.toLocaleString()}`, 'Expense']}
                  />
                  <Bar dataKey="amount" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Category Distribution</CardTitle>
            <CardDescription>Expenses by category this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {analytics.categoryBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="amount"
                      nameKey="label"
                    >
                      {analytics.categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${BANGLADESHI_CURRENCY_SYMBOL}${value.toLocaleString()}`, 'Amount']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>No expense data this month</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {analytics.categoryBreakdown.slice(0, 4).map((cat) => (
                <div key={cat.value} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-muted-foreground">{cat.icon} {cat.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardHeader className="py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-muted-foreground">Category:</label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-muted-foreground">Date:</label>
              <Input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-40"
              />
            </div>
            {(filterCategory !== 'all' || filterDate) && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setFilterCategory("all");
                  setFilterDate("");
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expense History */}
      <Card className="border-border">
        <CardHeader className="py-4">
          <CardTitle className="text-lg font-semibold">Expense History</CardTitle>
          <CardDescription>Showing {filteredExpenses.length} records</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold text-right">Amount</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="text-muted-foreground space-y-2">
                        <DollarSign className="h-10 w-10 mx-auto opacity-50" />
                        <p>No expense records found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.slice(0, 50).map((expense) => {
                    const catInfo = getCategoryInfo(expense.category);
                    return (
                      <TableRow key={expense.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-medium">
                            {isToday(new Date(expense.expense_date)) ? (
                              <Badge variant="secondary" className="text-xs">Today</Badge>
                            ) : isYesterday(new Date(expense.expense_date)) ? (
                              <Badge variant="outline" className="text-xs">Yesterday</Badge>
                            ) : (
                              format(new Date(expense.expense_date), 'MMM dd, yyyy')
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className="font-normal"
                            style={{ borderColor: catInfo.color, color: catInfo.color }}
                          >
                            {catInfo.icon} {expense.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground max-w-[200px] truncate">
                          {expense.description || '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-destructive">
                          {BANGLADESHI_CURRENCY_SYMBOL}{Number(expense.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteExpense(expense.id)}
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
    </div>
  );
};
