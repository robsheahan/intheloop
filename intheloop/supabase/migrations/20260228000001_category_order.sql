-- Category order: per-user custom ordering of category cards
create table public.category_order (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  category_id uuid references public.categories on delete cascade not null,
  position int not null,
  unique (user_id, category_id)
);

alter table public.category_order enable row level security;

create policy "Users can read own category order"
  on public.category_order for select
  using (auth.uid() = user_id);

create policy "Users can insert own category order"
  on public.category_order for insert
  with check (auth.uid() = user_id);

create policy "Users can update own category order"
  on public.category_order for update
  using (auth.uid() = user_id);

create policy "Users can delete own category order"
  on public.category_order for delete
  using (auth.uid() = user_id);
