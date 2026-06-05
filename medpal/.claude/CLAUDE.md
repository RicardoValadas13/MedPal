# MedPal — Claude Code Context

## What this is
Medication management & patient safety PWA for elderly/chronic-illness users in Portugal.
React 19 + React Router 7 + Tailwind v4 + Supabase (DB, Auth, Storage, Edge Functions).
OCR service lives at `C:\Users\lynxv\Desktop\MedPal_OCR` (separate repo, deployed on Render).

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, React Router v7, Tailwind CSS v4, Vite |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions — Deno) |
| OCR | FastAPI + GPT-4o vision at `https://medpal-prescription-ocr.onrender.com` |
| i18n | Portuguese only — `src/i18n/pt.ts` |
| PWA | `vite-plugin-pwa` |

### Environment variables (frontend)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

---

## Auth — Demo mode
`src/contexts/AuthContext.tsx` is hardcoded to a demo user:
- ID: `00000000-0000-0000-0000-000000000001`
- Email: `demo@medpal.app`
- No real session; `session` is always `null`

RLS is **disabled** on all core tables (migration `20240006_disable_rls_demo.sql`) so the anon key can read/write freely. This is intentional for demo purposes.

---

## Routing (`src/App.tsx`)

```
/                          HomePage
/prescriptions             PrescriptionsPage
/prescriptions/upload      UploadPrescriptionPage
/prescriptions/:id/confirm ConfirmPrescriptionPage
/medications               MedicationsPage
/medications/add           AddMedicationPage
/medications/:id/edit      EditMedicationPage
/checkin                   CheckinPage
/assistant                 ChatPage
/settings                  SettingsPage
/caregiver                 CaregiverSettingsPage
*                          → /
```

All routes are nested under `<AppShell>` (TopBar + Outlet + BottomNav).

---

## Key source files

| File | Purpose |
|---|---|
| `src/lib/supabase.ts` | Supabase client (untyped `any` to avoid GenericSchema issues) |
| `src/lib/ocr.ts` | Client for OCR proxy edge function |
| `src/lib/drugMatching.ts` | Trigram + keyword drug matcher |
| `src/lib/emergencyVoice.ts` | TTS audio playback |
| `src/lib/pin.ts` | PIN validation (bcryptjs) |
| `src/i18n/pt.ts` | All UI strings in Portuguese |
| `src/types/database.ts` | Full Supabase schema types |

---

## Components

| Component | Purpose |
|---|---|
| `AppShell` | Layout shell — TopBar + Outlet + BottomNav |
| `BottomNav` | 5-tab nav (Home, Prescriptions, Medications, Check-in, Assistant) |
| `TopBar` | Sticky header — greeting, avatar, caregiver icon, notifications |
| `EmergencyButton` | 3-stage button → TTS announcement → calls 112 → SMS to family |

---

## Design system

Tailwind v4 with `@theme` in `src/index.css`. Material Design 3-inspired tokens:
- **Primary dark**: `#192830`
- **Primary green**: `#49654d`
- **Green light**: `#cbebcd`
- **Background**: `#faf9f5` (warm off-white)
- **Border**: `#c3c7ca`
- **Error red**: `#ba1a1a`

All interactive targets are `min-h-[48px]` (touch-friendly).
No comments in code unless explaining a non-obvious invariant.
English-only UI strings (despite the file being named `pt.ts`).

---

## Database schema (key tables)

| Table | Purpose |
|---|---|
| `profiles` | User profile (linked to auth.users) |
| `drugs` | Infomed drug catalogue (~30 seeded entries) |
| `prescriptions` | Uploaded prescriptions (status: uploaded → extracted → confirmed) |
| `prescription_items` | OCR-extracted items per prescription |
| `user_medications` | Active medications (start_date, end_date, is_active) |
| `schedules` | Per-medication schedule rows (time_of_day, days_of_week, with_food) |
| `intake_events` | Individual dose taken/missed/snoozed events |
| `checkins` | Daily mood (1–5) + notes |
| `conversations` / `messages` | AI chat history |
| `patient_profiles` | Emergency contact, address, floor |
| `caregiver_settings` | PIN hash, missed-med alerts, critical med IDs |
| `family_contacts` | Up to 5 contacts with notify toggles |

Storage bucket: `prescriptions` — files at `{user_id}/{timestamp}.{ext}`.

---

## Supabase Edge Functions

| Function | Purpose |
|---|---|
| `ocr-proxy` | Receives image → calls OCR API → writes prescription_items to DB |
| `extract-prescription` | Legacy PDF extraction (used when OCR not supported) |
| `chat-agent` | AI assistant chat |

Edge functions are in `supabase/functions/`. Deploy with `supabase functions deploy <name>`.

---

## OCR API contract (`C:\Users\lynxv\Desktop\MedPal_OCR`)

Per-item fields returned:
```typescript
{
  name: string               // drug name with strength
  dosage: string | null      // amount per single intake only ("1 comprimido")
  duration_days: number | null
  description: string        // visual instruction for GIF generation
  schedule: FixedSchedule | IntervalSchedule | null
  sets: number | null        // physiotherapy only
  reps: number | null        // physiotherapy only
}

type FixedSchedule = {
  type: "fixed"
  times: string[]            // ["08:00", "20:00"]
  days: Day[]
  take_with_food: boolean
}

type IntervalSchedule = {
  type: "interval"
  interval_hours: number     // 8 for "de 8 em 8 horas"
  first_dose: string         // "08:00"
  days: Day[]
  take_with_food: boolean
}
```

The `ocr-proxy` edge function resolves `IntervalSchedule` to concrete HH:MM times before storing in `posology_structured`.

---

## Prescription flow

1. User uploads image → `UploadPrescriptionPage`
2. File → Supabase Storage → `prescriptions` row inserted
3. Image → `ocr-proxy` edge function → OCR API → `prescription_items` inserted
4. Navigate to `/prescriptions/:id/confirm`
5. `ConfirmPrescriptionPage` loads items (falls back to `raw_extraction` if insert failed)
6. User reviews/edits: dose, schedule (Fixed/Interval), days, with food, start/end date
7. Confirm → `user_medications` + `schedules` rows created

---

## Schedule type toggle

Both `AddMedicationPage`, `EditMedicationPage`, and `ConfirmPrescriptionPage` support two schedule modes:
- **Fixed times**: chip picker + custom HH:MM input
- **Every N hours**: interval selector (4/6/8/12/24h) + first dose time + live preview

`intervalToTimes(intervalHours, firstDose)` is duplicated in each file (simple pure function).

---

## Caregiver mode

PIN-protected section at `/caregiver`:
- Patient profile (emergency contact, address)
- Family contacts (max 5, with notification toggles)
- Critical medications list
- Missed-medication alert settings
- Voice test for TTS announcement

PIN is hashed with bcryptjs and stored in `caregiver_settings.pin_hash`.

---

## What is NOT implemented yet
- Real authentication (login page exists but isn't wired)
- Push notifications for missed medications
- Drug matching (trigram matcher exists but `match_status` always comes back `unmatched`)
- End-to-end PDF extraction (legacy `extract-prescription` function)
- Intake event tracking from HomePage
