# Member 1: Storefront and PWA. Progress Plan

| Field | Value |
| --- | --- |
| Owner | Member 1 |
| Owns | `frontend/src/` except `admin/`. Includes `sw.js`, `App.jsx`, `components/`, `components/ui/`, `styles/`, `lib/` |
| Reads | `blueprint.md` sections 6.1, 6.2, 7.1, 9 (Member 1 checklist) and `designtokens.md` |
| Gates you sign | 1, 2, 3, 4, 5 |
| Overview | `progress-00-overview.md` |

---

## 1. Phase Progress

Progress % = Done ÷ Tasks × 100. Update Done and Status after each merge.

| Phase | Theme | Tasks | Done | % | Status | Target | Gate signed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Foundation | 11 | | | Not started | | |
| 2 | Catalog and auth | 8 | | | Not started | | |
| 3 | Cart and checkout | 8 | | | Not started | | |
| 4 | Account, contact, live stock | 7 | | | Not started | | |
| 5 | PWA and polish | 10 | | | Not started | | |

---

## 2. Waiting On (Dependencies)

Tick when the provider task is merged. Do not start the dependent task before then.

- [ ] **D1**: Schema, trigger, and seed content (M3 P1). Needed for auth screens and home content.
- [ ] **D2**: `docs/api.md` (M2 P1). Needed before any API call is coded.
- [ ] **D3**: Token layer and wrappers. You provide this. Others wait on you.
- [ ] **D4**: Catalog, content, and announcements routes (M2 P2). Needed for Phase 2 pages.
- [ ] **D5**: Orders, PayMongo, and webhook (M2 P3). Needed for checkout and polling.
- [ ] **D6**: `stock` socket event (M2 P3 if C2 agreed). Needed for live stock.
- [ ] **D8**: ChatBox and `chat.js` (M3 P4). Needed to mount the chat widget.
- [ ] **D10**: Push subscription routes (M2 P5, or P4 if C1 agreed). Needed for push opt-in.
- [ ] **D11**: Render HTTPS deployment (M2 P5). Needed for PWA and push testing.

---

## 3. Phase 1: Foundation (Gate 1)

- [ ] `[BP]` Scaffold Vite + React. Add Tailwind CSS v4, React Router, and `.env.example`.
- [ ] `[DT]` Add the token layer from `designtokens.md` section 17: `tokens/primitive.css`, `tokens/semantic.css`, `theme.css`.
- [ ] `[DT]` Self-host Sora and Manrope with `@fontsource-variable` (designtokens D10).
- [ ] `[DT]` Install coss ui and Base UI. Confirm the primitive layer (designtokens D2). Build `components/ui/` wrappers, starting with Button, Input, Chip, Dialog, and Sheet.
- [ ] `[DT]` Install `@phosphor-icons/react` and `motion`. Write `styles/icons.ts` and `styles/tokens/motion.ts`. Wrap the app in `LazyMotion` with `domAnimation`.
- [ ] `[DT]` Configure lint rules for token use: no raw hex or px in components (DR-C1, DR-L5, DR-M1).
- [ ] `[BP]` `lib/api.js`: fetch wrapper with base URL, Bearer token, one refresh on 401, and error handling.
- [ ] `[BP]` `lib/auth.jsx`: AuthContext (login, logout, profile, role), token in localStorage, 30-minute idle logout.
- [ ] `[BP]` `App.jsx` route skeleton, Navbar, mobile-first layout, role guard component.
- [ ] `[BP]` Mock-free: read `docs/api.md` (D2) and code against it. Do not write mock data.
- [ ] `[ADD]` Navbar status line or dev page calls `GET /health` to prove the wiring end to end.

---

## 4. Phase 2: Catalog and Auth (Gate 2)

- [ ] `[BP]` `Auth.jsx`: login, signup, forgot, and reset, with validation messages (FR-14). Blocked by D1 for profile data.
- [ ] `[BP]` `Products.jsx`: search, category, brand, and price filters, sort, and pagination (FR-1, FR-2). Blocked by D4.
- [ ] `[BP]` `ProductDetail.jsx` and `ProductCard` with stock status badge (FR-1).
- [ ] `[BP]` `Home.jsx`: hero and banners from `/content`, featured products, latest and pinned announcements (FR-13).
- [ ] `[BP]` `Announcements.jsx`.
- [ ] `[DT]` Apply canvas-first layout and card policy (designtokens 8.5 and 12). ProductCard is the only catalog card. No section wrappers.
- [ ] `[DT]` Shared-layout morph from product tile to detail page (designtokens 9.3).
- [ ] `[DT]` Stock indicator uses icon, label, and color together (designtokens 11 and DR-C5).

---

## 5. Phase 3: Cart and Checkout (Gate 3)

- [ ] `[BP]` `lib/cart.jsx`: add, update quantity, remove, persist in localStorage (FR-4).
- [ ] `[BP]` `Cart.jsx` with live totals. The server recalculates at checkout, so display totals are informational.
- [ ] `[BP]` `Checkout.jsx`: pickup or delivery, address select or add, `MapPicker` pin, fee display (FR-5, FR-19). Blocked by D5.
- [ ] `[BP]` Payment: GCash, card, and GrabPay via PayMongo public key and redirect, plus COD (FR-6). Blocked by D5.
- [ ] `[BP]` Order result view polls order status after payment return.
- [ ] `[DT]` Add-to-cart morph and cart badge increment (designtokens 9.3).
- [ ] `[DT]` Checkout as a four-step stepper, one step on canvas at a time (designtokens 12).
- [ ] `[DT]` Money shown as PHP with `Intl.NumberFormat("en-PH")` and tabular numerals (designtokens 6.3).

---

## 6. Phase 4: Account, Contact, Live Stock (Gate 4)

- [ ] `[BP]` `Account.jsx`: profile edit and saved addresses with add, edit, and archive (FR-15).
- [ ] `[BP]` Order history with status tracker (order stepper component) and cancel-while-pending (FR-8).
- [ ] `[BP]` `Contact.jsx`: Google Map with store pin, address, and hours (FR-19).
- [ ] `[BP]` `lib/socket.js`: connect with the access token, listen for `stock`, update product pages live. Blocked by D6.
- [ ] `[DT]` Stock flash on live change. Announce with `aria-live="polite"` (designtokens 13).
- [ ] `[BP]` Mount `ChatBox` (from Member 3) in the layout for logged-in customers. Blocked by D8.
- [ ] `[ADD]` Notification toggle placeholder in Account. It is wired in Phase 5.

---

## 7. Phase 5: PWA and Polish (Gate 5)

- [ ] `[BP]` `vite.config.js` with `vite-plugin-pwa` (`injectManifest`), manifest, icons, and install button (FR-20).
- [ ] `[DT]` Manifest colors and maskable icon (designtokens 15): `theme_color` `#2D6F47`, `background_color` `#F5F7F7`.
- [ ] `[BP]` `sw.js`: precache the shell. Use stale-while-revalidate for catalog, announcements, and content. Use network-first for orders and `/me`. Add `push` and `notificationclick` handlers (FR-20, FR-21).
- [ ] `[BP]` Never cache auth, payments, or chat responses (blueprint 6.1).
- [ ] `[BP]` `OfflineBanner`. Disable checkout and chat when offline. Show a "last updated" label on cached stock.
- [ ] `[DT]` Offline banner and stale label styled per designtokens 15.
- [ ] `[BP]` `lib/push.js` and notification toggle in Account (FR-21). Blocked by D10.
- [ ] `[DT]` Install prompt and notification opt-in as bottom sheets (designtokens 9.3).
- [ ] `[BP]` Offline test in DevTools. Lighthouse PWA check. Responsive pass.
- [ ] `[BP]` Browser check: Chrome, Firefox, Edge, Safari, Android, and iOS. Run Lighthouse and push tests on the deployed HTTPS URL (D11).
- [ ] `[ADD]` Fonts are precached by the service worker so they work offline (designtokens D10).

---

## 8. Daily Checklist

- [ ] `git pull origin main`, then rebase my `m1/<task>` branch on `main`.
- [ ] Work on one checklist group per branch.
- [ ] Before opening a PR, run the Definition of Done in overview section 6.3.
- [ ] Log any blocker in overview section 7 the same day.
- [ ] Tick a box only after the PR is merged.

---

## 9. Others Waiting on Me

- [ ] Member 3 needs the token layer and `components/ui` wrappers for admin screens (D3). Target: merged at Gate 1.
- [ ] Member 3 needs a review of admin-facing wrapper changes before merge.
