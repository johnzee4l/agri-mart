# AgriMart Design Tokens

| Field | Value |
| --- | --- |
| Version | 2.0 (replaces 1.0) |
| Date | 13 Nov 2026 |
| Source | `blueprint.md` (sections 1, 2, 6, 7.1, 9, 11) and 17 UI references (section 1.2) |
| Framework | React 18+ (Vite), Tailwind CSS v4 |
| Component base | coss ui (Base UI primitives), restyled through tokens |
| Signature elements | Kokonut UI (8 components, section 3.2), copied in and restyled through tokens |
| Icons | Phosphor (`@phosphor-icons/react`) |
| Motion | Motion (`motion/react`) |
| Owner | Member 1 (`frontend/src/styles`). Member 3 consumes the same tokens in `frontend/src/admin`. |

How to read this file: tokens are the only source of visual values. Components never use raw hex, px, or ms values. Items marked **[CONFIRM]** are listed in section 18.

**What changed from 1.0:** the canvas goes from cool grey to warm paper. "Zero cards" becomes a **bento tile system** with strict rules. Radii get larger and concentric. Pastel tint tiles, a furrow hatch pattern, and a seed-grid backdrop are added. Kokonut UI supplies eight signature elements. The brand accent token is renamed `--highlight` so it no longer collides with shadcn's `--accent`. Migration notes are in section 19.

---

## 1. Design Direction

**Positioning:** a trusted agricultural supply house with the warmth of a market stall and the precision of good software. Warm paper at rest. Soft, bento-shaped, and fast in motion.

**One memorable thing:** the **furrow hatch**. The diagonal hatching seen on the unfilled part of charts and gauges in the references becomes AgriMart's signature texture (crop rows seen from above). It marks "remaining", "previous period", and "out of stock" everywhere. Everything else stays quiet.

### 1.1 Brief translated into decisions

| Brief term | Translated as |
| --- | --- |
| Professional, corporate | Warm-neutral ink, strict type scale, restrained palette, no ornament beyond the furrow hatch |
| Clean, minimal | Few elements per screen. One tile type per job. |
| Premium | Big concentric radii, large display type, slow-settling springs |
| High-octane | Oversized headlines, one saturated fill per region, snappy spring feedback |
| Modern, next-gen | Geometric sans, bento layout, morphing controls (Kokonut UI) |
| Canvas-first | Paper canvas with tiles placed on it. Tone separates, lines do not. |
| Flat design | No shadows at rest, no glass, no gradients in chrome. Tints are flat fills. |
| Natural, organic animation | Springs that start at the triggered element. Hand-drawn annotation on the hero only. |

### 1.2 Reference trace (what each image contributes)

| # | Reference | Taken | Becomes |
| --- | --- | --- | --- |
| 1 | Sneaker card A/B | Variant B (clean) wins over A (gradient glass). Compact variant picker, priced add-to-cart bar. | Rule: no glass. `AddToCart` (11.3). Pack-size picker (11.2). |
| 2 | Shell chair | One loud yellow against white. Underline tabs. Colour dots. "You may also like" thumb row. | Harvest as the single loud fill. Underline tabs. Related row. |
| 3 | Merano chair | Cream canvas, white tile with huge radius, inset tiles under the image (size, rating, heart, bag), dark discount pill, struck price. | `ProductTile` and `InsetChip` (11.2). Concentric radii (8.1). |
| 4 | Healthy dashboard | Tinted app window, sidebar with white active pill, three tinted KPI tiles, ghost bars with one active bar, dashed threshold with pill, progress rings in a table, status pills. | Admin shell (12), `ghost-bars` and reorder line (11.4), ring progress, status badges. |
| 5 | Fintech bento | Black tile beside mint and lavender tiles, hatched remainder, semi-gauge, vertical timeline, rounded stacked bars. | `tile-inverse`, `tile-mint`, `tile-bloom`, furrow hatch (8.6), gauge, season timeline (12). |
| 6 | Twisty dashboard | Lollipop chart with capsule day selector, tick-mark progress, pill avatars list, textured promo tile. | `lollipop` chart, `tick-meter` for stock, halftone promo tile (8.6). |
| 7 | Dira landing | Dotted paper grid, pill nav with logo disc, huge two-line headline, floating tags with cursors, orange pill CTA. | `seed-grid` (8.6), `FloatNav` (11.2), hero tags, `display-2xl`. |
| 8 | BrandLyft landing | Cream hero, handwritten arrows, curved strip of tilted rounded tiles, dashed halo on CTA. | `annotation` font (6.1), tilt strip (12), hero CTA halo (8.4). |
| 9 | ACME wireframe | Add-to-cart bar sliding up over the image on hover, round carousel arrows. | Hover reveal bar on pointer devices (11.2, 13). |
| 10 | Kokonut liquid-gauge | Liquid fill gauge | Stock level on product detail and admin inventory |
| 11 | Kokonut receipt-printer | Printed receipt, pull to tear | Order confirmation |
| 12 | Kokonut metric-card | KPI, range toggle, sparkline vs previous period, share bar | Admin revenue tile |
| 13 | Kokonut smooth-drawer | Bottom drawer with total and Pay | Mobile order summary |
| 14 | Kokonut file-upload | Dashed drop zone | Admin product image upload |
| 15 | Kokonut morph-popover | Button morphs into a textarea | Chat launcher, "Request a product" |
| 16 | Kokonut save-button | Bookmark morph | Save product |
| 17 | Kokonut cart-button | Add morphs into a quantity stepper | Cart rows and product tiles |

### 1.3 Principles

1. **Paper first, tiles second.** Pages sit on warm paper. A tile is a bounded surface that has a job (section 8.5).
2. **Tone, not lines.** Tiles separate from paper by tone and tint. No borders, no shadows at rest.
3. **Big, concentric radii.** Outer shapes are generous. Inner shapes follow the outer radius minus the padding.
4. **One loud fill per region.** Green means act. Harvest means highlight. A tint tile means "this is data or a feature". Ink means read.
5. **Furrow for the unfilled.** Anything remaining, previous, or unavailable gets the hatch.
6. **Geometric form, organic motion.** Shapes are rounded geometry. Motion is spring based and starts where the tap happened.
7. **Accessible by default.** Every pairing is tested. Color is never the only signal.

### 1.4 Anti-patterns

- Default shadcn or coss gray bordered cards, default radii, or default shadows
- Glassmorphism and blurred gradients (reference 1 variant A is rejected)
- Purple or blue gradient heroes. Lavender (Bloom) is for data only.
- Identical cards for everything. Tiles vary in size, tint, and radius role.
- Inter-only typography, stock icon tiles, stock illustrations
- Bordered tables with hairlines on every row
- More than one inverse (dark) tile in the same viewport

---

## 2. Brand Palette

Four brand bases plus two supporting scales. Rust is a signal only. Bloom is data-only.

| Base | Role | Share of screen | Personality | Anchor hex |
| --- | --- | --- | --- | --- |
| **Soil** (warm neutral) | Paper canvas, text, inverse tile | about 60% | Earth, calm, trust | `#776F5D` (soil-500) |
| **Field Green** | Primary action, brand | about 25% | Growth, reliability | `#2D6F47` (green-600) |
| **Harvest** | Highlight, promo, featured | about 10% | Yield, sun, attention | `#D68A1E` (harvest-500) |
| **Sprout** (fill-only) | Mint feature and data tiles | up to 5% with Bloom | Fresh growth | `#B5EC96` (sprout-300) |
| **Bloom** (data-only) | Second chart series, one tile at most | up to 5% with Sprout | Contrast against green | `#8473D6` (bloom-500) |
| **Rust** (signal only) | Errors, destructive, out-of-stock | Only when needed | Warning without alarm | `#C2472F` (rust-500) |

Anchor hex values are web approximations. Confirm Pantone matches before print or signage (D3).

### 2.1 Scale roles

| Steps | Role |
| --- | --- |
| 50 to 200 | Tints for surfaces, tiles, and selected states |
| 300 to 400 | Decorative fills, illustration, dark-mode text and fills |
| 500 | Fills and graphics. Soil-500 is also allowed as text on white and paper (4.98 and 4.69). Others never text. |
| 600 to 700 | Text, links, and action fills |
| 800 to 950 | Dark-mode surfaces, inverse tile, high-contrast text |

Sprout ships steps 100 to 500 only. Bloom ships 100 to 700 and 900 only.

---

## 3. Stack and Dependency Rules

| Layer | Package | Role | Rule |
| --- | --- | --- | --- |
| UI runtime | React 18+, Vite | Application | Route-level code splitting (blueprint NFR: 3 s load) |
| Styling | Tailwind CSS v4 | Utilities bound to tokens through `@theme` | Only semantic tokens become utilities |
| Base components | **coss ui** (`coss.com/ui`, formerly Origin UI) | Buttons, inputs, selects, dialogs, tabs, toggles, toast, and similar | Copy-in source, imported only through `components/ui/*` wrappers |
| Headless primitives | Base UI (`@base-ui/react`) | Behavior under coss ui | Behavior only. Look comes from tokens. |
| Patterns | coss ui "particles" (the successor to Origin UI snippets) | Starting layouts for forms, filters, tables, empty states | Copy and restyle. Never imported at runtime. |
| Signature elements | **Kokonut UI** | Eight components (3.2) | Copy-in through the shadcn CLI, then moved behind wrappers and restyled |
| Complex widgets | React Aria Components | Combobox, date picker, only where Base UI lacks the widget | Fallback only |
| Icons | Phosphor | All iconography | Named imports. Kokonut's `lucide-react` imports are swapped (10.3). |
| Motion | Motion (`motion/react`) | Springs, layout morphs, gestures | `LazyMotion` (9.6) |
| Fonts | `@fontsource-variable/sora`, `@fontsource-variable/manrope`, `@fontsource/caveat` (hero only) | Self-hosted | No third-party CSS host at runtime |
| Legacy | Origin UI legacy snapshot | Visual reference only | Radix-based and in limited maintenance. Do not install. |
| Excluded | Radix primitives | Not used | Default skins are the look this brief rejects |

### 3.1 Rules

- **R1.** coss ui, Base UI, and Kokonut code is imported only through local wrappers in `src/components/ui/` (coss) and `src/components/signature/` (Kokonut). A look change happens in one place.
- **R2.** No default coss, Kokonut, or shadcn styling reaches a screen: no gray borders, default radii, default shadows, or hard-coded colors.
- **R3.** No Radix imports in new code. If a copied component pulls Radix, replace the primitive layer or pick another component.
- **R4.** Every copied component passes a license check (MIT, Apache 2.0, or equivalent), is restyled to tokens, and loads nothing from a CDN at runtime.
- **R5.** Icons come only from Phosphor.
- **R6.** Fonts are self-hosted.
- **R7.** Copied components keep their API. Only class names, tokens, and icon imports change, so upstream fixes can still be diffed.
- **R8.** The shadcn compatibility layer (4.4) is the only place that knows shadcn variable names.

### 3.2 Kokonut UI components in use

Install with the shadcn CLI, one component at a time, then move the generated file into `src/components/signature/` and apply R7. The command form below is the one shown on each component's own page. Registry namespace shortcuts are optional **[CONFIRM]**.

| Component | AgriMart use | Install | Extra packages | Wrapper name |
| --- | --- | --- | --- | --- |
| `liquid-gauge` | Stock level on product detail and admin inventory rows | `npx shadcn@latest add https://kokonutui.com/r/liquid-gauge.json` | none | `StockGauge` |
| `receipt-printer` | Order confirmation after payment or COD | `npx shadcn@latest add https://kokonutui.com/r/receipt-printer.json` | none | `OrderReceipt` |
| `metric-card` | Admin revenue tile with range toggle and category share bar | `npx shadcn@latest add https://kokonutui.com/r/metric-card.json` | none | `RevenueTile` |
| `smooth-drawer` | Mobile order summary and pay drawer | `npx shadcn@latest add https://kokonutui.com/r/smooth-drawer.json` | `lucide-react`, `motion` | `SummaryDrawer` |
| `file-upload` | Admin product image upload (feeds `POST /uploads`) | `npx shadcn@latest add https://kokonutui.com/r/file-upload.json` | `lucide-react`, `motion` | `ImageDropzone` |
| `morph-popover` | Chat launcher to panel, "Request a product" note | `npx shadcn@latest add https://kokonutui.com/r/morph-popover.json` | `motion` | `MorphPanel` |
| `save-button` | Save product (wishlist) | `npx shadcn@latest add https://kokonutui.com/r/save-button.json` | `lucide-react`, `motion` | `SaveButton` |
| `cart-button` | Add morphing into a quantity stepper on tiles, detail, and cart rows | `npx shadcn@latest add https://kokonutui.com/r/cart-button.json` | `lucide-react`, `motion` | `CartButton` |

Notes:

- **Save product** needs a table the blueprint does not have. Until one is approved, `SaveButton` stores saved IDs in `localStorage`, like the cart (blueprint 3.2). **[CONFIRM]** (D11)
- **StockGauge** is fed by the live `stock` socket event (blueprint 6.3). It shows `stock_qty` against `reorder_level` and a max set per product in the UI.
- **OrderReceipt** prints the real order lines, fee, and total returned by `GET /orders/:id`. The demo "tear" interaction is optional. Reduced motion shows the finished receipt.
- `liquid-gauge`, `receipt-printer`, and `metric-card` ship with no extra packages, which keeps the bundle small.

---

## 4. Token Architecture

### 4.1 Three tiers

| Tier | Example | Who may reference it | File |
| --- | --- | --- | --- |
| **Primitive** | `--green-600: #2D6F47` | Only `semantic.css` | `tokens/primitive.css` |
| **Semantic** | `--primary: var(--green-600)` | Components, utilities, wrappers | `tokens/semantic.css`, `theme.css` |
| **Component** (optional) | `--control-md: 44px` | Component wrappers only | `tokens/component.css` |

Primitives never produce Tailwind utilities, so `bg-green-600` does not exist.

### 4.2 Naming convention

`--{group}-{role}[-{state}]`

| Group | Examples |
| --- | --- |
| Surfaces | `--bg-canvas`, `--bg-surface`, `--bg-muted`, `--bg-tint`, `--bg-warm` |
| Tiles | `--tile-surface`, `--tile-mint`, `--tile-sun`, `--tile-bloom`, `--tile-inverse` |
| Foreground | `--fg-default`, `--fg-muted`, `--fg-subtle`, `--on-primary`, `--on-highlight`, `--on-danger`, `--on-inverse` |
| Brand and status | `--primary`, `--primary-hover`, `--primary-subtle`, `--primary-text`, `--highlight`, `--danger-fill` |
| Data | `--viz-1` to `--viz-4`, `--viz-ghost` |
| Interaction | `--focus-ring`, `--field-edge`, `--overlay` |
| Pattern | `--pattern-furrow`, `--pattern-seed-grid`, `--pattern-halftone` |
| Type | `--font-display`, `--font-sans`, `--font-hand` |
| Space and size | `--space-4`, `--control-md`, `--tile-gap`, `--tile-pad-md` |
| Shape | `--radius-md` |
| Elevation | `--elevation-float` |
| Motion | `--duration-fast`, `--ease-enter` |
| Layering and density | `--z-overlay`, `--row-h` |

### 4.3 Enforcement

- Stylelint or ESLint: flag `#hex`, `rgb(`, and raw px or ms literals outside `src/styles/tokens/`.
- Review check: a component that needs a value not in this file adds the token here first.
- Tailwind compile check: primitive utilities do not exist, so using them fails the build.
- Copy-in check (R7): after copying a Kokonut or coss file, search it for `#`, `rgb`, `border-`, `shadow-`, `rounded-` literals and replace them with token utilities.

### 4.4 shadcn compatibility layer

Kokonut and coss components are written against shadcn variable names. Map those names to AgriMart tokens in one file (`tokens/compat.css`, section 17.5) so copied code works without edits to colors. Three mappings are deliberate:

| shadcn name | Maps to | Why |
| --- | --- | --- |
| `--accent` | `--bg-muted` | In shadcn, `accent` is a neutral hover surface. In AgriMart, Harvest is a brand color named `--highlight`, so `bg-accent` in copied code must not turn amber. |
| `--border` | `transparent` | Zero-border rule. Inputs keep their edge through `--input` (8.4). |
| `--secondary` | `--bg-muted` | Neutral secondary surface |

---

## 5. Color Tokens

### 5.1 Primitive scales

Hex values are shown without `#`.

| Step | Soil | Field Green | Harvest | Rust | Sprout | Bloom |
| --- | --- | --- | --- | --- | --- | --- |
| 50 | `FAF8F3` | `F1F7F2` | `FDF8EF` | `FBEFEB` | - | - |
| 100 | `F3EFE6` | `DDEEE1` | `FBEFD6` | `F6DCD3` | `EAF9E1` | `EEEBFB` |
| 200 | `E7E1D3` | `BCDDC5` | `F6DDA8` | `EDB8A8` | `D2F4BF` | `DDD7F7` |
| 300 | `D3CBB8` | `8FC49B` | `EFC670` | `E08D74` | `B5EC96` | `C2B8F0` |
| 400 | `AFA690` | `5FA675` | `E6A93E` | `D9644B` | `8FDD66` | `A294E6` |
| 500 | `776F5D` | `3D8A5A` | `D68A1E` | `C2472F` | `6CC93F` | `8473D6` |
| 600 | `625C4D` | `2D6F47` | `B06F14` | `A63A24` | - | `6654BD` |
| 700 | `4A453A` | `235A39` | `8C5510` | `8A2E1C` | - | `51429A` |
| 800 | `332F27` | `1B4630` | `6B410F` | `6E2416` | - | `3C3174` |
| 900 | `211E19` | `133222` | `4A2D0B` | `4F190F` | - | `28214F` |
| 950 | `12100D` | `0B1F15` | `2C1A06` | `2E0E08` | - | - |

### 5.2 Semantic tokens

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg-canvas` | soil-50 | soil-950 | Page paper. Default for every screen. |
| `--bg-surface` | `#FFFFFF` | soil-900 | Tiles, inputs, overlays |
| `--bg-muted` | soil-100 | soil-800 | Chips, input fill, inset chips, staff chat bubbles |
| `--bg-tint` | green-50 | green-950 | Hero band, one promotional band per page |
| `--bg-warm` | harvest-50 | harvest-950 | Offline banner, attention strip |
| `--tile-surface` | `#FFFFFF` | soil-900 | Default tile |
| `--tile-mint` | sprout-200 | green-900 | Feature and data tile (gauge, KPI) |
| `--tile-sun` | harvest-200 | harvest-900 | Promo and low-stock tile |
| `--tile-bloom` | bloom-200 | bloom-900 | Data tile, one per view at most |
| `--tile-inverse` | soil-900 | soil-100 | Hero data tile, sales tile. One per viewport. |
| `--fg-default` | soil-900 | soil-50 | Body and headings. Also text on every tint tile. |
| `--fg-muted` | soil-600 | soil-300 | Secondary text |
| `--fg-subtle` | soil-500 | soil-400 | Helper text, placeholders, timestamps, struck prices |
| `--on-primary` | `#FFFFFF` | soil-950 | Label on primary fill |
| `--on-highlight` | soil-950 | soil-950 | Label on highlight fill |
| `--on-danger` | `#FFFFFF` | soil-50 | Label on danger fill |
| `--on-inverse` | soil-50 | soil-900 | Text on inverse tile |
| `--primary` | green-600 | green-400 | Primary fill |
| `--primary-hover` | green-700 | green-300 | Primary hover |
| `--primary-pressed` | green-800 | green-200 | Primary pressed |
| `--primary-subtle` | green-100 | green-900 | Secondary fill, selected states |
| `--primary-text` | green-700 | green-300 | Links, selected labels, success text |
| `--highlight` | harvest-500 | harvest-400 | Highlight fill (promo badge, featured, loud CTA) |
| `--highlight-hover` | harvest-600 | harvest-300 | Highlight hover |
| `--highlight-subtle` | harvest-100 | harvest-900 | Highlight tint |
| `--highlight-text` | harvest-700 | harvest-300 | Highlight text |
| `--success-text` | green-700 | green-300 | Positive status text |
| `--warning-text` | harvest-700 | harvest-300 | Attention text |
| `--warning-subtle` | harvest-100 | harvest-900 | Low-stock and attention backgrounds |
| `--danger-fill` | rust-600 | rust-500 | Destructive fill |
| `--danger-hover` | rust-700 | rust-400 | Destructive hover |
| `--danger-subtle` | rust-50 | rust-950 | Error background |
| `--danger-text` | rust-600 | rust-300 | Error text |
| `--focus-ring` | green-600 | green-400 | Focus outline |
| `--field-edge` | soil-500 | soil-500 | Input edge (8.4) |
| `--overlay` | soil-950 at 45% | soil-950 at 70% | Scrim |
| `--viz-1` | green-600 | green-400 | Primary series |
| `--viz-2` | bloom-500 | bloom-400 | Second series |
| `--viz-3` | harvest-600 | harvest-400 | Third series |
| `--viz-4` | soil-500 | soil-300 | Fourth series, neutral |
| `--viz-ghost` | soil-300 | soil-700 | Hatch lines for unfilled areas |

Series on a tint tile or the inverse tile use the rules in 5.4 (rule 7).

### 5.3 Contrast matrix (computed with the WCAG 2.x formula)

| Text or graphic | Background | Ratio | Result | Use |
| --- | --- | --- | --- | --- |
| `#FFFFFF` | green-600 | 6.04 | AA text | Primary label |
| `#FFFFFF` | green-500 | 4.22 | Fails text | Graphics only |
| green-600 | `#FFFFFF` | 6.04 | AA text | Links |
| green-700 | green-100 | 6.71 | AA text | Secondary button |
| green-700 | sprout-200 | 6.72 | AA text | Text on mint tile |
| soil-900 | `#FFFFFF` | 16.61 | AAA text | Body |
| soil-900 | soil-50 | 15.65 | AAA text | Body on paper |
| soil-900 | sprout-300 | 12.18 | AAA text | Mint tile content |
| soil-900 | bloom-200 | 11.97 | AAA text | Bloom tile content |
| soil-900 | harvest-200 | 12.52 | AAA text | Sun tile content |
| soil-600 | soil-50 | 6.27 | AA text | Muted on paper |
| soil-600 | soil-100 | 5.80 | AA text | Muted on muted |
| soil-500 | `#FFFFFF` | 4.98 | AA text | Subtle on tiles |
| soil-500 | soil-50 | 4.69 | AA text | Subtle on paper |
| soil-500 | soil-100 | 4.34 | **Fails** | Never subtle text on muted fills |
| harvest-700 | `#FFFFFF` | 6.14 | AA text | Highlight text |
| harvest-700 | harvest-100 | 5.38 | AA text | Highlight on tint |
| soil-950 | harvest-500 | 6.80 | AA text | Highlight button label |
| harvest-500 | `#FFFFFF` | 2.80 | **Fails** | Fills only |
| `#FFFFFF` | rust-600 | 6.46 | AA text | Danger label |
| rust-600 | rust-50 | 5.73 | AA text | Error text |
| bloom-700 | bloom-100 | 6.90 | AA text | Bloom labels |
| soil-50 | soil-900 | 15.65 | AAA text | Text on inverse tile |
| soil-300 | soil-900 | 10.28 | AAA text | Muted on inverse tile |
| green-400 | soil-950 | 6.51 | AA text | Dark primary |
| soil-950 | green-400 | 6.51 | AA text | Dark primary label |
| harvest-400 | soil-950 | 9.14 | AAA text | Dark highlight |
| soil-300 | soil-950 | 11.76 | AAA text | Dark muted |
| soil-400 | soil-900 | 6.86 | AA text | Dark subtle |
| rust-300 | rust-950 | 6.96 | AA text | Dark error text |
| green-600 | soil-50 | 5.69 | 3:1 UI | Focus ring on paper |
| soil-500 | `#FFFFFF` | 4.98 | 3:1 UI | Light field edge |
| soil-500 | soil-900 | 3.33 | 3:1 UI | Dark field edge |
| green-500 | `#FFFFFF` | 4.22 | 3:1 graphic | Chart fill on tile |
| bloom-500 | `#FFFFFF` | 3.89 | 3:1 graphic | Series 2 on tile |
| harvest-600 | `#FFFFFF` | 4.09 | 3:1 graphic | Series 3 on tile |
| green-400 / bloom-400 / harvest-400 | soil-900 | 5.69 / 6.26 / 8.00 | 3:1 graphic | Series on inverse tile |
| `#FFFFFF` | soil-50 | 1.06 | Intended | Tile lift is tonal only. Separation also comes from the gap and radius. |

### 5.4 Pairing rules

1. Text is at least 4.5:1. Large text (24 px regular or 18.66 px bold) is at least 3:1. Icons, focus rings, field edges, and chart marks that carry meaning are at least 3:1.
2. Harvest-500 and Harvest-400 are never text or thin icons on light surfaces. Use `--highlight-text`.
3. Green-500 and Sprout fills carry no text of their own. Mint tiles carry soil-900 or green-700 text.
4. `--fg-subtle` is allowed on paper and white. Never on `--bg-muted`.
5. Text on a tint tile is `--fg-default` or green-700 on mint. Check it against the tint.
6. Dark mode uses no pure white text and no pure black backgrounds.
7. **Series on tiles:** on white tiles use `--viz-1..4`. On mint, sun, and bloom tiles use soil-900 for the main series and the hatch for the ghost. On the inverse tile use the dark-mode `--viz` values.
8. The furrow hatch is decoration plus meaning, never the only signal. A label or value always accompanies it.

### 5.5 Proportion and state rules

- **60/25/10/5:** Soil and paper about 60%, Field Green about 25%, Harvest about 10%, Sprout and Bloom together about 5%. Rust only in error or destructive states.
- **One loud fill per region.** A region is one tile or one screen band. A page may hold one saturated Harvest fill and one saturated green fill at a time.
- **At most one inverse tile per viewport and one Bloom tile per page.**
- **Hover is a step, not a new hue.** 600 to 700 within the same base.
- **Dark mode steps fills to 400 and 500.** Elevation in dark mode comes from tone: soil-950, soil-900, soil-800.

---

## 6. Typography

### 6.1 Families

| Token | Family | Role | Why |
| --- | --- | --- | --- |
| `--font-display` | **Sora** (variable, OFL) | Display, headings, key figures, hero | Wide geometric forms carry the oversized headlines in references 7 and 8 |
| `--font-sans` | **Manrope** (variable, OFL) | Body, UI labels, forms, numerals | Soft terminals, clean at small sizes |
| `--font-hand` | **Caveat** (400, OFL) | Hero annotations only (reference 8) | The one human mark on the page. Maximum two annotations per page. |

Fallback stack: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`. Latin subsets only. Caveat is decorative: `aria-hidden="true"`, never carries information, never loaded outside Home.

### 6.2 Type scale

| Token | Size | Line height | Weight | Tracking | Family | Use |
| --- | --- | --- | --- | --- | --- | --- |
| `display-2xl` | `clamp(3rem, 1.8rem + 5vw, 6rem)` | 0.98 | 600 | -0.04em | Sora | Home hero headline, two lines at most |
| `display-xl` | `clamp(2.5rem, 1.6rem + 3.2vw, 4.25rem)` | 1.02 | 600 | -0.035em | Sora | Section hero |
| `display-lg` | `clamp(2rem, 1.5rem + 2vw, 3rem)` | 1.08 | 600 | -0.03em | Sora | Page titles |
| `stat-xl` | `clamp(3.5rem, 2.5rem + 4vw, 5.5rem)` | 1 | 600 | -0.04em | Sora, `tabular-nums` | Hero tile figure (gauge, sales) |
| `stat-lg` | 48 px | 1 | 600 | -0.03em | Sora, `tabular-nums` | KPI tiles |
| `stat-md` | 32 px | 1.1 | 600 | -0.02em | Sora, `tabular-nums` | Price on product tile and detail |
| `stat-unit` | 0.5em of the figure | inherit | 500 | 0 | Sora | The "%" or "PHP" next to a figure, in `--fg-muted` |
| `heading-lg` | 30 px | 1.2 | 600 | -0.02em | Sora | Section titles |
| `heading-md` | 24 px | 1.25 | 600 | -0.015em | Sora | Tile titles |
| `heading-sm` | 20 px | 1.3 | 600 | -0.01em | Sora | Product name, sub-sections |
| `body-lg` | 18 px | 1.6 | 400 | 0 | Manrope | Lead paragraph |
| `body-md` | 16 px | 1.6 | 400 | 0 | Manrope | Body and input text |
| `body-sm` | 14 px | 1.5 | 400 | 0 | Manrope | Meta |
| `label` | 15 px | 1.3 | 600 | 0.005em | Manrope | Buttons, navigation, form labels |
| `caption` | 12 px | 1.4 | 500 | 0.01em | Manrope | Timestamps, helper text, inset chip captions |
| `numeric` | inherits | inherits | 600 | 0 | Manrope, `tabular-nums` | Prices in lists, stock counts, totals |
| `annotation` | 24 px | 1.1 | 400 | 0 | Caveat | Hero annotation, rotated -4 to -8 degrees |

The tracked uppercase `eyebrow` token from 1.0 is **removed**. Section intros use `body-lg` or a pill tag (11.2) instead.

### 6.3 Typography rules

- Sentence case for all UI text. Title case only for product names.
- Body line length is 45 to 75 characters. Headlines break into at most two lines.
- Inputs are 16 px minimum.
- Prices, stock counts, and totals use `tabular-nums`. Currency: `Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" })`, which renders `₱1,250.00`.
- Dates shown to customers use `Asia/Manila`.
- Figures with a unit use `stat-unit` for the unit (as in "72%").
- Struck-through original prices use `--fg-subtle` and `numeric`.
- Button labels are verbs in sentence case: "Add to cart", "Pay now", "Track order".
- No italics for emphasis. No single-word color accents inside headlines.
- Pack sizes and quantities read naturally: "25 kg sack", "500 g pack".

---

## 7. Spacing, Sizing, and Layout

### 7.1 Space scale

Base unit 4 px. Tailwind v4 `--spacing: 0.25rem` is kept, so `p-4` equals 16 px.

| Token | Value | Typical use |
| --- | --- | --- |
| `space-1` | 4 px | Icon to caption gap |
| `space-2` | 8 px | Chip gaps, inset chip gaps |
| `space-3` | 12 px | Tile gap (mobile), product tile padding |
| `space-4` | 16 px | Mobile gutter, tile gap (desktop), field stack gap |
| `space-5` | 20 px | Tile padding (md), button horizontal padding |
| `space-6` | 24 px | Group separation, tablet gutter |
| `space-7` | 28 px | Tile padding (lg) |
| `space-8` | 32 px | Between related blocks |
| `space-10` | 40 px | Desktop gutter |
| `space-12` | 48 px | Between sections on dense pages |
| `space-16` | 64 px | Section padding (mobile) |
| `space-24` | 96 px | Section padding (tablet) |
| `space-32` | 128 px | Section padding (desktop) |

Tile tokens: `--tile-gap` 12 px below `md`, 16 px from `md`. `--tile-pad-sm` 12, `--tile-pad-md` 20, `--tile-pad-lg` 28.

### 7.2 Sizes

| Token | Value | Use |
| --- | --- | --- |
| `control-sm` | 36 px | Admin toolbars (desktop only) |
| `control-md` | 44 px | Default buttons, inputs, selects. Mobile minimum. |
| `control-lg` | 52 px | Checkout CTA, hero CTA |
| `slide-track` | 56 px | Slide-to-add bar (11.3) |
| `icon-tile` | 56 x 56 px | Square icon buttons (save, add) beside a product tile |
| `touch-min` | 44 x 44 px | Minimum hit area |
| `icon-sm / md / lg / xl / 2xl` | 16 / 20 / 24 / 32 / 48 px | Caption, buttons, navigation, empty state, category tile |
| `nav-pill` | 48 px high | Floating pill nav (11.2) |
| `sidebar` | 248 px, 72 px collapsed | Admin sidebar |
| `row-comfortable` | 56 px | Storefront lists |
| `row-compact` | 40 px | Admin tables |
| `image-tile` | 1:1 grid, 4:5 mobile detail, 1:1 desktop detail | Product media |
| `map-container` | 16:10 | Contact and checkout pin |

### 7.3 Breakpoints, containers, bento grid

| Token | Min width | Columns | Gutter |
| --- | --- | --- | --- |
| Base | 0 | 4 | 16 px |
| `md` | 768 px | 8 | 24 px |
| `lg` | 1024 px | 12 | 32 px |
| `xl` | 1280 px | 12 | 40 px |

- `--container-content`: 1200 px. `--container-wide`: 1440 px (catalog and admin).
- Bento grid: CSS grid with `gap: var(--tile-gap)` and `grid-auto-rows: minmax(var(--bento-row), auto)`, `--bento-row: 160px`.
- Tile spans on `lg` (12 columns): **S** 3, **M** 4 or 6, **L** 8, **XL** 12. On `md` (8 columns): S 4, M 4, L 8. Base (4 columns): everything spans 4, except two S tiles may share a row.
- Section padding: `space-16` mobile, `space-32` desktop on Home. Dense pages use `space-12`.

### 7.4 Density modes

| Mode | Used by | Row height | Control height | Body size |
| --- | --- | --- | --- | --- |
| `comfortable` (default) | Storefront, checkout, account | 56 px | 44 px | 16 px |
| `compact` | Admin tables, inventory log | 40 px | 36 px (desktop) | 14 px in tables |

Set with `data-density="compact"` on the admin layout root.

### 7.5 Z-index

| Token | Value | Layer |
| --- | --- | --- |
| `z-base` | 0 | Content |
| `z-sticky` | 20 | Sticky filter bar, sticky summary |
| `z-header` | 30 | Floating nav |
| `z-overlay` | 40 | Scrim |
| `z-sheet` | 50 | Drawers, dialogs |
| `z-toast` | 60 | Toasts |
| `z-chat` | 70 | Chat launcher and panel |
| `z-banner` | 80 | Offline banner |

---

## 8. Shape, Surface, Elevation, Borders, Tiles, Patterns

### 8.1 Radius scale and concentric rule

| Token | Value | Applied to |
| --- | --- | --- |
| `radius-xs` | 8 px | Checkboxes, keyboard hints |
| `radius-sm` | 12 px | Menu items, tooltips |
| `radius-md` | 16 px | Inputs, selects, textareas, inset chips |
| `radius-lg` | 24 px | Product images inside a tile, icon tiles, map container |
| `radius-xl` | 32 px | Product tile, content tile, popovers |
| `radius-2xl` | 40 px | Hero and feature tiles, dialogs, drawers (top corners), admin window, chat panel |
| `radius-full` | 999 px | Buttons, chips, badges, tags, nav pill, swatches, avatars, segmented controls |

**Concentric rule:** an inner shape's radius equals the outer radius minus the padding between them, never below `radius-xs`. A `radius-xl` (32) tile with `space-3` (12) padding holds media at `radius-lg` (24) wherever possible, which is the closest scale step to 20.

### 8.2 Surface model (tonal)

| Level | Light | Dark | Used for |
| --- | --- | --- | --- |
| 0. Paper | soil-50 | soil-950 | Every page background |
| 1. Muted | soil-100 | soil-800 | Chips, input fill, inset chips |
| 2. Tile | `#FFFFFF` | soil-900 | Default tile, overlays |
| 3. Tint tile | mint, sun, bloom | green-900, harvest-900, bloom-900 | Feature and data tiles |
| 4. Inverse tile | soil-900 | soil-100 | The one dark tile per viewport |

### 8.3 Elevation

| Token | Value | Use |
| --- | --- | --- |
| `elevation-0` | none | Everything at rest, including tiles |
| `elevation-float` | Light: `0 16px 40px -16px rgb(18 16 13 / 0.28)`. Dark: `0 16px 40px -12px rgb(0 0 0 / 0.6)` | Dialogs, drawers, popovers, toasts, floating nav while scrolled |
| `focus-ring` | 2 px outline, 2 px offset, `--focus-ring` | Keyboard focus |

No other shadows exist.

### 8.4 Lines (zero by default)

| Line | Spec | Why it exists |
| --- | --- | --- |
| Field edge | 1 px inset ring, `--field-edge`, inputs and selects only (`--input` in compat) | WCAG 1.4.11 |
| Focus ring | 2 px outline, `--focus-ring` | Keyboard access |
| Dropzone edge | 1.5 px dashed, `--field-edge` at 60%, `ImageDropzone` only | Signals "drop here" (Kokonut file-upload) |
| Hero CTA halo | 1.5 px dashed ring, 6 px outside the button, `--highlight`, Home hero only (reference 8) | The single decorative line. It is static, so it stays under reduced motion. |

Tables use zebra tone or an 8 px row gap. No hairlines.

### 8.5 Tile policy

A **tile** is a bounded surface (`--tile-*` fill, radius from 8.1, no border, no shadow) that carries one job.

| Tile | Fill | Radius | Padding | Where | Limit |
| --- | --- | --- | --- | --- | --- |
| **ProductTile** | surface | xl | tile-pad-sm | Product grids, related rows | Unlimited in grids |
| **Content tile** | surface | xl | tile-pad-md | Bento rows on Home, Account, Admin | Per layout in section 12 |
| **Mint tile** | mint | xl | tile-pad-md | Gauge, KPI, feature | 2 per page |
| **Sun tile** | sun | xl | tile-pad-md | Promo, low stock | 1 per page |
| **Bloom tile** | bloom | xl | tile-pad-md | One data tile | 1 per page |
| **Inverse tile** | inverse | xl or 2xl | tile-pad-md | Hero data tile, admin sales | 1 per viewport |
| **Feature tile** | surface or mint, with halftone | 2xl | tile-pad-lg | Pinned announcement | 1 per page |
| **Summary tile** | surface | xl | tile-pad-md | Cart and checkout order summary | 1 per page, sticky on desktop |
| **Media tile** | none | lg | none | Map, hero strip images | No frame, no padding |
| **Overlay** | surface | 2xl | tile-pad-md | Dialog, drawer, chat panel, toast | Above canvas only |

Rules:

- **One inset level:** an `InsetChip` (`--bg-muted`, radius = outer minus padding) may sit inside a tile. No tile inside a tile. No inset inside an inset.
- A tile never wraps other tiles. Grouping happens with the grid and gap.
- A tile exists to hold data, a product, an action, or a story. A tile whose only job is to frame a paragraph is not allowed.
- KPIs may be tiles (mint, bloom, inverse) or typographic on paper. Do not mix both inside one row.
- No stat decoration (trend arrow, sparkline) without a comparison period in text.

### 8.6 Patterns

Three patterns, all drawn with CSS from tokens (17.6).

| Pattern | Look | Used for | Never used for |
| --- | --- | --- | --- |
| **Furrow** (`--pattern-furrow`) | 45 degree hatch, 1.5 px lines every 6 px, `--viz-ghost` | Unfilled gauge or bar, previous period, out-of-stock image overlay, remaining progress | Backgrounds of text blocks |
| **Seed grid** (`--pattern-seed-grid`) | 1 px dots every 24 px, soil-300 at 50% on paper | Home hero backdrop only (reference 7) | Anywhere else |
| **Halftone** (`--pattern-halftone`) | Dot matrix fading to the right, soil-500 at 25% | Feature tile texture (reference 6) | Behind text smaller than `heading-sm` |

Furrow lines, hatch angle, and spacing are tokens, so the pattern can change in one place. Under `forced-colors` the patterns are removed and solid `Canvas`/`CanvasText` fills are used.

---

## 9. Motion

### 9.1 Motion tokens

| Token | Value | Use |
| --- | --- | --- |
| `duration-instant` | 90 ms | Hover color, press color |
| `duration-fast` | 160 ms | Toggles, chip state, focus |
| `duration-base` | 240 ms | Small enter and exit |
| `duration-moderate` | 360 ms | Drawers, panels, banners |
| `duration-slow` | 520 ms | Image zoom, page reveals |
| `duration-morph` | 640 ms | Fallback for shared-element morphs |
| `duration-stock-flash` | 900 ms | Live stock or price change highlight |
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default movement |
| `ease-enter` | `cubic-bezier(0.16, 1, 0.3, 1)` | Arrivals |
| `ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Exits |
| `ease-breathe` | `cubic-bezier(0.65, 0, 0.35, 1)` | Ambient, fills, skeleton |
| `spring-snappy` | stiffness 420, damping 34, mass 0.9 | Taps, tab indicator, toggles, slide thumb |
| `spring-organic` | stiffness 260, damping 24, mass 1 | Morphs, drawers, chat launcher to panel |
| `spring-gentle` | stiffness 160, damping 26, mass 1.1 | Large panels, hero tags |

### 9.2 Motion roles

| Role | Communicates | Token family |
| --- | --- | --- |
| Feedback | "Your input landed" | Instant or snappy |
| Morph | "Same thing, new state" | Organic spring, shared layout |
| Enter and exit | "Appeared or left" | Enter and exit easings |
| Status | "Data changed" | Stock flash, fills |
| Ambient | "The brand is alive" | Hero tags only, gentle |

### 9.3 Morph catalog

| Pattern | Trigger | Behavior | Token |
| --- | --- | --- | --- |
| Tab indicator | Tab change | Underline or pill slides and resizes | spring-snappy |
| **Add to cart** (`CartButton`) | Tap "Add" | Pill morphs into `- 2 +` stepper. Badge scales 1 to 1.18 to 1. | spring-snappy |
| **Slide to add** | Drag thumb to the end | Thumb fills track, label becomes check, then resets | spring-snappy |
| **Hover reveal** | Pointer enters tile | Add bar rises from the image bottom edge | duration-base, ease-enter |
| **Save** (`SaveButton`) | Tap | Bookmark fills with a small bounce | spring-snappy |
| Product to detail | Tile tap | Image and title shared layout | spring-organic |
| **Chat launcher to panel** (`MorphPanel`) | Launcher tap | Round launcher becomes the panel, anchored bottom right | spring-organic + elevation-float |
| **Summary drawer** (`SummaryDrawer`) | Tap "Review order" | Drawer rises, drag to dismiss | spring-organic |
| **Receipt** (`OrderReceipt`) | Order success | Receipt prints downward, optional pull to tear | duration-slow, ease-enter |
| **Gauge** (`StockGauge`) | Mount or stock change | Liquid level eases to value | ease-breathe, duration-slow |
| Order stepper | Status change | Line fills, dot morphs to check | ease-breathe, duration-moderate |
| Stock badge | Stock change | Width morph, tint flash | spring-snappy, stock-flash |
| Segmented toggle | Range or view switch | Thumb slides | spring-snappy |
| Toast | Action confirmed | Pill expands to message, collapses after 3.5 s | spring-organic |
| Loading | Submit | Label fades to spinner, width locked | duration-fast |
| Hero tags | Ambient | Two or three tags drift 6 px on a slow loop | spring-gentle, off under reduced motion |

Rules: morphs express continuity. Each morph has one origin element. No more than two morphs run at once in a viewport. The hero strip is scrolled by the person. It never auto-plays.

### 9.4 Organic motion principles

1. Motion starts at the triggered element.
2. Springs for interaction. Easings for opacity and color.
3. Overshoot stays at or below about 4%. Organic damping 24 or higher.
4. Feedback within 100 ms. Enter animations finish within 360 ms.
5. Animate `transform` and `opacity`. Use Motion layout animation for size and position.
6. Nothing animates on load in checkout or payment. Exception: the receipt print on the success screen, which runs once.
7. Motion answers a person's action. Only two things move without one: hero tags and the stock flash.

### 9.5 Reduced motion

With `prefers-reduced-motion: reduce`:

- Morphs become a 120 ms crossfade. Springs become `duration-fast` with `ease-standard`.
- Hero tags are static. The receipt appears complete. The gauge jumps to its value.
- Stock flash becomes an instant color change. Skeleton pulse becomes a static block.
- Slide to add stays available. Tapping the button works exactly the same.
- Nothing loops.

### 9.6 Performance

- `<LazyMotion features={domAnimation}>` globally. `domMax` only on routes with `layoutId` morphs (home, products, chat), loaded by dynamic import.
- Kokonut components that use `motion` are wrapped so they use `m.*` with `LazyMotion` where the upstream API allows. Otherwise they stay code-split by route.
- The hero tag loop pauses off-screen (IntersectionObserver) and is disabled on `saveData`.
- No animation on the payment polling screen except one spinner.

---

## 10. Iconography

### 10.1 Rules

- Library: `@phosphor-icons/react`, named imports.
- Weight: `regular` default. `fill` for active, selected, completed. `bold` only for spinner. No `duotone` or `thin`.
- Color: `currentColor`. Icon tiles use `--primary-subtle` with a `--primary-text` glyph.
- Sizes: `icon-sm` to `icon-2xl` (7.2).
- Decorative icons get `aria-hidden="true"`. Icon-only buttons need `aria-label`. Status icons always appear with text.

### 10.2 Icon map (`src/styles/icons.ts`)

Verify every name against the installed version (D7).

| Domain | Icon | Domain | Icon |
| --- | --- | --- | --- |
| Seeds | `Grains` | Cart | `ShoppingCartSimple` |
| Fertilizers | `Flask` | Store | `Storefront` |
| Pesticides | `Bug` | Delivery | `Truck` |
| Animal feed | `BowlFood` | Pickup | `Package` |
| Veterinary | `FirstAid` | Orders | `ClipboardText` |
| Farm tools | `Wrench` | Chat | `ChatCircleDots` |
| Irrigation | `Drop` | Announcements | `Megaphone` |
| Plants | `Plant` | Notifications | `Bell` |
| Map pin | `MapPin` | Reports | `ChartBar` |
| Inventory | `Cube` | Users | `Users` |
| Search | `MagnifyingGlass` | Offline | `WifiSlash` |
| Success | `CheckCircle` | Warning | `Warning` |
| Error or out of stock | `XCircle` | Archive | `Archive` |
| Restore | `ArrowCounterClockwise` | Loading | `CircleNotch` |
| Save | `BookmarkSimple` | Upload | `UploadSimple` |
| Quantity | `Plus`, `Minus` | Expand | `CaretUp`, `CaretDown`, `CaretRight` |
| Receipt | `Receipt` | Pointer tag | `Cursor` |

### 10.3 Kokonut icon swap (R5)

Kokonut components import `lucide-react`. After copying, replace each import with its Phosphor twin. Keep the same props shape through a tiny local re-export in `icons.ts` so the diff stays one line per icon.

| lucide | Phosphor |
| --- | --- |
| `Upload` | `UploadSimple` |
| `Bookmark` | `BookmarkSimple` |
| `Plus` / `Minus` | `Plus` / `Minus` |
| `ShoppingCart` | `ShoppingCartSimple` |
| `ChevronUp` / `ChevronDown` | `CaretUp` / `CaretDown` |
| `MessageSquare` | `ChatCircleDots` |
| `X` / `Check` | `X` / `Check` |
| `Loader2` | `CircleNotch` |

Any lucide icon not in this table gets a Phosphor match added here before merge.

---

## 11. Component Tokens

coss ui parts are wrapped in `src/components/ui/`. Kokonut parts are wrapped in `src/components/signature/`. All use semantic tokens only.

### 11.1 Core components

| Component | Shape | Fill | Text | Size and padding | Motion |
| --- | --- | --- | --- | --- | --- |
| **Button, primary** | full | `--primary`, hover `--primary-hover`, pressed `--primary-pressed` | `--on-primary`, label | md 44 px, 20 px horizontal. lg 52 px, 28 px. | Press scale 0.98, snappy |
| **Button, highlight** | full | `--highlight`, hover `--highlight-hover` | `--on-highlight` | Same. Used once per region (hero CTA, promo). | Same |
| **Button, inverse** | full | `--tile-inverse` | `--on-inverse` | Same. Nav cart, "Pay now" on light tiles. | Same |
| **Button, secondary** | full | `--primary-subtle` | `--primary-text` | Same | Fill eases |
| **Button, ghost** | full | Transparent, hover `--bg-muted` | `--fg-default` | md 44 px, 16 px | Fill eases |
| **Button, danger** | full | `--danger-fill` | `--on-danger` | Same | Press scale |
| **Icon tile button** | lg | `--bg-muted`, hover `--bg-muted` at 70% over `--bg-surface` | `--fg-default` | 56 x 56 px | Snappy |
| **Input / Select** | md | `--bg-surface` (light), 1 px inset `--field-edge` | `--fg-default`, placeholder `--fg-subtle` | 44 px, 14 px horizontal, 16 px text | Focus ring |
| **Chip (filter)** | full | `--bg-muted`. Selected `--primary-subtle` with check. | `--fg-default`, selected `--primary-text` | 36 px, 14 px | Background morphs |
| **Pill tag** | full | `--bg-muted`, or tint | `--fg-default` | 28 px, 12 px | None |
| **Status badge** | full | Per status (11.5) | Per status | 24 px, 10 px, caption | None |
| **Segmented control** | full | Track `--bg-muted`, thumb `--bg-surface` | `--fg-default` | 40 px, 4 px padding | Shared layout |
| **Underline tabs** | Indicator 2 px fill, radius full | Indicator `--fg-default`. Inactive labels `--fg-muted`. | `label` | 44 px | Indicator slides, snappy |
| **Stepper** | Line 2 px fill | Track `--bg-muted`, progress `--primary` | Caption | Dot 24 px | Line fill, ease-breathe |
| **Dialog** | 2xl | `--bg-surface`, float, `--overlay` | `--fg-default` | Max 560 px | Scale 0.97 to 1, organic |
| **Toast** | full | `--tile-inverse` | `--on-inverse` | 48 px, 20 px | Pill to message |
| **Offline banner** | none | `--bg-warm` | `--warning-text` | 40 px full width | Height morph |
| **Skeleton** | md | `--bg-muted` | none | Matches target | Pulse 0.5 to 1 |
| **Empty state** | none | Paper | `heading-sm`, `body-md`, 48 px icon on `--primary-subtle` circle | Centered | Fade |
| **Chat bubble, customer** | xl, 8 px tail corner | `--primary` | `--on-primary` | 12 / 16 px | Enter |
| **Chat bubble, store** | xl, 8 px tail corner | `--bg-muted` | `--fg-default` | 12 / 16 px | Enter |

### 11.2 Composite components

| Component | Spec (from reference) |
| --- | --- |
| **ProductTile** (ref 3, 9) | Tile surface, radius xl, padding 12. Image area 1:1, radius lg, `--bg-muted` behind the photo. Top-left badges: discount pill (`--tile-inverse`, `--on-inverse`, e.g. "-20%") and one attribute pill (brand or pack, `--bg-surface`). Bottom of image: **hover reveal bar** on pointer devices (inverse bar, label "Add to cart", rises over 240 ms). On touch devices a 56 px `CartButton` icon tile sits bottom right instead. Under the image: brand in `caption` + `--fg-muted`, name in `heading-sm`, price in `stat-md` with the struck original in `--fg-subtle`. Out of stock: furrow overlay on the image and the badge "Out of stock" in rust (with icon). |
| **InsetChip** (ref 3) | `--bg-muted`, radius md (or outer minus padding), padding 8 x 12. Two lines: caption label above, `numeric` value below. Used for net weight, pack size, rating, coverage. |
| **Icon tile pair** (ref 3) | Two 56 px square icon buttons (`SaveButton`, `CartButton` icon form) sitting beside the inset chips under the image, flush to the tile padding. |
| **Pack-size picker** (ref 1) | Pill container (`--bg-muted`) holding 2 to 4 option pills. Selected pill is `--bg-surface` with `--fg-default` and slides on a shared layout. Shows price delta in `caption`. Replaces the swatch dots for products with sizes. Variant color dots are used only when a product truly varies by color. |
| **Pill tag with pointer** (ref 7) | Pill (`--tile-mint` or `--highlight-subtle`) with a `Cursor` glyph offset at its top right. Hero only, two or three max, `aria-hidden`. |
| **FloatNav** (ref 7) | Centered pill, `--bg-surface`, radius full, 48 px, links as pills (active `--bg-muted`). Logo in a 48 px white disc at left. At right: language or search icon button and the cart button (inverse). Becomes full width with a bottom sheet menu below `md`. Gains `elevation-float` once the page scrolls. |
| **Related row** (ref 2) | Horizontal row of small ProductTile thumbs (88 px), name and price in `caption`. Round carousel arrows (`--bg-surface`, 40 px) at the edges on desktop, scroll snap on touch. |
| **Feature tile with halftone** (ref 6) | Radius 2xl, `--tile-mint` or surface, halftone on the right half, `heading-md` title, `body-sm` text, white pill button with caret. One per page (pinned announcement). |
| **Season timeline** (ref 5) | Vertical line 2 px (`--bg-muted`), hollow circle nodes 16 px, the current node filled `--primary`. Date in `numeric`, title in `label`, summary in `body-sm`. Built from announcements. |
| **Admin sidebar** (ref 4) | On paper. Active item is a white pill (`--bg-surface`, radius full) with a `fill` icon. Sub-items indented 16 px under a caret group. User block at the bottom with avatar and caret. |
| **Person row** (ref 4, 6) | 56 px row, avatar 40 px with status dot, name and secondary line, right-aligned ghost icon button. Rows separated by 8 px gap. |

### 11.3 Add to cart and cart button

- **CartButton** (Kokonut `cart-button`): "Add +" pill that morphs into `- 2 +`. Default for ProductTile (touch), cart rows, and Related thumbs.
- **AddToCart** (ref 1, product detail only): one primary pill, full width, `--control-lg` tall, radius full, `--primary` on `--on-primary`. Label carries the price: "Add to cart · ₱1,250.00" with the cart icon.
  - One tap adds the item. No drag, no gesture: the same click works for pointer, keyboard and assistive tech.
  - Confirms in place for 1.6 s (check icon, "Added to cart") before returning to the priced label. The cart icon in the nav is the persistent confirmation.
  - Adds quantity chosen in the pack-size and quantity controls above it.
  - Disabled when out of stock: the label says "Out of stock" on `--bg-muted` and the control is not focusable for action.

### 11.4 Data components

All are drawn in SVG or CSS from tokens. Each shows its value as text.

| Component | Spec (from reference) | Used for |
| --- | --- | --- |
| **Ghost bars** (ref 4, 5) | Bars in `--viz-ghost` furrow hatch. The active bar is a solid `--primary` (or `--viz-2`) with a value pill above it. Rounded top, radius md. | Weekly sales, stock by category |
| **Reorder line** (ref 4) | Dashed 1.5 px line across the chart in `--danger-fill` with a pill at its left end ("Reorder"). | Inventory chart, product stock history |
| **Lollipop chart** (ref 6) | Vertical stem 2 px `--viz-ghost`, dot 8 px `--viz-1`. Day circles under the stems (32 px). Selected day is a tall capsule with a value pill. | Admin weekly orders |
| **Semi gauge** (ref 5) | 180 degree arc, thick stroke (28 px), solid part `--tile-inverse` on a mint tile, remainder furrow hatch, centered `stat-lg` figure. | Low-stock health, fulfillment rate |
| **Tick meter** (ref 6) | 24 vertical ticks, 2 px wide. Filled ticks `--primary`, remaining `--viz-ghost`. A reorder marker tick is `--danger-fill`. | Stock level in lists and on detail |
| **Ring progress** (ref 4) | 24 px ring, 3 px stroke, percent in text beside it. `--primary` normal, `--warning-text` low, `--danger-fill` critical. | Admin inventory table |
| **Stacked rounded bars** (ref 5) | Two-month comparison, each bar a rounded rectangle split into `--viz-1` and `--viz-2`, previous period hatched. | Admin compare month |
| **Revenue tile** (Kokonut `metric-card`) | Figure `stat-lg`, delta in `--success-text` with an up caret, sparkline with a dotted previous period, range toggle (7D / 30D / 90D) as a segmented control, share bar with category list. | Admin dashboard |
| **Stock gauge** (Kokonut `liquid-gauge`) | Tall tile, liquid fill by stock percent, `stat-xl` figure with `stat-unit`, "of N units" and "x% free" lines. | Product detail (when stock is shown), admin inventory detail |

### 11.5 Status badge mapping

| Order status | Fill | Text | Icon |
| --- | --- | --- | --- |
| Pending | `--highlight-subtle` | `--highlight-text` | `Clock` |
| Paid | `--primary-subtle` | `--primary-text` | `CheckCircle` |
| Preparing | `--bg-muted` | `--fg-default` | `Cube` |
| Out for delivery | `--primary-subtle` | `--primary-text` | `Truck` |
| Completed | `--primary` | `--on-primary` | `CheckCircle` (fill) |
| Cancelled | `--danger-subtle` | `--danger-text` | `XCircle` |

Stock indicator: in stock `--primary-subtle`, low `--warning-subtle`, out `--danger-subtle`, always with icon and label.

### 11.6 Button wrapper (reference implementation)

```tsx
// src/components/ui/Button.tsx
import { motion, type HTMLMotionProps } from "motion/react";
import { CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/cn";
import { useSpringPreset } from "@/styles/tokens/motion";

const variants = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed",
  highlight: "bg-highlight text-on-highlight hover:bg-highlight-hover",
  inverse: "bg-tile-inverse text-on-inverse hover:opacity-90",
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

## 12. Page Patterns (bento first)

| Page (blueprint 7.1) | Layout | Tiles used | Signature element |
| --- | --- | --- | --- |
| **Home** `/` | FloatNav on paper. Hero with seed grid, `display-2xl` headline, body-lg line, highlight CTA with halo, two hand annotations and two pointer tags. Then a **tilt strip** of product media tiles (scroll snap, outer tiles rotated up to 8 degrees on Y). Then a bento row. Then featured ProductTiles. | Feature tile (pinned announcement), mint tile (store hours or "in stock today" count), content tile (categories as icon chips), Season timeline | Tilt strip, furrow hatch, halo CTA |
| **Products** `/products` | Sticky filter bar on paper (solid). ProductTile grid. Segmented grid or list. | ProductTile only | Hover reveal bar, `CartButton` |
| **Product detail** `/products/:id` | Left: image tile (radius 2xl, badges, dots). Right: name, price with strike, pack-size picker, underline tabs (Details, Delivery, Usage), AddToCart. Below the image: inset chips (net weight, rating, stock) and the icon tile pair. Then Related row. | Image tile, inset chips, mint `StockGauge` tile (if stock is shown) | One-tap add, morph from grid |
| **Cart** `/cart` | Rows on paper, `CartButton` steppers. Summary tile at right (sticky). On mobile the summary is a `SummaryDrawer`. | Summary tile | Quantity roll, drawer |
| **Checkout** `/checkout` | Four-step stepper. One step at a time on paper. Map as a media tile. | Summary tile, media tile | Stepper fill, pin drop |
| **Order success** | Centered `OrderReceipt` on paper with "Track order" primary and "Keep shopping" ghost. | Receipt (media) | Receipt print |
| **Account** `/account` | Segmented tabs. Order history rows with status badge and tracker. | Content tiles per order if grouped | Tab morph |
| **Announcements** `/announcements` | Editorial list plus the Season timeline on the right at `lg`. One feature tile for the pinned item. | Feature tile | Timeline |
| **Contact** `/contact` | Map media tile (radius lg, 16:10). Address and hours as typography. | Media tile | None |
| **Admin** `/admin/*` | Tinted window (`--bg-tint`) with radius 2xl at `lg` and up. Sidebar on the tint. Content area on paper. Greeting in `heading-md`. | See wireframe below | Ghost bars, rings, `RevenueTile` |
| **Chat** | Launcher bottom right morphs into the panel (`MorphPanel`). Admin inbox is a person-row list plus thread. | Overlay | Morph |

### 12.1 Home wireframe

```
[ (A) ]  ( Products  Announcements  Contact )        [ 🔍 ] [ Cart 2 ]
                                                    ← FloatNav, 48 px
          .  .  .  .  .  .  .  .  .  .  .  .  .  .   ← seed grid
              Everything your farm needs,
                  in stock and on the way          ← display-2xl, 2 lines
        ( Seeds to feeds, delivered or ready for pickup )
                 [ Shop the catalog ]  ← highlight CTA + dashed halo
   (fresh stock ↘ hand note)                   (tag + cursor)
 ╭────╮ ╭──────╮ ╭────────╮ ╭──────╮ ╭────╮
 │tilt│ │ img  │ │  img   │ │ img  │ │tilt│     ← media tiles, scroll snap
 ╰────╯ ╰──────╯ ╰────────╯ ╰──────╯ ╰────╯
┌ Feature (8) ─────────────────────┐ ┌ Mint (4) ─────────┐
│ Planting season advisory   [Read>]│ │ 128 items in stock │
│ halftone texture                  │ │ updated 14:05      │
└───────────────────────────────────┘ └────────────────────┘
┌ S ───┐ ┌ S ───┐ ┌ S ───┐ ┌ S ───┐       ← category content tiles
```

### 12.2 Product detail wireframe

```
┌ Image tile (6) ─────────────┐   Brand                      [ share ]
│ [-20%] [25 kg]              │   Urea 46-0-0                ← heading-lg
│            sack             │   ₱1,250  ₱1,560             ← stat-md + strike
│                             │   ( 5 kg | 25 kg | 50 kg )   ← pack-size picker
│           • • ● • •         │   Details   Delivery   Usage ← underline tabs
├ chips ───────────┬ tiles ───┤   text…
│ 25 kg │ 4.9 ★ │ 62 left │ ♡ │ 🛒 │   [ Add to cart · ₱1,250 | Slide to add > ]
└─────────────────────────────┘   You may also like → [thumb][thumb][thumb]
```

### 12.3 Admin wireframe (`lg` and up)

```
┌ window on --bg-tint, radius 2xl ───────────────────────────────────────┐
│ sidebar │ Welcome back, Maria       [ search ] [ bell ] [ Share ]      │
│ ▢ Dash  │ ┌ Mint KPI ┐ ┌ Sun KPI ┐ ┌ Bloom KPI ┐                       │
│ ▢ Orders│ │ 12 new   │ │ 5 low   │ │ 96% fill. │   ← one per hue       │
│ ▢ Stock │ └──────────┘ └─────────┘ └───────────┘                       │
│ ▢ Chat  │ ┌ Inverse: Revenue tile (Kokonut metric) ┐ ┌ Gauge (mint) ┐  │
│ ▢ Users │ │ ₱51,612  ▲6.8%  sparkline  7D 30D 90D  │ │ semi gauge   │  │
│         │ └────────────────────────────────────────┘ └──────────────┘  │
│         │ Stock by category (ghost bars + reorder line)                │
│         │ Inventory table: name · ring % · status · reorder · actions  │
└─────────────────────────────────────────────────────────────────────────┘
```

The revenue tile is the admin's one inverse tile per viewport. Bloom appears once on the page, sun once, mint at most twice.

---

## 13. Interaction States

| State | Visual change | Motion | Notes |
| --- | --- | --- | --- |
| **Hover** (pointer only) | Fill steps one level. Ghost gets `--bg-muted`. ProductTile image scales 1.03 and the add bar rises. | duration-instant, duration-base for the bar | Never on touch. Touch shows the icon tile button instead. |
| **Pressed** | Scale 0.98. Pressed color. | spring-snappy | Starts under 100 ms |
| **Focus-visible** | 2 px ring, 2 px offset | duration-fast | Never removed |
| **Selected** | Subtle fill, primary text, check icon | Morph | Never color alone |
| **Disabled** | 40% opacity, pointer events off | None | A nearby sentence gives the reason |
| **Loading** | Label becomes spinner, width locked | duration-fast | Skeletons for lists |
| **Error** | `--danger-subtle` block, `--danger-text`, `XCircle`, field ring `--danger-fill` | duration-fast, 2 px nudge | Always visible text |
| **Success** | `--primary-subtle` with `CheckCircle`, or a toast | ease-enter | Receipt after checkout |
| **Live update** | Background flashes `--primary-subtle` to transparent. The gauge level eases. | duration-stock-flash | `aria-live="polite"` |
| **Out of stock** | Furrow overlay on the image, badge with `XCircle`, slide track disabled | None | Text says "Out of stock" |
| **Stale or offline** | Caption "Updated 14:05 · offline" in `--fg-muted` | None | Section 15 |
| **Dragging** (slide, drawer) | Thumb follows the pointer. Track fills behind it. | Spring on release | Keyboard alternative always present |

---

## 14. Accessibility Requirements

- Target WCAG 2.2 AA across storefront and admin.
- Contrast follows 5.3 and 5.4. Each new pairing is added to 5.3 before use.
- Touch targets are at least 44 x 44 px on mobile. Icon tiles are 56 px.
- Focus is always visible. Focus ring on tinted and inverse tiles uses the same token and keeps 3:1 against the tile.
- Color is never the only signal. The furrow hatch always comes with a label or value. Status always has an icon and text.
- **Slide to add** has a tap, Enter, and Space alternative (11.3). Drag gestures never gate an action.
- Drawers and dialogs trap focus, close on Escape, and return focus to the trigger.
- Hero annotations and pointer tags are `aria-hidden` and never carry information.
- The tilt strip is scrollable by keyboard (arrow keys on the group) and every tile in it is also reachable on `/products`.
- Gauges, rings, tick meters, and charts expose their value in text (`aria-label` or visible figure). Charts offer a table view in admin.
- Motion respects `prefers-reduced-motion` (9.5). `forced-colors` removes patterns (8.6).
- Layouts reflow at 320 px and at 200% zoom without horizontal scrolling. Admin tables scroll inside their own region.
- Live regions: chat and stock changes use `aria-live="polite"`. Blocking errors use `role="alert"`.
- Icon-only buttons have `aria-label` and a tooltip. Admin is fully keyboard operable.
- `lang` is set on `<html>`.

---

## 15. PWA and Offline Visuals

| Element | Spec |
| --- | --- |
| Offline banner | Full width, `--bg-warm`, `--warning-text`, `WifiSlash`. Height morphs in. Dismisses when back online. |
| Stale data label | Caption "Updated [time] · offline" in `--fg-muted` beside stock and price. `StockGauge` freezes and shows the label. |
| Disabled offline actions | 40% opacity plus a sentence explaining why (checkout, chat, admin writes). Slide to add stays enabled for the cart. |
| Install prompt | `SummaryDrawer` pattern with primary and ghost buttons |
| Notification opt-in | Same drawer, one primary action, one ghost action |
| Manifest | `theme_color: #2D6F47` (green-600). `background_color: #FAF8F3` (soil-50). `display: standalone`. |
| Icons | 192 and 512 px. Maskable variant on a green-600 field with the AgriMart mark in `--on-primary`. |

---

## 16. Design Requirements (testable)

| ID | Requirement | Verified by |
| --- | --- | --- |
| **Color** | | |
| DR-C1 | Components reference semantic tokens only | Lint plus review |
| DR-C2 | Rust only for errors, destructive actions, out-of-stock. Bloom only for data. | Design review |
| DR-C3 | Screen proportion within 60/25/10/5 (Soil and paper at least 55%, green at most 30%, harvest at most 10%, Sprout plus Bloom at most 10%) | Screenshot review |
| DR-C4 | Text 4.5:1, large text 3:1, icons, rings, field edges, and chart marks 3:1 | Automated check plus spot check |
| DR-C5 | Color never the only signal | Grayscale screenshot test |
| DR-C6 | Light and dark verified once dark mode is on | QA checklist |
| DR-C7 | At most one inverse tile per viewport, one Bloom tile per page, one Sun tile per page | Design review |
| **Typography** | | |
| DR-T1 | Only Sora and Manrope everywhere. Caveat on Home hero only. | Build check on loaded fonts |
| DR-T2 | Body and input text at least 16 px on mobile | Manual check |
| DR-T3 | Prices, stock counts, and totals use tabular numerals | Code review |
| DR-T4 | Paragraph lines 45 to 75 characters. Headlines at most two lines. | Manual check |
| DR-T5 | Maximum two hand annotations per page | Design review |
| **Layout and shape** | | |
| DR-L1 | Tiles only from the list in 8.5. No tile inside a tile. One inset level. | Design review |
| DR-L2 | No borders except the four lines in 8.4 | Code review |
| DR-L3 | No shadows except `elevation-float` | Code review |
| DR-L4 | Touch targets at least 44 x 44 px on mobile | Lighthouse plus manual |
| DR-L5 | Spacing from the space scale only | Lint |
| DR-L6 | Radii from the radius scale only. Inner radius follows the concentric rule. | Lint plus review |
| DR-L7 | Furrow hatch only where 8.6 allows | Review |
| **Motion** | | |
| DR-M1 | Every animation references a duration, easing, or spring token | Lint |
| DR-M2 | Only `transform` and `opacity` animate directly. Layout animation for size. | Code review |
| DR-M3 | State changes between related elements use shared-layout morphs | Design review |
| DR-M4 | Reduced motion respected everywhere | OS setting test |
| DR-M5 | No animation over 600 ms except gauge, receipt print, and the hero tag loop | Code review |
| DR-M6 | Feedback starts within 100 ms | Throttled CPU test |
| DR-M7 | Slide to add has a non-drag alternative | Keyboard test |
| **Icons** | | |
| DR-I1 | Phosphor only. No `lucide-react` in the final bundle. | Bundle analysis |
| DR-I2 | Icon-only controls have `aria-label` | Accessibility audit |
| **Components** | | |
| DR-K1 | coss ui and Kokonut files are imported only through wrappers | Lint |
| DR-K2 | No Radix imports | Lint |
| DR-K3 | Copied components pass license and restyle checks (R4, R7) | Review before merge |
| DR-K4 | Kokonut components in use are limited to the eight in 3.2 until this file lists more | Review |
| **Accessibility and PWA** | | |
| DR-A1 | WCAG 2.2 AA on storefront and admin | Audit |
| DR-A2 | No action appears to succeed while offline | Offline test |
| DR-A3 | Chat messages and stock changes announced | Screen reader test |
| **Performance** | | |
| DR-P1 | Fonts: two self-hosted variable files plus Caveat on Home only, Latin subset, `font-display: swap` | Build report |
| DR-P2 | `domAnimation` globally, `domMax` only on morph routes | Bundle analysis |
| DR-P3 | Compiled CSS within 35 KB gzipped (target) | Build report |

---

## 17. Implementation Reference

### 17.1 File layout

```
frontend/src/styles/
  tokens/
    primitive.css     # one custom property per cell in 5.1
    semantic.css      # light and dark roles (17.3)
    compat.css        # shadcn name mapping (17.5)
    patterns.css      # furrow, seed grid, halftone (17.6)
    component.css     # optional
    motion.ts         # Motion presets (17.7)
  theme.css           # Tailwind v4 @theme bindings (17.4)
  icons.ts            # icon map and lucide to Phosphor re-exports
frontend/src/components/ui/          # coss ui wrappers
frontend/src/components/signature/   # Kokonut wrappers (3.2)
frontend/src/lib/cn.ts               # clsx + tailwind-merge
```

### 17.2 `tokens/primitive.css` (excerpt)

```css
:root {
  --soil-50: #FAF8F3;  --soil-100: #F3EFE6; --soil-200: #E7E1D3; --soil-300: #D3CBB8;
  --soil-400: #AFA690; --soil-500: #776F5D; --soil-600: #625C4D; --soil-700: #4A453A;
  --soil-800: #332F27; --soil-900: #211E19; --soil-950: #12100D;

  --green-50: #F1F7F2;  --green-100: #DDEEE1; --green-200: #BCDDC5; --green-300: #8FC49B;
  --green-400: #5FA675; --green-500: #3D8A5A; --green-600: #2D6F47; --green-700: #235A39;
  --green-800: #1B4630; --green-900: #133222; --green-950: #0B1F15;

  --sprout-100: #EAF9E1; --sprout-200: #D2F4BF; --sprout-300: #B5EC96;
  --sprout-400: #8FDD66; --sprout-500: #6CC93F;

  --bloom-100: #EEEBFB; --bloom-200: #DDD7F7; --bloom-300: #C2B8F0; --bloom-400: #A294E6;
  --bloom-500: #8473D6; --bloom-600: #6654BD; --bloom-700: #51429A; --bloom-900: #28214F;

  /* harvest-50 to 950 and rust-50 to 950 follow section 5.1, one line per cell */
}
```

### 17.3 `tokens/semantic.css`

```css
:root,
[data-theme="light"] {
  color-scheme: light;

  --bg-canvas: var(--soil-50);
  --bg-surface: #FFFFFF;
  --bg-muted: var(--soil-100);
  --bg-tint: var(--green-50);
  --bg-warm: var(--harvest-50);

  --tile-surface: #FFFFFF;
  --tile-mint: var(--sprout-200);
  --tile-sun: var(--harvest-200);
  --tile-bloom: var(--bloom-200);
  --tile-inverse: var(--soil-900);

  --fg-default: var(--soil-900);
  --fg-muted: var(--soil-600);
  --fg-subtle: var(--soil-500);
  --on-primary: #FFFFFF;
  --on-highlight: var(--soil-950);
  --on-danger: #FFFFFF;
  --on-inverse: var(--soil-50);

  --primary: var(--green-600);
  --primary-hover: var(--green-700);
  --primary-pressed: var(--green-800);
  --primary-subtle: var(--green-100);
  --primary-text: var(--green-700);

  --highlight: var(--harvest-500);
  --highlight-hover: var(--harvest-600);
  --highlight-subtle: var(--harvest-100);
  --highlight-text: var(--harvest-700);

  --success-text: var(--green-700);
  --warning-text: var(--harvest-700);
  --warning-subtle: var(--harvest-100);
  --danger-fill: var(--rust-600);
  --danger-hover: var(--rust-700);
  --danger-subtle: var(--rust-50);
  --danger-text: var(--rust-600);

  --focus-ring: var(--green-600);
  --field-edge: var(--soil-500);
  --overlay: rgb(18 16 13 / 0.45);
  --elevation-float: 0 16px 40px -16px rgb(18 16 13 / 0.28);

  --viz-1: var(--green-600);
  --viz-2: var(--bloom-500);
  --viz-3: var(--harvest-600);
  --viz-4: var(--soil-500);
  --viz-ghost: var(--soil-300);

  --duration-instant: 90ms;
  --duration-fast: 160ms;
  --duration-base: 240ms;
  --duration-moderate: 360ms;
  --duration-slow: 520ms;
  --duration-morph: 640ms;
  --duration-stock-flash: 900ms;

  --tile-gap: 12px;
  --tile-pad-sm: 12px;
  --tile-pad-md: 20px;
  --tile-pad-lg: 28px;
  --bento-row: 160px;
}

@media (min-width: 768px) {
  :root { --tile-gap: 16px; }
}

[data-theme="dark"] {
  color-scheme: dark;

  --bg-canvas: var(--soil-950);
  --bg-surface: var(--soil-900);
  --bg-muted: var(--soil-800);
  --bg-tint: var(--green-950);
  --bg-warm: var(--harvest-950);

  --tile-surface: var(--soil-900);
  --tile-mint: var(--green-900);
  --tile-sun: var(--harvest-900);
  --tile-bloom: var(--bloom-900);
  --tile-inverse: var(--soil-100);

  --fg-default: var(--soil-50);
  --fg-muted: var(--soil-300);
  --fg-subtle: var(--soil-400);
  --on-primary: var(--soil-950);
  --on-highlight: var(--soil-950);
  --on-danger: var(--soil-50);
  --on-inverse: var(--soil-900);

  --primary: var(--green-400);
  --primary-hover: var(--green-300);
  --primary-pressed: var(--green-200);
  --primary-subtle: var(--green-900);
  --primary-text: var(--green-300);

  --highlight: var(--harvest-400);
  --highlight-hover: var(--harvest-300);
  --highlight-subtle: var(--harvest-900);
  --highlight-text: var(--harvest-300);

  --success-text: var(--green-300);
  --warning-text: var(--harvest-300);
  --warning-subtle: var(--harvest-900);
  --danger-fill: var(--rust-500);
  --danger-hover: var(--rust-400);
  --danger-subtle: var(--rust-950);
  --danger-text: var(--rust-300);

  --focus-ring: var(--green-400);
  --field-edge: var(--soil-500);
  --overlay: rgb(18 16 13 / 0.7);
  --elevation-float: 0 16px 40px -12px rgb(0 0 0 / 0.6);

  --viz-1: var(--green-400);
  --viz-2: var(--bloom-400);
  --viz-3: var(--harvest-400);
  --viz-4: var(--soil-300);
  --viz-ghost: var(--soil-700);
}
```

### 17.4 `theme.css` (Tailwind v4)

```css
@import "tailwindcss";
@import "./tokens/primitive.css";
@import "./tokens/semantic.css";
@import "./tokens/compat.css";
@import "./tokens/patterns.css";

@theme inline {
  /* Surfaces and tiles */
  --color-canvas: var(--bg-canvas);
  --color-surface: var(--bg-surface);
  --color-muted: var(--bg-muted);
  --color-tint: var(--bg-tint);
  --color-warm: var(--bg-warm);
  --color-tile-mint: var(--tile-mint);
  --color-tile-sun: var(--tile-sun);
  --color-tile-bloom: var(--tile-bloom);
  --color-tile-inverse: var(--tile-inverse);

  /* Foreground */
  --color-fg: var(--fg-default);
  --color-fg-muted: var(--fg-muted);
  --color-fg-subtle: var(--fg-subtle);
  --color-on-primary: var(--on-primary);
  --color-on-highlight: var(--on-highlight);
  --color-on-danger: var(--on-danger);
  --color-on-inverse: var(--on-inverse);

  /* Brand and status */
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-pressed: var(--primary-pressed);
  --color-primary-subtle: var(--primary-subtle);
  --color-primary-text: var(--primary-text);
  --color-highlight: var(--highlight);
  --color-highlight-hover: var(--highlight-hover);
  --color-highlight-subtle: var(--highlight-subtle);
  --color-highlight-text: var(--highlight-text);
  --color-success-text: var(--success-text);
  --color-warning-text: var(--warning-text);
  --color-warning-subtle: var(--warning-subtle);
  --color-danger-fill: var(--danger-fill);
  --color-danger-hover: var(--danger-hover);
  --color-danger-subtle: var(--danger-subtle);
  --color-danger-text: var(--danger-text);

  /* Interaction and data */
  --color-focus-ring: var(--focus-ring);
  --color-field-edge: var(--field-edge);
  --color-viz-1: var(--viz-1);
  --color-viz-2: var(--viz-2);
  --color-viz-3: var(--viz-3);
  --color-viz-4: var(--viz-4);
  --color-viz-ghost: var(--viz-ghost);

  /* Type */
  --font-display: "Sora Variable", ui-sans-serif, system-ui, sans-serif;
  --font-sans: "Manrope Variable", ui-sans-serif, system-ui, sans-serif;
  --font-hand: "Caveat", ui-sans-serif, cursive;

  /* Shape */
  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 32px;
  --radius-2xl: 40px;

  /* Elevation */
  --shadow-float: var(--elevation-float);

  /* Motion */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --ease-breathe: cubic-bezier(0.65, 0, 0.35, 1);
}
```

Primitives are declared outside `@theme`, so they never become utilities.

### 17.5 `tokens/compat.css` (shadcn mapping for copied components)

```css
:root,
[data-theme="light"],
[data-theme="dark"] {
  --background: var(--bg-canvas);
  --foreground: var(--fg-default);
  --card: var(--bg-surface);
  --card-foreground: var(--fg-default);
  --popover: var(--bg-surface);
  --popover-foreground: var(--fg-default);
  /* --primary is already defined in semantic.css with the same meaning */
  --primary-foreground: var(--on-primary);
  --secondary: var(--bg-muted);
  --secondary-foreground: var(--fg-default);
  --muted: var(--bg-muted);
  --muted-foreground: var(--fg-muted);
  --accent: var(--bg-muted);              /* neutral hover surface, NOT Harvest (4.4) */
  --accent-foreground: var(--fg-default);
  --destructive: var(--danger-fill);
  --destructive-foreground: var(--on-danger);
  --border: transparent;                  /* zero-border rule (8.4) */
  --input: var(--field-edge);             /* inputs keep their edge */
  --ring: var(--focus-ring);
  --radius: var(--radius-md);
}
```

If a coss ui component expects extra status variables (for example success, warning, or info), add them here and map them to `--primary-text`, `--warning-text`, and `--fg-muted`. **[CONFIRM]** against the installed coss ui version (D2).

### 17.6 `tokens/patterns.css`

```css
:root {
  --furrow-line: color-mix(in oklab, var(--viz-ghost) 80%, transparent);
  --furrow-angle: 45deg;
  --furrow-gap: 6px;

  --pattern-furrow: repeating-linear-gradient(
    var(--furrow-angle),
    var(--furrow-line) 0 1.5px,
    transparent 1.5px var(--furrow-gap)
  );
  --pattern-seed-grid: radial-gradient(
    color-mix(in oklab, var(--soil-300) 50%, transparent) 1px,
    transparent 1.5px
  );
  --pattern-halftone: radial-gradient(
    color-mix(in oklab, var(--soil-500) 25%, transparent) 1.2px,
    transparent 1.8px
  );
}

.furrow { background-image: var(--pattern-furrow); }
.seed-grid { background-image: var(--pattern-seed-grid); background-size: 24px 24px; }
.halftone {
  background-image: var(--pattern-halftone);
  background-size: 10px 10px;
  mask-image: linear-gradient(to right, transparent 35%, #000);
}

@media (forced-colors: active) {
  .furrow, .seed-grid, .halftone { background-image: none; mask-image: none; }
}
```

### 17.7 `tokens/motion.ts`

```ts
import { useReducedMotion } from "motion/react";

// Seconds. Mirrors --duration-* in semantic.css.
export const duration = {
  instant: 0.09, fast: 0.16, base: 0.24, moderate: 0.36,
  slow: 0.52, morph: 0.64, stockFlash: 0.9,
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

export function useSpringPreset(name: SpringName) {
  const reduce = useReducedMotion();
  return reduce ? reduced : spring[name];
}
```

### 17.8 Registry and install notes

Add each Kokonut component with the full URL from 3.2. Review the generated file before moving it. A copy-in checklist for every component:

1. Move the file to `src/components/signature/` and rename the export to the wrapper name in 3.2.
2. Swap `lucide-react` imports to Phosphor (10.3).
3. Replace color, border, shadow, and radius classes with token utilities (4.3).
4. Confirm there is no Radix import (R3) and no runtime CDN call (R4).
5. Add reduced motion handling if the file animates without `useReducedMotion`.
6. Record the upstream URL and copy date in a one-line comment at the top of the file.

---

## 18. Assumptions and Open Decisions

| ID | Item | Decision or action | Status |
| --- | --- | --- | --- |
| **D1** | Rust signal | Kept as a single semantic signal for errors, destructive actions, out-of-stock | Decided |
| **D2** | coss ui install model | Verified 13 Nov 2026: coss ui (`coss.com/ui`) is the successor to Origin UI, built on Base UI, copy-in source. Origin UI remains as a legacy Radix-based snapshot with limited maintenance, so it is reference only. Installation of coss ui is copy-in through its own docs. Confirm component names and variable names against the version you copy (extra status variables, 17.5). | Decided, details **[CONFIRM]** |
| **D3** | Pantone matches | Confirm before print or signage | **[CONFIRM]** |
| **D4** | Typeface | Sora and Manrope kept. Caveat added for hero annotation. Drop Caveat if bundle or tone is a concern. Tokens are the only change. | Open |
| **D5** | Dark mode scope | Tokens defined now. Ship light first, enable dark in Phase 5. Check the inverse tile in dark (it becomes light). | Planned |
| **D6** | Kokonut UI license and maintenance | Component pages describe the library as free and open source. Confirm the license file in the repository before the first copy-in. | **[CONFIRM]** |
| **D7** | Icon names | Verify every name in 10.2 and 10.3 against the installed Phosphor version | **[CONFIRM]** |
| **D8** | Logo | Not defined. Until a mark exists, use a Sora 600 wordmark in `--fg-default`, shown on a white disc in `FloatNav`. | Open |
| **D9** | Tailwind | v4, CSS-first tokens | Decided |
| **D10** | Fonts | Self-hosted through fontsource, precached by the service worker | Decided |
| **D11** | Saved products | Blueprint has no wishlist table. Start with `localStorage` like the cart. Add a table only if the team approves a requirement change. | **[CONFIRM]** |
| **D12** | Product imagery | Tiles assume cut-out or neutral-background photos (reference 3). Photos with busy backgrounds go in a `--bg-muted` frame with `object-fit: cover`. Store owner supplies images. | Open |
| **D13** | Rename `--accent` to `--highlight` | Needed so copied shadcn-style code cannot turn amber (4.4). Update Button, badges, and any v1 usage. | Decided |
| **D14** | Plus membership tile | Blueprint lists AgriMart Plus as business model only. The feature tile pattern can carry it later. No UI in this release. | Open |
| **D15** | Bento grid and prices | Tile heights vary. Prices and stock remain server-computed (blueprint 3.2). Tiles never calculate totals. | Decided |

---

## 19. Migration from 1.0

| 1.0 | 2.0 | Action |
| --- | --- | --- |
| Ink scale (cool grey) | Soil scale (warm) | Replace primitives. `ink-*` utilities never existed, so only semantic mappings change. |
| `--accent`, `--accent-hover`, `--accent-subtle`, `--accent-text`, `--on-accent` | `--highlight*`, `--on-highlight` | Rename. Button variant `accent` becomes `highlight`. |
| `--bg-inverse`, `--on-inverse` | `--tile-inverse`, `--on-inverse` | Rename the fill. Toasts use `--tile-inverse`. |
| `eyebrow` type token | Removed | Use `body-lg` or a pill tag |
| Radii 6, 10, 14, 20, 28, 36 | 8, 12, 16, 24, 32, 40 | Update `theme.css`. Re-check concentric radii. |
| Card policy (limited list) | Tile policy (8.5) | Replace "no cards" checks with DR-L1 |
| Allowed lines: field edge, focus ring | Plus dropzone edge and hero CTA halo | Update lint allowlist |
| Flat, no patterns | Furrow, seed grid, halftone | Add `patterns.css` |
| Phosphor only | Phosphor only (Kokonut swapped) | Apply 10.3 on copy |
| Dashboard KPIs typographic on canvas | Tinted KPI tiles allowed | Pick one style per row |
| Contrast: soil/ink-500 never on canvas | soil-500 passes on paper (4.69) | Subtle text allowed on paper and white, not on muted |
| Manifest `background_color: #F5F7F7` | `#FAF8F3` | Update manifest |

---

*End of document. Changes to tokens go through a pull request that updates this file and `tokens/*.css` together.*
