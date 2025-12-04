// Thread Summarization Edge Function
// Generates concise Uzbek-first summaries for chat threads

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUMMARY_SYSTEM_PROMPT = `You are a thread summarizer for Bahor AI. Create concise summaries that capture:
- User's main goals and requests
- Key decisions made
- Important preferences mentioned
- Tasks or constraints discussed
- Any numbers, dates, or specific details

RULES:
1. Keep summary under 300 words
2. Use bullet points for clarity
3. Match the primary language of the conversation
4. Focus on actionable information the assistant needs to remember
5. Don't include pleasantries or filler
6. Start with a one-line topic summary

Example format:
"Resume help for software engineer position
• User: 3 years experience, Python/React skills
• Goal: Apply to tech companies in Tashkent
• Preference: Wants modern CV format
• Status: Draft created, needs work experience section"`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { threadId } = await req.json();

    if (!threadId) {
      return new Response(
        JSON.stringify({ error: "threadId is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "AUTH_REQUIRED" }),
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
        JSON.stringify({ error: "AUTH_REQUIRED" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify thread ownership
    const { data: thread, error: threadError } = await supabaseAdmin
      .from('chat_threads')
      .select('id, title, summary, summary_updated_at, user_id')
      .eq('id', threadId)
      .single();

    if (threadError || !thread) {
      return new Response(
        JSON.stringify({ error: "Thread not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (thread.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cooldown (2 minutes minimum between updates)
    if (thread.summary_updated_at) {
      const lastUpdate = new Date(thread.summary_updated_at);
      const now = new Date();
      const diffMs = now.getTime() - lastUpdate.getTime();
      const diffMinutes = diffMs / (1000 * 60);
      
      if (diffMinutes < 2) {
        return new Response(
          JSON.stringify({ 
            ok: true, 
            summary: thread.summary,
            skipped: true,
            reason: "cooldown"
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fetch last 30 messages
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch messages" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || messages.length < 3) {
      // Not enough messages to summarize
      return new Response(
        JSON.stringify({ 
          ok: true, 
          summary: null,
          skipped: true,
          reason: "insufficient_messages"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Reverse to chronological order
    const chronologicalMessages = messages.reverse();

    // Build conversation text for summarization
    const conversationText = chronologicalMessages
      .map(m => `${m.role.toUpperCase()}: ${m.content.substring(0, 500)}`)
      .join('\n\n');

    const existingSummaryContext = thread.summary 
      ? `\n\nPrevious summary to update/expand:\n${thread.summary}`
      : '';

    // Call AI for summarization
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SUMMARY_SYSTEM_PROMPT },
          { 
            role: "user", 
            content: `Thread title: ${thread.title}\n\nConversation:\n${conversationText}${existingSummaryContext}\n\nCreate/update the summary:`
          }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResult = await response.json();
    const summary = aiResult.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      return new Response(
        JSON.stringify({ error: "Failed to generate summary" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save summary to database
    const { error: updateError } = await supabaseAdmin
      .from('chat_threads')
      .update({
        summary,
        summary_updated_at: new Date().toISOString(),
      })
      .eq('id', threadId);

    if (updateError) {
      console.error('Error saving summary:', updateError);
      return new Response(
        JSON.stringify({ error: "Failed to save summary" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Summary generated for thread ${threadId}, length: ${summary.length}`);

    return new Response(
      JSON.stringify({ ok: true, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Summarize thread error:', error);
    return new Response(
      JSON.stringify({ error: "Server error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
