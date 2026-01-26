import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Mail, 
  Phone, 
  Camera, 
  Loader2,
  Save,
  Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at: string;
}

export const ProfileModule = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<string>("owner");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
  });

  useEffect(() => {
    const initProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setUserEmail(user.email || "");

        // Fetch user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (roleData) {
          setUserRole(roleData.role);
        }

        // Fetch profile
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (profileData) {
          setProfile(profileData);
          setFormData({
            full_name: profileData.full_name || "",
            phone: profileData.phone || "",
          });
        } else {
          // Create profile if doesn't exist
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              full_name: user.email?.split('@')[0] || 'User',
            })
            .select()
            .single();

          if (!insertError && newProfile) {
            setProfile(newProfile);
            setFormData({
              full_name: newProfile.full_name || "",
              phone: newProfile.phone || "",
            });
          }
        }
      } catch (error: any) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    initProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setUserEmail(user.email || "");

      // Fetch user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleData) {
        setUserRole(roleData.role);
      }

      // Fetch profile
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (profileData) {
        setProfile(profileData);
        setFormData({
          full_name: profileData.full_name || "",
          phone: profileData.phone || "",
        });
      } else {
        // Create profile if doesn't exist
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            full_name: user.email?.split('@')[0] || 'User',
          })
          .select()
          .single();

        if (!insertError && newProfile) {
          setProfile(newProfile);
          setFormData({
            full_name: newProfile.full_name || "",
            phone: newProfile.phone || "",
          });
        }
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast.error(t('error_loading_profile'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim() || null,
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile(prev => prev ? { 
        ...prev, 
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null 
      } : null);

      toast.success(t('profile_updated'));
    } catch (error: any) {
      toast.error(error.message || t('error_updating_profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error(t('invalid_image'));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('image_too_large'));
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      toast.success(t('avatar_updated'));
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || t('error_uploading_avatar'));
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
      case 'manager': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      case 'driver': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-foreground">{t('profile')}</h2>
        <p className="text-muted-foreground">{t('profile_desc')}</p>
      </div>

      {/* Profile Card */}
      <Card className="border-0 shadow-elegant overflow-hidden">
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-r from-primary via-secondary to-accent" />
        
        <CardContent className="relative pt-0 pb-6">
          {/* Avatar */}
          <div className="absolute -top-16 left-6">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={handleAvatarClick}
                disabled={uploading}
                className="absolute bottom-2 right-2 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all group-hover:scale-110"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* User Info */}
          <div className="pt-20 space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-foreground">
                {profile?.full_name || t('unnamed_user')}
              </h3>
              {userRole && (
                <Badge className={`${getRoleBadgeColor(userRole)} capitalize`}>
                  <Shield className="h-3 w-3 mr-1" />
                  {userRole}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              {userEmail}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Form */}
      <Card className="border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {t('edit_profile')}
          </CardTitle>
          <CardDescription>{t('edit_profile_desc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                {t('full_name')}
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder={t('enter_full_name')}
                className="bg-muted/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {t('phone_number')}
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder={t('enter_phone')}
                className="bg-muted/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {t('email')}
            </Label>
            <Input
              id="email"
              value={userEmail}
              disabled
              className="bg-muted/30 text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">{t('email_readonly')}</p>
          </div>

          <Button 
            onClick={handleSaveProfile} 
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {t('save_changes')}
          </Button>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="border-0 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {t('account_info')}
          </CardTitle>
          <CardDescription>{t('account_info_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t('role')}</p>
              <p className="font-medium capitalize">{userRole || t('no_role')}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t('member_since')}</p>
              <p className="font-medium">
                {profile?.created_at 
                  ? new Date(profile.created_at).toLocaleDateString('en-BD', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })
                  : t('unknown')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};