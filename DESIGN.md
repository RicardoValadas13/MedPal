# MedPal — Design System

Design theme: **Compassionate Utility**  
Brand personality: Human-First Healthcare — clinical precision with human warmth.  
Every screen should feel like a trusted companion, not a cold medical tool.

---

## Colors

Use these CSS variables. Do not invent new colors outside this palette.

```css
:root {
  /* Backgrounds */
  --bg:                    #faf9f5;  /* main page background (eggshell) */
  --surface:               #ffffff;  /* cards, modals, inputs */
  --surface-low:           #f4f4f0;  /* section backgrounds, sidebars */
  --surface-high:          #e9e8e4;  /* hover states, dividers */

  /* Primary — Deep Charcoal / Slate Blue */
  --primary:               #192830;  /* nav, headings, primary buttons */
  --primary-container:     #2f3e46;  /* dark sections, active sidebar items */
  --on-primary:            #ffffff;

  /* Secondary — Sage Green (positive / success) */
  --secondary:             #49654d;
  --secondary-container:   #cbebcd;  /* badges, success chips, taken medication */
  --on-secondary:          #ffffff;

  /* Tertiary — Warm Coral (alerts / missed) */
  --tertiary:              #f3896d;  /* missed doses, warnings — NOT red/alarming */
  --tertiary-container:    #6d230f;

  /* Text */
  --on-surface:            #1b1c1a;  /* primary text */
  --on-surface-variant:    #43474a;  /* secondary text, captions */

  /* Borders */
  --outline:               #73787b;  /* input borders */
  --outline-variant:       #c3c7ca;  /* card borders, dividers */
}
```

### Color rules
- **Sage green** → success, completed, taken, positive milestones
- **Warm coral** → missed, overdue, alerts (warm tone — not punitive)
- **Slate blue** → navigation, primary actions, authority
- Never use pure red for errors — use `--tertiary` or a muted red `#ba1a1a` for critical only
- Background is **never pure white** — always use `--bg` (#faf9f5) for page backgrounds

---

## Typography

Font: **Inter** (Google Fonts)  
Import: `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`

```css
body {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 18px;       /* minimum body size — accessibility requirement */
  line-height: 1.6;
  color: var(--on-surface);
}
```

| Role            | Size  | Weight | Use case                          |
|-----------------|-------|--------|-----------------------------------|
| Display         | 32px  | 700    | Hero headings                     |
| Headline Large  | 24px  | 600    | Page titles, section headers      |
| Headline Mobile | 22px  | 600    | Same on narrow viewports          |
| Body XL         | 20px  | 400    | Lead paragraphs                   |
| Body MD         | 18px  | 400    | Default body text (**minimum**)   |
| Label           | 16px  | 600    | Buttons, form labels, nav items   |
| Caption         | 14px  | 500    | Timestamps, helper text           |

Letter spacing: `-0.02em` on headlines, `0.05em` on uppercase labels.

---

## Spacing

Base unit: **8px**. All spacing must be multiples of 8.

| Token              | Value | Use case                          |
|--------------------|-------|-----------------------------------|
| `--space-xs`       | 4px   | Tight icon/text gaps              |
| `--space-sm`       | 12px  | Compact list rows                 |
| `--space-md`       | 24px  | Card padding, form fields         |
| `--space-lg`       | 32px  | Section gaps                      |
| `--space-xl`       | 48px  | Major section padding             |
| `--space-container`| 20px  | Side margins on mobile            |
| `--space-gutter`   | 16px  | Column gutters                    |

For healthcare components (medication cards, patient records) — always use `--space-md` (24px) minimum padding. Never feel cluttered.

---

## Layout

- **Max content width:** 1200px, centered
- **Mobile:** 4-column grid, 20px side margins
- **Desktop/tablet:** 12-column grid

```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}
```

### Backoffice sidebar layout
```
┌─────────────┬──────────────────────────────────┐
│  Sidebar    │  Main Content Area               │
│  240px      │  flex: 1, padding: 32px          │
│  bg: --primary-container                       │
│  color: #fff│  bg: --bg                        │
└─────────────┴──────────────────────────────────┘
```

---

## Border Radius

Always use rounded corners — they communicate friendliness and safety.

| Token      | Value  | Use case                        |
|------------|--------|---------------------------------|
| `--r-sm`   | 4px    | Chips, small tags               |
| `--r-md`   | 8px    | Buttons, inputs, small cards    |
| `--r-lg`   | 16px   | Cards, modals, containers       |
| `--r-xl`   | 24px   | Large panels, phone mockups     |
| `--r-full` | 9999px | Pill badges, avatars, toggles   |

---

## Elevation & Shadows

No heavy shadows. Use tonal layers instead.

```css
/* Card hover / active state */
box-shadow: 0 8px 32px rgba(25, 40, 48, 0.08);

/* Primary buttons / floating elements */
box-shadow: 0 4px 16px rgba(25, 40, 48, 0.12);

/* Modals / drawers */
box-shadow: 0 24px 64px rgba(25, 40, 48, 0.16);
```

- Shadow tint always uses primary color `#192830`, never black
- Max opacity: 18%. Never heavy drop shadows.
- Cards "pop" by having `--surface` (#fff) background against `--bg` (#faf9f5)

---

## Components

### Buttons

```css
/* All buttons: min-height 48px for touch targets */
.btn {
  min-height: 48px;
  padding: 12px 24px;
  border-radius: 8px;         /* --r-md */
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.01em;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}
.btn:hover { opacity: 0.88; transform: translateY(-1px); }

.btn-primary   { background: var(--primary); color: #fff; }
.btn-secondary { background: var(--secondary); color: #fff; }        /* positive action: "Mark Taken" */
.btn-ghost     { background: transparent; border: 1.5px solid var(--outline-variant); color: var(--on-surface); }
.btn-danger    { background: #ba1a1a; color: #fff; }                  /* destructive only */
```

### Cards

```css
.card {
  background: var(--surface);
  border: 1px solid var(--outline-variant);
  border-radius: 16px;
  padding: 24px;
  transition: box-shadow 0.2s, transform 0.2s;
}
.card:hover {
  box-shadow: 0 8px 32px rgba(25, 40, 48, 0.08);
  transform: translateY(-2px);
}
```

### Medication Cards (status color coding)

Left accent border by status — 4px wide:

```css
.med-card-taken  { border-left: 4px solid var(--secondary); }          /* sage green */
.med-card-missed { border-left: 4px solid var(--tertiary); }            /* warm coral */
.med-card-upcoming { border-left: 4px solid var(--outline-variant); }   /* grey */
```

### Status Badges / Chips

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
}
.badge-success { background: var(--secondary-container); color: var(--secondary); }
.badge-alert   { background: #ffdad6; color: #93000a; }
.badge-neutral { background: var(--surface-high); color: var(--on-surface-variant); }
.badge-info    { background: #d5e5ef; color: #192830; }
```

### Input Fields

```css
.input {
  width: 100%;
  min-height: 48px;
  padding: 12px 16px;
  border: 1.5px solid var(--outline-variant);
  border-radius: 8px;
  font-size: 18px;
  font-family: inherit;
  background: var(--surface);
  color: var(--on-surface);
  transition: border-color 0.15s;
}
.input:focus {
  outline: none;
  border-color: var(--secondary);   /* sage green on focus = positive feedback */
  box-shadow: 0 0 0 3px rgba(73, 101, 77, 0.12);
}
```

### Data Tables (Backoffice)

```css
.table { width: 100%; border-collapse: collapse; }
.table th {
  background: var(--surface-low);
  padding: 12px 16px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--on-surface-variant);
  text-align: left;
  border-bottom: 1px solid var(--outline-variant);
}
.table td {
  padding: 16px;
  border-bottom: 1px solid var(--outline-variant);
  font-size: 16px;
}
.table tr:hover td { background: var(--surface-low); }
```

### Navigation Sidebar (Backoffice)

```css
.sidebar {
  width: 240px;
  background: var(--primary-container);  /* #2f3e46 */
  color: #fff;
  height: 100vh;
  position: fixed;
  padding: 24px 16px;
}
.sidebar-logo {
  font-size: 20px;
  font-weight: 700;
  padding: 8px 12px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  margin-bottom: 16px;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  color: rgba(255,255,255,0.7);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  text-decoration: none;
}
.sidebar-item:hover   { background: rgba(255,255,255,0.08); color: #fff; }
.sidebar-item.active  { background: rgba(255,255,255,0.15); color: #fff; font-weight: 600; }
```

### Stats / KPI Cards (Backoffice Dashboard)

```css
.kpi-card {
  background: var(--surface);
  border: 1px solid var(--outline-variant);
  border-radius: 16px;
  padding: 24px;
}
.kpi-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--primary);
  letter-spacing: -0.02em;
}
.kpi-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--on-surface-variant);
  margin-top: 4px;
}
.kpi-trend-up   { color: var(--secondary); font-size: 13px; font-weight: 600; }
.kpi-trend-down { color: var(--tertiary);  font-size: 13px; font-weight: 600; }
```

---

## Icons

- Use **2px stroke weight** with rounded caps and joins
- Recommended library: [Lucide Icons](https://lucide.dev) (matches the soft rounded aesthetic)
- Size: 20px default, 24px for nav items, 16px for inline/chips
- Never use filled icons alongside stroke icons on the same screen — pick one style

---

## Accessibility

- Minimum body font: **18px** (non-negotiable — users may be elderly or in high-stress situations)
- All interactive elements: minimum touch target **48×48px**
- Focus states: always visible, use sage green ring (`box-shadow: 0 0 0 3px rgba(73,101,77,0.12)`)
- Color is never the only indicator of status — always pair with text label or icon
- Contrast ratio: minimum **4.5:1** for body text, **3:1** for large text

---

## Do / Don't

| ✅ Do | ❌ Don't |
|---|---|
| Use eggshell `#faf9f5` as page background | Use pure white `#ffffff` as page background |
| Rounded corners on everything | Sharp 0px radius corners |
| Sage green for success/positive | Red for "taken" or completed states |
| Warm coral for missed/alerts | Bright aggressive red for warnings |
| 18px minimum body text | Font sizes below 18px for body content |
| Diffused low-opacity shadows | Heavy dark drop shadows |
| Inter font throughout | Mixing multiple font families |
| 8px spacing grid | Arbitrary spacing values |
| `--primary-container` sidebar background | Pure black sidebar |

---

## Quick Start Checklist

Before submitting any screen for review:

- [ ] All text ≥ 18px
- [ ] Page background is `#faf9f5` (not white)
- [ ] All interactive elements ≥ 48px tall
- [ ] Cards use `--surface` (#fff) on `--bg` (#faf9f5)
- [ ] Focus states visible
- [ ] Status colors match the palette (sage = good, coral = missed)
- [ ] Spacing is a multiple of 8px
- [ ] Font is Inter throughout
- [ ] No pure black (`#000`) anywhere — use `--on-surface` (#1b1c1a)
