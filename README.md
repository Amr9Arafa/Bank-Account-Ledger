# Bank Accounts Ledger

Internal web app to record incoming bank transfers, issued cheques and other movements
for the company's EGP bank accounts, and show live book and bank balances.

- PRD: https://claude.ai/code/artifact/fb675951-cbd5-41d0-a4f1-dc3614239530
- Technical plan: https://claude.ai/code/artifact/4c531ff8-eaf5-42c8-bc61-56b65db8a18b
- Live: https://bank-account-ledger.vercel.app

## Features

- Dashboard: book balance, bank balance and outstanding cheques per account, plus totals
- Entries: transfer in, deposit, bank fee, cheque, transfer between our own accounts
- Account ledger with running balance, filters, search and CSV export (Excel-friendly)
- Cheques: outstanding / cleared / cancelled, "due within 7 days" highlight, clear and cancel
- Sign-in (Supabase Auth), roles (admin, accountant, viewer), audit log of every change
- English and Arabic (right-to-left)

## Stack

Next.js 16 (App Router, server actions) + TypeScript + Tailwind CSS, Postgres and Auth on
Supabase, Drizzle for queries, next-intl for English/Arabic, Zod for validation, Vercel hosting.

## Run locally

Requires Node.js 22.18 or newer.

```bash
npm install
cp .env.example .env.local   # fill in the values (see the file)
npm run dev                  # http://localhost:3000 -> redirects to /ar
npm test                     # unit tests (Node's built-in test runner)
```

## Environment variables

| Name | Where | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase -> Project Settings -> API | No, public by design |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase -> API Keys | No, public by design |
| `DATABASE_URL` | Supabase -> Connect -> Transaction pooler (port 6543) | Yes |
| `SUPABASE_SECRET_KEY` | Supabase -> API Keys -> Secret key (only for inviting users) | Yes |

## First admin

Users sign in with Supabase Auth, and the `users` table decides company and role (matched by email).
`supabase/seed.sql` creates the admin row; create the matching sign-in account in
Supabase -> Authentication -> Users -> Add user (auto confirm). Further users can be invited from
Settings once `SUPABASE_SECRET_KEY` is set.

## Database

- `supabase/migrations/*.sql` is the source of truth for tables. Apply new files in order.
- `supabase/seed.sql` creates the company, the admin user and 3 placeholder accounts.
- `src/server/db/schema.ts` mirrors the tables for typed queries; keep it in step with the SQL.
- RLS is on for every table with no policies, so the public REST API cannot read anything.
  The app connects with `DATABASE_URL` (database owner) and checks permissions itself.
- Balances are never stored: they are computed from transactions (see `server/ledger/balances.ts`).
- Money is integer piasters (1 EGP = 100) everywhere; formatting happens only for display.

## Project layout

```
src/
  app/[locale]/        # pages: dashboard, accounts/[id], transactions/new|[id]/edit,
                       #        cheques, audit, settings, login
  app/api/             # CSV export route
  actions/             # server actions: check role -> validate -> call ledger -> revalidate
  components/          # UI (client components for forms)
  i18n/, messages/     # locale routing and en/ar strings
  lib/                 # pure helpers: money, validation (Zod)
  server/auth/         # Supabase clients, current user, role checks
  server/db/           # Drizzle schema and pooled connection
  server/ledger/       # business rules and queries (the only place that writes data)
  proxy.ts             # runs before each request: locale + session refresh + login gate
supabase/              # SQL migrations and seed
```
