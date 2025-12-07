import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIREWORKS_API_URL = "https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-1-schnell-fp8/text_to_image";
const MAX_PROMPT_LENGTH = 300;

// Aspect ratio to width/height mapping
const ASPECT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 1024, height: 1280 },
  "5:4": { width: 1280, height: 1024 },
  "16:9": { width: 1344, height: 768 },
  "9:16": { width: 768, height: 1344 },
  "3:4": { width: 960, height: 1280 },
  "4:3": { width: 1280, height: 960 },
  "3:2": { width: 1216, height: 832 },
  "2:3": { width: 832, height: 1216 },
};

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


// Compose high-quality English prompt using Lovable AI Gateway
// This acts as Bahor AI's Image Prompt Composer for FLUX.1 Schnell
async function composeEnglishPrompt(prompt: string, renderMode: "photo" | "illustration", requestId: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.log(`[${requestId}] No LOVABLE_API_KEY, skipping prompt composition`);
    return prompt;
  }

  const styleHint = renderMode === "illustration" 
    ? "The user wants illustration/art style." 
    : "The user wants photo-realistic style.";

  const composerPrompt = `You are Bahor AI's Image Prompt Composer for FLUX.1 Schnell.

Goal:
Turn the user's request (Uzbek/Russian/English) into a single, high-quality ENGLISH prompt that produces the best possible image quality on FLUX.1 Schnell.

Rules:
- Preserve the user's intent exactly: subject, location, era, mood, style, and any constraints. Do not change the request.
- Do NOT add new main subjects (e.g., don't invent "a man" or "a portrait") unless the user explicitly asked for it.
- If the user asked for a portrait, make it a portrait. If the user asked for a landscape/city/scene, keep it a scene.
- Add helpful cinematic/photographic/art-direction details ONLY when they improve clarity and quality (lighting, time of day, atmosphere, materials, camera/lens, realism level, color mood).
- Keep place names and proper nouns exactly (Samarkand, Registon, Amir Temur, Tashkent, etc.).
- Keep it concise but rich: usually 1–3 sentences.
- If the user prompt is very short (3–6 words), expand it slightly into a strong prompt while staying faithful.
- Output ONLY the final English prompt text. No labels, no markdown, no quotes, no JSON.

Quality defaults to weave in (only when not conflicting):
- "high detail, natural lighting, strong composition, realistic textures"
- If photo-like: "documentary / cinematic photo, 35mm or 50mm, sharp focus, natural colors"
- If art-like: "highly detailed illustration / concept art, dramatic lighting, coherent anatomy, clean edges"
- If architecture/location: include time of day + atmosphere + materials + scale + reflections/shadows.

${styleHint}

User's request: ${prompt}`;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "user", content: composerPrompt },
        ],
        max_tokens: 600,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error(`[${requestId}] Prompt composer API error:`, response.status);
      return prompt;
    }

    const data = await response.json();
    const composed = data.choices?.[0]?.message?.content?.trim();
    console.log(`[${requestId}] Composed prompt: "${prompt}" -> "${composed}"`);
    return composed || prompt;
  } catch (error) {
    console.error(`[${requestId}] Prompt composition failed:`, error);
    return prompt;
  }
}

// Build negative prompt for technical quality issues only
function buildNegativePrompt(): string {
  return "text, watermark, logo, signature, deformed hands, extra fingers, disfigured face, lowres, blurry, oversaturated, plastic skin, duplicated people, bad anatomy, cropped, artifacts, distorted proportions";
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] fireworks-generate-image start`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate required env vars early
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const fireworksApiKey = Deno.env.get("FIREWORKS_API_KEY");

    if (!supabaseUrl) {
      throw new Error("Missing env: SUPABASE_URL");
    }
    if (!supabaseServiceKey) {
      throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
    }
    if (!fireworksApiKey) {
      throw new Error("Missing env: FIREWORKS_API_KEY");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.log(`[${requestId}] Auth error:`, authError?.message);
      return new Response(
        JSON.stringify({ ok: false, error: "Avtorizatsiya xatosi", requestId }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] User authenticated: ${user.id}`);

    // Parse request body
    const body = await req.json();
    const {
      prompt,
      aspectRatio = "1:1",
      renderMode = "photo",
      qualityBoost = false,
      chatId,
      attachToChat = false,
    } = body;

    console.log(`[${requestId}] Prompt: "${prompt}", aspectRatio: ${aspectRatio}, renderMode: ${renderMode}, qualityBoost: ${qualityBoost}`);

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Prompt kiriting", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean and limit prompt
    let promptOriginal = prompt.trim();
    promptOriginal = promptOriginal.replace(/--ar\s*\d+:\d+/gi, "").trim();
    promptOriginal = promptOriginal.replace(/Style:\s*/gi, "").trim();

    if (promptOriginal.length > MAX_PROMPT_LENGTH) {
      promptOriginal = promptOriginal.slice(0, MAX_PROMPT_LENGTH).trim();
      console.log(`[${requestId}] Prompt truncated to ${MAX_PROMPT_LENGTH} chars`);
    }

    // Check for blocked content BEFORE translation
    if (isBlockedPrompt(promptOriginal)) {
      console.log(`[${requestId}] Blocked content detected in original`);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Bu turdagi rasm yaratib bo'lmaydi. Iltimos, boshqa mavzu tanlang.",
          requestId,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Compose high-quality English prompt using AI
    const finalPrompt = await composeEnglishPrompt(promptOriginal, renderMode === "illustration" ? "illustration" : "photo", requestId);
    
    // Check for blocked content AFTER composition
    if (isBlockedPrompt(finalPrompt)) {
      console.log(`[${requestId}] Blocked content detected in composed prompt`);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Bu turdagi rasm yaratib bo'lmaydi. Iltimos, boshqa mavzu tanlang.",
          requestId,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate aspect ratio
    const validAspectRatio = ASPECT_DIMENSIONS[aspectRatio] ? aspectRatio : "1:1";
    const dimensions = ASPECT_DIMENSIONS[validAspectRatio];

    // Validate render mode
    const validRenderMode: "photo" | "illustration" = 
      renderMode === "illustration" ? "illustration" : "photo";

    // Check user limits - use DEV_UNLIMITED_EMAILS env var like chat function
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

    const isPremium = isDevBypass || (profile?.plan && ["premium", "beta_premium", "dev_unlimited"].includes(profile.plan));
    const dailyLimit = isDevBypass ? -1 : (isPremium ? 20 : 5);

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
            error: `Bugungi rasm yaratish limiti tugadi (${usedCount}/${dailyLimit})`,
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

    // Get negative prompt
    const negativePrompt = buildNegativePrompt();
    
    console.log(`[${requestId}] Final prompt (${finalPrompt.length} chars): "${finalPrompt.slice(0, 150)}..."`);
    console.log(`[${requestId}] Negative prompt: "${negativePrompt.slice(0, 80)}..."`)

    // Build Fireworks request
    const steps = qualityBoost ? 6 : 4;
    const guidanceScale = qualityBoost ? 4.5 : 3.5;

    const fireworksBody: Record<string, unknown> = {
      prompt: finalPrompt,
      negative_prompt: negativePrompt,
      aspect_ratio: validAspectRatio,
      guidance_scale: guidanceScale,
      num_inference_steps: steps,
    };

    console.log(`[${requestId}] Calling Fireworks API - steps: ${steps}, guidance: ${guidanceScale}, dimensions: ${dimensions.width}x${dimensions.height}`);

    // Call Fireworks API
    const fireworksResponse = await fetch(FIREWORKS_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${fireworksApiKey}`,
        "Content-Type": "application/json",
        Accept: "image/png",
      },
      body: JSON.stringify(fireworksBody),
    });

    if (!fireworksResponse.ok) {
      const errorText = await fireworksResponse.text();
      console.error(`[${requestId}] Fireworks API error:`, fireworksResponse.status, errorText);

      if (errorText.includes("content") || errorText.includes("filter") || errorText.includes("safety")) {
        return new Response(
          JSON.stringify({ ok: false, error: "Rasm yaratib bo'lmadi. Iltimos, boshqa prompt kiriting.", requestId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ ok: false, error: "Rasm yaratishda xatolik yuz berdi", requestId }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get binary PNG using correct Deno-compatible approach
    const buf = await fireworksResponse.arrayBuffer();
    const imageBytes = new Uint8Array(buf);
    console.log(`[${requestId}] Image received, size: ${imageBytes.length} bytes`);

    if (imageBytes.length === 0) {
      throw new Error("Fireworks returned empty image");
    }

    // Generate file path
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const imageId = crypto.randomUUID();
    const filePath = `${user.id}/images/${year}/${month}/${imageId}.png`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("user-files")
      .upload(filePath, imageBytes, {
        contentType: "image/png",
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
        negative_prompt_en: negativePrompt,
        aspect_ratio: validAspectRatio,
        guidance_scale: guidanceScale,
        num_inference_steps: steps,
        seed: null,
        status: "done",
        file_path: filePath,
        mime_type: "image/png",
      });

    if (genError) {
      console.error(`[${requestId}] DB insert error:`, genError);
    }

    // Save to user_files
    const fileName = `bahor-image-${imageId.slice(0, 8)}.png`;
    const { error: fileError } = await supabase
      .from("user_files")
      .insert({
        user_id: user.id,
        title: fileName,
        tool: "imagegen",
        mime_type: "image/png",
        size_bytes: imageBytes.length,
        bucket: "user-files",
        path: filePath,
        status: "success",
        meta: {
          prompt_original: promptOriginal,
          prompt_composed: finalPrompt,
          render_mode: validRenderMode,
          quality_boost: qualityBoost,
          aspect_ratio: validAspectRatio,
          width: dimensions.width,
          height: dimensions.height,
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
            mime_type: "image/png",
            original_name: fileName,
            size_bytes: imageBytes.length,
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

    console.log(`[${requestId}] Success, returning signed URL`);

    return new Response(
      JSON.stringify({
        ok: true,
        image_url: signedUrlData?.signedUrl || "",
        prompt_used: finalPrompt,
        prompt_original: promptOriginal,
        model: "flux-schnell",
        width: dimensions.width,
        height: dimensions.height,
        render_mode: validRenderMode,
        quality_boost: qualityBoost,
        file_path: filePath,
        file_name: fileName,
        requestId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error(`[${requestId}] fireworks-generate-image error:`, errMessage, errStack ?? "");

    return new Response(
      JSON.stringify({
        ok: false,
        error: "Rasm yaratishda xatolik yuz berdi",
        requestId,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
