import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

interface TopItem {
  name: string;
  amount: number;
  icon?: string;
  color?: string;
}

interface AnalysisTopItemsProps {
  topProducts: TopItem[];
  topExpenses: TopItem[];
  onNavigate?: (moduleId: string) => void;
}

export const AnalysisTopItems = ({ topProducts, topExpenses, onNavigate }: AnalysisTopItemsProps) => {
  const handleProductClick = () => {
    const module = 'inventory';
    if (onNavigate) onNavigate(module);
    else window.dispatchEvent(new CustomEvent('navigate-module', { detail: module }));
  };

  const handleExpenseClick = (name: string) => {
    const isStaff = name.toLowerCase().includes('staff') || name.toLowerCase().includes('salary') || name.toLowerCase().includes('bonus');
    const module = isStaff ? 'utility-expense' : 'business-diary';
    if (onNavigate) onNavigate(module);
    else window.dispatchEvent(new CustomEvent('navigate-module', { detail: module }));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Top Products */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            Top Products
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-2.5">
            {topProducts.slice(0, 5).map((product, index) => (
              <div
                key={product.name}
                className="flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/50 rounded-md px-1 -mx-1 py-0.5 transition-colors group"
                onClick={handleProductClick}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                    #{index + 1}
                  </span>
                  <span className="text-xs truncate">{product.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge
                    variant="secondary"
                    className="text-[10px] sm:text-xs bg-emerald-500/10 text-emerald-600 border-emerald-200 hover:bg-emerald-500/20"
                  >
                    {BANGLADESHI_CURRENCY_SYMBOL}{product.amount.toLocaleString()}
                  </Badge>
                  <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No sales data available
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top Expense Categories */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            </div>
            Top Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-2.5">
            {topExpenses.slice(0, 5).map((cat) => (
              <div
                key={cat.name}
                className="flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/50 rounded-md px-1 -mx-1 py-0.5 transition-colors group"
                onClick={() => handleExpenseClick(cat.name)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm shrink-0">{cat.icon || '💸'}</span>
                  <span className="text-xs truncate">{cat.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge
                    variant="outline"
                    className="text-[10px] sm:text-xs border-rose-200 text-rose-600 bg-rose-500/5"
                  >
                    {BANGLADESHI_CURRENCY_SYMBOL}{cat.amount.toLocaleString()}
                  </Badge>
                  <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
            {topExpenses.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No expense data available
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalysisTopItems;
