# Harvest Basket — Vercel + PostgreSQL Deployment Runbook

> **App:** `harvest-basket` — Next.js 15 food e-commerce store  
> **Target:** Vercel (hosting) + PostgreSQL (Neon / Vercel Postgres / Supabase) + GitHub (source)  
> **Audience:** DevOps / release engineers and downstream automation agents

---

## 1. Architecture Overview

```mermaid
flowchart LR
  GH[GitHub repo] -->|push / PR| Vercel[Vercel build + deploy]
  Vercel -->|Prisma Client| PG[(PostgreSQL)]
  Vercel -->|Resend API| Email[Transactional email]
  Vercel -->|OAuth callback| Google[Google OAuth]
  Browser[Customer browser] --> Vercel
```

| Component | Technology | Notes |
|-----------|------------|-------|
| Frontend + API | Next.js 15 App Router on Vercel | Serverless functions + Edge middleware |
| Database | PostgreSQL 15+ via Prisma 6 | Full-text search enabled (`fullTextSearchPostgres`) |
| Auth | Auth.js (NextAuth v5) | JWT sessions + Prisma adapter |
| Payments | Mock provider (`PAYMENT_PROVIDER=MOCK`) | PCI-safe; no card storage |
| Email | Resend | Skipped in `NODE_ENV=development`; sent in production when key set |
| Observability | Sentry, PostHog, Mixpanel, Datadog, Vercel Analytics | All optional / key-gated |

---

## 2. Repository & Vercel Project Setup

### 2.1 Prerequisites

- GitHub repository containing this app
- Vercel account linked to GitHub
- Node.js **20.x** (matches Vercel default; app requires 20+)
- PostgreSQL 15+ instance (recommended: **Neon** or **Vercel Postgres**)
- (Optional) Resend account + verified sending domain
- (Optional) Google Cloud OAuth credentials for social login
- (Optional) Sentry / PostHog projects

### 2.2 Monorepo / subdirectory note

If the GitHub repo root is **not** the app folder (e.g. repo root is `.agent_workspace` and the app lives in `harvest-basket/`), set in Vercel:

| Setting | Value |
|---------|-------|
| **Root Directory** | `harvest-basket` |
| **Framework Preset** | Next.js (auto-detected) |
| **Node.js Version** | 20.x |

`vercel.json` at the app root defines build/install commands and security headers.

### 2.3 Connect GitHub → Vercel

1. In [Vercel Dashboard](https://vercel.com/new) → **Import Git Repository**.
2. Select the GitHub repo and authorize Vercel.
3. Set **Root Directory** to `harvest-basket` if needed.
4. Confirm:
   - **Build Command:** `prisma generate && next build` (from `vercel.json` / `package.json`)
   - **Install Command:** `npm install`
   - **Output:** Next.js default (no override needed)
5. **Do not deploy yet** — configure environment variables and database first (Section 3–4).

### 2.4 Branch strategy

| Branch | Vercel env | Purpose |
|--------|------------|---------|
| `main` | Production | Live store |
| `develop` or feature branches | Preview | PR previews with isolated env vars |

Assign **Production** env vars only to `main`. Use separate preview/staging database URLs for preview deployments to avoid corrupting production data.

---

## 3. PostgreSQL Provisioning

### 3.1 Recommended providers

| Provider | Pros | Connection notes |
|----------|------|------------------|
| **Neon** | Serverless, generous free tier, Vercel integration | Use pooled URL for runtime; direct URL for migrations |
| **Vercel Postgres** | Native Vercel integration | Auto-injects `POSTGRES_URL` — map to `DATABASE_URL` |
| **Supabase** | Managed Postgres + dashboard | Use Session pooler URL for serverless |

### 3.2 Connection string format

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/harvest_basket?schema=public"
```

**Neon pooling (recommended for serverless):**

```bash
# Runtime (pooled — use for DATABASE_URL on Vercel)
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/harvest_basket?sslmode=require"

# Migrations (direct — use only when running prisma migrate locally/CI)
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/harvest_basket?sslmode=require"
```

> The current `schema.prisma` uses a single `DATABASE_URL`. For Neon, use the **direct (non-pooler)** connection as `DATABASE_URL` when running migrations, and the **pooler** URL as `DATABASE_URL` in Vercel runtime. Alternatively, add `directUrl = env("DIRECT_URL")` to `schema.prisma` (Prisma-supported pattern).

### 3.3 Enable required Postgres features

- PostgreSQL **15+**
- Extensions: none required beyond default (Prisma full-text search uses built-in `tsvector`)

---

## 4. Environment Variables (Complete Reference)

Configure in **Vercel → Project → Settings → Environment Variables**.  
Scope each var to **Production**, **Preview**, and/or **Development** as appropriate.

### 4.1 Required (production will not function without these)

| Variable | Example / generation | Scope | Description |
|----------|---------------------|-------|-------------|
| `DATABASE_URL` | `postgresql://…` | All | PostgreSQL connection string for Prisma |
| `AUTH_SECRET` | `openssl rand -base64 32` | All | Auth.js session signing secret (`auth.ts` throws if placeholder in production) |
| `AUTH_URL` | `https://your-domain.vercel.app` | Production | Canonical site URL for Auth.js OAuth callbacks |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.vercel.app` | All | Public base URL (SEO, sitemap, OG tags, emails) |
| `UPSTASH_REDIS_REST_URL` | `https://…upstash.io` | Production | Upstash Redis REST URL — **required** on Vercel production (`lib/rate-limit.ts` throws without it) |
| `UPSTASH_REDIS_REST_TOKEN` | `AX…` | Production | Upstash Redis REST token (pair with URL above) |

> **Auth.js on Vercel:** Set `AUTH_URL` to the production/custom domain. For preview deploys, set `AUTH_URL` to each preview URL pattern or use Vercel's automatic `VERCEL_URL` by setting preview-specific values. Google OAuth redirect URIs must match: `https://<domain>/api/auth/callback/google`.

> **Upstash setup:** Create a free database at [console.upstash.com](https://console.upstash.com) → copy **REST URL** + **REST TOKEN** (not the Redis protocol URL). Used by middleware auth rate limiting and checkout/register endpoints. Preview deploys can omit these (falls back to in-memory) unless `VERCEL_ENV=production`.

### 4.2 Required for transactional email (production orders)

| Variable | Example | Scope | Description |
|----------|---------|-------|-------------|
| `RESEND_API_KEY` | `re_…` | Production | Resend API key — without it, emails log as `SKIPPED` |
| `EMAIL_FROM` | `orders@yourdomain.com` | Production | Verified sender in Resend |

> Emails are **always skipped** when `NODE_ENV=development`. On Vercel production, `NODE_ENV=production` — emails send only if `RESEND_API_KEY` is set.

### 4.3 Site / SEO (recommended)

| Variable | Default | Description |
|----------|---------|-------------|
| `SITE_NAME` | `Harvest Basket` | Brand name in metadata |
| `OG_DEFAULT_IMAGE_URL` | `{SITE_URL}/og/default.png` | Default Open Graph image |
| `TWITTER_HANDLE` | _(empty)_ | Twitter/X handle without `@` |
| `ALLOW_AI_CRAWLERS` | `false` | Set `true` to allow GPTBot in `robots.txt` |

### 4.4 Auth — Google OAuth (optional)

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

Leave both blank to disable Google sign-in (credentials login still works).

**Google Cloud Console setup:**
1. APIs & Services → Credentials → OAuth 2.0 Client ID (Web).
2. Authorized redirect URI: `https://<production-domain>/api/auth/callback/google`
3. Add preview URIs if testing OAuth on preview deploys.

### 4.5 Payments

| Variable | Default | Description |
|----------|---------|-------------|
| `PAYMENT_PROVIDER` | `MOCK` | Keep `MOCK` until Stripe adapter is implemented |

No Stripe keys required for MVP. Mock rules:
- Any valid-length card number → success (e.g. `4242 4242 4242 4242`)
- Card ending in `0002` → decline

### 4.6 Observability (all optional)

| Variable | Tier | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | 1 | Sentry error tracking DSN |
| `SENTRY_ORG` | 1 | Sercel/Sentry build plugin org slug |
| `SENTRY_PROJECT` | 1 | Sentry project slug |
| `NEXT_PUBLIC_POSTHOG_KEY` | 1 | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | 1 | PostHog host (default `https://app.posthog.com`) |
| `NEXT_PUBLIC_MIXPANEL_TOKEN` | 2 | Mixpanel token (no-op if blank) |
| `DD_API_KEY` | 2 | Datadog APM (skipped if blank) |
| `DD_APP_KEY` | 2 | Datadog app key |
| `DD_SERVICE` | 2 | Service name (default `harvest-basket`) |
| `DD_ENV` | 2 | Environment tag (e.g. `production`) |

Vercel Analytics + Speed Insights require **no env vars** — packages are included in `app/layout.tsx`.

### 4.7 Seed-only (run locally / one-time — never commit values)

| Variable | Scope | Description |
|----------|-------|-------------|
| `SEED_ADMIN_PASSWORD` | One-time seed run | Admin password for `admin@harvestbasket.com`. **Required in production** — seed skips admin user without it |
| `SEED_CUSTOMER_PASSWORD` | One-time seed run | Demo customer password (default `customer123` if unset) |

Set these only in your local shell when running `npm run db:seed` against production. Do **not** add to Vercel project env vars.

### 4.8 Auth.js v4 aliases (optional — prefer `AUTH_*` above)

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_SECRET` | Alias for `AUTH_SECRET` |
| `NEXTAUTH_URL` | Alias for `AUTH_URL` |

### 4.9 Auto-injected by Vercel (do not set manually)

| Variable | Description |
|----------|-------------|
| `VERCEL` | `1` when running on Vercel |
| `VERCEL_ENV` | `production` \| `preview` \| `development` |
| `VERCEL_URL` | Deployment hostname (used by `robots.ts` production detection) |
| `NODE_ENV` | `production` on Vercel production builds |

### 4.10 Environment variable checklist (copy-paste for Vercel)

```bash
# ── Required ──
DATABASE_URL=
AUTH_SECRET=
AUTH_URL=https://YOUR-PRODUCTION-DOMAIN
NEXT_PUBLIC_SITE_URL=https://YOUR-PRODUCTION-DOMAIN
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ── Email (production) ──
RESEND_API_KEY=
EMAIL_FROM=orders@YOUR-DOMAIN.com

# ── SEO ──
SITE_NAME=Harvest Basket
OG_DEFAULT_IMAGE_URL=
TWITTER_HANDLE=
ALLOW_AI_CRAWLERS=false

# ── Google OAuth (optional) ──
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── Payments ──
PAYMENT_PROVIDER=MOCK

# ── Observability (optional) ──
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
NEXT_PUBLIC_MIXPANEL_TOKEN=
DD_API_KEY=
DD_APP_KEY=
DD_SERVICE=harvest-basket
DD_ENV=production
```

---

## 5. Database Schema & Migrations

The repo ships with **Prisma schema** but **no committed migration history** (local dev uses `prisma db push`). For production, use Prisma Migrate.

### 5.1 One-time: create initial migration (run locally)

```bash
cd harvest-basket
cp .env.example .env
# Set DATABASE_URL to a local or staging Postgres

npm install
npx prisma migrate dev --name init
```

This creates `prisma/migrations/` — **commit and push** to GitHub.

### 5.2 Apply schema to production (before first deploy or immediately after)

Run from a trusted machine or CI job with production `DATABASE_URL` (use **direct** connection, not pooler):

```bash
cd harvest-basket
export DATABASE_URL="postgresql://..."   # production direct URL
npm run db:migrate:deploy
```

Equivalent: `npx prisma migrate deploy`

> **Do not** add `prisma migrate deploy` to the Vercel build command — concurrent builds can race migrations. Run migrations as a gated pre-deploy step.

### 5.3 Alternative (MVP / empty DB only): `db push`

If migrations are not yet committed and you need a fast first deploy on an **empty** database:

```bash
export DATABASE_URL="postgresql://..."
npm run db:push
```

Use only for throwaway/staging environments. Prefer `migrate deploy` for production.

---

## 6. Database Seed (One-Time)

### ⚠️ CRITICAL: seed is destructive

`prisma/seed.ts` **deletes all data** in every table before inserting demo catalog, users, and sample orders. **Never run seed against a populated production database.**

### 6.1 When to seed

| Scenario | Action |
|----------|--------|
| Fresh empty production DB (first launch) | Run seed once to load catalog + admin account |
| Existing production data | **Do not seed** — manage products via `/admin` |
| Preview/staging | Safe on disposable DBs |

### 6.2 Run seed against production (one time only)

```bash
cd harvest-basket
export DATABASE_URL="postgresql://..."   # production URL
export SEED_ADMIN_PASSWORD="your-strong-admin-password"   # REQUIRED in production
export SEED_CUSTOMER_PASSWORD="your-demo-customer-password"   # optional
npm run db:seed
```

> In production (`NODE_ENV=production`), the seed script **skips admin user creation** unless `SEED_ADMIN_PASSWORD` is set. Always pass a strong password via env — never rely on dev defaults.

### 6.3 Seed credentials (after run)

| Role | Email | Password source |
|------|-------|-----------------|
| Admin | `admin@harvestbasket.com` | Value of `SEED_ADMIN_PASSWORD` (not created if unset in prod) |
| Customer | `customer@example.com` | `SEED_CUSTOMER_PASSWORD` or `customer123` |

**Post-seed security (mandatory for production):**
1. Log in as admin → change admin password immediately via `/account/profile`.
2. Delete or disable the demo customer account (`customer@example.com`) before go-live.
3. Consider changing admin email to your real ops address.
4. Never commit or store `SEED_*` passwords in Vercel env vars or git.

---

## 7. Step-by-Step Deploy Runbook

### Phase A — Infrastructure (Day 0)

| Step | Action | Verification |
|------|--------|--------------|
| A1 | Create PostgreSQL instance (Neon / Vercel Postgres / Supabase) | Can connect via `psql` or provider dashboard |
| A2 | Copy connection string → save as `DATABASE_URL` (secure vault) | — |
| A3 | Generate `AUTH_SECRET`: `openssl rand -base64 32` | 32+ char random string |
| A4 | (Optional) Create Resend API key + verify sending domain | Test send from Resend dashboard |
| A5 | Create Upstash Redis database → copy REST URL + token | Free tier sufficient for rate limiting |
| A6 | (Optional) Create Google OAuth client + redirect URIs | Redirect URI matches prod domain |

### Phase B — Vercel project configuration

| Step | Action | Verification |
|------|--------|--------------|
| B1 | Import GitHub repo into Vercel | Project created |
| B2 | Set Root Directory = `harvest-basket` if app is in subdirectory | Settings → General |
| B3 | Add all **required** env vars (Section 4.1) | Settings → Environment Variables |
| B4 | Add email + SEO vars for production scope | — |
| B5 | Add optional OAuth / observability vars | — |
| B6 | Enable **Production Branch** = `main` | Settings → Git |

### Phase C — Database preparation (before traffic)

| Step | Action | Verification |
|------|--------|--------------|
| C1 | Commit initial Prisma migration (`prisma migrate dev --name init`) OR use `db push` on empty DB | `prisma/migrations/` in repo OR schema applied |
| C2 | Run `npm run db:migrate:deploy` against production DB | `npx prisma migrate status` shows applied |
| C3 | Run `npm run db:seed` **once** on empty production DB | Seed console output: "Seed complete!" |
| C4 | Confirm tables exist in DB dashboard | ~25 models (User, Product, Order, etc.) |

### Phase D — First deploy

| Step | Action | Verification |
|------|--------|--------------|
| D1 | Push to `main` (or click **Deploy** in Vercel) | Build succeeds |
| D2 | Watch build logs: `prisma generate` + `next build` complete | No Prisma/client errors |
| D3 | Assign custom domain (optional) | DNS CNAME → `cname.vercel-dns.com` |
| D4 | Update `AUTH_URL` + `NEXT_PUBLIC_SITE_URL` to custom domain | Redeploy after domain change |
| D5 | Update Google OAuth redirect URI if using OAuth | — |

### Phase E — Post-deploy validation

Run the smoke-test checklist in **Section 8**.

### Phase F — Ongoing releases

```mermaid
flowchart TD
  A[Developer merges PR to main] --> B[Vercel auto-build]
  B --> C{Schema changed?}
  C -->|Yes| D[Run prisma migrate deploy manually/CI]
  C -->|No| E[Deploy completes]
  D --> E
  E --> F[Run smoke tests]
```

| Step | Action |
|------|--------|
| F1 | Merge PR to `main` → Vercel auto-deploys |
| F2 | If `prisma/schema.prisma` changed: run `npm run db:migrate:deploy` **before or immediately after** deploy |
| F3 | Never run `db:seed` on production unless intentionally resetting |
| F4 | Run Section 8 smoke tests on production after schema changes |

---

## 8. Post-Deploy Smoke-Test Checklist

Run against production URL after every first deploy and after schema/auth/email changes.

### 8.1 Public storefront

- [ ] `/` loads — hero, categories, featured products visible
- [ ] `/category/<slug>` loads — product grid + filter sidebar renders
- [ ] `/products/<slug>` loads — images, nutrition card, stock status, reviews section
- [ ] `/search?q=protein` returns results; autocomplete on header search works (`/api/search/suggest`)
- [ ] `/sitemap.xml` returns valid XML with product/category URLs
- [ ] `/robots.txt` disallows `/admin/`, `/api/`, `/checkout/` on production
- [ ] Cookie consent banner appears; accept/dismiss persists
- [ ] `/privacy` privacy policy page loads
- [ ] Dark/light theme toggle works
- [ ] Mobile viewport (375px): header, cart drawer, product grid usable

### 8.2 Cart & checkout

- [ ] Add product to cart (guest) — cart icon count updates
- [ ] Refresh page — cart persists (guest cookie)
- [ ] `/cart` page shows line items and totals
- [ ] Unauthenticated `/checkout` redirects to `/login?callbackUrl=/checkout`
- [ ] Login as customer → complete checkout flow:
  - [ ] Address step
  - [ ] Shipping method selection
  - [ ] Mock payment (`4242…` succeeds)
  - [ ] Review + place order
- [ ] Confirmation page shows order number
- [ ] Order confirmation email received (if `RESEND_API_KEY` set) — check Resend dashboard + `EmailLog` table
- [ ] Mock decline works: card ending `0002` shows error

### 8.3 Auth & account

- [ ] Register new account (`/register`)
- [ ] Login / logout (`/login`)
- [ ] `/account` dashboard loads
- [ ] `/account/orders` lists placed order
- [ ] `/account/orders/<orderNumber>` tracking page loads
- [ ] `/account/wishlist` — add/remove product
- [ ] (If OAuth configured) Google sign-in completes and creates session

### 8.4 Admin back office

- [ ] `/admin` redirects non-admin to `/403` or login
- [ ] Login as admin → `/admin` analytics dashboard loads
- [ ] `/admin/products` — product list visible
- [ ] `/admin/orders` — test order appears; status update works
- [ ] `/admin/reviews` — review moderation loads
- [ ] `/admin/abandoned-carts` — page loads (may be empty)

### 8.5 API health & security

- [ ] `POST /api/register` — rate limit triggers after repeated requests (429)
- [ ] `POST /api/checkout` — requires auth (401 without session)
- [ ] `/admin/*` blocked for customer role (403 page)
- [ ] Product review submission escapes HTML (no XSS in rendered review)
- [ ] No raw card data in network payloads beyond checkout POST (mock last4 only in response)

### 8.6 Observability (if configured)

- [ ] Sentry receives a test error (optional controlled throw in preview)
- [ ] PostHog / Vercel Analytics show page views
- [ ] No console errors on homepage in browser devtools

---

## 9. Config Files Reference

| File | Purpose |
|------|---------|
| `vercel.json` | Build commands, `iad1` region, security headers |
| `package.json` | `build`, `postinstall` (prisma generate), `db:*` scripts |
| `next.config.ts` | Image domains (Unsplash), Sentry webpack wrapper |
| `prisma/schema.prisma` | Database schema |
| `.env.example` | Local dev env template |
| `middleware.ts` | Auth guards for `/admin`, `/checkout`, `/account` |

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Build fails: Prisma Client not generated | Missing `postinstall` / network | Ensure `npm install` runs; `postinstall` runs `prisma generate` |
| `P1001: Can't reach database` | Wrong URL, IP allowlist, or pooler used for migrate | Use direct URL for migrations; check SSL `?sslmode=require` |
| OAuth redirect mismatch | `AUTH_URL` / Google URI wrong | Match `https://<domain>/api/auth/callback/google` exactly |
| Emails not sending | Missing `RESEND_API_KEY` or unverified domain | Set key; verify domain in Resend; check `EmailLog.status` |
| Empty catalog | Seed not run or wrong DB | Run seed once on correct `DATABASE_URL` |
| 401 on checkout | Session not established | Verify `AUTH_SECRET`; check cookie domain on custom domain |
| Images broken | Unsplash blocked | `next.config.ts` allows `images.unsplash.com` — product images use Unsplash URLs in seed |
| Admin 403 | User lacks ADMIN role | Use seed admin or update `User.role` in DB |
| Build/runtime throws: Upstash required | Missing `UPSTASH_REDIS_REST_*` on production | Create Upstash Redis; add REST URL + token to Vercel Production env |
| Rate limit inconsistent on preview | In-memory fallback on non-production | Expected; only Production scope requires Upstash |
| No admin user after seed | `SEED_ADMIN_PASSWORD` not set in production | Re-run seed with `SEED_ADMIN_PASSWORD` on empty DB, or create admin via SQL |

---

## 11. Security Hardening (Production)

1. **Rotate** `AUTH_SECRET` if ever exposed; all sessions invalidate.
2. **Change** default seed admin password immediately after first login.
3. **Restrict** production `DATABASE_URL` to Vercel egress / provider IP rules where supported.
4. **Never** commit `.env` — use Vercel encrypted env vars only.
5. **Keep** `PAYMENT_PROVIDER=MOCK` until Stripe adapter is audited; never store PAN/CVV.
6. **Enable** Vercel Deployment Protection on preview environments if repo is public.
7. **Review** GDPR flows: cookie consent, `/privacy`, account deletion at `/api/account/delete`.

---

## 12. Quick Command Reference

```bash
# Local development
cp .env.example .env && npm install
npm run db:push && npm run db:seed && npm run dev

# Production migration (run outside Vercel build)
export DATABASE_URL="postgresql://..."
npm run db:migrate:deploy

# One-time production seed (EMPTY DB ONLY)
npm run db:seed

# Production build (same as Vercel)
npm run build && npm start
```

---

*Generated for Harvest Basket MVP — Vercel + PostgreSQL + GitHub deployment pipeline.*
