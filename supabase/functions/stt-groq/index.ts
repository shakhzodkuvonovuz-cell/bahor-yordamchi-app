import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Uzbek steering prompt to prevent Turkish drift
const UZBEK_STEERING_PROMPT = 
  "Transcribe strictly in Uzbek (O'zbek tili). Do not translate. Prefer Uzbek words over Turkish. Keep brand names and person names unchanged. Output Uzbek in Latin script unless Cyrillic is clearly spoken.";

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[stt-groq:${requestId}] Request received`);

  try {
    // Try Lovable AI Gateway first (uses OpenAI Whisper), fallback to Groq
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    
    if (!LOVABLE_API_KEY && !GROQ_API_KEY) {
      console.error(`[stt-groq:${requestId}] No API keys configured`);
      return new Response(
        JSON.stringify({ error: "STT service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get("file") as File | null;
    const uiLanguage = formData.get("ui_language") as string | null;
    const durationSeconds = parseInt(formData.get("duration_seconds") as string || "0", 10);

    if (!audioFile) {
      console.error(`[stt-groq:${requestId}] No audio file provided`);
      return new Response(
        JSON.stringify({ error: "No audio file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate file size
    if (audioFile.size > MAX_FILE_SIZE) {
      console.error(`[stt-groq:${requestId}] File too large: ${audioFile.size} bytes`);
      return new Response(
        JSON.stringify({ 
          error: "audio_too_large",
          message: uiLanguage === "uz" 
            ? "Audio fayl juda katta (max 10MB)"
            : uiLanguage === "ru"
            ? "Аудиофайл слишком большой (макс 10МБ)"
            : uiLanguage === "tr"
            ? "Ses dosyası çok büyük (maks 10MB)"
            : "Audio file too large (max 10MB)"
        }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Minimum file size check (likely empty recording)
    if (audioFile.size < 1000) {
      console.error(`[stt-groq:${requestId}] File too small: ${audioFile.size} bytes`);
      return new Response(
        JSON.stringify({ 
          error: "audio_too_small",
          message: uiLanguage === "uz" 
            ? "Audio yozilmadi. Qayta urinib ko'ring."
            : uiLanguage === "ru"
            ? "Аудио не записано. Попробуйте снова."
            : uiLanguage === "tr"
            ? "Ses kaydedilmedi. Tekrar deneyin."
            : "No audio recorded. Please try again."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[stt-groq:${requestId}] Processing audio: ${audioFile.size} bytes, type: ${audioFile.type}, duration: ${durationSeconds}s`);

    // Use OpenAI Whisper via Lovable AI Gateway (better WebM support)
    if (LOVABLE_API_KEY) {
      console.log(`[stt-groq:${requestId}] Using OpenAI Whisper via Lovable Gateway`);
      
      const openaiFormData = new FormData();
      openaiFormData.append("file", audioFile, audioFile.name || "audio.webm");
      openaiFormData.append("model", "whisper-1");
      openaiFormData.append("language", "uz");
      openaiFormData.append("prompt", UZBEK_STEERING_PROMPT);

      const startTime = Date.now();
      const openaiResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: openaiFormData,
      });

      const latencyMs = Date.now() - startTime;
      console.log(`[stt-groq:${requestId}] OpenAI Whisper responded in ${latencyMs}ms, status: ${openaiResponse.status}`);

      if (openaiResponse.ok) {
        const result = await openaiResponse.json();
        console.log(`[stt-groq:${requestId}] Transcription successful, text length: ${result.text?.length || 0}`);

        return new Response(
          JSON.stringify({
            text: result.text || "",
            language: "uz",
            model: "whisper-1",
            duration_seconds_estimate: durationSeconds,
            latency_ms: latencyMs,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log error but continue to Groq fallback
      const errorText = await openaiResponse.text();
      console.warn(`[stt-groq:${requestId}] OpenAI failed (${openaiResponse.status}): ${errorText}`);
      
      // If rate limited or payment required, return error
      if (openaiResponse.status === 429 || openaiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: openaiResponse.status === 429 ? "rate_limit" : "payment_required",
            message: uiLanguage === "uz" 
              ? "Xizmat band. Biroz kuting."
              : "Service busy. Please wait."
          }),
          { status: openaiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fallback to Groq if OpenAI fails or not available
    if (GROQ_API_KEY) {
      console.log(`[stt-groq:${requestId}] Falling back to Groq Whisper`);
      
      const groqFormData = new FormData();
      groqFormData.append("file", audioFile, audioFile.name || "audio.webm");
      groqFormData.append("model", "whisper-large-v3-turbo");
      groqFormData.append("language", "uz");
      groqFormData.append("temperature", "0");
      groqFormData.append("response_format", "json");
      groqFormData.append("prompt", UZBEK_STEERING_PROMPT);

      const startTime = Date.now();
      const groqResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: groqFormData,
      });

      const latencyMs = Date.now() - startTime;
      console.log(`[stt-groq:${requestId}] Groq API responded in ${latencyMs}ms, status: ${groqResponse.status}`);

      if (groqResponse.ok) {
        const result = await groqResponse.json();
        console.log(`[stt-groq:${requestId}] Transcription successful, text length: ${result.text?.length || 0}`);

        return new Response(
          JSON.stringify({
            text: result.text || "",
            language: "uz",
            model: "whisper-large-v3-turbo",
            duration_seconds_estimate: durationSeconds,
            latency_ms: latencyMs,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const errorText = await groqResponse.text();
      console.error(`[stt-groq:${requestId}] Groq API error: ${groqResponse.status} - ${errorText}`);

      // Handle specific errors
      if (groqResponse.status === 429) {
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

      if (errorText.includes("too short")) {
        return new Response(
          JSON.stringify({ 
            error: "audio_too_short",
            message: uiLanguage === "uz" 
              ? "Audio juda qisqa. Kamida 2 soniya gapiring."
              : "Audio too short. Speak for at least 2 seconds."
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // All providers failed
    return new Response(
      JSON.stringify({ 
        error: "transcription_failed",
        message: uiLanguage === "uz" 
          ? "Transkriptsiyada xatolik. Qayta urinib ko'ring."
          : "Transcription failed. Please try again."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[stt-groq:${requestId}] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ 
        error: "internal_error",
        message: "An unexpected error occurred"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
