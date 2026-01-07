import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory token cache
let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getAtmosToken(): Promise<string> {
  const now = Date.now();
  
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expires_at > now + 5 * 60 * 1000) {
    console.log("[atmos-token] Using cached token");
    return cachedToken.access_token;
  }
  
  console.log("[atmos-token] Fetching new token from ATMOS");
  
  const ATMOS_API_BASE = Deno.env.get("ATMOS_API_BASE") || "https://apigw.atmos.uz";
  const ATMOS_CONSUMER_ID = Deno.env.get("ATMOS_CONSUMER_ID");
  const ATMOS_CONSUMER_SECRET = Deno.env.get("ATMOS_CONSUMER_SECRET");
  
  if (!ATMOS_CONSUMER_ID || !ATMOS_CONSUMER_SECRET) {
    throw new Error("Missing ATMOS credentials");
  }
  
  const credentials = btoa(`${ATMOS_CONSUMER_ID}:${ATMOS_CONSUMER_SECRET}`);
  
  const response = await fetch(`${ATMOS_API_BASE}/token?grant_type=client_credentials`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("[atmos-token] Token request failed:", response.status, errorText);
    throw new Error(`ATMOS token request failed: ${response.status}`);
  }
  
  const data = await response.json();
  console.log("[atmos-token] Token received, expires_in:", data.expires_in);
  
  // Cache for ~55 minutes (or expires_in - 5 min if provided)
  const expiresIn = data.expires_in ? (data.expires_in - 300) * 1000 : 55 * 60 * 1000;
  
  cachedToken = {
    access_token: data.access_token,
    expires_at: now + expiresIn,
  };
  
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // This endpoint is internal - only called by other edge functions
    // But we'll allow auth'd requests for debugging
    const authHeader = req.headers.get("Authorization");
    
    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } },
      });
      
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    
    const access_token = await getAtmosToken();
    
    return new Response(JSON.stringify({ access_token }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[atmos-token] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
