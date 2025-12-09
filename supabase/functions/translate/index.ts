// Tarjimon - Dedicated Translation Edge Function
// NEVER triggers web search or image generation - text-only

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Language name mapping for prompts
const LANGUAGE_NAMES: Record<string, string> = {
  auto: "Auto-detected",
  uz: "Uzbek",
  en: "English",
  ru: "Russian",
  tr: "Turkish",
  ko: "Korean",
  ar: "Arabic",
  kk: "Kazakh",
  ky: "Kyrgyz",
  tg: "Tajik",
  fa: "Persian",
  de: "German",
  fr: "French",
  es: "Spanish",
  zh: "Chinese",
  ja: "Japanese",
  // ... more languages handled generically
};

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code.toUpperCase();
}

// Build the system prompt based on action mode and toggles
function buildSystemPrompt(
  fromLang: string,
  toLang: string,
  actionMode: string,
  preserveNames: boolean,
  naturalTranslation: boolean,
  preserveFormatting: boolean,
  showBilingual: boolean
): string {
  const toName = getLanguageName(toLang);
  const fromName = fromLang === "auto" ? "the source language" : getLanguageName(fromLang);

  let baseInstructions = `You are Bahor AI's translator assistant. Your ONLY job is text transformation - NO web search, NO image generation, NO general chat.

CRITICAL RULES:
1. Output MUST be in ${toName} language. Never switch to another language.
2. Return ONLY the translated/transformed text. No explanations, no preambles.
3. If you cannot process the text, return exactly: "[ERROR] Cannot process this text"

`;

  // Toggle-based rules
  if (preserveNames) {
    baseInstructions += `PRESERVE UNCHANGED:
- Personal names (John, Aziz, Maria)
- Brand names (Apple, Samsung, Telegram)
- Place names (Tashkent, New York)
- URLs, @handles, email addresses
- Numbers and dates

`;
  }

  if (naturalTranslation) {
    baseInstructions += `STYLE: Create natural, fluent translation. Avoid word-for-word literal translation. Adapt idioms and expressions to sound native in ${toName}.

`;
  }

  if (preserveFormatting) {
    baseInstructions += `FORMATTING: Preserve all original formatting:
- Keep line breaks and paragraphs
- Keep bullet points and numbered lists
- Keep headings and structure
- Keep whitespace patterns

`;
  }

  if (showBilingual) {
    baseInstructions += `OUTPUT FORMAT: Show bilingual format:
[Original]
<original text>

[${toName}]
<translated text>

`;
  }

  // Action-specific instructions
  switch (actionMode) {
    case "translate":
      baseInstructions += `ACTION: Translate from ${fromName} to ${toName}.`;
      break;
    case "simplify":
      baseInstructions += `ACTION: Simplify the text - use simpler words and shorter sentences. Make it easy to understand for a 12-year-old. Output in ${toName}.`;
      break;
    case "formal":
      baseInstructions += `ACTION: Rewrite in formal, professional style. Use polite forms, proper grammar, official vocabulary. Output in ${toName}.`;
      break;
    case "friendly":
      baseInstructions += `ACTION: Rewrite in friendly, casual style. Use conversational tone, simple words, warm expressions. Output in ${toName}.`;
      break;
    case "shorten":
      baseInstructions += `ACTION: Shorten the text while keeping the main meaning. Remove redundant words and phrases. Output in ${toName}.`;
      break;
    case "expand":
      baseInstructions += `ACTION: Expand the text with more details and explanations. Make it more comprehensive. Output in ${toName}.`;
      break;
    case "grammar":
      baseInstructions += `ACTION: Fix grammar, spelling, and punctuation errors. Improve sentence structure. Keep the same language (do not translate). Output cleaned text.`;
      break;
    case "explain":
      baseInstructions += `ACTION: Explain the meaning of this text in simple ${toName}. What does it mean? What is the context? Explain clearly.`;
      break;
    case "translit":
      baseInstructions += `ACTION: Transliterate Uzbek text between Cyrillic and Latin scripts.
- If input is Cyrillic (Кирилл) → output Latin (Lotin)
- If input is Latin → output Cyrillic
Do NOT translate meaning - only change the script.
Examples:
- "Ўзбекистон" → "O'zbekiston"
- "O'zbekiston" → "Ўзбекистон"
- "салом" → "salom"
- "salom" → "салом"`;
      break;
    default:
      baseInstructions += `ACTION: Translate from ${fromName} to ${toName}.`;
  }

  return baseInstructions;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    
    let userId = "anonymous";
    if (token) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && user) {
        userId = user.id;
      }
    }

    // Parse request
    const body = await req.json();
    const {
      text,
      from_language = "auto",
      to_language = "en",
      action_mode = "translate",
      preserve_names = true,
      natural_translation = true,
      preserve_formatting = true,
      show_bilingual = false,
    } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit text length
    const maxLength = 10000;
    const inputText = text.slice(0, maxLength);

    // Build prompt
    const systemPrompt = buildSystemPrompt(
      from_language,
      to_language,
      action_mode,
      preserve_names,
      natural_translation,
      preserve_formatting,
      show_bilingual
    );

    // Call Lovable AI Gateway (no need for external API keys)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`[Translate] User: ${userId}, Action: ${action_mode}, From: ${from_language}, To: ${to_language}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: inputText },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Translate] AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service temporarily unavailable. Please try again." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("[Translate] AI Response received:", JSON.stringify(data).slice(0, 500));
    
    const outputText = data.choices?.[0]?.message?.content?.trim() || "";

    if (!outputText) {
      console.error("[Translate] Empty output from AI");
      // Return input as-is if translation fails
      return new Response(
        JSON.stringify({
          output_text: inputText,
          detected_language: from_language,
          action_mode,
          to_language,
          duration_ms: Date.now() - startTime,
          warning: "Could not process text, returning original",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (outputText.startsWith("[ERROR]")) {
      return new Response(
        JSON.stringify({
          output_text: inputText,
          detected_language: from_language,
          action_mode,
          to_language,
          duration_ms: Date.now() - startTime,
          warning: outputText,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try to detect source language (simple heuristic)
    let detectedLanguage = from_language;
    if (from_language === "auto") {
      // Simple detection based on character sets
      if (/[а-яё]/i.test(inputText)) {
        // Could be Russian or Uzbek Cyrillic
        if (/[ўқғҳ]/i.test(inputText)) {
          detectedLanguage = "uz-cyrillic";
        } else {
          detectedLanguage = "ru";
        }
      } else if (/[oʻʼ]'|g'/i.test(inputText)) {
        detectedLanguage = "uz";
      } else if (/[ğüşöçıİ]/i.test(inputText)) {
        detectedLanguage = "tr";
      } else {
        detectedLanguage = "en";
      }
    }

    const durationMs = Date.now() - startTime;
    console.log(`[Translate] Completed in ${durationMs}ms`);

    return new Response(
      JSON.stringify({
        output_text: outputText,
        detected_language: detectedLanguage,
        action_mode,
        to_language,
        duration_ms: durationMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Translate] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Translation failed",
        output_text: null,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
