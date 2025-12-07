import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIREWORKS_API_URL = "https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-1-schnell-fp8/text_to_image";
const ALLOWED_ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:5", "5:4", "3:4", "4:3", "3:2", "2:3"];
const MAX_PROMPT_LENGTH = 250;

// Detect if text contains non-English characters
function needsTranslation(text: string): boolean {
  const nonEnglishPattern = /[а-яА-ЯёЁ\u0400-\u04FF'ʻʼğüşöçıİ]/;
  return nonEnglishPattern.test(text);
}

// Translate prompt to English using Lovable AI Gateway
async function translateToEnglish(prompt: string, requestId: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.log(`[${requestId}] No LOVABLE_API_KEY, skipping translation`);
    return prompt;
  }

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
          {
            role: "system",
            content: "You are a translator. Translate the user's text to natural English for an image generation model. Keep the meaning. Don't add new content. Return ONLY the translated text, nothing else.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.3,
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
      negativePrompt = "",
      aspectRatio = "1:1",
      guidanceScale = 3.5,
      steps = 4,
      seed = 0,
      chatId,
      attachToChat = false,
    } = body;

    console.log(`[${requestId}] Prompt: "${prompt}", aspectRatio: ${aspectRatio}`);

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "Prompt kiriting", requestId }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate aspect ratio
    const validAspectRatio = ALLOWED_ASPECT_RATIOS.includes(aspectRatio) ? aspectRatio : "1:1";

    // Check user limits
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();

    const isPremium = profile?.plan && ["premium", "beta_premium", "dev_unlimited"].includes(profile.plan);
    const dailyLimit = isPremium ? 20 : 5;

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

    // Clean and limit prompt
    let promptUz = prompt.trim();
    promptUz = promptUz.replace(/--ar\s*\d+:\d+/gi, "").trim();
    promptUz = promptUz.replace(/Style:\s*/gi, "").trim();

    if (promptUz.length > MAX_PROMPT_LENGTH) {
      promptUz = promptUz.slice(0, MAX_PROMPT_LENGTH).trim();
      console.log(`[${requestId}] Prompt truncated to ${MAX_PROMPT_LENGTH} chars`);
    }

    // Translate if needed
    let promptEn = promptUz;
    if (needsTranslation(promptUz)) {
      promptEn = await translateToEnglish(promptUz, requestId);
    }

    if (promptEn.length > MAX_PROMPT_LENGTH) {
      promptEn = promptEn.slice(0, MAX_PROMPT_LENGTH).trim();
      console.log(`[${requestId}] Translated prompt truncated`);
    }

    console.log(`[${requestId}] Calling Fireworks API with prompt: "${promptEn}"`);

    // Build Fireworks request
    const fireworksBody: Record<string, unknown> = {
      prompt: promptEn,
      aspect_ratio: validAspectRatio,
      guidance_scale: Math.min(Math.max(guidanceScale, 1), 10),
      num_inference_steps: Math.min(Math.max(steps, 1), 8),
    };

    if (negativePrompt) {
      fireworksBody.negative_prompt = negativePrompt;
    }
    if (seed > 0) {
      fireworksBody.seed = seed;
    }

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
        prompt_uz: promptUz,
        prompt_en: promptEn,
        negative_prompt_en: negativePrompt || null,
        aspect_ratio: validAspectRatio,
        guidance_scale: guidanceScale,
        num_inference_steps: steps,
        seed: seed > 0 ? seed : null,
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
          prompt_uz: promptUz,
          prompt_en: promptEn,
          aspect_ratio: validAspectRatio,
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

    // Generate signed URL
    const { data: signedUrlData } = await supabase.storage
      .from("user-files")
      .createSignedUrl(filePath, 3600);

    console.log(`[${requestId}] Success, returning signed URL`);

    return new Response(
      JSON.stringify({
        ok: true,
        fileUrl: signedUrlData?.signedUrl || "",
        fileName,
        generationId: imageId,
        prompt_en: promptEn,
        prompt_uz: promptUz,
        filePath,
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
