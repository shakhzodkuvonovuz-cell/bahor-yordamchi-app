// BahorAI Clean Stable Edge Function
// Safe Google Search integration with strict triggers.
// Fully working DeepSeek streaming with SSE format.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { googleSearch } from "./google.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

const BASE_PROMPT = `
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

    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      console.error('Missing DEEPSEEK_API_KEY');
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
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

    console.log(`Chat request: mode=${modeKey}, messages=${recentMessages.length}, search=${!!searchResults}`);

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
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a custom stream that sends metadata first, then DeepSeek response
    const encoder = new TextEncoder();
    const reader = response.body!.getReader();
    
    const stream = new ReadableStream({
      async start(controller) {
        // Send metadata first (search status)
        const metadata = {
          type: "metadata",
          search_used: !!searchResults,
          search_urls: [], // We don't parse individual URLs yet
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));
        
        // Then pipe through DeepSeek response
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
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
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
