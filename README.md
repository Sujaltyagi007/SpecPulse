# SpecPulse

Verified tech specs and daily-checked prices. One Next.js (App Router) app with Prisma + Neon Postgres.

The app connects through `@prisma/adapter-neon` (Neon serverless driver, pooled URL); the Prisma CLI uses the direct
URL for migrations (`prisma.config.ts`). On Vercel, the Neon integration sets both variables with these names.

## Layout

```
app/(site)/            public pages: home, /[category]/[product] (static + ISR, Product/FAQ JSON-LD)
app/admin/             review queue, product editor, server actions (NextAuth session & login form at /admin/login)
app/api/auth/          NextAuth session authentication endpoints
app/api/admin/auth/    JWT Bearer token issuance and role verification
app/api/cron/          refresh-prices, publish (Vercel Cron, see vercel.json)
app/sitemap.ts, robots.ts
lib/                   db, validation gate, affiliate link injection, SerpApi ingest, paced publisher, auth, jwt
prisma/                schema, migrations, seed
scripts/               local CLI versions of the cron jobs
proxy.ts               Next.js Edge guard protecting /admin and /api/admin with JWT Bearer & NextAuth session verification
```

## Setup

```bash
cp .env.example .env        # Neon DATABASE_URL, SERPAPI_API_KEY, ADMIN_USER, ADMIN_PASSWORD, AUTH_SECRET
pnpm install
pnpm db:deploy              # apply migrations
pnpm db:seed                # wireless-earbuds category, 2 products, Amazon affiliate program
pnpm dev                    # http://localhost:3000, admin login at /admin/login
```

## Admin Authentication & Security

SpecPulse uses a dual-layer security architecture:

1. **NextAuth (Auth.js) Session & Form**:
   - Web console login form at `/admin/login` with brute-force rate-limiting and constant-time credential verification.
   - Secure encrypted JWT session cookies (`httpOnly`, `sameSite: lax`, `secure` in production).
   - Sign-out integration in the admin header user menu.

2. **JWT Bearer Token Authentication & Authorization**:
   - For automated scripts, mobile clients, and REST APIs.
   - Obtain a token: `POST /api/admin/auth/token` with `{ "username": "SuperAdmin", "password": "..." }` or with an active session.
   - Authorized requests: Include header `Authorization: Bearer <token>`.
   - Role authorization: All tokens strictly require and verify `role: "admin"`.
   - Verify token: `GET /api/admin/auth/verify`.

## Content workflow

`draft` → (scripted checks pass) → `review` → (human approves) → `approved` → (paced daily job) → `published`

A product passes the scripted checks only with a valid GTIN, every required spec filled **and ticked verified by a person**,
and at least one price seen in the last 72h. The publisher re-checks before publishing and releases at most
`PUBLISH_DAILY_LIMIT` products per day.

Affiliate URLs are never stored in content: offers keep the plain merchant URL and `lib/affiliate.ts` applies the
retailer's `affiliate_programs.url_template` at render time. Change a tag or template in one row to update every page.

## Page copy (Phase 2)

Three page types: product (`/[category]/[product]`), comparison (`/compare/a-vs-b`), roundup (`/best/[slug]`).

1. **Facts** (`lib/content/facts.ts`): human-verified specs only. Prices are never given to the writer; the page renders them live.
2. **Write** (`lib/content/generate.ts`): the LLM pool returns `{summary, body, faq}` as validated JSON. The prompt makes the model a writer, not a researcher.
3. **Check** (`lib/content/check.ts`): rejects numbers not in the facts, prices, URLs, hands-on testing claims, markdown and bad lengths. Failing copy stays a draft with its errors.
4. **Review** (`/admin/content/[id]`): an editor reads the copy against the facts shown beside it, edits (re-checked on save), approves.
5. **Publish**: the paced publisher releases approved pages; comparisons wait for both products, roundups for all picks.

Roundup rankings are set by an editor (`/admin/roundups`); the model explains them and can't change them.

### LLM pool

`LLM_POOL` (see `.env.example`) lists provider + model + key env var names. Each request orders all (entry, key) slots
by weighted random shuffle and fails over on 429/5xx/timeouts, refusals and invalid output; failing keys are benched for a
while (bad keys for an hour). Providers: `anthropic` (official SDK, structured outputs) and `openai-compatible`
(OpenAI, Gemini, DeepSeek, Groq, OpenRouter, ... via `baseURL`). Every attempt is logged to `llm_calls` and summarised on
the admin dashboard.

```bash
pnpm content:generate product sony-wf-1000xm5
pnpm content:generate missing 10
```

## Jobs

| Command | Cron route | What it does |
| --- | --- | --- |
| `pnpm ingest:prices` | `/api/cron/refresh-prices` (06:00 UTC) | SerpApi Google Shopping per product, conservative title match, upsert offers + price history |
| `pnpm publish:batch` | `/api/cron/publish` (07:30 UTC) | Paced approved → published |
| `pnpm validate` | | Report fact-check results for all products |
| `pnpm test` | | Unit tests: matching, GTIN, affiliate links, freshness, authentication |

`product.model` must include the generation number when one exists ("AirPods Pro 2", not "AirPods Pro"):
the matcher rejects listings whose model continues with a digit, so it can't attach an AirPods Pro 3 price to a Pro 2 page.

## Note on Windows

If `prisma migrate` fails with `spawn UNKNOWN`, Windows Smart App Control / Application Control is blocking Prisma's
schema engine binary. The app and Prisma Client are unaffected. Run migrations from WSL, CI, or the Vercel build
(`pnpm db:deploy && pnpm build`), or allow the binary.
