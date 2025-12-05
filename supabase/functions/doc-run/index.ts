import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tool definitions with limits
const TOOLS = {
  htmlpdf: { premium: false, freeDailyLimit: 2, premiumDailyLimit: 20 },
  imagepdf: { premium: false, freeDailyLimit: 2, premiumDailyLimit: 20 },
  merge: { premium: false, freeDailyLimit: 2, premiumDailyLimit: 20 },
  split: { premium: false, freeDailyLimit: 2, premiumDailyLimit: 20 },
  compress: { premium: false, freeDailyLimit: 2, premiumDailyLimit: 20 },
  watermark: { premium: false, freeDailyLimit: 2, premiumDailyLimit: 20 },
  pagenumber: { premium: false, freeDailyLimit: 2, premiumDailyLimit: 20 },
  ocr: { premium: true, freeDailyLimit: 0, premiumDailyLimit: 2, maxPages: 10 },
  officepdf: { premium: false, freeDailyLimit: 2, premiumDailyLimit: 20 },
  pdfjpg: { premium: false, freeDailyLimit: 2, premiumDailyLimit: 20 },
  rotate: { premium: false, freeDailyLimit: 2, premiumDailyLimit: 20 },
  protect: { premium: true, freeDailyLimit: 0, premiumDailyLimit: 5 },
  unlock: { premium: true, freeDailyLimit: 0, premiumDailyLimit: 5 },
  repair: { premium: true, freeDailyLimit: 0, premiumDailyLimit: 3 },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PAGES = 50;

interface ILoveAuthResponse {
  token: string;
}

interface ILoveStartResponse {
  server: string;
  task: string;
}

// iLoveAPI helper functions
async function iloveAuth(): Promise<string> {
  const publicKey = Deno.env.get("ILOVE_PUBLIC_KEY");
  const secretKey = Deno.env.get("ILOVE_SECRET_KEY");
  
  if (!publicKey || !secretKey) {
    throw new Error("iLoveAPI credentials not configured");
  }
  
  const response = await fetch("https://api.ilovepdf.com/v1/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_key: publicKey }),
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error("[iLoveAPI] Auth failed:", text);
    throw new Error("iLoveAPI authentication failed");
  }
  
  const data: ILoveAuthResponse = await response.json();
  return data.token;
}

async function iloveStart(token: string, tool: string): Promise<ILoveStartResponse> {
  const response = await fetch("https://api.ilovepdf.com/v1/start/" + tool, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error("[iLoveAPI] Start failed:", text);
    throw new Error("Failed to start iLoveAPI task");
  }
  
  return await response.json();
}

async function iloveUpload(
  token: string,
  server: string,
  task: string,
  file: Uint8Array,
  filename: string,
  mimeType?: string
): Promise<string> {
  // Create blob with explicit MIME type for proper handling
  const blob = new Blob([new Uint8Array(file)] as BlobPart[], { 
    type: mimeType || "application/octet-stream" 
  });
  const formData = new FormData();
  formData.append("task", task);
  formData.append("file", blob, filename);
  
  const response = await fetch(`https://${server}/v1/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error("[iLoveAPI] Upload failed:", text);
    throw new Error("Failed to upload file to iLoveAPI");
  }
  
  const data = await response.json();
  return data.server_filename;
}

// Upload from cloud URL - for htmlpdf this tells iLoveAPI to RENDER the URL as a webpage
async function iloveUploadFromUrl(
  token: string,
  server: string,
  task: string,
  url: string
): Promise<string> {
  console.log("[doc-run] Uploading URL to iLoveAPI:", url);
  
  const response = await fetch(`https://${server}/v1/upload`, {
    method: "POST",
    headers: { 
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ task, cloud_file: url }),
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error("[iLoveAPI] Cloud upload failed:", text);
    throw new Error("Failed to upload cloud file to iLoveAPI");
  }
  
  const data = await response.json();
  console.log("[doc-run] URL upload response:", JSON.stringify(data));
  return data.server_filename;
}

async function iloveProcess(
  token: string,
  server: string,
  task: string,
  tool: string,
  files: Array<{ server_filename: string; filename: string }>,
  options: Record<string, unknown> = {}
): Promise<void> {
  const body: Record<string, unknown> = {
    task,
    tool,
    files,
    ...options,
  };
  
  const response = await fetch(`https://${server}/v1/process`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error("[iLoveAPI] Process failed:", text);
    throw new Error("Failed to process file with iLoveAPI");
  }
}

async function iloveDownload(token: string, server: string, task: string): Promise<Uint8Array> {
  const response = await fetch(`https://${server}/v1/download/${task}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!response.ok) {
    const text = await response.text();
    console.error("[iLoveAPI] Download failed:", text);
    throw new Error("Failed to download file from iLoveAPI");
  }
  
  return new Uint8Array(await response.arrayBuffer());
}

// HTML template builder
function buildHtmlDocument(content: string, title: string, template: string): string {
  const styles = {
    clean: `
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 40px; color: #333; }
      h1, h2, h3 { color: #2c3e50; margin-top: 1.5em; }
      p { margin: 0.8em 0; }
      ul, ol { margin: 0.8em 0; padding-left: 2em; }
      table { border-collapse: collapse; width: 100%; margin: 1em 0; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f4f4f4; }
      code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
      pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }
      blockquote { border-left: 4px solid #3da9a1; margin: 1em 0; padding-left: 1em; color: #666; }
    `,
    assignment: `
      body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 2; margin: 1in; color: #000; }
      h1 { text-align: center; font-size: 14pt; margin-bottom: 1em; }
      h2 { font-size: 13pt; margin-top: 1.5em; }
      p { text-indent: 0.5in; margin: 0; text-align: justify; }
      ul, ol { margin: 1em 0; }
    `,
    report: `
      body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; margin: 0.75in; color: #333; }
      .header { border-bottom: 2px solid #3da9a1; padding-bottom: 10px; margin-bottom: 20px; }
      .header h1 { color: #3da9a1; margin: 0; }
      .header .date { color: #888; font-size: 10pt; }
      h2 { color: #2c3e50; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
      table { border-collapse: collapse; width: 100%; margin: 1em 0; }
      th { background-color: #3da9a1; color: white; }
      th, td { border: 1px solid #ddd; padding: 10px; }
    `,
  };

  const date = new Date().toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const style = styles[template as keyof typeof styles] || styles.clean;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${style}</style>
</head>
<body>
  ${template === "report" ? `<div class="header"><h1>${title}</h1><div class="date">${date}</div></div>` : ""}
  ${content}
</body>
</html>`;
}

// Sanitize HTML
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/on\w+="[^"]*"/gi, "")
    .replace(/on\w+='[^']*'/gi, "");
}

// Convert text to HTML
function textToHtml(text: string): string {
  return text
    .split("\n")
    .map((line) => `<p>${line.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
    .join("\n");
}

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

    const { tool, title, inputs } = await req.json();
    console.log(`[doc-run] User ${user.id}, tool: ${tool}, title: ${title}`);

    // Validate tool
    if (!TOOLS[tool as keyof typeof TOOLS]) {
      return new Response(JSON.stringify({ ok: false, error: "Invalid tool" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolConfig = TOOLS[tool as keyof typeof TOOLS];

    // Check user plan
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();

    const isPremium = profile?.plan && ["premium", "beta_premium", "dev_unlimited"].includes(profile.plan);

    // Check if tool requires premium
    if (toolConfig.premium && !isPremium) {
      return new Response(
        JSON.stringify({ ok: false, error: "Bu funksiya faqat Premium foydalanuvchilar uchun" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check daily limits
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabase
      .from("doc_jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("tool", tool)
      .gte("created_at", today);

    const dailyLimit = isPremium ? toolConfig.premiumDailyLimit : toolConfig.freeDailyLimit;
    if (count !== null && count >= dailyLimit) {
      return new Response(
        JSON.stringify({ ok: false, error: `Bugungi ${tool} limiti tugadi (${dailyLimit}/${dailyLimit})` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting: max 3 jobs in 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { count: recentCount } = await supabase
      .from("doc_jobs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", oneMinuteAgo);

    if (recentCount !== null && recentCount >= 3) {
      return new Response(
        JSON.stringify({ ok: false, error: "Juda tez so'rovlar. 1 daqiqa kuting." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from("doc_jobs")
      .insert({
        user_id: user.id,
        tool,
        status: "running",
        input: { title, ...inputs },
      })
      .select()
      .single();

    if (jobError) {
      console.error("[doc-run] Job creation failed:", jobError);
      throw new Error("Failed to create job");
    }

    try {
      // Authenticate with iLoveAPI
      const iloveToken = await iloveAuth();
      
      // Start task
      const { server, task } = await iloveStart(iloveToken, tool);

      // Update job with iLove details
      await supabase
        .from("doc_jobs")
        .update({ ilove_task: task, ilove_server: server })
        .eq("id", job.id);

      let outputBytes: Uint8Array;
      let outputFilename = `${title.replace(/[^a-zA-Z0-9-_]/g, "_")}.pdf`;

      // Process based on tool type
      if (tool === "htmlpdf") {
        const { contentType, content, template = "clean", options = {} } = inputs;
        
        // Convert content to HTML
        let htmlContent = contentType === "html" ? sanitizeHtml(content) : textToHtml(content);
        const fullHtml = buildHtmlDocument(htmlContent, title, template);
        
        console.log("[doc-run] HTML content length:", fullHtml.length);
        console.log("[doc-run] HTML preview:", fullHtml.substring(0, 200));
        
        // Create a temporary HTML document with a secure token
        // Generate random token for URL validation
        const tempToken = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        // Store the HTML document with the raw token (pdf-html will verify it)
        const { data: tempDoc, error: tempInsertError } = await supabase
          .from("temp_html_docs")
          .insert({
            user_id: user.id,
            token: tempToken, // Store raw token for now (pdf-html supports both)
            html: fullHtml,
            expires_at: expiresAt.toISOString(),
          })
          .select()
          .single();
        
        if (tempInsertError || !tempDoc) {
          console.error("[doc-run] Failed to create temp HTML doc:", tempInsertError);
          throw new Error("Failed to prepare HTML for processing");
        }
        
        // Construct the public URL that iLoveAPI will fetch
        // This must be the full URL to our pdf-html edge function
        const supabaseProjectUrl = Deno.env.get("SUPABASE_URL")!;
        const htmlUrl = `${supabaseProjectUrl}/functions/v1/pdf-html?id=${tempDoc.id}&token=${tempToken}`;
        console.log("[doc-run] HTML URL for iLoveAPI:", htmlUrl);
        
        // Use URL upload for htmlpdf - iLoveAPI will fetch and RENDER this URL as HTML
        const serverFilename = await iloveUploadFromUrl(iloveToken, server, task, htmlUrl);
        console.log("[doc-run] HTML uploaded via URL, server_filename:", serverFilename);
        
        // Process with htmlpdf tool - this converts the HTML webpage to PDF
        await iloveProcess(iloveToken, server, task, tool, [
          { server_filename: serverFilename, filename: "document.html" },
        ], {
          page_size: options.page_size || "A4",
          orientation: options.orientation || "portrait",
          margin: options.margin ?? 10,
          single_page: options.single_page || false,
        });
        
        outputBytes = await iloveDownload(iloveToken, server, task);
        console.log("[doc-run] PDF downloaded, size:", outputBytes.length, "bytes");
        
        // Clean up temp HTML doc
        await supabase.from("temp_html_docs").delete().eq("id", tempDoc.id);
        console.log("[doc-run] Cleaned up temp HTML doc:", tempDoc.id);

        

      } else if (tool === "imagepdf") {
        const { images, options = {} } = inputs;
        
        const uploadedFiles = [];
        for (const img of images) {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(img.bucket || "chat-attachments")
            .download(img.storagePath);
          
          if (downloadError) throw new Error(`Failed to download image: ${img.storagePath}`);
          
          const fileBytes = new Uint8Array(await fileData.arrayBuffer());
          if (fileBytes.length > MAX_FILE_SIZE) {
            throw new Error("Fayl hajmi juda katta (max 10MB)");
          }
          
          const filename = img.storagePath.split("/").pop() || "image.jpg";
          const serverFilename = await iloveUpload(iloveToken, server, task, fileBytes, filename);
          uploadedFiles.push({ server_filename: serverFilename, filename });
        }
        
        await iloveProcess(iloveToken, server, task, tool, uploadedFiles, {
          page_size: options.page_size || "A4",
          orientation: options.orientation || "portrait",
          margin: options.margin || 0,
        });
        
        outputBytes = await iloveDownload(iloveToken, server, task);
        
      } else if (tool === "merge") {
        const { pdfs } = inputs;
        
        const uploadedFiles = [];
        for (const pdf of pdfs) {
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(pdf.bucket || "user-files")
            .download(pdf.storagePath);
          
          if (downloadError) throw new Error(`Failed to download PDF: ${pdf.storagePath}`);
          
          const fileBytes = new Uint8Array(await fileData.arrayBuffer());
          const filename = pdf.storagePath.split("/").pop() || "document.pdf";
          const serverFilename = await iloveUpload(iloveToken, server, task, fileBytes, filename);
          uploadedFiles.push({ server_filename: serverFilename, filename });
        }
        
        await iloveProcess(iloveToken, server, task, tool, uploadedFiles);
        outputBytes = await iloveDownload(iloveToken, server, task);
        
      } else if (tool === "split" || tool === "compress" || tool === "watermark" || tool === "pagenumber" || tool === "ocr" || tool === "rotate" || tool === "protect" || tool === "unlock" || tool === "repair") {
        const { pdf, ...toolOptions } = inputs;
        
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(pdf.bucket || "user-files")
          .download(pdf.storagePath);
        
        if (downloadError) throw new Error(`Failed to download PDF: ${pdf.storagePath}`);
        
        const fileBytes = new Uint8Array(await fileData.arrayBuffer());
        if (fileBytes.length > MAX_FILE_SIZE) {
          throw new Error("Fayl hajmi juda katta (max 10MB)");
        }
        
        const filename = pdf.storagePath.split("/").pop() || "document.pdf";
        const serverFilename = await iloveUpload(iloveToken, server, task, fileBytes, filename);
        
        const processOptions: Record<string, unknown> = {};
        
        if (tool === "split") {
          processOptions.ranges = toolOptions.ranges || "1";
        } else if (tool === "compress") {
          processOptions.compression_level = toolOptions.level || "recommended";
        } else if (tool === "watermark") {
          processOptions.text = toolOptions.text || "Bahor AI";
          processOptions.transparency = toolOptions.opacity || 50;
          processOptions.vertical_position = "middle";
          processOptions.horizontal_position = "center";
        } else if (tool === "pagenumber") {
          processOptions.facing_pages = false;
          processOptions.first_cover = false;
          processOptions.vertical_position = toolOptions.position?.includes("top") ? "top" : "bottom";
          processOptions.horizontal_position = toolOptions.position?.includes("left") ? "left" : 
                                                toolOptions.position?.includes("right") ? "right" : "center";
          processOptions.starting_number = toolOptions.start || 1;
        } else if (tool === "ocr") {
          processOptions.ocr_languages = [toolOptions.language || "eng"];
        } else if (tool === "rotate") {
          processOptions.degrees = toolOptions.degrees || 90;
        } else if (tool === "protect") {
          processOptions.password = toolOptions.password || "";
        } else if (tool === "unlock") {
          processOptions.password = toolOptions.password || "";
        }
        // repair has no extra options
        
        await iloveProcess(iloveToken, server, task, tool, [
          { server_filename: serverFilename, filename },
        ], processOptions);
        
        outputBytes = await iloveDownload(iloveToken, server, task);
        
      } else if (tool === "officepdf") {
        // Office to PDF conversion (docx, pptx, xlsx)
        const { file } = inputs;
        
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(file.bucket || "chat-attachments")
          .download(file.storagePath);
        
        if (downloadError) throw new Error(`Failed to download file: ${file.storagePath}`);
        
        const fileBytes = new Uint8Array(await fileData.arrayBuffer());
        if (fileBytes.length > MAX_FILE_SIZE) {
          throw new Error("Fayl hajmi juda katta (max 10MB)");
        }
        
        const filename = file.storagePath.split("/").pop() || "document";
        const mimeType = file.mimeType || "application/octet-stream";
        const serverFilename = await iloveUpload(iloveToken, server, task, fileBytes, filename, mimeType);
        
        await iloveProcess(iloveToken, server, task, tool, [
          { server_filename: serverFilename, filename },
        ]);
        
        outputBytes = await iloveDownload(iloveToken, server, task);
        
      } else if (tool === "pdfjpg") {
        // PDF to JPG conversion
        const { pdf, ...toolOptions } = inputs;
        
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(pdf.bucket || "user-files")
          .download(pdf.storagePath);
        
        if (downloadError) throw new Error(`Failed to download PDF: ${pdf.storagePath}`);
        
        const fileBytes = new Uint8Array(await fileData.arrayBuffer());
        if (fileBytes.length > MAX_FILE_SIZE) {
          throw new Error("Fayl hajmi juda katta (max 10MB)");
        }
        
        const filename = pdf.storagePath.split("/").pop() || "document.pdf";
        const serverFilename = await iloveUpload(iloveToken, server, task, fileBytes, filename);
        
        await iloveProcess(iloveToken, server, task, tool, [
          { server_filename: serverFilename, filename },
        ], {
          pdfjpg_mode: toolOptions.mode || "pages", // "pages" or "extract"
        });
        
        // pdfjpg returns a ZIP file with images
        outputBytes = await iloveDownload(iloveToken, server, task);
        outputFilename = `${title.replace(/[^a-zA-Z0-9-_]/g, "_")}.zip`;
        
      } else {
        throw new Error("Unsupported tool");
      }

      // Upload result to Supabase Storage
      const fileId = crypto.randomUUID();
      const isZip = outputFilename.endsWith(".zip");
      const ext = isZip ? "zip" : "pdf";
      const mimeType = isZip ? "application/zip" : "application/pdf";
      const storagePath = `${user.id}/${fileId}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("user-files")
        .upload(storagePath, outputBytes, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error("[doc-run] Storage upload failed:", uploadError);
        throw new Error("Failed to save file");
      }

      // Create user_files record
      const { data: fileRecord, error: fileError } = await supabase
        .from("user_files")
        .insert({
          id: fileId,
          user_id: user.id,
          tool,
          title,
          path: storagePath,
          size_bytes: outputBytes.length,
          mime_type: mimeType,
          meta: inputs,
        })
        .select()
        .single();

      if (fileError) {
        console.error("[doc-run] File record creation failed:", fileError);
        throw new Error("Failed to create file record");
      }

      // Update job as success
      await supabase
        .from("doc_jobs")
        .update({
          status: "success",
          result_file_id: fileId,
        })
        .eq("id", job.id);

      // Generate signed URL
      const { data: signedUrlData } = await supabase.storage
        .from("user-files")
        .createSignedUrl(storagePath, 3600);

      console.log(`[doc-run] Success: file ${fileId}, size ${outputBytes.length} bytes`);

      return new Response(
        JSON.stringify({
          ok: true,
          jobId: job.id,
          file: {
            id: fileId,
            title,
            mime_type: mimeType,
            size_bytes: outputBytes.length,
            signed_url: signedUrlData?.signedUrl,
            created_at: fileRecord.created_at,
            tool,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (processError) {
      console.error("[doc-run] Processing error:", processError);
      
      // Update job as error
      await supabase
        .from("doc_jobs")
        .update({
          status: "error",
          error_message: processError instanceof Error ? processError.message : "Unknown error",
        })
        .eq("id", job.id);

      throw processError;
    }
    
  } catch (error) {
    console.error("[doc-run] Error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Xatolik yuz berdi",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
