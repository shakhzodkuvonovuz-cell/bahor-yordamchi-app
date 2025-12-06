// Generate signed URL for space chat files
// Only accessible to space members

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { path, space_id } = await req.json();

    if (!path || !space_id) {
      return new Response(
        JSON.stringify({ error: "path and space_id are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check membership
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('space_members')
      .select('id')
      .eq('space_id', space_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !membership) {
      return new Response(
        JSON.stringify({ error: "NOT_MEMBER" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate signed URL (1 hour expiry)
    const { data, error } = await supabaseAdmin.storage
      .from('space-chat-files')
      .createSignedUrl(path, 3600);

    if (error || !data?.signedUrl) {
      console.error('Signed URL error:', error);
      return new Response(
        JSON.stringify({ error: "SIGNED_URL_FAILED" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ signedUrl: data.signedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('space-file-signed-url error:', error);
    return new Response(
      JSON.stringify({ error: "SERVER_ERROR" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
