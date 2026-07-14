# Harvest Basket

**Fresh food, honest nutrition.** — A nutrition-transparent food e-commerce store built with Next.js 15.

## Features

- Product catalog with categories, variants, tags, health info, and discounts
- Full-text search with autocomplete suggestions
- Persistent cart (guest + authenticated) with slide-over drawer
- Multi-step checkout with **mock payment** (Stripe-ready interface)
- User auth (email/password + Google OAuth)
- Order history, tracking, wishlist, verified reviews
- "Customers also bought" recommendations
- Admin panel (products, orders, analytics, abandoned carts, review moderation)
- GDPR cookie consent + privacy policy
- Observability: Sentry, PostHog, Mixpanel, Datadog, Vercel Analytics
- Built-in `/docs` AI blueprint viewer

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **UI:** Tailwind CSS + shadcn/ui
- **State:** Server-backed cart with React client state
- **Database:** PostgreSQL + Prisma
- **Auth:** NextAuth.js v5
- **Payments:** Mock provider (`lib/payments/mock-provider.ts`)
- **Email:** Resend (no-op in dev)

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+

### Setup

```bash
cd harvest-basket
cp .env.example .env
# Edit DATABASE_URL and AUTH_SECRET

npm install
npx prisma db push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Seed Accounts

| Role     | Email                    | Password      |
|----------|--------------------------|---------------|
| Admin    | admin@harvestbasket.com  | admin12345    |
| Customer | customer@example.com     | customer123   |

### Mock Payment Testing

- Any valid-looking card number **succeeds** (e.g. `4242 4242 4242 4242`)
- Card ending in **0002** triggers a decline
- Payment uses `createPaymentIntent` → `confirmPayment` interface (swap to Stripe via `PAYMENT_PROVIDER`)

### Promo Codes (seed)

| Code | Discount |
|------|----------|
| `SAVE10` | 10% off orders $20+ |
| `WELCOME5` | $5 off orders $15+ |

## Key Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage |
| `/category/[slug]` | Category browse + filters |
| `/products/[slug]` | Product detail (nutrition, reviews, recommendations) |
| `/search` | Full-text search |
| `/cart` | Shopping cart |
| `/checkout` | Multi-step checkout (auth required) |
| `/account/*` | Customer account area |
| `/admin` | Admin back office (ADMIN role) |
| `/docs` | AI-generated project documentation |
| `/privacy` | Privacy policy |

## Observability

All tools are pre-wired and key-gated via `.env`. See the **Observability** section in `.env.example`.

- **Sentry** — error tracking (API routes instrumented with spans)
- **PostHog** — client + server event capture (respects cookie consent)
- **Mixpanel** — cross-validation events (no-op without token)
- **Datadog** — APM via `instrumentation.ts` (skipped without `DD_API_KEY`)
- **Vercel Analytics + Speed Insights** — in root layout

## Swapping Mock Payments for Stripe

1. Implement `StripePaymentProvider` implementing `PaymentProvider` in `lib/payments/`
2. Set `PAYMENT_PROVIDER=STRIPE` in `.env`
3. Update `getPaymentProvider()` factory — checkout flow unchanged

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:push      # Push Prisma schema
npm run db:seed      # Seed catalog + demo accounts
npm run db:migrate   # Run migrations (production)
```

## Deployment (Vercel)

1. Connect repo to Vercel
2. Set environment variables from `.env.example`
3. Add PostgreSQL (Neon/Supabase/Vercel Postgres)
4. Run `prisma db push` or migrate on deploy
5. Seed production once: `npm run db:seed`

## License

Private — generated for Harvest Basket MVP.
