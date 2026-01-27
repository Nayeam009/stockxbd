import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Users, Banknote, TrendingUp, TrendingDown, Truck, Receipt, Wallet,
  ClipboardList, Settings, Package, AlertTriangle, Cylinder, Store, BarChart3
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { useLanguage } from "@/contexts/LanguageContext";
import { Driver, DashboardAnalytics, CylinderStock } from "@/hooks/useDashboardData";
import { Progress } from "@/components/ui/progress";
import { useEffect, useMemo, useCallback } from "react";

interface DashboardOverviewProps {
  analytics: DashboardAnalytics;
  drivers: Driver[];
  cylinderStock?: CylinderStock[];
  userRole: 'owner' | 'manager' | 'super_admin'; // Keep as string to accept flexible roles, or update to specific union
  setActiveModule?: (module: string) => void;
  onRefresh?: () => void;
}

export const DashboardOverview = ({
  analytics,
  drivers,
  cylinderStock = [],
  userRole,
  setActiveModule,
  onRefresh
}: DashboardOverviewProps) => {
  const { t } = useLanguage();

  // Use analytics data directly
  const todaySales = analytics.todayCashRevenue || 0;
  const todayExpenses = 0; // Will be calculated from expenses module
  const todayProfit = analytics.todayRevenue - todayExpenses;
  const activeOrders = {
    total_active: analytics.activeOrders || 0,
    pending_count: analytics.pendingOrders || 0,
    dispatched_count: analytics.dispatchedOrders || 0,
  };

  const isOwnerOrManager = userRole === 'owner' || userRole === 'manager' || userRole === 'super_admin';
  const isOwner = userRole === 'owner' || userRole === 'super_admin';

  const profitMargin = useMemo(() => {
    return todaySales > 0 ? Math.round((todayProfit / todaySales) * 100) : 0;
  }, [todaySales, todayProfit]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'F1') {
      e.preventDefault();
      setActiveModule?.('pos');
    } else if (e.key === 'F2') {
      e.preventDefault();
      setActiveModule?.('business-diary');
    } else if (e.key === 'F3') {
      e.preventDefault();
      setActiveModule?.('inventory');
    }
  }, [setActiveModule]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Safe number formatting
  const formatNumber = useCallback((num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toLocaleString();
  }, []);

  const formatCurrency = useCallback((num: number | undefined | null) => {
    return `${BANGLADESHI_CURRENCY_SYMBOL}${formatNumber(num)}`;
  }, [formatNumber]);

  const safePercentage = useCallback((value: number, total: number) => {
    if (!total || total === 0 || isNaN(total)) return 0;
    const result = Math.round((value / total) * 100);
    return isNaN(result) ? 0 : result;
  }, []);

  // KPI Cards
  const getKpiCards = () => {
    const cards = [];

    if (isOwnerOrManager) {
      cards.push({
        id: 'total-sale',
        title: t('total_sale'),
        value: formatCurrency(todaySales),
        subtitle: "Today's POS transactions",
        change: todaySales > 0 ? "Active" : "No sales yet",
        changeType: todaySales > 0 ? "positive" as const : "warning" as const,
        icon: Banknote,
        clickable: true,
        onClick: () => setActiveModule?.('business-diary')
      });

      cards.push({
        id: 'total-expense',
        title: t('total_expense'),
        value: formatCurrency(todayExpenses),
        subtitle: "Staff, Vehicle, POB costs",
        change: todayExpenses > 0 ? "Recorded" : "None recorded",
        changeType: todayExpenses > 0 ? "negative" as const : "positive" as const,
        icon: Wallet,
        clickable: true,
        onClick: () => setActiveModule?.('business-diary')
      });

      cards.push({
        id: 'todays-profit',
        title: t('todays_profit'),
        value: formatCurrency(todayProfit),
        subtitle: `Margin: ${profitMargin}%`,
        change: todayProfit >= 0 ? `+${profitMargin}%` : `${profitMargin}%`,
        changeType: todayProfit >= 0 ? "positive" as const : "negative" as const,
        icon: todayProfit >= 0 ? TrendingUp : TrendingDown,
        warning: todayProfit < 0
      });
    }

    cards.push({
      id: 'active-orders',
      title: "Active Orders",
      value: formatNumber(activeOrders.total_active),
      subtitle: `${formatNumber(activeOrders.pending_count)} pending, ${formatNumber(activeOrders.dispatched_count)} dispatched`,
      change: (activeOrders.total_active || 0) > 0 ? "On the road" : "All clear",
      changeType: (activeOrders.total_active || 0) > 0 ? "warning" as const : "positive" as const,
      icon: ClipboardList,
      clickable: true,
      onClick: () => setActiveModule?.('orders')
    });

    return cards;
  };

  // Quick Actions
  const salesActions = [
    { title: "POS", icon: Receipt, module: "pos", hotkey: "F1", description: "Point of Sale" },
    { title: "Business Diary", icon: BarChart3, module: "business-diary", hotkey: "F2" },
  ];

  const marketplaceActions = [
    { title: "LPG Marketplace", icon: Store, module: "community" },
    { title: "Customers", icon: Users, module: "customers" },
  ];

  const inventoryActions = [
    { title: "Inventory", icon: Package, module: "inventory", hotkey: "F3" },
    { title: "Product Pricing", icon: Banknote, module: "product-pricing" },
  ];

  const adminActions = [
    { title: "Utility Expense", icon: Wallet, module: "utility-expense" },
    { title: "Analytics", icon: BarChart3, module: "analysis-search" },
    { title: "Settings", icon: Settings, module: "settings", ownerOnly: true },
  ];

  const handleQuickAction = (module: string) => {
    if (setActiveModule) {
      setActiveModule(module);
    }
  };

  const kpiCards = getKpiCards();
  const totalCylinders = (analytics.totalFullCylinders || 0) + (analytics.totalEmptyCylinders || 0);
  const fullPercentage = totalCylinders > 0 ? ((analytics.totalFullCylinders || 0) / totalCylinders) * 100 : 0;

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-2 md:px-0">
      {/* Critical Alert Banner */}
      {analytics.cylinderStockHealth === 'critical' && (
        <div
          className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 sm:p-4 flex items-center gap-3 animate-pulse"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-destructive text-sm sm:text-base">Critical: Low Gas Stock!</p>
            <p className="text-xs sm:text-sm text-destructive/80">Empty cylinders ({analytics.totalEmptyCylinders}) exceed full cylinders ({analytics.totalFullCylinders}). Send truck to refill immediately.</p>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="flex-shrink-0 ml-auto h-10 touch-target"
            onClick={() => setActiveModule?.('inventory')}
          >
            View Stock
          </Button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div
        className={`grid gap-3 sm:gap-4 ${kpiCards.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}
        role="region"
        aria-label="Key performance indicators"
      >
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const isNegative = card.changeType === 'negative';
          const isWarning = card.changeType === 'warning';

          return (
            <Card
              key={card.id}
              className={`group relative overflow-hidden border border-border/40 shadow-md hover:shadow-xl transition-all duration-300 bg-card min-h-[120px] ${card.clickable ? 'cursor-pointer hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-primary' : ''} ${card.warning ? 'border-destructive/30' : ''}`}
              onClick={card.clickable ? card.onClick : undefined}
              tabIndex={card.clickable ? 0 : undefined}
              onKeyDown={card.clickable ? (e) => e.key === 'Enter' && card.onClick?.() : undefined}
              role={card.clickable ? 'button' : undefined}
              aria-label={card.clickable ? `${card.title}: ${card.value}. Click to view details.` : undefined}
            >
              <div className="absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" aria-hidden="true" />

              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
                <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate pr-2 flex items-center gap-1">
                  {card.title}
                </CardTitle>
                <div className={`h-9 w-9 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 ${isNegative ? 'bg-gradient-to-br from-destructive to-destructive/80' :
                  isWarning ? 'bg-gradient-to-br from-warning to-warning/80' :
                    'bg-gradient-to-br from-primary to-primary-light'
                  }`} aria-hidden="true">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                </div>
              </CardHeader>

              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="space-y-1">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground truncate tabular-nums">
                    {card.value}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[10px] sm:text-xs font-semibold border px-1.5 ${isNegative ? 'bg-destructive/15 text-destructive border-destructive/30' :
                      isWarning ? 'bg-warning/15 text-warning border-warning/30' :
                        'bg-success/15 text-success border-success/30'
                      }`}>
                      {isNegative ? <TrendingDown className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" /> : <TrendingUp className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />}
                      {card.change}
                    </Badge>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{card.subtitle}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cylinder Balance Card */}
      {isOwnerOrManager && (
        <Card className={`border shadow-md overflow-hidden ${analytics.cylinderStockHealth === 'critical' ? 'border-destructive/50 bg-destructive/5' :
          analytics.cylinderStockHealth === 'warning' ? 'border-warning/50 bg-warning/5' :
            'border-border/40 bg-card'
          }`}>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shadow-md ${analytics.cylinderStockHealth === 'critical' ? 'bg-gradient-to-br from-destructive to-destructive/80' :
                  analytics.cylinderStockHealth === 'warning' ? 'bg-gradient-to-br from-warning to-warning/80' :
                    'bg-gradient-to-br from-success to-success/80'
                  }`}>
                  <Cylinder className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg font-bold">Cylinder Balance</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {analytics.cylinderStockHealth === 'critical' ? 'Urgent: Refill needed!' :
                      analytics.cylinderStockHealth === 'warning' ? 'Stock running low' :
                        'Stock levels healthy'}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModule?.('lpg-stock')}
              >
                Manage Stock
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-success font-semibold">Full: {analytics.totalFullCylinders}</span>
                  <span className="text-destructive font-semibold">Empty: {analytics.totalEmptyCylinders}</span>
                </div>
                <Progress
                  value={fullPercentage}
                  className="h-3 sm:h-4"
                />
                <p className="text-xs text-muted-foreground text-center">
                  {Math.round(fullPercentage)}% cylinders ready for sale
                </p>
              </div>

              {cylinderStock.length > 0 && (
                <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0 pb-2">
                  <div className="flex sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 min-w-max sm:min-w-0">
                    {cylinderStock.slice(0, 4).map((stock) => (
                      <div
                        key={stock.id}
                        className="p-2 sm:p-3 bg-muted/30 rounded-lg border border-border/40 min-w-[120px] sm:min-w-0"
                      >
                        <p className="font-semibold text-xs sm:text-sm truncate">{stock.brand}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{stock.weight}</p>
                        <div className="flex justify-between mt-1 text-xs tabular-nums">
                          <span className="text-success">F: {stock.fullCylinders}</span>
                          <span className="text-destructive">E: {stock.emptyCylinders}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Quick Actions Grid */}
      <Card className="border border-border/40 shadow-md bg-card overflow-hidden">
        <CardHeader className="p-3 sm:p-4 pb-2 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/40">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold">Quick Actions</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Access key features instantly</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 sm:p-4 space-y-4 sm:space-y-5">
          {/* Sales Group */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-2">
              <Receipt className="h-3 w-3" />
              Sales
            </h4>
            <div className="grid grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="Sales quick actions">
              {salesActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.module}
                    onClick={() => handleQuickAction(action.module)}
                    className="group/action relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border border-border/40 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary touch-target"
                    aria-label={action.description || action.title}
                  >
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-2 group-hover/action:from-primary group-hover/action:to-primary-light transition-all duration-200">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover/action:text-primary-foreground transition-colors" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-foreground text-center">{action.title}</span>
                    {action.hotkey && (
                      <span className="absolute top-1 right-1 text-[9px] sm:text-[10px] text-muted-foreground bg-muted/50 px-1 rounded hidden sm:inline">
                        {action.hotkey}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Marketplace Group */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-2">
              <Store className="h-3 w-3" />
              Marketplace
            </h4>
            <div className="grid grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="Marketplace quick actions">
              {marketplaceActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.module}
                    onClick={() => handleQuickAction(action.module)}
                    className="group/action flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border border-border/40 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary touch-target"
                  >
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-2 group-hover/action:from-primary group-hover/action:to-primary-light transition-all duration-200">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover/action:text-primary-foreground transition-colors" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-foreground text-center">{action.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inventory Group */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-2">
              <Package className="h-3 w-3" />
              Inventory
            </h4>
            <div className="grid grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="Inventory quick actions">
              {inventoryActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.module}
                    onClick={() => handleQuickAction(action.module)}
                    className="group/action relative flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border border-border/40 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary touch-target"
                  >
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-2 group-hover/action:from-primary group-hover/action:to-primary-light transition-all duration-200">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover/action:text-primary-foreground transition-colors" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-foreground text-center">{action.title}</span>
                    {action.hotkey && (
                      <span className="absolute top-1 right-1 text-[9px] sm:text-[10px] text-muted-foreground bg-muted/50 px-1 rounded hidden sm:inline">
                        {action.hotkey}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Admin Group - Owner/Manager only */}
          {isOwnerOrManager && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-2">
                <Settings className="h-3 w-3" />
                Administration
              </h4>
              <div className="grid grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="Admin quick actions">
                {adminActions
                  .filter(action => !action.ownerOnly || isOwner)
                  .map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.module}
                        onClick={() => handleQuickAction(action.module)}
                        className="group/action flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border border-border/40 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary touch-target"
                      >
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-2 group-hover/action:from-primary group-hover/action:to-primary-light transition-all duration-200">
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover/action:text-primary-foreground transition-colors" />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-foreground text-center">{action.title}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
