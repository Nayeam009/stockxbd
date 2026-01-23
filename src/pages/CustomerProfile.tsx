import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  User, 
  Package,
  Phone,
  Mail,
  MapPin,
  Save,
  Loader2,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Bookmark,
  Plus,
  Trash2,
  Home,
  Briefcase
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CommunityBottomNav } from "@/components/community/CommunityBottomNav";
import { OrderCard } from "@/components/community/OrderCard";
import { useCommunityData, CommunityOrder } from "@/hooks/useCommunityData";
import { useCustomerData, SavedAddress } from "@/hooks/useCustomerData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DIVISIONS, getDistricts, getThanas } from "@/lib/bangladeshConstants";

const CustomerProfile = () => {
  const navigate = useNavigate();
  const { fetchCustomerOrders, currentUser, userRole } = useCommunityData();
  const { 
    profile: savedProfile, 
    defaultAddress: savedDefaultAddress,
    savedAddresses,
    saveCustomerData,
    addSavedAddress,
    removeSavedAddress,
    setDefaultAddress,
    isLoaded: customerDataLoaded
  } = useCustomerData();
  
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<CommunityOrder[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [addAddressOpen, setAddAddressOpen] = useState(false);
  
  // Profile state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // New address form state
  const [newAddressLabel, setNewAddressLabel] = useState("Home");
  const [newDivision, setNewDivision] = useState("");
  const [newDistrict, setNewDistrict] = useState("");
  const [newThana, setNewThana] = useState("");
  const [newStreetAddress, setNewStreetAddress] = useState("");

  const availableDistricts = division ? getDistricts(division) : [];
  const availableThanas = district ? getThanas(district) : [];
  const newAvailableDistricts = newDivision ? getDistricts(newDivision) : [];
  const newAvailableThanas = newDistrict ? getThanas(newDistrict) : [];

  useEffect(() => {
    fetchProfileAndOrders();
    loadCart();
  }, []);

  // Auto-fill from saved customer data
  useEffect(() => {
    if (customerDataLoaded && savedProfile) {
      if (savedProfile.name && !fullName) setFullName(savedProfile.name);
      if (savedProfile.phone && !phone) setPhone(savedProfile.phone);
      if (savedDefaultAddress.division && !division) setDivision(savedDefaultAddress.division);
      if (savedDefaultAddress.district && !district) setDistrict(savedDefaultAddress.district);
      if (savedDefaultAddress.thana && !thana) setThana(savedDefaultAddress.thana);
      if (savedDefaultAddress.streetAddress && !address) setAddress(savedDefaultAddress.streetAddress);
    }
  }, [customerDataLoaded, savedProfile, savedDefaultAddress]);

  const loadCart = () => {
    const savedCart = localStorage.getItem('lpg-community-cart');
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const fetchProfileAndOrders = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      setEmail(user.email || '');

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || '');
        setPhone(profile.phone || '');
        setAvatarUrl(profile.avatar_url);
      }

      // Fetch orders
      const ordersData = await fetchCustomerOrders();
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: fullName,
          phone: phone,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Save to customer data hook (for auto-fill)
      saveCustomerData({
        profile: { name: fullName, phone, email },
        defaultAddress: { division, district, thana, streetAddress: address }
      }, false);

      toast({ title: "Profile updated successfully!" });
    } catch (error: any) {
      toast({ 
        title: "Failed to update profile", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddNewAddress = () => {
    if (!newDivision || !newDistrict || !newStreetAddress) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    addSavedAddress({
      label: newAddressLabel,
      division: newDivision,
      district: newDistrict,
      thana: newThana,
      streetAddress: newStreetAddress,
      isDefault: savedAddresses.length === 0
    });

    // Reset form
    setNewAddressLabel("Home");
    setNewDivision("");
    setNewDistrict("");
    setNewThana("");
    setNewStreetAddress("");
    setAddAddressOpen(false);

    toast({ title: "Address saved!" });
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAddressIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home': return <Home className="h-4 w-4" />;
      case 'office': return <Briefcase className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  // Stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const completedOrders = orders.filter(o => o.status === 'delivered').length;
  const recentOrders = orders.slice(0, 3);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <CommunityHeader 
        cartItemCount={cart.length}
        userRole={userRole}
        userName={currentUser?.email}
        onCartClick={() => navigate('/community/cart')}
      />

      <main className="container mx-auto px-4 py-4 sm:py-6 max-w-2xl space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate('/community')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">My Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your account and orders</p>
          </div>
        </div>

        {/* Profile Header Card */}
        <Card className="overflow-hidden border-border">
          <div className="h-16 sm:h-20 bg-gradient-to-r from-primary via-primary/90 to-primary/70" />
          <CardContent className="pt-0 pb-4 sm:pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4 -mt-8 sm:-mt-10">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-background shadow-lg">
                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                <AvatarFallback className="text-xl sm:text-2xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                  {getInitials(fullName || email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">{fullName || email}</h2>
                <div className="flex items-center gap-2 justify-center sm:justify-start mt-1">
                  {userRole === 'owner' || userRole === 'manager' ? (
                    <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30">
                      Wholesale Customer
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Retail Customer
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6">
              <div className="text-center p-2 sm:p-3 rounded-xl bg-muted/50">
                <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-primary mb-1" />
                <p className="text-xl sm:text-2xl font-bold tabular-nums">{totalOrders}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Orders</p>
              </div>
              <div className="text-center p-2 sm:p-3 rounded-xl bg-amber-500/10">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-amber-500 mb-1" />
                <p className="text-xl sm:text-2xl font-bold tabular-nums">{pendingOrders}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-2 sm:p-3 rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 mx-auto text-emerald-500 mb-1" />
                <p className="text-xl sm:text-2xl font-bold tabular-nums">{completedOrders}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full h-12">
            <TabsTrigger value="profile" className="flex-1 h-10 text-sm">
              <User className="h-4 w-4 mr-1.5" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 h-10 text-sm">
              <Package className="h-4 w-4 mr-1.5" />
              Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-4 sm:mt-6">
            {/* Personal Information */}
            <Card className="border-border overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-5 w-5 text-primary" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-medium flex items-center gap-1">
                      <User className="h-3 w-3" /> Full Name
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your name"
                      autoComplete="name"
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Phone
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      autoComplete="tel"
                      className="h-12 text-base"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <Input
                    id="email"
                    value={email}
                    disabled
                    className="bg-muted h-12 text-base"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Default Address */}
            <Card className="border-border overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-5 w-5 text-primary" />
                  Default Delivery Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Division</Label>
                    <Select value={division} onValueChange={(v) => { setDivision(v); setDistrict(''); setThana(''); }}>
                      <SelectTrigger className="h-12 text-base">
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
                    <Label className="text-sm font-medium">District</Label>
                    <Select 
                      value={district} 
                      onValueChange={(v) => { setDistrict(v); setThana(''); }}
                      disabled={!division}
                    >
                      <SelectTrigger className="h-12 text-base">
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
                    <Label className="text-sm font-medium">Thana</Label>
                    <Select 
                      value={thana} 
                      onValueChange={setThana}
                      disabled={!district}
                    >
                      <SelectTrigger className="h-12 text-base">
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

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">Street Address</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House no, Road no, Area"
                    rows={2}
                    autoComplete="street-address"
                    className="min-h-[70px] text-base resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Saved Addresses */}
            <Card className="border-border overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Bookmark className="h-5 w-5 text-primary" />
                    Saved Addresses
                  </CardTitle>
                  <Dialog open={addAddressOpen} onOpenChange={setAddAddressOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8">
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add New Address</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                          <Label>Address Label</Label>
                          <Select value={newAddressLabel} onValueChange={setNewAddressLabel}>
                            <SelectTrigger className="h-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Home">Home</SelectItem>
                              <SelectItem value="Office">Office</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-2">
                            <Label className="text-xs">Division *</Label>
                            <Select value={newDivision} onValueChange={(v) => { setNewDivision(v); setNewDistrict(''); setNewThana(''); }}>
                              <SelectTrigger className="h-10">
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
                            <Label className="text-xs">District *</Label>
                            <Select value={newDistrict} onValueChange={(v) => { setNewDistrict(v); setNewThana(''); }} disabled={!newDivision}>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {newAvailableDistricts.map(d => (
                                  <SelectItem key={d} value={d}>{d}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Thana</Label>
                            <Select value={newThana} onValueChange={setNewThana} disabled={!newDistrict}>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {newAvailableThanas.map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Street Address *</Label>
                          <Textarea
                            value={newStreetAddress}
                            onChange={(e) => setNewStreetAddress(e.target.value)}
                            placeholder="House no, Road no, Area"
                            className="min-h-[60px] resize-none"
                          />
                        </div>
                        <Button onClick={handleAddNewAddress} className="w-full h-12">
                          <Plus className="h-4 w-4 mr-2" />
                          Save Address
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {savedAddresses.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No saved addresses yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedAddresses.map((addr) => (
                      <div 
                        key={addr.id}
                        className={`p-3 rounded-lg border flex items-start gap-3 ${
                          addr.isDefault ? 'border-primary bg-primary/5' : 'border-border'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          {getAddressIcon(addr.label)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{addr.label}</p>
                            {addr.isDefault && (
                              <Badge variant="secondary" className="text-[10px] h-5">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {addr.streetAddress}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {addr.thana && `${addr.thana}, `}{addr.district}, {addr.division}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!addr.isDefault && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() => setDefaultAddress(addr.id)}
                            >
                              Set Default
                            </Button>
                          )}
                          <Button 
                            size="icon" 
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => removeSavedAddress(addr.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button 
              onClick={handleSaveProfile} 
              disabled={saving}
              className="w-full h-12 text-base"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4 mt-4 sm:mt-6">
            {recentOrders.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 sm:p-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No orders yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start shopping to see your orders here
                  </p>
                  <Button onClick={() => navigate('/community')} className="h-12">
                    Browse Shops
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-4">
                  {recentOrders.map(order => (
                    <OrderCard 
                      key={order.id} 
                      order={order}
                      onViewDetails={() => {}}
                    />
                  ))}
                </div>
                
                {orders.length > 3 && (
                  <Button 
                    variant="outline" 
                    className="w-full h-12"
                    onClick={() => navigate('/community/orders')}
                  >
                    View All Orders ({orders.length})
                  </Button>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <CommunityBottomNav cartItemCount={cart.length} userRole={userRole} />
    </div>
  );
};

export default CustomerProfile;
