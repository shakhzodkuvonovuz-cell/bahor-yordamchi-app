# Bahor AI Migration Guide

## Migration from Lovable Cloud to Self-Hosted Supabase

This guide helps you migrate Bahor AI from Lovable Cloud to your own Supabase project.

---

## 🔧 Steps

### Step 1: Create a New Supabase Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project
2. Note your **Project URL**, **Anon Key**, and **Service Role Key**

### Step 2: Run the SQL Migration

1. Open **SQL Editor** in your new Supabase project
2. Copy the contents of `bahor-ai-complete-migration.sql` and run it
3. Alternatively, use the in-app migration export at `/docs/migration` to download the full schema

This creates:
- 44 tables with RLS policies
- 20+ PL/pgSQL functions and triggers
- 8 storage buckets (`chat-attachments`, `avatars`, `feedback-screenshots`, `user-files`, `space-files`, `space-chat-files`, `video-generations`, `video-assets`)

### Step 3: Add Edge Function Secrets

In your Supabase Dashboard → **Settings → Edge Functions → Secrets**, add:

| Secret | Description | Required |
|--------|-------------|----------|
| `SUPABASE_URL` | Your project URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | ✅ |
| `SUPABASE_ANON_KEY` | Anon/publishable key | ✅ |
| `DEEPSEEK_API_KEY` | DeepSeek AI for chat | ✅ |
| `GOOGLE_SEARCH_API_KEY` | Google Custom Search API | Optional |
| `GOOGLE_CX` | Google Custom Search Engine ID | Optional |
| `GOOGLE_SEARCH_ENDPOINT` | Google Search endpoint URL | Optional |
| `FIREWORKS_API_KEY` | Fireworks AI image generation | Optional |
| `PIAPI_API_KEY` | PiAPI image generation (queue) | Optional |
| `GROQ_API_KEY` | Groq fast inference | Optional |
| `RESEND_API_KEY` | Email sending via Resend | Optional |
| `REPLICATE_API_TOKEN` | Replicate AI models | Optional |
| `RUNPOD_API_KEY` | RunPod video generation | Optional |
| `RUNPOD_ENDPOINT_ID` | RunPod default endpoint | Optional |
| `RUNPOD_LTXV_ENDPOINT_ID` | RunPod LTX-Video endpoint | Optional |
| `YOUTUBE_API_KEY` | YouTube search for resources | Optional |
| `ILOVE_PUBLIC_KEY` / `ILOVE_SECRET_KEY` | iLovePDF document conversion | Optional |
| `ATMOS_CONSUMER_ID` | ATMOS payment merchant ID | For payments |
| `ATMOS_CONSUMER_SECRET` | ATMOS payment secret | For payments |
| `ATMOS_STORE_ID` | ATMOS store identifier | For payments |
| `ATMOS_API_BASE` | ATMOS API base URL | For payments |
| `ATMOS_CHECKOUT_BASE_PROD` | ATMOS checkout URL (production) | For payments |
| `ATMOS_CHECKOUT_BASE_TEST` | ATMOS checkout URL (testing) | For payments |
| `ATMOS_TEST_MODE` | Enable ATMOS test mode | For payments |
| `FIXIE_URL` | Fixie static IP proxy for payments | For payments |
| `DEV_UNLIMITED_EMAILS` | Comma-separated dev emails (bypass limits) | Optional |
| `ADMIN_EMAILS` | Comma-separated admin emails | Optional |

See `docs/ENV_CATALOG.md` for full details.

### Step 4: Deploy Edge Functions

```bash
# Deploy all 36 edge functions at once
supabase functions deploy --project-ref <your-project-ref>
```

Or deploy individually:

```bash
supabase functions deploy chat --project-ref <your-project-ref>
supabase functions deploy image-generate --project-ref <your-project-ref>
supabase functions deploy payment-proxy --project-ref <your-project-ref>
# ... etc
```

### Step 5: Update Frontend Environment

Update your `.env` file:

```env
VITE_APP_VERSION="1.0.0-beta"
VITE_SUPABASE_PROJECT_ID="<your-project-ref>"
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<your-anon-key>"
```

### Step 6: Configure Google OAuth (Optional)

If you want Google Sign-In:

1. Go to **Authentication → Providers → Google** in your Supabase Dashboard
2. Add your Google OAuth Client ID and Secret
3. Set the redirect URL to your app's callback URL

### Step 7: Deploy Frontend

Deploy the frontend to any static hosting provider:

- **Vercel**: `vercel deploy`
- **Netlify**: `netlify deploy --prod`
- **Lovable**: Use the built-in publish feature

---

## 📱 Mobile App Configuration (Capacitor)

Update `capacitor.config.ts` with your new Supabase URL and keys. See `docs/CAPACITOR_SETUP.md` for build instructions.

---

## ✅ Validation Checklist

After completing the migration:

- [ ] User registration and login works
- [ ] Chat messages are saved and loaded
- [ ] Usage counters track correctly
- [ ] File attachments upload and display
- [ ] Image generation works (requires `FIREWORKS_API_KEY`)
- [ ] Video generation works (requires `RUNPOD_API_KEY`)
- [ ] Circles (group chat) functionality works
- [ ] Agent mode executes plans
- [ ] Payment flow works (if applicable)
- [ ] Translator endpoint responds

---

## 📞 Support

If you encounter issues:
1. Check Edge Function logs in Supabase Dashboard
2. Check browser console for frontend errors
3. Use the in-app feedback feature

---

*Last updated: February 2026*
