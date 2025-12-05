import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * PDF-HTML Edge Function
 * 
 * Serves temporary HTML content for iLoveAPI htmlpdf conversion.
 * This is a PUBLIC endpoint (no auth required) because iLoveAPI needs to fetch the HTML.
 * Security is handled via:
 * - Short-lived tokens (10 minutes)
 * - One-time use (marked as used after access)
 * - Random UUIDs for IDs
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Parse query params
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const token = url.searchParams.get("token");

    if (!id || !token) {
      console.log("[pdf-html] Missing id or token");
      return new Response("Not Found", { status: 404 });
    }

    // Look up the temp HTML doc
    const { data: doc, error } = await supabase
      .from("temp_html_docs")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[pdf-html] DB error:", error);
      return new Response("Not Found", { status: 404 });
    }

    if (!doc) {
      console.log("[pdf-html] Document not found:", id);
      return new Response("Not Found", { status: 404 });
    }

    // Verify token
    if (doc.token !== token) {
      console.log("[pdf-html] Invalid token for:", id);
      return new Response("Not Found", { status: 404 });
    }

    // Check if already used
    if (doc.used) {
      console.log("[pdf-html] Document already used:", id);
      return new Response("Not Found", { status: 404 });
    }

    // Check expiry
    const now = new Date();
    const expiresAt = new Date(doc.expires_at);
    if (now > expiresAt) {
      console.log("[pdf-html] Document expired:", id);
      return new Response("Not Found", { status: 404 });
    }

    // Mark as used (don't await, let it happen async)
    supabase
      .from("temp_html_docs")
      .update({ used: true })
      .eq("id", id)
      .then(() => console.log("[pdf-html] Marked as used:", id));

    console.log("[pdf-html] Serving HTML for:", id, "length:", doc.html.length);

    // Return the HTML content
    return new Response(doc.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        ...corsHeaders,
      },
    });

  } catch (error) {
    console.error("[pdf-html] Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
