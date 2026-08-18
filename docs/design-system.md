# Design System — v3 "Delegation"

Direction: government/ministerial summit and formal RSVP platforms (think a UN summit or WEF registration system, not a party app). Sharp, structured, quiet — color is used with intent, never as decoration.

This file has two parts: **§1–5 are the system itself.** **§6 is written as direct instructions for an AI coding assistant (Cursor)** to migrate an existing UI to this style — paste that section into Cursor as-is when doing the refactor.

---

## 1. Color

### 1.1 Primitives

**Ink (primary — text, primary actions, structure)**
| Token | Hex |
|---|---|
| `ink-50` | `#F1F2F4` |
| `ink-100` | `#E1E3E8` |
| `ink-200` | `#C7CAD3` |
| `ink-300` | `#A3A8B5` |
| `ink-400` | `#7C8191` |
| `ink-500` | `#5A5F70` |
| `ink-600` | `#3B4150` |
| `ink-700` | `#1F2937` — core: primary buttons, headings, active states |
| `ink-800` | `#141A24` |
| `ink-900` | `#0A0D13` |

**Bronze (accent — used sparingly: eyebrow labels, pending/premium states, one highlight per screen)**
| Token | Hex |
|---|---|
| `bronze-50` | `#FBF7EE` |
| `bronze-100` | `#F5EFE1` |
| `bronze-200` | `#E9DBB8` |
| `bronze-300` | `#D9C08A` |
| `bronze-400` | `#C4A55E` |
| `bronze-500` | `#B4923F` — core accent |
| `bronze-600` | `#8A6A20` |
| `bronze-700` | `#6B5218` |
| `bronze-800` | `#4C3A11` |
| `bronze-900` | `#2E230A` |

**Moss (secondary — confirmed/success states only)**
| Token | Hex |
|---|---|
| `moss-50` | `#F2F6F1` |
| `moss-100` | `#EAF0E9` |
| `moss-200` | `#CFDDCB` |
| `moss-300` | `#A8C29F` |
| `moss-400` | `#85A879` |
| `moss-500` | `#6E8F63` |
| `moss-600` | `#3F5E3B` — core text on moss-100 |
| `moss-700` | `#2E4529` |
| `moss-800` | `#1F2F1B` |
| `moss-900` | `#131D10` |

**Stone (neutral — warm paper gray, replaces the violet-tinted gray from v2)**
| Token | Hex |
|---|---|
| `stone-0` | `#FFFFFF` |
| `stone-50` | `#F6F5F2` — **app canvas** |
| `stone-100` | `#EEEAE0` |
| `stone-200` | `#E4E0D6` — default card/input border |
| `stone-300` | `#C9C3B4` |
| `stone-400` | `#A39B87` |
| `stone-500` | `#8B8578` — muted text, eyebrow labels |
| `stone-600` | `#6B6558` |
| `stone-700` | `#5F5A4D` — secondary body text |
| `stone-800` | `#3D392F` |
| `stone-900` | `#211E19` |

### 1.2 Semantic tokens

| Token | Value | Usage |
|---|---|---|
| `bg-canvas` | `stone-50` | Page background |
| `bg-surface` | `stone-0` | Cards, panels, drawers |
| `border-default` | `stone-200` | Standard border |
| `text-primary` | `ink-700` | Headings, high-emphasis |
| `text-secondary` | `stone-700` | Body copy |
| `text-muted` | `stone-500` | Captions, eyebrow labels |
| `interactive-default` | `ink-700` | Primary buttons, links |
| `interactive-hover` | `ink-800` | Hover of the above |
| `accent` | `bronze-500` | Eyebrow labels, pending states, single highlight |
| `success` / `success-bg` | `moss-600` / `moss-100` | Confirmed status |
| `warning` / `warning-bg` | `bronze-600` / `bronze-100` | Pending status |
| `danger` / `danger-bg` | `#8A2E26` / `#F5E2DF` | Declined, destructive |
| `info` / `info-bg` | `#3E5578` / `#E4EAF1` | Informational status |

### 1.3 The color rule (this is the part that matters most)

**Structure is monochrome. Status is color.** Cards, chrome, buttons, and layout use only `ink` and `stone` — no colored backgrounds on containers. Color appears in exactly three places: (1) status tags/tiles (confirmed = moss, pending = bronze, declined = red, waitlisted = stone), (2) the bronze eyebrow label that names the context ("Global policy summit 2026"), and (3) a left-edge 3px color bar on status elements rather than a fully filled colored background. If you're about to fill a large area with a brand color, stop — that's a v2 instinct, not this system.

---

## 2. Foundations

### 2.1 Typography

| Role | Typeface | Used for |
|---|---|---|
| Display | **Source Serif 4** (weight 500–600) | Summit/event titles, drawer headlines, page titles — restrained, editorial, never body text |
| UI / Body | **Public Sans** (weight 400–600) — the U.S. government design system typeface; reads structured and civic without being cold | Everything functional |
| Data / Mono | **IBM Plex Mono** | Reference numbers, delegate IDs, timestamps |

| Token | Size | Weight | Typeface |
|---|---|---|---|
| `text-display` | 1.375rem (22px) | 600 | Source Serif 4 |
| `text-heading` | 1.125rem (18px) | 600 | Public Sans |
| `text-body` | 0.9375rem (15px) | 400 | Public Sans |
| `text-body-strong` | 0.9375rem (15px) | 600 | Public Sans |
| `text-caption` | 0.8125rem (13px) | 500 | Public Sans |
| `text-eyebrow` | 0.6875rem (11px) | 600, uppercase, letter-spacing 0.06em | Public Sans |

### 2.2 Radius — sharp, structured

No more pill-first shape logic. Corners are small and consistent; they signal precision, not playfulness.

| Token | Value | Used for |
|---|---|---|
| `radius-xs` | 3px | Checkboxes, tag corners |
| `radius-sm` | 4px | Buttons, inputs, option tiles |
| `radius-md` | 6px | Cards, dropdown panels |
| `radius-lg` | 8px | Drawer panel (leading edge only — see §3.9), standalone modals |
| `radius-full` | 999px | **Only** avatars and small status dots — never buttons, cards, or tags |

### 2.3 Elevation

Flat by default. `border: 1px solid stone-200` does the work most systems ask shadows to do.

| Token | Value | Used for |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgba(10,13,19,0.06)` | Hover on interactive cards |
| `shadow-md` | `0 4px 14px rgba(10,13,19,0.10)` | Dropdowns, popovers |
| `shadow-lg` | `0 8px 28px rgba(10,13,19,0.16)` | Drawers, modals |

### 2.4 Spacing

`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64` px — same discipline as before, name `space-1`–`space-16`.

---

## 3. Components

### 3.1 Buttons — rectangular, `radius-sm` (4px), never pill

| Variant | Default | Hover |
|---|---|---|
| Primary | `bg: ink-700`, `text: white` | `bg: ink-800` |
| Secondary | `bg: transparent`, `border: 1px solid stone-300`, `text: ink-700` | `border: ink-400` |
| Ghost | `bg: transparent`, `text: stone-700` | `bg: stone-100` |
| Destructive | `bg: #8A2E26`, `text: white` | darken 10% |

Height 44px default, `space-5` horizontal padding, `text-body-strong`. One Primary button per screen — everything else is Secondary or Ghost.

### 3.2 Status tags — left-edge bar, not filled pill

`height: 24px`, `radius-xs`, `padding: 0 space-2`, tinted background (e.g. `moss-100`) + `border-left: 3px solid` the mid-tone (`moss-500`) + `text-caption` in the dark tone (`moss-600`). This reads like a credential/status marker, not a decorative badge. Reserve a fully filled dark tag (`bg: ink-700`, white text) for one special designation per system — e.g. "Delegate pass" — so it stays meaningful.

### 3.3 Cards / registration tiles

- `bg: stone-0`, `border: 1px solid stone-200`, `radius-md` (6px), no shadow at rest.
- Header block (if present) gets a bottom border and the `text-eyebrow` bronze label above the `text-display` title — this is the one place bronze and serif appear together, so it stays a signature, not a habit.
- **Option tiles** (replacing both the segmented control and the stacked buttons from earlier versions): two tiles side by side, `radius-sm`, `border: 1.5px solid stone-200`. Selected tile: `bg: ink-700`, `border: ink-700`, white text, with a one-line description below the label in a lighter tone. Unselected tile stays white/outlined. This is the pattern for binary choices like "In person / Remote."

### 3.4 Forms & fields

- Input: `height: 42px`, `radius-sm`, `border: 1px solid stone-300`, `bg: stone-0` (or `#FDFCFA` for a slightly warmer field tone), `padding: 0 space-4`, `text-body`.
- Focus: `border: ink-700`, `shadow: 0 0 0 3px rgba(31,41,55,0.12)` — a monochrome focus ring, not colored, to stay consistent with the "structure is monochrome" rule.
- Label: `text-caption` weight 600, `ink-700`, `space-2` above.
- Checkbox: `17px`, `radius-xs`, checked = `bg: ink-700`. Radio: circular, checked = 1.5px `ink-700` ring + centered dot.
- Error state: border → danger, helper text in danger below, with an inline icon.

### 3.5 Dropdown / menu

`bg-surface`, `radius-md`, `shadow-md`, `border: stone-200`. Items `36px` height, `radius-sm` on hover (`bg: stone-100`). No color in the default item state — only destructive items get danger text.

### 3.6 Sidebar

`bg: stone-0`, right border `1px solid stone-200`, flat. Active nav item: `bg: stone-100`, `text: ink-700` weight 600, plus a `3px` `ink-700` left bar — same "bar not fill" logic as status tags, for visual consistency across the system.

### 3.7 Toolbar

`height: 56px`, `bg: stone-0`, bottom border `stone-200`. Page title in `text-heading`, or `text-display` (Source Serif 4) for a top-level summit/event name. One Primary button max in the action cluster.

### 3.8 Calendar

Square-ish day cells (`radius-xs`, not circular — matches the sharp-corner language), selected = `bg: ink-700` white text, today = `1.5px border ink-400` no fill, range middle = `bg: ink-50`.

### 3.9 Forms as right-side drawers (not centered modals)

This is the key interaction change. **Any form — registering a delegate, editing a session, RSVP details — opens as a panel sliding in from the right edge of the screen, not a centered modal.** Centered modals are reserved for short confirmations only (e.g. "Cancel this registration?").

**Drawer spec:**
- Width: `420px` (sm — single field or two), `480px` (md — default form), `560px` (lg — long/multi-section form). Full viewport height.
- Position: fixed to the right edge, `radius-lg` (8px) on the **top-left and bottom-left corners only** — the right edge is flush with the viewport, so it should not be rounded. This is deliberate: it reads as a panel attached to the screen edge, not a floating card.
- Overlay: `bg: rgba(10,13,19,0.45)` (ink-900 at 45%), covers the rest of the screen, click-to-dismiss.
- Entrance: overlay fades in 150ms; panel translates `translateX(100%) → translateX(0)` over 250ms ease-out. Exit is the reverse. No bounce/overshoot — this should feel precise, not springy.
- Header: `padding: space-6`, bottom border `stone-200`, `text-heading` title on the left, Ghost close button (×) on the right.
- Body: scrollable, `padding: space-6`, form fields per §3.4, grouped with `space-6` between sections and a `1px stone-200` divider between distinct sections (e.g. "Attendee details" / "Session preferences").
- Footer: pinned to the bottom of the drawer (not the viewport), `padding: space-4 space-6`, top border `stone-200`, `bg: stone-0`. Secondary (Cancel) on the left, Primary (Save/Submit) on the right.
- On small viewports (<640px), the drawer becomes full-width instead of a fixed px width, radius drops to 0.

---

## 4. Tokens (CSS variables)

```css
:root {
  --ink-50:#F1F2F4; --ink-100:#E1E3E8; --ink-200:#C7CAD3; --ink-300:#A3A8B5;
  --ink-400:#7C8191; --ink-500:#5A5F70; --ink-600:#3B4150; --ink-700:#1F2937;
  --ink-800:#141A24; --ink-900:#0A0D13;

  --bronze-50:#FBF7EE; --bronze-100:#F5EFE1; --bronze-200:#E9DBB8; --bronze-300:#D9C08A;
  --bronze-400:#C4A55E; --bronze-500:#B4923F; --bronze-600:#8A6A20; --bronze-700:#6B5218;
  --bronze-800:#4C3A11; --bronze-900:#2E230A;

  --moss-50:#F2F6F1; --moss-100:#EAF0E9; --moss-200:#CFDDCB; --moss-300:#A8C29F;
  --moss-400:#85A879; --moss-500:#6E8F63; --moss-600:#3F5E3B; --moss-700:#2E4529;
  --moss-800:#1F2F1B; --moss-900:#131D10;

  --stone-0:#FFFFFF; --stone-50:#F6F5F2; --stone-100:#EEEAE0; --stone-200:#E4E0D6;
  --stone-300:#C9C3B4; --stone-400:#A39B87; --stone-500:#8B8578; --stone-600:#6B6558;
  --stone-700:#5F5A4D; --stone-800:#3D392F; --stone-900:#211E19;

  --bg-canvas: var(--stone-50);
  --bg-surface: var(--stone-0);
  --border-default: var(--stone-200);
  --text-primary: var(--ink-700);
  --text-secondary: var(--stone-700);
  --text-muted: var(--stone-500);
  --interactive-default: var(--ink-700);
  --interactive-hover: var(--ink-800);
  --accent: var(--bronze-500);
  --success: var(--moss-600); --success-bg: var(--moss-100);
  --warning: var(--bronze-600); --warning-bg: var(--bronze-100);
  --danger:#8A2E26; --danger-bg:#F5E2DF;
  --info:#3E5578; --info-bg:#E4EAF1;

  --radius-xs:3px; --radius-sm:4px; --radius-md:6px; --radius-lg:8px; --radius-full:999px;

  --shadow-sm: 0 1px 2px rgba(10,13,19,0.06);
  --shadow-md: 0 4px 14px rgba(10,13,19,0.10);
  --shadow-lg: 0 8px 28px rgba(10,13,19,0.16);

  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px; --space-5:20px;
  --space-6:24px; --space-8:32px; --space-10:40px; --space-12:48px; --space-16:64px;

  --drawer-width-sm:420px; --drawer-width-md:480px; --drawer-width-lg:560px;
}
```

```js
// tailwind.config.js excerpt
module.exports = {
  theme: {
    extend: {
      colors: {
        ink:    { 50:'#F1F2F4',100:'#E1E3E8',200:'#C7CAD3',300:'#A3A8B5',400:'#7C8191',500:'#5A5F70',600:'#3B4150',700:'#1F2937',800:'#141A24',900:'#0A0D13' },
        bronze: { 50:'#FBF7EE',100:'#F5EFE1',200:'#E9DBB8',300:'#D9C08A',400:'#C4A55E',500:'#B4923F',600:'#8A6A20',700:'#6B5218',800:'#4C3A11',900:'#2E230A' },
        moss:   { 50:'#F2F6F1',100:'#EAF0E9',200:'#CFDDCB',300:'#A8C29F',400:'#85A879',500:'#6E8F63',600:'#3F5E3B',700:'#2E4529',800:'#1F2F1B',900:'#131D10' },
        stone:  { 0:'#FFFFFF',50:'#F6F5F2',100:'#EEEAE0',200:'#E4E0D6',300:'#C9C3B4',400:'#A39B87',500:'#8B8578',600:'#6B6558',700:'#5F5A4D',800:'#3D392F',900:'#211E19' },
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'serif'],
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: { xs:'3px', sm:'4px', md:'6px', lg:'8px', full:'999px' },
    },
  },
};
```

---

## 5. Do / Don't

| Do | Don't |
|---|---|
| Rectangular buttons, 4px radius | Pill-shaped buttons |
| Status color as a tinted bg + left bar | Status color as a fully saturated filled pill |
| Bronze used once per screen, near the title | Bronze/color scattered across multiple elements |
| Forms open as a right-side drawer | Forms open as a centered modal |
| Serif only for the title in a card/drawer header | Serif for body copy or buttons |
| Flat cards, border only | Shadow on every resting card |

---

## 6. Instructions for the AI coding assistant (paste into Cursor)

Use the following as direct implementation instructions when migrating the existing UI to this system.

1. **Replace the color tokens.** Swap any existing purple/violet/lavender/sage variables for the `ink` / `bronze` / `moss` / `stone` scales defined in §4. `ink-700` (`#1F2937`) becomes the new primary interactive color, replacing whatever was previously used for primary buttons and active states.

2. **Remove pill shapes except on avatars and status dots.** Find every `border-radius: 9999px` / `rounded-full` on a button, card, tag, or input and replace it per §2.2: buttons and inputs → `radius-sm` (4px), cards and menus → `radius-md` (6px), drawers/modals → `radius-lg` (8px). Do not leave any pill-shaped button or tag in the interface.

3. **Convert status pills to bar-tags.** Any tag/badge that is currently a fully filled colored pill (e.g. solid green "Confirmed") should become: `radius-xs`, a light tint background (`{color}-100`), a `3px solid {color}-500` left border, and `{color}-600` text — per §3.2. This applies to every status indicator in the product (RSVP status, session status, payment status, etc).

4. **Convert every form-opening modal into a right-side drawer.** Any interaction that currently opens a centered modal containing form fields (create/edit/register flows) must be rebuilt using the drawer spec in §3.9: fixed to the right edge, slides in via `translateX`, rounded only on the left corners, header/body/sticky-footer layout, widths from `--drawer-width-sm/md/lg` depending on form length. **Keep centered modals only for confirmation dialogs with no form fields** (e.g. delete/cancel confirmations) — do not convert those to drawers.

5. **Apply the color rule from §1.3 everywhere.** Audit every container (cards, sidebar, toolbar, page background) — if it currently has a saturated brand color as its background fill, change it to `stone-0` or `stone-50`. Color should only remain on: status tags, the single primary button per view, and the bronze eyebrow label pattern in card/drawer headers. If more than one accent color appears on a single screen outside of a status list, that's a bug — fix it down to one.

6. **Update typography.** Load `Source Serif 4` for display/title text only (drawer headers, card titles, page titles) and `Public Sans` for all other UI text, replacing whatever body/heading font is currently in use. Do not use the serif for buttons, labels, table cells, or body paragraphs.

7. **Update binary-choice UI** (any existing Yes/No toggle, segmented control, or stacked full-width buttons) to the **option tile** pattern in §3.3: two side-by-side tiles, `radius-sm`, selected = filled `ink-700` with white text and a one-line description, unselected = outlined white.

8. **Flatten elevation.** Remove default `box-shadow` from resting cards and replace with `border: 1px solid var(--stone-200)`. Shadows should only remain on: dropdown menus, drawers, modals, and tooltips (§2.3).

9. **Do not use any radius value, color, or font not defined in §1, §2.1, and §2.2.** If a component needs something not covered here, flag it rather than inventing a new token.
