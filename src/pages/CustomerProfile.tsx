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
  CheckCircle2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CommunityBottomNav } from "@/components/community/CommunityBottomNav";
import { OrderCard } from "@/components/community/OrderCard";
import { useCommunityData, CommunityOrder } from "@/hooks/useCommunityData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DIVISIONS, getDistricts, getThanas } from "@/lib/bangladeshConstants";

const CustomerProfile = () => {
  const navigate = useNavigate();
  const { fetchCustomerOrders, currentUser, userRole } = useCommunityData();
  
  const [activeTab, setActiveTab] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orders, setOrders] = useState<CommunityOrder[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  
  // Profile state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [division, setDivision] = useState("");
  const [district, setDistrict] = useState("");
  const [thana, setThana] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const availableDistricts = division ? getDistricts(division) : [];
  const availableThanas = district ? getThanas(district) : [];

  useEffect(() => {
    fetchProfileAndOrders();
    loadCart();
  }, []);

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

      // Load saved location from localStorage
      const savedLocation = localStorage.getItem('customer-location');
      if (savedLocation) {
        const loc = JSON.parse(savedLocation);
        setDivision(loc.division || '');
        setDistrict(loc.district || '');
        setThana(loc.thana || '');
        setAddress(loc.address || '');
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

      // Save location preferences to localStorage for checkout
      localStorage.setItem('customer-location', JSON.stringify({
        division,
        district,
        thana,
        address
      }));

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

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

      <main className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/community')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">Manage your account and orders</p>
          </div>
        </div>

        {/* Profile Header Card */}
        <Card className="overflow-hidden">
          <div className="h-20 bg-gradient-to-r from-primary to-primary/70" />
          <CardContent className="pt-0 pb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-10">
              <Avatar className="h-20 w-20 border-4 border-background">
                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                  {getInitials(fullName || email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-xl font-bold text-foreground">{fullName || email}</h2>
                <div className="flex items-center gap-2 justify-center sm:justify-start mt-1">
                  {/* Show different badges based on role */}
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
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <ShoppingBag className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{totalOrders}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-500/10">
                <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                <p className="text-2xl font-bold">{pendingOrders}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
                <p className="text-2xl font-bold">{completedOrders}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="profile" className="flex-1">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1">
              <Package className="h-4 w-4 mr-2" />
              Orders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-1">
                      <User className="h-3 w-3" /> Full Name
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Phone
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <Input
                    id="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <Separator />

                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Default Delivery Address
                </h4>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Division</Label>
                    <Select value={division} onValueChange={(v) => { setDivision(v); setDistrict(''); setThana(''); }}>
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
                    <Label>District</Label>
                    <Select 
                      value={district} 
                      onValueChange={(v) => { setDistrict(v); setThana(''); }}
                      disabled={!division}
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
                      value={thana} 
                      onValueChange={setThana}
                      disabled={!district}
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

                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House no, Road no, Area"
                    rows={2}
                  />
                </div>

                <Button 
                  onClick={handleSaveProfile} 
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4 mt-6">
            {recentOrders.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No orders yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start shopping to see your orders here
                  </p>
                  <Button onClick={() => navigate('/community')}>
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
                    className="w-full"
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
