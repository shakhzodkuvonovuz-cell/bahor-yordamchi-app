import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Replicate has two prediction endpoints:
// - POST /v1/predictions requires a `version`
// - POST /v1/models/{owner}/{name}/predictions does NOT require `version`
// We use the model-scoped endpoint to avoid hardcoding version IDs.

// FLUX-2-Klein: Fast text-to-image (does NOT support img2img with strength control)
const REPLICATE_API_T2I = "https://api.replicate.com/v1/models/black-forest-labs/flux-2-klein-4b/predictions";
const REPLICATE_MODEL_T2I = "black-forest-labs/flux-2-klein-4b";

// FLUX-dev: Supports proper img2img with prompt_strength parameter
const REPLICATE_API_IMG2IMG = "https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions";
const REPLICATE_MODEL_IMG2IMG = "black-forest-labs/flux-dev";

const MAX_PROMPT_LENGTH = 500;
const ALLOWED_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:5"];

// Anti-spam / cost control
const MIN_SECONDS_BETWEEN_REQUESTS = 8;

// Content guardrails (keep parity with existing image endpoints)
const BLOCKED_PATTERNS = [
  /\b(nude|naked|sex|porn|explicit|nsfw|erotic|xxx)\b/i,
  /\b(trump|biden|putin|xi jinping|obama|zelensky|merkel)\b/i,
  /\b(celebrity|famous person|real person)\b/i,
  /\b(gore|violence|blood|murder|kill)\b/i,
  /\b(mirziyoyev|karimov|shavkat)\b/i,
];

function isBlockedPrompt(prompt: string): boolean {
  return BLOCKED_PATTERNS.some((p) => p.test(prompt));
}

function getDimensions(aspectRatio: string): { width: number; height: number } {
  // Keep same dims used by SDXL for stable layouts
  const dims: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "16:9": { width: 1344, height: 768 },
    "9:16": { width: 768, height: 1344 },
    "4:5": { width: 896, height: 1120 },
  };
  return dims[aspectRatio] || dims["1:1"];
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateToEnglish(prompt: string, requestId: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return prompt;

  const asciiRatio = (prompt.match(/[a-zA-Z]/g) || []).length / prompt.length;
  if (asciiRatio > 0.7) return prompt;

  const translatorPrompt = `Translate the following text to English. Keep it simple and direct. Preserve all place names, proper nouns, and specific details exactly. Output ONLY the English translation, nothing else.

Text: ${prompt}`;

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
    if (!resp.ok) return prompt;
    const data = await resp.json();
    const translated = data.choices?.[0]?.message?.content?.trim();
    return translated || prompt;
  } catch (e) {
    console.error(`[${requestId}] Translation failed`, e);
    return prompt;
  }
}

// Style preset to prompt suffix mapping (matches existing image generator behavior)
const STYLE_PRESETS: Record<string, string> = {
  realistic: "ultra realistic photograph, natural lighting, high detail, sharp focus, realistic materials",
  digital_art: "digital art, vibrant colors, detailed, professional digital painting, artstation quality",
  illustration: "highly detailed illustration, clean lines, vector art style, professional illustration",
  anime: "anime style, detailed anime art, studio ghibli inspired, vibrant anime illustration",
  minimal: "minimalist design, clean composition, simple shapes, limited color palette, modern minimal art",
};

function addQualityBoosters(prompt: string, stylePreset: string): string {
  const styleSuffix = STYLE_PRESETS[stylePreset] || STYLE_PRESETS.realistic;
  return `${prompt}. ${styleSuffix}`;
}

// Simple bitmap watermark (copied pattern from existing image endpoints)
function createWatermarkBitmap(): { width: number; height: number; data: Uint8Array } {
  const chars: Record<string, number[][]> = {
    B: [[1, 1, 1, 0], [1, 0, 1, 0], [1, 1, 0, 0], [1, 0, 1, 0], [1, 1, 1, 0]],
    a: [[0, 1, 1, 0], [1, 0, 1, 0], [1, 1, 1, 0], [1, 0, 1, 0], [1, 0, 1, 0]],
    h: [[1, 0, 0, 0], [1, 0, 0, 0], [1, 1, 1, 0], [1, 0, 1, 0], [1, 0, 1, 0]],
    o: [[0, 1, 1, 0], [1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [0, 1, 1, 0]],
    r: [[1, 1, 1, 0], [1, 0, 1, 0], [1, 1, 0, 0], [1, 0, 1, 0], [1, 0, 1, 0]],
    " ": [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
    A: [[0, 1, 1, 0], [1, 0, 0, 1], [1, 1, 1, 1], [1, 0, 0, 1], [1, 0, 0, 1]],
    I: [[1, 1, 1], [0, 1, 0], [0, 1, 0], [0, 1, 0], [1, 1, 1]],
  };

  const text = "Bahor AI";
  let totalWidth = 0;
  const charWidths: number[] = [];

  for (const c of text) {
    const charData = chars[c] || chars[" "];
    const w = charData[0].length;
    charWidths.push(w);
    totalWidth += w + 1;
  }
  totalWidth -= 1;

  const height = 5;
  const data = new Uint8Array(totalWidth * height);
  let xOffset = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const charData = chars[c] || chars[" "];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < charData[y].length; x++) {
        if (charData[y][x]) data[y * totalWidth + xOffset + x] = 255;
      }
    }
    xOffset += charWidths[i] + 1;
  }

  return { width: totalWidth, height, data };
}

async function applyLocalWatermark(imageBytes: Uint8Array<ArrayBufferLike>, requestId: string): Promise<Uint8Array> {
  const img = await Image.decode(imageBytes);
  const imgWidth = img.width;
  const imgHeight = img.height;

  const scale = Math.max(2, Math.floor(Math.min(imgWidth, imgHeight) / 200));
  const padding = 24;

  const wm = createWatermarkBitmap();
  const scaledWidth = wm.width * scale;
  const scaledHeight = wm.height * scale;

  const xStart = imgWidth - scaledWidth - padding;
  const yStart = imgHeight - scaledHeight - padding;

  for (let sy = 0; sy < wm.height; sy++) {
    for (let sx = 0; sx < wm.width; sx++) {
      const pixelVal = wm.data[sy * wm.width + sx];
      if (!pixelVal) continue;

      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const imgX = xStart + sx * scale + dx;
          const imgY = yStart + sy * scale + dy;
          if (imgX < 0 || imgX >= imgWidth || imgY < 0 || imgY >= imgHeight) continue;

          const existing = img.getPixelAt(imgX + 1, imgY + 1);
          const r = (existing >> 24) & 0xff;
          const g = (existing >> 16) & 0xff;
          const b = (existing >> 8) & 0xff;
          const a = existing & 0xff;

          const alpha = 0.4;
          const newR = Math.round(r * (1 - alpha) + 255 * alpha);
          const newG = Math.round(g * (1 - alpha) + 255 * alpha);
          const newB = Math.round(b * (1 - alpha) + 255 * alpha);
          const newPixel = (newR << 24) | (newG << 16) | (newB << 8) | a;
          img.setPixelAt(imgX + 1, imgY + 1, newPixel);
        }
      }
    }
  }

  const encoded = await img.encode();
  const out = new Uint8Array(encoded.length);
  out.set(encoded);
  console.log(`[${requestId}] Watermark applied (${out.length} bytes)`);
  return out;
}

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
    tool_mode?: string;
  },
) {
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

type ToolMode = "t2i" | "remix" | "controlnet";

interface InputImageRef {
  bucket: string;
  path: string;
}

interface RequestBody {
  prompt: string;
  aspectRatio?: string;
  renderMode?: "photo" | "illustration" | string;
  stylePreset?: string;
  qualityBoost?: boolean;
  toolMode?: ToolMode;
  inputImage?: InputImageRef;
  remixStrength?: number;
  // Optional direct URLs for advanced integrations
  image?: string;
  mask?: string;
  seed?: number | null;
  // Keep compatibility with existing callers
  chatId?: string;
  attachToChat?: boolean;
  skipTranslation?: boolean;
  skipBoosters?: boolean;
  rawMode?: boolean;
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const requestStart = Date.now();

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
    if (!supabaseUrl) throw new Error("Missing env: SUPABASE_URL");
    if (!supabaseServiceKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
    if (!replicateToken) throw new Error("Missing env: REPLICATE_API_TOKEN");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: "Avtorizatsiya talab qilinadi", requestId }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Avtorizatsiya xatosi", requestId }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as RequestBody;
    const {
      prompt,
      aspectRatio: aspectRatioRaw = "1:1",
      stylePreset = "realistic",
      qualityBoost = false,
      toolMode = "t2i",
      inputImage,
      remixStrength,
      image,
      mask,
      seed = null,
      chatId,
      attachToChat = false,
      skipTranslation = false,
      skipBoosters = false,
      rawMode = false,
    } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Prompt kiriting", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let promptOriginal = prompt.trim();
    if (promptOriginal.length > MAX_PROMPT_LENGTH) {
      promptOriginal = promptOriginal.slice(0, MAX_PROMPT_LENGTH).trim();
    }

    if (isBlockedPrompt(promptOriginal)) {
      return new Response(
        JSON.stringify({
          ok: false,
          type: "CONTENT_BLOCKED",
          error: "Bu turdagi rasm yaratib bo'lmaydi. Iltimos, boshqa mavzu tanlang.",
          requestId,
        }),
        // Use 200 so client code can handle it uniformly (and to avoid SDK surfacing it as a transport error).
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aspectRatio = ALLOWED_ASPECT_RATIOS.includes(aspectRatioRaw) ? aspectRatioRaw : "1:1";
    const { width, height } = getDimensions(aspectRatio);

    // Resolve optional source image URL
    let sourceImageUrl: string | undefined = image;
    if (!sourceImageUrl && inputImage) {
      if (typeof inputImage.path !== "string" || !inputImage.path.startsWith(user.id)) {
        return new Response(
          JSON.stringify({ ok: false, error: "ACCESS_DENIED", requestId }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { data: signed } = await supabase.storage
        .from(inputImage.bucket)
        .createSignedUrl(inputImage.path, 3600);
      if (signed?.signedUrl) sourceImageUrl = signed.signedUrl;
    }

    // Build prompt
    let finalPrompt: string;
    if (rawMode) {
      finalPrompt = promptOriginal;
    } else {
      const translatedPrompt = skipTranslation ? promptOriginal : await translateToEnglish(promptOriginal, requestId);
      finalPrompt = skipBoosters ? translatedPrompt : addQualityBoosters(translatedPrompt, stylePreset);
    }

    if (isBlockedPrompt(finalPrompt)) {
      return new Response(
        JSON.stringify({
          ok: false,
          type: "CONTENT_BLOCKED",
          error: "Bu turdagi rasm yaratib bo'lmaydi. Iltimos, boshqa mavzu tanlang.",
          requestId,
        }),
        // Use 200 so client code can handle it uniformly (and to avoid SDK surfacing it as a transport error).
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Determine if this is an img2img request (remix mode)
    const isImg2Img = !!sourceImageUrl && typeof remixStrength === "number";
    
    // Select appropriate model and API endpoint
    // - flux-dev: Supports img2img with prompt_strength parameter
    // - flux-2-klein: Fast text-to-image only (ignores image_strength)
    const replicateApiUrl = isImg2Img ? REPLICATE_API_IMG2IMG : REPLICATE_API_T2I;
    const replicateModel = isImg2Img ? REPLICATE_MODEL_IMG2IMG : REPLICATE_MODEL_T2I;
    
    console.log(`[${requestId}] Using model: ${replicateModel}, isImg2Img: ${isImg2Img}`);

    // Replicate input
    const input: Record<string, any> = {
      prompt: finalPrompt,
    };
    
    // Only set dimensions for text-to-image (flux-dev uses aspect_ratio instead)
    if (isImg2Img) {
      // flux-dev uses aspect_ratio string format
      input.aspect_ratio = aspectRatio;
    } else {
      input.width = width;
      input.height = height;
    }
    
    if (seed !== null) input.seed = seed;
    if (sourceImageUrl) input.image = sourceImageUrl;
    if (mask) input.mask = mask;

    // Map remixStrength (0-1) to Replicate's prompt_strength parameter for img2img.
    // prompt_strength = 1.0 means full destruction of source image (100% prompt)
    // prompt_strength = 0.1 means keep 90% of source image structure
    // User's remixStrength slider: lower = preserve more of source image
    if (isImg2Img) {
      // Clamp between 0.1 and 0.95 to always have some effect
      const clamped = Math.min(0.95, Math.max(0.1, remixStrength));
      input.prompt_strength = clamped;
      console.log(`[${requestId}] img2img prompt_strength: ${clamped}`);
    }

    // --------------------------------------------------
    // Plan enforcement (server-side) + basic cost controls
    // --------------------------------------------------
    const userEmail = user.email?.toLowerCase() || "";
    const devUnlimitedRaw = Deno.env.get("DEV_UNLIMITED_EMAILS") || "";
    const adminEmailsRaw = Deno.env.get("ADMIN_EMAILS") || "";
    const devUnlimitedEmails = devUnlimitedRaw
      .split(",")
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean);
    const adminEmails = adminEmailsRaw
      .split(",")
      .map((e: string) => e.trim().toLowerCase())
      .filter(Boolean);
    const isDevBypass = devUnlimitedEmails.includes(userEmail) || adminEmails.includes(userEmail);

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();

    const userPlan = profile?.plan || "free";
    const isPremium = isDevBypass || ["premium", "beta_premium", "dev_unlimited"].includes(userPlan);
    const isFreeUser = !isPremium && !isDevBypass;

    const dailyLimit = isDevBypass ? -1 : isPremium ? 20 : 1;

    // Basic anti-spam: prevent rapid repeats
    if (!isDevBypass) {
      const since = new Date(Date.now() - MIN_SECONDS_BETWEEN_REQUESTS * 1000).toISOString();
      const { count: recentCount } = await supabase
        .from("usage_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("event_type", "image_gen")
        .gte("created_at", since);
      if ((recentCount ?? 0) > 0) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "TOO_MANY_REQUESTS",
            type: "RATE_LIMIT",
            messageUz: "Juda tez-tez so'rov yuboryapsiz. Iltimos, bir oz kuting.",
            requestId,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Daily limit check (UTC day)
    if (dailyLimit !== -1) {
      const nowUtc = new Date();
      const startOfDayUtc = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate(), 0, 0, 0));
      const endOfDayUtc = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate() + 1, 0, 0, 0));
      const { count } = await supabase
        .from("image_generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfDayUtc.toISOString())
        .lt("created_at", endOfDayUtc.toISOString());

      const usedCount = count ?? 0;
      if (usedCount >= dailyLimit) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "IMAGE_DAILY_LIMIT",
            type: "LIMIT_REACHED",
            used: usedCount,
            limit: dailyLimit,
            messageUz: isFreeUser
              ? `Bugungi bepul rasm limiti tugadi (${usedCount}/${dailyLimit}). Premium obunada ko'proq rasm yarating!`
              : `Bugungi rasm yaratish limiti tugadi (${usedCount}/${dailyLimit})`,
            requestId,
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Kick off prediction
    const startResp = await fetch(replicateApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input }),
    });

    if (!startResp.ok) {
      const t = await startResp.text();
      console.error(`[${requestId}] Replicate start error:`, startResp.status, t);
      // Return the provider error (sanitized) so the client gets something actionable.
      return new Response(
        JSON.stringify({
          ok: false,
          error: "PROVIDER_ERROR",
          provider_status: startResp.status,
          provider_body: t.slice(0, 1000),
          requestId,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let prediction = await startResp.json();

    // Poll
    let status = prediction?.status as string;
    const getUrl = prediction?.urls?.get as string | undefined;
    if (!getUrl) throw new Error("Image generation failed");

    let pollDelayMs = 1000;
    const maxWaitMs = 120_000;
    const pollStart = Date.now();

    while (status === "starting" || status === "processing") {
      if (Date.now() - pollStart > maxWaitMs) {
        throw new Error("Image generation timed out");
      }
      await sleep(pollDelayMs);
      pollDelayMs = Math.min(2500, Math.round(pollDelayMs * 1.2));

      const pollResp = await fetch(getUrl, {
        headers: { Authorization: `Bearer ${replicateToken}` },
      });
      prediction = await pollResp.json();
      status = prediction?.status;
    }

    if (status !== "succeeded") {
      console.error(`[${requestId}] Replicate failed:`, prediction?.error);
      throw new Error(prediction?.error || "Image generation failed");
    }

    const output = prediction?.output;
    const replicateImageUrl = Array.isArray(output) ? output[0] : output;
    if (!replicateImageUrl || typeof replicateImageUrl !== "string") {
      throw new Error("Image generation failed");
    }

    // Fetch image bytes
    const imgResp = await fetch(replicateImageUrl);
    if (!imgResp.ok) throw new Error("Failed to download generated image");
    let imgBytes: Uint8Array = new Uint8Array((await imgResp.arrayBuffer()) as ArrayBuffer);

    // Watermark for free tier
    const isWatermarked = isFreeUser;
    if (isWatermarked) {
      try {
        imgBytes = await applyLocalWatermark(imgBytes, requestId);
      } catch (e) {
        console.error(`[${requestId}] Watermark failed, continuing without:`, e);
      }
    }

    // Save to storage
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const imageId = crypto.randomUUID();
    const filePath = `${user.id}/images/${year}/${month}/${imageId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("user-files")
      .upload(filePath, imgBytes, { contentType: "image/png", upsert: false });
    if (uploadError) {
      console.error(`[${requestId}] Storage upload error:`, uploadError);
      throw new Error("Rasmni saqlashda xatolik");
    }

    // Persist metadata
    const steps = 0;
    const guidanceScale = null;
    await supabase.from("image_generations").insert({
      user_id: user.id,
      prompt_uz: promptOriginal,
      prompt_en: finalPrompt,
      negative_prompt_en: null,
      aspect_ratio: aspectRatio,
      guidance_scale: guidanceScale,
      num_inference_steps: steps,
      seed: typeof prediction?.metrics?.seed === "number" ? prediction.metrics.seed : null,
      status: "done",
      file_path: filePath,
      mime_type: "image/png",
    });

    const fileName = `bahor-image-${imageId.slice(0, 8)}.png`;
    await supabase.from("user_files").insert({
      user_id: user.id,
      title: fileName,
      tool: "imagegen",
      mime_type: "image/png",
      size_bytes: imgBytes.length,
      bucket: "user-files",
      path: filePath,
      status: "success",
      meta: {
        provider: "replicate",
        replicate_model: replicateModel,
        prompt_original: promptOriginal,
        prompt_final: finalPrompt,
        aspect_ratio: aspectRatio,
        width,
        height,
        tool_mode: toolMode,
        remix_strength: typeof remixStrength === "number" ? remixStrength : undefined,
        had_source_image: !!sourceImageUrl,
        had_mask: !!mask,
        is_watermarked: isWatermarked,
        is_free_user: isFreeUser,
        prediction_id: prediction?.id,
      },
    });

    // Attach to chat if requested
    if (attachToChat && chatId) {
      try {
        await supabase.from("chat_attachments").insert({
          thread_id: chatId,
          user_id: user.id,
          bucket: "user-files",
          path: filePath,
          mime_type: "image/png",
          original_name: fileName,
          size_bytes: imgBytes.length,
        });
      } catch (e) {
        console.error(`[${requestId}] Failed to attach to chat:`, e);
      }
    }

    const { data: signedUrlData } = await supabase.storage
      .from("user-files")
      .createSignedUrl(filePath, 3600);

    await logImageGenEvent(supabase, user.id, {
      success: true,
      duration_ms: Date.now() - requestStart,
      steps,
      model: "flux-2-klein",
      aspect_ratio: aspectRatio,
      tool_mode: toolMode,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        image_url: signedUrlData?.signedUrl || replicateImageUrl,
        file_path: filePath,
        file_name: fileName,
        prompt_original: promptOriginal,
        prompt_used: finalPrompt,
        model: "flux-2-klein",
        width,
        height,
        requestId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(`[${requestId}] image-generate error:`, e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ ok: false, error: msg, requestId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
