-- AL-AHAD BOOK CENTER — Supabase production RLS
-- Run this in Supabase SQL Editor AFTER creating an admin_users table.
-- Replace the UUID in the seed INSERT with the Auth user ID of the real admin.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.books enable row level security;
alter table public.orders enable row level security;

-- Admin users may only see their own authorization row.
drop policy if exists "admin_users_select_own" on public.admin_users;
create policy "admin_users_select_own"
on public.admin_users for select
to authenticated
using (auth.uid() = user_id);

-- IMPORTANT: add the real admin Auth user's UUID here.
-- Optional, idempotent admin registration:
-- insert into public.admin_users (user_id) values ('YOUR-AUTH-USER-UUID') on conflict (user_id) do nothing;

-- BOOKS: storefront can read; only approved admins can write.
drop policy if exists "books_public_read" on public.books;
create policy "books_public_read"
on public.books for select
to anon, authenticated
using (true);

drop policy if exists "books_admin_insert" on public.books;
create policy "books_admin_insert"
on public.books for insert
to authenticated
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "books_admin_update" on public.books;
create policy "books_admin_update"
on public.books for update
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "books_admin_delete" on public.books;
create policy "books_admin_delete"
on public.books for delete
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- ORDERS: customers may create an order, but nobody anonymous can read orders.
drop policy if exists "orders_public_insert" on public.orders;
create policy "orders_public_insert"
on public.orders for insert
to anon, authenticated
with check (true);

drop policy if exists "orders_admin_read" on public.orders;
create policy "orders_admin_read"
on public.orders for select
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Optional: only approved admins may modify/delete orders.
drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update"
on public.orders for update
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "orders_admin_delete" on public.orders;
create policy "orders_admin_delete"
on public.orders for delete
to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Verify RLS is enabled:
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename in ('books','orders','admin_users');
