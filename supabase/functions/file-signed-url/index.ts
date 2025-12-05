import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fileId } = await req.json();
    
    if (!fileId) {
      return new Response(JSON.stringify({ ok: false, error: "fileId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get file record and verify ownership
    const { data: file, error: fileError } = await supabase
      .from("user_files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fileError || !file) {
      return new Response(JSON.stringify({ ok: false, error: "File not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate new signed URL
    const { data: signedUrlData, error: signError } = await supabase.storage
      .from(file.bucket)
      .createSignedUrl(file.path, 3600);

    if (signError) {
      console.error("[file-signed-url] Failed to create signed URL:", signError);
      return new Response(JSON.stringify({ ok: false, error: "Failed to generate URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        signed_url: signedUrlData.signedUrl,
        file: {
          id: file.id,
          title: file.title,
          mime_type: file.mime_type,
          size_bytes: file.size_bytes,
          tool: file.tool,
          created_at: file.created_at,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("[file-signed-url] Error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Xatolik yuz berdi",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
