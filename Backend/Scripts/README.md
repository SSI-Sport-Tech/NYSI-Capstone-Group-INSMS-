# Seed / Populate Scripts

These scripts insert sample data into the database for a hardcoded test session (`019c81ea-062b-7a88-b848-c5a41cc1874d`). They are intended for development and demo purposes — **do not run against production**.

All DB scripts require a valid `Backend/.env` with `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` set.

---

## Scripts

### `populate_session_data.js`
**Method:** Direct DB connection  
**Run from:** `Backend/` directory (`node scripts/populate_session_data.js`)

Populates the full set of session review tables for the test session:
- `consultation.session_nutrition_review` — anthropometry measurements, macronutrient estimates, PAL, and intake comments
- `consultation.session_anthropometry` — BMI category, skinfold sum, parental heights
- `consultation.session_meal_log` — 24-hour dietary recall across all meal slots with macro totals
- `consultation.session_hydration` — daily water intake, urine colour, hydration status

Deletes and re-inserts each table's row for the session on every run.

---

### `populate_consultation_details.js`
**Method:** Direct DB connection  
**Run from:** `Backend/` directory (`node scripts/populate_consultation_details.js`)

Upserts `consultation.session_note` with the nutrition diagnosis card fields:
- `main_nutrition_diagnosis` (free text)
- Per-macronutrient review IDs referencing `consultation.nutrition_diagnosis_lookup` (carbohydrates, protein, fat, fibre, iron, calcium, micronutrients)
- `other_review`, `follow_up_note`, `intervention_note`, `other_remarks`

Checks whether a `session_note` row exists first and either INSERTs or UPDATEs accordingly.

---

### `populate_consultation_details_api.js`
**Method:** REST API (`PATCH /api/Consultation/consultation-details/:sessionId`)  
**Run from:** repo root (`node Backend/scripts/populate_consultation_details_api.js`)  
**Requires:** Backend server running on `http://localhost:8000`; add a valid `Authorization: Bearer <token>` header if the route requires auth.

API-based alternative to `populate_consultation_details.js` — sends the same consultation details payload via HTTP instead of a direct DB connection.

---

### `populate_db_direct.js`
**Method:** Direct DB connection  
**Run from:** repo root (`node Backend/scripts/populate_db_direct.js`)  
**Note:** Uses `dotenv.config({ path: './Backend/.env' })` — must be run from the repo root.

Functionally identical to `populate_consultation_details.js` (upserts `consultation.session_note`). This was an earlier standalone version written to be run from the repo root rather than the `Backend/` directory.

---

### `populate_training_schedule.js`
**Method:** Direct DB connection  
**Run from:** `Backend/` directory (`node scripts/populate_training_schedule.js`)

Upserts `consultation.session_training_schedule` with a full week of training data (AM/PM sessions, hours, RPE per day) plus performance narrative fields (current performance, coach goals, athlete goals, upcoming competitions). Also upserts PAL into `session_nutrition_review` via `ON CONFLICT DO UPDATE`.

---

### `populate_training_via_api.js`
**Method:** REST API (`PUT /api/Consultation/sessions/:sessionId/training-schedule`)  
**Run from:** repo root or `Backend/` directory (`node scripts/populate_training_via_api.js`)  
**Requires:** Backend server running on `http://localhost:8000`

API-based alternative to `populate_training_schedule.js`. Sends the same training schedule payload in the API's expected shape (`{ days, trainingDetails, performanceDetails, pal }`).

---

### `populate_consultation_details.sql`
**Method:** Raw SQL  
**Run with:** any PostgreSQL client (e.g. `psql`, DBeaver, pgAdmin)

Plain SQL script that UPDATEs `consultation.session_note` directly. Useful when you want to inspect or run the exact SQL without Node.js. Includes a SELECT at the end to verify the update.

---

## Typical usage order

If setting up a fresh demo session, run in this order:

1. `populate_session_data.js` — creates the nutrition review, anthropometry, meal log, and hydration rows
2. `populate_consultation_details.js` — adds the nutrition diagnosis / session note
3. `populate_training_schedule.js` — adds the training schedule and updates PAL
