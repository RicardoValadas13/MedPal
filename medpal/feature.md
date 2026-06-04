# MedPal — Feature Overview

## What it is

MedPal is a mobile-first web app that replaces the paper prescription. A patient uploads a prescription, the app extracts the medication into structured data, the patient confirms it, and from there the app drives intake reminders, refill nudges, and daily check-ins. The data also forms a clean medication history a doctor can review.

---

## Core user flow

1. **Upload a prescription** — the user uploads a PDF (digital e-prescription) or takes a photo. Digital PDFs are parsed directly without AI; photos and scans go through Claude vision.
2. **Review and confirm** — the extracted medications are shown as cards. Matched drugs show a green "Identified" chip; ambiguous ones show an amber "Review" chip with a dropdown to pick the correct drug. Low-confidence fields are flagged with a warning icon. The user edits if needed and confirms.
3. **Medication list is created** — on confirmation, active medications and schedules are saved automatically.
4. **Daily check-in** — each day the user logs how they feel (mood 1–5), marks which doses they took, and reports any side effects.

---

## Features built (MVP — steps 1–6)

### Authentication
- Email magic link — no password required.
- Each user's data is fully isolated via Supabase Row-Level Security.

### Prescription upload (Screen 1)
- Drag-and-drop zone for PDF or image files.
- "Take photo" button (uses device camera).
- "Upload PDF" button.
- Info note explaining that digital PDFs skip the AI vision step.
- On upload: file is stored in Supabase Storage under the user's private folder, a `prescriptions` row is created, and the extraction Edge Function is triggered.

### Prescription extraction (Edge Function)
- **PDF path**: sends the PDF bytes to Claude as a document — no vision call, faster and cheaper.
- **Vision path**: sends the image to Claude for OCR and extraction.
- Claude returns strict JSON (validated with Zod) — never prose.
- Extracted fields: medication name, dosage, form, quantity, posology (structured + free text), field-level confidence scores, and prescription metadata (doctor name, date, RSP number).
- On failure: prescription is marked `failed` and the error is surfaced to the user.

### Drug matching
- Each extracted medication name is matched against the `drugs` reference table (seeded with 33 common Portuguese medications from INFARMED).
- Match statuses: `matched` (high confidence), `ambiguous` (multiple candidates returned for user selection), `unmatched` (no match found).
- Matching is behind a `DrugMatchingProvider` interface — the MVP uses trigram/partial text matching; an embedding-based matcher is stubbed for future upgrade.
- A `syncInfomed()` stub is in place for future automated sync with the INFARMED Infomed database.

### Confirmation gate (Screen 2) — safety-critical
- Every extracted medication must be explicitly confirmed by the user before anything is saved.
- Fields with confidence below 0.8 are flagged with a warning icon.
- Ambiguous matches show a dropdown of candidate drugs.
- Dosage and quantity are editable inline.
- "View patient leaflet" link (from `drugs.leaflet_url`) is shown for each matched drug.
- On confirm: `user_medications` and `schedules` are created, and the prescription is marked `confirmed`.

### Add medication manually (Screen 3)
- Infomed search field with debounced lookup against the `drugs` table.
- Dose per intake field.
- Time chip row (08:00 / 20:00 + custom time picker).
- Weekday toggle row (Mon–Sun).
- "Take with food" toggle switch.
- Creates `user_medications` + `schedules` with `source = manual`.

### Daily check-in (Screen 4)
- Mood selector — 5 levels with emoji.
- List of today's pending intake events with a "Taken" button per dose.
- Side effects chip set: None / Nausea / Dizziness / Drowsiness.
- Optional free-text notes field.
- Writes `intake_events` status updates and a `checkins` row.

### Home screen
- Greeting with the user's name.
- Today's medication list with taken/pending status.
- Quick links to add a prescription or add a medication manually.

---

## Data stored

| Table | What it holds |
|---|---|
| `profiles` | User name, birth date, SNS number (sensitive), timezone |
| `prescriptions` | Uploaded files, extraction status, raw Claude output |
| `prescription_items` | Per-medication extraction results with confidence scores |
| `drugs` | INFARMED reference table — name, active substance, strength, form, leaflet URL |
| `user_medications` | Active medications per user (from prescription or manual) |
| `schedules` | When each medication should be taken |
| `intake_events` | Individual dose events — pending, taken, skipped, missed |
| `checkins` | Daily mood + side effect logs |

---

## Security and privacy

- **GDPR special-category data**: SNS number and prescription access codes are treated as credentials. Access codes are preferably not stored; if stored, they must be encrypted at the column level.
- **No secrets on the client**: the Anthropic API key lives only in Supabase Edge Function environment variables.
- **Row-Level Security**: every table (except the shared `drugs` reference) enforces RLS so a user can only read and write their own rows.
- **Confirmation gate is non-optional**: no medication, schedule, or reminder is ever created from extracted data without explicit user confirmation.

---

## Not yet built (planned — steps 7–8)

- Intake event generation on a rolling schedule (generate upcoming events from schedules).
- Adherence dashboard — charts of taken vs. missed doses over time.
- Refill nudges — alert when `quantity_on_hand` drops below `refill_threshold`.
- Chatbot — conversational interface backed by the `conversations` / `messages` tables.
- Calendar sync — export schedules to Google Calendar / Apple Calendar via `calendar_links`.
- Full INFARMED Infomed sync job (`syncInfomed()`).
