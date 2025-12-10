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

// Gemini-style research paper template
const REPORT_TEMPLATE = `You are generating a professional research report. Structure your response using this EXACT format:

# [Title - derived from the research goal]

## Executive Summary
[5-8 bullet points summarizing the key findings and conclusions]

## Scope & Inputs Used
[List all sources used: files, links, user notes, web searches. Be explicit about what was analyzed.]

### Files Analyzed
- [filename1] - [brief description of content]
- [filename2] - [brief description of content]

### Web Sources
- [source1] - [title]
- [source2] - [title]

### User Notes
[Summarize any notes provided]

## Problem / Question
[Clear statement of what was investigated]

## Methodology
[What sources were used, what tools were invoked, how information was gathered]

## Key Findings
[Bullet points of the most important discoveries]
- Finding 1 〔1〕
- Finding 2 〔2〕
- Finding 3 〔3〕

## Detailed Analysis
[Organized analysis with subheadings as needed]

### [Subtopic 1]
[Analysis with citations using 〔1〕 〔2〕 format]

### [Subtopic 2]
[More analysis]

## Evidence & Citations
[Map each finding to specific file/page/message references]
- 〔1〕 [File: filename.pdf | Page: 3] - "quoted text..."
- 〔2〕 [Source: url] - "quoted text..."
- 〔3〕 [From user notes] - "quoted text..."

## Recommendations

### Immediate (Today)
- [Actionable recommendation]

### This Week
- [Short-term recommendation]

### This Month
- [Medium-term recommendation]

## Risks & Mitigations
- **Risk 1**: [description] → **Mitigation**: [action]
- **Risk 2**: [description] → **Mitigation**: [action]

## Action Plan

### 7-Day Sprint
1. Day 1-2: [Actions]
2. Day 3-4: [Actions]
3. Day 5-7: [Actions]

### 30-Day Plan
[Monthly plan overview]

## Assumptions & What's Missing
[Only include if there are gaps - be explicit about what information was NOT available]

---

CRITICAL RULES:
- Use 〔1〕 〔2〕 notation for citations linking to sources
- EVERY factual claim MUST have a citation from provided inputs
- NEVER invent product features, company details, or facts not in the inputs
- If critical info is missing, create a "Missing Information" section asking for it
- Write in the same language as the original research goal
- Be thorough but well-organized`;

// Validation: Check if output contains domain keywords not in inputs
const UNRELATED_DOMAIN_KEYWORDS = [
  "community creators", "event tickets", "moderation tools", "ticketing platform",
  "live streaming", "gaming platform", "e-commerce store", "real estate listing"
];

function validateOutputAgainstInputs(output: string, inputs: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  const inputLower = inputs.toLowerCase();
  const outputLower = output.toLowerCase();
  
  for (const keyword of UNRELATED_DOMAIN_KEYWORDS) {
    if (outputLower.includes(keyword) && !inputLower.includes(keyword)) {
      issues.push(`Contains unrelated keyword "${keyword}" not found in inputs`);
    }
  }
  
  return { valid: issues.length === 0, issues };
}

// Generate a short title for the thread
async function generateThreadTitle(goal: string): Promise<string> {
  try {
    const result = await callLLM([
      { role: "system", content: "Generate a very short title (max 6 words) for this task. Respond with just the title, no quotes." },
      { role: "user", content: goal }
    ], { temperature: 0.3 });
    return result.choices[0].message.content.trim().slice(0, 100);
  } catch {
    return goal.slice(0, 60);
  }
}

async function generatePlan(goal: string, context: string, conversationHistory?: any[], fileMetadata?: any[]): Promise<AgentStep[]> {
  // Check if files were provided but have insufficient content
  const hasFiles = fileMetadata && fileMetadata.length > 0;
  const totalChars = fileMetadata?.reduce((sum, f) => sum + (f.textLength || 0), 0) || 0;
  const filesReady = !hasFiles || totalChars >= 200;
  
  let systemPrompt = `You are Bahor AI Agent, an intelligent assistant that breaks down complex tasks into actionable steps.

=== STRICT INPUT CONTRACT (MANDATORY - NEVER VIOLATE) ===

You may ONLY use information from:
1. The user's prompt and extra notes
2. Uploaded files attached to this agent run (if provided and accessible)
3. Links explicitly provided by the user
4. Web search results (if search tool is used)
5. The current conversation context

You MUST NOT:
- Invent product features, company details, or facts not explicitly in the inputs
- Make assumptions about the user's business or project
- Generate content about unrelated domains
- Fabricate statistics or quotes

If required information is missing:
- Output a "Missing Information" section
- Ask the user to provide the needed data
- Do NOT guess or fill in with generic content

=== EVIDENCE RULES (MANDATORY) ===

1. EVIDENCE RULE (hard):
   - If you cannot access full text of attached files OR total extracted text is < 200 chars, you MUST respond ONLY with:
     "I can't access the file content yet. Please re-upload or wait until extraction says 'Tayyor/Ready'."
   - List which files are missing text and their statuses
   - STOP. No guessing, no inferred analysis.

2. CITATION RULE (hard):
   - Every factual claim from files must include a citation: 〔File: <filename> | Section: <heading>〕
   - If you cannot cite, you must not claim.

3. PROOF-OF-READING (mandatory):
   Before any file-based analysis, you MUST include:
   - "Top headings detected" — list first 10 headings from the file(s)
   - "3 short quotes" — 10-25 words from 3 different sections
   If you can't do this, fail with Evidence Rule.

=== END RULES ===

${!filesReady && hasFiles ? `
⚠️ CRITICAL: Files were attached but extraction returned < 200 chars total (${totalChars} chars).
You MUST refuse to analyze and ask user to re-upload or wait.
` : ''}

Available tools you can use in steps:
- web_search: Search the web for current information
- deep_search: Multiple web searches for comprehensive research
- image_generate: Generate an image from text description
- image_analyze: Analyze/describe an image
- translate: Translate text between languages
- summarize: Summarize long content
- analyze: Analyze data, text, or code in detail
- calculate: Perform calculations
- reason: Deep reasoning for complex problems
- code: Write or analyze code

${context ? `User has provided additional context/files. ONLY use information from these inputs.` : "No additional context provided."}
${conversationHistory && conversationHistory.length > 0 ? `This is a follow-up question. Build upon previous context.` : ""}

Respond with JSON: { "steps": [{ "title": "Step description", "rationale": "Why", "tool": "tool_name or null" }] }`;

  // Build user message with conversation history context
  let userMessage = "";
  
  if (conversationHistory && conversationHistory.length > 0) {
    userMessage += "=== PREVIOUS CONVERSATION ===\n";
    for (const turn of conversationHistory.slice(-6)) {
      if (turn.role === "user") {
        userMessage += `User asked: ${turn.goal || turn.content}\n`;
      } else {
        const content = turn.content.length > 2000 
          ? turn.content.slice(0, 2000) + "...[truncated]" 
          : turn.content;
        userMessage += `Assistant answered: ${content}\n`;
      }
      userMessage += "\n";
    }
    userMessage += "=== CURRENT REQUEST ===\n";
  }
  
  userMessage += context 
    ? `Goal: ${goal}\n\nAdditional Context (ONLY use information from here):\n${context}\n\nCreate a step-by-step plan using ONLY the provided inputs.`
    : `Goal: ${goal}\n\nNo files or additional context provided. Create a step-by-step plan. If the goal requires specific information not available, plan to ask for it.`;

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
    { title: "Analyze the goal and available inputs", rationale: "Understand requirements" },
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
    
    const resultText = sources.map((s: any, i: number) => `〔${i+1}〕 ${s.title}: ${s.snippet}`).join("\n\n");
    console.log(`[Agent] Web search returned ${sources.length} results for: ${query}`);
    return { output: resultText || "No results found", sources };
  } catch (e) {
    console.error("Web search error:", e);
    return { output: "Search failed", sources: [] };
  }
}

async function executeDeepSearch(topic: string, goal: string): Promise<{ output: string; sources: any[] }> {
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
  
  const uniqueSources = allSources.filter((s, i, arr) => 
    arr.findIndex(x => x.url === s.url) === i
  );
  
  console.log(`[Agent] Deep search completed with ${uniqueSources.length} unique sources`);
  return { output: allResults.join("\n\n---\n\n"), sources: uniqueSources };
}

async function executeImageGenerate(prompt: string, userId: string, supabase: any): Promise<{ output: string; sources: any[]; imageUrl?: string }> {
  console.log(`[Agent] Generating image: ${prompt.slice(0, 100)}...`);
  
  try {
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
      const imageId = crypto.randomUUID();
      const now = new Date();
      const path = `${userId}/agent/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${imageId}.png`;
      
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
  
  if (toolName === "web_search") {
    const queryResult = await callLLM([
      { role: "system", content: "Generate a concise, effective search query (max 12 words) for web search. Respond with just the query, no quotes or explanation." },
      { role: "user", content: `Goal: ${goal}\nStep: ${step.title}\nContext: ${prevContext}` }
    ]);
    const query = queryResult.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
    return await executeWebSearch(query);
  }
  
  if (toolName === "deep_search") {
    return await executeDeepSearch(step.title, goal);
  }
  
  if (toolName === "image_generate") {
    const promptResult = await callLLM([
      { role: "system", content: "Generate a detailed image prompt based on the step. Be specific about style, composition, and details. Respond with just the prompt, no explanation." },
      { role: "user", content: `Goal: ${goal}\nStep: ${step.title}\nContext: ${prevContext}` }
    ]);
    const prompt = promptResult.choices[0].message.content.trim();
    return await executeImageGenerate(prompt, userId, supabase);
  }
  
  if (toolName === "image_analyze") {
    const urlMatch = prevContext.match(/https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)/i) || 
                     prevContext.match(/data:image\/[^;]+;base64,[^\s]+/);
    if (urlMatch) {
      return await executeImageAnalyze(urlMatch[0], step.title);
    }
    return { output: "No image URL found in context to analyze", sources: [] };
  }
  
  if (toolName === "translate") {
    const langMatch = step.title.match(/to\s+(english|uzbek|russian|turkish|spanish|french|german|chinese|japanese|korean|arabic)/i);
    const targetLang = langMatch ? langMatch[1] : "English";
    const textToTranslate = prevContext || goal;
    return await executeTranslate(textToTranslate, targetLang);
  }
  
  if (toolName === "reason") {
    return await executeReason(step.title, prevContext);
  }
  
  if (toolName === "code") {
    return await executeCode(`${goal}\n\nSpecific task: ${step.title}\n\nContext:\n${prevContext}`);
  }
  
  if (toolName === "summarize") {
    const result = await callLLM([
      { role: "system", content: "Summarize the content into clear, actionable key points. Use bullet points. Be concise but comprehensive." },
      { role: "user", content: `Goal: ${goal}\nContent to summarize:\n${prevContext}` }
    ]);
    return { output: `📝 **Summary:**\n\n${result.choices[0].message.content}`, sources: [] };
  }
  
  if (toolName === "analyze") {
    const result = await callLLM([
      { role: "system", content: "Analyze the content thoroughly. Identify patterns, insights, issues, and opportunities. Be detailed." },
      { role: "user", content: `Goal: ${goal}\nStep: ${step.title}\nContent to analyze:\n${prevContext}` }
    ]);
    return { output: `🔍 **Analysis:**\n\n${result.choices[0].message.content}`, sources: [] };
  }
  
  if (toolName === "calculate") {
    const result = await callLLM([
      { role: "system", content: "Perform the calculation or data analysis. Show your work step by step. Be precise with numbers." },
      { role: "user", content: `Goal: ${goal}\nCalculation task: ${step.title}\nData:\n${prevContext}` }
    ], { temperature: 0.1 });
    return { output: `🔢 **Calculation:**\n\n${result.choices[0].message.content}`, sources: [] };
  }
  
  // Default: general LLM execution
  const result = await callLLM([
    { role: "system", content: `You are executing a step in a multi-step plan. Be thorough and actionable. ONLY use information from the provided context.` },
    { role: "user", content: `Goal: ${goal}\nStep: ${step.title}\nPrevious results:\n${prevContext}\n\nExecute this step and provide the result using ONLY the available information.` }
  ]);
  
  return { output: result.choices[0].message.content, sources: [] };
}

// Generate structured research report
async function generateFinalReport(
  goal: string,
  steps: { title: string; output: string }[],
  allSources: any[],
  generatedImages: string[],
  fileMetadata: any[],
  notes: string,
  links: string[],
  conversationHistory?: any[]
): Promise<string> {
  const stepsContext = steps.map((s, i) => `Step ${i + 1} (${s.title}):\n${s.output}`).join("\n\n---\n\n");
  
  // Build input summary for transparency
  let inputSummary = "=== INPUTS USED ===\n";
  
  if (fileMetadata && fileMetadata.length > 0) {
    inputSummary += "\nFILES:\n";
    for (const file of fileMetadata) {
      inputSummary += `- ${file.filename} (${file.textLength} chars)\n`;
    }
  } else {
    inputSummary += "\nFILES: None provided\n";
  }
  
  if (links && links.length > 0) {
    inputSummary += "\nLINKS:\n";
    for (const link of links) {
      inputSummary += `- ${link}\n`;
    }
  }
  
  if (notes && notes.trim()) {
    inputSummary += `\nUSER NOTES:\n${notes}\n`;
  }
  
  if (allSources && allSources.length > 0) {
    inputSummary += "\nWEB SOURCES:\n";
    for (let i = 0; i < Math.min(allSources.length, 15); i++) {
      inputSummary += `〔${i+1}〕 ${allSources[i].title} - ${allSources[i].url}\n`;
    }
  }
  
  // Conversation context
  let conversationContext = "";
  if (conversationHistory && conversationHistory.length > 0) {
    conversationContext = "\n\n=== PREVIOUS CONVERSATION ===\n";
    for (const turn of conversationHistory.slice(-4)) {
      if (turn.role === "user") {
        conversationContext += `User: ${turn.goal || turn.content}\n`;
      } else {
        const brief = turn.content.length > 500 
          ? turn.content.slice(0, 500) + "..." 
          : turn.content;
        conversationContext += `Assistant: ${brief}\n`;
      }
    }
  }
  
  const result = await callLLM([
    { role: "system", content: REPORT_TEMPLATE },
    { role: "user", content: `Goal: ${goal}
${inputSummary}
${conversationContext}

=== STEP RESULTS ===
${stepsContext}

${generatedImages.length > 0 ? `Generated Images: ${generatedImages.join(', ')}` : ''}

Generate a comprehensive research report following the exact template structure. 
Use 〔n〕 notation for ALL citations, mapping to the sources listed above.
ONLY include information from the provided inputs. Do NOT invent details.
If critical information is missing, add a "Missing Information" section.` }
  ], { model: "google/gemini-2.5-pro", temperature: 0.4 });
  
  return result.choices[0].message.content;
}

// Load conversation history from agent_messages table
async function loadConversationHistory(supabase: any, threadId: string): Promise<any[]> {
  const { data: messages } = await supabase
    .from("agent_messages")
    .select("role, content, metadata")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(20);

  if (!messages || messages.length === 0) return [];

  return messages.map((m: any) => ({
    role: m.role,
    content: m.content,
    goal: m.metadata?.goal,
    sources: m.metadata?.sources
  }));
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
    
    // Use service role client to verify the JWT token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error("[Agent] Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Invalid token", details: userError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("[Agent] Authenticated user:", user.email);

    const { goal, runId, action, threadId, constraints, files, links, notes } = await req.json();

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

    // === THREAD MANAGEMENT ===
    let activeThreadId = threadId;
    
    if (!activeThreadId) {
      const threadTitle = await generateThreadTitle(goal);
      const { data: newThread, error: threadError } = await supabaseClient
        .from("agent_threads")
        .insert({
          user_id: user.id,
          title: threadTitle,
        })
        .select()
        .single();
      
      if (threadError) {
        console.error("Failed to create thread:", threadError);
        throw new Error("Failed to create agent thread");
      }
      
      activeThreadId = newThread.id;
      console.log(`[Agent] Created new thread: ${activeThreadId}`);
    }

    // Load conversation history from the thread
    const conversationHistory = await loadConversationHistory(supabaseClient, activeThreadId);
    console.log(`[Agent] Loaded ${conversationHistory.length} messages from thread history`);

    // Save user message to thread
    await supabaseClient.from("agent_messages").insert({
      thread_id: activeThreadId,
      user_id: user.id,
      role: "user",
      content: goal,
      metadata: { goal, files: files?.length || 0, links: links?.length || 0 }
    });

    // Build context from files, links, notes with metadata
    let contextParts: string[] = [];
    const fileMetadata: Array<{ filename: string; textLength: number; status: string }> = [];
    
    console.log(`[Agent] Received files payload:`, files ? files.map((f: any) => ({ filename: f.filename, hasText: !!f.text, textLen: f.text?.length || 0 })) : 'none');
    
    if (files && files.length > 0) {
      contextParts.push("=== UPLOADED FILES (USE ONLY THIS CONTENT) ===");
      for (const file of files) {
        const textLen = file.text?.length || 0;
        console.log(`[Agent] Processing file: ${file.filename}, text length: ${textLen}`);
        fileMetadata.push({ 
          filename: file.filename, 
          textLength: textLen,
          status: textLen >= 200 ? "ready" : "insufficient"
        });
        contextParts.push(`\n--- File: ${file.filename} (${textLen} chars) ---\n${file.text?.slice(0, 15000) || "[No content extracted]"}`);
      }
      console.log(`[Agent] Total context length: ${contextParts.join('').length} chars`);
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

    // Create the run linked to thread
    const { data: run, error: runError } = await supabaseClient
      .from("agent_runs")
      .insert({
        user_id: user.id,
        thread_id: activeThreadId,
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

    console.log(`[Agent] Created run ${run.id} in thread ${activeThreadId}`);

    // Execute the agent in background
    const executeAgentRun = async () => {
      try {
        // Generate plan with strict input contract
        const plan = await generatePlan(goal, context, conversationHistory, fileMetadata);
        console.log(`[Agent] Generated plan with ${plan.length} steps:`, plan.map(s => s.tool || 'general').join(', '));

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
          const { data: currentRun } = await supabaseClient
            .from("agent_runs")
            .select("status")
            .eq("id", run.id)
            .single();

          if (currentRun?.status === "cancelled") {
            console.log(`[Agent] Run ${run.id} was cancelled`);
            break;
          }

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

        // Generate structured research report
        console.log(`[Agent] Generating final research report from ${stepResults.length} steps`);
        const finalReport = await generateFinalReport(
          goal, 
          stepResults, 
          allSources, 
          generatedImages,
          fileMetadata,
          notes || "",
          links || [],
          conversationHistory
        );

        // Validate output against inputs
        const validation = validateOutputAgainstInputs(finalReport, context + goal + (notes || ""));
        if (!validation.valid) {
          console.warn(`[Agent] Output validation issues:`, validation.issues);
          // Could regenerate here, but for now just log
        }

        // Deduplicate sources
        const uniqueSources = allSources.filter((s, i, arr) => 
          arr.findIndex(x => x.url === s.url) === i
        );

        // Update run to done with both final_output and final_report_md
        await supabaseClient
          .from("agent_runs")
          .update({
            status: "done",
            final_output: finalReport,
            sources: uniqueSources,
            updated_at: new Date().toISOString(),
          })
          .eq("id", run.id);

        // Save assistant message to thread
        await supabaseClient.from("agent_messages").insert({
          thread_id: activeThreadId,
          user_id: user.id,
          role: "assistant",
          content: finalReport,
          metadata: { 
            run_id: run.id,
            sources: uniqueSources,
            images: generatedImages,
            steps_count: plan.length 
          }
        });

        // Update thread's rolling summary
        const summaryText = `${goal.slice(0, 100)}${goal.length > 100 ? '...' : ''}`;
        await supabaseClient
          .from("agent_threads")
          .update({ 
            rolling_summary: summaryText,
            updated_at: new Date().toISOString()
          })
          .eq("id", activeThreadId);

        console.log(`[Agent] Run ${run.id} completed with ${uniqueSources.length} sources, ${generatedImages.length} images`);

      } catch (bgError: any) {
        console.error(`[Agent] Background execution error for run ${run.id}:`, bgError);
        
        await supabaseClient
          .from("agent_runs")
          .update({
            status: "error",
            final_output: `Xato yuz berdi: ${bgError.message || "Agent execution failed"}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", run.id);

        await supabaseClient.from("agent_messages").insert({
          thread_id: activeThreadId,
          user_id: user.id,
          role: "assistant",
          content: `⚠️ Xato yuz berdi: ${bgError.message || "Agent execution failed"}`,
          metadata: { run_id: run.id, error: true }
        });
      }
    };

    // Start background execution
    (globalThis as any).EdgeRuntime?.waitUntil?.(executeAgentRun()) ?? executeAgentRun().catch(console.error);

    return new Response(JSON.stringify({ 
      runId: run.id, 
      threadId: activeThreadId,
      status: "planning",
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
