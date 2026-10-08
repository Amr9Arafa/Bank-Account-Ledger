-- 0001_init: core tables for the bank accounts ledger.
-- Money is stored as bigint piasters (1 EGP = 100). Balances are never stored; they are computed.

create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table users (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  email           text not null unique,
  name            text not null,
  role            text not null check (role in ('admin', 'accountant', 'viewer')),
  language        text not null default 'ar' check (language in ('en', 'ar')),
  created_at      timestamptz not null default now()
);

create table bank_accounts (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references organizations(id),
  name                  text not null,
  bank_name             text not null,
  account_number        text not null,
  currency              text not null default 'EGP',
  opening_balance_minor bigint not null default 0,
  opening_date          date not null,
  receives_transfers    boolean not null default true,
  issues_cheques        boolean not null default false,
  archived_at           timestamptz,
  created_at            timestamptz not null default now(),
  unique (organization_id, account_number)
);

create table transactions (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references organizations(id),
  bank_account_id   uuid not null references bank_accounts(id),
  type              text not null check (type in
                      ('transfer_in', 'deposit', 'internal_in',
                       'cheque', 'fee', 'internal_out')),
  amount_minor      bigint not null check (amount_minor > 0),
  party_name        text,
  reference         text,
  description       text,
  cheque_number     text,
  transaction_date  date not null,
  due_date          date,
  status            text not null,
  cleared_date      date,
  transfer_group_id uuid,
  notes             text,
  created_by        uuid not null references users(id),
  updated_by        uuid not null references users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- only cheques have a cheque number, and every cheque has one
  check ((type = 'cheque') = (cheque_number is not null)),
  -- valid status per type
  check (
    (type = 'cheque' and status in ('issued', 'cleared', 'cancelled'))
    or (type <> 'cheque' and status in ('active', 'voided'))
  ),
  -- a cleared cheque always has a cleared date, and nothing else does
  check ((status = 'cleared') = (cleared_date is not null)),
  -- internal transfer rows always belong to a pair
  check ((type in ('internal_in', 'internal_out')) = (transfer_group_id is not null))
);

create unique index cheque_number_per_account
  on transactions (bank_account_id, cheque_number)
  where type = 'cheque';

create index transactions_ledger_order
  on transactions (bank_account_id, transaction_date, created_at);

create table audit_log (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  user_id         uuid not null references users(id),
  transaction_id  uuid references transactions(id),
  action          text not null,
  before          jsonb,
  after           jsonb,
  created_at      timestamptz not null default now()
);

create index audit_log_transaction on audit_log (transaction_id);

-- Supabase exposes the public schema through its REST API using the publishable key,
-- which is visible in the browser. Turning RLS on with no policies blocks that path
-- completely. Our server connects as the database owner (DATABASE_URL), which is not
-- affected by RLS, and does its own permission checks.
alter table organizations enable row level security;
alter table users         enable row level security;
alter table bank_accounts enable row level security;
alter table transactions  enable row level security;
alter table audit_log     enable row level security;
