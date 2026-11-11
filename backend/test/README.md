# Backend tests

`orders-webhook.test.mjs` drives the real API against a real database: real Postgres
rows, real GoTrue tokens, real PostgREST queries, real Express routes and a real
PayMongo HMAC signature. Only PayMongo's HTTP API is stubbed, because the test has no
sandbox key.

```bash
npm test            # from backend/
```

What it does:

1. Starts the local Supabase stack with `supabase start` and applies
   `database/migrations/*.sql` through `psql` inside the database container.
2. Creates a throwaway customer through GoTrue, signs in, and seeds two products and
   one pinned address with the service role.
3. Creates a delivery order paying by GCash, then checks the response, the stored
   `payments` row, the intent request (centavos, `capture_type`, Basic auth) and
   `GET /orders/:id`.
4. Delivers a signed `payment.paid` webhook and checks the order, the payment, the
   stock deduction, the `sale` log row and the `stock` socket broadcast.
5. Sends the same delivery again (must not deduct twice), a forged signature (401),
   an over-stock order (400 with a field path, no intent call) and a free pickup order.
6. Walks the COD order as staff: `preparing` deducts stock once and stays unpaid,
   `out_for_delivery` is refused for pickup, `completed` marks the payment paid, and a
   backwards move is 409. Customers get 403 on status changes, and staff list every
   order while a customer sees only their own. Another account's order is 404.
7. Deletes everything it created, including the auth users.

`inventory.test.mjs` covers Phase 4: staff-only access, the live low-stock list, stock-in
and spoilage adjustments, the log filters, refused adjustments (zero, wrong sign, below
zero, archived product), the `stock` broadcast, and the low-stock email after both an
adjustment and a COD deduction. Mail is delivered to a tiny SMTP sink started by the
test, so the send is exercised for real; no external mailbox or credentials are needed.

`admin.test.mjs` covers the rest of Phase 4: admin-only user listing, role changes and
deactivation (including the 403 that follows), self-lockout protection, the dashboard
summary (no sales for staff, totals for admin), all four reports with their SQL
totals, CSV download headers, bad input, and push subscription storage, re-subscribe
and owner-scoped unsubscribe. Push sending needs a real push service, so it is not
sent here.

`security.test.mjs` covers the Phase 5 hardening pass: helmet headers and no
`x-powered-by`, CORS allowing the `FRONTEND_URL` origin and refusing a foreign one,
`401` on every protected route without a token, `403` for staff on admin-only routes,
`400` with a field path for malformed bodies and queries (including unparseable JSON and
a body over 1 MB), and both rate limiters — the strict login one after five wrong
passwords, and the global one after 300 requests in a minute. The "no raw SQL, no secrets
in code" half of the pass is a source audit, written up in `docs/api.md`.

`push-events.test.mjs` covers Phase 5 push events (FR-21): a new order pushes to staff
and admins only, an order status change pushes to that customer, a paid order pushes to
staff and admins, low stock pushes to admins only, and an announcement pushes to
subscribed customers when it becomes live — once, never for a draft and never again on
a later edit. Subscriptions are stored through the real route and recipients are
resolved from `profiles` and `push_subscriptions`, but `setPushTransport` replaces the
network send with a recorder, because a local run cannot reach a push service.

```bash
npm test            # runs all three files in order
```

Prerequisites: Docker running and the Supabase CLI installed. The first run is slow;
later runs reuse the running stack. To use a hosted project instead, export
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY`; the local stack is
then left alone, and the migrations must already be applied there.

`database/migrations/` is Member 3's area: these three files cover the full blueprint
5.2 schema, its functions and the default content, and should be extended rather than
duplicated.
