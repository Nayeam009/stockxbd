import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Users, 
  UserMinus, 
  Shield,
  Loader2,
  ChevronDown,
  Clock,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface TeamMember {
  id: string;
  member_user_id: string;
  member_email: string;
  role: 'owner' | 'manager' | 'customer';
  created_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
    phone: string | null;
  };
}

interface PendingInvite {
  id: string;
  code: string;
  role: 'owner' | 'manager' | 'customer';
  expires_at: string;
  created_at: string;
}

export const TeamManagementCard = () => {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [inviteToRevoke, setInviteToRevoke] = useState<PendingInvite | null>(null);

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (userRole === 'owner') {
      fetchTeamMembers();
      fetchPendingInvites();
    }
  }, [userRole]);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setCurrentUserId(user.id);

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleData?.role) {
      setUserRole(roleData.role);
    }
    setLoading(false);
  };

  const fetchTeamMembers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching team members:', error);
      return;
    }

    // Fetch profiles for team members and filter to only managers
    const membersWithProfiles = await Promise.all(
      (data || [])
        .filter(member => member.role === 'manager')
        .map(async (member) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, phone')
            .eq('user_id', member.member_user_id)
            .maybeSingle();

          return {
            id: member.id,
            member_user_id: member.member_user_id,
            member_email: member.member_email,
            role: 'manager' as const,
            created_at: member.created_at,
            profile: profileData || undefined
          };
        })
    );

    setTeamMembers(membersWithProfiles);
  };

  const fetchPendingInvites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('team_invites')
      .select('*')
      .eq('created_by', user.id)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending invites:', error);
      return;
    }

    // Filter to only manager invites
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

      toast({ title: t("member_removed") });
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

      toast({ title: t("invite_revoked") });
      fetchPendingInvites();
    } catch (error: any) {
      toast({ title: error.message || "Error revoking invite", variant: "destructive" });
    } finally {
      setInviteToRevoke(null);
    }
  };

  const getInitials = (name: string | null | undefined, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.charAt(0).toUpperCase();
  };

  // Only render for owners
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[150px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (userRole !== 'owner') {
    return null;
  }

  return (
    <>
      <div className="p-4 space-y-4">
        {/* Team Members Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t("team_members")}
            </h4>
            <Badge variant="secondary" className="text-xs">
              {teamMembers.length}
            </Badge>
          </div>
          
          {teamMembers.length === 0 ? (
            <div className="text-center py-6 bg-muted/30 rounded-lg">
              <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">{t("no_team_members")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("invite_team_members_hint")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div 
                  key={member.id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
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
                      <p className="text-[10px] text-muted-foreground">
                        {t("joined_on")}: {format(new Date(member.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                      {language === 'bn' ? 'ম্যানেজার' : 'Manager'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
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
        </div>

        {pendingInvites.length > 0 && (
          <>
            <Separator />

            {/* Pending Invites Section */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t("pending_invites")} ({pendingInvites.length})
              </h4>
              
              <div className="space-y-2">
                {pendingInvites.map((invite) => (
                  <div 
                    key={invite.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-500/5 border border-amber-500/20"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                        {language === 'bn' ? 'ম্যানেজার' : 'Manager'}
                      </Badge>
                      <div>
                        <p className="text-sm font-mono text-muted-foreground">
                          {invite.code}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("expires")}: {format(new Date(invite.expires_at), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                      onClick={() => setInviteToRevoke(invite)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      {t("revoke")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t("remove_from_team")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("remove_member_confirm")} <strong>{memberToRemove?.profile?.full_name || memberToRemove?.member_email}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Invite Confirmation Dialog */}
      <AlertDialog open={!!inviteToRevoke} onOpenChange={() => setInviteToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revoke_invite")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("revoke_invite_confirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevokeInvite}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("revoke")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
