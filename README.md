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

3. **Create the database** (Member 3, Phase 1): Supabase project + storage bucket `public-images`, then the migrations in `database/migrations/` (`001_schema.sql`, `002_functions.sql`, `003_seed.sql`). The folder is reserved but empty in the scaffold.

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
database/     migrations/ (ARC: Member 3 Phase 1)
docs/         blueprint, design tokens, member plans, api.md, diagrams/
```

## Conventions

- Tokens are the only source of visual values. No raw hex, px or ms in components.
- All data goes through the Node API. The browser never holds a Supabase key.
- Every endpoint, request shape and error shape is in [`docs/api.md`](docs/api.md).
- Branch, PR and Definition of Done rules are in [`CONTRIBUTING.md`](CONTRIBUTING.md).
