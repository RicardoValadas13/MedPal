---
name: Compassionate Utility
colors:
  surface: '#faf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#faf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f4f4f0'
  surface-container: '#efeeea'
  surface-container-high: '#e9e8e4'
  surface-container-highest: '#e3e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#43474a'
  inverse-surface: '#2f312e'
  inverse-on-surface: '#f2f1ed'
  outline: '#73787b'
  outline-variant: '#c3c7ca'
  surface-tint: '#516169'
  primary: '#192830'
  on-primary: '#ffffff'
  primary-container: '#2f3e46'
  on-primary-container: '#99a9b2'
  inverse-primary: '#b9c9d3'
  secondary: '#49654d'
  on-secondary: '#ffffff'
  secondary-container: '#cbebcd'
  on-secondary-container: '#4f6b53'
  tertiary: '#4f0e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6d230f'
  on-tertiary-container: '#f3896d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e5ef'
  primary-fixed-dim: '#b9c9d3'
  on-primary-fixed: '#0e1d25'
  on-primary-fixed-variant: '#3a4951'
  secondary-fixed: '#cbebcd'
  secondary-fixed-dim: '#afceb2'
  on-secondary-fixed: '#06200e'
  on-secondary-fixed-variant: '#324d37'
  tertiary-fixed: '#ffdbd2'
  tertiary-fixed-dim: '#ffb4a1'
  on-tertiary-fixed: '#3c0800'
  on-tertiary-fixed-variant: '#7c2e19'
  background: '#faf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e3e2df'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
  body-xl:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 30px
  body-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 26px
  label-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  caption:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 32px
  xl: 48px
  container-margin: 20px
  gutter: 16px
---

## Brand & Style

The design system prioritizes a "Human-First Healthcare" aesthetic, moving away from the cold, sterile visuals of traditional medical software. The brand personality is defined by a balance of **Utility** and **Empathy**. It aims to feel like a supportive companion rather than a clinical tool, evoking an emotional response of safety, clarity, and warmth.

The chosen style is **Modern Corporate with Tactile Warmth**. It leverages the structural reliability of a systematic layout but softens the execution through organic color palettes, generous whitespace, and high-contrast accessibility. The interface uses subtle tonal layering to guide the user’s eye toward critical health actions without inducing "alert fatigue."

## Colors

The palette is anchored by an **Eggshell (#FDFCF8)** background, which reduces eye strain compared to pure white and adds a sense of calm. 

- **Primary (Deep Charcoal/Slate Blue):** Used for typography and primary navigation elements to ensure maximum legibility and a sense of professional authority.
- **Secondary (Sage Green):** Utilized for "Success" states, completed tasks, and positive health milestones. It represents growth and stability.
- **Tertiary (Warm Coral):** Reserved for "Missed" medications, alerts, or urgent check-ins. The warmth of the coral prevents the UI from feeling punitive while still grabbing attention.
- **Neutral (Soft Grey/Sage Tints):** Used for borders and inactive states to maintain a soft, non-intrusive hierarchy.

## Typography

This design system utilizes **Inter** for its exceptional legibility and neutral, systematic tone. To ensure accessibility for users who may have visual impairments or be in high-stress situations, the base font sizes are scaled larger than standard applications.

- **Scale:** All body text starts at a minimum of 18px.
- **Hierarchy:** Clear distinction between headers and body via weight (600 for headers, 400 for body).
- **Readability:** Increased line heights (1.5x for body) ensure that medication instructions and dosage info are easy to parse at a glance.
- **Mobile Adjustments:** Headlines are slightly condensed on mobile to prevent awkward line breaks while maintaining a strong visual anchor.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a focus on high-touch targets. 

- **Mobile:** A 4-column layout with 20px side margins. 
- **Desktop/Tablet:** A 12-column centered layout with a max-width of 1200px.
- **Rhythm:** An 8px linear scale is used for all padding and margins. For healthcare components like medication cards, we use "Relaxed" spacing (24px/md) to prevent the UI from feeling cluttered or overwhelming.
- **Safe Areas:** Navigation and critical action buttons are placed within the "thumb zone" (bottom 1/3 of the screen) to facilitate fast, one-handed tasks.

## Elevation & Depth

To maintain a warm and accessible feel, the design system avoids heavy shadows. Instead, it uses **Tonal Layers** and **Soft Ambient Occlusion**.

- **Surface Levels:** The base layer is Eggshell. Cards and interactive containers use a pure White background to "pop" slightly.
- **Shadows:** Only used on primary action buttons and floating medication reminders. These are extremely diffused (20px-30px blur), low-opacity (8-10%) shadows tinted with the Primary color (#2F3E46) to avoid a "dirty" look.
- **Borders:** Low-contrast 1px borders in a sage-tinted grey are used for input fields and list items to define structure without adding visual noise.

## Shapes

The shape language is **Rounded**, communicating friendliness and safety. 

- **Standard Elements:** Buttons and input fields use a 0.5rem (8px) radius.
- **Containers:** Content cards and modals use 1rem (16px) or 1.5rem (24px) to create a soft, nested appearance. 
- **Icons:** Use a 2px stroke weight with rounded caps and joins to match the soft corner radius of the UI components.

## Components

- **Buttons:** Primary buttons use the Slate Blue background with White text for high contrast. Secondary "Log" buttons use the Sage Green to indicate a positive action. All buttons have a minimum height of 56px for easy tapping.
- **Medication Cards:** Large, rounded white containers with a 4px left-accent border color-coded by status (Sage for "Taken," Coral for "Missed," Grey for "Upcoming").
- **Chips:** Used for dosage tags (e.g., "500mg") or time-of-day. These use a light tint of the Sage or Slate colors with dark text.
- **Input Fields:** Thick 2px borders when focused, using the Sage Green to provide a "success" feeling during data entry.
- **Bottom Navigation:** A persistent, high-contrast bar with clear labels under icons. The active state is indicated by a soft pill-shaped background behind the icon.
- **Check-in Slider:** A custom tactile component for mood or pain tracking, using a large, easy-to-grab circular handle.