# Bahor AI Environment Variables Catalog

> **Last Updated**: 2025-12-08

## Overview

This document catalogs all environment variables used across the Bahor AI codebase, organized by service/purpose.

---

## Client-Side Variables (Vite)

These are exposed to the browser via `import.meta.env.VITE_*`:

| Variable | Purpose | Where Used |
|----------|---------|------------|
| `VITE_SUPABASE_URL` | Supabase project URL | `src/integrations/supabase/client.ts`, all edge function calls |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (public) | `src/integrations/supabase/client.ts` |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier | Analytics, debugging |
| `VITE_APP_VERSION` | App version string | `src/components/layout/SidebarV2.tsx` (v1.0.0-beta) |

**Files Referencing**:
- `src/integrations/supabase/client.ts`
- `src/pages/Chat.tsx`
- `src/components/ImageGeneratorModal.tsx`
- `src/components/circles/CircleAIActionsPanel.tsx`
- `src/components/circles/CircleChatTab.tsx`
- `src/components/circles/CircleChatMessage.tsx`
- `src/lib/entitlements.ts`
- `src/hooks/useTrialStatus.ts`
- `src/components/ToolsUsageBadge.tsx`

---

## Server-Side Variables (Edge Functions)

These are stored in Supabase secrets and accessed via `Deno.env.get()`:

### Supabase Core

| Variable | Purpose | Functions Using |
|----------|---------|-----------------|
| `SUPABASE_URL` | Supabase project URL | All edge functions |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin access key | All edge functions (for RLS bypass) |
| `SUPABASE_ANON_KEY` | Public anon key | `profile/index.ts`, `profile-avatar/index.ts` |
| `SUPABASE_PUBLISHABLE_KEY` | Same as anon key | Some functions |
| `SUPABASE_DB_URL` | Direct DB connection | Not currently used in code |

### AI/LLM Providers

| Variable | Purpose | Functions Using |
|----------|---------|-----------------|
| `DEEPSEEK_API_KEY` | DeepSeek API authentication | `chat/index.ts`, `space-chat/index.ts`, `circle-ai-actions/index.ts` |
| `DEEPSEEK_CHAT_MODEL` | Override chat model name | `chat/index.ts` (default: `deepseek-chat`) |
| `DEEPSEEK_REASONER_MODEL` | Override reasoner model name | `chat/index.ts` (default: `deepseek-reasoner`) |
| `LOVABLE_API_KEY` | Lovable AI Gateway access | `summarize-thread/index.ts` |
| `OPENAI_API_KEY` | OpenAI Whisper for STT | `speech-to-text/index.ts` |
| `FIREWORKS_API_KEY` | Fireworks AI image gen | `fireworks-generate-image/index.ts` |

### Search

| Variable | Purpose | Functions Using |
|----------|---------|-----------------|
| `GOOGLE_SEARCH_API_KEY` | Google Custom Search API | `chat/google.ts`, `chat/googleSearch.ts`, `space-web-search/index.ts` |
| `GOOGLE_CX` | Google Custom Search Engine ID | `chat/google.ts`, `chat/googleSearch.ts`, `space-web-search/index.ts` |
| `GOOGLE_SEARCH_ENDPOINT` | Custom endpoint override | Not currently used |

### Document Processing

| Variable | Purpose | Functions Using |
|----------|---------|-----------------|
| `ILOVE_PUBLIC_KEY` | iLoveAPI public key | `doc-run/index.ts` |
| `ILOVE_SECRET_KEY` | iLoveAPI secret key | `doc-run/index.ts` |

### Access Control

| Variable | Purpose | Functions Using |
|----------|---------|-----------------|
| `DEV_UNLIMITED_EMAILS` | Comma-separated list of dev emails | `chat/index.ts`, `admin-entitlements/index.ts`, `fireworks-generate-image/index.ts` |
| `ADMIN_EMAILS` | Comma-separated list of admin emails | `chat/index.ts`, `admin-entitlements/index.ts`, `fireworks-generate-image/index.ts` |

### Payments (Not Active)

| Variable | Purpose | Functions Using |
|----------|---------|-----------------|
| `STRIPE_SECRET_KEY` | Stripe payments | Not currently used in code |

---

## Variable Reference by Edge Function

### `chat/index.ts`
```typescript
Deno.env.get("DEEPSEEK_CHAT_MODEL")     // Optional, defaults to "deepseek-chat"
Deno.env.get("DEEPSEEK_REASONER_MODEL") // Optional, defaults to "deepseek-reasoner"
Deno.env.get("SUPABASE_URL")
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
Deno.env.get("DEV_UNLIMITED_EMAILS")
Deno.env.get("ADMIN_EMAILS")
Deno.env.get("DEEPSEEK_API_KEY")
// via google.ts:
Deno.env.get("GOOGLE_SEARCH_API_KEY")
Deno.env.get("GOOGLE_CX")
```

### `fireworks-generate-image/index.ts`
```typescript
Deno.env.get("FIREWORKS_API_KEY")
Deno.env.get("SUPABASE_URL")
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
Deno.env.get("DEV_UNLIMITED_EMAILS")
Deno.env.get("ADMIN_EMAILS")
Deno.env.get("DEEPSEEK_API_KEY")  // For prompt translation
```

### `doc-run/index.ts`
```typescript
Deno.env.get("SUPABASE_URL")
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
Deno.env.get("ILOVE_PUBLIC_KEY")
Deno.env.get("ILOVE_SECRET_KEY")
```

### `speech-to-text/index.ts`
```typescript
Deno.env.get("OPENAI_API_KEY")
```

### `summarize-thread/index.ts`
```typescript
Deno.env.get("SUPABASE_URL")
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
Deno.env.get("LOVABLE_API_KEY")
```

### `space-web-search/index.ts`
```typescript
Deno.env.get("SUPABASE_URL")
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
Deno.env.get("GOOGLE_SEARCH_API_KEY")
Deno.env.get("GOOGLE_CX")
```

### `admin-entitlements/index.ts`
```typescript
Deno.env.get("SUPABASE_URL")
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
Deno.env.get("ADMIN_EMAILS")
Deno.env.get("DEV_UNLIMITED_EMAILS")
```

### `profile/index.ts`
```typescript
Deno.env.get("SUPABASE_URL")
Deno.env.get("SUPABASE_ANON_KEY")
```

### `profile-avatar/index.ts`
```typescript
Deno.env.get("SUPABASE_URL")
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
Deno.env.get("SUPABASE_ANON_KEY")
```

### `file-signed-url/index.ts`, `space-file-signed-url/index.ts`
```typescript
Deno.env.get("SUPABASE_URL")
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
```

### `space-chat/index.ts`, `circle-ai-actions/index.ts`
```typescript
Deno.env.get("SUPABASE_URL")
Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
Deno.env.get("DEEPSEEK_API_KEY")
```

---

## Currently Configured Secrets

Based on Supabase secrets configuration:

| Secret Name | Status |
|-------------|--------|
| `SUPABASE_URL` | ✅ Configured |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Configured |
| `SUPABASE_PUBLISHABLE_KEY` | ✅ Configured |
| `SUPABASE_ANON_KEY` | ✅ Configured |
| `SUPABASE_DB_URL` | ✅ Configured |
| `DEEPSEEK_API_KEY` | ✅ Configured |
| `LOVABLE_API_KEY` | ✅ Configured |
| `FIREWORKS_API_KEY` | ✅ Configured |
| `GOOGLE_SEARCH_API_KEY` | ✅ Configured |
| `GOOGLE_CX` | ✅ Configured |
| `GOOGLE_SEARCH_ENDPOINT` | ✅ Configured |
| `ILOVE_PUBLIC_KEY` | ✅ Configured |
| `ILOVE_SECRET_KEY` | ✅ Configured |
| `DEV_UNLIMITED_EMAILS` | ✅ Configured |
| `ADMIN_EMAILS` | ✅ Configured |
| `STRIPE_SECRET_KEY` | ✅ Configured (not used) |

### Missing/Needed

| Secret Name | Status | Impact |
|-------------|--------|--------|
| `OPENAI_API_KEY` | ❓ Not listed | Speech-to-text will fail |

---

## Security Notes

1. **Never expose `SERVICE_ROLE_KEY`** - Only used server-side in edge functions
2. **`VITE_*` variables are public** - Visible in browser, only use for publishable keys
3. **`DEV_UNLIMITED_EMAILS` and `ADMIN_EMAILS`** - Comma-separated, stored server-side only
4. **API keys rotation** - Consider rotating periodically, especially after any leaks
