import { useState, useEffect, useCallback } from "react";
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
  RefreshCw,
  Link2
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { QRCodeSVG } from "qrcode.react";
import { generateSecureInviteCode } from "@/lib/validationSchemas";
import { logger } from "@/lib/logger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TeamMember {
  id: string;
  member_user_id: string;
  member_email: string;
  role: 'manager';
  created_at: string;
}

export const ProfileSharingCard = () => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');

  const fetchTeamMembers = useCallback(async () => {
    if (!currentUserId) return;
    
    const { data, error } = await supabase
      .from('team_members')
      .select('id, member_user_id, member_email, role, created_at')
      .eq('owner_id', currentUserId)
      .eq('role', 'manager')
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('Error fetching team members', error, { component: 'ProfileSharingCard' });
      return;
    }

    if (data) {
      setTeamMembers(data as TeamMember[]);
    }
  }, [currentUserId]);

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
        .maybeSingle();
      
      if (roleData) {
        setUserRole(roleData.role);
      }
    }
  };

  const generateInviteCode = async () => {
    setLoading(true);
    
    try {
      // Generate a cryptographically secure invite code
      const code = generateSecureInviteCode();
      
      // Store invite in database
      const { error } = await supabase
        .from('team_invites')
        .insert({
          code,
          role: 'manager',
          created_by: currentUserId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        });

      if (error) {
        logger.error('Error creating invite', error, { component: 'ProfileSharingCard' });
        toast({ 
          title: language === 'bn' ? 'ত্রুটি হয়েছে' : 'Error creating invite',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      const link = `${window.location.origin}/auth?invite=${code}&role=manager`;
      setInviteCode(code);
      setInviteLink(link);
      setShowQRDialog(true);
      
      toast({
        title: language === 'bn' ? 'আমন্ত্রণ তৈরি হয়েছে!' : 'Invite created!',
        description: language === 'bn' ? 'QR কোড বা লিঙ্ক শেয়ার করুন' : 'Share the QR code or link'
      });
    } catch (err) {
      logger.error('Error generating invite', err, { component: 'ProfileSharingCard' });
      toast({ 
        title: language === 'bn' ? 'ত্রুটি হয়েছে' : 'Error creating invite',
        variant: 'destructive'
      });
    }
    
    setLoading(false);
  };

  const copyInviteLink = async () => {
    const link = inviteLink || `${window.location.origin}/auth?invite=${inviteCode}&role=manager`;
    await navigator.clipboard.writeText(link);
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
      logger.error('Error removing team member', error, { component: 'ProfileSharingCard' });
      toast({ 
        title: language === 'bn' ? 'ত্রুটি হয়েছে' : 'Error removing member',
        variant: 'destructive'
      });
      return;
    }

    setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    toast({ title: language === 'bn' ? 'সদস্য সরানো হয়েছে' : 'Team member removed' });
  };

  // Only owners can share profiles
  if (userRole !== 'owner') {
    return null;
  }

  return (
    <>
      <div className="p-4 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={generateInviteCode} 
            disabled={loading}
            className="h-14 flex flex-col items-center justify-center gap-1"
          >
            {loading ? (
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
            disabled={loading}
            className="h-14 flex flex-col items-center justify-center gap-1"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Link2 className="h-5 w-5" />
            )}
            <span className="text-xs">
              {language === 'bn' ? 'লিঙ্ক তৈরি' : 'Create Link'}
            </span>
          </Button>
        </div>

        <Separator />

        {/* Team Members Preview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              {language === 'bn' ? 'টিম সদস্য' : 'Team Members'}
            </Label>
            <Badge variant="secondary" className="text-xs">
              {teamMembers.length} {language === 'bn' ? 'সদস্য' : 'members'}
            </Badge>
          </div>
          
          {teamMembers.length === 0 ? (
            <div className="text-center py-6 bg-muted/30 rounded-lg">
              <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">
                {language === 'bn' 
                  ? 'কোনো ম্যানেজার নেই' 
                  : 'No managers yet'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'bn' 
                  ? 'উপরের বোতাম দিয়ে আমন্ত্রণ পাঠান' 
                  : 'Use the buttons above to invite'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {teamMembers.slice(0, 3).map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 bg-blue-500/10 rounded-full flex items-center justify-center">
                      <Shield className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[150px]">
                        {member.member_email}
                      </p>
                      <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                        {language === 'bn' ? 'ম্যানেজার' : 'Manager'}
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
              {teamMembers.length > 3 && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  +{teamMembers.length - 3} {language === 'bn' ? 'আরও সদস্য' : 'more members'}
                </p>
              )}
            </div>
          )}
        </div>
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
                <Button variant="outline" size="icon" onClick={copyInviteLink} className="h-11 w-11">
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
    </>
  );
};
