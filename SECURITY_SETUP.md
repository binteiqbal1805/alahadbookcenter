# Phase 4 — Supabase Security Setup

The frontend now treats Supabase Auth + the `admin_users` table as the admin authorization boundary. The database must enforce the same boundary with Row Level Security (RLS).

## 1. Create/verify the admin account

In Supabase Dashboard → Authentication → Users, create or identify the real admin Auth user.

Copy that user's **UUID**.

## 2. Run the SQL

Open Supabase Dashboard → SQL Editor and run:

`supabase/rls_policies.sql`

Then replace:

```sql
insert into public.admin_users (user_id) values ('YOUR-AUTH-USER-UUID');
```

with the real admin UUID and run it.

## 3. Expected security behavior

- Anyone can read published book rows.
- Anyone can submit an order.
- Anonymous visitors cannot read orders.
- Authenticated users who are not in `admin_users` cannot read or modify orders.
- Authenticated users who are not in `admin_users` cannot insert/update/delete books.
- Approved admins can manage books and view/manage orders.

## 4. Important

The publishable Supabase key in the frontend is not a secret. **RLS is what protects the database.** Never put a Supabase service-role key in `index.html`, `src/app.js`, or any browser-delivered file.

## 5. Test after applying the SQL

1. Open the storefront in an incognito window.
2. Confirm books are visible.
3. Place a test order and confirm it is inserted.
4. Confirm the storefront cannot query the `orders` table.
5. Sign in using the approved admin account.
6. Confirm the admin can view orders and edit books.
7. Try signing in with a different Supabase Auth account; it should be rejected as an admin.
