import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Store, 
  Save, 
  Loader2, 
  MapPin,
  Phone,
  Eye,
  Copy,
  Check,
  Upload,
  Image as ImageIcon,
  MessageCircle,
  Clock,
  Truck
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
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  rating?: number;
  total_orders?: number;
  total_reviews?: number;
}

export const ShopProfileCard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  
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

  const shopUrl = shopProfile.id 
    ? `${window.location.origin}/community/shop/${shopProfile.id}` 
    : '';

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
          cover_image_url: data.cover_image_url,
          rating: data.rating,
          total_orders: data.total_orders,
          total_reviews: data.total_reviews
        });
      }
    } catch (error: any) {
      console.error('Error fetching shop profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File, type: 'logo' | 'cover') => {
    if (!shopProfile.id) {
      toast({ title: "Please save your shop first", variant: "destructive" });
      return;
    }

    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingCover;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${shopProfile.id}/${type}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const updateField = type === 'logo' ? 'logo_url' : 'cover_image_url';
      const { error: updateError } = await supabase
        .from('shop_profiles')
        .update({ [updateField]: publicUrl })
        .eq('id', shopProfile.id);

      if (updateError) throw updateError;

      setShopProfile(prev => ({ ...prev, [updateField]: publicUrl }));
      toast({ title: `${type === 'logo' ? 'Logo' : 'Cover'} uploaded successfully!` });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
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

  const handleCopyLink = () => {
    if (shopUrl) {
      navigator.clipboard.writeText(shopUrl);
      setCopied(true);
      toast({ title: "Shop link copied!" });
      setTimeout(() => setCopied(false), 2000);
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
    <Card className="bg-card border-border overflow-hidden">
      {/* Cover Image Area */}
      <div className="relative h-32 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20">
        {shopProfile.cover_image_url && (
          <img 
            src={shopProfile.cover_image_url} 
            alt="Shop cover" 
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        
        {/* Upload Cover Button */}
        <label className="absolute top-2 right-2 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
            disabled={uploadingCover || !shopProfile.id}
          />
          <Button size="sm" variant="secondary" className="gap-2" asChild>
            <span>
              {uploadingCover ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
              Cover
            </span>
          </Button>
        </label>
        
        {/* Logo Avatar */}
        <div className="absolute -bottom-10 left-4">
          <div className="relative">
            <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
              <AvatarImage src={shopProfile.logo_url || undefined} alt={shopProfile.shop_name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                {shopProfile.shop_name?.[0] || 'S'}
              </AvatarFallback>
            </Avatar>
            <label className="absolute -bottom-1 -right-1 cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'logo')}
                disabled={uploadingLogo || !shopProfile.id}
              />
              <Button size="icon" variant="secondary" className="h-7 w-7 rounded-full shadow" asChild>
                <span>
                  {uploadingLogo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                </span>
              </Button>
            </label>
          </div>
        </div>
      </div>

      <CardHeader className="pt-14 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-foreground">{shopProfile.shop_name || 'Your Shop'}</CardTitle>
            {shopProfile.id && (
              <Badge className={shopProfile.is_open ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}>
                {shopProfile.is_open ? 'Open' : 'Closed'}
              </Badge>
            )}
          </div>
          {shopProfile.id && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleCopyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">QR</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xs">
                  <DialogHeader>
                    <DialogTitle>Shop QR Code</DialogTitle>
                    <DialogDescription>Scan to visit your shop</DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-center p-4">
                    <QRCodeSVG value={shopUrl} size={200} />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
        <CardDescription>
          {shopProfile.id ? 'Manage your marketplace presence' : 'Create your shop to start receiving orders'}
        </CardDescription>

        {/* Stats Row */}
        {shopProfile.id && (
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="font-semibold text-foreground">{shopProfile.rating?.toFixed(1) || '0.0'}</span>
              ⭐ Rating
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="font-semibold text-foreground">{shopProfile.total_orders || 0}</span>
              Orders
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <span className="font-semibold text-foreground">{shopProfile.total_reviews || 0}</span>
              Reviews
            </div>
          </div>
        )}
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
            <Label htmlFor="shopWhatsApp" className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" /> WhatsApp
            </Label>
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
          <Label htmlFor="deliveryFee" className="flex items-center gap-1">
            <Truck className="h-3 w-3" /> Delivery Fee (৳)
          </Label>
          <Input
            id="deliveryFee"
            type="number"
            min={0}
            value={shopProfile.delivery_fee}
            onChange={(e) => setShopProfile(prev => ({ ...prev, delivery_fee: parseInt(e.target.value) || 0 }))}
          />
        </div>

        {/* Shop Open Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${shopProfile.is_open ? 'bg-emerald-500/20' : 'bg-muted'}`}>
              <Clock className={`h-4 w-4 ${shopProfile.is_open ? 'text-emerald-600' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="font-medium">Shop Status</p>
              <p className="text-sm text-muted-foreground">
                {shopProfile.is_open ? 'Visible and accepting orders' : 'Hidden from marketplace'}
              </p>
            </div>
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
              Preview Shop
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
