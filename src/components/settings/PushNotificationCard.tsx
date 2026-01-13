import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  BellRing, 
  BellOff, 
  AlertTriangle,
  Check,
  Loader2,
  Smartphone,
  Package,
  ShoppingCart,
  CreditCard
} from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";

interface PushNotificationCardProps {
  notifications: {
    lowStock: boolean;
    newOrders: boolean;
    payments: boolean;
    dailyReports: boolean;
  };
  onNotificationChange: (key: string, value: boolean) => void;
}

export const PushNotificationCard = ({ 
  notifications, 
  onNotificationChange 
}: PushNotificationCardProps) => {
  const { language, t } = useLanguage();
  const { 
    isSupported, 
    permission, 
    isEnabled, 
    loading, 
    requestPermission,
    enableNotifications,
    disableNotifications,
    sendNotification
  } = usePushNotifications();

  const handleEnableNotifications = async () => {
    if (permission === "granted") {
      enableNotifications();
      toast({ title: language === "bn" ? "পুশ বিজ্ঞপ্তি সক্রিয়" : "Push notifications enabled" });
    } else if (permission === "denied") {
      toast({ 
        title: language === "bn" ? "অনুমতি প্রয়োজন" : "Permission required",
        description: language === "bn" 
          ? "ব্রাউজার সেটিংস থেকে বিজ্ঞপ্তি অনুমতি দিন"
          : "Please enable notifications in your browser settings",
        variant: "destructive"
      });
    } else {
      const granted = await requestPermission();
      if (!granted) {
        toast({ 
          title: language === "bn" ? "অনুমতি প্রত্যাখ্যান" : "Permission denied",
          variant: "destructive"
        });
      }
    }
  };

  const handleDisableNotifications = () => {
    disableNotifications();
    toast({ title: language === "bn" ? "পুশ বিজ্ঞপ্তি নিষ্ক্রিয়" : "Push notifications disabled" });
  };

  const handleTestNotification = () => {
    if (isEnabled) {
      sendNotification(
        language === "bn" ? "🔔 টেস্ট বিজ্ঞপ্তি" : "🔔 Test Notification",
        {
          body: language === "bn" 
            ? "পুশ বিজ্ঞপ্তি সঠিকভাবে কাজ করছে!"
            : "Push notifications are working correctly!",
          tag: "test"
        }
      );
    }
  };

  const getStatusBadge = () => {
    if (!isSupported) {
      return (
        <Badge variant="destructive" className="gap-1">
          <BellOff className="h-3 w-3" />
          {language === "bn" ? "সমর্থিত নয়" : "Not Supported"}
        </Badge>
      );
    }
    if (permission === "denied") {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          {language === "bn" ? "ব্লক করা" : "Blocked"}
        </Badge>
      );
    }
    if (isEnabled) {
      return (
        <Badge className="gap-1 bg-green-500 hover:bg-green-500">
          <Check className="h-3 w-3" />
          {language === "bn" ? "সক্রিয়" : "Active"}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <BellOff className="h-3 w-3" />
        {language === "bn" ? "নিষ্ক্রিয়" : "Inactive"}
      </Badge>
    );
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground">
              {language === "bn" ? "পুশ বিজ্ঞপ্তি" : "Push Notifications"}
            </CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          {language === "bn"
            ? "গুরুত্বপূর্ণ আপডেটের জন্য তাৎক্ষণিক বিজ্ঞপ্তি পান"
            : "Get instant alerts for important updates even when the app is closed"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Push Notifications */}
        {isSupported && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">
                  {language === "bn" ? "পুশ বিজ্ঞপ্তি" : "Push Notifications"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {language === "bn"
                    ? "ব্রাউজার বিজ্ঞপ্তি সক্রিয় করুন"
                    : "Enable browser notifications"}
                </p>
              </div>
            </div>
            {isEnabled ? (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleDisableNotifications}
                disabled={loading}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {language === "bn" ? "নিষ্ক্রিয়" : "Disable"}
              </Button>
            ) : (
              <Button 
                size="sm"
                onClick={handleEnableNotifications}
                disabled={loading || permission === "denied"}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {language === "bn" ? "সক্রিয়" : "Enable"}
              </Button>
            )}
          </div>
        )}

        {!isSupported && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-destructive">
              {language === "bn"
                ? "আপনার ব্রাউজার পুশ বিজ্ঞপ্তি সমর্থন করে না। অনুগ্রহ করে একটি আধুনিক ব্রাউজার ব্যবহার করুন।"
                : "Your browser doesn't support push notifications. Please use a modern browser."}
            </p>
          </div>
        )}

        {permission === "denied" && (
          <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg text-sm">
            <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
            <p className="text-warning">
              {language === "bn"
                ? "বিজ্ঞপ্তি ব্লক করা আছে। ব্রাউজার সেটিংস থেকে অনুমতি দিন।"
                : "Notifications are blocked. Please allow notifications in browser settings."}
            </p>
          </div>
        )}

        {isEnabled && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={handleTestNotification}
          >
            <Bell className="h-4 w-4 mr-2" />
            {language === "bn" ? "টেস্ট বিজ্ঞপ্তি পাঠান" : "Send Test Notification"}
          </Button>
        )}

        <Separator className="bg-border" />

        {/* Notification Types */}
        <div className="space-y-4">
          <Label className="text-base font-medium">
            {language === "bn" ? "বিজ্ঞপ্তির ধরন" : "Notification Types"}
          </Label>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-warning" />
              <div>
                <Label>{t("low_stock_alerts")}</Label>
                <p className="text-xs text-muted-foreground">{t("low_stock_desc")}</p>
              </div>
            </div>
            <Switch
              checked={notifications.lowStock}
              onCheckedChange={(checked) => onNotificationChange("lowStock", checked)}
            />
          </div>

          <Separator className="bg-border" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-4 w-4 text-accent" />
              <div>
                <Label>{t("new_order_alerts")}</Label>
                <p className="text-xs text-muted-foreground">{t("new_order_desc")}</p>
              </div>
            </div>
            <Switch
              checked={notifications.newOrders}
              onCheckedChange={(checked) => onNotificationChange("newOrders", checked)}
            />
          </div>

          <Separator className="bg-border" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-primary" />
              <div>
                <Label>{t("payment_alerts")}</Label>
                <p className="text-xs text-muted-foreground">{t("payment_desc")}</p>
              </div>
            </div>
            <Switch
              checked={notifications.payments}
              onCheckedChange={(checked) => onNotificationChange("payments", checked)}
            />
          </div>

          <Separator className="bg-border" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label>{t("daily_reports")}</Label>
                <p className="text-xs text-muted-foreground">{t("daily_reports_desc")}</p>
              </div>
            </div>
            <Switch
              checked={notifications.dailyReports}
              onCheckedChange={(checked) => onNotificationChange("dailyReports", checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
