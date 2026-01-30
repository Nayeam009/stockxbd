import { Badge } from "@/components/ui/badge";
import { ShoppingBag, TrendingUp, Globe } from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import type { TodayStats } from "@/hooks/usePOSData";

interface POSQuickStatsProps {
  stats?: TodayStats;
}

export const POSQuickStats = ({ stats }: POSQuickStatsProps) => {
  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Today's Sales Count */}
      <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-2.5 text-center border border-emerald-200/50 dark:border-emerald-800/50">
        <div className="flex items-center justify-center gap-1.5 mb-0.5">
          <ShoppingBag className="h-3.5 w-3.5 text-emerald-600" />
        </div>
        <p className="text-lg font-bold text-emerald-600 tabular-nums">
          {stats?.totalSales || 0}
        </p>
        <p className="text-[10px] text-muted-foreground">Sales Today</p>
      </div>

      {/* Today's Revenue */}
      <div className="bg-primary/10 rounded-lg p-2.5 text-center border border-primary/20">
        <div className="flex items-center justify-center gap-1.5 mb-0.5">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
        </div>
        <p className="text-lg font-bold text-primary tabular-nums">
          {BANGLADESHI_CURRENCY_SYMBOL}{(stats?.totalRevenue || 0).toLocaleString()}
        </p>
        <p className="text-[10px] text-muted-foreground">Revenue</p>
      </div>

      {/* Pending Online Orders */}
      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2.5 text-center relative border border-amber-200/50 dark:border-amber-800/50">
        {(stats?.pendingOrders || 0) > 0 && (
          <Badge className="absolute -top-1.5 -right-1.5 h-5 min-w-[20px] p-0 flex items-center justify-center bg-amber-500 text-[10px]">
            {stats?.pendingOrders}
          </Badge>
        )}
        <div className="flex items-center justify-center gap-1.5 mb-0.5">
          <Globe className="h-3.5 w-3.5 text-amber-600" />
        </div>
        <p className="text-lg font-bold text-amber-600">
          {stats?.pendingOrders || 0}
        </p>
        <p className="text-[10px] text-muted-foreground">Online Orders</p>
      </div>
    </div>
  );
};
