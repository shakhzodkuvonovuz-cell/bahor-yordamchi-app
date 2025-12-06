import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ActionRequest {
  circle_id: string;
  type: "summary_20" | "summary_100" | "tasks" | "decisions" | "plan" | "meeting_notes";
}

const ACTION_TITLES: Record<string, string> = {
  summary_20: "Xulosa (oxirgi 20 xabar)",
  summary_100: "Xulosa (oxirgi 100 xabar)",
  tasks: "Vazifalar",
  decisions: "Qarorlar",
  plan: "Reja",
  meeting_notes: "Uchrashuv bayonnomasi",
};

const PROMPTS: Record<string, string> = {
  summary_20: `Siz professional yordamchisiz. Quyidagi guruh suhbatidan qisqa va aniq xulosa chiqaring.

VAZIFA:
- 5-10 ta asosiy nuqtani bullet point shaklida yozing
- Muhim qarorlar va natijalarni alohida ko'rsating
- Hal qilinmagan masalalarni belgilang
- O'zbek tilida javob bering

FORMAT:
## 📋 Xulosa

### Asosiy nuqtalar:
- [nuqta 1]
- [nuqta 2]
...

### Muhim qarorlar:
- [qaror 1]
...

### Ochiq savollar:
- [savol 1]
...`,

  summary_100: `Siz professional yordamchisiz. Quyidagi guruh suhbatidan batafsil xulosa chiqaring.

VAZIFA:
- 10-15 ta asosiy nuqtani bullet point shaklida yozing
- Muhim qarorlar va natijalarni batafsil ko'rsating
- Hal qilinmagan masalalarni belgilang
- Muhokama qilingan mavzularni guruhlab yozing
- O'zbek tilida javob bering

FORMAT:
## 📋 Batafsil Xulosa

### Mavzular bo'yicha:
#### [Mavzu 1]
- [nuqta]
...

### Asosiy qarorlar:
- [qaror 1]
...

### Keyingi qadamlar:
- [qadam 1]
...

### Ochiq savollar:
- [savol 1]
...`,

  tasks: `Siz professional vazifalar tahlilchisisiz. Quyidagi guruh suhbatidan vazifalar ro'yxatini chiqaring.

VAZIFA:
- Barcha aytilgan vazifalarni aniqlang
- Har bir vazifa uchun: mas'ul shaxs (agar aytilgan bo'lsa), muddat (agar aytilgan bo'lsa), muhimlik darajasi
- Aniq va qisqa yozing
- O'zbek tilida javob bering

FORMAT:
## ✅ Vazifalar

### Yuqori muhimlik:
- [ ] [Vazifa] — Mas'ul: [ism/noma'lum] | Muddat: [sana/noma'lum]
...

### O'rta muhimlik:
- [ ] [Vazifa] — Mas'ul: [ism/noma'lum] | Muddat: [sana/noma'lum]
...

### Past muhimlik:
- [ ] [Vazifa] — Mas'ul: [ism/noma'lum] | Muddat: [sana/noma'lum]
...`,

  decisions: `Siz professional qarorlar tahlilchisisiz. Quyidagi guruh suhbatidan qarorlar va ochiq savollarni ajrating.

VAZIFA:
- Qabul qilingan qarorlarni aniqlang
- Hali hal qilinmagan savollarni belgilang
- Xavflar va taxminlarni ko'rsating
- O'zbek tilida javob bering

FORMAT:
## 🎯 Qarorlar

### Qabul qilingan qarorlar:
1. [Qaror] — Sabab: [qisqa izoh]
...

### Ochiq savollar:
- [Savol 1]
...

### Xavflar va taxminlar:
- ⚠️ [Xavf/taxmin 1]
...`,

  plan: `Siz professional rejalashtiruvchisiz. Quyidagi guruh suhbatidan bosqichma-bosqich reja tuzing.

VAZIFA:
- Muhokama asosida aniq qadamlar belgilang
- Vaqt jadvali (agar mumkin bo'lsa)
- Bog'liqliklar va ketma-ketlikni ko'rsating
- O'zbek tilida javob bering

FORMAT:
## 📅 Reja

### 1-bosqich: [Nomi]
**Muddat:** [sana/hafta]
- [Qadam 1]
- [Qadam 2]
**Mas'ullar:** [ism yoki rol]

### 2-bosqich: [Nomi]
**Muddat:** [sana/hafta]
- [Qadam 1]
...

### Bog'liqliklar:
- [Bosqich X] → [Bosqich Y] ga bog'liq
...`,

  meeting_notes: `Siz professional kotibsiz. Quyidagi guruh suhbatidan uchrashuv bayonnomasini tuzing.

VAZIFA:
- Ishtirokchilarni aniqlang (agar ko'rinsa)
- Muhokama qilingan mavzularni guruhlang
- Har bir mavzu bo'yicha qisqa xulosalar
- Keyingi qadamlar va vazifalar
- O'zbek tilida javob bering

FORMAT:
## 📝 Uchrashuv bayonnomasi

**Sana:** [bugungi sana]
**Ishtirokchilar:** [ismlar ro'yxati yoki "Aniqlanmagan"]

---

### Kun tartibi:
1. [Mavzu 1]
2. [Mavzu 2]
...

---

### Muhokama:

#### [Mavzu 1]
- [Asosiy fikr]
- [Qaror/natija]

#### [Mavzu 2]
- [Asosiy fikr]
...

---

### Keyingi qadamlar:
- [ ] [Vazifa] — Mas'ul: [ism]
...

---

### Keyingi uchrashuv: [agar aytilgan bo'lsa]`,
};

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

    // Create user client for auth
    const supabaseUser = createClient(SUPABASE_URL, authHeader.replace("Bearer ", ""), {
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create service client for DB operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { circle_id, type }: ActionRequest = await req.json();

    if (!circle_id || !type) {
      return new Response(JSON.stringify({ error: "Missing circle_id or type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify membership
    const { data: membership, error: memberError } = await supabase
      .from("space_members")
      .select("id")
      .eq("space_id", circle_id)
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (memberError || !membership) {
      return new Response(JSON.stringify({ error: "Not a member of this circle" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine message count based on type
    const messageLimit = type === "summary_100" ? 100 : 20;

    // Fetch messages
    const { data: messages, error: msgError } = await supabase
      .from("space_messages")
      .select(`
        id,
        content,
        created_at,
        sender_id,
        type,
        attachments
      `)
      .eq("space_id", circle_id)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(messageLimit);

    if (msgError) {
      console.error("Error fetching messages:", msgError);
      return new Response(JSON.stringify({ error: "Failed to fetch messages" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages found in this circle" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender profiles
    const senderIds = [...new Set(messages.map(m => m.sender_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, email")
      .in("user_id", senderIds);

    const profileMap: Record<string, string> = {};
    profiles?.forEach(p => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || p.email || "Foydalanuvchi";
      profileMap[p.user_id] = name;
    });

    // Build context
    const sortedMessages = messages.reverse();
    const contextLines = sortedMessages.map(m => {
      const sender = profileMap[m.sender_id] || "Foydalanuvchi";
      const time = new Date(m.created_at).toLocaleString("uz-UZ", { 
        hour: "2-digit", 
        minute: "2-digit",
        day: "2-digit",
        month: "short"
      });
      const attachmentNote = m.attachments ? " [Fayl biriktirgan]" : "";
      return `[${time}] ${sender}: ${m.content || "(bo'sh xabar)"}${attachmentNote}`;
    });

    const chatContext = contextLines.join("\n");
    const systemPrompt = PROMPTS[type] || PROMPTS.summary_20;

    // Call AI
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[circle-ai-actions] Generating ${type} for circle ${circle_id}, ${messages.length} messages`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Quyidagi guruh suhbatini tahlil qiling:\n\n${chatContext}` },
        ],
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content || "";

    if (!generatedContent) {
      return new Response(JSON.stringify({ error: "AI returned empty response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save to database
    const lastMessageAt = sortedMessages[sortedMessages.length - 1]?.created_at;

    const { data: card, error: insertError } = await supabase
      .from("circle_ai_cards")
      .insert({
        circle_id,
        creator_id: user.id,
        type,
        title: ACTION_TITLES[type] || type,
        content_md: generatedContent,
        source_message_count: messages.length,
        source_last_message_at: lastMessageAt,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving card:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save card" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[circle-ai-actions] Created card ${card.id} for circle ${circle_id}`);

    return new Response(JSON.stringify({ card }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("circle-ai-actions error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
