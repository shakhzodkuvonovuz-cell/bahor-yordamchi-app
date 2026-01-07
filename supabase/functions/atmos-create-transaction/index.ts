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

  if (cachedToken && cachedToken.expires_at > now + 5 * 60 * 1000) {
    console.log("[atmos] Using cached token");
    return cachedToken.access_token;
  }

  const rawBase = Deno.env.get("ATMOS_API_BASE") || "https://apigw.atmos.uz";
  const ATMOS_API_BASE = rawBase.replace(/\/$/, "");
  const ATMOS_CONSUMER_ID = Deno.env.get("ATMOS_CONSUMER_ID");
  const ATMOS_CONSUMER_SECRET = Deno.env.get("ATMOS_CONSUMER_SECRET");

  if (!ATMOS_CONSUMER_ID || !ATMOS_CONSUMER_SECRET) {
    throw new Error("Missing ATMOS credentials");
  }

  console.log("[atmos] Fetching new token", { base: ATMOS_API_BASE });

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
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[atmos] Token request failed:", response.status, errorText);
        throw new Error(`ATMOS token request failed: ${response.status}`);
      }

      const data = await response.json();
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
      console.warn("[atmos] Token fetch failed, retrying once...");
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

// Server-side pricing (don't trust client)
const PLAN_PRICES: Record<string, number> = {
  premium_monthly: 49000 * 100,  // 4,900,000 tiyin = 49,000 UZS
  premium_yearly: 340000 * 100,  // 34,000,000 tiyin = 340,000 UZS
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Strict auth: user must be logged in
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Validate user
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const { plan } = await req.json();
    
    if (!plan || !PLAN_PRICES[plan]) {
      return new Response(JSON.stringify({ 
        error: "Invalid plan. Must be 'premium_monthly' or 'premium_yearly'" 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Server computes amount (don't trust client)
    const amount_tiyin = PLAN_PRICES[plan];
    
    const ATMOS_STORE_ID = Deno.env.get("ATMOS_STORE_ID");
    const ATMOS_TEST_MODE = Deno.env.get("ATMOS_TEST_MODE") === "true";
    const ATMOS_API_BASE = Deno.env.get("ATMOS_API_BASE") || "https://apigw.atmos.uz";
    
    if (!ATMOS_STORE_ID) {
      throw new Error("ATMOS_STORE_ID not configured");
    }
    
    // Create unique account = "user_<uid>_<plan>_<uuid>"
    const uniqueId = crypto.randomUUID().split('-')[0];
    const account = `user_${user.id.substring(0, 8)}_${plan}_${uniqueId}`;
    
    console.log("[atmos-create-transaction] Creating transaction:", {
      user_id: user.id,
      plan,
      amount_tiyin,
      account,
      test_mode: ATMOS_TEST_MODE,
    });
    
    // Get ATMOS token
    const accessToken = await getAtmosToken();
    
    // Create transaction with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    let atmosResponse;
    try {
      atmosResponse = await fetch(`${ATMOS_API_BASE}/merchant/pay/create`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          store_id: parseInt(ATMOS_STORE_ID),
          amount: amount_tiyin,
          account,
          lang: "uz",
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error("ATMOS transaction creation timed out");
      }
      throw error;
    }
    
    if (!atmosResponse.ok) {
      const errorText = await atmosResponse.text();
      console.error("[atmos-create-transaction] ATMOS API error:", atmosResponse.status, errorText);
      throw new Error(`ATMOS API error: ${atmosResponse.status}`);
    }
    
    const atmosData = await atmosResponse.json();
    console.log("[atmos-create-transaction] ATMOS response:", JSON.stringify(atmosData));
    
    const transaction_id = atmosData.transaction_id || atmosData.result?.transaction_id;
    if (!transaction_id) {
      throw new Error("No transaction_id in ATMOS response");
    }
    
    // Use service role for DB writes
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
    
    // Save transaction to database
    const { error: insertError } = await adminSupabase
      .from("atmos_transactions")
      .insert({
        user_id: user.id,
        plan,
        amount_tiyin,
        currency: "UZS",
        account,
        store_id: ATMOS_STORE_ID,
        transaction_id: String(transaction_id),
        status: "pending",
        provider_payload: atmosData,
      });
    
    if (insertError) {
      console.error("[atmos-create-transaction] DB insert error:", insertError);
      throw new Error("Failed to save transaction");
    }
    
    // Log payment event (no secrets logged)
    await adminSupabase.from("payment_events").insert({
      user_id: user.id,
      event: "create_transaction",
      transaction_id: String(transaction_id),
      status: "pending",
      meta: { plan, amount_tiyin },
    });
    
    // Build checkout URL
    const ATMOS_CHECKOUT_BASE = ATMOS_TEST_MODE 
      ? Deno.env.get("ATMOS_CHECKOUT_BASE_TEST")
      : Deno.env.get("ATMOS_CHECKOUT_BASE_PROD");
    
    if (!ATMOS_CHECKOUT_BASE) {
      throw new Error("ATMOS checkout base URL not configured");
    }
    
    // Prefer configured APP_URL, otherwise fall back to the caller origin.
    const originHeader = req.headers.get("origin");
    const refererHeader = req.headers.get("referer");
    let fallbackOrigin = "";
    try {
      const u = new URL(originHeader || refererHeader || "");
      fallbackOrigin = u.origin;
    } catch {
      fallbackOrigin = "";
    }

    const APP_URL = Deno.env.get("APP_URL") || fallbackOrigin || "https://bahorai.uz";
    const redirectLink = `${APP_URL}/payment/return?transactionId=${transaction_id}`;
    // URL format: ${base}?storeId=${ATMOS_STORE_ID}&transactionId=${transaction_id}&redirectLink=${encoded}
    const checkout_url = `${ATMOS_CHECKOUT_BASE}?storeId=${ATMOS_STORE_ID}&transactionId=${transaction_id}&redirectLink=${encodeURIComponent(redirectLink)}`;
    
    console.log("[atmos-create-transaction] Success:", {
      transaction_id,
      checkout_url,
    });
    
    return new Response(JSON.stringify({
      transaction_id: String(transaction_id),
      checkout_url,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[atmos-create-transaction] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
