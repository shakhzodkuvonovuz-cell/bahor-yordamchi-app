import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Profile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  plan: string;
  messages_today: number;
  daily_limit: number;
  last_reset_date: string;
  created_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization')!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /profile - Get user profile
    if (req.method === 'GET') {
      // Check if we need to reset daily counter
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        return new Response(
          JSON.stringify({ error: fetchError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Reset messages_today if it's a new day
      const today = new Date().toISOString().split('T')[0];
      if (profile.last_reset_date !== today) {
        await supabase
          .from('profiles')
          .update({ 
            messages_today: 0, 
            last_reset_date: today 
          })
          .eq('user_id', user.id);
        
        profile.messages_today = 0;
        profile.last_reset_date = today;
      }

      // Return profile with email from auth
      return new Response(
        JSON.stringify({
          userId: user.id,
          email: user.email,
          firstName: profile.first_name,
          lastName: profile.last_name,
          avatarUrl: profile.avatar_url,
          phone: profile.phone,
          plan: profile.plan,
          messagesToday: profile.messages_today,
          dailyLimit: profile.daily_limit,
          createdAt: profile.created_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /profile - Update user profile
    if (req.method === 'PUT') {
      const body = await req.json();
      const { firstName, lastName, phone } = body;

      // Input validation constants
      const MAX_NAME_LENGTH = 100;
      const MAX_PHONE_LENGTH = 20;

      // Validate firstName - type and length
      if (firstName !== undefined && firstName !== null) {
        if (typeof firstName !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Invalid firstName type' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (firstName.length > MAX_NAME_LENGTH) {
          return new Response(
            JSON.stringify({ error: `firstName must be under ${MAX_NAME_LENGTH} characters` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Validate lastName - type and length
      if (lastName !== undefined && lastName !== null) {
        if (typeof lastName !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Invalid lastName type' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (lastName.length > MAX_NAME_LENGTH) {
          return new Response(
            JSON.stringify({ error: `lastName must be under ${MAX_NAME_LENGTH} characters` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Validate phone - type and length
      if (phone !== undefined && phone !== null) {
        if (typeof phone !== 'string') {
          return new Response(
            JSON.stringify({ error: 'Invalid phone type' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        if (phone.length > MAX_PHONE_LENGTH) {
          return new Response(
            JSON.stringify({ error: `phone must be under ${MAX_PHONE_LENGTH} characters` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Update profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName?.trim() || null,
          last_name: lastName?.trim() || null,
          phone: phone?.trim() || null,
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          userId: user.id,
          email: user.email,
          firstName: updatedProfile.first_name,
          lastName: updatedProfile.last_name,
          avatarUrl: updatedProfile.avatar_url,
          phone: updatedProfile.phone,
          plan: updatedProfile.plan,
          messagesToday: updatedProfile.messages_today,
          dailyLimit: updatedProfile.daily_limit,
          createdAt: updatedProfile.created_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Profile endpoint error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
