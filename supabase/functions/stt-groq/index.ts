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
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    
    if (!GROQ_API_KEY) {
      console.error(`[stt:${requestId}] GROQ_API_KEY not configured`);
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
      return new Response(
        JSON.stringify({ 
          error: "audio_too_large",
          message: uiLanguage === "uz" ? "Audio fayl juda katta (max 10MB)" : "Audio file too large (max 10MB)"
        }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Minimum duration check
    if (durationSeconds < 1) {
      return new Response(
        JSON.stringify({ 
          error: "audio_too_short",
          message: uiLanguage === "uz" ? "Audio juda qisqa. Kamida 1 soniya gapiring." : "Audio too short. Speak for at least 1 second."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Minimum file size check
    if (audioFile.size < 1000) {
      return new Response(
        JSON.stringify({ 
          error: "audio_too_small",
          message: uiLanguage === "uz" ? "Audio yozilmadi. Qayta urinib ko'ring." : "No audio recorded. Please try again."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[stt:${requestId}] Processing audio: ${audioFile.size} bytes, type: ${audioFile.type}, duration: ${durationSeconds}s`);

    // Get audio bytes
    const audioBytes = await audioFile.arrayBuffer();
    
    // Use original file with its name - Groq handles m4a/mp4 well
    const fileName = audioFile.name || "recording.m4a";
    const audioBlob = new Blob([audioBytes], { type: audioFile.type });
    
    console.log(`[stt:${requestId}] Using Groq Whisper, filename: ${fileName}`);
    
    const groqFormData = new FormData();
    groqFormData.append("file", audioBlob, fileName);
    groqFormData.append("model", "whisper-large-v3-turbo");
    // NO language parameter - let Whisper auto-detect
    groqFormData.append("temperature", "0");
    groqFormData.append("response_format", "verbose_json");

    const startTime = Date.now();
    const groqResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: groqFormData,
    });

    const latencyMs = Date.now() - startTime;
    console.log(`[stt:${requestId}] Groq responded in ${latencyMs}ms, status: ${groqResponse.status}`);

    if (groqResponse.ok) {
      const result = await groqResponse.json();
      const text = result.text?.trim() || "";
      const detectedLang = result.language || "unknown";
      
      console.log(`[stt:${requestId}] Success: "${text.substring(0, 50)}...", lang: ${detectedLang}, len: ${text.length}`);

      // Check if empty
      if (!text) {
        return new Response(
          JSON.stringify({ 
            error: "no_speech",
            message: uiLanguage === "uz" ? "Ovoz aniqlanmadi. Balandroq gapiring." : "No speech detected. Please speak louder."
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          text: text,
          language: detectedLang,
          model: "whisper-large-v3-turbo",
          duration_seconds_estimate: result.duration || durationSeconds,
          latency_ms: latencyMs,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errorText = await groqResponse.text();
    console.error(`[stt:${requestId}] Groq error: ${groqResponse.status} - ${errorText}`);

    // Handle rate limit
    if (groqResponse.status === 429) {
      return new Response(
        JSON.stringify({ 
          error: "rate_limit",
          message: uiLanguage === "uz" ? "Juda ko'p so'rov. Biroz kuting." : "Too many requests. Please wait."
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle "audio too short" error from Groq (WebM duration parsing issue)
    if (errorText.includes("too short")) {
      return new Response(
        JSON.stringify({ 
          error: "audio_format_error",
          message: uiLanguage === "uz" ? "Audio formatida xato. Qayta yozing." : "Audio format error. Please record again."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generic error
    return new Response(
      JSON.stringify({ 
        error: "transcription_failed",
        message: uiLanguage === "uz" ? "Transkriptsiyada xatolik. Qayta urinib ko'ring." : "Transcription failed. Please try again."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[stt:${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ error: "internal_error", message: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
