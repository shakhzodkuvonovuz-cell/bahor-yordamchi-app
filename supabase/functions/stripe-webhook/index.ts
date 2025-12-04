import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify webhook signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No stripe-signature header");

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logStep("Webhook signature verification failed", { error: msg });
      return new Response(JSON.stringify({ error: `Webhook Error: ${msg}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Webhook verified", { type: event.type, id: event.id });

    // Initialize Supabase with service role for admin operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle different event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout completed", { 
          sessionId: session.id, 
          customerId: session.customer,
          subscriptionId: session.subscription 
        });

        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await handleSubscriptionChange(supabase, stripe, subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription created/updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status 
        });
        await handleSubscriptionChange(supabase, stripe, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription deleted", { subscriptionId: subscription.id });
        await handleSubscriptionChange(supabase, stripe, subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logStep("Payment failed", { invoiceId: invoice.id, subscriptionId: invoice.subscription });
        
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await handleSubscriptionChange(supabase, stripe, subscription);
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleSubscriptionChange(
  supabase: SupabaseClient<any, any, any>,
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  logStep("Processing subscription change", { 
    subscriptionId: subscription.id, 
    customerId, 
    status: subscription.status 
  });

  // Get customer email to find user
  const customer = await stripe.customers.retrieve(customerId);
  if (customer.deleted || !('email' in customer) || !customer.email) {
    logStep("Customer not found or deleted", { customerId });
    return;
  }

  const email = customer.email;
  logStep("Found customer email", { email });

  // Find user by email
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    logStep("Error listing users", { error: userError.message });
    return;
  }

  const user = users.users.find((u: { email?: string }) => u.email === email);
  if (!user) {
    logStep("User not found for email", { email });
    return;
  }

  logStep("Found user", { userId: user.id });

  // Determine plan based on subscription status
  const isActive = ["active", "trialing"].includes(subscription.status);
  const newPlan = isActive ? "premium" : "free";
  const newDailyLimit = isActive ? 200 : 5;

  // Upsert subscription record
  const subscriptionData = {
    user_id: user.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    price_id: subscription.items.data[0]?.price.id || null,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };

  const { error: subError } = await supabase
    .from("subscriptions")
    .upsert(subscriptionData, { 
      onConflict: "stripe_subscription_id",
      ignoreDuplicates: false 
    });

  if (subError) {
    logStep("Error upserting subscription", { error: subError.message });
  } else {
    logStep("Subscription record upserted");
  }

  // Update user profile plan
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ 
      plan: newPlan, 
      daily_limit: newDailyLimit,
      updated_at: new Date().toISOString() 
    })
    .eq("user_id", user.id);

  if (profileError) {
    logStep("Error updating profile plan", { error: profileError.message });
  } else {
    logStep("Profile plan updated", { userId: user.id, plan: newPlan, dailyLimit: newDailyLimit });
  }
}
