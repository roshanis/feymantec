-- Card reviews table - tracks spaced repetition reviews
-- Follows SM-2 algorithm intervals: 1, 3, 7, 14, 30 days

create table if not exists public.card_reviews (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),

  -- Self-assessment rating (1-5 scale)
  -- 1 = Complete blackout, 2 = Struggled, 3 = Hard, 4 = Good, 5 = Easy
  self_rating integer not null check (self_rating between 1 and 5),

  -- Time spent on review (seconds)
  time_spent integer,

  -- What interval was this review (day 1, 3, 7, etc.)
  interval_days integer not null default 1
);

-- Indexes
create index if not exists card_reviews_card_id_idx on public.card_reviews (card_id);
create index if not exists card_reviews_user_id_idx on public.card_reviews (user_id);
create index if not exists card_reviews_created_at_idx on public.card_reviews (created_at desc);

-- RLS
alter table public.card_reviews enable row level security;

create policy "users_can_select_own_reviews"
on public.card_reviews
for select
to authenticated
using (user_id = auth.uid());

create policy "users_can_insert_own_reviews"
on public.card_reviews
for insert
to authenticated
with check (user_id = auth.uid());

-- Function to schedule next review after a review is created
create or replace function public.schedule_next_review()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  next_interval integer;
begin
  -- Simple spaced repetition: intervals based on rating
  -- Poor rating = reset to 1 day, good rating = progress to next interval
  case new.self_rating
    when 1 then next_interval := 1;  -- Reset
    when 2 then next_interval := 1;  -- Reset
    when 3 then next_interval := greatest(new.interval_days, 1);  -- Stay
    when 4 then next_interval := new.interval_days * 2;  -- Progress
    when 5 then next_interval := new.interval_days * 3;  -- Fast progress
  end case;

  -- Cap at 90 days
  next_interval := least(next_interval, 90);

  update public.cards
  set
    next_review_at = now() + (next_interval || ' days')::interval,
    review_count = review_count + 1,
    last_reviewed_at = now()
  where id = new.card_id;

  return new;
end;
$$;

create trigger card_reviews_schedule_next
  after insert on public.card_reviews
  for each row execute procedure public.schedule_next_review();
