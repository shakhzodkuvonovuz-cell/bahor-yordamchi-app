import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_API = "https://api.replicate.com/v1/predictions";
const REPLICATE_MODEL = "black-forest-labs/flux-2-klein-4b";

const MAX_PROMPT_LENGTH = 500;
const ALLOWED_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:5"];

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
          error: "Bu turdagi rasm yaratib bo'lmaydi. Iltimos, boshqa mavzu tanlang.",
          requestId,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
          error: "Bu turdagi rasm yaratib bo'lmaydi. Iltimos, boshqa mavzu tanlang.",
          requestId,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Replicate input
    const input: Record<string, any> = {
      prompt: finalPrompt,
      width,
      height,
    };
    if (seed !== null) input.seed = seed;
    if (sourceImageUrl) input.image = sourceImageUrl;
    if (mask) input.mask = mask;

    // Kick off prediction
    const startResp = await fetch(REPLICATE_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${replicateToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: REPLICATE_MODEL, input }),
    });

    if (!startResp.ok) {
      const t = await startResp.text();
      console.error(`[${requestId}] Replicate start error:`, startResp.status, t);
      throw new Error("Image generation failed");
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
    const imgBytes = new Uint8Array(await imgResp.arrayBuffer());

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
        replicate_model: REPLICATE_MODEL,
        prompt_original: promptOriginal,
        prompt_final: finalPrompt,
        aspect_ratio: aspectRatio,
        width,
        height,
        tool_mode: toolMode,
        had_source_image: !!sourceImageUrl,
        had_mask: !!mask,
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
