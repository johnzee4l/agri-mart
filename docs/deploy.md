# Deploying AgriMart (Phase 5 runbook)

The last Phase 5 task is the deployment everything else waits on (D11): push, service
workers and the PayMongo webhook all need a public HTTPS origin, and Member 1 and Member 3
need one for their Phase 5 tests.

Three pieces:

| Piece | Where | Who owns it |
| --- | --- | --- |
| Database and auth | A hosted Supabase project | Member 3 (`database/`) |
| API (`backend/`) | Render web service, from `render.yaml` | Member 2 |
| Storefront (`frontend/`) | Any static host (Vercel, Netlify, Render static site) | Member 1 |

Nothing here is done automatically: it needs the accounts' credentials, so run it by hand
and tick the Phase 5 boxes once the PR is merged.

## 1. Supabase project

1. Create a project (region: Singapore, the closest to the Philippines) and keep the
   database password — the backup workflow needs it.
2. Apply the migrations in order, from `database/migrations/`. Either paste each file into
   the SQL editor, or push it with `psql`:
   ```bash
   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f database/migrations/001_schema.sql
   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f database/migrations/002_functions.sql
   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f database/migrations/003_seed.sql
   ```
   `003_seed.sql` also inserts a sample product, so the storefront is not empty on a fresh
   project.
3. Storage: create the **`public-images`** bucket and mark it public. Admin uploads write
   there and the storefront reads the returned public URL.
4. Authentication → URL Configuration: set the Site URL to the deployed frontend origin and
   add `<frontend>/reset` to the redirect allow list, or the password-reset link lands
   nowhere.
5. Authentication → Emails → SMTP Settings: enable **custom SMTP** with the same Gmail
   address and App Password the API uses (`SMTP_USER` / `SMTP_PASS`). Without it, reset and
   confirmation mail goes out through Supabase's shared sender, which is rate limited to a
   few messages an hour and more likely to land in spam. If the demo signs up several
   accounts at once, also raise the limits under Authentication → Rate Limits.
6. Copy `Project URL` and the `service_role` key for Render. The service-role key is the
   only Supabase credential the server needs; it must never reach the browser.

## 2. Render API service

Create it from the blueprint, so `render.yaml` supplies the settings:

> Render Dashboard → **New** → **Blueprint** → pick this repository → apply.

That creates `agrimart-api` from `backend/` with `npm ci` / `npm start`, health check
`/api/health`, and `TRUST_PROXY=1`. Then fill in the variables it asked for
(**Environment** tab). `sync: false` in the blueprint means "no value committed, type it
here".

| Variable | Value |
| --- | --- |
| `FRONTEND_URL` | The deployed frontend origin, e.g. `https://agrimart.vercel.app`. Comma-separated for several. CORS allows exactly these and nothing else. |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` secret |
| `PAYMONGO_SECRET_KEY` | PayMongo → Developers → API keys, test mode (`sk_test_…`) |
| `PAYMONGO_WEBHOOK_SECRET` | Created in step 4 below (`whsec_…`) |
| `SMTP_USER`, `SMTP_PASS` | A Gmail address and an App Password (the Google account needs 2FA). `ADMIN_EMAIL` receives the low-stock and order alerts. |
| `ADMIN_EMAIL` | Where the store alerts go |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` (run once; rotating them invalidates every existing subscription) |
| `VAPID_SUBJECT` | `mailto:` address for the VAPID contact |
| `TRUST_PROXY` | `1`, already set by the blueprint: the service sits behind Render's proxy, so rate limits key on the real client IP |

Not needed on Gmail: `SMTP_HOST`, `SMTP_PORT`, `SMTP_AUTH` (see `backend/.env.example`).
`PORT` is set by Render.

Notes: `plan: free` in the blueprint spins the service down after 15 idle minutes, which
delays the first request and every WebSocket connection — the uptime pinger in step 6
covers the demo, and `starter` is the paid 99% path. Keep `autoDeploy` on the `master`
branch so merging a PR redeploys.

## 3. Frontend

Build the storefront with the deployed API base URL — the trailing `/api` is part of it,
as `frontend/.env.example` says — and deploy the static output:

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `https://agrimart-api.onrender.com/api` |
| `VITE_PAYMONGO_PUBLIC_KEY` | PayMongo public key (`pk_test_…`), the browser half of checkout |
| `VITE_GOOGLE_MAPS_KEY` | Google Maps JS key, for the store map and the address picker |

The Socket.IO client connects to the origin of `VITE_API_URL`, so chat and live stock
follow the same value. Then set `FRONTEND_URL` on the API service to the frontend's exact
origin and redeploy the API. A mismatch shows up as `403 {"error":"Origin not allowed"}`
in the browser console and as the failed CORS check in the smoke run below.

## 4. PayMongo webhook

Register the endpoint (PayMongo → Developers → Webhooks does the same thing by hand):

```bash
curl -sS -u "$PAYMONGO_SECRET_KEY:" \
  -X POST https://api.paymongo.com/v1/webhooks \
  -H "Content-Type: application/json" \
  -d '{"data":{"attributes":{"url":"https://agrimart-api.onrender.com/api/payments/webhook","events":["payment.paid","payment.failed"]}}}'
```

The response carries `data.attributes.secret_key` (`whsec_…`). Put that in
`PAYMONGO_WEBHOOK_SECRET` on the API service and redeploy. Without it the route answers
`503`; with it, an unsigned or forged delivery is `401`, a repeat delivery is acknowledged
as a duplicate without deducting stock twice, and an event that is not a payment is
acknowledged and ignored.

End-to-end sandbox check: sign in as a customer, place a GCash or card order, pay on
PayMongo's page with a test payment method, then confirm the order turned `paid`, the
stock dropped once, the customer got the status email, and staff or admin devices got the
"Order paid" push. A leftover local intent can never collide with a live one: the API
mints per-attempt references.

## 5. Verify the deployment

From `backend/`:

```bash
npm run smoke -- https://agrimart-api.onrender.com
SMOKE_ORIGIN=https://agrimart.vercel.app npm run smoke -- https://agrimart-api.onrender.com
```

Pass the API **origin**, without `/api`; the script adds the paths itself.

It checks HTTPS, `/api/health`, a database-backed route, the CORS allowlist (echo and
refusal), the anonymous `401`, the Socket.IO upgrade that chat needs, and that the push
public key is not public. Exit code 1 means something is misconfigured; the failure line
names it, for example a `FRONTEND_URL` that does not match the deployed storefront.

The smoke run cannot see the UI or the database contents, so also do these by hand once:
admin sign-in, one image upload (proves the `public-images` bucket and its policy), a COD
order moved to `preparing` (stock deducts, the admin gets the low-stock email), and
publishing an announcement.

## 6. Uptime and backups

Uptime (blueprint section 10: a paid instance or an uptime pinger): set the repository
variable **`API_BASE_URL`** (Settings → Secrets and variables → Actions → Variables) to the
deployed origin. `.github/workflows/uptime.yml` then pings `/api/health` and a
database-backed route every 10 minutes, which is inside Render's 15-minute idle window, and
fails the run when the API is unhealthy. Without the variable the job logs and stops.
GitHub disables schedules after 60 days of repository inactivity; re-enable it if the
project goes quiet.

Backups (the free Supabase plan has no daily backups): add the repository secret
**`SUPABASE_DB_URL`** — the direct connection string (port 5432) or the session pooler,
with the password in it. `.github/workflows/db-backup.yml` then dumps the database nightly
at 02:00 PHT from a matching `postgres` client image and keeps the gzipped dump as an
action artifact for 30 days.

Restore into a **fresh** project — the dump is written with `--clean --if-exists`, so it
drops and recreates objects and would overwrite the live database:

```bash
gunzip -c agrimart-2026-11-11.sql.gz | psql "$NEW_SUPABASE_DB_URL"
```

## 7. Push on a real device

This is the one Phase 5 item no script can finish, because it needs a browser with the
service worker running on the HTTPS origin.

- **Android Chrome:** open the site, sign in, allow notifications, then trigger an event.
- **iOS 16.4+:** add the site to the Home Screen **first** (blueprint section 10), open it
  from there, then allow notifications. Push does not work in a plain Safari tab.

Confirm all four events, on the right devices:

| Event | How to trigger it | Who should be notified |
| --- | --- | --- |
| New order | Place a COD order | Staff and admins |
| Order status changed | Move that order to `preparing` | That customer |
| Announcement published | Publish one in the admin panel | Subscribed customers |
| Low stock | Adjust a product down to its reorder level | Admins |

If nothing arrives: `GET /api/push/public-key` returning `null` means `VAPID_PUBLIC_KEY` is
unset, so the opt-in is hidden and every event is skipped silently; a subscription created
against a different VAPID pair is deleted by the first `404`/`410`; and an iOS device that
was never installed cannot subscribe. Tapping a notification opens the route in its `url`
(`/orders/:id`, `/admin/orders`, `/admin/inventory`, `/announcements`), which is the
service worker's half (Member 1).

## 8. Known limits

- The free Render plan sleeps after 15 idle minutes and its projects on the free Supabase
  plan can pause; the first request, WebSocket connect or webhook after a sleep is slow.
  Use `starter` (or another paid instance) for the demo and the 99% target.
- PayMongo stays in sandbox mode. A tunnel is only needed to test webhooks against a local
  API, never against the deployment.
- The seed's product insert has no conflict target, so re-applying `003_seed.sql` against an
  already-seeded database adds another sample row. The hosted project applies it once; a
  local stack can end up with duplicates (Member 3's file).
- The smoke script does not sign in, so it cannot confirm VAPID is configured or that a
  subscription stores; section 7 covers those by hand.
