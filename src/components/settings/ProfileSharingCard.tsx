import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  QrCode, 
  Users, 
  Copy, 
  Check, 
  Loader2,
  Shield,
  Trash2,
  RefreshCw
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeamMember {
  id: string;
  member_user_id: string;
  member_email: string;
  role: 'manager' | 'driver';
  created_at: string;
}

export const ProfileSharingCard = () => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRole, setInviteRole] = useState<'manager' | 'driver'>('driver');
  const [copied, setCopied] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (currentUserId && userRole === 'owner') {
      fetchTeamMembers();
    }
  }, [currentUserId, userRole, fetchTeamMembers]);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (roleData) {
        setUserRole(roleData.role);
      }
    }
  };

  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from('team_members')
      .select('id, member_user_id, member_email, role, created_at')
      .eq('owner_id', currentUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching team members:', error);
      return;
    }

    if (data) {
      setTeamMembers(data as TeamMember[]);
    }
  };

  const generateInviteCode = async () => {
    setLoading(true);
    
    try {
      // Generate a unique invite code
      const code = `SX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Store invite in database
      const { error } = await supabase
        .from('team_invites')
        .insert({
          code,
          role: inviteRole,
          created_by: currentUserId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        });

      if (error) {
        console.error('Error creating invite:', error);
        toast({ 
          title: language === 'bn' ? 'ত্রুটি হয়েছে' : 'Error creating invite',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      setInviteCode(code);
      setShowQRDialog(true);
    } catch (err) {
      console.error('Error generating invite:', err);
      toast({ 
        title: language === 'bn' ? 'ত্রুটি হয়েছে' : 'Error creating invite',
        variant: 'destructive'
      });
    }
    
    setLoading(false);
  };

  const copyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}/auth?invite=${inviteCode}&role=${inviteRole}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({ title: language === 'bn' ? 'লিঙ্ক কপি হয়েছে!' : 'Invite link copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const removeTeamMember = async (memberId: string) => {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Error removing team member:', error);
      toast({ 
        title: language === 'bn' ? 'ত্রুটি হয়েছে' : 'Error removing member',
        variant: 'destructive'
      });
      return;
    }

    setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    toast({ title: language === 'bn' ? 'সদস্য সরানো হয়েছে' : 'Team member removed' });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'manager': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'driver': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (role: string) => {
    if (language === 'bn') {
      return role === 'manager' ? 'ম্যানেজার' : 'ড্রাইভার';
    }
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  // Only owners can share profiles
  if (userRole !== 'owner') {
    return null;
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground">
              {language === 'bn' ? 'প্রোফাইল শেয়ারিং' : 'Profile Sharing'}
            </CardTitle>
          </div>
          <CardDescription>
            {language === 'bn' 
              ? 'QR কোড স্ক্যান করে ম্যানেজার ও ড্রাইভারদের অ্যাক্সেস দিন' 
              : 'Share access with managers and drivers via QR code'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invite Section */}
          <div className="space-y-3">
            <Label>{language === 'bn' ? 'নতুন সদস্য আমন্ত্রণ' : 'Invite Team Member'}</Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={inviteRole} onValueChange={(v: 'manager' | 'driver') => setInviteRole(v)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">
                    {language === 'bn' ? 'ম্যানেজার' : 'Manager'}
                  </SelectItem>
                  <SelectItem value="driver">
                    {language === 'bn' ? 'ড্রাইভার' : 'Driver'}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={generateInviteCode} 
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <QrCode className="h-4 w-4 mr-2" />
                )}
                {language === 'bn' ? 'QR কোড তৈরি করুন' : 'Generate QR Code'}
              </Button>
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Team Members */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{language === 'bn' ? 'টিম সদস্য' : 'Team Members'}</Label>
              <Badge variant="outline" className="text-xs">
                {teamMembers.length} {language === 'bn' ? 'সদস্য' : 'members'}
              </Badge>
            </div>
            
            {teamMembers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {language === 'bn' 
                    ? 'কোনো টিম সদস্য নেই' 
                    : 'No team members yet'}
                </p>
                <p className="text-xs mt-1">
                  {language === 'bn' 
                    ? 'QR কোড দিয়ে সদস্য যোগ করুন' 
                    : 'Generate a QR code to invite members'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div 
                    key={member.id} 
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 bg-primary/10 rounded-full flex items-center justify-center">
                        <Shield className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.member_email}</p>
                        <Badge className={`text-xs mt-1 ${getRoleBadgeColor(member.role)}`}>
                          {getRoleLabel(member.role)}
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeTeamMember(member.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-sm mx-4 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">
              {language === 'bn' ? 'টিম সদস্য আমন্ত্রণ' : 'Invite Team Member'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {language === 'bn' 
                ? `এই QR কোড স্ক্যান করে ${getRoleLabel(inviteRole)} যোগ করুন` 
                : `Scan this QR code to join as ${getRoleLabel(inviteRole)}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center space-y-4 py-4">
            {/* QR Code */}
            <div className="p-4 bg-white rounded-xl shadow-lg">
              <QRCodeSVG 
                value={`${window.location.origin}/auth?invite=${inviteCode}&role=${inviteRole}`}
                size={200}
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
                  className="font-mono text-center bg-muted/50"
                />
                <Button variant="outline" size="icon" onClick={copyInviteLink}>
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Role Badge */}
            <Badge className={`${getRoleBadgeColor(inviteRole)} text-sm px-4 py-1`}>
              {getRoleLabel(inviteRole)}
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
                className="flex-1"
                onClick={() => {
                  setInviteCode('');
                  generateInviteCode();
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {language === 'bn' ? 'নতুন কোড' : 'New Code'}
              </Button>
              <Button 
                className="flex-1"
                onClick={copyInviteLink}
              >
                <Copy className="h-4 w-4 mr-2" />
                {language === 'bn' ? 'লিঙ্ক কপি' : 'Copy Link'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
