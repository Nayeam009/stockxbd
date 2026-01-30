import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, ShoppingBag } from "lucide-react";
import type { TodayStats } from "@/hooks/useInventoryData";
import { cn } from "@/lib/utils";

interface InventoryQuickStatsProps {
  stats: TodayStats | undefined;
  className?: string;
}

export const InventoryQuickStats = ({ stats, className }: InventoryQuickStatsProps) => {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-2", className)}>
      <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/50">
        <CardContent className="p-3 flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
            <Package className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {stats?.totalFull || 0}
            </p>
            <p className="text-[10px] text-muted-foreground">Full Cylinders</p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-gray-50 dark:bg-gray-900/30 border-gray-200/50 dark:border-gray-700/50">
        <CardContent className="p-3 flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gray-100 dark:bg-gray-800/50 flex items-center justify-center">
            <Package className="h-4.5 w-4.5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {stats?.totalEmpty || 0}
            </p>
            <p className="text-[10px] text-muted-foreground">Empty</p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-primary/10 border-primary/20">
        <CardContent className="p-3 flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <ShoppingBag className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-primary tabular-nums">
              {stats?.todayPurchases || 0}
            </p>
            <p className="text-[10px] text-muted-foreground">Purchases Today</p>
          </div>
        </CardContent>
      </Card>
      
      {(stats?.lowStockCount || 0) > 0 && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/50">
          <CardContent className="p-3 flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                {stats?.lowStockCount}
              </p>
              <p className="text-[10px] text-muted-foreground">Low Stock</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
