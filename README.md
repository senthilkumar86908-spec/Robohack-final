# ROBOHACK — Registration MERN Project

Registration site for ROBOHACK (Mailam Engineering College EEE Robotics Club).
Team-registration data is written to **MongoDB** (source of truth) and
mirrored into a **Google Sheet** in the same request — no n8n, no
third-party workflow tool in the middle.

```
robohack-mern/
├── backend/     Express + MongoDB + Google Sheets API
└── frontend/    Your existing single-file site (unchanged design, one bug fixed)
```

> **Why the backend doesn't match the auth/products/dashboard folder
> structure you pasted:** that structure is a generic template for an app
> with user accounts. ROBOHACK has one public form and no login, so I kept
> the same layered pattern (config → routes → controllers → services →
> models) but built only what this project actually uses. If you *do* want
> user accounts/auth later, that layer slots into this structure cleanly —
> just say the word.

---

## What was fixed

Your original `index.html` validated **Year of study** and **Department**
on the registration form, but never actually included them in the data it
sent to the backend — they were silently dropped. That's fixed in
`frontend/index.html`: the submit payload now includes `year` and `dept`.

The nested-array-vs-flat-schema mismatch that broke your n8n → Sheets sync
before can't happen here: `backend/src/services/googleSheetsService.js`
has one function, `toRow()`, that explicitly builds a fixed 17-column array
from the registration object every time — there's no automatic "flatten
this object" step to get wrong.

---

## 1. MongoDB setup

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. **Database Access** → add a database user (username + password).
3. **Network Access** → add IP address `0.0.0.0/0` (allow from anywhere) —
   simplest for a hackathon site behind a rate limiter; tighten later if you want.
4. **Connect → Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Add a database name before the `?`, e.g. `.../robohack?retryWrites=true...`
   — this becomes `MONGODB_URI` in `.env`.

## 2. Google Sheets setup (service account — no OAuth login flow)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → create/select a project.
2. **APIs & Services → Library** → search "Google Sheets API" → **Enable**.
3. **APIs & Services → Credentials → Create Credentials → Service account**.
   Give it any name (e.g. `robohack-sheets`), no roles needed, done.
4. Open the new service account → **Keys → Add key → Create new key → JSON**.
   A JSON file downloads — open it, you need two fields from it:
   - `client_email` → this is your `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → this is your `GOOGLE_PRIVATE_KEY` (keep the `\n` characters as-is)
5. Create a new Google Sheet. Copy its ID from the URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_PART_IS_THE_ID`**`/edit`
   → this is `GOOGLE_SHEET_ID`.
6. **Share** the sheet with the `client_email` address from step 4, as **Editor**.
   (This is the step people miss — without it, every write fails with a permission error.)
7. Rename the sheet's first tab to `Registrations` (or set `GOOGLE_SHEET_TAB` to match whatever you name it).

## 3. Configure and run the backend

```bash
cd backend
cp .env.example .env
# edit .env with the MongoDB and Google values from steps 1–2
npm install
npm run setup-sheet   # writes the header row to your sheet, run once
npm run dev            # starts on http://localhost:5000
```

Quick check:
```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/count
curl -X POST http://localhost:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{"teamName":"Test Team","teamLead":{"name":"A","email":"a@gmail.com","phone":"9876543210"},"year":"2","dept":"EEE","members":[]}'
```
If that returns `201` with a `count`, check your MongoDB collection and the
Google Sheet — both should now have the row.

## 4. Run the frontend locally

`frontend/index.html` is a static file — open it with any local server (not
`file://`, since `fetch` calls need a real origin). Easiest options:

```bash
cd frontend
python3 -m http.server 5500
# then open http://localhost:5500
```

Before testing, point the frontend at your local backend — in
`frontend/index.html`, find:
```js
var FORM_ENDPOINT = "https://robohack-backend.onrender.com/api/register";
var COUNT_ENDPOINT = "https://robohack-backend.onrender.com/api/count";
```
and swap in `http://localhost:5000/api/register` and `.../api/count` while
testing locally. Also add `http://localhost:5500` to `CORS_ORIGIN` in
`backend/.env` so the browser doesn't block the request.

## 5. Deploying

**Backend (Render, free tier works fine):**
1. Push this repo to GitHub.
2. Render → New → Web Service → point at the repo → set **Root Directory** to `backend`.
3. Build command: `npm install`. Start command: `npm start`.
4. Add all the `.env` variables in Render's Environment tab (paste `GOOGLE_PRIVATE_KEY` exactly as it is in your `.env`, quotes and all).
5. Deploy. Note the URL Render gives you, e.g. `https://robohack-backend.onrender.com`.

**Frontend:**
- In `frontend/index.html`, set `FORM_ENDPOINT`/`COUNT_ENDPOINT` to your real
  Render URL, and set `CORS_ORIGIN` in the backend's env vars to your
  frontend's real domain (Netlify/Vercel/GitHub Pages/etc.).
- Deploy `frontend/index.html` + the images beside it anywhere that serves
  static files.

## 6. If a registration doesn't show up in the sheet

MongoDB is the source of truth — a Sheets outage never blocks a signup.
Any registration that failed to sync is stored with `syncedToSheet: false`.
Retry all of them with:
```bash
cd backend
npm run resync-sheet
```

---

## API reference

| Method | Path            | Body                                                                 | Response                              |
|--------|-----------------|-----------------------------------------------------------------------|----------------------------------------|
| POST   | `/api/register` | `{ teamName, teamLead:{name,email,phone}, year, dept, members:[...] }` | `201 { id, count, maxTeams }` or `400/409` with `{ error }` |
| GET    | `/api/count`    | —                                                                       | `200 { count, maxTeams }`              |
| GET    | `/api/health`   | —                                                                       | `200 { status: "ok" }`                 |

`members` is always an array of up to 3 `{ name, email, phone }` objects
(empty ones are filtered out client-side, and empty strings are accepted
server-side for teammates that were left blank).
