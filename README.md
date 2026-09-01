# PimDee - พิมพ์ดี

PimDee is a static-first Thai/English beginner touch-typing tutor focused on Thai Kedmanee and English QWERTY. It is designed for absolute beginners and can run entirely in the browser without a backend.

## Current scope

- Thai Kedmanee + English QWERTY keyboard visualization with finger zones
- 36 progressive lessons
- Natural and forced-correction typing modes
- Live WPM, accuracy, elapsed time, and lesson progress
- Keyboard mistake heatmap
- Custom text practice
- Local-first result storage through `StatsAdapter`
- Thai physical-key mapping: keep the OS keyboard in English and PimDee maps physical keys to Kedmanee automatically
- Thai-aware practice rendering for vowels, tone marks, and spaces
- Explicit `SP` hints for spaces so learners can see every required keystroke
- Development mode unlocks all lessons for QA (`import.meta.env.DEV`)

## Thai text rendering model

Thai typing cannot be rendered safely by wrapping every Unicode code point in an independent element. Vowels and tone marks are combining characters and browser shaping can break when they are split incorrectly.

PimDee therefore keeps two concepts separate:

- **Typing index** — the raw keystroke/code-unit position used by the typing engine.
- **Display token** — the visual unit rendered to the learner.

The practice renderer emits three display-token kinds:

- `text` — normal grapheme text
- `mark` — standalone Thai combining marks used in lessons
- `space` — explicit `SP` hints

Spaces are extracted before grapheme segmentation so a space can never be swallowed into a neighboring combining-mark cluster. The current target indicator is then mapped back to the original typing index.

## Run locally

```bash
npm install
npm run dev
```

Vite will print the local URL, normally `http://localhost:5173/`.

When running locally, every lesson is unlocked so the full lesson pack can be inspected without completing progression requirements.

## Quality checks

```bash
npm run typecheck
npm test
npm run build
```

## Build

```bash
npm run build
```

The production output is written to `dist/`.

## Repository hygiene

Commit these files when they change:

```text
package.json
package-lock.json
```

Do not commit generated/local artifacts such as:

```text
node_modules/
dist/
.vite/
coverage/
```

The repository `.gitignore` already excludes these paths.

## Deployment

PimDee is configured for GitHub Pages at:

```text
https://dexter-cnx.github.io/PimDee/
```

See [README-deploy.md](README-deploy.md) for deployment and adapter configuration details.

## Architecture

The application is intentionally split into small domain modules:

```text
src/
├── App.tsx                 # application/session orchestration + display-token rendering
├── components/             # keyboard, metrics, tooltips
├── core/                   # keyboard mapping, learning/progression, metrics, types
├── data/                   # lesson definitions
├── adapters/               # local/cloud persistence boundary
├── i18n/                   # generated/runtime localization support
├── styles.css              # base application styling
└── review-fixes.css        # focused UI refinements
```

For a detailed implementation tour, see [CODE_WALKTHROUGH.md](CODE_WALKTHROUGH.md).
