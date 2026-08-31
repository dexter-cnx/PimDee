# PimDee deployment

PimDee is a static Vite/React application deployed by GitHub Actions to GitHub Pages.

## Local verification

```bash
npm install
npm run check:l10n
npm run typecheck
npm test
npm run build
```

The Vite base path is `/PimDee/`, matching `https://dexter-cnx.github.io/PimDee/`.

## Localization workflow

`locales/locales.csv` is the single source of truth for interface copy. Do not edit `src/i18n/resources.generated.ts` directly.

```bash
npm run gen:l10n
```

CI runs `npm run check:l10n` and fails when generated resources are stale. This mirrors a CSV-first localization workflow used by apps that generate per-language resources from one table.

## GitHub Pages

Repository Settings → Pages → Build and deployment must use **GitHub Actions**. Every push to `main` runs `.github/workflows/pages.yml`, verifies localization, typechecks, runs unit tests, builds `dist`, uploads the Pages artifact, and deploys it.

No `gh-pages` package or manual deploy command is required.
