// google.ts — SAFE Google Search wrapper with observability + fail-safe UX
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

// Fail-safe busy messages (multilingual)
const BUSY_MESSAGES: Record<string, string> = {
  uz: "⚠️ Hozir qidiruv band. Birozdan keyin urinib ko'ring. Shu orada web qidiruvchisiz suhbatlashishingiz mumkin.",
  en: "⚠️ Search is currently busy. Please try again shortly. You can continue chatting without web search.",
  ru: "⚠️ Поиск сейчас занят. Попробуйте позже. Вы можете продолжить общение без веб-поиска.",
  tr: "⚠️ Arama şu an meşgul. Lütfen biraz sonra tekrar deneyin. Web araması olmadan sohbete devam edebilirsiniz.",
};

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

// Global variable to pass user_id and language from chat function
let currentUserId: string | null = null;
let currentLang: string = "uz";

export function setSearchUserId(userId: string | null): void {
  currentUserId = userId;
}

export function setSearchLang(lang: string): void {
  currentLang = lang || "uz";
}

// Get busy message for current language
function getBusyMessage(): string {
  return BUSY_MESSAGES[currentLang] || BUSY_MESSAGES.uz;
}

export async function googleSearch(query: string): Promise<SearchResult> {
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
      return { content: "", isBusy: true, busyMessage: getBusyMessage() };
    }

    // Hard timeout protector (3 seconds)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const url =
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;

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

    return { content: formatted, isBusy: false };
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
