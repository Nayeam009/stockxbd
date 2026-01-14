import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  }, [businessName, businessPhone, businessAddress]);

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

  const getRoleBadgeColor = (role: string) => {
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

  const handleDeleteAccountRequest = () => {
    if (userRole === 'owner') {
      // Owners need password verification
      setShowDeletePasswordDialog(true);
    } else {
      // Non-owners see a simple confirmation
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

      // For owners, verify password first
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

      // Delete user's profile data
      await supabase.from('profiles').delete().eq('user_id', user.id);
      
      // Delete user's role
      await supabase.from('user_roles').delete().eq('user_id', user.id);

      // If owner, delete team memberships
      if (userRole === 'owner') {
        await supabase.from('team_members').delete().eq('owner_id', user.id);
        await supabase.from('team_invites').delete().eq('created_by', user.id);
      }

      // Sign out the user
      await supabase.auth.signOut();
      
      toast({ title: language === 'bn' ? 'অ্যাকাউন্ট মুছে ফেলা হয়েছে' : 'Account deleted successfully' });
      
      // Redirect to home
      window.location.href = '/';
    } catch (error: any) {
      toast({ 
        title: error.message || "Failed to delete account", 
        variant: "destructive" 
      });
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
      setShowDeletePasswordDialog(false);
      setDeletePassword("");
      setDeleteConfirmText("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{t("settings")}</h2>
        <p className="text-muted-foreground">{t("settings_desc")}</p>
      </div>

      {/* User Profile Card - Full Width */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground">{t("profile")}</CardTitle>
          </div>
          <CardDescription>Manage your personal information and account details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                  {getInitials(fullName || userEmail)}
                </AvatarFallback>
              </Avatar>
              <Badge className={`${getRoleBadgeColor(userRole)} px-3 py-1`}>
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </Badge>
            </div>
            
            {/* Profile Form */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Label htmlFor="userEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email
                </Label>
                <Input
                  id="userEmail"
                  value={userEmail}
                  disabled
                  className="bg-muted"
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
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Member Since
                </Label>
                <Input
                  value={userCreatedAt ? new Date(userCreatedAt).toLocaleDateString() : "N/A"}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="md:col-span-2">
                <Button 
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="w-full md:w-auto"
                >
                  {savingProfile ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Profile
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Owner-only Cards Row */}
      {userRole === 'owner' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <ProfileSharingCard />
          <TeamManagementCard />
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
                  className={`h-16 flex flex-col gap-1 relative ${language === "en" ? "bg-primary" : ""}`}
                  onClick={() => setLanguage("en")}
                >
                  <span className="text-lg font-bold">EN</span>
                  <span className="text-xs opacity-80">{t("english")}</span>
                  {language === "en" && <Check className="h-4 w-4 absolute top-2 right-2" />}
                </Button>
                <Button
                  variant={language === "bn" ? "default" : "outline"}
                  className={`h-16 flex flex-col gap-1 relative ${language === "bn" ? "bg-primary" : ""}`}
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

        {/* Push Notifications */}
        <PushNotificationCard
          notifications={notifications}
          onNotificationChange={handleNotificationChange}
        />

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

        {/* Backup & Restore */}
        <BackupRestoreCard />

        {/* Cache & Data Management */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-foreground">{t("data_management")}</CardTitle>
            </div>
            <CardDescription>{t("data_management_desc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              variant="outline" 
              className="w-full h-16 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
              onClick={handleClearCache}
            >
              <Trash2 className="h-5 w-5" />
              <span>{t("clear_cache")}</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Danger Zone - Account Deletion */}
      <Card className="bg-card border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">
              {language === 'bn' ? 'বিপদ অঞ্চল' : 'Danger Zone'}
            </CardTitle>
          </div>
          <CardDescription>
            {language === 'bn' 
              ? 'এই কাজগুলি পূর্বাবস্থায় ফেরানো যাবে না। অনুগ্রহ করে সাবধানে এগিয়ে যান।'
              : 'These actions are irreversible. Please proceed with caution.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-destructive/30 rounded-lg bg-destructive/5">
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                {language === 'bn' ? 'অ্যাকাউন্ট মুছে ফেলুন' : 'Delete Account'}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'bn' 
                  ? 'আপনার অ্যাকাউন্ট এবং সমস্ত ডেটা স্থায়ীভাবে মুছে ফেলুন'
                  : 'Permanently delete your account and all associated data'}
              </p>
            </div>
            <Button 
              variant="destructive"
              onClick={handleDeleteAccountRequest}
              className="shrink-0"
            >
              <UserX className="h-4 w-4 mr-2" />
              {language === 'bn' ? 'অ্যাকাউন্ট মুছুন' : 'Delete Account'}
            </Button>
          </div>
        </CardContent>
      </Card>

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

      {/* Delete Account Confirmation (Non-owner) */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {language === 'bn' ? 'অ্যাকাউন্ট মুছে ফেলবেন?' : 'Delete Account?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'bn'
                ? 'এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। আপনার অ্যাকাউন্ট এবং সমস্ত ডেটা স্থায়ীভাবে মুছে ফেলা হবে।'
                : 'This action cannot be undone. Your account and all associated data will be permanently deleted.'}
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
              {language === 'bn' ? 'হ্যাঁ, মুছুন' : 'Yes, Delete'}
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
              {language === 'bn' ? 'অ্যাকাউন্ট মুছে ফেলুন' : 'Delete Account'}
            </DialogTitle>
            <DialogDescription>
              {language === 'bn'
                ? 'এই কাজটি স্থায়ী এবং পূর্বাবস্থায় ফেরানো যাবে না। নিশ্চিত করতে আপনার পাসওয়ার্ড দিন এবং DELETE লিখুন।'
                : 'This action is permanent and cannot be undone. Enter your password and type DELETE to confirm.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-destructive/10 rounded-lg text-sm text-destructive border border-destructive/20">
              <p className="font-medium mb-2">
                {language === 'bn' ? 'সতর্কতা: এটি নিম্নলিখিতগুলি মুছে ফেলবে:' : 'Warning: This will delete:'}
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>{language === 'bn' ? 'আপনার অ্যাকাউন্ট এবং প্রোফাইল' : 'Your account and profile'}</li>
                <li>{language === 'bn' ? 'সমস্ত টিম সদস্য এবং আমন্ত্রণ' : 'All team members and invites'}</li>
                <li>{language === 'bn' ? 'অ্যাপে অ্যাক্সেস' : 'Access to the application'}</li>
              </ul>
            </div>
            <div>
              <Label htmlFor="deletePassword">
                {language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}
              </Label>
              <Input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="mt-1"
                placeholder={language === 'bn' ? 'আপনার পাসওয়ার্ড দিন' : 'Enter your password'}
              />
            </div>
            <div>
              <Label htmlFor="deleteConfirm">
                {language === 'bn' ? 'নিশ্চিত করতে DELETE লিখুন' : 'Type DELETE to confirm'}
              </Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                className="mt-1 font-mono"
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
              {language === 'bn' ? 'স্থায়ীভাবে মুছুন' : 'Permanently Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};