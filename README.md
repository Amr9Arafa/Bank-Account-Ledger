# Bank Accounts Ledger

Internal web app to record incoming bank transfers, issued cheques and other movements
for the company's 3 EGP bank accounts, and show live book and bank balances.

- PRD: https://claude.ai/code/artifact/fb675951-cbd5-41d0-a4f1-dc3614239530
- Technical plan: https://claude.ai/code/artifact/4c531ff8-eaf5-42c8-bc61-56b65db8a18b

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS, Postgres and Auth on Supabase,
deployed on Vercel. See the technical plan for the reasoning.

## Run locally

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase URL and publishable key
npm run dev                  # http://localhost:3000
```

The home page shows a green dot when the app can reach Supabase.

## Project layout

```
src/
  app/          # pages and layouts (UI)
  server/       # server-only code (DB, auth, ledger rules)
```

More folders (`actions/`, `server/ledger/`, `messages/`) are added milestone by milestone.
