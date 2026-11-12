# AgriMart

Agricultural supply store web application. React (Vite) storefront + Node.js (Express 5) API + Supabase (Postgres, Auth, Storage).

Source of truth for scope, requirements and design: [`docs/blueprint.md`](docs/blueprint.md), [`docs/designtokens.md`](docs/designtokens.md) and the three member plans in `docs/`.

## Status

**Phase 1 (Foundation) scaffold only.** The monorepo structure, token layer, API client, auth context, route skeleton and backend shell exist. Feature work (catalog, orders, payments, inventory, reports, chat, PWA, push) is intentionally not implemented; every planned endpoint answers `501` until its phase lands.

## Setup in 5 steps

1. **Install**

   ```bash
   npm run install:all
   ```

2. **Create the environment files**

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

   Fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env`. The app runs without them; only endpoints that touch the database need them.

3. **Create the database** (Member 3, Phase 1)

   1. Create a Supabase project and a **public** storage bucket named `public-images`.
      Admin uploads write there and the storefront reads the public URL.
   2. Apply the migrations in `database/migrations/` **in order**: `001_schema.sql`
      (tables, indexes, RLS), `002_functions.sql` (trigger and stock functions),
      `003_seed.sql` (categories, ten sample products, site content). Either paste each
      file into the project's SQL editor, or use `psql` with the direct connection string:

      ```bash
      psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f database/migrations/001_schema.sql
      psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f database/migrations/002_functions.sql
      psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f database/migrations/003_seed.sql
      ```

      All three are safe to re-run. `docs/diagrams/er-diagram.md` shows what they create.
   3. Promote the first admin: signup only ever creates a customer, so the first one is
      promoted in the database, with the statement at the bottom of `003_seed.sql`:

      ```sql
      update public.profiles set role = 'admin'
       where id = (select id from auth.users where email = 'owner@example.com');
      ```
   4. Point Supabase Auth at the app (URL configuration and custom SMTP for password
      reset) and set `FRONTEND_URL` on the API. `docs/deploy.md` has the full checklist.

   Prefer to work locally? `npm test --prefix backend` starts the same migrations in
   Docker. To check Row Level Security either way:

   ```bash
   node database/tests/rls.test.mjs
   ```

   For local uploads, keep the `storage` container running (`supabase start`; add
   `-x studio -x mailpit` to leave the extras out) and create the bucket the upload
   route expects from the declaration in `supabase/config.toml`:

   ```bash
   supabase seed buckets
   ```

4. **Run both apps**

   ```bash
   npm run dev
   ```

   API on `http://localhost:4000` (`GET /api/health`), storefront on `http://localhost:5173`.

5. **Confirm the wiring**: the storefront navbar shows `API online` when `/api/health` answers.

## Structure

```
frontend/     Vite + React. src/pages (storefront), src/admin (admin panel),
              src/components/ui (only import point for UI primitives),
              src/styles (token layer), src/lib (api, auth, cn)
backend/      Express 5 + Socket.IO. src/routes is one file per resource,
              src/lib holds supabase.js, src/chat.js is the socket attach point
database/     migrations/ (schema, functions, seed) and tests/ (RLS verification)
docs/         blueprint, design tokens, member plans, api.md, diagrams/
```

## Conventions

- Tokens are the only source of visual values. No raw hex, px or ms in components.
- All data goes through the Node API. The browser never holds a Supabase key.
- Every endpoint, request shape and error shape is in [`docs/api.md`](docs/api.md).
- Branch, PR and Definition of Done rules are in [`CONTRIBUTING.md`](CONTRIBUTING.md).
