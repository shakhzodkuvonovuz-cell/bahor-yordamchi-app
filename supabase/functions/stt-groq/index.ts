import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[stt:${requestId}] Request received`);

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error(`[stt:${requestId}] LOVABLE_API_KEY not configured`);
      return new Response(
        JSON.stringify({ error: "STT service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get("file") as File | null;
    const uiLanguage = formData.get("ui_language") as string || "uz";
    const durationSeconds = parseInt(formData.get("duration_seconds") as string || "0", 10);

    if (!audioFile) {
      console.error(`[stt:${requestId}] No audio file provided`);
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      console.error(`[stt:${requestId}] File too large: ${audioFile.size} bytes`);
      return new Response(
        JSON.stringify({ 
          error: "audio_too_large",
          message: uiLanguage === "uz" 
            ? "Audio fayl juda katta (max 10MB)"
            : "Audio file too large (max 10MB)"
        }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Minimum duration check
    if (durationSeconds < 1) {
      console.error(`[stt:${requestId}] Duration too short: ${durationSeconds}s`);
      return new Response(
        JSON.stringify({ 
          error: "audio_too_short",
          message: uiLanguage === "uz" 
            ? "Audio juda qisqa. Kamida 1 soniya gapiring."
            : "Audio too short. Speak for at least 1 second."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Minimum file size check
    if (audioFile.size < 1000) {
      console.error(`[stt:${requestId}] File too small: ${audioFile.size} bytes`);
      return new Response(
        JSON.stringify({ 
          error: "audio_too_small",
          message: uiLanguage === "uz" 
            ? "Audio yozilmadi. Qayta urinib ko'ring."
            : "No audio recorded. Please try again."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[stt:${requestId}] Processing audio: ${audioFile.size} bytes, type: ${audioFile.type}, duration: ${durationSeconds}s`);

    // Convert audio to base64 for Gemini
    const audioBytes = await audioFile.arrayBuffer();
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBytes)));
    
    // Determine MIME type for Gemini
    let mimeType = audioFile.type || "audio/mp4";
    if (mimeType.includes("webm")) mimeType = "audio/webm";
    else if (mimeType.includes("mp4") || mimeType.includes("m4a")) mimeType = "audio/mp4";
    else if (mimeType.includes("mpeg") || mimeType.includes("mp3")) mimeType = "audio/mpeg";
    else if (mimeType.includes("wav")) mimeType = "audio/wav";
    
    console.log(`[stt:${requestId}] Using Gemini for transcription, mimeType: ${mimeType}`);

    // Use Gemini via Lovable AI Gateway for transcription
    const startTime = Date.now();
    const geminiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "input_audio",
                input_audio: {
                  data: base64Audio,
                  format: mimeType.split("/")[1] || "mp4"
                }
              },
              {
                type: "text",
                text: `Transcribe this audio exactly as spoken. Output ONLY the transcription text, nothing else.

Rules:
- If the speaker uses Uzbek, write in Uzbek Latin script (using o', g', sh, ch)
- If the speaker uses Russian, write in Cyrillic
- If the speaker uses English, write in English
- Preserve proper nouns, names, and places exactly as pronounced
- Do NOT translate - transcribe verbatim
- Do NOT add any commentary, just the spoken words`
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0
      }),
    });

    const latencyMs = Date.now() - startTime;
    console.log(`[stt:${requestId}] Gemini responded in ${latencyMs}ms, status: ${geminiResponse.status}`);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`[stt:${requestId}] Gemini error: ${geminiResponse.status} - ${errorText}`);
      
      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "rate_limit",
            message: uiLanguage === "uz" 
              ? "Juda ko'p so'rov. Biroz kuting."
              : "Too many requests. Please wait."
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: "transcription_failed",
          message: uiLanguage === "uz" 
            ? "Transkriptsiyada xatolik. Qayta urinib ko'ring."
            : "Transcription failed. Please try again."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await geminiResponse.json();
    const transcription = result.choices?.[0]?.message?.content?.trim() || "";
    
    console.log(`[stt:${requestId}] Transcription successful, text length: ${transcription.length}`);

    // Check if transcription is empty
    if (!transcription || transcription.length === 0) {
      console.warn(`[stt:${requestId}] Empty transcription - no speech detected`);
      return new Response(
        JSON.stringify({ 
          error: "no_speech",
          message: uiLanguage === "uz" 
            ? "Ovoz aniqlanmadi. Balandroq gapiring."
            : "No speech detected. Please speak louder."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        text: transcription,
        language: "auto",
        model: "gemini-2.5-flash",
        duration_seconds_estimate: durationSeconds,
        latency_ms: latencyMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[stt:${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ 
        error: "internal_error",
        message: "An unexpected error occurred"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
