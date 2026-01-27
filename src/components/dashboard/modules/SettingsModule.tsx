import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings,
  Shield,
  Trash2,
  Loader2,
  Lock,
  AlertTriangle,
  UserX,
  Zap,
  Database,
  Bell,
  ChevronRight,
  UserCircle,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  HardDrive,
  Download,
  Upload
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
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
import { BackupRestoreCard } from "@/components/settings/BackupRestoreCard";
import { PushNotificationCard } from "@/components/settings/PushNotificationCard";
import { AccountSettingsSection } from "@/components/settings/AccountSettingsSection";
import { TeamSettingsSection } from "@/components/settings/TeamSettingsSection";
import { PrinterSettingsSection } from "@/components/settings/PrinterSettingsSection";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface SettingsSectionProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  active?: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
}

const SettingsSection = ({ icon, title, description, active, onClick, badge }: SettingsSectionProps) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 p-4 rounded-xl text-left transition-all min-h-[64px] touch-target",
      active
        ? 'bg-primary/10 border-l-4 border-primary shadow-sm'
        : 'hover:bg-muted/60 text-foreground border-l-4 border-transparent'
    )}
  >
    <div className={cn(
      "p-2.5 rounded-xl shrink-0 transition-colors",
      active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
    )}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className={cn("font-semibold text-sm truncate", active && "text-primary")}>{title}</p>
        {badge}
      </div>
      {description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>}
    </div>
    <ChevronRight className={cn(
      "h-5 w-5 shrink-0 transition-transform",
      active ? 'text-primary translate-x-0.5' : 'text-muted-foreground'
    )} />
  </button>
);

export const SettingsModule = () => {
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();
  const [activeSection, setActiveSection] = useState('account');
  const [isMobileDetailView, setIsMobileDetailView] = useState(false);

  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // User state for role check and account deletion
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState<string>("owner");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Account deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeletePasswordDialog, setShowDeletePasswordDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Notification settings
  const [notifications, setNotifications] = useState({
    lowStock: true,
    newOrders: true,
    payments: true,
    dailyReports: false
  });

  // Load user role for security features
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");

        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (roleData) {
          setUserRole(roleData.role);
        }

        // Fetch profile for name and avatar
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData) {
          setUserName(profileData.full_name || user.email?.split('@')[0] || 'User');
          setAvatarUrl(profileData.avatar_url);
        } else {
          setUserName(user.email?.split('@')[0] || 'User');
        }
      }
    };

    fetchUserRole();
  }, []);

  // Load notification settings from localStorage
  useEffect(() => {
    const savedNotifications = localStorage.getItem("notification-settings");
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
  }, []);

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
    if (!newPassword || !confirmPassword) {
      toast({ title: language === 'bn' ? 'উভয় পাসওয়ার্ড ফিল্ড পূরণ করুন' : "Please fill in both password fields", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: language === 'bn' ? 'পাসওয়ার্ড মিলছে না' : "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: language === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) throw error;

      toast({ title: language === 'bn' ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে' : "Password changed successfully" });
      setShowPasswordDialog(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: language === 'bn' ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ' : "Failed to change password",
        description: error.message || "Please try again",
        variant: "destructive"
      });
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
      toast({ title: language === 'bn' ? 'নিশ্চিত করতে DELETE টাইপ করুন' : "Please type DELETE to confirm", variant: "destructive" });
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
          toast({ title: language === 'bn' ? 'ভুল পাসওয়ার্ড' : "Incorrect password", variant: "destructive" });
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
      toast({ title: language === 'bn' ? 'অ্যাকাউন্ট সফলভাবে মুছে ফেলা হয়েছে' : 'Account deleted successfully' });
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

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId);
    if (isMobile) {
      setIsMobileDetailView(true);
    }
  };

  const handleBackToList = () => {
    setIsMobileDetailView(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      owner: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-md',
      manager: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 shadow-md',
      customer: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-md'
    };
    const labels: Record<string, Record<string, string>> = {
      owner: { en: 'Owner', bn: 'মালিক' },
      manager: { en: 'Manager', bn: 'ম্যানেজার' },
      customer: { en: 'Customer', bn: 'গ্রাহক' }
    };
    return (
      <Badge className={cn("text-xs font-semibold", styles[role] || 'bg-muted')}>
        {labels[role]?.[language] || role}
      </Badge>
    );
  };

  const sections = [
    {
      id: 'account',
      icon: <UserCircle className="h-5 w-5" />,
      title: language === 'bn' ? 'অ্যাকাউন্ট' : 'Account',
      description: language === 'bn' ? 'প্রোফাইল ও থিম' : 'Profile & theme',
      ownerOnly: false
    },
    {
      id: 'team',
      icon: <Settings className="h-5 w-5" />,
      title: language === 'bn' ? 'টিম ও ব্যবসা' : 'Team & Business',
      description: language === 'bn' ? 'ম্যানেজার ও ব্যবসা' : 'Managers & business',
      ownerOnly: true
    },
    {
      id: 'notifications',
      icon: <Bell className="h-5 w-5" />,
      title: language === 'bn' ? 'বিজ্ঞপ্তি' : 'Notifications',
      description: language === 'bn' ? 'অ্যালার্ট সেটিংস' : 'Alert preferences',
      ownerOnly: false
    },
    {
      id: 'security',
      icon: <Shield className="h-5 w-5" />,
      title: language === 'bn' ? 'নিরাপত্তা' : 'Security',
      description: language === 'bn' ? 'পাসওয়ার্ড ও অ্যাকাউন্ট' : 'Password & account',
      ownerOnly: false
    },
    {
      id: 'advanced',
      icon: <Zap className="h-5 w-5" />,
      title: language === 'bn' ? 'উন্নত' : 'Advanced',
      description: language === 'bn' ? 'ব্যাকআপ ও ডেটা' : 'Backup & data',
      ownerOnly: false
    },
    {
      id: 'printer',
      icon: <Settings className="h-5 w-5" />,
      title: language === 'bn' ? 'প্রিন্টার' : 'Printer',
      description: language === 'bn' ? 'রসিদ প্রিন্টিং' : 'Receipt printing',
      ownerOnly: false
    },
  ];

  // Filter sections based on role
  const visibleSections = sections.filter(s => !s.ownerOnly || userRole === 'owner');

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSettingsSection />;

      case 'team':
        return <TeamSettingsSection />;

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
            {/* Security Settings Card */}
            <Card className="border-border/50 shadow-sm bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {language === 'bn' ? 'নিরাপত্তা সেটিংস' : 'Security Settings'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'bn' ? 'আপনার অ্যাকাউন্ট সুরক্ষিত রাখুন' : 'Keep your account secure'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Change Password */}
                <button
                  onClick={() => setShowPasswordDialog(true)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border/50 hover:bg-muted/50 hover:border-primary/30 transition-all group"
                >
                  <div className="p-2.5 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    <Lock className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-foreground">
                      {language === 'bn' ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {language === 'bn' ? 'আপনার অ্যাকাউন্ট পাসওয়ার্ড আপডেট করুন' : 'Update your account password'}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>

                {/* Two-Factor Auth - Coming Soon */}
                <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-muted/30 opacity-60">
                  <div className="p-2.5 rounded-lg bg-muted">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-muted-foreground">
                      {language === 'bn' ? 'দুই-ধাপ যাচাইকরণ' : 'Two-Factor Auth'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {language === 'bn' ? 'অতিরিক্ত নিরাপত্তা যোগ করুন' : 'Add extra security layer'}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
                    {language === 'bn' ? 'শীঘ্রই আসছে' : 'Coming Soon'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-destructive">
                      {language === 'bn' ? 'ঝুঁকিপূর্ণ এলাকা' : 'Danger Zone'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'bn' ? 'অপরিবর্তনীয় কার্যক্রম। সতর্কতার সাথে এগিয়ে যান।' : 'Irreversible actions. Proceed with caution.'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-destructive/20 rounded-xl bg-background/80">
                  <div>
                    <p className="font-medium text-foreground">
                      {language === 'bn' ? 'অ্যাকাউন্ট মুছে ফেলুন' : 'Delete Account'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {language === 'bn' ? 'স্থায়ীভাবে আপনার অ্যাকাউন্ট ও ডেটা মুছুন' : 'Permanently remove your account and data'}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccountRequest}
                    className="h-11 min-w-[160px] gap-2 shadow-md"
                  >
                    <UserX className="h-4 w-4" />
                    {language === 'bn' ? 'অ্যাকাউন্ট মুছুন' : 'Delete Account'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'advanced':
        return (
          <div className="space-y-6">
            {/* Backup & Restore Card */}
            <Card className="border-border/50 shadow-sm bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <HardDrive className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {language === 'bn' ? 'ব্যাকআপ ও রিস্টোর' : 'Backup & Restore'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'bn'
                        ? 'আপনার ব্যবসায়িক ডেটা সুরক্ষিতভাবে সংরক্ষণ করুন'
                        : 'Securely save your business data and restore when needed'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <BackupRestoreCard />
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card className="border-border/50 shadow-sm bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Database className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {language === 'bn' ? 'ডেটা ম্যানেজমেন্ট' : 'Data Management'}
                    </CardTitle>
                    <CardDescription>
                      {language === 'bn' ? 'ক্যাশ ও স্থানীয় ডেটা পরিচালনা' : 'Manage cache and local data'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full h-14 flex items-center justify-center gap-3 hover:bg-destructive/5 hover:border-destructive/30 hover:text-destructive transition-all"
                  onClick={handleClearCache}
                >
                  <Trash2 className="h-5 w-5" />
                  <span className="font-medium">{language === 'bn' ? 'ক্যাশ পরিষ্কার করুন' : 'Clear Cache'}</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        );



      case 'printer':
        return <PrinterSettingsSection />;

      default:
        return null;
    }
  };

  // Profile Header Component
  const ProfileHeader = ({ compact = false }: { compact?: boolean }) => (
    <Card className="border-border/50 shadow-sm overflow-hidden bg-card">
      <div className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className={cn(
            "border-2 border-primary/20 shadow-lg ring-4 ring-primary/5",
            compact ? "h-14 w-14" : "h-16 w-16"
          )}>
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-lg font-bold">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className={cn("font-bold text-foreground truncate", compact ? "text-base" : "text-lg")}>
              {userName}
            </h2>
            <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
            <div className="mt-2">
              {getRoleBadge(userRole)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  // Section Header Component
  const SectionHeader = ({ section }: { section: typeof sections[0] }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2.5 rounded-xl bg-primary/10">
        {section.icon}
      </div>
      <div>
        <h1 className="font-bold text-xl text-foreground">{section.title}</h1>
        <p className="text-sm text-muted-foreground">{section.description}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Mobile Layout */}
      <div className="lg:hidden">
        {!isMobileDetailView ? (
          // Mobile List View
          <div className="space-y-4 animate-fade-in">
            <ProfileHeader />

            {/* Settings Navigation */}
            <Card className="border-border/50 shadow-sm bg-card">
              <CardContent className="p-3 space-y-1">
                {visibleSections.map(section => (
                  <SettingsSection
                    key={section.id}
                    icon={section.icon}
                    title={section.title}
                    description={section.description}
                    active={activeSection === section.id}
                    onClick={() => handleSectionClick(section.id)}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        ) : (
          // Mobile Detail View
          <div className="space-y-4 animate-fade-in">
            {/* Back Button */}
            <Button
              variant="ghost"
              onClick={handleBackToList}
              className="h-12 px-4 -ml-2 hover:bg-muted/50 gap-2"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>{language === 'bn' ? 'সেটিংস' : 'Settings'}</span>
            </Button>

            {/* Section Header */}
            <SectionHeader section={visibleSections.find(s => s.id === activeSection)!} />

            {/* Content */}
            {renderSectionContent()}
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block">
        <div className="grid lg:grid-cols-[340px_1fr] gap-6">
          {/* Sidebar */}
          <div className="space-y-4">
            <ProfileHeader compact />

            {/* Navigation */}
            <Card className="sticky top-6 border-border/50 shadow-sm bg-card">
              <CardContent className="p-3 space-y-1">
                {visibleSections.map(section => (
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
          </div>

          {/* Content */}
          <div className="min-w-0">
            <SectionHeader section={visibleSections.find(s => s.id === activeSection)!} />
            {renderSectionContent()}
          </div>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              {language === 'bn' ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
            </DialogTitle>
            <DialogDescription>
              {language === 'bn' ? 'নতুন পাসওয়ার্ড দিন।' : 'Enter your new password below.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">
                {language === 'bn' ? 'নতুন পাসওয়ার্ড' : 'New Password'}
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={language === 'bn' ? 'নতুন পাসওয়ার্ড লিখুন' : 'Enter new password'}
                  className="h-12 pr-10 text-base"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">
                {language === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={language === 'bn' ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm new password'}
                  className="h-12 pr-10 text-base"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {newPassword && confirmPassword && (
              <div className={cn(
                "flex items-center gap-2 text-sm p-3 rounded-lg",
                newPassword === confirmPassword
                  ? "bg-green-500/10 text-green-600"
                  : "bg-destructive/10 text-destructive"
              )}>
                {newPassword === confirmPassword ? (
                  <>
                    <Check className="h-4 w-4" />
                    {language === 'bn' ? 'পাসওয়ার্ড মিলেছে' : 'Passwords match'}
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    {language === 'bn' ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match'}
                  </>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setNewPassword("");
                setConfirmPassword("");
              }}
              className="h-11"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="h-11"
            >
              {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save'}
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
                ? 'এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না। আপনার অ্যাকাউন্ট এবং সমস্ত সম্পর্কিত ডেটা স্থায়ীভাবে মুছে ফেলা হবে।'
                : 'This action cannot be undone. Your account and all associated data will be permanently deleted.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">{language === 'bn' ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-11"
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {language === 'bn' ? 'অ্যাকাউন্ট মুছে ফেলুন' : 'Delete Account'}
            </DialogTitle>
            <DialogDescription>
              {language === 'bn'
                ? 'এই কাজটি স্থায়ী। আপনার পাসওয়ার্ড দিন এবং নিশ্চিত করতে DELETE টাইপ করুন।'
                : 'This action is permanent. Enter your password and type DELETE to confirm.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-destructive/10 rounded-xl text-sm border border-destructive/20">
              <p className="font-medium text-destructive mb-2">
                {language === 'bn' ? 'সতর্কতা: এটি মুছে ফেলবে:' : 'Warning: This will delete:'}
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>{language === 'bn' ? 'আপনার অ্যাকাউন্ট এবং প্রোফাইল' : 'Your account and profile'}</li>
                <li>{language === 'bn' ? 'সমস্ত টিম সদস্য এবং আমন্ত্রণ' : 'All team members and invites'}</li>
                <li>{language === 'bn' ? 'অ্যাপ্লিকেশনে অ্যাক্সেস' : 'Access to the application'}</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deletePassword">{language === 'bn' ? 'পাসওয়ার্ড' : 'Password'}</Label>
              <Input
                id="deletePassword"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder={language === 'bn' ? 'আপনার পাসওয়ার্ড লিখুন' : 'Enter your password'}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm">
                {language === 'bn' ? 'নিশ্চিত করতে DELETE টাইপ করুন' : 'Type DELETE to confirm'}
              </Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                className="font-mono h-12 text-base"
                placeholder="DELETE"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeletePasswordDialog(false);
                setDeletePassword("");
                setDeleteConfirmText("");
              }}
              className="h-11"
            >
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || deleteConfirmText !== 'DELETE' || !deletePassword}
              className="h-11"
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
