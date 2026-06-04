# Build prompt — Medpal

Paste this into Claude Code at the root of an empty project.

---

## What we're building

Medpal is a mobile-first app that ends the paper prescription. A patient uploads a prescription (the doctor's e-prescription PDF or a photo), we extract the medication into structured data, the patient confirms it, and from there the app drives intake reminders, refill nudges, and a daily "how are you feeling" check-in. The data also forms a clean medication history a doctor can review.

This is a Portuguese product (patients are in Portugal), but **all code, identifiers, comments and commit messages must be in English**. UI copy is in Portuguese — keep a small i18n layer so the visible strings live in one place.

## Stack

- React + Vite + TypeScript, mobile-first, Tailwind CSS.
- Supabase: Postgres, Auth, Storage, and Edge Functions.
- Vision/extraction via the Anthropic API (Claude), called **only from a Supabase Edge Function** — never expose the API key to the client.
- Keep the stack swappable: isolate the extraction and the drug-lookup behind interfaces so the provider can change.

## Hard rules (do not violate)

1. **Never OCR the medication leaflet (bula).** Leaflets and drug data are official and centralized in Portugal's INFARMED Infomed database. Treat `drugs` as a synced reference table and *look up* the leaflet; do not extract it from images. OCR/vision is for the prescription only.
2. **The confirmation step is a safety gate, not optional UX.** Never persist a medication, generate a schedule, or create a reminder from extracted data without explicit user confirmation. Low-confidence fields must be visibly flagged for review.
3. **Treat health data as special-category (GDPR).** `sns_number` and `prescriptions.access_code` (the dispensing codes — anyone holding them can collect medication at a pharmacy) are credentials: prefer **not storing** `access_code` at all; if stored, encrypt at column level. Row-level security must isolate every user's data.
4. **No secrets in the client.** API keys live in Edge Function env vars only.

## Data model (Postgres + RLS)

Create migrations for these tables. `drugs` is shared read-only reference data; everything else is per-user and protected by RLS so a user can only read/write their own rows.

- `profiles` — `id` (PK, = auth user), `full_name`, `birth_date`, `sns_number` (sensitive), `timezone`, `locale`.
- `prescriptions` — `id`, `user_id` FK, `source_type` (`rsp_pdf` | `photo` | `image`), `file_path` (Storage), `status` (`uploaded`|`processing`|`extracted`|`confirmed`|`failed`), `prescribed_at`, `doctor_name`, `rsp_number`, `access_code` (sensitive — see rule 3), `raw_extraction` (jsonb).
- `prescription_items` — `id`, `prescription_id` FK, `drug_id` FK (nullable until matched), `extracted_name`, `extracted_dosage`, `extracted_form`, `quantity`, `posology_text`, `posology_structured` (jsonb), `match_confidence` (float), `match_status` (`matched`|`ambiguous`|`unmatched`|`manual`), `field_confidences` (jsonb).
- `drugs` (reference) — `id`, `aim_number`, `cnpem_code`, `name`, `active_substance`, `strength`, `form`, `route`, `atc_code`, `leaflet_url`, `rcm_url`, `is_marketed`, `last_synced_at`.
- `user_medications` — `id`, `user_id` FK, `drug_id` FK, `prescription_item_id` FK (nullable — null = added manually), `display_name`, `dosage`, `start_date`, `end_date`, `source` (`prescription`|`manual`), `quantity_on_hand`, `refill_threshold`, `is_active`.
- `schedules` — `id`, `user_medication_id` FK, `time_of_day`, `days_of_week`, `dose_amount`, `dose_unit`, `with_food`.
- `intake_events` — `id`, `user_medication_id` FK, `schedule_id` FK, `scheduled_at`, `status` (`pending`|`taken`|`skipped`|`missed`|`snoozed`), `responded_at`, `notes`.
- `checkins` — `id`, `user_id` FK, `user_medication_id` FK (nullable), `recorded_at`, `mood`, `symptoms`, `side_effects`.
- `conversations` / `messages` — for the chatbot (`messages` has `role`, `content`, `context_refs` jsonb).
- `calendar_links` — `id`, `schedule_id` FK, `provider`, `external_event_id`, `synced_at`.

## Prescription pipeline (6 stages)

1. **Capture** — upload photo or PDF to Storage; create a `prescriptions` row (`status = uploaded`).
2. **Pre-processing (fork).** If the file is a digital PDF with selectable text (the common Portuguese e-prescription case), extract the text and parse it directly — **no vision call**. Only fall back to the vision path for photos/scans/image-only PDFs.
3. **Structured extraction.** In an Edge Function, send the text (or image) to Claude and require a strict JSON response — no prose. Schema:
   ```json
   {
     "prescription": {
       "rsp_number": "string|null",
       "prescribed_at": "YYYY-MM-DD|null",
       "doctor_name": "string|null"
     },
     "items": [
       {
         "extracted_name": "string",
         "extracted_dosage": "string|null",
         "extracted_form": "string|null",
         "quantity": "number|null",
         "posology_text": "string|null",
         "posology_structured": {
           "dose_amount": "number|null",
           "dose_unit": "string|null",
           "frequency_hours": "number|null",
           "times_per_day": "number|null",
           "duration_days": "number|null"
         },
         "field_confidences": { "<field>": 0.0 }
       }
     ]
   }
   ```
   Store the result in `raw_extraction` and create one `prescription_item` per item. Set `status = extracted`.
4. **Infomed matching.** For each item, resolve `extracted_name` to a canonical `drugs` row (AIM/CNPEM). Implement matching behind an interface: start with a normalized text/trigram match for the MVP, structured so it can be upgraded to embedding + re-ranking later. Set `match_confidence` and `match_status`; when ambiguous, return the top candidates rather than guessing.
5. **User confirmation** (the gate). Render the screen below; on confirm, create `user_medications` and `schedules`, then set `prescriptions.status = confirmed`.
6. **Save & activate.** Generate upcoming `intake_events` from the schedules and enrich each medication with its `leaflet_url` from `drugs`.

For the MVP, seed `drugs` with ~30 common Portuguese medications (name, active substance, strength, form, and a `leaflet_url` pointing to the Infomed front-office search) so the matching and leaflet link work end-to-end. Stub a `syncInfomed()` job behind the same interface for later.

## Screens to build (match these specs)

1. **Add prescription** — drop zone for PDF/photo, "Tirar foto" / "Carregar PDF" buttons, an info note that a digital PDF is read directly, and "Continuar". On select, upload to Storage and start the pipeline.
2. **Confirm medication** (the gate) — header "Confirma a tua medicação" + "Lemos a tua receita. Revê antes de guardar." Each item is a card: matched items show a green "Identificado" chip, editable dosage/quantity fields, and a "Ver folheto informativo" link (the `leaflet_url`). Ambiguous items show an amber "Rever" chip and a dropdown of candidate drugs to pick from. Primary action "Confirmar e guardar".
3. **Add medication** — Infomed search field, "Dose por toma", a "Horas" chip row (08:00 / 20:00 / + Hora), a "Dias" weekday toggle row, a "Tomar com comida" switch, and "Guardar". Creates `user_medications` + `schedules` with `source = manual`.
4. **Daily check-in** — "Como te sentes hoje?" mood selector (5 levels), a "Tomaste a medicação de hoje?" list of the day's `intake_events` with Tomei/Marcar actions, an "Efeitos secundários?" chip set (Nenhum/Náusea/Tonturas/Sonolência), an optional notes field, and "Registar". Writes `intake_events` updates + a `checkins` row.

Match the design system to the mockups: flat surfaces, 0.5px borders, rounded cards, green = confident, amber = needs review. Keep tap targets ≥ 44px.

## Build order

1. Scaffold project, Supabase client, auth (email magic link), and a mobile app shell with bottom nav.
2. Migrations for all tables + RLS policies + seed `drugs`.
3. Screen 1 (upload) → Storage → `prescriptions` row.
4. Extraction Edge Function: PDF-text path first, then the vision path. Produce `prescription_items` with confidence.
5. Matching against seeded `drugs`.
6. Screen 2 (confirmation gate) → persist `user_medications` + `schedules`.
7. `intake_events` generation + Screen 4 (check-in) + a "today" medication list.
8. Later: adherence dashboard, refill nudges, chatbot, calendar sync.

Stop after step 6 and show me the working upload → extract → confirm flow before continuing.

## Quality expectations

- Strong typing end to end; share types between the client and Edge Functions.
- Validate the extraction JSON against a schema (zod) before writing to the DB; never trust raw model output.
- Handle the failure paths: unreadable file, no items found, extraction timeout, no drug match.
- Write the matching and extraction provider behind interfaces with at least one unit test each.
