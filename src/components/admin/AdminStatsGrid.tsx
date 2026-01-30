import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Crown, UserCheck, ShoppingBag, Store, Ban, Shield } from "lucide-react";

interface AdminStatsGridProps {
  stats: {
    total: number;
    owners: number;
    managers: number;
    customers: number;
    blocked: number;
    shops: number;
    admins: number;
  };
  loading?: boolean;
}

export const AdminStatsGrid = ({ stats, loading }: AdminStatsGridProps) => {
  const statCards = [
    {
      label: 'Total Users',
      value: stats.total,
      icon: Users,
      gradient: 'from-muted/50 to-muted',
      iconColor: 'text-muted-foreground',
    },
    {
      label: 'Owners',
      value: stats.owners,
      icon: Crown,
      gradient: 'from-primary/15 to-primary/5',
      iconColor: 'text-primary',
    },
    {
      label: 'Managers',
      value: stats.managers,
      icon: UserCheck,
      gradient: 'from-secondary/20 to-secondary/10',
      iconColor: 'text-secondary-foreground',
    },
    {
      label: 'Customers',
      value: stats.customers,
      icon: ShoppingBag,
      gradient: 'from-accent/20 to-accent/10',
      iconColor: 'text-accent-foreground',
    },
    {
      label: 'Active Shops',
      value: stats.shops,
      icon: Store,
      gradient: 'from-primary/10 to-secondary/10',
      iconColor: 'text-primary',
    },
    {
      label: 'Blocked',
      value: stats.blocked,
      icon: Ban,
      gradient: 'from-destructive/10 to-destructive/5',
      iconColor: 'text-destructive',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-muted/30">
            <CardContent className="p-4 text-center">
              <Skeleton className="h-5 w-5 mx-auto mb-2 rounded" />
              <Skeleton className="h-7 w-10 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className={`bg-gradient-to-br ${stat.gradient} border-0 shadow-sm`}>
            <CardContent className="p-4 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-1 ${stat.iconColor}`} />
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
