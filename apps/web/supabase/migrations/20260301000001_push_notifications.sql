-- Push notification tokens
create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  device_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

alter table push_tokens enable row level security;

create policy "Users can view their own push tokens"
  on push_tokens for select
  using (auth.uid() = user_id);

create policy "Users can insert their own push tokens"
  on push_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own push tokens"
  on push_tokens for update
  using (auth.uid() = user_id);

create policy "Users can delete their own push tokens"
  on push_tokens for delete
  using (auth.uid() = user_id);

-- Push notification preferences (opt-out model: enabled by default)
create table if not exists push_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  enabled boolean not null default true,
  unique (user_id, category_id)
);

alter table push_preferences enable row level security;

create policy "Users can view their own push preferences"
  on push_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own push preferences"
  on push_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own push preferences"
  on push_preferences for update
  using (auth.uid() = user_id);
