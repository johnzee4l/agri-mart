# AgriMart — Project Blueprint

> Agricultural supply store web application · React + Node.js API + Supabase · PWA, push notifications, real-time chat
> Course: Web Systems and Technologies 2 / System Integration and Architecture 1

**Changes from the original documentation**

| Change | Detail |
| --- | --- |
| Removed | Strapi / headless CMS. The admin panel is now a custom section of the React app, talking to the Node API. |
| Database | PostgreSQL via **Supabase** (database, auth, file storage). |
| Frontend / Backend | **React** (Vite) / **Node.js** (Express) API. |
| Added features | PWA with limited offline mode, Web Push notifications, real-time chat (WebSocket), full CRUD through the Node API with soft delete / archiving. |
| Unchanged | Every business rule, functional requirement, non-functional requirement, role, and integration (PayMongo, SMTP/Gmail, Google Maps). |

---

## 1. Project Context

### 1.1 Business overview
AgriMart is an agricultural supply shop with an online storefront. It sells seeds, fertilizers, pesticides, animal feeds, veterinary supplies, farm tools and irrigation equipment to farmers, backyard growers and livestock raisers. Customers browse the catalog, check live stock, order online, pay digitally and choose delivery or store pickup. The owner manages products, stock, announcements and reports through an admin panel.

### 1.2 Problem statement
Small rural agricultural supply stores rely on walk-in sales, handwritten ledgers and Facebook messages, which causes:
- Farmers travel far only to find an item out of stock.
- Prices and availability are not published anywhere reliable.
- Manual inventory leads to overstocking, stockouts and expired goods.
- Cash-only and credit ("utang") transactions are hard to monitor.
- Farmers have no easy way to receive promos, planting-season reminders or product advisories.

### 1.3 Target users
- **Primary customers:** small-scale farmers, livestock and poultry raisers, backyard or urban gardeners.
- **Secondary customers:** cooperatives, farm-resort owners, landscapers (bulk buyers).
- **Business users:** store owner (Administrator), store staff and inventory clerks (Staff).

### 1.4 Value proposition
- **Customers:** 24/7 catalog with real-time stock and prices, online ordering, cashless payment, order tracking, delivery or pickup, seasonal farming announcements, push alerts, and live chat with the store.
- **Owner:** automatic inventory deduction, low-stock alerts, sales reports, and an admin panel to update content with no coding.
- **Versus status quo:** one source of truth replaces scattered chats and paper records.

### 1.5 Revenue model
| Stream | Description | In the system? |
| --- | --- | --- |
| Product sales margin | Retail and wholesale sales | Yes: catalog, orders |
| Delivery fees | Distance-based fee at checkout; pickup is free | Yes: FR-5 |
| Supplier featured listings | Brands pay to be featured on the home page and announcements | Yes: `is_featured` flag and pinned announcements |
| AgriMart Plus membership | Paid plan with bulk discounts, free delivery above a threshold, early promos, priority support | Business model only (not in scope of code) |
| Bulk / pre-order commissions | Handling fee on cooperative and seasonal pre-orders | Business model only (not in scope of code) |

### 1.6 Scope
**In scope:** public website, user accounts, product catalog, ordering and payment, inventory monitoring, announcements, admin panel, reports, integrations, PWA, push notifications, real-time chat.
**Out of scope:** native mobile apps, multi-branch franchising, accounting and payroll, live courier-API integration (delivery is managed manually by staff).

---

## 2. Requirements List

IDs FR-1 to FR-19 come from the original document and are **unchanged** (only the implementation target changed). FR-20 to FR-23 are the newly requested features.

### 2.1 Functional requirements

| ID | Requirement | Implemented in |
| --- | --- | --- |
| **Module 1: Product Catalog** | | |
| FR-1 | Display products by category with name, photo, price, unit, stock status | `pages/Products.jsx`, `GET /products` |
| FR-2 | Search, filter (category, price, brand) and sort | `GET /products?q&category&brand&minPrice&maxPrice&sort` |
| FR-3 | Admin adds, edits, archives and deletes products | `admin/Products.jsx`, CRUD + soft delete (FR-23) |
| **Module 2: Ordering and Payment** | | |
| FR-4 | Add items to cart, update quantities | `lib/cart.jsx` (localStorage) |
| FR-5 | Choose delivery or pickup; compute delivery fee | `POST /orders`, `lib/fee.js` |
| FR-6 | Pay via PayMongo (GCash, card, GrabPay in sandbox) or record Cash on Delivery | `routes/payments.js`, `lib/paymongo.js` |
| FR-7 | Email confirmation after every order and status change | `lib/mailer.js` |
| FR-8 | Order history and tracking: Pending, Paid, Preparing, Out for Delivery, Completed, Cancelled | `pages/Account.jsx` |
| **Module 3: Inventory** | | |
| FR-9 | Auto-deduct stock when an order is paid or confirmed | SQL function `deduct_stock` |
| FR-10 | Flag products below reorder level and email the admin | `routes/inventory.js`, `lib/mailer.js` |
| FR-11 | Admin and staff record stock-in, adjustments, spoilage/expiry in an inventory log | `routes/inventory.js`, `admin/Inventory.jsx` |
| **Module 4: Announcements** | | |
| FR-12 | Admin publishes announcements (promos, planting tips, advisories) with draft/publish | `admin/Announcements.jsx` |
| FR-13 | Home page shows latest and pinned announcements | `pages/Home.jsx` |
| **Accounts and Security** | | |
| FR-14 | Sign up, log in, log out, reset password by email | `routes/auth.js`, `pages/Auth.jsx` |
| FR-15 | Customers edit profile, contact details, saved delivery addresses | `routes/me.js`, `pages/Account.jsx` |
| FR-16 | Admin views, deactivates and assigns roles to users | `routes/users.js`, `admin/Users.jsx` |
| **Admin Panel and Reports** | | |
| FR-17 | Admin edits website content (home text, banners, About, Contact) without code changes | `site_content` table, `admin/Content.jsx` (replaces the CMS) |
| FR-18 | Sales, inventory, low-stock, top-selling reports by date range, export CSV or PDF | `routes/reports.js`, `admin/Reports.jsx` |
| **Integrations** | | |
| FR-19 | Contact page shows store on Google Maps; checkout lets customers pin delivery location | `components/MapPicker.jsx`, `pages/Contact.jsx` |
| **New features** | | |
| FR-20 | **PWA:** installable; key parts keep working offline with limitations (see 6.1) | `sw.js`, `vite.config.js` |
| FR-21 | **Push notifications** (Web Push) | `routes/push.js`, `lib/push.js`, `sw.js` |
| FR-22 | **Real-time chat** between customers and store staff over WebSocket | `chat.js`, `components/ChatBox.jsx`, `admin/Chat.jsx` |
| FR-23 | **CRUD through the Node API with soft delete / archiving** for all managed records | `lib/crud.js`, `deleted_at` columns |

### 2.2 Non-functional requirements

| Category | Requirement | How it is met |
| --- | --- | --- |
| Performance | Pages load within 3 s on a typical mobile connection; paginated catalog | Vite code splitting, lazy-loaded images, `limit/offset` pagination, service worker caching |
| Security | bcrypt passwords, HTTPS, RBAC, validation and sanitization, SQL injection / XSS / CSRF protection | Supabase Auth (bcrypt), HTTPS hosting, `requireRole` middleware, zod validation, parameterized Supabase queries, React escaping, Bearer-token auth (no auth cookies, so CSRF does not apply) |
| Usability | Mobile-first responsive layout, simple navigation, clear labels | Tailwind mobile-first, plain-language labels |
| Reliability | Daily DB backups, graceful errors, 99% uptime target | Supabase backups (Pro plan) or scheduled `pg_dump`; central error handler; always-on hosting plan |
| Scalability | Modular design for more products, branches, payment methods | One route file per resource, generic CRUD helper |
| Maintainability | Documented code, env vars for secrets, Git | `.env.example` files, `docs/`, monorepo with Git |
| Compatibility | Chrome, Firefox, Edge, Safari; Android and iOS browsers | Vite default browser targets; Web Push caveats in section 10 |

### 2.3 User roles

| Role | Permissions |
| --- | --- |
| **Administrator** | Everything: products, categories, inventory, announcements, site content, users and roles, orders, reports, chat |
| **Staff** | Update stock, process and fulfill orders, answer chat. No user management and no financial reports |
| **Customer** | Register, log in, manage profile and addresses, browse, order, pay, track orders, view announcements, chat, receive push |

### 2.4 Actors and use cases

| Actor | Use cases |
| --- | --- |
| Customer | Register, Log in, Manage Profile, Browse, Search/Filter, Manage Cart, Checkout, Pay Online, Track Order, View Announcements, Chat with store, Enable push |
| Staff | Update Stock, Process Order, Update Order Status, Answer Chat |
| Administrator | All Staff use cases + Manage Products, Manage Site Content, Post Announcements, Manage Users and Roles, Monitor Inventory, Generate Reports |
| PayMongo (external) | Confirm or reject payment via webhook |
| Email server (external) | Deliver notifications |
| Google Maps (external) | Map tiles and coordinates |
| Push service (external) | Deliver Web Push messages |

---

## 3. Architecture

### 3.1 Overview

```
 [ Browser / Installed PWA ]  ── Service Worker (cache, offline, push) ──┐
          │ HTTPS (REST + Bearer JWT)          │ WebSocket (Socket.IO)    │
          ▼                                    ▼                          │
 ┌───────────────────────────────────────────────────────┐               │
 │  Node.js API (Express + Socket.IO)                    │ ──► Web Push ─┘
 │  auth · CRUD · orders · payments · inventory ·        │
 │  reports · chat · push                                │
 └──────┬──────────────┬───────────────┬─────────────────┘
        ▼              ▼               ▼
 [ Supabase ]      [ PayMongo ]    [ SMTP / Gmail ]      Google Maps (called from the browser)
 Postgres, Auth,   intent + webhook
 Storage
```

Three tiers: presentation (React), application (Node API), data (Supabase Postgres). External services are reached only through the Node API, except Google Maps and the PayMongo public-key step, which run in the browser.

### 3.2 Key design decisions (chosen for speed and simplicity)

| Decision | Reason |
| --- | --- |
| **The browser never talks to Supabase directly.** All data goes through the Node API using the service-role key. RLS is enabled on every table with no public policies, so direct access is denied. | One place for security rules and validation. Satisfies "CRUD via Node API". |
| **Auth through Node endpoints that wrap Supabase Auth.** Supabase handles bcrypt, JWTs, refresh tokens and reset emails. The frontend needs no Supabase SDK. | Least code. Allows an explicit login rate limit. |
| **Soft delete via one column, `deleted_at`.** | One pattern for every table, one helper. |
| **Cart lives in the browser (localStorage).** Prices and totals are always recalculated on the server. | Works offline, no cart tables. |
| **Socket.IO runs inside the same Node process.** | One backend to deploy. Also reused for live stock updates. |
| **No ORM, no state-management library, no UI kit.** Supabase client, React Context, Tailwind. | Fewer dependencies, faster build. |
| **Stock deduction is a SQL function.** | Atomic, cannot oversell, runs once per order. |

### 3.3 Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18+, Vite, React Router, Tailwind CSS, `vite-plugin-pwa` (injectManifest), `socket.io-client`, `@react-google-maps/api` |
| Backend | Node.js 20+ (ESM), Express 5, `@supabase/supabase-js`, `socket.io`, `zod`, `helmet`, `cors`, `express-rate-limit`, `multer`, `nodemailer`, `web-push` |
| Database | Supabase (PostgreSQL, Auth, Storage) |
| Integrations | PayMongo sandbox (plain `fetch`, no SDK), Gmail SMTP, Google Maps JS API |
| Hosting | Render (backend web service + frontend static site, HTTPS included), Supabase cloud |

Notes: use `node --env-file=.env --watch` instead of dotenv and nodemon. Generate CSV by hand. No test framework: use the manual QA checklist in section 9.

---

## 4. Repository Structure (Monorepo)

```
agrimart/
│
├── frontend/                      # Members 1 and 3
│   ├── public/                    # icons (192, 512), favicon
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx                # all routes + role guards
│   │   ├── sw.js                  # service worker: cache, offline, push
│   │   ├── lib/                   # api.js, auth.jsx, cart.jsx, socket.js, push.js
│   │   ├── components/            # Navbar, ProductCard, MapPicker, ChatBox, OfflineBanner
│   │   ├── pages/                 # storefront pages (Member 1)
│   │   │   ├── Home.jsx  Products.jsx  ProductDetail.jsx  Cart.jsx  Checkout.jsx
│   │   │   ├── Auth.jsx           # login, signup, forgot, reset (one file, 4 modes)
│   │   │   └── Account.jsx  Announcements.jsx  Contact.jsx
│   │   └── admin/                 # admin panel (Member 3)
│   │       ├── AdminLayout.jsx  Dashboard.jsx  Products.jsx  Orders.jsx  Inventory.jsx
│   │       └── Announcements.jsx  Content.jsx  Users.jsx  Reports.jsx  Chat.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
│
├── backend/                       # Members 2 and 3 (chat.js only)
│   ├── src/
│   │   ├── index.js               # Express + HTTP server + Socket.IO bootstrap
│   │   ├── middleware.js          # auth, requireRole, validate (zod), error handler
│   │   ├── chat.js                # socket handlers (Member 3)
│   │   ├── lib/                   # supabase.js, crud.js, fee.js, mailer.js, paymongo.js, push.js
│   │   └── routes/                # one file per resource
│   │       ├── auth.js  me.js  catalog.js  announcements.js  content.js  uploads.js
│   │       └── orders.js  payments.js  inventory.js  users.js  reports.js  chat.js  push.js
│   ├── .env.example
│   └── package.json
│
├── database/                      # Member 3
│   └── migrations/
│       ├── 001_schema.sql         # tables, indexes, RLS on
│       ├── 002_functions.sql      # deduct_stock, adjust_stock, new-user trigger
│       └── 003_seed.sql           # categories, sample products, site_content defaults
│
├── docs/                          # shared
│   ├── api.md                     # API contract (written in Phase 1, edited by whoever changes an endpoint)
│   └── diagrams/                  # ER, architecture, context, wireframes for submission
│
├── .gitignore
├── package.json                   # root: "dev" script runs frontend + backend with concurrently
├── README.md                      # setup in 5 steps
└── CONTRIBUTING.md                # branch + PR rules (section 8)
```

### 4.1 File ownership (prevents merge conflicts)

| Path | Owner | Others may |
| --- | --- | --- |
| `frontend/src/pages`, `components`, `lib`, `sw.js`, `App.jsx` | Member 1 | Member 3 adds `ChatBox.jsx` and admin routes in `App.jsx` (small PR, announce first) |
| `frontend/src/admin` | Member 3 | Read only |
| `backend/src` (all except `chat.js`) | Member 2 | Member 3 adds `chat.js` and mounts it in `index.js` |
| `database/` | Member 3 | Member 2 requests schema changes via PR |
| `docs/api.md` | Member 2 (writes), all (read) | Anyone who changes an endpoint updates it in the same PR |

---

## 5. Data Design (Supabase)

### 5.1 Relationships

```
auth.users 1—1 profiles
profiles 1—M addresses            profiles 1—M orders
categories 1—M products           orders 1—M order_items    products 1—M order_items
orders 1—1 payments               products 1—M inventory_logs
profiles 1—M announcements (author)
profiles 1—1 conversations        conversations 1—M messages
profiles 1—M push_subscriptions
```

### 5.2 Tables (13, above the minimum of 5)

Conventions: `id uuid` primary keys (default `gen_random_uuid()`), `created_at timestamptz default now()`. **`deleted_at timestamptz` (null = active)** is on every table marked ♻.

| Table | Columns |
| --- | --- |
| **profiles** | id (PK, FK auth.users), full_name, phone, role (`customer`/`staff`/`admin`, default `customer`), is_active (default true) |
| **addresses** ♻ | id, user_id (FK), street, barangay, municipality, province, latitude, longitude, is_default |
| **categories** ♻ | id, name (unique), description |
| **products** ♻ | id, category_id (FK), name, description, brand, unit, price, stock_qty, reorder_level, image_url, is_featured |
| **inventory_logs** | id, product_id (FK), user_id (FK), change_qty, reason (`stock-in`/`sale`/`adjustment`/`spoilage`), created_at |
| **orders** | id, user_id (FK), address_id (FK, nullable), fulfillment_type (`delivery`/`pickup`), delivery_fee, total_amount, status, stock_deducted (bool, default false), created_at |
| **order_items** | id, order_id (FK), product_id (FK), quantity, unit_price, subtotal |
| **payments** | id, order_id (FK, unique), method (`gcash`/`card`/`grab_pay`/`cod`), paymongo_ref, amount, status (`pending`/`paid`/`failed`), paid_at |
| **announcements** ♻ | id, author_id (FK), title, body, is_pinned, published_at (null = draft) |
| **site_content** | key (PK), value (jsonb), updated_at. Keys: `home_hero`, `home_banners`, `about`, `contact`, `store_location` (lat, lng, address, hours), `delivery_rates` (base_fee, per_km) |
| **push_subscriptions** | id, user_id (FK), endpoint (unique), p256dh, auth |
| **conversations** | id, customer_id (FK, unique), last_message_at |
| **messages** | id, conversation_id (FK), sender_id (FK), body, created_at |

Order status values: `pending`, `paid`, `preparing`, `out_for_delivery`, `completed`, `cancelled`. Pickup orders skip `out_for_delivery`.

Indexes (keep to these): `products(category_id)`, `orders(user_id, status)`, `inventory_logs(product_id)`, `messages(conversation_id, created_at)`.

### 5.3 SQL functions and triggers (`002_functions.sql`)

| Name | Behavior |
| --- | --- |
| `handle_new_user()` trigger | On `auth.users` insert, create the `profiles` row with role `customer`, copying name and phone from signup metadata |
| `deduct_stock(order_id)` | If `stock_deducted = false`: decrement each item's `stock_qty`, write `sale` rows to `inventory_logs`, set `stock_deducted = true`. Returns products now at or below `reorder_level`. Rejects if any item would go negative |
| `adjust_stock(product_id, change_qty, reason, user_id)` | Update `stock_qty` and write the log row in one transaction. Returns whether the product is now low |

### 5.4 Soft delete / archiving rules (FR-3, FR-23)

| Action | Endpoint | Effect |
| --- | --- | --- |
| Archive ("delete") | `DELETE /x/:id` | Sets `deleted_at = now()`. Hidden from all public and default admin lists |
| View archived | `GET /x?archived=true` | Admin only |
| Restore | `POST /x/:id/restore` | Sets `deleted_at = null` |
| Permanent delete | `DELETE /x/:id/purge` | Admin only, only on already-archived rows, blocked when order history references the row |

Applies to products, categories, announcements and addresses. Orders are never deleted: they are cancelled. Users are deactivated (`is_active = false`), not deleted. Public queries and the cart/checkout flow must always filter `deleted_at is null`.

---

## 6. Feature Designs

### 6.1 PWA and offline mode (FR-20)

Setup: `vite-plugin-pwa` with `injectManifest` so one `sw.js` handles caching **and** push. Manifest: name, icons 192/512, `display: standalone`, theme color. Show an install button using `beforeinstallprompt`.

| Works offline | Needs a connection |
| --- | --- |
| App shell (all pages open) | Login, signup, password reset |
| Browse catalog pages and product details already visited (cached) | Checkout and payment |
| View and edit the cart (localStorage) | Real-time chat |
| Read announcements, contact info, store map image/address | Admin actions and all other writes |
| View order history last loaded | Fresh stock and price (shown as "last updated" while offline) |

Caching rules in `sw.js`: precache the app shell; **stale-while-revalidate** for `GET /products`, `/categories`, `/announcements`, `/content`; **network-first** for `GET /orders` and `/me`; **never cache** anything else (auth, payments, chat). An `OfflineBanner` appears when `navigator.onLine` is false, and Checkout and Chat disable their actions with a clear message.

### 6.2 Push notifications (FR-21)

Web Push with VAPID keys (`web-push`). Flow: user taps "Enable notifications" → permission → `pushManager.subscribe` using the key from `GET /push/public-key` → `POST /push/subscribe`. `sw.js` handles `push` (show notification) and `notificationclick` (open the right URL). Dead subscriptions (HTTP 404/410) are deleted on send.

| Event | Recipients |
| --- | --- |
| Order status changed | The customer |
| New announcement published | All subscribed customers |
| New order placed or paid | Staff and admins |
| Low stock | Admins |
| New chat message while recipient is not connected | The recipient |

### 6.3 Real-time chat (FR-22)

Socket.IO on the same server. The client connects with the access token in the handshake, and the server verifies it and loads the role. One conversation per customer.

| Item | Detail |
| --- | --- |
| Rooms | Customer joins `conv:<customerId>`. Staff and admins join `staff` |
| Client → server | `message:send { body }` (customer) or `{ conversation_id, body }` (staff) |
| Server → client | `message:new { message }` to the conversation room and the `staff` room. The server saves it to `messages` first, then emits |
| History | `GET /chat/messages?conversation_id` (customers can only read their own). `GET /chat/conversations` for the staff inbox |
| UI | Customer: floating `ChatBox`. Staff: `admin/Chat.jsx` inbox list + thread |

The same socket also broadcasts `stock { product_id, stock_qty }` after every deduction or adjustment so the product pages show live stock.

### 6.4 Checkout and payment flow (FR-5, FR-6, FR-9)

1. Cart (localStorage) → Checkout: choose pickup or delivery. For delivery, select a saved address or pin one with `MapPicker`.
2. `POST /orders { items:[{product_id, qty}], fulfillment_type, address_id, method }`. The server loads real prices, checks stock and `deleted_at`, computes the delivery fee, and inserts `orders`, `order_items` and `payments` (status `pending`).
   - **Delivery fee** (`lib/fee.js`): haversine distance between `store_location` and the pin, `base_fee + per_km × km`, rates read from `site_content.delivery_rates`. Pickup = 0.
3. **Online methods (GCash, card, GrabPay):** the server creates a PayMongo Payment Intent and returns `client_key`. The browser creates the payment method with the PayMongo **public** key, attaches it to the intent with a `return_url`, and follows any redirect. The result page polls `GET /orders/:id` until the status changes.
4. `POST /payments/webhook` (raw body, signature verified with `PAYMONGO_WEBHOOK_SECRET`): on success → payment `paid`, order `paid`, call `deduct_stock`, email, push. On failure → payment `failed`. Handler is idempotent (`stock_deducted` flag).
5. **COD:** order stays `pending`. Stock is deducted when staff moves it to `preparing` (the "confirmed" step). COD payment is marked `paid` when the order is `completed`.
6. After any deduction, if a product is at or below `reorder_level`: email the admin, push to admins, record nothing extra (the low-stock report is computed live).

Verify exact PayMongo request shapes against the current PayMongo API docs during Member 2's Phase 3.

### 6.5 Authentication and sessions (FR-14, Section 4 of the original)

| Endpoint | Behavior |
| --- | --- |
| `POST /auth/register` | Supabase `signUp` (full_name, phone in metadata); `handle_new_user` creates the profile |
| `POST /auth/login` | Supabase `signInWithPassword`; **rate limited** (for example 5 attempts per minute per IP); returns `access_token`, `refresh_token`, profile |
| `POST /auth/refresh` | Exchanges the refresh token |
| `POST /auth/logout` | Revokes the session server-side |
| `POST /auth/forgot-password` | Supabase sends the reset email (configure Supabase custom SMTP with the same Gmail credentials). Link opens `/reset` on the frontend |
| `POST /auth/reset-password` | Verifies the recovery token, sets the new password |

`middleware.js` → `auth`: reads the Bearer token, verifies it with Supabase, loads the profile, and rejects when `is_active = false`. `requireRole('admin')` / `requireRole('admin','staff')` guards routes. The frontend `api.js` attaches the token, refreshes once on 401, then logs out. An **idle timer** (30 minutes) logs the user out automatically, which meets the "automatic timeout after inactivity" requirement.

### 6.6 Reports (FR-18)

`GET /reports/:type?from&to&format=csv|json`, type ∈ `sales`, `inventory`, `low-stock`, `top-products`. Admin only. CSV is returned as a download. **PDF export** is the report page's print view (`window.print()` with a print stylesheet, "Save as PDF"), so no PDF library is needed. `GET /reports/summary` feeds the dashboard (sales totals for admin; low stock and recent orders for staff).

### 6.7 Admin panel (FR-17, replaces CMS)

Route group `/admin/*`, guarded by role in `App.jsx`. Staff sees Orders, Inventory, Chat and Dashboard (without sales). Admin sees everything. Every list page has the same three controls: **Active / Archived** tab, **Archive** (soft delete) and **Restore**. Website text and banners are edited in `admin/Content.jsx`, which reads and writes `site_content` keys; the storefront loads them through `GET /content`. Images go through `POST /uploads` (multer → Supabase Storage bucket `public-images`, returns the URL).

---

## 7. API Contract (`docs/api.md` starts from this)

All routes are prefixed `/api`. Auth column: **P** public · **C** customer · **S** staff or admin · **A** admin.

| Method and path | Auth | Purpose |
| --- | --- | --- |
| `GET /health` | P | Health check |
| `POST /auth/register` `login` `refresh` `logout` `forgot-password` `reset-password` | P | See 6.5 |
| `GET` `PATCH /me` | C | Own profile |
| `GET` `POST /me/addresses` · `PATCH` `DELETE /me/addresses/:id` | C | Saved addresses (DELETE = archive) |
| `GET /products` · `GET /products/:id` | P | Catalog with filters (excludes archived) |
| `GET /categories` | P | Category list |
| `POST /products` · `PATCH /products/:id` · `DELETE /products/:id` · `POST /products/:id/restore` · `DELETE /products/:id/purge` · `GET /products?archived=true` | A | Product CRUD + soft delete. Same pattern for `categories` and `announcements` |
| `GET /announcements` | P | Published, pinned first |
| `GET /content` | P | All site content keys |
| `PUT /content/:key` | A | Update one content key |
| `POST /uploads` | A | Image upload, returns URL |
| `POST /orders` | C | Create order (+ payment intent for online methods) |
| `GET /orders` · `GET /orders/:id` | C, S | Customers see their own. Staff and admin see all with `?status&from&to` |
| `POST /orders/:id/cancel` | C | Only while `pending` |
| `PATCH /orders/:id/status` | S | Change status (sends email + push, triggers deduction for COD) |
| `POST /payments/webhook` | PayMongo | Signature verified |
| `GET /inventory/logs` · `GET /inventory/low-stock` | S | Log and low-stock list |
| `POST /inventory/adjust` | S | Stock-in, adjustment, spoilage |
| `GET /users` · `PATCH /users/:id` | A | List, change role, activate or deactivate |
| `GET /reports/summary` | S | Dashboard numbers |
| `GET /reports/:type` | A | See 6.6 |
| `GET /chat/conversations` | S | Staff inbox |
| `GET /chat/messages` | C, S | Thread history |
| `GET /push/public-key` · `POST /push/subscribe` · `POST /push/unsubscribe` | C, S | Push subscription |

Error format: `{ "error": "message", "details": [...] }` with correct HTTP status. List endpoints return `{ data, page, total }`.

### 7.1 Frontend routes (wireframe plan)

| Path | Page | Key elements |
| --- | --- | --- |
| `/` | Home | Hero from site content, featured categories and products, latest and pinned announcements, store info |
| `/products` | Products | Search bar, category/brand/price filters, sort, grid, pagination, Add to Cart |
| `/products/:id` | Product Detail | Photo, description, price, stock status, quantity, Add to Cart |
| `/cart` · `/checkout` | Cart, Checkout | Items, pickup/delivery, address + map pin, fee, order summary, Pay Now |
| `/login` `/signup` `/forgot` `/reset` | Auth | Forms with validation messages, Forgot Password link |
| `/account` | My Account | Profile, addresses, order history with status tracker, notification toggle |
| `/announcements` | Announcements | Card list |
| `/contact` | Contact / Store Locator | Google Map, address, hours |
| `/admin/*` | Admin | Dashboard, Products, Orders, Inventory, Announcements, Content, Users, Reports, Chat |

---

## 8. Team Workflow

### 8.1 Roles

| Member | Responsibility |
| --- | --- |
| **Member 1: Storefront and PWA** | `frontend/src` (except `admin`): customer pages, cart, checkout UI, service worker, offline mode, push subscription |
| **Member 2: Backend** | `backend/src`: auth, CRUD, orders, payments, inventory, email, push sending, reports, deployment of the API |
| **Member 3: Database, Admin and Chat** | `database/`, `frontend/src/admin`, `backend/src/chat.js` + `ChatBox`, docs, QA, frontend deployment |

### 8.2 Git rules (put in `CONTRIBUTING.md`)

- `main` is always working. Nobody commits to `main` directly.
- Branch names: `m1/<task>`, `m2/<task>`, `m3/<task>` (example: `m2/orders-api`).
- Start each day with `git pull origin main`, then `git rebase main` (or merge) on your branch.
- Small PRs (one checklist group at a time), one review from a teammate, then merge.
- Commit messages: `feat:`, `fix:`, `docs:`, `chore:`.
- Never commit `.env`. Update `.env.example` when you add a variable.
- If you change an API shape, update `docs/api.md` in the same PR and tell the frontend owner.

### 8.3 Environment variables

| File | Variables |
| --- | --- |
| `backend/.env` | `PORT`, `FRONTEND_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `SMTP_USER`, `SMTP_PASS` (Gmail app password), `ADMIN_EMAIL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` |
| `frontend/.env` | `VITE_API_URL`, `VITE_PAYMONGO_PUBLIC_KEY`, `VITE_GOOGLE_MAPS_KEY` |

---

## 9. Development Phases and Checklists

The five phases are aligned across members, and each ends with a **sync gate** (a quick check that the three parts work together before anyone starts the next phase).

| Phase | Theme | Sync gate |
| --- | --- | --- |
| 1 | Foundation | DB is live, API contract agreed, both apps run locally and `/health` responds |
| 2 | Catalog and accounts | A user can sign up, log in, and browse real products; admin can manage products |
| 3 | Ordering | A customer can place a COD order and an online sandbox payment; stock deducts |
| 4 | Operations | Inventory, reports, users, announcements, profile and chat work end to end |
| 5 | PWA, push, hardening, deploy | Installable offline-capable app deployed over HTTPS with push working |

### Member 1: Storefront and PWA (`frontend/`)

**Phase 1: Foundation**
- [ ] Scaffold Vite + React, add Tailwind, React Router, `.env.example`
- [ ] `lib/api.js`: fetch wrapper (base URL, Bearer token, one refresh on 401, error handling)
- [ ] `lib/auth.jsx`: AuthContext (login, logout, profile, role), token in localStorage, 30-minute idle logout
- [ ] `App.jsx` route skeleton, `Navbar`, mobile-first layout, role guard component
- [ ] Mock-free: wait for `docs/api.md`, code against it

**Phase 2: Catalog and Auth**
- [ ] `Auth.jsx`: login, signup, forgot, reset with validation messages (FR-14)
- [ ] `Products.jsx`: search, category/brand/price filters, sort, pagination (FR-1, FR-2)
- [ ] `ProductDetail.jsx` and `ProductCard` with stock status badge
- [ ] `Home.jsx`: hero and banners from `/content`, featured products, latest + pinned announcements (FR-13)
- [ ] `Announcements.jsx`

**Phase 3: Cart and Checkout**
- [ ] `lib/cart.jsx`: add, update quantity, remove, persist in localStorage (FR-4)
- [ ] `Cart.jsx` with live totals
- [ ] `Checkout.jsx`: pickup/delivery, address select or add, `MapPicker` pin, fee display (FR-5, FR-19)
- [ ] Payment methods: GCash, card, GrabPay via PayMongo public key + redirect, and COD (FR-6)
- [ ] Order result view that polls order status after payment return

**Phase 4: Account, Contact, Live stock**
- [ ] `Account.jsx`: profile edit, saved addresses (add, edit, archive) (FR-15)
- [ ] Order history with status tracker and cancel-while-pending (FR-8)
- [ ] `Contact.jsx`: Google Map with store pin, address, hours (FR-19)
- [ ] `lib/socket.js`: connect with token, listen to `stock`, update product pages live
- [ ] Mount `ChatBox` (from Member 3) in the layout for logged-in customers

**Phase 5: PWA and polish**
- [ ] `vite.config.js` with `vite-plugin-pwa` (injectManifest), manifest, icons, install button (FR-20)
- [ ] `sw.js`: precache shell, stale-while-revalidate for catalog/announcements/content, network-first for orders/me, `push` and `notificationclick` handlers (FR-20, FR-21)
- [ ] `OfflineBanner`, disable checkout/chat when offline, "last updated" label on cached stock
- [ ] `lib/push.js` and the notification toggle in Account (FR-21)
- [ ] Offline test (DevTools offline), Lighthouse PWA check, responsive pass, browser check on Chrome, Firefox, Edge, Safari, Android, iOS

### Member 2: Backend (`backend/`)

**Phase 1: Foundation and Auth**
- [ ] Init Express 5 (ESM), `index.js` with HTTP server (Socket.IO attached later), `GET /health`
- [ ] `lib/supabase.js` (service-role client), `.env.example`
- [ ] `middleware.js`: `auth`, `requireRole`, zod `validate`, central error handler, `helmet`, CORS allowlist (`FRONTEND_URL`), global rate limit
- [ ] `routes/auth.js`: register, login (strict rate limit), refresh, logout, forgot, reset (FR-14)
- [ ] `routes/me.js`: profile and addresses with soft delete (FR-15)
- [ ] Write `docs/api.md` from section 7 and share with Member 1 and 3 early

**Phase 2: CRUD and Catalog**
- [ ] `lib/crud.js`: generic list / get / create / update / archive / restore / purge with `deleted_at` handling (FR-23)
- [ ] `routes/catalog.js`: products and categories on top of `crud.js`, with search, filters, sort, pagination (FR-1, FR-2, FR-3)
- [ ] `routes/announcements.js` with draft/publish via `published_at` (FR-12)
- [ ] `routes/content.js` (read all, admin update key) (FR-17)
- [ ] `routes/uploads.js` (multer to Supabase Storage)

**Phase 3: Orders and Payments**
- [ ] `lib/fee.js`: haversine delivery fee from `site_content` (FR-5)
- [ ] `routes/orders.js`: create (server-side prices, stock and archived checks), list, get, cancel, status update (FR-8)
- [ ] `lib/paymongo.js`: create payment intent via `fetch` (FR-6)
- [ ] `routes/payments.js`: webhook with signature verification and idempotency, then `deduct_stock` (FR-9)
- [ ] COD rule: deduct on `preparing`, mark paid on `completed`
- [ ] `lib/mailer.js`: Nodemailer + Gmail SMTP, order confirmation and status-change emails (FR-7)

**Phase 4: Inventory, Users, Reports**
- [ ] `routes/inventory.js`: logs, low-stock list, adjust (stock-in, adjustment, spoilage) (FR-11)
- [ ] Low-stock admin email after any deduction or adjustment (FR-10)
- [ ] `routes/users.js`: list, change role, activate/deactivate (FR-16)
- [ ] `routes/reports.js`: summary, sales, inventory, low-stock, top-products, CSV output (FR-18)
- [ ] Role checks reviewed: staff cannot reach users or financial reports

**Phase 5: Push, Realtime hooks, Hardening, Deploy**
- [ ] `lib/push.js` (VAPID, send, prune 404/410) and `routes/push.js` (public key, subscribe, unsubscribe) (FR-21)
- [ ] Hook push events: order status, new announcement, new order, low stock
- [ ] Emit `stock` socket event after deduction and adjustment
- [ ] Security pass: zod on every body/query, no raw SQL strings, no secrets in code, CORS and rate limits verified
- [ ] Deploy to Render, set env vars, register the PayMongo webhook URL, confirm HTTPS and WebSocket work

### Member 3: Database, Admin Panel, Chat

**Phase 1: Database (do this first, others depend on it)**
- [ ] Create Supabase project, storage bucket `public-images`
- [ ] `001_schema.sql`: all 13 tables, foreign keys, `deleted_at` columns, indexes, **RLS enabled on every table**
- [ ] `002_functions.sql`: `handle_new_user` trigger, `deduct_stock`, `adjust_stock`
- [ ] `003_seed.sql`: categories, ~10 sample products, default `site_content` keys, steps to promote the first admin
- [ ] Set up Supabase custom SMTP (Gmail) for reset emails
- [ ] ER diagram in `docs/diagrams/`, and a short "run the migrations" section in `README.md`

**Phase 2: Admin shell and catalog management**
- [ ] `AdminLayout.jsx` with role-aware navigation (admin vs staff) and route guards
- [ ] `Dashboard.jsx`: sales summary (admin), low-stock list, recent orders
- [ ] `admin/Products.jsx`: create, edit, image upload, Active/Archived tabs, archive, restore, purge (FR-3, FR-23)
- [ ] Category management on the same page

**Phase 3: Operations pages**
- [ ] `admin/Orders.jsx`: filter by status, change status, order detail (FR-8)
- [ ] `admin/Inventory.jsx`: stock-in, adjustment, spoilage form, log table, low-stock highlight (FR-11)
- [ ] `admin/Announcements.jsx`: draft/publish, pin, archive/restore (FR-12)
- [ ] `admin/Content.jsx`: edit hero text, banners, About, Contact, store location, delivery rates (FR-17)
- [ ] `admin/Users.jsx`: change role, deactivate/activate (FR-16)

**Phase 4: Reports and Chat**
- [ ] `admin/Reports.jsx`: date range, four report types, CSV download, print-to-PDF stylesheet (FR-18)
- [ ] `backend/src/chat.js`: token handshake auth, rooms, save then emit `message:new` (FR-22)
- [ ] `routes/chat.js`: conversations and history
- [ ] `components/ChatBox.jsx` (customer widget) and `admin/Chat.jsx` (inbox + thread)
- [ ] Push to the recipient when they are not connected (uses Member 2's `lib/push.js`)

**Phase 5: QA, Docs, Deploy**
- [ ] Run the manual QA checklist (below) end to end on the deployed app
- [ ] Deploy frontend to Render static site, set `VITE_*` variables, confirm API CORS
- [ ] Export submission docs to `docs/diagrams/`: use case, context diagram, architecture, ER, wireframes (from section 7.1)
- [ ] Finish `README.md` and `CONTRIBUTING.md`, record the demo accounts (admin, staff, customer)
- [ ] Verify the Requirements Traceability in section 11

**Manual QA checklist**
- [ ] Sign up, log in, reset password by email, log out, idle timeout logs out
- [ ] Browse, search, filter, sort; archived products never appear to customers
- [ ] COD order → staff sets `preparing` → stock deducted once → email received
- [ ] GCash / card / GrabPay sandbox payment → webhook → order `paid` → stock deducted once
- [ ] Order for more than available stock is rejected
- [ ] Low-stock email and push reach the admin
- [ ] Staff cannot open Users or Reports (UI and API both return 403)
- [ ] Archive, restore and purge work; purge is blocked when order history exists
- [ ] Offline: app opens, cached catalog browsable, cart editable, checkout shows offline message
- [ ] Install as PWA on Android and desktop; push arrives with the app closed
- [ ] Chat message appears live on both sides; push arrives when the other side is disconnected
- [ ] Wrong login 6 times in a minute triggers the rate limit

---

## 10. Notes and Known Limits

- **Web Push on iOS** works only for a PWA that has been added to the Home Screen (iOS 16.4+). Tell testers to install first.
- **Push, service workers and the PayMongo webhook** require HTTPS. Use the deployed Render URL (or an HTTPS tunnel) for testing these.
- **Render free web services sleep** when idle, which delays WebSocket connections and webhooks. Use a paid instance (or an uptime pinger) for the demo and to approach the 99% target.
- **Supabase backups:** daily backups need the paid plan. On the free plan, schedule a `pg_dump` instead. Free projects can also pause after long inactivity.
- **PayMongo** stays in sandbox mode. Webhook delivery to a local machine needs a tunnel.
- **Delivery** is handled manually by staff (no courier API), as in the original scope.

---

## 11. Requirements Traceability (checklist against the project guidelines)

| Guideline requirement | Covered by |
| --- | --- |
| Business proposal (problem, users, value, revenue) | Section 1 |
| Public website with home, registration, login, profile | FR-13 to FR-15, section 7.1 |
| At least 3 major modules | 4 modules: Catalog, Ordering and Payment, Inventory, Announcements |
| Admin panel (previously CMS-based) | Custom admin panel, section 6.7 and `frontend/src/admin` |
| System integration | PayMongo, SMTP/Gmail, Google Maps (plus Web Push) |
| Database with 5+ tables and ER diagram | 13 tables, section 5 |
| Security requirements | Section 2.2 and 6.5 |
| At least 2 user roles | Administrator, Staff, Customer |
| SRS and system design documents | Sections 2, 3, 5, 7 and `docs/diagrams/` |
| PWA with limited offline mode | FR-20, section 6.1 |
| Push notifications | FR-21, section 6.2 |
| Real-time chat via WebSocket | FR-22, section 6.3 |
| CRUD via Node API with soft delete / archiving | FR-23, sections 5.4 and 7 |
