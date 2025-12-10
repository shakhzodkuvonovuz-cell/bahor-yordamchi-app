import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function callLLM(messages: any[], options?: { model?: string; temperature?: number }) {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options?.model || "google/gemini-2.5-flash",
      messages,
      temperature: options?.temperature ?? 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("LLM error:", response.status, errorText);
    throw new Error(`LLM error: ${response.status}`);
  }

  return await response.json();
}

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

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    ).auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { runId, message, reportContext } = await req.json();

    if (!runId || !message) {
      return new Response(JSON.stringify({ error: "runId and message are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Agent Followup] Processing follow-up for run ${runId}`);

    // Verify run belongs to user
    const { data: run, error: runError } = await supabaseClient
      .from("agent_runs")
      .select("*")
      .eq("id", runId)
      .eq("user_id", user.id)
      .single();

    if (runError || !run) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load previous messages for context
    const { data: previousMessages } = await supabaseClient
      .from("agent_messages")
      .select("role, content")
      .eq("run_id", runId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Build conversation context
    const conversationContext = previousMessages?.map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content
    })) || [];

    // System prompt for follow-up
    const systemPrompt = `You are Bahor AI Agent continuing a conversation about a research task.

=== ORIGINAL TASK ===
${run.goal}

=== RESEARCH REPORT ===
${reportContext?.slice(0, 8000) || run.final_output?.slice(0, 8000) || "No report available"}

=== INSTRUCTIONS ===
1. Answer the user's follow-up question based on the research report above
2. If asked for clarification, provide detailed explanations from the report
3. If asked to update or modify findings, acknowledge and provide updated analysis
4. Use proper markdown formatting (headers, lists, bold, etc.)
5. Cite specific sections from the report when relevant
6. If the question is about something not covered in the report, acknowledge this clearly
7. Be helpful, thorough, and professional

Respond in the same language as the user's message (Uzbek, Russian, English, or Turkish).`;

    // Generate response
    const result = await callLLM([
      { role: "system", content: systemPrompt },
      ...conversationContext,
      { role: "user", content: message }
    ]);

    const assistantContent = result.choices[0].message.content;

    // Save assistant message
    const { data: savedMessage, error: saveError } = await supabaseClient
      .from("agent_messages")
      .insert({
        run_id: runId,
        user_id: user.id,
        role: "assistant",
        content: assistantContent,
        metadata: {
          type: "followup",
          tokens_in: result.usage?.prompt_tokens,
          tokens_out: result.usage?.completion_tokens,
        }
      })
      .select()
      .single();

    if (saveError) {
      console.error("Failed to save message:", saveError);
    }

    console.log(`[Agent Followup] Generated response for run ${runId}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: savedMessage,
      content: assistantContent
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[Agent Followup] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Follow-up failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
