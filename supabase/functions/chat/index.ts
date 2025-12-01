// BahorAI Clean Stable Edge Function
// No search, no timeouts, no heavy logs.
// Fully working DeepSeek streaming with SSE format.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const systemPrompt = `${BASE_PROMPT}\n\n${modePrompt}`;

    // Limit to last 12 messages
    const recentMessages = messages.slice(-12);

    // Build messages with system prompt
    const finalMessages = [
      { role: "system", content: systemPrompt },
      ...recentMessages,
    ];

    console.log(`Chat request: mode=${modeKey}, messages=${recentMessages.length}`);

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
        temperature: 0.5,
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

    // Stream the response directly (DeepSeek already returns SSE format)
    return new Response(response.body, {
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
