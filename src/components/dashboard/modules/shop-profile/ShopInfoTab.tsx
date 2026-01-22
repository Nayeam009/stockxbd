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
  Truck,
  Star,
  ShoppingBag,
  MessageSquare
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

export interface ShopProfile {
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

interface ShopInfoTabProps {
  shopProfile: ShopProfile;
  setShopProfile: React.Dispatch<React.SetStateAction<ShopProfile>>;
  loading: boolean;
  onSave: () => Promise<void>;
  saving: boolean;
}

export const ShopInfoTab = ({ 
  shopProfile, 
  setShopProfile, 
  loading, 
  onSave, 
  saving 
}: ShopInfoTabProps) => {
  const navigate = useNavigate();
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);

  const availableDistricts = shopProfile.division ? getDistricts(shopProfile.division) : [];
  const availableThanas = shopProfile.district ? getThanas(shopProfile.district) : [];

  const shopUrl = shopProfile.id 
    ? `${window.location.origin}/community/shop/${shopProfile.id}` 
    : '';

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
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cover and Logo Section */}
      <Card className="overflow-hidden">
        <div className="relative h-36 sm:h-44 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20">
          {shopProfile.cover_image_url && (
            <img 
              src={shopProfile.cover_image_url} 
              alt="Shop cover" 
              className="w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          
          {/* Upload Cover Button */}
          <label className="absolute top-3 right-3 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'cover')}
              disabled={uploadingCover || !shopProfile.id}
            />
            <Button size="sm" variant="secondary" className="gap-2 h-9" asChild>
              <span>
                {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                Cover
              </span>
            </Button>
          </label>
          
          {/* Logo Avatar */}
          <div className="absolute -bottom-12 left-4 sm:left-6">
            <div className="relative">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={shopProfile.logo_url || undefined} alt={shopProfile.shop_name} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
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
                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow" asChild>
                  <span>
                    {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </div>

        <CardContent className="pt-16 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  {shopProfile.shop_name || 'Your Shop'}
                </h2>
                {shopProfile.id && (
                  <Badge className={`${shopProfile.is_open ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' : 'bg-muted text-muted-foreground'}`}>
                    {shopProfile.is_open ? 'Open' : 'Closed'}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-1">
                {shopProfile.id ? 'Manage your shop profile and online presence' : 'Create your shop to start receiving orders'}
              </p>
            </div>

            {shopProfile.id && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleCopyLink} className="gap-2 h-10">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  Copy Link
                </Button>
                <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-10">QR Code</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                      <DialogTitle>Shop QR Code</DialogTitle>
                      <DialogDescription>Scan to visit {shopProfile.shop_name}</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center p-4">
                      <QRCodeSVG value={shopUrl} size={200} />
                    </div>
                  </DialogContent>
                </Dialog>
                <Button size="sm" onClick={() => navigate(`/community/shop/${shopProfile.id}`)} className="gap-2 h-10">
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
              </div>
            )}
          </div>

          {/* Stats Row */}
          {shopProfile.id && (
            <div className="flex items-center gap-6 mt-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <Star className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{shopProfile.rating?.toFixed(1) || '0.0'}</p>
                  <p className="text-xs text-muted-foreground">Rating</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{shopProfile.total_orders || 0}</p>
                  <p className="text-xs text-muted-foreground">Orders</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-secondary/15 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-lg font-bold tabular-nums">{shopProfile.total_reviews || 0}</p>
                  <p className="text-xs text-muted-foreground">Reviews</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shop Status Toggle */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${shopProfile.is_open ? 'bg-emerald-500/15' : 'bg-muted'}`}>
              <Store className={`h-5 w-5 ${shopProfile.is_open ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="font-medium">Shop Status</p>
              <p className="text-sm text-muted-foreground">
                {shopProfile.is_open ? 'Your shop is visible on the marketplace' : 'Your shop is hidden from customers'}
              </p>
            </div>
          </div>
          <Switch
            checked={shopProfile.is_open}
            onCheckedChange={(checked) => setShopProfile(prev => ({ ...prev, is_open: checked }))}
            className="h-6 w-11"
          />
        </div>
      </Card>

      {/* Shop Details Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Shop Details</CardTitle>
          <CardDescription>Basic information about your shop</CardDescription>
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
              className="h-11"
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
              rows={3}
            />
          </div>

          {/* Contact */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shopPhone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> Phone *
              </Label>
              <Input
                id="shopPhone"
                placeholder="01XXXXXXXXX"
                value={shopProfile.phone}
                onChange={(e) => setShopProfile(prev => ({ ...prev, phone: e.target.value }))}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shopWhatsApp" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Label>
              <Input
                id="shopWhatsApp"
                placeholder="Same as phone if empty"
                value={shopProfile.whatsapp}
                onChange={(e) => setShopProfile(prev => ({ ...prev, whatsapp: e.target.value }))}
                className="h-11"
              />
            </div>
          </div>

          {/* Location */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Division *</Label>
              <Select value={shopProfile.division} onValueChange={handleDivisionChange}>
                <SelectTrigger className="h-11">
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
                <SelectTrigger className="h-11">
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
                <SelectTrigger className="h-11">
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
            <Label htmlFor="shopAddress" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Street Address *
            </Label>
            <Input
              id="shopAddress"
              placeholder="House/Shop no, Road, Area"
              value={shopProfile.address}
              onChange={(e) => setShopProfile(prev => ({ ...prev, address: e.target.value }))}
              className="h-11"
            />
          </div>

          {/* Delivery Fee */}
          <div className="space-y-2">
            <Label htmlFor="deliveryFee" className="flex items-center gap-2">
              <Truck className="h-4 w-4" /> Delivery Fee (৳)
            </Label>
            <Input
              id="deliveryFee"
              type="number"
              min={0}
              placeholder="50"
              value={shopProfile.delivery_fee || ''}
              onChange={(e) => setShopProfile(prev => ({ ...prev, delivery_fee: parseInt(e.target.value) || 0 }))}
              className="h-11"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={onSave} disabled={saving} size="lg" className="min-w-[140px] h-12">
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
