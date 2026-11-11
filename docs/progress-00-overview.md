# AgriMart Team Progress Plan: Overview

| Field | Value |
| --- | --- |
| Source | `blueprint.md` (sections 8, 9, 10) and `designtokens.md` |
| Members | Member 1: Storefront and PWA · Member 2: Backend · Member 3: Database, Admin and Chat |
| Member files | `progress-member-1-storefront-pwa.md`, `progress-member-2-backend.md`, `progress-member-3-database-admin-chat.md` |
| Plan version | 1.0, 11 Nov 2026 |
| Project status | ______________ (Not started / Phase N in progress / Complete) |

---

## 1. How to Use This Plan

- Update only your own member file. Update this overview at each sync gate and in the weekly check-in.
- Tick a box only when the work is **merged to `main`**. Local code does not count.
- A phase is **Done** only when every task is ticked and its sync gate is signed.
- Every task has exactly one owner. Shared work is split into one task per owner.

**Status values:** Not started · In progress · In review · Blocked · Done

**Tags used in member files**

| Tag | Meaning |
| --- | --- |
| `[BP]` | From the blueprint checklist, unchanged |
| `[DT]` | Added to meet `designtokens.md` |
| `[ADD]` | Added by this plan. Not in the blueprint. |
| `[MOVE]` | Moved to an earlier phase to remove a dependency. Needs agreement (section 4). |
| `[DEP]` | Blocked until another member's task is merged. Dependency ID from section 3. |

---

## 2. Phase Timeline

| Phase | Theme | Member 1 | Member 2 | Member 3 | Gate |
| --- | --- | --- | --- | --- | --- |
| 0 `[ADD]` | Kickoff | Read blueprint and design tokens. Local setup. | Express and Supabase accounts. Local setup. | Create repo and access. Write CONTRIBUTING.md. | Everyone can push a branch |
| 1 | Foundation | Scaffold, tokens, UI wrappers, API client, auth context | Express, middleware, auth, `me`, `docs/api.md` | Schema, RLS, functions, seed | **Gate 1** |
| 2 | Catalog and accounts | Auth screens, catalog, home, announcements | Crud helper, catalog, announcements, content, uploads | Admin shell, product management, dashboard | **Gate 2** |
| 3 | Ordering | Cart, checkout, payment screens | Fee, orders, PayMongo, webhook, COD, email | Orders admin, admin pages | **Gate 3** |
| 4 | Operations | Account, contact, live stock, chat mount | Inventory, users, reports, push library | Reports, chat backend and UI, operations pages | **Gate 4** |
| 5 | PWA, push, hardening, deploy | Service worker, offline, push opt-in | Push events, security pass, deploy | QA, frontend deploy, submission docs | **Gate 5** |

**Target dates** (fill in at kickoff)

| Phase | Target start | Target gate | Actual gate |
| --- | --- | --- | --- |
| 0 | ________ | ________ | ________ |
| 1 | ________ | ________ | ________ |
| 2 | ________ | ________ | ________ |
| 3 | ________ | ________ | ________ |
| 4 | ________ | ________ | ________ |
| 5 | ________ | ________ | ________ |

**Critical path:** Member 3 schema (P1) → Member 2 auth, CRUD and orders (P1 to P3) → Member 1 checkout (P3) → Gate 3. A slip on either Member 3 P1 or Member 2 P3 moves every later gate.

### 2.1 Phase 0 kickoff checklist

- [ ] Repository created and access granted to all three members (Member 3)
- [ ] Everyone has Node.js 20+, Git, and accounts for Supabase, Render, PayMongo sandbox, and Google Maps (all)
- [ ] Everyone has read `blueprint.md` and `designtokens.md` (all)
- [ ] Decision D2 (coss ui primitive layer) and proposed changes C1 to C5 reviewed (all)
- [ ] Branch naming and PR rules from section 6 agreed (all)

---

## 3. Dependency Map

Use the ID in the `[DEP]` tag of member files. Mark **Merged** when the provider task is complete.

| ID | Provider (blocker) | Consumer (blocked) | Needed by | Status |
| --- | --- | --- | --- | --- |
| D1 | M3 P1: schema, RLS, `handle_new_user` trigger, `deduct_stock` and `adjust_stock` functions, seed `site_content` | M2 P1: auth and `me` routes · M2 P3: orders · M1 P2: auth screens and home content | Gate 1 | Open |
| D2 | M2 P1: `docs/api.md` merged and announced | M1 P1: all API calls · M3 P2: admin calls | Gate 1 | Open |
| D3 | M1 P1: token layer and `components/ui` wrappers merged | M3 P2 onward: admin screens · M1 P2: storefront pages | Start of Phase 2 | Open |
| D4 | M2 P2: catalog, content, announcements, uploads routes | M1 P2: Products, Detail, Home · M3 P2: admin products | Gate 2 | Open |
| D5 | M2 P3: orders, PayMongo, webhook, COD rule | M1 P3: checkout and polling · M3 P3: orders admin | Gate 3 | Open |
| D6 | M2 P3 `[MOVE]` (C2): `stock` socket event after deduction | M1 P4: live stock on product pages | Start of Phase 4 | Open |
| D7 | M2 P4 `[MOVE]` (C1): `lib/push.js` and `routes/push.js` | M3 P4: chat push to offline recipient · M2 P4: low-stock push | Gate 4 | Open |
| D8 | M3 P4: `ChatBox.jsx` and `chat.js` | M1 P4: mount ChatBox in layout | Gate 4 | Open |
| D9 | M2 P4: inventory, users, reports, `GET /reports/summary` (or P3 if C5 agreed) | M3 P3: inventory and users pages · M3 P4: reports · M3 P4: dashboard sales card | Gate 4 | Open |
| D10 | M2 P5: push subscription routes (or P4 if C1 agreed) | M1 P5: subscribe UI and `sw.js` push handler | Start of Phase 5 | Open |
| D11 | M2 P5: Render deploy with HTTPS and WebSocket | M1 P5: PWA, offline, and push tests · M3 P5: frontend deploy and QA | Gate 5 | Open |
| D12 | M2 P1: Socket.IO attach point in `index.js` | M3 P4: `chat.js` | Start of Phase 4 | Open |

---

## 4. Proposed Schedule Changes

These conflicts exist in the blueprint's own phase split. Each one needs a decision. Recommended options are marked.

| ID | Conflict | Proposal | Agreed |
| --- | --- | --- | --- |
| **C1** | M3 P4 chat push calls `lib/push.js`, but the blueprint places it in M2 P5. | **Recommended:** move `lib/push.js` and `routes/push.js` to M2 Phase 4. | [ ] |
| **C2** | M1 P4 live stock needs the `stock` socket event, but the blueprint places it in M2 P5. | **Recommended:** move the `stock` emit to M2 Phase 3, directly after deduction. | [ ] |
| **C3** | M3 P2 dashboard sales summary needs `GET /reports/summary`, which is M2 P4. | **Recommended:** Dashboard in Phase 2 shows low stock and recent orders only. Add the sales card in Phase 4. | [ ] |
| **C4** | Admin UI starts in Phase 2 and needs tokens and wrappers. | **Recommended:** M1 publishes the token layer and `components/ui` in Phase 1 (already in M1 plan). | [ ] |
| **C5** | M3 P3 Inventory and Users pages need M2 P4 routes. | **Recommended:** M2 builds `routes/inventory.js` and `routes/users.js` in Phase 3. Alternative: M3 moves both pages to Phase 4. | [ ] |

Decide C1 to C5 at the start of Phase 1. Record the decision in the overview's change log (section 9).

---

## 5. Sync Gate Board

A gate is passed when every item is ticked. Each item lists the members who must confirm it.

### Gate 1: Foundation (end of Phase 1)

- [ ] Supabase project live. Migrations 001 to 003 applied. RLS enabled on all 13 tables. (M3)
- [ ] Anonymous key cannot read any table. (M3)
- [ ] Repository protected, `CONTRIBUTING.md` merged. (M3)
- [ ] `docs/api.md` merged and announced to M1 and M3. (M2)
- [ ] Backend runs locally and `GET /health` returns 200. (M2)
- [ ] Frontend runs locally. Navbar status calls `/health`. (M1)
- [ ] Token layer and `components/ui` wrappers merged. (M1)
- [ ] Changes C1 to C5 decided and recorded. (all)

**Sign-off:** M1 ________ · M2 ________ · M3 ________ · Date ________

### Gate 2: Catalog and accounts (end of Phase 2)

- [ ] Sign up creates the profile row through the trigger. Log in and log out work. (M1, M2, M3)
- [ ] Six wrong logins in one minute trigger the rate limit. (M2)
- [ ] Product browse shows real data. Archived products are hidden from customers. (M1, M2)
- [ ] Admin creates, edits, archives, restores, and purges a product. (M3, M2)
- [ ] Image upload returns a public URL. (M2, M3)
- [ ] Home shows hero, featured products, and pinned announcement from the API. (M1, M2)

**Sign-off:** M1 ________ · M2 ________ · M3 ________ · Date ________

### Gate 3: Ordering (end of Phase 3)

- [ ] COD order: staff sets `preparing`, stock deducts once, confirmation email arrives. (M1, M2, M3)
- [ ] Sandbox GCash, card, and GrabPay: webhook marks order `paid`, stock deducts once. (M1, M2)
- [ ] Order above available stock is rejected. (M2)
- [ ] Customer sees the status change after payment return. (M1)
- [ ] Admin changes order status from the Orders page. (M3)

**Sign-off:** M1 ________ · M2 ________ · M3 ________ · Date ________

### Gate 4: Operations (end of Phase 4)

- [ ] Stock-in, adjustment, and spoilage are logged. Low-stock email is sent. (M2, M3)
- [ ] Role change and deactivate work. A deactivated user cannot log in. (M2, M3)
- [ ] Staff gets 403 on Users and Reports from both UI and API. (M2, M3)
- [ ] CSV download works for all four report types. (M2, M3)
- [ ] Announcement draft, publish, and pin appear on Home. (M3, M1)
- [ ] Content edits in admin appear on the storefront. (M3, M2, M1)
- [ ] Profile and address edits save. (M1, M2)
- [ ] Live stock updates the product page without reload. (M1, M2)
- [ ] Chat message appears live on both sides. (M3, M1)

**Sign-off:** M1 ________ · M2 ________ · M3 ________ · Date ________

### Gate 5: PWA, push, hardening, deploy (end of Phase 5)

- [ ] Deployed on HTTPS. WebSocket connects. (M2)
- [ ] PayMongo webhook registered and reachable. (M2)
- [ ] App installs on Android and desktop. (M1)
- [ ] Offline: shell opens, catalog is browsable, cart is editable, checkout shows the offline message. (M1)
- [ ] Push arrives with the app closed for order status and new announcements. (M1, M2)
- [ ] Chat push reaches a disconnected recipient. (M3, M2)
- [ ] Manual QA checklist passes on the deployed app. (M3)
- [ ] Demo accounts recorded. Requirements traceability verified. (M3)

**Sign-off:** M1 ________ · M2 ________ · M3 ________ · Date ________

---

## 6. Workflow

### 6.1 Branches and daily routine

- Branch names: `m1/<task>`, `m2/<task>`, `m3/<task>`. Example: `m2/orders-api`.
- **Start of day:** `git pull origin main`, then rebase or merge `main` into your branch.
- **One checklist group per PR.** Keep PRs small.
- Commit prefixes: `feat:`, `fix:`, `docs:`, `chore:`.
- Never commit `.env`. Update `.env.example` when you add a variable.
- **End of day:** push your branch. Log any blocker in section 7 the same day.

### 6.2 Required reviewer by path

| Path changed | Required reviewer |
| --- | --- |
| `docs/api.md` | Member 2 (writer), plus the owner of the consuming code |
| `database/` | Member 3. Member 2 reviews schema-facing changes. |
| `backend/src/chat.js`, `routes/chat.js` | Member 3 |
| `backend/src` (all other files) | Member 2 |
| `frontend/src/admin/` | Member 3 |
| `frontend/src/` (other), `components/ui/`, `styles/` | Member 1. Member 3 reviews admin-facing wrapper changes. |

One teammate reviews every PR. Rotate reviewers so that no one only reviews their own area.

### 6.3 Definition of Done (per task)

- [ ] Runs with the repository dev script.
- [ ] Matches `docs/api.md`. If an endpoint changed, the docs change in the same PR, and the consuming owner is told.
- [ ] Errors show a message in the standard `{ error, details }` format. No crashes or blank screens.
- [ ] Layout checked at 375 px width.
- [ ] Only design tokens are used. No raw hex, px, or ms values (designtokens DR-C1, DR-L5, DR-M1).
- [ ] The task's manual QA steps run and pass.
- [ ] PR reviewed and merged to `main`.
- [ ] Checkbox ticked in your member file.

### 6.4 Definition of Done (per phase)

- [ ] Every task ticked.
- [ ] Sync gate items ticked and sign-off recorded.
- [ ] No open blocker that stops the next phase.
- [ ] Phase status set to Done in the member file.

---

## 7. Blocker Log

| Date | Blocked member | Task | Blocked by (ID) | Owner to unblock | Resolved on |
| --- | --- | --- | --- | --- | --- |
| | | | | | |
| | | | | | |
| | | | | | |
| | | | | | |

---

## 8. Weekly Check-In

Copy this block into the team channel every week. Each member fills in their own section.

```
Week of: __________   Member: __________   Current phase: ___

Finished and merged this week:
-

In progress:
-

Next week:
-

Blocked by (use dependency IDs from section 3):
-

Changes I need to propose (C-ID or new):
-
```

---

## 9. Change Log

| Date | Change | Decided by | Notes |
| --- | --- | --- | --- |
| | | | |
| | | | |
