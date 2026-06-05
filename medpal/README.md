# MedPal

Medication management PWA for elderly and chronic-illness patients in Portugal.

---

## What it does

MedPal helps patients who take multiple medications daily keep track of what to take, when, and whether they've taken it. The core loop is:

1. **Upload a prescription** — photograph or upload a PDF; GPT-4o vision extracts drug names, doses, and schedules automatically via OCR.
2. **Review and confirm** — the patient (or carer) reviews the extracted data, adjusts times and days if needed, and saves.
3. **Home page** — shows today's doses grouped by time of day (morning / afternoon / evening), with a live countdown ("in 7 min", "now", "12 min ago") and a progress ring.
4. **Mark as taken** — one tap per dose; the app records an intake event and updates the progress.

---

## Who uses it

| Role | What they do |
|---|---|
| **Patient** | Checks daily schedule, marks doses taken, uploads prescriptions |
| **Caregiver** | PIN-protected section — monitors missed doses, manages emergency contacts, reviews critical medications |

The target user is an older adult in Portugal managing several chronic conditions, likely with a family member or nurse acting as caregiver.

---

## Why it matters

Medication errors (wrong dose, missed dose, wrong time) are one of the leading causes of preventable harm in elderly patients. MedPal reduces this by:

- Removing manual data entry — OCR reads the prescription directly
- Making the daily schedule visible at a glance
- Alerting caregivers when doses are missed
- Providing an emergency contact flow for critical situations

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, React Router v7, Tailwind CSS v4, Vite |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| OCR | FastAPI + GPT-4o vision (`medpal-prescription-ocr.onrender.com`) |
| PWA | `vite-plugin-pwa` |

---

## Running locally

```bash
npm install
npm run dev
```

Requires a `.env` file with:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

The app runs in **demo mode** by default — a hardcoded user (`demo@medpal.app`) with no real authentication, and RLS disabled so the anon key can read and write freely.
