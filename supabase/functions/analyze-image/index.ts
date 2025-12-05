import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODE_ANALYSIS_CONTEXT: Record<string, string> = {
  coding: `You are analyzing a code-related image. This could be:
- Screenshot of code/IDE
- Error message or stack trace
- Terminal/console output
- System architecture diagram
- UI mockup or design

Analyze the code, identify issues, explain errors, or describe what you see. Be helpful and technical.`,

  homework: `You are analyzing an educational image. This could be:
- Math problem or equation
- Science diagram or chart
- Textbook page or exercise
- Handwritten notes
- Test or quiz question

Explain the concept, solve the problem step by step, or describe what you see to help the student learn.`,

  math_science: `You are analyzing a math or science image. This could be:
- Mathematical equation or formula
- Geometry diagram
- Physics problem
- Chemistry structure
- Graph or chart

Provide a detailed explanation, solve the problem step-by-step if applicable, and explain the underlying concepts.`,

  ielts: `You are analyzing an English/IELTS-related image. This could be:
- English text to review
- Writing sample to correct
- Reading passage
- Grammar exercise

Analyze the English text, correct any mistakes, provide feedback and suggestions for improvement.`,

  english: `You are analyzing an English learning image. Check for grammar, spelling, and provide helpful corrections and explanations.`,

  business: `You are analyzing a business-related image. This could be:
- Business chart or graph
- Marketing material
- Presentation slide
- Financial data

Provide business insights and analysis.`,

  finance: `You are analyzing a finance-related image. This could be:
- Budget spreadsheet
- Financial statement
- Receipt or invoice
- Investment chart

Explain what you see and provide financial guidance (without specific investment advice).`,

  health: `You are analyzing a health/fitness-related image. This could be:
- Exercise form or technique
- Nutrition label
- Workout plan
- Meal photo

Provide helpful wellness guidance without medical diagnosis.`,

  daily_life: `You are analyzing an everyday life image. Describe what you see and provide helpful, practical advice related to the image content.`,

  general: `You are analyzing an image. Describe what you see in detail, identify key elements, text, objects, scenes, or any relevant information. Be thorough but concise.`,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // === AUTHENTICATION CHECK ===
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError?.message || 'No user found');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user: ${user.id}`);
    // === END AUTHENTICATION CHECK ===

    const { imageUrl, imageBase64, mode, language, userPrompt } = await req.json();

    if (!imageUrl && !imageBase64) {
      return new Response(
        JSON.stringify({ error: "Image URL or base64 data is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: "Vision service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get mode-specific analysis context
    const modeKey = mode || "general";
    const analysisContext = MODE_ANALYSIS_CONTEXT[modeKey] || MODE_ANALYSIS_CONTEXT.general;

    // Language instructions
    const languageInstructions = {
      uz: "Respond in Uzbek language (O'zbek tilida javob bering).",
      en: "Respond in English.",
      ru: "Respond in Russian (Отвечайте на русском языке).",
      tr: "Respond in Turkish (Türkçe yanıtlayın).",
    };
    const langInstruction = languageInstructions[language as keyof typeof languageInstructions] || languageInstructions.uz;

    // Build the image content
    const imageContent = imageBase64 
      ? { type: "image_url", image_url: { url: imageBase64 } }
      : { type: "image_url", image_url: { url: imageUrl } };

    // Build user message with optional prompt
    let userMessage = "Analyze this image and describe what you see in detail.";
    if (userPrompt && userPrompt.trim()) {
      userMessage = userPrompt.trim();
    }

    const messages = [
      {
        role: "system",
        content: `You are Bahor AI — an intelligent visual analysis assistant. ${langInstruction}

${analysisContext}

Guidelines:
- Provide detailed, accurate analysis
- If you see text in the image, transcribe it
- If you see code, explain it
- If you see a problem, help solve it
- Be helpful and informative
- Never fabricate information you can't see`
      },
      {
        role: "user",
        content: [
          { type: "text", text: userMessage },
          imageContent
        ]
      }
    ];

    console.log(`Analyzing image for user: ${user.id}, mode: ${modeKey}, language: ${language}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Service quota exceeded." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('Vision API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to analyze image" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-image function:', error);
    return new Response(
      JSON.stringify({ error: "Failed to analyze image" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
