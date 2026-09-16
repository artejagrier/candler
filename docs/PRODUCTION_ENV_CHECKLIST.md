# Candler — Production environment checklist (Vercel)

Set these in the Vercel Project → Settings → Environment Variables before promoting
a production deployment. **Variable names only — never commit or paste values.**

Legend:
- **PUBLIC SAFE** — `NEXT_PUBLIC_*`, shipped to the browser bundle by design.
- **SERVER SECRET** — server-only. Must **never** be prefixed `NEXT_PUBLIC_`, never
  logged, never returned by an API, never imported into a Client Component.

---

## PUBLIC SAFE (exposed to the browser)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Absolute deployment URL — auth redirect origin, OAuth callback, OG metadata. Set to the production domain (not `localhost`). |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (`https://<ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key. RLS-bound; safe for the client. |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Paddle client token for Paddle.js overlay checkout. Production tokens start with `live_`; sandbox tokens start with `test_`. |

## SERVER SECRET (server-only — never `NEXT_PUBLIC_`)

| Variable | Purpose |
| --- | --- |
| `SUPABASE_SECRET_KEY` | Supabase service-role key. RLS-bypassing; used only by the server admin client (invites, audit writes, Cloud mutations, webhooks). |
| `CANDLER_ENCRYPTION_KEY_V1` | AES-256-GCM key (base64) for Vault/Authenticator/Recovery encryption at rest. Rotating this invalidates existing ciphertext — plan key versioning. |
| `R2_ENDPOINT` | Cloudflare R2 S3 API endpoint. |
| `R2_ACCESS_KEY_ID` | R2 access key id. |
| `R2_SECRET_ACCESS_KEY` | R2 secret access key. |
| `R2_BUCKET` | Private bucket name (`candler-cloud`). Bucket must remain **private**. |
| `PADDLE_API_KEY` | Paddle server-side API key. Use the **sandbox** key until live. Never expose via `NEXT_PUBLIC_`. |
| `PADDLE_WEBHOOK_SECRET` | Signing secret for the production webhook endpoint (`/api/paddle/webhook`). Set from the Paddle dashboard notification endpoint. |
| `PADDLE_PRICE_CANDLER_PRO` | Paddle price id — Pro ($18 / 50 GB). |
| `PADDLE_PRICE_CLOUD_500` | Paddle price id — Pro + Cloud 500 ($29 / 500 GB). |
| `PADDLE_PRICE_CLOUD_1TB` | Paddle price id — Pro + Cloud 1 TB ($39 / 1 TB). |
| `OPENAI_API_KEY` | Enables the Candler Agent (read/analyze/recommend). **Currently unset** — Agent is disabled until provided. |
| `OPENAI_AGENT_MODEL` | Agent model id. Required alongside `OPENAI_API_KEY`. |

### Optional (have safe defaults)

| Variable | Purpose | Default |
| --- | --- | --- |
| `CLOUD_MAX_FILE_BYTES` | Max single-file upload size. | 5 GB |

---

## Pre-promotion gates

- [ ] All PUBLIC SAFE + SERVER SECRET names above set for the **Production** environment.
- [ ] `NEXT_PUBLIC_SITE_URL` points at the production domain.
- [ ] Production Paddle **notification endpoint** created (`/api/paddle/webhook`) and `PADDLE_WEBHOOK_SECRET` set to its signing secret.
- [ ] `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` set to the **production** (`live_`) client token.
- [ ] `/api/health` returns `200` in production (it returns `503` while `agent.configured` is false — expected until `OPENAI_*` is set).
- [ ] `SUPABASE_SECRET_KEY` confirmed **not** exposed in the client bundle.
- [ ] R2 bucket confirmed private (no public/`r2.dev` exposure).
