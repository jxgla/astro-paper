---
title: How I Built a Secure Multi-Model AI Gateway with Cloudflare Workers (Grok + GPT/Codex)
author: Blue Watcher
pubDatetime: 2026-03-02T10:00:00Z
slug: grok-cloudflare-worker-mirror-en
featured: true
draft: false
tags:
  - Cloudflare
  - AI Gateway
  - Rate Limiting
  - Security Hardening
description: "A practical architecture log of building a security-first AI gateway on Cloudflare Workers + KV, with SSE streaming passthrough, dual-layer rate limiting, and prompt hardening."
---

## Why I Built This

I wanted a single AI entry point where users can switch between Grok and GPT/Codex without login friction and unstable relay layers.

The target was simple:

- secure by default
- zero server maintenance
- low latency global access
- streaming UX that feels native

**Live entry:** [Open AI Chat Terminal](/en/chat)

---

## Architecture Overview

```text
Browser (Astro frontend)
        ↓  POST /v1/chat
Cloudflare Worker (security gateway)
        ↓  forward request
Upstream AI providers (Grok / GPT / Codex)
        ↓  SSE stream
Worker passthrough
        ↓
Browser incremental rendering
```

This design removes traditional server ops completely. No VPS, no container orchestration, no long-running backend.

---

## Security Hardening Strategy

### 1) Origin Gate (CORS + allowlist)

Never trust direct client requests.  
Only requests from approved origins are accepted:

```js
const ALLOWED_ORIGINS = ["https://your-domain.com", "http://localhost:4321"];
if (!ALLOWED_ORIGINS.includes(origin)) {
  return new Response("Forbidden", { status: 403 });
}
```

This blocks cross-site abuse before touching expensive upstream APIs.

---

### 2) Prompt Hardening (Token Cost Control)

Before forwarding messages, the gateway injects a hidden instruction that enforces concise, content-first responses and text-only constraints.  
This reduces token waste from repetitive filler text and model drift.

---

### 3) Abuse Intercept for Image-Bait Prompts

Some users try to bypass image quotas through chat mode.  
The worker pre-checks short image-generation intents with regex and can return a synthetic SSE denial response without calling upstream.

Result: no token burn, better quota protection.

---

### 4) Dual-Layer Rate Limiting (KV)

Cloudflare KV stores daily counters:

- per-IP chat limit
- per-IP image limit
- global daily circuit breaker

```js
async function checkRateLimit(kv, ip, type, max) {
  const today = new Date().toISOString().split("T")[0];
  const key = `limit:${ip}:${type}:${today}`;
  const count = parseInt((await kv.get(key)) ?? "0", 10);
  if (count >= max) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 86400 });
  return true;
}
```

This protects both against single-IP abuse and high-volume proxy pool attacks.

---

## SSE Streaming in Worker: The Key Detail

To keep the typewriter UX, do **not** buffer full upstream response.  
Pass through `upstream.body` directly:

```js
return new Response(upstream.body, {
  headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
  },
});
```

On the frontend, parse SSE chunks incrementally with `ReadableStream.getReader()` and render progressively.

---

## Frontend Notes (Astro + Lightweight JS)

The `/chat` page intentionally avoids heavy frameworks for fast cold start and resilient mobile UX.

Key points:

- fixed viewport strategy for mobile browser UI-bar quirks
- streaming heartbeat timeout via `AbortController`
- safe markdown rendering + XSS sanitation
- graceful UX copy for blocked/throttled responses

---

## Deployment Notes

1. Configure Worker and `wrangler.toml`
2. Create KV namespace for limiter state
3. Store secrets via `wrangler secret put API_KEY`
4. Deploy Worker and bind your domain

This gives a practical AI gateway with strong security controls and near-zero ops cost.

---

## Recent Updates (2026-03)

After launch, I shipped another round of practical fixes worth documenting:

- **Strict bilingual content split**: Chinese UI now excludes English posts, and English UI only shows English posts
- **Completed EN route set**: `/en`, `/en/chat`, `/en/posts`, plus language switch entry points
- **Locale-aware gateway prompt injection**: Worker injects EN/ZH guard prompts based on `locale`, keeping English chat output consistently English
- **Streaming race-condition fix**: mode/model switching is locked while a stream is active, preventing false blocked fallbacks during in-flight responses

These are not cosmetic tweaks—they are stability and consistency fixes discovered under real usage.

---

## Closing

If you are building an AI terminal for public traffic, security and cost control are the real product.

- CORS allowlists
- prompt hardening
- abuse intercept
- layered rate limiting

These are not optional—they are the foundation.

**→ [Try the English AI Chat Terminal](/en/chat)**