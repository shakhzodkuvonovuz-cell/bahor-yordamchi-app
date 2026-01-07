import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let status: "ok" | "fail" = "fail";
  let errorMessage: string | null = null;
  let tokenPreview: string | null = null;
  let latencyMs = 0;

  try {
    const rawBase = Deno.env.get("ATMOS_API_BASE") || "https://apigw.atmos.uz";
    const ATMOS_API_BASE = rawBase.replace(/\/$/, "");
    const ATMOS_CONSUMER_ID = Deno.env.get("ATMOS_CONSUMER_ID");
    const ATMOS_CONSUMER_SECRET = Deno.env.get("ATMOS_CONSUMER_SECRET");

    if (!ATMOS_CONSUMER_ID || !ATMOS_CONSUMER_SECRET) {
      throw new Error("Missing ATMOS credentials (ATMOS_CONSUMER_ID or ATMOS_CONSUMER_SECRET)");
    }

    const credentials = btoa(`${ATMOS_CONSUMER_ID}:${ATMOS_CONSUMER_SECRET}`);

    console.log("[atmos-health] Pinging ATMOS token endpoint:", ATMOS_API_BASE);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(`${ATMOS_API_BASE}/token?grant_type=client_credentials`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: controller.signal,
      });

      latencyMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();
      
      if (data.access_token) {
        status = "ok";
        // Show first 10 chars of token for verification
        tokenPreview = data.access_token.slice(0, 10) + "...";
      } else {
        throw new Error("No access_token in response");
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err: unknown) {
    latencyMs = Date.now() - startTime;
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        errorMessage = "Request timed out after 30s";
      } else {
        errorMessage = err.message;
      }
    } else {
      errorMessage = "Unknown error";
    }
    console.error("[atmos-health] Error:", errorMessage);
  }

  return new Response(
    JSON.stringify({
      status,
      latency_ms: latencyMs,
      token_preview: tokenPreview,
      error: errorMessage,
      checked_at: new Date().toISOString(),
      api_base: Deno.env.get("ATMOS_API_BASE") || "https://apigw.atmos.uz",
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
