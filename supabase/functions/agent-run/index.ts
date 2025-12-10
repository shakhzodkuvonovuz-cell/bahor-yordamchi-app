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
  tool_input?: any;
}

async function callLLM(messages: any[], options?: { model?: string; temperature?: number }) {
  const body: any = {
    model: options?.model || "google/gemini-2.5-flash",
    messages,
    temperature: options?.temperature ?? 0.7,
  };

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
Given a user's goal, create a plan with 2-8 clear steps. Each step should be specific and actionable.

Available tools you can use in steps:
- web_search: Search the web for current information (news, facts, articles, documentation)
- deep_search: Multiple web searches to gather comprehensive information on a topic
- image_generate: Generate an image based on a text description
- image_analyze: Analyze/describe an image (requires image URL or base64)
- translate: Translate text between languages
- summarize: Summarize long content into key points
- analyze: Analyze data, text, or code in detail
- calculate: Perform calculations or data analysis
- reason: Deep reasoning for complex problems (math, logic, planning)
- code: Write or analyze code

Choose tools wisely based on what the goal requires. You can use multiple web_search steps if needed.
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
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.steps || [];
    }
  } catch (e) {
    console.error("Failed to parse plan:", e);
  }
  
  return [
    { title: "Analyze the goal and context", rationale: "Understand requirements" },
    { title: "Research and gather information", tool: "web_search" },
    { title: "Synthesize findings and create response" }
  ];
}

// ===== TOOL IMPLEMENTATIONS =====

async function executeWebSearch(query: string): Promise<{ output: string; sources: any[] }> {
  const GOOGLE_SEARCH_API_KEY = Deno.env.get("GOOGLE_SEARCH_API_KEY");
  const GOOGLE_CX = Deno.env.get("GOOGLE_CX");
  
  if (!GOOGLE_SEARCH_API_KEY || !GOOGLE_CX) {
    console.log("[Agent] Web search not configured, using LLM knowledge");
    return { output: "Web search not available, using existing knowledge.", sources: [] };
  }

  try {
    // Agent can do up to 10 results per search
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_SEARCH_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=10`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      console.error("[Agent] Google search error:", data.error);
      return { output: `Search error: ${data.error.message}`, sources: [] };
    }
    
    const sources = (data.items || []).map((item: any) => ({
      url: item.link,
      title: item.title,
      snippet: item.snippet
    }));
    
    const resultText = sources.map((s: any, i: number) => `[${i+1}] ${s.title}: ${s.snippet}`).join("\n\n");
    console.log(`[Agent] Web search returned ${sources.length} results for: ${query}`);
    return { output: resultText || "No results found", sources };
  } catch (e) {
    console.error("Web search error:", e);
    return { output: "Search failed", sources: [] };
  }
}

async function executeDeepSearch(topic: string, goal: string): Promise<{ output: string; sources: any[] }> {
  // Generate multiple search queries for comprehensive coverage
  const queryResult = await callLLM([
    { role: "system", content: "Generate 3-5 different search queries to comprehensively research a topic. Return as JSON array of strings." },
    { role: "user", content: `Topic: ${topic}\nGoal: ${goal}\n\nGenerate diverse search queries.` }
  ]);
  
  let queries: string[] = [];
  try {
    const match = queryResult.choices[0].message.content.match(/\[[\s\S]*\]/);
    if (match) queries = JSON.parse(match[0]);
  } catch {
    queries = [topic];
  }
  
  const allSources: any[] = [];
  const allResults: string[] = [];
  
  for (const query of queries.slice(0, 5)) {
    const { output, sources } = await executeWebSearch(query);
    allResults.push(`Query: "${query}"\n${output}`);
    allSources.push(...sources);
  }
  
  // Deduplicate sources
  const uniqueSources = allSources.filter((s, i, arr) => 
    arr.findIndex(x => x.url === s.url) === i
  );
  
  console.log(`[Agent] Deep search completed with ${uniqueSources.length} unique sources`);
  return { output: allResults.join("\n\n---\n\n"), sources: uniqueSources };
}

async function executeImageGenerate(prompt: string, userId: string, supabase: any): Promise<{ output: string; sources: any[]; imageUrl?: string }> {
  console.log(`[Agent] Generating image: ${prompt.slice(0, 100)}...`);
  
  try {
    // Use Lovable AI's image generation model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: `Generate a high-quality image: ${prompt}` }],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Agent] Image generation failed:", error);
      return { output: `Image generation failed: ${error}`, sources: [] };
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (imageData) {
      // Store the image in Supabase storage
      const imageId = crypto.randomUUID();
      const now = new Date();
      const path = `${userId}/agent/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${imageId}.png`;
      
      // Convert base64 to bytes
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      
      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(path, bytes, { contentType: 'image/png' });
      
      if (uploadError) {
        console.error("[Agent] Failed to store image:", uploadError);
        return { 
          output: `✅ Image generated successfully!\n\n[Image data available but not stored]`, 
          sources: [],
          imageUrl: imageData 
        };
      }
      
      // Get signed URL
      const { data: signedData } = await supabase.storage
        .from('user-files')
        .createSignedUrl(path, 3600);
      
      const publicUrl = signedData?.signedUrl || imageData;
      
      console.log(`[Agent] Image generated and stored: ${path}`);
      return { 
        output: `✅ Image generated successfully!\n\nPrompt: "${prompt}"\n\n![Generated Image](${publicUrl})`, 
        sources: [],
        imageUrl: publicUrl
      };
    }
    
    return { output: "Image generation completed but no image was returned", sources: [] };
  } catch (e: any) {
    console.error("[Agent] Image generation error:", e);
    return { output: `Image generation error: ${e.message}`, sources: [] };
  }
}

async function executeImageAnalyze(imageUrl: string, question: string): Promise<{ output: string; sources: any[] }> {
  console.log(`[Agent] Analyzing image: ${question}`);
  
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: question || "Describe this image in detail. What do you see?" },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }]
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { output: `Image analysis failed: ${error}`, sources: [] };
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content || "No analysis available";
    
    console.log(`[Agent] Image analyzed successfully`);
    return { output: `📸 **Image Analysis:**\n\n${analysis}`, sources: [] };
  } catch (e: any) {
    console.error("[Agent] Image analysis error:", e);
    return { output: `Image analysis error: ${e.message}`, sources: [] };
  }
}

async function executeTranslate(text: string, targetLang: string, sourceLang?: string): Promise<{ output: string; sources: any[] }> {
  console.log(`[Agent] Translating to ${targetLang}`);
  
  const result = await callLLM([
    { role: "system", content: `You are a professional translator. Translate the text accurately while preserving meaning and tone. ${sourceLang ? `Source language: ${sourceLang}.` : 'Detect the source language.'} Target language: ${targetLang}.` },
    { role: "user", content: `Translate this text to ${targetLang}:\n\n${text}` }
  ]);
  
  const translation = result.choices[0].message.content;
  return { 
    output: `🌐 **Translation (→ ${targetLang}):**\n\n${translation}`, 
    sources: [] 
  };
}

async function executeReason(problem: string, context: string): Promise<{ output: string; sources: any[] }> {
  console.log(`[Agent] Deep reasoning on problem`);
  
  // Use the more powerful model for complex reasoning
  const result = await callLLM([
    { role: "system", content: `You are an expert problem solver. Think through the problem step by step, showing your reasoning. Consider multiple angles and approaches. Be thorough but clear.` },
    { role: "user", content: `Problem: ${problem}\n\n${context ? `Context:\n${context}\n\n` : ''}Solve this step by step.` }
  ], { model: "google/gemini-2.5-pro", temperature: 0.3 });
  
  return { 
    output: `🧠 **Deep Analysis:**\n\n${result.choices[0].message.content}`, 
    sources: [] 
  };
}

async function executeCode(task: string, language?: string): Promise<{ output: string; sources: any[] }> {
  console.log(`[Agent] Code task: ${task.slice(0, 100)}...`);
  
  const result = await callLLM([
    { role: "system", content: `You are an expert programmer. Write clean, well-documented code. ${language ? `Use ${language}.` : 'Choose the most appropriate language.'} Include explanations.` },
    { role: "user", content: task }
  ], { temperature: 0.2 });
  
  return { 
    output: `💻 **Code Solution:**\n\n${result.choices[0].message.content}`, 
    sources: [] 
  };
}

// ===== STEP EXECUTION =====

async function executeStep(
  step: AgentStep,
  goal: string,
  previousResults: string[],
  userId: string,
  supabase: any
): Promise<{ output: string; sources: any[]; imageUrl?: string }> {
  const toolName = step.tool;
  const prevContext = previousResults.slice(-3).join("\n\n");
  
  console.log(`[Agent] Executing tool: ${toolName || 'general'}`);
  
  // Web Search
  if (toolName === "web_search") {
    const queryResult = await callLLM([
      { role: "system", content: "Generate a concise, effective search query (max 12 words) for web search. Respond with just the query, no quotes or explanation." },
      { role: "user", content: `Goal: ${goal}\nStep: ${step.title}\nContext: ${prevContext}` }
    ]);
    const query = queryResult.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
    return await executeWebSearch(query);
  }
  
  // Deep Search (multiple queries)
  if (toolName === "deep_search") {
    return await executeDeepSearch(step.title, goal);
  }
  
  // Image Generation
  if (toolName === "image_generate") {
    const promptResult = await callLLM([
      { role: "system", content: "Generate a detailed image prompt based on the step. Be specific about style, composition, and details. Respond with just the prompt, no explanation." },
      { role: "user", content: `Goal: ${goal}\nStep: ${step.title}\nContext: ${prevContext}` }
    ]);
    const prompt = promptResult.choices[0].message.content.trim();
    return await executeImageGenerate(prompt, userId, supabase);
  }
  
  // Image Analysis
  if (toolName === "image_analyze") {
    // Look for image URL in context
    const urlMatch = prevContext.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i) || 
                     prevContext.match(/data:image\/[^;]+;base64,[^\s]+/);
    if (urlMatch) {
      return await executeImageAnalyze(urlMatch[0], step.title);
    }
    return { output: "No image URL found in context to analyze", sources: [] };
  }
  
  // Translation
  if (toolName === "translate") {
    const langMatch = step.title.match(/to\s+(english|uzbek|russian|turkish|spanish|french|german|chinese|japanese|korean|arabic)/i);
    const targetLang = langMatch ? langMatch[1] : "English";
    
    // Get text to translate from context
    const textToTranslate = prevContext || goal;
    return await executeTranslate(textToTranslate, targetLang);
  }
  
  // Deep Reasoning
  if (toolName === "reason") {
    return await executeReason(step.title, prevContext);
  }
  
  // Code
  if (toolName === "code") {
    return await executeCode(`${goal}\n\nSpecific task: ${step.title}\n\nContext:\n${prevContext}`);
  }
  
  // Summarize
  if (toolName === "summarize") {
    const result = await callLLM([
      { role: "system", content: "Summarize the content into clear, actionable key points. Use bullet points. Be concise but comprehensive." },
      { role: "user", content: `Goal: ${goal}\nContent to summarize:\n${prevContext}` }
    ]);
    return { output: `📝 **Summary:**\n\n${result.choices[0].message.content}`, sources: [] };
  }
  
  // Analyze
  if (toolName === "analyze") {
    const result = await callLLM([
      { role: "system", content: "Analyze the content thoroughly. Identify patterns, insights, issues, and opportunities. Be detailed." },
      { role: "user", content: `Goal: ${goal}\nStep: ${step.title}\nContent to analyze:\n${prevContext}` }
    ]);
    return { output: `🔍 **Analysis:**\n\n${result.choices[0].message.content}`, sources: [] };
  }
  
  // Calculate
  if (toolName === "calculate") {
    const result = await callLLM([
      { role: "system", content: "Perform the calculation or data analysis. Show your work step by step. Be precise with numbers." },
      { role: "user", content: `Goal: ${goal}\nCalculation task: ${step.title}\nData:\n${prevContext}` }
    ], { temperature: 0.1 });
    return { output: `🔢 **Calculation:**\n\n${result.choices[0].message.content}`, sources: [] };
  }
  
  // Default: general LLM execution
  const result = await callLLM([
    { role: "system", content: `You are executing a step in a multi-step plan. Be thorough and actionable.` },
    { role: "user", content: `Goal: ${goal}\nStep: ${step.title}\nPrevious results:\n${prevContext}\n\nExecute this step and provide the result.` }
  ]);
  
  return { output: result.choices[0].message.content, sources: [] };
}

async function generateFinalOutput(
  goal: string,
  steps: { title: string; output: string }[],
  allSources: any[],
  generatedImages: string[]
): Promise<string> {
  const stepsContext = steps.map((s, i) => `Step ${i + 1} (${s.title}):\n${s.output}`).join("\n\n---\n\n");
  
  const result = await callLLM([
    { role: "system", content: `You are Bahor AI Agent. Synthesize the results from multiple steps into a comprehensive, well-structured final answer. 

Use markdown formatting:
- Use ## headers for sections
- Use **bold** for emphasis
- Use bullet lists for key points
- Use code blocks for code
- Include any generated images with proper markdown: ![description](url)

Be thorough but well-organized. If sources were used, they will be displayed separately - don't list URLs in your response.` },
    { role: "user", content: `Goal: ${goal}\n\nStep Results:\n${stepsContext}\n\n${generatedImages.length > 0 ? `Generated Images: ${generatedImages.join(', ')}` : ''}\n\nProvide the final comprehensive answer.` }
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

    const { goal, runId, action, constraints, files, links, notes } = await req.json();

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

    console.log(`[Agent] Starting run for user ${user.id}, goal: ${goal.slice(0, 100)}...`);

    // Build context from files, links, notes
    let contextParts: string[] = [];
    
    if (files && files.length > 0) {
      contextParts.push("=== UPLOADED FILES ===");
      for (const file of files) {
        contextParts.push(`\n--- File: ${file.filename} ---\n${file.text?.slice(0, 15000) || "[No content extracted]"}`);
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
    console.log(`[Agent] Generated plan with ${plan.length} steps:`, plan.map(s => s.tool || 'general').join(', '));

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
    const generatedImages: string[] = [];

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

      console.log(`[Agent] Executing step ${i + 1}/${plan.length}: ${plan[i].title} (tool: ${plan[i].tool || 'general'})`);

      try {
        const { output, sources, imageUrl } = await executeStep(
          plan[i],
          goal,
          stepResults.map(r => r.output),
          user.id,
          supabaseClient
        );

        stepResults.push({ title: plan[i].title, output });
        allSources.push(...sources);
        if (imageUrl) generatedImages.push(imageUrl);

        // Update step to done
        await supabaseClient
          .from("agent_steps")
          .update({
            status: "done",
            tool_output: { result: output, sources, imageUrl },
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

        stepResults.push({ title: plan[i].title, output: `⚠️ Error: ${stepError.message}` });
      }
    }

    // Generate final output
    console.log(`[Agent] Generating final output from ${stepResults.length} steps`);
    const finalOutput = await generateFinalOutput(goal, stepResults, allSources, generatedImages);

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

    console.log(`[Agent] Run ${run.id} completed with ${uniqueSources.length} sources, ${generatedImages.length} images`);

    return new Response(JSON.stringify({ 
      runId: run.id, 
      status: "done",
      finalOutput,
      sources: uniqueSources,
      images: generatedImages,
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
