import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Shield, Truck, Loader2, Users, Crown, AlertCircle, UserPlus, LogIn, ShoppingCart, Package, Globe, CheckCircle2, Building2, Eye, EyeOff, RefreshCcw } from "lucide-react";
import stockXLogo from "@/assets/stock-x-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validateBDPhone, getPhoneValidationError } from "@/lib/phoneValidation";

type AuthMode = 'signin' | 'signup' | 'invite' | 'team-signup';
type UserRole = 'owner' | 'manager' | 'driver' | 'customer' | 'staff';
type SignupCategory = 'customer' | 'owner' | 'team';

interface RoleOption {
  id: UserRole;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  features: string[];
}

interface SignupCategoryOption {
  id: SignupCategory;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}

const signupCategories: SignupCategoryOption[] = [
  {
    id: 'customer',
    label: 'Customer',
    description: 'Order LPG online',
    icon: ShoppingCart,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-500',
  },
  {
    id: 'owner',
    label: 'Shop Owner',
    description: 'Full business control',
    icon: Crown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-500',
  },
  {
    id: 'team',
    label: 'Team Member',
    description: 'Join a shop',
    icon: Users,
    color: 'text-primary',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary',
  }
];

const roleOptions: RoleOption[] = [
  {
    id: 'customer',
    label: 'Customer',
    description: 'Order LPG online',
    icon: ShoppingCart,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-500',
    features: ['Browse nearby LPG shops', 'Place orders online', 'Real-time delivery tracking']
  },
  {
    id: 'owner',
    label: 'Owner',
    description: 'Full business control',
    icon: Crown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-500',
    features: ['Complete inventory management', 'Team & staff management', 'Business analytics & reports']
  },
  {
    id: 'manager',
    label: 'Manager',
    description: 'Inventory & sales',
    icon: Users,
    color: 'text-primary',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary',
    features: ['Inventory management', 'Sales & POS access', 'Customer management']
  },
  {
    id: 'driver',
    label: 'Driver',
    description: 'Delivery access',
    icon: Truck,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50 dark:bg-slate-950/30',
    borderColor: 'border-slate-500',
    features: ['Delivery tracking', 'Customer updates', 'Route management']
  }
];

const teamRoleOptions = [
  { value: 'manager', label: 'Manager', description: 'Inventory & sales access' },
  { value: 'driver', label: 'Driver', description: 'Delivery & route access' },
  { value: 'staff', label: 'Staff', description: 'Basic POS access' }
];

const Auth = () => {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
  const inviteRoleParam = searchParams.get('role');
  
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [signupCategory, setSignupCategory] = useState<SignupCategory>('customer');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(false);
  const [checkingSystem, setCheckingSystem] = useState(true);
  const [ownersExist, setOwnersExist] = useState(true);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteRole, setInviteRole] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Team member specific fields
  const [ownerEmail, setOwnerEmail] = useState("");
  const [teamRole, setTeamRole] = useState<string>("manager");
  const [verifyingOwner, setVerifyingOwner] = useState(false);
  const [ownerVerified, setOwnerVerified] = useState(false);
  const [ownerShopName, setOwnerShopName] = useState("");
  
  const navigate = useNavigate();
  
  // Retry handler for loading failures
  const handleRetry = useCallback(() => {
    setLoadError(null);
    setCheckingSystem(true);
    window.location.reload();
  }, []);

  // Check system state on mount with timeout
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let mounted = true;
    
    const processInviteForExistingUser = async (userId: string, userEmail: string) => {
      if (!inviteCode) return;
      
      try {
        const { data, error } = await supabase.rpc('mark_invite_used', {
          _code: inviteCode,
          _user_id: userId,
          _email: userEmail
        });
        
        if (error || !data) {
          toast({
            title: "Invite Processing Failed",
            description: "Could not process the invite. It may be invalid or already used.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Welcome to the Team!",
            description: `You've been added as ${inviteRoleParam || 'team member'}`,
          });
        }
        navigate('/dashboard');
      } catch (err) {
        console.error('Error processing invite:', err);
        navigate('/dashboard');
      }
    };

    const checkSystemState = async () => {
      if (!mounted) return;
      
      // Set a timeout to show error if loading takes too long
      timeoutId = setTimeout(() => {
        if (mounted) {
          setLoadError('Connection is slow. Please check your internet and try again.');
        }
      }, 15000); // 15 second timeout
      
      try {
        // Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // If invite code present, process it for existing user
          if (inviteCode) {
            await processInviteForExistingUser(session.user.id, session.user.email || '');
          } else {
            // Check user role and redirect accordingly
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();
            
            if (roleData?.role === 'customer') {
              navigate('/community');
            } else {
              navigate('/dashboard');
            }
            return;
          }
        }

        // If invite code is present, validate it
        if (inviteCode) {
          const { data: inviteData, error } = await supabase.rpc('validate_invite', { _code: inviteCode });
          
          if (error || !inviteData || inviteData.length === 0) {
            if (mounted) {
              setInviteValid(false);
              setAuthMode('signin');
              toast({
                title: "Invalid Invite",
                description: "This invite link is invalid or expired",
                variant: "destructive"
              });
            }
          } else if (mounted) {
            setInviteValid(true);
            setInviteRole(inviteData[0].role);
            setAuthMode('invite');
          }
        } else {
          // Check if any owners exist
          const { data: hasOwners, error } = await supabase.rpc('owners_exist');
          
          if (error) {
            console.error('Error checking owners:', error);
            if (mounted) setOwnersExist(true);
          } else if (mounted) {
            setOwnersExist(hasOwners || false);
            // If no owners exist, default to signup for first user
            setAuthMode(hasOwners ? 'signin' : 'signup');
          }
        }
      } catch (err) {
        console.error('Error checking system state:', err);
        if (mounted) {
          setLoadError('Failed to connect to server. Please try again.');
        }
      } finally {
        if (mounted) {
          clearTimeout(timeoutId);
          setCheckingSystem(false);
        }
      }
    };

    checkSystemState();
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [inviteCode, navigate, inviteRoleParam]);

  // Verify owner email
  const verifyOwnerEmail = async () => {
    if (!ownerEmail) {
      toast({ title: "Please enter owner's email", variant: "destructive" });
      return;
    }

    setVerifyingOwner(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-owner`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({ owner_email: ownerEmail })
        }
      );

      const data = await response.json();

      if (data.exists) {
        setOwnerVerified(true);
        setOwnerShopName(data.shop_name || '');
        toast({ 
          title: "Owner Verified!", 
          description: data.shop_name ? `Shop: ${data.shop_name}` : "You can now complete registration" 
        });
      } else {
        setOwnerVerified(false);
        toast({ 
          title: "Owner Not Found", 
          description: data.error || "Please check the email and try again", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Error verifying owner:', error);
      toast({ title: "Verification Failed", variant: "destructive" });
    } finally {
      setVerifyingOwner(false);
    }
  };

  // Handle team member registration
  const handleTeamSignUp = async () => {
    if (!ownerEmail || !password || !fullName || !email) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (!ownerVerified) {
      toast({ title: "Please verify the owner's email first", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-team-member`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            owner_email: ownerEmail,
            owner_password: password,
            member_name: fullName,
            member_email: email,
            member_role: teamRole
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        toast({ 
          title: "Registration Successful!", 
          description: data.message || `You've been registered as ${teamRole}` 
        });
        
        // Sign in the new team member
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password // Uses owner's password
        });

        if (signInError) {
          toast({ 
            title: "Please sign in", 
            description: "Your account has been created. Please sign in." 
          });
          setAuthMode('signin');
        } else {
          navigate('/dashboard');
        }
      } else {
        toast({ 
          title: "Registration Failed", 
          description: data.error || "Please try again", 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      console.error('Error registering team member:', error);
      toast({ title: "Registration Failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const actualRole = signupCategory === 'customer' ? 'customer' : 
                         signupCategory === 'owner' ? 'owner' : selectedRole;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: inviteCode 
            ? `${window.location.origin}/auth?invite=${inviteCode}&role=${inviteRoleParam || inviteRole}`
            : window.location.origin,
          data: {
            full_name: fullName || undefined,
            requested_role: inviteCode ? undefined : actualRole
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // If invite code present, mark it as used (team member signup)
        if (inviteCode) {
          await supabase.rpc('mark_invite_used', {
            _code: inviteCode,
            _user_id: data.user.id,
            _email: email
          });
          
          toast({ 
            title: "Welcome to the Team!", 
            description: `You've successfully joined as ${getRoleLabel(inviteRole)}` 
          });
        } else {
          toast({ 
            title: "Account Created Successfully!", 
            description: `Welcome! You've signed up as ${getRoleLabel(actualRole)}` 
          });
        }
        
        // Redirect based on role - customers go to community, others to dashboard
        if (actualRole === 'customer') {
          navigate('/community');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      toast({ 
        title: "Registration Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // If invite code present, process it for existing user signing in
      if (inviteCode && data.user) {
        await supabase.rpc('mark_invite_used', {
          _code: inviteCode,
          _user_id: data.user.id,
          _email: email
        });
        
        toast({ 
          title: "Welcome to the Team!", 
          description: `You've joined as ${getRoleLabel(inviteRole)}` 
        });
        navigate('/dashboard');
      } else if (data.user) {
        toast({ title: "Welcome back!", description: "Successfully signed in" });
        
        // Check user role and redirect accordingly
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();
        
        if (roleData?.role === 'customer') {
          navigate('/community');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      toast({ 
        title: "Sign In Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const redirectUrl = inviteCode 
        ? `${window.location.origin}/auth?invite=${inviteCode}&role=${inviteRoleParam || inviteRole}`
        : `${window.location.origin}/auth`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({ 
        title: "Google authentication failed", 
        description: error.message, 
        variant: "destructive" 
      });
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authMode === 'signin') {
      await handleSignIn();
    } else if (authMode === 'team-signup') {
      await handleTeamSignUp();
    } else {
      await handleSignUp();
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'manager': return 'Manager';
      case 'driver': return 'Driver';
      case 'customer': return 'Customer';
      case 'staff': return 'Staff';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown;
      case 'manager': return Users;
      case 'customer': return ShoppingCart;
      default: return Truck;
    }
  };

  const isSignUpMode = authMode === 'signup' || authMode === 'invite' || authMode === 'team-signup';

  if (checkingSystem) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse" />
            <img 
              src={stockXLogo} 
              alt="Stock-X" 
              className="relative h-16 w-16 mx-auto rounded-xl shadow-lg"
            />
          </div>
          <div>
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-white" />
            <p className="mt-3 text-white/90 font-medium">Loading Stock-X...</p>
            <p className="mt-1 text-white/60 text-sm">Please wait while we set things up</p>
          </div>
          {loadError && (
            <div className="mt-6 p-4 bg-white/10 rounded-xl border border-white/20">
              <p className="text-white/90 text-sm mb-3">{loadError}</p>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleRetry}
                className="h-10 px-6"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Hero Branding (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero flex-col justify-center p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 border-2 border-white rounded-full" />
          <div className="absolute bottom-40 right-20 w-48 h-48 border-2 border-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-24 h-24 border-2 border-white rounded-full" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <img src={stockXLogo} alt="Stock-X" className="h-14 w-14" />
            <span className="text-3xl font-bold text-white">Stock-X</span>
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
            L.P.G Inventory &
            <br />
            <span className="text-secondary">Online Delivery Platform</span>
          </h1>
          
          <p className="text-white/80 text-lg mb-10 max-w-md">
            Complete business management for LPG distributors with real-time tracking and analytics.
          </p>
          
          {/* Feature Highlights */}
          <div className="space-y-4 mb-10">
            <div className="flex items-center gap-3 text-white/90">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
              <span>Real-time Inventory Management</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Globe className="h-5 w-5" />
              </div>
              <span>Online Marketplace & Delivery</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <span>Secure Role-Based Access</span>
            </div>
          </div>
          
          {/* Trust Indicators */}
          <div className="flex gap-8 text-white/90">
            <div>
              <span className="text-3xl font-bold block">500+</span>
              <span className="text-sm text-white/70">Businesses</span>
            </div>
            <div>
              <span className="text-3xl font-bold block">50K+</span>
              <span className="text-sm text-white/70">Deliveries</span>
            </div>
            <div>
              <span className="text-3xl font-bold block">99.9%</span>
              <span className="text-sm text-white/70">Uptime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden bg-gradient-hero p-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </Link>
            <div className="flex items-center gap-2">
              <img src={stockXLogo} alt="Stock-X" className="h-10 w-10" />
              <span className="text-xl font-bold text-white">Stock-X</span>
            </div>
          </div>
        </div>

        {/* Desktop Back Button */}
        <div className="hidden lg:block p-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Auth Form Container */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <Card className="w-full max-w-md border-0 shadow-xl">
            <CardHeader className="text-center pb-4">
              {authMode === 'invite' && inviteValid ? (
                <>
                  <Badge variant="secondary" className="w-fit mx-auto mb-2 px-4 py-2 bg-primary/10 text-primary">
                    <UserPlus className="h-3 w-3 mr-1" />
                    Team Invitation
                  </Badge>
                  <CardTitle className="text-2xl">Join the Team</CardTitle>
                  <CardDescription>
                    You've been invited to join as {getRoleLabel(inviteRole)}
                  </CardDescription>
                </>
              ) : !ownersExist ? (
                <>
                  <Badge variant="secondary" className="w-fit mx-auto mb-2 px-4 py-2 bg-amber-500/10 text-amber-600">
                    <Crown className="h-3 w-3 mr-1" />
                    First Time Setup
                  </Badge>
                  <CardTitle className="text-2xl">Create Your Account</CardTitle>
                  <CardDescription>
                    Set up the first owner account for your business
                  </CardDescription>
                </>
              ) : authMode === 'team-signup' ? (
                <>
                  <Badge variant="secondary" className="w-fit mx-auto mb-2 px-4 py-2 bg-primary/10 text-primary">
                    <Users className="h-3 w-3 mr-1" />
                    Join a Shop
                  </Badge>
                  <CardTitle className="text-2xl">Team Member Registration</CardTitle>
                  <CardDescription>
                    Use your shop owner's credentials to join their team
                  </CardDescription>
                </>
              ) : authMode === 'signup' ? (
                <>
                  <CardTitle className="text-2xl">Create Account</CardTitle>
                  <CardDescription>
                    Select your account type and sign up to get started
                  </CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="text-2xl">Welcome Back</CardTitle>
                  <CardDescription>
                    Sign in to access your dashboard
                  </CardDescription>
                </>
              )}
            </CardHeader>
            
            <CardContent>
              {/* Invalid Invite Alert */}
              {inviteCode && inviteValid === false && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This invite link is invalid or expired. Please request a new one.
                  </AlertDescription>
                </Alert>
              )}

              {/* Invite Role Display */}
              {authMode === 'invite' && inviteValid && (
                <div className="p-4 mb-4 rounded-xl border-2 border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const RoleIcon = getRoleIcon(inviteRole);
                      return <RoleIcon className="h-8 w-8 text-primary" />;
                    })()}
                    <div>
                      <h3 className="font-semibold text-primary">{getRoleLabel(inviteRole)} Role</h3>
                      <p className="text-sm text-muted-foreground">
                        {inviteRole === 'manager' 
                          ? 'Access to inventory, sales, and team coordination'
                          : inviteRole === 'driver'
                            ? 'Access to deliveries and customer updates'
                            : 'Full access to all features'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Signup Category Selection - Only for Signup (not invite, not team-signup) */}
              {authMode === 'signup' && !inviteCode && ownersExist && (
                <div className="mb-6">
                  <Label className="mb-3 block">I want to...</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {signupCategories.map((category) => {
                      const Icon = category.icon;
                      const isSelected = signupCategory === category.id;
                      return (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => {
                            setSignupCategory(category.id);
                            if (category.id === 'team') {
                              setAuthMode('team-signup');
                            }
                          }}
                          disabled={loading}
                          className={`p-3 rounded-xl border-2 transition-all text-center ${
                            isSelected 
                              ? `${category.borderColor} ${category.bgColor}` 
                              : 'border-border hover:border-muted-foreground/50'
                          }`}
                        >
                          <Icon className={`h-6 w-6 mx-auto mb-1.5 ${category.color}`} />
                          <span className="font-semibold text-xs block">{category.label}</span>
                          <span className="text-[10px] text-muted-foreground block leading-tight">{category.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* First Owner Badge */}
              {!ownersExist && authMode === 'signup' && (
                <div className="p-4 mb-4 rounded-xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30">
                  <div className="flex items-center gap-3">
                    <Crown className="h-8 w-8 text-amber-600" />
                    <div>
                      <h3 className="font-semibold text-amber-800 dark:text-amber-200">Owner Account</h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Full control over all business features
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Team Member Registration Form */}
              {authMode === 'team-signup' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Owner Verification Section */}
                  <div className="space-y-3 p-4 rounded-xl border bg-muted/30">
                    <Label className="text-sm font-medium">Step 1: Verify Shop Owner</Label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Shop owner's email"
                        value={ownerEmail}
                        onChange={(e) => {
                          setOwnerEmail(e.target.value);
                          setOwnerVerified(false);
                        }}
                        disabled={loading || verifyingOwner}
                        className="h-11 flex-1"
                      />
                      <Button
                        type="button"
                        variant={ownerVerified ? "secondary" : "default"}
                        onClick={verifyOwnerEmail}
                        disabled={loading || verifyingOwner || !ownerEmail}
                        className="h-11 px-4"
                      >
                        {verifyingOwner ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : ownerVerified ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    </div>
                    {ownerVerified && ownerShopName && (
                      <div className="flex items-center gap-2 text-sm text-success">
                        <Building2 className="h-4 w-4" />
                        <span>Shop: {ownerShopName}</span>
                      </div>
                    )}
                  </div>

                  {/* Member Details Section */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Step 2: Your Details</Label>
                    
                    <Input 
                      type="text" 
                      placeholder="Your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading}
                      className="h-11"
                    />

                    <Input 
                      type="email" 
                      placeholder="Your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      className="h-11"
                    />

                    <Select value={teamRole} onValueChange={setTeamRole}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamRoleOptions.map(role => (
                          <SelectItem key={role.value} value={role.value}>
                            <span className="font-medium">{role.label}</span>
                            <span className="text-muted-foreground ml-2 text-xs">- {role.description}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Password Section */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Step 3: Owner's Password</Label>
                    <p className="text-xs text-muted-foreground">
                      Enter the shop owner's password to verify your team membership
                    </p>
                    <div className="relative">
                      <Input 
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter owner's password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        className="h-11 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity text-base"
                    disabled={loading || !ownerVerified}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-5 w-5" />
                        Join Team
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setAuthMode('signup');
                      setSignupCategory('customer');
                    }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Sign Up Options
                  </Button>
                </form>
              )}

              {/* Regular Sign In / Sign Up Form */}
              {authMode !== 'team-signup' && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Full Name - Only for Sign Up */}
                  {isSignUpMode && (
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input 
                        id="fullName" 
                        type="text" 
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={loading}
                        className="h-12"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="h-12"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"}
                        placeholder={isSignUpMode ? "Create a password (min 6 characters)" : "Enter your password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="h-12 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Confirm Password - Only for Sign Up */}
                  {isSignUpMode && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <div className="relative">
                        <Input 
                          id="confirmPassword" 
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          disabled={loading}
                          className="h-12 pr-10"
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
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity text-base"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {authMode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                      </>
                    ) : (
                      <>
                        {authMode === 'signin' ? (
                          <>
                            <LogIn className="mr-2 h-5 w-5" />
                            Sign In
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-5 w-5" />
                            Create Account
                          </>
                        )}
                      </>
                    )}
                  </Button>

                  {/* Divider */}
                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>

                  {/* Google OAuth */}
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full h-12"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </Button>

                  {/* Toggle Between Sign In and Sign Up */}
                  <div className="pt-4 border-t border-border">
                    {authMode === 'invite' ? (
                      <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Already have an account?
                        </p>
                        <Button 
                          variant="outline" 
                          className="w-full h-11"
                          onClick={() => setAuthMode('signin')}
                          type="button"
                          disabled={loading}
                        >
                          <LogIn className="mr-2 h-4 w-4" />
                          Sign In Instead
                        </Button>
                      </div>
                    ) : authMode === 'signin' ? (
                      <div className="text-center space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Don't have an account yet?
                        </p>
                        <Button 
                          variant="outline" 
                          className="w-full h-11"
                          onClick={() => setAuthMode('signup')}
                          type="button"
                          disabled={loading}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Create New Account
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Team member? Click above and select "Team Member"
                        </p>
                      </div>
                    ) : (
                      <div className="text-center space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Already have an account?
                        </p>
                        <Button 
                          variant="outline" 
                          className="w-full h-11"
                          onClick={() => setAuthMode('signin')}
                          type="button"
                          disabled={loading}
                        >
                          <LogIn className="mr-2 h-4 w-4" />
                          Sign In Instead
                        </Button>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;