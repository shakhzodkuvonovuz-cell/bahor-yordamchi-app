# Bahor AI - Birinchi O'zbek Sun'iy Intellekti

Bahor AI is the first Uzbek AI assistant, providing intelligent chat, image generation, video creation, document tools, and collaborative spaces.

## Features

- **AI Chat** - Powered by DeepSeek with web search, file attachments, and vision capabilities
- **Multiple Modes** - General chat, IELTS prep, homework help, creative writing, and more
- **Image Generation** - Create images from Uzbek/English prompts via Fireworks AI
- **Video Generation** - Text-to-video and image-to-video via RunPod
- **Document Tools** - PDF/Word conversion, OCR, and file management
- **Circles** - Collaborative spaces with shared chat and file storage
- **Agent Mode** - Multi-step research and task execution
- **Translator** - Uzbek ↔ English translation with speech support
- **Mobile-first PWA** - Installable on phones with offline support
- **Native Apps** - Android/iOS via Capacitor

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI**: DeepSeek, Fireworks AI, Groq, Replicate, RunPod
- **Payments**: ATMOS (Uzbek payment gateway)
- **Mobile**: Capacitor for native builds

## Getting Started

### Prerequisites

- Node.js v18+
- Bun or npm
- Supabase project (or Lovable Cloud)

### Installation

```bash
git clone <your-repo-url>
cd bahor-ai
bun install
```

### Environment Variables

Create a `.env` file with:

```env
VITE_APP_VERSION="1.0.0-beta"
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
```

### Database Setup

1. Run the complete migration SQL from `bahor-ai-complete-migration.sql` in your Supabase SQL Editor
2. Configure Edge Function secrets (see `docs/ENV_CATALOG.md` for full list)

### Development

```bash
bun run dev
```

The app runs at `http://localhost:8080`

### Production Build

```bash
bun run build
bun run preview
```

## Project Structure

```
src/
├── components/       # UI components (chat, layout, circles, etc.)
├── contexts/         # React contexts (Auth, Theme)
├── hooks/            # Custom hooks (useAuth, useDailyUsage, etc.)
├── integrations/     # Supabase client and types
├── lib/              # Utilities (analytics, prompts, formatters)
├── pages/            # Route pages
├── services/         # API services (vision, OCR, documents)
└── types/            # TypeScript types

supabase/
├── functions/        # Edge Functions (chat, image-generate, etc.)
└── config.toml       # Supabase configuration

docs/
├── BAHOR_AI_DISCOVERY.md    # Full technical overview
├── ENV_CATALOG.md           # All secrets documentation
├── SUPABASE_MIGRATION.md    # Migration guide
└── CAPACITOR_SETUP.md       # Mobile build instructions
```

## Edge Function Secrets

Essential secrets for core functionality:

| Secret | Required For |
|--------|-------------|
| `DEEPSEEK_API_KEY` | AI chat |
| `GOOGLE_SEARCH_API_KEY` + `GOOGLE_CX` | Web search |
| `FIREWORKS_API_KEY` | Image generation |
| `RUNPOD_API_KEY` | Video generation |
| `RESEND_API_KEY` | Email sending |

See `docs/ENV_CATALOG.md` for the complete list of 27 secrets.

## Mobile Builds

See `docs/CAPACITOR_SETUP.md` for Android/iOS build instructions.

## Migration

To migrate from Lovable Cloud to your own Supabase:

1. Create a new Supabase project
2. Run `bahor-ai-complete-migration.sql` (36 tables, 8 storage buckets, 20+ functions)
3. Configure Edge Function secrets
4. Update `.env` with new credentials
5. Deploy Edge Functions: `supabase functions deploy --project-ref <your-ref>`

See `docs/SUPABASE_MIGRATION.md` for detailed instructions.

## License

Private and proprietary.

## Contact

For support, use the in-app feedback feature or contact the Bahor AI team.
