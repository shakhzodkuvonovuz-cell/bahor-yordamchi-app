import { useEffect, useState } from "react";
import { downloadPDF, openHTMLPrintFallback, downloadAsMarkdown } from "@/lib/pdfGenerator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, FileText, Printer, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Full discovery document content
const DISCOVERY_DOCUMENT = `# Bahor AI: Full Stack Discovery Document

> **Version:** January 30, 2026  
> **Project URL:** https://bahor-yordamchi-app.lovable.app

---

## 1. Core Identity & "Vibe"

### The Mission
**"To provide quality AI services in Uzbek, helping with education, work, and everyday life."**

Bahor AI solves accessibility—global AI models feel disconnected from Uzbek culture, language nuances, and local contexts. Bahor AI fills this gap as the first Uzbek-first AI assistant.

### Target Audience
| Segment | Description |
|---------|-------------|
| **Primary** | Uzbek students (18-28) in cities like Tashkent and Samarkand preparing for IELTS, university, or job interviews |
| **Secondary** | Small business owners needing marketing content, and general users who value national identity |

### Brand Voice
**"Premium, human, warm, practical, confident"**

- Speak like a smart friend, not a robot or professor
- Uses localized examples: "Masalan, Sardor 100 dollar o'tkazmoqchi bo'lsa..."
- Cultural sensitivity: Respects religion, family values, traditions
- Identity protection: NEVER mentions DeepSeek, OpenAI, GPT—only identifies as "Bahor AI"

### Founder
**Shakhzod Kuvonov** (Shaxzod Quvonov in Uzbek)
- Young Uzbek developer and entrepreneur
- Contact: support@bahorai.com
- Website: https://www.bahorai.com

---

## 2. Technical Architecture

### Framework & Structure

| Layer | Technology |
|-------|------------|
| Frontend | **React 18 + Vite + TypeScript** |
| Styling | **Tailwind CSS** with HSL design tokens |
| State | **React Context** (AuthContext) + **TanStack Query** for server state |
| Backend | **Supabase** (Lovable Cloud) - Postgres + Edge Functions |
| Mobile | **Capacitor 7** for Android APK wrapper |
| PWA | Service worker + manifest.json |

### Project Structure
\`\`\`
src/                    # React frontend
  ├── components/       # UI components (shadcn/ui based)
  │   ├── ui/          # Base UI primitives
  │   ├── chat/        # Chat-specific components
  │   ├── agent/       # Agent mode components
  │   ├── circles/     # Group chat components
  │   └── layout/      # App shell, sidebar, footer
  ├── pages/           # Route pages
  ├── hooks/           # Custom React hooks
  ├── contexts/        # React Context providers (Auth, Theme)
  ├── lib/             # Utilities (prompts.ts, limits.ts, utils.ts)
  ├── i18n/            # Localization (uz, en, ru, tr)
  ├── data/            # Static data (modes, appIdentity)
  └── services/        # Service layer (ocr, vision, documents)
supabase/
  └── functions/       # 30+ Edge Functions
docs/                  # Documentation
\`\`\`

### Supabase Tables

#### Core Tables
| Table | Purpose |
|-------|---------|
| profiles | User data: name, avatar, plan, daily_limit, trial dates |
| profiles_private | Sensitive user data (phone number) |
| chat_threads | Chat session metadata (title, mode, message_count) |
| chat_messages | All messages (user/assistant), tokens, reactions |
| chat_attachments | Files attached to chats (images, PDFs) |
| attachment_text | Extracted text from attachments |

#### Subscription & Usage
| Table | Purpose |
|-------|---------|
| subscriptions | Payment status, period_start/end, linked ATMOS card |
| atmos_transactions | Payment transaction logs |
| atmos_cards | Saved payment cards |
| usage_counters | Daily usage tracking (messages, searches, vision) |
| daily_usage | Legacy daily message counts |
| user_entitlements | Admin-assigned special access |

#### Agent Mode
| Table | Purpose |
|-------|---------|
| agent_threads | Agent conversation threads |
| agent_runs | Agent execution records (goal, status, output) |
| agent_steps | Individual steps in agent execution |
| agent_files | Files uploaded for agent analysis |
| agent_messages | Messages in agent threads |

#### Circles (Group Chats)
| Table | Purpose |
|-------|---------|
| spaces | Circle/group metadata (name, owner, template) |
| space_members | Circle membership and roles |
| space_messages | Messages in circles |
| space_files | Shared files in circles |
| space_invites | Invite codes for circles |
| space_join_requests | Pending join requests |
| circle_ai_cards | AI-generated summaries for circles |

#### Other
| Table | Purpose |
|-------|---------|
| image_generations | Generated image records |
| video_generations | Generated video records |
| doc_jobs | Document processing jobs (PDF tools) |
| user_files | User's saved files |
| beta_feedback | User feedback submissions |
| search_cache | Cached Google search results |

### State Management

| State Type | Solution |
|------------|----------|
| Auth state | AuthContext using Supabase onAuthStateChange |
| Chat state | Local React state in Chat.tsx, persisted to Supabase |
| Usage state | useDailyUsage hook fetches from get_trial_status RPC |
| Theme | useTheme hook (defaults to dark mode) |
| Language | useLanguage hook (defaults to Uzbek) |
| Network | useNetworkStatus hook for offline detection |

---

## 3. AI Integration

### DeepSeek Connection

**Edge Function orchestration via supabase/functions/chat/index.ts:**

1. **Request comes in** → Validate JWT → Check usage limits via init_and_check_usage RPC
2. **Router decision** → Determines if user wants image, search, reasoning, or standard chat
3. **Tool calling** → DeepSeek's native function calling handles generate_image and web_search
4. **API call** → https://api.deepseek.com/chat/completions with streaming
5. **Post-processing** → formatAssistant.ts sanitizes any model name leaks

### Models Used

| Model | Purpose |
|-------|---------|
| deepseek-chat | Standard conversations (default) |
| deepseek-reasoner | Complex reasoning tasks |
| Lovable AI Gateway | Image generation, summaries |
| Gemini 2.5 Flash | Agent planning |
| Gemini 2.5 Pro | Agent complex reasoning |

### Native Tool Calling

Two primary tools defined:
- generate_image - Creates images from text prompts
- web_search - Searches the web and synthesizes results

### Image Generation Pipeline

| Priority | Provider | Cost | Use Case |
|----------|----------|------|----------|
| 1 | PiAPI Z-Image Turbo | $0.004/image | Fast text-to-image |
| 2 | Lovable AI Gateway (Flux) | Variable | Fallback |
| 3 | Z-Image I2I | $0.004/call | Style transfer |
| Planned | PiAPI Faceswap | $0.02/call | Face preservation |

---

## 4. Product Logic (User Flows)

### Authentication Flow

Landing (/) → Click CTA → /auth
Google OAuth or Email/Password → Supabase Auth
→ Profile auto-created (handle_new_user trigger)
→ 14-day beta_premium trial auto-started
→ Redirect to /modes (mode selection)

### Route Protection

| Type | Routes |
|------|--------|
| **Protected** | /modes, /chat/:mode, /settings, /agent, /circles, /support, /feedback, /document-tools, /image-studio, /video-studio |
| **Public** | /, /auth/*, /privacy, /terms, /pricing |

### Chat Modes (9 total)

**Primary Modes:**
- Umumiy suhbat - General conversation
- Texnologiya va Kod - Tech and coding help
- Kundalik Hayot - Daily life tips
- Biznes va Marketing - Business and marketing
- Sog'liq va Fitness - Health and fitness

**Learning Modes:**
- Ingliz tili va IELTS - English and IELTS prep
- Uy vazifasi va Fanlar - Homework help
- Ish va Rezyume - Jobs and resume
- Moliyaviy Savodxonlik - Financial literacy

### Agent Mode Architecture

1. User enters goal + optional files/links/notes in /agent
2. Frontend calls agent-run Edge Function
3. Function returns runId immediately, continues in background via EdgeRuntime.waitUntil
4. Frontend subscribes to Realtime updates on agent_runs and agent_steps tables
5. Agent uses Gemini 2.5 Flash for planning, executes tools (web_search, image_generate, translate)
6. Final report generated with strict Markdown template and citation format [1]

---

## 5. Business & Monetization

### Subscription Tiers

| Plan | Daily Messages | Search | Vision | Files | Price |
|------|---------------|--------|--------|-------|-------|
| free | 5 | 0 | 0 | 0 | Free |
| beta_premium | 10 | 3 | 3 | 2 | Free (14-day trial) |
| premium | 200 | unlimited | unlimited | unlimited | 49,000 UZS/month |
| ultra | 500 | unlimited | unlimited | unlimited | 340,000 UZS/year |
| dev_unlimited | unlimited | unlimited | unlimited | unlimited | Internal only |

### Usage Enforcement

- Server-side via init_and_check_usage RPC (atomic, row-level locking)
- Called BEFORE every DeepSeek API request
- Returns 429 with Uzbek error if limit exceeded

### Payment Gateway: ATMOS

**For Uzcard/Humo (local Uzbek cards):**

| Plan | Price (UZS) | Price (USD approx) |
|------|-------------|-------------------|
| Monthly | 49,000 | ~$4 |
| Yearly | 340,000 | ~$27 |

**Payment Flow:**
1. User clicks "To'lash" → Frontend calls atmos-create-transaction
2. Backend creates transaction record, returns ATMOS checkout URL
3. User completes payment on ATMOS page
4. /payment/return polls atmos-transaction-info until confirmed
5. On confirmation: profiles.plan → "premium", subscriptions upserted

**Infrastructure:** All ATMOS calls routed through **Fixie static IP proxy** to satisfy firewall whitelist requirements.

---

## 6. Localization

### Supported Languages

| Code | Language | Status |
|------|----------|--------|
| uz | Uzbek | Default, most complete |
| en | English | Complete |
| ru | Russian | Complete |
| tr | Turkish | Complete |

Stored in profiles.language, respected throughout app and in AI system prompts.

---

## 7. Mobile (Capacitor)

### Current Configuration

appId: 'com.bahorai.app'
appName: 'Bahor AI'
webDir: 'dist'
plugins: Browser, App, Haptics, Keyboard

### Deep Links
- bahorai://auth-callback for OAuth

### Platform Status
| Platform | Status |
|----------|--------|
| Android | Configured, APK builds available |
| iOS | Not configured |

---

## 8. Edge Functions (30+)

### AI & Chat
- chat - Main chat orchestrator with DeepSeek
- analyze-image - Vision analysis
- summarize-thread - Thread summarization
- translate - Translation service
- speech-to-text - Whisper STT

### Agent
- agent-run - Main agent orchestrator
- agent-followup - Handle follow-up questions
- agent-extract-file - Extract text from files
- agent-update-report - Update agent reports

### Image/Video
- image-generate - Main image generation router
- fireworks-generate-image - Fireworks AI provider
- fireworks-image-router - Image routing logic
- video-create-job - Start video generation
- video-poll-job - Poll video status
- runpod-video - RunPod integration

### Payments
- atmos-token - OAuth token management
- atmos-create-transaction - Initiate payment
- atmos-transaction-info - Check payment status
- atmos-health - Gateway health check
- payment-proxy - Generic payment proxy

### Circles
- space-chat - Circle AI chat
- space-web-search - Search for circles
- space-file-signed-url - File access
- circle-ai-actions - AI summaries, actions

### Other
- profile - Profile management
- profile-avatar - Avatar upload
- doc-run - Document processing
- file-signed-url - Signed URLs for files
- extract-attachment-text - Text extraction
- notify-feedback - Feedback notifications
- send-branded-email - Transactional emails
- register-device - Device registration
- admin-entitlements - Admin user management

---

## 9. Environment Variables

### Critical Secrets
- DEEPSEEK_API_KEY - Core AI
- PIAPI_API_KEY - Image generation
- FIREWORKS_API_KEY - Backup image gen
- ATMOS_CONSUMER_ID/SECRET/STORE_ID - Payments
- FIXIE_URL - Static IP proxy
- GOOGLE_CX, GOOGLE_SEARCH_API_KEY - Search
- LOVABLE_API_KEY - Lovable AI Gateway
- RESEND_API_KEY - Transactional emails
- RUNPOD_API_KEY/ENDPOINT_ID - Video

### Frontend Environment
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY
- VITE_SUPABASE_PROJECT_ID

---

## 10. Known Tech Debt & Issues

1. Agent file extraction timing - Users confused when files appear uploaded but agent can't read them
2. Image Studio naming - "Remix" renamed to "Style Transfer" (needs testing)
3. Phone auth - Removed (was "coming soon"), Google OAuth is primary
4. Circles AI cards - Generates summaries but UI is basic
5. Video generation - RunPod costs are high, needs optimization
6. Capacitor iOS - Not configured, Android-only currently
7. README outdated - Still references "MVP v0 with dummy AI"

---

## 11. Recommended Next Steps

| Priority | Task | Impact |
|----------|------|--------|
| 1 | Push notifications | Critical for mobile engagement |
| 2 | PiAPI Faceswap | Identity-consistent image generation |
| 3 | Agent UX improvements | Better file status indicators |
| 4 | Payment fallback | Add Click/Payme as backup |
| 5 | iOS build | App Store presence |

---

## 12. Security Notes

- All tables have Row-Level Security (RLS) enabled
- Policies enforce auth.uid() = user_id for personal data
- Service role bypass for Edge Functions
- ATMOS credentials never exposed to client
- formatAssistant.ts sanitizes AI model name leaks
- FORBIDDEN_PHRASES list blocks identity disclosure

---

*Document maintained by the Bahor AI development team.*
`;

export default function DownloadDiscoveryDoc() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<string[]>([]);

  const handleDownloadPDF = async () => {
    setDownloading("pdf");
    try {
      await downloadPDF({
        title: "Bahor AI: Full Stack Discovery Document",
        content: DISCOVERY_DOCUMENT,
        date: "January 30, 2026",
        filename: "bahor-ai-discovery-document.pdf",
      });
      setDownloaded((prev) => [...prev, "pdf"]);
    } catch (error) {
      console.error("PDF download failed:", error);
      // Try HTML fallback
      openHTMLPrintFallback({
        title: "Bahor AI: Full Stack Discovery Document",
        content: DISCOVERY_DOCUMENT,
        date: "January 30, 2026",
      });
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadMarkdown = () => {
    setDownloading("md");
    downloadAsMarkdown({
      title: "Bahor AI: Full Stack Discovery Document",
      content: DISCOVERY_DOCUMENT,
      date: "January 30, 2026",
      filename: "bahor-ai-discovery-document.md",
    });
    setDownloaded((prev) => [...prev, "md"]);
    setDownloading(null);
  };

  const handlePrint = () => {
    openHTMLPrintFallback({
      title: "Bahor AI: Full Stack Discovery Document",
      content: DISCOVERY_DOCUMENT,
      date: "January 30, 2026",
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bahor AI Discovery Document</CardTitle>
          <CardDescription>
            Full technical documentation for team sharing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleDownloadPDF}
            disabled={downloading === "pdf"}
            className="w-full justify-start gap-3"
            size="lg"
          >
            {downloading === "pdf" ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : downloaded.includes("pdf") ? (
              <Check className="h-5 w-5 text-emerald-500" />
            ) : (
              <FileDown className="h-5 w-5" />
            )}
            Download as PDF
          </Button>

          <Button
            onClick={handleDownloadMarkdown}
            disabled={downloading === "md"}
            variant="outline"
            className="w-full justify-start gap-3"
            size="lg"
          >
            {downloaded.includes("md") ? (
              <Check className="h-5 w-5 text-emerald-500" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
            Download as Markdown
          </Button>

          <Button
            onClick={handlePrint}
            variant="outline"
            className="w-full justify-start gap-3"
            size="lg"
          >
            <Printer className="h-5 w-5" />
            Open Print Preview
          </Button>

          <div className="pt-4 border-t">
            <Button
              onClick={() => navigate("/")}
              variant="ghost"
              className="w-full"
            >
              ← Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
