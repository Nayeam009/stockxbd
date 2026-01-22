import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  UserCircle
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
    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all min-h-[56px] ${
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
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState('account');
  
  // Password change state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  
  // User state for role check and account deletion
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<string>("driver");
  
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
          .single();
        
        if (roleData?.role) {
          setUserRole(roleData.role);
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

  // Simplified sections: Account (merged), Notifications, Security, Advanced
  const sections = [
    { id: 'account', icon: <UserCircle className="h-4 w-4" />, title: t('account_settings') || 'Account', description: t('account_settings_desc') || 'Profile, appearance & team' },
    { id: 'notifications', icon: <Bell className="h-4 w-4" />, title: t('notifications'), description: t('notifications_desc') },
    { id: 'security', icon: <Shield className="h-4 w-4" />, title: t('security'), description: t('security_desc') },
    { id: 'advanced', icon: <Zap className="h-4 w-4" />, title: t('data_management') || 'Advanced', description: t('data_management_desc') },
  ];

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'account':
        return <AccountSettingsSection />;

      case 'notifications':
        return (
          <PushNotificationCard
            notifications={notifications}
            onNotificationChange={handleNotificationChange}
          />
        );

      case 'security':
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  {t("security")}
                </CardTitle>
                <CardDescription>{t("security_desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-14" 
                  onClick={() => setShowPasswordDialog(true)}
                >
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
              <CardHeader className="pb-3">
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
                  <Button variant="destructive" onClick={handleDeleteAccountRequest} className="h-11">
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
          <div className="space-y-4">
            <BackupRestoreCard />
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  {t("data_management")}
                </CardTitle>
                <CardDescription>{t("data_management_desc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full h-14 flex items-center justify-center gap-3"
                  onClick={handleClearCache}
                >
                  <Trash2 className="h-5 w-5 text-muted-foreground" />
                  <span>{t("clear_cache")}</span>
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">{t("settings")}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">{t("settings_desc")}</p>
        </div>
      </div>

      {/* Mobile Tabs Layout */}
      <div className="lg:hidden">
        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <ScrollArea className="w-full">
            <TabsList className="w-full justify-start px-1 h-12 flex-nowrap bg-muted/50">
              {sections.map(section => (
                <TabsTrigger 
                  key={section.id} 
                  value={section.id}
                  className="flex items-center gap-2 px-3 py-2 shrink-0 min-h-[44px] data-[state=active]:bg-background"
                >
                  {section.icon}
                  <span className="text-sm">{section.title.split(' ')[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>
          <div className="mt-4">
            {renderSectionContent()}
          </div>
        </Tabs>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:grid lg:grid-cols-[260px_1fr] gap-6">
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
                className="h-11"
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
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>{t("cancel")}</Button>
            <Button onClick={handleChangePassword} disabled={changingPassword} className="h-11">
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
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deleteConfirm">Type DELETE to confirm</Label>
              <Input
                id="deleteConfirm"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                className="font-mono h-11"
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
              className="h-11"
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
