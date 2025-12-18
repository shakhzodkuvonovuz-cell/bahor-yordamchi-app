import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Daily limits per plan - FREE USERS CANNOT ACCESS VIDEO
const DAILY_LIMITS: Record<string, number> = {
  free: 0, // No video access for free users
  beta_premium: 5,
  premium: 10,
  dev_unlimited: -1, // unlimited
};

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
      return new Response(
        JSON.stringify({ ok: false, error: "Avtorizatsiya talab qilinadi" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: "Avtorizatsiya xatosi" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[${requestId}] User authenticated: ${user.id}`);

    const rawBody = await req.text();
    if (!rawBody) {
      return new Response(
        JSON.stringify({ ok: false, error: "So'rov tanasi bo'sh" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (e) {
      console.error(`[${requestId}] Invalid JSON body:`, rawBody);
      return new Response(
        JSON.stringify({ ok: false, error: "Noto'g'ri JSON", details: rawBody.slice(0, 500) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action } = body;

    if (!action || !["start", "status", "cancel"].includes(action)) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Block free users from ALL video actions
    if (plan === 'free' && !isDevBypass) {
      console.log(`[${requestId}] Free user blocked from video: ${user.id}`);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "VIDEO_NOT_AVAILABLE_FREE",
          messageUz: "Video yaratish faqat Premium foydalanuvchilar uchun mavjud.",
          messageEn: "Video generation is only available for Premium users.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==========================================
    // ACTION: START
    // ==========================================
    if (action === "start") {
      const { prompt, negativePrompt, params = {}, assets = [] } = body;

      if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        return new Response(
          JSON.stringify({ ok: false, error: "Prompt kiritilmagan" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check daily limit
      if (!isDevBypass && dailyLimit !== -1) {
        const today = new Date().toISOString().split("T")[0];
        const { count } = await supabase
          .from("video_generations")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", today);

        const usedCount = count ?? 0;
        if (usedCount >= dailyLimit) {
          console.log(`[${requestId}] Daily limit reached: ${usedCount}/${dailyLimit}`);
          return new Response(
            JSON.stringify({
              ok: false,
              error: `Bugungi video yaratish limiti tugadi (${usedCount}/${dailyLimit})`,
              type: "LIMIT_REACHED",
              used: usedCount,
              limit: dailyLimit,
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Insert generation record
      const { data: generation, error: insertError } = await supabase
        .from("video_generations")
        .insert({
          user_id: user.id,
          status: "queued",
          prompt: prompt.trim(),
          negative_prompt: negativePrompt?.trim() || null,
          params: params,
          width: params.width || 768,
          height: params.height || 512,
          fps: params.fps || 24,
          duration_seconds: params.duration_seconds || 5,
          seed: params.seed || Math.floor(Math.random() * 2147483647),
        })
        .select()
        .single();

      if (insertError || !generation) {
        console.error(`[${requestId}] Insert error:`, insertError);
        return new Response(
          JSON.stringify({ ok: false, error: "Video yaratishni boshlashda xatolik" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[${requestId}] Generation created: ${generation.id}`);

      // Build RunPod input payload
      const runpodInput = {
        prompt: prompt.trim(),
        negative_prompt: negativePrompt?.trim() || "",
        width: params.width || 768,
        height: params.height || 512,
        num_frames: Math.round((params.duration_seconds || 5) * (params.fps || 24)),
        fps: params.fps || 24,
        seed: generation.seed,
        num_inference_steps: params.steps || 30,
        guidance_scale: params.guidance_scale || 7.5,
        ...params, // Pass through all other params for flexibility
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

        return new Response(
          JSON.stringify({ ok: false, error: "RunPod javobini o'qib bo'lmadi", details: responseText.slice(0, 500) }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!runpodResponse.ok || runpodData.error) {
        const statusCode = runpodResponse.status;
        const runpodErrText =
          typeof runpodData?.error === "string"
            ? runpodData.error
            : responseText?.trim() || "";

        let friendly = "RunPod xatosi";
        if (statusCode === 401 || statusCode === 403) {
          friendly = "RunPod avtorizatsiya xatosi (API key)";
        } else if (statusCode === 404) {
          friendly = "RunPod endpoint topilmadi (endpoint ID noto'g'ri bo'lishi mumkin)";
        } else if (statusCode === 429) {
          friendly = "RunPod limit: juda ko'p so'rov (keyinroq urinib ko'ring)";
        } else if (statusCode >= 500) {
          friendly = "RunPod server xatosi (keyinroq urinib ko'ring)";
        }

        await supabase
          .from("video_generations")
          .update({
            status: "failed",
            error: `${friendly} [${statusCode}] ${runpodErrText.slice(0, 200)}`.trim(),
          })
          .eq("id", generation.id);

        return new Response(
          JSON.stringify({
            ok: false,
            error: friendly,
            runpodStatus: statusCode,
            details: runpodData,
            detailsText: responseText?.slice(0, 800) || null,
          }),
          {
            status: statusCode >= 400 && statusCode < 600 ? statusCode : 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
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
        return new Response(
          JSON.stringify({ ok: false, error: "generationId talab qilinadi" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        return new Response(
          JSON.stringify({ ok: false, error: "Video topilmadi" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If already completed or failed, return cached status
      if (["completed", "failed", "canceled"].includes(generation.status)) {
        let outputVideoUrl = null;
        if (generation.output_video_path) {
          const { data: signedData } = await supabase.storage
            .from("video-generations")
            .createSignedUrl(generation.output_video_path, 3600);
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
            runpodStatus: generation.runpod_status,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Poll RunPod status
      if (!generation.runpod_job_id) {
        return new Response(
          JSON.stringify({ ok: false, error: "RunPod job ID topilmadi" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        let friendly = "RunPod holatini olishda xatolik";
        if (statusCode === 401 || statusCode === 403) {
          friendly = "RunPod avtorizatsiya xatosi (API key)";
        } else if (statusCode === 404) {
          friendly = "RunPod endpoint/job topilmadi";
        } else if (statusCode === 429) {
          friendly = "RunPod limit: juda ko'p so'rov (keyinroq urinib ko'ring)";
        } else if (statusCode >= 500) {
          friendly = "RunPod server xatosi (keyinroq urinib ko'ring)";
        }

        return new Response(
          JSON.stringify({
            ok: false,
            error: friendly,
            runpodStatus: statusCode,
            detailsText: statusText?.slice(0, 800) || null,
          }),
          {
            status: statusCode,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      let statusData;
      try {
        statusData = statusText ? JSON.parse(statusText) : {};
      } catch (parseError) {
        console.error(`[${requestId}] Failed to parse RunPod status:`, parseError);
        return new Response(
          JSON.stringify({ ok: false, error: "RunPod holatini o'qib bo'lmadi", details: statusText.slice(0, 500) }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Map RunPod status to our status
      let newStatus = generation.status;
      let progress = generation.progress || 0;
      let error = generation.error;
      let outputVideoPath = generation.output_video_path;

      if (statusData.status === "COMPLETED") {
        newStatus = "completed";
        progress = 100;

        // Get output video URL from RunPod
        const output = statusData.output;
        let videoUrl: string | null = null;

        // Log output structure for debugging
        const outputKeys = output ? Object.keys(output) : [];
        console.log(`[${requestId}] RunPod output keys: ${outputKeys.join(", ") || "null"}`);
        console.log(`[${requestId}] RunPod output: ${JSON.stringify(output)?.slice(0, 500)}`);

        // DETECT ECHO/TEST ENDPOINT
        // If output contains "echo" key or only has "ok: true" without video fields,
        // this is a test/echo endpoint that doesn't actually generate videos
        const isEchoEndpoint = output && (
          output.echo !== undefined ||
          (output.ok === true && outputKeys.length <= 2 && !output.video_url && !output.url && !output.video && !output.video_base64)
        );

        if (isEchoEndpoint) {
          console.error(`[${requestId}] ECHO ENDPOINT DETECTED - no real video generation`);
          newStatus = "failed";
          error = "ECHO_ENDPOINT: RunPod endpoint hozircha test/echo rejimida. Video yaratish uchun LTX Video worker o'rnatilishi kerak.";
          
          // Update DB with detailed error
          await supabase
            .from("video_generations")
            .update({
              status: "failed",
              error: error,
              runpod_status: statusData,
            })
            .eq("id", generation.id);

          return new Response(
            JSON.stringify({
              ok: false,
              status: "failed",
              errorCode: "ECHO_ENDPOINT",
              error: error,
              messageUz: "RunPod endpoint hozircha test/echo rejimida. Video qaytarmayapti. LTX Video worker o'rnatilmagan.",
              messageEn: "Your RunPod endpoint is a test/echo worker and does not generate video. Deploy an LTX video worker that returns a video file/URL.",
              runpodOutput: output,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Helper: decode base64 (handles plain and data URL prefix)
        const decodeBase64ToBytes = (base64String: string): Uint8Array => {
          // Strip data URL prefix if present (e.g., data:video/mp4;base64,...)
          const cleaned = base64String.replace(/^data:video\/[a-zA-Z0-9]+;base64,/, '');
          const binaryString = atob(cleaned);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes;
        };

        // Helper: find video_base64 in various output formats
        const findBase64Video = (out: any): string | null => {
          if (!out) return null;
          // Direct fields
          if (out.video_base64) return out.video_base64;
          if (out.videoBase64) return out.videoBase64;
          // Array format
          if (Array.isArray(out) && out[0]?.video_base64) return out[0].video_base64;
          if (Array.isArray(out) && out[0]?.videoBase64) return out[0].videoBase64;
          // Nested output
          if (out.output?.video_base64) return out.output.video_base64;
          if (out.output?.videoBase64) return out.output.videoBase64;
          // Result nested
          if (out.result?.video_base64) return out.result.video_base64;
          if (out.result?.videoBase64) return out.result.videoBase64;
          return null;
        };

        if (output) {
          // Handle different output formats from various video models
          // Priority order: video_url > url > video > nested paths > result string
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
          } else if (output.output?.url) {
            videoUrl = output.output.url;
          } else if (output.result?.video_url) {
            videoUrl = output.result.video_url;
          } else if (output.result?.url) {
            videoUrl = output.result.url;
          } else if (output.result && typeof output.result === "string" && output.result.startsWith("http")) {
            videoUrl = output.result;
          } else if (output.file_url) {
            videoUrl = output.file_url;
          } else if (output.download_url) {
            videoUrl = output.download_url;
          }
        }

        // Find base64 video data (tolerant parsing)
        const base64Video = findBase64Video(output);

        // If no video URL found and no base64, mark as failed with debug info
        if (!videoUrl && !base64Video) {
          console.error(`[${requestId}] No video URL or base64 found in output. Keys: ${outputKeys.join(", ") || "none"}`);
          error = `Video topilmadi. Kutilgan: video_url, url, video, video_base64, videoBase64. Topildi: ${outputKeys.join(", ") || "bo'sh"}`;
          newStatus = "failed";
        }

        if (videoUrl) {
          console.log(`[${requestId}] Downloading video from: ${videoUrl}`);
          
          try {
            // Fetch video from RunPod output URL
            const videoResponse = await fetch(videoUrl);
            if (videoResponse.ok) {
              const videoBytes = new Uint8Array(await videoResponse.arrayBuffer());
              console.log(`[${requestId}] Video downloaded: ${videoBytes.length} bytes`);

              // Upload to Supabase Storage
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
              } else {
                console.log(`[${requestId}] Video uploaded to: ${outputVideoPath}`);
              }
            } else {
              console.error(`[${requestId}] Video download failed:`, videoResponse.status);
              error = "Video yuklab olishda xatolik";
            }
          } catch (downloadError) {
            console.error(`[${requestId}] Video download error:`, downloadError);
            error = "Video yuklab olishda xatolik";
          }
        } else if (base64Video) {
          // Handle base64 output with robust decoding
          console.log(`[${requestId}] Processing base64 video (${base64Video.length} chars)`);
          try {
            const videoBytes = decodeBase64ToBytes(base64Video);
            console.log(`[${requestId}] Decoded ${videoBytes.length} bytes`);
            
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
            } else {
              console.log(`[${requestId}] Base64 video uploaded to: ${outputVideoPath}`);
            }
          } catch (base64Error) {
            console.error(`[${requestId}] Base64 decode error:`, base64Error);
            error = "Video dekodlashda xatolik: " + (base64Error instanceof Error ? base64Error.message : "Noma'lum xatolik");
          }
        }
      } else if (statusData.status === "FAILED") {
        newStatus = "failed";
        error = statusData.error || "RunPod xatosi";
      } else if (["IN_PROGRESS", "RUNNING", "IN_QUEUE", "QUEUED"].includes(statusData.status)) {
        newStatus = "running";
        // Extract progress if available
        if (statusData.progress) {
          progress = statusData.progress;
        }
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
          .createSignedUrl(outputVideoPath, 3600);
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
          runpodStatus: statusData,
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
        return new Response(
          JSON.stringify({ ok: false, error: "generationId talab qilinadi" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Load generation
      const { data: generation, error: fetchError } = await supabase
        .from("video_generations")
        .select("*")
        .eq("id", generationId)
        .eq("user_id", user.id)
        .single();

      if (fetchError || !generation) {
        return new Response(
          JSON.stringify({ ok: false, error: "Video topilmadi" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

      // Update status in DB
      await supabase
        .from("video_generations")
        .update({ status: "canceled" })
        .eq("id", generation.id);

      return new Response(
        JSON.stringify({ ok: true, status: "canceled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Server xatosi";
    console.error(`[${requestId}] Error:`, error);
    return new Response(
      JSON.stringify({ ok: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
