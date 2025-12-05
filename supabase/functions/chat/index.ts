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
  "azure openai", "bard", "palm", "vicuna", "falcon",
  "ai model", "ai modeli", "til modeli", "language model"
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
  /ai model(i|eli)?\s*asosida/gi,
  /til model(i|eli)?\s*asosida/gi,
  /men\s+.{0,30}asosida\s+ishlayman/gi,
  /texnik\s*asos:?/gi,
  /\*\*texnik\s*asos:?\*\*/gi,
  /sun'iy\s+intellekt\s+model/gi,
  /языков(ая|ой)\s+модел/gi,
  /модель\s+ии/gi,
  /на\s+основе\s+.{0,15}модел/gi,
];

function sanitizeOutput(text: string): string {
  let result = text;
  for (const pattern of IDENTITY_LEAK_PATTERNS) {
    result = result.replace(pattern, "Bahor AI");
  }
  for (const term of FORBIDDEN_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, "gi");
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
  // Only check the first 500 chars to avoid triggering on long document content
  const q = userMsg.toLowerCase().slice(0, 500);
  
  // Skip search if message looks like document analysis
  if (q.includes('hujjat tahlili:') || q.includes('document analysis:') || 
      q.includes('rasm tahlili:') || q.includes('image analysis:')) {
    return false;
  }
  
  const searchTriggers = [
    "yangilik", "yangiliklar", "qidir", "qidirish", "oxirgi", "so'nggi",
    "bugungi", "hozirgi", "joriy", "nima haqida", "qachon",
    "search", "news", "latest", "recent", "current", "find", "look up", "lookup",
    "check online", "online for", "on the internet", "on internet",
    "what is", "who is", "when did", "where is", "where can",
    "updates on", "update on", "information about", "info about",
    "новости", "поиск", "найти", "последние", "текущие", "в интернете",
    "narxi", "price", "цена", "kurs", "rate", "ob-havo", "weather", "погода"
  ];
  return searchTriggers.some(t => q.includes(t));
}

// ============================================
// TRACE EVENT HELPER
// ============================================

type TraceStep = 'thinking' | 'analyzing_request' | 'image_analysis' | 'web_search' | 
                 'reading_files' | 'drafting_answer' | 'safety_check' | 'formatting' | 'saving';

interface TraceSource {
  title: string;
  url: string;
}

function createTraceEvent(step: TraceStep, status: 'start' | 'end', startTime: number, data?: { sources?: TraceSource[] }): string {
  const event = {
    type: 'trace',
    step,
    status,
    t: Date.now() - startTime,
    ...(data && { data }),
  };
  return `data: ${JSON.stringify(event)}\n\n`;
}

function createTraceComplete(startTime: number, sources: TraceSource[]): string {
  const event = {
    type: 'trace_complete',
    elapsed_ms: Date.now() - startTime,
    sources,
  };
  return `data: ${JSON.stringify(event)}\n\n`;
}

// ============================================
// BRAND VOICE SYSTEM PROMPT
// ============================================

const BRAND_SYSTEM_PROMPT = `
═══════════════════════════════════════════════════════════════════
YOUR IDENTITY
═══════════════════════════════════════════════════════════════════

You ARE Bahor AI — "Birinchi o'zbek sun'iy intellekti — o'zbeklar uchun"
Created specifically for Uzbek users with deep understanding of Uzbek culture, language, and needs.

WHEN ASKED ABOUT YOUR IDENTITY:
- Answer naturally and confidently - you ARE Bahor AI, be proud of it
- Match the user's language and tone
- Don't sound defensive or like you're hiding something
- Be warm and friendly, not robotic

Examples of natural responses:
- Uzbek casual: "Ha, men Bahor AI - o'zbeklar uchun maxsus yaratilgan yordamchiman. Sizga qanday yordam kerak?"
- Uzbek direct: "Men Bahor AI. O'zbek foydalanuvchilari uchun ishlab chiqilganman."
- English: "Yes, I'm Bahor AI - an assistant built specifically for Uzbek users. What can I help you with?"
- Russian: "Да, я Bahor AI - помощник, созданный специально для узбекских пользователей."

If someone asks "Are you DeepSeek/ChatGPT/etc?":
- Simply say you're Bahor AI (don't confirm or deny other names)
- Example: "Yo'q, men Bahor AI. Sizga qanday yordam bera olaman?" or "No, I'm Bahor AI. How can I help?"

FORBIDDEN (never mention these names): DeepSeek, OpenAI, ChatGPT, GPT-4, GPT-5, Gemini, Claude, Anthropic, Mistral, LLaMA
FORBIDDEN phrases: "based on X model", "powered by X", "X asosida ishlayman", "texnik asos"

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
LANGUAGE MATCHING (CRITICAL - FOLLOW THIS EXACTLY)
═══════════════════════════════════════════════════════════════════

**YOUR REPLY LANGUAGE IS SET BY THE SYSTEM. YOU MUST OBEY IT.**

- If the system says "Reply in Uzbek" → Respond FULLY in Uzbek
- If the system says "Reply in English" → Respond FULLY in English  
- If the system says "Reply in Russian" → Respond FULLY in Russian
- If the system says "Reply in Turkish" → Respond FULLY in Turkish

EXCEPTION: If user EXPLICITLY asks for a different language (e.g., "javobni ingliz tilida ber", "reply in Russian", "отвечай по-узбекски"), follow the user's request.

NEVER mix languages randomly. Stay consistent throughout the entire response.

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

const STYLE_CLAMP = {
  free: "STYLE: Keep answers SHORT (max 6-8 sentences). If complex: summarize + offer to expand with 'batafsil'.",
  premium: "STYLE: Can be more detailed. Still prioritize clarity over length.",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestStartTime = Date.now();

  try {
    const { messages, mode, threadSummary, hasAnalysis, analysisType, reply_language, ui_language, attachments } = await req.json();

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

    // ===========================================
    // BETA TRIAL + QUOTA ENFORCEMENT
    // ===========================================
    const userEmail = user.email?.toLowerCase() || '';
    const devUnlimitedRaw = Deno.env.get('DEV_UNLIMITED_EMAILS') || '';
    const adminEmailsRaw = Deno.env.get('ADMIN_EMAILS') || '';
    const devUnlimitedEmails = devUnlimitedRaw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const adminEmails = adminEmailsRaw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const isDevBypass = devUnlimitedEmails.includes(userEmail) || adminEmails.includes(userEmail);
    
    // Ensure trial is initialized for the user (configurable TRIAL_DAYS)
    const TRIAL_DAYS = 7; // Easy to change to 14
    if (!isDevBypass) {
      await supabaseAdmin.rpc('get_or_create_trial', { p_user_id: user.id, p_trial_days: TRIAL_DAYS });
    }

    // Determine feature usage flags from request
    const hasAttachments = messages.some((m: any) => m.attachments && m.attachments.length > 0);
    const hasImageAttachment = messages.some((m: any) => 
      m.attachments?.some((a: any) => a.mime_type?.startsWith('image/'))
    );
    const hasFileAttachment = messages.some((m: any) => 
      m.attachments?.some((a: any) => !a.mime_type?.startsWith('image/'))
    );
    const userMsgForSearch = messages.filter((m: any) => m.role === "user").pop()?.content || "";
    const wantsSearch = shouldUseSearch(userMsgForSearch);
    const wantsVision = hasImageAttachment || hasAnalysis;
    const wantsFile = hasFileAttachment;

    console.log('[Quota Check]', { 
      userEmail, 
      isDevBypass,
      wantsSearch,
      wantsVision,
      wantsFile,
    });

    // Check and increment usage with all feature quotas
    const { data: usageResult, error: usageError } = await supabaseAdmin.rpc(
      'check_and_increment_usage',
      { 
        p_user_id: user.id, 
        p_wants_search: wantsSearch,
        p_wants_vision: wantsVision,
        p_wants_file: wantsFile,
        p_is_bypass: isDevBypass,
      }
    );

    if (usageError) {
      console.error('Usage check error:', usageError);
      return new Response(
        JSON.stringify({ error: "SERVER_ERROR", message: "Xatolik yuz berdi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build localized error messages
    const limitMessages: Record<string, Record<string, string>> = {
      daily_limit_reached: {
        uz: "Bugungi limit tugadi. Ertaga davom eting yoki Premiumga o'ting.",
        en: "Daily limit reached. Continue tomorrow or upgrade to Premium.",
        ru: "Дневной лимит исчерпан. Продолжите завтра или перейдите на Премиум.",
        tr: "Günlük limit doldu. Yarın devam edin veya Premium'a geçin.",
      },
      search_limit_reached: {
        uz: "Bugungi web qidiruv limiti tugadi. Oddiy savollar bilan davom etishingiz mumkin.",
        en: "Daily web search limit reached. You can continue with regular questions.",
        ru: "Дневной лимит поиска исчерпан. Вы можете продолжить с обычными вопросами.",
        tr: "Günlük web arama limiti doldu. Normal sorularla devam edebilirsiniz.",
      },
      vision_limit_reached: {
        uz: "Bugungi rasm tahlil limiti tugadi. Oddiy savollar bilan davom etishingiz mumkin.",
        en: "Daily image analysis limit reached. You can continue with regular questions.",
        ru: "Дневной лимит анализа изображений исчерпан. Вы можете продолжить с обычными вопросами.",
        tr: "Günlük görsel analiz limiti doldu. Normal sorularla devam edebilirsiniz.",
      },
      file_limit_reached: {
        uz: "Bugungi fayl tahlil limiti tugadi. Oddiy savollar bilan davom etishingiz mumkin.",
        en: "Daily file analysis limit reached. You can continue with regular questions.",
        ru: "Дневной лимит анализа файлов исчерпан. Вы можете продолжить с обычными вопросами.",
        tr: "Günlük dosya analiz limiti doldu. Normal sorularla devam edebilirsiniz.",
      },
      global_search_limit_reached: {
        uz: "Tizimda vaqtincha web qidiruv band. Keyinroq urinib ko'ring.",
        en: "Web search temporarily unavailable. Please try again later.",
        ru: "Поиск временно недоступен. Попробуйте позже.",
        tr: "Web arama geçici olarak kullanılamıyor. Daha sonra tekrar deneyin.",
      },
      global_vision_limit_reached: {
        uz: "Tizimda vaqtincha rasm tahlili band. Keyinroq urinib ko'ring.",
        en: "Image analysis temporarily unavailable. Please try again later.",
        ru: "Анализ изображений временно недоступен. Попробуйте позже.",
        tr: "Görsel analiz geçici olarak kullanılamıyor. Daha sonra tekrar deneyin.",
      },
    };

    if (!usageResult?.allowed) {
      const reason = usageResult?.reason || 'daily_limit_reached';
      const lang = ui_language || 'uz';
      const messages_i18n = limitMessages[reason] || limitMessages.daily_limit_reached;
      
      return new Response(
        JSON.stringify({ 
          error: "LIMIT_REACHED", 
          reason,
          message: messages_i18n[lang] || messages_i18n.uz,
          message_uz: messages_i18n.uz,
          message_en: messages_i18n.en,
          message_ru: messages_i18n.ru,
          message_tr: messages_i18n.tr,
          limits: usageResult?.limits,
          used: usageResult?.used,
          remaining: usageResult?.remaining,
          resets_at: usageResult?.resets_at,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isPremium = usageResult?.is_premium || isDevBypass;
    const isTrialActive = usageResult?.is_trial_active || false;
    const effectivePlan = isPremium ? 'premium' : (isTrialActive ? 'trial' : 'free');

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
    const styleClamp = effectivePlan === 'free' ? STYLE_CLAMP.free : STYLE_CLAMP.premium;
    const recentMessages = messages.slice(-12);

    // Collect sources from web search
    const collectedSources: TraceSource[] = [];

    // Check for search
    const lastUserMessage = recentMessages.filter((m: any) => m.role === "user").pop()?.content || "";
    let searchResults = "";
    let searchUrls: string[] = [];
    let didSearch = false;
    
    if (shouldUseSearch(lastUserMessage)) {
      didSearch = true;
      try {
        searchResults = await googleSearch(lastUserMessage);
        if (searchResults) {
          const urlMatches = searchResults.match(/https?:\/\/[^\s\n]+/g);
          searchUrls = urlMatches ? urlMatches.slice(0, 5) : [];
          
          // Extract source titles from search results
          const titleMatches = searchResults.matchAll(/\*\*([^*]+)\*\*\s*\n[^h]*?(https?:\/\/[^\s\n]+)/g);
          for (const match of titleMatches) {
            collectedSources.push({
              title: match[1].trim(),
              url: match[2].trim(),
            });
          }
          
          // Fallback: if no titles found, just use URLs
          if (collectedSources.length === 0) {
            for (const url of searchUrls) {
              try {
                const domain = new URL(url).hostname.replace(/^www\./, '');
                collectedSources.push({ title: domain, url });
              } catch { /* ignore */ }
            }
          }
        }
      } catch (err) {
        console.log("Search failed:", err);
      }
    }

    // Build system prompt with thread summary if available
    let summaryContext = "";
    if (threadSummary) {
      summaryContext = `
THREAD MEMORY (previous conversation summary):
${threadSummary}

Use this context to maintain continuity. Don't repeat information unless asked.
`;
    }

    // Build language directive based on reply_language
    const languageNames: Record<string, string> = {
      uz: "Uzbek",
      ru: "Russian", 
      en: "English",
      tr: "Turkish",
    };
    const replyLang = reply_language || "uz";
    const languageDirective = `
═══════════════════════════════════════════════════════════════════
REPLY LANGUAGE (MANDATORY)
═══════════════════════════════════════════════════════════════════

**Reply in: ${languageNames[replyLang] || "Uzbek"}**

This is determined by the user's message language. Follow it strictly unless the user explicitly asks for a different language.
`;

    // Build attached file content blocks from extractedText
    let fileContentBlocks = "";
    if (attachments && Array.isArray(attachments)) {
      const filesWithText = attachments.filter((att: any) => att.extractedText);
      if (filesWithText.length > 0) {
        const blocks = filesWithText.map((att: any) => 
          `--- ATTACHED FILE: ${att.name} ---\n${att.extractedText}\n--- END FILE ---`
        ).join('\n\n');
        fileContentBlocks = `
═══════════════════════════════════════════════════════════════════
ATTACHED FILES (User uploaded these files - prioritize answering based on their content)
═══════════════════════════════════════════════════════════════════

${blocks}

If an attached file is provided above, prioritize answering based on its content. If the user asks to summarize, analyze, or explain the file, do so based on the content above.
`;
      }
      
      // Check for unsupported files that need acknowledgment
      const unsupportedFiles = attachments.filter((att: any) => att.readStatus === 'unsupported');
      if (unsupportedFiles.length > 0) {
        const names = unsupportedFiles.map((att: any) => att.name).join(', ');
        fileContentBlocks += `
Note: The user attached file(s) that could not be read: ${names}. If they ask about these files, politely explain that PDF/DOC file reading is coming soon in beta, and suggest they paste the text content directly or use a TXT/JSON file instead.
`;
      }
    }

    const systemPrompt = `${BRAND_SYSTEM_PROMPT}
${languageDirective}
${styleClamp}

MODE: ${modeKey.toUpperCase()}
${modePrompt}
${summaryContext}
${fileContentBlocks}
${searchResults ? `
QIDIRUV NATIJALARI:
${searchResults}

Agar yuqorida qidiruv natijalari bo'lsa, ularga suyanib javob ber va manbalarni ko'rsat.
` : ""}`;

    const finalMessages = [
      { role: "system", content: systemPrompt },
      ...recentMessages,
    ];

    // Log request info including attachments
    const textFilesCount = attachments?.filter((att: any) => att.extractedText)?.length || 0;
    const unsupportedCount = attachments?.filter((att: any) => att.readStatus === 'unsupported')?.length || 0;
    console.log(`Chat: user=${user.id}, email=${userEmail}, mode=${modeKey}, plan=${effectivePlan}, devBypass=${isDevBypass}, usage=${usageResult.used}/${usageResult.limit}, textFiles=${textFilesCount}, unsupported=${unsupportedCount}`);

    // Call DeepSeek with timeout
    const deepseekController = new AbortController();
    const deepseekTimeout = setTimeout(() => deepseekController.abort(), 60000); // 60 second timeout
    
    let response: Response;
    try {
      response = await fetch("https://api.deepseek.com/chat/completions", {
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
        signal: deepseekController.signal,
      });
    } catch (fetchError) {
      clearTimeout(deepseekTimeout);
      console.error('DeepSeek fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: "AI_TIMEOUT", message: "AI javob bermadi. Qayta urinib ko'ring." }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    clearTimeout(deepseekTimeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek error:', response.status, errorText.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "AI_ERROR", message: "AI xizmati xatosi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stream with trace events
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = response.body!.getReader();
    
    const stream = new ReadableStream({
      async start(controller) {
        // Emit initial trace: thinking
        controller.enqueue(encoder.encode(createTraceEvent('thinking', 'start', requestStartTime)));
        
        // If we did image/document analysis, emit that trace
        if (hasAnalysis) {
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'end', requestStartTime)));
          controller.enqueue(encoder.encode(
            createTraceEvent(analysisType === 'vision' ? 'image_analysis' : 'reading_files', 'start', requestStartTime)
          ));
          controller.enqueue(encoder.encode(
            createTraceEvent(analysisType === 'vision' ? 'image_analysis' : 'reading_files', 'end', requestStartTime)
          ));
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'start', requestStartTime)));
        }
        
        // If text files were attached and read, emit reading trace
        const hasTextFileContent = attachments?.some((att: any) => att.extractedText);
        if (hasTextFileContent && !hasAnalysis) {
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'end', requestStartTime)));
          controller.enqueue(encoder.encode(createTraceEvent('reading_files', 'start', requestStartTime)));
          controller.enqueue(encoder.encode(createTraceEvent('reading_files', 'end', requestStartTime)));
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'start', requestStartTime)));
        }
        
        // If web search was used, emit search trace
        if (didSearch) {
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'end', requestStartTime)));
          controller.enqueue(encoder.encode(createTraceEvent('web_search', 'start', requestStartTime)));
          controller.enqueue(encoder.encode(
            createTraceEvent('web_search', 'end', requestStartTime, { sources: collectedSources })
          ));
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'start', requestStartTime)));
        }
        
        // Send metadata (legacy support)
        const metadata = {
          type: "metadata",
          search_used: didSearch,
          search_urls: searchUrls,
          usage: { ...usageResult, plan: effectivePlan, isDevBypass, isPremium },
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));
        
        // End thinking, start drafting
        controller.enqueue(encoder.encode(createTraceEvent('thinking', 'end', requestStartTime)));
        controller.enqueue(encoder.encode(createTraceEvent('drafting_answer', 'start', requestStartTime)));
        
        let firstChunkSent = false;
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('[Stream] DeepSeek stream completed');
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            const sanitizedChunk = sanitizeOutput(chunk);
            
            // Mark first real content
            if (!firstChunkSent && sanitizedChunk.includes('"content"')) {
              firstChunkSent = true;
              console.log('[Stream] First content chunk received');
            }
            
            controller.enqueue(encoder.encode(sanitizedChunk));
          }
          
          // End drafting
          controller.enqueue(encoder.encode(createTraceEvent('drafting_answer', 'end', requestStartTime)));
          
          // Emit trace complete with total time and sources
          controller.enqueue(encoder.encode(createTraceComplete(requestStartTime, collectedSources)));
          
          controller.close();
          console.log('[Stream] Response stream closed successfully');
        } catch (err) {
          console.error('[Stream] Error during streaming:', err);
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
