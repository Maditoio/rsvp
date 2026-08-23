# Design System — "Aurora" (Modern Soft SaaS)

A complete, self-contained alternative to `design-system-v3-ministerial.md`. Rounded corners, light floating shadows, one confident accent color, generous whitespace — the Linear/Vercel/Notion school of modern SaaS. Colors are freely chosen for this direction; nothing here is derived from your existing brand.

Pick one system (Ministerial or Aurora) as the app's actual design language — don't mix them. Everything below is internally consistent on its own.

---

## 1. Color

### 1.1 Primitives

**Indigo (primary — the one confident accent, used generously but intentionally)**
| Token | Hex |
|---|---|
| `indigo-50` | `#EEF2FF` |
| `indigo-100` | `#E0E7FF` |
| `indigo-200` | `#C7D2FE` |
| `indigo-300` | `#A5B4FC` |
| `indigo-400` | `#818CF8` |
| `indigo-500` | `#6366F1` |
| `indigo-600` | `#4F46E5` — core: primary buttons, active states, links |
| `indigo-700` | `#4338CA` |
| `indigo-800` | `#3730A3` |
| `indigo-900` | `#312E81` |

**Slate (neutral — text, borders, backgrounds)**
| Token | Hex |
|---|---|
| `slate-50` | `#F8FAFC` — app canvas |
| `slate-100` | `#F1F5F9` — subtle fills, table stripes |
| `slate-200` | `#E2E8F0` — borders |
| `slate-300` | `#CBD5E1` — disabled borders |
| `slate-400` | `#94A3B8` — placeholder/muted text, icons |
| `slate-500` | `#64748B` — secondary text |
| `slate-600` | `#475569` — body text |
| `slate-700` | `#334155` — headings |
| `slate-800` | `#1E293B` — high emphasis |
| `slate-900` | `#0F172A` — near-black, primary text |
| `white` | `#FFFFFF` — cards, surfaces |

**Secondary accents (used sparingly — avatar gradients, category tags, chart series; never for primary actions)**
| Token | Hex | Used for |
|---|---|---|
| `violet-500` | `#8B5CF6` | Secondary category tags, alt avatar gradient |
| `rose-500` | `#F43F5E` | Alt avatar gradient, destructive-adjacent accents |
| `teal-500` | `#14B8A6` | Alt avatar gradient, alt category tag |
| `amber-500` | `#F59E0B` | Warning, alt avatar gradient |

### 1.2 Semantic tokens

| Token | Value | Usage |
|---|---|---|
| `bg-canvas` | `slate-50` | Page background |
| `bg-surface` | `white` | Cards, menus, modals |
| `bg-surface-sunken` | `slate-50` | Inset areas within a card (e.g. code blocks) |
| `border-default` | `slate-200` | Standard border |
| `text-primary` | `slate-900` | Headings |
| `text-secondary` | `slate-600` | Body |
| `text-muted` | `slate-400` | Captions, placeholders |
| `interactive-default` | `indigo-600` | Primary buttons, links, active states |
| `interactive-hover` | `indigo-700` | Hover of the above |
| `focus-ring` | `indigo-500` at 30% | Focus outlines |
| `success` / `success-bg` | `#059669` / `#ECFDF5` | Active, confirmed, positive |
| `warning` / `warning-bg` | `#B45309` / `#FFFBEB` | Pending, needs attention |
| `danger` / `danger-bg` | `#DC2626` / `#FEF2F2` | Errors, destructive |
| `info` / `info-bg` | `#2563EB` / `#EFF6FF` | Informational |

### 1.3 The color rule

Indigo is the **only** accent used for interactive/actionable elements (buttons, links, active nav, focus rings, checked states). Secondary accents (violet/rose/teal/amber) exist purely for **decorative categorization** — avatar gradients so different people look visually distinct, or category tags where there's no real "success/warning" semantic (e.g. a project-type label). Never use a secondary accent on a button or anything clickable — that's indigo's job alone, so the eye always knows what's actionable.

---

## 2. Foundations

### 2.1 Typography

Single typeface family: **Inter** (400/500/600/700). This genre doesn't mix display/body fonts — the personality comes from color, shape, and shadow, not typography contrast.

| Token | Size | Weight | Letter-spacing |
|---|---|---|---|
| `text-display` | 24px | 700 | -0.02em |
| `text-heading` | 19px | 700 | -0.01em |
| `text-subheading` | 15px | 600 | -0.01em |
| `text-body` | 13.5px | 400 | normal |
| `text-body-strong` | 13.5px | 600 | normal |
| `text-caption` | 12px | 500 | normal |
| `text-label` | 11.5px | 600, uppercase | 0.04em |

### 2.2 Radius — round by default

| Token | Value | Used for |
|---|---|---|
| `radius-sm` | 8px | Checkboxes, small chips, table kebab button |
| `radius-md` | 12px | Inputs (non-pill variant), dropdown menus, tooltips |
| `radius-lg` | 16px | Small-to-medium cards |
| `radius-xl` | 20px | Large cards, modals, page-level containers |
| `radius-full` | 999px | **Default for buttons, search fields, tags/pills, avatars, pagination controls** — this is the dominant shape in this system, unlike Ministerial where full radius was the exception |

### 2.3 Shadow — light and layered, present at rest

Unlike a flat system, cards here **do** carry a soft shadow at rest — that's the "floating" quality that defines this look.

| Token | Value | Used for |
|---|---|---|
| `shadow-xs` | `0 1px 2px rgba(15,23,42,0.04)` | Inputs, small chips |
| `shadow-sm` | `0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.05)` | Resting cards |
| `shadow-md` | `0 1px 2px rgba(15,23,42,0.04), 0 12px 32px rgba(15,23,42,0.06)` | Elevated cards, dropdowns |
| `shadow-lg` | `0 4px 12px rgba(15,23,42,0.08), 0 20px 48px rgba(15,23,42,0.10)` | Modals, drawers |
| `shadow-accent` | `0 4px 12px rgba(79,70,229,0.28)` | Primary button — a tinted shadow matching the button's own color, not gray |

### 2.4 Spacing

Same 4px-based scale as before: `4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64`.

### 2.5 Motion

- Hover/color transitions: 150ms ease-out.
- Menus/dropdowns/modals: 200ms ease-out, combine opacity + an 8px translate + a subtle scale (`0.98 → 1`) — this system *can* use a gentle scale-in (unlike Ministerial, which explicitly avoided it), since a soft bounce fits the friendlier tone. Keep the scale subtle — 2% max, never a bounce/overshoot.
- Buttons: slight `transform: translateY(-1px)` on hover for primary buttons only, reinforcing the "floating" feel; reverse on active/press (`translateY(0)`).

---

## 3. Components

### 3.1 Buttons — pill-shaped, tinted shadow on primary

| Variant | Default | Hover |
|---|---|---|
| Primary | `bg: indigo-600`, `text: white`, `radius-full`, `shadow-accent` | `bg: indigo-700`, `translateY(-1px)` |
| Secondary | `bg: white`, `border: 1px solid slate-200`, `text: slate-700`, `radius-full` | `border: slate-300`, `bg: slate-50` |
| Ghost | `bg: transparent`, `text: slate-600`, `radius-full` | `bg: slate-100` |
| Destructive | `bg: #DC2626`, `text: white`, `radius-full` | darken 8% |

Height 40px (md, default), 36px (sm), 46px (lg). Icon + label buttons: icon at 15–16px, `gap: 6px`.

### 3.2 Tags, badges, status pills

Always `radius-full`, always with a small leading dot for status (not a left bar, unlike Ministerial):

```
● Active     bg: success-bg, text: success, dot: #10B981
● Pending    bg: warning-bg, text: warning, dot: #F59E0B
● Declined   bg: danger-bg,  text: danger,  dot: #EF4444
```

`height: 24px`, `padding: 0 10px`, `text-caption` weight 600, `gap: 5px` between dot and label. Category tags (non-status, e.g. role labels) drop the dot and use a secondary accent tint: `bg: violet-50-equivalent (violet-500 at 10% opacity)`, `text: violet-700-equivalent`.

Count badge: small solid circle, `bg: indigo-600`, white text, `min-width: 20px`, `radius-full`.

### 3.3 Avatars

`radius-full`, gradient background (`linear-gradient(135deg, {light}, {dark})` from one of: indigo, rose, teal, amber, violet — assigned deterministically per user ID so the same person always gets the same gradient), white initials, `font-weight: 600`. Sizes: 24 / 32 / 34 / 40px. Optional online-status dot: 8px circle, `bg: #10B981`, white 2px ring, bottom-right corner.

### 3.4 Cards

- `bg: white`, `radius-xl` (20px) for page-level containers / `radius-lg` (16px) for smaller cards, `shadow-sm` **at rest** (this is the key difference from Ministerial — shadow is present by default, not just on hover).
- Hover (if interactive): `shadow-md`, optional `translateY(-2px)`.
- Padding: `space-6`–`space-7` (24–28px).
- No visible border by default — the shadow alone separates it from the canvas. Only add a hairline `slate-100` border on cards sitting directly against other white surfaces where a shadow wouldn't read (e.g. inside a modal).

### 3.5 Forms & fields

- **Text input (pill variant, default for search/simple fields):** `height: 38–40px`, `radius-full`, `border: 1px solid slate-200`, `bg: slate-50`, `padding: 0 16px` (or `0 16px 0 36px` with a leading icon). Focus: `border: indigo-500`, `box-shadow: 0 0 0 4px rgba(99,102,241,0.12)`.
- **Text input (rounded-rect variant, for longer forms/multi-field layouts where an all-pill form looks odd):** same styling but `radius-md` (12px) instead of full. Use pill for single standalone fields like search; use rounded-rect for grouped form fields in a settings panel or drawer.
- Label: `text-caption` weight 600, `slate-700`, `margin-bottom: 6px`.
- Checkbox: `18px`, `radius-sm` (8px — still visibly rounded, not sharp), checked = `bg: indigo-600`, white check.
- Radio: circular, checked = `indigo-600` ring + dot.
- Toggle switch: track `radius-full`, `bg: slate-200` off / `indigo-600` on, thumb white circle with `shadow-xs`, smooth 150ms slide.
- Segmented control: pill track (`bg: slate-100`, `radius-full`, `padding: 3px`), selected segment = white pill with `shadow-xs` inset, `text: slate-900` weight 600.

### 3.6 Search & filter chips

Search: pill input per §3.5 with leading `search` icon, `slate-400`. Filter chip (dropdown trigger): pill, `bg: slate-50`, `border: slate-200`, `text: slate-600`, trailing chevron, `radius-full`. Active/applied filter: `bg: indigo-50`, `text: indigo-700`, `border: indigo-200`, with a small `×` to clear.

### 3.7 Dropdown / menu

`bg: white`, `radius-md` (12px — menus stay in the "rounded rectangle" tier, not full pill, since a pill-shaped dropdown panel would look strange), `shadow-md`, `border: none` (shadow alone separates it), `padding: 6px`. Items: `height: 36px`, `radius-sm` (8px), `padding: 0 10px`, hover `bg: slate-50`. Selected item: `bg: indigo-50`, `text: indigo-700` weight 600, checkmark right-aligned in `indigo-600`. Destructive item: `text: #DC2626`, hover `bg: #FEF2F2`.

### 3.8 Calendar / date picker

- Container: `bg: white`, `radius-xl` (20px), `shadow-md`, `padding: space-5`.
- Day cell: `36×36px` circle (`radius-full`). Default `text: slate-700`. Hover `bg: slate-100`. Today: `border: 1.5px solid indigo-300`. Selected: `bg: indigo-600`, white text, `shadow-accent` at reduced opacity. Range: endpoints solid indigo, middle days `bg: indigo-50` with a connecting pill-shaped band behind the circles (rounded only at the two ends of the range, flat/joined in between).

### 3.9 Sidebar

- `bg: white`, no border — separate from canvas via a very light shadow on the sidebar's right edge (`2px 0 12px rgba(15,23,42,0.03)`) rather than a hard line, keeping the "everything floats" language consistent.
- Nav item: `height: 38px`, `radius-full` (pill, matching the button language), `padding: 0 14px`. Active: `bg: indigo-50`, `text: indigo-700` weight 600, icon `indigo-600` — no left bar (that's a Ministerial convention); the filled pill itself is the indicator.
- Section labels: `text-label`, `slate-400`.

### 3.10 Toolbar / topbar

`height: 60px`, `bg: white`, subtle bottom shadow instead of a border (`0 1px 0 rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.03)`), `padding: 0 space-6`. Search field (pill) often lives centered or left in the toolbar in this genre. One primary pill button in the action cluster; secondary actions as Ghost icon buttons in circles (`radius-full`, `36×36px`, hover `bg: slate-100`).

### 3.11 Modal (centered)

- Overlay: `bg: rgba(15,23,42,0.4)`, backdrop-blur optional (`backdrop-filter: blur(2px)` — a very "modern SaaS" touch, skip if performance-sensitive).
- Panel: `bg: white`, `radius-xl` (20px), `shadow-lg`, max-width 480/600/720px (sm/md/lg).
- Entrance: fade + `scale(0.97 → 1)` + `translateY(8px → 0)`, 200ms ease-out.
- Header/body/footer follow the same structure as Ministerial (§3.9 there) — padding `space-6`, footer top border `slate-100`, actions right-aligned, Secondary before Primary.

### 3.12 Side drawer (forms)

Same functional pattern as Ministerial's drawer (forms open from the right, confirmations stay centered), styled for this system:
- Width 420/480/560px, full height, `bg: white`.
- `radius-xl` (20px) on the top-left and bottom-left corners only (right edge flush with viewport).
- `shadow-lg` on the left edge (`-8px 0 32px rgba(15,23,42,0.10)`) since there's no border to separate it from the overlay.
- Entrance: `translateX(100% → 0)`, 250ms ease-out, no scale (translate-only reads cleaner for a full-height panel than a scale would).
- Sticky footer, `bg: white`, top shadow instead of border (`0 -1px 0 rgba(15,23,42,0.04), 0 -4px 12px rgba(15,23,42,0.03)`).

### 3.13 Tables

(Full worked example already generated earlier in this conversation — recap of the pattern:)
- Container: `bg: white`, `radius-xl` (20px), `shadow-sm`, no border.
- Header row: no fill (plain white), `text-label`, `slate-400`, bottom `1px solid slate-100`.
- Row: `padding: 14px 28px`, hover `bg: slate-50`, checkbox column for bulk select, avatar+name+email pattern for the primary column, status pills per §3.2, circular kebab button (`radius-full`, `30px`, hover `bg: slate-100`) as the last column.
- Footer: row count left, circular pagination controls right (`radius-full`, `30×30px`, current page = solid `indigo-600` fill).
- Toolbar above the table: pill search + pill filter chip, per §3.6.

### 3.14 Tooltip

`bg: slate-900`, `text: white`, `text-caption`, `radius-md` (12px — not full pill, tooltips read oddly as pills), `padding: 6px 10px`, `shadow-md`, small triangle pointer, 400ms hover delay.

### 3.15 Toast

`bg: white`, `radius-lg` (16px), `shadow-lg`, `padding: 14px 16px`, leading colored icon-in-circle (`success`/`warning`/`danger`/`info` tint, `radius-full`, 32px) instead of a left border bar, message text, optional action link in `indigo-600`, auto-dismiss 5s.

### 3.16 Pagination

Circular buttons, `30×30px`, `radius-full`. Current page: solid `indigo-600` fill, white text. Others: `text: slate-600`, hover `bg: slate-100`. Prev/next as Ghost circular icon buttons, disabled = `text: slate-300`.

### 3.17 Progress bar / stat card

- Progress bar: track `bg: slate-100`, `radius-full`, height 8px; fill `bg: indigo-600`, `radius-full`, smooth width transition 300ms.
- Stat card: `bg: white`, `radius-lg`, `shadow-sm`, `padding: space-5`. Label `text-caption` `slate-400` uppercase. Value `text-display` size but tabular numerals, `slate-900`. Optional small trend pill (`+12%` in `success` tint or `-4%` in `danger` tint) next to the value.

### 3.18 Empty state

Centered, optional soft circular icon container (`96px`, `radius-full`, `bg: indigo-50`, icon `indigo-500` at 32px) above a `text-heading` headline and one line of `text-body` `slate-500`, one Primary pill button below.

### 3.19 Command palette (bonus — very characteristic of this genre)

`bg: white`, `radius-xl` (20px), `shadow-lg`, centered overlay, `max-width: 560px`. Pill search input pinned at top (no border, just a bottom `1px solid slate-100` divider), results list below using the Dropdown item styling (§3.7), grouped with `text-label` section headers. Triggered via `⌘K` — worth adding to this system since it's a hallmark of the genre.

---

## 4. Tokens (CSS variables)

```css
:root {
  --indigo-50:#EEF2FF; --indigo-100:#E0E7FF; --indigo-200:#C7D2FE; --indigo-300:#A5B4FC;
  --indigo-400:#818CF8; --indigo-500:#6366F1; --indigo-600:#4F46E5; --indigo-700:#4338CA;
  --indigo-800:#3730A3; --indigo-900:#312E81;

  --slate-50:#F8FAFC; --slate-100:#F1F5F9; --slate-200:#E2E8F0; --slate-300:#CBD5E1;
  --slate-400:#94A3B8; --slate-500:#64748B; --slate-600:#475569; --slate-700:#334155;
  --slate-800:#1E293B; --slate-900:#0F172A; --white:#FFFFFF;

  --violet-500:#8B5CF6; --rose-500:#F43F5E; --teal-500:#14B8A6; --amber-500:#F59E0B;

  --bg-canvas: var(--slate-50);
  --bg-surface: var(--white);
  --border-default: var(--slate-200);
  --text-primary: var(--slate-900);
  --text-secondary: var(--slate-600);
  --text-muted: var(--slate-400);
  --interactive-default: var(--indigo-600);
  --interactive-hover: var(--indigo-700);

  --success:#059669; --success-bg:#ECFDF5;
  --warning:#B45309; --warning-bg:#FFFBEB;
  --danger:#DC2626; --danger-bg:#FEF2F2;
  --info:#2563EB; --info-bg:#EFF6FF;

  --radius-sm:8px; --radius-md:12px; --radius-lg:16px; --radius-xl:20px; --radius-full:999px;

  --shadow-xs: 0 1px 2px rgba(15,23,42,0.04);
  --shadow-sm: 0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.05);
  --shadow-md: 0 1px 2px rgba(15,23,42,0.04), 0 12px 32px rgba(15,23,42,0.06);
  --shadow-lg: 0 4px 12px rgba(15,23,42,0.08), 0 20px 48px rgba(15,23,42,0.10);
  --shadow-accent: 0 4px 12px rgba(79,70,229,0.28);

  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:20px;
  --space-6:24px; --space-7:28px; --space-8:32px; --space-10:40px; --space-12:48px; --space-16:64px;
}

[data-theme="dark"] {
  --bg-canvas: var(--slate-900);
  --bg-surface: #1A2233;
  --border-default: var(--slate-800);
  --text-primary: var(--slate-50);
  --text-secondary: var(--slate-300);
  --text-muted: var(--slate-500);
  --interactive-default: var(--indigo-400);
  --interactive-hover: var(--indigo-300);
}
```

```js
// tailwind.config.js excerpt
module.exports = {
  theme: {
    extend: {
      colors: {
        indigo: { 50:'#EEF2FF',100:'#E0E7FF',200:'#C7D2FE',300:'#A5B4FC',400:'#818CF8',500:'#6366F1',600:'#4F46E5',700:'#4338CA',800:'#3730A3',900:'#312E81' },
        slate:  { 50:'#F8FAFC',100:'#F1F5F9',200:'#E2E8F0',300:'#CBD5E1',400:'#94A3B8',500:'#64748B',600:'#475569',700:'#334155',800:'#1E293B',900:'#0F172A' },
        violet: { 500:'#8B5CF6' }, rose: { 500:'#F43F5E' }, teal: { 500:'#14B8A6' }, amber: { 500:'#F59E0B' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      borderRadius: { sm:'8px', md:'12px', lg:'16px', xl:'20px', full:'999px' },
      boxShadow: {
        xs: '0 1px 2px rgba(15,23,42,0.04)',
        sm: '0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.05)',
        md: '0 1px 2px rgba(15,23,42,0.04), 0 12px 32px rgba(15,23,42,0.06)',
        lg: '0 4px 12px rgba(15,23,42,0.08), 0 20px 48px rgba(15,23,42,0.10)',
        accent: '0 4px 12px rgba(79,70,229,0.28)',
      },
    },
  },
};
```

---

## 5. Do / Don't

| Do | Don't |
|---|---|
| Pill buttons, pill tags, pill avatars | Sharp/square corners anywhere except menu panels |
| Shadow present on resting cards | Cards relying only on a border |
| One indigo for everything actionable | Multiple accent colors on clickable elements |
| Gradient avatars for identity | Plain gray circles with initials |
| Tinted shadow under the primary button | Generic gray shadow on a colored button |
| Dot-prefixed status pills | Left-bar status tags (that's the other system) |

---

## 6. Instructions for Cursor

1. Install **Inter** as the sole typeface (`@fontsource/inter` or Google Fonts), replacing whatever font(s) are currently loaded.
2. Replace all existing color tokens with the `indigo`/`slate`/secondary-accent scales in §4. `indigo-600` (`#4F46E5`) becomes the single primary interactive color.
3. Change the default border-radius on buttons, inputs (standalone/search), tags, avatars, and pagination controls to `radius-full`. Cards get `radius-xl` (20px) or `radius-lg` (16px) depending on size — never sharp corners.
4. Add a resting `shadow-sm` to every card component — this system shows elevation at rest, unlike a flat/bordered style. Increase to `shadow-md` on hover for interactive cards.
5. Rebuild status tags as dot-prefixed pills per §3.2 (colored dot + tinted pill background), not bar-tags.
6. Rebuild avatars as gradient-filled circles with initials, gradient assigned deterministically by user ID from the four secondary accent pairs in §3.3.
7. Rebuild all dropdown menus, modals, and the side drawer per §3.7/§3.11/§3.12 — rounded corners, shadow instead of border, subtle scale-in entrance on centered modals only (not the side drawer, which stays translate-only).
8. Apply the table pattern from §3.13 to every data table in the app, consistent with the shared table component approach already established.
9. Add a command palette (§3.19) bound to `⌘K` / `Ctrl+K` if there isn't one already — it's a defining feature of this design language and meaningfully improves navigation speed for power users.
10. Do not mix this system with any tokens/components from `design-system-v3-ministerial.md` — pick one as the actual system of record for the app.
