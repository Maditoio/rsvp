# Design System — Aurora (v4)

Direction: modern soft SaaS (Linear / Vercel / Notion school). Rounded corners, light floating shadows, one confident indigo accent, generous whitespace. **Do not mix with the former Ministerial (ink/stone/bronze) system.**

Full specification, HTML samples, and screenshots live in:

`docs/DESIGN SYSTEM COMPLETE_V3/design-system-v4-aurora.md`

---

## 1. Color

### Primitives

- **Indigo** (`indigo-50` … `indigo-900`) — the only interactive accent. Core: `indigo-600` `#4F46E5`.
- **Slate** (`slate-50` … `slate-900`) + `white` — canvas, text, borders.
- Secondary accents (`violet-500`, `rose-500`, `teal-500`, `amber-500`) — decorative only (avatars, category tags). Never on buttons or links.

### Semantic

| Token | Value | Usage |
|---|---|---|
| Canvas | `slate-50` | Page background |
| Surface | `white` | Cards, menus, drawers |
| Border | `slate-200` | When a border is needed |
| Text primary | `slate-900` | Headings |
| Text secondary | `slate-600` | Body |
| Text muted | `slate-400` | Captions, placeholders |
| Interactive | `indigo-600` / hover `indigo-700` | Buttons, links, active nav |
| Success / Warning / Danger / Info | see globals `@theme` | Status only |

Legacy class names `ink-*`, `stone-*`, `bronze-*`, `moss-*` are aliased in `globals.css` for gradual migration. Prefer `indigo` / `slate` in new code.

---

## 2. Foundations

- **Typeface:** Inter only (400/500/600/700).
- **Radius:** `sm` 8px · `md` 12px · `lg` 16px · `xl` 20px · `full` 999px. Pills are the default for buttons, search, tags, avatars, pagination.
- **Shadow:** Cards use resting `shadow-sm`. Primary buttons use tinted `shadow-accent`. Floating UI uses `shadow-md` / `shadow-lg`.
- **Spacing:** 4px scale (`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64`).
- **Motion:** 150ms color/hover; 200ms menus/modals with opacity + 8px translate + subtle scale (`0.98→1`). Drawers: translate-only.

---

## 3. Component rules (summary)

- **Buttons:** Pill. Primary = indigo + accent shadow + slight lift on hover. Secondary = white + slate border. Ghost / Destructive as specified in the Aurora doc.
- **Status pills:** Dot + tinted background + `radius-full`. Not left-bar tags.
- **Cards:** White, `radius-xl`/`lg`, resting shadow, no border by default.
- **Forms:** Pill search; rounded-rect (`radius-md`) for grouped drawer/settings fields. Focus ring indigo.
- **Sidebar:** White, soft right shadow (no hard border). Active nav = indigo-50 pill, no left bar.
- **Drawer:** Right side, `radius-xl` on left corners, translate entrance. Forms open in drawers; confirmations stay centered modals.
- **Tables:** White container, soft shadow, uppercase muted headers, circular pagination, pill search/filters.

---

## 4. Product UX (unchanged)

- Multi-tenant event platform; lists stay on the page; create/edit opens a single right-side drawer.
- Do not invent a second parallel design language beside Aurora.
