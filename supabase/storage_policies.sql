-- AL-AHAD BOOK CENTER — Global image storage
-- Run after the Phase 4 RLS SQL.
-- This creates one public bucket for storefront images.

insert into storage.buckets (id, name, public)
values ('site-media', 'site-media', true)
on conflict (id) do update set public = true;

-- Public visitors need to be able to display images from the public bucket.
drop policy if exists "site_media_public_read" on storage.objects;
create policy "site_media_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'site-media');

-- Only approved admins may upload/replace images.
drop policy if exists "site_media_admin_insert" on storage.objects;
create policy "site_media_admin_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'site-media'
  and exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
);

-- Only approved admins may replace existing images.
drop policy if exists "site_media_admin_update" on storage.objects;
create policy "site_media_admin_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'site-media'
  and exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'site-media'
  and exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
);

-- Only approved admins may delete images (used by Reset Flyer).
drop policy if exists "site_media_admin_delete" on storage.objects;
create policy "site_media_admin_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'site-media'
  and exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  )
);

-- Verification
select id, name, public
from storage.buckets
where id = 'site-media';
