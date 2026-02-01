import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, DollarSign, Wallet } from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

interface KPIData {
  income: number;
  expenses: number;
  profit: number;
  profitMargin?: number;
}

interface ComparisonData {
  incomeChange?: number;
  expenseChange?: number;
  profitChange?: number;
}

interface AnalysisKPIGridProps {
  data: KPIData;
  comparison?: ComparisonData;
  timeRange: string;
  showMargin?: boolean;
}

const formatCurrency = (value: number): string => {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (absValue >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return value.toLocaleString();
};

const GrowthBadge = ({ change }: { change?: number }) => {
  if (change === undefined || change === 0) return null;
  
  const isPositive = change > 0;
  return (
    <Badge 
      variant="outline" 
      className={`text-[9px] sm:text-[10px] gap-0.5 px-1.5 py-0 h-4 sm:h-5 ${
        isPositive 
          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' 
          : 'bg-rose-500/10 text-rose-600 border-rose-200'
      }`}
    >
      {isPositive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
      {Math.abs(change).toFixed(1)}%
    </Badge>
  );
};

export const AnalysisKPIGrid = ({ 
  data, 
  comparison,
  timeRange,
  showMargin = true 
}: AnalysisKPIGridProps) => {
  const isProfit = data.profit >= 0;
  
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {/* Income Card */}
      <Card className="relative overflow-hidden border-0 shadow-lg group hover:shadow-xl transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400" />
        <CardContent className="relative p-3 sm:p-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600" />
                </div>
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Income
                </p>
              </div>
              <GrowthBadge change={comparison?.incomeChange} />
            </div>
            <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-emerald-600 dark:text-emerald-400 truncate tabular-nums">
              {BANGLADESHI_CURRENCY_SYMBOL}{formatCurrency(data.income)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground capitalize">
              {timeRange} revenue
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Card */}
      <Card className="relative overflow-hidden border-0 shadow-lg group hover:shadow-xl transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-rose-400" />
        <CardContent className="relative p-3 sm:p-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                  <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-rose-600" />
                </div>
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Expenses
                </p>
              </div>
              <GrowthBadge change={comparison?.expenseChange} />
            </div>
            <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-rose-600 dark:text-rose-400 truncate tabular-nums">
              {BANGLADESHI_CURRENCY_SYMBOL}{formatCurrency(data.expenses)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground capitalize">
              {timeRange} spending
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Profit/Loss Card */}
      <Card className="relative overflow-hidden border-0 shadow-lg group hover:shadow-xl transition-all duration-300">
        <div className={`absolute inset-0 bg-gradient-to-br ${
          isProfit ? 'from-primary/10 via-primary/5' : 'from-destructive/10 via-destructive/5'
        } to-transparent`} />
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
          isProfit ? 'from-primary to-primary/80' : 'from-destructive to-destructive/80'
        }`} />
        <CardContent className="relative p-3 sm:p-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className={`h-6 w-6 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center ${
                  isProfit ? 'bg-primary/20' : 'bg-destructive/20'
                }`}>
                  {isProfit ? (
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  ) : (
                    <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                  )}
                </div>
                <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {isProfit ? 'Profit' : 'Loss'}
                </p>
              </div>
              <GrowthBadge change={comparison?.profitChange} />
            </div>
            <p className={`text-lg sm:text-2xl lg:text-3xl font-bold truncate tabular-nums ${
              isProfit ? 'text-primary' : 'text-destructive'
            }`}>
              {isProfit ? '+' : ''}{BANGLADESHI_CURRENCY_SYMBOL}{formatCurrency(Math.abs(data.profit))}
            </p>
            {showMargin && data.profitMargin !== undefined && (
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {data.profitMargin.toFixed(1)}% margin
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalysisKPIGrid;
