import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * PDF-HTML Edge Function (tmp-html)
 * 
 * Serves temporary HTML content for iLoveAPI htmlpdf conversion.
 * This is a PUBLIC endpoint (no auth required) because iLoveAPI needs to fetch the HTML.
 * Security is handled via:
 * - Short-lived tokens (10 minutes)
 * - One-time use (marked as used after access)
 * - Random UUIDs for IDs
 * - Token hashing for storage security
 */

// Hash token using SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  // Handle CORS preflight - minimal response
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      }
    });
  }

  // Only allow GET requests
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
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

    // Verify token - compare hash
    const providedTokenHash = await hashToken(token);
    if (doc.token !== providedTokenHash && doc.token !== token) {
      // Support both hashed and unhashed tokens during transition
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

    // Mark as used immediately (await to ensure it's done)
    await supabase
      .from("temp_html_docs")
      .update({ used: true })
      .eq("id", id);
    
    console.log("[pdf-html] Serving HTML for:", id, "length:", doc.html.length);

    // Return the HTML content with proper headers for rendering
    // CRITICAL: No Content-Disposition header - must render in browser
    return new Response(doc.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error("[pdf-html] Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
