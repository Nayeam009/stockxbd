import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { 
  Users, Banknote, TrendingUp, TrendingDown, Truck, Receipt, Wallet, 
  ClipboardList, ChefHat, Wrench, RefreshCw, Tag, BarChart3, Settings, 
  Package, AlertTriangle, Cylinder, Eye, EyeOff, Fuel, MessageSquare
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { useLanguage } from "@/contexts/LanguageContext";
import { Driver, DashboardAnalytics, CylinderStock } from "@/hooks/useDashboardData";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";

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
  const [showRevenueDetails, setShowRevenueDetails] = useState(false);
  
  const isOwnerOrManager = userRole === 'owner' || userRole === 'manager';
  const isOwner = userRole === 'owner';

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setActiveModule?.('pos');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setActiveModule?.('daily-sales');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveModule?.('lpg-stock');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveModule]);

  // Safe number formatting
  const formatNumber = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toLocaleString();
  };

  const formatCurrency = (num: number | undefined | null) => {
    return `${BANGLADESHI_CURRENCY_SYMBOL}${formatNumber(num)}`;
  };

  const safePercentage = (value: number, total: number) => {
    if (!total || total === 0 || isNaN(total)) return 0;
    const result = Math.round((value / total) * 100);
    return isNaN(result) ? 0 : result;
  };

  // KPI Cards - Only show financial data to owner/manager
  const getKpiCards = () => {
    const cards = [];
    
    if (isOwnerOrManager) {
      // Today's Revenue Card with cash/due breakdown
      cards.push({
        id: 'today-revenue',
        title: "Today's Revenue",
        value: formatCurrency(analytics.todayRevenue),
        subtitle: showRevenueDetails 
          ? `Cash: ${formatCurrency(analytics.todayCashRevenue)} | Due: ${formatCurrency(analytics.todayDueRevenue)}`
          : "Cash received today",
        change: "+12%",
        changeType: "positive" as const,
        icon: Banknote,
        showToggle: true,
        onClick: () => setShowRevenueDetails(!showRevenueDetails)
      });

      // Monthly Revenue
      cards.push({
        id: 'monthly-revenue',
        title: "Monthly Revenue",
        value: formatCurrency(analytics.monthlyRevenue),
        subtitle: "1st to today",
        change: `${(analytics.monthlyGrowthPercent || 0) >= 0 ? '+' : ''}${analytics.monthlyGrowthPercent || 0}%`,
        changeType: (analytics.monthlyGrowthPercent || 0) >= 0 ? "positive" as const : "negative" as const,
        icon: TrendingUp,
        warning: (analytics.monthlyGrowthPercent || 0) < 0
      });
    }

    // Active Orders - Clickable
    cards.push({
      id: 'active-orders',
      title: "Active Orders",
      value: formatNumber(analytics.activeOrders),
      subtitle: `${formatNumber(analytics.pendingOrders)} pending, ${formatNumber(analytics.dispatchedOrders)} dispatched`,
      change: (analytics.activeOrders || 0) > 0 ? "On the road" : "All clear",
      changeType: (analytics.activeOrders || 0) > 0 ? "warning" as const : "positive" as const,
      icon: ClipboardList,
      clickable: true,
      onClick: () => setActiveModule?.('deliveries')
    });

    // Total Customers with active/lost
    const customerPercentage = safePercentage(analytics.activeCustomers || 0, analytics.totalCustomers || 0);
    cards.push({
      id: 'customers',
      title: "Total Customers",
      value: formatNumber(analytics.totalCustomers),
      subtitle: `${formatNumber(analytics.activeCustomers)} active, ${formatNumber(analytics.lostCustomers)} inactive`,
      change: `${customerPercentage}% active`,
      changeType: (analytics.activeCustomers || 0) > (analytics.lostCustomers || 0) ? "positive" as const : "warning" as const,
      icon: Users,
      clickable: true,
      onClick: () => setActiveModule?.('customers')
    });

    return cards;
  };

  // Quick Actions - Organized by category
  const salesActions = [
    { title: "POS", icon: Receipt, module: "pos", hotkey: "F1", description: "Point of Sale" },
    { title: "Daily Sales", icon: BarChart3, module: "daily-sales", hotkey: "F2" },
    { title: "Orders", icon: ClipboardList, module: "orders" },
  ];

  const inventoryActions = [
    { title: "LPG Stock", icon: Package, module: "lpg-stock", hotkey: "F3" },
    { title: "Gas Stove", icon: ChefHat, module: "stove-stock" },
    { title: "Regulators", icon: Wrench, module: "regulators" },
  ];

  const operationActions = [
    { title: "Exchange", icon: RefreshCw, module: "exchange" },
    { title: "Deliveries", icon: Truck, module: "deliveries" },
    { title: "Vehicle Cost", icon: Fuel, module: "vehicle-cost" },
  ];

  const adminActions = [
    { title: "Staff Salary", icon: Banknote, module: "staff-salary" },
    { title: "Product Pricing", icon: Tag, module: "product-pricing", ownerOnly: true },
    { title: "Analytics", icon: BarChart3, module: "analytics" },
    { title: "Customers", icon: Users, module: "customers" },
    { title: "Daily Expenses", icon: Wallet, module: "daily-expenses" },
    { title: "Community", icon: MessageSquare, module: "community" },
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
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 sm:p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold text-destructive text-sm sm:text-base">Critical: Low Gas Stock!</p>
            <p className="text-xs sm:text-sm text-destructive/80">Empty cylinders ({analytics.totalEmptyCylinders}) exceed full cylinders ({analytics.totalFullCylinders}). Send truck to refill immediately.</p>
          </div>
          <Button 
            size="sm" 
            variant="destructive" 
            className="flex-shrink-0 ml-auto"
            onClick={() => setActiveModule?.('lpg-stock')}
          >
            View Stock
          </Button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className={`grid gap-3 sm:gap-4 ${kpiCards.length === 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-3'}`}>
        {kpiCards.map((card) => {
          const Icon = card.icon;
          const isNegative = card.changeType === 'negative';
          const isWarning = card.changeType === 'warning';
          
          return (
            <Card 
              key={card.id} 
              className={`group relative overflow-hidden border border-border/40 shadow-md hover:shadow-xl transition-all duration-300 bg-card ${card.clickable ? 'cursor-pointer hover:-translate-y-1' : ''} ${card.warning ? 'border-destructive/30' : ''}`}
              onClick={card.clickable ? card.onClick : undefined}
            >
              <div className="absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />
              
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
                <CardTitle className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate pr-2 flex items-center gap-1">
                  {card.title}
                  {card.showToggle && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); card.onClick?.(); }}
                      className="ml-1 hover:text-primary transition-colors"
                    >
                      {showRevenueDetails ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  )}
                </CardTitle>
                <div className={`h-9 w-9 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 ${
                  isNegative ? 'bg-gradient-to-br from-destructive to-destructive/80' :
                  isWarning ? 'bg-gradient-to-br from-warning to-warning/80' :
                  'bg-gradient-to-br from-primary to-primary-light'
                }`}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                </div>
              </CardHeader>
              
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="space-y-1">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground truncate">
                    {card.value}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={`text-[10px] sm:text-xs font-semibold border px-1.5 ${
                      isNegative ? 'bg-destructive/15 text-destructive border-destructive/30' :
                      isWarning ? 'bg-warning/15 text-warning border-warning/30' :
                      'bg-success/15 text-success border-success/30'
                    }`}>
                      {isNegative ? <TrendingDown className="h-2.5 w-2.5 mr-0.5" /> : <TrendingUp className="h-2.5 w-2.5 mr-0.5" />}
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

              {/* Brand-wise breakdown */}
              {cylinderStock.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {cylinderStock.slice(0, 4).map((stock) => (
                    <div 
                      key={stock.id} 
                      className="p-2 sm:p-3 bg-muted/30 rounded-lg border border-border/40"
                    >
                      <p className="font-semibold text-xs sm:text-sm truncate">{stock.brand}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{stock.weight}</p>
                      <div className="flex justify-between mt-1 text-xs">
                        <span className="text-success">F: {stock.fullCylinders}</span>
                        <span className="text-destructive">E: {stock.emptyCylinders}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Driver Status - Real-Time Logistics */}
      {isOwnerOrManager && (
        <Card className="border border-border/40 shadow-md bg-card overflow-hidden">
          <CardHeader className="p-3 sm:p-4 pb-2 bg-gradient-to-r from-accent/5 to-transparent border-b border-border/40">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-md flex-shrink-0">
                  <Truck className="h-5 w-5 sm:h-6 sm:w-6 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base sm:text-lg font-bold">Driver Status</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Real-time tracking • {drivers.length} driver{drivers.length !== 1 ? 's' : ''}</CardDescription>
                </div>
              </div>
              {onRefresh && (
                <Button variant="ghost" size="icon" onClick={onRefresh} className="flex-shrink-0">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="p-3 sm:p-4">
            {drivers.length > 0 ? (
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <table className="w-full text-xs sm:text-sm min-w-[400px]">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Driver</th>
                      <th className="text-center py-2 px-2 font-semibold text-muted-foreground">Status</th>
                      <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Stock</th>
                      <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Sales</th>
                      <th className="text-right py-2 px-2 font-semibold text-muted-foreground">Trips</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((driver) => (
                      <tr key={driver.id} className="border-b border-border/20 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 sm:py-3 px-2">
                          <div className="min-w-0">
                            <p className="font-semibold truncate max-w-[120px]">{driver.name || 'Unknown'}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{driver.phone || '-'}</p>
                          </div>
                        </td>
                        <td className="py-2.5 sm:py-3 px-2 text-center">
                          <Badge className={`text-[10px] sm:text-xs ${
                            driver.status === 'active' ? 'bg-success/15 text-success border-success/30' :
                            driver.status === 'break' ? 'bg-warning/15 text-warning border-warning/30' :
                            'bg-muted text-muted-foreground border-border'
                          }`}>
                            {driver.status || 'offline'}
                          </Badge>
                        </td>
                        <td className="py-2.5 sm:py-3 px-2 text-right">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={`font-bold ${(driver.stockInHand || 0) > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                                  {formatNumber(driver.stockInHand)} cyl
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Cylinders currently with driver</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                        <td className="py-2.5 sm:py-3 px-2 text-right font-bold">
                          {formatCurrency(driver.todaySales)}
                        </td>
                        <td className="py-2.5 sm:py-3 px-2 text-right font-bold">{formatNumber(driver.todayDeliveries)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No drivers registered yet</p>
                <p className="text-xs">Add team members with driver role</p>
              </div>
            )}
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
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {salesActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button 
                    key={action.module}
                    onClick={() => handleQuickAction(action.module)}
                    className="group relative flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-xl border border-border/40 bg-card hover:bg-primary/10 hover:border-primary/40 hover:shadow-lg transition-all duration-200 min-h-[72px] sm:min-h-[88px] active:scale-95 touch-target"
                  >
                    {action.hotkey && (
                      <span className="absolute top-1 right-1 text-[8px] sm:text-[10px] font-mono text-muted-foreground bg-muted/50 px-1 rounded hidden sm:block">
                        {action.hotkey}
                      </span>
                    )}
                    <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary group-hover:to-primary-light flex items-center justify-center mb-1.5 transition-all duration-200 group-hover:scale-110 group-hover:shadow-md">
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

          {/* Operations Group */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-2">
              <Truck className="h-3 w-3" />
              Operations
            </h4>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {operationActions.map((action) => {
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
