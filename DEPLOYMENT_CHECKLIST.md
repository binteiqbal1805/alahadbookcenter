# AL-AHAD BOOK CENTER — Production Deployment Checklist

## 1. Supabase
- [ ] Confirm the real admin Auth user exists in Authentication → Users.
- [ ] Confirm that exact Auth user UUID exists once in `public.admin_users`.
- [ ] Run `supabase/rls_policies.sql` in the Supabase SQL Editor.
- [ ] Run `supabase/storage_policies.sql` in the Supabase SQL Editor.
- [ ] Confirm the `site-media` bucket exists and is public for image viewing.
- [ ] Test that an anonymous browser can SELECT books.
- [ ] Test that an anonymous browser can INSERT an order.
- [ ] Test that an anonymous browser cannot SELECT orders.
- [ ] Test that an anonymous browser cannot INSERT/UPDATE/DELETE books.
- [ ] Test that a non-admin authenticated user cannot manage books/orders/storage.

## 2. Admin
- [ ] Log in with Supabase Auth email + password.
- [ ] Confirm an Auth user not present in `admin_users` is rejected.
- [ ] Change the admin password from the Security tab and confirm Supabase Auth accepts the new password.
- [ ] Log out and confirm the dashboard closes.

## 3. Catalog
- [ ] Add a book and confirm it appears after refresh.
- [ ] Edit title/category/description/price and refresh.
- [ ] Confirm category is free text.
- [ ] Change e-book price and refresh.
- [ ] Toggle stock and refresh.
- [ ] Upload a book cover and open the storefront from another browser/device.
- [ ] Delete a book and confirm it disappears after refresh.
- [ ] Confirm a failed database operation does not falsely report success.

## 4. Orders
- [ ] Place a real test order.
- [ ] Confirm the customer sees success only after the database insert succeeds.
- [ ] Confirm a failed submission keeps the cart.
- [ ] Confirm the order appears in Admin → Orders for the correct Pakistan date.
- [ ] Confirm customer name/address/items render as plain text even if special HTML characters are entered.
- [ ] Download the individual receipt PDF and verify customer, address, items, quantities, total and payment.
- [ ] Select a date and download the Daily Orders PDF.
- [ ] Confirm the daily PDF contains only that selected date.
- [ ] Confirm an empty date produces an empty-date report rather than all orders.

## 5. Images
- [ ] Upload the store flyer from Admin.
- [ ] Open the storefront in an incognito/private browser and confirm the same flyer appears.
- [ ] Reset the flyer and confirm the bundled official image returns.
- [ ] Re-upload any legacy book covers that were stored as old browser data URLs.

## 6. Deployment
- [ ] Do not publish Supabase service-role keys or other secrets.
- [ ] The frontend may contain the Supabase publishable key; RLS is the protection boundary.
- [ ] Deploy the project through a web server/hosting provider; do not rely on `file:///` for production.
- [ ] After deployment, test the live HTTPS URL from a phone and a separate desktop browser.
- [ ] Test admin login, customer checkout, images, and PDFs from the live domain.

## Important
The project currently uses a static `index.html` with JavaScript under `src/`. React scaffolding files are retained for compatibility, but the live UI is controlled by `index.html`, `src/app.js`, and `src/pdfGenerator.js`.
