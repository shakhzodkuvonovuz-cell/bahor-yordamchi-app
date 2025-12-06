// Space Chat with Bahor AI integration
// Handles /bahor mentions with file context

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Brand protection
const FORBIDDEN_TERMS = [
  "deepseek", "openai", "chatgpt", "gpt-4", "gpt-5", "gemini", "claude",
  "anthropic", "mistral", "llama", "meta ai", "azure openai"
];

function sanitizeOutput(text: string): string {
  let result = text;
  for (const term of FORBIDDEN_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, "gi");
    result = result.replace(regex, "Bahor AI");
  }
  return result;
}

// Extract text from PDF via signed URL fetch
async function extractPdfText(signedUrl: string): Promise<string> {
  try {
    // For now, return a placeholder - full PDF parsing would need a library
    // We'll rely on the file content being text-based or use vision for images
    return "[PDF content - text extraction pending]";
  } catch (err) {
    console.error("PDF extraction error:", err);
    return "";
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      space_id, 
      question, 
      include_last_messages, 
      selected_file_ids,
      ui_language,
      web_results 
    } = await req.json();

    if (!space_id || !question) {
      return new Response(
        JSON.stringify({ error: "space_id and question are required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "AUTH_REQUIRED", message: "Iltimos, tizimga kiring" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "AUTH_REQUIRED", message: "Sessiya tugagan" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is active member of the space
    const { data: membership, error: memberError } = await supabaseAdmin
      .from('space_members')
      .select('role, status')
      .eq('space_id', space_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (memberError || !membership) {
      return new Response(
        JSON.stringify({ error: "NOT_MEMBER", message: "Siz bu xonaning a'zosi emassiz" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check daily usage limits (reuse existing logic)
    const userEmail = user.email?.toLowerCase() || '';
    const devUnlimitedRaw = Deno.env.get('DEV_UNLIMITED_EMAILS') || '';
    const adminEmailsRaw = Deno.env.get('ADMIN_EMAILS') || '';
    const devUnlimitedEmails = devUnlimitedRaw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const adminEmails = adminEmailsRaw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const isDevBypass = devUnlimitedEmails.includes(userEmail) || adminEmails.includes(userEmail);

    if (!isDevBypass) {
      const { data: usageResult, error: usageError } = await supabaseAdmin.rpc(
        'check_and_increment_usage',
        { 
          p_user_id: user.id, 
          p_wants_search: false,
          p_wants_vision: false,
          p_wants_file: selected_file_ids?.length > 0,
          p_is_bypass: false,
        }
      );

      if (usageError || !usageResult?.allowed) {
        const lang = ui_language || 'uz';
        const messages: Record<string, string> = {
          uz: "Bugungi limit tugadi. Ertaga davom eting.",
          en: "Daily limit reached. Continue tomorrow.",
          ru: "Дневной лимит исчерпан. Продолжите завтра.",
          tr: "Günlük limit doldu. Yarın devam edin.",
        };
        return new Response(
          JSON.stringify({ 
            error: "LIMIT_REACHED", 
            message: messages[lang] || messages.uz 
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch last 30 messages if requested
    let messagesContext = "";
    if (include_last_messages) {
      const { data: messages } = await supabaseAdmin
        .from('space_messages')
        .select('content, sender_id, kind, created_at')
        .eq('space_id', space_id)
        .eq('kind', 'text')
        .order('created_at', { ascending: false })
        .limit(30);

      if (messages && messages.length > 0) {
        // Get sender profiles
        const senderIds = [...new Set(messages.map(m => m.sender_id))];
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', senderIds);

        const profileMap = Object.fromEntries(
          (profiles || []).map(p => [
            p.user_id,
            `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'User'
          ])
        );

        // Build context (reverse to chronological order)
        const contextLines = messages.reverse().map(m => {
          const name = profileMap[m.sender_id] || 'User';
          return `[${name}]: ${m.content}`;
        });
        messagesContext = contextLines.join('\n');
      }
    }

    // Fetch selected files and extract content
    let filesContext = "";
    const usedFileNames: string[] = [];
    
    if (selected_file_ids && selected_file_ids.length > 0) {
      const { data: files } = await supabaseAdmin
        .from('space_files')
        .select('id, original_name, storage_path, mime_type')
        .eq('space_id', space_id)
        .in('id', selected_file_ids);

      if (files && files.length > 0) {
        for (const file of files) {
          usedFileNames.push(file.original_name);
          
          // Get signed URL
          const { data: signedData } = await supabaseAdmin.storage
            .from('space-files')
            .createSignedUrl(file.storage_path, 300);

          if (signedData?.signedUrl) {
            // For text files, fetch content
            if (file.mime_type?.startsWith('text/') || 
                file.mime_type === 'application/json') {
              try {
                const resp = await fetch(signedData.signedUrl);
                const text = await resp.text();
                const truncated = text.slice(0, 15000); // Limit content
                filesContext += `\n--- FILE: ${file.original_name} ---\n${truncated}\n--- END FILE ---\n`;
              } catch (err) {
                console.error(`Error fetching file ${file.original_name}:`, err);
              }
            } else if (file.mime_type === 'application/pdf') {
              // For PDFs, note that we can't fully parse without a library
              filesContext += `\n--- FILE: ${file.original_name} (PDF) ---\n[PDF file attached - summarize based on filename and context]\n--- END FILE ---\n`;
            } else if (file.mime_type?.startsWith('image/')) {
              // For images, note that vision analysis would be needed
              filesContext += `\n--- FILE: ${file.original_name} (Image) ---\n[Image file attached]\n--- END FILE ---\n`;
            } else {
              filesContext += `\n--- FILE: ${file.original_name} ---\n[File type: ${file.mime_type || 'unknown'}]\n--- END FILE ---\n`;
            }
          }
        }
      }
    }

    // Build web results context if provided
    let webResultsContext = "";
    if (web_results && Array.isArray(web_results) && web_results.length > 0) {
      const resultLines = web_results.map((r: { title: string; url: string; snippet: string }, i: number) => 
        `${i + 1}) ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`
      );
      webResultsContext = resultLines.join('\n\n');
    }

    // Build the prompt
    const systemPrompt = `You are Bahor AI, an assistant for a collaborative Space chat.
You are helping members of this space with their questions.

RULES:
- Be concise and helpful
- If files are provided, prioritize answering based on their content
- If web search results are provided, use them to answer and cite sources with clickable markdown links
- If chat history is provided, use it for context
- Reply in ${ui_language === 'en' ? 'English' : ui_language === 'ru' ? 'Russian' : ui_language === 'tr' ? 'Turkish' : 'Uzbek'}
- Do not mention that you are DeepSeek, OpenAI, ChatGPT, or any other AI. You are Bahor AI.
- When citing web sources, format as: [Title](URL)

${messagesContext ? `
RECENT CHAT MESSAGES (last 30):
${messagesContext}
` : ''}

${filesContext ? `
ATTACHED FILES (use these to answer):
${filesContext}
` : ''}

${webResultsContext ? `
WEB SEARCH RESULTS (cite these with links):
${webResultsContext}
` : ''}`;

    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
    if (!deepseekApiKey) {
      return new Response(
        JSON.stringify({ error: "SERVER_ERROR", message: "Server konfiguratsiya xatosi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call DeepSeek
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ],
        temperature: 0.6,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek error:', response.status, errorText.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "AI_ERROR", message: "AI xizmati xatosi" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    let aiResponse = data.choices?.[0]?.message?.content || "";
    aiResponse = sanitizeOutput(aiResponse);

    // Return the response
    return new Response(
      JSON.stringify({
        response: aiResponse,
        used_files: usedFileNames,
        used_messages: include_last_messages,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Space chat error:', error);
    return new Response(
      JSON.stringify({ error: "SERVER_ERROR", message: "Server xatosi" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});