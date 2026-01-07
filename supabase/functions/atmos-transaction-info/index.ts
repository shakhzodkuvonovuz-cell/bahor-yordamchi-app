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
    
    const { transaction_id } = await req.json();
    
    if (!transaction_id) {
      return new Response(JSON.stringify({ error: "Missing transaction_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
    const apiBase = Deno.env.get("ATMOS_API_BASE") || "https://apigw.atmos.uz";
    
    // Get transaction from DB
    const { data: txn, error: fetchError } = await adminSupabase
      .from("atmos_transactions")
      .select("*")
      .eq("transaction_id", transaction_id)
      .eq("user_id", user.id)
      .single();
    
    if (fetchError || !txn) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // If already confirmed, return success (idempotent)
    if (txn.status === "confirmed") {
      console.log("[atmos-transaction-info] Transaction already confirmed:", transaction_id);
      return new Response(JSON.stringify({
        status: "confirmed",
        plan: txn.plan,
        message: "Payment already processed",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Query ATMOS for current status
    const accessToken = await getAtmosToken();
    const storeId = Deno.env.get("ATMOS_STORE_ID");
    
    const atmosResponse = await fetch(`${apiBase}/merchant/pay/status`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        store_id: parseInt(storeId!),
        transaction_id: parseInt(transaction_id),
      }),
    });
    
    if (!atmosResponse.ok) {
      const errorText = await atmosResponse.text();
      console.error("[atmos-transaction-info] ATMOS status error:", atmosResponse.status, errorText);
      throw new Error(`ATMOS status check failed: ${atmosResponse.status}`);
    }
    
    const atmosData = await atmosResponse.json();
    console.log("[atmos-transaction-info] ATMOS status response:", atmosData);
    
    // Map ATMOS status to our status
    // ATMOS statuses: CREATED, PENDING, SUCCESS, CANCELLED, FAILED
    let newStatus = txn.status;
    const atmosStatus = atmosData.state?.toUpperCase() || atmosData.status?.toUpperCase();
    
    if (atmosStatus === "SUCCESS" || atmosStatus === "PAID") {
      newStatus = "confirmed";
    } else if (atmosStatus === "CANCELLED" || atmosStatus === "CANCELED") {
      newStatus = "canceled";
    } else if (atmosStatus === "FAILED") {
      newStatus = "failed";
    } else if (atmosStatus === "PENDING" || atmosStatus === "CREATED") {
      newStatus = "pending";
    }
    
    // If payment is confirmed and not yet processed, activate subscription
    if (newStatus === "confirmed" && txn.status !== "confirmed") {
      console.log("[atmos-transaction-info] Activating subscription for user:", user.id, "plan:", txn.plan);
      
      const now = new Date();
      const periodEnd = new Date(now);
      
      // Set period end based on plan
      if (txn.plan === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }
      
      // Update transaction status
      await adminSupabase
        .from("atmos_transactions")
        .update({
          status: "confirmed",
          confirmed_at: now.toISOString(),
          provider_payload: atmosData,
        })
        .eq("id", txn.id);
      
      // Create or update subscription
      const { data: existingSub } = await adminSupabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();
      
      if (existingSub) {
        // Update existing subscription
        await adminSupabase
          .from("subscriptions")
          .update({
            plan: txn.plan,
            status: "active",
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            last_transaction_id: txn.id,
          })
          .eq("id", existingSub.id);
      } else {
        // Create new subscription
        await adminSupabase
          .from("subscriptions")
          .insert({
            user_id: user.id,
            plan: txn.plan,
            status: "active",
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            last_transaction_id: txn.id,
          });
      }
      
      // Update user profile plan
      const profilePlan = txn.plan === "yearly" ? "ultra" : "premium";
      await adminSupabase
        .from("profiles")
        .update({ 
          plan: profilePlan,
          updated_at: now.toISOString(),
        })
        .eq("user_id", user.id);
      
      console.log("[atmos-transaction-info] Subscription activated successfully");
      
      return new Response(JSON.stringify({
        status: "confirmed",
        plan: txn.plan,
        message: "Payment confirmed and subscription activated",
        subscription_end: periodEnd.toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Update transaction with latest status if changed
    if (newStatus !== txn.status) {
      await adminSupabase
        .from("atmos_transactions")
        .update({
          status: newStatus,
          provider_payload: atmosData,
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
