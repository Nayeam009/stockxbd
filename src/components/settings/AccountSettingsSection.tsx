import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Check
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

export const AccountSettingsSection = () => {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  
  // Profile state
  const [userEmail, setUserEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Load user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        
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

  return (
    <div className="space-y-6">
      {/* Personal Profile */}
      <Card className="border-border/50 shadow-sm bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("profile")}</CardTitle>
              <CardDescription>{t("edit_profile_desc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card className="border-border/50 shadow-sm bg-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10">
              <Palette className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <CardTitle className="text-lg">{t("appearance")}</CardTitle>
              <CardDescription>{t("appearance_desc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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
        </CardContent>
      </Card>
    </div>
  );
};
