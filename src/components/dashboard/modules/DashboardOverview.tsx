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
import { useDashboardKPIs } from "@/hooks/queries/useOptimizedQueries";

interface DashboardOverviewProps {
  analytics: DashboardAnalytics;
  drivers: Driver[];
  cylinderStock?: CylinderStock[];
  userRole: string;
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
  
  // Use optimized RPC-based KPIs instead of client-side calculations
  const { 
    todaySales, 
    todayExpenses, 
    todayProfit, 
    activeOrders,
    isLoading: kpisLoading,
    refetch: refetchKPIs 
  } = useDashboardKPIs();
  
  const isOwnerOrManager = userRole === 'owner' || userRole === 'manager';
  const isOwner = userRole === 'owner';

  const profitMargin = useMemo(() => {
    return todaySales > 0 ? Math.round((todayProfit / todaySales) * 100) : 0;
  }, [todaySales, todayProfit]);

  // Keyboard shortcuts - memoized handler
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

  // Safe number formatting - memoized
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

  // KPI Cards - Redesigned with Total Sale / Expense / Profit
  const getKpiCards = () => {
    const cards = [];
    
    if (isOwnerOrManager) {
      // Total Sale (Today)
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

      // Total Expense (Today)
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

      // Today's Profit
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

    // Active Orders - Clickable (use RPC data)
    cards.push({
      id: 'active-orders',
      title: "Active Orders",
      value: formatNumber(activeOrders.total_active),
      subtitle: `${formatNumber(activeOrders.pending_count)} pending, ${formatNumber(activeOrders.dispatched_count)} dispatched`,
      change: (activeOrders.total_active || 0) > 0 ? "On the road" : "All clear",
      changeType: (activeOrders.total_active || 0) > 0 ? "warning" as const : "positive" as const,
      icon: ClipboardList,
      clickable: true,
      onClick: () => setActiveModule?.('community')
    });

    return cards;
  };

  // Quick Actions - Reorganized by new structure
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
                <div className={`h-9 w-9 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 ${
                  isNegative ? 'bg-gradient-to-br from-destructive to-destructive/80' :
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
                    <Badge className={`text-[10px] sm:text-xs font-semibold border px-1.5 ${
                      isNegative ? 'bg-destructive/15 text-destructive border-destructive/30' :
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

      {/* Cylinder Balance Card - Critical for LPG Business */}
      {isOwnerOrManager && (
        <Card className={`border shadow-md overflow-hidden ${
          analytics.cylinderStockHealth === 'critical' ? 'border-destructive/50 bg-destructive/5' :
          analytics.cylinderStockHealth === 'warning' ? 'border-warning/50 bg-warning/5' :
          'border-border/40 bg-card'
        }`}>
          <CardHeader className="p-3 sm:p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shadow-md ${
                  analytics.cylinderStockHealth === 'critical' ? 'bg-gradient-to-br from-destructive to-destructive/80' :
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
              {/* Progress Bar */}
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

              {/* Brand-wise breakdown - Horizontally scrollable on mobile */}
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


      {/* Quick Actions Grid - Organized by Category */}
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
                    aria-label={action.description || action.title}
                    className="group relative flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-xl border border-border/40 bg-card hover:bg-primary/10 hover:border-primary/40 hover:shadow-lg transition-all duration-200 min-h-[72px] sm:min-h-[88px] active:scale-95 touch-target focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    {action.hotkey && (
                      <span className="absolute top-1 right-1 text-[8px] sm:text-[10px] font-mono text-muted-foreground bg-muted/50 px-1 rounded hidden sm:block" aria-hidden="true">
                        {action.hotkey}
                      </span>
                    )}
                    <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary group-hover:to-primary-light flex items-center justify-center mb-1.5 transition-all duration-200 group-hover:scale-110 group-hover:shadow-md" aria-hidden="true">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">{action.title}</span>
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
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {inventoryActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button 
                    key={action.module}
                    onClick={() => handleQuickAction(action.module)}
                    className="group relative flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-xl border border-border/40 bg-card hover:bg-secondary/10 hover:border-secondary/40 hover:shadow-lg transition-all duration-200 min-h-[72px] sm:min-h-[88px] active:scale-95 touch-target"
                  >
                    {action.hotkey && (
                      <span className="absolute top-1 right-1 text-[8px] sm:text-[10px] font-mono text-muted-foreground bg-muted/50 px-1 rounded hidden sm:block">
                        {action.hotkey}
                      </span>
                    )}
                    <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 group-hover:from-secondary group-hover:to-secondary-light flex items-center justify-center mb-1.5 transition-all duration-200 group-hover:scale-110 group-hover:shadow-md">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-secondary group-hover:text-secondary-foreground transition-colors" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">{action.title}</span>
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
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {marketplaceActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button 
                    key={action.module}
                    onClick={() => handleQuickAction(action.module)}
                    className="group flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-xl border border-border/40 bg-card hover:bg-accent/10 hover:border-accent/40 hover:shadow-lg transition-all duration-200 min-h-[72px] sm:min-h-[88px] active:scale-95 touch-target"
                  >
                    <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 group-hover:from-accent group-hover:to-accent-light flex items-center justify-center mb-1.5 transition-all duration-200 group-hover:scale-110 group-hover:shadow-md">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-accent group-hover:text-accent-foreground transition-colors" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">{action.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Admin Group - Filtered by role */}
          {isOwnerOrManager && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-2">
                <Settings className="h-3 w-3" />
                Administration
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
                {adminActions
                  .filter(action => !action.ownerOnly || isOwner)
                  .map((action) => {
                    const Icon = action.icon;
                    return (
                      <button 
                        key={action.module}
                        onClick={() => handleQuickAction(action.module)}
                        className="group relative flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-xl border border-border/40 bg-card hover:bg-warning/10 hover:border-warning/40 hover:shadow-lg transition-all duration-200 min-h-[72px] sm:min-h-[88px] active:scale-95 touch-target"
                      >
                        <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-warning/10 to-warning/5 group-hover:from-warning group-hover:to-warning/80 flex items-center justify-center mb-1.5 transition-all duration-200 group-hover:scale-110 group-hover:shadow-md">
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-warning group-hover:text-warning-foreground transition-colors" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">{action.title}</span>
                        {action.ownerOnly && (
                          <Badge className="text-[7px] sm:text-[8px] mt-0.5 bg-primary/10 text-primary border-0 px-1 py-0">Owner</Badge>
                        )}
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
