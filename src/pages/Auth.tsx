/**
 * Auth.tsx - Stock-X Authentication Page
 * 
 * Handles 3 auth flows:
 * 1. Sign In - Smart ID resolution (email/phone/username)
 * 2. Sign Up - Customer (phone) or Owner (email)
 * 3. Manager Invite - Username-based via invite link
 * 
 * Refactored for clarity and maintainability.
 */

import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Users, Crown, AlertCircle, UserPlus, LogIn, CheckCircle2, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { validateBDPhone, getPhoneValidationError, formatBDPhone } from "@/lib/phoneValidation";
import {
  resolveLoginEmail,
  generateCustomerEmail,
  generateManagerEmail,
  getRedirectPath,
  type AuthMode,
  type SignupCategory
} from "@/lib/authConstants";
import { AuthBranding } from "@/components/auth/AuthBranding";
import { AuthLoadingScreen } from "@/components/auth/AuthLoadingScreen";
import { SignupCategorySelector } from "@/components/auth/SignupCategorySelector";
import { PasswordInput } from "@/components/auth/PasswordInput";
import stockXLogo from "@/assets/stock-x-logo.png";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
  const navigate = useNavigate();

  // Auth state
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [signupCategory, setSignupCategory] = useState<SignupCategory>('customer');
  
  // Form fields
  const [loginId, setLoginId] = useState(""); // Universal login field
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [checkingSystem, setCheckingSystem] = useState(true);
  const [ownersExist, setOwnersExist] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Manager invite state
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteData, setInviteData] = useState<{ role: string; created_by: string } | null>(null);
  const [ownerShopName, setOwnerShopName] = useState("");

  // Retry handler
  const handleRetry = useCallback(() => {
    setLoadError(null);
    setCheckingSystem(true);
    window.location.reload();
  }, []);

  // System state check on mount
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let mounted = true;

    const checkSystemState = async () => {
      if (!mounted) return;

      // Safety timeout
      timeoutId = setTimeout(() => {
        if (mounted) {
          setLoadError('Connection is slow. Please check your internet and try again.');
        }
      }, 15000);

      try {
        // Check if already logged in
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Get role and redirect
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();

          const role = roleData?.role || 'customer';
          navigate(getRedirectPath(role as any));
          return;
        }

        // Handle invite code
        if (inviteCode) {
          const { data: inviteResult, error } = await supabase.rpc('validate_invite', { _code: inviteCode });

          if (error || !inviteResult || inviteResult.length === 0) {
            if (mounted) {
              setInviteValid(false);
              setAuthMode('signin');
              toast({
                title: "Invalid Invite Link",
                description: "This invitation link is invalid or expired.",
                variant: "destructive"
              });
            }
          } else if (mounted) {
            setInviteValid(true);
            setInviteData({ role: inviteResult[0].role, created_by: inviteResult[0].created_by });
            setAuthMode('manager-invite');

            // Get shop name
            const { data: shopData } = await supabase
              .from('shop_profiles')
              .select('shop_name')
              .eq('owner_id', inviteResult[0].created_by)
              .maybeSingle();

            if (shopData) {
              setOwnerShopName(shopData.shop_name);
            }
          }
        } else {
          // Check if any owners exist
          const { data: hasOwners, error } = await supabase.rpc('owners_exist');

          if (mounted) {
            setOwnersExist(error ? true : (hasOwners || false));
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
  }, [inviteCode, navigate]);

  // ===================== SIGN IN =====================
  const handleSignIn = async () => {
    if (!loginId || !password) {
      toast({ title: "Please enter your ID and password", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const signInEmail = resolveLoginEmail(loginId);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: signInEmail,
        password,
      });

      if (error) throw error;

      if (data.user) {
        toast({ title: "Welcome back!", description: "Successfully signed in" });

        // Get role and redirect
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle();

        // Validate manager's shop exists
        if (roleData?.role === 'manager') {
          const { data: teamMember } = await supabase
            .from('team_members')
            .select('owner_id')
            .eq('member_user_id', data.user.id)
            .maybeSingle();

          if (teamMember) {
            const { data: shop } = await supabase
              .from('shop_profiles')
              .select('id')
              .eq('owner_id', teamMember.owner_id)
              .maybeSingle();

            if (!shop) {
              await supabase.auth.signOut();
              throw new Error("Shop not found. Please contact the owner.");
            }
          }
        }

        const role = roleData?.role || 'customer';
        navigate(getRedirectPath(role as any));
      }
    } catch (error: any) {
      let msg = error.message;
      if (msg === "Invalid login credentials") {
        msg = "Invalid ID or Password. Check if you used the correct Phone, Email, or Username.";
      }
      toast({ title: "Sign In Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ===================== SIGN UP =====================
  const handleSignUp = async () => {
    const isOwner = signupCategory === 'owner';
    const isCustomer = signupCategory === 'customer';

    // Validation
    if (!password || (isOwner && !email) || (isCustomer && !phoneNumber)) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
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

    if (isCustomer && !validateBDPhone(phoneNumber)) {
      toast({ title: getPhoneValidationError(phoneNumber) || "Invalid phone", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const signupEmail = isCustomer
        ? generateCustomerEmail(phoneNumber)
        : email;

      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password,
        options: {
          data: {
            full_name: fullName || undefined,
            phone: isCustomer ? formatBDPhone(phoneNumber) : (phoneNumber ? formatBDPhone(phoneNumber) : undefined),
            requested_role: isCustomer ? 'customer' : 'owner'
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Update profile with phone if owner provided it
        if (isOwner && phoneNumber) {
          await supabase.from('profiles').upsert({
            user_id: data.user.id,
            phone: formatBDPhone(phoneNumber),
            full_name: fullName
          });
        }

        toast({
          title: "Account Created Successfully!",
          description: `Welcome! You've signed up as ${isCustomer ? 'Customer' : 'Shop Owner'}`
        });

        navigate(getRedirectPath(isCustomer ? 'customer' : 'owner'));
      }
    } catch (error: any) {
      toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ===================== MANAGER INVITE SIGNUP =====================
  const handleManagerSignUp = async () => {
    if (!username || !password || !fullName) {
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

    if (!inviteCode || !inviteData) {
      toast({ title: "Invalid invitation", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const syntheticEmail = generateManagerEmail(username);

      const { data, error } = await supabase.auth.signUp({
        email: syntheticEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            username: username,
            requested_role: 'manager'
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // Mark invite as used
        await supabase.rpc('mark_invite_used', {
          _code: inviteCode,
          _user_id: data.user.id,
          _email: syntheticEmail
        });

        // Update profile
        await supabase.from('profiles').upsert({
          user_id: data.user.id,
          full_name: fullName,
          phone: phoneNumber ? formatBDPhone(phoneNumber) : null
        });

        toast({
          title: "Welcome to the Team!",
          description: `You've successfully joined ${ownerShopName || 'the shop'} as Manager`
        });

        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authMode === 'signin') {
      await handleSignIn();
    } else if (authMode === 'manager-invite') {
      await handleManagerSignUp();
    } else {
      await handleSignUp();
    }
  };

  // Loading state
  if (checkingSystem) {
    return <AuthLoadingScreen error={loadError} onRetry={handleRetry} />;
  }

  const isSignUpMode = authMode === 'signup' || authMode === 'manager-invite';

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Hero Branding */}
      <AuthBranding />

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
              {authMode === 'manager-invite' && inviteValid ? (
                <>
                  <Badge variant="secondary" className="w-fit mx-auto mb-2 px-4 py-2 bg-primary/10 text-primary">
                    <LinkIcon className="h-3 w-3 mr-1" />
                    Manager Invitation
                  </Badge>
                  <CardTitle className="text-2xl">Join as Manager</CardTitle>
                  <CardDescription>
                    You've been invited to join {ownerShopName || 'a shop'} as Manager
                  </CardDescription>
                </>
              ) : authMode === 'manager-invite' && inviteValid === false ? (
                <>
                  <Badge variant="destructive" className="w-fit mx-auto mb-2 px-4 py-2">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Invalid Link
                  </Badge>
                  <CardTitle className="text-2xl">Invitation Expired</CardTitle>
                  <CardDescription>
                    Please request a new invitation link from the shop owner
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
                    This invitation link is invalid or expired.
                  </AlertDescription>
                </Alert>
              )}

              {/* Manager Invite Display */}
              {authMode === 'manager-invite' && inviteValid && (
                <div className="p-4 mb-4 rounded-xl border-2 border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold text-primary">Manager Role</h3>
                      <p className="text-sm text-muted-foreground">
                        Access to inventory, sales, and customer management
                      </p>
                    </div>
                  </div>
                  {ownerShopName && (
                    <div className="mt-3 pt-3 border-t border-primary/10 flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-muted-foreground">Shop: <strong>{ownerShopName}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* Signup Category Selection */}
              {authMode === 'signup' && !inviteCode && ownersExist && (
                <SignupCategorySelector
                  value={signupCategory}
                  onChange={setSignupCategory}
                  disabled={loading}
                />
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

              {/* Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* ===== MANAGER INVITE FORM ===== */}
                {authMode === 'manager-invite' && inviteValid && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={loading}
                        className="h-12"
                        required
                        autoComplete="name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="username">Username *</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Choose a unique username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                        required
                        disabled={loading}
                        className="h-12"
                        autoComplete="username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="01XXXXXXXXX"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        disabled={loading}
                        className="h-12"
                        autoComplete="tel"
                      />
                    </div>

                    <PasswordInput
                      id="password"
                      label="Password *"
                      value={password}
                      onChange={setPassword}
                      placeholder="Create a password (min 6 characters)"
                      disabled={loading}
                      autoComplete="new-password"
                    />

                    <PasswordInput
                      id="confirmPassword"
                      label="Confirm Password *"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Confirm your password"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </>
                )}

                {/* ===== SIGN UP FORM ===== */}
                {authMode === 'signup' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name (Optional)</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Enter your name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={loading}
                        className="h-12"
                        autoComplete="name"
                      />
                    </div>

                    {/* Customer: Phone Number */}
                    {signupCategory === 'customer' && (
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="01XXXXXXXXX"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          required
                          disabled={loading}
                          className="h-12"
                          autoComplete="tel"
                        />
                        <p className="text-xs text-muted-foreground">
                          Your phone number will be your login ID
                        </p>
                      </div>
                    )}

                    {/* Owner: Email */}
                    {signupCategory === 'owner' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            className="h-12"
                            autoComplete="email"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number (Optional)</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="01XXXXXXXXX"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            disabled={loading}
                            className="h-12"
                            autoComplete="tel"
                          />
                        </div>
                      </>
                    )}

                    <PasswordInput
                      id="password"
                      label="Password *"
                      value={password}
                      onChange={setPassword}
                      placeholder="Create a password (min 6 characters)"
                      disabled={loading}
                      autoComplete="new-password"
                    />

                    <PasswordInput
                      id="confirmPassword"
                      label="Confirm Password *"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder="Confirm your password"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </>
                )}

                {/* ===== SIGN IN FORM ===== */}
                {authMode === 'signin' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="loginId">Email / Phone / Username</Label>
                      <Input
                        id="loginId"
                        type="text"
                        placeholder="Enter your email, phone, or username"
                        value={loginId}
                        onChange={(e) => setLoginId(e.target.value)}
                        required
                        disabled={loading}
                        className="h-12"
                        autoComplete="username"
                      />
                      <p className="text-xs text-muted-foreground">
                        Owners use email • Customers use phone • Managers use username
                      </p>
                    </div>

                    <PasswordInput
                      id="password"
                      label="Password"
                      value={password}
                      onChange={setPassword}
                      placeholder="Enter your password"
                      disabled={loading}
                      autoComplete="current-password"
                    />
                  </>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-12 text-lg mt-6"
                  disabled={loading || (authMode === 'manager-invite' && !inviteValid)}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {isSignUpMode ? 'Creating Account...' : 'Signing In...'}
                    </>
                  ) : isSignUpMode ? (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      Create Account
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-5 w-5" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>

              {/* Toggle Sign In / Sign Up */}
              {!inviteCode && (
                <div className="mt-6 text-center">
                  {authMode === 'signin' ? (
                    <p className="text-muted-foreground">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setAuthMode('signup')}
                        className="text-primary font-medium hover:underline"
                        disabled={loading}
                      >
                        Sign Up
                      </button>
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setAuthMode('signin')}
                        className="text-primary font-medium hover:underline"
                        disabled={loading}
                      >
                        Sign In
                      </button>
                    </p>
                  )}
                </div>
              )}

              {/* Manager Invite Hint */}
              {authMode === 'signup' && ownersExist && (
                <p className="text-xs text-muted-foreground text-center mt-4">
                  <Users className="h-3 w-3 inline mr-1" />
                  Team members need an invitation link from the shop owner
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
