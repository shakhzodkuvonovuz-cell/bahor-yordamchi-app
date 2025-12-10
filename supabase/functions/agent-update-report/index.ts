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
const REPORT_TEMPLATE = `You are updating a professional research report. Structure your response using this EXACT format:

# [Title - derived from the research goal]

## Executive Summary
[5-8 bullet points summarizing the key findings and conclusions, incorporating any follow-up additions]

## Scope & Inputs Used
[List all sources used: files, links, user notes, web searches]

### Files Analyzed
- [filename1] - [brief description]

### Web Sources
- 〔1〕 [source] - [title]

### User Notes
[Summarize any notes provided]

## Problem / Question
[Clear statement of what was investigated]

## Methodology
[What sources were used, how information was gathered]

## Key Findings
[Bullet points with citations using 〔n〕 notation]
- Finding 1 〔1〕
- Finding 2 〔2〕

## Detailed Analysis
[Organized analysis with subheadings]

### [Subtopic 1]
[Analysis with citations]

### [Subtopic 2]
[More analysis]

## Evidence & Citations
[Map findings to sources]
- 〔1〕 [Source] - "quoted text..."
- 〔2〕 [Source] - "quoted text..."

## Recommendations

### Immediate (Today)
- [Recommendation]

### This Week
- [Recommendation]

### This Month
- [Recommendation]

## Risks & Mitigations
- **Risk**: [description] → **Mitigation**: [action]

## Action Plan

### 7-Day Sprint
1. Day 1-2: [Actions]
2. Day 3-4: [Actions]
3. Day 5-7: [Actions]

### 30-Day Plan
[Monthly plan overview]

## Updates from Follow-up Discussion
[NEW: Summarize any clarifications, additions, or changes from follow-up conversation]

## Assumptions & What's Missing
[Only if there are gaps]

---

CRITICAL RULES:
- Use 〔n〕 notation for ALL citations
- EVERY factual claim must have a citation
- NEVER invent information not in the inputs
- Include the "Updates from Follow-up Discussion" section if there were follow-ups
- Write in the same language as the original goal`;

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
    
    // Use service role client to verify the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error("[Agent Update Report] Auth error:", userError?.message);
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

    // Load follow-up messages from thread
    const { data: messages } = await supabaseClient
      .from("agent_messages")
      .select("*")
      .eq("thread_id", run.thread_id)
      .order("created_at", { ascending: true });

    // Load files
    const { data: filesData } = await supabaseClient
      .from("agent_files")
      .select("filename, extracted_text")
      .eq("run_id", runId);

    // Build file context
    let fileContext = "";
    if (filesData && filesData.length > 0) {
      fileContext = "\n\n=== FILES ===\n";
      for (const file of filesData) {
        fileContext += `\n--- ${file.filename} ---\n${file.extracted_text?.slice(0, 5000) || "[No content]"}\n`;
      }
    }

    // Build context from steps
    const stepsContext = steps?.map((s: any, i: number) => {
      const output = s.tool_output?.result || s.tool_output || "";
      return `Step ${i + 1} (${s.title}): ${typeof output === 'string' ? output.slice(0, 3000) : JSON.stringify(output).slice(0, 3000)}`;
    }).join("\n\n---\n\n") || "";

    // Build follow-up context
    const followUpContext = messages?.filter((m: any) => m.metadata?.type === "followup")
      .map((m: any) => `${m.role === "user" ? "User" : "Agent"}: ${m.content}`)
      .join("\n\n") || "";

    // Generate updated report
    const userMessage = `
=== ORIGINAL RESEARCH GOAL ===
${run.goal}
${fileContext}

=== STEP RESULTS ===
${stepsContext}

=== FOLLOW-UP CONVERSATION ===
${followUpContext || "None"}

=== SOURCES ===
${JSON.stringify(run.sources || [], null, 2)}

Generate a comprehensive, updated research report incorporating all the above information and any follow-up clarifications.
ONLY use information from the provided inputs. Do NOT invent details.
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
        final_output: updatedReport,
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
