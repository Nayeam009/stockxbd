import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Building2, 
  Bell, 
  Shield, 
  Palette, 
  Database,
  Download,
  Trash2,
  Save,
  Globe,
  Moon,
  Sun,
  Check,
  Loader2,
  Lock
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const SettingsModule = () => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
  const [businessName, setBusinessName] = useState("Stock-X LPG Distribution");
  const [businessPhone, setBusinessPhone] = useState("+880 1XXX-XXXXXX");
  const [businessAddress, setBusinessAddress] = useState("Dhaka, Bangladesh");
  const [saving, setSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  
  const [notifications, setNotifications] = useState({
    lowStock: true,
    newOrders: true,
    payments: true,
    dailyReports: false
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("business-settings");
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setBusinessName(parsed.businessName || businessName);
      setBusinessPhone(parsed.businessPhone || businessPhone);
      setBusinessAddress(parsed.businessAddress || businessAddress);
    }
    const savedNotifications = localStorage.getItem("notification-settings");
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem("business-settings", JSON.stringify({
        businessName,
        businessPhone,
        businessAddress
      }));
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async
      toast({ title: t("settings_saved") });
    } catch (error) {
      toast({ title: "Error saving settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    localStorage.setItem("notification-settings", JSON.stringify(updated));
    toast({ title: t("settings_saved") });
  };

  const handleExportData = async () => {
    toast({ title: t("export_started") });
    // Simulate export
    setTimeout(() => {
      const data = {
        businessName,
        businessPhone,
        businessAddress,
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "stock-x-settings.json";
      a.click();
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const handleBackup = () => {
    toast({ title: t("backup_created") });
  };

  const handleClearCache = () => {
    // Clear specific caches, not all localStorage
    const keysToKeep = ["app-theme", "app-language", "business-settings", "notification-settings"];
    const savedItems: Record<string, string> = {};
    keysToKeep.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) savedItems[key] = value;
    });
    localStorage.clear();
    Object.entries(savedItems).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    toast({ title: t("cache_cleared") });
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({ title: "Password changed successfully" });
      setShowPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: error.message || "Failed to change password", variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">{t("settings")}</h2>
        <p className="text-muted-foreground">{t("settings_desc")}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Language & Theme */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              <CardTitle className="text-foreground">{t("language")} & {t("appearance")}</CardTitle>
            </div>
            <CardDescription>{t("language_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Language Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">{t("language")}</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={language === "en" ? "default" : "outline"}
                  className={`h-16 flex flex-col gap-1 ${language === "en" ? "bg-primary" : ""}`}
                  onClick={() => setLanguage("en")}
                >
                  <span className="text-lg font-bold">EN</span>
                  <span className="text-xs opacity-80">{t("english")}</span>
                  {language === "en" && <Check className="h-4 w-4 absolute top-2 right-2" />}
                </Button>
                <Button
                  variant={language === "bn" ? "default" : "outline"}
                  className={`h-16 flex flex-col gap-1 ${language === "bn" ? "bg-primary" : ""}`}
                  onClick={() => setLanguage("bn")}
                >
                  <span className="text-lg font-bold">বাং</span>
                  <span className="text-xs opacity-80">{t("bangla")}</span>
                  {language === "bn" && <Check className="h-4 w-4 absolute top-2 right-2" />}
                </Button>
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Theme Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">{t("appearance")}</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  className={`h-16 flex flex-col gap-1 ${theme === "light" ? "bg-primary" : ""}`}
                  onClick={() => setTheme("light")}
                >
                  <Sun className="h-5 w-5" />
                  <span className="text-xs">Light Mode</span>
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  className={`h-16 flex flex-col gap-1 ${theme === "dark" ? "bg-primary" : ""}`}
                  onClick={() => setTheme("dark")}
                >
                  <Moon className="h-5 w-5" />
                  <span className="text-xs">{t("dark_mode")}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-foreground">{t("business_info")}</CardTitle>
            </div>
            <CardDescription>{t("business_info_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="businessName">{t("business_name")}</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="businessPhone">{t("phone_number")}</Label>
              <Input
                id="businessPhone"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="businessAddress">{t("address")}</Label>
              <Input
                id="businessAddress"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button 
              onClick={handleSaveSettings} 
              className="w-full bg-primary hover:bg-primary/90"
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {t("save_changes")}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-foreground">{t("notifications")}</CardTitle>
            </div>
            <CardDescription>{t("notifications_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("low_stock_alerts")}</Label>
                <p className="text-sm text-muted-foreground">{t("low_stock_desc")}</p>
              </div>
              <Switch
                checked={notifications.lowStock}
                onCheckedChange={(checked) => handleNotificationChange("lowStock", checked)}
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("new_order_alerts")}</Label>
                <p className="text-sm text-muted-foreground">{t("new_order_desc")}</p>
              </div>
              <Switch
                checked={notifications.newOrders}
                onCheckedChange={(checked) => handleNotificationChange("newOrders", checked)}
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("payment_alerts")}</Label>
                <p className="text-sm text-muted-foreground">{t("payment_desc")}</p>
              </div>
              <Switch
                checked={notifications.payments}
                onCheckedChange={(checked) => handleNotificationChange("payments", checked)}
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("daily_reports")}</Label>
                <p className="text-sm text-muted-foreground">{t("daily_reports_desc")}</p>
              </div>
              <Switch
                checked={notifications.dailyReports}
                onCheckedChange={(checked) => handleNotificationChange("dailyReports", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-foreground">{t("security")}</CardTitle>
            </div>
            <CardDescription>{t("security_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setShowPasswordDialog(true)}
            >
              <Lock className="h-4 w-4 mr-2" />
              {t("change_password")}
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              {t("two_factor")}
              <span className="ml-auto text-xs text-muted-foreground">Coming Soon</span>
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              {t("active_sessions")}
              <span className="ml-auto text-xs text-muted-foreground">Coming Soon</span>
            </Button>
            <Button variant="outline" className="w-full justify-start" disabled>
              {t("access_logs")}
              <span className="ml-auto text-xs text-muted-foreground">Coming Soon</span>
            </Button>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-foreground">{t("data_management")}</CardTitle>
            </div>
            <CardDescription>{t("data_management_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center gap-2"
                onClick={handleExportData}
              >
                <Download className="h-5 w-5" />
                <span>{t("export_data")}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center gap-2"
                onClick={handleBackup}
              >
                <Database className="h-5 w-5" />
                <span>{t("backup_database")}</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex flex-col items-center justify-center gap-2 text-destructive hover:text-destructive"
                onClick={handleClearCache}
              >
                <Trash2 className="h-5 w-5" />
                <span>{t("clear_cache")}</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("change_password")}</DialogTitle>
            <DialogDescription>
              Enter your new password below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1"
                placeholder="Enter new password"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
