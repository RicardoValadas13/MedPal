# MedPal — Design System

## Philosophy

Flat, clinical, and calm. The UI borrows the aesthetic of modern health apps — white surfaces, thin borders, generous whitespace, and a green accent that signals safety and confirmation. Nothing decorative that isn't functional.

---

## Layout

- **Max width**: `430px` centred — the app is designed exclusively for mobile screens.
- **Shell**: `#root` is a full-height flex column with a white background. Content scrolls inside `<main>`; the bottom nav is fixed.
- **Page padding**: `px-4 pt-6 pb-6` on all pages — 16px horizontal, 24px top.
- **Bottom nav height**: `72px` — pages have `pb-[72px]` to avoid content being hidden behind it.

---

## Colours

| Role | Value | Usage |
|---|---|---|
| Background | `#f8fafc` (gray-50) | App shell background |
| Surface | `#ffffff` | Cards, inputs, nav bar |
| Border | `border-gray-200` / `border-[0.5px]` | Cards and inputs — deliberately thin (0.5px) |
| Primary | `green-600` (#16a34a) | Buttons, active states, confirmed chips |
| Primary hover | `green-700` | Button hover |
| Primary light | `green-50` / `green-100` | Chip backgrounds, selected states |
| Amber | `amber-100` / `amber-500` / `amber-700` | "Review" chip — needs user attention |
| Red | `red-600` | Error messages |
| Blue | `blue-50` / `blue-700` | Informational notes |
| Text primary | `gray-900` | Headings, labels |
| Text secondary | `gray-500` / `gray-400` | Subtitles, metadata, placeholders |

---

## Typography

All text uses the system font stack: `system-ui, 'Segoe UI', sans-serif`.

| Role | Class | Size |
|---|---|---|
| Page title | `text-xl font-semibold text-gray-900` | 20px |
| Section label | `text-sm font-semibold text-gray-700` | 14px |
| Body / input | `text-sm text-gray-900` | 14px |
| Secondary / meta | `text-xs text-gray-400` | 12px |
| Chip label | `text-[11px] font-medium` | 11px |
| Nav label | `text-[11px] font-medium` | 11px |

---

## Cards

Standard card used across all list views and confirmation items:

```
bg-white rounded-2xl border-[0.5px] border-gray-200 px-4 py-3
```

- `rounded-2xl` (16px radius) — soft but not playful
- `border-[0.5px]` — deliberately thinner than Tailwind's default `border` (1px)
- No box shadow — flat surfaces only

Variant for selected / highlighted state (e.g. confirmed item):
```
border-green-200 bg-green-50
```

---

## Buttons

### Primary (CTA)
```
py-4 bg-green-600 text-white text-sm font-semibold rounded-2xl
hover:bg-green-700 active:scale-[0.98] transition disabled:opacity-40
min-h-[44px]
```

### Chip / toggle (active)
```
px-4 py-2 bg-green-600 text-white text-sm rounded-xl border border-green-600 min-h-[44px]
```

### Chip / toggle (inactive)
```
px-4 py-2 bg-white text-gray-700 text-sm rounded-xl border border-gray-200 min-h-[44px]
```

### Ghost / outline
```
border-[0.5px] border-dashed border-gray-300 rounded-2xl text-sm text-gray-400
```

All tap targets are `min-h-[44px]` — Apple/Google minimum for touch accessibility.

---

## Inputs

### Text input
```
w-full px-4 py-3 text-sm rounded-xl border border-gray-200
focus:outline-none focus:ring-2 focus:ring-green-400
```

### Select (ambiguous drug picker)
```
w-full text-sm px-3 py-2 rounded-xl border border-amber-200 bg-amber-50
focus:outline-none focus:ring-2 focus:ring-amber-400
```

### Toggle switch (with food)
- Track: `w-12 h-6 rounded-full` — `bg-green-500` (on) / `bg-gray-200` (off)
- Thumb: `w-5 h-5 bg-white rounded-full shadow` — translates `translate-x-6` (on) / `translate-x-0.5` (off)

---

## Status chips

Used on prescription item cards in the confirmation screen.

| Status | Style |
|---|---|
| Identified (matched) | `bg-green-100 text-green-700` + `<CheckCircle size={11} />` |
| Review (ambiguous) | `bg-amber-100 text-amber-700` + `<AlertTriangle size={11} />` |
| Not found (unmatched) | `bg-gray-100 text-gray-600` |

All chips: `text-[11px] font-medium px-2 py-0.5 rounded-full`

---

## Confidence warnings

Fields extracted with confidence < 0.8 show a `⚠` character in amber (`text-amber-500`) inline with the field label. This is the only visual affordance — no tooltips or modals.

---

## Bottom navigation

```
fixed bottom-0 w-full max-w-[430px] bg-white border-t border-gray-100 flex z-40
```

- 4 tabs: Home, Prescriptions, Medications, Check-in
- Active tab: `text-green-600`
- Inactive tab: `text-gray-400`
- Icon size: `22px`, `strokeWidth={1.8}`
- Label: `text-[11px] font-medium`
- Min height: `56px`

---

## Icons

All icons from `lucide-react`. Stroke weight `1.8` throughout (lighter than the Lucide default of 2) for a cleaner look.

Key icons used:

| Icon | Usage |
|---|---|
| `Home` | Nav — home |
| `FileText` | Nav — prescriptions, PDF files |
| `Pill` | Nav — medications |
| `Heart` | Nav — check-in |
| `Upload` | Dropzone |
| `Camera` | Take photo button |
| `Search` | Infomed search |
| `CheckCircle` | Matched chip, success state |
| `AlertTriangle` | Review chip |
| `ExternalLink` | Patient leaflet link |
| `ChevronLeft` | Back button |
| `Plus` | Add actions |
| `Check` | Check-in success screen |

---

## Motion

Minimal:
- Buttons: `active:scale-[0.98]` — subtle press feedback
- Toggles and switches: `transition` on background colour and transform
- No page transitions, no skeleton loaders in the MVP

---

## Spacing scale used

| Token | Value |
|---|---|
| `gap-1` / `gap-1.5` | 4px / 6px — chip rows |
| `gap-2` / `gap-3` | 8px / 12px — form fields, card grids |
| `mb-4` / `mb-6` | 16px / 24px — section separation |
| `space-y-2` / `space-y-3` | 8px / 12px — list items |
| `px-4 py-3` | Card / input inner padding |
| `px-4 pt-6 pb-6` | Page outer padding |
