// google.ts — Google Search wrapper with caching, burst limiting, and observability
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// ============================================
// SUPABASE ADMIN CLIENT (SERVICE ROLE)
// ============================================

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!url || !key) {
    console.error("[supabaseAdmin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    throw new Error("Missing Supabase configuration");
  }
  
  return createClient(url, key, { 
    auth: { 
      persistSession: false,
      autoRefreshToken: false,
    } 
  });
}

// ============================================
// TYPES
// ============================================

interface SearchMeta {
  cache_hit: boolean;
  query_length: number;
  google_call_ms: number | null;
  results_count: number;
  error?: string;
}

export interface SearchResult {
  content: string;
  isBusy: boolean;
  busyMessage?: string;
}

// ============================================
// CONFIGURATION
// ============================================

// Global burst limit per minute (start conservative)
const GLOBAL_SEARCH_PER_MINUTE_LIMIT = 120;

// TTL configuration
const SHORT_TTL_MINUTES = 45; // For time-sensitive queries
const LONG_TTL_MINUTES = 720; // 12 hours for evergreen queries

// Time-sensitive keywords that trigger short TTL
const TIME_SENSITIVE_KEYWORDS = [
  "bugun", "today", "latest", "so'nggi", "yangilik", "news",
  "this week", "bu hafta", "hozir", "now", "current", "joriy",
  "2025", "2024", "сегодня", "новости", "последние"
];

// Fail-safe busy messages (multilingual)
const BUSY_MESSAGES: Record<string, string> = {
  uz: "⚠️ Hozir qidiruv band. Birozdan keyin urinib ko'ring. Shu orada web qidiruvchisiz suhbatlashishingiz mumkin.",
  en: "⚠️ Search is currently busy. Please try again shortly. You can continue chatting without web search.",
  ru: "⚠️ Поиск сейчас занят. Попробуйте позже. Вы можете продолжить общение без веб-поиска.",
  tr: "⚠️ Arama şu an meşgul. Lütfen biraz sonra tekrar deneyin. Web araması olmadan sohbete devam edebilirsiniz.",
};

// ============================================
// STATE (per-request context)
// ============================================

let currentUserId: string | null = null;
let currentLang: string = "uz";

export function setSearchUserId(userId: string | null): void {
  currentUserId = userId;
}

export function setSearchLang(lang: string): void {
  currentLang = lang || "uz";
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getTTLMinutes(query: string): number {
  const qLower = query.toLowerCase();
  for (const keyword of TIME_SENSITIVE_KEYWORDS) {
    if (qLower.includes(keyword)) {
      return SHORT_TTL_MINUTES;
    }
  }
  return LONG_TTL_MINUTES;
}

function getBusyMessage(): string {
  return BUSY_MESSAGES[currentLang] || BUSY_MESSAGES.uz;
}

function getMinuteBucket(): string {
  // Returns YYYY-MM-DDTHH:MM format for minute-level bucketing
  return new Date().toISOString().slice(0, 16);
}

// ============================================
// LOGGING
// ============================================

async function logSearchEvent(userId: string | null, meta: SearchMeta): Promise<void> {
  if (!userId) {
    console.log("[search] skipping log - no user_id");
    return;
  }
  
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("usage_events").insert({
      user_id: userId,
      event_type: "search",
      meta,
    });
    
    if (error) {
      console.log("[search] failed to log usage_event:", error.message);
    } else {
      console.log("[search] logged usage_event", { cache_hit: meta.cache_hit, user_id: userId });
    }
  } catch (e) {
    console.log("[search] exception logging event:", e);
  }
}

// ============================================
// CACHE OPERATIONS
// ============================================

interface CacheEntry {
  id: string;
  result_json: any;
  expires_at: string;
}

async function getCachedResult(queryNorm: string, cx: string, locale: string | null): Promise<CacheEntry | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("search_cache")
      .select("id, result_json, expires_at")
      .eq("query_norm", queryNorm)
      .eq("cx", cx)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();
    
    if (error) {
      console.log("[search] cache lookup error:", error.message);
      return null;
    }
    
    return data;
  } catch (e) {
    console.log("[search] cache lookup exception:", e);
    return null;
  }
}

async function storeCacheResult(queryNorm: string, cx: string, locale: string | null, resultJson: any, ttlMinutes: number): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    
    const { error } = await supabase.from("search_cache").insert({
      query_norm: queryNorm,
      cx,
      locale,
      result_json: resultJson,
      expires_at: expiresAt,
    });
    
    if (error) {
      console.log("[search] cache store error:", error.message);
    } else {
      console.log("[search] cached result, TTL:", ttlMinutes, "min");
    }
  } catch (e) {
    console.log("[search] cache store exception:", e);
  }
}

// ============================================
// BURST LIMITER
// ============================================

async function checkAndIncrementBurst(): Promise<{ allowed: boolean; count: number }> {
  try {
    const supabase = getSupabaseAdmin();
    const bucket = getMinuteBucket();
    
    // Try to get or create the bucket row
    const { data: existing } = await supabase
      .from("search_global_burst")
      .select("count")
      .eq("minute_bucket", bucket)
      .maybeSingle();
    
    if (existing) {
      // Check if over limit
      if (existing.count >= GLOBAL_SEARCH_PER_MINUTE_LIMIT) {
        console.log("[search] global burst limit reached:", existing.count);
        return { allowed: false, count: existing.count };
      }
      
      // Increment
      const { error: updateError } = await supabase
        .from("search_global_burst")
        .update({ count: existing.count + 1 })
        .eq("minute_bucket", bucket);
      
      if (updateError) {
        console.log("[search] burst increment error:", updateError.message);
      }
      
      return { allowed: true, count: existing.count + 1 };
    } else {
      // Create new bucket
      const { error: insertError } = await supabase
        .from("search_global_burst")
        .insert({ minute_bucket: bucket, count: 1 });
      
      if (insertError) {
        // Race condition - another request created it, try increment
        console.log("[search] burst insert race, retrying increment");
        const { data: retry } = await supabase
          .from("search_global_burst")
          .select("count")
          .eq("minute_bucket", bucket)
          .maybeSingle();
        
        if (retry && retry.count >= GLOBAL_SEARCH_PER_MINUTE_LIMIT) {
          return { allowed: false, count: retry.count };
        }
        
        await supabase
          .from("search_global_burst")
          .update({ count: (retry?.count || 0) + 1 })
          .eq("minute_bucket", bucket);
        
        return { allowed: true, count: (retry?.count || 0) + 1 };
      }
      
      return { allowed: true, count: 1 };
    }
  } catch (e) {
    console.log("[search] burst check exception:", e);
    // On error, allow the request (fail open for availability)
    return { allowed: true, count: 0 };
  }
}

// ============================================
// FORMAT RESULTS
// ============================================

function formatSearchResults(items: any[]): string {
  let formatted = "🔍 **Qidiruv natijalari:**\n\n";

  items.slice(0, 5).forEach((item: any, i: number) => {
    formatted += `**${i + 1}. ${item.title}**\n`;
    formatted += `${item.link}\n`;
    if (item.snippet) formatted += `${item.snippet}\n`;
    formatted += "\n";
  });

  formatted += "------\n";
  formatted += "Yuqoridagi manbalar Google Custom Search orqali topildi.\n";

  return formatted;
}

// ============================================
// MAIN SEARCH FUNCTION
// ============================================

export async function googleSearch(query: string): Promise<SearchResult> {
  const searchStart = Date.now();
  const cx = Deno.env.get("GOOGLE_CX") || "";
  const apiKey = Deno.env.get("GOOGLE_SEARCH_API_KEY");
  
  // Step 1: Normalize query
  const queryNorm = normalizeQuery(query);
  const locale = currentLang || null;
  
  console.log("[search] starting search for:", queryNorm.slice(0, 50));
  
  // Step 2: Check cache first
  const cached = await getCachedResult(queryNorm, cx, locale);
  if (cached) {
    console.log("[search] CACHE HIT");
    
    // Log cache hit (don't consume quota)
    await logSearchEvent(currentUserId, {
      cache_hit: true,
      query_length: query.length,
      google_call_ms: null,
      results_count: cached.result_json?.items?.length || 0,
    });
    
    // Format and return cached results
    const items = cached.result_json?.items || [];
    if (items.length === 0) {
      return { content: "", isBusy: false };
    }
    
    return { content: formatSearchResults(items), isBusy: false };
  }
  
  console.log("[search] CACHE MISS - checking limits");
  
  // Step 3: Check config
  if (!apiKey || !cx) {
    console.log("❌ Google Search disabled — missing API key or CX");
    await logSearchEvent(currentUserId, {
      cache_hit: false,
      query_length: query.length,
      google_call_ms: null,
      results_count: 0,
      error: "missing_config",
    });
    return { content: "", isBusy: true, busyMessage: getBusyMessage() };
  }
  
  // Step 4: Check global burst limit (cache misses only)
  const burst = await checkAndIncrementBurst();
  if (!burst.allowed) {
    console.log("[search] blocked by global burst limit");
    await logSearchEvent(currentUserId, {
      cache_hit: false,
      query_length: query.length,
      google_call_ms: null,
      results_count: 0,
      error: "global_burst_limit",
    });
    return { content: "", isBusy: true, busyMessage: getBusyMessage() };
  }
  
  // Step 5: Call Google API with timeout
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    const googleCallMs = Date.now() - searchStart;

    // Handle rate limiting (429) or quota exceeded (403)
    if (res.status === 429 || res.status === 403) {
      console.log("⚠️ Google Search rate limited or quota exceeded:", res.status);
      await logSearchEvent(currentUserId, {
        cache_hit: false,
        query_length: query.length,
        google_call_ms: googleCallMs,
        results_count: 0,
        error: `rate_limited_${res.status}`,
      });
      return { content: "", isBusy: true, busyMessage: getBusyMessage() };
    }

    if (!res.ok) {
      console.log("❌ Google returned non-200:", res.status);
      await logSearchEvent(currentUserId, {
        cache_hit: false,
        query_length: query.length,
        google_call_ms: googleCallMs,
        results_count: 0,
        error: `http_${res.status}`,
      });
      // Non-rate-limit errors: silent fail, no busy message
      return { content: "", isBusy: false };
    }

    const data = await res.json();

    // Check for quota error in response body
    if (data.error?.code === 429 || data.error?.message?.includes("quota")) {
      console.log("⚠️ Google Search quota exceeded (in response body)");
      await logSearchEvent(currentUserId, {
        cache_hit: false,
        query_length: query.length,
        google_call_ms: googleCallMs,
        results_count: 0,
        error: "quota_exceeded",
      });
      return { content: "", isBusy: true, busyMessage: getBusyMessage() };
    }

    // Step 6: Store in cache (even empty results to avoid re-fetching)
    const ttl = getTTLMinutes(query);
    await storeCacheResult(queryNorm, cx, locale, data, ttl);

    if (!data.items || data.items.length === 0) {
      console.log("ℹ️ Google search: no results");
      await logSearchEvent(currentUserId, {
        cache_hit: false,
        query_length: query.length,
        google_call_ms: googleCallMs,
        results_count: 0,
      });
      return { content: "", isBusy: false };
    }

    const resultsCount = Math.min(data.items.length, 5);

    // Log successful search
    await logSearchEvent(currentUserId, {
      cache_hit: false,
      query_length: query.length,
      google_call_ms: googleCallMs,
      results_count: resultsCount,
    });

    console.log("[search] success, results:", resultsCount, ", google_ms:", googleCallMs);

    return { content: formatSearchResults(data.items), isBusy: false };
    
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    console.log("❌ Google search error:", isTimeout ? "timeout" : err);
    
    await logSearchEvent(currentUserId, {
      cache_hit: false,
      query_length: query.length,
      google_call_ms: Date.now() - searchStart,
      results_count: 0,
      error: isTimeout ? "timeout" : (err instanceof Error ? err.message : "unknown"),
    });
    
    // Timeout or network errors: show busy message
    if (isTimeout) {
      return { content: "", isBusy: true, busyMessage: getBusyMessage() };
    }
    
    return { content: "", isBusy: false };
  }
}

// ============================================
// SIMPLIFIED SEARCH FOR SPACES (returns array format)
// ============================================

export interface SimpleSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function googleSearchSimple(query: string, userId: string | null, lang: string): Promise<{ results: SimpleSearchResult[]; isBusy: boolean; busyMessage?: string }> {
  // Set context
  setSearchUserId(userId);
  setSearchLang(lang);
  
  const result = await googleSearch(query);
  
  if (result.isBusy) {
    return { results: [], isBusy: true, busyMessage: result.busyMessage };
  }
  
  // Parse results from formatted content (or return empty)
  // This is a simplified version - for spaces we should ideally use raw data
  // For now, we'll do a fresh call to get structured data
  
  const cx = Deno.env.get("GOOGLE_CX") || "";
  const queryNorm = normalizeQuery(query);
  
  try {
    const supabase = getSupabaseAdmin();
    const { data: cached } = await supabase
      .from("search_cache")
      .select("result_json")
      .eq("query_norm", queryNorm)
      .eq("cx", cx)
      .gt("expires_at", new Date().toISOString())
      .limit(1)
      .maybeSingle();
    
    if (cached?.result_json?.items) {
      const items = cached.result_json.items.slice(0, 5).map((item: any) => ({
        title: item.title || '',
        url: item.link || '',
        snippet: item.snippet || '',
      }));
      return { results: items, isBusy: false };
    }
  } catch (e) {
    console.log("[search] simple search cache lookup error:", e);
  }
  
  return { results: [], isBusy: false };
}
