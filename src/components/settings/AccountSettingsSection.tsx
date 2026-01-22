import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  User, 
  Phone, 
  Mail, 
  Save, 
  Loader2, 
  Palette, 
  Globe,
  Sun,
  Moon,
  Check,
  Building2,
  Users,
  Camera
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { TeamManagementCard } from "./TeamManagementCard";
import { ProfileSharingCard } from "./ProfileSharingCard";

export const AccountSettingsSection = () => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
  // Profile state
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<string>("driver");
  const [userCreatedAt, setUserCreatedAt] = useState("");
  const [fullName, setFullName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Business state
  const [businessName, setBusinessName] = useState("Stock-X LPG Distribution");
  const [businessPhone, setBusinessPhone] = useState("+880 1XXX-XXXXXX");
  const [businessAddress, setBusinessAddress] = useState("Dhaka, Bangladesh");
  const [savingBusiness, setSavingBusiness] = useState(false);

  const isOwner = userRole === 'owner';

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

  // Load business settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("business-settings");
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      setBusinessName(parsed.businessName || businessName);
      setBusinessPhone(parsed.businessPhone || businessPhone);
      setBusinessAddress(parsed.businessAddress || businessAddress);
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
      toast({ title: t("profile_updated") });
    } catch (error: any) {
      toast({ title: error.message || t("error_updating_profile"), variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveBusinessSettings = async () => {
    setSavingBusiness(true);
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
      setSavingBusiness(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: t("invalid_image"), variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("image_too_large"), variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({ title: t("avatar_updated") });
    } catch (error: any) {
      toast({ title: error.message || t("error_uploading_avatar"), variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
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

  return (
    <div className="space-y-4">
      {/* Profile Header Card */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="h-16 sm:h-20 bg-gradient-to-r from-primary via-primary/80 to-secondary" />
        <CardContent className="relative pt-0 -mt-10 sm:-mt-12 pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-4">
            {/* Avatar with Upload */}
            <div className="relative">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-xl">
                <AvatarImage src={avatarUrl || undefined} alt={fullName} />
                <AvatarFallback className="text-xl sm:text-2xl font-bold bg-gradient-to-br from-primary to-secondary text-primary-foreground">
                  {getInitials(fullName || userEmail)}
                </AvatarFallback>
              </Avatar>
              <label 
                className="absolute bottom-0 right-0 p-1.5 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors shadow-lg"
                htmlFor="avatar-upload"
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-3.5 w-3.5 text-primary-foreground animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5 text-primary-foreground" />
                )}
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
                disabled={uploadingAvatar}
              />
            </div>
            
            {/* User Info */}
            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-foreground">{fullName || 'User'}</h2>
                <Badge className={`${getRoleBadgeStyle(userRole)} px-2.5 py-0.5 text-xs`}>
                  {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
              <p className="text-xs text-muted-foreground">
                {t("member_since")} {userCreatedAt ? new Date(userCreatedAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accordion Sections */}
      <Accordion 
        type="multiple" 
        defaultValue={["profile", "appearance"]} 
        className="space-y-3"
      >
        {/* Personal Profile Section */}
        <AccordionItem value="profile" className="border rounded-lg bg-card overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{t("profile")}</p>
                <p className="text-xs text-muted-foreground">{t("edit_profile_desc")}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 pt-2">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("full_name")}
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("enter_full_name")}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userPhone" className="flex items-center gap-2 text-sm">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {t("phone_number")}
                  </Label>
                  <Input
                    id="userPhone"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder={t("enter_phone")}
                    className="h-11"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userEmail" className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("email")}
                </Label>
                <Input id="userEmail" value={userEmail} disabled className="bg-muted/50 h-11" />
                <p className="text-xs text-muted-foreground">{t("email_readonly")}</p>
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full h-11">
                {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {t("save_changes")}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Appearance Section */}
        <AccordionItem value="appearance" className="border rounded-lg bg-card overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-secondary/20">
                <Palette className="h-4 w-4 text-secondary-foreground" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{t("appearance")}</p>
                <p className="text-xs text-muted-foreground">{t("appearance_desc")}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 pt-2">
              {/* Language */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("language")}
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={language === "en" ? "default" : "outline"}
                    className={`h-12 flex items-center justify-center gap-2 relative ${language === "en" ? "ring-2 ring-primary ring-offset-2" : ""}`}
                    onClick={() => setLanguage("en")}
                  >
                    <span className="text-base font-bold">EN</span>
                    <span className="text-xs opacity-80">{t("english")}</span>
                    {language === "en" && <Check className="h-3.5 w-3.5 absolute top-1.5 right-1.5" />}
                  </Button>
                  <Button
                    variant={language === "bn" ? "default" : "outline"}
                    className={`h-12 flex items-center justify-center gap-2 relative ${language === "bn" ? "ring-2 ring-primary ring-offset-2" : ""}`}
                    onClick={() => setLanguage("bn")}
                  >
                    <span className="text-base font-bold">বাং</span>
                    <span className="text-xs opacity-80">{t("bangla")}</span>
                    {language === "bn" && <Check className="h-3.5 w-3.5 absolute top-1.5 right-1.5" />}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Theme */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                  Theme
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    className={`h-12 flex items-center justify-center gap-2 ${theme === "light" ? "ring-2 ring-primary ring-offset-2" : ""}`}
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-4 w-4" />
                    <span className="text-sm">Light</span>
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    className={`h-12 flex items-center justify-center gap-2 ${theme === "dark" ? "ring-2 ring-primary ring-offset-2" : ""}`}
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-4 w-4" />
                    <span className="text-sm">{t("dark_mode")}</span>
                  </Button>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Business Info Section */}
        <AccordionItem value="business" className="border rounded-lg bg-card overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent">
                <Building2 className="h-4 w-4 text-accent-foreground" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{t("business_info")}</p>
                <p className="text-xs text-muted-foreground">{t("business_info_desc")}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-sm">{t("business_name")}</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessPhone" className="text-sm">{t("phone_number")}</Label>
                  <Input
                    id="businessPhone"
                    value={businessPhone}
                    onChange={(e) => setBusinessPhone(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessAddress" className="text-sm">{t("address")}</Label>
                  <Input
                    id="businessAddress"
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>
              <Button onClick={handleSaveBusinessSettings} disabled={savingBusiness} className="w-full h-11">
                {savingBusiness ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {t("save_changes")}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Team Management Section (Owner only) */}
        {isOwner && (
          <AccordionItem value="team" className="border rounded-lg bg-card overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{t("team_management")}</p>
                <p className="text-xs text-muted-foreground">{t("team_management_desc")}</p>
              </div>
            </div>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <div className="border-t">
                <TeamManagementCard />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Profile Sharing Section (Owner only) */}
        {isOwner && (
          <AccordionItem value="sharing" className="border rounded-lg bg-card overflow-hidden">
          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-sm">{t("profile_sharing") || "Profile Sharing"}</p>
                <p className="text-xs text-muted-foreground">{t("profile_sharing_desc") || "Share your profile with others"}</p>
              </div>
            </div>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <div className="border-t">
                <ProfileSharingCard />
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
};
