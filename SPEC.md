# Band Attendance Tracker — Build Specification (Supabase + React)

Status: v1, ready to build. Every decision below is final unless marked **CONFIRM**.
Read the whole document before writing code. Sections 3–6 define the backend; sections 7–9 define the frontend.

---

## 1. Summary

Single-user web app for a music teacher to track attendance across several ensembles (bands). No login in v1. Backend is a Supabase project: Postgres with RLS, two Edge Functions, no Storage, no Auth session. Frontend is a Vite + React SPA talking to Supabase directly with the anon key.

Core concepts:

- **Ensemble**: a band with a weekly rehearsal slot.
- **Student**: a person. Belongs to one or more ensembles via a **membership** with join and termination dates.
- **Session**: something attendance is taken for. Kinds: `rehearsal` (the regular weekly one, created lazily when attendance is first marked), `special_rehearsal`, `field_trip`, `exam`, `concert`, `other`. A session is linked to one or more ensembles. A plain `rehearsal` is linked to exactly one ensemble and there is at most one per ensemble per date.
- **Attendance**: one row per (session, student) with status `present | absent | late | excused` and an optional note. No row means "unmarked".
- **Share link**: a token that opens a read-only history page for all ensembles or one ensemble.

### 1.1 Security posture (read this before implementing anything "secure")

The anon key ships in the client bundle and has full read/write on all data tables. Therefore, in v1:

- Share links are a **convenience**, not a security boundary. Anyone with the anon key can read the same data.
- The `share_links` table is hidden from the anon role so that tokens are not trivially enumerable, and it is managed through an Edge Function protected by an admin passphrase.
- Every RLS policy carries the comment `TEMP: tighten to auth.uid() when multi-user auth added.`

Do not spend effort hardening beyond what is specified here.

---

## 2. Tech stack

### 2.1 Backend

- Supabase hosted project (Postgres 15+).
- Extensions: `pgcrypto` (for `gen_random_bytes`), `moddatetime` (for `updated_at` triggers). Both live in the `extensions` schema on Supabase.
- Edge Functions (Deno, TypeScript): `share-history`, `manage-share-link`.
- Supabase CLI for migrations, type generation, local function serving.

### 2.2 Frontend

| Concern | Choice | Notes |
|---|---|---|
| Build | Vite 5, React 18, TypeScript strict | `npm create vite@latest -- --template react-ts` |
| Routing | `react-router-dom` v6 | Data loaders not used; all data via TanStack Query |
| Server state | `@tanstack/react-query` v5 | One `QueryClient`, `staleTime: 30_000` |
| Supabase client | `@supabase/supabase-js` v2 | Typed with generated `Database` type |
| Styling | Tailwind CSS v3 + shadcn/ui | Components: Button, Tabs, Select, Dialog, Popover, Textarea, Input, Table, Badge, Toggle Group, Calendar/Date Picker, Sheet, Command (for multi-select), Sonner (toasts) |
| Forms | `react-hook-form` + `zod` + `@hookform/resolvers` | |
| Dates | `date-fns` | All dates handled as ISO `YYYY-MM-DD` strings in state; convert only for display |
| Spreadsheets | `xlsx` (SheetJS) | Parse import in browser; write export in browser |
| Icons | `lucide-react` | |
| i18n | Hand-written dictionary, no library | See 7.4 |
| Tests | `vitest` for pure utilities only | See 10 |

Environment variables (Vite): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_FUNCTIONS_URL` (defaults to `${VITE_SUPABASE_URL}/functions/v1`).

Deployment: static host (Vercel or Netlify) with SPA fallback to `index.html`.

---

## 3. Database schema

All SQL goes in `supabase/migrations/0001_init.sql`. Use exactly these names.

### 3.1 Extensions

```sql
create extension if not exists pgcrypto with schema extensions;
create extension if not exists moddatetime with schema extensions;
```

### 3.2 Enums

```sql
create type session_kind as enum ('rehearsal','special_rehearsal','field_trip','exam','concert','other');
create type session_status as enum ('held','canceled');
create type cancel_reason as enum ('holiday','sickness','other');
create type attendance_status as enum ('present','absent','late','excused');
create type share_scope as enum ('all','single_ensemble');
```

### 3.3 Tables

```sql
create table ensembles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  weekly_day int not null check (weekly_day between 0 and 6),   -- 0 = Sunday
  start_time time not null,
  duration_minutes int not null check (duration_minutes > 0),
  location text,
  created_at timestamptz not null default now()
);

create table students (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (length(trim(first_name)) > 0),
  last_name text not null check (length(trim(last_name)) > 0),
  instrument text,
  grade text,
  created_at timestamptz not null default now()
);

create table student_ensembles (
  student_id uuid not null references students(id) on delete cascade,
  ensemble_id uuid not null references ensembles(id) on delete cascade,
  joined_on date not null,
  terminated_on date,
  primary key (student_id, ensemble_id),
  check (terminated_on is null or terminated_on >= joined_on)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time,
  kind session_kind not null,
  title text,
  status session_status not null default 'held',
  cancel_reason cancel_reason,
  cancel_note text,
  rehearsal_note text,
  created_at timestamptz not null default now(),
  check ((status = 'canceled') or (cancel_reason is null and cancel_note is null)),
  check ((status <> 'canceled') or (cancel_reason is not null)),
  -- composite unique so session_ensembles can FK to (id, date, kind) and stay in sync
  unique (id, date, kind)
);

create table session_ensembles (
  session_id uuid not null,
  ensemble_id uuid not null references ensembles(id) on delete cascade,
  -- denormalised copies, kept in sync by the composite FK with ON UPDATE CASCADE
  session_date date not null,
  session_kind session_kind not null,
  primary key (session_id, ensemble_id),
  foreign key (session_id, session_date, session_kind)
    references sessions(id, date, kind) on delete cascade on update cascade
);

-- One plain rehearsal per ensemble per date. Canceled rehearsals still count.
create unique index uq_rehearsal_per_ensemble_day
  on session_ensembles (ensemble_id, session_date)
  where session_kind = 'rehearsal';

create table attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status attendance_status not null,
  note text,
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create trigger attendance_set_updated_at
  before update on attendance
  for each row execute function extensions.moddatetime(updated_at);

create table share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),  -- 48 hex chars
  scope share_scope not null,
  ensemble_id uuid references ensembles(id) on delete cascade,
  label text,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  check ((scope = 'single_ensemble') = (ensemble_id is not null))
);
```

Indexes beyond PKs/uniques:

```sql
create index on student_ensembles (ensemble_id);
create index on session_ensembles (ensemble_id, session_date);
create index on sessions (date);
create index on attendance (student_id);
create index on attendance (session_id);
```

### 3.4 Invariants enforced by the schema

- A rehearsal (`kind='rehearsal'`) for a given ensemble and date is unique, regardless of status.
- `session_ensembles.session_date/session_kind` always mirror `sessions.date/kind` (composite FK with cascade). The app never writes these two columns except by copying from the session in the same statement (see RPCs).
- `cancel_reason` is required when canceled, and both cancel fields are null when not canceled.
- `share_links.ensemble_id` is set exactly when scope is `single_ensemble`.
- A student cannot have two membership periods in the same ensemble. Leaving and rejoining is modelled by clearing `terminated_on` (documented limitation, accepted for v1).

### 3.5 Invariants enforced by the app / RPCs (not by constraints)

- A `rehearsal` session is linked to exactly one ensemble. Only the RPC `get_or_create_rehearsal` creates rehearsals; the UI never lets a user add ensembles to a rehearsal.
- A session's `kind` is never changed after creation. The UI offers no "change kind" control; to change kind, delete and recreate.
- A session of any kind has at least one ensemble. Creation goes through `create_session`, which requires a non-empty ensemble list. Removing the last ensemble from a session is not offered in the UI.

### 3.6 Definitions used everywhere

**Active membership on date D for ensemble E**: row in `student_ensembles` with `ensemble_id = E`, `joined_on <= D`, and (`terminated_on is null` or `terminated_on >= D`).

**Roster of session S**: distinct students with an active membership on `S.date` in any ensemble linked to S through `session_ensembles`. Ordered by `last_name, first_name`.

**Attendance history of student X in ensemble E**: attendance rows of X on sessions linked to E whose `date` falls within X's membership window in E. Sessions outside the window are excluded from counts and percentages.

---

## 4. Row Level Security

```sql
alter table ensembles enable row level security;
alter table students enable row level security;
alter table student_ensembles enable row level security;
alter table sessions enable row level security;
alter table session_ensembles enable row level security;
alter table attendance enable row level security;
alter table share_links enable row level security;
```

For each of the six data tables (all except `share_links`) create four policies for role `anon`:

```sql
create policy "anon select" on <table> for select to anon using (true);
create policy "anon insert" on <table> for insert to anon with check (true);
create policy "anon update" on <table> for update to anon using (true) with check (true);
create policy "anon delete" on <table> for delete to anon using (true);
comment on policy "anon select" on <table> is 'TEMP: tighten to auth.uid() when multi-user auth added.';
-- same comment on all four
```

`share_links`: **no policies at all**. RLS enabled with no policy denies anon and authenticated. The service role bypasses RLS and is used only inside Edge Functions.

Also revoke direct grants to be safe:

```sql
revoke all on share_links from anon, authenticated;
```

---

## 5. Database functions (RPC)

All functions are `language plpgsql`, `security invoker`, `set search_path = public`. Grant execute to `anon`. Client calls them through `supabase.rpc(name, args)`.

### 5.1 `get_or_create_rehearsal(p_ensemble_id uuid, p_date date) returns sessions`

1. Select the session where a `session_ensembles` row has `ensemble_id = p_ensemble_id`, `session_date = p_date`, `session_kind = 'rehearsal'`. If found, return it.
2. Otherwise insert into `sessions` (`date = p_date`, `kind = 'rehearsal'`, `start_time = ensembles.start_time` of that ensemble, `status = 'held'`) and insert the `session_ensembles` row with `session_date`, `session_kind` copied from the new session.
3. Wrap step 2 in `begin ... exception when unique_violation then` re-run step 1 and return that row. This handles two tabs racing.

### 5.2 `create_session(p_date date, p_kind session_kind, p_title text, p_start_time time, p_ensemble_ids uuid[]) returns sessions`

- Raise exception `'ensemble list required'` if array is null or empty.
- Raise exception `'use get_or_create_rehearsal for kind rehearsal'` if `p_kind = 'rehearsal'`.
- Insert the session, then insert one `session_ensembles` row per distinct id in the array, copying `session_date` and `session_kind`. Return the session row.

### 5.3 `set_session_ensembles(p_session_id uuid, p_ensemble_ids uuid[]) returns void`

- Raise if array empty, or if the session kind is `rehearsal`.
- Delete rows not in the array, insert missing ones (copying date/kind from the session). Single transaction.

### 5.4 `import_students(p_ensemble_id uuid, p_joined_on date, p_rows jsonb) returns jsonb`

`p_rows` is a JSON array of objects `{first_name, last_name, instrument, grade}` (strings, may be null/empty except names).

For each row, in order:

1. Normalise: `trim` names; skip the row (count as `invalid`) if either name is empty after trim.
2. Find an existing student where `lower(trim(first_name)) = lower(new.first_name)` and `lower(trim(last_name)) = lower(new.last_name)`. If several match, take the earliest `created_at`.
3. If no student: insert student (with instrument/grade as given, empty strings stored as null), insert membership with `p_joined_on`; count `inserted`.
4. If student exists and no membership in `p_ensemble_id`: insert membership; count `linked`. Do not change instrument/grade.
5. If student exists and membership exists: count `skipped`.

Return `{"inserted": n, "linked": n, "skipped": n, "invalid": n}`. Whole call is one transaction. Client sends at most 500 rows per call and loops over chunks; a failure in a later chunk leaves earlier chunks committed (acceptable, surfaced to the user in the result toast).

### 5.5 `session_roster(p_session_id uuid) returns setof students`

Implements "Roster of session S" from 3.6 as a SQL function (`language sql`, `stable`). The Attendance screen uses this instead of composing the join client-side.

---

## 6. Edge Functions

Location: `supabase/functions/<name>/index.ts`. Both functions create a Supabase client with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `Deno.env`. Both return JSON with `Content-Type: application/json` and the CORS headers below on every response including errors and `OPTIONS` preflight.

```ts
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
```

Config in `supabase/config.toml`:

```toml
[functions.share-history]
verify_jwt = false
[functions.manage-share-link]
verify_jwt = false
```

Secrets: `ADMIN_SECRET` (set with `supabase secrets set ADMIN_SECRET=...`). Minimum 12 characters.

### 6.1 `share-history` (GET, public)

Query parameters: `token` (required), `ensemble` (uuid, optional), `kind` (session_kind, optional), `from` (date, optional), `to` (date, optional).

Steps:

1. `400` if `token` missing.
2. Load `share_links` where `token = ?`. `404 {error:'invalid_token'}` if missing, `410 {error:'revoked'}` if `revoked`.
3. Resolve the ensemble filter:
   - scope `single_ensemble`: use `share_links.ensemble_id`. **Ignore** the `ensemble` query parameter entirely.
   - scope `all`: use the `ensemble` parameter if present, else no ensemble filter.
4. Query sessions: those with a `session_ensembles` row matching the ensemble filter (or any, if none), optional `kind`, `date between from and to`. Order by `date desc, created_at desc`. Cap at 1000 sessions; return `truncated: true` if capped.
5. For those sessions, load `session_ensembles` (with ensemble names), attendance rows, and the students referenced by them plus roster members (via `session_roster` equivalent query run with service role).
6. Return the DTO below. **Do not** include `cancel_note`, `rehearsal_note`, or attendance `note` (free text may contain health details). Do not include `created_at`, `updated_at`, or any id other than those needed to join client-side.

```ts
type ShareHistoryResponse = {
  scope: 'all' | 'single_ensemble';
  ensembles: { id: string; name: string }[];        // ensembles visible to this link
  students: { id: string; first_name: string; last_name: string; instrument: string | null; grade: string | null }[];
  sessions: {
    id: string; date: string; start_time: string | null; kind: string; title: string | null;
    status: 'held' | 'canceled'; cancel_reason: string | null;
    ensemble_ids: string[];
    roster_student_ids: string[];                    // active members on that date
    attendance: { student_id: string; status: 'present'|'absent'|'late'|'excused' }[];
  }[];
  truncated: boolean;
};
```

No write paths. Method other than GET/OPTIONS returns `405`.

### 6.2 `manage-share-link` (POST, admin passphrase)

Every request must carry header `x-admin-secret` equal to `ADMIN_SECRET`; otherwise `401 {error:'unauthorized'}`. Compare with constant-time comparison (`crypto.subtle.timingSafeEqual` or equivalent loop).

Body: `{ action: 'list' | 'create' | 'revoke' | 'regenerate', ... }`.

| action | body fields | behaviour | response |
|---|---|---|---|
| `list` | – | all rows, newest first, including revoked | `{ links: ShareLink[] }` |
| `create` | `scope`, `ensemble_id?`, `label?` | insert; validate scope/ensemble_id pairing before insert | `{ link: ShareLink }` |
| `revoke` | `id` | set `revoked = true` | `{ link: ShareLink }` |
| `regenerate` | `id` | set old row `revoked = true`; insert new row with same `scope`, `ensemble_id`, `label` | `{ link: ShareLink }` (the new one) |

`ShareLink = { id, token, scope, ensemble_id, label, revoked, created_at }`. The client builds the URL as `${window.location.origin}/share/${token}`.

---

## 7. Frontend architecture

### 7.1 Directory layout

```
src/
  main.tsx                 # QueryClientProvider, RouterProvider, I18nProvider, Toaster
  app/router.tsx           # route table
  lib/supabase.ts          # createClient<Database>(url, anonKey)
  lib/database.types.ts    # generated: supabase gen types typescript --linked > src/lib/database.types.ts
  lib/dates.ts             # toISODate, fromISODate, weekdayName(i18n)
  lib/roster.ts            # isActiveOn(membership, date), attendance stats helpers (pure, tested)
  lib/export.ts            # buildHistoryRows(...) -> xlsx/csv download (pure builder + tiny download wrapper)
  lib/importParse.ts       # parseSpreadsheet(file) -> { headers, rows }, column mapping helpers (pure parts tested)
  lib/functions.ts         # callShareHistory(params), callManageShareLink(action, body, secret)
  i18n/{index.tsx,he.ts,en.ts}
  queries/                 # one file per domain: ensembles.ts, students.ts, sessions.ts, attendance.ts, shareLinks.ts
  components/ui/           # shadcn generated
  components/              # shared: AppShell, EnsembleSelect, DateNav, StatusToggle, StudentNoteButton, SessionBadge, EmptyState
  pages/
    AttendancePage.tsx
    SessionsPage.tsx
    HistoryPage.tsx
    manage/ManagePage.tsx, EnsemblesTab.tsx, StudentsTab.tsx, ImportTab.tsx, ShareLinksTab.tsx
    SharePage.tsx
```

### 7.2 Routes

| Path | Page | Shell |
|---|---|---|
| `/` | redirect to `/attendance` | – |
| `/attendance` | AttendancePage | AppShell |
| `/sessions` | SessionsPage | AppShell |
| `/history` | HistoryPage | AppShell |
| `/manage` | ManagePage (tabs via `?tab=ensembles\|students\|import\|share`) | AppShell |
| `/share/:token` | SharePage | minimal shell, no nav |
| `*` | NotFound | AppShell |

AppShell: top bar with app name, language toggle, and a bottom tab bar on mobile / top nav on desktop with four items: Attendance, Sessions, History, Manage. Mobile-first: the teacher marks attendance on a phone.

### 7.3 Data layer rules

- All reads are TanStack Query hooks in `src/queries/*`. Query keys: `['ensembles']`, `['students']`, `['memberships']`, `['sessions', {from,to,ensembleId?}]`, `['session', id]`, `['roster', sessionId]`, `['attendance', sessionId]`, `['shareLinks']`.
- All writes are `useMutation` hooks in the same files. On success invalidate the affected keys. Attendance status writes use **optimistic updates** (see 8.1).
- Attendance write: `supabase.from('attendance').upsert({session_id, student_id, status, note?}, { onConflict: 'session_id,student_id' })`.
- Note fields (attendance note, rehearsal note, cancel note) are debounced 600 ms after the last keystroke, then written; flush on blur and on unmount.
- Every mutation error shows a toast with the i18n message `errors.saveFailed` and the raw Supabase message in smaller text.
- Never write `session_ensembles.session_date` / `session_kind` from the client. Session and membership creation go through the RPCs in section 5.

### 7.4 i18n

- Two languages: `he` (RTL) and `en` (LTR). **CONFIRM** default. Spec assumes default `he`; the user's stored choice in `localStorage['lang']` wins.
- `I18nProvider` sets `document.documentElement.lang` and `dir` on change.
- Dictionary type: `type Dict = typeof en`; `he` must satisfy `Dict` so missing keys fail typecheck.
- `t('key')` returns the string; `t('key', {count})` does simple `{count}` interpolation. No pluralisation library; provide explicit `_one`/`_other` keys where needed.
- Enum labels (`kinds.rehearsal`, `statuses.present`, `cancelReasons.holiday`, weekdays) live in the dictionary.
- Use Tailwind logical properties (`ms-`, `me-`, `ps-`, `pe-`, `text-start`) so RTL works without conditional classes.

---

## 8. Screens

Conventions: "Toggle Group" = shadcn `ToggleGroup type="single"`. "Sheet" = side panel on desktop, bottom sheet on mobile. Loading state = skeleton rows. Empty state = `EmptyState` component with one call-to-action.

### 8.1 Attendance (`/attendance`)

Purpose: mark attendance for one ensemble on one date, fast, on a phone.

**Header controls**

- `EnsembleSelect` (shadcn Select). Persist last choice in `localStorage['attendance.ensembleId']`. If no ensembles exist, show EmptyState linking to Manage > Ensembles.
- `DateNav`: previous-day / next-day arrow buttons around a date button that opens a Calendar popover. Default today. Query param `?date=YYYY-MM-DD&ensemble=<id>` mirrors state so the URL is shareable/refresh-safe.
- Hint line under the date: if `date.getDay() !== ensemble.weekly_day`, show `attendance.notRegularDay` in muted text. Not blocking.

**Session selector**

Query all sessions linked to the selected ensemble on the selected date. Render as horizontal chips: the rehearsal chip first (label `kinds.rehearsal`, shown even if it does not exist yet, dashed border in that case), then one chip per other session (label = title or kind). Selecting a chip sets `sessionId` state. Default selection: the rehearsal chip.

**Session panel** (card under chips)

- `SessionBadge`: kind, status (`held` green / `canceled` red), start time.
- If canceled: show reason and note; button `session.uncancel` (sets `status='held'`, `cancel_reason=null`, `cancel_note=null`).
- If held: button `session.cancel` opens Dialog with Select (reason) + Textarea (note) + confirm. Disabled if the rehearsal session does not exist yet (nothing to cancel) — instead the button first calls `get_or_create_rehearsal` then cancels; implement as a single async handler.
- Textarea `session.rehearsalNote` (debounced). For a not-yet-existing rehearsal, first keystroke triggers `get_or_create_rehearsal`, then the debounced write.
- Summary line: `present n · absent n · late n · excused n · unmarked n`.
- Button `attendance.markAllPresent`: upserts `present` for every roster student with no row. Does not overwrite existing statuses.

**Roster list**

- Source: for an existing session, `rpc('session_roster', {p_session_id})`. For the not-yet-created rehearsal chip, compute the roster client-side from `students` + `memberships` using `isActiveOn(membership, date)` for the selected ensemble. Both produce the same shape.
- Each row: name (bold), instrument · grade (muted), then `StatusToggle` — a 4-button Toggle Group with icons + short labels: present (check), absent (x), late (clock), excused (shield). Selected button filled with its colour (green / red / amber / blue). Tapping the selected button again clears it (deletes the attendance row).
- `StudentNoteButton`: small icon button; filled icon when a note exists. Opens a Popover with a Textarea (debounced). Note write uses upsert; if the student has no status yet and a note is typed, upsert with `status='present'`? **No.** Notes require a status: if no status, the note popover shows the hint `attendance.setStatusFirst` and the textarea is disabled.
- If the session is canceled, the whole roster is rendered with `opacity-50` and toggles disabled.
- First status tap on the rehearsal chip when no session exists: call `get_or_create_rehearsal`, store returned id, then upsert. Show a spinner on that row until done. Subsequent taps use the id.
- Optimistic update: on toggle, update the `['attendance', sessionId]` cache immediately, roll back on error.
- Empty roster: EmptyState `attendance.noActiveStudents` with link to Manage > Students.

### 8.2 Sessions (`/sessions`)

Purpose: create and manage non-rehearsal sessions, see rehearsals too.

- Filter bar: `EnsembleSelect` with an "All" option, month picker (prev/next month arrows + label), kind Select with "All".
- List grouped by date descending within the month. Row: date (weekday + day), `SessionBadge`, title, ensemble names as Badges, attendance summary counts (`present/roster`), chevron.
- Row tap opens a Sheet:
  - Read-only: kind, date, ensembles, status.
  - Editable: title (Input), start time (Input type=time), ensembles (multi-select via Command + checkboxes; hidden for kind `rehearsal`), rehearsal note (Textarea). Saves on blur/debounce. Ensembles save via `set_session_ensembles`.
  - Cancel / uncancel exactly as in 8.1.
  - Button `session.openAttendance`: navigates to `/attendance?ensemble=<first ensemble>&date=<date>` and preselects this session's chip (pass `&session=<id>`).
  - Destructive: `session.delete` with confirm Dialog. Deletes the session (attendance cascades). Not available for kind `rehearsal` with any attendance rows; for those, cancel instead. (Rehearsal with zero attendance rows may be deleted.)
- Primary button `sessions.new` opens a Dialog form (react-hook-form + zod): kind (Select, all kinds except `rehearsal`), date (Calendar, required), start time (optional), title (optional, required if kind = `other`), ensembles (multi-select, at least one). Submits `create_session`.

### 8.3 History (`/history`)

Purpose: analyse attendance over a period and export.

- Filter bar: `EnsembleSelect` (All allowed), kind Select (All), date range (two date pickers; default = last 90 days to today), Apply button. Filters mirrored in URL query.
- Tabs:
  - **By session**: table. Columns: date, kind, title, ensembles, status, present, absent, late, excused, unmarked, attendance % (= present + late over roster size, held sessions only; canceled shows `—`). Row click navigates to `/attendance?...&session=<id>`.
  - **By student**: table. Rows = students with an active membership overlapping the range in the filtered ensemble(s). Columns: name, instrument, grade, sessions counted, present, absent, late, excused, unmarked, attendance %. Counting rules: only sessions with `status='held'` whose date is inside the student's membership window; unmarked = counted sessions minus rows. If ensemble = All, a student who is in two ensembles is one row with combined counts.
  - **Grid**: matrix students × sessions (sessions as columns, newest first, capped at 40 visible with horizontal scroll). Cell shows a one-letter status (P/A/L/E) with colour; blank = unmarked; grey = not a member on that date; canceled sessions column greyed. Sticky first column.
- Export button (Dropdown: CSV, Excel). Exports the currently visible tab's table using `lib/export.ts`. File name `attendance-<ensemble or all>-<from>-<to>.<ext>`. Grid export includes the header row of dates and a legend row.
- All computation is client-side from three queries: sessions in range (with `session_ensembles`), attendance rows for those sessions (`in` filter on session ids, chunk 200 ids per request), students + memberships. Put the aggregation in `lib/roster.ts` as pure functions.

### 8.4 Manage (`/manage`)

Tabs: Ensembles · Students · Import · Share links. Active tab in `?tab=`.

**Ensembles tab**

- Table/cards: name, weekday name + start time + duration, location, active member count (memberships active today).
- `manage.newEnsemble` button → Dialog form: name (required), weekday (Select of 7), start time (required), duration minutes (number, default 60), location. Edit uses the same dialog. Delete with confirm Dialog and warning text `manage.deleteEnsembleWarning` (cascades memberships, session links; sessions themselves remain if linked elsewhere, otherwise become orphan — to avoid orphans, before deleting, the client deletes sessions whose only ensemble is this one, after a second confirmation listing the count).

**Students tab**

- Search Input (filters by name, instrument), ensemble filter Select (All / each ensemble / `manage.noEnsemble`), toggle `manage.showTerminated` (default off: hide students whose every membership is terminated before today).
- Table: name, instrument, grade, memberships column showing one Badge per ensemble (`name · from joined_on` and `→ terminated_on` if set; terminated shown muted).
- `manage.newStudent` → Sheet form: first name, last name (required), instrument, grade, and a **Memberships** section: list of rows each with ensemble Select, joined_on date (default today), terminated_on date (optional), remove button; `+ add ensemble` button. Duplicate ensemble in the list is a validation error. Save: insert student, then insert memberships. Edit uses the same Sheet; membership changes are computed as diff (insert / update / delete rows in `student_ensembles`).
- Row actions: edit, delete (confirm; cascades attendance).

**Import tab**

Step wizard in one card:

1. **Target**: ensemble Select (required), joined_on date (default today).
2. **File**: file input accepting `.xlsx,.xls,.csv`. Parse with `xlsx` (`XLSX.read(arrayBuffer)`, first sheet, `sheet_to_json(header:1)`). First row = headers.
3. **Map columns**: four Selects (first name, last name, instrument, grade) each listing the detected headers plus "— none —". Auto-map by header name match, case-insensitive, for these aliases: first name: `first, first name, firstname, שם פרטי, שם`; last name: `last, last name, lastname, surname, שם משפחה, משפחה`; instrument: `instrument, כלי`; grade: `grade, class, כיתה`. If only one name column is detected and it contains spaces, offer checkbox `import.splitFullName` (split on first space; rest = last name).
4. **Preview**: table of the first 20 mapped rows plus total count; rows with empty first or last name highlighted and counted as invalid.
5. **Import** button: chunks of 500 → `import_students`. Progress bar. Result toast/summary card: inserted, linked, skipped, invalid. Invalidate `['students']`, `['memberships']`.

**Share links tab**

- On first visit the tab shows an `Input type=password` for the admin passphrase with `manage.rememberSecret` checkbox. Stored in `sessionStorage['adminSecret']` (or `localStorage` when the checkbox is on). A `401` from the function clears the stored secret and shows the input again.
- Table: label, scope (All / ensemble name), URL (truncated, copy button), created, status (active / revoked). Revoked rows muted.
- Actions per row: Copy URL, Regenerate (confirm), Revoke (confirm). Both call `manage-share-link`.
- `manage.newShareLink` → Dialog: scope radio (All ensembles / One ensemble), ensemble Select when single, label Input. On create, show the URL with a copy button immediately.

### 8.5 Share view (`/share/:token`)

- Loads `share-history` with the token and current filters. Filter bar: ensemble Select (only when `scope === 'all'`; hidden otherwise), kind Select, date range (default last 90 days). Filters go in the URL query.
- States: loading skeleton; `invalid_token` → full-page message `share.invalid`; `revoked` → `share.revoked`; `truncated` → info banner.
- Renders the same three tabs as History (By session, By student, Grid) reusing the same table components and `lib/roster.ts` functions, fed from the DTO. No notes anywhere. No links into the app.
- Export CSV/Excel identical to History.
- Language toggle present; no other navigation.

---

## 9. Visual design

- Tailwind + shadcn default theme with `--primary` set to a deep teal; status colours: present `emerald-600`, absent `rose-600`, late `amber-500`, excused `sky-600`, unmarked `zinc-400`. Use these consistently across toggles, badges, grid cells, and export legend text.
- Base font size 16px; roster rows minimum 56px tall with 44px tap targets on toggle buttons.
- Layout max width `max-w-3xl` for Attendance and Manage forms, `max-w-6xl` for History tables. Tables scroll horizontally inside `overflow-x-auto` containers; page body never scrolls horizontally.
- Dark mode: support via `class` strategy following `prefers-color-scheme`; no manual toggle in v1.
- Fonts: system stack. Hebrew renders fine with system fonts; do not load web fonts.

---

## 10. Testing and verification

### 10.1 Unit tests (vitest)

- `lib/roster.ts`: `isActiveOn` boundaries (joined_on = date, terminated_on = date, null terminated); per-student stats exclude canceled sessions and out-of-window sessions; combined counts when ensemble = All.
- `lib/importParse.ts`: header alias auto-mapping, full-name split, invalid-row detection.
- `lib/export.ts`: row builders produce expected headers and cell values for all three tabs.
- `i18n`: `he` has every key of `en` (a type check plus a runtime test that iterates keys).

### 10.2 Database verification (run after migration)

1. `list_tables` shows 7 tables: `ensembles, students, student_ensembles, sessions, session_ensembles, attendance, share_links`, and the 5 enums.
2. `get_advisors` (security): RLS enabled on all 7; no anon policies on `share_links`.
3. SQL editor: create two ensembles, one student in both; `select get_or_create_rehearsal(E1, '2026-09-07')` twice returns the same id; inserting a second `session_ensembles` row for another rehearsal on E1 + same date fails with a unique violation; `update sessions set date = date + 1` on that session updates `session_ensembles.session_date` via cascade.
4. `create_session` with an empty array raises; with kind `rehearsal` raises.
5. `import_students` with a duplicate name into a second ensemble returns `linked: 1`, not `inserted`.
6. Attendance `update` bumps `updated_at`.
7. `select * from share_links` as anon (use the SQL editor role switch or PostgREST with the anon key) returns permission denied / empty with RLS error.

### 10.3 Edge Function verification

`supabase functions serve` then:

- `share-history` with a bad token → 404; revoked → 410; valid single-ensemble token with `?ensemble=<other id>` → response contains only the link's ensemble.
- `manage-share-link` without header → 401; with header, `create` → row with 48-char hex token; `regenerate` → old row revoked, new token returned.
- Response bodies contain no `note` fields.

### 10.4 End-to-end manual check

Import a sample sheet → mark attendance on two dates (one canceled with reason) → History shows correct counts and greyed canceled column → create share link → open `/share/<token>` in a private window → export Excel → numbers match History.

---

## 11. Out of scope for v1

Authentication, per-user data, Supabase Storage, student photos, PDF export, push notifications, rejoining the same ensemble as a second membership period, changing a session's kind after creation, offline support.
