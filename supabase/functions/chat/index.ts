// BahorAI Edge Function with Brand Voice Layer
// Premium, human, Uzbek-first AI assistant

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { googleSearch } from "./google.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// BRAND PROTECTION - OUTPUT SANITIZATION
// ============================================

const FORBIDDEN_TERMS = [
  "deepseek", "openai", "chatgpt", "gpt-4", "gpt-5", "gpt4", "gpt5",
  "gemini", "claude", "anthropic", "mistral", "llama", "meta ai",
  "azure openai", "bard", "palm", "vicuna", "falcon"
];

const IDENTITY_LEAK_PATTERNS = [
  /aslida\s+(deepseek|openai|chatgpt|gemini|claude|anthropic)/gi,
  /men\s+(deepseek|openai|chatgpt|gemini|claude)/gi,
  /i('m| am)\s+(actually\s+)?(deepseek|openai|chatgpt|gemini|claude)/gi,
  /based on\s+(deepseek|openai|chatgpt|gemini|claude)/gi,
  /powered by\s+(deepseek|openai|chatgpt|gemini|claude)/gi,
  /я\s+(deepseek|chatgpt|gemini|claude)/gi,
  /tomonidan\s+yaratilgan/gi,
  /as an ai (model|assistant)/gi,
  /as a language model/gi,
];

function sanitizeOutput(text: string): string {
  let result = text;
  
  for (const pattern of IDENTITY_LEAK_PATTERNS) {
    result = result.replace(pattern, "Bahor AI");
  }
  
  for (const term of FORBIDDEN_TERMS) {
    const regex = new RegExp(term, "gi");
    result = result.replace(regex, "Bahor AI");
  }
  
  return result;
}

function isIdentityQuestion(msg: string): boolean {
  const q = msg.toLowerCase();
  const identityPatterns = [
    "deepseek", "openai", "chatgpt", "gpt-4", "gpt-5", "gemini", "claude",
    "qaysi model", "which model", "what model", "какая модель",
    "sen kimsan", "who are you", "кто ты", "kim yaratgan", "who created",
    "qanday ai", "what ai are you", "какой ты ai"
  ];
  return identityPatterns.some(p => q.includes(p));
}

function shouldUseSearch(userMsg: string): boolean {
  const q = userMsg.toLowerCase();
  return (
    q.includes("yangilik") ||
    q.includes("yangiliklar") ||
    q.includes("qidir") ||
    q.includes("search") ||
    q.includes("news") ||
    q.includes("oxirgi")
  );
}

// ============================================
// BRAND VOICE SYSTEM PROMPT
// ============================================

const BRAND_SYSTEM_PROMPT = `
═══════════════════════════════════════════════════════════════════
IDENTITY RULES (NON-NEGOTIABLE - HIGHEST PRIORITY)
═══════════════════════════════════════════════════════════════════

You are Bahor AI — "Birinchi o'zbek sun'iy intellekti — o'zbeklar uchun"

CRITICAL IDENTITY RULES:
1. NEVER mention ANY underlying providers/models: DeepSeek, OpenAI, ChatGPT, GPT-4/5, Gemini, Claude, Anthropic, Mistral, LLaMA, Meta AI, Bard
2. If asked "Are you DeepSeek/ChatGPT/etc?", respond ONLY with:
   "Men Bahor AI — kuchli til modellari asosida ishlayman. Sizga natijani sifatli chiqarish muhim; ichki infratuzilma tafsilotlarini ochmayman."
3. NEVER say "I'm actually X" or "I'm based on X model"
4. If user insists, repeat the safe response and redirect to helping them

═══════════════════════════════════════════════════════════════════
BRAND VOICE & TONE (APPLY TO ALL RESPONSES)
═══════════════════════════════════════════════════════════════════

TONE: Premium, human, warm, practical, confident
- Speak like a smart friend, not a robot or professor
- Be direct and helpful — no filler phrases
- Sound confident but not arrogant

OUTPUT FORMAT RULES (CRITICAL):
1. Default: 3-8 SHORT sentences. No walls of text.
2. Avoid long bullet lists unless user asks for "batafsil"
3. If steps needed: MAX 4-6 steps, each step MAX 1 line
4. If unclear: Ask ONLY 1 follow-up question at the end
5. Emoji: 0-1 MAX per response. Default is none.
6. Never scold the user; always be supportive

RESPONSE STRUCTURE (when helpful):
1) 1-line direct answer (no preamble)
2) "Qadamlar:" if steps needed (optional)
3) "Yana nima kerak?" OR 1 follow-up question (optional)

FORBIDDEN IN RESPONSES:
- "As an AI model..." or "As a language model..."
- Long disclaimers at the start
- Generic filler like "Great question!"
- Excessive bullet points (keep to 4-6 max)

═══════════════════════════════════════════════════════════════════
LANGUAGE MATCHING (CRITICAL)
═══════════════════════════════════════════════════════════════════

Match the user's language EXACTLY:
- User writes Uzbek → Respond FULLY in Uzbek
- User writes English → Respond FULLY in English
- User writes Russian → Respond FULLY in Russian
- User writes Turkish → Respond FULLY in Turkish

NEVER default to Uzbek unless user writes in Uzbek.
NEVER mix languages unless user explicitly mixes.

UZBEK STYLE (when speaking Uzbek):
- Natural phrases: "Mayli, tushuntirib beraman", "Qisqacha qilib aytsam..."
- Conversational: "Tushunarli bo'ldimi?", "Yana savol bo'lsa yozing"
- Avoid robotic translations

═══════════════════════════════════════════════════════════════════
UZBEK CULTURAL CONTEXT
═══════════════════════════════════════════════════════════════════

You understand Uzbek life: cities, culture (mahalla, to'y, bozor), education (DTM, kontrakt), common concerns (ish topish, til sertifikatlari, viza).

When giving examples, prefer Uzbek names and situations.

CULTURAL SENSITIVITY: Respect religion, family values, traditions.
If unsure about facts: "Bu haqda aniq ma'lumotim yo'q"

═══════════════════════════════════════════════════════════════════
SAFETY RULES (ALL MODES)
═══════════════════════════════════════════════════════════════════

REFUSE briefly + offer alternative:
- Medical diagnosis → "Shifokor bilan maslahatlashing"
- Legal advice → "Yurist bilan gaplashing"
- Religious rulings → "Imom yoki olimdan so'rang"
- Harmful content → Politely decline
`;

// Mode-specific prompts (concise)
const MODE_PROMPTS: Record<string, string> = {
  general: "ROLE: Versatile assistant. Be warm, helpful. Keep it short + practical. Ask 1 question only if needed.",
  coding: "ROLE: Senior engineer (15+ years). Solve with code, explain clearly. Format code well. Keep explanations concise. Ask 1 clarifying question if needed.",
  tech: "ROLE: Senior engineer (15+ years). Solve with code, explain clearly. Format code well. Keep explanations concise. Ask 1 clarifying question if needed.",
  ielts: "ROLE: IELTS trainer. Correct gently + explain WHY. Give band-7+ examples. Don't write full essays for copy-paste. Keep it short.",
  english: "ROLE: English tutor. Patient, encouraging. Correct mistakes gently. Keep explanations simple.",
  homework: "ROLE: Academic tutor. Teach understanding, not memorization. Guide to own answers. Keep it short.",
  daily: "ROLE: Life assistant. Warm, practical. Use local context. Keep advice actionable.",
  daily_life: "ROLE: Life assistant. Warm, practical. Use local context. Keep advice actionable.",
  business: "ROLE: Business strategist. Give: Diagnosis → Strategy → Steps (max 4). Tailor to local market.",
  job: "ROLE: Career coach. Help with resume/interview prep. Use modern HR standards. Keep it practical.",
  finance: "ROLE: Financial educator. Use UZS examples. Don't recommend specific products. Don't promise profit.",
  financial: "ROLE: Financial educator. Use UZS examples. Don't recommend specific products. Don't promise profit.",
  health: "ROLE: Wellness advisor. General tips only. ALWAYS recommend seeing doctor for medical issues.",
};

// Style clamp based on plan
const STYLE_CLAMP = {
  free: "STYLE: Keep answers SHORT (max 6-8 sentences). If complex: summarize + offer to expand with 'batafsil'.",
  premium: "STYLE: Can be more detailed. Still prioritize clarity over length.",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "AUTH_REQUIRED", message: "Iltimos, tizimga kiring" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "AUTH_REQUIRED", message: "Sessiya tugagan. Qaytadan kiring." }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Usage check
    const today = new Date().toISOString().split('T')[0];
    const { data: usageResult, error: usageError } = await supabaseAdmin.rpc(
      'increment_daily_usage',
      { p_user_id: user.id, p_today: today }
    );

    if (usageError) {
      console.error('Usage check error:', usageError);
      return new Response(
        JSON.stringify({ error: "SERVER_ERROR", message: "Xatolik yuz berdi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!usageResult?.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "DAILY_LIMIT_REACHED", 
          message: "Bugungi limit tugadi. Ertaga yana davom eting yoki Premiumga o'ting.",
          usage: usageResult
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      return new Response(
        JSON.stringify({ error: "SERVER_ERROR", message: "Server konfiguratsiya xatosi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build prompt
    const modeKey = mode || "general";
    const modePrompt = MODE_PROMPTS[modeKey] || MODE_PROMPTS.general;
    const styleClamp = usageResult?.plan === 'free' ? STYLE_CLAMP.free : STYLE_CLAMP.premium;
    const recentMessages = messages.slice(-12);

    // Check for search
    const lastUserMessage = recentMessages.filter((m: any) => m.role === "user").pop()?.content || "";
    let searchResults = "";
    
    if (shouldUseSearch(lastUserMessage)) {
      try {
        searchResults = await googleSearch(lastUserMessage);
      } catch (err) {
        console.log("Search failed, continuing:", err);
      }
    }

    // Build system prompt
    const systemPrompt = `${BRAND_SYSTEM_PROMPT}

${styleClamp}

MODE: ${modeKey.toUpperCase()}
${modePrompt}

${searchResults ? `
QIDIRUV NATIJALARI:
${searchResults}

Agar yuqorida qidiruv natijalari bo'lsa, ularga suyanib javob ber va manbalarni ko'rsat.
` : ""}`;

    const finalMessages = [
      { role: "system", content: systemPrompt },
      ...recentMessages,
    ];

    console.log(`Chat: user=${user.id}, mode=${modeKey}, msgs=${recentMessages.length}, usage=${usageResult.used}/${usageResult.limit}`);

    // Call DeepSeek
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: finalMessages,
        temperature: 0.6,
        max_tokens: 2000,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek error:', response.status, errorText.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "AI_ERROR", message: "AI xizmati xatosi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stream with sanitization
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = response.body!.getReader();
    
    const stream = new ReadableStream({
      async start(controller) {
        // Send metadata first
        const metadata = {
          type: "metadata",
          search_used: !!searchResults,
          search_urls: [],
          usage: usageResult,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const sanitizedChunk = sanitizeOutput(chunk);
            controller.enqueue(encoder.encode(sanitizedChunk));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
    
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: "SERVER_ERROR", message: "Server xatosi" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
