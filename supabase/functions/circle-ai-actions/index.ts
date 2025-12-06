import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ActionRequest {
  circle_id: string;
  type: "summary" | "tasks" | "decisions" | "plan" | "meeting_notes" | "issues";
  scope?: number; // 30, 100, or 300
  include_files?: boolean;
  extra_note?: string;
}

const ACTION_TITLES: Record<string, string> = {
  summary: "Xulosa",
  tasks: "Vazifalar",
  decisions: "Qarorlar",
  plan: "Reja",
  meeting_notes: "Uchrashuv bayonnomasi",
  issues: "Muammolar va yechimlar",
};

const PROMPTS: Record<string, string> = {
  summary: `Siz professional yordamchisiz. Quyidagi guruh suhbatidan qisqa va aniq xulosa chiqaring.

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

  issues: `Siz professional muammolar tahlilchisisiz. Quyidagi guruh suhbatidan muammolar va ularning yechimlarini aniqlang.

VAZIFA:
- Muhokama qilingan muammolarni aniqlang
- Har bir muammo uchun taklif qilingan yechimlarni yozing
- Hal qilingan va hal qilinmagan muammolarni ajrating
- O'zbek tilida javob bering

FORMAT:
## 🔧 Muammolar va yechimlar

### Hal qilingan muammolar:
#### [Muammo 1]
- **Muammo:** [tavsif]
- **Yechim:** [qabul qilingan yechim]
- **Mas'ul:** [kim hal qildi/qiladi]
...

### Hal qilinmagan muammolar:
#### [Muammo 1]
- **Muammo:** [tavsif]
- **Taklif qilingan yechimlar:**
  - [Yechim varianti 1]
  - [Yechim varianti 2]
- **Keyingi qadam:** [nima qilish kerak]
...

### Kelajakda e'tibor berish kerak:
- ⚠️ [Potensial muammo 1]
...`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[circle-ai-actions] No Authorization header");
      return new Response(JSON.stringify({ error: "Kirish kerak. Iltimos login qiling." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user client for auth verification using anon key + auth header
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: authHeader },
      },
      auth: { persistSession: false },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("[circle-ai-actions] Auth error:", authError?.message || "No user");
      return new Response(JSON.stringify({ error: "Kirish kerak. Iltimos login qiling." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[circle-ai-actions] Authenticated user: ${user.id}`);

    // Create service client for DB operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { circle_id, type, scope = 100, include_files = true, extra_note }: ActionRequest = await req.json();

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
      console.error("[circle-ai-actions] Membership check failed:", memberError?.message || "Not a member");
      return new Response(JSON.stringify({ error: "Siz bu doiraga a'zo emassiz yoki ruxsat yo'q." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[circle-ai-actions] User ${user.id} is member of circle ${circle_id}`);

    // Validate and normalize scope
    const messageLimit = Math.min(Math.max(scope, 10), 300);

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
      return new Response(JSON.stringify({ error: "Bu doirada xabarlar yo'q" }), {
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

    // Optionally fetch file metadata if include_files is true
    let filesContext = "";
    if (include_files) {
      const { data: files } = await supabase
        .from("space_files")
        .select("original_name, mime_type, created_at")
        .eq("space_id", circle_id)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (files && files.length > 0) {
        filesContext = "\n\n--- Biriktirilgan fayllar ---\n" + 
          files.map(f => `- ${f.original_name} (${f.mime_type})`).join("\n");
      }
    }

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

    let chatContext = contextLines.join("\n") + filesContext;
    
    // Add extra note if provided
    if (extra_note) {
      chatContext += `\n\n--- Qo'shimcha ko'rsatma ---\n${extra_note}`;
    }

    const systemPrompt = PROMPTS[type] || PROMPTS.summary;

    // Call AI
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[circle-ai-actions] Generating ${type} for circle ${circle_id}, ${messages.length} messages, scope=${scope}`);

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
        max_tokens: 2500,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limit tugadi. Keyinroq urinib ko'ring." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI xizmati uchun to'lov talab qilinadi." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI xizmatida xatolik" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices?.[0]?.message?.content || "";

    if (!generatedContent) {
      return new Response(JSON.stringify({ error: "AI bo'sh javob qaytardi" }), {
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
        title: `${ACTION_TITLES[type] || type} (${messages.length} xabar)`,
        content_md: generatedContent,
        source_message_count: messages.length,
        source_last_message_at: lastMessageAt,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error saving card:", insertError);
      return new Response(JSON.stringify({ error: "Saqlashda xatolik" }), {
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
