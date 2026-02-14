-- Waitlist signups with referral codes.
-- Run this in Supabase SQL editor.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  email citext not null,
  ref_code text not null,
  referred_by text null,

  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  utm_term text null,
  utm_content text null
);

create unique index if not exists waitlist_signups_email_uq on public.waitlist_signups (email);
create unique index if not exists waitlist_signups_ref_code_uq on public.waitlist_signups (ref_code);
create index if not exists waitlist_signups_referred_by_idx on public.waitlist_signups (referred_by);
create index if not exists waitlist_signups_created_at_idx on public.waitlist_signups (created_at desc);

alter table public.waitlist_signups enable row level security;

-- Lock down reads by default (no SELECT policy for anon).
revoke all on table public.waitlist_signups from anon;
revoke all on table public.waitlist_signups from authenticated;

grant insert on table public.waitlist_signups to anon;

create policy "anon_can_insert_waitlist"
on public.waitlist_signups
for insert
to anon
with check (
  email is not null
  and length(ref_code) between 6 and 16
);

