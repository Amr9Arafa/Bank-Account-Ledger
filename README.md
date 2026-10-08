# Bank Accounts Ledger

Internal web app to record incoming bank transfers, issued cheques and other movements
for the company's 3 EGP bank accounts, and show live book and bank balances.

- PRD: https://claude.ai/code/artifact/fb675951-cbd5-41d0-a4f1-dc3614239530
- Technical plan: https://claude.ai/code/artifact/4c531ff8-eaf5-42c8-bc61-56b65db8a18b
- Live: https://bank-account-ledger.vercel.app

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, Postgres on Supabase (Drizzle for queries),
next-intl for English/Arabic, deployed on Vercel.

## Run locally

Requires Node.js 22.18 or newer.

```bash
npm install
cp .env.example .env.local   # fill in the Supabase values and DATABASE_URL
npm run dev                  # http://localhost:3000 -> redirects to /ar
npm test                     # unit tests (Node's built-in test runner)
```

## Database

- `supabase/migrations/*.sql` is the source of truth for tables. Apply new files in order.
- `supabase/seed.sql` creates the company, the admin user and the 3 accounts (placeholder names).
- `src/server/db/schema.ts` mirrors the tables for typed queries; keep it in step with the SQL.
- RLS is on for every table with no policies, so the public REST API cannot read anything.
  The app connects with `DATABASE_URL` (database owner) and checks permissions itself.

## Project layout

```
src/
  app/[locale]/   # pages, one tree per language (/ar, /en)
  i18n/           # locale routing and message loading
  messages/       # en.json, ar.json
  lib/            # pure helpers (money)
  server/db/      # Drizzle schema and pooled connection
  server/ledger/  # business rules: balances now, transactions next
  proxy.ts        # runs before each request (locale redirect; auth in M4)
supabase/         # SQL migrations and seed
```
