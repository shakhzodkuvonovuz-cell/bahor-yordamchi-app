/**
 * fireworks-image-router - Multi-model image generation edge function
 * 
 * Supports:
 *   - FLUX Schnell (t2i) - fast, free tier
 *   - SDXL 1.0 (t2i) - higher quality, premium only
 *   - SDXL Remix (i2i) - image-to-image, premium only
 * 
 * ============================================================================
 * TESTING GUIDE
 * ============================================================================
 * 
 * 1. FLUX T2I (Free users allowed)
 *    Request:
 *    {
 *      "prompt": "A cute cat",
 *      "toolMode": "t2i",
 *      "modelChoice": "flux",
 *      "aspectRatio": "1:1"
 *    }
 *    Expected logs:
 *      [abc123] Request: user=xxxxxxxx toolMode=t2i modelChoice=flux aspectRatio=1:1
 *      [abc123] OK user=xxxxxxxx mode=t2i/flux in=XXXXXb out=XXXXXb dur=XXXms status=200
 *    Response fields:
 *      ok=true, model="flux-schnell", tool_mode="t2i", model_choice="flux"
 * 
 * 2. SDXL T2I (Premium only)
 *    Request:
 *    {
 *      "prompt": "A cute cat",
 *      "toolMode": "t2i",
 *      "modelChoice": "sdxl",
 *      "aspectRatio": "16:9"
 *    }
 *    Expected logs:
 *      [abc123] Request: user=xxxxxxxx toolMode=t2i modelChoice=sdxl aspectRatio=16:9
 *      [abc123] OK user=xxxxxxxx mode=t2i/sdxl in=XXXXXb out=XXXXXb dur=XXXms status=200
 *    Response fields:
 *      ok=true, model="sdxl", tool_mode="t2i", model_choice="sdxl", width=1344, height=768
 *    Free user rejection:
 *      status=403, error="PREMIUM_REQUIRED"
 * 
 * 3. SDXL REMIX (Premium + inputImage required)
 *    Request:
 *    {
 *      "prompt": "Make it sunset colors",
 *      "toolMode": "remix",
 *      "modelChoice": "sdxl",
 *      "aspectRatio": "1:1",
 *      "inputImage": { "bucket": "user-files", "path": "<userId>/images/..." },
 *      "remixStrength": 0.35
 *    }
 *    Expected logs:
 *      [abc123] Request: user=xxxxxxxx toolMode=remix modelChoice=sdxl aspectRatio=1:1
 *      [abc123] Downloading input image
 *      [abc123] OK user=xxxxxxxx mode=remix/sdxl in=XXXXXb out=XXXXXb dur=XXXms status=200
 *    Response fields:
 *      ok=true, model="sdxl-remix", tool_mode="remix", model_choice="sdxl"
 *    Guardrails:
 *      - remixStrength must be 0.05-0.9 (else 400)
 *      - inputImage required (else 400)
 *      - inputImage.path must start with userId (else 403)
 *      - inputImage.bucket must be in ALLOWED_BUCKETS (else 400)
 * 
 * Common response fields for all modes:
 *   ok, image_url, prompt_original, prompt_final, model, tool_mode, model_choice,
 *   aspect_ratio, seed, steps, file_path, file_name, is_watermarked, requestId
 * 
 * Error responses:
 *   status=400: validation errors (bad prompt, invalid params)
 *   status=401: missing/invalid auth
 *   status=403: premium required, controlnet not ready, security violation
 *   status=429: daily limit reached
 *   status=500: internal/API errors
 * ============================================================================
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// API endpoints
const FLUX_API_URL = "https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-1-schnell-fp8/text_to_image";
const SDXL_T2I_API_URL = "https://api.fireworks.ai/inference/v1/image_generation/accounts/fireworks/models/stable-diffusion-xl-1024-v1-0";
const SDXL_I2I_API_URL = "https://api.fireworks.ai/inference/v1/image_generation/accounts/fireworks/models/stable-diffusion-xl-1024-v1-0/image_to_image";

const MAX_PROMPT_LENGTH = 500;
const ALLOWED_BUCKETS = ["user-files", "chat-attachments"];
const ALLOWED_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:5"];
const REMIX_STRENGTH_MIN = 0.05;
const REMIX_STRENGTH_MAX = 0.9;

// Content guardrails
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

/**
 * Detect image MIME type from magic bytes
 * Supports PNG, JPEG, WebP - falls back to octet-stream for unknown formats
 */
function sniffImageMime(bytes: Uint8Array): { mime: string; ext: string } {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return { mime: "image/png", ext: "png" };

  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return { mime: "image/jpeg", ext: "jpg" };

  // WebP: "RIFF"...."WEBP"
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return { mime: "image/webp", ext: "webp" };

  // Fallback - unknown format
  return { mime: "application/octet-stream", ext: "bin" };
}

// Types
type ToolMode = "t2i" | "remix" | "controlnet";
type ModelChoice = "flux" | "sdxl";

interface InputImage {
  bucket: string;
  path: string;
}

interface RequestBody {
  prompt: string;
  aspectRatio?: string;
  renderMode?: string;
  qualityBoost?: boolean;
  stylePreset?: string;
  chatId?: string;
  attachToChat?: boolean;
  toolMode?: ToolMode;
  modelChoice?: ModelChoice;
  inputImage?: InputImage;
  remixStrength?: number;
  skipTranslation?: boolean;
  skipBoosters?: boolean;
  rawMode?: boolean;
}

// Simple bitmap font for watermark
function createWatermarkBitmap(): { width: number; height: number; data: Uint8Array } {
  const chars: Record<string, number[][]> = {
    'B': [[1,1,1,0],[1,0,1,0],[1,1,0,0],[1,0,1,0],[1,1,1,0]],
    'a': [[0,1,1,0],[1,0,1,0],[1,1,1,0],[1,0,1,0],[1,0,1,0]],
    'h': [[1,0,0,0],[1,0,0,0],[1,1,1,0],[1,0,1,0],[1,0,1,0]],
    'o': [[0,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[0,1,1,0]],
    'r': [[1,1,1,0],[1,0,1,0],[1,1,0,0],[1,0,1,0],[1,0,1,0]],
    ' ': [[0,0],[0,0],[0,0],[0,0],[0,0]],
    'A': [[0,1,1,0],[1,0,0,1],[1,1,1,1],[1,0,0,1],[1,0,0,1]],
    'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
  };
  
  const text = "Bahor AI";
  let totalWidth = 0;
  const charWidths: number[] = [];
  
  for (const c of text) {
    const charData = chars[c] || chars[' '];
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
    const charData = chars[c] || chars[' '];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < charData[y].length; x++) {
        if (charData[y][x]) {
          data[y * totalWidth + xOffset + x] = 255;
        }
      }
    }
    xOffset += charWidths[i] + 1;
  }
  
  return { width: totalWidth, height, data };
}

// Apply local watermark and convert to PNG
async function applyLocalWatermark(imageBytes: Uint8Array, requestId: string): Promise<Uint8Array<ArrayBuffer>> {
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
      if (pixelVal > 0) {
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const imgX = xStart + sx * scale + dx;
            const imgY = yStart + sy * scale + dy;
            
            if (imgX >= 0 && imgX < imgWidth && imgY >= 0 && imgY < imgHeight) {
              const existing = img.getPixelAt(imgX + 1, imgY + 1);
              const r = (existing >> 24) & 0xFF;
              const g = (existing >> 16) & 0xFF;
              const b = (existing >> 8) & 0xFF;
              const a = existing & 0xFF;
              
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
    }
  }
  
  const encoded = await img.encode();
  const result = new Uint8Array(encoded.length);
  result.set(encoded);
  console.log(`[${requestId}] Local watermark applied, size: ${result.length} bytes`);
  return result;
}

/**
 * Read EXIF orientation from JPEG bytes
 * Returns 1-8 for orientation, or 1 (normal) if not found
 */
function readExifOrientation(bytes: Uint8Array): number {
  // Check for JPEG magic bytes
  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return 1;
  
  let offset = 2;
  while (offset < bytes.length - 2) {
    if (bytes[offset] !== 0xFF) return 1;
    
    const marker = bytes[offset + 1];
    
    // Skip padding
    if (marker === 0xFF) {
      offset++;
      continue;
    }
    
    // APP1 marker (EXIF)
    if (marker === 0xE1) {
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      const exifStart = offset + 4;
      
      // Check for "Exif\0\0"
      if (bytes[exifStart] === 0x45 && bytes[exifStart + 1] === 0x78 &&
          bytes[exifStart + 2] === 0x69 && bytes[exifStart + 3] === 0x66 &&
          bytes[exifStart + 4] === 0x00 && bytes[exifStart + 5] === 0x00) {
        
        const tiffStart = exifStart + 6;
        const isLittleEndian = bytes[tiffStart] === 0x49; // 'II'
        
        const readUint16 = (pos: number) => {
          if (isLittleEndian) {
            return bytes[tiffStart + pos] | (bytes[tiffStart + pos + 1] << 8);
          }
          return (bytes[tiffStart + pos] << 8) | bytes[tiffStart + pos + 1];
        };
        
        const readUint32 = (pos: number) => {
          if (isLittleEndian) {
            return bytes[tiffStart + pos] | (bytes[tiffStart + pos + 1] << 8) |
                   (bytes[tiffStart + pos + 2] << 16) | (bytes[tiffStart + pos + 3] << 24);
          }
          return (bytes[tiffStart + pos] << 24) | (bytes[tiffStart + pos + 1] << 16) |
                 (bytes[tiffStart + pos + 2] << 8) | bytes[tiffStart + pos + 3];
        };
        
        // Skip TIFF header (8 bytes), get IFD0 offset
        const ifd0Offset = readUint32(4);
        const numEntries = readUint16(ifd0Offset);
        
        // Search for orientation tag (0x0112)
        for (let i = 0; i < numEntries; i++) {
          const entryOffset = ifd0Offset + 2 + (i * 12);
          const tag = readUint16(entryOffset);
          if (tag === 0x0112) {
            return readUint16(entryOffset + 8);
          }
        }
      }
      return 1;
    }
    
    // Skip other markers
    if (marker >= 0xE0 && marker <= 0xEF || marker === 0xFE || marker === 0xDB || marker === 0xC4) {
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      offset += 2 + length;
    } else {
      // End of markers we care about
      return 1;
    }
  }
  return 1;
}

/**
 * Apply EXIF orientation to image
 * Orientation values: 1=normal, 3=180°, 6=90°CW, 8=90°CCW, etc.
 */
async function applyExifOrientation(img: any, orientation: number): Promise<any> {
  switch (orientation) {
    case 3: // 180° rotation
      return img.rotate(180, false);
    case 6: // 90° CW
      return img.rotate(90, false);
    case 8: // 90° CCW
      return img.rotate(-90, false);
    case 2: // Horizontal flip
      return img.flipX();
    case 4: // Vertical flip
      return img.flipY();
    case 5: // Transpose (flip X + 90° CCW)
      return img.flipX().rotate(-90, false);
    case 7: // Transverse (flip X + 90° CW)
      return img.flipX().rotate(90, false);
    default: // 1 or unknown - no rotation needed
      return img;
  }
}

// Convert JPEG to PNG with EXIF orientation handling
async function convertToPng(imageBytes: Uint8Array, requestId: string): Promise<Uint8Array<ArrayBuffer>> {
  const img = await Image.decode(imageBytes);
  const encoded = await img.encode();
  const result = new Uint8Array(encoded.length);
  result.set(encoded);
  console.log(`[${requestId}] Converted to PNG, size: ${result.length} bytes`);
  return result;
}

// Normalize image orientation for JPEG inputs
async function normalizeImageOrientation(imageBytes: Uint8Array, requestId: string): Promise<Uint8Array> {
  const { mime } = sniffImageMime(imageBytes);
  
  // Only process JPEGs which can have EXIF orientation
  if (mime !== "image/jpeg") {
    return imageBytes;
  }
  
  const orientation = readExifOrientation(imageBytes);
  if (orientation === 1) {
    // Already normal orientation
    return imageBytes;
  }
  
  console.log(`[${requestId}] Normalizing EXIF orientation: ${orientation}`);
  
  // Decode, apply orientation, re-encode as PNG to strip EXIF
  let img = await Image.decode(imageBytes);
  img = await applyExifOrientation(img, orientation);
  const encoded = await img.encode();
  const result = new Uint8Array(encoded.length);
  result.set(encoded);
  
  console.log(`[${requestId}] Orientation normalized, new size: ${result.length} bytes`);
  return result;
}

// Translate non-English to English
async function translateToEnglish(prompt: string, requestId: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.log(`[${requestId}] No LOVABLE_API_KEY, skipping translation`);
    return prompt;
  }

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

// Style presets
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
    tool_mode?: string;
    model_choice?: string;
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

// Get dimensions from aspect ratio for SDXL
function getSDXLDimensions(aspectRatio: string): { width: number; height: number } {
  const dims: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "16:9": { width: 1344, height: 768 },
    "9:16": { width: 768, height: 1344 },
    "4:5": { width: 896, height: 1120 },
  };
  return dims[aspectRatio] || dims["1:1"];
}

// Trace step helper
interface TraceStep {
  step: string;
  startMs: number;
  endMs?: number;
  durMs?: number;
  detail?: Record<string, unknown>;
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const requestStart = Date.now();
  const traceSteps: TraceStep[] = [];
  
  const startStep = (step: string): TraceStep => {
    const s: TraceStep = { step, startMs: Date.now() - requestStart };
    traceSteps.push(s);
    return s;
  };
  
  const endStep = (s: TraceStep, detail?: Record<string, unknown>) => {
    s.endMs = Date.now() - requestStart;
    s.durMs = s.endMs - s.startMs;
    if (detail) s.detail = detail;
  };
  
  console.log(`[${requestId}] fireworks-image-router start`);
  const prepareStep = startStep('preparing');

  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let supabase: any = null;
  let user: { id: string; email?: string } | null = null;
  
  try {
    // Validate env vars
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const fireworksApiKey = Deno.env.get("FIREWORKS_API_KEY");

    if (!supabaseUrl) throw new Error("Missing env: SUPABASE_URL");
    if (!supabaseServiceKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
    if (!fireworksApiKey) throw new Error("Missing env: FIREWORKS_API_KEY");

    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
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

    const shortUserId = user.id.slice(0, 8);
    endStep(prepareStep);

    // Parse body
    const body: RequestBody = await req.json();
    const {
      prompt,
      aspectRatio = "1:1",
      renderMode = "photo",
      qualityBoost = false,
      chatId,
      attachToChat = false,
      stylePreset = "realistic",
      toolMode = "t2i",
      modelChoice = "flux",
      inputImage,
      remixStrength = 0.35,
      skipTranslation = false,
      skipBoosters = false,
      rawMode = false,
    } = body;

    // Lightweight log - no raw prompt
    console.log(`[${requestId}] Request: user=${shortUserId} toolMode=${toolMode} modelChoice=${modelChoice} aspectRatio=${aspectRatio}`);

    // Guardrail: validate aspectRatio
    if (!ALLOWED_ASPECT_RATIOS.includes(aspectRatio)) {
      console.log(`[${requestId}] Rejected: invalid aspectRatio="${aspectRatio}"`);
      return new Response(
        JSON.stringify({ ok: false, error: "Noto'g'ri aspect ratio", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Guardrail: remix mode requires inputImage
    if (toolMode === "remix" && (!inputImage || !inputImage.bucket || !inputImage.path)) {
      console.log(`[${requestId}] Rejected: remix mode missing inputImage`);
      return new Response(
        JSON.stringify({ ok: false, error: "Remix rejimi uchun manba rasm kerak", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Guardrail: remixStrength range
    if (toolMode === "remix" && (remixStrength < REMIX_STRENGTH_MIN || remixStrength > REMIX_STRENGTH_MAX)) {
      console.log(`[${requestId}] Rejected: remixStrength=${remixStrength} out of range [${REMIX_STRENGTH_MIN}, ${REMIX_STRENGTH_MAX}]`);
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Remix kuchi ${REMIX_STRENGTH_MIN} va ${REMIX_STRENGTH_MAX} orasida bo'lishi kerak`, 
          requestId 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate prompt
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Prompt kiriting", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ControlNet not ready
    if (toolMode === "controlnet") {
      console.log(`[${requestId}] ControlNet mode requested - not ready`);
      return new Response(
        JSON.stringify({ ok: false, error: "NOT_READY", messageUz: "Struktura rejimi tez kunda qo'shiladi", requestId }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user plan
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
    const dailyLimit = isDevBypass ? -1 : (isPremium ? 20 : 1);

    console.log(`[${requestId}] User plan: ${userPlan}, isPremium: ${isPremium}, isFreeUser: ${isFreeUser}`);

    // Plan gating: free users can only use flux t2i
    if (!isPremium) {
      if (modelChoice === "sdxl" || toolMode === "remix") {
        console.log(`[${requestId}] Free user attempted premium feature: ${toolMode}/${modelChoice}`);
        return new Response(
          JSON.stringify({
            ok: false,
            error: "PREMIUM_REQUIRED",
            messageUz: toolMode === "remix" 
              ? "Remix rejimi faqat Premium foydalanuvchilar uchun"
              : "SDXL modeli faqat Premium foydalanuvchilar uchun",
            requestId,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check daily limit
    if (!isDevBypass) {
      const now = new Date();
      const startOfDayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
      const endOfDayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
      
      const { count } = await supabase
        .from("image_generations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startOfDayUtc.toISOString())
        .lt("created_at", endOfDayUtc.toISOString());

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
    }

    // Clean prompt
    let promptOriginal = prompt.trim();
    promptOriginal = promptOriginal.replace(/--ar\s*\d+:\d+/gi, "").trim();
    promptOriginal = promptOriginal.replace(/Style:\s*/gi, "").trim();
    if (promptOriginal.length > MAX_PROMPT_LENGTH) {
      promptOriginal = promptOriginal.slice(0, MAX_PROMPT_LENGTH).trim();
    }

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

    // Build final prompt
    let finalPrompt: string;
    
    if (rawMode) {
      finalPrompt = promptOriginal;
    } else {
      let translatedPrompt = promptOriginal;
      if (!skipTranslation) {
        const translateStep = startStep('translating');
        translatedPrompt = await translateToEnglish(promptOriginal, requestId);
        endStep(translateStep, { translated: translatedPrompt !== promptOriginal });
      }
      
      if (!skipBoosters) {
        finalPrompt = addQualityBoosters(translatedPrompt, stylePreset);
      } else {
        finalPrompt = translatedPrompt;
      }
    }

    if (isBlockedPrompt(finalPrompt)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Bu turdagi rasm yaratib bo'lmaydi. Iltimos, boshqa mavzu tanlang.",
          requestId,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log prompt length only (no raw content in prod logs)
    console.log(`[${requestId}] Prompt: ${promptOriginal.length} chars -> ${finalPrompt.length} chars boosted`);

    // Generate image based on mode
    let imageBytes: Uint8Array;
    let modelUsed: string;
    let steps: number;
    let seed: number = Math.floor(Math.random() * 1000000);

    const generateStep = startStep('generating_image');

    if (toolMode === "t2i" && modelChoice === "flux") {
      // FLUX Schnell - existing flow
      steps = qualityBoost ? 8 : 4;
      const guidanceScale = 3.5;

      const fireworksBody = {
        prompt: finalPrompt,
        aspect_ratio: aspectRatio,
        guidance_scale: guidanceScale,
        num_inference_steps: steps,
        seed: seed,
      };

      console.log(`[${requestId}] FLUX request: steps=${steps}, aspect=${aspectRatio}`);

      const response = await fetch(FLUX_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${fireworksApiKey}`,
          "Content-Type": "application/json",
          Accept: "image/png",
        },
        body: JSON.stringify(fireworksBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${requestId}] FLUX API error ${response.status}:`, errorText);
        throw new Error(`FLUX API error: ${response.status}`);
      }

      imageBytes = new Uint8Array(await response.arrayBuffer());
      modelUsed = "flux-schnell";

    } else if (toolMode === "t2i" && modelChoice === "sdxl") {
      // SDXL T2I
      steps = 30;
      const { width, height } = getSDXLDimensions(aspectRatio);

      const sdxlBody = {
        prompt: finalPrompt,
        width,
        height,
        steps,
        cfg_scale: 7,
        seed,
        safety_check: true,
      };

      console.log(`[${requestId}] SDXL T2I request: ${width}x${height}, steps=${steps}`);

      const response = await fetch(SDXL_T2I_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${fireworksApiKey}`,
          "Content-Type": "application/json",
          Accept: "image/jpeg",
        },
        body: JSON.stringify(sdxlBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${requestId}] SDXL T2I API error ${response.status}:`, errorText);
        throw new Error(`SDXL T2I API error: ${response.status}`);
      }

      imageBytes = new Uint8Array(await response.arrayBuffer());
      modelUsed = "sdxl";

    } else if (toolMode === "remix") {
      // SDXL Image-to-Image (Remix)
      if (!inputImage || !inputImage.bucket || !inputImage.path) {
        return new Response(
          JSON.stringify({ ok: false, error: "Remix rejimi uchun manba rasm kerak", requestId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Security: validate bucket and path
      if (!ALLOWED_BUCKETS.includes(inputImage.bucket)) {
        console.log(`[${requestId}] Invalid bucket: ${inputImage.bucket}`);
        return new Response(
          JSON.stringify({ ok: false, error: "Noto'g'ri bucket", requestId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!inputImage.path.startsWith(`${user.id}/`)) {
        console.log(`[${requestId}] Invalid path - must start with user ID: ${inputImage.path}`);
        return new Response(
          JSON.stringify({ ok: false, error: "Noto'g'ri rasm yo'li", requestId }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Download input image
      console.log(`[${requestId}] Downloading input image`);
      const downloadStep = startStep('downloading_input');

      const { data: inputData, error: downloadError } = await supabase.storage
        .from(inputImage.bucket)
        .download(inputImage.path);

      if (downloadError || !inputData) {
        console.error(`[${requestId}] Failed to download input image:`, downloadError);
        return new Response(
          JSON.stringify({ ok: false, error: "Manba rasmni yuklashda xatolik", requestId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let inputImageBytes = new Uint8Array(await inputData.arrayBuffer());
      endStep(downloadStep, { inputBytes: inputImageBytes.length });
      
      // Normalize EXIF orientation to prevent rotated outputs
      inputImageBytes = await normalizeImageOrientation(inputImageBytes, requestId);

      // Build multipart form data for SDXL I2I
      steps = 30;
      const imageStrength = remixStrength;

      // Create FormData - auto-detect MIME type from magic bytes (re-check after normalization)
      const { mime: inputMime, ext: inputExt } = sniffImageMime(inputImageBytes);
      if (inputMime === "application/octet-stream") {
        console.error(`[${requestId}] Unsupported input image format`);
        return new Response(
          JSON.stringify({ ok: false, error: "UNSUPPORTED_INPUT_IMAGE_FORMAT", requestId }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log(`[${requestId}] Input image detected: ${inputMime}`);
      
      const formData = new FormData();
      // Note: For future ControlNet support, use same sniffImageMime for control_image
      formData.append("init_image", new Blob([inputImageBytes], { type: inputMime }), `input.${inputExt}`);
      formData.append("prompt", finalPrompt);
      formData.append("init_image_mode", "IMAGE_STRENGTH");
      formData.append("image_strength", String(imageStrength));
      formData.append("cfg_scale", "7");
      formData.append("seed", String(seed));
      formData.append("steps", String(steps));
      formData.append("safety_check", "true");

      console.log(`[${requestId}] SDXL I2I request: strength=${imageStrength}, steps=${steps}`);

      const response = await fetch(SDXL_I2I_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${fireworksApiKey}`,
          Accept: "image/jpeg",
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[${requestId}] SDXL I2I API error ${response.status}:`, errorText);
        throw new Error(`SDXL I2I API error: ${response.status}`);
      }

      imageBytes = new Uint8Array(await response.arrayBuffer());
      modelUsed = "sdxl-remix";

    } else {
      return new Response(
        JSON.stringify({ ok: false, error: "Noma'lum rejim", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    endStep(generateStep, { model: modelUsed, steps, rawBytes: imageBytes.length });
    

    if (imageBytes.length === 0) {
      throw new Error("Empty image response");
    }

    // Normalize to PNG
    let finalImageBytes: Uint8Array;
    let isWatermarked = false;

    if (isFreeUser) {
      // Free users: watermark (also converts to PNG)
      
      const watermarkStep = startStep('watermarking');
      try {
        finalImageBytes = await applyLocalWatermark(imageBytes, requestId);
        isWatermarked = true;
      } catch (e) {
        console.error(`[${requestId}] Watermark error:`, e);
        finalImageBytes = await convertToPng(imageBytes, requestId);
      }
      endStep(watermarkStep, { watermarked: isWatermarked });
    } else {
      // Premium users: convert JPEG to PNG if needed
      if (modelChoice === "sdxl" || toolMode === "remix") {
        const convertStep = startStep('converting');
        finalImageBytes = await convertToPng(imageBytes, requestId);
        endStep(convertStep);
      } else {
        // FLUX already returns PNG
        finalImageBytes = imageBytes;
      }
    }

    // Save to storage
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const imageId = crypto.randomUUID();
    const filePath = `${user.id}/images/${year}/${month}/${imageId}.png`;

    const saveStep = startStep('saving');

    const { error: uploadError } = await supabase.storage
      .from("user-files")
      .upload(filePath, finalImageBytes, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error(`[${requestId}] Storage upload error:`, uploadError);
      throw new Error("Rasmni saqlashda xatolik");
    }

    

    // Insert into image_generations
    const guidanceScale = modelChoice === "flux" ? 3.5 : 7;
    const { error: genError } = await supabase
      .from("image_generations")
      .insert({
        user_id: user.id,
        prompt_uz: promptOriginal,
        prompt_en: finalPrompt,
        negative_prompt_en: null,
        aspect_ratio: aspectRatio,
        guidance_scale: guidanceScale,
        num_inference_steps: steps,
        seed: seed,
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
          seed,
          steps,
          guidance: guidanceScale,
          is_watermarked: isWatermarked,
          is_free_user: isFreeUser,
          tool_mode: toolMode,
          model_choice: modelChoice,
          remix_strength: toolMode === "remix" ? remixStrength : undefined,
          input_image: toolMode === "remix" ? inputImage : undefined,
        },
      });

    if (fileError) {
      console.error(`[${requestId}] user_files insert error:`, fileError);
    }

    // Attach to chat if requested
    if (attachToChat && chatId) {
      try {
        await supabase
          .from("chat_attachments")
          .insert({
            thread_id: chatId,
            user_id: user.id,
            bucket: "user-files",
            path: filePath,
            mime_type: "image/png",
            original_name: fileName,
            size_bytes: finalImageBytes.length,
          });
      } catch (e) {
        console.error(`[${requestId}] Failed to attach to chat:`, e);
      }
    }

    // Generate signed URL
    const { data: signedUrlData } = await supabase.storage
      .from("user-files")
      .createSignedUrl(filePath, 3600);

    endStep(saveStep, { cloudSaved: true });

    // Log event
    await logImageGenEvent(supabase, user.id, {
      success: true,
      duration_ms: Date.now() - requestStart,
      steps,
      model: modelUsed,
      aspect_ratio: aspectRatio,
      tool_mode: toolMode,
      model_choice: modelChoice,
    });

    // Summary log: lightweight, no PII, no raw prompts
    console.log(`[${requestId}] OK user=${shortUserId} mode=${toolMode}/${modelChoice} in=${imageBytes.length}b out=${finalImageBytes.length}b dur=${Date.now() - requestStart}ms status=200`);

    return new Response(
      JSON.stringify({
        ok: true,
        image_url: signedUrlData?.signedUrl || "",
        prompt_original: promptOriginal,
        prompt_final: finalPrompt,
        model: modelUsed,
        tool_mode: toolMode,
        model_choice: modelChoice,
        aspect_ratio: aspectRatio,
        seed,
        steps,
        width: modelChoice === "sdxl" || toolMode === "remix" ? getSDXLDimensions(aspectRatio).width : undefined,
        height: modelChoice === "sdxl" || toolMode === "remix" ? getSDXLDimensions(aspectRatio).height : undefined,
        render_mode: renderMode,
        trace: {
          steps: traceSteps,
          elapsedMs: Date.now() - requestStart,
        },
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
    const shortUserId = user?.id?.slice(0, 8) || "unknown";
    console.error(`[${requestId}] FAIL user=${shortUserId} dur=${Date.now() - requestStart}ms status=500 err=${errMessage}`);

    if (supabase && user?.id) {
      await logImageGenEvent(supabase, user.id, {
        success: false,
        duration_ms: Date.now() - requestStart,
        steps: 4,
        model: "unknown",
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
