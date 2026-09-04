# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                      # Vite dev server on :5173
npm run build                    # tsc -b && vite build
npm run test                     # vitest run (all)
npx vitest run src/lib/roster.test.ts        # single test file
npx vitest run -t "isActiveOn"               # single test by name
npx tsc -b                       # typecheck only
npm run lint                     # oxlint
```

Restart the dev server after editing `.env` — Vite inlines `VITE_*` at startup.

## Backend: remote-only Supabase

There is no local Supabase stack. The app talks to the hosted project `band-attendance-tracker` (ref `oqniapydqixdcwpzurgs`), pinned in `supabase/config.toml`. Schema changes are applied to that project directly (Supabase MCP `apply_migration`, or `supabase db push` after `supabase link`).

**After any schema change you must hand-edit `src/lib/database.types.ts`.** It is a checked-in copy of generated types, not part of the build. Regenerate with the MCP `generate_typescript_types` tool (or `supabase gen types`) and patch in the diff; nothing will remind you.

`supabase/migrations/` mirrors the remote migration history — add a matching file for every migration you apply so the repo stays reproducible.

## Data model (the parts that bite)

- **Students ↔ ensembles is many-to-many** via `student_ensembles`, each row carrying `joined_on` / `terminated_on`. "Active on date D" = `joined_on <= D and (terminated_on is null or terminated_on >= D)` — implemented once in `src/lib/roster.ts` (`isActiveOn`) and in the `session_roster` RPC. Attendance stats only count `held` sessions falling inside a student's membership window.
- **Rehearsals vs events.** A `rehearsal` belongs to exactly one ensemble and is created *lazily* by the `get_or_create_rehearsal` RPC on first write (it swallows the unique violation so two tabs can race). Everything else is created explicitly by `create_session` and may span several ensembles.
- **`session_ensembles` denormalises `session_date` and `session_kind`**, kept in sync by a composite FK with `on update cascade`. Never write those two columns from the client — go through the RPCs. A partial unique index on `(ensemble_id, session_date) where session_kind = 'rehearsal'` enforces one rehearsal per ensemble per day.
- **Ensembles have multiple weekdays** (`ensemble_weekdays`), a `color`, a `season_start`/`season_end` range used to bulk-create rehearsals (`bulk_create_rehearsals`), and a `sort_order` for the user's manual Home ordering.

### Session state is half-stored, half-derived

The DB stores `scheduled | held | canceled`. The UI shows four states: a `scheduled` session reads as **Future** if its date is ahead, **Needs entry** once past. `displayState()` in `src/lib/sessionState.ts` is the single source of that mapping — use it everywhere rather than reading `status` directly. A database trigger promotes `scheduled → held` whenever an attendance row is written, so client code should not set `held` manually after marking attendance.

## Frontend conventions

- **Reads/writes**: TanStack Query hooks live in `src/queries/*`, one file per domain. Query keys in use: `['ensembles']`, `['students']`, `['memberships']`, `['sessions', {...}]`, `['sessionDates', ensembleId]`, `['roster', id]`, `['attendance', id]`, `['shareLinks']`. Session mutations must invalidate **both** `['sessions']` and `['sessionDates']` (the latter drives the attendance date-skip nav).
- **Mutating UI actions** show a success toast via `toastSuccess()` in `src/lib/toastUndo.ts`, passing an `onUndo` where the reversal is safe (creates, toggles, imports — import undo uses the `inserted_ids`/`linked_ids` the RPC returns). Destructive cascading deletes get a toast with no undo.
- **i18n**: hand-rolled, `src/i18n/{index.tsx,en.ts,he.ts}`. `he` is typed as `Dict = typeof en`, and a runtime test asserts key parity — always add keys to both files. `t()` takes dotted paths; dynamic keys need `as never`.
- **RTL**: Hebrew is the default language and flips `dir` on `<html>`. Use logical Tailwind utilities (`ms-`/`me-`/`ps-`/`pe-`/`text-start`, `border-s-4`, `borderInlineStartColor`) — physical `left/right` classes will break Hebrew layout.
- **Theme**: three-state (system/light/dark) in `src/lib/theme.tsx`, applied as `data-theme` on `<html>`. `src/index.css` defines the light palette on `:root`, the dark palette twice — under `@media (prefers-color-scheme: dark)` guarded by `:not([data-theme='light'])`, and under `:root[data-theme='dark']`. Any new colour token needs both.

## Share links

`share_links` has **no RLS policy at all**, so the anon role cannot read it. Both paths go through Edge Functions using the service-role key: `share-history` (public, validates the token, returns history DTOs with no notes and no PII beyond name/instrument/grade) and `manage-share-link` (gated by the `ADMIN_SECRET` secret, compared in constant time). The client wraps both in `src/lib/functions.ts`; the admin passphrase is entered once and cached in session/localStorage.

Security posture for v1: no auth, the anon key ships in the bundle and every data table has permissive `anon` policies tagged `TEMP: tighten to auth.uid()`. Share links are convenience, not a boundary. Don't harden beyond this without being asked.

## Testing

Vitest covers pure logic only — `lib/roster.ts` (membership boundaries, stats), `lib/importParse.ts` (header aliases, name splitting), `lib/export.ts`, and i18n key parity. There are no component or E2E tests; verify UI changes by running the app.

## Google Drive import

`src/lib/googleDrive.ts` lazy-loads Google's scripts (no npm package) for the Picker + token client. It uses the narrow `drive.file` scope, which **requires `VITE_GOOGLE_APP_ID`** (the Cloud project *number*) to be passed as the Picker's `setAppId` — without it the Picker returns a file id and the subsequent Drive API call 403s. The button hides itself when the Google env vars are absent.

## SPEC.md

`SPEC.md` is the original v1 build spec. The app has since been restructured (nav is now Home / Sessions / Students / Settings; History was merged into Sessions; Manage was dissolved into Home cards and Students). Treat SPEC.md as historical background, not current truth — README.md describes the current screens.
