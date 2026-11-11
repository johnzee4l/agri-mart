# AgriMart API Contract

| Field | Value |
| --- | --- |
| Version | 0.2 (Phase 1 implemented) |
| Owner | Member 2 (`backend/src`) |
| Source | `blueprint.md` sections 6 and 7, plus `designtokens.md` for UI-facing shapes |
| Status | Phases 1 and 2 (health, auth, me, catalog, announcements, content, uploads) are implemented. Later phases still answer `501 { "error": "Not implemented yet" }` and replace their stubs in turn. |

**Rule:** anyone changing an endpoint updates this file in the same PR.

## Conventions

- All routes are prefixed `/api`. Base URL in development: `http://localhost:4000/api`.
- Auth column: **P** public · **C** customer · **S** staff or admin · **A** admin.
- Authentication is `Authorization: Bearer <supabase access token>`. No auth cookies, so CSRF does not apply.
- Errors: `{ "error": "message", "details": [...] }` with the matching HTTP status.
- Lists: `{ "data": [...], "page": 1, "total": 0 }`.
- Soft delete (FR-23): `DELETE /x/:id` sets `deleted_at`; `?archived=true` lists archived rows (admin); `POST /x/:id/restore` clears it; `DELETE /x/:id/purge` is permanent and blocked while order history references the row. Public queries always filter `deleted_at is null`.

## Endpoints

| Method and path | Auth | Purpose | Phase |
| --- | --- | --- | --- |
| `GET /health` | P | Health check. Returns `{ status, service, time }` | 1 (done) |
| `POST /auth/register` | P | Create account via Supabase `signUp`; trigger creates the profile | 1 |
| `POST /auth/login` | P | Email and password. Rate limited (for example 5/minute/IP). Returns `access_token`, `refresh_token`, `profile` | 1 |
| `POST /auth/refresh` | P | Exchange the refresh token | 1 |
| `POST /auth/logout` | C | Revoke the session server-side | 1 |
| `POST /auth/forgot-password` | P | Send the reset email | 1 |
| `POST /auth/reset-password` | P | Set a new password with the recovery token | 1 |
| `GET /me` · `PATCH /me` | C | Own profile | 1 |
| `GET` `POST /me/addresses` | C | Saved addresses | 1 |
| `PATCH` `DELETE /me/addresses/:id` | C | Edit or archive an address | 1 |
| `GET /products` | P | Catalog with `q`, `category`, `brand`, `minPrice`, `maxPrice`, `sort`, `page`, `limit` | 2 |
| `GET /products/:id` | P | One product with stock status | 2 |
| `POST /products` · `PATCH /products/:id` · `DELETE /products/:id` | A | Product CRUD and archive | 2 |
| `POST /products/:id/restore` · `DELETE /products/:id/purge` | A | Restore or permanently delete | 2 |
| `GET /categories` | P | Category list. Same CRUD pattern as products (admin) | 2 |
| `GET /announcements` | P | Published only, pinned first | 2 |
| `POST` `PATCH` `DELETE /announcements` | A | Draft and publish through `published_at` | 2 |
| `GET /content` | P | All `site_content` keys | 2 |
| `PUT /content/:key` | A | Update one content key | 2 |
| `POST /uploads` | A | Image upload to `public-images`, returns the URL | 2 |
| `POST /orders` | C | Create order with server-side prices, stock check, delivery fee, payment intent for online methods | 3 |
| `GET /orders` · `GET /orders/:id` | C, S | Customers see their own; staff and admin see all with `?status&from&to` | 3 |
| `POST /orders/:id/cancel` | C | Only while `pending` | 3 |
| `PATCH /orders/:id/status` | S | Change status; sends email and push; deducts stock for COD at `preparing` | 3 |
| `POST /payments/webhook` | PayMongo | Raw body, signature verified, idempotent, then `deduct_stock` | 3 |
| `GET /inventory/logs` · `GET /inventory/low-stock` | S | Inventory log and low-stock list | 3 or 4 (C5) |
| `POST /inventory/adjust` | S | Stock-in, adjustment, spoilage | 3 or 4 (C5) |
| `GET /users` · `PATCH /users/:id` | A | List, change role, activate or deactivate | 3 or 4 (C5) |
| `GET /reports/summary` | S | Dashboard numbers (sales totals are admin only) | 4 |
| `GET /reports/:type` | A | `sales`, `inventory`, `low-stock`, `top-products`; `?from&to&format=csv` | 4 |
| `GET /chat/conversations` | S | Staff inbox | 4 |
| `GET /chat/messages` | C, S | Thread history; customers read only their own conversation | 4 |
| `GET /push/public-key` | C, S | VAPID public key | 4 or 5 (C1) |
| `POST /push/subscribe` · `POST /push/unsubscribe` | C, S | Push subscription management | 4 or 5 (C1) |

## Phase 1 request and response bodies

**Auth.** Supabase Auth sits behind these routes; the browser never holds a Supabase key.

| Endpoint | Body | Success |
| --- | --- | --- |
| `POST /auth/register` | `{ email, password, full_name, phone? }` | `201 { data: { id, email }, message }`. Profile row comes from the `handle_new_user` trigger |
| `POST /auth/login` | `{ email, password }` | `200 { access_token, refresh_token, expires_at, profile }` |
| `POST /auth/refresh` | `{ refresh_token }` | `200 { access_token, refresh_token, expires_at }` |
| `POST /auth/logout` | — (Bearer) | `204`, all sessions for the account revoked |
| `POST /auth/forgot-password` | `{ email }` | `202 { message }` whether or not the address exists |
| `POST /auth/reset-password` | `{ access_token, password }` | `200 { message }` |

Auth answers: `400` validation (with `details[].path`), `401` bad credentials or expired session, `403` deactivated account, `409` email already registered, `429` more than 5 login attempts per IP per minute (or 5 reset requests per hour).

**Profile and addresses.** All require the Bearer token and are scoped to the caller.

| Endpoint | Body | Success |
| --- | --- | --- |
| `GET /me` | — | `200 { data: profile }` (includes `email`) |
| `PATCH /me` | `{ full_name?, phone? }` | `200 { data: profile }` |
| `GET /me/addresses` | — | `200 { data, page, total }`, default first, archived excluded |
| `POST /me/addresses` | `{ street, barangay, municipality, province, latitude?, longitude?, is_default? }` | `201 { data: address }` |
| `PATCH /me/addresses/:id` | Any of the fields above | `200 { data: address }` |
| `DELETE /me/addresses/:id` | — | `204`, sets `deleted_at` (archive) |

Rules: the first saved address becomes the default; setting `is_default: true` clears the previous default; archiving the default promotes the newest remaining address. An address owned by another account answers `404`, not `403`.

## Phase 2 request and response bodies

**Catalog.** `GET /products` is public; writes need an admin token. Archived rows are hidden from every public call.

| Query | Meaning |
| --- | --- |
| `q` | Searches name, brand and description |
| `category` | Category id (exact) |
| `brand` | Partial, case-insensitive |
| `minPrice` · `maxPrice` | Numeric bounds on `price` |
| `sort` | `newest` (default), `price_asc`, `price_desc`, `name` |
| `page` · `limit` | Page starts at 1; `limit` defaults to 12, max 60 |
| `archived` | `true` lists archived rows. Admin only, otherwise `403` |

`GET /products` → `200 { data, page, total }`. `GET /products/:id` → `200 { data }`, or `404` when archived (admins still see archived rows).

`POST /products` body: `{ name, price, stock_qty, category_id?, brand?, unit?, description?, reorder_level?, image_url?, is_featured? }`. `PATCH` takes any subset. `DELETE /products/:id` archives (`204`); `POST /products/:id/restore` restores (`200 { data }`); `DELETE /products/:id/purge` is permanent (`204`) and answers `409` if the product appears in `order_items`, or if it was never archived. Categories follow the same pattern with `{ name, description? }`, and a category with products cannot be purged.

**Announcements.** `GET /announcements` is public and returns published rows only (`published_at` in the past), pinned first then newest. An admin token also sees drafts. `POST` body `{ title, body, is_pinned?, published_at? }` creates a draft when `published_at` is null or omitted; setting it publishes. `PATCH` with `published_at: null` unpublishes. Archive, restore and purge as above.

**Content.** `GET /content` → `200 { data: { home_hero, home_banners, about, contact, store_location, delivery_rates } }`, a map of key to jsonb value. `PUT /content/:key` (admin) body `{ value }` upserts one key; unknown keys answer `404`.

**Uploads.** `POST /uploads` (admin) is `multipart/form-data` with one `file` field. JPEG, PNG, WebP, GIF or AVIF, 5 MB maximum. → `201 { data: { url, path } }` with the public URL of the object in `public-images`.

## Realtime (`backend/src/chat.js`)

Socket.IO on the same port, same origin allowlist.

| Event | Direction | Payload |
| --- | --- | --- |
| handshake | client → server | `auth: { token }` |
| `message:send` | client → server | `{ body }` (customer) or `{ conversation_id, body }` (staff) |
| `message:new` | server → client | `{ message }` to `conv:<customerId>` and the `staff` room |
| `stock` | server → client | `{ product_id, stock_qty }` after any deduction or adjustment |

## Frontend routes (blueprint 7.1)

`/` · `/products` · `/products/:id` · `/cart` · `/checkout` · `/login` `/signup` `/forgot` `/reset` · `/account` · `/announcements` · `/contact` · `/admin/*` (Dashboard, Products, Orders, Inventory, Announcements, Content, Users, Reports, Chat).
