-- User profiles table (extends auth.users)
-- Stores additional user data not in auth.users

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  display_name text,
  avatar_url text,

  -- Preferences
  daily_reminder_time time,
  notification_enabled boolean not null default false,

  -- Stats (denormalized for quick dashboard access)
  total_cards integer not null default 0,
  average_clarity_score numeric(4,2),

  -- Onboarding
  onboarding_completed_at timestamptz,
  onboarding_step text default 'welcome'
);

-- Indexes
create index if not exists user_profiles_created_at_idx
  on public.user_profiles (created_at desc);

-- RLS
alter table public.user_profiles enable row level security;

-- Users can only access their own profile
create policy "users_can_select_own_profile"
on public.user_profiles
for select
to authenticated
using (id = auth.uid());

create policy "users_can_insert_own_profile"
on public.user_profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "users_can_update_own_profile"
on public.user_profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Trigger to auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.user_profiles (id)
  values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to update updated_at
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_profiles_updated_at
  before update on public.user_profiles
  for each row execute procedure public.update_updated_at();
