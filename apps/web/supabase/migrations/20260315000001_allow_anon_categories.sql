-- Allow anonymous (unauthenticated) users to read categories
-- Required for guest browsing mode (App Store guideline 5.1.1(v))
create policy "Categories are readable by anonymous users"
  on public.categories for select
  using (true);
