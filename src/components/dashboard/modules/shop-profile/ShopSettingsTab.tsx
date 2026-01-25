import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Settings, 
  Save, 
  Loader2, 
  Clock,
  Truck,
  CreditCard,
  Bell,
  MapPin,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIVISIONS, getDistricts } from "@/lib/bangladeshConstants";

interface ShopSettings {
  minimum_order_amount: number;
  operating_hours_start: string;
  operating_hours_end: string;
  delivery_divisions: string[];
  payment_methods: string[];
  notify_new_orders: boolean;
  notify_low_stock: boolean;
  is_listed: boolean;
  // Online payment numbers
  bkash_number: string;
  nagad_number: string;
  rocket_number: string;
  online_payment_only: boolean;
}

interface ShopSettingsTabProps {
  shopId: string | null;
}

const PAYMENT_METHODS = [
  { id: 'cod', label: 'Cash on Delivery', icon: '💵' },
  { id: 'bkash', label: 'bKash', icon: '🔴' },
  { id: 'nagad', label: 'Nagad', icon: '🟠' },
  { id: 'rocket', label: 'Rocket', icon: '🟣' },
  { id: 'card', label: 'Card Payment', icon: '💳' }
];

const DEFAULT_SETTINGS: ShopSettings = {
  minimum_order_amount: 0,
  operating_hours_start: '09:00',
  operating_hours_end: '21:00',
  delivery_divisions: [],
  payment_methods: ['cod'],
  notify_new_orders: true,
  notify_low_stock: true,
  is_listed: true,
  bkash_number: '',
  nagad_number: '',
  rocket_number: '',
  online_payment_only: false
};

export const ShopSettingsTab = ({ shopId }: ShopSettingsTabProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ShopSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (shopId) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [shopId]);

  const fetchSettings = async () => {
    if (!shopId) return;
    
    try {
      // Load from localStorage for now (can be migrated to database later)
      const savedSettings = localStorage.getItem(`shop_settings_${shopId}`);
      if (savedSettings) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }

      // Also fetch payment numbers from database
      const { data: shopData } = await supabase
        .from('shop_profiles')
        .select('bkash_number, nagad_number, rocket_number, online_payment_only')
        .eq('id', shopId)
        .single();

      if (shopData) {
        setSettings(prev => ({
          ...prev,
          bkash_number: shopData.bkash_number || '',
          nagad_number: shopData.nagad_number || '',
          rocket_number: shopData.rocket_number || '',
          online_payment_only: shopData.online_payment_only || false
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!shopId) return;
    
    setSaving(true);
    try {
      // Save to localStorage (can be migrated to database)
      localStorage.setItem(`shop_settings_${shopId}`, JSON.stringify(settings));
      
      // Update shop profile in database with payment numbers and visibility
      const { error } = await supabase
        .from('shop_profiles')
        .update({ 
          is_open: settings.is_listed,
          bkash_number: settings.bkash_number || null,
          nagad_number: settings.nagad_number || null,
          rocket_number: settings.rocket_number || null,
          online_payment_only: settings.online_payment_only
        })
        .eq('id', shopId);

      if (error) throw error;
      
      toast({ title: "Settings saved successfully!" });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({ 
        title: "Failed to save settings", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const togglePaymentMethod = (methodId: string) => {
    setSettings(prev => ({
      ...prev,
      payment_methods: prev.payment_methods.includes(methodId)
        ? prev.payment_methods.filter(m => m !== methodId)
        : [...prev.payment_methods, methodId]
    }));
  };

  const toggleDeliveryDivision = (division: string) => {
    setSettings(prev => ({
      ...prev,
      delivery_divisions: prev.delivery_divisions.includes(division)
        ? prev.delivery_divisions.filter(d => d !== division)
        : [...prev.delivery_divisions, division]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shopId) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Create Your Shop First</h3>
          <p className="text-muted-foreground text-center">
            Set up your shop profile before configuring settings
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shop Visibility */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            {settings.is_listed ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            Shop Visibility
          </CardTitle>
          <CardDescription>Control whether your shop appears on the marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{settings.is_listed ? 'Listed on Marketplace' : 'Hidden from Marketplace'}</p>
              <p className="text-sm text-muted-foreground">
                {settings.is_listed 
                  ? 'Customers can find and order from your shop' 
                  : 'Your shop is not visible to customers'
                }
              </p>
            </div>
            <Switch
              checked={settings.is_listed}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, is_listed: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Operating Hours */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Operating Hours
          </CardTitle>
          <CardDescription>Set your shop's business hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Opening Time</Label>
              <Input
                type="time"
                value={settings.operating_hours_start}
                onChange={(e) => setSettings(prev => ({ ...prev, operating_hours_start: e.target.value }))}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Closing Time</Label>
              <Input
                type="time"
                value={settings.operating_hours_end}
                onChange={(e) => setSettings(prev => ({ ...prev, operating_hours_end: e.target.value }))}
                className="h-11"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Order Settings
          </CardTitle>
          <CardDescription>Configure order requirements</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Minimum Order Amount (৳)</Label>
            <Input
              type="number"
              min={0}
              value={settings.minimum_order_amount || ''}
              onChange={(e) => setSettings(prev => ({ 
                ...prev, 
                minimum_order_amount: parseInt(e.target.value) || 0 
              }))}
              placeholder="0 for no minimum"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Set to 0 to allow orders of any amount
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Zones */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Delivery Zones
          </CardTitle>
          <CardDescription>Select divisions where you deliver</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DIVISIONS.map(division => (
              <div 
                key={division}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  settings.delivery_divisions.includes(division)
                    ? 'bg-primary/10 border-primary/30'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => toggleDeliveryDivision(division)}
              >
                <Checkbox 
                  checked={settings.delivery_divisions.includes(division)}
                  className="pointer-events-none"
                />
                <span className="text-sm font-medium">{division}</span>
              </div>
            ))}
          </div>
          {settings.delivery_divisions.length === 0 && (
            <p className="text-sm text-amber-600 mt-3">
              ⚠️ No delivery zones selected. Customers from any location can order.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Methods
          </CardTitle>
          <CardDescription>Accept these payment options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Method Checkboxes */}
          <div className="grid sm:grid-cols-2 gap-3">
            {PAYMENT_METHODS.map(method => (
              <div 
                key={method.id}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  settings.payment_methods.includes(method.id)
                    ? 'bg-primary/10 border-primary/30'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => togglePaymentMethod(method.id)}
              >
                <Checkbox 
                  checked={settings.payment_methods.includes(method.id)}
                  className="pointer-events-none"
                />
                <span className="text-xl">{method.icon}</span>
                <span className="font-medium">{method.label}</span>
              </div>
            ))}
          </div>
          {settings.payment_methods.length === 0 && (
            <p className="text-sm text-destructive">
              ⚠️ Please select at least one payment method
            </p>
          )}

          {/* Online Payment Numbers */}
          <div className="border-t pt-6">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              💰 Online Payment Numbers
              <Badge variant="secondary" className="text-xs">For Online Orders</Badge>
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              Customers will see these numbers when placing online orders
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="text-lg">🔴</span> bKash Number
                </Label>
                <Input
                  value={settings.bkash_number}
                  onChange={(e) => setSettings(prev => ({ ...prev, bkash_number: e.target.value }))}
                  placeholder="01XXXXXXXXX"
                  className="h-11"
                  inputMode="tel"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="text-lg">🟠</span> Nagad Number
                </Label>
                <Input
                  value={settings.nagad_number}
                  onChange={(e) => setSettings(prev => ({ ...prev, nagad_number: e.target.value }))}
                  placeholder="01XXXXXXXXX"
                  className="h-11"
                  inputMode="tel"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <span className="text-lg">🟣</span> Rocket Number
                </Label>
                <Input
                  value={settings.rocket_number}
                  onChange={(e) => setSettings(prev => ({ ...prev, rocket_number: e.target.value }))}
                  placeholder="01XXXXXXXXX"
                  className="h-11"
                  inputMode="tel"
                />
              </div>
            </div>
          </div>

          {/* Require Online Payment Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Require Online Payment</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Disable Cash on Delivery for online orders (recommended)
              </p>
            </div>
            <Switch
              checked={settings.online_payment_only}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, online_payment_only: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Manage notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Order Notifications</p>
              <p className="text-sm text-muted-foreground">Get notified when you receive a new order</p>
            </div>
            <Switch
              checked={settings.notify_new_orders}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notify_new_orders: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Low Stock Alerts</p>
              <p className="text-sm text-muted-foreground">Get notified when product stock is low</p>
            </div>
            <Switch
              checked={settings.notify_low_stock}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notify_low_stock: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="min-w-[140px] h-12">
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
