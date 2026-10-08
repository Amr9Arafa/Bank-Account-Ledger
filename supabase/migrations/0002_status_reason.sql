-- 0002: keep the reason when a cheque is cancelled or a movement is voided.
alter table transactions add column status_reason text;

-- Users are matched to Supabase Auth by email; store it lowercase.
alter table users add constraint users_email_lowercase check (email = lower(email));
