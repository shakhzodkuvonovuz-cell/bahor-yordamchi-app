import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AgentStep {
  title: string;
  rationale?: string;
  tool?: string;
}

interface ToolAction {
  type: "tool" | "final";
  tool?: { name: string; input: any };
  output?: string;
  sources?: { url: string; title: string }[];
}

async function callLLM(messages: any[], tools?: any[]) {
  const body: any = {
    model: "google/gemini-2.5-flash",
    messages,
    temperature: 0.7,
  };
  
  if (tools) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("LLM error:", response.status, errorText);
    throw new Error(`LLM error: ${response.status}`);
  }

  return await response.json();
}

async function generatePlan(goal: string, context: string): Promise<AgentStep[]> {
  const systemPrompt = `You are Bahor AI Agent, an intelligent assistant that breaks down complex tasks into actionable steps.
Given a user's goal, create a plan with 2-6 clear steps. Each step should be specific and actionable.

Available tools you can use in steps:
- web_search: Search the web for current information
- analyze: Analyze data or text
- summarize: Summarize content
- calculate: Perform calculations

${context ? `User has provided additional context/files that you should reference in your plan.` : ""}

Respond with a JSON object: { "steps": [{ "title": "Step description", "rationale": "Why this step", "tool": "tool_name or null" }] }`;

  const userMessage = context 
    ? `Goal: ${goal}\n\nAdditional Context:\n${context}\n\nCreate a step-by-step plan to achieve this goal, making use of the provided context.`
    : `Goal: ${goal}\n\nCreate a step-by-step plan to achieve this goal.`;

  const result = await callLLM([
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ]);

  const content = result.choices[0].message.content;
  
  try {
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.steps || [];
    }
  } catch (e) {
    console.error("Failed to parse plan:", e);
  }
  
  // Fallback: create simple steps
  return [
    { title: "Analyze the goal and context", rationale: "Understand requirements" },
    { title: "Research and gather information", tool: "web_search" },
    { title: "Synthesize findings and create response" }
  ];
}

async function executeWebSearch(query: string): Promise<{ output: string; sources: any[] }> {
  const GOOGLE_SEARCH_API_KEY = Deno.env.get("GOOGLE_SEARCH_API_KEY");
  const GOOGLE_CX = Deno.env.get("GOOGLE_CX");
  
  if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_CX) {
    return { output: "Web search not configured", sources: [] };
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=5`;
    const response = await fetch(url);
    const data = await response.json();
    
    const sources = (data.items || []).slice(0, 5).map((item: any) => ({
      url: item.link,
      title: item.title,
      snippet: item.snippet
    }));
    
    const resultText = sources.map((s: any) => `- ${s.title}: ${s.snippet}`).join("\n");
    return { output: resultText || "No results found", sources };
  } catch (e) {
    console.error("Web search error:", e);
    return { output: "Search failed", sources: [] };
  }
}

async function executeStep(
  step: AgentStep,
  goal: string,
  previousResults: string[]
): Promise<{ output: string; sources: any[] }> {
  const toolName = step.tool;
  
  // Agent has unlimited access to all tools - no premium restrictions
  if (toolName === "web_search") {
    // Generate search query from step context
    const queryResult = await callLLM([
      { role: "system", content: "Generate a concise search query (max 10 words) for web search based on the step. Respond with just the query, no quotes." },
      { role: "user", content: `Goal: ${goal}\nStep: ${step.title}\nContext: ${previousResults.slice(-2).join("\n")}` }
    ]);
    
    const query = queryResult.choices[0].message.content.trim();
    return await executeWebSearch(query);
  }
  
  // For analyze, summarize, calculate - use LLM
  const result = await callLLM([
    { role: "system", content: `You are executing a step in a multi-step plan. Be concise and actionable. Step type: ${toolName || "general"}` },
    { role: "user", content: `Goal: ${goal}\nStep: ${step.title}\nPrevious results:\n${previousResults.join("\n")}\n\nExecute this step and provide the result.` }
  ]);
  
  return { 
    output: result.choices[0].message.content, 
    sources: [] 
  };
}

async function generateFinalOutput(
  goal: string,
  steps: { title: string; output: string }[],
  allSources: any[]
): Promise<string> {
  const stepsContext = steps.map((s, i) => `Step ${i + 1} (${s.title}):\n${s.output}`).join("\n\n");
  
  const result = await callLLM([
    { role: "system", content: `You are Bahor AI Agent. Synthesize the results from multiple steps into a comprehensive, well-structured final answer. Use markdown formatting (headers, lists, bold) for readability. Be thorough but concise. If sources were used, they will be displayed separately - don't list URLs in your response.` },
    { role: "user", content: `Goal: ${goal}\n\nStep Results:\n${stepsContext}\n\nProvide the final comprehensive answer.` }
  ]);
  
  return result.choices[0].message.content;
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

    // Create authenticated client
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user from token
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

    const { goal, runId, action, constraints, files, links, notes, useWebSearch } = await req.json();

    // Handle cancellation
    if (action === "cancel" && runId) {
      await supabaseClient
        .from("agent_runs")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", runId)
        .eq("user_id", user.id);
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!goal) {
      return new Response(JSON.stringify({ error: "Goal is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Agent mode has unlimited tool access - page-level restriction will be added later
    console.log(`[Agent] Starting run for user ${user.id}, goal: ${goal.slice(0, 100)}...`);

    // Build context from files, links, notes
    let contextParts: string[] = [];
    
    if (files && files.length > 0) {
      contextParts.push("=== UPLOADED FILES ===");
      for (const file of files) {
        contextParts.push(`\n--- File: ${file.filename} ---\n${file.text?.slice(0, 15000) || "[No content]"}`);
      }
    }
    
    if (links && links.length > 0) {
      contextParts.push(`\n=== REFERENCE LINKS ===\n${links.join("\n")}`);
    }
    
    if (notes && notes.trim()) {
      contextParts.push(`\n=== USER NOTES ===\n${notes}`);
    }
    
    if (constraints && Object.values(constraints).some(v => v)) {
      const constraintsList = Object.entries(constraints)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      contextParts.push(`\n=== CONSTRAINTS ===\n${constraintsList}`);
    }
    
    const context = contextParts.join("\n");

    // Create the run
    const { data: run, error: runError } = await supabaseClient
      .from("agent_runs")
      .insert({
        user_id: user.id,
        goal,
        status: "planning",
        constraints_json: constraints || {},
      })
      .select()
      .single();

    if (runError) {
      console.error("Failed to create run:", runError);
      throw new Error("Failed to create agent run");
    }

    console.log(`[Agent] Created run ${run.id}`);

    // Generate plan with context
    const plan = await generatePlan(goal, context);
    console.log(`[Agent] Generated plan with ${plan.length} steps`);

    // Update run with plan
    await supabaseClient
      .from("agent_runs")
      .update({ plan, status: "running" })
      .eq("id", run.id);

    // Create step records
    for (let i = 0; i < plan.length; i++) {
      await supabaseClient
        .from("agent_steps")
        .insert({
          run_id: run.id,
          step_index: i,
          title: plan[i].title,
          rationale: plan[i].rationale,
          tool_name: plan[i].tool,
          status: "pending",
        });
    }

    // Execute steps
    const stepResults: { title: string; output: string }[] = [];
    const allSources: any[] = [];

    for (let i = 0; i < plan.length; i++) {
      // Check if run was cancelled
      const { data: currentRun } = await supabaseClient
        .from("agent_runs")
        .select("status")
        .eq("id", run.id)
        .single();

      if (currentRun?.status === "cancelled") {
        console.log(`[Agent] Run ${run.id} was cancelled`);
        break;
      }

      // Update step to running
      await supabaseClient
        .from("agent_steps")
        .update({ status: "running" })
        .eq("run_id", run.id)
        .eq("step_index", i);

      console.log(`[Agent] Executing step ${i + 1}: ${plan[i].title}`);

      try {
        const { output, sources } = await executeStep(
          plan[i],
          goal,
          stepResults.map(r => r.output)
        );

        stepResults.push({ title: plan[i].title, output });
        allSources.push(...sources);

        // Update step to done
        await supabaseClient
          .from("agent_steps")
          .update({
            status: "done",
            tool_output: { result: output, sources },
          })
          .eq("run_id", run.id)
          .eq("step_index", i);

      } catch (stepError: any) {
        console.error(`[Agent] Step ${i} failed:`, stepError);
        
        await supabaseClient
          .from("agent_steps")
          .update({
            status: "error",
            error: stepError.message || "Step execution failed",
          })
          .eq("run_id", run.id)
          .eq("step_index", i);

        // Continue with next step instead of failing entire run
        stepResults.push({ title: plan[i].title, output: `Error: ${stepError.message}` });
      }
    }

    // Generate final output
    console.log(`[Agent] Generating final output`);
    const finalOutput = await generateFinalOutput(goal, stepResults, allSources);

    // Deduplicate sources
    const uniqueSources = allSources.filter((s, i, arr) => 
      arr.findIndex(x => x.url === s.url) === i
    );

    // Update run to done
    await supabaseClient
      .from("agent_runs")
      .update({
        status: "done",
        final_output: finalOutput,
        sources: uniqueSources,
        updated_at: new Date().toISOString(),
      })
      .eq("id", run.id);

    console.log(`[Agent] Run ${run.id} completed`);

    return new Response(JSON.stringify({ 
      runId: run.id, 
      status: "done",
      finalOutput,
      sources: uniqueSources,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("[Agent] Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Agent run failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
