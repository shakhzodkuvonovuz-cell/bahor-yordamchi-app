import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const runpodApiKey = Deno.env.get("RUNPOD_API_KEY");
    const runpodEndpointId = Deno.env.get("RUNPOD_LTXV_ENDPOINT_ID");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }
    if (!runpodApiKey || !runpodEndpointId) {
      throw new Error("Missing RunPod configuration");
    }

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request
    const { generation_id } = await req.json();
    if (!generation_id) {
      return new Response(JSON.stringify({ error: "generation_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch generation (RLS + explicit check)
    const { data: generation, error: fetchError } = await supabaseAdmin
      .from("video_generations")
      .select("*")
      .eq("id", generation_id)
      .single();

    if (fetchError || !generation) {
      return new Response(JSON.stringify({ error: "Generation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check ownership
    if (generation.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Not authorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already done or error, return current state
    if (generation.status === "done" || generation.status === "error") {
      return new Response(JSON.stringify({
        status: generation.status,
        output_video_url: generation.output_video_url,
        error: generation.error,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if we have a job ID to poll
    if (!generation.runpod_job_id) {
      return new Response(JSON.stringify({
        status: generation.status,
        message: "No RunPod job ID yet",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Poll RunPod status
    const runpodStatusUrl = `https://api.runpod.ai/v2/${runpodEndpointId}/status/${generation.runpod_job_id}`;
    const runpodRes = await fetch(runpodStatusUrl, {
      headers: { Authorization: `Bearer ${runpodApiKey}` },
    });

    if (!runpodRes.ok) {
      console.error("RunPod status error:", await runpodRes.text());
      return new Response(JSON.stringify({
        status: generation.status,
        error: "Failed to poll RunPod",
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const runpodData = await runpodRes.json();
    console.log("RunPod status response:", JSON.stringify(runpodData));

    // Map RunPod status to our status
    const runpodStatus = runpodData.status;
    let newStatus = generation.status;
    let errorMsg: string | null = null;
    let outputUrl: string | null = null;
    let outputPath: string | null = null;
    let progress: number | null = generation.progress;

    if (runpodStatus === "IN_QUEUE") {
      newStatus = "queued";
    } else if (runpodStatus === "IN_PROGRESS") {
      newStatus = "running";
      // Extract progress if available
      if (runpodData.output?.progress !== undefined) {
        progress = runpodData.output.progress;
      }
    } else if (runpodStatus === "COMPLETED") {
      // Job finished - download and store video
      const videoOutput = runpodData.output;
      
      // Handle different output formats
      let videoData: Uint8Array | null = null;
      let videoSourceUrl: string | null = null;

      if (videoOutput?.video_url) {
        videoSourceUrl = videoOutput.video_url;
      } else if (videoOutput?.video_base64) {
        // Decode base64 video
        const base64Data = videoOutput.video_base64;
        const binaryString = atob(base64Data);
        videoData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          videoData[i] = binaryString.charCodeAt(i);
        }
      } else if (typeof videoOutput === "string" && videoOutput.startsWith("http")) {
        videoSourceUrl = videoOutput;
      }

      // Download video if we have a URL
      if (videoSourceUrl && !videoData) {
        console.log("Downloading video from:", videoSourceUrl);
        const videoRes = await fetch(videoSourceUrl);
        if (!videoRes.ok) {
          throw new Error(`Failed to download video: ${videoRes.status}`);
        }
        const arrayBuffer = await videoRes.arrayBuffer();
        videoData = new Uint8Array(arrayBuffer);
      }

      if (!videoData) {
        throw new Error("No video data in RunPod response");
      }

      // Upload to storage
      const timestamp = Date.now();
      const storagePath = `${user.id}/videos/${generation_id}_${timestamp}.mp4`;
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from("video-generations")
        .upload(storagePath, videoData, {
          contentType: "video/mp4",
          upsert: true,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error(`Failed to upload video: ${uploadError.message}`);
      }

      // Create signed URL (valid for 7 days)
      const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from("video-generations")
        .createSignedUrl(storagePath, 7 * 24 * 60 * 60);

      if (signedError) {
        console.error("Signed URL error:", signedError);
        throw new Error(`Failed to create signed URL: ${signedError.message}`);
      }

      outputPath = storagePath;
      outputUrl = signedData.signedUrl;
      newStatus = "done";
      progress = 100;

    } else if (runpodStatus === "FAILED" || runpodStatus === "CANCELLED") {
      newStatus = "error";
      errorMsg = runpodData.error || `RunPod job ${runpodStatus.toLowerCase()}`;
    }

    // Update database
    const updateData: Record<string, unknown> = {
      status: newStatus,
      runpod_status: runpodData,
      updated_at: new Date().toISOString(),
    };

    if (progress !== null) updateData.progress = progress;
    if (errorMsg) updateData.error = errorMsg;
    if (outputPath) updateData.output_video_path = outputPath;
    if (outputUrl) updateData.output_video_url = outputUrl;

    const { error: updateError } = await supabaseAdmin
      .from("video_generations")
      .update(updateData)
      .eq("id", generation_id);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    return new Response(JSON.stringify({
      status: newStatus,
      progress,
      output_video_url: outputUrl,
      error: errorMsg,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("video-poll-job error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
