import { useState, useEffect, useMemo, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { 
  Search, 
  Home,
  Receipt,
  Wallet,
  Wrench,
  RefreshCw,
  Tag,
  Settings,
  Plus,
  ArrowRight,
  Banknote,
  Truck,
  Users,
  BarChart3,
  ChefHat,
  Flame,
  UserPlus,
  PackagePlus,
  DollarSign,
  CreditCard,
  FileText,
  Package,
  Calendar,
  TrendingUp,
  Keyboard
} from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface NavigationItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: 'page' | 'action' | 'report';
  roles: string[];
  keywords: string[];
}

interface GlobalCommandPaletteProps {
  userRole: 'owner' | 'manager' | 'driver';
  setActiveModule: (module: string) => void;
}

export const GlobalCommandPalette = ({ userRole, setActiveModule }: GlobalCommandPaletteProps) => {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  // Navigation items based on role
  const navigationItems: NavigationItem[] = useMemo((): NavigationItem[] => [
    { id: 'overview', title: 'Dashboard Overview', description: 'Main dashboard with KPIs and quick actions', icon: Home, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['home', 'dashboard', 'overview', 'main', 'kpi', 'summary'] },
    { id: 'pos', title: 'Point of Sale (POS)', description: 'Create new sales transactions', icon: Receipt, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['pos', 'sale', 'sell', 'transaction', 'billing', 'invoice', 'cash'] },
    { id: 'daily-sales', title: 'Daily Sales', description: 'View and manage daily sales records', icon: BarChart3, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['sales', 'daily', 'revenue', 'transactions', 'records'] },
    { id: 'daily-expenses', title: 'Daily Expenses', description: 'Track and manage daily expenses', icon: Wallet, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['expenses', 'cost', 'spending', 'money out', 'bills'] },
    { id: 'analytics', title: 'Business Analytics', description: 'View business performance and analytics', icon: TrendingUp, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['analytics', 'reports', 'charts', 'performance', 'profit', 'loss'] },
    { id: 'lpg-stock', title: 'LPG Stock (22mm)', description: 'Manage LPG cylinder inventory - 22mm valves', icon: Flame, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['lpg', 'gas', 'cylinder', 'stock', 'inventory', '22mm', 'bashundhara', 'omera'] },
    { id: 'lpg-stock-20mm', title: 'LPG Stock (20mm)', description: 'Manage LPG cylinder inventory - 20mm valves', icon: Flame, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['lpg', 'gas', 'cylinder', 'stock', 'inventory', '20mm', 'totalgaz'] },
    { id: 'stove-stock', title: 'Gas Stove Inventory', description: 'Manage gas stove stock', icon: ChefHat, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['stove', 'cooker', 'burner', 'kitchen', 'appliance'] },
    { id: 'regulators', title: 'Regulators Inventory', description: 'Manage regulator stock', icon: Wrench, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['regulator', 'valve', 'accessory', '20mm', '22mm'] },
    { id: 'product-pricing', title: 'Product Pricing', description: 'Set and manage product prices', icon: Tag, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['price', 'pricing', 'cost', 'rate', 'company', 'retail', 'wholesale'] },
    { id: 'orders', title: 'Online Delivery Orders', description: 'Manage delivery orders and tracking', icon: Truck, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['order', 'delivery', 'online', 'tracking', 'dispatch'] },
    { id: 'exchange', title: 'Cylinder Exchange', description: 'Dealer-to-dealer cylinder exchange', icon: RefreshCw, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['exchange', 'swap', 'dealer', 'cylinder', 'transfer'] },
    { id: 'customers', title: 'Customer Management', description: 'Manage customers, dues, and payments', icon: Users, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['customer', 'client', 'due', 'baki', 'payment', 'credit', 'debt'] },
    { id: 'staff-salary', title: 'Staff Salary', description: 'Manage staff and salary payments', icon: Banknote, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['staff', 'employee', 'salary', 'payment', 'payroll', 'wage'] },
    { id: 'vehicle-cost', title: 'Vehicle Costs', description: 'Track vehicle expenses and maintenance', icon: Truck, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['vehicle', 'fuel', 'maintenance', 'cost', 'diesel', 'petrol'] },
    { id: 'community', title: 'Community Forum', description: 'Connect with other LPG dealers', icon: Users, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['community', 'forum', 'discussion', 'post', 'share'] },
    { id: 'search', title: 'Search & Reports', description: 'Advanced search and report generation', icon: Search, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['search', 'find', 'report', 'query'] },
    { id: 'settings', title: 'Settings', description: 'System settings and configuration', icon: Settings, category: 'page' as const, roles: ['owner', 'manager'], keywords: ['settings', 'config', 'preference', 'system', 'backup', 'team'] },
    { id: 'profile', title: 'My Profile', description: 'View and edit your profile', icon: Users, category: 'page' as const, roles: ['owner', 'manager', 'driver'], keywords: ['profile', 'account', 'user', 'me', 'my'] },
    { id: 'action-new-sale', title: 'Create New Sale', description: 'Start a new POS transaction', icon: Plus, category: 'action' as const, roles: ['owner', 'manager', 'driver'], keywords: ['new', 'sale', 'create', 'add', 'transaction'] },
    { id: 'action-add-customer', title: 'Add New Customer', description: 'Register a new customer', icon: UserPlus, category: 'action' as const, roles: ['owner', 'manager'], keywords: ['add', 'new', 'customer', 'register', 'create'] },
    { id: 'action-add-expense', title: 'Add Expense', description: 'Record a new expense', icon: Wallet, category: 'action' as const, roles: ['owner', 'manager'], keywords: ['add', 'expense', 'cost', 'spending', 'record'] },
    { id: 'action-add-stock', title: 'Add New Stock', description: 'Add new LPG brand/stock', icon: PackagePlus, category: 'action' as const, roles: ['owner', 'manager'], keywords: ['add', 'stock', 'inventory', 'brand', 'new'] },
    { id: 'action-pay-salary', title: 'Pay Staff Salary', description: 'Make salary payment to staff', icon: CreditCard, category: 'action' as const, roles: ['owner', 'manager'], keywords: ['pay', 'salary', 'staff', 'payment', 'wage'] },
    { id: 'action-collect-due', title: 'Collect Customer Due', description: 'Settle customer dues', icon: DollarSign, category: 'action' as const, roles: ['owner', 'manager'], keywords: ['collect', 'due', 'payment', 'settle', 'customer', 'baki'] },
    { id: 'report-daily-sales', title: 'Daily Sales Report', description: 'Generate today\'s sales report', icon: FileText, category: 'report' as const, roles: ['owner', 'manager'], keywords: ['report', 'daily', 'sales', 'today'] },
    { id: 'report-stock-status', title: 'Stock Status Report', description: 'Current inventory levels', icon: Package, category: 'report' as const, roles: ['owner', 'manager'], keywords: ['report', 'stock', 'inventory', 'status', 'levels'] },
    { id: 'report-customer-dues', title: 'Customer Dues Report', description: 'Outstanding customer payments', icon: Users, category: 'report' as const, roles: ['owner', 'manager'], keywords: ['report', 'customer', 'due', 'outstanding', 'baki'] },
    { id: 'report-financial', title: 'Financial Summary', description: 'Income vs expenses summary', icon: DollarSign, category: 'report' as const, roles: ['owner'], keywords: ['report', 'financial', 'summary', 'profit', 'loss'] },
    { id: 'report-monthly', title: 'Monthly Report', description: 'Monthly business breakdown', icon: Calendar, category: 'report' as const, roles: ['owner', 'manager'], keywords: ['report', 'monthly', 'month', 'breakdown'] },
  ].filter(item => item.roles.includes(userRole)), [userRole]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for open command palette event from header
  useEffect(() => {
    const handleOpenCommand = () => setOpen(true);
    window.addEventListener('open-command-palette', handleOpenCommand);
    return () => window.removeEventListener('open-command-palette', handleOpenCommand);
  }, []);

  // Handle action execution
  const handleAction = useCallback((actionId: string) => {
    setOpen(false);
    
    // Check if it's a report action
    if (actionId.startsWith('report-')) {
      // Navigate to search module which handles reports
      setActiveModule('search');
      setTimeout(() => {
        toast.info('Use the Quick Reports section to generate reports');
      }, 500);
      return;
    }
    
    // Check if it's an action
    switch (actionId) {
      case 'action-new-sale':
        setActiveModule('pos');
        break;
      case 'action-add-customer':
        setActiveModule('customers');
        setTimeout(() => toast.info('Click "Add Customer" to register a new customer'), 500);
        break;
      case 'action-add-expense':
        setActiveModule('daily-expenses');
        setTimeout(() => toast.info('Click "Add Expense" to record a new expense'), 500);
        break;
      case 'action-add-stock':
        setActiveModule('lpg-stock');
        setTimeout(() => toast.info('Click "Add Brand" to add new stock'), 500);
        break;
      case 'action-pay-salary':
        setActiveModule('staff-salary');
        setTimeout(() => toast.info('Click "Pay" on a staff member to make payment'), 500);
        break;
      case 'action-collect-due':
        setActiveModule('customers');
        setTimeout(() => toast.info('Click "Settle Account" on a customer to collect dues'), 500);
        break;
      default:
        // Navigate to the page
        setActiveModule(actionId);
    }
    
    toast.success(`Navigating to ${actionId.replace(/-/g, ' ').replace('action ', '')}`);
  }, [setActiveModule]);

  const categoryGroups = useMemo(() => {
    const pages = navigationItems.filter(i => i.category === 'page');
    const actions = navigationItems.filter(i => i.category === 'action');
    const reports = navigationItems.filter(i => i.category === 'report');
    return { pages, actions, reports };
  }, [navigationItems]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 gap-0 max-w-[95vw] md:max-w-2xl overflow-hidden">
        <Command className="rounded-lg border-0" shouldFilter={true}>
          <CommandInput 
            placeholder="Search pages, actions, reports..." 
            className="h-12 md:h-14 text-base border-0"
          />
          <CommandList className="max-h-[60vh] md:max-h-[400px]">
            <CommandEmpty>
              <div className="py-8 text-center">
                <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No results found</p>
                <p className="text-xs text-muted-foreground mt-1">Try different keywords</p>
              </div>
            </CommandEmpty>
            
            {/* Pages */}
            <CommandGroup heading="Pages">
              {categoryGroups.pages.map(item => (
                <CommandItem 
                  key={item.id}
                  value={`${item.title} ${item.description} ${item.keywords.join(' ')}`}
                  onSelect={() => handleAction(item.id)}
                  className="py-3 px-3 cursor-pointer"
                >
                  <item.icon className="mr-3 h-5 w-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                </CommandItem>
              ))}
            </CommandGroup>
            
            <CommandSeparator />
            
            {/* Quick Actions */}
            <CommandGroup heading="Quick Actions">
              {categoryGroups.actions.map(item => (
                <CommandItem 
                  key={item.id}
                  value={`${item.title} ${item.description} ${item.keywords.join(' ')}`}
                  onSelect={() => handleAction(item.id)}
                  className="py-3 px-3 cursor-pointer"
                >
                  <div className="mr-3 h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 shrink-0 ml-2 text-[10px]">
                    Action
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
            
            <CommandSeparator />
            
            {/* Reports */}
            <CommandGroup heading="Generate Reports">
              {categoryGroups.reports.map(item => (
                <CommandItem 
                  key={item.id}
                  value={`${item.title} ${item.description} ${item.keywords.join(' ')}`}
                  onSelect={() => handleAction(item.id)}
                  className="py-3 px-3 cursor-pointer"
                >
                  <div className="mr-3 h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 shrink-0 ml-2 text-[10px]">
                    Report
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          
          {/* Keyboard hints - desktop only */}
          {!isMobile && (
            <div className="flex items-center justify-between border-t px-4 py-2 bg-muted/30">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Keyboard className="h-3 w-3" /> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">↵</kbd> Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">Esc</kbd> Close
                </span>
              </div>
            </div>
          )}
        </Command>
      </DialogContent>
    </Dialog>
  );
};
