// google.ts — SAFE Google Search wrapper with observability
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface SearchMeta {
  cache_hit: boolean;
  query_length: number;
  google_call_ms: number | null;
  results_count: number;
  error?: string;
}

// Log search event to usage_events table
async function logSearchEvent(userId: string | null, meta: SearchMeta): Promise<void> {
  if (!userId) return;
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) return;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    await supabase.from("usage_events").insert({
      user_id: userId,
      event_type: "search",
      meta,
    });
  } catch (e) {
    console.log("Failed to log search event:", e);
  }
}

// Global variable to pass user_id from chat function
let currentUserId: string | null = null;

export function setSearchUserId(userId: string | null): void {
  currentUserId = userId;
}

export async function googleSearch(query: string): Promise<string> {
  const searchStart = Date.now();
  
  try {
    const apiKey = Deno.env.get("GOOGLE_SEARCH_API_KEY");
    const cx = Deno.env.get("GOOGLE_CX");

    if (!apiKey || !cx) {
      console.log("❌ Google Search disabled — missing API key or CX");
      await logSearchEvent(currentUserId, {
        cache_hit: false,
        query_length: query.length,
        google_call_ms: null,
        results_count: 0,
        error: "missing_config",
      });
      return "";
    }

    // Hard timeout protector (3 seconds)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const url =
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    const googleCallMs = Date.now() - searchStart;

    if (!res.ok) {
      console.log("❌ Google returned non-200:", res.status);
      await logSearchEvent(currentUserId, {
        cache_hit: false,
        query_length: query.length,
        google_call_ms: googleCallMs,
        results_count: 0,
        error: `http_${res.status}`,
      });
      return "";
    }

    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      console.log("ℹ️ Google search: no results");
      await logSearchEvent(currentUserId, {
        cache_hit: false,
        query_length: query.length,
        google_call_ms: googleCallMs,
        results_count: 0,
      });
      return "";
    }

    const resultsCount = Math.min(data.items.length, 5);

    // Format results into readable markdown
    let formatted = "🔍 **Qidiruv natijalari:**\n\n";

    data.items.slice(0, 5).forEach((item: any, i: number) => {
      formatted += `**${i + 1}. ${item.title}**\n`;
      formatted += `${item.link}\n`;
      if (item.snippet) formatted += `${item.snippet}\n`;
      formatted += "\n";
    });

    formatted += "------\n";
    formatted += "Yuqoridagi manbalar Google Custom Search orqali topildi.\n";

    // Log successful search
    await logSearchEvent(currentUserId, {
      cache_hit: false,
      query_length: query.length,
      google_call_ms: googleCallMs,
      results_count: resultsCount,
    });

    return formatted;
  } catch (err) {
    console.log("❌ Google search error:", err);
    await logSearchEvent(currentUserId, {
      cache_hit: false,
      query_length: query.length,
      google_call_ms: Date.now() - searchStart,
      results_count: 0,
      error: err instanceof Error ? err.message : "unknown",
    });
    return "";
  }
}
