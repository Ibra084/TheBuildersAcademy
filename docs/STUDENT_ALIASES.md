# Student accounts (Recife Sketch model)

Two kinds of account:

- **Personal email.** Students sign up at `/sign-up` with a personal (non-school) email, a password and the Privacy Notice checkbox, then verify by email (`/check-email`).
- **Student alias.** For students without a personal email, an administrator creates an alias such as `maths7b-01` at Admin → Student aliases. The admin sees a temporary password once, and can copy it, download a CSV, or print slips. The student signs in at `/alias`, is sent to `/change-password`, and must choose their own password before using the portal.

Admins can create one alias, a numbered set (`maths7b-01` … `-30`), or a pasted list (up to 200 per batch; taken aliases are skipped). They can also reset an alias's password (signs the student out everywhere and issues a new temporary password) or delete it (removes the account and everything it owns). Personal-email accounts are not managed here.

## How it works

- Aliases are stored in `ba_profiles.alias`. Each alias is backed by a Supabase Auth user at the undeliverable address `<alias>@alias.builders.invalid`. Alias sign-in goes through `api/builders.js` (`login`), which looks the alias up server-side, so auth emails never reach the browser.
- `account_status = 'pending'` means the account is still on a temporary password. The existing `ba_can_access()` policy already denies all portal data until the status is `active`, so the forced password change is enforced by the database, not only by the UI.
- Admin actions (`alias-create`, `alias-bulk`, `alias-reset`, `alias-delete`, `list`) re-check `ba_is_admin()` on every call and are rate-limited. Audit rows record alias actions, never passwords.

## Deployment

1. Apply `supabase/migrations/202610180001_student_aliases.sql` once, after `202609220001_builders_id.sql`. **Try it on a development or branch database first.** It converts existing Builders ID accounts to aliases (`BLD-7K2F9` becomes `bld-7k2f9`), and they keep their current passwords. Accounts that never finished setup stay pending: reset their password from the admin page to give them a temporary one. It does not modify `auth.users`. The old setup-code and import tables are left in place, unused.
2. Environment variables are unchanged: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BUILDERS_CODE_PEPPER` (now used to key rate-limit buckets) and `APP_URL`.
3. In Supabase Auth, allow the deployed `/portal` and `/reset-password` URLs (and localhost equivalents) as redirect URLs.
4. Smoke test: sign in as the owner, create one alias, sign in as it at `/alias`, choose a password, then reset and delete it.

## Local testing

Run `npm test` (server and database tests against PGlite with a mocked auth provider) and `npm run test:ui` (Playwright, full sign-in/admin/alias flow). Neither creates real users or sends email.
