# Tizmo — UI Design Spec

The approved visual direction. Interactive reference: `design/tutti-redesign.html` was the first
(rejected) pass; the approved one is the published artifact **"Tutti Before the Downbeat"**
(`/artifacts` in the terminal, or claude.ai/code/artifacts).

Read this before changing anything visual. It overrides the current shadcn defaults in
`src/index.css` and `tailwind.config.js`.

---

## 1. The idea in one line

**The quiet before the downbeat.** A conductor stands in front of thirty-five kids, phone in one
hand, three minutes before the first note, often in a dim hall. The interface behaves like the room
does at that moment: almost transparent. Names, four marks, one count. Everything else disappears.

Two consequences that decide most arguments:

- **When in doubt, remove.** Borders, badges, shadows, dividers and labels must earn their place.
  Space is the primary structural device; a 1px line at 5–9% opacity is the secondary one.
- **Colour is meaning, never decoration.** Warm light means "this needs you". Green/red/amber/blue
  mean the four attendance states. Every other hue on screen is an ensemble's identity, which is
  user data — not part of the theme.

---

## 2. Colour

Dark is the primary theme (rehearsal halls are dim). Light is a full, equal second theme.

### Dark (primary)

| Token | Hex | HSL (for `index.css`) | Role |
|---|---|---|---|
| stage | `#0D141E` | `216 40% 8%` | page ground |
| stand | `#121B26` | `213 36% 11%` | raised surface — phone body, panels |
| score | `#E9E5DA` | `44 25% 88%` | primary text |
| dim | `rgba(233,229,218,.46)` | — | secondary text |
| faint | `rgba(233,229,218,.24)` | — | tertiary text, unselected marks |
| hairline | `rgba(233,229,218,.09)` | — | the strongest line allowed |
| separator | `rgba(233,229,218,.055)` | — | between list rows |
| lamp | `#E8C68A` | `38 67% 73%` | needs-attention, warm light |

### Light

| Token | Hex | HSL | Role |
|---|---|---|---|
| stage | `#EDEEEA` | `78 11% 93%` | page ground |
| stand | `#F7F8F5` | `80 14% 97%` | raised surface |
| score | `#141C28` | `215 33% 12%` | primary text |
| dim / faint | `rgba(20,28,40,.52 / .30)` | — | secondary / tertiary text |
| hairline / separator | `rgba(20,28,40,.10 / .06)` | — | lines |
| lamp | `#9A7126` | `39 60% 38%` | needs-attention |

The neutrals are deliberately not grey: the dark ground is blue-biased, the light ground is
faintly green. A pure grey reads as unconsidered.

### Attendance states

| State | Dark | Light |
|---|---|---|
| present | `#7FC7A0` | `#3B8763` |
| absent | `#DE8878` | `#B65845` |
| late | `#E8C68A` | `#9A7126` |
| excused | `#8FB4DC` | `#4A719E` |

A selected mark shows as `color-mix(in srgb, <state> 13%, transparent)` behind the glyph, with the
glyph itself in the state colour. **Never a solid filled block** — the current app fills the whole
button, which shouts.

### Ensemble colours

User data, stored on `ensembles.color`. Presets (adjusted for both grounds):
`#A98AD8` `#DE8878` `#D3B573` `#6FBFA9` `#8FB4DC` `#C98BB0` `#9BB86E` `#D79A6A`.

Rendered as a **5–6px dot**, never a spine, stripe, filled badge or background wash. One dot per
ensemble per row.

### The stand light

The page ground carries one warm radial wash, ~10% opacity in dark / ~7% in light. On the web
proposal it tracks the pointer; in the app it should be a static wash behind the header area. It is
atmosphere, not a control.

---

## 3. Type

Two families, both carrying Hebrew and Latin, so switching language changes the script and not the
voice.

- **Assistant** — everything except small labels. Weight **200** for anything large (the tally,
  page titles), **300** for body, **400** for names and emphasis. Never 600+.
- **Alef** — small labels, eyebrows, weekday letters, state words. 400.

```
Assistant 200  48–56px  the tally (28 of 35), page titles     letter-spacing -.035em
Assistant 300  15–18px  body copy, ledes                       line-height 1.85
Assistant 400  15.5px   student names, ensemble names          letter-spacing -.005em
Alef      400  10–12px  state words, weekday letters, captions letter-spacing .10–.20em
```

Rules: student names are the content of this app and are the largest thing in their row. Digits that
line up in columns get `font-variant-numeric: tabular-nums`. No uppercase Hebrew (it does not
exist); Latin eyebrows may be uppercase with generous tracking. No font weight above 400 anywhere in
the UI chrome.

---

## 4. Structure

**Spacing does the work.** Reference values from the approved design:

- Screen padding: 20–22px horizontal.
- List row: 13–14px vertical padding, no fixed height; the name sets the height.
- Between a name and its instrument: 3px. Between groups: 22px+.
- Section heading to content: 8px. Between major sections: 88–110px on the web page; 32–44px in the app.

**Lines.** At most one weight: 1px at 5.5% (between list rows) or 9% (structural). Rows are
separated with `box-shadow: 0 -1px 0 <separator>` rather than borders, so the first row has no line
above it.

**No cards.** No card borders, no card radius, no shadows on list items, no alternating stripes.
The only radius in the system: 18–22px on a screen container, 50% on dots and mark buttons.

**Groups** are announced by a small Alef label + a hairline that fills the remaining width, not by a
box around the content.

---

## 5. Components

### Roster row (the screen that matters)

```
[ name            ]  [ ✓ ] [ ✕ ] [ ◷ ] [ ⊖ ]
[ instrument      ]
```

- Name: Assistant 400, 15.5px. Instrument: 11.5px at `faint`.
- Marks: 1.4px stroke SVG icons at 19px, inside **44px** circular hit areas. Unselected sits at 50%
  opacity with no border and no background. Selected gets the 13% tint described above.
- Tapping the selected mark again clears it.
- No per-row section tick, no avatar, no chevron, no divider above the first row.

### Count

Assistant 200 at ~52px, tabular figures, with "of 35" at 14px `faint` beside it. Below it a **1px
thread** that fills in the ensemble's colour — not a 4px progress bar, not a ring.

### Session state

A word, not a badge: `Needs entry` / `Future` / `Held` / `Canceled` in Alef 11.5px with
`letter-spacing: .14em`, coloured `lamp` when it needs entry and `present` when held. The date sits
beside it at 12.5px `faint`. Marking the last student flips the word — that transition is visible
and is the point.

### Home row

```
● [ensemble name          ]     ●(lamp, if a session needs entry)
  [S M T W T F S]
  [18:00 · 35 students]
```

Weekday letters in Alef 10.5px, 7px apart; rehearsal days at full `score`, the rest at `faint`.
This replaces the `Monday · 20:00 · 35 students` string — a glance instead of a read.

### Sessions row

Date rail (day number Assistant 300 17px + weekday in Alef 10px), title, ensemble dot + name, the
attendance figure in tabular digits, and a **6px pip** for state (filled green held, filled lamp
needs-entry, 1px ring in absent-red for canceled). No badges, no boxes.

### Buttons

Primary actions in this app are marks, not buttons. Everything else is a quiet text button:
Assistant 300 12.5px at `dim`, no border, no fill, turning `lamp` on hover. Reserve a bordered
button for genuinely destructive confirmation only.

---

## 6. Motion

One moment, and it answers an action: when the last student in a roster is marked, the warm wash
swells once (~1.5s, ease-out) and settles as the state word changes to *Held*. Nothing else
animates on arrival — no entrance fades, no hover lifts, no staggered lists.

State changes (mark tint, thread width, state word colour) cross-fade at 350–600ms so they read as
settling rather than snapping.

All of it sits behind `@media (prefers-reduced-motion: reduce)`.

---

## 7. RTL and bilingual

Hebrew is the product default; English is the second language. Both are first-class.

- Logical properties only: `ms-/me-/ps-/pe-`, `text-start`, `inset-inline-start`,
  `border-inline-start`. A physical `left`/`right` is a bug.
- Weekday letters change per language (`א ב ג ד ה ו ש` / `S M T W T F S`) — they are content, not
  icons.
- Both typefaces carry both scripts, so no font swap on language change.
- Test every screen in both directions before calling it done; the artifact's language toggle is the
  reference for what "the same silence in both directions" means.

---

## 8. What was removed (do not reintroduce)

| Gone | Replaced by |
|---|---|
| `Monday · 20:00 · 0 students` middot strings | weekday letter strip + plain time |
| Rounded status pills / badges | a coloured word, or a 6px pip |
| Card borders + shadow on every list item | 1px separator at 5.5% opacity |
| Solid-filled attendance buttons | 13% tint behind a thin glyph |
| Ensemble colour as a 4px spine | a 5px dot |
| 4px progress bar | 1px thread |
| Bold/heavy display type | Assistant 200 |

Also avoid, as generic-AI tells: cream `#F4F1EA` with terracotta, near-black with one acid accent,
hairline broadsheet columns, gradient hero on white, Inter or Space Grotesk, emoji as section
markers, everything centred, one radius and one shadow on every block.

---

## 9. Implementation notes

- Palette lives in `src/index.css` as HSL triplets under `:root`, the
  `@media (prefers-color-scheme: dark)` block guarded by `:not([data-theme="light"])`, and
  `:root[data-theme="dark"]` — all three, per the existing pattern in `CLAUDE.md`.
- Add `Assistant` and `Alef` via a Google Fonts `<link>` in `index.html`, and set them as
  `--font-ui` / `--font-alt` in the Tailwind theme rather than per-component classes.
- Files that change most: `src/pages/EnsemblePage.tsx` (roster + count + state), `src/components/StatusCell.tsx`
  (tint instead of fill, 44px target), `src/pages/HomePage.tsx` (rows and dots instead of cards and
  spines), `src/pages/SessionsPage.tsx` (pips instead of badges).
- Keep the 44px minimum hit area everywhere, even where the visible mark is 19px.
- Suggested order: ensemble roster first — it is where the direction either works or does not.
