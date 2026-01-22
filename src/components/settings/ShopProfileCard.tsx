import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Store, 
  Save, 
  Loader2, 
  MapPin,
  Phone,
  ExternalLink,
  Eye
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DIVISIONS, getDistricts, getThanas } from "@/lib/bangladeshConstants";
import { useNavigate } from "react-router-dom";

interface ShopProfile {
  id?: string;
  owner_id?: string;
  shop_name: string;
  description: string;
  phone: string;
  whatsapp: string;
  address: string;
  division: string;
  district: string;
  thana: string;
  delivery_fee: number;
  is_open: boolean;
  logo_url?: string;
  cover_image_url?: string;
}

export const ShopProfileCard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopProfile, setShopProfile] = useState<ShopProfile>({
    shop_name: '',
    description: '',
    phone: '',
    whatsapp: '',
    address: '',
    division: '',
    district: '',
    thana: '',
    delivery_fee: 50,
    is_open: false
  });

  const availableDistricts = shopProfile.division ? getDistricts(shopProfile.division) : [];
  const availableThanas = shopProfile.district ? getThanas(shopProfile.district) : [];

  useEffect(() => {
    fetchShopProfile();
  }, []);

  const fetchShopProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('shop_profiles')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setShopProfile({
          id: data.id,
          owner_id: data.owner_id,
          shop_name: data.shop_name || '',
          description: data.description || '',
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          address: data.address || '',
          division: data.division || '',
          district: data.district || '',
          thana: data.thana || '',
          delivery_fee: data.delivery_fee || 50,
          is_open: data.is_open || false,
          logo_url: data.logo_url,
          cover_image_url: data.cover_image_url
        });
      }
    } catch (error: any) {
      console.error('Error fetching shop profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!shopProfile.shop_name || !shopProfile.phone || !shopProfile.division || !shopProfile.district || !shopProfile.address) {
      toast({ 
        title: "Missing required fields", 
        description: "Please fill in shop name, phone, location and address",
        variant: "destructive" 
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const shopData = {
        owner_id: user.id,
        shop_name: shopProfile.shop_name,
        description: shopProfile.description,
        phone: shopProfile.phone,
        whatsapp: shopProfile.whatsapp || shopProfile.phone,
        address: shopProfile.address,
        division: shopProfile.division,
        district: shopProfile.district,
        thana: shopProfile.thana,
        delivery_fee: shopProfile.delivery_fee,
        is_open: shopProfile.is_open,
        updated_at: new Date().toISOString()
      };

      let result;
      if (shopProfile.id) {
        result = await supabase
          .from('shop_profiles')
          .update(shopData)
          .eq('id', shopProfile.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('shop_profiles')
          .insert(shopData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setShopProfile(prev => ({ ...prev, id: result.data.id, owner_id: result.data.owner_id }));
      toast({ title: "Shop profile saved successfully!" });
    } catch (error: any) {
      console.error('Error saving shop:', error);
      toast({ 
        title: "Failed to save shop profile", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDivisionChange = (value: string) => {
    setShopProfile(prev => ({ ...prev, division: value, district: '', thana: '' }));
  };

  const handleDistrictChange = (value: string) => {
    setShopProfile(prev => ({ ...prev, district: value, thana: '' }));
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground">LPG Community Shop</CardTitle>
          </div>
          {shopProfile.id && (
            <Badge className={shopProfile.is_open ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}>
              {shopProfile.is_open ? 'Open' : 'Closed'}
            </Badge>
          )}
        </div>
        <CardDescription>
          List your shop on the LPG Community marketplace to receive online orders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Shop Name */}
        <div className="space-y-2">
          <Label htmlFor="shopName">Shop Name *</Label>
          <Input
            id="shopName"
            placeholder="e.g., Rahman LPG Store"
            value={shopProfile.shop_name}
            onChange={(e) => setShopProfile(prev => ({ ...prev, shop_name: e.target.value }))}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="shopDesc">Description</Label>
          <Textarea
            id="shopDesc"
            placeholder="Brief description of your shop and services..."
            value={shopProfile.description}
            onChange={(e) => setShopProfile(prev => ({ ...prev, description: e.target.value }))}
            rows={2}
          />
        </div>

        {/* Contact */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="shopPhone" className="flex items-center gap-1">
              <Phone className="h-3 w-3" /> Phone *
            </Label>
            <Input
              id="shopPhone"
              placeholder="01XXXXXXXXX"
              value={shopProfile.phone}
              onChange={(e) => setShopProfile(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shopWhatsApp">WhatsApp</Label>
            <Input
              id="shopWhatsApp"
              placeholder="Same as phone if empty"
              value={shopProfile.whatsapp}
              onChange={(e) => setShopProfile(prev => ({ ...prev, whatsapp: e.target.value }))}
            />
          </div>
        </div>

        {/* Location */}
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Division *</Label>
            <Select value={shopProfile.division} onValueChange={handleDivisionChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {DIVISIONS.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>District *</Label>
            <Select 
              value={shopProfile.district} 
              onValueChange={handleDistrictChange}
              disabled={!shopProfile.division}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {availableDistricts.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Thana</Label>
            <Select 
              value={shopProfile.thana} 
              onValueChange={(v) => setShopProfile(prev => ({ ...prev, thana: v }))}
              disabled={!shopProfile.district}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {availableThanas.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="shopAddress" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Street Address *
          </Label>
          <Input
            id="shopAddress"
            placeholder="House/Shop no, Road, Area"
            value={shopProfile.address}
            onChange={(e) => setShopProfile(prev => ({ ...prev, address: e.target.value }))}
          />
        </div>

        {/* Delivery Fee */}
        <div className="space-y-2">
          <Label htmlFor="deliveryFee">Delivery Fee (৳)</Label>
          <Input
            id="deliveryFee"
            type="number"
            min={0}
            value={shopProfile.delivery_fee}
            onChange={(e) => setShopProfile(prev => ({ ...prev, delivery_fee: parseInt(e.target.value) || 0 }))}
          />
        </div>

        {/* Shop Open Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div>
            <p className="font-medium">Shop Status</p>
            <p className="text-sm text-muted-foreground">
              {shopProfile.is_open ? 'Your shop is visible and accepting orders' : 'Your shop is hidden from marketplace'}
            </p>
          </div>
          <Switch
            checked={shopProfile.is_open}
            onCheckedChange={(checked) => setShopProfile(prev => ({ ...prev, is_open: checked }))}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex-1"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {shopProfile.id ? 'Update Shop' : 'Create Shop'}
          </Button>
          
          {shopProfile.id && (
            <Button 
              variant="outline"
              onClick={() => navigate(`/community/shop/${shopProfile.id}`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View Shop
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
