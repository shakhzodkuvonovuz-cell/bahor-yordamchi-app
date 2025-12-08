# Bahor AI Stack & Integrations

> **Last Updated**: 2025-12-08  
> **App Version**: 1.0.0-beta

## Executive Summary

Bahor AI is a mobile-first Progressive Web App (PWA) providing AI chat, document tools, image generation, and collaborative "Circles" features. The backend is entirely on **Lovable Cloud** (Supabase-powered) with 14 Edge Functions handling auth, AI calls, and document processing.

### Key Dependencies
| Layer | Primary Technology |
|-------|-------------------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Supabase (Lovable Cloud) - PostgreSQL + Edge Functions |
| AI/LLM | DeepSeek API (chat + reasoner models) |
| AI Gateway | Lovable AI Gateway (Gemini for summaries) |
| Image Gen | Fireworks AI (FLUX.1 schnell) |
| Web Search | Google Custom Search API |
| Document Tools | iLoveAPI (iLovePDF) |
| Speech-to-Text | OpenAI Whisper API |
| Mobile | Capacitor (optional APK build) |

---

## Integration Inventory

### 1. Authentication

| Service | Category | Files | Secrets | Data Handled | Rate Limits | Failure Impact |
|---------|----------|-------|---------|--------------|-------------|----------------|
| **Supabase Auth** | Auth | `src/integrations/supabase/client.ts`, `src/hooks/useAuth.tsx`, `src/lib/auth/googleAuth.ts` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` | Email, password hashes, OAuth tokens | 1000 MAU free tier | App down |
| **Google OAuth** | Auth | `src/lib/auth/googleAuth.ts`, `src/pages/AuthGoogle.tsx`, `src/pages/AuthCallback.tsx` | Google Client ID/Secret (in Lovable Cloud settings) | Google profile, email | Google API quotas | Google login down |

**Code Reference**:
```typescript
// src/integrations/supabase/client.ts
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

---

### 2. AI/LLM Providers

| Service | Category | Files | Secrets | Data Handled | Rate Limits | Failure Impact | Cost Drivers |
|---------|----------|-------|---------|--------------|-------------|----------------|--------------|
| **DeepSeek Chat** | AI | `supabase/functions/chat/index.ts` | `DEEPSEEK_API_KEY` | User messages, system prompts | Unknown - needs confirmation | Chat down | Tokens in/out |
| **DeepSeek Reasoner** | AI | `supabase/functions/chat/index.ts` | `DEEPSEEK_API_KEY` | User messages (extended reasoning) | Unknown | Extended thinking down | Higher token cost |
| **Lovable AI Gateway** | AI | `supabase/functions/summarize-thread/index.ts` | `LOVABLE_API_KEY` | Thread summaries | Per-workspace limits | Summary feature down | API calls |

**Code Reference** (DeepSeek call):
```typescript
// supabase/functions/chat/index.ts:882-896
response = await fetch("https://api.deepseek.com/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${deepseekApiKey}`,
  },
  body: JSON.stringify({
    model: selectedModel,  // deepseek-chat or deepseek-reasoner
    messages: finalMessages,
    temperature: modelPreference === "reasoner" ? 0 : 0.6,
    max_tokens: modelPreference === "reasoner" ? 8000 : 2000,
    stream: true,
  }),
});
```

**Model Selection** (configurable):
```typescript
// supabase/functions/chat/index.ts:17-18
const DEEPSEEK_CHAT_MODEL = Deno.env.get("DEEPSEEK_CHAT_MODEL") || "deepseek-chat";
const DEEPSEEK_REASONER_MODEL = Deno.env.get("DEEPSEEK_REASONER_MODEL") || "deepseek-reasoner";
```

---

### 3. Image Generation

| Service | Category | Files | Secrets | Data Handled | Rate Limits | Failure Impact | Cost Drivers |
|---------|----------|-------|---------|--------------|-------------|----------------|--------------|
| **Fireworks AI** | AI/Image | `supabase/functions/fireworks-generate-image/index.ts` | `FIREWORKS_API_KEY` | Prompts, generated images | Unknown - needs confirmation | Image gen down | Per-image |

**Code Reference**:
```typescript
// supabase/functions/fireworks-generate-image/index.ts
// Model: FLUX.1 schnell FP8
// Endpoint: https://api.fireworks.ai/inference/v1/image_generation
```

**Daily Limits** (enforced server-side):
- Free: 2/day
- Beta Premium: 10/day  
- Dev Unlimited: No limit

---

### 4. Web Search

| Service | Category | Files | Secrets | Data Handled | Rate Limits | Failure Impact | Cost Drivers |
|---------|----------|-------|---------|--------------|-------------|----------------|--------------|
| **Google Custom Search** | Search | `supabase/functions/chat/google.ts`, `supabase/functions/chat/googleSearch.ts`, `supabase/functions/space-web-search/index.ts` | `GOOGLE_SEARCH_API_KEY`, `GOOGLE_CX` | Search queries, results | 100 queries/day free tier, 10k/day paid | Search degraded | Per-query |

**Code Reference**:
```typescript
// supabase/functions/chat/google.ts:17-18
const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;
```

**Trigger Logic** (conservative keywords):
```typescript
// supabase/functions/chat/index.ts - shouldUseSearch()
// Triggers on: "qidir", "search", "kim", "nima", "haqida", "yangilik", "news"
```

---

### 5. Document Processing

| Service | Category | Files | Secrets | Data Handled | Rate Limits | Failure Impact | Cost Drivers |
|---------|----------|-------|---------|--------------|-------------|----------------|--------------|
| **iLoveAPI (iLovePDF)** | Documents | `supabase/functions/doc-run/index.ts` | `ILOVE_PUBLIC_KEY`, `ILOVE_SECRET_KEY` | PDF files, HTML content | Unknown - needs confirmation | Doc tools down | Per-file |

**Supported Tools**:
- `htmlpdf`, `imagepdf`, `merge`, `split`, `compress`, `watermark`, `pagenumber`, `ocr`, `officepdf`, `pdfjpg`, `rotate`, `protect`, `unlock`, `repair`

**Code Reference**:
```typescript
// supabase/functions/doc-run/index.ts:48-51
const response = await fetch("https://api.ilovepdf.com/v1/auth", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ public_key: publicKey }),
});
```

---

### 6. Speech-to-Text

| Service | Category | Files | Secrets | Data Handled | Rate Limits | Failure Impact | Cost Drivers |
|---------|----------|-------|---------|--------------|-------------|----------------|--------------|
| **OpenAI Whisper** | STT | `supabase/functions/speech-to-text/index.ts` | `OPENAI_API_KEY` | Audio recordings | OpenAI API limits | Voice input down | Per-minute audio |

**Code Reference**:
```typescript
// supabase/functions/speech-to-text/index.ts:38-39
const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  // Uses Whisper model
});
```

---

### 7. Storage

| Service | Category | Files | Data Handled | Rate Limits | Failure Impact |
|---------|----------|-------|--------------|-------------|----------------|
| **Supabase Storage** | Storage | Multiple edge functions | User files, avatars, images | 1GB free, egress limits | File features down |

**Buckets**:
| Bucket | Public | Purpose |
|--------|--------|---------|
| `chat-attachments` | Yes | Chat file attachments |
| `avatars` | Yes | User profile photos |
| `feedback-screenshots` | No | Beta feedback screenshots |
| `user-files` | No | Generated documents, images |
| `space-files` | No | Circle shared files |
| `space-chat-files` | No | Circle message attachments |

---

### 8. Database (Supabase PostgreSQL)

**21 Tables** with Row-Level Security (RLS):
- `profiles`, `chat_threads`, `chat_messages`, `chat_attachments`
- `spaces`, `space_members`, `space_messages`, `space_files`, `space_invites`, `space_join_requests`, `space_message_attachments`, `space_message_reads`
- `circle_ai_cards`
- `user_files`, `doc_jobs`, `image_generations`
- `usage_counters`, `daily_usage`, `global_usage_counters`
- `user_entitlements`, `beta_feedback`

**Key RPC Functions**:
- `check_and_increment_usage()` - Atomic quota enforcement
- `get_trial_status()` - Trial period management
- `get_effective_entitlement()` - Plan determination
- `get_or_create_trial()` - Auto-enroll new users in trial
- `get_space_by_invite_code()` - Circle invite validation

---

### 9. Realtime

| Feature | Files | Tables Subscribed | Connection Pattern |
|---------|-------|-------------------|-------------------|
| Chat Sync | `src/hooks/useRealtimeChat.ts` | `chat_messages`, `chat_attachments`, `chat_threads` | Per-thread channel |
| Circle Chat | `src/hooks/useCircleChat.ts` | `space_messages`, `space_message_reads` | Per-circle channel |

**Code Reference**:
```typescript
// src/hooks/useRealtimeChat.ts:203-239
const channel = supabase.channel(`chat-${threadId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', ... })
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', ... })
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_attachments', ... })
  .subscribe();
```

---

### 10. Mobile (Capacitor)

| Component | Files | Purpose |
|-----------|-------|---------|
| Core | `capacitor.config.ts` | App configuration |
| Browser | `src/lib/auth/googleAuth.ts` | OAuth in-app browser |
| Deep Links | `android/app/src/main/AndroidManifest.xml` | `bahorai://` scheme |

---

## Architecture Flow Diagrams

### Chat Request Flow

```
┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐    ┌─────────────┐
│   Client    │───▶│ chat edge func  │───▶│  DeepSeek API    │───▶│  Streaming  │
│  (Chat.tsx) │    │    (Deno)       │    │ (chat/reasoner)  │    │  Response   │
└─────────────┘    └─────────────────┘    └──────────────────┘    └─────────────┘
       │                   │                       │                      │
       │                   ├── Auth check          │                      │
       │                   ├── Quota check (RPC)   │                      │
       │                   ├── Web search? ────────┼──▶ Google CSE        │
       │                   ├── Image gen? ─────────┼──▶ Fireworks AI      │
       │                   ├── Vision? ────────────┼──▶ analyze-image     │
       │                   └── Build system prompt │                      │
       │                                           │                      │
       ▼                                           ▼                      ▼
┌─────────────┐                            ┌──────────────────┐    ┌─────────────┐
│  Local DB   │◀───────────────────────────│ Supabase (cloud) │◀───│ Dual-write  │
│ (IndexedDB) │                            │ chat_messages    │    │   pattern   │
└─────────────┘                            └──────────────────┘    └─────────────┘
```

### Image Generation Flow

```
┌─────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│   Client    │───▶│ fireworks-generate  │───▶│  Fireworks AI   │
│   Modal     │    │   -image edge func  │    │  FLUX.1 schnell │
└─────────────┘    └─────────────────────┘    └─────────────────┘
                            │                          │
                            ├── Auth check             │
                            ├── Daily limit check      │
                            ├── Prompt translation     │
                            │   (Uzbek → English)      │
                            ├── Content moderation     │
                            │                          ▼
                            │                   ┌─────────────────┐
                            │                   │  Base64 Image   │
                            │                   └─────────────────┘
                            │                          │
                            ▼                          ▼
                   ┌─────────────────┐    ┌─────────────────────┐
                   │ user-files      │◀───│ Upload to Storage   │
                   │ storage bucket  │    │ Generate signed URL │
                   └─────────────────┘    └─────────────────────┘
```

### Auth Flow (Web + Capacitor)

```
Web Flow:
┌────────┐    ┌────────────┐    ┌──────────────┐    ┌───────────────┐
│ Client │───▶│ /auth/google│───▶│ Supabase Auth│───▶│ Google OAuth  │
└────────┘    └────────────┘    └──────────────┘    └───────────────┘
                                       │                    │
                                       ▼                    │
                              ┌──────────────────┐          │
                              │ /auth/callback   │◀─────────┘
                              │ Exchange code    │
                              │ Set session      │
                              └──────────────────┘

Capacitor Flow:
┌────────────┐    ┌────────────────┐    ┌──────────────────────────────┐
│ Native App │───▶│ Browser.open() │───▶│ https://bahorai.com/auth/    │
└────────────┘    └────────────────┘    │ callback?native=true         │
                                        └──────────────────────────────┘
                                                      │
                                                      ▼
                                        ┌──────────────────────────────┐
                                        │ Browser.close() + navigate   │
                                        │ Session persists in app      │
                                        └──────────────────────────────┘
```

---

## Feature Gating by Plan

| Feature | Free | Beta Premium | Dev Unlimited | Enforcement Location |
|---------|------|--------------|---------------|---------------------|
| Daily Messages | 5 | 10 | Unlimited | `check_and_increment_usage()` RPC |
| Web Search | 0/day | 3/day | Unlimited | `check_and_increment_usage()` RPC |
| Vision/Image Analysis | 0/day | 3/day | Unlimited | `check_and_increment_usage()` RPC |
| File Analysis | 0/day | 2/day | Unlimited | `check_and_increment_usage()` RPC |
| Image Generation | 2/day | 10/day | Unlimited | `fireworks-generate-image` edge func |
| Document Tools | 5/day per tool | 20/day per tool | Unlimited | `doc-run` edge func |
| OCR | No | 2/day | Unlimited | `doc-run` edge func |
| PDF Protect/Unlock | No | 5/day | Unlimited | `doc-run` edge func |
| Reasoner Model | Yes | Yes | Yes | Client toggle, no server gate |

**Enforcement Code**:
```typescript
// supabase/functions/chat/index.ts:540-570
const { data: usageResult } = await supabaseAdmin.rpc("check_and_increment_usage", {
  p_user_id: user.id,
  p_wants_search: wantsSearch,
  p_wants_vision: wantsVision,
  p_wants_file: wantsFile,
  p_is_bypass: isDevBypass,
});

if (!usageResult.allowed) {
  // Return 429 with localized error
}
```

---

## Edge Functions Summary

| Function | JWT Bypass | Purpose | External APIs Called |
|----------|------------|---------|---------------------|
| `chat` | Yes | Main AI chat | DeepSeek, Google CSE |
| `analyze-image` | Yes | Vision analysis | Lovable AI Gateway |
| `summarize-thread` | Yes | Thread summaries | Lovable AI Gateway |
| `fireworks-generate-image` | Yes | Image generation | Fireworks AI |
| `speech-to-text` | Yes | Voice transcription | OpenAI Whisper |
| `doc-run` | Yes | Document tools | iLoveAPI |
| `space-chat` | Yes | Circle AI chat | DeepSeek |
| `space-web-search` | Yes | Circle web search | Google CSE |
| `circle-ai-actions` | Yes | Circle AI cards | DeepSeek |
| `admin-entitlements` | Yes | Plan management | None |
| `profile` | Yes | Profile CRUD | None |
| `profile-avatar` | Yes | Avatar upload | None |
| `file-signed-url` | Yes | Private file URLs | None |
| `space-file-signed-url` | Yes | Circle file URLs | None |

---

## Notes & Warnings

1. **All edge functions have `verify_jwt = false`** - Authentication is handled manually in each function. This works but increases risk of missing auth on new functions.

2. **DeepSeek rate limits unknown** - Need to confirm with provider. Current timeout is 60 seconds.

3. **Google CSE free tier is 100 queries/day** - May need paid tier for production scale.

4. **iLoveAPI quotas unknown** - Need to check account limits.

5. **Fireworks API quotas unknown** - Need to confirm with provider.

6. **Storage egress not monitored** - Generated images could cause cost spikes.
