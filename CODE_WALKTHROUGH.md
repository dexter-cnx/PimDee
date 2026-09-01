# PimDee Code Walkthrough

PimDee (พิมพ์ดี) is a static-first Thai/English touch-typing tutor built with Vite, React, and TypeScript. The current codebase has moved beyond the original MVP: it now includes 36 structured lessons, adaptive practice, dev inspection mode, Phase 2 challenges, localization generation, persistent stats, and Thai-specific grapheme rendering safeguards.

This walkthrough describes the current architecture and the important execution paths contributors should understand before modifying the typing engine or Thai text rendering.

## 1. Current project structure

```text
PimDee/
├── .github/workflows/
│   ├── ci.yml
│   └── pages.yml
├── locales/
│   └── locales.csv
├── scripts/
│   └── gen-locales.mjs
├── src/
│   ├── adapters/
│   │   ├── stats-adapter.ts
│   │   ├── local-adapter.ts
│   │   ├── firebase-adapter.ts
│   │   ├── supabase-adapter.ts
│   │   └── index.ts
│   ├── components/
│   │   ├── ErrorBoundary.tsx
│   │   ├── Keyboard.tsx
│   │   ├── Metric.tsx
│   │   ├── Onboarding.tsx
│   │   ├── Phase2App.tsx
│   │   ├── ProgressDashboard.tsx
│   │   └── Tooltip.tsx
│   ├── core/
│   │   ├── dashboard.ts
│   │   ├── keyboard.ts
│   │   ├── learning.ts
│   │   ├── metrics.ts
│   │   ├── phase2.ts
│   │   └── *.test.ts
│   ├── data/
│   │   └── lessons.ts
│   ├── App.tsx
│   ├── WorkspaceRoot.tsx
│   ├── i18n.ts
│   ├── main.tsx
│   ├── styles.css
│   └── review-fixes.css
├── README.md
├── README-deploy.md
├── package.json
└── vite.config.ts
```

The main lesson experience lives in `src/App.tsx`. Cross-screen routing/workspace composition lives in `WorkspaceRoot.tsx`, while Phase 2 challenge screens live in `components/Phase2App.tsx`.

## 2. Application startup and workspace composition

`src/main.tsx` initializes React, localization, global styles, and the top-level workspace component.

`WorkspaceRoot.tsx` is the screen-level coordinator. It decides whether the user is in the normal lesson flow, onboarding/dashboard views, or a Phase 2 challenge.

This separation is important because the lesson engine and the Phase 2 challenge engine share keyboard/domain concepts, but they are not the same UI component.

## 3. Keyboard input model

Thai lessons are based on the standard Thai Kedmanee layout. PimDee maps physical QWERTY keys to Thai output so the learner can keep an English keyboard layout active at the operating-system level.

The core mapping lives in:

```text
src/core/keyboard.ts
```

The two most important functions are:

```ts
normalizeInput(event, language, expected)
equivalentKeyForChar(char, language)
```

`normalizeInput()` converts a physical keyboard event into the character PimDee expects. It handles normal Kedmanee keys, shifted Kedmanee keys, Space, and Backspace behavior.

`equivalentKeyForChar()` performs the reverse lookup used by the visual keyboard so the next physical key can be highlighted.

The keyboard model is tested in `src/core/keyboard.test.ts`.

## 4. Lesson data and progression

The current lesson pack lives in:

```text
src/data/lessons.ts
```

There are 36 lessons covering:

- home row
- top row
- bottom row
- three-row integration
- Shift
- Thai vowels and marks
- tone marks
- vocabulary and phrases
- numbers and punctuation
- mixed Thai/English usage
- progressively longer real-world text

Each lesson has mastery criteria generated from its lesson ID. Criteria become gradually stricter as the learner advances.

The learning rules live in:

```text
src/core/learning.ts
```

Important responsibilities include:

- lesson unlock rules
- lesson progress aggregation
- mastery checks
- adaptive drill generation from mistake history

During local development, `App.tsx` enables all lessons through:

```ts
const canInspectAllLessons = import.meta.env.DEV
```

This is intentionally a development-only inspection aid so every lesson can be reviewed without completing prerequisites.

## 5. Typing-session state

The lesson flow keeps keystroke progress as a raw text index.

Conceptually:

```ts
index: number
states: TypingState[]
mistakes: Record<string, number>
startedAt: number | null
elapsed: number
finished: boolean
```

The typing engine remains character/code-unit oriented because each physical keypress must be evaluated independently, including Thai vowels and tone marks.

The presentation layer, however, must not render Thai text one raw code unit at a time. That distinction is central to the Thai rendering fix described below.

## 6. Thai grapheme rendering: typing model vs display model

Thai shaping is sensitive to how characters are grouped in the DOM. Rendering every Unicode code point in a separate `<span>` can cause upper/lower vowels and tone marks to attach to the wrong base character or visually overlap.

PimDee therefore separates two models:

```text
Typing model  -> raw text index / one expected key at a time
Display model -> grapheme-aware visual tokens
```

The display model uses three token types:

```ts
type DisplayToken =
  | { kind: 'text'; text: string; start: number; end: number }
  | { kind: 'space'; text: 'SP'; start: number; end: number }
  | { kind: 'mark'; text: string; start: number; end: number; position: 'upper' | 'lower' }
```

This allows the DOM to preserve Thai shaping while still mapping correctness and cursor state back to the raw typing index.

## 7. Why Space is tokenized before grapheme segmentation

A subtle Unicode issue was found during testing: a browser grapheme segmenter can group a Space with a following combining mark in ways that make the Space disappear as an independent display target.

For that reason, PimDee first splits the raw source text around literal spaces and creates explicit Space tokens:

```text
kind: 'space'
text: 'SP'
```

Only the non-space runs are passed through `Intl.Segmenter`.

This guarantees that every physical Space keypress has a corresponding visible `SP` marker and current-target state.

## 8. Standalone Thai mark rendering

Some lessons intentionally practice Thai upper/lower marks as individual keystrokes. These cannot be rendered like normal word text because a combining mark has no base consonant to attach to.

Standalone marks are detected using a Unicode Mark pattern and rendered as dedicated `mark-token` cells.

Upper and lower marks use different visual positioning:

```text
upper -> vowel/tone glyph near top, guide below
lower -> vowel glyph near bottom, guide above
```

Their cursor/target styling is intentionally separate from normal Thai word shaping.

The main CSS for this behavior is in:

```text
src/review-fixes.css
```

## 9. Normal Thai text must remain naturally shaped

Normal Thai words are rendered as grapheme-aware `text-token` spans.

A critical rule is that these spans must not introduce artificial horizontal spacing around every grapheme. Extra padding or margin between normal Thai grapheme clusters can make words look broken even when segmentation is technically correct.

Current styling therefore keeps normal text-token layout neutral and applies visible target styling only to the active token.

The lesson view and Phase 2 view both use this same shaping principle.

## 10. Lesson practice modes

PimDee supports two correction policies.

Natural mode:

```text
wrong key -> record error -> advance
```

Forced correction mode:

```text
wrong key -> record error -> stay on current position
```

The same session state and metrics are reused in both modes. Only the advancement policy changes.

## 11. Metrics

Metrics are implemented in:

```text
src/core/metrics.ts
```

The key outputs are:

- correct character count
- wrong character count
- accuracy
- WPM
- progress percentage

WPM uses the conventional five-character word model.

Metric logic is covered by `src/core/metrics.test.ts`.

## 12. Mistake tracking and keyboard heatmap

Mistakes are stored by expected character:

```ts
Record<string, number>
```

`Keyboard.tsx` maps these character errors back to physical keys and applies heat intensity classes.

This same data is also used by adaptive practice generation so the mistake model is domain data, not presentation-only CSS state.

## 13. Adaptive drills

Adaptive lesson generation lives in:

```text
src/core/learning.ts
```

When a learner completes a session with repeated errors, `buildAdaptiveDrill()` can construct a short practice sequence biased toward weak keys while retaining lesson focus characters.

This is deliberately built on the same typing engine rather than introducing a separate practice implementation.

## 14. Phase 2 challenges

Phase 2 currently includes challenge-specific flows such as:

- Race 60 seconds
- Tone Mark Trainer

Challenge text and scoring helpers live in:

```text
src/core/phase2.ts
```

The UI lives in:

```text
src/components/Phase2App.tsx
```

An important regression was fixed here: Phase 2 originally rendered text using `text.split('')`, which reintroduced the same Thai combining-mark problem already solved in the lesson page.

Phase 2 now uses the same grapheme/display-token strategy as `App.tsx`, including explicit Space tokens and standalone mark handling.

Any future typing surface must follow this rule: **do not render Thai practice text with `split('')` or one span per code point.**

## 15. Progress dashboard

Historical results are transformed by:

```text
src/core/dashboard.ts
```

and displayed in:

```text
src/components/ProgressDashboard.tsx
```

The dashboard derives summaries from persisted typing results rather than keeping a second independent data model.

Dashboard transformations are tested in `src/core/dashboard.test.ts`.

## 16. Stats adapter architecture

Persistence is abstracted behind:

```text
src/adapters/stats-adapter.ts
```

Implementations currently include:

- local browser storage
- Firebase adapter boundary
- Supabase adapter boundary

The adapter factory is in:

```text
src/adapters/index.ts
```

The default static deployment can run entirely local-first without requiring a backend.

## 17. Localization workflow

PimDee uses a CSV-first localization workflow.

Source of truth:

```text
locales/locales.csv
```

Generator:

```text
scripts/gen-locales.mjs
```

Generated resources are consumed by `src/i18n.ts` and `react-i18next`.

This keeps translated strings reviewable in a single tabular source rather than editing multiple locale files independently.

## 18. Styling layers

The base application styles live in:

```text
src/styles.css
```

Targeted review/fix styling currently lives in:

```text
src/review-fixes.css
```

`review-fixes.css` contains the sensitive typing-display overrides for:

- explicit Space markers
- active text target styling
- standalone upper/lower Thai marks
- mark guides
- mistake heat levels

When modifying Thai practice text, inspect both files because generic `.typing-text span` rules in `styles.css` can unintentionally affect grapheme shaping.

## 19. Testing and CI

Core behavior has automated tests for:

- keyboard mapping
- metrics
- lesson progression/adaptive logic
- dashboard transformations
- Phase 2 helpers

The CI workflow should be treated as the merge gate. The expected validation commands are defined by `package.json` and the GitHub Actions workflow.

Before merge, verify the current PR head has completed CI successfully and that no new blocking review feedback exists.

## 20. GitHub Pages deployment

PimDee is deployable as a static GitHub Pages application.

The Pages workflow lives in:

```text
.github/workflows/pages.yml
```

Deployment details and adapter configuration are documented in `README-deploy.md`.

## 21. Rules for future typing-screen work

To avoid reintroducing the Thai rendering bugs fixed in this branch:

1. Keep typing evaluation indexed against the raw source string.
2. Render Thai text through grapheme-aware display tokens.
3. Extract literal Space tokens before grapheme segmentation.
4. Never use `text.split('')` for Thai practice rendering.
5. Treat standalone combining marks as dedicated visual cells.
6. Do not add persistent margin/padding between normal Thai grapheme clusters.
7. Apply `lang="th"` / locale-aware font stacks to Thai practice text.
8. Reuse the same display-token strategy on every new typing surface.

These constraints are now part of the architecture, not just visual polish.

## 22. Suggested contributor reading order

1. `README.md`
2. `CODE_WALKTHROUGH.md`
3. `src/WorkspaceRoot.tsx`
4. `src/App.tsx`
5. `src/components/Phase2App.tsx`
6. `src/core/keyboard.ts`
7. `src/core/learning.ts`
8. `src/core/metrics.ts`
9. `src/data/lessons.ts`
10. `src/components/Keyboard.tsx`
11. `src/adapters/stats-adapter.ts`
12. `src/styles.css`
13. `src/review-fixes.css`
14. `.github/workflows/ci.yml`
15. `.github/workflows/pages.yml`

This order follows the system from product surface -> typing behavior -> learning logic -> persistence -> presentation -> delivery.
