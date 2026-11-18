# AgriMart API Contract

| Field | Value |
| --- | --- |
| Version | 0.6 (Phase 5 complete) |
| Owner | Member 2 (`backend/src`) |
| Source | `blueprint.md` sections 6 and 7, plus `designtokens.md` for UI-facing shapes |
| Status | All planned phases are implemented: auth, catalog, orders, payments, inventory, users, reports, chat, push, PWA and offline reads. |

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
| `POST /orders/:id/cancel` | C | Only while `pending`; restocks once if a retried payment had deducted stock | 3 |
| `POST /orders/:id/pay` | C, S | Fresh PayMongo intent for a pending online order, without duplicating it | 3 |
| `PATCH /orders/:id/status` | S | Change status; sends email and push; `paid` is a payment fact | 3 |
| `POST /payments/webhook` | PayMongo | Raw body, signature verified, idempotent, then `deduct_stock` | 3 |
| `GET /inventory/logs` · `GET /inventory/low-stock` | S | Inventory log and low-stock list | 3 or 4 (C5) |
| `POST /inventory/adjust` | S | Stock-in, adjustment, spoilage | 3 or 4 (C5) |
| `GET /users` · `PATCH /users/:id` | A | List, change role, activate or deactivate | 3 or 4 (C5) |
| `GET /reports/summary` | S | Dashboard numbers (sales totals are admin only) | 4 |
| `GET /reports/:type` | A | `sales`, `inventory`, `low-stock`, `top-products`; `?from&to&format=csv` | 4 |
| `GET /chat/conversations` | S | Staff inbox | 4 |
| `GET /chat/messages` | C, S | Thread history; customers read only their own conversation | 4 |
| `POST /chat/messages` | C, S | REST fallback for sending when the socket is unavailable | 4 |
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

**Content.** `GET /content` → `200 { data: { home_hero, home_banners, about, contact, store_location, delivery_rates } }`, a map of key to jsonb value. `PUT /content/:key` (admin) body `{ value }` upserts the whole value of one key; unknown keys answer `404`. These are the shapes the storefront reads (`frontend/src/lib/content.js`, `pages/Home.jsx`, `pages/Contact.jsx`, `pages/Checkout.jsx`) and what `admin/Content.jsx` edits:

| Key | Value |
| --- | --- |
| `home_hero` | `{ eyebrow, headline, subheadline, cta_label, cta_href }` |
| `home_banners` | `[{ title, body, image_url, href }]`, in display order |
| `about` | `{ body }` |
| `contact` | `{ phone, email }` |
| `store_location` | `{ address, hours, latitude, longitude }` — the pin checkout measures delivery distance from |
| `delivery_rates` | `{ base_fee, per_km }` |

**Uploads.** `POST /uploads` (admin) is `multipart/form-data` with one `file` field. JPEG, PNG, WebP, GIF or AVIF, 5 MB maximum. → `201 { data: { url, path } }` with the public URL of the object in `public-images`.

## Phase 3 request and response bodies

**Orders.** Every route needs the Bearer token; staff and admin see all orders, customers only their own.

`POST /orders` body: `{ items: [{ product_id, qty }], fulfillment_type: "delivery" | "pickup", address_id?, latitude?, longitude?, method: "cod" | "gcash" | "card" | "grab_pay" }`.

Prices, stock and the delivery fee are decided on the server; nothing money-related is read from the body. Repeats of one product are merged before the stock check, and a short line answers `400` with `details[].path` such as `items.0.qty`. Archived products are refused the same way. Delivery needs an address the caller owns (`404` when it is not theirs) and pickup stores `address_id: null` with a fee of `0`.

Delivery fee: `base_fee + per_km × haversine(store_location, destination pin)`, both read from `site_content`, rounded to the centavo. The optional `latitude`/`longitude` override the saved address pin for this delivery only; `address_id` is still required. Without an override the address pin is used; an address without a pin pays `base_fee`; a missing `delivery_rates` or store pin with a pinned address answers `503`.

Online methods create the PayMongo intent **before** the order row is written, so a provider failure cannot leave an orphan order: `503` when the secret key is not configured, `502` when PayMongo refuses. The intent is created for the full total in centavos with `capture_type: automatic`; the browser attaches the payment method with the returned `client_key`.

→ `201 { order: { …, order_items }, payment: { intent_id, client_key } }`, with `payment: null` for COD. The `payments` row starts at `pending` (`paymongo_ref` holds the intent id).

`GET /orders` → `200 { data, page, total }`, newest first, accepting `?status&from&to&page&limit`; `limit` defaults to 20 and caps at 60. `GET /orders/:id` → `200 { data }` with `order_items` (plus each product's `name`, `unit`, `image_url`) and `payments`. Another account's order answers `404`, never `403`.

`POST /orders/:id/cancel` → `200 { data }` while the order is `pending` (otherwise `409`), its pending payment row becomes `failed`, and any stock a retried payment had already deducted is returned once.

`POST /orders/:id/pay` (customer or staff) → `200 { data: { intent_id, client_key, method, amount } }` for a `pending` order whose method is online and whose payment is not already `paid`. It rechecks stock without changing items or prices, then replaces `paymongo_ref` with a fresh intent. A sold-out or archived line answers `409`; COD answers `400`; a settled payment answers `409`; an unconfigured provider answers `503`.

`PATCH /orders/:id/status` (staff, admin) body `{ status }`. Allowed moves: `pending → paid | cancelled`, `paid → preparing | cancelled`, `preparing → out_for_delivery | completed | cancelled`, `out_for_delivery → completed`. COD may skip the paid step with `pending → preparing`; online orders may not. Pickup orders skip `out_for_delivery` (`400`). Any other move is `409`. `paid` is a payment fact: a manual move is refused unless the payment row is already `paid`. Stock follows the money: COD deducts once at `preparing`, online orders deduct when payment settles, and cancelling after either point returns the stock once. COD is marked `paid` with `paid_at` at `completed`. Every change emails the customer, and a deduction broadcasts `stock`.

**PayMongo webhook.** `POST /payments/webhook`, no token. The signature is HMAC-SHA256 over `"<t>.<raw body>"` with `PAYMONGO_WEBHOOK_SECRET`, compared in constant time against `te` (test) or `li` (live) from `Paymongo-Signature`. A missing secret answers `503`; a bad signature, a wrong timestamp or a body changed after signing answers `401`.

Only `payment` resources act. `payment_intent_id` finds the `payments` row through `paymongo_ref`: success marks the payment `paid`, moves a `pending` order to `paid` and calls `deduct_stock` once. A paid event for a cancelled order records the payment but never deducts stock; the store refunds it. If the stock deduction fails, the order returns to `pending` so a later PayMongo retry can settle it. A failure marks the payment `failed` and leaves the order `pending` for `POST /orders/:id/pay`. Repeated deliveries and unrelated events are acknowledged with `200`; a repeat of a settled payment also carries `duplicate: true`, and unknown intents are ignored the same way.

Local testing needs a public HTTPS URL. Run `ngrok http 4000` (any tunnel works) and register `https://<tunnel>/api/payments/webhook` for `payment.paid` and `payment.failed` in the PayMongo dashboard, then copy its signing secret into `PAYMONGO_WEBHOOK_SECRET`.

**Order statuses.** `pending → paid → preparing → out_for_delivery → completed`, plus `cancelled`; pickup skips `out_for_delivery`, and COD normally goes `pending → preparing` because cash is collected later.

**Email.** Order confirmation and every status change go to the account email over Gmail SMTP (`SMTP_USER`, `SMTP_PASS`). Mail is best effort: an unconfigured or failing mailbox never fails an order request.

## Phase 4 request and response bodies

**Inventory.** All three routes need a staff or admin token; a customer gets `403`. Every adjustment is logged against the caller, so the log answers "who moved this stock".

`GET /inventory/logs` → `200 { data, page, total }`, newest first. Filters: `?product_id&reason&from&to&page&limit`, `reason` ∈ `stock-in`, `sale`, `adjustment`, `spoilage`, `limit` 20 by default and 60 at most. A bad reason or product id is `400` with `details[].path`; each row carries `products: { name, unit, image_url }`.

`GET /inventory/low-stock` → `200 { data }`: active products where `stock_qty <= reorder_level`, lowest first. The comparison is done by the `low_stock_products()` SQL function, because a PostgREST filter only compares against a literal, so the list never drifts from the truth.

`POST /inventory/adjust` body `{ product_id, change_qty, reason }`. `change_qty` is a non-zero integer; `stock-in` must be positive and `spoilage` negative. → `201 { data: product, low_stock }`. An unknown product is `404`, an archived one `409`, and a change that would go below zero `409` without touching the row. Each success writes the `inventory_logs` row, broadcasts `stock` with the new quantity, and emails the admins when the product is now at or below `reorder_level`.

**Low-stock email (FR-10).** After any deduction (`deduct_stock` when an order is paid or a COD order is confirmed) or adjustment that leaves a product at or below its reorder level, every active admin receives one email listing the affected products with their remaining quantity. Mail is best effort: a missing mailbox or SMTP failure is logged and never fails the stock change. `SMTP_HOST` and `SMTP_PORT` point the mailer at any relay for local testing; auth there is opt-in with `SMTP_AUTH=true`.

## Phase 4 administration bodies

**Users.** Admin only; staff and customers get `403`.

`GET /users` → `200 { data, page, total }`, newest first, with `?q&role&is_active&page&limit` (`limit` 20 by default, 60 at most). `q` matches the name or phone, and every row is the profile plus `email` from the auth record. An unknown `role` or a non-boolean `is_active` is `400`.

`PATCH /users/:id` body `{ role?, is_active? }` → `200 { data }`. Deactivation takes effect on that account's next request, which answers `403`. Changing your own role or deactivating yourself is `409`, an unknown id `404`, a bad role `400`.

**Reports.** `GET /reports/summary` is for staff and admin (a customer gets `403`) and returns `{ sales, low_stock, recent_orders, counts }`. `sales` is `null` for staff; for admin it is `{ revenue, orders, average, days }` over the last 30 days.

`GET /reports/:type` is admin only. `type` ∈ `sales`, `inventory`, `low-stock`, `top-products`, anything else `404`. Query `?from&to&format=json|csv`: a bare date includes that whole day, the default range is the last 30 days, and `from` on or after `to` is `400`. `format=csv` returns `text/csv` as an attachment named after the report. Sales and top products aggregate in SQL (`report_sales`, `report_top_products`) over paid, preparing, out-for-delivery and completed orders; the inventory report values stock at the current price and flags low rows; the low-stock report adds each shortfall.

**Chat.** One conversation per customer. A signed-in customer never names a conversation: the API resolves their own row, creating it on the first message. Staff and admin name the thread explicitly.

`GET /chat/conversations` (staff, admin) → `200 { data, page, total }`, newest activity first, at most 50 rows. Each row is `{ id, customer_id, last_message_at, created_at, customer: { full_name, phone } | null, last_message: { id, body, sender_id, created_at } | null }`.

`GET /chat/messages` → `200 { data, page, total, conversation }`. Customers may omit `conversation_id` and always read their own conversation; naming another one is `404`. Staff and admin must pass `?conversation_id`. Optional `?before` is an ISO timestamp for paging, and `?limit` defaults to 50 and caps at 100. Messages come back oldest first, ≤ 2000 characters each.

`POST /chat/messages` body `{ body, conversation_id? }` → `201 { data: message, conversation_id, customer_id }`. `body` is trimmed, must be 1–2000 characters, and is stored before any live event. Customers do not need to pass `conversation_id`; staff and admin do. The matching Socket.IO `message:send` uses the same validation and save path.

## Realtime chat events (FR-22)

| Event | Direction | Payload |
| --- | --- | --- |
| handshake | client → server | `auth: { token }` |
| `chat:ready` | server → client | `{ connected, rooms, role }` |
| `message:send` | client → server | `{ body }` (customer) or `{ conversation_id, body }` (staff), with an ack `{ ok, data | error }` |
| `message:new` | server → client | `{ message, conversation_id, customer_id }` to `conv:<customerId>` and the `staff` room |
| `stock` | server → client | `{ product_id, stock_qty }` after any deduction or adjustment |

The handshake verifies the Supabase token and `profiles.is_active`, just like the REST middleware. Customers join `conv:<customerId>`; staff and admin join `staff`. Sends are burst-limited per socket (20 messages per 10 seconds). A push notification is sent only when the recipient room has no live socket.

**Push.** `GET /push/public-key` (any signed-in account) → `{ key }`, with `null` when VAPID is not configured.

`POST /push/subscribe` body `{ endpoint, keys: { p256dh, auth } }` → `201 { data: { id } }`. The endpoint is unique, so re-subscribing the same browser updates that row and moves it to the current account. `503` when VAPID is unset, `400` for a malformed subscription.

`POST /push/unsubscribe` body `{ endpoint }` → `204`, scoped to the caller. `lib/push.js` sends with VAPID and deletes any subscription that answers `404` or `410`; sending a push is always best effort and never fails the request that triggered it.

## Phase 5 push events (FR-21)

Blueprint 6.2 as implemented. Each event is fired by the route that caused it, in the background: the response never waits for a push service, and a push failure is logged and swallowed, so one dead subscription can never turn a successful order, adjustment or announcement into an error. `lib/pushEvents.js` owns the payloads and the recipients; `lib/push.js` owns delivery.

| Event | Fired by | Recipients |
| --- | --- | --- |
| Order status changed | `PATCH /orders/:id/status` | That order's customer |
| New order placed | `POST /orders` | Active staff and admins |
| Order paid | `POST /payments/webhook` | Active staff and admins |
| New announcement published | `POST /announcements`, `PATCH /announcements/:id` | Active customers |
| Low stock | Any deduction or adjustment that reaches `reorder_level`, with the low-stock email | Active admins |
| New chat message | `message:send` or `POST /chat/messages`, only when the recipient room has no live socket | The customer, or every signed-in staff member |

The payload is `{ title, body, url, tag }`, which is what `frontend/src/sw.js` reads. `url` is a frontend route the service worker opens on click (`/orders/:id`, `/admin/orders`, `/admin/inventory`, `/announcements`) and `tag` collapses repeats about the same subject in the tray.

"New announcement published" means the row became live: `published_at` set and not in the future. A draft `POST` is silent, publishing a draft through `PATCH` notifies once, and editing an announcement that is already published does not notify again. A future-dated announcement is not pushed when its time arrives, because nothing schedules that; publish it, or accept the skipped push. A customer cancelling their own order does not push back to them.

**Configuration.** `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (`npx web-push generate-vapid-keys`) and `VAPID_SUBJECT`. With VAPID unset every event is skipped silently and `GET /push/public-key` answers `null`, so the frontend can hide the opt-in.

**Verifying locally.** `backend/test/push-events.test.mjs` runs every row above against the real routes and database, with `setPushTransport` recording the sends instead of reaching a push service. Confirming delivery on a device still needs the HTTPS deployment (blueprint section 10) and the iOS caveat there.

## Phase 5 security pass

Reviewed against the blueprint checklist (validation, no raw SQL, no secrets in code, CORS and rate limits) and pinned by `backend/test/security.test.mjs`.

**Validation.** Every body, path parameter and query value is parsed before it reaches the database: zod bodies and params through the `validate` middleware, and the hand-read list filters (`from`/`to`, `status`, `reason`, `role`, `is_active`, `sort`, `minPrice`/`maxPrice`, `format`, `page`/`limit`) validated or whitelisted in the route. A bad value is `400 { error: "Validation failed", details: [{ path, message }] }`, where `details[].path` names the field: a malformed date is a `400`, not a PostgREST error surfacing as a `500`. An unknown report type is `404`, and a row that belongs to someone else is `404` rather than a `403` that would confirm it exists.

**Limits.** `express.json` caps bodies at 1 MB (`413`) and `multer` caps an upload at one image of 5 MB. Rate limits are per IP: 300 requests a minute across the API, 5 sign-in attempts a minute, 5 password-reset requests an hour. A limited caller gets `429`, and the `RateLimit*` headers advertise the window and budget. Behind a proxy set `TRUST_PROXY` to the number of hops (Render: `1`), so the limiters key on the real client instead of the proxy; it is unset by default so a direct run cannot be throttled through a header the caller made up.

**Origin.** CORS answers only the origins listed in `FRONTEND_URL` (comma-separated). Any other origin is `403 { error: "Origin not allowed" }` with no `Access-Control-Allow-Origin`, so a foreign page cannot read an API answer even with a stolen token. `helmet` sets the standard headers and `x-powered-by` is off.

**Access.** Authentication is a Supabase access token in the `Authorization` header, verified per request and re-checked against `profiles.is_active`, so a deactivation applies to that account's next request. Every protected route answers `401` without a token and `403` for the wrong role: staff cannot reach users, reports, uploads, catalog writes or content writes. Reads and writes are scoped by `req.user.id`, never by an id taken from the body, so another customer's order, address or conversation is a `404`.

**Data and secrets.** Every database call goes through supabase-js builders or `rpc()` functions with named parameters; no SQL string is assembled in Node, and user input never reaches a filter expression unescaped (`q` is length-capped and stripped of PostgREST separators and LIKE wildcards). The only environment value a client ever sees is `VAPID_PUBLIC_KEY`; the service-role key, the PayMongo secret and webhook secret, the SMTP credentials and the VAPID private key stay in the server process. Only `.env.example` is tracked, with empty values, and `.gitignore` keeps real `.env` files out.

**Known gap.** Push and webhook delivery cannot be exercised locally (see section 10), and `POST /payments/webhook` deliberately skips zod: its signature is verified over the raw bytes before its shape is read, and an unrecognised shape is acknowledged and ignored.

## Frontend routes (blueprint 7.1)

`/` · `/products` · `/products/:id` · `/cart` · `/checkout` · `/login` `/signup` `/forgot` `/reset` · `/account` · `/announcements` · `/contact` · `/admin/*` (Dashboard, Products, Orders, Inventory, Announcements, Content, Users, Reports, Chat).

## PWA and maps

`frontend/src/sw.js` precaches the app shell, serves catalog/content reads stale-while-revalidate, serves orders and `/me` network-first, and never caches auth, payment, chat, push or health responses. OpenStreetMap tiles and product photos use a bounded cache-first media store, so a viewed map still opens offline. Chat and checkout are disabled while offline; catalog pages keep their last response.

Maps use Leaflet 1.9 with OpenStreetMap raster tiles (`frontend/src/lib/maps.js`). There is no Google Maps dependency and no map API key: set nothing beyond `VITE_API_URL` and the optional PayMongo public key. The store map and the delivery pin picker credit OpenStreetMap in the attribution control.
