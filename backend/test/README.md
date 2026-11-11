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

Prerequisites: Docker running and the Supabase CLI installed. The first run is slow;
later runs reuse the running stack. To use a hosted project instead, export
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY`; the local stack is
then left alone, and the migrations must already be applied there.

`database/migrations/` is Member 3's area: these three files cover the full blueprint
5.2 schema, its functions and the default content, and should be extended rather than
duplicated.
