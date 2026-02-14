-- User streaks table - tracks daily learning streaks
-- Maintains current and longest streak data

create table if not exists public.user_streaks (
  id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),

  -- Streak data
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_active_date date,

  -- Streak freezes (earned or purchased)
  freezes_available integer not null default 0,
  freezes_used_today boolean not null default false
);

-- RLS
alter table public.user_streaks enable row level security;

create policy "users_can_select_own_streaks"
on public.user_streaks
for select
to authenticated
using (id = auth.uid());

create policy "users_can_update_own_streaks"
on public.user_streaks
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Auto-create streak record on user signup (modify existing trigger)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.user_profiles (id)
  values (new.id);

  insert into public.user_streaks (id)
  values (new.id);

  return new;
end;
$$;

-- Function to update streak when user creates a card
create or replace function public.update_user_streak()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  today date := current_date;
  last_active date;
  curr_streak integer;
begin
  select last_active_date, current_streak
  into last_active, curr_streak
  from public.user_streaks
  where id = new.user_id;

  -- If no streak record exists, create one
  if not found then
    insert into public.user_streaks (id, current_streak, longest_streak, last_active_date)
    values (new.user_id, 1, 1, today);
    return new;
  end if;

  -- If already active today, no update needed
  if last_active = today then
    return new;
  end if;

  -- If active yesterday, increment streak
  if last_active = today - interval '1 day' then
    update public.user_streaks
    set
      current_streak = curr_streak + 1,
      longest_streak = greatest(longest_streak, curr_streak + 1),
      last_active_date = today,
      freezes_used_today = false,
      updated_at = now()
    where id = new.user_id;
  -- If missed a day but have freezes, use one
  elsif last_active = today - interval '2 days' then
    update public.user_streaks
    set
      current_streak = case when freezes_available > 0 then curr_streak + 1 else 1 end,
      longest_streak = case when freezes_available > 0 then greatest(longest_streak, curr_streak + 1) else longest_streak end,
      freezes_available = case when freezes_available > 0 then freezes_available - 1 else freezes_available end,
      freezes_used_today = freezes_available > 0,
      last_active_date = today,
      updated_at = now()
    where id = new.user_id;
  -- Streak broken, reset to 1
  else
    update public.user_streaks
    set
      current_streak = 1,
      last_active_date = today,
      freezes_used_today = false,
      updated_at = now()
    where id = new.user_id;
  end if;

  return new;
end;
$$;

create trigger cards_update_streak
  after insert on public.cards
  for each row execute procedure public.update_user_streak();
