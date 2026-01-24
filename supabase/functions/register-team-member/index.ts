import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';

    // Check rate limit for registration attempts (5 attempts per hour per IP)
    const { data: rateLimitOk } = await supabaseAdmin.rpc('check_rate_limit', {
      _ip_address: clientIp,
      _action: 'register_team_member',
      _max_attempts: 5,
      _window_minutes: 60
    });

    if (!rateLimitOk) {
      return new Response(
        JSON.stringify({ success: false, error: 'Too many registration attempts. Please try again later.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    const { 
      owner_email, 
      owner_password, 
      member_name, 
      member_email, 
      member_role 
    } = await req.json();

    // Validate inputs
    if (!owner_email || !owner_password || !member_name || !member_email || !member_role) {
      return new Response(
        JSON.stringify({ success: false, error: 'All fields are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate role
    const validRoles = ['manager', 'driver', 'staff'];
    if (!validRoles.includes(member_role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid role. Must be manager, driver, or staff' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Record the attempt before authentication
    await supabaseAdmin.rpc('record_rate_limit_attempt', {
      _ip_address: clientIp,
      _action: 'register_team_member',
      _email: owner_email
    });

    // Check for brute force on specific email (3 failed attempts per hour)
    const { data: emailAttempts } = await supabaseAdmin
      .from('rate_limit_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('email', owner_email)
      .eq('action', 'register_team_member')
      .eq('success', false)
      .gte('attempted_at', new Date(Date.now() - 3600000).toISOString());

    if (emailAttempts && (emailAttempts as unknown as number) >= 3) {
      return new Response(
        JSON.stringify({ success: false, error: 'Account temporarily locked. Please try again later.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // Step 1: Verify owner credentials by attempting sign-in
    const { data: signInData, error: signInError } = await supabasePublic.auth.signInWithPassword({
      email: owner_email,
      password: owner_password
    });

    if (signInError || !signInData.user) {
      // Record failed auth attempt
      await supabaseAdmin.rpc('record_rate_limit_attempt', {
        _ip_address: clientIp,
        _action: 'register_team_member_auth_fail',
        _email: owner_email,
        _success: false
      });

      return new Response(
        JSON.stringify({ success: false, error: 'Invalid credentials' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Sign out immediately
    await supabasePublic.auth.signOut();

    const ownerId = signInData.user.id;

    // Step 2: Verify the user is actually an owner
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', ownerId)
      .single();

    if (roleError || !roleData || roleData.role !== 'owner') {
      return new Response(
        JSON.stringify({ success: false, error: 'The email provided does not belong to a shop owner' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Step 3: Check if member email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingMember = existingUsers?.users.find(u => u.email?.toLowerCase() === member_email.toLowerCase());
    
    if (existingMember) {
      // Check if they're already a team member of this owner
      const { data: existingTeamMember } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('member_user_id', existingMember.id)
        .single();

      if (existingTeamMember) {
        return new Response(
          JSON.stringify({ success: false, error: 'This email is already a team member of this shop' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'An account with this email already exists' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // Step 4: Create the team member account with the OWNER's password
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: member_email,
      password: owner_password, // Use owner's password (shared password model)
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: member_name,
        requested_role: member_role
      }
    });

    if (createError || !newUser.user) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ success: false, error: createError?.message || 'Failed to create team member account' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Step 5: Create profile for the new user
    await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: newUser.user.id,
        full_name: member_name
      });

    // Step 6: Assign role to the new user
    await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: member_role
      });

    // Step 7: Add to team_members table
    const { error: teamError } = await supabaseAdmin
      .from('team_members')
      .insert({
        owner_id: ownerId,
        member_user_id: newUser.user.id,
        member_email: member_email,
        role: member_role
      });

    if (teamError) {
      console.error('Error adding to team:', teamError);
      // Rollback: delete the created user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to add member to team' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get shop info for response
    const { data: shopData } = await supabaseAdmin
      .from('shop_profiles')
      .select('shop_name')
      .eq('owner_id', ownerId)
      .maybeSingle();

    // Record successful registration
    await supabaseAdmin.rpc('record_rate_limit_attempt', {
      _ip_address: clientIp,
      _action: 'register_team_member',
      _email: owner_email,
      _success: true
    });

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        role: member_role,
        shop_name: shopData?.shop_name || null,
        message: `Successfully registered as ${member_role} for ${shopData?.shop_name || 'the shop'}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in register-team-member:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
