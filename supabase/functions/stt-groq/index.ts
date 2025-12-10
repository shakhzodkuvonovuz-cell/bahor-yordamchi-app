import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Uzbek steering prompt to prevent Turkish drift
const UZBEK_STEERING_PROMPT = 
  "Transcribe strictly in Uzbek (O'zbek tili). Do not translate. Prefer Uzbek words over Turkish. Keep brand names and person names unchanged. Output Uzbek in Latin script unless Cyrillic is clearly spoken.";

// Allowed audio MIME types - expanded for iOS Safari compatibility
const ALLOWED_MIME_TYPES = new Set([
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/x-m4a",
  "audio/m4a",
  "audio/aac",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/ogg;codecs=opus",
  // iOS Safari sometimes reports these
  "audio/x-caf",
  "audio/caf",
]);

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
    // Get API key
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

    // Validate MIME type (be lenient - browser codecs vary)
    const mimeBase = audioFile.type.split(";")[0];
    const isAllowed = ALLOWED_MIME_TYPES.has(audioFile.type) || 
                      ALLOWED_MIME_TYPES.has(mimeBase) ||
                      mimeBase.startsWith("audio/");
    
    if (!isAllowed) {
      console.error(`[stt-groq:${requestId}] Invalid MIME type: ${audioFile.type}`);
      return new Response(
        JSON.stringify({ 
          error: "invalid_audio_format",
          message: uiLanguage === "uz" 
            ? "Audio formati qo'llab-quvvatlanmaydi"
            : uiLanguage === "ru"
            ? "Формат аудио не поддерживается"
            : uiLanguage === "tr"
            ? "Ses formatı desteklenmiyor"
            : "Audio format not supported"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[stt-groq:${requestId}] Processing audio: ${audioFile.size} bytes, type: ${audioFile.type}, duration: ${durationSeconds}s`);

    // Prepare form data for Groq API
    const groqFormData = new FormData();
    groqFormData.append("file", audioFile, audioFile.name || "audio.webm");
    groqFormData.append("model", "whisper-large-v3-turbo");
    groqFormData.append("language", "uz");
    groqFormData.append("temperature", "0");
    groqFormData.append("response_format", "json");
    groqFormData.append("prompt", UZBEK_STEERING_PROMPT);

    // Call Groq API
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

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error(`[stt-groq:${requestId}] Groq API error: ${groqResponse.status} - ${errorText}`);

      // Handle rate limiting
      if (groqResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "rate_limit",
            message: uiLanguage === "uz" 
              ? "Juda ko'p so'rov. Biroz kuting va qayta urinib ko'ring."
              : uiLanguage === "ru"
              ? "Слишком много запросов. Подождите и попробуйте снова."
              : uiLanguage === "tr"
              ? "Çok fazla istek. Biraz bekleyin ve tekrar deneyin."
              : "Too many requests. Please wait and try again."
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Handle server errors
      if (groqResponse.status >= 500) {
        return new Response(
          JSON.stringify({ 
            error: "service_unavailable",
            message: uiLanguage === "uz" 
              ? "STT xizmati vaqtincha mavjud emas. Qayta urinib ko'ring."
              : uiLanguage === "ru"
              ? "Сервис временно недоступен. Попробуйте позже."
              : uiLanguage === "tr"
              ? "Servis geçici olarak kullanılamıyor. Tekrar deneyin."
              : "STT service temporarily unavailable. Please try again."
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generic error
      return new Response(
        JSON.stringify({ 
          error: "transcription_failed",
          message: uiLanguage === "uz" 
            ? "Transkriptsiyada xatolik. Qayta urinib ko'ring."
            : uiLanguage === "ru"
            ? "Ошибка транскрипции. Попробуйте снова."
            : uiLanguage === "tr"
            ? "Transkripsiyon hatası. Tekrar deneyin."
            : "Transcription failed. Please try again."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
