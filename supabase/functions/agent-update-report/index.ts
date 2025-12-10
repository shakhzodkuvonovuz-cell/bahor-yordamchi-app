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
      temperature: options?.temperature ?? 0.5,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("LLM error:", response.status, errorText);
    throw new Error(`LLM error: ${response.status}`);
  }

  return await response.json();
}

// Gemini-style research paper template
const REPORT_TEMPLATE = `You are generating a professional research report. Structure your response using this EXACT format:

# [Title - derived from the research goal]

## Abstract
[3-6 sentences summarizing the key findings and conclusions]

## Problem / Question
[Clear statement of what was investigated]

## Methodology
[What sources were used, what tools were invoked, how information was gathered]

## Key Findings
[Bullet points of the most important discoveries]
- Finding 1
- Finding 2
- Finding 3

## Detailed Analysis
[Organized analysis with subheadings as needed]

### [Subtopic 1]
[Analysis with citations using 〔1〕 〔2〕 format]

### [Subtopic 2]
[More analysis]

## Contradictions & Uncertainties
[List any conflicting information found, areas of uncertainty, proposed verification steps]

## Recommendations

### Immediate (Today)
- [Actionable recommendation]

### This Week
- [Short-term recommendation]

### This Month
- [Medium-term recommendation]

## Action Plan

### 7-Day Sprint
1. Day 1-2: [Actions]
2. Day 3-4: [Actions]
3. Day 5-7: [Actions]

### 30-Day Plan
[Monthly plan overview]

## Appendix

### Sources
[List sources with 〔n〕 notation linking to URLs]

### File Inventory
[List any files that were analyzed]

---

CRITICAL RULES:
- Use 〔1〕 〔2〕 notation for citations (not [1] or superscripts)
- Every factual claim must have a citation
- Be thorough but well-organized
- Use proper markdown formatting
- Write in the same language as the original research goal`;

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

    const { runId } = await req.json();

    if (!runId) {
      return new Response(JSON.stringify({ error: "runId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Agent Update Report] Regenerating report for run ${runId}`);

    // Load run data
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

    // Load steps
    const { data: steps } = await supabaseClient
      .from("agent_steps")
      .select("*")
      .eq("run_id", runId)
      .order("step_index", { ascending: true });

    // Load follow-up messages
    const { data: messages } = await supabaseClient
      .from("agent_messages")
      .select("*")
      .eq("run_id", runId)
      .order("created_at", { ascending: true });

    // Build context from steps
    const stepsContext = steps?.map((s: any, i: number) => {
      const output = s.tool_output?.result || s.tool_output || "";
      return `Step ${i + 1} (${s.title}): ${typeof output === 'string' ? output.slice(0, 3000) : JSON.stringify(output).slice(0, 3000)}`;
    }).join("\n\n---\n\n") || "";

    // Build follow-up context
    const followUpContext = messages?.filter((m: any) => m.role === "user")
      .map((m: any) => `Follow-up: ${m.content}`)
      .join("\n") || "";

    // Generate updated report
    const userMessage = `
=== ORIGINAL RESEARCH GOAL ===
${run.goal}

=== STEP RESULTS ===
${stepsContext}

=== FOLLOW-UP QUESTIONS AND ADDITIONS ===
${followUpContext || "None"}

=== SOURCES ===
${JSON.stringify(run.sources || [], null, 2)}

Generate a comprehensive, updated research report incorporating all the above information and any follow-up clarifications.
`;

    const result = await callLLM([
      { role: "system", content: REPORT_TEMPLATE },
      { role: "user", content: userMessage }
    ], { model: "google/gemini-2.5-pro", temperature: 0.4 });

    const updatedReport = result.choices[0].message.content;

    // Save updated report
    const { error: updateError } = await supabaseClient
      .from("agent_runs")
      .update({
        final_report_md: updatedReport,
        updated_at: new Date().toISOString(),
      })
      .eq("id", runId);

    if (updateError) {
      console.error("Failed to update report:", updateError);
      throw new Error("Failed to save updated report");
    }

    console.log(`[Agent Update Report] Report regenerated for run ${runId}`);

    return new Response(JSON.stringify({ 
      success: true,
      report: updatedReport
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[Agent Update Report] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Update failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
