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
    return cachedToken.access_token;
  }
  
  const ATMOS_API_BASE = Deno.env.get("ATMOS_API_BASE") || "https://apigw.atmos.uz";
  const ATMOS_CONSUMER_ID = Deno.env.get("ATMOS_CONSUMER_ID");
  const ATMOS_CONSUMER_SECRET = Deno.env.get("ATMOS_CONSUMER_SECRET");
  
  if (!ATMOS_CONSUMER_ID || !ATMOS_CONSUMER_SECRET) {
    throw new Error("Missing ATMOS credentials");
  }
  
  const credentials = btoa(`${ATMOS_CONSUMER_ID}:${ATMOS_CONSUMER_SECRET}`);
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const response = await fetch(`${ATMOS_API_BASE}/token?grant_type=client_credentials`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
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
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error("ATMOS token request timed out");
    }
    throw error;
  }
}

// Map ATMOS status to our status: confirmed|failed|canceled|pending
function mapAtmosStatus(atmosStatus: string | undefined): string {
  if (!atmosStatus) return "pending";
  
  const status = atmosStatus.toUpperCase();
  
  if (status === "SUCCESS" || status === "PAID" || status === "CONFIRMED") {
    return "confirmed";
  } else if (status === "FAILED" || status === "ERROR") {
    return "failed";
  } else if (status === "CANCELLED" || status === "CANCELED") {
    return "canceled";
  }
  
  return "pending";
}

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
    
    const { transaction_id } = await req.json();
    
    if (!transaction_id) {
      return new Response(JSON.stringify({ error: "transaction_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Use service role for DB writes
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
    const ATMOS_API_BASE = Deno.env.get("ATMOS_API_BASE") || "https://apigw.atmos.uz";
    const ATMOS_STORE_ID = Deno.env.get("ATMOS_STORE_ID");
    
    // Get transaction from DB
    const { data: txn, error: fetchError } = await adminSupabase
      .from("atmos_transactions")
      .select("*")
      .eq("transaction_id", String(transaction_id))
      .eq("user_id", user.id)
      .single();
    
    if (fetchError || !txn) {
      console.error("[atmos-transaction-info] Transaction not found:", transaction_id, fetchError);
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Idempotency: if already confirmed with confirmed_at, return success immediately
    if (txn.status === "confirmed" && txn.confirmed_at) {
      console.log("[atmos-transaction-info] Transaction already confirmed:", transaction_id);
      return new Response(JSON.stringify({
        status: "confirmed",
        plan: txn.plan,
        confirmed_at: txn.confirmed_at,
        message: "Payment already processed",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Fetch current status from ATMOS with timeout
    const accessToken = await getAtmosToken();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    let atmosResponse;
    try {
      atmosResponse = await fetch(`${ATMOS_API_BASE}/merchant/pay/status`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          store_id: parseInt(ATMOS_STORE_ID!),
          transaction_id: parseInt(transaction_id),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error("ATMOS status request timed out");
      }
      throw error;
    }
    
    if (!atmosResponse.ok) {
      const errorText = await atmosResponse.text();
      console.error("[atmos-transaction-info] ATMOS status error:", atmosResponse.status, errorText);
      throw new Error(`ATMOS status check failed: ${atmosResponse.status}`);
    }
    
    const atmosData = await atmosResponse.json();
    console.log("[atmos-transaction-info] ATMOS status response:", JSON.stringify(atmosData));
    
    // Map ATMOS status to our status
    const atmosStatus = atmosData.state || atmosData.status || atmosData.result?.state;
    const newStatus = mapAtmosStatus(atmosStatus);
    
    console.log("[atmos-transaction-info] Status mapping:", atmosStatus, "->", newStatus);
    
    // If confirmed and confirmed_at is null, activate subscription
    if (newStatus === "confirmed" && !txn.confirmed_at) {
      console.log("[atmos-transaction-info] Activating subscription for user:", user.id, "plan:", txn.plan);
      
      const now = new Date();
      const periodEnd = new Date(now);
      
      // Set period end: monthly=now+30d, yearly=now+365d
      if (txn.plan === "premium_yearly") {
        periodEnd.setDate(periodEnd.getDate() + 365);
      } else {
        periodEnd.setDate(periodEnd.getDate() + 30);
      }
      
      // Update transaction with confirmed_at
      await adminSupabase
        .from("atmos_transactions")
        .update({
          status: "confirmed",
          confirmed_at: now.toISOString(),
          provider_payload: atmosData,
          updated_at: now.toISOString(),
        })
        .eq("id", txn.id);
      
      // Upsert subscription (handles both create and update)
      const { error: subError } = await adminSupabase
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          plan: "premium",
          status: "active",
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          last_transaction_id: txn.id,
          updated_at: now.toISOString(),
        }, {
          onConflict: "user_id",
        });
      
      if (subError) {
        console.error("[atmos-transaction-info] Subscription upsert error:", subError);
        // Continue - transaction is confirmed even if subscription fails
      }
      
      // Update profiles.plan to "premium"
      const { error: profileError } = await adminSupabase
        .from("profiles")
        .update({ 
          plan: "premium",
          updated_at: now.toISOString(),
        })
        .eq("user_id", user.id);
      
      if (profileError) {
        console.error("[atmos-transaction-info] Profile update error:", profileError);
        // Continue - subscription is created
      }
      
      console.log("[atmos-transaction-info] Subscription activated successfully");
      
      return new Response(JSON.stringify({
        status: "confirmed",
        plan: txn.plan,
        confirmed_at: now.toISOString(),
        subscription_end: periodEnd.toISOString(),
        message: "Payment confirmed and subscription activated",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Update transaction status if changed
    if (newStatus !== txn.status) {
      await adminSupabase
        .from("atmos_transactions")
        .update({
          status: newStatus,
          provider_payload: atmosData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", txn.id);
    }
    
    return new Response(JSON.stringify({
      status: newStatus,
      plan: txn.plan,
      atmos_status: atmosStatus,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("[atmos-transaction-info] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
