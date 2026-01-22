import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Settings, 
  Building2, 
  Shield, 
  Trash2,
  Save,
  Globe,
  Moon,
  Sun,
  Check,
  Loader2,
  Lock,
  User,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  UserX,
  Store,
  Zap,
  Database,
  Palette,
  Bell,
  Users,
  Share2,
  ShoppingBag,
  ChevronRight,
  Package
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProfileSharingCard } from "@/components/settings/ProfileSharingCard";
import { BackupRestoreCard } from "@/components/settings/BackupRestoreCard";
import { PushNotificationCard } from "@/components/settings/PushNotificationCard";
import { TeamManagementCard } from "@/components/settings/TeamManagementCard";
import { ShopProfileCard } from "@/components/settings/ShopProfileCard";
import { ShopProductsCard } from "@/components/settings/ShopProductsCard";

interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  active?: boolean;
  onClick: () => void;
}

const SettingsSection = ({ icon, title, description, active, onClick }: SettingsSectionProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
      active 
        ? 'bg-primary/10 text-primary border border-primary/20' 
        : 'hover:bg-muted/50 text-foreground'
    }`}
  >
    <div className={`p-2 rounded-lg ${active ? 'bg-primary/20' : 'bg-muted'}`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm truncate">{title}</p>
      {description && <p className="text-xs text-muted-foreground truncate">{description}</p>}
    </div>
    <ChevronRight className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
  </button>
);

export const SettingsModule = () => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [activeSection, setActiveSection] = useState('profile');
  
  const [businessName, setBusinessName] = useState("Stock-X LPG Distribution");
  const [businessPhone, setBusinessPhone] = useState("+880 1XXX-XXXXXX");
  const [businessAddress, setBusinessAddress] = useState("Dhaka, Bangladesh");
  const [saving, setSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  
  // User profile state
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<string>("driver");
  const [userCreatedAt, setUserCreatedAt] = useState("");
  const [fullName, setFullName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeletePasswordDialog, setShowDeletePasswordDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  const [notifications, setNotifications] = useState({
    lowStock: true,
    newOrders: true,
    payments: true,
    dailyReports: false
  });

  const isOwner = userRole === 'owner';
  const isOwnerOrManager = userRole === 'owner' || userRole === 'manager';

  // Load user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        setUserCreatedAt(user.created_at || "");
        
        // Fetch role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (roleData?.role) {
          setUserRole(roleData.role);
        }
        
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (profileData) {
          setFullName(profileData.full_name || "");
          setUserPhone(profileData.phone || "");
          setAvatarUrl(profileData.avatar_url);
        }
      }
    };
    
    fetchUserProfile();
  }, []);

  // Load settings from localStorage
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

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: fullName,
          phone: userPhone,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      
      if (error) throw error;
      toast({ title: "Profile updated successfully" });
    } catch (error: any) {
      toast({ title: error.message || "Failed to update profile", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0';
      case 'manager': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0';
      case 'driver': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      localStorage.setItem("business-settings", JSON.stringify({
        businessName,
        businessPhone,
        businessAddress
      }));
      await new Promise(resolve => setTimeout(resolve, 300));
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

  const handleClearCache = () => {
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
      const { error } = await supabase.auth.updateUser({ password: newPassword });
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

  const handleDeleteAccountRequest = () => {
    if (userRole === 'owner') {
      setShowDeletePasswordDialog(true);
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleDeleteAccount = async () => {
    if (userRole === 'owner' && deleteConfirmText !== 'DELETE') {
      toast({ title: "Please type DELETE to confirm", variant: "destructive" });
      return;
    }

    setDeletingAccount(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      if (userRole === 'owner') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: userEmail,
          password: deletePassword
        });
        if (signInError) {
          toast({ title: "Incorrect password", variant: "destructive" });
          setDeletingAccount(false);
          return;
        }
      }

      await supabase.from('profiles').delete().eq('user_id', user.id);
      await supabase.from('user_roles').delete().eq('user_id', user.id);

      if (userRole === 'owner') {
        await supabase.from('team_members').delete().eq('owner_id', user.id);
        await supabase.from('team_invites').delete().eq('created_by', user.id);
      }

      await supabase.auth.signOut();
      toast({ title: 'Account deleted successfully' });
      window.location.href = '/';
    } catch (error: any) {
      toast({ title: error.message || "Failed to delete account", variant: "destructive" });
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
      setShowDeletePasswordDialog(false);
      setDeletePassword("");
      setDeleteConfirmText("");
    }
  };

  const sections = [
    { id: 'profile', icon: <User className="h-4 w-4" />, title: 'Profile', description: 'Personal info' },
    { id: 'appearance', icon: <Palette className="h-4 w-4" />, title: 'Appearance', description: 'Theme & language' },
    { id: 'business', icon: <Building2 className="h-4 w-4" />, title: 'Business', description: 'Company details' },
    ...(isOwner ? [
      { id: 'marketplace', icon: <Store className="h-4 w-4" />, title: 'Marketplace', description: 'Shop settings' },
      { id: 'team', icon: <Users className="h-4 w-4" />, title: 'Team', description: 'Manage members' },
    ] : []),
    { id: 'notifications', icon: <Bell className="h-4 w-4" />, title: 'Notifications', description: 'Alerts & updates' },
    { id: 'security', icon: <Shield className="h-4 w-4" />, title: 'Security', description: 'Password & access' },
    { id: 'advanced', icon: <Zap className="h-4 w-4" />, title: 'Advanced', description: 'Data & cache' },
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Profile Header Card */}
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="h-20 bg-gradient-to-r from-primary via-primary-light to-secondary" />
              <CardContent className="relative pt-0 -mt-12 pb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                    <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                    <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                      {getInitials(fullName || userEmail)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-foreground">{fullName || 'User'}</h2>
                      <Badge className={`${getRoleBadgeStyle(userRole)} px-3`}>
                        {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{userEmail}</p>
                    <p className="text-xs text-muted-foreground">
                      Member since {userCreatedAt ? new Date(userCreatedAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
                <CardDescription>Update your profile details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Full Name
                    </Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userPhone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Phone Number
                    </Label>
                    <Input
                      id="userPhone"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="+880 1XXX-XXXXXX"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userEmail" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email Address
                  </Label>
                  <Input id="userEmail" value={userEmail} disabled className="bg-muted/50" />
                </div>
                <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full sm:w-auto">
                  {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Profile
                </Button>
              </CardContent>
            </Card>

            {/* Profile Sharing (Owner only) */}
            {isOwner && <ProfileSharingCard />}
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Language
                </CardTitle>
                <CardDescription>Choose your preferred language</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={language === "en" ? "default" : "outline"}
                    className={`h-20 flex flex-col gap-2 relative ${language === "en" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setLanguage("en")}
                  >
                    <span className="text-2xl font-bold">EN</span>
                    <span className="text-xs opacity-80">{t("english")}</span>
                    {language === "en" && <Check className="h-4 w-4 absolute top-2 right-2" />}
                  </Button>
                  <Button
                    variant={language === "bn" ? "default" : "outline"}
                    className={`h-20 flex flex-col gap-2 relative ${language === "bn" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setLanguage("bn")}
                  >
                    <span className="text-2xl font-bold">বাং</span>
                    <span className="text-xs opacity-80">{t("bangla")}</span>
                    {language === "bn" && <Check className="h-4 w-4 absolute top-2 right-2" />}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Theme
                </CardTitle>
                <CardDescription>Select your visual preference</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    className={`h-20 flex flex-col gap-2 ${theme === "light" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-6 w-6" />
                    <span className="text-xs">Light Mode</span>
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    className={`h-20 flex flex-col gap-2 ${theme === "dark" ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-6 w-6" />
                    <span className="text-xs">{t("dark_mode")}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'business':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {t("business_info")}
              </CardTitle>
              <CardDescription>{t("business_info_desc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">{t("business_name")}</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessPhone">{t("phone_number")}</Label>
                <Input
                  id="businessPhone"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessAddress">{t("address")}</Label>
                <Input
                  id="businessAddress"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {t("save_changes")}
              </Button>
            </CardContent>
          </Card>
        );

      case 'marketplace':
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-secondary/10 to-accent/10 rounded-xl border border-secondary/20">
              <div className="p-3 bg-secondary/20 rounded-lg">
                <ShoppingBag className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">LPG Community Marketplace</h3>
                <p className="text-sm text-muted-foreground">Manage your online shop presence and products</p>
              </div>
            </div>
            <ShopProfileCard />
            <ShopProductsCard />
          </div>
        );

      case 'team':
        return <TeamManagementCard />;

      case 'notifications':
        return (
          <PushNotificationCard
            notifications={notifications}
            onNotificationChange={handleNotificationChange}
          />
        );

      case 'security':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  {t("security")}
                </CardTitle>
                <CardDescription>{t("security_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start h-14" onClick={() => setShowPasswordDialog(true)}>
                  <Lock className="h-5 w-5 mr-3 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{t("change_password")}</p>
                    <p className="text-xs text-muted-foreground">Update your account password</p>
                  </div>
                </Button>
                <Button variant="outline" className="w-full justify-between h-14" disabled>
                  <div className="flex items-center">
                    <Shield className="h-5 w-5 mr-3 text-muted-foreground" />
                    <div className="text-left">
                      <p className="font-medium">{t("two_factor")}</p>
                      <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Coming Soon</Badge>
                </Button>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Danger Zone
                </CardTitle>
                <CardDescription>Irreversible actions. Proceed with caution.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-destructive/30 rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">Delete Account</p>
                    <p className="text-sm text-muted-foreground">Permanently remove your account and data</p>
                  </div>
                  <Button variant="destructive" onClick={handleDeleteAccountRequest}>
                    <UserX className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'advanced':
        return (
          <div className="space-y-6">
            <BackupRestoreCard />
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  {t("data_management")}
                </CardTitle>
                <CardDescription>{t("data_management_desc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full h-16 flex flex-col items-center justify-center gap-2"
                  onClick={handleClearCache}
                >
                  <Trash2 className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm">{t("clear_cache")}</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t("settings")}</h1>
          <p className="text-sm text-muted-foreground">{t("settings_desc")}</p>
        </div>
      </div>

      {/* Mobile Tabs / Desktop Sidebar Layout */}
      <div className="lg:hidden">
        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <ScrollArea className="w-full">
            <TabsList className="w-full justify-start px-1 h-auto flex-nowrap">
              {sections.map(section => (
                <TabsTrigger 
                  key={section.id} 
                  value={section.id}
                  className="flex items-center gap-2 px-3 py-2 shrink-0"
                >
                  {section.icon}
                  <span className="hidden sm:inline">{section.title}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
          <div className="mt-6">
            {renderSectionContent()}
          </div>
        </Tabs>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <Card className="h-fit sticky top-6">
          <CardContent className="p-3 space-y-1">
            {sections.map(section => (
              <SettingsSection
                key={section.id}
                icon={section.icon}
                title={section.title}
                description={section.description}
                active={activeSection === section.id}
                onClick={() => setActiveSection(section.id)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Content */}
        <div className="min-w-0">
          {renderSectionContent()}
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("change_password")}</DialogTitle>
            <DialogDescription>Enter your new password below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>{t("cancel")}</Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation (Non-owner) */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your account and all associated data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletingAccount}
            >
              {deletingAccount && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account with Password (Owner) */}
      <Dialog open={showDeletePasswordDialog} onOpenChange={setShowDeletePasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action is permanent. Enter your password and type DELETE to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-destructive/10 rounded-lg text-sm border border-destructive/20">
              <p className="font-medium text-destructive mb-2">Warning: This will delete:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Your account and profile</li>
                <li>All team members and invites</li>
                <li>Access to the application</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Password</Label>
              <Input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm">Type DELETE to confirm</Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                className="font-mono"
                placeholder="DELETE"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeletePasswordDialog(false);
              setDeletePassword("");
              setDeleteConfirmText("");
            }}>
              {t("cancel")}
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || deleteConfirmText !== 'DELETE' || !deletePassword}
            >
              {deletingAccount && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
