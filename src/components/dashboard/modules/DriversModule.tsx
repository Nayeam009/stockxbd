import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PremiumModuleHeader } from "@/components/shared/PremiumModuleHeader";
import { EmptyStateCard } from "@/components/shared/EmptyStateCard";
import { Truck, Phone, Package, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  salary: number;
  is_active: boolean;
}

interface DriverStats {
  driverId: string;
  deliveriesToday: number;
  totalRevenue: number;
}

const getInitials = (name: string) =>
  name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "D";

export const DriversModule = () => {
  // Session-only availability toggle (no DB write needed)
  const [availability, setAvailability] = useState<Record<string, 'available' | 'busy'>>({});

  const { data: drivers = [], isLoading: driversLoading } = useQuery<Driver[]>({
    queryKey: ['drivers-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name, phone, role, salary, is_active')
        .eq('role', 'Driver')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    staleTime: 60 * 1000,
  });

  const { data: driverStats = [] } = useQuery<DriverStats[]>({
    queryKey: ['driver-stats-today'],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('pos_transactions')
        .select('driver_id, total')
        .not('driver_id', 'is', null)
        .gte('created_at', `${today}T00:00:00+06:00`)
        .lte('created_at', `${today}T23:59:59.999+06:00`)
        .eq('is_voided', false);
      if (error) throw error;

      // Aggregate by driver_id
      const map = new Map<string, { count: number; revenue: number }>();
      for (const row of data || []) {
        if (!row.driver_id) continue;
        const existing = map.get(row.driver_id) || { count: 0, revenue: 0 };
        map.set(row.driver_id, {
          count: existing.count + 1,
          revenue: existing.revenue + Number(row.total),
        });
      }

      return Array.from(map.entries()).map(([driverId, stats]) => ({
        driverId,
        deliveriesToday: stats.count,
        totalRevenue: stats.revenue,
      }));
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const statsMap = new Map(driverStats.map(s => [s.driverId, s]));
  const totalDeliveriesToday = driverStats.reduce((sum, s) => sum + s.deliveriesToday, 0);
  const totalRevenueToday = driverStats.reduce((sum, s) => sum + s.totalRevenue, 0);

  const toggleAvailability = (id: string) => {
    setAvailability(prev => ({
      ...prev,
      [id]: prev[id] === 'busy' ? 'available' : 'busy',
    }));
  };

  if (driversLoading) {
    return (
      <div className="space-y-4">
        <PremiumModuleHeader
          title="Drivers"
          subtitle="Manage delivery drivers and track assignments"
          icon={<Truck className="h-5 w-5 text-primary-foreground" />}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-muted" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-3 w-16 bg-muted rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 lg:pb-4">
      {/* Header */}
      <PremiumModuleHeader
        title="Drivers"
        subtitle="Manage delivery drivers and track today's assignments"
        icon={<Truck className="h-5 w-5 text-primary-foreground" />}
      />

      {/* Today's Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Active Drivers</p>
            <p className="text-2xl font-bold text-primary">{drivers.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Deliveries Today</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalDeliveriesToday}</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Revenue Collected</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">৳{totalRevenueToday.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Driver Cards */}
      {drivers.length === 0 ? (
        <EmptyStateCard
          icon={<Truck className="h-10 w-10 text-muted-foreground" />}
          title="No Drivers Found"
          subtitle="Add staff with the 'Driver' role in the Utility & Expense module to see them here."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map(driver => {
            const stats = statsMap.get(driver.id);
            const deliveries = stats?.deliveriesToday || 0;
            const revenue = stats?.totalRevenue || 0;
            const isActiveToday = deliveries > 0;
            const currentAvailability = availability[driver.id] || 'available';
            const isBusy = currentAvailability === 'busy';

            return (
              <Card
                key={driver.id}
                className={`transition-all duration-200 hover:shadow-md border ${
                  isBusy
                    ? 'border-rose-200 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/10'
                    : isActiveToday
                    ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10'
                    : 'border-border bg-card'
                }`}
              >
                <div className={`h-1 rounded-t-xl ${isBusy ? 'bg-rose-400' : isActiveToday ? 'bg-emerald-400' : 'bg-muted-foreground/20'}`} />
                <CardContent className="p-4 space-y-3">
                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-border">
                      <AvatarFallback className={`font-semibold text-sm ${
                        isBusy ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' :
                        isActiveToday ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {getInitials(driver.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">{driver.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Truck className="h-3 w-3" />
                        <span>Driver</span>
                        {driver.phone && (
                          <>
                            <span>•</span>
                            <Phone className="h-3 w-3" />
                            <span className="truncate">{driver.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
                      <Package className="h-3.5 w-3.5 text-primary shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Today</p>
                        <p className="text-sm font-bold text-foreground">{deliveries} deliveries</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2.5 py-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Revenue</p>
                        <p className="text-sm font-bold text-foreground">৳{revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Status + Toggle */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] h-5 ${
                        isBusy
                          ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          : isActiveToday
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {isBusy ? (
                        <><Clock className="h-2.5 w-2.5 mr-0.5" />On Delivery</>
                      ) : isActiveToday ? (
                        <><CheckCircle className="h-2.5 w-2.5 mr-0.5" />Active Today</>
                      ) : (
                        <><Clock className="h-2.5 w-2.5 mr-0.5" />Idle</>
                      )}
                    </Badge>
                    <Button
                      size="sm"
                      variant={isBusy ? 'destructive' : 'outline'}
                      className="h-7 text-[11px] px-2.5"
                      onClick={() => toggleAvailability(driver.id)}
                    >
                      {isBusy ? 'Mark Available' : 'Mark Busy'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info note */}
      <p className="text-xs text-center text-muted-foreground pb-2">
        Driver status resets on page refresh. Assign drivers to sales via the POS payment flow.
      </p>
    </div>
  );
};
