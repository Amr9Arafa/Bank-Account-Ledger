-- Starter data: one company, one admin, the 3 bank accounts.
-- Names, banks, account numbers and opening balances are placeholders:
-- replace them with the real values (from the bank statements on one agreed date)
-- before entering real transactions.

with org as (
  insert into organizations (name) values ('Our Company') returning id
), admin as (
  insert into users (organization_id, email, name, role, language)
  select id, 'amr.mohamed.mahmoud.aly@gmail.com', 'Amr Aly', 'admin', 'ar' from org
  returning id
)
insert into bank_accounts
  (organization_id, name, bank_name, account_number,
   opening_balance_minor, opening_date, receives_transfers, issues_cheques)
select org.id, a.name, a.bank_name, a.account_number, 0, current_date, true, a.issues_cheques
from org, (values
  ('Account 1', 'Bank 1', 'PLACEHOLDER-1', true),
  ('Account 2', 'Bank 2', 'PLACEHOLDER-2', true),
  ('Account 3', 'Bank 3', 'PLACEHOLDER-3', false)
) as a(name, bank_name, account_number, issues_cheques);
