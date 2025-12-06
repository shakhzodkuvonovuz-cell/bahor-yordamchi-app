// Web search for Spaces /bahor
// Only accessible to space members

import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { query, space_id } = await req.json();

    if (!query || !space_id) {
      return new Response(
        JSON.stringify({ error: "query and space_id are required" }),
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

    // Use Google Custom Search
    const googleApiKey = Deno.env.get('GOOGLE_SEARCH_API_KEY');
    const googleCx = Deno.env.get('GOOGLE_CX');

    if (!googleApiKey || !googleCx) {
      console.error('Google Search API not configured');
      return new Response(
        JSON.stringify({ results: [], error: "SEARCH_NOT_CONFIGURED" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${encodeURIComponent(query)}&num=5`;
    
    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      console.error('Google search error:', searchResponse.status);
      return new Response(
        JSON.stringify({ results: [], error: "SEARCH_FAILED" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const searchData = await searchResponse.json();
    
    const results = (searchData.items || []).slice(0, 5).map((item: any) => ({
      title: item.title || '',
      url: item.link || '',
      snippet: item.snippet || '',
    }));

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('space-web-search error:', error);
    return new Response(
      JSON.stringify({ results: [], error: "SERVER_ERROR" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
