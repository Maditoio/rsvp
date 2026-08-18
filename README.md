# Bizcon RSVP

Event Intelligence for professional summits.

Bizcon RSVP is a multi-tenant **event intelligence** platform for professional summits — invitation, RSVP, registration, QR check-in, and (later) matchmaking. Invitation is not registration.

Product spec: [`docs/product-spec.md`](docs/product-spec.md)  
Design tokens: [`docs/color-system.md`](docs/color-system.md)

## Stack

- **App:** Next.js (App Router) on Vercel
- **Database:** Neon Postgres + Prisma (use the **pooled** connection string on Vercel)
- **Auth:** Clerk (email/password, Google + Microsoft, MFA for admins). Clerk is identity only — organisations and event roles live in the app database.
- **Email:** Resend
- **Jobs:** Inngest at `/api/inngest`
- **Files:** Vercel Blob (CSV/XLSX imports)
- **Rate limit / cache:** Upstash Redis
- **Bot protection:** Cloudflare Turnstile on public invite/register flows

## Local development

```bash
cp .env.example .env
# Fill in Clerk, Neon, Resend, etc. Do not commit .env.
npm install
npx prisma migrate deploy
# First local database: `npx prisma migrate dev` also works. `npm run db:push` is a no-migration alternative.
npm run dev
```

`npm install` runs `prisma generate` via `postinstall`. If `DATABASE_URL` is unset, generate with a dummy URL:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/delegate?sslmode=require" npm run db:generate
```

```bash
npm test
npm run lint
```

## Environment variables

Copy [`.env.example`](.env.example). Never commit secrets.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** Postgres URL (`sslmode=require`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Clerk identity |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook at `/api/webhooks/clerk` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-in`, `/sign-up` |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Invitation and transactional email |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | Background jobs (`/api/inngest`) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limiting |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Public invite/register bot protection |
| `SENTRY_DSN` | Optional error reporting |
| `NEXT_PUBLIC_APP_URL` | Public origin (invitation links, webhooks) |

OpenAI is reserved for Phase 3 matchmaking and is unused in Phase 1.

## Vercel

Treat **Preview = staging** and **Production = prod** (spec §115). Use separate Neon branches, Clerk instances, Resend domains, and Upstash/Inngest environments for each.

1. Create a Neon database and set `DATABASE_URL` to the **pooled** connection string (pgbouncer / `-pooler.` host).
2. Create a Clerk application. Enable **Google** and **Microsoft** OAuth and **MFA** for organisers. Point the webhook to `https://<your-domain>/api/webhooks/clerk` (`user.created`, `user.updated`; include `svix` headers).
3. Add Resend, Inngest (`https://<your-domain>/api/inngest`), Vercel Blob, Upstash Redis, and Turnstile keys.
4. Set the same variables in the Vercel project. Production and Preview should not share Clerk secrets or the production database.
5. Build uses `npm run build`. `postinstall` runs `prisma generate`. An initial migration is committed under `prisma/migrations` (full schema including Phase 2 stub tables). Preview and Production apply it with:

```bash
npx prisma migrate deploy
```

Preview deployments target staging data. Production is prod only.

## Scripts

| Script | Command |
| --- | --- |
| `dev` | Next.js dev server |
| `build` | Production build |
| `lint` | ESLint |
| `test` | Vitest (unit tests; no live DB or Clerk) |
| `db:generate` | `prisma generate` |
| `db:migrate` | `prisma migrate dev` |
| `db:push` | `prisma db push` |
