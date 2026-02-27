-- In The Loop: Initial schema
-- Tables: profiles, categories, tracked_entities, alert_history, email_preferences, pipeline_runs

-- 1. Profiles (linked to auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Categories (13 predefined)
create table public.categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  description text,
  api_source text,
  icon text not null default 'newspaper',
  color text not null default '#6b7280',
  sort_order int not null default 0
);

alter table public.categories enable row level security;

create policy "Categories are readable by all authenticated users"
  on public.categories for select
  using (auth.role() = 'authenticated');

-- Seed 13 categories
insert into public.categories (name, slug, description, api_source, icon, color, sort_order) values
  ('Music', 'music', 'Track new releases by artist', 'iTunes Search API', 'music', '#e11d48', 1),
  ('Tours', 'tours', 'Track tour activity and live releases', 'MusicBrainz API', 'map-pin', '#7c3aed', 2),
  ('Books', 'books', 'Track book releases by author', 'Open Library API', 'book-open', '#2563eb', 3),
  ('Crypto', 'crypto', 'Price threshold alerts for cryptocurrencies', 'Crypto.com API', 'bitcoin', '#f59e0b', 4),
  ('Stocks', 'stocks', 'Price threshold alerts for stocks', 'Alpha Vantage API', 'trending-up', '#10b981', 5),
  ('Movies', 'movies', 'Track movie/TV credits by person', 'TMDB API', 'film', '#ec4899', 6),
  ('News', 'news', 'Track news articles by keyword', 'Google News RSS', 'newspaper', '#6366f1', 7),
  ('GitHub', 'github', 'Track new releases for repositories', 'GitHub REST API', 'github', '#1f2937', 8),
  ('Steam', 'steam', 'Track game discounts', 'Steam Store API', 'gamepad-2', '#1e40af', 9),
  ('Podcasts', 'podcasts', 'Track new podcast episodes', 'iTunes Podcast API', 'podcast', '#8b5cf6', 10),
  ('Weather', 'weather', 'Weather threshold alerts by city', 'Open-Meteo API', 'cloud', '#0ea5e9', 11),
  ('Reddit', 'reddit', 'Track top Reddit posts by keyword', 'Reddit JSON API', 'message-square', '#f97316', 12),
  ('Currency', 'currency', 'Exchange rate threshold alerts', 'Frankfurter API', 'dollar-sign', '#14b8a6', 13);

-- 3. Tracked Entities
create table public.tracked_entities (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category_id uuid references public.categories on delete cascade not null,
  entity_name text not null,
  entity_metadata jsonb default '{}'::jsonb not null,
  created_at timestamptz default now() not null,
  unique (user_id, category_id, entity_name)
);

alter table public.tracked_entities enable row level security;

create policy "Users can read own tracked entities"
  on public.tracked_entities for select
  using (auth.uid() = user_id);

create policy "Users can insert own tracked entities"
  on public.tracked_entities for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own tracked entities"
  on public.tracked_entities for delete
  using (auth.uid() = user_id);

-- 4. Alert History
create table public.alert_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  tracked_entity_id uuid references public.tracked_entities on delete cascade not null,
  content jsonb not null,
  dedup_key text not null,
  seen_at timestamptz,
  created_at timestamptz default now() not null,
  unique (tracked_entity_id, dedup_key)
);

alter table public.alert_history enable row level security;

create policy "Users can read own alerts"
  on public.alert_history for select
  using (auth.uid() = user_id);

create policy "Users can update own alerts (mark seen)"
  on public.alert_history for update
  using (auth.uid() = user_id);

create index idx_alert_history_user_unseen
  on public.alert_history (user_id, seen_at)
  where seen_at is null;

create index idx_alert_history_entity
  on public.alert_history (tracked_entity_id);

-- 5. Email Preferences
create table public.email_preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category_id uuid references public.categories on delete cascade not null,
  enabled boolean default false not null,
  unique (user_id, category_id)
);

alter table public.email_preferences enable row level security;

create policy "Users can read own email prefs"
  on public.email_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own email prefs"
  on public.email_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own email prefs"
  on public.email_preferences for update
  using (auth.uid() = user_id);

-- 6. Pipeline Runs (admin / service-role only)
create table public.pipeline_runs (
  id uuid default gen_random_uuid() primary key,
  triggered_by text not null default 'cron',
  started_at timestamptz default now() not null,
  completed_at timestamptz,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  summary jsonb,
  error_message text
);

alter table public.pipeline_runs enable row level security;

create policy "Authenticated users can read pipeline runs"
  on public.pipeline_runs for select
  using (auth.role() = 'authenticated');
