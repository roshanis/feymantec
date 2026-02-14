-- Cards table - stores user-created Feynman cards
-- Core data structure for the learning loop

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Card content
  concept text not null,
  explanation text not null,

  -- AI-generated feedback (stored as JSONB for flexibility)
  clarity_score integer check (clarity_score between 0 and 100),
  gaps jsonb default '[]'::jsonb,
  analogy text,
  simple_version jsonb default '[]'::jsonb,
  quiz jsonb default '[]'::jsonb,
  jargon_words jsonb default '[]'::jsonb,

  -- Metadata
  word_count integer,
  is_published boolean not null default false,
  share_hash text unique,

  -- Review tracking
  next_review_at timestamptz,
  review_count integer not null default 0,
  last_reviewed_at timestamptz
);

-- Indexes
create index if not exists cards_user_id_idx on public.cards (user_id);
create index if not exists cards_created_at_idx on public.cards (created_at desc);
create index if not exists cards_next_review_idx on public.cards (user_id, next_review_at)
  where next_review_at is not null;
create index if not exists cards_share_hash_idx on public.cards (share_hash)
  where share_hash is not null;

-- RLS
alter table public.cards enable row level security;

-- Users can CRUD their own cards
create policy "users_can_select_own_cards"
on public.cards
for select
to authenticated
using (user_id = auth.uid());

create policy "users_can_insert_own_cards"
on public.cards
for insert
to authenticated
with check (user_id = auth.uid());

create policy "users_can_update_own_cards"
on public.cards
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "users_can_delete_own_cards"
on public.cards
for delete
to authenticated
using (user_id = auth.uid());

-- Public can view published cards (for share links)
create policy "public_can_view_published_cards"
on public.cards
for select
to anon
using (is_published = true and share_hash is not null);

-- Trigger to update updated_at
create trigger cards_updated_at
  before update on public.cards
  for each row execute procedure public.update_updated_at();

-- Function to update user profile card count
create or replace function public.update_user_card_stats()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    update public.user_profiles
    set
      total_cards = total_cards + 1,
      average_clarity_score = (
        select avg(clarity_score)::numeric(4,2)
        from public.cards
        where user_id = new.user_id and clarity_score is not null
      )
    where id = new.user_id;
  elsif TG_OP = 'DELETE' then
    update public.user_profiles
    set
      total_cards = greatest(0, total_cards - 1),
      average_clarity_score = (
        select avg(clarity_score)::numeric(4,2)
        from public.cards
        where user_id = old.user_id and clarity_score is not null
      )
    where id = old.user_id;
  elsif TG_OP = 'UPDATE' and new.clarity_score is distinct from old.clarity_score then
    update public.user_profiles
    set average_clarity_score = (
      select avg(clarity_score)::numeric(4,2)
      from public.cards
      where user_id = new.user_id and clarity_score is not null
    )
    where id = new.user_id;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger cards_update_user_stats
  after insert or update or delete on public.cards
  for each row execute procedure public.update_user_card_stats();
