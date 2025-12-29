import { useState } from "react";
import { Bell, Package, ShoppingCart, CreditCard, Info, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDistanceToNow } from "date-fns";
import { bn, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

export const NotificationCenter = () => {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const { t, language } = useLanguage();

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "low_stock":
        return <Package className="h-4 w-4 text-warning" />;
      case "new_order":
        return <ShoppingCart className="h-4 w-4 text-accent" />;
      case "payment":
        return <CreditCard className="h-4 w-4 text-primary" />;
      default:
        return <Info className="h-4 w-4 text-info" />;
    }
  };

  const getTypeLabel = (type: Notification["type"]) => {
    switch (type) {
      case "low_stock":
        return language === "bn" ? "কম স্টক" : "Low Stock";
      case "new_order":
        return language === "bn" ? "নতুন অর্ডার" : "New Order";
      case "payment":
        return language === "bn" ? "পেমেন্ট" : "Payment";
      default:
        return language === "bn" ? "তথ্য" : "Info";
    }
  };

  const formatTime = (date: Date) => {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: language === "bn" ? bn : enUS,
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">
              {language === "bn" ? "বিজ্ঞপ্তি" : "Notifications"}
            </h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} {language === "bn" ? "নতুন" : "new"}
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs h-7"
              >
                <Check className="h-3 w-3 mr-1" />
                {language === "bn" ? "সব পড়া হয়েছে" : "Mark all read"}
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>{language === "bn" ? "কোন বিজ্ঞপ্তি নেই" : "No notifications"}</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                    !notification.read && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        notification.type === "low_stock" && "bg-warning/10",
                        notification.type === "new_order" && "bg-accent/10",
                        notification.type === "payment" && "bg-primary/10",
                        notification.type === "info" && "bg-info/10"
                      )}>
                        {getIcon(notification.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            notification.type === "low_stock" && "border-warning/50 text-warning",
                            notification.type === "new_order" && "border-accent/50 text-accent",
                            notification.type === "payment" && "border-primary/50 text-primary"
                          )}
                        >
                          {getTypeLabel(notification.type)}
                        </Badge>
                        {!notification.read && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="font-medium text-sm mt-1">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-border bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-destructive"
              onClick={clearNotifications}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              {language === "bn" ? "সব মুছুন" : "Clear all"}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
