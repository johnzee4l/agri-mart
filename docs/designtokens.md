# AgriMart Design Tokens

| Field | Value |
| --- | --- |
| Version | 1.0 |
| Date | 11 Nov 2026 |
| Source | `blueprint.md` (sections 1, 2, 6, 7.1, 9, 11) |
| Framework | React 18+ (Vite), Tailwind CSS v4 |
| Component base | coss ui (restyled through tokens), Base UI primitives underneath |
| Icons | Phosphor (`@phosphor-icons/react`) |
| Motion | Motion (`motion/react`) |
| Owner | Member 1 (`frontend/src/styles`). Member 3 consumes the same tokens in `frontend/src/admin`. |

How to read this file: tokens are the only source of visual values. Components never use raw hex, px, or ms values. Items marked **[CONFIRM]** are assumptions listed in section 18.

---

## 1. Design Direction

**Positioning:** a trusted agricultural supply house run with software precision. Calm and corporate at rest. Fast, fluid, and organic in motion.

### 1.1 Brief translated into decisions

| Brief term | Translated as |
| --- | --- |
| Professional, corporate | Ink-led neutrals, strict type scale, generous whitespace, no ornament |
| Clean, minimal | One canvas, few elements per screen |
| Premium | Restraint, precise spacing, large display type, slow-settling motion |
| High-octane | Snappy spring feedback, bold display headlines, one saturated accent per view. Energy comes from motion, not noise. |
| Modern, next-gen, futuristic | Geometric sans, wide display letterforms, morphing transitions |
| Canvas-first | Content sits on one continuous canvas. Surfaces appear only when needed. |
| Zero borders and cards | Structure comes from tone and space. Cards are limited to the permitted list in 8.5. |
| Flat design | No shadows at rest, no gradients in UI chrome, no skeuomorphism |
| Natural, organic animation | Spring physics that start at the element that was triggered. One ambient organic shape on the home hero. |

### 1.2 Principles

1. **Canvas before containers.** Content lives on the canvas. A surface is an exception that must earn its place.
2. **Tone, not lines.** Separation comes from tonal steps and spacing. Shadows and borders are not used for structure.
3. **Geometric form, organic motion.** Shapes are geometric and rounded. Motion is spring-based and grows out of the element that triggered it.
4. **Act, highlight, read.** Green means act. Harvest means highlight. Ink means read.
5. **Accessible by default.** Every color pairing is tested. Color is never the only signal.

### 1.3 Anti-patterns (must not look like this)

- Default shadcn/coss gray bordered cards, default radii, or default shadows
- Radix-default styled dialogs, selects, or popovers
- Purple or blue gradient heroes
- Inter-only typography
- Stock illustration grids or generic icon tiles
- Decorative drop shadows or glassmorphism
- Bordered tables with hairlines on every row

---

## 2. Brand Palette

Three base colors, each with its own tonal scale. Rust is a single semantic signal, not a brand color (see decision D1).

| Base | Role | Share of screen | Personality | Pantone reference (nearest family) | Anchor hex (web) |
| --- | --- | --- | --- | --- | --- |
| **Ink** | Structure, text, canvas | 60% | Precision, trust | Cool blue-teal grey family | `#66777A` (ink-500) |
| **Field Green** | Primary action, brand | 30% | Growth, soil, reliability | Greenery 15-0343 family (Pantone Color of the Year 2017), deepened for contrast | `#2D6F47` (green-600) |
| **Harvest** | Accent, highlight, promo, featured | 10% | Yield, sun, attention | Warm amber and ochre family | `#D68A1E` (harvest-500) |
| **Rust** (signal only) | Errors, destructive actions, out-of-stock | Only when needed | Warning without alarm | Red-orange and rust family | `#C2472F` (rust-500) |

Anchor hex values are web approximations. Confirm each Pantone match against Pantone Connect or a physical swatch before print or signage.

### 2.1 Scale roles (applies to every base)

Each base ships an 11-step scale (50 to 950). Each step has one job.

| Steps | Role |
| --- | --- |
| 50 to 200 | Tints for surfaces, subtle backgrounds, selected states |
| 300 to 400 | Decorative fills, illustration, disabled fills, dark-mode text |
| 500 | Fills and graphics only. Meets 3:1 on white. Never text. |
| 600 to 700 | Text, links, and action fills. Meets 4.5:1 on white or light tints. |
| 800 to 950 | Dark-mode surfaces and high-contrast text |

---

## 3. Stack and Dependency Rules

| Layer | Package | Role | Rule |
| --- | --- | --- | --- |
| UI runtime | React 18+, Vite | Application | Route-level code splitting (blueprint NFR: 3 s load) |
| Styling | Tailwind CSS v4 | Utilities bound to tokens through `@theme` | Only semantic tokens are exposed as utilities |
| Base components | coss ui **[CONFIRM]** | Starting components, restyled | Imported only through `components/ui/*` wrappers |
| Headless primitives | Base UI (`@base-ui/react`) **[CONFIRM]** | Accessible behavior under coss ui | Behavior only. Visual styling comes from tokens. |
| Complex widgets | React Aria Components | Fallback for combobox, date picker, and similar | Use only where Base UI lacks the widget |
| Icons | Phosphor (`@phosphor-icons/react`) | All iconography | Named imports only, mapped in `icons.ts` |
| Motion | Motion (`motion/react`) | Springs, layout morphs, gestures | Wrapped in `LazyMotion` (see section 9.6) |
| Fonts | `@fontsource-variable/sora`, `@fontsource-variable/manrope` | Self-hosted variable fonts | No Google Fonts runtime request. Fonts are precached by the service worker. |
| Premium third-party | Magic UI, Animate UI, Origin UI **[CONFIRM]** | Evaluate per component | Home hero and marketing effects only by default. Check license and bundle size. |
| Excluded | Radix primitives | Not used in new code | Their default skins are the generic look this brief rejects |

### 3.1 Rules

- **R1.** coss ui and Base UI components are imported only through local wrappers in `src/components/ui/`. A look change happens in one place.
- **R2.** No default coss or shadcn styling reaches a screen: no gray borders, default radii, or default shadows.
- **R3.** No Radix imports in new code. If a coss ui component is built on Radix, replace its primitive layer rather than restyling its defaults.
- **R4.** Third-party components need a permissive license (MIT or Apache 2.0 or equivalent), must be restyled to tokens, and must not load from a CDN at runtime.
- **R5.** Icons come only from Phosphor, through the map in section 10.
- **R6.** Fonts are self-hosted. Nothing loads from a third-party CSS host at runtime.

---

## 4. Token Architecture

### 4.1 Three tiers

| Tier | Example | Who may reference it | File |
| --- | --- | --- | --- |
| **Primitive** | `--green-600: #2D6F47` | Only `semantic.css` | `tokens/primitive.css` |
| **Semantic** | `--primary: var(--green-600)` | Components, utilities, wrappers | `tokens/semantic.css`, `theme.css` |
| **Component** (optional) | `--control-md: 44px` | Component wrappers only. Keep this tier small. | `tokens/component.css` |

Primitives never produce Tailwind utilities. A class such as `bg-green-600` does not exist in this project, so raw brand values cannot leak into screens.

### 4.2 Naming convention

`--{group}-{role}[-{state}]`

| Group | Examples |
| --- | --- |
| Surfaces | `--bg-canvas`, `--bg-surface`, `--bg-muted`, `--bg-tint`, `--bg-warm`, `--bg-inverse` |
| Foreground | `--fg-default`, `--fg-muted`, `--fg-subtle`, `--on-primary`, `--on-accent`, `--on-danger` |
| Brand and status | `--primary`, `--primary-hover`, `--primary-subtle`, `--primary-text`, `--accent`, `--danger-fill` |
| Interaction | `--focus-ring`, `--field-edge`, `--overlay` |
| Type | `--font-display`, `--font-sans` |
| Space and size | `--space-4`, `--control-md`, `--container-content` |
| Shape | `--radius-md` |
| Elevation | `--elevation-float` |
| Motion | `--duration-fast`, `--ease-enter` |
| Layering and density | `--z-overlay`, `--row-h` |

### 4.3 Enforcement

- Lint rule (ESLint or Stylelint): flag `#hex`, `rgb(`, and raw px or ms literals outside `src/styles/tokens/`.
- Code review check: a component that needs a value not in this file adds the token here first.
- Tailwind compile check: primitive color utilities do not exist, so using them fails the build.

---

## 5. Color Tokens

### 5.1 Primitive scales

| Step | Ink | Field Green | Harvest | Rust |
| --- | --- | --- | --- | --- |
| 50 | `F5F7F7` | `F1F7F2` | `FDF8EF` | `FBEFEB` |
| 100 | `E9EEEE` | `DDEEE1` | `FBEFD6` | `F6DCD3` |
| 200 | `D3DBDC` | `BCDDC5` | `F6DDA8` | `EDB8A8` |
| 300 | `AEBBBD` | `8FC49B` | `EFC670` | `E08D74` |
| 400 | `8A9A9C` | `5FA675` | `E6A93E` | `D9644B` |
| 500 | `66777A` | `3D8A5A` | `D68A1E` | `C2472F` |
| 600 | `4D5D61` | `2D6F47` | `B06F14` | `A63A24` |
| 700 | `3A474A` | `235A39` | `8C5510` | `8A2E1C` |
| 800 | `263134` | `1B4630` | `6B410F` | `6E2416` |
| 900 | `172023` | `133222` | `4A2D0B` | `4F190F` |
| 950 | `0C1214` | `0B1F15` | `2C1A06` | `2E0E08` |

Hex values are shown without `#`. `primitive.css` declares one custom property per cell, for example `--ink-50: #F5F7F7;`.

### 5.2 Semantic tokens

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg-canvas` | ink-50 | ink-950 | Page background. Default for every screen. |
| `--bg-surface` | `#FFFFFF` | ink-900 | Permitted cards, inputs, overlays |
| `--bg-muted` | ink-100 | ink-800 | Chips, input fill, zebra rows, chat bubbles from staff |
| `--bg-tint` | green-50 | green-950 | Hero band, promotional sections (max one per page) |
| `--bg-warm` | harvest-50 | harvest-950 | Offline banner, attention strip |
| `--bg-inverse` | ink-900 | ink-50 | Toasts, dark CTA band |
| `--fg-default` | ink-900 | ink-50 | Body and headings |
| `--fg-muted` | ink-600 | ink-300 | Secondary text, meta |
| `--fg-subtle` | ink-500 (on surfaces only) | ink-400 | Helper text, placeholders, timestamps |
| `--on-primary` | `#FFFFFF` | ink-950 | Label on primary fill |
| `--on-accent` | ink-950 | ink-950 | Label on accent fill |
| `--on-danger` | `#FFFFFF` | ink-50 | Label on danger fill |
| `--on-inverse` | ink-50 | ink-900 | Text on inverse surfaces |
| `--primary` | green-600 | green-400 | Primary fill |
| `--primary-hover` | green-700 | green-300 | Primary hover |
| `--primary-pressed` | green-800 | green-200 | Primary pressed |
| `--primary-subtle` | green-100 | green-900 | Secondary fill, selected states, icon tiles |
| `--primary-text` | green-700 | green-300 | Links, selected labels, success text |
| `--accent` | harvest-500 | harvest-400 | Highlight fill (promo badge, featured, pinned) |
| `--accent-hover` | harvest-600 | harvest-300 | Accent hover |
| `--accent-subtle` | harvest-100 | harvest-900 | Highlight tint |
| `--accent-text` | harvest-700 | harvest-300 | Highlight text |
| `--success-text` | green-700 | green-300 | Positive status text |
| `--warning-text` | harvest-700 | harvest-300 | Attention text |
| `--warning-subtle` | harvest-100 | harvest-900 | Low-stock and attention backgrounds |
| `--danger-fill` | rust-600 | rust-500 | Destructive button fill |
| `--danger-hover` | rust-700 | rust-400 | Destructive hover |
| `--danger-subtle` | rust-50 | rust-950 | Error message background |
| `--danger-text` | rust-600 | rust-300 | Error text |
| `--focus-ring` | green-600 | green-400 | Focus outline |
| `--field-edge` | ink-500 | ink-500 | Input edge (the only permitted border, see 8.4) |
| `--overlay` | ink-950 at 45% | ink-950 at 70% | Scrim behind sheets and dialogs |

### 5.3 Contrast matrix (verified pairings)

| Text or graphic | Background | Ratio | Result | Use |
| --- | --- | --- | --- | --- |
| `#FFFFFF` | green-600 | 6.0 | AA text | Primary button label |
| `#FFFFFF` | green-500 | 4.2 | Fails text | Graphics only. Never text. |
| green-600 | `#FFFFFF` | 6.0 | AA text | Links, primary text |
| green-700 | green-100 | 6.7 | AA text | Secondary button label |
| ink-900 | `#FFFFFF` | 16+ | AAA text | Body text |
| ink-600 | ink-50 | 6.4 | AA text | Muted text on canvas |
| ink-500 | `#FFFFFF` | 4.7 | AA text | Subtle text on surfaces |
| ink-500 | ink-50 | 4.3 | **Fails** | Never use subtle text on canvas |
| harvest-700 | `#FFFFFF` | 6.1 | AA text | Accent text, warnings |
| ink-950 | harvest-500 | 6.8 | AA text | Accent button label |
| harvest-500 | `#FFFFFF` | 2.8 | **Fails** | Fills only. Never text or thin icons on white. |
| `#FFFFFF` | rust-600 | 6.5 | AA text | Destructive button label, error text |
| green-400 | ink-950 | 6.5 | AA text | Dark primary button |
| harvest-400 | ink-950 | 9.1 | AAA text | Dark accent button |
| ink-300 | ink-950 | 9.6 | AAA text | Dark muted text |
| ink-400 | ink-900 | 5.6 | AA text | Dark subtle text |
| green-600 (focus) | ink-50 | 5.4 | 3:1 UI | Focus ring |
| ink-500 (field edge) | `#FFFFFF` | 4.7 | 3:1 UI | Input edge |

### 5.4 Pairing rules

1. Text is at least 4.5:1. Large text (24 px regular or 18.66 px bold) is at least 3:1. Icons, focus rings, and component boundaries are at least 3:1.
2. Harvest is never text or a thin icon on white. Use `--accent-text` (harvest-700) for that.
3. Green-500 and Harvest-500 are fills and graphics only.
4. Muted text on canvas is `--fg-muted`, not `--fg-subtle`.
5. Text on a tinted surface is checked against that tint, not against white.
6. Dark mode uses no pure white text. Text is ink-50 or darker, and no pure black backgrounds are used.

### 5.5 Proportion and state rules

- **60/30/10 per screen:** Ink and canvas about 60%. Green about 30%. Harvest about 10%. Rust appears only in error or destructive states.
- **One saturated accent per view.** Two harvest highlights on one screen compete with each other.
- **Hover is a step, not a new hue.** Hover moves one step within the same base (600 to 700).
- **Dark mode lifts saturation down.** Fills move to 400 and 500, never to 600 or darker.
- **Elevation in dark mode comes from tone.** Surfaces step from ink-950 to ink-900 to ink-800. Shadows are not used.

---

## 6. Typography

### 6.1 Families

| Token | Family | Role | Why |
| --- | --- | --- | --- |
| `--font-display` | **Sora** (variable, OFL) | Display, headings, hero, key figures | Geometric, wide, modern, slightly futuristic. Corporate without feeling stiff. |
| `--font-sans` | **Manrope** (variable, OFL) | Body, UI labels, forms, numerals | Geometric with soft terminals. Clean at small sizes and rounded in feel. |

Fallback stack: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`. Only Latin subsets are shipped (English and Filipino content).

### 6.2 Type scale

| Token | Size | Line height | Weight | Tracking | Family | Use |
| --- | --- | --- | --- | --- | --- | --- |
| `display-xl` | `clamp(2.5rem, 1.6rem + 3.2vw, 4.25rem)` | 1.02 | 600 | -0.035em | Sora | Hero headline |
| `display-lg` | `clamp(2rem, 1.5rem + 2vw, 3rem)` | 1.08 | 600 | -0.03em | Sora | Desktop page titles |
| `heading-lg` | 30 px | 1.2 | 600 | -0.02em | Sora | Section titles |
| `heading-md` | 24 px | 1.25 | 600 | -0.015em | Sora | Tile titles, admin page titles |
| `heading-sm` | 20 px | 1.3 | 600 | -0.01em | Sora | Sub-sections, card titles |
| `body-lg` | 18 px | 1.6 | 400 | 0 | Manrope | Lead paragraphs |
| `body-md` | 16 px | 1.6 | 400 | 0 | Manrope | Default body and input text |
| `body-sm` | 14 px | 1.5 | 400 | 0 | Manrope | Meta and secondary text |
| `label` | 15 px | 1.3 | 600 | 0.005em | Manrope | Buttons, navigation, form labels |
| `caption` | 12 px | 1.4 | 500 | 0.01em | Manrope | Timestamps, helper text |
| `eyebrow` | 12 px | 1.2 | 700 | 0.14em, uppercase | Manrope | Section kicker. Maximum one per section. |
| `numeric` | Inherits | Inherits | 600 | 0 | Manrope, `tabular-nums` | Prices, stock counts, totals, order figures |

### 6.3 Typography rules

- Sentence case for all UI text. Title case only for product names.
- Body line length: 45 to 75 characters.
- Inputs use 16 px minimum, which prevents iOS zoom on focus.
- All prices, stock counts, and totals use `font-variant-numeric: tabular-nums`.
- Currency: `Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })`, which renders `₱1,250.00`.
- Dates shown to customers use `Asia/Manila` (UTC+8, the store's zone). This matches the user's Singapore offset.
- Button labels are verbs in sentence case: "Add to cart", "Pay now", "Track order".
- No italics for UI emphasis. No all-caps body text.

---

## 7. Spacing, Sizing, and Layout

### 7.1 Space scale

Base unit 4 px. Tailwind v4 default `--spacing: 0.25rem` is kept, so `p-4` equals 16 px.

| Token | Value | Typical use |
| --- | --- | --- |
| `space-0` | 0 | Reset |
| `space-1` | 4 px | Icon to caption gap |
| `space-2` | 8 px | Inline elements, chip gaps, row gap in admin |
| `space-3` | 12 px | Component internal padding, tile padding |
| `space-4` | 16 px | Mobile gutter, field stack gap |
| `space-5` | 20 px | Button horizontal padding |
| `space-6` | 24 px | Group separation, tablet gutter |
| `space-8` | 32 px | Between related blocks |
| `space-10` | 40 px | Desktop gutter, block separation |
| `space-12` | 48 px | Between sections on dense pages |
| `space-16` | 64 px | Section padding (mobile) |
| `space-24` | 96 px | Section padding (tablet) |
| `space-32` | 128 px | Section padding (desktop, canvas-first pages) |

### 7.2 Sizes

| Token | Value | Use |
| --- | --- | --- |
| `control-sm` | 36 px | Dense admin toolbars (desktop only) |
| `control-md` | 44 px | Default buttons, inputs, selects. Mobile minimum. |
| `control-lg` | 52 px | Checkout CTA, hero CTA |
| `touch-min` | 44 × 44 px | Minimum hit area. A 36 px visual uses padding to reach it. |
| `icon-sm` | 16 px | Inline with caption |
| `icon-md` | 20 px | Buttons, inputs |
| `icon-lg` | 24 px | Navigation, list rows |
| `icon-xl` | 32 px | Empty-state icons |
| `icon-2xl` | 48 px | Category tiles |
| `row-comfortable` | 56 px | Storefront lists (cart, orders) |
| `row-compact` | 40 px | Admin tables |
| `image-grid` | 1:1 | Product grid tiles |
| `image-detail` | 4:5 mobile, 1:1 desktop | Product detail |
| `map-container` | 16:10 | Contact and checkout pin |

### 7.3 Breakpoints, containers, grid

| Token | Min width | Grid columns | Gutter |
| --- | --- | --- | --- |
| Base (mobile-first) | 0 | 4 | 16 px |
| `sm` | 640 px | 4 | 16 px |
| `md` | 768 px | 8 | 24 px |
| `lg` | 1024 px | 12 | 32 px |
| `xl` | 1280 px | 12 | 40 px |
| `2xl` | 1536 px | 12 | 40 px |

- `--container-content`: 1200 px
- `--container-wide`: 1440 px (catalog and admin)
- Section vertical padding: `space-16` mobile, `space-32` desktop

### 7.4 Density modes

| Mode | Used by | Row height | Control height | Body size |
| --- | --- | --- | --- | --- |
| `comfortable` (default) | Storefront, checkout, account | 56 px | 44 px | 16 px |
| `compact` | Admin tables, inventory log | 40 px | 36 px (desktop only) | 14 px in tables |

Density is set with `data-density="compact"` on the admin layout root. Colors and type families do not change between modes.

### 7.5 Z-index

| Token | Value | Layer |
| --- | --- | --- |
| `z-base` | 0 | Content |
| `z-sticky` | 20 | Sticky filter bar, sticky order summary |
| `z-header` | 30 | Navbar |
| `z-overlay` | 40 | Scrim |
| `z-sheet` | 50 | Bottom sheets, dialogs |
| `z-toast` | 60 | Toasts |
| `z-chat` | 70 | Chat launcher and panel |
| `z-banner` | 80 | Offline banner |

---

## 8. Shape, Surface, Elevation, Borders, Cards

### 8.1 Radius scale

| Token | Value | Applied to |
| --- | --- | --- |
| `radius-xs` | 6 px | Checkboxes, keyboard hints, table tags |
| `radius-sm` | 10 px | Menu items, tooltips |
| `radius-md` | 14 px | Inputs, selects, textareas |
| `radius-lg` | 20 px | Product images, map container, chat bubble corners |
| `radius-xl` | 28 px | Product tile, feature surface, popovers |
| `radius-2xl` | 36 px | Bottom sheet (top corners), chat panel, dialogs |
| `radius-full` | 999 px | Buttons, chips, badges, segmented controls, status dots, avatars |

### 8.2 Surface model (flat, tonal)

Three levels only. Each step is a tone change, not a shadow.

| Level | Light | Dark | Used for |
| --- | --- | --- | --- |
| 0. Canvas | ink-50 | ink-950 | Every page background |
| 1. Muted | ink-100 | ink-800 | Chips, input fill, zebra rows, staff chat bubbles |
| 2. Surface | `#FFFFFF` | ink-900 | Permitted cards and overlays |

On light canvas, white surfaces lift only slightly (about 1.07:1). That is intentional. Overlays get separation from `--overlay` scrims and `--elevation-float`.

### 8.3 Elevation

| Token | Value | Use |
| --- | --- | --- |
| `elevation-0` | none | Default for everything |
| `elevation-float` | Light: `0 16px 40px -16px rgb(12 18 20 / 0.28)`. Dark: `0 16px 40px -12px rgb(0 0 0 / 0.6)` | Floating chat panel, dialogs, sheets, toasts |
| `focus-ring` | 2 px outline, 2 px offset, `--focus-ring` | Keyboard focus. Outline, not shadow. |

No other shadows exist in the system.

### 8.4 Borders (zero by default)

The only permitted lines are these:

| Line | Spec | Why it exists |
| --- | --- | --- |
| Field edge | 1 px inset ring, `--field-edge` (3:1 minimum), on inputs and selects only | WCAG 1.4.11: form controls must be perceivable |
| Focus ring | 2 px outline, `--focus-ring` | Keyboard accessibility |

Table rows use zebra tone (`--bg-muted` on every second row) or an 8 px row gap. Hairlines are not used.

### 8.5 Card policy (limited list)

A "card" means a bounded surface (`--bg-surface` with a radius) that contains content. Only these may exist:

| Surface | Where | Limit |
| --- | --- | --- |
| **ProductCard** (radius-xl, surface, padding `space-3`) | Product grids on Home, Products, and detail "related" | Unlimited in grids. The only card type in the catalog. |
| **Feature announcement** | Home, pinned announcement | One per page |
| **Order summary panel** | Cart and checkout (sticky on desktop) | One per page |
| **Overlays**: dialogs, sheets, floating chat panel, toasts | Above the canvas | Overlays only |
| **Map container** (media, not a card) | Contact, checkout pin | Radius-lg, no padding, no frame |

Not allowed: section wrappers, stat cards on the dashboard (KPIs are typographic on canvas), nested surfaces, bordered tables, and any card whose only job is to group text.

### 8.6 Flat design rules

- No gradients in UI chrome. The one exception is the hero's tint-to-canvas wash, which is flat in color steps.
- No glassmorphism, no inner shadows, no bevels.
- Icons are flat Phosphor glyphs. No illustrated 3D icons.
- Imagery (product photos) is the only rich-media element.

---

## 9. Motion

### 9.1 Motion tokens

| Token | Value | Use |
| --- | --- | --- |
| `duration-instant` | 90 ms | Hover color, press color |
| `duration-fast` | 160 ms | Toggles, chip state, focus, button loading |
| `duration-base` | 240 ms | Small enter and exit, tooltips |
| `duration-moderate` | 360 ms | Sheets, panels, banners |
| `duration-slow` | 520 ms | Image zoom, page-level reveals |
| `duration-morph` | 640 ms | Fallback duration for shared-element morphs |
| `duration-stock-flash` | 900 ms | Live stock or price change highlight |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default movement |
| `ease-enter` | `cubic-bezier(0.16, 1, 0.3, 1)` | Elements arriving. Soft landing, organic feel. |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving |
| `ease-breathe` | `cubic-bezier(0.65, 0, 0.35, 1)` | Ambient motion, progress fills, skeleton pulse |
| `spring-snappy` | stiffness 420, damping 34, mass 0.9 | Taps, tab indicator, toggles, segmented thumb |
| `spring-organic` | stiffness 260, damping 24, mass 1 | Morphs, sheets, chat launcher to panel |
| `spring-gentle` | stiffness 160, damping 26, mass 1.1 | Large panels, hero ambient shape |

### 9.2 Motion roles

| Role | What it communicates | Token family |
| --- | --- | --- |
| Feedback | "Your input landed" (press, toggle, add) | Instant or snappy spring |
| Morph | "This is the same thing, now in a new state" | Organic spring, shared layout |
| Enter and exit | "Something appeared or left" | Enter and exit easings |
| Status | "The data changed" (stock, order step) | Stock flash, stepper fill |
| Ambient | "The brand is alive" (hero shape only) | Breathe easing, very slow |

### 9.3 Morph catalog

| Pattern | Trigger | Elements | Behavior | Token |
| --- | --- | --- | --- | --- |
| Tab indicator | Tab change | Active pill | Shared layout slides between tabs, width morphs | spring-snappy |
| Add to cart | "Add to cart" tap | Button label, cart badge | Label crossfades to check, button width morphs, badge scales 1 to 1.18 to 1 | spring-snappy, ease-enter |
| Product to detail | Tile tap | Product image and title | Shared layout. Image radius goes from xl to lg. | spring-organic |
| Chat launcher to panel | Launcher tap | Round launcher | Becomes the panel, anchored bottom-right | spring-organic + elevation-float |
| Bottom sheet | Mobile cart summary, install prompt, notification opt-in | Sheet | Rises from bottom. Radius 2xl top. Drag to dismiss. | spring-organic |
| Order stepper | Status change | Progress line, step dot | Line fills, dot morphs to check | ease-breathe, duration-moderate |
| Stock badge | Stock change | Badge | Width animates when the label changes. Tint flashes. | spring-snappy, stock-flash |
| Segmented toggle | Grid or list switch | Thumb | Shared layout | spring-snappy |
| Offline banner | Connection change | Banner | Height and opacity | duration-moderate |
| Hero organic shape | Ambient | SVG path | Path morphs on a 14 s loop at 50% opacity | ease-breathe, disabled under reduced motion |
| Toast | Action confirmed | Toast | Pill expands to message, collapses after 3.5 s | spring-organic |
| Loading | Submit | Button label | Label fades to `CircleNotch` spinner, width locked | duration-fast |

Rules: morphs express continuity, not decoration. Each morph has one origin element. No more than two morphs run at the same time in a viewport.

### 9.4 Organic motion principles

1. Motion starts at the element that was triggered and spreads outward.
2. Springs are used for interaction. Easings are used for opacity and color.
3. Overshoot stays at or below about 4%. Keep organic spring damping at 24 or higher.
4. Feedback starts within 100 ms. Enter animations finish within 360 ms.
5. Animate `transform` and `opacity`. Use Motion layout animations for width, height, and position changes.
6. Nothing animates on load in the checkout or payment flow. Those pages must feel immediate.

### 9.5 Reduced motion

When `prefers-reduced-motion: reduce` is set:

- All morphs become a 120 ms crossfade.
- Springs become `duration-fast` with `ease-standard`.
- The hero organic shape is static.
- The stock flash becomes an instant color change, with no fade.
- Skeleton pulse is replaced by a static muted block.
- Nothing loops.

### 9.6 Performance

- Wrap the app in `<LazyMotion features={domAnimation}>`. Use `domMax` only on pages with `layoutId` morphs (home, products, chat), and load it through a dynamic import so the cost stays on those routes.
- The hero shape pauses when off-screen (IntersectionObserver) and is disabled on `saveData` connections.
- No animation runs on the checkout payment polling screen except a single spinner.

---

## 10. Iconography

### 10.1 Rules

- Library: `@phosphor-icons/react`, named imports per file (tree-shaking).
- Weight: `regular` by default. `fill` for active, selected, or completed. `bold` only for spinner and emphasis icons. `duotone` and `thin` are not used.
- Color: `currentColor`. Decorative icon tiles use `--primary-subtle` background with `--primary-text` glyph.
- Sizes: see `icon-sm` to `icon-2xl` in 7.2.
- Accessibility: decorative icons get `aria-hidden="true"`. Icon-only buttons need `aria-label`. Status icons always appear with text.
- Transitions: an active nav item swaps `regular` to `fill` with a crossfade. It does not jump.

### 10.2 Icon map (`src/styles/icons.ts`)

Verify each name against the installed `@phosphor-icons/react` version before use (decision D7).

| Domain | Phosphor icon | Domain | Phosphor icon |
| --- | --- | --- | --- |
| Seeds | `Grains` | Cart | `ShoppingCartSimple` |
| Fertilizers | `Flask` | Store, locator | `Storefront` |
| Pesticides | `Bug` | Delivery | `Truck` |
| Animal feed | `BowlFood` | Pickup | `Package` |
| Veterinary | `FirstAid` | Orders | `ClipboardText` |
| Farm tools | `Wrench` | Chat | `ChatCircleDots` |
| Irrigation | `Drop` | Announcements | `Megaphone` |
| Plants, gardening | `Plant` | Notifications | `Bell` |
| Map pin | `MapPin` | Reports | `ChartBar` |
| Inventory | `Cube` | Users | `Users` |
| Search | `MagnifyingGlass` | Offline | `WifiSlash` |
| Success | `CheckCircle` | Warning | `Warning` |
| Error or out of stock | `XCircle` | Archive | `Archive` |
| Restore | `ArrowCounterClockwise` | Loading | `CircleNotch` (spin) |

---

## 11. Component Tokens

All components are built from wrappers in `src/components/ui/`. Each uses semantic tokens only.

| Component | Shape | Fill | Text | Size and padding | Motion |
| --- | --- | --- | --- | --- | --- |
| **Button, primary** | radius-full | `--primary`, hover `--primary-hover`, pressed `--primary-pressed` | `--on-primary`, label | md: 44 px, 20 px horizontal | Press scale 0.98, spring-snappy |
| **Button, accent** | radius-full | `--accent`, hover `--accent-hover` | `--on-accent`, label | md: 44 px | Same as primary |
| **Button, secondary** | radius-full | `--primary-subtle` | `--primary-text`, label | md: 44 px | Fill eases in, duration-fast |
| **Button, ghost** | radius-full | Transparent. Hover `--bg-muted`. | `--fg-default`, label | md: 44 px, 16 px horizontal | Fill eases in |
| **Button, danger** | radius-full | `--danger-fill`, hover `--danger-hover` | `--on-danger`, label | md: 44 px | Press scale |
| **Input** | radius-md | `--bg-surface` (light), field edge 1 px inset | `--fg-default`. Placeholder `--fg-subtle`. | md: 44 px, 14 px horizontal, 16 px text | Focus ring |
| **Select** | radius-md | Same as input | Same as input | md: 44 px | Menu uses elevation-float, radius-sm items |
| **Chip (filter)** | radius-full | `--bg-muted`. Selected: `--primary-subtle` with check. | `--fg-default`, selected `--primary-text` | 36 px, 14 px horizontal, 14 px text | Background morphs |
| **Status badge** | radius-full | Per status (see 11.1) | Per status | 24 px, 10 px horizontal, caption | None |
| **Stock indicator** | radius-full | In stock: `--primary-subtle`. Low: `--warning-subtle`. Out: `--danger-subtle`. | Matching text token, always with icon and label | 24 px, 10 px horizontal | Width morphs on change, stock-flash |
| **Segmented control** | radius-full | Track `--bg-muted`. Thumb `--bg-surface`. | `--fg-default` | Track 40 px, 4 px padding | Shared layout thumb |
| **Tabs** | radius-full | Track none. Active pill `--bg-surface` on `--bg-muted` track. | `--fg-muted`, active `--fg-default` | 40 px | Shared layout pill |
| **Stepper** | Line 2 px (fill, not border) | Track `--bg-muted`. Progress `--primary`. | Caption | Dot 24 px | Line fill ease-breathe, dot to check morph |
| **ProductCard** | radius-xl | `--bg-surface` (the only catalog card) | Name `heading-sm`, price `numeric` | Padding 12 px. Image radius-lg, 1:1 | Image scale 1.03 on hover, duration-slow |
| **Price** | None | None | `numeric`, `--fg-default` | Inline | None |
| **Bottom sheet** | radius-2xl (top) | `--bg-surface`, elevation-float | `--fg-default` | Max height 88 vh | spring-organic |
| **Dialog** | radius-2xl | `--bg-surface`, elevation-float, `--overlay` scrim | `--fg-default` | Max width 560 px | Scale 0.97 to 1, spring-organic |
| **Toast** | radius-full | `--bg-inverse` | `--on-inverse` | 48 px, 20 px horizontal | Pill to message morph |
| **Offline banner** | None (full width) | `--bg-warm` | `--warning-text` | 40 px | Height morph, duration-moderate |
| **Chat launcher** | radius-full, 56 px | `--primary` | `--on-primary` | 56 px | Morphs into panel |
| **Chat panel** | radius-2xl | `--bg-surface`, elevation-float | `--fg-default` | 380 × 560 px desktop, full-screen mobile | spring-organic |
| **Chat bubble, customer** | radius-xl, 6 px tail corner | `--primary` | `--on-primary` | 12 px / 16 px | Enter, ease-enter |
| **Chat bubble, store** | radius-xl, 6 px tail corner | `--bg-muted` | `--fg-default` | 12 px / 16 px | Enter, ease-enter |
| **Map container** | radius-lg | None (media) | None | 16:10 | None |
| **Admin table** | None | Zebra `--bg-muted`. Hover `--bg-tint`. | Header `caption` in `--fg-muted` | Row 40 px (compact) | None |
| **Empty state** | None | Canvas | `heading-sm`, `body-md`, icon 48 px on `--primary-subtle` circle | Centered | Fade, duration-base |
| **Skeleton** | radius-md | `--bg-muted` | None | Matches target | Opacity pulse 0.5 to 1, ease-breathe, 1.6 s |

### 11.1 Status badge mapping

| Order status | Fill | Text | Icon |
| --- | --- | --- | --- |
| Pending | `--accent-subtle` | `--accent-text` | `Clock` |
| Paid | `--primary-subtle` | `--primary-text` | `CheckCircle` |
| Preparing | `--bg-muted` | `--fg-default` | `Cube` |
| Out for delivery | `--primary-subtle` | `--primary-text` | `Truck` |
| Completed | `--primary` | `--on-primary` | `CheckCircle` (fill) |
| Cancelled | `--danger-subtle` | `--danger-text` | `XCircle` |

The four semantic hues stay within the brand: green for progress and success, harvest for attention, ink for neutral, rust for negative.

### 11.2 Button wrapper (reference implementation)

```tsx
// src/components/ui/Button.tsx
import { motion, type HTMLMotionProps } from "motion/react";
import { CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useSpringPreset } from "@/styles/tokens/motion";

const variants = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed",
  accent: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "bg-primary-subtle text-primary-text hover:bg-primary-subtle/70",
  ghost: "bg-transparent text-fg hover:bg-muted",
  danger: "bg-danger-fill text-on-danger hover:bg-danger-hover",
} as const;

type Props = HTMLMotionProps<"button"> & {
  variant?: keyof typeof variants;
  loading?: boolean;
};

export function Button({ variant = "primary", loading, disabled, className, children, ...rest }: Props) {
  const press = useSpringPreset("snappy");
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      transition={press}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5",
        "font-sans text-[length:var(--text-label)] font-semibold",
        "transition-colors duration-(--duration-fast) ease-standard",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
        "disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <CircleNotch size={20} weight="bold" className="animate-spin" aria-hidden /> : children}
    </motion.button>
  );
}
```

---

## 12. Canvas-First Page Patterns

| Page (blueprint 7.1) | Canvas treatment | Surfaces allowed | Signature motion |
| --- | --- | --- | --- |
| **Home** `/` | Hero on `--bg-tint` with the organic shape. Featured categories as a canvas row. Store info as typographic blocks. | Pinned announcement (feature), ProductCards | Hero headline staggered enter. Organic shape ambient. |
| **Products** `/products` | Sticky filter bar on canvas (solid, no blur). Grid of ProductCards. | ProductCard only | Segmented grid/list. Filter chips morph. |
| **Product detail** `/products/:id` | Split canvas: image left (no frame), details right. Price in `numeric`. | None on desktop. Related products as ProductCards. | Image shared layout from grid tile. Add to cart morph. |
| **Cart** `/cart` | Item list on canvas. Rows separated by spacing, no dividers. | Order summary panel (sticky, desktop) | Quantity change: numeric roll (snappy). Removal: collapse. |
| **Checkout** `/checkout` | Four-step stepper: Fulfillment, Address and map pin, Payment, Review. One step on canvas at a time. | Order summary panel | Stepper fill. Map pin drop (organic). |
| **Account** `/account` | Section tabs as segmented control. Order history as canvas rows with status badge and tracker. | None | Tab indicator morph. Tracker fill. |
| **Announcements** `/announcements` | Editorial list. Dates in caption, titles in heading-md. | One feature for the pinned item | Enter on scroll (once). |
| **Contact** `/contact` | Full-width map at radius-lg inside canvas margins. Address and hours typographic. | None | None |
| **Admin** `/admin/*` | Dense canvas with `density="compact"`. Tables without borders. KPIs typographic. | Dialogs and sheets only | Minimal. Row actions fade in. |
| **Chat** (floating) | Panel overlays content. Launcher bottom-right. | Chat panel (overlay) | Launcher to panel morph |

---

## 13. Interaction States

| State | Visual change | Motion | Notes |
| --- | --- | --- | --- |
| **Hover** (pointer only) | Fill steps one level (600 to 700). Ghost gets `--bg-muted`. | duration-instant | Never applied on touch devices |
| **Pressed** | Scale 0.98. Pressed color. | spring-snappy | Starts immediately (under 100 ms) |
| **Focus-visible** | 2 px ring, 2 px offset | duration-fast | Never removed. Shown for keyboard focus only. |
| **Selected** | Subtle fill, primary text, check icon | Morph | Selection never relies on color alone |
| **Disabled** | 40% opacity, pointer events off | None | Show the reason in text nearby (for example, the offline message at checkout) |
| **Loading** | Label becomes spinner. Width locked. | duration-fast | Use skeletons for lists and spinners for actions |
| **Error** | `--danger-subtle` message block, `--danger-text`, `XCircle` icon. Field ring in `--danger-fill`. | duration-fast, 2 px spring nudge on field | Error text is always visible, not just a color change |
| **Success** | `--primary-subtle` with `CheckCircle` | ease-enter | Toast for global confirmations |
| **Live update** (stock or price changed) | Background flashes `--primary-subtle` to transparent | duration-stock-flash | Announced with `aria-live="polite"` |
| **Stale or offline** | Caption "Updated 14:05 · offline" in `--fg-muted` | None | See section 15 |

---

## 14. Accessibility Requirements

- Target WCAG 2.2 AA across the storefront and admin.
- Contrast follows section 5.3 and 5.4. Each new pairing is checked before use.
- Touch targets are at least 44 × 44 px on mobile.
- Focus is always visible and never removed.
- Color is never the only signal. Every status has an icon and a text label.
- Motion respects `prefers-reduced-motion` (section 9.5).
- Layouts reflow at 320 px width and at 200% text zoom without horizontal scrolling (admin tables scroll inside their own region).
- Live regions: chat messages use `aria-live="polite"`. Stock changes use `aria-live="polite"`. Errors use `role="alert"` when they block an action.
- Icon-only buttons have an `aria-label` and a tooltip.
- Admin is fully keyboard operable.
- Language attribute is set on `<html>`. Content is English or Filipino, both in the Latin script.

---

## 15. PWA and Offline Visuals

| Element | Spec |
| --- | --- |
| Offline banner | Full width, `--bg-warm`, `--warning-text`, `WifiSlash` icon. Height morphs in. Dismisses automatically when back online. |
| Stale data label | Caption "Updated [time] · offline" in `--fg-muted` beside stock and price |
| Disabled offline actions | 40% opacity, plus a sentence explaining why (checkout, chat, admin writes) |
| Install prompt | Bottom sheet using the Button primary and ghost variants |
| Notification opt-in | Bottom sheet, one primary action, one ghost action |
| Manifest | `theme_color: #2D6F47` (green-600). `background_color: #F5F7F7` (ink-50). `display: standalone`. |
| Icons | 192 and 512 px. Maskable variant on a green-600 field with the AgriMart mark in `--on-primary`. |

---

## 16. Design Requirements (testable)

| ID | Requirement | Verified by |
| --- | --- | --- |
| **Color** | | |
| DR-C1 | Components reference semantic tokens only. Primitives never appear in components. | Lint rule plus code review |
| DR-C2 | Brand uses three bases (Ink, Field Green, Harvest). Rust appears only for errors, destructive actions, and out-of-stock. | Design review |
| DR-C3 | Each screen stays within the 60/30/10 proportion (ink and canvas at least 55%, green at most 30%, harvest at most 10%) | Screenshot review |
| DR-C4 | Text meets 4.5:1. Large text meets 3:1. Icons, focus rings, and field edges meet 3:1. | Automated contrast check plus manual spot check |
| DR-C5 | Color is never the only signal for status | Manual check, grayscale screenshot test |
| DR-C6 | Every screen is verified in light and dark, once dark mode is enabled | QA checklist |
| **Typography** | | |
| DR-T1 | Only Sora and Manrope are used | Build check on loaded fonts |
| DR-T2 | Body and input text are at least 16 px on mobile | Manual check |
| DR-T3 | Prices, stock counts, and totals use tabular numerals | Code review |
| DR-T4 | Paragraph lines are 45 to 75 characters | Manual check |
| DR-T5 | Each section has at most one eyebrow label | Design review |
| **Layout and shape** | | |
| DR-L1 | Canvas is the default. Surfaces appear only from the list in 8.5. | Design review |
| DR-L2 | No borders except field edges and focus rings | Code review |
| DR-L3 | No nested surfaces. No shadows except `elevation-float`. | Code review |
| DR-L4 | Touch targets are at least 44 × 44 px on mobile | Lighthouse and manual check |
| DR-L5 | Spacing uses only the space scale | Lint rule |
| DR-L6 | Radii use only the radius scale. Buttons, chips, and badges are fully rounded. | Lint rule |
| **Motion** | | |
| DR-M1 | Every animation references a duration, easing, or spring token | Lint rule |
| DR-M2 | Only `transform` and `opacity` animate directly. Size and position changes use layout animation. | Code review |
| DR-M3 | State changes between related elements use shared-layout morphs | Design review |
| DR-M4 | Reduced motion is respected on every animated component | Test with OS setting enabled |
| DR-M5 | No animation longer than 600 ms except the ambient hero shape | Code review |
| DR-M6 | Feedback starts within 100 ms of input | Manual check with throttled CPU |
| **Icons** | | |
| DR-I1 | Phosphor only. Regular by default, fill for active or selected. | Lint rule |
| DR-I2 | Icon-only controls have an `aria-label` | Accessibility audit |
| **Components** | | |
| DR-K1 | coss ui and Base UI components are imported only through `components/ui/` wrappers | Lint rule |
| DR-K2 | No Radix imports in new code | Lint rule |
| DR-K3 | Third-party components pass the license and restyling checks in R4 | Review before merge |
| **Accessibility and PWA** | | |
| DR-A1 | WCAG 2.2 AA on storefront and admin | Accessibility audit |
| DR-A2 | No action appears to succeed while offline. Offline state is always visible. | Offline test (blueprint QA) |
| DR-A3 | Chat messages and stock changes are announced to screen readers | Screen reader test |
| **Performance** | | |
| DR-P1 | Fonts: two self-hosted variable files, Latin subset, `font-display: swap`, one weight range each | Build report |
| DR-P2 | Motion loads `domAnimation` globally and `domMax` only on morph routes | Bundle analysis |
| DR-P3 | Compiled CSS stays within 30 KB gzipped (target) | Build report |

---

## 17. Implementation Reference

### 17.1 File layout

```
frontend/src/styles/
  tokens/
    primitive.css     # one custom property per cell in section 5.1
    semantic.css      # light and dark role tokens (below)
    component.css     # optional, keep minimal
    motion.ts         # Motion presets mirroring CSS tokens
  theme.css           # Tailwind v4 @theme bindings (below)
  icons.ts            # domain and status to Phosphor icon map
frontend/src/components/ui/   # coss ui and Base UI wrappers (only import point)
frontend/src/lib/cn.ts        # clsx + tailwind-merge helper
```

### 17.2 `tokens/primitive.css` (excerpt)

```css
:root {
  --ink-50: #F5F7F7;
  --ink-100: #E9EEEE;
  /* ... one line per cell in section 5.1 ... */
  --green-600: #2D6F47;
  --harvest-500: #D68A1E;
  --rust-600: #A63A24;
}
```

### 17.3 `tokens/semantic.css`

```css
:root,
[data-theme="light"] {
  color-scheme: light;

  --bg-canvas: var(--ink-50);
  --bg-surface: #FFFFFF;
  --bg-muted: var(--ink-100);
  --bg-tint: var(--green-50);
  --bg-warm: var(--harvest-50);
  --bg-inverse: var(--ink-900);

  --fg-default: var(--ink-900);
  --fg-muted: var(--ink-600);
  --fg-subtle: var(--ink-500);
  --on-primary: #FFFFFF;
  --on-accent: var(--ink-950);
  --on-danger: #FFFFFF;
  --on-inverse: var(--ink-50);

  --primary: var(--green-600);
  --primary-hover: var(--green-700);
  --primary-pressed: var(--green-800);
  --primary-subtle: var(--green-100);
  --primary-text: var(--green-700);

  --accent: var(--harvest-500);
  --accent-hover: var(--harvest-600);
  --accent-subtle: var(--harvest-100);
  --accent-text: var(--harvest-700);

  --success-text: var(--green-700);
  --warning-text: var(--harvest-700);
  --warning-subtle: var(--harvest-100);
  --danger-fill: var(--rust-600);
  --danger-hover: var(--rust-700);
  --danger-subtle: var(--rust-50);
  --danger-text: var(--rust-600);

  --focus-ring: var(--green-600);
  --field-edge: var(--ink-500);
  --overlay: rgb(12 18 20 / 0.45);
  --elevation-float: 0 16px 40px -16px rgb(12 18 20 / 0.28);

  --duration-instant: 90ms;
  --duration-fast: 160ms;
  --duration-base: 240ms;
  --duration-moderate: 360ms;
  --duration-slow: 520ms;
  --duration-morph: 640ms;
  --duration-stock-flash: 900ms;
}

[data-theme="dark"] {
  color-scheme: dark;

  --bg-canvas: var(--ink-950);
  --bg-surface: var(--ink-900);
  --bg-muted: var(--ink-800);
  --bg-tint: var(--green-950);
  --bg-warm: var(--harvest-950);
  --bg-inverse: var(--ink-50);

  --fg-default: var(--ink-50);
  --fg-muted: var(--ink-300);
  --fg-subtle: var(--ink-400);
  --on-primary: var(--ink-950);
  --on-accent: var(--ink-950);
  --on-danger: var(--ink-50);
  --on-inverse: var(--ink-900);

  --primary: var(--green-400);
  --primary-hover: var(--green-300);
  --primary-pressed: var(--green-200);
  --primary-subtle: var(--green-900);
  --primary-text: var(--green-300);

  --accent: var(--harvest-400);
  --accent-hover: var(--harvest-300);
  --accent-subtle: var(--harvest-900);
  --accent-text: var(--harvest-300);

  --success-text: var(--green-300);
  --warning-text: var(--harvest-300);
  --warning-subtle: var(--harvest-900);
  --danger-fill: var(--rust-500);
  --danger-hover: var(--rust-400);
  --danger-subtle: var(--rust-950);
  --danger-text: var(--rust-300);

  --focus-ring: var(--green-400);
  --field-edge: var(--ink-500);
  --overlay: rgb(12 18 20 / 0.7);
  --elevation-float: 0 16px 40px -12px rgb(0 0 0 / 0.6);
}
```

### 17.4 `theme.css` (Tailwind v4)

```css
@import "tailwindcss";
@import "./tokens/primitive.css";
@import "./tokens/semantic.css";

@theme inline {
  /* Surfaces */
  --color-canvas: var(--bg-canvas);
  --color-surface: var(--bg-surface);
  --color-muted: var(--bg-muted);
  --color-tint: var(--bg-tint);
  --color-warm: var(--bg-warm);
  --color-inverse: var(--bg-inverse);

  /* Foreground */
  --color-fg: var(--fg-default);
  --color-fg-muted: var(--fg-muted);
  --color-fg-subtle: var(--fg-subtle);
  --color-on-primary: var(--on-primary);
  --color-on-accent: var(--on-accent);
  --color-on-danger: var(--on-danger);
  --color-on-inverse: var(--on-inverse);

  /* Brand and status */
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-pressed: var(--primary-pressed);
  --color-primary-subtle: var(--primary-subtle);
  --color-primary-text: var(--primary-text);
  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-subtle: var(--accent-subtle);
  --color-accent-text: var(--accent-text);
  --color-success-text: var(--success-text);
  --color-warning-text: var(--warning-text);
  --color-warning-subtle: var(--warning-subtle);
  --color-danger-fill: var(--danger-fill);
  --color-danger-hover: var(--danger-hover);
  --color-danger-subtle: var(--danger-subtle);
  --color-danger-text: var(--danger-text);

  /* Interaction */
  --color-focus-ring: var(--focus-ring);
  --color-field-edge: var(--field-edge);

  /* Type */
  --font-display: "Sora Variable", ui-sans-serif, system-ui, sans-serif;
  --font-sans: "Manrope Variable", ui-sans-serif, system-ui, sans-serif;

  /* Shape */
  --radius-xs: 6px;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --radius-2xl: 36px;

  /* Elevation */
  --shadow-float: var(--elevation-float);

  /* Motion */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --ease-breathe: cubic-bezier(0.65, 0, 0.35, 1);
}
```

Primitive colors are declared outside `@theme`, so they never become utilities.

### 17.5 `tokens/motion.ts`

```ts
import { useReducedMotion } from "motion/react";

// Durations in seconds (Motion's unit). Mirrors --duration-* in semantic.css.
export const duration = {
  instant: 0.09,
  fast: 0.16,
  base: 0.24,
  moderate: 0.36,
  slow: 0.52,
  morph: 0.64,
  stockFlash: 0.9,
} as const;

// Mirrors --ease-* in theme.css.
export const ease = {
  standard: [0.2, 0, 0, 1],
  enter: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
  breathe: [0.65, 0, 0.35, 1],
} as const;

export const spring = {
  snappy: { type: "spring", stiffness: 420, damping: 34, mass: 0.9 },
  organic: { type: "spring", stiffness: 260, damping: 24, mass: 1 },
  gentle: { type: "spring", stiffness: 160, damping: 26, mass: 1.1 },
} as const;

const reduced = { duration: 0.12, ease: ease.standard } as const;

export type SpringName = keyof typeof spring;

// Use inside components: respects prefers-reduced-motion automatically.
export function useSpringPreset(name: SpringName) {
  const reduce = useReducedMotion();
  return reduce ? reduced : spring[name];
}
```

---

## 18. Assumptions and Open Decisions

| ID | Item | Decision or action | Status |
| --- | --- | --- | --- |
| **D1** | **Rust signal vs. the 2–3 base color rule.** Errors need a red that does not read as brand. | Keep Rust as a single semantic signal, used only for errors, destructive actions, and out-of-stock. Alternative under strict three-color rule: errors use harvest-700 with an `XCircle` icon. That is weaker for error recognition. | **Recommend keeping Rust** |
| **D2** | **coss ui install model and primitive layer.** Verified 11 Nov 2026: npm `coss-ui` is a 0.0.0 placeholder, so coss ui can only be copy-in source. Base UI ships as `@base-ui/react` 1.9.0 (MUI team, `github.com/mui/base-ui`); the older `@base-ui-components/react` name is still 1.0.0-rc.0. | Decided: coss ui is copy-in, and `frontend/src/components/ui/` is that copy-in point. The primitive layer is `@base-ui/react`, imported only inside those wrappers (R1). Radix is not installed (R3). | **Decided** |
| **D3** | **Pantone matches.** Hex values are web approximations. | Confirm each base against Pantone Connect or a physical swatch before print, signage, or packaging. | **[CONFIRM]** |
| **D4** | **Typeface.** Sora and Manrope chosen for geometric, modern, corporate tone. | If rounder terminals are needed in display type, swap Sora for Rubik. Font tokens are the only change required. | Open |
| **D5** | **Dark mode scope.** Tokens are defined now. | Ship light mode first. Enable dark mode in Phase 5 (blueprint), after light-mode QA passes. | Planned |
| **D6** | **Premium third-party components** (Magic UI, Animate UI, Origin UI). | Evaluate per component. Default scope: home hero and marketing effects only. Check license, bundle size, and restyling cost first. | **[CONFIRM]** |
| **D7** | **Icon names.** Names in section 10 are assumed to match the Phosphor version in use. | Verify every name against the installed `@phosphor-icons/react` version when `icons.ts` is written. | **[CONFIRM]** |
| **D8** | **Logo and wordmark.** Not defined in the blueprint. | Create the AgriMart mark in a later brand pass. Until then, use a Sora 600 wordmark in `--fg-default`. | Open |
| **D9** | **Tailwind version.** Blueprint says Tailwind. | Pinned to Tailwind v4 for `@theme` and CSS-first tokens. | Decided |
| **D10** | **Font loading.** Blueprint does not specify. | Self-hosted through fontsource. Precached by the service worker for offline use. | Decided |

---

*End of document. Changes to tokens go through a pull request that updates this file and `tokens/*.css` together.*
