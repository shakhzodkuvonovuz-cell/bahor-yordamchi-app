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
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    
    if (!GROQ_API_KEY) {
      console.error(`[stt-groq:${requestId}] GROQ_API_KEY not configured`);
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

    // Minimum duration check - require at least 1 second of speech
    if (durationSeconds < 1) {
      console.error(`[stt-groq:${requestId}] Duration too short: ${durationSeconds}s`);
      return new Response(
        JSON.stringify({ 
          error: "audio_too_short",
          message: uiLanguage === "uz" 
            ? "Audio juda qisqa. Kamida 1 soniya gapiring."
            : uiLanguage === "ru"
            ? "Аудио слишком короткое. Говорите минимум 1 секунду."
            : uiLanguage === "tr"
            ? "Ses çok kısa. En az 1 saniye konuşun."
            : "Audio too short. Speak for at least 1 second."
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Get audio bytes
    const audioBytes = await audioFile.arrayBuffer();
    
    // Groq has issues with WebM duration metadata, try with different file extension
    // Using .ogg extension sometimes works better with Groq for WebM/Opus files
    const fileName = audioFile.type.includes("webm") ? "audio.ogg" : (audioFile.name || "audio.webm");
    
    // Create a new blob with audio/ogg type for better Groq compatibility
    const audioBlob = new Blob([audioBytes], { 
      type: audioFile.type.includes("webm") ? "audio/ogg" : audioFile.type 
    });
    
    console.log(`[stt-groq:${requestId}] Using Groq Whisper with filename: ${fileName}`);
    
    const groqFormData = new FormData();
    groqFormData.append("file", audioBlob, fileName);
    groqFormData.append("model", "whisper-large-v3-turbo");
    groqFormData.append("language", "uz");
    groqFormData.append("temperature", "0");
    groqFormData.append("response_format", "verbose_json");
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
          language: result.language || "uz",
          model: "whisper-large-v3-turbo",
          duration_seconds_estimate: result.duration || durationSeconds,
          latency_ms: latencyMs,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errorText = await groqResponse.text();
    console.error(`[stt-groq:${requestId}] Groq API error: ${groqResponse.status} - ${errorText}`);

    // Handle rate limit
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

    // Handle "audio too short" - this is a Groq WebM parsing bug
    // Retry with mp3 filename as workaround
    if (errorText.includes("too short")) {
      console.log(`[stt-groq:${requestId}] Retrying with .mp3 filename workaround`);
      
      const retryFormData = new FormData();
      const retryBlob = new Blob([audioBytes], { type: "audio/mpeg" });
      retryFormData.append("file", retryBlob, "audio.mp3");
      retryFormData.append("model", "whisper-large-v3-turbo");
      retryFormData.append("language", "uz");
      retryFormData.append("temperature", "0");
      retryFormData.append("response_format", "verbose_json");
      retryFormData.append("prompt", UZBEK_STEERING_PROMPT);

      const retryResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: retryFormData,
      });

      if (retryResponse.ok) {
        const result = await retryResponse.json();
        console.log(`[stt-groq:${requestId}] Retry successful, text length: ${result.text?.length || 0}`);

        return new Response(
          JSON.stringify({
            text: result.text || "",
            language: result.language || "uz",
            model: "whisper-large-v3-turbo",
            duration_seconds_estimate: result.duration || durationSeconds,
            latency_ms: Date.now() - startTime,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const retryError = await retryResponse.text();
      console.error(`[stt-groq:${requestId}] Retry also failed: ${retryError}`);
      
      // If retry still fails with "too short", it's a real issue
      if (retryError.includes("too short")) {
        return new Response(
          JSON.stringify({ 
            error: "audio_format_error",
            message: uiLanguage === "uz" 
              ? "Audio formatida xato. Qayta yozing."
              : "Audio format error. Please record again."
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generic error
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
