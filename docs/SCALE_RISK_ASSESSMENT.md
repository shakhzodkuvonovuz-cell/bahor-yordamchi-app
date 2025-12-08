# Bahor AI Scale Risk Assessment

> **Last Updated**: 2025-12-08  
> **Prepared For**: Production scaling from beta (hundreds) to thousands of users

---

## Part A: Top 15 Scale Risks (Ranked)

### RISK 1: Google Custom Search API Rate Limits
**Severity: S1 (Critical) | Probability: HIGH**

| Aspect | Details |
|--------|---------|
| **What breaks** | Web search feature stops working |
| **Why** | Free tier = 100 queries/day. Each search-triggered chat uses 1 query. |
| **User symptom** | "Search results not available" or empty citations |
| **Trigger threshold** | ~100 users each doing 1 search/day OR 20 users doing 5 searches |
| **Cost** | $5 per 1,000 queries on paid tier |

**Mitigation**:
- **Today**: Add server-side caching (same query within 1 hour = cached result)
- **This week**: Implement stricter search trigger logic, add search quota per user
- **Before 10k**: Upgrade to paid CSE tier, implement result caching in database

**Code location**: `supabase/functions/chat/google.ts`, `supabase/functions/chat/googleSearch.ts`

---

### RISK 2: DeepSeek API Rate Limits/Costs
**Severity: S1 (Critical) | Probability: MEDIUM**

| Aspect | Details |
|--------|---------|
| **What breaks** | All chat functionality |
| **Why** | Unknown rate limits, per-token costs |
| **User symptom** | "AI javob bermadi" timeout errors |
| **Trigger threshold** | Unknown - need to confirm with DeepSeek |
| **Cost driver** | Tokens in/out, reasoner uses more |

**Mitigation**:
- **Today**: Contact DeepSeek to confirm rate limits and costs
- **This week**: Add token counting/logging, implement request queuing
- **Before 10k**: Set up backup LLM provider (Lovable AI Gateway as fallback)

**Code location**: `supabase/functions/chat/index.ts:882-896`

---

### RISK 3: Image Generation Abuse/Cost Spikes
**Severity: S2 (High) | Probability: HIGH**

| Aspect | Details |
|--------|---------|
| **What breaks** | Image gen budget exhausted, service degraded |
| **Why** | Each image costs money, users may spam requests |
| **User symptom** | "Rasm yaratib bo'lmadi" errors |
| **Trigger threshold** | ~500-1000 images/day could be costly |
| **Cost driver** | Per-image generation |

**Current limits** (already implemented):
- Free: 2/day, Beta Premium: 10/day, Dev Unlimited: No limit

**Mitigation**:
- **Today**: ✅ Already has daily limits per user
- **This week**: Add global daily cap (e.g., 500 images/day project-wide)
- **Before 10k**: Implement queue system with backpressure, add abuse detection

**Code location**: `supabase/functions/fireworks-generate-image/index.ts`

---

### RISK 4: Supabase Realtime Connection Limits
**Severity: S2 (High) | Probability: MEDIUM**

| Aspect | Details |
|--------|---------|
| **What breaks** | Real-time chat sync, cross-device updates |
| **Why** | Supabase free tier: 500 concurrent connections |
| **User symptom** | Messages not syncing, need to refresh |
| **Trigger threshold** | ~250 concurrent users with 2 tabs each |

**Mitigation**:
- **Today**: Add connection pooling, disconnect on tab blur
- **This week**: Implement connection monitoring/metrics
- **Before 10k**: Upgrade Supabase plan, implement WebSocket fallback

**Code location**: `src/hooks/useRealtimeChat.ts`, `src/hooks/useCircleChat.ts`

---

### RISK 5: Storage Egress Costs (Images + Files)
**Severity: S2 (High) | Probability: HIGH**

| Aspect | Details |
|--------|---------|
| **What breaks** | Budget, then file access |
| **Why** | Each image view = egress cost, generated images are ~500KB-2MB |
| **User symptom** | Slow image loading, then 402 errors |
| **Trigger threshold** | 1000 users viewing 10 images each = 10,000 egress requests |

**Mitigation**:
- **Today**: Add image compression before storage
- **This week**: Implement CDN caching, optimize image sizes
- **Before 10k**: Add lifecycle policies (delete old images), implement lazy loading

**Code location**: Storage buckets: `user-files`, `chat-attachments`

---

### RISK 6: Frontend-Only Limit Bypass Risk
**Severity: S3 (Medium) | Probability: LOW (currently mitigated)**

| Aspect | Details |
|--------|---------|
| **What breaks** | Quota enforcement |
| **Why** | If limits were client-side only, tech-savvy users could bypass |
| **User symptom** | None (abuse succeeds) |
| **Current status** | ✅ Server-side enforcement via `check_and_increment_usage()` RPC |

**Current implementation is SECURE**:
```typescript
// supabase/functions/chat/index.ts:540-570
const { data: usageResult } = await supabaseAdmin.rpc("check_and_increment_usage", {...});
if (!usageResult.allowed) {
  return new Response(JSON.stringify({ error: "LIMIT_REACHED" }), { status: 429 });
}
```

**Mitigation**:
- **Today**: ✅ Already server-side enforced
- **Ongoing**: Audit new features to ensure server-side gating

---

### RISK 7: iLoveAPI Rate Limits/Quotas
**Severity: S2 (High) | Probability: MEDIUM**

| Aspect | Details |
|--------|---------|
| **What breaks** | All document tools (PDF merge, split, OCR, etc.) |
| **Why** | Unknown account limits |
| **User symptom** | "Hujjat ishlov berishda xatolik" |
| **Trigger threshold** | Unknown |

**Current limits** (per-user, server-enforced):
- 5/day (free) to 20/day (premium) per tool

**Mitigation**:
- **Today**: Check iLoveAPI account dashboard for limits
- **This week**: Add server-side rate limiting independent of user limits
- **Before 10k**: Consider self-hosted PDF processing

**Code location**: `supabase/functions/doc-run/index.ts`

---

### RISK 8: Edge Function Cold Start Latency
**Severity: S3 (Medium) | Probability: MEDIUM**

| Aspect | Details |
|--------|---------|
| **What breaks** | First request after idle period is slow |
| **Why** | Deno edge functions need ~1-3s cold start |
| **User symptom** | First message takes 3-5s instead of 1-2s |
| **Trigger threshold** | After ~10 min of inactivity per function |

**Mitigation**:
- **Today**: Add loading indicators to mask cold start
- **This week**: Implement keep-warm pings for critical functions (chat)
- **Before 10k**: Consider dedicated compute or warm pool

---

### RISK 9: Database Connection Pool Exhaustion
**Severity: S2 (High) | Probability: LOW**

| Aspect | Details |
|--------|---------|
| **What breaks** | All DB operations fail |
| **Why** | Supabase has connection limits per plan |
| **User symptom** | "Server xatosi" on all operations |
| **Trigger threshold** | Depends on plan, ~60 concurrent for free |

**Mitigation**:
- **Today**: Monitor connection usage in Supabase dashboard
- **This week**: Add connection pooling via Supavisor
- **Before 10k**: Upgrade to dedicated Postgres

---

### RISK 10: Circle (Space) Message Volume
**Severity: S3 (Medium) | Probability: MEDIUM**

| Aspect | Details |
|--------|---------|
| **What breaks** | Circle chat becomes slow |
| **Why** | No pagination on initial load, fetches all messages |
| **User symptom** | Slow circle load, high memory usage |
| **Trigger threshold** | Circles with >500 messages |

**Mitigation**:
- **Today**: Add `.limit(100)` to initial message fetch
- **This week**: Implement proper pagination with infinite scroll
- **Before 10k**: Add message archiving for old circles

**Code location**: `src/hooks/useCircleChat.ts`

---

### RISK 11: Streaming Response Timeouts
**Severity: S3 (Medium) | Probability: MEDIUM**

| Aspect | Details |
|--------|---------|
| **What breaks** | Long responses get cut off |
| **Why** | 60s timeout on DeepSeek call, Supabase edge function timeout |
| **User symptom** | "AI javob bermadi" mid-stream |
| **Trigger threshold** | Complex prompts with reasoner model |

**Mitigation**:
- **Today**: ✅ Already has 60s timeout with abort controller
- **This week**: Add retry logic for timeouts
- **Before 10k**: Implement response chunking for very long responses

**Code location**: `supabase/functions/chat/index.ts:873-904`

---

### RISK 12: Secret Leakage Risk
**Severity: S1 (Critical) | Probability: LOW**

| Aspect | Details |
|--------|---------|
| **What breaks** | API access compromised, potential financial damage |
| **Why** | If secrets leaked via logs, errors, or code |
| **Current status** | ✅ Secrets stored in Supabase secrets, not in code |

**Mitigation**:
- **Today**: ✅ No secrets in client code
- **This week**: Audit edge function error responses for secret leakage
- **Ongoing**: Rotate keys periodically

---

### RISK 13: Bot/Spam Abuse
**Severity: S2 (High) | Probability: MEDIUM**

| Aspect | Details |
|--------|---------|
| **What breaks** | Resources exhausted by automated abuse |
| **Why** | Public auth (email signup), no CAPTCHA |
| **User symptom** | Slow service, legitimate users hit limits |
| **Trigger threshold** | ~100 bot accounts |

**Mitigation**:
- **Today**: Monitor new signups for patterns
- **This week**: Add rate limiting on auth endpoints
- **Before 10k**: Implement CAPTCHA, email verification requirement

---

### RISK 14: OpenAI Whisper Costs (Speech-to-Text)
**Severity: S3 (Medium) | Probability: LOW**

| Aspect | Details |
|--------|---------|
| **What breaks** | Voice input feature |
| **Why** | Per-minute audio pricing |
| **User symptom** | Voice dictation fails |
| **Trigger threshold** | Heavy voice usage |

**Note**: Currently browser Web Speech API is used client-side, Whisper is backup.

**Mitigation**:
- **Today**: Confirm Whisper is only used for specific cases
- **This week**: Add audio duration limits
- **Before 10k**: Consider client-side-only voice (already primary)

**Code location**: `supabase/functions/speech-to-text/index.ts`

---

### RISK 15: Vendor Lock-in / Regional Outages
**Severity: S3 (Medium) | Probability: LOW**

| Aspect | Details |
|--------|---------|
| **What breaks** | Entire service if primary vendor down |
| **Why** | Single-vendor dependencies (Supabase, DeepSeek) |
| **User symptom** | App completely down |

**Mitigation**:
- **Today**: Document all vendor dependencies (this doc)
- **This week**: Add status monitoring for critical services
- **Before 10k**: Plan backup providers (Lovable AI Gateway, alternative LLMs)

---

## Part B: Observability Gaps

### Currently NOT Measured

| Metric | Why Important | Priority |
|--------|--------------|----------|
| **Token usage per message** | Cost control, quota planning | HIGH |
| **Search calls per user/day** | Cost control, abuse detection | HIGH |
| **Image generations per day (global)** | Cost monitoring | HIGH |
| **Edge function latency** | Performance monitoring | MEDIUM |
| **Edge function error rates** | Reliability monitoring | MEDIUM |
| **Realtime connection count** | Capacity planning | MEDIUM |
| **Storage egress volume** | Cost monitoring | MEDIUM |
| **Cold start frequency** | Performance optimization | LOW |
| **Circle message counts** | Pagination threshold planning | LOW |

### Recommended Additions

1. **Add to `usage_counters` table**:
   - `tokens_in`, `tokens_out` columns
   - `cold_starts` counter

2. **Create `api_calls_log` table**:
   ```sql
   CREATE TABLE api_calls_log (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid,
     function_name text,
     provider text,  -- 'deepseek', 'google', 'fireworks', 'ilove'
     latency_ms int,
     status_code int,
     error_type text,
     created_at timestamptz DEFAULT now()
   );
   ```

3. **Edge function logging improvements**:
   - Add structured JSON logging
   - Include request ID for tracing
   - Log token counts from DeepSeek response

---

## Part C: Recommended Safe Improvements Roadmap

### Today (1-2 hours)

1. **Add global daily caps**:
   - File: `supabase/functions/fireworks-generate-image/index.ts`
   - Add: Check `global_usage_counters` for project-wide image limit (e.g., 1000/day)

2. **Add search result caching**:
   - File: `supabase/functions/chat/google.ts`
   - Add: Cache search results in memory or DB for 1 hour

3. **Add connection monitoring log**:
   - File: `src/hooks/useRealtimeChat.ts`
   - Add: Log connection status changes for debugging

### This Week

1. **Implement token counting**:
   - Parse DeepSeek response headers/body for token usage
   - Store in `usage_counters` or new `token_usage` table

2. **Add pagination to circle messages**:
   - File: `src/hooks/useCircleChat.ts`
   - Change: Fetch only last 100 messages, add "load more"

3. **Add edge function error monitoring**:
   - Create edge function wrapper that logs errors to a table
   - Add alerting for error rate spikes

4. **Confirm vendor rate limits**:
   - Contact DeepSeek support for rate limit documentation
   - Check Fireworks account dashboard
   - Check iLoveAPI account limits

### Before 10,000 Premium Users

1. **Upgrade infrastructure**:
   - Supabase Pro plan for higher connection limits
   - CDN for static assets and cached images
   - Redis for caching frequently accessed data

2. **Implement backup providers**:
   - Lovable AI Gateway as DeepSeek fallback
   - Alternative image generation provider

3. **Add advanced abuse detection**:
   - IP-based rate limiting
   - Account creation rate limiting
   - Pattern detection for bot behavior

4. **Implement queue system**:
   - Use Supabase Edge Function background tasks
   - Queue image generation requests
   - Implement backpressure on high load

5. **Storage optimization**:
   - Image compression pipeline
   - Lifecycle policies for old files
   - CDN with aggressive caching

---

## Summary Table

| Risk Level | Count | Top Concerns |
|------------|-------|--------------|
| S1 (Critical) | 2 | Google CSE limits, DeepSeek limits/costs |
| S2 (High) | 5 | Image gen costs, Realtime limits, Storage egress, iLoveAPI, Bot abuse |
| S3 (Medium) | 6 | Cold starts, Circle messages, Timeouts, Whisper costs, Vendor lock-in |

**Overall Assessment**: The application has good server-side enforcement for quotas. Primary risks are external API rate limits (Google CSE, DeepSeek) and storage/egress costs. Implement monitoring and caching as first priorities.
