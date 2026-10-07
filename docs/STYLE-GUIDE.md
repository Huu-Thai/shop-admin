# Shop Admin — Style Guide

The single source of truth for how Shop Admin looks and behaves. Every screen is built from these
tokens and components; a layout change starts here, not in a page. The live version, with every
token and component rendered, is at **`/style-guide`** in the running app.

Design direction: **"Ink"** — a calm, high-contrast workspace built on the base colour **#191919**
(near-black ink), warm off-white surfaces, and one vivid accent (**Lime**) used sparingly to mark
what is active or most important. Inspired by Mstore-style dashboards: dark navigation, light work
area, generous whitespace, data first.

---

## 1. Principles

1. **Data first.** Numbers, tables and states are the content; chrome stays quiet (neutral greys,
   thin borders, no decorative gradients in the work area).
2. **One accent.** Lime means "active / primary highlight" (current navigation item, primary chart
   series, focus on dark surfaces). Never use it for body text or large fills on light surfaces.
3. **Meaning has one colour.** Success green, warning amber, danger red, info blue — used only for
   status, never for decoration.
4. **Accessible by default.** Text contrast ≥ 4.5:1 (≥ 3:1 for large text and control boundaries;
   every pairing in this guide is measured, not estimated), every
   control reachable by keyboard with a visible focus ring, motion that respects
   `prefers-reduced-motion`.
5. **Consistency over cleverness.** A new screen reuses the page templates (§8); a new pattern is
   added to this guide and the style-guide page before it ships.

---

## 2. Colour

All colours are CSS custom properties (`src/theme/tokens.css`) exposed to Tailwind as utilities
(`bg-surface`, `text-fg-muted`, `border-border` …). Components use **semantic tokens**, never raw
hex values, so themes (light, dark, presets) change everything at once.

### 2.1 Ink — the neutral scale (built from #191919)

| Token     | Hex       | Use                                                  |
| --------- | --------- | ---------------------------------------------------- |
| `ink-950` | `#0F0F0F` | Dark-mode page background                            |
| `ink-900` | `#191919` | **Base.** Sidebar, primary buttons, headings, hero   |
| `ink-800` | `#232323` | Sidebar hover, dark-mode surfaces                    |
| `ink-700` | `#2E2E2E` | Sidebar active row, borders on dark                  |
| `ink-600` | `#3D3D3D` | Dark-mode raised borders                             |
| `ink-500` | `#5C5C5C` | Secondary text on light (6.7:1 on white)             |
| `ink-400` | `#8A8A8A` | Input borders (3.45:1), icons at rest, disabled text |
| `ink-300` | `#B8B8B8` | Sidebar text, strong borders                         |
| `ink-200` | `#E4E4E2` | Borders and dividers                                 |
| `ink-100` | `#EFEFED` | Subtle fills (table header, hover)                   |
| `ink-50`  | `#F6F6F4` | Page background (warm off-white)                     |
| `white`   | `#FFFFFF` | Cards, inputs, header                                |

### 2.2 Lime — the accent

| Token      | Hex       | Use                                                           |
| ---------- | --------- | ------------------------------------------------------------- |
| `lime-50`  | `#F7FDE8` | Selected table row, subtle accent fill                        |
| `lime-100` | `#ECFAC7` | Accent badge background                                       |
| `lime-300` | `#D4F27A` | Hero glow, chart secondary series                             |
| `lime-400` | `#C3EB4D` | **Accent.** Active nav pill, primary chart series, CTA on ink |
| `lime-700` | `#5C7A0E` | Accent text on light surfaces (4.95:1 on white)               |
| `lime-900` | `#2F3F08` | Dark lime for icons on lime fills (8.3:1 on `lime-400`)       |

Text on a lime fill is always `ink-900` (12.8:1). `lime-400` is never used as text on light surfaces;
use `lime-700` when accent-coloured text is needed.

### 2.3 Status colours

| Role    | Solid (icons, bars) | Soft background | Text on soft |
| ------- | ------------------- | --------------- | ------------ |
| Success | `#16A34A`           | `#EAF7EE`       | `#166534`    |
| Warning | `#D97706`           | `#FEF4E2`       | `#92400E`    |
| Danger  | `#DC2626`           | `#FDECEC`       | `#991B1B`    |
| Info    | `#2563EB`           | `#EAF1FE`       | `#1E40AF`    |

Commerce statuses map onto these roles in one place (`src/features/orders/tones.ts`) and render
through `StatusBadge` — never pick a tone ad hoc. Waiting on someone (pending payment, unpaid,
unfulfilled) is **warning**; under way or partial (processing, partially fulfilled / refunded,
awaiting collection) is **info**; done (complete, paid, fulfilled, captured) is **success**;
cancelled orders and failed payments are **danger**; closed, refunded and cancelled payments are
**neutral**.

Publishing (`src/features/publishing`, `PublishBadge`) follows the same roles: live is **success**,
scheduled **info**, ended or waiting on something else (a promotion whose campaign isn't live)
**warning**, drafts and archives **neutral**.

### 2.4 Chart palette (in order)

`#191919` (ink), `#C3EB4D` (lime), `#7C8CF8` (periwinkle), `#F59E8B` (coral), `#5CC2B4` (teal),
`#E9B949` (honey). Dark mode swaps ink for `#EDEDEB`. Never encode meaning by colour alone — add
labels or patterns.

### 2.5 Semantic tokens (what components use)

| Token               | Light              | Dark               | Role                                      |
| ------------------- | ------------------ | ------------------ | ----------------------------------------- |
| `--bg`              | ink-50             | ink-950            | Page background                           |
| `--surface`         | white              | ink-900            | Cards, header, inputs, popovers           |
| `--surface-muted`   | ink-100            | ink-800            | Table header, hover, subtle fills         |
| `--surface-inverse` | ink-900            | `#262626`          | Sidebar, hero, tooltips                   |
| `--fg`              | ink-900            | `#F2F2F0`          | Primary text                              |
| `--fg-muted`        | ink-500            | ink-300            | Secondary text                            |
| `--fg-subtle`       | `#6b6b69` (4.6:1+) | ink-400 (4.5:1+)   | Placeholders, hints, footnotes            |
| `--fg-inverse`      | white              | white              | Text on inverse surfaces (they stay dark) |
| `--border`          | ink-200            | ink-700            | Default borders                           |
| `--border-strong`   | ink-400 (3.45:1)   | `#6E6E6E` (3.45:1) | Input and control boundaries              |
| `--primary`         | ink-900            | lime-400           | Primary buttons                           |
| `--primary-fg`      | white              | ink-900            | Text on primary                           |
| `--accent`          | lime-400           | lime-400           | Active markers, highlights                |
| `--accent-fg`       | ink-900            | ink-900            | Text on accent                            |
| `--ring`            | ink-900            | lime-400           | Focus ring                                |

### 2.6 Colour by component

| Component        | Background        | Text / icon                     | Border / accent                       |
| ---------------- | ----------------- | ------------------------------- | ------------------------------------- |
| Sidebar          | `surface-inverse` | ink-300; active white           | Active: ink-800 row + 3 px lime bar   |
| Sidebar section  | —                 | ink-400, 11 px caps (5.1:1)     | —                                     |
| Header           | `surface`         | `fg`, icons `fg-muted`          | Bottom `border`                       |
| Body             | `bg`              | `fg`                            | —                                     |
| Hero / welcome   | `surface-inverse` | `fg-inverse`, lime highlight    | Blurred lime glow (25 % opacity)      |
| Card             | `surface`         | `fg`                            | 1 px `border`, `shadow-xs`            |
| Stat card        | `surface`         | Label `fg-muted`, value `fg`    | Delta badge: success/danger soft      |
| Table            | `surface`         | Header `fg-muted` caps          | Header `surface-muted`, rows `border` |
| Primary button   | `primary`         | `primary-fg`                    | Hover ink-800 (light)                 |
| Accent button    | `accent`          | `accent-fg`                     | Used on inverse surfaces (hero)       |
| Secondary button | `surface`         | `fg`                            | 1 px `border-strong`                  |
| Ghost button     | transparent       | `fg-muted`                      | Hover `surface-muted`                 |
| Danger button    | danger solid      | white                           | —                                     |
| Input            | `surface`         | `fg`; placeholder `fg-subtle`   | `border-strong`; focus `ring`         |
| Badge            | status soft       | status text                     | —                                     |
| Tooltip          | `surface-inverse` | `fg-inverse`                    | —                                     |
| Menu / popover   | `surface`         | `fg`                            | `border`, `shadow-lg`                 |
| Icon             | —                 | `fg-muted` at rest, `fg` active | 1.75 px stroke (Lucide)               |

---

## 3. Typography

- **UI font:** Inter (variable, `next/font`, subset latin + latin-ext + vietnamese).
- **Mono:** JetBrains Mono — SKUs, order numbers, IDs, code.
- **Numerals:** tabular (`font-variant-numeric: tabular-nums`) in tables, stats and money.

| Style         | Size / line | Weight | Use                                    |
| ------------- | ----------- | ------ | -------------------------------------- |
| `display`     | 36 / 44     | 600    | Stat values on the dashboard hero      |
| `h1`          | 28 / 36     | 600    | Page title (one per page)              |
| `h2`          | 22 / 30     | 600    | Section title                          |
| `h3`          | 18 / 26     | 600    | Card title                             |
| `h4`          | 16 / 24     | 600    | Sub-section, dialog title              |
| `body-lg`     | 16 / 24     | 400    | Empty states, onboarding               |
| `body`        | 14 / 20     | 400    | Default UI text                        |
| `body-strong` | 14 / 20     | 500    | Labels, table emphasis                 |
| `small`       | 13 / 18     | 400    | Table cells, helper text               |
| `caption`     | 12 / 16     | 500    | Table headers (caps, +0.04em), badges  |
| `overline`    | 11 / 16     | 600    | Sidebar section labels (caps, +0.08em) |

Headings use `letter-spacing: -0.01em` (≥ 22 px: -0.02em). Line length for prose ≤ 72 characters.

---

## 4. Spacing, radius, elevation

**Spacing** — 4 px grid: `1`=4, `2`=8, `3`=12, `4`=16, `5`=20, `6`=24, `8`=32, `10`=40, `12`=48,
`16`=64. Inside components prefer 8/12/16; between sections 24/32.

**Radius**

| Token  | px   | Use                         |
| ------ | ---- | --------------------------- |
| `xs`   | 4    | Checkboxes, small chips     |
| `sm`   | 6    | Badges, small buttons       |
| `md`   | 8    | Buttons, inputs, menu items |
| `lg`   | 12   | Cards, tables, popovers     |
| `xl`   | 16   | Dialogs, hero, drawers      |
| `full` | 9999 | Avatars, pills, switches    |

**Elevation** (shadows tinted with ink, never pure black)

| Token       | Value                                                          | Use             |
| ----------- | -------------------------------------------------------------- | --------------- |
| `shadow-xs` | `0 1px 2px rgb(25 25 25 / .05)`                                | Cards           |
| `shadow-sm` | `0 1px 3px rgb(25 25 25 / .08), 0 1px 2px rgb(25 25 25 / .04)` | Raised controls |
| `shadow-md` | `0 6px 16px -4px rgb(25 25 25 / .10)`                          | Sticky bars     |
| `shadow-lg` | `0 16px 40px -8px rgb(25 25 25 / .18)`                         | Menus, dialogs  |

---

## 5. Layout

| Element           | Size                                                        |
| ----------------- | ----------------------------------------------------------- |
| Sidebar           | 264 px expanded, 76 px collapsed; off-canvas < 1024 px      |
| Header            | 64 px, sticky                                               |
| Content max width | 1440 px (forms 880 px)                                      |
| Page gutter       | 32 px ≥ 1280, 24 px ≥ 768, 16 px below                      |
| Grid              | 12 columns, 24 px gap (16 px < 768)                         |
| Card padding      | 24 px (20 px compact, 16 px < 768)                          |
| Table row         | 52 px comfortable, 40 px compact                            |
| Controls          | Height 32 (sm) / 40 (md, default) / 48 (lg)                 |
| Icons             | 16 (inline, small buttons), 20 (default), 24 (empty states) |
| Breakpoints       | sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536              |

**Page anatomy** (every screen): header bar → page header (breadcrumbs, `h1`, description,
primary actions on the right) → content (cards / table) → optional sticky action bar for forms.

---

## 6. Motion

| Token  | Duration | Easing                     | Use                         |
| ------ | -------- | -------------------------- | --------------------------- |
| `fast` | 120 ms   | `cubic-bezier(.2,0,0,1)`   | Hover, press, colour        |
| `base` | 180 ms   | `cubic-bezier(.2,0,0,1)`   | Menus, tooltips, accordions |
| `slow` | 260 ms   | `cubic-bezier(.16,1,.3,1)` | Drawers, dialogs, sidebar   |

All motion collapses to instant under `prefers-reduced-motion: reduce`.

---

## 7. Components

Each lives in `src/components/ui`, takes `className` for extension, forwards refs, and is shown on
`/style-guide` in every variant and state (default, hover, focus, disabled, loading, error).

- **Button** — `primary · secondary · ghost · accent · danger · link`; sizes `sm · md · lg · icon`;
  `loading` shows a spinner and keeps width. One primary button per area.
- **Input, Textarea, Select, Checkbox, Switch, Radio** — 40 px, label above (13 px, 500), helper or
  error text below (13 px); errors use danger text and border, with `aria-invalid`.
- **Badge** — `neutral · success · warning · danger · info · accent`; 22 px high, `caption` text.
- **Card** — header (title + actions), body, optional footer separated by a border.
- **Stat** — label, value (`display` or `h1`), delta badge, optional sparkline.
- **Table** — sortable headers, sticky header, row hover, selection checkbox column (40 px), right-
  aligned numbers, empty and loading states, pagination footer.
- **Dialog, Drawer, Dropdown menu, Popover, Tooltip, Tabs, Toast** — Radix primitives styled here.
- **Avatar, Skeleton, Spinner, Empty state, Page header, Breadcrumbs, Pagination, Kbd.**
- **Combobox** — searchable single or multiple choice; static options or remote search (debounced);
  chips for multiple values; ↑ ↓ Enter Esc.
- **Radio, RadioCard** — classic radios for 2–4 short options; cards (icon, title, one-line
  description) for consequential choices such as the product type.
- **Sheet** — right side panel (480 / 720 px) for create / edit without leaving a list.
- **Confirm** — destructive confirmation; stays open with a spinner until the action resolves.
- **SortableList** — drag handle or Space + arrow keys; announces moves to screen readers.
- **Dropzone** — drop or click to browse; dashed `border-strong`, accent-soft while dragging over.
- **List toolbar** — search (`?search=`, debounced) and filter selects bound to URL parameters; an
  active filter gets a `primary` border.
- **SaveBar** — sticky at the bottom on `surface-inverse` while a form is dirty, with Discard and an
  accent Save; also warns before leaving the page. Toasts open top-right so they never cover it.
- **MoneyInput** — amounts in major units with the currency code as a suffix, right-aligned in
  tabular figures; values are converted to integer minor units with the currency's decimals and more
  decimals than the currency allows are refused, never rounded.
- **Locale switcher** — monospace locale chips above translatable fields; a warning dot marks a
  language that is still missing a required value.

Live examples of every one are in `/style-guide` → Patterns.

States: hover = `surface-muted` fill (or 8 % darker for solid); pressed = 12 %; disabled = 50 %
opacity, no pointer; focus = 2 px `ring` + 2 px offset (`bg` colour).

---

## 8. Page templates

1. **List** — page header with "New" action → filter bar (search, filters, saved views) → table
   card → pagination.
2. **Detail** — page header with status badge and actions → two columns (main 2/3, side 1/3 for
   summary, timeline, metadata) → stacked on < 1024 px.
3. **Form** — 880 px max, sections as cards with title + description on the left (≥ 1280 px) or
   above, sticky bottom bar with Cancel / Save when dirty.
4. **Dashboard** — hero (welcome + key totals on ink) → 4 stat cards → chart (2/3) + breakdown
   (1/3) → recent activity table.
5. **Settings** — secondary navigation on the left (240 px), form sections on the right.

---

## 9. Content and voice

Sentence case everywhere ("New product", not "New Product"). Buttons are verbs ("Save changes").
Empty states say what is missing and offer the action. Errors say what happened and what to do.
Numbers use the shop's locale and currency formatting; dates are relative within 7 days
("3 h ago") and absolute after ("12 Nov 2026, 14:05").

---

## 10. Themes

`data-theme` on `<html>` selects a preset; `class="dark"` selects dark mode. Presets override only
semantic tokens (§2.5) and the accent scale — see `docs/THEMING.md`. Shipped presets: **Ink**
(default, lime accent), **Ink · Cobalt** (blue), **Ink · Coral**, **Ink · Teal**, **Ink · Amber**
and **Ink · Violet** — every one passes the same AA contrast tests in light and dark mode.
