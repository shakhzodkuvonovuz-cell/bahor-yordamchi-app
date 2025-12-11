import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Parse comma-separated emails from env
function getEmailList(envVar: string): string[] {
  const raw = Deno.env.get(envVar) || '';
  return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'AUTH_REQUIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'AUTH_REQUIRED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminEmails = getEmailList('ADMIN_EMAILS');
    const devEmails = getEmailList('DEV_UNLIMITED_EMAILS');
    const userEmail = user.email?.toLowerCase() || '';
    const isAdmin = adminEmails.includes(userEmail);
    const isDevBypass = devEmails.includes(userEmail);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // GET or POST: my-entitlement - any authenticated user can check their own status
    // Default action for GET requests without explicit action parameter
    // Also supports POST with { action: "my-entitlement" } in body
    let bodyAction: string | null = null;
    if (req.method === 'POST') {
      try {
        const clonedReq = req.clone();
        const body = await clonedReq.json();
        bodyAction = body?.action || null;
      } catch {
        // Body might not be JSON, that's ok
      }
    }
    
    const isMyEntitlement = 
      (req.method === 'GET' && (!action || action === 'my-entitlement')) ||
      (req.method === 'POST' && bodyAction === 'my-entitlement');
    
    if (isMyEntitlement) {
      // Ensure trial is initialized for the user (same as chat function)
      const TRIAL_DAYS = 7;
      if (!isDevBypass) {
        await supabaseAdmin.rpc('get_or_create_trial', { p_user_id: user.id, p_trial_days: TRIAL_DAYS });
      }
      
      // Get trial status which includes plan from profiles table
      const { data: trialData, error: trialError } = await supabaseAdmin.rpc('get_trial_status', { p_user_id: user.id });
      
      console.log('[my-entitlement] trialData:', JSON.stringify(trialData), 'error:', trialError);
      
      const plan = (trialData as any)?.plan || 'free';
      const isBetaActive = (trialData as any)?.is_beta_active || false;
      const betaExpiresAt = (trialData as any)?.beta_expires_at || null;
      const daysRemaining = (trialData as any)?.days_remaining || 0;
      const isPremium = isDevBypass || plan === 'dev_unlimited' || plan === 'beta_premium';
      
      // Get daily usage from usage_counters (same table chat function uses)
      const today = new Date().toISOString().split('T')[0];
      const { data: usageData } = await supabaseAdmin
        .from('usage_counters')
        .select('messages_used')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      const used = usageData?.messages_used || 0;
      // Limits: dev_unlimited = -1, beta_premium = 10, free = 5
      const limit = isDevBypass || plan === 'dev_unlimited' ? -1 : plan === 'beta_premium' ? 10 : 5;

      console.log('[my-entitlement] Response:', { email: userEmail, plan, isDevBypass, isBetaActive, limit, used });

      return new Response(
        JSON.stringify({
          plan: isDevBypass ? 'dev_unlimited' : plan,
          isPremium,
          isDevBypass,
          isBetaActive,
          betaExpiresAt,
          daysRemaining,
          usage: { date: today, used, limit },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All other actions require admin
    if (!isAdmin) {
      console.log(`Admin access denied for: ${userEmail}`);
      return new Response(
        JSON.stringify({ error: 'FORBIDDEN', message: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET: lookup entitlement by email
    if (req.method === 'GET' && action === 'lookup') {
      const email = url.searchParams.get('email')?.toLowerCase();
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find user by email
      const { data: users, error: lookupError } = await supabaseAdmin
        .from('profiles')
        .select('user_id, email, full_name, first_name, last_name')
        .ilike('email', email)
        .limit(1);

      if (lookupError || !users?.length) {
        // Try auth.users directly via admin API
        const { data: authUser } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        const foundUser = authUser?.users?.find(u => u.email?.toLowerCase() === email);
        
        if (!foundUser) {
          return new Response(
            JSON.stringify({ error: 'USER_NOT_FOUND', message: 'User not found with this email' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get entitlement for this user
        const { data: entitlement } = await supabaseAdmin
          .from('user_entitlements')
          .select('*')
          .eq('user_id', foundUser.id)
          .single();

        const devEmails = getEmailList('DEV_UNLIMITED_EMAILS');
        const isDevBypass = devEmails.includes(email);

        return new Response(
          JSON.stringify({
            user: {
              id: foundUser.id,
              email: foundUser.email,
              name: foundUser.user_metadata?.full_name || foundUser.user_metadata?.first_name || 'Unknown',
            },
            entitlement: entitlement || { plan: 'free', expires_at: null, flags: {}, note: null },
            isDevBypass,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const targetUser = users[0];
      const { data: entitlement } = await supabaseAdmin
        .from('user_entitlements')
        .select('*')
        .eq('user_id', targetUser.user_id)
        .single();

      const devEmails = getEmailList('DEV_UNLIMITED_EMAILS');
      const isDevBypass = devEmails.includes(email);

      return new Response(
        JSON.stringify({
          user: {
            id: targetUser.user_id,
            email: targetUser.email,
            name: targetUser.full_name || `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() || 'Unknown',
          },
          entitlement: entitlement || { plan: 'free', expires_at: null, flags: {}, note: null },
          isDevBypass,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: set entitlement
    if (req.method === 'POST' && action === 'set') {
      const body = await req.json();
      const { email, plan, expiresAt, note, flags } = body;

      if (!email || !plan) {
        return new Response(
          JSON.stringify({ error: 'Email and plan required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!['free', 'beta_premium', 'dev_unlimited'].includes(plan)) {
        return new Response(
          JSON.stringify({ error: 'Plan must be "free", "beta_premium", or "dev_unlimited"' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find user
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const targetUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (!targetUser) {
        return new Response(
          JSON.stringify({ error: 'USER_NOT_FOUND', message: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Upsert entitlement
      const { data: result, error: upsertError } = await supabaseAdmin
        .from('user_entitlements')
        .upsert({
          user_id: targetUser.id,
          plan,
          expires_at: expiresAt || null,
          note: note || null,
          flags: flags || {},
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        return new Response(
          JSON.stringify({ error: 'DATABASE_ERROR', message: upsertError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Admin ${userEmail} set entitlement for ${email}: plan=${plan}, expires=${expiresAt}`);

      return new Response(
        JSON.stringify({ success: true, entitlement: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: revoke (set to free)
    if (req.method === 'POST' && action === 'revoke') {
      const body = await req.json();
      const { email } = body;

      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find user
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      const targetUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (!targetUser) {
        return new Response(
          JSON.stringify({ error: 'USER_NOT_FOUND' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update or delete entitlement
      const { error: deleteError } = await supabaseAdmin
        .from('user_entitlements')
        .upsert({
          user_id: targetUser.id,
          plan: 'free',
          expires_at: null,
          note: 'Revoked by admin',
          flags: {},
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (deleteError) {
        console.error('Revoke error:', deleteError);
        return new Response(
          JSON.stringify({ error: 'DATABASE_ERROR' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Admin ${userEmail} revoked entitlement for ${email}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET: check admin status
    if (req.method === 'GET' && action === 'status') {
      const devEmails = getEmailList('DEV_UNLIMITED_EMAILS');
      const isDevBypass = devEmails.includes(userEmail);

      return new Response(
        JSON.stringify({ 
          isAdmin: true, 
          email: userEmail,
          isDevBypass,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Admin entitlements error:', error);
    return new Response(
      JSON.stringify({ error: 'SERVER_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
