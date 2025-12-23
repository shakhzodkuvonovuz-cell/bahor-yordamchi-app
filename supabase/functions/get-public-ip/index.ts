import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[get-public-ip] Fetching outgoing public IP...");
    
    // Try ipify first (most reliable)
    let ip: string | null = null;
    
    try {
      const ipifyRes = await fetch("https://api.ipify.org?format=json", {
        signal: AbortSignal.timeout(5000),
      });
      if (ipifyRes.ok) {
        const data = await ipifyRes.json();
        ip = data.ip;
        console.log("[get-public-ip] Got IP from ipify:", ip);
      }
    } catch (e) {
      console.log("[get-public-ip] ipify failed, trying fallback...");
    }
    
    // Fallback to httpbin
    if (!ip) {
      try {
        const httpbinRes = await fetch("https://httpbin.org/ip", {
          signal: AbortSignal.timeout(5000),
        });
        if (httpbinRes.ok) {
          const data = await httpbinRes.json();
          ip = data.origin;
          console.log("[get-public-ip] Got IP from httpbin:", ip);
        }
      } catch (e) {
        console.log("[get-public-ip] httpbin also failed");
      }
    }
    
    if (!ip) {
      throw new Error("Could not determine public IP from any source");
    }
    
    return new Response(
      JSON.stringify({ 
        ip,
        timestamp: new Date().toISOString(),
        note: "This IP may change. Supabase Edge Functions run on distributed infrastructure."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to get public IP";
    console.error("[get-public-ip] Error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
