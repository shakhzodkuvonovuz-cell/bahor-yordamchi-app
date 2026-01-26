// BahorAI Edge Function with Native Tool Calling
// Premium, human, Uzbek-first AI assistant with intelligent intent detection

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
    tool_used?: string;
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
// TOOL DEFINITIONS - DeepSeek Function Calling
// ============================================
const CHAT_TOOLS = [
  {
    type: "function",
    function: {
      name: "generate_image",
      description: `Generate an image based on user's visual request. Use this when user asks for:
- Creating, drawing, generating, or making an image/picture/photo
- Visual content like "show me", "draw", "create a picture of"
- Requests ending with "rasmi", "rasmini", "surati", "tasviri" (Uzbek image suffixes)
- Explicit commands like "/rasm" or "/image"
- Any request for visual illustration, artwork, or rendering

Do NOT use for:
- Questions about weather, news, prices
- Requests to analyze or explain existing images
- General information queries`,
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "English prompt describing what image to generate. Translate if user wrote in Uzbek/Russian."
          },
          style: {
            type: "string",
            enum: ["realistic", "artistic", "cartoon", "photography", "digital_art"],
            description: "Visual style for the image"
          }
        },
        required: ["prompt"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: `Search the web for current, real-time information. Use this when user asks about:
- Current news, recent events, latest updates
- Weather, prices, exchange rates, stock data
- Facts that might have changed recently
- Current status of events, sports scores
- "What is happening with...", "Latest news about..."
- Questions with words like: bugun, hozir, yangilik, qidiruv, narxi, kursi, ob-havo

Do NOT use for:
- General knowledge questions that don't need real-time data
- Math calculations, explanations of concepts
- Creative writing, code generation
- Historical facts that won't change`,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query in the language most likely to return good results (usually English for international topics, Uzbek for local)"
          }
        },
        required: ["query"]
      }
    }
  }
];

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
  for (const phrase of TRUNCATION_PHRASES) {
    result = result.split(phrase).join("");
  }
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

// ============================================
// LEGACY ROUTER - Only for explicit commands
// ============================================

interface RouterDecision {
  selectedTool: 'text' | 'image' | 'search';
  imageIntent: boolean;
  searchIntent: boolean;
  blockersHit: string[];
  confidence: number;
  explicitCommand: boolean;
  detectedLanguage: string;
  imagePrompt?: string;
  useToolCalling: boolean; // NEW: Flag to use native tool calling
}

function detectMessageLanguage(msg: string): string {
  const text = msg.toLowerCase();
  if (/[а-яё]/i.test(text)) return 'ru';
  if (/[ğüşöçıİ]/i.test(text)) return 'tr';
  if (/[oʻʼ]'|g'|oʻ|gʻ/i.test(text)) return 'uz';
  const uzWords = ['salom', 'rahmat', 'qanday', 'nima', 'qayerda', 'uchun', 'bilan', 'kerak'];
  if (uzWords.some(w => text.includes(w))) return 'uz';
  return 'en';
}

// Simplified router - only handles EXPLICIT commands
// Everything else goes to DeepSeek tool calling
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
    useToolCalling: true, // Default: use native tool calling
  };
  
  // PRIORITY 1: Forced tool from UI - skip tool calling
  if (forcedTool) {
    decision.selectedTool = forcedTool;
    decision.explicitCommand = true;
    decision.confidence = 1.0;
    decision.useToolCalling = false;
    console.log('[Router] Forced tool from UI:', forcedTool);
    return decision;
  }
  
  // PRIORITY 2: Explicit slash commands - skip tool calling
  if (qLower.startsWith('/image ') || qLower.startsWith('/rasm ')) {
    decision.selectedTool = 'image';
    decision.imageIntent = true;
    decision.explicitCommand = true;
    decision.imagePrompt = q.slice(7).trim();
    decision.useToolCalling = false;
    console.log('[Router] Explicit image command');
    return decision;
  }
  
  if (qLower.startsWith('/search ') || qLower.startsWith('/qidir ')) {
    decision.selectedTool = 'search';
    decision.searchIntent = true;
    decision.explicitCommand = true;
    decision.useToolCalling = false;
    console.log('[Router] Explicit search command');
    return decision;
  }
  
  // PRIORITY 3: File/image attachments → always text analysis, no tool calling
  if (hasImageAttachment || hasFileAttachment) {
    decision.selectedTool = 'text';
    decision.useToolCalling = false;
    console.log('[Router] Has attachment → text analysis (no tools)');
    return decision;
  }
  
  // PRIORITY 4: Use DeepSeek native tool calling for everything else
  console.log('[Router] Using native tool calling');
  return decision;
}

// Log router decision to database
async function logRouterDecision(
  supabase: any,
  userId: string,
  userMsg: string,
  decision: RouterDecision,
  uiLanguage?: string,
  toolUsed?: string
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
      selected_tool: toolUsed || decision.selectedTool,
      confidence: decision.confidence,
      explicit_command: decision.explicitCommand,
    });
  } catch (e) {
    console.log("Failed to log router decision:", e);
  }
}

// ============================================
// TRACE EVENT HELPER
// ============================================

type TraceStep = 'preparing' | 'new_chat' | 'uploading' | 'parsing_files' | 'web_search' | 
                 'selecting_model' | 'thinking' | 'writing' | 'saving' | 'generating_image' | 'delivering' |
                 'analyzing_request' | 'image_analysis' | 'reading_files' | 'drafting_answer' | 'safety_check' | 'formatting';

interface TraceSource {
  title: string;
  url: string;
}

interface TraceDetail {
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
  toolName?: string;
  [key: string]: any;
}

function createTraceEvent(
  step: TraceStep, 
  status: 'start' | 'end', 
  startTime: number, 
  detail?: TraceDetail,
  explicitT?: number
): string {
  const event = {
    type: 'trace',
    step,
    status,
    t: explicitT !== undefined ? explicitT : (Date.now() - startTime),
    ...(detail && { detail, data: detail }),
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
// BAHOR AI IDENTITY CARDS
// ============================================

const IDENTITY_CARD_UZ = `
BAHOR AI HAQIDA:
Men Bahor AI - o'zbeklar uchun maxsus ishlab chiqilgan sun'iy intellekt yordamchisiman.

Asoschi: Shaxzod Quvonov - yosh o'zbek dasturchisi va tadbirkor. U Bahor AI'ni o'zbek foydalanuvchilari uchun qulay va tushunarli AI yaratish maqsadida boshlagan.

Jamoa: Kichik, ammo fidoyi dasturchilar jamoasi.

Maqsadimiz: O'zbek tilida sifatli AI xizmatini taqdim etish, ta'lim, ish va kundalik hayotda yordam berish.

Rasmiy sayt: https://www.bahorai.com
Aloqa: support@bahorai.com
Holat: Hozirda Beta versiyada sinovdan o'tmoqdamiz

QOIDALAR:
- Shaxsiy ma'lumotlar (manzil, telefon raqam) so'ralsa → support@bahorai.com ga yo'naltir
- Bu kartada yo'q ma'lumotni to'qima
`;

const IDENTITY_CARD_EN = `
ABOUT BAHOR AI:
I'm Bahor AI - an AI assistant built specifically for Uzbek users.

Founder: Shakhzod Kuvonov - a young Uzbek developer and entrepreneur. He started Bahor AI with the goal of creating an accessible, user-friendly AI for Uzbek speakers.

Team: A small but dedicated team of developers.

Our mission: To provide quality AI services in Uzbek, helping with education, work, and everyday life.

Official website: https://www.bahorai.com
Support: support@bahorai.com
Status: Currently in Beta testing

RULES:
- If asked for personal details (address, phone) → direct to support@bahorai.com
- Do not invent information not in this card
`;

const IDENTITY_CARD_RU = `
О BAHOR AI:
Я Bahor AI - ИИ-помощник, созданный специально для узбекских пользователей.

Основатель: Шахзод Кувонов - молодой узбекский разработчик и предприниматель. Он создал Bahor AI с целью сделать доступный и удобный ИИ для узбекоязычных пользователей.

Команда: Небольшая, но преданная команда разработчиков.

Наша миссия: Предоставить качественные ИИ-сервисы на узбекском языке, помогая в образовании, работе и повседневной жизни.

Официальный сайт: https://www.bahorai.com
Поддержка: support@bahorai.com
Статус: Сейчас в стадии Beta-тестирования

ПРАВИЛА:
- Если спрашивают личные данные (адрес, телефон) → направляй на support@bahorai.com
- Не выдумывай информацию, которой нет в этой карточке
`;

const IDENTITY_CARD_TR = `
BAHOR AI HAKKINDA:
Ben Bahor AI - Özbek kullanıcılar için özel olarak geliştirilmiş bir yapay zeka asistanıyım.

Kurucu: Shakhzod Kuvonov - genç bir Özbek geliştirici ve girişimci. Bahor AI'yi, Özbekçe konuşanlar için erişilebilir ve kullanıcı dostu bir yapay zeka oluşturmak amacıyla başlattı.

Ekip: Küçük ama özverili bir geliştirici ekibi.

Misyonumuz: Eğitim, iş ve günlük yaşamda yardımcı olarak Özbekçe'de kaliteli yapay zeka hizmetleri sunmak.

Resmi site: https://www.bahorai.com
Destek: support@bahorai.com
Durum: Şu anda Beta testinde

KURALLAR:
- Kişisel bilgiler (adres, telefon) istenirse → support@bahorai.com'a yönlendir
- Bu kartta olmayan bilgileri uydurma
`;

function getIdentityCard(lang: string): string {
  switch (lang) {
    case 'uz': return IDENTITY_CARD_UZ;
    case 'ru': return IDENTITY_CARD_RU;
    case 'tr': return IDENTITY_CARD_TR;
    case 'en':
    default: return IDENTITY_CARD_EN;
  }
}

// ============================================
// BRAND VOICE SYSTEM PROMPT (with tool calling instructions)
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
- Use ONLY the facts from the IDENTITY CARD section - never invent additional details

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
TOOL USAGE INSTRUCTIONS (IMPORTANT!)
═══════════════════════════════════════════════════════════════════

You have access to tools. Use them wisely:

1. **generate_image** - Use when user wants to CREATE/MAKE/DRAW a visual
   - "Show me what X looks like" → USE generate_image
   - "Draw/create/generate X" → USE generate_image
   - "X rasmi", "X ning surati" → USE generate_image
   - DO NOT use for analyzing existing images

2. **web_search** - Use for CURRENT/REAL-TIME information only
   - News, weather, prices, recent events → USE web_search
   - General knowledge, explanations, math → DON'T use search
   - Be smart about when info needs to be fresh

3. **No tool** - Most questions need NO tool
   - Explanations, advice, creative writing → just answer directly
   - Don't use tools unless truly needed

When you use a tool, the system will handle the result and continue your response.

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
  free: "STYLE: Keep answers concise and practical. Be clear and direct.",
  premium: "STYLE: Can be more detailed when needed. Prioritize clarity and completeness.",
  reasoner: `STYLE: DEEP ANALYSIS MODE - CRITICAL RULES:
1. Provide comprehensive, thorough, COMPLETE responses
2. FORBIDDEN phrases (NEVER USE): "Davomi uchun", "batafsil deb yozing", "to continue", "would you like me to continue", "davom etaymi"
3. NEVER artificially stop or truncate your response
4. Complete your FULL answer in ONE response, regardless of length
5. If writing long content (essays, research), write it ALL - do not break into parts`,
};

// Step timing tracker
interface StepTiming {
  step: TraceStep;
  startMs: number;
  endMs: number;
  detail?: TraceDetail;
}

// ============================================
// TOOL EXECUTION HANDLERS
// ============================================

async function executeImageGeneration(
  supabaseUrl: string,
  token: string,
  prompt: string,
  style?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  console.log('[Tool:generate_image] Executing with prompt:', prompt);
  
  try {
    const imageResponse = await fetch(`${supabaseUrl}/functions/v1/image-generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: prompt,
        aspectRatio: '1:1',
        attachToChat: false,
        style: style || 'realistic',
      }),
    });
    
    if (!imageResponse.ok) {
      const errorData = await imageResponse.json().catch(() => ({}));
      console.error('[Tool:generate_image] Error:', errorData);
      return { success: false, error: errorData.error || 'IMAGE_ERROR' };
    }
    
    const imageData = await imageResponse.json();
    console.log('[Tool:generate_image] Success:', { file_path: imageData.file_path });
    return { success: true, data: imageData };
  } catch (err) {
    console.error('[Tool:generate_image] Exception:', err);
    return { success: false, error: 'IMAGE_EXCEPTION' };
  }
}

async function executeWebSearch(
  query: string,
  uiLanguage: string
): Promise<{ success: boolean; results?: string; sources?: TraceSource[]; error?: string }> {
  console.log('[Tool:web_search] Executing with query:', query);
  
  try {
    setSearchLang(uiLanguage || "uz");
    const searchResult: SearchResult = await googleSearch(query);
    
    if (searchResult.isBusy) {
      console.log('[Tool:web_search] Search is busy');
      return { success: false, error: 'SEARCH_BUSY', results: searchResult.busyMessage };
    }
    
    const sources: TraceSource[] = [];
    if (searchResult.content) {
      const titleMatches = searchResult.content.matchAll(/\*\*([^*]+)\*\*\s*\n[^h]*?(https?:\/\/[^\s\n]+)/g);
      for (const match of titleMatches) {
        sources.push({
          title: match[1].trim(),
          url: match[2].trim(),
        });
      }
      
      if (sources.length === 0) {
        const urlMatches = searchResult.content.match(/https?:\/\/[^\s\n]+/g);
        if (urlMatches) {
          for (const url of urlMatches.slice(0, 5)) {
            try {
              const domain = new URL(url).hostname.replace(/^www\./, '');
              sources.push({ title: domain, url });
            } catch { /* ignore */ }
          }
        }
      }
    }
    
    console.log('[Tool:web_search] Success, sources:', sources.length);
    return { success: true, results: searchResult.content, sources };
  } catch (err) {
    console.error('[Tool:web_search] Exception:', err);
    return { success: false, error: 'SEARCH_EXCEPTION' };
  }
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requestStartTime = Date.now();
  const stepTimings: StepTiming[] = [];
  
  const recordStep = (step: TraceStep, startMs: number, detail?: TraceDetail) => {
    stepTimings.push({ step, startMs, endMs: Date.now() - requestStartTime, detail });
  };

  try {
    // STEP: preparing
    const preparingStart = Date.now() - requestStartTime;
    
    const body = await req.json();
    
    // Handle warmup requests
    if (body.warmup === true) {
      return new Response(
        JSON.stringify({ ok: true, status: "warm" }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { messages, mode, modelPreference, threadSummary, hasAnalysis, analysisType, reply_language, ui_language, attachments, userToneContext, device_id } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    recordStep('preparing', preparingStart);

    // STEP: Auth
    const authStart = Date.now() - requestStartTime;
    
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
    
    const authEndMs = Date.now() - requestStartTime;
    console.log(`[Timing] Auth: ${authEndMs - authStart}ms`);

    // ===========================================
    // PARALLEL INITIALIZATION
    // ===========================================
    
    setSearchUserId(user.id);
    
    const userEmail = user.email?.toLowerCase() || '';
    const devUnlimitedRaw = Deno.env.get('DEV_UNLIMITED_EMAILS') || '';
    const adminEmailsRaw = Deno.env.get('ADMIN_EMAILS') || '';
    const devUnlimitedEmails = devUnlimitedRaw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const adminEmails = adminEmailsRaw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const isDevBypass = devUnlimitedEmails.includes(userEmail) || adminEmails.includes(userEmail);
    
    const hasAttachments = messages.some((m: any) => m.attachments && m.attachments.length > 0);
    const hasImageAttachment = messages.some((m: any) => 
      m.attachments?.some((a: any) => a.mime_type?.startsWith('image/'))
    );
    const hasFileAttachment = messages.some((m: any) => 
      m.attachments?.some((a: any) => !a.mime_type?.startsWith('image/'))
    );
    const userMsgForRouter = messages.filter((m: any) => m.role === "user").pop()?.content || "";
    
    // For tool calling, we need to check all possible tools usage
    const wantsSearch = false; // Will be determined by tool call
    const wantsVision = hasImageAttachment || hasAnalysis;
    const wantsFile = hasFileAttachment;

    console.log('[Quota Check]', { userEmail, isDevBypass, wantsVision, wantsFile });

    const TRIAL_DAYS = 7;
    
    const devicePromise = device_id 
      ? supabaseAdmin
          .from('user_devices')
          .select('revoked_at')
          .eq('user_id', user.id)
          .eq('device_id', device_id)
          .single()
      : Promise.resolve({ data: null, error: null });
    
    const usagePromise = supabaseAdmin.rpc('init_and_check_usage', { 
      p_user_id: user.id,
      p_trial_days: TRIAL_DAYS,
      p_is_bypass: isDevBypass,
      p_wants_search: false, // Will increment after tool call if needed
      p_wants_vision: wantsVision,
      p_wants_file: wantsFile,
    });
    
    const [deviceResult, usageResponse] = await Promise.all([devicePromise, usagePromise]);
    
    if (device_id && deviceResult.data?.revoked_at) {
      return new Response(
        JSON.stringify({ 
          error: "DEVICE_REVOKED", 
          message: "Bu qurilma boshqa joydan chiqarilgan. Qaytadan kiring.",
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: usageResult, error: usageError } = usageResponse;

    if (usageError) {
      console.error('Usage check error:', usageError);
      return new Response(
        JSON.stringify({ error: "SERVER_ERROR", message: "Xatolik yuz berdi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const limitMessages: Record<string, Record<string, string>> = {
      daily_limit_reached: {
        uz: "Bugungi limit tugadi. Ertaga davom eting yoki Premiumga o'ting.",
        en: "Daily limit reached. Continue tomorrow or upgrade to Premium.",
        ru: "Дневной лимит исчерпан. Продолжите завтра или перейдите на Премиум.",
        tr: "Günlük limit doldu. Yarın devam edin veya Premium'a geçin.",
      },
      search_limit_reached: {
        uz: "Bugungi web qidiruv limiti tugadi.",
        en: "Daily web search limit reached.",
        ru: "Дневной лимит поиска исчерпан.",
        tr: "Günlük web arama limiti doldu.",
      },
      vision_limit_reached: {
        uz: "Bugungi rasm tahlil limiti tugadi.",
        en: "Daily image analysis limit reached.",
        ru: "Дневной лимит анализа изображений исчерпан.",
        tr: "Günlük görsel analiz limiti doldu.",
      },
      file_limit_reached: {
        uz: "Bugungi fayl tahlil limiti tugadi.",
        en: "Daily file analysis limit reached.",
        ru: "Дневной лимит анализа файлов исчерпан.",
        tr: "Günlük dosya analiz limiti doldu.",
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
    // ROUTER DECISION
    // ===========================================
    const routerStart = Date.now() - requestStartTime;
    const lastUserMsg = messages.filter((m: any) => m.role === "user").pop()?.content || "";
    const routerDecision = routeRequest(lastUserMsg, hasImageAttachment, hasFileAttachment);
    
    console.log('[Router Decision]', {
      useToolCalling: routerDecision.useToolCalling,
      explicitCommand: routerDecision.explicitCommand,
      selectedTool: routerDecision.selectedTool,
    });
    
    recordStep('selecting_model', routerStart, { modelPreference: modelPreference || 'chat' });

    // ===========================================
    // HANDLE EXPLICIT COMMANDS (bypass tool calling)
    // ===========================================
    if (!routerDecision.useToolCalling && routerDecision.selectedTool === 'image' && routerDecision.imagePrompt) {
      console.log('[Explicit Command] Image generation:', routerDecision.imagePrompt);
      
      const result = await executeImageGeneration(supabaseUrl, token, routerDecision.imagePrompt);
      
      if (!result.success) {
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
            error: result.error,
            message: errorMessages[lang] || errorMessages.uz,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      logRouterDecision(supabaseAdmin, user.id, lastUserMsg, routerDecision, ui_language, 'image');
      
      return new Response(
        JSON.stringify({
          type: "image_generated",
          fileUrl: result.data.image_url || result.data.fileUrl,
          fileName: result.data.file_name || result.data.fileName,
          filePath: result.data.file_path,
          generationId: result.data.generationId,
          prompt_uz: result.data.prompt_original || result.data.prompt_uz,
          prompt_en: result.data.prompt_used || result.data.prompt_en,
          model: result.data.model,
          width: result.data.width,
          height: result.data.height,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===========================================
    // DeepSeek API CALL (with or without tools)
    // ===========================================
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      return new Response(
        JSON.stringify({ error: "SERVER_ERROR", message: "Server konfiguratsiya xatosi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const modeKey = mode || "general";
    const modePrompt = MODE_PROMPTS[modeKey] || MODE_PROMPTS.general;
    const styleClamp = modelPreference === 'reasoner' 
      ? STYLE_CLAMP.reasoner 
      : (effectivePlan === 'free' ? STYLE_CLAMP.free : STYLE_CLAMP.premium);
    const recentMessages = messages.slice(-12);

    // Build language directive
    const languageNames: Record<string, string> = {
      uz: "Uzbek",
      ru: "Russian", 
      en: "English",
      tr: "Turkish",
    };
    const replyLang = reply_language || routerDecision.detectedLanguage || "uz";
    const languageDirective = `
═══════════════════════════════════════════════════════════════════
REPLY LANGUAGE (STRICT - DO NOT SWITCH)
═══════════════════════════════════════════════════════════════════

**YOU MUST REPLY IN: ${languageNames[replyLang] || "Uzbek"} (${replyLang.toUpperCase()})**

User's detected message language: ${routerDecision.detectedLanguage}
User's UI language setting: ${ui_language || "uz"}
`;

    // Build file content blocks
    let fileContentBlocks = "";
    const attachmentIds = attachments?.filter((att: any) => att.dbId)?.map((att: any) => att.dbId) || [];
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
          const content = (dbText.summary && dbText.text.length > 20000) ? dbText.summary : dbText.text;
          if (content) {
            fileBlocks.push(`--- ATTACHED FILE: ${att.name} ---\n${content}\n--- END FILE ---`);
          }
        } else if (att.extractedText) {
          fileBlocks.push(`--- ATTACHED FILE: ${att.name} ---\n${att.extractedText}\n--- END FILE ---`);
        } else if (att.readStatus === 'unsupported') {
          unsupportedNames.push(att.name);
        }
      }
      
      if (fileBlocks.length > 0) {
        fileContentBlocks = `
═══════════════════════════════════════════════════════════════════
ATTACHED FILES
═══════════════════════════════════════════════════════════════════

${fileBlocks.join('\n\n')}
`;
      }
      
      if (unsupportedNames.length > 0) {
        fileContentBlocks += `\nNote: Files that could not be read: ${unsupportedNames.join(', ')}`;
      }
    }

    let toneDirective = "";
    if (userToneContext) {
      toneDirective = `
═══════════════════════════════════════════════════════════════════
USER TONE PREFERENCE
═══════════════════════════════════════════════════════════════════

${userToneContext}
`;
    }

    const reasonerTopDirective = modelPreference === 'reasoner' ? `
═══════════════════════════════════════════════════════════════════
CRITICAL OUTPUT RULES - MUST FOLLOW
═══════════════════════════════════════════════════════════════════
You MUST complete your ENTIRE response in ONE message. 
FORBIDDEN phrases: "Davomi uchun", "batafsil deb yozing", "would you like me to continue"
DO NOT truncate. Write your FULL answer regardless of length.

` : '';

    const identityCard = getIdentityCard(ui_language || 'uz');

    const systemPrompt = `${reasonerTopDirective}${identityCard}
${BRAND_SYSTEM_PROMPT}
${languageDirective}
${toneDirective}
${styleClamp}

MODE: ${modeKey.toUpperCase()}
${modePrompt}
${threadSummary ? `\nTHREAD MEMORY:\n${threadSummary}\n` : ''}
${fileContentBlocks}`;

    const finalMessages = [
      { role: "system", content: systemPrompt },
      ...recentMessages,
    ];

    const textFilesCount = attachments?.filter((att: any) => att.extractedText)?.length || 0;
    console.log(`Chat: user=${user.id}, mode=${modeKey}, model=${modelPreference || 'chat'}, plan=${effectivePlan}, toolCalling=${routerDecision.useToolCalling}`);

    // Select model
    const selectedModel = modelPreference === "reasoner" ? DEEPSEEK_REASONER_MODEL : DEEPSEEK_CHAT_MODEL;
    
    // Build request body - include tools if using tool calling
    const requestBody: any = {
      model: selectedModel,
      messages: finalMessages,
      temperature: modelPreference === "reasoner" ? 0 : 0.6,
      stream: true,
    };
    
    // Add tools for non-reasoner mode when using tool calling
    if (routerDecision.useToolCalling && modelPreference !== "reasoner") {
      requestBody.tools = CHAT_TOOLS;
      requestBody.tool_choice = "auto";
    }
    
    if (modelPreference !== "reasoner") {
      requestBody.max_tokens = 2000;
    }

    const thinkingApiStart = Date.now() - requestStartTime;
    
    const deepseekController = new AbortController();
    const deepseekTimeout = setTimeout(() => deepseekController.abort(), 60000);
    
    let response: Response;
    try {
      response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${deepseekApiKey}`,
        },
        body: JSON.stringify(requestBody),
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
    
    const connectionEstablished = Date.now() - requestStartTime;
    console.log(`[Timing] DeepSeek connection: ${connectionEstablished - thinkingApiStart}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek error:', response.status, errorText.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "AI_ERROR", message: "AI xizmati xatosi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===========================================
    // STREAMING WITH TOOL CALL DETECTION
    // ===========================================
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = response.body!.getReader();
    
    const textFilesWithContent = attachments?.filter((att: any) => att.extractedText) || [];
    const totalExtractedChars = textFilesWithContent.reduce((sum: number, att: any) => 
      sum + (att.extractedText?.length || 0), 0
    );
    
    // Collect sources for trace
    let collectedSources: TraceSource[] = [];
    let toolUsed: string | null = null;
    
    const stream = new ReadableStream({
      async start(controller) {
        // Emit trace events
        const emitRecordedStep = (step: TraceStep, timing: StepTiming | undefined) => {
          if (!timing) return;
          controller.enqueue(encoder.encode(createTraceEvent(step, 'start', requestStartTime, timing.detail, timing.startMs)));
          controller.enqueue(encoder.encode(createTraceEvent(step, 'end', requestStartTime, timing.detail, timing.endMs)));
        };
        
        const preparingStep = stepTimings.find(s => s.step === 'preparing');
        const modelStep = stepTimings.find(s => s.step === 'selecting_model');
        
        if (preparingStep) {
          emitRecordedStep('preparing', preparingStep);
        } else {
          controller.enqueue(encoder.encode(createTraceEvent('preparing', 'start', requestStartTime, undefined, 0)));
          controller.enqueue(encoder.encode(createTraceEvent('preparing', 'end', requestStartTime, undefined, 5)));
        }
        
        if (modelStep) {
          controller.enqueue(encoder.encode(createTraceEvent('selecting_model', 'start', requestStartTime, {
            modelPreference: modelPreference || 'chat',
            modelName: selectedModel,
          }, modelStep.startMs)));
          controller.enqueue(encoder.encode(createTraceEvent('selecting_model', 'end', requestStartTime, {
            modelPreference: modelPreference || 'chat',
            modelName: selectedModel,
          }, modelStep.endMs)));
        }
        
        const thinkingStartMs = modelStep?.endMs || preparingStep?.endMs || 10;
        controller.enqueue(encoder.encode(createTraceEvent('thinking', 'start', requestStartTime, undefined, thinkingStartMs)));
        
        // File analysis traces
        if (hasAnalysis) {
          const analysisStartMs = thinkingStartMs + 5;
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'end', requestStartTime, undefined, analysisStartMs)));
          const analysisStep = analysisType === 'vision' ? 'image_analysis' : 'parsing_files';
          controller.enqueue(encoder.encode(createTraceEvent(analysisStep, 'start', requestStartTime, { filesCount: 1 }, analysisStartMs)));
          controller.enqueue(encoder.encode(createTraceEvent(analysisStep, 'end', requestStartTime, { filesCount: 1 }, analysisStartMs + 50)));
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'start', requestStartTime, undefined, analysisStartMs + 55)));
        }
        
        if (textFilesWithContent.length > 0 && !hasAnalysis) {
          const parseStartMs = thinkingStartMs + 5;
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'end', requestStartTime, undefined, parseStartMs)));
          controller.enqueue(encoder.encode(createTraceEvent('parsing_files', 'start', requestStartTime, { filesCount: textFilesWithContent.length }, parseStartMs)));
          controller.enqueue(encoder.encode(createTraceEvent('parsing_files', 'end', requestStartTime, { filesCount: textFilesWithContent.length, extractedChars: totalExtractedChars }, parseStartMs + 30)));
          controller.enqueue(encoder.encode(createTraceEvent('thinking', 'start', requestStartTime, undefined, parseStartMs + 35)));
        }
        
        // Send metadata
        const metadata = {
          type: "metadata",
          search_used: false,
          search_urls: [] as string[],
          usage: { ...usageResult, plan: effectivePlan, isDevBypass, isPremium },
          tool_calling_enabled: routerDecision.useToolCalling,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));
        
        // Collect streaming data for tool call detection
        let fullContent = "";
        let toolCalls: any[] = [];
        let currentToolCall: { id: string; function: { name: string; arguments: string } } | null = null;
        let isCollectingToolCall = false;
        let firstContentSent = false;
        
        const writingStartMs = Date.now() - requestStartTime;
        controller.enqueue(encoder.encode(createTraceEvent('thinking', 'end', requestStartTime, undefined, writingStartMs)));
        controller.enqueue(encoder.encode(createTraceEvent('writing', 'start', requestStartTime, undefined, writingStartMs)));
        
        try {
          let buffer = "";
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete SSE messages
            const lines = buffer.split('\n');
            buffer = lines.pop() || ""; // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(jsonStr);
                const delta = parsed.choices?.[0]?.delta;
                
                if (delta) {
                  // Check for tool calls
                  if (delta.tool_calls) {
                    isCollectingToolCall = true;
                    for (const tc of delta.tool_calls) {
                      if (tc.id) {
                        // New tool call
                        if (currentToolCall) {
                          toolCalls.push(currentToolCall);
                        }
                        currentToolCall = {
                          id: tc.id,
                          function: {
                            name: tc.function?.name || "",
                            arguments: tc.function?.arguments || "",
                          },
                        };
                      } else if (currentToolCall && tc.function?.arguments) {
                        // Append to current tool call arguments
                        currentToolCall.function.arguments += tc.function.arguments;
                      }
                      if (tc.function?.name && currentToolCall) {
                        currentToolCall.function.name = tc.function.name;
                      }
                    }
                  }
                  
                  // Regular content
                  if (delta.content) {
                    fullContent += delta.content;
                    
                    if (!isCollectingToolCall) {
                      // Stream content to client
                      const sanitizedContent = sanitizeOutput(delta.content);
                      const contentEvent = {
                        choices: [{ delta: { content: sanitizedContent } }]
                      };
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(contentEvent)}\n\n`));
                      
                      if (!firstContentSent) {
                        firstContentSent = true;
                        console.log(`[Stream] First content at ${Date.now() - requestStartTime}ms`);
                      }
                    }
                  }
                }
              } catch (parseErr) {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
          
          // Finalize last tool call
          if (currentToolCall) {
            toolCalls.push(currentToolCall);
          }
          
          // ===========================================
          // HANDLE TOOL CALLS
          // ===========================================
          if (toolCalls.length > 0) {
            console.log('[Tool Calls Detected]', toolCalls.map(tc => tc.function.name));
            
            for (const tc of toolCalls) {
              const toolName = tc.function.name;
              let toolArgs: any = {};
              
              try {
                toolArgs = JSON.parse(tc.function.arguments);
              } catch (e) {
                console.error('[Tool] Failed to parse arguments:', tc.function.arguments);
                continue;
              }
              
              if (toolName === 'generate_image') {
                toolUsed = 'image';
                
                // Emit image generation trace
                const imgStartMs = Date.now() - requestStartTime;
                controller.enqueue(encoder.encode(createTraceEvent('writing', 'end', requestStartTime, undefined, imgStartMs)));
                controller.enqueue(encoder.encode(createTraceEvent('generating_image', 'start', requestStartTime, { toolName: 'generate_image' }, imgStartMs)));
                
                const imageResult = await executeImageGeneration(
                  supabaseUrl, 
                  token, 
                  toolArgs.prompt,
                  toolArgs.style
                );
                
                const imgEndMs = Date.now() - requestStartTime;
                controller.enqueue(encoder.encode(createTraceEvent('generating_image', 'end', requestStartTime, { 
                  imageDurationMs: imgEndMs - imgStartMs,
                }, imgEndMs)));
                
                if (imageResult.success) {
                  // Send image result as special event
                  const imageEvent = {
                    type: "tool_result",
                    tool: "generate_image",
                    success: true,
                    data: {
                      type: "image_generated",
                      fileUrl: imageResult.data.image_url || imageResult.data.fileUrl,
                      fileName: imageResult.data.file_name || imageResult.data.fileName,
                      filePath: imageResult.data.file_path,
                      generationId: imageResult.data.generationId,
                      prompt_en: imageResult.data.prompt_used || toolArgs.prompt,
                      model: imageResult.data.model,
                      width: imageResult.data.width,
                      height: imageResult.data.height,
                    }
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(imageEvent)}\n\n`));
                } else {
                  // Send error
                  const lang = ui_language || 'uz';
                  const errorMessages: Record<string, string> = {
                    uz: "Rasm yaratishda xatolik yuz berdi.",
                    en: "Failed to generate image.",
                    ru: "Ошибка при создании изображения.",
                    tr: "Görsel oluşturulamadı.",
                  };
                  
                  const errorEvent = {
                    type: "tool_result",
                    tool: "generate_image",
                    success: false,
                    error: imageResult.error,
                    message: errorMessages[lang] || errorMessages.uz,
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
                }
              }
              
              if (toolName === 'web_search') {
                toolUsed = 'search';
                
                // Emit search trace
                const searchStartMs = Date.now() - requestStartTime;
                controller.enqueue(encoder.encode(createTraceEvent('writing', 'end', requestStartTime, undefined, searchStartMs)));
                controller.enqueue(encoder.encode(createTraceEvent('web_search', 'start', requestStartTime, undefined, searchStartMs)));
                
                const searchResult = await executeWebSearch(toolArgs.query, ui_language || 'uz');
                
                const searchEndMs = Date.now() - requestStartTime;
                collectedSources = searchResult.sources || [];
                controller.enqueue(encoder.encode(createTraceEvent('web_search', 'end', requestStartTime, { 
                  sourcesCount: collectedSources.length,
                  sources: collectedSources,
                }, searchEndMs)));
                
                if (searchResult.success && searchResult.results) {
                  // Make a follow-up call with search results
                  controller.enqueue(encoder.encode(createTraceEvent('writing', 'start', requestStartTime, undefined, searchEndMs + 5)));
                  
                  const followUpMessages = [
                    ...finalMessages,
                    { role: "assistant", content: null, tool_calls: [tc] },
                    { 
                      role: "tool", 
                      tool_call_id: tc.id, 
                      content: `Web Search Results:\n\n${searchResult.results}\n\nUse these results to answer the user's question. Include citation markers [1], [2], etc.`
                    }
                  ];
                  
                  // Call DeepSeek again with search results
                  const followUpResponse = await fetch("https://api.deepseek.com/chat/completions", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${deepseekApiKey}`,
                    },
                    body: JSON.stringify({
                      model: selectedModel,
                      messages: followUpMessages,
                      temperature: 0.6,
                      max_tokens: 2000,
                      stream: true,
                    }),
                  });
                  
                  if (followUpResponse.ok) {
                    const followUpReader = followUpResponse.body!.getReader();
                    let followUpBuffer = "";
                    
                    while (true) {
                      const { done: fuDone, value: fuValue } = await followUpReader.read();
                      if (fuDone) break;
                      
                      followUpBuffer += decoder.decode(fuValue, { stream: true });
                      const fuLines = followUpBuffer.split('\n');
                      followUpBuffer = fuLines.pop() || "";
                      
                      for (const fuLine of fuLines) {
                        if (!fuLine.startsWith('data: ')) continue;
                        const fuJsonStr = fuLine.slice(6).trim();
                        if (fuJsonStr === '[DONE]') continue;
                        
                        try {
                          const fuParsed = JSON.parse(fuJsonStr);
                          const fuDelta = fuParsed.choices?.[0]?.delta;
                          if (fuDelta?.content) {
                            const sanitizedContent = sanitizeOutput(fuDelta.content);
                            const contentEvent = { choices: [{ delta: { content: sanitizedContent } }] };
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify(contentEvent)}\n\n`));
                          }
                        } catch { /* ignore */ }
                      }
                    }
                  }
                } else {
                  // Send search error/busy message as content
                  const busyMsg = searchResult.results || "Web search is temporarily unavailable.";
                  const contentEvent = { choices: [{ delta: { content: busyMsg } }] };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(contentEvent)}\n\n`));
                }
              }
            }
          }
          
          // End writing
          const writingEndMs = Date.now() - requestStartTime;
          controller.enqueue(encoder.encode(createTraceEvent('writing', 'end', requestStartTime, undefined, writingEndMs)));
          console.log(`[Timing] Writing: ${writingEndMs - writingStartMs}ms`);
          
          // Emit saving/delivering
          const savingStartMs = Date.now() - requestStartTime;
          controller.enqueue(encoder.encode(createTraceEvent('saving', 'start', requestStartTime, undefined, savingStartMs)));
          controller.enqueue(encoder.encode(createTraceEvent('saving', 'end', requestStartTime, { cloudSaved: true }, savingStartMs + 10)));
          
          const deliveringStartMs = Date.now() - requestStartTime;
          controller.enqueue(encoder.encode(createTraceEvent('delivering', 'start', requestStartTime, undefined, deliveringStartMs)));
          controller.enqueue(encoder.encode(createTraceEvent('delivering', 'end', requestStartTime, undefined, deliveringStartMs + 5)));
          
          // Trace complete
          controller.enqueue(encoder.encode(createTraceComplete(requestStartTime, collectedSources, {
            modelPreference: modelPreference || 'chat',
            modelName: selectedModel,
            filesCount: textFilesWithContent.length || 0,
            extractedChars: totalExtractedChars || 0,
            sourcesCount: collectedSources.length,
            toolUsed: toolUsed || undefined,
          })));
          
          controller.close();
          
          // Log timing
          const chatDurationMs = Date.now() - requestStartTime;
          console.log(`[Timing] Total: ${chatDurationMs}ms | Tool: ${toolUsed || 'none'}`);
          
          // Log decision and event
          logRouterDecision(supabaseAdmin, user.id, lastUserMsg, routerDecision, ui_language, toolUsed || 'text');
          logChatEvent(supabaseAdmin, user.id, {
            model: selectedModel,
            duration_ms: chatDurationMs,
            mode: mode || 'general',
            search_used: toolUsed === 'search',
            files_count: textFilesWithContent.length || 0,
            tool_used: toolUsed || undefined,
          }).catch(() => {});
          
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
