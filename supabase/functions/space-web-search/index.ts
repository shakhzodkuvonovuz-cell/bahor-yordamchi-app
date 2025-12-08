// Web search for Spaces /bahor
// Only accessible to space members
// Includes caching + rate limiting (self-contained)

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// CONFIGURATION
// ============================================

const GLOBAL_SEARCH_PER_MINUTE_LIMIT = 120;
const SHORT_TTL_MINUTES = 45;
const LONG_TTL_MINUTES = 720;

const TIME_SENSITIVE_KEYWORDS = [
  "bugun", "today", "latest", "so'nggi", "yangilik", "news",
  "this week", "bu hafta", "hozir", "now", "current", "joriy",
  "2025", "2024", "сегодня", "новости", "последние"
];

const BUSY_MESSAGES: Record<string, string> = {
  uz: "⚠️ Hozir qidiruv band. Birozdan keyin urinib ko'ring.",
  en: "⚠️ Search is currently busy. Please try again shortly.",
  ru: "⚠️ Поиск сейчас занят. Попробуйте позже.",
  tr: "⚠️ Arama şu an meşgul. Lütfen biraz sonra tekrar deneyin.",
};

// ============================================
// UTILITIES
// ============================================

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getTTLMinutes(query: string): number {
  const qLower = query.toLowerCase();
  for (const keyword of TIME_SENSITIVE_KEYWORDS) {
    if (qLower.includes(keyword)) return SHORT_TTL_MINUTES;
  }
  return LONG_TTL_MINUTES;
}

function getMinuteBucket(): string {
  return new Date().toISOString().slice(0, 16);
}

// ============================================
// LOGGING
// ============================================

async function logSearchEvent(userId: string | null, meta: any): Promise<void> {
  if (!userId) return;
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("usage_events").insert({
      user_id: userId,
      event_type: "search",
      meta,
    });
    if (error) {
      console.log("[search] log error:", error.message);
    } else {
      console.log("[search] logged usage_event", { cache_hit: meta.cache_hit, user_id: userId });
    }
  } catch (e) {
    console.log("[search] log exception:", e);
  }
}

// ============================================
// CACHE
// ============================================

async function getCachedResult(queryNorm: string, cx: string): Promise<any | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("search_cache")
      .select("result_json")
      .eq("query_norm", queryNorm)
      .eq("cx", cx)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();
    return data?.result_json || null;
  } catch (e) {
    console.log("[search] cache lookup error:", e);
    return null;
  }
}

async function storeCacheResult(queryNorm: string, cx: string, locale: string | null, resultJson: any, ttlMinutes: number): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    await supabase.from("search_cache").insert({
      query_norm: queryNorm,
      cx,
      locale,
      result_json: resultJson,
      expires_at: expiresAt,
    });
    console.log("[search] cached result, TTL:", ttlMinutes, "min");
  } catch (e) {
    console.log("[search] cache store error:", e);
  }
}

// ============================================
// BURST LIMITER
// ============================================

async function checkAndIncrementBurst(): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const bucket = getMinuteBucket();
    
    const { data: existing } = await supabase
      .from("search_global_burst")
      .select("count")
      .eq("minute_bucket", bucket)
      .maybeSingle();
    
    if (existing) {
      if (existing.count >= GLOBAL_SEARCH_PER_MINUTE_LIMIT) {
        console.log("[search] burst limit reached:", existing.count);
        return false;
      }
      await supabase
        .from("search_global_burst")
        .update({ count: existing.count + 1 })
        .eq("minute_bucket", bucket);
      return true;
    } else {
      await supabase.from("search_global_burst").insert({ minute_bucket: bucket, count: 1 });
      return true;
    }
  } catch (e) {
    console.log("[search] burst check error:", e);
    return true; // Fail open
  }
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, space_id, lang } = await req.json();

    if (!query || !space_id) {
      return new Response(
        JSON.stringify({ error: "query and space_id are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = getSupabaseAdmin();

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check membership
    const { data: membership } = await supabaseAdmin
      .from('space_members')
      .select('id')
      .eq('space_id', space_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "NOT_MEMBER" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleApiKey = Deno.env.get('GOOGLE_SEARCH_API_KEY');
    const googleCx = Deno.env.get('GOOGLE_CX');
    const busyMessage = BUSY_MESSAGES[lang || 'uz'] || BUSY_MESSAGES.uz;

    if (!googleApiKey || !googleCx) {
      return new Response(
        JSON.stringify({ results: [], error: "SEARCH_NOT_CONFIGURED" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const queryNorm = normalizeQuery(query);

    // Check cache first
    const cached = await getCachedResult(queryNorm, googleCx);
    if (cached) {
      console.log("[search] CACHE HIT for space search");
      await logSearchEvent(user.id, { cache_hit: true, query_length: query.length, results_count: cached.items?.length || 0 });
      
      const results = (cached.items || []).slice(0, 5).map((item: any) => ({
        title: item.title || '',
        url: item.link || '',
        snippet: item.snippet || '',
      }));
      
      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check burst limit
    const burstAllowed = await checkAndIncrementBurst();
    if (!burstAllowed) {
      await logSearchEvent(user.id, { cache_hit: false, query_length: query.length, error: "burst_limit" });
      return new Response(
        JSON.stringify({ results: [], error: "SEARCH_BUSY", message: busyMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Google
    const searchStart = Date.now();
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleCx}&q=${encodeURIComponent(query)}&num=5`;
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    
    try {
      const searchResponse = await fetch(searchUrl, { signal: controller.signal });
      clearTimeout(timeout);
      
      const googleMs = Date.now() - searchStart;
      
      if (searchResponse.status === 429 || searchResponse.status === 403) {
        await logSearchEvent(user.id, { cache_hit: false, query_length: query.length, google_call_ms: googleMs, error: `rate_limited_${searchResponse.status}` });
        return new Response(
          JSON.stringify({ results: [], error: "SEARCH_BUSY", message: busyMessage }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (!searchResponse.ok) {
        await logSearchEvent(user.id, { cache_hit: false, query_length: query.length, google_call_ms: googleMs, error: `http_${searchResponse.status}` });
        return new Response(
          JSON.stringify({ results: [], error: "SEARCH_FAILED" }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const searchData = await searchResponse.json();
      
      // Cache the result
      const ttl = getTTLMinutes(query);
      await storeCacheResult(queryNorm, googleCx, lang || null, searchData, ttl);
      
      const results = (searchData.items || []).slice(0, 5).map((item: any) => ({
        title: item.title || '',
        url: item.link || '',
        snippet: item.snippet || '',
      }));
      
      await logSearchEvent(user.id, { cache_hit: false, query_length: query.length, google_call_ms: googleMs, results_count: results.length });

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
      
    } catch (err) {
      clearTimeout(timeout);
      const isTimeout = err instanceof Error && err.name === "AbortError";
      await logSearchEvent(user.id, { cache_hit: false, query_length: query.length, error: isTimeout ? "timeout" : "fetch_error" });
      
      if (isTimeout) {
        return new Response(
          JSON.stringify({ results: [], error: "SEARCH_BUSY", message: busyMessage }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ results: [], error: "SEARCH_FAILED" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('space-web-search error:', error);
    return new Response(
      JSON.stringify({ results: [], error: "SERVER_ERROR" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
