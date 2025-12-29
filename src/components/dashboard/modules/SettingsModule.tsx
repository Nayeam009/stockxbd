import { useState } from "react";
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
  Save
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const SettingsModule = () => {
  const [businessName, setBusinessName] = useState("Stock-X LPG Distribution");
  const [businessPhone, setBusinessPhone] = useState("+880 1XXX-XXXXXX");
  const [businessAddress, setBusinessAddress] = useState("Dhaka, Bangladesh");
  const [notifications, setNotifications] = useState({
    lowStock: true,
    newOrders: true,
    payments: true,
    dailyReports: false
  });
  const [darkMode, setDarkMode] = useState(true);

  const handleSaveSettings = () => {
    toast({ title: "Settings saved successfully" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground">Manage your application preferences and configurations.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Business Information */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-foreground">Business Information</CardTitle>
            </div>
            <CardDescription>Update your business details and contact information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="businessPhone">Phone Number</Label>
              <Input
                id="businessPhone"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="businessAddress">Address</Label>
              <Input
                id="businessAddress"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleSaveSettings} className="w-full bg-primary hover:bg-primary/90">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle className="text-foreground">Notifications</CardTitle>
            </div>
            <CardDescription>Configure your notification preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified when stock is low</p>
              </div>
              <Switch
                checked={notifications.lowStock}
                onCheckedChange={(checked) => setNotifications({ ...notifications, lowStock: checked })}
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label>New Order Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified for new orders</p>
              </div>
              <Switch
                checked={notifications.newOrders}
                onCheckedChange={(checked) => setNotifications({ ...notifications, newOrders: checked })}
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label>Payment Alerts</Label>
                <p className="text-sm text-muted-foreground">Get notified for payments</p>
              </div>
              <Switch
                checked={notifications.payments}
                onCheckedChange={(checked) => setNotifications({ ...notifications, payments: checked })}
              />
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <div>
                <Label>Daily Reports</Label>
                <p className="text-sm text-muted-foreground">Receive daily summary reports</p>
              </div>
              <Switch
                checked={notifications.dailyReports}
                onCheckedChange={(checked) => setNotifications({ ...notifications, dailyReports: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-foreground">Security</CardTitle>
            </div>
            <CardDescription>Manage security settings and access controls.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start">
              Change Password
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Two-Factor Authentication
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Active Sessions
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Access Logs
            </Button>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle className="text-foreground">Appearance</CardTitle>
            </div>
            <CardDescription>Customize the look and feel of your dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Use dark theme</p>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
            <Separator className="bg-border" />
            <div>
              <Label>Accent Color</Label>
              <div className="flex gap-2 mt-2">
                <div className="h-8 w-8 rounded-full bg-orange-500 cursor-pointer ring-2 ring-offset-2 ring-offset-background ring-orange-500"></div>
                <div className="h-8 w-8 rounded-full bg-blue-500 cursor-pointer hover:ring-2 ring-offset-2 ring-offset-background ring-blue-500"></div>
                <div className="h-8 w-8 rounded-full bg-green-500 cursor-pointer hover:ring-2 ring-offset-2 ring-offset-background ring-green-500"></div>
                <div className="h-8 w-8 rounded-full bg-purple-500 cursor-pointer hover:ring-2 ring-offset-2 ring-offset-background ring-purple-500"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-foreground">Data Management</CardTitle>
            </div>
            <CardDescription>Manage your data, backups, and exports.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                <Download className="h-5 w-5" />
                <span>Export Data</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                <Database className="h-5 w-5" />
                <span>Backup Database</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2 text-destructive hover:text-destructive">
                <Trash2 className="h-5 w-5" />
                <span>Clear Cache</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
