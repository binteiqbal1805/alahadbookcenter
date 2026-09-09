# Al-Ahad Book Center — Phase 5 Storage Setup

## What changed

Book covers and the store flyer now use Supabase Storage instead of browser LocalStorage/data URLs.
Uploads are global: visitors on different devices see the same image.

## 1. Run the SQL

In Supabase Dashboard → SQL Editor, run:

`supabase/storage_policies.sql`

The script creates a public `site-media` bucket and limits uploads/replacements/deletes to users listed in `public.admin_users`.

## 2. Test the bucket

After running the SQL, go to Storage → Buckets and confirm:

- Bucket: `site-media`
- Public: enabled

You should not need to manually create folders. The website creates these object paths:

- `site/banner`
- `book-covers/<book-id>.<extension>`

## 3. Test as admin

1. Sign in to the Admin Portal.
2. Upload a new store flyer.
3. Open the storefront in an incognito/private window or another device.
4. Confirm the same flyer appears.
5. Upload a cover for an existing book.
6. Confirm it appears on another device.
7. Add a new book with a cover and confirm it is visible publicly.
8. Use Reset Flyer and confirm the bundled official banner returns.

## 4. Test as a non-admin

A normal visitor should be able to view images but must not be able to upload, replace, or delete anything in `site-media`.

## Important

Existing custom covers that were stored as old browser data URLs should be re-uploaded once from the Admin Portal so they become proper Storage objects. The bundled default images do not need migration.
