import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  QrCode
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
  const [userRole, setUserRole] = useState<string>("customer");
  const [fullName, setFullName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  
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
        
        // Fetch role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (roleData?.role) {
          setUserRole(roleData.role);
        }
        
        // Fetch profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profileData) {
          setFullName(profileData.full_name || "");
          setUserPhone(profileData.phone || "");
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

  return (
    <div className="space-y-4">
      <Accordion
        type="multiple" 
        defaultValue={["profile", "appearance"]} 
        className="space-y-3"
      >
        {/* Personal Profile Section */}
        <AccordionItem value="profile" className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">{t("profile")}</p>
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
                    className="h-11 text-base"
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
                    className="h-11 text-base"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userEmail" className="flex items-center gap-2 text-sm">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("email")}
                </Label>
                <Input id="userEmail" value={userEmail} disabled className="bg-muted/50 h-11 text-base" />
                <p className="text-xs text-muted-foreground">{t("email_readonly")}</p>
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full h-11 text-base">
                {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {t("save_changes")}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Appearance Section */}
        <AccordionItem value="appearance" className="border rounded-xl bg-card overflow-hidden shadow-sm">
          <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10">
                <Palette className="h-5 w-5 text-violet-500" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm">{t("appearance")}</p>
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

        {/* Business Info Section - Owner only */}
        {isOwner && (
          <AccordionItem value="business" className="border rounded-xl bg-card overflow-hidden shadow-sm">
            <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10">
                  <Building2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">{t("business_info")}</p>
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
                    className="h-11 text-base"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessPhone" className="text-sm">{t("phone_number")}</Label>
                    <Input
                      id="businessPhone"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessAddress" className="text-sm">{t("address")}</Label>
                    <Input
                      id="businessAddress"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      className="h-11 text-base"
                    />
                  </div>
                </div>
                <Button onClick={handleSaveBusinessSettings} disabled={savingBusiness} className="w-full h-11 text-base">
                  {savingBusiness ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {t("save_changes")}
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Manager Invite Section - Owner only */}
        {isOwner && (
          <AccordionItem value="invite" className="border rounded-xl bg-card overflow-hidden shadow-sm">
            <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10">
                  <QrCode className="h-5 w-5 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">
                    {language === 'bn' ? 'ম্যানেজার আমন্ত্রণ' : 'Manager Invite'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'bn' ? 'QR কোড বা লিঙ্ক দিয়ে ম্যানেজার যোগ করুন' : 'Add managers via QR code or link'}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <ProfileSharingCard />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Team Management Section - Owner only */}
        {isOwner && (
          <AccordionItem value="team" className="border rounded-xl bg-card overflow-hidden shadow-sm">
            <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-muted/50 [&[data-state=open]]:bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10">
                  <Users className="h-5 w-5 text-orange-500" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">{t("team_management")}</p>
                  <p className="text-xs text-muted-foreground">{t("team_management_desc")}</p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              <TeamManagementCard />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
};
