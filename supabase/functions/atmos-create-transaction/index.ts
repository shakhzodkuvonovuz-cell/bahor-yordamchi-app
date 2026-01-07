import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory token cache (duplicated for now - could use shared module)
let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getAtmosToken(): Promise<string> {
  const now = Date.now();
  
  if (cachedToken && cachedToken.expires_at > now + 5 * 60 * 1000) {
    return cachedToken.access_token;
  }
  
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
    throw new Error(`ATMOS token request failed: ${response.status}`);
  }
  
  const data = await response.json();
  const expiresIn = data.expires_in ? (data.expires_in - 300) * 1000 : 55 * 60 * 1000;
  
  cachedToken = {
    access_token: data.access_token,
    expires_at: now + expiresIn,
  };
  
  return data.access_token;
}

// Plan pricing in tiyin (1 UZS = 100 tiyin)
const PLAN_PRICES: Record<string, number> = {
  monthly: 49000 * 100,  // 49,000 UZS
  yearly: 340000 * 100,  // 340,000 UZS
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const { plan } = await req.json();
    
    if (!plan || !PLAN_PRICES[plan]) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const amountTiyin = PLAN_PRICES[plan];
    const storeId = Deno.env.get("ATMOS_STORE_ID");
    const testMode = Deno.env.get("ATMOS_TEST_MODE") === "true";
    const apiBase = Deno.env.get("ATMOS_API_BASE") || "https://apigw.atmos.uz";
    
    if (!storeId) {
      throw new Error("Missing ATMOS_STORE_ID");
    }
    
    // Generate unique account number for this transaction
    const account = `BAHOR-${user.id.slice(0, 8)}-${Date.now()}`;
    
    console.log("[atmos-create-transaction] Creating transaction:", {
      user_id: user.id,
      plan,
      amountTiyin,
      account,
      testMode,
    });
    
    // Get ATMOS token
    const accessToken = await getAtmosToken();
    
    // Create transaction in ATMOS
    const atmosResponse = await fetch(`${apiBase}/merchant/pay/create`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        store_id: parseInt(storeId),
        amount: amountTiyin,
        account,
        lang: "uz",
      }),
    });
    
    if (!atmosResponse.ok) {
      const errorText = await atmosResponse.text();
      console.error("[atmos-create-transaction] ATMOS API error:", atmosResponse.status, errorText);
      throw new Error(`ATMOS API error: ${atmosResponse.status}`);
    }
    
    const atmosData = await atmosResponse.json();
    console.log("[atmos-create-transaction] ATMOS response:", atmosData);
    
    if (!atmosData.transaction_id) {
      throw new Error("No transaction_id in ATMOS response");
    }
    
    // Store transaction in DB using service role
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
    
    const { data: txn, error: insertError } = await adminSupabase
      .from("atmos_transactions")
      .insert({
        user_id: user.id,
        plan,
        amount_tiyin: amountTiyin,
        currency: "UZS",
        account,
        store_id: storeId,
        transaction_id: String(atmosData.transaction_id),
        status: "pending",
        provider_payload: atmosData,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error("[atmos-create-transaction] DB insert error:", insertError);
      throw new Error("Failed to save transaction");
    }
    
    // Generate checkout URL
    const checkoutBase = testMode 
      ? Deno.env.get("ATMOS_CHECKOUT_BASE_TEST") || "http://test-checkout.pays.uz/invoice/get"
      : Deno.env.get("ATMOS_CHECKOUT_BASE_PROD") || "https://checkout.pays.uz/invoice/get";
    
    const checkoutUrl = `${checkoutBase}/${atmosData.transaction_id}`;
    
    console.log("[atmos-create-transaction] Success:", {
      transaction_id: atmosData.transaction_id,
      checkout_url: checkoutUrl,
    });
    
    return new Response(JSON.stringify({
      transaction_id: atmosData.transaction_id,
      checkout_url: checkoutUrl,
      account,
      internal_id: txn.id,
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
