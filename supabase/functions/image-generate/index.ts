import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// PiAPI Z-Image Turbo API Configuration
// - Ultra-fast generation (~1s for T2I, ~1s for I2I)
// - Supports text-to-image and image-to-image
// - Significantly cheaper than Replicate Flux
// ============================================================

const PIAPI_T2I_ENDPOINT = "https://api.piapi.ai/api/v1/task";
const PIAPI_I2I_ENDPOINT = "https://api.piapi.ai/api/v1/task";

// Fallback to Replicate if PiAPI fails
const REPLICATE_API_T2I = "https://api.replicate.com/v1/models/black-forest-labs/flux-2-klein-4b/predictions";
const REPLICATE_API_IMG2IMG = "https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions";

const MAX_PROMPT_LENGTH = 500;
const ALLOWED_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:5", "3:4", "4:3", "3:2", "2:3"];

// Anti-spam / cost control
const MIN_SECONDS_BETWEEN_REQUESTS = 8;

// Queue settings for PiAPI concurrency management
// Default to 4 to leave 1 slot buffer on Creator plan (5 concurrent max)
const PIAPI_MAX_CONCURRENT = 4;
const PIAPI_QUEUE_MAX_WAIT_MS = 15000; // Max time to wait for a slot
const PIAPI_QUEUE_POLL_MS = 500; // Poll interval when waiting for slot

// Content guardrails
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
  const dims: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "16:9": { width: 1344, height: 768 },
    "9:16": { width: 768, height: 1344 },
    "4:5": { width: 896, height: 1120 },
    "3:4": { width: 768, height: 1024 },
    "4:3": { width: 1024, height: 768 },
    "3:2": { width: 1024, height: 683 },
    "2:3": { width: 683, height: 1024 },
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

// Style preset to prompt suffix mapping
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

// Simple bitmap watermark
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
    provider?: string;
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
  negativePrompt?: string;
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
  // Resolution control
  width?: number;
  height?: number;
  // Provider preference
  preferProvider?: "piapi" | "replicate";
  // Keep compatibility with existing callers
  chatId?: string;
  attachToChat?: boolean;
  skipTranslation?: boolean;
  skipBoosters?: boolean;
  rawMode?: boolean;
}

// ============================================================
// PiAPI Z-Image Turbo Implementation
// ============================================================

interface PiAPITaskResponse {
  code: number;
  data: {
    task_id: string;
    status: string;
  };
  message: string;
}

interface PiAPITaskResult {
  code: number;
  data: {
    task_id: string;
    status: string;
    output?: {
      images?: Array<{ url: string }>;
      image_url?: string;
    };
    error?: string;
  };
  message: string;
}

async function createPiAPITask(
  apiKey: string,
  params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    seed?: number | null;
    sourceImageUrl?: string;
    strength?: number;
  },
  requestId: string,
): Promise<{ taskId: string } | { error: string }> {
  const isImg2Img = !!params.sourceImageUrl && typeof params.strength === "number";
  
  const taskInput: Record<string, any> = {
    prompt: params.prompt,
    width: params.width,
    height: params.height,
  };
  
  if (params.negativePrompt) {
    taskInput.negative_prompt = params.negativePrompt;
  }
  
  if (params.seed !== null && params.seed !== undefined) {
    taskInput.seed = params.seed;
  }
  
  // Image-to-image specific parameters
  if (isImg2Img) {
    taskInput.image_url = params.sourceImageUrl;
    // Strength: 0.0 = no change, 1.0 = completely new image
    // User's remixStrength: lower = preserve more
    taskInput.strength = Math.min(0.95, Math.max(0.1, params.strength!));
  }
  
  const requestBody = {
    model: isImg2Img ? "wavespeed-ai/z-image-turbo/image-to-image" : "wavespeed-ai/z-image-turbo",
    task_type: isImg2Img ? "image-to-image" : "text-to-image",
    input: taskInput,
  };
  
  console.log(`[${requestId}] Creating PiAPI task:`, JSON.stringify({ ...requestBody, input: { ...taskInput, prompt: taskInput.prompt.slice(0, 50) + "..." } }));
  
  try {
    const resp = await fetch(PIAPI_T2I_ENDPOINT, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!resp.ok) {
      const text = await resp.text();
      console.error(`[${requestId}] PiAPI create task error:`, resp.status, text);
      return { error: `PiAPI error: ${resp.status} ${text.slice(0, 200)}` };
    }
    
    const data: PiAPITaskResponse = await resp.json();
    console.log(`[${requestId}] PiAPI task created:`, data);
    
    if (data.code !== 200 && data.code !== 0) {
      return { error: data.message || "PiAPI task creation failed" };
    }
    
    return { taskId: data.data.task_id };
  } catch (e) {
    console.error(`[${requestId}] PiAPI create task exception:`, e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

async function pollPiAPITask(
  apiKey: string,
  taskId: string,
  requestId: string,
  maxWaitMs: number = 60000,
): Promise<{ imageUrl: string } | { error: string }> {
  const pollUrl = `${PIAPI_T2I_ENDPOINT}/${taskId}`;
  const startTime = Date.now();
  let pollDelay = 500; // Start with 500ms for fast turbo model
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const resp = await fetch(pollUrl, {
        headers: {
          "X-API-Key": apiKey,
        },
      });
      
      if (!resp.ok) {
        const text = await resp.text();
        console.error(`[${requestId}] PiAPI poll error:`, resp.status, text);
        await sleep(pollDelay);
        pollDelay = Math.min(2000, pollDelay * 1.5);
        continue;
      }
      
      const data: PiAPITaskResult = await resp.json();
      const status = data.data?.status;
      
      if (status === "completed" || status === "success") {
        // Extract image URL from various possible response formats
        const imageUrl = 
          data.data.output?.images?.[0]?.url || 
          data.data.output?.image_url ||
          (data.data.output as any)?.url;
        
        if (imageUrl) {
          console.log(`[${requestId}] PiAPI task completed, image URL obtained`);
          return { imageUrl };
        } else {
          console.error(`[${requestId}] PiAPI completed but no image URL:`, JSON.stringify(data.data.output));
          return { error: "No image URL in response" };
        }
      } else if (status === "failed" || status === "error") {
        console.error(`[${requestId}] PiAPI task failed:`, data.data.error);
        return { error: data.data.error || "Task failed" };
      }
      
      // Still processing
      await sleep(pollDelay);
      pollDelay = Math.min(2000, pollDelay * 1.3);
    } catch (e) {
      console.error(`[${requestId}] PiAPI poll exception:`, e);
      await sleep(pollDelay);
      pollDelay = Math.min(2000, pollDelay * 1.5);
    }
  }
  
  return { error: "Timeout waiting for image generation" };
}

async function generateWithPiAPI(
  apiKey: string,
  params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    seed?: number | null;
    sourceImageUrl?: string;
    strength?: number;
  },
  requestId: string,
  supabase: any,
  userId: string,
): Promise<{ imageUrl: string; provider: string } | { error: string; fallback?: boolean }> {
  // ============================================================
  // Acquire a queue slot before making PiAPI request
  // ============================================================
  let slotId: string | null = null;
  const queueStart = Date.now();
  
  while (Date.now() - queueStart < PIAPI_QUEUE_MAX_WAIT_MS) {
    const { data: slotResult, error: slotError } = await supabase.rpc("acquire_piapi_slot", {
      p_user_id: userId,
      p_max_concurrent: PIAPI_MAX_CONCURRENT,
    });
    
    if (slotError) {
      console.error(`[${requestId}] Queue slot error:`, slotError);
      // Proceed without queue protection on error
      break;
    }
    
    if (slotResult?.acquired) {
      slotId = slotResult.slot_id;
      console.log(`[${requestId}] Acquired queue slot ${slotId}, active: ${slotResult.active_count}/${slotResult.max_concurrent}`);
      break;
    }
    
    // No slot available, wait and retry
    console.log(`[${requestId}] Queue full (${slotResult?.active_count}/${slotResult?.max_concurrent}), waiting...`);
    await sleep(PIAPI_QUEUE_POLL_MS);
  }
  
  if (!slotId && Date.now() - queueStart >= PIAPI_QUEUE_MAX_WAIT_MS) {
    console.log(`[${requestId}] Queue wait timeout, falling back to Replicate`);
    return { error: "Queue timeout - too many concurrent requests", fallback: true };
  }
  
  // Helper to release slot on completion
  const releaseSlot = async (status: "completed" | "failed") => {
    if (slotId) {
      try {
        await supabase.rpc("release_piapi_slot", { p_slot_id: slotId, p_status: status });
        console.log(`[${requestId}] Released queue slot ${slotId} with status: ${status}`);
      } catch (e) {
        console.error(`[${requestId}] Failed to release slot:`, e);
      }
    }
  };
  
  try {
    const createResult = await createPiAPITask(apiKey, params, requestId);
    
    if ("error" in createResult) {
      await releaseSlot("failed");
      return { error: createResult.error, fallback: true };
    }
    
    const pollResult = await pollPiAPITask(apiKey, createResult.taskId, requestId);
    
    if ("error" in pollResult) {
      await releaseSlot("failed");
      return { error: pollResult.error, fallback: true };
    }
    
    await releaseSlot("completed");
    return { imageUrl: pollResult.imageUrl, provider: "piapi-z-image-turbo" };
  } catch (e) {
    await releaseSlot("failed");
    throw e;
  }
}

// ============================================================
// Replicate Fallback Implementation
// ============================================================

async function generateWithReplicate(
  token: string,
  params: {
    prompt: string;
    width: number;
    height: number;
    aspectRatio: string;
    seed?: number | null;
    sourceImageUrl?: string;
    strength?: number;
    mask?: string;
  },
  requestId: string,
): Promise<{ imageUrl: string; provider: string; predictionId?: string } | { error: string }> {
  const isImg2Img = !!params.sourceImageUrl && typeof params.strength === "number";
  const replicateApiUrl = isImg2Img ? REPLICATE_API_IMG2IMG : REPLICATE_API_T2I;
  const replicateModel = isImg2Img ? "flux-dev" : "flux-2-klein";
  
  const input: Record<string, any> = {
    prompt: params.prompt,
  };
  
  if (isImg2Img) {
    input.aspect_ratio = params.aspectRatio;
    input.image = params.sourceImageUrl;
    input.prompt_strength = Math.min(0.95, Math.max(0.1, params.strength!));
  } else {
    input.width = params.width;
    input.height = params.height;
  }
  
  if (params.seed !== null && params.seed !== undefined) {
    input.seed = params.seed;
  }
  
  if (params.mask) {
    input.mask = params.mask;
  }
  
  console.log(`[${requestId}] Creating Replicate prediction (${replicateModel})`);
  
  try {
    const startResp = await fetch(replicateApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input }),
    });
    
    if (!startResp.ok) {
      const text = await startResp.text();
      console.error(`[${requestId}] Replicate start error:`, startResp.status, text);
      return { error: `Replicate error: ${startResp.status}` };
    }
    
    let prediction = await startResp.json();
    let status = prediction?.status as string;
    const getUrl = prediction?.urls?.get as string | undefined;
    
    if (!getUrl) {
      return { error: "No poll URL from Replicate" };
    }
    
    // Poll for completion
    let pollDelay = 1000;
    const maxWaitMs = 120000;
    const pollStart = Date.now();
    
    while (status === "starting" || status === "processing") {
      if (Date.now() - pollStart > maxWaitMs) {
        return { error: "Timeout waiting for Replicate" };
      }
      await sleep(pollDelay);
      pollDelay = Math.min(2500, pollDelay * 1.2);
      
      const pollResp = await fetch(getUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      prediction = await pollResp.json();
      status = prediction?.status;
    }
    
    if (status !== "succeeded") {
      return { error: prediction?.error || "Replicate generation failed" };
    }
    
    const output = prediction?.output;
    const imageUrl = Array.isArray(output) ? output[0] : output;
    
    if (!imageUrl || typeof imageUrl !== "string") {
      return { error: "No image URL from Replicate" };
    }
    
    return { 
      imageUrl, 
      provider: `replicate-${replicateModel}`,
      predictionId: prediction?.id,
    };
  } catch (e) {
    console.error(`[${requestId}] Replicate exception:`, e);
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const requestStart = Date.now();

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const piApiKey = Deno.env.get("PIAPI_API_KEY");
    const replicateToken = Deno.env.get("REPLICATE_API_TOKEN");
    
    if (!supabaseUrl) throw new Error("Missing env: SUPABASE_URL");
    if (!supabaseServiceKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
    
    // At least one provider must be available
    if (!piApiKey && !replicateToken) {
      throw new Error("No image generation provider configured");
    }

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
      negativePrompt,
      aspectRatio: aspectRatioRaw = "1:1",
      stylePreset = "realistic",
      qualityBoost = false,
      toolMode = "t2i",
      inputImage,
      remixStrength,
      image,
      mask,
      seed = null,
      width: customWidth,
      height: customHeight,
      preferProvider,
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aspectRatio = ALLOWED_ASPECT_RATIOS.includes(aspectRatioRaw) ? aspectRatioRaw : "1:1";
    const defaultDims = getDimensions(aspectRatio);
    const width = customWidth || defaultDims.width;
    const height = customHeight || defaultDims.height;

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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Determine if this is an img2img request (remix mode)
    const isImg2Img = !!sourceImageUrl && typeof remixStrength === "number";
    console.log(`[${requestId}] Mode: ${isImg2Img ? "img2img" : "t2i"}, aspectRatio: ${aspectRatio}, dims: ${width}x${height}`);

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
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ============================================================
    // Generate Image - Try PiAPI first, fallback to Replicate
    // ============================================================
    let generationResult: { imageUrl: string; provider: string; predictionId?: string } | null = null;
    let lastError: string | null = null;
    
    const genParams = {
      prompt: finalPrompt,
      negativePrompt,
      width,
      height,
      aspectRatio,
      seed,
      sourceImageUrl,
      strength: remixStrength,
      mask,
    };
    
    // Determine provider order
    const usePiAPIFirst = piApiKey && preferProvider !== "replicate";
    
    if (usePiAPIFirst) {
      console.log(`[${requestId}] Trying PiAPI Z-Image Turbo...`);
      const piResult = await generateWithPiAPI(piApiKey!, genParams, requestId, supabase, user.id);
      
      if ("imageUrl" in piResult) {
        generationResult = piResult;
      } else {
        lastError = piResult.error;
        console.log(`[${requestId}] PiAPI failed, falling back to Replicate...`);
        
        if (replicateToken && piResult.fallback) {
          const repResult = await generateWithReplicate(replicateToken, genParams, requestId);
          if ("imageUrl" in repResult) {
            generationResult = repResult;
          } else {
            lastError = repResult.error;
          }
        }
      }
    } else if (replicateToken) {
      console.log(`[${requestId}] Using Replicate...`);
      const repResult = await generateWithReplicate(replicateToken, genParams, requestId);
      if ("imageUrl" in repResult) {
        generationResult = repResult;
      } else {
        lastError = repResult.error;
      }
    }
    
    if (!generationResult) {
      console.error(`[${requestId}] All providers failed:`, lastError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "PROVIDER_ERROR",
          message: lastError || "Image generation failed",
          requestId,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch image bytes
    const imgResp = await fetch(generationResult.imageUrl);
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
    await supabase.from("image_generations").insert({
      user_id: user.id,
      prompt_uz: promptOriginal,
      prompt_en: finalPrompt,
      negative_prompt_en: negativePrompt || null,
      aspect_ratio: aspectRatio,
      guidance_scale: null,
      num_inference_steps: 0,
      seed: seed,
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
        provider: generationResult.provider,
        prompt_original: promptOriginal,
        prompt_final: finalPrompt,
        negative_prompt: negativePrompt,
        aspect_ratio: aspectRatio,
        width,
        height,
        tool_mode: toolMode,
        remix_strength: typeof remixStrength === "number" ? remixStrength : undefined,
        had_source_image: !!sourceImageUrl,
        had_mask: !!mask,
        is_watermarked: isWatermarked,
        is_free_user: isFreeUser,
        prediction_id: generationResult.predictionId,
        seed,
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
      steps: 0,
      model: generationResult.provider,
      aspect_ratio: aspectRatio,
      tool_mode: toolMode,
      provider: generationResult.provider,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        image_url: signedUrlData?.signedUrl || generationResult.imageUrl,
        file_path: filePath,
        file_name: fileName,
        prompt_original: promptOriginal,
        prompt_used: finalPrompt,
        negative_prompt: negativePrompt,
        model: generationResult.provider,
        provider: generationResult.provider,
        width,
        height,
        seed,
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
