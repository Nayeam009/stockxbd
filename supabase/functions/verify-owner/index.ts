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
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { owner_email } = await req.json();

    if (!owner_email) {
      return new Response(
        JSON.stringify({ exists: false, error: 'Owner email is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Find the user by email
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error listing users:', userError);
      return new Response(
        JSON.stringify({ exists: false, error: 'Failed to verify owner' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const owner = userData.users.find(u => u.email?.toLowerCase() === owner_email.toLowerCase());

    if (!owner) {
      return new Response(
        JSON.stringify({ exists: false, error: 'Owner not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if the user has owner role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', owner.id)
      .single();

    if (roleError || !roleData || roleData.role !== 'owner') {
      return new Response(
        JSON.stringify({ exists: false, error: 'User is not an owner' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Get owner's shop info
    const { data: shopData } = await supabaseAdmin
      .from('shop_profiles')
      .select('id, shop_name')
      .eq('owner_id', owner.id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        exists: true,
        owner_id: owner.id,
        shop_name: shopData?.shop_name || null,
        shop_id: shopData?.id || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-owner:', error);
    return new Response(
      JSON.stringify({ exists: false, error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});