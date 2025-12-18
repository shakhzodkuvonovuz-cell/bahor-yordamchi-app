import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ==========================================
// CONFIGURABLE SAFETY LIMITS (env vars)
// ==========================================
const VIDEO_COOLDOWN_SECONDS = parseInt(Deno.env.get("VIDEO_COOLDOWN_SECONDS") || "90");
const VIDEO_GLOBAL_CONCURRENCY_CAP = parseInt(Deno.env.get("VIDEO_GLOBAL_CONCURRENCY_CAP") || "3");
const VIDEO_MAX_SECONDS = parseInt(Deno.env.get("VIDEO_MAX_SECONDS") || "6");
const VIDEO_MAX_STEPS = parseInt(Deno.env.get("VIDEO_MAX_STEPS") || "30");
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

// Allowed resolution presets (to prevent abuse)
const ALLOWED_RESOLUTIONS = [
  { width: 768, height: 432 }, // 16:9 cinematic
  { width: 768, height: 512 }, // portrait-ish
  { width: 512, height: 512 }, // square
  { width: 432, height: 768 }, // 9:16 vertical
  { width: 640, height: 480 }, // 4:3
];

// Allowed FPS values
const ALLOWED_FPS = [8, 12, 24];

// Daily limits per plan - FREE USERS CANNOT ACCESS VIDEO
const DAILY_LIMITS: Record<string, number> = {
  free: 0, // No video access for free users
  beta_premium: 5,
  premium: 10,
  dev_unlimited: -1, // unlimited
};

// Helper to create consistent error responses
function errorResponse(
  code: string,
  messageEn: string,
  messageUz: string,
  status: number = 400,
  extra: Record<string, any> = {}
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
  console.log(`[${requestId}] runpod-video start`);

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
      return errorResponse(
        "AUTH_REQUIRED",
        "Authorization required",
        "Avtorizatsiya talab qilinadi",
        401
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return errorResponse(
        "AUTH_FAILED",
        "Authorization failed",
        "Avtorizatsiya xatosi",
        401
      );
    }

    console.log(`[${requestId}] User authenticated: ${user.id}`);

    const rawBody = await req.text();
    if (!rawBody) {
      return errorResponse(
        "EMPTY_BODY",
        "Request body is empty",
        "So'rov tanasi bo'sh",
        400
      );
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error(`[${requestId}] Invalid JSON body:`, rawBody);
      return errorResponse(
        "INVALID_JSON",
        "Invalid JSON in request body",
        "Noto'g'ri JSON",
        400
      );
    }

    const { action } = body;

    if (!action || !["start", "status", "cancel", "sign"].includes(action)) {
      return errorResponse(
        "INVALID_ACTION",
        "Invalid action. Allowed: start, status, cancel, sign",
        "Noto'g'ri amal",
        400
      );
    }

    // Get user plan for limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();

    const userEmail = user.email?.toLowerCase() || '';
    const devUnlimitedRaw = Deno.env.get('DEV_UNLIMITED_EMAILS') || '';
    const adminEmailsRaw = Deno.env.get('ADMIN_EMAILS') || '';
    const devUnlimitedEmails = devUnlimitedRaw.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
    const adminEmails = adminEmailsRaw.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
    const isDevBypass = devUnlimitedEmails.includes(userEmail) || adminEmails.includes(userEmail);
    
    const plan = isDevBypass ? 'dev_unlimited' : (profile?.plan || 'free');
    const dailyLimit = DAILY_LIMITS[plan] ?? DAILY_LIMITS.free;

    // Block free users from ALL video actions (except status check for their own videos)
    if (plan === 'free' && !isDevBypass && action !== 'status' && action !== 'sign') {
      console.log(`[${requestId}] Free user blocked from video: ${user.id}`);
      return errorResponse(
        "VIDEO_NOT_AVAILABLE_FREE",
        "Video generation is only available for Premium users.",
        "Video yaratish faqat Premium foydalanuvchilar uchun mavjud.",
        403
      );
    }

    // ==========================================
    // ACTION: SIGN (refresh signed URL)
    // ==========================================
    if (action === "sign") {
      const { outputVideoPath } = body;

      if (!outputVideoPath || typeof outputVideoPath !== "string") {
        return errorResponse(
          "INVALID_PATH",
          "outputVideoPath is required",
          "Video yo'li kiritilmagan",
          400
        );
      }

      // Verify the path belongs to this user (must start with user.id/)
      if (!outputVideoPath.startsWith(`${user.id}/`)) {
        return errorResponse(
          "ACCESS_DENIED",
          "You do not have access to this video",
          "Bu videoga kirishingiz mumkin emas",
          403
        );
      }

      // Generate signed URL
      const { data: signedData, error: signError } = await supabase.storage
        .from("video-generations")
        .createSignedUrl(outputVideoPath, SIGNED_URL_EXPIRY_SECONDS);

      if (signError || !signedData?.signedUrl) {
        console.error(`[${requestId}] Sign URL error:`, signError);
        return errorResponse(
          "SIGN_FAILED",
          "Failed to generate signed URL",
          "Havola yaratishda xatolik",
          500
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          outputVideoUrl: signedData.signedUrl,
          expiresIn: SIGNED_URL_EXPIRY_SECONDS,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // ACTION: START
    // ==========================================
    if (action === "start") {
      const { prompt, negativePrompt, params = {}, assets = [] } = body;

      if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        return errorResponse(
          "PROMPT_REQUIRED",
          "Prompt is required",
          "Prompt kiritilmagan",
          400
        );
      }

      // ==========================================
      // A1: PER-USER COOLDOWN CHECK
      // ==========================================
      if (!isDevBypass) {
        const cooldownTime = new Date(Date.now() - VIDEO_COOLDOWN_SECONDS * 1000).toISOString();
        const { data: recentGen } = await supabase
          .from("video_generations")
          .select("created_at")
          .eq("user_id", user.id)
          .in("status", ["queued", "running", "completed"])
          .gte("created_at", cooldownTime)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentGen) {
          const lastGenTime = new Date(recentGen.created_at).getTime();
          const elapsed = Math.floor((Date.now() - lastGenTime) / 1000);
          const remaining = Math.max(0, VIDEO_COOLDOWN_SECONDS - elapsed);
          
          console.log(`[${requestId}] Cooldown active: ${remaining}s remaining`);
          return errorResponse(
            "VIDEO_COOLDOWN",
            "Please wait before generating another video.",
            "Keyingi video yaratishdan oldin biroz kuting.",
            429,
            { retryAfterSec: remaining }
          );
        }
      }

      // ==========================================
      // A2: GLOBAL CONCURRENCY CAP
      // ==========================================
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const { count: activeJobsCount } = await supabase
        .from("video_generations")
        .select("*", { count: "exact", head: true })
        .in("status", ["queued", "running", "starting"])
        .gte("created_at", twoHoursAgo);

      const activeJobs = activeJobsCount ?? 0;
      if (activeJobs >= VIDEO_GLOBAL_CONCURRENCY_CAP && !isDevBypass) {
        console.log(`[${requestId}] Global concurrency cap reached: ${activeJobs}/${VIDEO_GLOBAL_CONCURRENCY_CAP}`);
        return errorResponse(
          "VIDEO_BUSY_TRY_LATER",
          "Video generation is busy right now. Try again in a few minutes.",
          "Hozir video yaratish band. Bir necha daqiqadan keyin urinib ko'ring.",
          503
        );
      }

      // ==========================================
      // A3: PARAM VALIDATION & CAPPING
      // ==========================================
      const requestedWidth = params.width || 768;
      const requestedHeight = params.height || 432;
      
      // Validate resolution
      const isValidResolution = ALLOWED_RESOLUTIONS.some(
        r => r.width === requestedWidth && r.height === requestedHeight
      );
      
      if (!isValidResolution && !isDevBypass) {
        console.log(`[${requestId}] Invalid resolution: ${requestedWidth}x${requestedHeight}`);
        return errorResponse(
          "VIDEO_PARAMS_INVALID",
          `Invalid resolution. Allowed: ${ALLOWED_RESOLUTIONS.map(r => `${r.width}x${r.height}`).join(", ")}`,
          `Noto'g'ri o'lcham. Ruxsat etilgan: ${ALLOWED_RESOLUTIONS.map(r => `${r.width}x${r.height}`).join(", ")}`,
          400
        );
      }

      // Validate and cap FPS
      let fps = params.fps || 24;
      if (!ALLOWED_FPS.includes(fps) && !isDevBypass) {
        fps = 24; // Default to 24 if invalid
      }

      // Validate and cap duration
      let durationSeconds = params.duration_seconds || 5;
      if (durationSeconds > VIDEO_MAX_SECONDS && !isDevBypass) {
        console.log(`[${requestId}] Duration capped: ${durationSeconds} -> ${VIDEO_MAX_SECONDS}`);
        durationSeconds = VIDEO_MAX_SECONDS;
      }

      // Validate and cap steps
      let steps = params.steps || 30;
      if (steps > VIDEO_MAX_STEPS && !isDevBypass) {
        console.log(`[${requestId}] Steps capped: ${steps} -> ${VIDEO_MAX_STEPS}`);
        steps = VIDEO_MAX_STEPS;
      }

      // Validate guidance_scale (max 8.0)
      let guidanceScale = params.guidance_scale || 7.5;
      if (guidanceScale > 8.0 && !isDevBypass) {
        guidanceScale = 8.0;
      }

      // Validate motion_strength (0.0-1.0)
      let motionStrength = params.motion_strength ?? 0.7;
      if (motionStrength < 0) motionStrength = 0;
      if (motionStrength > 1) motionStrength = 1;

      // ==========================================
      // DAILY LIMIT CHECK
      // ==========================================
      if (!isDevBypass && dailyLimit !== -1) {
        const now = new Date();
        const startOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
        const endOfDayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0));
        
        const { count } = await supabase
          .from("video_generations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", startOfDayUTC.toISOString())
          .lt("created_at", endOfDayUTC.toISOString());

        const usedCount = count ?? 0;
        if (usedCount >= dailyLimit) {
          console.log(`[${requestId}] Daily limit reached: ${usedCount}/${dailyLimit}`);
          return errorResponse(
            "VIDEO_DAILY_LIMIT",
            `Daily video limit reached (${usedCount}/${dailyLimit}). Resets at midnight UTC.`,
            `Bugungi video limiti tugadi (${usedCount}/${dailyLimit}). Yarim kechada yangilanadi.`,
            429,
            { used: usedCount, limit: dailyLimit }
          );
        }
      }

      // Insert generation record with validated params
      const validatedParams = {
        ...params,
        width: requestedWidth,
        height: requestedHeight,
        fps,
        duration_seconds: durationSeconds,
        steps,
        guidance_scale: guidanceScale,
        motion_strength: motionStrength,
      };

      const { data: generation, error: insertError } = await supabase
        .from("video_generations")
        .insert({
          user_id: user.id,
          status: "queued",
          prompt: prompt.trim(),
          negative_prompt: negativePrompt?.trim() || null,
          params: validatedParams,
          width: requestedWidth,
          height: requestedHeight,
          fps,
          duration_seconds: durationSeconds,
          seed: params.seed || Math.floor(Math.random() * 2147483647),
        })
        .select()
        .single();

      if (insertError || !generation) {
        console.error(`[${requestId}] Insert error:`, insertError);
        return errorResponse(
          "INSERT_FAILED",
          "Failed to create video generation record",
          "Video yaratishni boshlashda xatolik",
          500
        );
      }

      console.log(`[${requestId}] Generation created: ${generation.id}`);

      // Build RunPod input payload with validated params
      const runpodInput: Record<string, any> = {
        prompt: prompt.trim(),
        negative_prompt: negativePrompt?.trim() || "",
        width: requestedWidth,
        height: requestedHeight,
        num_frames: Math.round(durationSeconds * fps),
        fps,
        seed: generation.seed,
        num_inference_steps: steps,
        guidance_scale: guidanceScale,
        motion_strength: motionStrength,
      };

      // Add assets if provided
      if (assets && assets.length > 0) {
        runpodInput.assets = assets;
      }

      console.log(`[${requestId}] RunPod input:`, JSON.stringify(runpodInput));

      // Call RunPod /run
      const runpodUrl = `https://api.runpod.ai/v2/${runpodEndpointId}/run`;
      const runpodResponse = await fetch(runpodUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${runpodApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input: runpodInput }),
      });

      const responseText = await runpodResponse.text();
      console.log(`[${requestId}] RunPod response status: ${runpodResponse.status}, body: ${responseText}`);

      let runpodData;
      try {
        runpodData = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error(`[${requestId}] Failed to parse RunPod response:`, parseError);
        await supabase
          .from("video_generations")
          .update({
            status: "failed",
            error: `RunPod response parse error: ${responseText.slice(0, 200)}`,
          })
          .eq("id", generation.id);

        return errorResponse(
          "RUNPOD_PARSE_ERROR",
          "Failed to parse RunPod response",
          "RunPod javobini o'qib bo'lmadi",
          500
        );
      }

      if (!runpodResponse.ok || runpodData.error) {
        const statusCode = runpodResponse.status;
        let errorCode = "RUNPOD_ERROR";
        let messageEn = "RunPod error";
        let messageUz = "RunPod xatosi";
        
        if (statusCode === 401 || statusCode === 403) {
          errorCode = "RUNPOD_AUTH_ERROR";
          messageEn = "RunPod authorization error (API key)";
          messageUz = "RunPod avtorizatsiya xatosi (API key)";
        } else if (statusCode === 404) {
          errorCode = "RUNPOD_NOT_FOUND";
          messageEn = "RunPod endpoint not found";
          messageUz = "RunPod endpoint topilmadi";
        } else if (statusCode === 429) {
          errorCode = "RUNPOD_RATE_LIMIT";
          messageEn = "RunPod rate limit exceeded. Try again later.";
          messageUz = "RunPod limit: juda ko'p so'rov. Keyinroq urinib ko'ring.";
        } else if (statusCode >= 500) {
          errorCode = "RUNPOD_SERVER_ERROR";
          messageEn = "RunPod server error. Try again later.";
          messageUz = "RunPod server xatosi. Keyinroq urinib ko'ring.";
        }

        await supabase
          .from("video_generations")
          .update({
            status: "failed",
            error: `${messageEn} [${statusCode}]`,
          })
          .eq("id", generation.id);

        return errorResponse(errorCode, messageEn, messageUz, statusCode >= 400 && statusCode < 600 ? statusCode : 500);
      }

      // Update generation with RunPod job ID
      await supabase
        .from("video_generations")
        .update({
          runpod_job_id: runpodData.id,
          status: "running",
        })
        .eq("id", generation.id);

      return new Response(
        JSON.stringify({
          ok: true,
          generationId: generation.id,
          runpodJobId: runpodData.id,
          status: "running",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // ACTION: STATUS
    // ==========================================
    if (action === "status") {
      const { generationId } = body;

      if (!generationId) {
        return errorResponse(
          "GENERATION_ID_REQUIRED",
          "generationId is required",
          "generationId talab qilinadi",
          400
        );
      }

      // Load generation (must belong to user)
      const { data: generation, error: fetchError } = await supabase
        .from("video_generations")
        .select("*")
        .eq("id", generationId)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !generation) {
        return errorResponse(
          "VIDEO_NOT_FOUND",
          "Video not found",
          "Video topilmadi",
          404
        );
      }

      // If already completed or failed, return cached status
      if (["completed", "failed", "canceled"].includes(generation.status)) {
        let outputVideoUrl = null;
        if (generation.output_video_path) {
          const { data: signedData } = await supabase.storage
            .from("video-generations")
            .createSignedUrl(generation.output_video_path, SIGNED_URL_EXPIRY_SECONDS);
          outputVideoUrl = signedData?.signedUrl;
        }

        return new Response(
          JSON.stringify({
            ok: true,
            status: generation.status,
            progress: generation.progress || (generation.status === "completed" ? 100 : 0),
            error: generation.error,
            outputVideoPath: generation.output_video_path,
            outputVideoUrl,
            expiresIn: SIGNED_URL_EXPIRY_SECONDS,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Poll RunPod status
      if (!generation.runpod_job_id) {
        return errorResponse(
          "RUNPOD_JOB_ID_MISSING",
          "RunPod job ID not found",
          "RunPod job ID topilmadi",
          400
        );
      }

      const statusUrl = `https://api.runpod.ai/v2/${runpodEndpointId}/status/${generation.runpod_job_id}`;
      const statusResponse = await fetch(statusUrl, {
        headers: { "Authorization": `Bearer ${runpodApiKey}` },
      });

      const statusText = await statusResponse.text();
      console.log(`[${requestId}] RunPod status response: ${statusResponse.status}, body: ${statusText}`);

      if (!statusResponse.ok) {
        const statusCode = statusResponse.status;
        let errorCode = "RUNPOD_STATUS_ERROR";
        let messageEn = "Failed to get RunPod status";
        let messageUz = "RunPod holatini olishda xatolik";
        
        if (statusCode === 401 || statusCode === 403) {
          errorCode = "RUNPOD_AUTH_ERROR";
          messageEn = "RunPod authorization error";
          messageUz = "RunPod avtorizatsiya xatosi";
        } else if (statusCode === 404) {
          errorCode = "RUNPOD_JOB_NOT_FOUND";
          messageEn = "RunPod job not found";
          messageUz = "RunPod job topilmadi";
        }

        return errorResponse(errorCode, messageEn, messageUz, statusCode);
      }

      let statusData;
      try {
        statusData = statusText ? JSON.parse(statusText) : {};
      } catch (parseError) {
        console.error(`[${requestId}] Failed to parse RunPod status:`, parseError);
        return errorResponse(
          "RUNPOD_STATUS_PARSE_ERROR",
          "Failed to parse RunPod status",
          "RunPod holatini o'qib bo'lmadi",
          500
        );
      }

      // Map RunPod status to our status
      let newStatus = generation.status;
      let progress = generation.progress || 0;
      let error = generation.error;
      let outputVideoPath = generation.output_video_path;

      if (statusData.status === "COMPLETED") {
        newStatus = "uploading"; // Intermediate state while we process
        progress = 90;

        // Get output video URL from RunPod
        const output = statusData.output;
        let videoUrl: string | null = null;

        // Log output structure for debugging
        const outputKeys = output ? Object.keys(output) : [];
        console.log(`[${requestId}] RunPod output keys: ${outputKeys.join(", ") || "null"}`);

        // DETECT ECHO/TEST ENDPOINT
        const isEchoEndpoint = output && (
          output.echo !== undefined ||
          (output.ok === true && outputKeys.length <= 2 && !output.video_url && !output.url && !output.video && !output.video_base64)
        );

        if (isEchoEndpoint) {
          console.error(`[${requestId}] ECHO ENDPOINT DETECTED`);
          newStatus = "failed";
          error = "ECHO_ENDPOINT";
          
          await supabase
            .from("video_generations")
            .update({ status: "failed", error })
            .eq("id", generation.id);

          return errorResponse(
            "ECHO_ENDPOINT",
            "RunPod endpoint is in test/echo mode. Deploy an LTX video worker.",
            "RunPod endpoint test/echo rejimida. LTX Video worker o'rnatilishi kerak.",
            500
          );
        }

        // Helper functions
        const decodeBase64ToBytes = (base64String: string): Uint8Array => {
          const cleaned = base64String.replace(/^data:video\/[a-zA-Z0-9]+;base64,/, '');
          const binaryString = atob(cleaned);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes;
        };

        const findBase64Video = (out: any): string | null => {
          if (!out) return null;
          if (out.video_base64) return out.video_base64;
          if (out.videoBase64) return out.videoBase64;
          if (Array.isArray(out) && out[0]?.video_base64) return out[0].video_base64;
          if (Array.isArray(out) && out[0]?.videoBase64) return out[0].videoBase64;
          if (out.output?.video_base64) return out.output.video_base64;
          if (out.result?.video_base64) return out.result.video_base64;
          return null;
        };

        if (output) {
          if (typeof output === "string" && (output.startsWith("http") || output.startsWith("/"))) {
            videoUrl = output;
          } else if (output.video_url) {
            videoUrl = output.video_url;
          } else if (output.url && typeof output.url === "string") {
            videoUrl = output.url;
          } else if (output.video && typeof output.video === "string") {
            videoUrl = output.video;
          } else if (output.output?.video_url) {
            videoUrl = output.output.video_url;
          } else if (output.result?.video_url) {
            videoUrl = output.result.video_url;
          } else if (output.file_url) {
            videoUrl = output.file_url;
          } else if (output.download_url) {
            videoUrl = output.download_url;
          }
        }

        const base64Video = findBase64Video(output);

        if (!videoUrl && !base64Video) {
          console.error(`[${requestId}] No video URL or base64 found`);
          error = `Video topilmadi. Topilgan kalitlar: ${outputKeys.join(", ") || "bo'sh"}`;
          newStatus = "failed";
        }

        if (videoUrl) {
          console.log(`[${requestId}] Downloading video from: ${videoUrl}`);
          
          try {
            const videoResponse = await fetch(videoUrl);
            if (videoResponse.ok) {
              const videoBytes = new Uint8Array(await videoResponse.arrayBuffer());
              console.log(`[${requestId}] Video downloaded: ${videoBytes.length} bytes`);

              const now = new Date();
              const year = now.getFullYear();
              const month = String(now.getMonth() + 1).padStart(2, "0");
              outputVideoPath = `${user.id}/${year}/${month}/${generation.id}.mp4`;

              const { error: uploadError } = await supabase.storage
                .from("video-generations")
                .upload(outputVideoPath, videoBytes, {
                  contentType: "video/mp4",
                  upsert: true,
                });

              if (uploadError) {
                console.error(`[${requestId}] Upload error:`, uploadError);
                error = "Video saqlashda xatolik";
                newStatus = "failed";
              } else {
                console.log(`[${requestId}] Video uploaded to: ${outputVideoPath}`);
                newStatus = "completed";
                progress = 100;
              }
            } else {
              console.error(`[${requestId}] Video download failed:`, videoResponse.status);
              error = "Video yuklab olishda xatolik";
              newStatus = "failed";
            }
          } catch (downloadError) {
            console.error(`[${requestId}] Video download error:`, downloadError);
            error = "Video yuklab olishda xatolik";
            newStatus = "failed";
          }
        } else if (base64Video) {
          console.log(`[${requestId}] Processing base64 video`);
          try {
            const videoBytes = decodeBase64ToBytes(base64Video);
            
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, "0");
            outputVideoPath = `${user.id}/${year}/${month}/${generation.id}.mp4`;

            const { error: uploadError } = await supabase.storage
              .from("video-generations")
              .upload(outputVideoPath, videoBytes, {
                contentType: "video/mp4",
                upsert: true,
              });

            if (uploadError) {
              console.error(`[${requestId}] Base64 upload error:`, uploadError);
              error = "Video saqlashda xatolik";
              newStatus = "failed";
            } else {
              console.log(`[${requestId}] Base64 video uploaded`);
              newStatus = "completed";
              progress = 100;
            }
          } catch (base64Error) {
            console.error(`[${requestId}] Base64 decode error:`, base64Error);
            error = "Video dekodlashda xatolik";
            newStatus = "failed";
          }
        }
      } else if (statusData.status === "FAILED") {
        newStatus = "failed";
        error = statusData.error || "RunPod xatosi";
      } else if (["IN_PROGRESS", "RUNNING"].includes(statusData.status)) {
        newStatus = "processing";
        if (statusData.progress) {
          progress = Math.min(85, statusData.progress);
        }
      } else if (["IN_QUEUE", "QUEUED"].includes(statusData.status)) {
        newStatus = "queued";
        progress = 5;
      }

      // Update generation in DB
      await supabase
        .from("video_generations")
        .update({
          status: newStatus,
          progress,
          error,
          output_video_path: outputVideoPath,
          runpod_status: statusData,
        })
        .eq("id", generation.id);

      // Generate signed URL if completed
      let outputVideoUrl = null;
      if (outputVideoPath && newStatus === "completed") {
        const { data: signedData } = await supabase.storage
          .from("video-generations")
          .createSignedUrl(outputVideoPath, SIGNED_URL_EXPIRY_SECONDS);
        outputVideoUrl = signedData?.signedUrl;
      }

      return new Response(
        JSON.stringify({
          ok: true,
          status: newStatus,
          progress,
          error,
          outputVideoPath,
          outputVideoUrl,
          expiresIn: SIGNED_URL_EXPIRY_SECONDS,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // ACTION: CANCEL
    // ==========================================
    if (action === "cancel") {
      const { generationId } = body;

      if (!generationId) {
        return errorResponse(
          "GENERATION_ID_REQUIRED",
          "generationId is required",
          "generationId talab qilinadi",
          400
        );
      }

      const { data: generation, error: fetchError } = await supabase
        .from("video_generations")
        .select("*")
        .eq("id", generationId)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !generation) {
        return errorResponse(
          "VIDEO_NOT_FOUND",
          "Video not found",
          "Video topilmadi",
          404
        );
      }

      // Try to cancel RunPod job (best effort)
      if (generation.runpod_job_id) {
        try {
          const cancelUrl = `https://api.runpod.ai/v2/${runpodEndpointId}/cancel/${generation.runpod_job_id}`;
          await fetch(cancelUrl, {
            method: "POST",
            headers: { "Authorization": `Bearer ${runpodApiKey}` },
          });
        } catch (cancelError) {
          console.log(`[${requestId}] Cancel request failed (non-critical):`, cancelError);
        }
      }

      await supabase
        .from("video_generations")
        .update({ status: "canceled" })
        .eq("id", generation.id);

      return new Response(
        JSON.stringify({ ok: true, status: "canceled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return errorResponse(
      "UNKNOWN_ACTION",
      "Unknown action",
      "Noma'lum amal",
      400
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Server xatosi";
    console.error(`[requestId] Error:`, error);
    return errorResponse(
      "SERVER_ERROR",
      errorMessage,
      "Server xatosi",
      500
    );
  }
});
