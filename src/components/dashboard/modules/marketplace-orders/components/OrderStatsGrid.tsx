/**
 * Order Stats Grid Component
 * Displays analytics cards for marketplace orders
 */

import { Card } from "@/components/ui/card";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { Clock, Truck, CheckCircle, TrendingUp } from "lucide-react";
import type { OrderAnalytics } from "../types";

interface OrderStatsGridProps {
  analytics: OrderAnalytics;
}

export function OrderStatsGrid({ analytics }: OrderStatsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-warning/15 flex items-center justify-center">
            <Clock className="h-5 w-5 text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold">{analytics.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
            <Truck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{analytics.dispatched}</p>
            <p className="text-xs text-muted-foreground">Dispatched</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-success/15 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold">{analytics.delivered}</p>
            <p className="text-xs text-muted-foreground">Delivered</p>
          </div>
        </div>
      </Card>
      
      <Card className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-success/15 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold">{BANGLADESHI_CURRENCY_SYMBOL}{analytics.todayRevenue}</p>
            <p className="text-xs text-muted-foreground">Today's Revenue</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
