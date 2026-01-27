import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  QrCode,
  Users,
  Copy,
  Check,
  Loader2,
  Shield,
  Trash2,
  RefreshCw,
  Link2,
  Building2,
  Save,
  UserMinus,
  Clock,
  XCircle,
  AlertTriangle,
  Store,
  Camera,
  Upload,
  MapPin,
  Phone,
  Globe
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { QRCodeSVG } from "qrcode.react";
import { generateSecureInviteCode } from "@/lib/validationSchemas";
import { logger } from "@/lib/logger";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  member_user_id: string;
  member_email: string;
  role: 'manager';
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
  };
}

interface ShopProfile {
  id: string;
  owner_id: string;
  shop_name: string;
  cover_image_url: string | null;
  is_open: boolean;
  total_orders: number;
  rating: number;
  phone: string | null;
  address: string | null;
  division: string;
  district: string;
}

interface PendingInvite {
  id: string;
  code: string;
  role: 'manager';
  expires_at: string;
  created_at: string;
}

export const TeamSettingsSection = () => {
  const { t, language } = useLanguage();

  // User state
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Invite state
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  // Team state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [inviteToRevoke, setInviteToRevoke] = useState<PendingInvite | null>(null);

  // Business state
  // Business/Shop state
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const [shopName, setShopName] = useState("Stock-X LPG Distribution");
  const [shopPhone, setShopPhone] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopDivision, setShopDivision] = useState("Dhaka");
  const [shopDistrict, setShopDistrict] = useState("Dhaka");
  const [shopIsOpen, setShopIsOpen] = useState(true);
  const [shopLogo, setShopLogo] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);

  const isOwner = userRole === 'owner';

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (roleData) {
          setUserRole(roleData.role);
        }
      }
      setLoading(false);
    };
    checkUserRole();
  }, []);

  // Load business settings
  // Fetch Shop Profile
  useEffect(() => {
    const fetchShopProfile = async () => {
      if (!currentUserId || !isOwner) return;

      try {
        const { data, error } = await supabase
          .from('shop_profiles')
          .select('*')
          .eq('owner_id', currentUserId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setShopProfile(data as ShopProfile);
          setShopName(data.shop_name);
          setShopPhone(data.phone || "");
          setShopAddress(data.address || "");
          setShopDivision(data.division || "Dhaka");
          setShopDistrict(data.district || "Dhaka");
          setShopIsOpen(data.is_open);
          setShopLogo(data.cover_image_url);
        }
      } catch (err) {
        logger.error("Error fetching shop profile", err);
      }
    };

    fetchShopProfile();
  }, [currentUserId, isOwner]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploadingLogo(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `shop-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars') // Using avatars bucket for now
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setShopLogo(publicUrl);
      toast({ title: t("image_uploaded") });
    } catch (error: any) {
      toast({
        title: "Error uploading logo",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  // Fetch team data when user is owner
  const fetchTeamMembers = useCallback(async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from('team_members')
      .select('id, member_user_id, member_email, role, created_at')
      .eq('owner_id', currentUserId)
      .eq('role', 'manager')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching team members', error, { component: 'TeamSettingsSection' });
      return;
    }

    // Fetch profiles for team members
    const membersWithProfiles = await Promise.all(
      (data || []).map(async (member) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, phone')
          .eq('user_id', member.member_user_id)
          .maybeSingle();

        return {
          ...member,
          role: 'manager' as const,
          profile: profileData || undefined
        };
      })
    );

    setTeamMembers(membersWithProfiles);
  }, [currentUserId]);

  const fetchPendingInvites = useCallback(async () => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from('team_invites')
      .select('*')
      .eq('created_by', currentUserId)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching pending invites', error, { component: 'TeamSettingsSection' });
      return;
    }

    const managerInvites = (data || [])
      .filter(invite => invite.role === 'manager')
      .map(invite => ({
        id: invite.id,
        code: invite.code,
        role: 'manager' as const,
        expires_at: invite.expires_at,
        created_at: invite.created_at
      }));

    setPendingInvites(managerInvites);
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId && isOwner) {
      fetchTeamMembers();
      fetchPendingInvites();
    }
  }, [currentUserId, isOwner, fetchTeamMembers, fetchPendingInvites]);

  const generateInviteCode = async () => {
    setGeneratingInvite(true);

    try {
      const code = generateSecureInviteCode();

      const { error } = await supabase
        .from('team_invites')
        .insert({
          code,
          role: 'manager',
          created_by: currentUserId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        });

      if (error) {
        logger.error('Error creating invite', error, { component: 'TeamSettingsSection' });
        toast({
          title: language === 'bn' ? 'ত্রুটি হয়েছে' : 'Error creating invite',
          variant: 'destructive'
        });
        setGeneratingInvite(false);
        return;
      }

      const link = `${window.location.origin}/auth?invite=${code}&role=manager`;
      setInviteCode(code);
      setInviteLink(link);
      setShowQRDialog(true);
      fetchPendingInvites();

      toast({
        title: language === 'bn' ? 'আমন্ত্রণ তৈরি হয়েছে!' : 'Invite created!',
        description: language === 'bn' ? 'QR কোড বা লিঙ্ক শেয়ার করুন' : 'Share the QR code or link'
      });
    } catch (err) {
      logger.error('Error generating invite', err, { component: 'TeamSettingsSection' });
      toast({
        title: language === 'bn' ? 'ত্রুটি হয়েছে' : 'Error creating invite',
        variant: 'destructive'
      });
    }

    setGeneratingInvite(false);
  };

  const copyInviteLink = async () => {
    const link = inviteLink || `${window.location.origin}/auth?invite=${inviteCode}&role=manager`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: language === 'bn' ? 'লিঙ্ক কপি হয়েছে!' : 'Invite link copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    setRemovingMember(memberToRemove.id);
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberToRemove.id);

      if (error) throw error;

      toast({ title: language === 'bn' ? 'সদস্য সরানো হয়েছে' : 'Member removed' });
      fetchTeamMembers();
    } catch (error: any) {
      toast({ title: error.message || "Error removing member", variant: "destructive" });
    } finally {
      setRemovingMember(null);
      setMemberToRemove(null);
    }
  };

  const handleRevokeInvite = async () => {
    if (!inviteToRevoke) return;

    try {
      const { error } = await supabase
        .from('team_invites')
        .delete()
        .eq('id', inviteToRevoke.id);

      if (error) throw error;

      toast({ title: language === 'bn' ? 'আমন্ত্রণ বাতিল হয়েছে' : 'Invite revoked' });
      fetchPendingInvites();
    } catch (error: any) {
      toast({ title: error.message || "Error revoking invite", variant: "destructive" });
    } finally {
      setInviteToRevoke(null);
    }
  };

  const handleSaveBusinessSettings = async () => {
    setSavingBusiness(true);
    try {
      const { error } = await supabase
        .from('shop_profiles')
        .upsert({
          owner_id: currentUserId,
          shop_name: shopName,
          phone: shopPhone,
          address: shopAddress,
          division: shopDivision,
          district: shopDistrict,
          cover_image_url: shopLogo,
          is_open: shopIsOpen,
          updated_at: new Date().toISOString()
        }, { onConflict: 'owner_id' });

      if (error) throw error;

      toast({ title: t("settings_saved"), description: "Shop profile updated successfully on Marketplace." });

      // Refresh local state logic if needed
      const { data } = await supabase.from('shop_profiles').select('*').eq('owner_id', currentUserId).maybeSingle();
      if (data) setShopProfile(data as ShopProfile);

    } catch (error: any) {
      logger.error("Error saving shop profile", error);
      toast({ title: "Error saving settings", description: error.message, variant: "destructive" });
    } finally {
      setSavingBusiness(false);
    }
  };

  const getInitials = (name: string | null | undefined, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardContent className="py-8 text-center">
          <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">
            {language === 'bn' ? 'শুধুমাত্র মালিকরা টিম পরিচালনা করতে পারেন' : 'Only owners can manage teams'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Shop Profile Settings */}
        <Card className="border-border/50 shadow-sm bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10">
                  <Store className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {language === 'bn' ? 'শপ প্রোফাইল' : 'Shop Profile'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'bn' ? 'অনলাইন মার্কেটপ্লেসে আপনার দোকান' : 'Manage your online shop presence'}
                  </CardDescription>
                </div>
              </div>
              {/* Open/Close Toggle */}
              <div className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg border">
                <span className={cn("text-xs font-medium", shopIsOpen ? "text-emerald-600" : "text-muted-foreground")}>
                  {shopIsOpen ? (language === 'bn' ? 'খোলা' : 'OPEN') : (language === 'bn' ? 'বন্ধ' : 'CLOSED')}
                </span>
                <Switch checked={shopIsOpen} onCheckedChange={setShopIsOpen} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Upload */}
            <div className="flex flex-col items-center sm:flex-row gap-6">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-muted/30 shadow-sm">
                  <AvatarImage src={shopLogo || undefined} className="object-cover" />
                  <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                    {getInitials(shopName, "")}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="logo-upload"
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-lg cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                  />
                </label>
              </div>
              <div className="flex-1 space-y-1 text-center sm:text-left">
                <h3 className="font-medium text-foreground">{shopName || "New Shop"}</h3>
                <p className="text-sm text-muted-foreground">
                  {language === 'bn'
                    ? 'আপনার দোকানের লোগো আপলোড করুন। এটি গ্রাহকদের কাছে দৃশ্যমান হবে।'
                    : 'Upload your shop logo. This will be visible to customers on the marketplace.'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shopName" className="text-sm">{t("business_name")}</Label>
                <Input
                  id="shopName"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="h-11 text-base"
                  placeholder="e.g. Stock-X LPG"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shopPhone" className="text-sm flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    {t("phone_number")}
                  </Label>
                  <Input
                    id="shopPhone"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    className="h-11 text-base"
                    placeholder="+880 1..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopAddress" className="text-sm flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    {t("address")}
                  </Label>
                  <Input
                    id="shopAddress"
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    className="h-11 text-base"
                    placeholder="Full Address"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shopDivision" className="text-sm">{t("division") || "Division"}</Label>
                  <Input
                    id="shopDivision"
                    value={shopDivision}
                    onChange={(e) => setShopDivision(e.target.value)}
                    className="h-11 text-base"
                    placeholder="Division"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopDistrict" className="text-sm">{t("district") || "District"}</Label>
                  <Input
                    id="shopDistrict"
                    value={shopDistrict}
                    onChange={(e) => setShopDistrict(e.target.value)}
                    className="h-11 text-base"
                    placeholder="District"
                  />
                </div>
              </div>

              <Button onClick={handleSaveBusinessSettings} disabled={savingBusiness} className="w-full h-11 text-base">
                {savingBusiness ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {t("save_changes")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Manager Invite */}
        <Card className="border-border/50 shadow-sm bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10">
                <QrCode className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {language === 'bn' ? 'ম্যানেজার আমন্ত্রণ' : 'Manager Invite'}
                </CardTitle>
                <CardDescription>
                  {language === 'bn' ? 'QR কোড বা লিঙ্ক দিয়ে ম্যানেজার যোগ করুন' : 'Add managers via QR code or link'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={generateInviteCode}
                disabled={generatingInvite}
                className="h-14 flex flex-col items-center justify-center gap-1"
              >
                {generatingInvite ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <QrCode className="h-5 w-5" />
                )}
                <span className="text-xs">
                  {language === 'bn' ? 'QR কোড' : 'QR Code'}
                </span>
              </Button>

              <Button
                variant="outline"
                onClick={generateInviteCode}
                disabled={generatingInvite}
                className="h-14 flex flex-col items-center justify-center gap-1"
              >
                {generatingInvite ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Link2 className="h-5 w-5" />
                )}
                <span className="text-xs">
                  {language === 'bn' ? 'লিঙ্ক তৈরি' : 'Create Link'}
                </span>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              {language === 'bn'
                ? 'ম্যানেজার এই কোড বা লিঙ্ক ব্যবহার করে আপনার অ্যাকাউন্টে যোগ দিতে পারবে'
                : 'Managers can join your account using this code or link'}
            </p>
          </CardContent>
        </Card>

        {/* Team Management */}
        <Card className="border-border/50 shadow-sm bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/10">
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>{language === 'bn' ? 'টিম ম্যানেজমেন্ট' : 'Team Management'}</span>
                  <Badge variant="secondary" className="text-xs ml-2">
                    {teamMembers.length} {language === 'bn' ? 'সদস্য' : 'members'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {language === 'bn' ? 'আপনার টিম সদস্যদের দেখুন এবং পরিচালনা করুন' : 'View and manage your team members'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Team Members */}
            {teamMembers.length === 0 ? (
              <div className="text-center py-8 bg-muted/30 rounded-xl">
                <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground font-medium">
                  {language === 'bn' ? 'কোনো ম্যানেজার নেই' : 'No managers yet'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'bn'
                    ? 'উপরের বোতাম দিয়ে আমন্ত্রণ পাঠান'
                    : 'Use the buttons above to invite managers'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarImage src={member.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm">
                          {getInitials(member.profile?.full_name, member.member_email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-foreground truncate max-w-[180px]">
                          {member.profile?.full_name || member.member_email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {member.member_email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs hidden sm:inline-flex">
                        {language === 'bn' ? 'ম্যানেজার' : 'Manager'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 w-9"
                        onClick={() => setMemberToRemove(member)}
                        disabled={removingMember === member.id}
                      >
                        {removingMember === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserMinus className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pending Invites */}
            {pendingInvites.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {language === 'bn' ? 'অপেক্ষমাণ আমন্ত্রণ' : 'Pending Invites'} ({pendingInvites.length})
                  </h4>

                  <div className="space-y-2">
                    {pendingInvites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/20"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="text-sm font-mono text-foreground">
                              {invite.code}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {language === 'bn' ? 'মেয়াদ' : 'Expires'}: {format(new Date(invite.expires_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-9"
                          onClick={() => setInviteToRevoke(invite)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          {language === 'bn' ? 'বাতিল' : 'Revoke'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-sm mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              {language === 'bn' ? 'ম্যানেজার আমন্ত্রণ' : 'Manager Invitation'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {language === 'bn'
                ? 'এই QR কোড স্ক্যান করে বা লিঙ্ক ব্যবহার করে ম্যানেজার যোগ করুন'
                : 'Scan this QR code or use the link to join as Manager'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-4 py-4">
            {/* QR Code */}
            <div className="p-4 bg-white rounded-xl shadow-lg border">
              <QRCodeSVG
                value={inviteLink || `${window.location.origin}/auth?invite=${inviteCode}&role=manager`}
                size={180}
                level="H"
                includeMargin
                imageSettings={{
                  src: "/favicon.ico",
                  height: 24,
                  width: 24,
                  excavate: true,
                }}
              />
            </div>

            {/* Invite Code */}
            <div className="w-full space-y-2">
              <Label className="text-xs text-muted-foreground">
                {language === 'bn' ? 'আমন্ত্রণ কোড' : 'Invite Code'}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={inviteCode}
                  readOnly
                  className="font-mono text-center bg-muted/50 h-11 text-base"
                />
                <Button variant="outline" size="icon" onClick={copyInviteLink} className="h-11 w-11 shrink-0">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Role Badge */}
            <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-sm px-4 py-1.5">
              {language === 'bn' ? 'ম্যানেজার' : 'Manager'}
            </Badge>

            {/* Expiry Notice */}
            <p className="text-xs text-muted-foreground text-center">
              {language === 'bn'
                ? 'এই কোড ২৪ ঘন্টা পর্যন্ত বৈধ থাকবে'
                : 'This code expires in 24 hours'}
            </p>

            {/* Actions */}
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => {
                  setInviteCode('');
                  setInviteLink('');
                  generateInviteCode();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {language === 'bn' ? 'নতুন কোড' : 'New Code'}
              </Button>
              <Button
                className="flex-1 h-11"
                onClick={copyInviteLink}
              >
                <Copy className="h-4 w-4 mr-2" />
                {language === 'bn' ? 'লিঙ্ক কপি' : 'Copy Link'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {language === 'bn' ? 'টিম থেকে সরান?' : 'Remove from team?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'bn' ? 'আপনি কি নিশ্চিত যে এই সদস্যকে সরাতে চান?' : 'Are you sure you want to remove'}{' '}
              <strong>{memberToRemove?.profile?.full_name || memberToRemove?.member_email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'bn' ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === 'bn' ? 'সরান' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Invite Confirmation Dialog */}
      <AlertDialog open={!!inviteToRevoke} onOpenChange={() => setInviteToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === 'bn' ? 'আমন্ত্রণ বাতিল করুন' : 'Revoke Invite'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === 'bn'
                ? 'এই আমন্ত্রণটি বাতিল করা হবে এবং আর ব্যবহার করা যাবে না।'
                : 'This invite will be revoked and can no longer be used.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{language === 'bn' ? 'বাতিল' : 'Cancel'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeInvite}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === 'bn' ? 'বাতিল করুন' : 'Revoke'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
