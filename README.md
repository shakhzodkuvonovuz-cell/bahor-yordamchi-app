# Bahor AI — Birinchi O'zbek Sun'iy Intellekti

Bahor AI is the first Uzbek-language AI assistant. It provides intelligent chat (powered by DeepSeek), image generation, video creation, document tools, collaborative Circles, an autonomous Agent mode, and a translator — all wrapped in a mobile-first PWA with optional native Android/iOS builds via Capacitor.

---

## Features

| Area | Description |
|------|-------------|
| **AI Chat** | Multi-mode conversations with web search, file attachments, vision, citations, thinking traces, and follow-up suggestions |
| **Chat Modes** | General, Tech/Code, Daily Life, IELTS Prep, Homework Help, Creative Writing, and more |
| **Teacher Mode** | Lesson plans with step-by-step teaching, quizzes, and progress tracking |
| **Image Studio** | Text-to-image generation via Fireworks AI / PiAPI with Uzbek prompt support |
| **Video Studio** | Text-to-video and image-to-video via RunPod |
| **Document Tools** | PDF/Word/DOCX generation, OCR (Tesseract.js), file conversion |
| **Circles** | Collaborative spaces with group chat, shared files, AI-generated summary cards, and invite links |
| **Agent Mode** | Multi-step autonomous research — sets goals, creates plans, executes steps, and produces reports |
| **Translator (Tarjimon)** | Uzbek ↔ English translation with speech-to-text support |
| **Payments** | ATMOS (Uzbek payment gateway) integration with subscription management, routed through a static-IP proxy (Fixie) |
| **Admin** | Entitlements dashboard, ATMOS health monitoring |
| **PWA** | Installable on phones, offline banner, service worker |
| **Native Apps** | Android/iOS via Capacitor with deep-link OAuth and haptic feedback |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| **State/Data** | TanStack React Query, Supabase Realtime |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, 36 Edge Functions) |
| **AI** | DeepSeek (chat), Fireworks AI (images), Groq (fast inference), RunPod (video), PiAPI (image queue) |
| **Payments** | ATMOS via Fixie static-IP proxy |
| **Mobile** | Capacitor (Android/iOS) |
| **PDF** | @react-pdf/renderer |
| **OCR** | Tesseract.js |
| **i18n** | Custom LanguageProvider with Uzbek/English/Russian locales |

---

## Project Structure

```
src/
├── components/          # UI components
│   ├── agent/           # Agent mode (inputs, outputs, plan steps, debug panel)
│   ├── ai/              # AI response renderers
│   ├── chat/            # Chat UI (messages, markdown, quiz, citations, focus canvas)
│   ├── circles/         # Circles (group chat, files, AI cards, invites)
│   ├── documents/       # File action sheets
│   ├── layout/          # AppShell, Sidebar, SafeArea
│   ├── teacher/         # Lesson progress, quiz engine, resources
│   ├── ui/              # shadcn/ui primitives
│   └── video/           # Uzbek speech modal
├── contexts/            # AuthContext, LessonContext
├── data/                # Modes, translations, app identity
├── hooks/               # useAuth, useDailyUsage, useEntitlements, useTheme, etc.
├── i18n/                # LanguageProvider, locales
├── integrations/        # Supabase client & generated types
├── lib/                 # Utilities (analytics, prompts, PDF generator, limits, haptics)
├── pages/               # 36 route pages
├── services/            # AI service, OCR, vision, document service
├── types/               # Chat, Trace types
└── utils/               # Chat session/storage helpers

supabase/
└── functions/           # 36 Edge Functions
    ├── chat/            # Main AI chat (DeepSeek + Google Search)
    ├── agent-run/       # Autonomous agent execution
    ├── image-generate/  # Image generation orchestrator
    ├── fireworks-*/     # Fireworks AI image endpoints
    ├── runpod-video/    # Video generation
    ├── video-*/         # Video job create/poll
    ├── space-*/         # Circle chat, files, web search
    ├── circle-ai-actions/ # AI summary cards for circles
    ├── atmos-*/         # Payment gateway (token, transaction, health)
    ├── payment-proxy/   # Authenticated proxy with static IP
    ├── translate/       # Translation endpoint
    ├── speech-to-text/  # Speech recognition
    ├── doc-run/         # Document conversion
    ├── profile*/        # Profile & avatar management
    └── ...              # Auth email, feedback, admin, signed URLs

docs/
├── BAHOR_AI_DISCOVERY.md    # Full technical & business overview
├── ENV_CATALOG.md           # All 27+ secrets documented
├── SUPABASE_MIGRATION.md    # Migration guide (Lovable Cloud → self-hosted)
├── CAPACITOR_SETUP.md       # Android/iOS build instructions
├── STACK_INTEGRATIONS.md    # Third-party integration details
└── SCALE_RISK_ASSESSMENT.md # Scaling considerations
```

---

## Database

The Supabase database contains **44 tables** including:

- `profiles`, `profiles_private`, `user_entitlements` — user data & plans
- `chat_threads`, `chat_messages`, `chat_attachments` — conversation storage
- `usage_counters`, `daily_usage`, `search_usage` — rate limiting & analytics
- `spaces`, `space_members`, `space_messages`, `space_files` — Circles
- `circle_ai_cards` — AI-generated summary cards
- `agent_threads`, `agent_runs`, `agent_steps`, `agent_files` — Agent mode
- `image_generations`, `video_generations` — media generation tracking
- `atmos_transactions`, `atmos_cards`, `subscriptions` — payments
- `teacher_lessons`, `quiz_scores` — learning mode
- `doc_jobs`, `user_files` — document tools
- `tool_decisions`, `usage_events` — observability

All tables have Row Level Security (RLS) policies enabled.

---

## Edge Function Secrets

| Secret | Required For |
|--------|-------------|
| `DEEPSEEK_API_KEY` | AI chat |
| `GOOGLE_SEARCH_API_KEY` + `GOOGLE_CX` | Web search in chat |
| `FIREWORKS_API_KEY` | Image generation |
| `PIAPI_API_KEY` | Image generation (queue) |
| `GROQ_API_KEY` | Fast inference |
| `RUNPOD_API_KEY` | Video generation |
| `REPLICATE_API_TOKEN` | AI models |
| `RESEND_API_KEY` | Email sending |
| `ATMOS_CONSUMER_ID` / `ATMOS_CONSUMER_SECRET` / `ATMOS_STORE_ID` / `ATMOS_API_BASE` | Payments |
| `FIXIE_URL` | Static IP proxy for payments |
| `DEV_UNLIMITED_EMAILS` | Dev bypass |
| `ADMIN_EMAILS` | Admin access |

See `docs/ENV_CATALOG.md` for the complete list.

---

## Getting Started

### Prerequisites

- Node.js v18+
- Bun (recommended) or npm

### Installation

```bash
git clone <your-repo-url>
cd bahor-ai
bun install
```

### Development

```bash
bun run dev
```

The app runs at `http://localhost:8080`.

### Production Build

```bash
bun run build
bun run preview
```

---

## Mobile Builds

See `docs/CAPACITOR_SETUP.md` for Android/iOS build instructions using Capacitor.

---

## Migration

To migrate from Lovable Cloud to your own Supabase instance:

1. Create a new Supabase project
2. Run `bahor-ai-complete-migration.sql` in the SQL Editor
3. Configure Edge Function secrets (see `docs/ENV_CATALOG.md`)
4. Update `.env` with new credentials
5. Deploy Edge Functions: `supabase functions deploy --project-ref <your-ref>`

See `docs/SUPABASE_MIGRATION.md` and `MIGRATION_GUIDE.md` for detailed instructions.

---

## License

Private and proprietary.

## Contact

For support, use the in-app feedback feature or contact the Bahor AI team.
