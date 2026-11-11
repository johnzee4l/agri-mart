# Member 2: Backend. Progress Plan

| Field | Value |
| --- | --- |
| Owner | Member 2 |
| Owns | `backend/src/` except `chat.js`. Also writes `docs/api.md`. |
| Reads | `blueprint.md` sections 5, 6.2 to 6.6, 7, 8, 10 (Member 2 checklist) |
| Gates you sign | 1, 2, 3, 4, 5 |
| Overview | `progress-00-overview.md` |

---

## 1. Phase Progress

Progress % = Done ÷ Tasks × 100. Update Done and Status after each merge.

| Phase | Theme | Tasks | Done | % | Status | Target | Gate signed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Foundation and auth | 8 | | | Not started | | |
| 2 | CRUD and catalog | 6 | | | Not started | | |
| 3 | Orders and payments | 8 | | | Not started | | |
| 4 | Inventory, users, reports, push library | 7 | | | Not started | | |
| 5 | Push events, hardening, deploy | 6 | | | Not started | | |

---

## 2. Waiting On (Dependencies)

- [ ] **D1**: Schema, `handle_new_user` trigger, `deduct_stock` and `adjust_stock` functions (M3 P1). Needed for auth, `me`, orders, and inventory.

## 3. Others Waiting on Me

- [ ] **D2**: `docs/api.md` merged and announced. Needed by M1 P1 and M3 P2. **Gate 1.**
- [ ] **D4**: Catalog, content, announcements, and uploads routes. Needed by M1 P2 and M3 P2. **Gate 2.**
- [ ] **D5**: Orders, PayMongo, and webhook. Needed by M1 P3 and M3 P3. **Gate 3.**
- [ ] **D6**: `stock` socket event (after deduction and adjustment). Needed by M1 P4.
- [ ] **D7**: `lib/push.js` and `routes/push.js`. Needed by M3 P4 for chat push and by low-stock push.
- [ ] **D9**: Inventory, users, reports, and `GET /reports/summary`. Needed by M3 P3 and P4.
- [ ] **D10**: Push subscription routes. Needed by M1 P5.
- [ ] **D11**: Render HTTPS deployment with WebSocket. Needed by M1 and M3 for Phase 5 tests.
- [ ] **D12**: Socket.IO attach point in `index.js`. Needed by M3 P4 for `chat.js`.

---

## 4. Phase 1: Foundation and Auth (Gate 1)

- [ ] `[BP]` Initialize Express 5 with ESM. `index.js` creates the HTTP server and leaves a Socket.IO attach point for Member 3's `chat.js` (D12). Add `GET /health`.
- [ ] `[BP]` `lib/supabase.js`: service-role client. Create `.env.example`.
- [ ] `[BP]` `middleware.js`: `auth`, `requireRole`, zod `validate`, central error handler, `helmet`, CORS allowlist (`FRONTEND_URL`), global rate limit.
- [ ] `[BP]` `routes/auth.js`: register, login (strict rate limit), refresh, logout, forgot, and reset (FR-14). Blocked by D1 for the profile trigger.
- [ ] `[BP]` `routes/me.js`: profile and addresses with soft delete (FR-15).
- [ ] `[BP]` Write `docs/api.md` from blueprint section 7. Share it with M1 and M3 before Gate 1 (D2).
- [ ] `[BP]` Use `node --env-file=.env --watch` for dev. Do not add dotenv or nodemon.
- [ ] `[ADD]` In `docs/api.md`, confirm the standard error format `{ error, details }` and the list format `{ data, page, total }`.

---

## 5. Phase 2: CRUD and Catalog (Gate 2)

- [ ] `[BP]` `lib/crud.js`: generic list, get, create, update, archive, restore, and purge, all using `deleted_at` (FR-23).
- [ ] `[BP]` `routes/catalog.js`: products and categories built on `crud.js`, with search, filters, sort, and pagination (FR-1, FR-2, FR-3).
- [ ] `[BP]` `routes/announcements.js`: draft and publish through `published_at` (FR-12).
- [ ] `[BP]` `routes/content.js`: read all keys (public), update one key (admin) (FR-17).
- [ ] `[BP]` `routes/uploads.js`: multer to Supabase Storage bucket `public-images`. Returns the public URL.
- [ ] `[BP]` Public queries exclude archived rows. Purge is blocked when order history references the row (blueprint 5.4).

---

## 6. Phase 3: Orders and Payments (Gate 3)

- [ ] `[BP]` `lib/fee.js`: haversine distance, `base_fee + per_km × km` from `site_content.delivery_rates`. Pickup is 0 (FR-5).
- [ ] `[BP]` `routes/orders.js`: create with server-side prices, stock check, and archived-item check. Also list, get, cancel (pending only), and status update (FR-8). Reject quantities above stock.
- [ ] `[BP]` `lib/paymongo.js`: create Payment Intent via `fetch`. Verify request shapes against the current PayMongo API docs (FR-6).
- [ ] `[BP]` `routes/payments.js`: webhook with raw body and signature verification (`PAYMONGO_WEBHOOK_SECRET`). Idempotent. On success call `deduct_stock` (FR-9). Blocked by D1.
- [ ] `[BP]` COD rule: stock deducts when status moves to `preparing`. COD payment marks `paid` when status is `completed`.
- [ ] `[BP]` `lib/mailer.js`: Nodemailer with Gmail SMTP. Send order confirmation and status-change emails (FR-7).
- [ ] `[MOVE]` Emit the `stock` socket event after every deduction and adjustment (C2). Originally in Phase 5. Needed by M1 P4 (D6).
- [ ] `[ADD]` Set up a tunnel for local PayMongo webhook testing (blueprint section 10).

---

## 7. Phase 4: Inventory, Users, Reports, Push Library (Gate 4)

- [ ] `[BP]` `routes/inventory.js`: logs, low-stock list, and adjust for stock-in, adjustment, and spoilage (FR-11). If C5 is agreed, this moves to Phase 3.
- [ ] `[BP]` Low-stock email to the admin after any deduction or adjustment (FR-10).
- [ ] `[BP]` `routes/users.js`: list, change role, and activate or deactivate (FR-16). The auth middleware rejects deactivated users. If C5 is agreed, this moves to Phase 3.
- [ ] `[BP]` `routes/reports.js`: summary, sales, inventory, low-stock, and top-products reports, with CSV output (FR-18). Admin only for reports other than summary.
- [ ] `[BP]` Review role checks. Staff cannot reach users or financial reports (403).
- [ ] `[MOVE]` `lib/push.js` (VAPID send, delete subscriptions that return 404 or 410) and `routes/push.js` (public key, subscribe, unsubscribe). Moved from Phase 5 by C1, so Member 3's chat push works (D7).
- [ ] `[ADD]` `GET /reports/summary` returns sales totals for admin and low-stock and recent orders for staff. Member 3 uses it for the Dashboard sales card (C3, D9).

---

## 8. Phase 5: Push Events, Hardening, Deploy (Gate 5)

- [ ] `[BP]` Hook push events for order status changed (customer), new announcement (all subscribed customers), new order placed or paid (staff and admins), and low stock (admins). Use `lib/push.js` (FR-21). Chat push is called by Member 3 from `chat.js`.
- [ ] `[BP]` Security pass: zod validation on every body and query, no raw SQL strings, no secrets in code, CORS and rate limits verified.
- [ ] `[BP]` Deploy to Render. Set environment variables. Register the PayMongo webhook URL. Confirm HTTPS and WebSocket (D11).
- [ ] `[ADD]` Use a paid Render instance or an uptime pinger for the demo and for the 99% target (blueprint section 10).
- [ ] `[ADD]` If on Supabase free plan, schedule `pg_dump` backups (blueprint section 10).
- [ ] `[ADD]` Confirm push works on the HTTPS deployment. Note the iOS requirement: the PWA must be added to the Home Screen first (iOS 16.4+).

---

## 9. Daily Checklist

- [ ] `git pull origin main`, then rebase my `m2/<task>` branch on `main`.
- [ ] Every endpoint change updates `docs/api.md` in the same PR. Tell M1 and M3 when each route merges.
- [ ] Run the Definition of Done in overview section 6.3 before opening a PR.
- [ ] Log any blocker in overview section 7 the same day.
- [ ] Tick a box only after the PR is merged.
