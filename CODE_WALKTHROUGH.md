# PimDee Code Walkthrough

PimDee (พิมพ์ดี) is a static-first Thai/English beginner typing tutor built with Vite, React, and TypeScript. The MVP is designed to run without a backend and deploy directly to GitHub Pages.

This walkthrough explains the codebase from the entry point through the typing engine, Kedmanee mapping, keyboard visualization, result tracking, storage adapters, and deployment flow.

## 1. Project structure

```text
PimDee/
├── .github/workflows/
│   ├── ci.yml                 # TypeScript + production build validation
│   └── pages.yml              # GitHub Pages deployment
├── src/
│   ├── adapters/
│   │   ├── stats-adapter.ts   # Storage contract
│   │   ├── local-adapter.ts   # LocalStorage implementation
│   │   ├── firebase-adapter.ts
│   │   ├── supabase-adapter.ts
│   │   └── index.ts           # Adapter factory
│   ├── main.tsx               # MVP UI + typing engine
│   └── styles.css             # Responsive application styling
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

For the MVP, most interactive behavior intentionally lives in `src/main.tsx`. This keeps the first release easy to inspect and iterate. As Race Mode, dashboards, authentication, and adaptive lessons arrive, this file should be split into feature modules.

---

## 2. Application entry point

`src/main.tsx` ends with the standard React root bootstrap:

```tsx
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

`App` owns the MVP session state: selected language, lesson, typing mode, current cursor, typed characters, correctness state, mistake counts, timer, and completion state.

The main domain types are deliberately small:

```ts
type Lang = 'TH' | 'EN'
type Mode = 'natural' | 'forced'
type Finger = 'lp' | 'lr' | 'lm' | 'li' | 'ri' | 'rm' | 'rr' | 'rp' | 'thumb'
```

This makes invalid UI states harder to create than using unconstrained strings.

---

## 3. Kedmanee keyboard mapping

The important design decision in PimDee is that a learner does **not** need to switch the operating-system keyboard to Thai during Thai lessons.

`TH_MAP` maps physical QWERTY keys to Thai Kedmanee output:

```ts
const TH_MAP: Record<string, string> = {
  a: 'ฟ',
  s: 'ห',
  d: 'ก',
  f: 'ด',
  j: '่',
  k: 'า',
  l: 'ส',
  ';': 'ว',
  // ...
}
```

So when the lesson expects `ฟ`, pressing physical key `A` is accepted as `ฟ`.

Shifted Kedmanee characters are handled separately by `TH_SHIFT_MAP`:

```ts
const TH_SHIFT_MAP: Record<string, string> = {
  u: '๊',
  j: '๋',
  n: '์',
  h: '็',
  // ...
}
```

Keeping normal and shifted maps separate makes tone-mark behavior explicit and prepares the code for the dedicated Tone Mark Trainer planned in Phase 2.

### Input normalization

All keyboard events pass through:

```ts
normalizeInput(event, language)
```

Its responsibilities are:

1. Convert `Backspace` into the internal `BACKSPACE` command.
2. Ignore navigation/modifier combinations such as Tab, Enter, Cmd/Ctrl, and Alt.
3. Leave English character input unchanged in EN mode.
4. Convert physical QWERTY input into Kedmanee characters in TH mode.
5. Use `TH_SHIFT_MAP` when Shift is held.

This isolates keyboard-layout concerns from the typing-state machine.

---

## 4. Finding the physical key for the next character

The UI highlights the key the learner should press next.

That is handled by:

```ts
equivalentKeyForChar(char, language)
```

For English it returns the lowercase character directly. For Thai it performs a reverse lookup through `TH_MAP` and `TH_SHIFT_MAP`.

Example:

```text
Expected lesson character: ฟ
TH_MAP reverse lookup:      a
Highlighted physical key:   A
```

This same separation is useful later for finger coaching, audio hints, and adaptive drills.

---

## 5. Keyboard model and finger assignments

`KEYS` describes the visual keyboard independently of the typing text.

Each key contains:

```ts
type KeyDef = {
  en: string
  th: string
  finger: Finger
  shiftedTh?: string
}
```

Example:

```ts
{ en: 'a', th: 'ฟ', finger: 'lp' }
```

`lp` means left pinky. The current MVP assigns every displayed key to a finger and renders the assignment through CSS classes such as:

```text
finger-lp
finger-li
finger-ri
finger-rp
```

The visualization therefore has three simultaneous teaching signals:

- QWERTY physical key
- Kedmanee Thai character
- expected finger

The `Keyboard` component also receives the current `expectedKey` and applies the `expected` class to guide the learner visually.

---

## 6. Lesson model

Lessons are data, not hard-coded UI branches.

```ts
type Lesson = {
  id: number
  titleTh: string
  titleEn: string
  subtitleTh: string
  subtitleEn: string
  th: string
  en: string
}
```

The MVP contains six lessons:

1. Home row / แถวเหย้า
2. Top row / แถวบน
3. Bottom row / แถวล่าง
4. Tone marks / วรรณยุกต์
5. Mixed TH/EN usage / สลับภาษา
6. Everyday sentences / ประโยคใช้งานจริง

Because lessons are plain data, future lesson packs can move to JSON or a dedicated repository without rewriting the engine.

A logical future extraction would be:

```text
src/features/lessons/data/basic-lessons.ts
```

---

## 7. Typing session state

The central state is:

```ts
const [index, setIndex] = useState(0)
const [typed, setTyped] = useState<string[]>([])
const [states, setStates] = useState<Array<'pending' | 'correct' | 'wrong'>>([])
const [mistakes, setMistakes] = useState<Record<string, number>>({})
const [startedAt, setStartedAt] = useState<number | null>(null)
const [elapsed, setElapsed] = useState(0)
const [finished, setFinished] = useState(false)
```

Think of these as the MVP typing-session state machine:

```text
idle
  ↓ first valid key
running
  ↓ each character
correct / wrong
  ↓ last target character
finished
```

`reset()` returns the session to the initial state and focuses the practice area.

Lesson changes, language changes, and switching between lesson/custom-text mode trigger a reset so stale progress cannot leak into another exercise.

---

## 8. Natural vs Forced Correction mode

Both modes use the same engine but differ after an error.

### Natural mode

```text
wrong key → mark red → count mistake → advance
```

This resembles normal typing and is useful for measuring fluent speed.

### Forced correction mode

```text
wrong key → mark red → stay on current position → learner must correct
```

The implementation stops advancement here:

```ts
if (!isCorrect) {
  setMistakes(...)
  if (mode === 'forced') return
}
```

Backspace can clear the failed position before the learner retries it.

The engine therefore stays shared while the correction policy remains configurable.

---

## 9. WPM, accuracy, progress, and timing

Live metrics are derived from session state rather than stored independently.

### Accuracy

```ts
accuracy = correct / attempted * 100
```

### WPM

PimDee uses the conventional five-character word model:

```ts
wpm = (correctCharacters / 5) / minutes
```

### Progress

```ts
progress = index / text.length * 100
```

The timer begins only when the first valid typing key is pressed. A 250 ms interval updates the visible elapsed time while a session is active.

This avoids counting time spent reading instructions before the learner starts.

---

## 10. Mistake heatmap

Mistakes are stored by expected character:

```ts
Record<string, number>
```

For example:

```json
{
  "่": 4,
  "พ": 2,
  "า": 1
}
```

The `Keyboard` component converts these character mistakes back to each physical key and computes a heat intensity:

```ts
const heat = Math.min(4, mistakeForKey(key))
```

The key receives a CSS class from `heat-0` through `heat-4`.

This is deliberately kept as semantic data rather than storing CSS state, so later analytics can reuse the same counts to identify weak keys and weak fingers.

That becomes especially important for Phase 3 statistics and Phase 4 adaptive lessons.

---

## 11. Custom Text mode

The textarea allows the learner to paste arbitrary text.

When Custom Text is activated:

```ts
usingCustom === true
```

and the source text changes from the selected lesson to:

```ts
customText.trim()
```

The same typing engine, WPM calculation, accuracy calculation, keyboard hints, and heatmap are reused without a second implementation.

That reuse is important: a lesson is fundamentally only a source of target text and metadata.

---

## 12. Stats Adapter architecture

Backend independence is intentional.

The contract lives in:

```text
src/adapters/stats-adapter.ts
```

Conceptually:

```ts
interface StatsAdapter {
  saveResult(result): Promise<void>
  getResults(userId): Promise<TypingResult[]>
  getLeaderboard(): Promise<...>
}
```

The MVP defaults to:

```text
LocalStorageAdapter
```

which means GitHub Pages works with zero backend cost and supports offline/local persistence.

Two future adapters are already separated:

```text
FirebaseAdapter
SupabaseAdapter
```

The factory in `src/adapters/index.ts` chooses an implementation according to:

```text
VITE_ADAPTER=local|firebase|supabase
```

UI and typing-domain code therefore do not need to know whether results are stored in browser storage, Firestore, or Supabase.

This boundary should remain stable as cloud sync is implemented.

---

## 13. Why the adapter boundary matters

Without an adapter, UI code tends to become coupled to calls like:

```ts
supabase.from('results').insert(...)
```

or:

```ts
addDoc(collection(db, 'results'), ...)
```

inside React components.

PimDee instead keeps this dependency direction:

```text
Typing UI
   ↓
StatsAdapter interface
   ↓
LocalStorage / Firebase / Supabase
```

This enables:

- free static GitHub Pages MVP
- backend migration without rewriting the typing engine
- easier automated testing
- offline mode
- future guest-to-account migration

---

## 14. UI composition

The current page is organized into three main areas:

```text
Sidebar          Main practice area          Right guide
Lessons          Metrics                     Finger guide
                 Typing text                 Roadmap
                 Keyboard
                 Custom text
                 Results
```

`styles.css` handles the responsive transformation so this layout can collapse for smaller screens.

The design intentionally avoids a heavy component library. This keeps bundle size and visual dependencies low for a simple static application.

---

## 15. GitHub Pages configuration

`vite.config.ts` sets:

```ts
base: '/PimDee/'
```

This is required because the site is hosted as a GitHub project page rather than at the account root.

The expected production URL is:

```text
https://dexter-cnx.github.io/PimDee/
```

The deployment workflow builds `dist/`, uploads it as a Pages artifact, and deploys it through GitHub Actions.

---

## 16. CI pipeline

The CI workflow is intended to validate every pull request with two application-level gates:

```bash
npm run typecheck
npm run build
```

`typecheck` runs:

```bash
tsc --noEmit
```

This matters because Vite transpilation alone is not a substitute for a TypeScript type check.

The Pages workflow repeats typecheck + production build before deployment so a broken `main` build cannot intentionally become the published artifact.

---

## 17. Recommended next refactor

The current single-file MVP is acceptable for initial validation, but Phase 2 should split responsibilities before Race Mode is added.

Recommended direction:

```text
src/
├── app/
│   └── App.tsx
├── features/
│   ├── typing/
│   │   ├── components/
│   │   │   ├── TypingArea.tsx
│   │   │   └── Keyboard.tsx
│   │   ├── engine/
│   │   │   ├── kedmanee.ts
│   │   │   ├── typing-engine.ts
│   │   │   └── metrics.ts
│   │   └── types.ts
│   ├── lessons/
│   │   └── data/
│   └── stats/
├── adapters/
└── main.tsx
```

The most important boundary to extract first is the **pure typing engine**. It should receive an expected character + physical key event and return a deterministic result without depending on React.

That will make unit testing the difficult parts straightforward:

- Kedmanee key mapping
- Shift/tone marks
- Natural mode
- Forced correction mode
- Backspace behavior
- WPM/accuracy calculation
- lesson completion

---

## 18. Architecture direction after MVP

The intended evolution is:

```text
                 ┌────────────────────┐
                 │ React presentation │
                 └─────────┬──────────┘
                           │
                 ┌─────────▼──────────┐
                 │   Typing domain    │
                 │ engine / lessons   │
                 └─────────┬──────────┘
                           │
                 ┌─────────▼──────────┐
                 │   StatsAdapter     │
                 └──────┬────┬────────┘
                        │    │
          ┌─────────────┘    └──────────────┐
          ▼                                  ▼
   LocalStorage                         Cloud backend
   MVP / offline                    Supabase or Firebase
```

Race Mode, leaderboards, login, classrooms, and adaptive learning should sit around this core rather than replacing it.

The long-term value of PimDee is the Thai beginner-learning model—especially Kedmanee finger guidance, tone-mark training, weak-key analysis, and mixed TH/EN practice—not a particular backend provider.

---

## 19. Suggested reading order for contributors

Read the repository in this order:

1. `README.md` — product purpose
2. `CODE_WALKTHROUGH.md` — architecture and data flow
3. `src/main.tsx` — current MVP implementation
4. `src/adapters/stats-adapter.ts` — persistence boundary
5. `src/adapters/local-adapter.ts` — current storage implementation
6. `src/adapters/index.ts` — backend selection
7. `src/styles.css` — responsive presentation
8. `.github/workflows/ci.yml` — quality gate
9. `.github/workflows/pages.yml` — production deployment
10. `README-deploy.md` — deployment operations

This sequence follows the application from product intent → domain behavior → persistence → presentation → delivery.
