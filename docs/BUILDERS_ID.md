# Builders ID implementation

## Architecture

The existing React/Vite application and Supabase Auth/Postgres remain the source of identity. UUIDs remain primary keys. Existing email login is preserved. Builders IDs map privately to random internal addresses under builders.invalid because Supabase password authentication requires an email. These addresses never appear as personal email and no mail is sent to them.

Vercel runs `api/builders.js`; local development uses `server/dev.js` and Vite's API proxy. Server authorization verifies the Supabase user and existing database admin function. Admin status still requires the verified owner account already configured by the project. Database policies check active status and session validity.

## Deployment

1. Apply `supabase/migrations/202609220001_builders_id.sql` once after the existing setup.sql. Do not rerun the old setup.sql afterwards. The migration preserves existing email users and does not invent consent or assign them Builders IDs.
2. In Vercel environment settings, keep `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Add `SUPABASE_SERVICE_ROLE_KEY` from Supabase privately, `BUILDERS_CODE_PEPPER` (a cryptographically random secret at least 32 characters), and `APP_URL` (the exact deployed origin, without a trailing slash). Never send server secrets through chat or prefix them with VITE_. Redeploy after setting variables.
3. Add the deployed `/account/setup` and `/portal` URLs to Supabase Auth's allowed redirect URLs. Add localhost equivalents for development. Verify the project's email delivery configuration for personal-email invitations and resets.
4. Sign in as the verified owner and open Admin → Student Accounts. Create one test student, complete setup, log in, issue recovery, and disable the account before distributing real credentials.

Generate a pepper locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Keep it in deployment secrets. Changing it invalidates outstanding setup/recovery codes and export proofs.

## Local testing

Copy `.env.example` to `.env.local`, fill values privately, then run `npm ci`. Start `npm run dev:api` and `npm run dev` in separate terminals. Use a separate Supabase development project for live tests.

Run `npm test`, `npm run test:ui`, `npm run build`, and `npm run lint`. Browser tests use installed Microsoft Edge on Windows; elsewhere install Playwright Chromium with `npx playwright install chromium`. `PLAYWRIGHT_CHANNEL` can select another installed supported browser. Tests use isolated PostgreSQL and a mocked authentication provider; they do not create production users or send email.

Verified: 18 automated tests pass, browser flow passes (email login, admin creation, CSV import/export, mobile layout, ID setup/login, admin authorization and privacy), production build passes. Lint has existing warnings; build reports a bundle-size warning.

## Security and privacy decisions

- Supabase stores passwords. No production plaintext password storage, logging, or password-returning API was added.
- Random setup/recovery codes have approximately 79 bits of entropy, expire after 24 hours, and are stored only as keyed hashes. Consumption is atomic and single-use. Password-provider failures leave setup pending and require a fresh code.
- Exports require current admin authorization, explicit acknowledgment, and signed temporary credential receipts. Original codes exist only in the current results screen; leaving clears them. Admins must regenerate lost codes.
- Imports accept CSV/XLSX up to 2 MB and 200 students. Unsupported columns, formulas, duplicates, malformed rows, and oversized archives are rejected. Preview reserves the exact IDs. Durable per-row state supports explicit retry after partial failure without duplicate accounts; cross-provider creation is not claimed to be one database transaction.
- Exports escape spreadsheet formulas and HTML. Server rate limits protect login, codes and administration. Bulk creation is paced to respect limits.
- Disable revokes sessions and provider access while retaining the account. Audit records exclude passwords and codes. Sensitive tables and profile fields are inaccessible to ordinary users.
- Privacy version 1.0 acceptance is recorded only when provided. New personal-email signup rejects known school domains and requires personal-email confirmation; no heuristic can identify every school domain. Existing school-address owner authentication is grandfathered.
- Privacy requests reach the existing administrator through the app. No invented contact address or fixed retention schedule is asserted. Authentication and portal routes are excluded from analytics events.

## Remaining external verification

The live database exposes the new account RPC and denies anonymous access. This confirms its presence, not every migration statement or live flow. Server secrets and the production deployment must be configured and the live smoke test above completed. Local tests cannot verify production email delivery or actual provider settings.

## Changed files

- Configuration: `.env.example`, `package.json`, `package-lock.json`, `vercel.json`, `vite.config.js`.
- Server: `api/builders.js`, `server/dev.js`, `server/identity.js`, `server/imports.js`, `server/builders.js`.
- Database: `supabase/migrations/202609220001_builders_id.sql`.
- Authentication and routing: `src/App.jsx`, `src/main.jsx`, `src/lib/auth.js`, `src/lib/buildersApi.js`, `src/context/AuthContext.jsx`, `src/components/ProtectedRoute.jsx`.
- UI: `src/components/Footer.jsx`, `src/components/auth/PrivacyNotice.jsx`, `src/components/portal/StudentAccounts.jsx`, `src/pages/Login.jsx`, `src/pages/Signup.jsx`, `src/pages/AccountSetup.jsx`, `src/pages/ForgotPassword.jsx`, `src/pages/Privacy.jsx`, `src/pages/portal/Admin.jsx`.
- Verification and documentation: `tests/harness.js`, `tests/builders.test.js`, `tests/ui.mjs`, `docs/BUILDERS_ID.md`.
