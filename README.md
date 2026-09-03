# Tutti — Attendance App

Attendance tracking for band and ensemble rehearsals. Vite + React + TypeScript frontend, Supabase (Postgres + RLS + Edge Functions) backend. Hebrew/English with full RTL, light/dark themes.

## Screens

- **Home** — one card (or row) per ensemble in its own colour, with next session, member count and a "needs entry" badge. Filter by weekday, jump to Today, sort by your own order (drag or Move up/down), A→Z, or day & time. Per-ensemble settings and share link live in each card's menu; the all-ensembles share link sits above the cards.
- **Ensemble** — Attendance tab (date nav, session state, roster table, add/remove students) and Overview tab (attendance % per student, worst first).
- **Sessions** — every session with combinable filters (ensemble, type, status, date range) plus CSV/Excel export.
- **Students** — searchable list, import, and a per-student attendance record across their ensembles.
- **Settings** — theme, language, account (future) and about.
- **/share/:token** — read-only history for a manager, no app access.

## Session states

Stored as `scheduled` / `held` / `canceled`. A scheduled session displays as **Future** when its date is ahead and **Needs entry** once it's past; taking attendance promotes it to **Held** automatically (database trigger). Canceling asks for a reason.

## Supabase

This app is backed by the Supabase project **`band-attendance-tracker`** (ref `oqniapydqixdcwpzurgs`, region `eu-central-1`). `supabase/config.toml` pins that project ref.

- `supabase/migrations/` — full schema history (tables, RLS policies, RPCs, triggers).
- `supabase/functions/share-history` — public read-only DTOs for a manager share link.
- `supabase/functions/manage-share-link` — create/list/revoke/regenerate links, gated by an `ADMIN_SECRET`.

Link a local checkout to the project:

```bash
supabase login
supabase link --project-ref oqniapydqixdcwpzurgs
supabase db push          # apply migrations
supabase functions deploy # deploy edge functions
```

The `manage-share-link` function needs its secret set once:

```bash
supabase secrets set ADMIN_SECRET=<your passphrase>
```

## Setup

```bash
npm install
cp .env.example .env   # fill in the values below
```

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_SUPABASE_FUNCTIONS_URL` | Edge Functions base URL |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client (Drive import) |
| `VITE_GOOGLE_API_KEY` | Google API key (Drive picker) |
| `VITE_GOOGLE_APP_ID` | Google Cloud project number (required for the `drive.file` scope) |

## Development

```bash
npm run dev     # dev server
npm run test    # vitest unit tests
npm run build   # typecheck + production build
```

## Notes

- No login in v1 — RLS policies are permissive for the `anon` role and tagged `TEMP`, to be tightened to `auth.uid()` when auth is added.
- Excel/CSV import and export run entirely in the browser via `xlsx`; import can also pull a file from Google Drive.
- `.env` and `ADMIN_SECRET.txt` are gitignored and must never be committed.
