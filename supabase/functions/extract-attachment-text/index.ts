// Extract text from uploaded attachments (PDF, DOCX, TXT, CSV, etc.)
// Stores result in attachment_text table for AI to use

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Max chars to store (60k)
const MAX_TEXT_CHARS = 60000;
// Threshold for summarization (20k)
const SUMMARY_THRESHOLD = 20000;
// Max summary length
const MAX_SUMMARY_CHARS = 3000;

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Simple text extraction for plain text files
async function extractPlainText(bytes: Uint8Array): Promise<string> {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  return decoder.decode(bytes);
}

// Extract text from CSV
async function extractCSV(bytes: Uint8Array): Promise<string> {
  const text = await extractPlainText(bytes);
  // Take first 100 lines for preview
  const lines = text.split('\n').slice(0, 100);
  return lines.join('\n');
}

// Extract text from PDF using pdf.js compatible approach
// Note: Full PDF extraction requires pdf.js which is heavy for edge functions
// For now, we'll use a simpler approach and mark complex PDFs for future OCR
async function extractPDFText(bytes: Uint8Array): Promise<{ text: string; needsOCR: boolean }> {
  // Simple PDF text extraction - look for text streams
  const decoder = new TextDecoder('utf-8', { fatal: false });
  const content = decoder.decode(bytes);
  
  // Extract text between stream markers
  const textParts: string[] = [];
  const streamRegex = /stream\s*([\s\S]*?)\s*endstream/gi;
  let match;
  
  while ((match = streamRegex.exec(content)) !== null) {
    const streamContent = match[1];
    // Look for readable text (Tj operator in PDF)
    const textMatches = streamContent.match(/\(([^)]+)\)\s*Tj/g);
    if (textMatches) {
      for (const tm of textMatches) {
        const textMatch = tm.match(/\(([^)]+)\)/);
        if (textMatch) {
          textParts.push(textMatch[1]);
        }
      }
    }
    
    // Also look for TJ arrays
    const tjArrays = streamContent.match(/\[(.*?)\]\s*TJ/g);
    if (tjArrays) {
      for (const tja of tjArrays) {
        const parts = tja.match(/\(([^)]+)\)/g);
        if (parts) {
          for (const p of parts) {
            const t = p.match(/\(([^)]+)\)/);
            if (t) textParts.push(t[1]);
          }
        }
      }
    }
  }
  
  let extractedText = textParts.join(' ').trim();
  
  // Clean up escaped characters
  extractedText = extractedText
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
  
  // If we got very little text, it's likely a scanned PDF
  const needsOCR = extractedText.length < 100;
  
  return { text: extractedText, needsOCR };
}

// Extract text from DOCX (unzip and parse document.xml)
async function extractDOCXText(bytes: Uint8Array): Promise<string> {
  try {
    // DOCX is a ZIP file, we need to find document.xml
    // Simple approach: look for the XML content markers
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const content = decoder.decode(bytes);
    
    // Find document.xml content (simplified - real implementation would unzip)
    // Look for w:t tags which contain text
    const textMatches = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (textMatches) {
      const texts = textMatches.map(m => {
        const match = m.match(/<w:t[^>]*>([^<]*)<\/w:t>/);
        return match ? match[1] : '';
      });
      return texts.join(' ').trim();
    }
    
    return '';
  } catch (e) {
    console.error('DOCX extraction error:', e);
    return '';
  }
}

// Summarize long text using Lovable AI
async function summarizeText(text: string, filename: string): Promise<string> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.log('[Summarize] No LOVABLE_API_KEY, skipping summary');
    return '';
  }
  
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'You are a document summarizer. Create a concise summary of the provided document content. Focus on key points, main topics, and important details. Keep the summary under 3000 characters. Respond in the same language as the document.'
          },
          {
            role: 'user',
            content: `Summarize this document (${filename}):\n\n${text.slice(0, 30000)}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });
    
    if (!response.ok) {
      console.log('[Summarize] API error:', response.status);
      return '';
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (e) {
    console.error('[Summarize] Error:', e);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  const supabase = getSupabaseAdmin();
  
  try {
    const { attachment_id } = await req.json();
    
    if (!attachment_id) {
      return new Response(
        JSON.stringify({ error: 'attachment_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[Extract] Starting extraction for attachment: ${attachment_id}`);
    
    // Get attachment info
    const { data: attachment, error: attError } = await supabase
      .from('chat_attachments')
      .select('id, user_id, bucket, path, mime_type, original_name')
      .eq('id', attachment_id)
      .single();
    
    if (attError || !attachment) {
      console.error('[Extract] Attachment not found:', attError);
      return new Response(
        JSON.stringify({ error: 'Attachment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { user_id, bucket, path, mime_type, original_name } = attachment;
    const filename = original_name || path.split('/').pop() || 'file';
    
    console.log(`[Extract] File: ${filename}, type: ${mime_type}`);
    
    // Check if already processed
    const { data: existing } = await supabase
      .from('attachment_text')
      .select('id, status')
      .eq('attachment_id', attachment_id)
      .single();
    
    if (existing && existing.status === 'ready') {
      console.log('[Extract] Already processed, skipping');
      return new Response(
        JSON.stringify({ status: 'already_processed', id: existing.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create or update status to processing
    const { data: textRecord, error: insertError } = await supabase
      .from('attachment_text')
      .upsert({
        attachment_id,
        user_id,
        status: 'processing',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'attachment_id' })
      .select()
      .single();
    
    if (insertError) {
      console.error('[Extract] Insert error:', insertError);
    }
    
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket || 'chat-attachments')
      .download(path);
    
    if (downloadError || !fileData) {
      console.error('[Extract] Download error:', downloadError);
      
      await supabase
        .from('attachment_text')
        .update({
          status: 'failed',
          error: 'Failed to download file',
          updated_at: new Date().toISOString(),
        })
        .eq('attachment_id', attachment_id);
      
      return new Response(
        JSON.stringify({ error: 'Failed to download file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const bytes = new Uint8Array(await fileData.arrayBuffer());
    const mimeType = mime_type?.toLowerCase() || '';
    const fileExt = filename.split('.').pop()?.toLowerCase() || '';
    
    let extractedText = '';
    let needsOCR = false;
    let error = '';
    
    try {
      // Handle different file types
      if (mimeType.startsWith('image/')) {
        // Images: mark for vision analysis
        extractedText = `[Image attachment: ${filename}. Use vision model to analyze when asked.]`;
      } else if (
        mimeType === 'text/plain' ||
        mimeType === 'text/markdown' ||
        mimeType === 'application/json' ||
        fileExt === 'txt' ||
        fileExt === 'md' ||
        fileExt === 'json'
      ) {
        extractedText = await extractPlainText(bytes);
      } else if (
        mimeType === 'text/csv' ||
        mimeType === 'application/csv' ||
        fileExt === 'csv'
      ) {
        extractedText = await extractCSV(bytes);
      } else if (
        mimeType === 'application/pdf' ||
        fileExt === 'pdf'
      ) {
        const pdfResult = await extractPDFText(bytes);
        extractedText = pdfResult.text;
        needsOCR = pdfResult.needsOCR;
        
        if (needsOCR && !extractedText) {
          error = 'Scanned PDF - OCR not yet supported. Please paste text or use a searchable PDF.';
        }
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileExt === 'docx'
      ) {
        extractedText = await extractDOCXText(bytes);
        if (!extractedText) {
          error = 'Could not extract text from DOCX. Try saving as PDF or TXT.';
        }
      } else if (
        mimeType === 'application/msword' ||
        fileExt === 'doc'
      ) {
        error = 'Legacy DOC format not supported. Please save as DOCX or PDF.';
      } else {
        error = `Unsupported file type: ${mimeType || fileExt}`;
      }
      
      console.log(`[Extract] Extracted ${extractedText.length} chars, needsOCR: ${needsOCR}`);
      
    } catch (e) {
      console.error('[Extract] Extraction error:', e);
      error = e instanceof Error ? e.message : 'Extraction failed';
    }
    
    // Truncate if too long
    if (extractedText.length > MAX_TEXT_CHARS) {
      extractedText = extractedText.slice(0, MAX_TEXT_CHARS) + '\n\n[... truncated ...]';
    }
    
    // Generate summary if text is long
    let summary = '';
    if (extractedText.length > SUMMARY_THRESHOLD && !extractedText.startsWith('[Image')) {
      console.log('[Extract] Generating summary...');
      summary = await summarizeText(extractedText, filename);
      if (summary.length > MAX_SUMMARY_CHARS) {
        summary = summary.slice(0, MAX_SUMMARY_CHARS);
      }
    }
    
    // Determine final status
    const finalStatus = extractedText.length > 0 ? 'ready' : (error ? 'failed' : 'ready');
    
    // Update record
    const { error: updateError } = await supabase
      .from('attachment_text')
      .update({
        status: finalStatus,
        text: extractedText || null,
        summary: summary || null,
        char_count: extractedText.length,
        error: error || null,
        updated_at: new Date().toISOString(),
      })
      .eq('attachment_id', attachment_id);
    
    if (updateError) {
      console.error('[Extract] Update error:', updateError);
    }
    
    console.log(`[Extract] Complete: status=${finalStatus}, chars=${extractedText.length}, summary=${summary.length}`);
    
    return new Response(
      JSON.stringify({
        status: finalStatus,
        char_count: extractedText.length,
        has_summary: summary.length > 0,
        error: error || undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (e) {
    console.error('[Extract] Error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
