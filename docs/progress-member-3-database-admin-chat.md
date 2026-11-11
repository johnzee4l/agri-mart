# Member 3: Database, Admin Panel, Chat. Progress Plan

| Field | Value |
| --- | --- |
| Owner | Member 3 |
| Owns | `database/`, `frontend/src/admin/`, `backend/src/chat.js`, `routes/chat.js`, `components/ChatBox.jsx`, `docs/`, `README.md`, `CONTRIBUTING.md`, QA |
| Reads | `blueprint.md` sections 5, 6.3, 6.6, 6.7, 8, 9, 11 (Member 3 checklist and QA) and `designtokens.md` |
| Gates you sign | 1, 2, 3, 4, 5 |
| Overview | `progress-00-overview.md` |

**You unblock the team.** Phase 1 schema and RLS are the first thing Members 1 and 2 depend on. Post in the team channel as soon as migrations are live.

---

## 1. Phase Progress

Progress % = Done ÷ Tasks × 100. Update Done and Status after each merge.

| Phase | Theme | Tasks | Done | % | Status | Target | Gate signed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Database (first priority) | 9 | | | Not started | | |
| 2 | Admin shell and catalog management | 5 | | | Not started | | |
| 3 | Operations pages | 6 | | | Not started | | |
| 4 | Reports and chat | 6 | | | Not started | | |
| 5 | QA, docs, deploy | 5 | | | Not started | | |

---

## 2. Waiting On (Dependencies)

- [ ] **D2**: `docs/api.md` (M2 P1). Needed before admin API calls.
- [ ] **D3**: Token layer and `components/ui` wrappers (M1 P1). Needed before admin screens.
- [ ] **D4**: Catalog, content, announcements, and uploads routes (M2 P2). Needed for Phase 2 and Phase 3 admin pages.
- [ ] **D5**: Orders, PayMongo, and webhook (M2 P3). Needed for the Orders page.
- [ ] **D9**: Inventory, users, reports, and `GET /reports/summary` (M2 P4, or P3 if C5 agreed). Needed for Inventory, Users, Reports, and the dashboard sales card.
- [ ] **D7**: `lib/push.js` (M2 P4 if C1 agreed). Needed for chat push to disconnected recipients.
- [ ] **D12**: Socket.IO attach point (M2 P1). Needed for `chat.js`.

## 3. Others Waiting on Me

- [ ] **D1**: Schema, RLS, trigger, functions, and seed content (Phase 1). Needed by M1 and M2 at Gate 1.
- [ ] **D8**: `ChatBox.jsx` and `chat.js` (Phase 4). Needed by M1 P4 to mount the widget.
- [ ] Admin-facing wrapper reviews for Member 1 (overview section 6.2).

---

## 4. Phase 1: Database (Gate 1). Do This First

- [ ] `[ADD]` Create the GitHub monorepo, protect `main`, and merge `CONTRIBUTING.md` with the rules from blueprint section 8.2. Do this before Member 1 and Member 2 start branching.
- [ ] `[BP]` Create the Supabase project and storage bucket `public-images`.
- [ ] `[BP]` `001_schema.sql`: all 13 tables, foreign keys, `deleted_at` columns, indexes from blueprint 5.2, and RLS enabled on every table.
- [ ] `[BP]` `002_functions.sql`: `handle_new_user` trigger, `deduct_stock`, and `adjust_stock`.
- [ ] `[BP]` `003_seed.sql`: categories, about 10 sample products, default `site_content` keys, and steps to promote the first admin.
- [ ] `[BP]` Configure Supabase custom SMTP with Gmail for password reset emails.
- [ ] `[BP]` ER diagram in `docs/diagrams/`. Add a "run the migrations" section to `README.md`.
- [ ] `[ADD]` Verify RLS: the anonymous key cannot read any table. Record the test in the PR.
- [ ] `[ADD]` Post in the team channel when migrations are live (D1 merged).

---

## 5. Phase 2: Admin Shell and Catalog Management (Gate 2)

- [ ] `[BP]` `AdminLayout.jsx` with role-aware navigation (admin and staff) and route guards.
- [ ] `[BP]` `Dashboard.jsx`: low-stock list and recent orders. The sales summary card is added in Phase 4 (C3).
- [ ] `[BP]` `admin/Products.jsx`: create, edit, image upload, Active and Archived tabs, archive, restore, and purge (FR-3, FR-23). Blocked by D4.
- [ ] `[BP]` Category management on the same page.
- [ ] `[DT]` Admin uses `data-density="compact"` on the layout root. Tables have no borders and use zebra rows. KPIs are typographic on canvas (designtokens 7.4, 8.4, 12).

---

## 6. Phase 3: Operations Pages (Gate 3 to 4)

- [ ] `[BP]` `admin/Orders.jsx`: filter by status, change status, and view order detail (FR-8). Blocked by D5.
- [ ] `[BP]` `admin/Inventory.jsx`: stock-in, adjustment, and spoilage form, log table, and low-stock highlight (FR-11). Blocked by D9 (or C5).
- [ ] `[BP]` `admin/Announcements.jsx`: draft and publish, pin, and archive and restore (FR-12).
- [ ] `[BP]` `admin/Content.jsx`: edit hero text, banners, About, Contact, store location, and delivery rates (FR-17).
- [ ] `[BP]` `admin/Users.jsx`: change role, deactivate and activate (FR-16). Blocked by D9 (or C5).
- [ ] `[DT]` Status badges use the mapping in designtokens 11.1.

---

## 7. Phase 4: Reports and Chat (Gate 4 to 5)

- [ ] `[BP]` `admin/Reports.jsx`: date range, four report types, CSV download, and print-to-PDF stylesheet (FR-18).
- [ ] `[ADD]` Dashboard sales summary card using `GET /reports/summary` (C3, D9).
- [ ] `[BP]` `backend/src/chat.js`: token handshake auth, rooms (`conv:<customerId>`, `staff`), and save-then-emit `message:new` (FR-22). Attaches to the Socket.IO point from D12.
- [ ] `[BP]` `routes/chat.js`: conversation list for staff and message history (customers see only their own).
- [ ] `[BP]` `components/ChatBox.jsx` (customer widget) and `admin/Chat.jsx` (inbox and thread). The launcher morphs into the panel (designtokens 9.3). Coordinate mount with M1 P4 (D8).
- [ ] `[BP]` Push to the recipient when they are not connected, using `lib/push.js` from Member 2 (D7).

---

## 8. Phase 5: QA, Docs, Deploy (Gate 5)

- [ ] `[BP]` Run the manual QA checklist in section 9 end to end on the deployed app. Log every defect in section 10.
- [ ] `[BP]` Deploy the frontend as a Render static site. Set `VITE_*` variables. Confirm API CORS (D11).
- [ ] `[BP]` Export submission docs to `docs/diagrams/`: use case, context diagram, architecture, ER, and wireframes (blueprint 7.1).
- [ ] `[BP]` Finish `README.md` and `CONTRIBUTING.md`. Record demo accounts for admin, staff, and customer.
- [ ] `[BP]` Verify requirements traceability against blueprint section 11.

---

## 9. Manual QA Checklist (blueprint, Member 3 owns the run)

Owner column shows who fixes a failure. Mark Pass or Fail and link the defect ID.

| # | Check | Owner | Pass | Defect ID |
| --- | --- | --- | --- | --- |
| 1 | Sign up, log in, reset password by email, log out, idle timeout logs out | M1, M2 | [ ] | |
| 2 | Browse, search, filter, and sort. Archived products never appear to customers. | M1, M2 | [ ] | |
| 3 | COD order: staff sets `preparing`, stock deducted once, email received | M1, M2, M3 | [ ] | |
| 4 | GCash, card, and GrabPay sandbox: webhook marks order `paid`, stock deducted once | M2 | [ ] | |
| 5 | Order above available stock is rejected | M2 | [ ] | |
| 6 | Low-stock email and push reach the admin | M2 | [ ] | |
| 7 | Staff cannot open Users or Reports. UI and API both return 403. | M3, M2 | [ ] | |
| 8 | Archive, restore, and purge work. Purge is blocked when order history exists. | M3, M2 | [ ] | |
| 9 | Offline: app opens, cached catalog browsable, cart editable, checkout shows offline message | M1 | [ ] | |
| 10 | Install as PWA on Android and desktop. Push arrives with the app closed. | M1, M2 | [ ] | |
| 11 | Chat message appears live on both sides. Push arrives when the other side is disconnected. | M3, M1 | [ ] | |
| 12 | Six wrong logins in one minute trigger the rate limit | M2 | [ ] | |

---

## 10. Defect Log

| ID | Found on | Check # | Owner | Severity | Status | Fixed in PR |
| --- | --- | --- | --- | --- | --- | --- |
| DEF-001 | | | | | Open | |
| DEF-002 | | | | | Open | |
| DEF-003 | | | | | Open | |

Severity: **Blocker** (cannot complete a purchase or sign in) · **Major** (wrong data or money) · **Minor** (cosmetic or copy)

---

## 11. Daily Checklist

- [ ] `git pull origin main`, then rebase my `m3/<task>` branch on `main`.
- [ ] Any change under `database/` follows the reviewer rule in overview section 6.2 (Member 2 reviews).
- [ ] Run the Definition of Done in overview section 6.3 before opening a PR.
- [ ] Log any blocker in overview section 7 the same day.
- [ ] Tick a box only after the PR is merged.
