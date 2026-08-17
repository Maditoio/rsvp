# Color Design System

Derived from the product screenshot (deep purple decision card, sage green canvas, lavender accent, slate selection state). Built for a premium SaaS product — calm, confident, a little unexpected.

---

## 1. Brand Colors

### Primary — Deep Plum (core UI, headers, primary surfaces)
| Token | Hex | Usage |
|---|---|---|
| `primary-50` | `#EFEDF6` | Subtle tinted backgrounds |
| `primary-100` | `#D9D4EA` | Hover backgrounds, disabled fills |
| `primary-200` | `#B3AAD5` | Borders on dark-tinted surfaces |
| `primary-300` | `#8C80C0` | Secondary icons, muted accents |
| `primary-400` | `#6B5DA0` | Hover states for primary elements |
| `primary-500` | `#4B4080` | Interactive default (buttons, links) |
| `primary-600` | `#3E3768` | **Core brand color** — card backgrounds, nav, headers |
| `primary-700` | `#2F2A50` | Pressed/active states |
| `primary-800` | `#211D3A` | Dark mode surfaces |
| `primary-900` | `#141224` | Deepest backgrounds, text on light |

### Secondary — Sage Green (canvas, success accents, breathing room)
| Token | Hex | Usage |
|---|---|---|
| `secondary-50` | `#F3F8ED` | Lightest tint, empty states |
| `secondary-100` | `#E4EFD8` | Card backgrounds, disabled states |
| `secondary-200` | `#D3E6BF` | Hover fills |
| `secondary-300` | `#C6DFB2` | **Core secondary color** — page/canvas background |
| `secondary-400` | `#AFCE92` | Borders, dividers on green surfaces |
| `secondary-500` | `#93B872` | Active/selected accents |
| `secondary-600` | `#759456` | Text on light green |
| `secondary-700` | `#5A7241` | Deep accents, icons |
| `secondary-800` | `#40522E` | High-contrast text |
| `secondary-900` | `#28331E` | Darkest sage |

### Accent — Lavender (highlights, badges, feature call-outs)
| Token | Hex | Usage |
|---|---|---|
| `accent-50` | `#F8F3FC` | Icon container backgrounds |
| `accent-100` | `#EFE1F8` | Light badge fills |
| `accent-200` | `#E9D9F7` | **Icon chip background** (e.g. "Guest info" icon) |
| `accent-300` | `#D2B4EE` | Hover accents |
| `accent-400` | `#B189DE` | Interactive accent |
| `accent-500` | `#9068C8` | Default accent icon/text |
| `accent-600` | `#7C5CAE` | **Icon glyph color** |
| `accent-700` | `#634890` | Pressed accent |
| `accent-800` | `#4A3670` | Dark accent surfaces |
| `accent-900` | `#332450` | Deepest accent |

---

## 2. Neutrals (Slate)

Used for the "selected/active" control state seen in the Yes/No toggle, plus all body text, borders, and chrome.

| Token | Hex | Usage |
|---|---|---|
| `slate-50` | `#F7F8FA` | App background (light mode) |
| `slate-100` | `#EDEEF2` | Card backgrounds, table stripes |
| `slate-200` | `#DBDEE5` | Borders, dividers |
| `slate-300` | `#B9BECB` | Disabled borders |
| `slate-400` | `#9298AB` | Placeholder text, disabled text |
| `slate-500` | `#6D7796` | **Selected control fill** (e.g. active "Yes" button) |
| `slate-600` | `#565F7A` | Secondary text |
| `slate-700` | `#434A60` | Body text |
| `slate-800` | `#2E3345` | Headings |
| `slate-900` | `#1B1E2A` | Primary text, near-black |
| `white` | `#FFFFFF` | Surfaces, cards, inverse text |

---

## 3. Semantic Colors

| Token | Hex | Usage |
|---|---|---|
| `success-500` | `#5FA85D` | Confirmations, positive states (harmonizes with sage) |
| `success-100` | `#DCF0DA` | Success background |
| `warning-500` | `#D9A441` | Caution states |
| `warning-100` | `#FBEED2` | Warning background |
| `error-500` | `#C4514E` | Destructive actions, validation errors |
| `error-100` | `#F7DEDD` | Error background |
| `info-500` | `#4A7FC7` | Informational states |
| `info-100` | `#DCE9FA` | Info background |

---

## 4. Component Mapping (from reference screenshot)

| Element | Token |
|---|---|
| Decision card background | `primary-600` |
| Page/app canvas | `secondary-300` |
| Selected toggle button (e.g. "Yes") | `slate-500` |
| Unselected toggle button | `primary-600` at 60% opacity, `slate-200` border |
| Active destination card | `white` background, `slate-900` text |
| Active card icon chip | `accent-200` background, `accent-600` glyph |
| Inactive/disabled destination card | `secondary-100` background, `slate-400` text |
| Connector line (active) | `slate-900` |
| Connector line (inactive) | `slate-300` |

---

## 5. Usage Principles

1. **Primary Deep Plum** carries authority — reserve for navigation, key surfaces, and primary CTAs. Avoid overusing at full saturation in large flat fields; pair with generous whitespace.
2. **Sage Green** is the "canvas" color — it should feel like air around the product, not a competing brand color. Best at 20–40% of any given screen.
3. **Lavender Accent** is scarce by design — icon chips, active badges, and one clear focal point per view. If everything is accented, nothing is.
4. **Slate neutrals** carry all text and functional UI (inputs, borders, disabled states) so brand colors stay meaningful.
5. **Contrast:** `primary-600` on `white` = AA for large text; use `slate-900` for body copy on light surfaces and `white`/`secondary-50` for text on `primary-600` or `primary-700`.
6. **Dark mode:** invert the neutral ramp (`slate-900` → background, `slate-50` → text), keep `primary-400`/`accent-400` for interactive elements since darker brand tones lose contrast on dark backgrounds.

---

## 6. Design Tokens (CSS Variables)

```css
:root {
  /* Primary */
  --color-primary-50: #EFEDF6;
  --color-primary-100: #D9D4EA;
  --color-primary-200: #B3AAD5;
  --color-primary-300: #8C80C0;
  --color-primary-400: #6B5DA0;
  --color-primary-500: #4B4080;
  --color-primary-600: #3E3768;
  --color-primary-700: #2F2A50;
  --color-primary-800: #211D3A;
  --color-primary-900: #141224;

  /* Secondary */
  --color-secondary-50: #F3F8ED;
  --color-secondary-100: #E4EFD8;
  --color-secondary-200: #D3E6BF;
  --color-secondary-300: #C6DFB2;
  --color-secondary-400: #AFCE92;
  --color-secondary-500: #93B872;
  --color-secondary-600: #759456;
  --color-secondary-700: #5A7241;
  --color-secondary-800: #40522E;
  --color-secondary-900: #28331E;

  /* Accent */
  --color-accent-50: #F8F3FC;
  --color-accent-100: #EFE1F8;
  --color-accent-200: #E9D9F7;
  --color-accent-300: #D2B4EE;
  --color-accent-400: #B189DE;
  --color-accent-500: #9068C8;
  --color-accent-600: #7C5CAE;
  --color-accent-700: #634890;
  --color-accent-800: #4A3670;
  --color-accent-900: #332450;

  /* Slate (Neutral) */
  --color-slate-50: #F7F8FA;
  --color-slate-100: #EDEEF2;
  --color-slate-200: #DBDEE5;
  --color-slate-300: #B9BECB;
  --color-slate-400: #9298AB;
  --color-slate-500: #6D7796;
  --color-slate-600: #565F7A;
  --color-slate-700: #434A60;
  --color-slate-800: #2E3345;
  --color-slate-900: #1B1E2A;
  --color-white: #FFFFFF;

  /* Semantic */
  --color-success-500: #5FA85D;
  --color-success-100: #DCF0DA;
  --color-warning-500: #D9A441;
  --color-warning-100: #FBEED2;
  --color-error-500: #C4514E;
  --color-error-100: #F7DEDD;
  --color-info-500: #4A7FC7;
  --color-info-100: #DCE9FA;
}
```

```js
// tailwind.config.js excerpt
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#EFEDF6', 100: '#D9D4EA', 200: '#B3AAD5', 300: '#8C80C0',
          400: '#6B5DA0', 500: '#4B4080', 600: '#3E3768', 700: '#2F2A50',
          800: '#211D3A', 900: '#141224',
        },
        secondary: {
          50: '#F3F8ED', 100: '#E4EFD8', 200: '#D3E6BF', 300: '#C6DFB2',
          400: '#AFCE92', 500: '#93B872', 600: '#759456', 700: '#5A7241',
          800: '#40522E', 900: '#28331E',
        },
        accent: {
          50: '#F8F3FC', 100: '#EFE1F8', 200: '#E9D9F7', 300: '#D2B4EE',
          400: '#B189DE', 500: '#9068C8', 600: '#7C5CAE', 700: '#634890',
          800: '#4A3670', 900: '#332450',
        },
        slate: {
          50: '#F7F8FA', 100: '#EDEEF2', 200: '#DBDEE5', 300: '#B9BECB',
          400: '#9298AB', 500: '#6D7796', 600: '#565F7A', 700: '#434A60',
          800: '#2E3345', 900: '#1B1E2A',
        },
      },
    },
  },
};
```
