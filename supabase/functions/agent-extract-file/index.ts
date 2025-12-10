import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { fileId, storagePath, mimeType } = await req.json();

    if (!fileId || !storagePath) {
      return new Response(JSON.stringify({ error: "fileId and storagePath required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Extract] Processing file ${fileId}, path: ${storagePath}, mime: ${mimeType}`);

    // Update status to extracting
    await supabase
      .from("agent_files")
      .update({ extraction_status: "extracting" })
      .eq("id", fileId)
      .eq("user_id", user.id);

    let extractedText = "";
    let metadata: Record<string, any> = {};

    try {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("chat-attachments")
        .download(storagePath);

      if (downloadError || !fileData) {
        throw new Error("Failed to download file");
      }

      const fileBuffer = await fileData.arrayBuffer();
      const fileBytes = new Uint8Array(fileBuffer);

      // Handle different file types
      if (mimeType?.startsWith("image/")) {
        // Use vision model for images
        if (!LOVABLE_API_KEY) {
          extractedText = "[Image uploaded - vision analysis not available]";
        } else {
          const base64 = btoa(String.fromCharCode(...fileBytes));
          const dataUrl = `data:${mimeType};base64,${base64}`;

          const visionResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: "Describe this image in detail. If there's text, transcribe it. If it's a document, extract all visible text and information." },
                    { type: "image_url", image_url: { url: dataUrl } },
                  ],
                },
              ],
            }),
          });

          if (visionResponse.ok) {
            const visionResult = await visionResponse.json();
            extractedText = visionResult.choices?.[0]?.message?.content || "[Could not analyze image]";
            metadata = { type: "image", analyzed: true };
          } else {
            extractedText = "[Image analysis failed]";
          }
        }
      } else if (mimeType === "text/plain" || mimeType === "text/csv" || mimeType === "text/markdown") {
        // Plain text files
        extractedText = new TextDecoder().decode(fileBytes);
        metadata = { type: "text", charCount: extractedText.length };
      } else if (mimeType === "application/pdf") {
        // For PDFs, we'll use a simple text extraction approach
        const textContent = new TextDecoder("utf-8", { fatal: false }).decode(fileBytes);
        
        // Try to extract readable text from PDF
        const textMatches = textContent.match(/\(([^)]+)\)/g) || [];
        const extractedParts = textMatches
          .map(m => m.slice(1, -1))
          .filter(t => t.length > 2 && /[a-zA-Z]/.test(t));
        
        if (extractedParts.length > 0) {
          extractedText = extractedParts.join(" ").slice(0, 50000);
          metadata = { type: "pdf", extracted: true };
        } else {
          extractedText = "[PDF document - text extraction limited. Consider using OCR for scanned documents.]";
          metadata = { type: "pdf", extracted: false };
        }
      } else if (
        mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimeType === "application/msword"
      ) {
        // DOCX files are ZIP archives containing XML
        try {
          // Import JSZip dynamically for DOCX parsing
          const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
          const zip = await JSZip.loadAsync(fileBytes);
          
          // Find document.xml (main content)
          const documentXml = zip.file("word/document.xml");
          
          if (documentXml) {
            const xmlContent = await documentXml.async("string");
            
            // Parse paragraphs properly - split by </w:p> and extract text from each
            let fullText = "";
            const paragraphs = xmlContent.split(/<\/w:p>/);
            
            for (const para of paragraphs) {
              // Match all <w:t> tags in this paragraph (with or without attributes)
              const paraTextMatches = para.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
              const paraTexts: string[] = [];
              for (const m of paraTextMatches) {
                if (m[1]) paraTexts.push(m[1]);
              }
              if (paraTexts.length > 0) {
                fullText += paraTexts.join("") + "\n";
              }
            }
            
            extractedText = fullText.trim().slice(0, 50000);
            
            if (extractedText.length > 0) {
              const words = extractedText.split(/\s+/).filter(w => w.length > 0);
              const paras = fullText.split("\n").filter(p => p.trim().length > 0);
              metadata = { 
                type: "docx", 
                extracted: true,
                wordCount: words.length,
                paragraphs: paras.length
              };
              console.log(`[Extract] DOCX: extracted ${words.length} words, ${paras.length} paragraphs`);
            } else {
              extractedText = "[Word document appears to be empty or contains only images/tables]";
              metadata = { type: "docx", extracted: false };
            }
          } else {
            // Try to find any XML with text content
            const files = Object.keys(zip.files);
            console.log(`[Extract] DOCX structure: ${files.slice(0, 10).join(", ")}`);
            extractedText = "[Word document structure not recognized - no document.xml found]";
            metadata = { type: "docx", extracted: false, availableFiles: files.slice(0, 10) };
          }
        } catch (zipError: any) {
          console.error(`[Extract] DOCX ZIP parsing error:`, zipError.message);
          
          // Fallback: try raw text extraction for legacy .doc files
          const textContent = new TextDecoder("utf-8", { fatal: false }).decode(fileBytes);
          const textMatches = textContent.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
          const extractedParts = textMatches.map(m => {
            const match = m.match(/>([^<]+)</);
            return match ? match[1] : "";
          });
          
          if (extractedParts.length > 0) {
            extractedText = extractedParts.join(" ").slice(0, 50000);
            metadata = { type: "doc-legacy", wordCount: extractedText.split(/\s+/).length };
          } else {
            extractedText = "[Word document - could not extract text. File may be corrupted or password-protected.]";
            metadata = { type: "docx", extracted: false, error: zipError.message };
          }
        }
      } else {
        extractedText = `[File uploaded: ${mimeType || "unknown type"}]`;
        metadata = { type: "unknown" };
      }

      // Truncate if too long
      if (extractedText.length > 60000) {
        extractedText = extractedText.slice(0, 60000) + "\n\n[Content truncated...]";
      }

      // Update file record with extracted text
      await supabase
        .from("agent_files")
        .update({
          extracted_text: extractedText,
          extraction_status: "ready",
        })
        .eq("id", fileId)
        .eq("user_id", user.id);

      console.log(`[Extract] Successfully extracted ${extractedText.length} chars from file ${fileId}`);

      return new Response(
        JSON.stringify({
          success: true,
          fileId,
          charCount: extractedText.length,
          metadata,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (extractError: any) {
      console.error(`[Extract] Extraction failed:`, extractError);

      await supabase
        .from("agent_files")
        .update({
          extraction_status: "failed",
          extracted_text: `[Extraction failed: ${extractError.message}]`,
        })
        .eq("id", fileId)
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ error: extractError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: any) {
    console.error("[Extract] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
