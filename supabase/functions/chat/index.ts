// BahorAI Edge Function with Daily Limit Enforcement
// Uses increment_daily_usage RPC for atomic usage tracking
// Includes brand identity protection and output sanitization

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { googleSearch } from "./google.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Forbidden vendor/model names (case-insensitive)
const FORBIDDEN_TERMS = [
  "deepseek", "openai", "chatgpt", "gpt-4", "gpt-5", "gpt4", "gpt5",
  "gemini", "claude", "anthropic", "mistral", "llama", "meta ai",
  "azure openai", "bard", "palm", "vicuna", "falcon"
];

// Patterns that reveal identity (case-insensitive)
const IDENTITY_LEAK_PATTERNS = [
  /aslida\s+(deepseek|openai|chatgpt|gemini|claude|anthropic)/gi,
  /men\s+(deepseek|openai|chatgpt|gemini|claude)/gi,
  /i('m| am)\s+(actually\s+)?(deepseek|openai|chatgpt|gemini|claude)/gi,
  /based on\s+(deepseek|openai|chatgpt|gemini|claude)/gi,
  /powered by\s+(deepseek|openai|chatgpt|gemini|claude)/gi,
  /я\s+(deepseek|chatgpt|gemini|claude)/gi,
  /tomonidan\s+yaratilgan/gi,
];

// Sanitize output to remove vendor names
function sanitizeOutput(text: string): string {
  let result = text;
  
  // Remove identity leak patterns first
  for (const pattern of IDENTITY_LEAK_PATTERNS) {
    result = result.replace(pattern, "Bahor AI");
  }
  
  // Replace forbidden terms (case-insensitive)
  for (const term of FORBIDDEN_TERMS) {
    const regex = new RegExp(term, "gi");
    result = result.replace(regex, "Bahor AI");
  }
  
  return result;
}

// Check if user is asking about AI identity
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

// Strict search trigger check - only specific keywords
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

// Simple mode prompts
const MODE_PROMPTS: Record<string, string> = {
  general: "You are Bahor AI, a helpful Uzbek AI assistant. Be friendly and conversational.",
  coding: "You are Bahor AI, a senior software engineer. Help with code, debugging, and technical questions.",
  ielts: "You are Bahor AI, an IELTS trainer. Help with English learning and exam preparation.",
  english: "You are Bahor AI, an English language tutor. Help users improve their English.",
  homework: "You are Bahor AI, an academic tutor. Help students understand concepts, not just copy answers.",
  daily: "You are Bahor AI, a life assistant. Help with everyday questions and advice.",
  business: "You are Bahor AI, a business consultant. Help with marketing, strategy, and business questions.",
  job: "You are Bahor AI, a career coach. Help with resumes, interviews, and job searching.",
  financial: "You are Bahor AI, a financial literacy educator. Explain money concepts simply.",
  finance: "You are Bahor AI, a financial literacy educator. Explain money concepts simply.",
  health: "You are Bahor AI, a wellness advisor. Give general health tips but always recommend seeing a doctor for medical issues.",
};

// Brand identity guard - added to every request
const IDENTITY_GUARD = `
CRITICAL IDENTITY RULES (HIGHEST PRIORITY):
- You are Bahor AI, the first Uzbek AI assistant.
- NEVER mention DeepSeek, OpenAI, ChatGPT, GPT-4, GPT-5, Gemini, Claude, Anthropic, Mistral, LLaMA, or any other AI provider/model names.
- If asked "Are you DeepSeek/ChatGPT/etc?", respond: "Men Bahor AI — o'zbeklar uchun maxsus yaratilgan sun'iy intellekt yordamchiman."
- NEVER say "I'm actually X" or "I'm based on X model" or confirm any model name.
- Always identify as Bahor AI only.
`;

const BASE_PROMPT = `
${IDENTITY_GUARD}

You are Bahor AI — an intelligent assistant made for Uzbek people.

LANGUAGE RULES:
- Respond in the same language the user writes in
- If user writes in Uzbek, respond in Uzbek
- If user writes in English, respond in English
- If user writes in Russian, respond in Russian
- Never mix languages unless asked

BEHAVIOR:
- Be helpful, clear, and concise
- Use simple language
- If unsure, say so honestly
- Never invent facts
`;

serve(async (req) => {
  // Handle CORS preflight
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

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "AUTH_REQUIRED", message: "Iltimos, tizimga kiring" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract the JWT token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');

    // Initialize Supabase admin client for server-side operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Validate the JWT token and get user
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError) {
      console.error('Auth error:', userError.message);
      return new Response(
        JSON.stringify({ error: "AUTH_REQUIRED", message: "Sessiya tugagan. Qaytadan kiring." }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: "AUTH_REQUIRED", message: "Iltimos, tizimga kiring." }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`User authenticated: ${user.id}`);

    // Check and increment daily usage (atomic operation)
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

    // Check if user is allowed to send message
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
      console.error('Missing DEEPSEEK_API_KEY');
      return new Response(
        JSON.stringify({ error: "SERVER_ERROR", message: "Server konfiguratsiya xatosi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get mode-specific prompt
    const modeKey = mode || "general";
    const modePrompt = MODE_PROMPTS[modeKey] || MODE_PROMPTS.general;

    // Limit to last 12 messages
    const recentMessages = messages.slice(-12);

    // Get the last user message for search check
    const lastUserMessage = recentMessages
      .filter((m: any) => m.role === "user")
      .pop()?.content || "";

    // Safe search with strict triggers
    let searchResults = "";
    if (shouldUseSearch(lastUserMessage)) {
      console.log("🔍 Search triggered:", lastUserMessage.substring(0, 50));
      try {
        searchResults = await googleSearch(lastUserMessage);
        if (searchResults) {
          console.log("✅ Search OK");
        } else {
          console.log("ℹ️ No search results");
        }
      } catch (err) {
        console.log("⚠️ Search failed, continuing without:", err);
        searchResults = "";
      }
    } else {
      console.log("⏭️ Search skipped");
    }

    // Build system prompt with optional search results
    const systemPrompt = `${BASE_PROMPT}

${modePrompt}

${searchResults ? `
QIDIRUV NATIJALARI:
${searchResults}

Agar yuqorida qidiruv natijalari bo'lsa, ularga suyanib javob ber va manbalarni ko'rsat.
` : ""}`;

    // Build messages with system prompt
    const finalMessages = [
      { role: "system", content: systemPrompt },
      ...recentMessages,
    ];

    console.log(`Chat request: user=${user.id}, mode=${modeKey}, messages=${recentMessages.length}, usage=${usageResult.used}/${usageResult.limit}`);

    // Call DeepSeek API with streaming
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

    // Create a custom stream that sends metadata first, then sanitized DeepSeek response
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = response.body!.getReader();
    
    const stream = new ReadableStream({
      async start(controller) {
        // Send metadata first (search status + usage info)
        const metadata = {
          type: "metadata",
          search_used: !!searchResults,
          search_urls: [],
          usage: usageResult,
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));
        
        // Then pipe through DeepSeek response with sanitization
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Decode, sanitize, and re-encode the chunk
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
