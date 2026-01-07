import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Daily limits per plan
const DAILY_LIMITS: Record<string, number> = {
  free: 0,
  beta_premium: 5,
  premium: 10,
  dev_unlimited: -1, // unlimited
};

// Translate non-English prompt to English using Lovable AI Gateway
async function translateToEnglish(prompt: string, requestId: string): Promise<{ original: string; translated: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.log(`[${requestId}] No LOVABLE_API_KEY, skipping translation`);
    return { original: prompt, translated: prompt };
  }

  // Check if already English (mostly ASCII letters)
  const asciiRatio = (prompt.match(/[a-zA-Z]/g) || []).length / prompt.length;
  if (asciiRatio > 0.7) {
    console.log(`[${requestId}] Prompt appears to be English, skipping translation`);
    return { original: prompt, translated: prompt };
  }

  const translatorPrompt = `Translate the following text to English for video generation. Keep it simple and direct. Preserve all place names, proper nouns, and specific details exactly. Output ONLY the English translation, nothing else.

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
      return { original: prompt, translated: prompt };
    }

    const data = await response.json();
    const translated = data.choices?.[0]?.message?.content?.trim();
    console.log(`[${requestId}] Translated: "${prompt}" -> "${translated}"`);
    return { original: prompt, translated: translated || prompt };
  } catch (error) {
    console.error(`[${requestId}] Translation failed:`, error);
    return { original: prompt, translated: prompt };
  }
}

// Error response helper
function errorResponse(
  code: string,
  messageEn: string,
  messageUz: string,
  status: number = 400,
  extra: Record<string, unknown> = {}
) {
  return new Response(
    JSON.stringify({
      ok: false,
      error: code,
      messageEn,
      messageUz,
      ...extra,
    }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  console.log(`[${requestId}] video-create-job start`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate env vars
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const runpodApiKey = Deno.env.get("RUNPOD_API_KEY");
    const runpodEndpointId = Deno.env.get("RUNPOD_LTXV_ENDPOINT_ID") || Deno.env.get("RUNPOD_ENDPOINT_ID");

    if (!supabaseUrl) throw new Error("Missing env: SUPABASE_URL");
    if (!supabaseServiceKey) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");
    if (!runpodApiKey) throw new Error("Missing env: RUNPOD_API_KEY");
    if (!runpodEndpointId) throw new Error("Missing env: RUNPOD_LTXV_ENDPOINT_ID");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("AUTH_REQUIRED", "Authorization required", "Avtorizatsiya talab qilinadi", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return errorResponse("AUTH_FAILED", "Authorization failed", "Avtorizatsiya xatosi", 401);
    }

    console.log(`[${requestId}] User authenticated: ${user.id}`);

    // Parse request body
    const body = await req.json();
    const {
      prompt,
      mode = "fast",
      source_type = "text",
      source_path = null,
      duration = 5,
      aspect_ratio = "16:9",
      style_preset = "cinematic",
      seed = null,
      motion_strength = 0.5,
      guidance = 7.5,
      steps = 30,
      fps = 24,
    } = body;

    // Validate prompt
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return errorResponse("PROMPT_REQUIRED", "Prompt is required", "Prompt kiritilmagan", 400);
    }

    // Validate mode
    if (!["fast", "pro"].includes(mode)) {
      return errorResponse("INVALID_MODE", "Mode must be 'fast' or 'pro'", "Rejim 'fast' yoki 'pro' bo'lishi kerak", 400);
    }

    // Validate source_type
    if (!["text", "image"].includes(source_type)) {
      return errorResponse("INVALID_SOURCE_TYPE", "Source type must be 'text' or 'image'", "Manba turi 'text' yoki 'image' bo'lishi kerak", 400);
    }

    // Get user plan and check limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();

    const userEmail = user.email?.toLowerCase() || "";
    const devUnlimitedRaw = Deno.env.get("DEV_UNLIMITED_EMAILS") || "";
    const adminEmailsRaw = Deno.env.get("ADMIN_EMAILS") || "";
    const devUnlimitedEmails = devUnlimitedRaw.split(",").map((e: string) => e.trim().toLowerCase()).filter(Boolean);
    const adminEmails = adminEmailsRaw.split(",").map((e: string) => e.trim().toLowerCase()).filter(Boolean);
    const isDevBypass = devUnlimitedEmails.includes(userEmail) || adminEmails.includes(userEmail);

    const plan = isDevBypass ? "dev_unlimited" : (profile?.plan || "free");
    const dailyLimit = DAILY_LIMITS[plan] ?? DAILY_LIMITS.free;

    console.log(`[${requestId}] User plan: ${plan}, dailyLimit: ${dailyLimit}, isDevBypass: ${isDevBypass}`);

    // Block free users
    if (plan === "free" && !isDevBypass) {
      console.log(`[${requestId}] Free user blocked: ${user.id}`);
      return errorResponse(
        "VIDEO_NOT_AVAILABLE_FREE",
        "Video generation is only available for Premium users.",
        "Video yaratish faqat Premium foydalanuvchilar uchun mavjud.",
        403
      );
    }

    // Check daily usage
    const today = new Date().toISOString().split("T")[0];
    const { count: todayCount } = await supabase
      .from("video_generations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00Z`)
      .in("status", ["queued", "running", "processing", "uploading", "completed"]);

    const usedToday = todayCount ?? 0;

    if (dailyLimit !== -1 && usedToday >= dailyLimit) {
      console.log(`[${requestId}] Daily limit reached: ${usedToday}/${dailyLimit}`);
      return errorResponse(
        "VIDEO_DAILY_LIMIT",
        `Daily video limit reached (${usedToday}/${dailyLimit}). Try again tomorrow.`,
        `Kunlik video limiti tugadi (${usedToday}/${dailyLimit}). Ertaga qayta urinib ko'ring.`,
        429,
        { used: usedToday, limit: dailyLimit }
      );
    }

    // Translate prompt
    const { original: promptUz, translated: promptEn } = await translateToEnglish(prompt.trim(), requestId);
    console.log(`[${requestId}] Prompt: uz="${promptUz}", en="${promptEn}"`);

    // Calculate dimensions from aspect ratio
    const aspectDims: Record<string, { width: number; height: number }> = {
      "16:9": { width: 768, height: 448 },
      "9:16": { width: 448, height: 768 },
      "1:1": { width: 512, height: 512 },
    };
    const dims = aspectDims[aspect_ratio] || aspectDims["16:9"];

    // Build params JSON
    const params = {
      style_preset,
      motion_strength,
      guidance,
      steps: mode === "pro" ? Math.min(steps, 50) : Math.min(steps, 30),
      fps,
      width: dims.width,
      height: dims.height,
    };

    // Insert video_generations row as 'queued'
    const { data: generation, error: insertError } = await supabase
      .from("video_generations")
      .insert({
        user_id: user.id,
        status: "queued",
        mode,
        source_type,
        source_path,
        prompt: promptUz,
        prompt_uz: promptUz,
        prompt_en: promptEn,
        duration_seconds: duration,
        aspect_ratio,
        seed: seed ?? Math.floor(Math.random() * 2147483647),
        params,
        width: dims.width,
        height: dims.height,
        fps,
      })
      .select("id")
      .single();

    if (insertError || !generation) {
      console.error(`[${requestId}] Insert error:`, insertError);
      return errorResponse("DB_INSERT_FAILED", "Failed to create video job", "Video ish yaratishda xatolik", 500);
    }

    const generationId = generation.id;
    console.log(`[${requestId}] Created generation: ${generationId}`);

    // Build RunPod payload
    const runpodPayload = {
      input: {
        prompt: promptEn,
        negative_prompt: "blurry, low quality, pixelated, distorted, deformed",
        width: dims.width,
        height: dims.height,
        num_frames: Math.round(duration * fps),
        num_inference_steps: params.steps,
        guidance_scale: params.guidance,
        seed: seed ?? Math.floor(Math.random() * 2147483647),
        fps,
        ...(source_type === "image" && source_path ? { image_url: source_path } : {}),
      },
    };

    console.log(`[${requestId}] Calling RunPod endpoint: ${runpodEndpointId}`);

    // Call RunPod to start job
    const runpodUrl = `https://api.runpod.ai/v2/${runpodEndpointId}/run`;
    const runpodResponse = await fetch(runpodUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${runpodApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(runpodPayload),
    });

    if (!runpodResponse.ok) {
      const errText = await runpodResponse.text();
      console.error(`[${requestId}] RunPod error:`, runpodResponse.status, errText);

      // Update generation as failed
      await supabase
        .from("video_generations")
        .update({ status: "failed", error: `RunPod error: ${runpodResponse.status}` })
        .eq("id", generationId);

      return errorResponse(
        "RUNPOD_ERROR",
        "Failed to start video generation",
        "Video yaratishni boshlashda xatolik",
        502
      );
    }

    const runpodData = await runpodResponse.json();
    const runpodJobId = runpodData.id;

    console.log(`[${requestId}] RunPod job started: ${runpodJobId}`);

    // Update generation with RunPod job ID and set status to 'running'
    await supabase
      .from("video_generations")
      .update({
        runpod_job_id: runpodJobId,
        status: "running",
        runpod_status: runpodData,
      })
      .eq("id", generationId);

    // Return success response
    return new Response(
      JSON.stringify({
        ok: true,
        generation_id: generationId,
        runpod_job_id: runpodJobId,
        status: "running",
        mode,
        duration,
        aspect_ratio,
        used_today: usedToday + 1,
        daily_limit: dailyLimit,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "INTERNAL_ERROR",
        messageEn: error instanceof Error ? error.message : "Internal server error",
        messageUz: "Ichki server xatosi",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
