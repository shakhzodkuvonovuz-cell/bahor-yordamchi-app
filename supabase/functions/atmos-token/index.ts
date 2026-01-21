import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory token cache
let cachedToken: { access_token: string; expires_at: number } | null = null;

function getProxyClient() {
  const FIXIE_URL = Deno.env.get("FIXIE_URL") || "";
  if (!FIXIE_URL) return null;
  return Deno.createHttpClient({ proxy: { url: FIXIE_URL } });
}

export async function getAtmosToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expires_at > now + 5 * 60 * 1000) {
    console.log("[atmos-token] Using cached token");
    return cachedToken.access_token;
  }

  const rawBase = Deno.env.get("ATMOS_API_BASE") || "https://apigw.atmos.uz";
  const ATMOS_API_BASE = rawBase.replace(/\/$/, "");
  const ATMOS_CONSUMER_ID = Deno.env.get("ATMOS_CONSUMER_ID");
  const ATMOS_CONSUMER_SECRET = Deno.env.get("ATMOS_CONSUMER_SECRET");

  if (!ATMOS_CONSUMER_ID || !ATMOS_CONSUMER_SECRET) {
    throw new Error("Missing ATMOS credentials");
  }

  console.log("[atmos-token] Fetching new token from ATMOS", { base: ATMOS_API_BASE });

  const proxyClient = getProxyClient();
  if (proxyClient) console.log("[atmos-token] Using Fixie proxy");

  const credentials = btoa(`${ATMOS_CONSUMER_ID}:${ATMOS_CONSUMER_SECRET}`);

  const fetchTokenOnce = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(`${ATMOS_API_BASE}/token?grant_type=client_credentials`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: controller.signal,
        ...(proxyClient ? { client: proxyClient } : {}),
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

      return data.access_token as string;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    // One retry to smooth out transient network issues
    try {
      return await fetchTokenOnce();
    } catch (e) {
      console.warn("[atmos-token] Token fetch failed, retrying once...");
      await new Promise((r) => setTimeout(r, 600));
      return await fetchTokenOnce();
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("ATMOS token request timed out");
    }
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // This endpoint is internal - only called by other edge functions
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
