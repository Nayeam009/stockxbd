import { useState, useMemo } from "react";
import {
  Bell,
  Package,
  ShoppingCart,
  CreditCard,
  Info,
  Check,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Flame,
  Users,
  Truck,
  RefreshCw,
  ChevronRight,
  Filter,
  X,
  Wallet,
  DollarSign,
  ChefHat,
  Wrench,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  useUniversalNotifications,
  UniversalNotification,
  NotificationType,
  NotificationPriority
} from "@/hooks/useUniversalNotifications";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";
import { bn, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface UniversalNotificationCenterProps {
  userRole: 'owner' | 'manager' | 'super_admin';
}

export const UniversalNotificationCenter = ({ userRole }: UniversalNotificationCenterProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const {
    notifications,
    unreadCount,
    criticalCount,
    highPriorityCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    refresh,
    loading,
    navigateToModule
  } = useUniversalNotifications(userRole);
  const { language } = useLanguage();
  const isMobile = useIsMobile();

  // Filter notifications by tab
  const filteredNotifications = useMemo(() => {
    switch (activeTab) {
      case "critical":
        return notifications.filter(n => n.priority === 'critical' || n.priority === 'high');
      case "stock":
        return notifications.filter(n => n.type === 'low_stock' || n.type === 'out_of_stock');
      case "orders":
        return notifications.filter(n => n.type === 'new_order' || n.type === 'order_completed' || n.type === 'exchange_pending');
      case "payments":
        return notifications.filter(n => n.type === 'payment_received' || n.type === 'payment_overdue' || n.type === 'customer_credit_limit');
      case "unread":
        return notifications.filter(n => !n.read);
      default:
        return notifications;
    }
  }, [notifications, activeTab]);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "low_stock":
      case "out_of_stock":
        return <Package className="h-4 w-4" />;
      case "new_order":
      case "order_completed":
      case "order_cancelled":
        return <ShoppingCart className="h-4 w-4" />;
      case "payment_received":
        return <CreditCard className="h-4 w-4" />;
      case "payment_overdue":
      case "customer_credit_limit":
        return <DollarSign className="h-4 w-4" />;
      case "expense_added":
      case "staff_payment":
        return <Wallet className="h-4 w-4" />;
      case "vehicle_cost":
        return <Truck className="h-4 w-4" />;
      case "exchange_pending":
        return <RefreshCw className="h-4 w-4" />;
      case "driver_assigned":
      case "delivery_complete":
        return <Truck className="h-4 w-4" />;
      case "system_alert":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getPriorityStyles = (priority: NotificationPriority, isIcon = false) => {
    switch (priority) {
      case "critical":
        return isIcon
          ? "bg-destructive/15 text-destructive border-destructive/30"
          : "border-l-destructive bg-destructive/5";
      case "high":
        return isIcon
          ? "bg-warning/15 text-warning border-warning/30"
          : "border-l-warning bg-warning/5";
      case "medium":
        return isIcon
          ? "bg-primary/15 text-primary border-primary/30"
          : "border-l-primary bg-primary/5";
      case "low":
        return isIcon
          ? "bg-muted text-muted-foreground border-muted"
          : "border-l-muted-foreground/30 bg-transparent";
    }
  };

  const getTypeLabel = (type: NotificationType): string => {
    const labels: Record<NotificationType, { en: string; bn: string }> = {
      low_stock: { en: "Low Stock", bn: "কম স্টক" },
      out_of_stock: { en: "Out of Stock", bn: "স্টক শেষ" },
      new_order: { en: "New Order", bn: "নতুন অর্ডার" },
      order_completed: { en: "Completed", bn: "সম্পন্ন" },
      order_cancelled: { en: "Cancelled", bn: "বাতিল" },
      payment_received: { en: "Payment", bn: "পেমেন্ট" },
      payment_overdue: { en: "Due Alert", bn: "বাকি সতর্কতা" },
      expense_added: { en: "Expense", bn: "খরচ" },
      staff_payment: { en: "Salary", bn: "বেতন" },
      vehicle_cost: { en: "Vehicle", bn: "গাড়ি" },
      customer_credit_limit: { en: "Credit Limit", bn: "ক্রেডিট সীমা" },
      exchange_pending: { en: "Exchange", bn: "বিনিময়" },
      driver_assigned: { en: "Driver", bn: "ড্রাইভার" },
      delivery_complete: { en: "Delivery", bn: "ডেলিভারি" },
      system_alert: { en: "System", bn: "সিস্টেম" },
      info: { en: "Info", bn: "তথ্য" },
    };
    return language === "bn" ? labels[type].bn : labels[type].en;
  };

  const formatTime = (date: Date) => {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: language === "bn" ? bn : enUS,
    });
  };

  const handleNotificationClick = (notification: UniversalNotification) => {
    markAsRead(notification.id);
    if (notification.action) {
      navigateToModule(notification.action.moduleId);
      setOpen(false);
      toast.success(`Opening ${notification.action.label}`);
    }
  };

  const NotificationItem = ({ notification }: { notification: UniversalNotification }) => (
    <div
      onClick={() => handleNotificationClick(notification)}
      className={cn(
        "p-3 md:p-4 cursor-pointer transition-all hover:bg-muted/50 border-l-3",
        !notification.read && getPriorityStyles(notification.priority),
        notification.read && "opacity-70"
      )}
    >
      <div className="flex gap-2 md:gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className={cn(
            "h-8 w-8 md:h-9 md:w-9 rounded-full flex items-center justify-center border",
            getPriorityStyles(notification.priority, true)
          )}>
            {getIcon(notification.type)}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] md:text-[10px] px-1 md:px-1.5 py-0 h-4",
                getPriorityStyles(notification.priority, true)
              )}
            >
              {getTypeLabel(notification.type)}
            </Badge>
            {!notification.read && (
              <span className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-primary animate-pulse" />
            )}
            {notification.priority === 'critical' && (
              <AlertCircle className="h-3 w-3 text-destructive animate-pulse" />
            )}
          </div>
          <p className="font-medium text-xs md:text-sm mt-1 line-clamp-1">{notification.title}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[9px] md:text-[10px] text-muted-foreground">
              {formatTime(notification.createdAt)}
            </p>
            {notification.action && (
              <span className="text-[9px] md:text-[10px] text-primary flex items-center gap-0.5">
                {notification.action.label}
                <ChevronRight className="h-2.5 w-2.5" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const NotificationList = () => (
    <>
      {filteredNotifications.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <Bell className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-20" />
          <p className="text-sm md:text-base">{language === "bn" ? "কোন বিজ্ঞপ্তি নেই" : "No notifications"}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {language === "bn" ? "সব ঠিক আছে!" : "All clear!"}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filteredNotifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </>
  );

  const HeaderContent = () => (
    <div className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-muted/30">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 md:h-5 md:w-5 text-primary" />
        <h3 className="font-semibold text-sm md:text-base">
          {language === "bn" ? "বিজ্ঞপ্তি" : "Notifications"}
        </h3>
        {unreadCount > 0 && (
          <Badge variant="secondary" className="text-[10px] md:text-xs h-5">
            {unreadCount} {language === "bn" ? "নতুন" : "new"}
          </Badge>
        )}
      </div>
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refresh()}
          disabled={loading}
          className="h-7 w-7 md:h-8 md:w-8"
        >
          <RefreshCw className={cn("h-3.5 w-3.5 md:h-4 md:w-4", loading && "animate-spin")} />
        </Button>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="text-[10px] md:text-xs h-7 md:h-8 px-2"
          >
            <Check className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">{language === "bn" ? "সব পড়া হয়েছে" : "Mark all"}</span>
          </Button>
        )}
      </div>
    </div>
  );

  const TabsContent_ = () => (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="w-full h-9 md:h-10 p-1 grid grid-cols-5 bg-muted/50">
        <TabsTrigger value="all" className="text-[10px] md:text-xs px-1 md:px-2">
          {language === "bn" ? "সব" : "All"}
        </TabsTrigger>
        <TabsTrigger value="critical" className="text-[10px] md:text-xs px-1 md:px-2 relative">
          {language === "bn" ? "জরুরি" : "Urgent"}
          {highPriorityCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-[9px] rounded-full flex items-center justify-center">
              {highPriorityCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="stock" className="text-[10px] md:text-xs px-1 md:px-2">
          {language === "bn" ? "স্টক" : "Stock"}
        </TabsTrigger>
        <TabsTrigger value="orders" className="text-[10px] md:text-xs px-1 md:px-2">
          {language === "bn" ? "অর্ডার" : "Orders"}
        </TabsTrigger>
        <TabsTrigger value="payments" className="text-[10px] md:text-xs px-1 md:px-2">
          {language === "bn" ? "পেমেন্ট" : "Dues"}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );

  const FooterContent = () => (
    notifications.length > 0 && (
      <div className="p-2 md:p-3 border-t border-border bg-muted/30 flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-[10px] md:text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            navigateToModule('search');
            setOpen(false);
          }}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          {language === "bn" ? "সব দেখুন" : "View All"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-[10px] md:text-xs text-muted-foreground hover:text-destructive"
          onClick={clearNotifications}
        >
          <Trash2 className="h-3 w-3 mr-1" />
          {language === "bn" ? "মুছুন" : "Clear"}
        </Button>
      </div>
    )
  );

  // Mobile: Use Sheet (full-screen drawer)
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-8 w-8 md:h-9 md:w-9">
            <Bell className="h-4 w-4 md:h-5 md:w-5" />
            {unreadCount > 0 && (
              <Badge
                className={cn(
                  "absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 p-0 flex items-center justify-center text-[10px] md:text-xs",
                  criticalCount > 0
                    ? "bg-destructive text-destructive-foreground animate-pulse"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>Your notifications</SheetDescription>
          </SheetHeader>

          <HeaderContent />

          <div className="px-2 py-2 border-b">
            <TabsContent_ />
          </div>

          <ScrollArea className="flex-1">
            <NotificationList />
          </ScrollArea>

          <FooterContent />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use Popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 md:h-9 md:w-9">
          <Bell className="h-4 w-4 md:h-5 md:w-5" />
          {unreadCount > 0 && (
            <Badge
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs",
                criticalCount > 0
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "bg-primary text-primary-foreground"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] md:w-[420px] p-0" align="end">
        <HeaderContent />

        <div className="px-2 py-2 border-b">
          <TabsContent_ />
        </div>

        <ScrollArea className="h-[350px] md:h-[400px]">
          <NotificationList />
        </ScrollArea>

        <FooterContent />
      </PopoverContent>
    </Popover>
  );
};
