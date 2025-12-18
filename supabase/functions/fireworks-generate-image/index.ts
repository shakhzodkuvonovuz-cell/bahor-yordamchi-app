import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Use the official FLUX Schnell FP8 workflow endpoint
const FIREWORKS_API_URL = "https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-1-schnell-fp8/text_to_image";
const MAX_PROMPT_LENGTH = 500;

// Content guardrails - block inappropriate content
const BLOCKED_PATTERNS = [
  /\b(nude|naked|sex|porn|explicit|nsfw|erotic|xxx)\b/i,
  /\b(trump|biden|putin|xi jinping|obama|zelensky|merkel)\b/i,
  /\b(celebrity|famous person|real person)\b/i,
  /\b(gore|violence|blood|murder|kill)\b/i,
  /\b(mirziyoyev|karimov|shavkat)\b/i,
];

function isBlockedPrompt(prompt: string): boolean {
  return BLOCKED_PATTERNS.some(p => p.test(prompt));
}

// Translate Uzbek/Russian to English using Lovable AI Gateway
// Minimal translation - no extra styling, just clean English
async function translateToEnglish(prompt: string, requestId: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.log(`[${requestId}] No LOVABLE_API_KEY, skipping translation`);
    return prompt;
  }

  // Simple check if already English-ish (mostly ASCII letters)
  const asciiRatio = (prompt.match(/[a-zA-Z]/g) || []).length / prompt.length;
  if (asciiRatio > 0.7) {
    console.log(`[${requestId}] Prompt appears to be English, skipping translation`);
    return prompt;
  }

  const translatorPrompt = `Translate the following text to English. Keep it simple and direct. Preserve all place names, proper nouns, and specific details exactly. Output ONLY the English translation, nothing else.

Text: ${prompt}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{ role: "user", content: translatorPrompt }],
        max_tokens: 300,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error(`[${requestId}] Translation API error:`, response.status);
      return prompt;
    }

    const data = await response.json();
    const translated = data.choices?.[0]?.message?.content?.trim();
    console.log(`[${requestId}] Translated: "${prompt}" -> "${translated}"`);
    return translated || prompt;
  } catch (error) {
    console.error(`[${requestId}] Translation failed:`, error);
    return prompt;
  }
}

// Style preset to prompt suffix mapping
const STYLE_PRESETS: Record<string, string> = {
  realistic: "ultra realistic photograph, natural lighting, high detail, sharp focus, realistic materials",
  digital_art: "digital art, vibrant colors, detailed, professional digital painting, artstation quality",
  illustration: "highly detailed illustration, clean lines, vector art style, professional illustration",
  anime: "anime style, detailed anime art, studio ghibli inspired, vibrant anime illustration",
  minimal: "minimalist design, clean composition, simple shapes, limited color palette, modern minimal art",
};

// Add soft quality boosters based on style preset
function addQualityBoosters(prompt: string, stylePreset: string): string {
  const styleSuffix = STYLE_PRESETS[stylePreset] || STYLE_PRESETS.realistic;
  return `${prompt}. ${styleSuffix}`;
}

// Log image generation event
async function logImageGenEvent(
  supabase: any,
  userId: string,
  meta: {
    success: boolean;
    duration_ms: number;
    steps: number;
    model: string;
    aspect_ratio?: string;
    error?: string;
  }
): Promise<void> {
  try {
    await supabase.from("usage_events").insert({
      user_id: userId,
      event_type: "image_gen",
      meta,
    });
  } catch (e) {
    console.log("Failed to log image_gen event:", e);
  }
}

// Trace event helper for timing steps
interface TraceStep {
  step: string;
  startMs: number;
  endMs?: number;
  durMs?: number;
  detail?: Record<string, any>;
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const requestStart = Date.now();
  const traceSteps: TraceStep[] = [];
  
  // Helper to record step timing
  const startStep = (step: string): TraceStep => {
    const s: TraceStep = { step, startMs: Date.now() - requestStart };
    traceSteps.push(s);
    return s;
  };
  
  const endStep = (s: TraceStep, detail?: Record<string, any>) => {
    s.endMs = Date.now() - requestStart;
    s.durMs = s.endMs - s.startMs;
    if (detail) s.detail = detail;
  };
  
  console.log(`[${requestId}] fireworks-generate-image start`);
  const prepareStep = startStep('preparing');

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let supabase: any = null;
  let user: any = null;
  
  try {
    // Validate required env vars early
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const fireworksApiKey = Deno.env.get("FIREWORKS_API_KEY");

    if (!supabaseUrl) throw new Error("Missing env: SUPABASE_URL");
    if (!supabaseServiceKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
    if (!fireworksApiKey) throw new Error("Missing env: FIREWORKS_API_KEY");

    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log(`[${requestId}] No auth header`);
      return new Response(
        JSON.stringify({ ok: false, error: "Avtorizatsiya talab qilinadi", requestId }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    user = authUser;

    if (authError || !user) {
      console.log(`[${requestId}] Auth error:`, authError?.message);
      return new Response(
        JSON.stringify({ ok: false, error: "Avtorizatsiya xatosi", requestId }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] User authenticated: ${user.id}`);
    endStep(prepareStep);

    // Parse request body
    const body = await req.json();
    const {
      prompt,
      aspectRatio = "1:1",
      renderMode = "photo",
      qualityBoost = false,
      chatId,
      attachToChat = false,
      stylePreset = "realistic", // New: realistic, digital_art, illustration, anime, minimal
      // A/B test flags
      skipTranslation = false,
      skipBoosters = false,
      rawMode = false, // Send prompt as-is (for baseline testing)
    } = body;

    console.log(`[${requestId}] Input prompt: "${prompt}"`);
    console.log(`[${requestId}] Options: aspectRatio=${aspectRatio}, renderMode=${renderMode}, stylePreset=${stylePreset}, qualityBoost=${qualityBoost}, rawMode=${rawMode}`);

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Prompt kiriting", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean prompt
    let promptOriginal = prompt.trim();
    promptOriginal = promptOriginal.replace(/--ar\s*\d+:\d+/gi, "").trim();
    promptOriginal = promptOriginal.replace(/Style:\s*/gi, "").trim();

    if (promptOriginal.length > MAX_PROMPT_LENGTH) {
      promptOriginal = promptOriginal.slice(0, MAX_PROMPT_LENGTH).trim();
      console.log(`[${requestId}] Prompt truncated to ${MAX_PROMPT_LENGTH} chars`);
    }

    // Check for blocked content
    if (isBlockedPrompt(promptOriginal)) {
      console.log(`[${requestId}] Blocked content detected`);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Bu turdagi rasm yaratib bo'lmaydi. Iltimos, boshqa mavzu tanlang.",
          requestId,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build final prompt based on mode
    let finalPrompt: string;
    let translated = false;
    
    if (rawMode) {
      // A/B Test A: Baseline - send as-is
      finalPrompt = promptOriginal;
      console.log(`[${requestId}] RAW MODE: Using prompt as-is`);
    } else {
      // Step 1: Translate if needed
      let translatedPrompt = promptOriginal;
      if (!skipTranslation) {
        const translateStep = startStep('uploading'); // 'uploading' = preparing/translating prompt
        translatedPrompt = await translateToEnglish(promptOriginal, requestId);
        translated = translatedPrompt !== promptOriginal;
        endStep(translateStep, { translated });
      }
      
      // Step 2: Add quality boosters based on stylePreset if not skipped
      if (!skipBoosters) {
        finalPrompt = addQualityBoosters(translatedPrompt, stylePreset);
      } else {
        finalPrompt = translatedPrompt;
      }
    }

    // Check for blocked content after translation
    if (isBlockedPrompt(finalPrompt)) {
      console.log(`[${requestId}] Blocked content detected in final prompt`);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Bu turdagi rasm yaratib bo'lmaydi. Iltimos, boshqa mavzu tanlang.",
          requestId,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user limits
    const userEmail = user.email?.toLowerCase() || '';
    const devUnlimitedRaw = Deno.env.get('DEV_UNLIMITED_EMAILS') || '';
    const adminEmailsRaw = Deno.env.get('ADMIN_EMAILS') || '';
    const devUnlimitedEmails = devUnlimitedRaw.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
    const adminEmails = adminEmailsRaw.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
    const isDevBypass = devUnlimitedEmails.includes(userEmail) || adminEmails.includes(userEmail);

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();

    const userPlan = profile?.plan || 'free';
    const isPremium = isDevBypass || ["premium", "beta_premium", "dev_unlimited"].includes(userPlan);
    const isFreeUser = !isPremium && !isDevBypass;
    // Free: 1/day with watermark, Premium: 20/day, Dev: unlimited
    const dailyLimit = isDevBypass ? -1 : (isPremium ? 20 : 1);

    // Only check limits for non-dev users
    if (!isDevBypass) {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("image_generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", today);

      const usedCount = count ?? 0;
      if (usedCount >= dailyLimit) {
        console.log(`[${requestId}] Daily limit reached: ${usedCount}/${dailyLimit}`);
        return new Response(
          JSON.stringify({
            ok: false,
            error: "IMAGE_DAILY_LIMIT",
            messageUz: isFreeUser 
              ? `Bugungi bepul rasm limiti tugadi (${usedCount}/${dailyLimit}). Premium obunada ko'proq rasm yarating!`
              : `Bugungi rasm yaratish limiti tugadi (${usedCount}/${dailyLimit})`,
            type: "LIMIT_REACHED",
            used: usedCount,
            limit: dailyLimit,
            requestId,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.log(`[${requestId}] Dev unlimited user - bypassing limits`);
    }

    // Log if free user (will get watermark)
    if (isFreeUser) {
      console.log(`[${requestId}] Free user - image will be watermarked`);
    }

    console.log(`[${requestId}] Final prompt (${finalPrompt.length} chars): "${finalPrompt}"`);

    // ==========================================
    // FIREWORKS API CALL - Matching Playground defaults
    // ==========================================
    
    // Use Playground defaults
    const steps = qualityBoost ? 8 : 4; // Default is 4
    const guidanceScale = 3.5; // Playground default
    
    // Use fixed seed for reproducible debugging (remove in production for variety)
    const seed = Math.floor(Math.random() * 1000000);

    const fireworksBody = {
      prompt: finalPrompt,
      aspect_ratio: aspectRatio,
      guidance_scale: guidanceScale,
      num_inference_steps: steps,
      seed: seed,
      // NO negative_prompt - Playground doesn't use it by default
    };

    console.log(`[${requestId}] Fireworks request:`, JSON.stringify(fireworksBody));

    // Start image generation step
    const generateStep = startStep('generating_image');

    // CRITICAL: Fireworks FLUX workflow requires Accept: image/png or image/jpeg
    // It returns raw binary image bytes, NOT JSON
    const fireworksResponse = await fetch(FIREWORKS_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fireworksApiKey}`,
        "Content-Type": "application/json",
        Accept: "image/png", // MUST be image/png or image/jpeg - workflow doesn't support application/json
      },
      body: JSON.stringify(fireworksBody),
    });

    // Log full response for debugging
    const responseStatus = fireworksResponse.status;
    console.log(`[${requestId}] Fireworks response status: ${responseStatus}`);

    if (!fireworksResponse.ok) {
      const errorText = await fireworksResponse.text();
      console.error(`[${requestId}] Fireworks API error ${responseStatus}:`, errorText);

      // Parse error for better messages
      let errorMessage = "Rasm yaratishda xatolik yuz berdi";
      if (errorText.includes("content") || errorText.includes("filter") || errorText.includes("safety")) {
        errorMessage = "Rasm yaratib bo'lmadi. Iltimos, boshqa prompt kiriting.";
      } else if (responseStatus === 429) {
        errorMessage = "Juda ko'p so'rov. Biroz kutib turing.";
      } else if (responseStatus === 401 || responseStatus === 403) {
        errorMessage = "API kaliti xatosi";
      }

      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: errorMessage, 
          requestId,
          debug: { status: responseStatus, body: errorText.slice(0, 500) }
        }),
        { status: responseStatus >= 500 ? 500 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Response is raw PNG bytes (not JSON) when Accept: image/png
    const imageBytes = new Uint8Array(await fireworksResponse.arrayBuffer());
    console.log(`[${requestId}] Image received, size: ${imageBytes.length} bytes`);
    
    endStep(generateStep, { 
      imageEngine: 'fireworks',
      imageModel: 'flux-1-schnell-fp8',
      imageSteps: steps,
      imageSize: aspectRatio,
    });

    if (imageBytes.length === 0) {
      console.error(`[${requestId}] Empty image response`);
      return new Response(
        JSON.stringify({ ok: false, error: "Rasm ma'lumotlarini olishda xatolik", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply watermark for free users using AI Gateway image editing
    let finalImageBytes = imageBytes;
    let isWatermarked = false;
    
    if (isFreeUser) {
      console.log(`[${requestId}] Applying watermark for free user`);
      const watermarkStep = startStep('watermarking');
      
      try {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (LOVABLE_API_KEY) {
          // Convert image bytes to base64 for AI Gateway
          const base64Image = btoa(String.fromCharCode(...imageBytes));
          const imageDataUrl = `data:image/png;base64,${base64Image}`;
          
          const watermarkResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image-preview",
              messages: [{
                role: "user",
                content: [
                  {
                    type: "text",
                    text: "Add a semi-transparent watermark text 'Bahor AI' in the bottom-right corner of this image. The watermark should be subtle, white with 40% opacity, positioned 24px from the bottom-right edges. Keep the original image exactly as is, only add the watermark."
                  },
                  {
                    type: "image_url",
                    image_url: { url: imageDataUrl }
                  }
                ]
              }],
              modalities: ["image", "text"]
            }),
          });
          
          if (watermarkResponse.ok) {
            const watermarkData = await watermarkResponse.json();
            const watermarkedImageUrl = watermarkData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            
            if (watermarkedImageUrl && watermarkedImageUrl.startsWith('data:image')) {
              // Extract base64 and convert back to bytes
              const base64Part = watermarkedImageUrl.split(',')[1];
              if (base64Part) {
                const binaryString = atob(base64Part);
                finalImageBytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  finalImageBytes[i] = binaryString.charCodeAt(i);
                }
                isWatermarked = true;
                console.log(`[${requestId}] Watermark applied successfully, new size: ${finalImageBytes.length} bytes`);
              }
            }
          } else {
            console.warn(`[${requestId}] Watermark API failed:`, watermarkResponse.status);
          }
        }
      } catch (watermarkError) {
        console.error(`[${requestId}] Watermark error (non-fatal):`, watermarkError);
        // Continue without watermark if it fails - still save original image
      }
      
      endStep(watermarkStep, { watermarked: isWatermarked });
    }

    const mimeType = "image/png";
    const extension = 'png'; // We're always requesting image/png

    // Generate file path
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const imageId = crypto.randomUUID();
    const filePath = `${user.id}/images/${year}/${month}/${imageId}.${extension}`;

    // Start saving step
    const saveStep = startStep('saving');

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("user-files")
      .upload(filePath, finalImageBytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error(`[${requestId}] Storage upload error:`, uploadError);
      return new Response(
        JSON.stringify({ ok: false, error: "Rasmni saqlashda xatolik", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] Image uploaded to: ${filePath}`);

    // Insert into image_generations table
    const { error: genError } = await supabase
      .from("image_generations")
      .insert({
        user_id: user.id,
        prompt_uz: promptOriginal,
        prompt_en: finalPrompt,
        negative_prompt_en: null, // No negative prompt
        aspect_ratio: aspectRatio,
        guidance_scale: guidanceScale,
        num_inference_steps: steps,
        seed: seed,
        status: "done",
        file_path: filePath,
        mime_type: mimeType,
      });

    if (genError) {
      console.error(`[${requestId}] DB insert error:`, genError);
    }

    // Save to user_files
    const fileName = `bahor-image-${imageId.slice(0, 8)}.${extension}`;
    const { error: fileError } = await supabase
      .from("user_files")
      .insert({
        user_id: user.id,
        title: fileName,
        tool: "imagegen",
        mime_type: mimeType,
        size_bytes: finalImageBytes.length,
        bucket: "user-files",
        path: filePath,
        status: "success",
        meta: {
          prompt_original: promptOriginal,
          prompt_final: finalPrompt,
          render_mode: renderMode,
          quality_boost: qualityBoost,
          aspect_ratio: aspectRatio,
          seed: seed,
          steps: steps,
          guidance: guidanceScale,
          is_watermarked: isWatermarked,
          is_free_user: isFreeUser,
        },
      });

    if (fileError) {
      console.error(`[${requestId}] user_files insert error:`, fileError);
    }

    // Attach to chat if requested
    if (attachToChat && chatId) {
      try {
        const { error: attachError } = await supabase
          .from("chat_attachments")
          .insert({
            thread_id: chatId,
            user_id: user.id,
            bucket: "user-files",
            path: filePath,
            mime_type: mimeType,
            original_name: fileName,
            size_bytes: finalImageBytes.length,
          });

        if (attachError) {
          console.error(`[${requestId}] Chat attachment insert error:`, attachError);
        }
      } catch (e) {
        console.error(`[${requestId}] Failed to attach to chat:`, e);
      }
    }

    // Generate signed URL (1 hour expiry)
    const { data: signedUrlData } = await supabase.storage
      .from("user-files")
      .createSignedUrl(filePath, 3600);
    
    endStep(saveStep, { cloudSaved: true });

    console.log(`[${requestId}] Success, returning signed URL`);
    
    // Final delivering step
    const deliverStep = startStep('delivering');
    endStep(deliverStep);

    // Log successful image generation event
    await logImageGenEvent(supabase, user.id, {
      success: true,
      duration_ms: Date.now() - requestStart,
      steps: steps,
      model: "flux-schnell",
      aspect_ratio: aspectRatio,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        image_url: signedUrlData?.signedUrl || "",
        prompt_original: promptOriginal,
        prompt_final: finalPrompt,
        model: "flux-schnell",
        aspect_ratio: aspectRatio,
        seed: seed,
        steps: steps,
        guidance: guidanceScale,
        render_mode: renderMode,
        // Trace data for ThinkBar
        trace: {
          steps: traceSteps,
          elapsedMs: Date.now() - requestStart,
        },
        quality_boost: qualityBoost,
        file_path: filePath,
        file_name: fileName,
        is_watermarked: isWatermarked,
        is_free_user: isFreeUser,
        requestId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error(`[${requestId}] fireworks-generate-image error:`, errMessage, errStack ?? "");

    // Log failed image generation event
    if (supabase && user?.id) {
      await logImageGenEvent(supabase, user.id, {
        success: false,
        duration_ms: Date.now() - requestStart,
        steps: 4,
        model: "flux-schnell",
        error: errMessage,
      });
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: "Rasm yaratishda xatolik yuz berdi",
        requestId,
        debug: { message: errMessage },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
