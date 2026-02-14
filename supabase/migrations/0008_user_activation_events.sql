-- User activation events - tracks key user actions for funnel analysis
-- Used for onboarding flow and retention metrics

create table if not exists public.user_activation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  -- Event type
  event_name text not null,

  -- Optional metadata
  metadata jsonb default '{}'::jsonb
);

-- Indexes
create index if not exists activation_events_user_id_idx
  on public.user_activation_events (user_id);
create index if not exists activation_events_event_name_idx
  on public.user_activation_events (event_name);
create index if not exists activation_events_created_at_idx
  on public.user_activation_events (created_at desc);

-- RLS
alter table public.user_activation_events enable row level security;

create policy "users_can_insert_own_events"
on public.user_activation_events
for insert
to authenticated
with check (user_id = auth.uid());

create policy "users_can_select_own_events"
on public.user_activation_events
for select
to authenticated
using (user_id = auth.uid());

-- Predefined event names (documented here for reference):
-- 'signup_completed' - User verified email
-- 'onboarding_started' - User began onboarding wizard
-- 'onboarding_completed' - User finished onboarding
-- 'first_card_created' - First Feynman card created
-- 'second_card_created' - Second card (engagement signal)
-- 'first_share' - User shared a card
-- 'first_review' - User completed a review session
-- 'streak_3_days' - 3-day streak achieved
-- 'streak_7_days' - 7-day streak achieved
-- 'streak_30_days' - 30-day streak achieved
-- 'referral_sent' - User shared referral link
-- 'referral_converted' - Referred user signed up

-- View for quick dashboard stats
create or replace view public.user_activation_summary as
select
  user_id,
  count(*) filter (where event_name = 'first_card_created') > 0 as has_created_card,
  count(*) filter (where event_name = 'onboarding_completed') > 0 as onboarding_done,
  count(*) filter (where event_name = 'first_share') > 0 as has_shared,
  count(*) filter (where event_name = 'first_review') > 0 as has_reviewed,
  min(created_at) as first_event_at,
  max(created_at) as last_event_at
from public.user_activation_events
group by user_id;
