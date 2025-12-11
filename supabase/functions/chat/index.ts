// BahorAI Edge Function with Brand Voice Layer
// Premium, human, Uzbek-first AI assistant

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { googleSearch, setSearchUserId, setSearchLang, type SearchResult } from "./google.ts";

// Log chat event to usage_events table
async function logChatEvent(
  supabase: any,
  userId: string,
  meta: {
    model: string;
    duration_ms: number;
    tokens_in?: number;
    tokens_out?: number;
    mode?: string;
    search_used?: boolean;
    files_count?: number;
  }
): Promise<void> {
  try {
    await supabase.from("usage_events").insert({
      user_id: userId,
      event_type: "chat",
      meta,
    });
  } catch (e) {
    console.log("Failed to log chat event:", e);
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// MODEL CONFIGURATION
// ============================================
const DEEPSEEK_CHAT_MODEL = Deno.env.get("DEEPSEEK_CHAT_MODEL") || "deepseek-chat";
const DEEPSEEK_REASONER_MODEL = Deno.env.get("DEEPSEEK_REASONER_MODEL") || "deepseek-reasoner";

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

// Truncation phrases that should be stripped from responses (exact match for SSE chunks)
const TRUNCATION_PHRASES = [
  "(Davomi uchun: 'batafsil' deb yozing.)",
  "(Davomi uchun: \"batafsil\" deb yozing.)",
  "(Davomi uchun 'batafsil' deb yozing.)",
  "Davomi uchun: 'batafsil' deb yozing.",
  "Davomi uchun 'batafsil' deb yozing.",
  "'batafsil' deb yozing.",
  "\"batafsil\" deb yozing.",
  "Davom etaymi?",
  "Would you like me to continue?",
  "Shall I continue?",
];
const TRUNCATION_PATTERNS = [
  /\(Davomi uchun[^)]*\)/gi,
  /Davomi uchun:?\s*['"]?batafsil['"]?\s*deb yozing\.?/gi,
  /['"]?batafsil['"]?\s*deb yozing\.?/gi,
  /Davom etaymi\??/gi,
  /Would you like me to continue\??/gi,
  /Shall I continue\??/gi,
  /Let me know if you('d like| want) me to continue/gi,
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
  // Remove truncation phrases - exact string matches first
  for (const phrase of TRUNCATION_PHRASES) {
    result = result.split(phrase).join("");
  }
  // Then regex patterns for variations
  for (const pattern of TRUNCATION_PATTERNS) {
    result = result.replace(pattern, "");
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
// UNIFIED TOOL ROUTER - Priority-based decision
// ============================================

// Words that BLOCK image generation - if these appear, it's NOT an image request
const IMAGE_BLOCKERS = [
  // Weather terms
  "ob-havo", "ob havo", "obhavo", "weather", "погода", "hava durumu",
  "harorat", "temperature", "температура", "sıcaklık",
  // News/info terms
  "yangilik", "news", "новости", "haber",
  "qachon", "when", "когда", "ne zaman",
  "nima", "what is", "что такое", "nedir",
  "kim", "who", "кто", "kim",
  "narx", "price", "цена", "fiyat",
  "kurs", "rate", "курс",
  // Question patterns
  "qanday", "how", "как", "nasıl",
  "necha", "how much", "сколько", "kaç",
  "qayerda", "where", "где", "nerede",
  // File/document
  "fayl", "file", "файл", "dosya",
  "hujjat", "document", "документ", "belge",
  // Help/explain
  "tushuntir", "explain", "объясни", "açıkla",
  "yordam", "help", "помощь", "yardım",
  // Analysis patterns
  "tahlil", "analysis", "analyze", "анализ",
];

// Router decision type
interface RouterDecision {
  selectedTool: 'text' | 'image' | 'search';
  imageIntent: boolean;
  searchIntent: boolean;
  blockersHit: string[];
  confidence: number;
  explicitCommand: boolean;
  detectedLanguage: string;
  imagePrompt?: string;
}

// Detect language from message content
function detectMessageLanguage(msg: string): string {
  const text = msg.toLowerCase();
  
  // Cyrillic = Russian
  if (/[а-яё]/i.test(text)) return 'ru';
  
  // Turkish special chars
  if (/[ğüşöçıİ]/i.test(text)) return 'tr';
  
  // Uzbek Latin special chars (o', g', ʻ, ʼ)
  if (/[oʻʼ]'|g'|oʻ|gʻ/i.test(text)) return 'uz';
  
  // Check for Uzbek-specific words
  const uzWords = ['salom', 'rahmat', 'qanday', 'nima', 'qayerda', 'uchun', 'bilan', 'kerak'];
  if (uzWords.some(w => text.includes(w))) return 'uz';
  
  // Default to English for Latin script
  return 'en';
}

// Unified router function - single path decision
function routeRequest(
  userMsg: string, 
  hasImageAttachment: boolean,
  hasFileAttachment: boolean,
  forcedTool?: 'text' | 'image' | 'search'
): RouterDecision {
  const q = userMsg.trim();
  const qLower = q.toLowerCase();
  const detectedLanguage = detectMessageLanguage(q);
  
  const decision: RouterDecision = {
    selectedTool: 'text',
    imageIntent: false,
    searchIntent: false,
    blockersHit: [],
    confidence: 1.0,
    explicitCommand: false,
    detectedLanguage,
  };
  
  // PRIORITY 1: Forced tool from UI
  if (forcedTool) {
    decision.selectedTool = forcedTool;
    decision.explicitCommand = true;
    decision.confidence = 1.0;
    console.log('[Router] Forced tool from UI:', forcedTool);
    return decision;
  }
  
  // PRIORITY 2: Explicit commands (/rasm, /image, /search)
  if (qLower.startsWith('/image ') || qLower.startsWith('/rasm ')) {
    decision.selectedTool = 'image';
    decision.imageIntent = true;
    decision.explicitCommand = true;
    decision.imagePrompt = q.slice(7).trim();
    console.log('[Router] Explicit image command');
    return decision;
  }
  
  if (qLower.startsWith('/search ') || qLower.startsWith('/qidir ')) {
    decision.selectedTool = 'search';
    decision.searchIntent = true;
    decision.explicitCommand = true;
    console.log('[Router] Explicit search command');
    return decision;
  }
  
  // PRIORITY 3: File/image attachments → always text analysis
  if (hasImageAttachment || hasFileAttachment) {
    decision.selectedTool = 'text';
    console.log('[Router] Has attachment → text analysis');
    return decision;
  }
  
  // PRIORITY 4: Check for image generation keywords FIRST
  const imageResult = detectImageKeywords(q, qLower);
  
  // PRIORITY 5: If strong image intent, allow it regardless of blockers
  if (imageResult.isImageGen) {
    // Check if it has STRONG image keywords that should override blockers
    const strongImageKeywords = [
      'rasm yarat', 'rasm chiz', 'surat yarat', 'tasvir yarat',
      'generate image', 'create image', 'draw image', 'make image',
      'generate an image', 'create an image', 'draw an image',
      'generate a photo', 'create a photo', 'make a photo',
      '/image', '/rasm'
    ];
    const hasStrongIntent = strongImageKeywords.some(kw => qLower.includes(kw));
    
    if (hasStrongIntent) {
      // Strong image keywords override blockers
      decision.selectedTool = 'image';
      decision.imageIntent = true;
      decision.imagePrompt = imageResult.prompt;
      decision.confidence = 0.95;
      console.log('[Router] Strong image intent - overriding blockers');
      return decision;
    }
    
    // For weak image intent, check blockers
    for (const blocker of IMAGE_BLOCKERS) {
      if (qLower.includes(blocker)) {
        decision.blockersHit.push(blocker);
      }
    }
    
    // Question mark = never image (unless strong intent)
    if (q.endsWith('?')) {
      decision.blockersHit.push('?');
    }
    
    if (decision.blockersHit.length === 0) {
      decision.selectedTool = 'image';
      decision.imageIntent = true;
      decision.imagePrompt = imageResult.prompt;
      decision.confidence = 0.85;
      console.log('[Router] Image intent detected');
      return decision;
    } else {
      console.log('[Router] Image blocked by:', decision.blockersHit);
    }
  }
  
  // PRIORITY 6: Check for search intent
  if (shouldUseSearch(userMsg)) {
    decision.selectedTool = 'search';
    decision.searchIntent = true;
    decision.confidence = 0.8;
    console.log('[Router] Search intent detected');
    return decision;
  }
  
  // PRIORITY 7: Default to text
  console.log('[Router] Default to text');
  return decision;
}

// Helper: detect image keywords only (no blockers check here)
function detectImageKeywords(q: string, qLower: string): { isImageGen: boolean; prompt: string } {
  // Uzbek keywords for image generation (explicit only)
  const uzKeywords = [
    "rasm yarat", "rasm chiz", "surat yarat", "surat chiz", "tasvir yarat", "tasvir chiz",
    "rasm qil", "chizib ber", "rasmini yarat", "rasmini chiz",
    "suratini yarat", "tasvirini yarat", "rasm yasab ber",
    "rasmini chizib ber"
  ];
  
  // English keywords for image generation
  const enKeywords = [
    "generate an image", "generate image", "create an image", "create image",
    "make an image", "draw an image", "draw image",
    "generate a picture", "create a picture", "draw a picture",
    "generate a photo", "create a photo", "make a photo",
    "photo of", "picture of", "image of"
  ];
  
  for (const kw of uzKeywords) {
    if (qLower.includes(kw)) {
      const prompt = q.replace(new RegExp(kw, 'gi'), '').trim();
      return { isImageGen: true, prompt: prompt || q };
    }
  }
  
  for (const kw of enKeywords) {
    if (qLower.includes(kw)) {
      const prompt = q.replace(new RegExp(kw, 'gi'), '').trim();
      return { isImageGen: true, prompt: prompt || q };
    }
  }
  
  // Check for trailing image words: "X rasmi", "X rasmini"
  const qClean = q.replace(/[.!?,;:]+$/, '').trim();
  const trailingPatterns = [
    { pattern: / rasmi$/i, len: 6 },
    { pattern: / rasmini$/i, len: 8 },
    { pattern: / surati$/i, len: 7 },
    { pattern: / tasviri$/i, len: 8 },
  ];
  
  for (const { pattern, len } of trailingPatterns) {
    if (pattern.test(qClean)) {
      const prompt = qClean.slice(0, -len).trim();
      if (prompt.length > 2) {
        return { isImageGen: true, prompt };
      }
    }
  }
  
  return { isImageGen: false, prompt: "" };
}

// Log router decision to database
async function logRouterDecision(
  supabase: any,
  userId: string,
  userMsg: string,
  decision: RouterDecision,
  uiLanguage?: string
): Promise<void> {
  try {
    await supabase.from("tool_decisions").insert({
      user_id: userId,
      message_preview: userMsg.slice(0, 200),
      detected_language: decision.detectedLanguage,
      ui_language: uiLanguage || null,
      image_intent: decision.imageIntent,
      search_intent: decision.searchIntent,
      blockers_hit: decision.blockersHit,
      selected_tool: decision.selectedTool,
      confidence: decision.confidence,
      explicit_command: decision.explicitCommand,
    });
  } catch (e) {
    console.log("Failed to log router decision:", e);
  }
}

// REMOVED: Old detectImageGenerationIntent function - now using unified routeRequest()

// ============================================
// TRACE EVENT HELPER - Enhanced with safe metadata
// ============================================

type TraceStep = 'preparing' | 'new_chat' | 'uploading' | 'parsing_files' | 'web_search' | 
                 'selecting_model' | 'thinking' | 'writing' | 'saving' | 'generating_image' | 'delivering' |
                 // Legacy steps for backwards compatibility
                 'analyzing_request' | 'image_analysis' | 'reading_files' | 'drafting_answer' | 'safety_check' | 'formatting';

interface TraceSource {
  title: string;
  url: string;
}

interface TraceDetail {
  // Safe metadata only - no content
  filesCount?: number;
  extractedChars?: number;
  sourcesCount?: number;
  modelPreference?: string;
  modelName?: string;
  imageEngine?: string;
  imageModel?: string;
  imageDurationMs?: number;
  translated?: boolean;
  localSaved?: boolean;
  cloudSaved?: boolean;
  sources?: TraceSource[];
  [key: string]: any;
}

function createTraceEvent(
  step: TraceStep, 
  status: 'start' | 'end', 
  startTime: number, 
  detail?: TraceDetail
): string {
  const event = {
    type: 'trace',
    step,
    status,
    t: Date.now() - startTime,
    ...(detail && { detail, data: detail }), // Include as both for backwards compat
  };
  return `data: ${JSON.stringify(event)}\n\n`;
}

function createTraceComplete(
  startTime: number, 
  sources: TraceSource[],
  detail?: TraceDetail
): string {
  const event = {
    type: 'trace_complete',
    elapsed_ms: Date.now() - startTime,
    sources,
    ...(detail && { detail }),
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

═══════════════════════════════════════════════════════════════════
IMAGE GENERATION - CRITICAL RULES
═══════════════════════════════════════════════════════════════════

YOU CANNOT GENERATE IMAGES. You are a text-only assistant.

NEVER:
- Claim you created/generated/prepared a photo or image
- Describe what an image would look like as if you made it
- Say "mana rasm", "rasm tayyor", "photo is ready", "here's the image"
- Pretend you're generating visuals

If user asks for image generation:
- Tell them to add "rasmi" at the end of their prompt (e.g., "Samarqand rasmi")
- Or use "/rasm" command (e.g., "/rasm qadimiy madrasa")
- Example response: "Rasm yaratish uchun so'rovingiz oxiriga 'rasmi' so'zini qo'shing. Masalan: 'Qadimiy madrasa hovlisi rasmi'"
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
  free: "STYLE: Keep answers concise and practical. Be clear and direct.",
  premium: "STYLE: Can be more detailed when needed. Prioritize clarity and completeness.",
  reasoner: `STYLE: DEEP ANALYSIS MODE - CRITICAL RULES:
1. Provide comprehensive, thorough, COMPLETE responses
2. FORBIDDEN phrases (NEVER USE): "Davomi uchun", "batafsil deb yozing", "to continue", "would you like me to continue", "davom etaymi"
3. NEVER artificially stop or truncate your response
4. Complete your FULL answer in ONE response, regardless of length
5. If writing long content (essays, research), write it ALL - do not break into parts`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestStartTime = Date.now();

  try {
    const { messages, mode, modelPreference, threadSummary, hasAnalysis, analysisType, reply_language, ui_language, attachments, userToneContext, device_id } = await req.json();

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
    // DEVICE VERIFICATION
    // ===========================================
    if (device_id) {
      const { data: deviceData } = await supabaseAdmin
        .from('user_devices')
        .select('revoked_at')
        .eq('user_id', user.id)
        .eq('device_id', device_id)
        .single();

      if (deviceData?.revoked_at) {
        return new Response(
          JSON.stringify({ 
            error: "DEVICE_REVOKED", 
            message: "Bu qurilma boshqa joydan chiqarilgan. Qaytadan kiring.",
            message_en: "This device was signed out from another location. Please sign in again.",
            message_ru: "Это устройство было отключено с другого места. Войдите снова.",
            message_tr: "Bu cihaz başka bir yerden çıkarıldı. Lütfen tekrar giriş yapın.",
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Set user ID for search logging
    setSearchUserId(user.id);

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

    // ===========================================
    // UNIFIED TOOL ROUTER - Priority-based decision
    // ===========================================
    const lastUserMsg = messages.filter((m: any) => m.role === "user").pop()?.content || "";
    const routerDecision = routeRequest(lastUserMsg, hasImageAttachment, hasFileAttachment);
    
    // Log router decision for debugging
    logRouterDecision(supabaseAdmin, user.id, lastUserMsg, routerDecision, ui_language);
    
    console.log('[Router Decision]', {
      selectedTool: routerDecision.selectedTool,
      imageIntent: routerDecision.imageIntent,
      searchIntent: routerDecision.searchIntent,
      blockersHit: routerDecision.blockersHit,
      confidence: routerDecision.confidence,
      detectedLanguage: routerDecision.detectedLanguage,
    });
    
    if (routerDecision.selectedTool === 'image' && routerDecision.imagePrompt) {
      console.log('[Image Gen] Routed to image generation:', routerDecision.imagePrompt);
      
      try {
        // Call the fireworks-generate-image edge function internally
        const imageResponse = await fetch(`${supabaseUrl}/functions/v1/fireworks-generate-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: routerDecision.imagePrompt,
            aspectRatio: '1:1',
            attachToChat: false,
          }),
        });
        
        if (!imageResponse.ok) {
          const errorData = await imageResponse.json().catch(() => ({}));
          console.error('[Image Gen] Fireworks error:', errorData);
          
          // Return error as regular JSON (not stream)
          const lang = ui_language || 'uz';
          const errorMessages: Record<string, string> = {
            uz: "Rasm yaratishda xatolik yuz berdi. Qayta urinib ko'ring.",
            en: "Failed to generate image. Please try again.",
            ru: "Ошибка при создании изображения. Попробуйте снова.",
            tr: "Görsel oluşturulamadı. Lütfen tekrar deneyin.",
          };
          
          return new Response(
            JSON.stringify({
              type: "image_error",
              error: errorData.error || "IMAGE_ERROR",
              message: errorMessages[lang] || errorMessages.uz,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        const imageData = await imageResponse.json();
        console.log('[Image Gen] Success:', { image_url: imageData.image_url, file_name: imageData.file_name, file_path: imageData.file_path });
        
        // Return image generation result as JSON (not a stream)
        return new Response(
          JSON.stringify({
            type: "image_generated",
            fileUrl: imageData.image_url || imageData.fileUrl,
            fileName: imageData.file_name || imageData.fileName,
            filePath: imageData.file_path,
            generationId: imageData.generationId,
            prompt_uz: imageData.prompt_original || imageData.prompt_uz,
            prompt_en: imageData.prompt_used || imageData.prompt_en,
            model: imageData.model,
            width: imageData.width,
            height: imageData.height,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
        
      } catch (err) {
        console.error('[Image Gen] Exception:', err);
        const lang = ui_language || 'uz';
        const errorMessages: Record<string, string> = {
          uz: "Rasm yaratishda xatolik yuz berdi. Qayta urinib ko'ring.",
          en: "Failed to generate image. Please try again.",
          ru: "Ошибка при создании изображения. Попробуйте снова.",
          tr: "Görsel oluşturulamadı. Lütfen tekrar deneyin.",
        };
        
        return new Response(
          JSON.stringify({
            type: "image_error",
            error: "IMAGE_ERROR",
            message: errorMessages[lang] || errorMessages.uz,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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
    // Use reasoner style for reasoner mode, otherwise plan-based style
    const styleClamp = modelPreference === 'reasoner' 
      ? STYLE_CLAMP.reasoner 
      : (effectivePlan === 'free' ? STYLE_CLAMP.free : STYLE_CLAMP.premium);
    const recentMessages = messages.slice(-12);

    // Collect sources from web search
    const collectedSources: TraceSource[] = [];

    // Check for search - use router decision
    const lastUserMessage = recentMessages.filter((m: any) => m.role === "user").pop()?.content || "";
    let searchResults = "";
    let searchUrls: string[] = [];
    let didSearch = false;
    let searchBusyMessage = "";
    
    // Only search if router decided on search tool (not image, not text-only)
    if (routerDecision.selectedTool === 'search' || routerDecision.searchIntent) {
      didSearch = true;
      try {
        // Set language for localized busy messages
        setSearchLang(ui_language || "uz");
        
        const searchResult: SearchResult = await googleSearch(lastUserMessage);
        
        // Handle busy/rate-limited state
        if (searchResult.isBusy && searchResult.busyMessage) {
          searchBusyMessage = searchResult.busyMessage;
          console.log("⚠️ Search is busy, will inform user");
        }
        
        searchResults = searchResult.content;
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

    // Build STRONG language directive - use router's detected language or reply_language
    const languageNames: Record<string, string> = {
      uz: "Uzbek",
      ru: "Russian", 
      en: "English",
      tr: "Turkish",
    };
    // Priority: reply_language from client > router detected language > default uz
    const replyLang = reply_language || routerDecision.detectedLanguage || "uz";
    const languageDirective = `
═══════════════════════════════════════════════════════════════════
REPLY LANGUAGE (STRICT - DO NOT SWITCH)
═══════════════════════════════════════════════════════════════════

**YOU MUST REPLY IN: ${languageNames[replyLang] || "Uzbek"} (${replyLang.toUpperCase()})**

CRITICAL LANGUAGE RULES:
1. NEVER switch languages unless user EXPLICITLY requests it (e.g., "answer in English")
2. Keep your ENTIRE response in ${languageNames[replyLang] || "Uzbek"} - including greetings, explanations, examples
3. If you cite sources in another language, summarize/translate them to ${languageNames[replyLang] || "Uzbek"}
4. Technical terms can stay in English, but explanations must be in ${languageNames[replyLang] || "Uzbek"}
5. DO NOT use mixed languages in the same response

User's detected message language: ${routerDecision.detectedLanguage}
User's UI language setting: ${ui_language || "uz"}
`;

    // Build attached file content blocks - prefer server-extracted text from DB
    let fileContentBlocks = "";
    const attachmentIds = attachments?.filter((att: any) => att.dbId)?.map((att: any) => att.dbId) || [];
    
    // Fetch extracted text from attachment_text table
    let dbExtractedTexts: Record<string, { text: string; summary: string; status: string }> = {};
    if (attachmentIds.length > 0) {
      const { data: extractedData } = await supabaseAdmin
        .from('attachment_text')
        .select('attachment_id, text, summary, status')
        .in('attachment_id', attachmentIds)
        .eq('status', 'ready');
      
      if (extractedData) {
        for (const item of extractedData) {
          dbExtractedTexts[item.attachment_id] = {
            text: item.text || '',
            summary: item.summary || '',
            status: item.status,
          };
        }
      }
    }
    
    if (attachments && Array.isArray(attachments)) {
      const fileBlocks: string[] = [];
      const unsupportedNames: string[] = [];
      
      for (const att of attachments) {
        const dbText = att.dbId ? dbExtractedTexts[att.dbId] : null;
        
        if (dbText && dbText.status === 'ready') {
          // Use server-extracted text (prefer summary if available and text is long)
          const content = (dbText.summary && dbText.text.length > 20000) ? dbText.summary : dbText.text;
          if (content) {
            fileBlocks.push(`--- ATTACHED FILE: ${att.name} ---\n${content}\n--- END FILE ---`);
          }
        } else if (att.extractedText) {
          // Fallback to client-extracted text
          fileBlocks.push(`--- ATTACHED FILE: ${att.name} ---\n${att.extractedText}\n--- END FILE ---`);
        } else if (att.readStatus === 'unsupported') {
          unsupportedNames.push(att.name);
        } else if (att.readStatus === 'processing') {
          fileBlocks.push(`--- ATTACHED FILE: ${att.name} ---\n[File is still being processed. Please wait a moment and try again.]\n--- END FILE ---`);
        }
      }
      
      if (fileBlocks.length > 0) {
        fileContentBlocks = `
═══════════════════════════════════════════════════════════════════
ATTACHED FILES (User uploaded these files - prioritize answering based on their content)
═══════════════════════════════════════════════════════════════════

${fileBlocks.join('\n\n')}

If an attached file is provided above, prioritize answering based on its content. If the user asks to summarize, analyze, or explain the file, do so based on the content above.
`;
      }
      
      // Check for unsupported files that need acknowledgment
      if (unsupportedNames.length > 0) {
        fileContentBlocks += `
Note: The user attached file(s) that could not be read: ${unsupportedNames.join(', ')}. If they ask about these files, politely explain that this file type is not yet supported, and suggest they paste the text content directly or use a TXT/PDF file instead.
`;
      }
    }

    // Build user tone preference directive
    let toneDirective = "";
    if (userToneContext) {
      toneDirective = `
═══════════════════════════════════════════════════════════════════
USER TONE PREFERENCE (APPLY THIS STYLE)
═══════════════════════════════════════════════════════════════════

${userToneContext}
`;
    }

    // For reasoner mode, add anti-truncation directive at the very top
    const reasonerTopDirective = modelPreference === 'reasoner' ? `
═══════════════════════════════════════════════════════════════════
CRITICAL OUTPUT RULES - MUST FOLLOW
═══════════════════════════════════════════════════════════════════
You MUST complete your ENTIRE response in ONE message. 
FORBIDDEN phrases (NEVER use these): "Davomi uchun", "batafsil deb yozing", "would you like me to continue", "davom etaymi", "(Davomi", "...deb yozing"
DO NOT truncate, split, or ask to continue. Write your FULL answer regardless of length.

` : '';

    const systemPrompt = `${reasonerTopDirective}${BRAND_SYSTEM_PROMPT}
${languageDirective}
${toneDirective}
${styleClamp}

MODE: ${modeKey.toUpperCase()}
${modePrompt}
${summaryContext}
${fileContentBlocks}
${searchResults ? `
═══════════════════════════════════════════════════════════════════
WEB SEARCH RESULTS (CRITICAL - USE THESE!)
═══════════════════════════════════════════════════════════════════

${searchResults}

**CRITICAL CITATION INSTRUCTIONS - YOU MUST FOLLOW:**

1. You performed a LIVE web search and the results above are REAL and CURRENT
2. **SUMMARIZE THE ACTUAL CONTENT** from the search results - don't just list the source links
3. **USE NUMBERED CITATION MARKERS** like [1], [2], [3] inline in your text to reference sources
   - Example: "O'zbekistonda yangi qonun qabul qilindi [1]. Bu qonun..." 
   - Match the citation number to the order sources appear in search results
4. Place citations RIGHT AFTER the fact or sentence that came from that source
5. You can cite the same source multiple times with the same number
6. If search results contain news → TELL THE USER WHAT THE NEWS IS with citations
7. If search results contain data → EXTRACT AND PRESENT THAT DATA with citations
8. DO NOT say "I cannot search" - you already searched, now summarize what you found

**WRONG RESPONSE (no citations):**
"Bugungi yangiliklar quyidagilar: O'zbekistonda yangi qonun qabul qilindi."

**CORRECT RESPONSE (with inline citations):**
"Bugungi yangiliklar quyidagilar: O'zbekistonda yangi qonun qabul qilindi [1]. Xorazm viloyatida yangi loyiha boshlandi [2]."
` : searchBusyMessage ? `
═══════════════════════════════════════════════════════════════════
WEB SEARCH STATUS
═══════════════════════════════════════════════════════════════════

${searchBusyMessage}

**IMPORTANT**: Tell the user that web search is temporarily busy and they can try again later.
Explain that they can continue chatting without web search in the meantime.
Answer their question as best you can using your existing knowledge, but be clear you couldn't access live search results this time.
` : ""}`;

    const finalMessages = [
      { role: "system", content: systemPrompt },
      ...recentMessages,
    ];

    // Log request info including attachments and model preference
    const textFilesCount = attachments?.filter((att: any) => att.extractedText)?.length || 0;
    const unsupportedCount = attachments?.filter((att: any) => att.readStatus === 'unsupported')?.length || 0;
    console.log(`Chat: user=${user.id}, email=${userEmail}, mode=${modeKey}, model=${modelPreference || 'chat'}, plan=${effectivePlan}, devBypass=${isDevBypass}, usage=${usageResult.used}/${usageResult.limit}, textFiles=${textFilesCount}, unsupported=${unsupportedCount}`);

    // Call DeepSeek with timeout
    const deepseekController = new AbortController();
    const deepseekTimeout = setTimeout(() => deepseekController.abort(), 60000); // 60 second timeout
    
    // Select model based on user preference
    const selectedModel = modelPreference === "reasoner" ? DEEPSEEK_REASONER_MODEL : DEEPSEEK_CHAT_MODEL;
    console.log(`[Model Selection] preference=${modelPreference}, model=${selectedModel}`);
    
    let response: Response;
    try {
      response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${deepseekApiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: finalMessages,
          temperature: modelPreference === "reasoner" ? 0 : 0.6,
          ...(modelPreference !== "reasoner" && { max_tokens: 2000 }),
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

    // Stream with enhanced trace events (ThinkBar)
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = response.body!.getReader();
    
    // Calculate safe metadata for trace events
    const textFilesWithContent = attachments?.filter((att: any) => att.extractedText) || [];
    const totalExtractedChars = textFilesWithContent.reduce((sum: number, att: any) => 
      sum + (att.extractedText?.length || 0), 0
    );
    
    const stream = new ReadableStream({
      async start(controller) {
        // Emit preparing step (always first)
        controller.enqueue(encoder.encode(createTraceEvent('preparing', 'start', requestStartTime)));
        controller.enqueue(encoder.encode(createTraceEvent('preparing', 'end', requestStartTime)));
        
        // Emit model selection with safe metadata
        controller.enqueue(encoder.encode(createTraceEvent('selecting_model', 'start', requestStartTime, {
          modelPreference: modelPreference || 'chat',
          modelName: selectedModel,
        })));
        controller.enqueue(encoder.encode(createTraceEvent('selecting_model', 'end', requestStartTime, {
          modelPreference: modelPreference || 'chat',
          modelName: selectedModel,
        })));
        
        // Emit thinking start
        controller.enqueue(encoder.encode(createTraceEvent('thinking', 'start', requestStartTime)));
        
        // If we did image/document analysis, emit that trace
        if (hasAnalysis) {
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'end', requestStartTime)));
          const analysisStep = analysisType === 'vision' ? 'image_analysis' : 'parsing_files';
          controller.enqueue(encoder.encode(
            createTraceEvent(analysisStep, 'start', requestStartTime, { filesCount: 1 })
          ));
          controller.enqueue(encoder.encode(
            createTraceEvent(analysisStep, 'end', requestStartTime, { filesCount: 1 })
          ));
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'start', requestStartTime)));
        }
        
        // If text files were attached and read, emit reading trace with safe counts
        if (textFilesWithContent.length > 0 && !hasAnalysis) {
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'end', requestStartTime)));
          controller.enqueue(encoder.encode(createTraceEvent('parsing_files', 'start', requestStartTime, {
            filesCount: textFilesWithContent.length,
          })));
          controller.enqueue(encoder.encode(createTraceEvent('parsing_files', 'end', requestStartTime, {
            filesCount: textFilesWithContent.length,
            extractedChars: totalExtractedChars,
          })));
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'start', requestStartTime)));
        }
        
        // If web search was used, emit search trace with source count
        if (didSearch) {
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'end', requestStartTime)));
          controller.enqueue(encoder.encode(createTraceEvent('web_search', 'start', requestStartTime)));
          controller.enqueue(encoder.encode(
            createTraceEvent('web_search', 'end', requestStartTime, { 
              sources: collectedSources,
              sourcesCount: collectedSources.length,
            })
          ));
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'start', requestStartTime)));
        }
        
        // Send metadata (legacy support)
        const metadata = {
          type: "metadata",
          search_used: didSearch,
          search_urls: searchUrls,
          usage: { ...usageResult, plan: effectivePlan, isDevBypass, isPremium },
          // Image generation blocked info
          image_blocked: routerDecision.blockersHit.length > 0 && routerDecision.imageIntent === false && detectImageKeywords(lastUserMessage, lastUserMessage.toLowerCase()).isImageGen,
          image_blockers: routerDecision.blockersHit,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));
        
        // End thinking, start writing
        controller.enqueue(encoder.encode(createTraceEvent('thinking', 'end', requestStartTime)));
        controller.enqueue(encoder.encode(createTraceEvent('writing', 'start', requestStartTime)));
        
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
          
          // End writing
          controller.enqueue(encoder.encode(createTraceEvent('writing', 'end', requestStartTime)));
          
          // Emit saving step (indicates dual-write happening on client)
          controller.enqueue(encoder.encode(createTraceEvent('saving', 'start', requestStartTime)));
          controller.enqueue(encoder.encode(createTraceEvent('saving', 'end', requestStartTime, {
            cloudSaved: true, // Server-side saving is implicit via DB triggers
          })));
          
          // Emit delivering (finalization)
          controller.enqueue(encoder.encode(createTraceEvent('delivering', 'start', requestStartTime)));
          controller.enqueue(encoder.encode(createTraceEvent('delivering', 'end', requestStartTime)));
          
          // Emit trace complete with total time, sources, and aggregated safe metadata
          controller.enqueue(encoder.encode(createTraceComplete(requestStartTime, collectedSources, {
            modelPreference: modelPreference || 'chat',
            filesCount: textFilesWithContent.length || 0,
            extractedChars: totalExtractedChars || 0,
            sourcesCount: collectedSources.length,
          })));
          
          controller.close();
          console.log('[Stream] Response stream closed successfully');
          
          // Log chat event for observability
          const chatDurationMs = Date.now() - requestStartTime;
          logChatEvent(supabaseAdmin, user.id, {
            model: selectedModel,
            duration_ms: chatDurationMs,
            mode: mode || 'general',
            search_used: didSearch,
            files_count: textFilesWithContent.length || 0,
          }).catch(() => {}); // Fire and forget
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
