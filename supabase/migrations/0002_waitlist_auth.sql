-- Require authenticated inserts for waitlist signups (email OTP / passwordless).
-- This enables storing `user_id` and allows the user to re-fetch their referral code.

alter table public.waitlist_signups
  add column if not exists user_id uuid;

create unique index if not exists waitlist_signups_user_id_uq
  on public.waitlist_signups (user_id)
  where user_id is not null;

-- Tighten privileges: anon cannot insert; authenticated can insert/select (RLS still applies).
revoke insert on table public.waitlist_signups from anon;
grant insert, select on table public.waitlist_signups to authenticated;

drop policy if exists "anon_can_insert_waitlist" on public.waitlist_signups;

create policy "auth_can_insert_own_waitlist"
on public.waitlist_signups
for insert
to authenticated
with check (
  user_id = auth.uid()
  and email is not null
  and length(ref_code) between 6 and 16
);

create policy "auth_can_select_own_waitlist"
on public.waitlist_signups
for select
to authenticated
using (user_id = auth.uid());

