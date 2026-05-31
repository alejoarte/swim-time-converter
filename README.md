# Swim Time Converter

Convert swimming times between **SCY** (Short Course Yards), **SCM** (Short Course Meters), and **LCM** (Long Course Meters) using Classical (Colorado Timing) conversion factors.

## Live demo

After deploying to GitHub Pages, the app will be available at:

`https://<your-github-username>.github.io/swim-time-converter/`

## Features

- **Manual entry** — select one source course, pick events, enter times in `MM:SS.hh` or `SS.hh` format
- **Import PDF** — upload Hy-Tek Meet Manager text PDFs, review parsed rows, convert an entire meet at once
- Generate conversion tables on demand (SCY, SCM, LCM columns)
- Export single-athlete or full-meet results to Excel (`.xlsx`)
- Comma decimal times (`59,24`) supported for European/Latin American meet sheets

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:5173/swim-time-converter/` (note the base path).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build to `dist/` |
| `npm test` | Run unit tests |
| `npm run preview` | Preview production build |

## Deployment (GitHub Pages)

1. Push to the `main` branch — the [deploy workflow](.github/workflows/deploy.yml) runs tests, builds, and publishes to the `gh-pages` branch.
2. In your repo **Settings → Pages**, set source to **Deploy from branch**, branch `gh-pages`, folder `/ (root)`.
3. Visit `https://<username>.github.io/swim-time-converter/`.

## Conversion model

Conversions use the Classical (Colorado Timing) factors documented by [SportsEngine Motion](https://motion-help.sportsengine.com/en/articles/8538107-how-to-perform-course-conversion-factoring-of-times) — the same model used by SwimSwam's Classic Converter.

**Disclaimer:** Converted times are estimates and are not official. They cannot be used for records or qualification purposes.

## PDF import

Switch to **Import PDF** in the app to upload a meet sheet. Currently supported:

- **Hy-Tek Meet Manager 8.0** text PDFs (not scanned/image PDFs)
- **English layout** — time-first rows (`Event … LC Meter Freestyle`)
- **Spanish layout** — team-first rows (`Evento … CL Metro Estilo Libre`)
- Meet programs and results with the standard Hy-Tek row layouts

The app extracts swimmer rows in your browser, shows a review table so you can fix bad rows, then converts all included rows and exports a meet spreadsheet with Name, Age, Team, Lane, Event, and SCY/SCM/LCM columns.

If your PDF comes from a different timing system, parsing may fail or require manual fixes in the review step.

## Manual smoke test checklist

- [ ] Select SCY, pick 100 Free, enter `1:02.34`, generate — LCM shows ~`1:10.80`
- [ ] Select multiple events, verify all appear in results table
- [ ] Source column is highlighted with `*`
- [ ] Edit times scrolls back and clears results
- [ ] Export downloads a valid `.xlsx` file
- [ ] App loads correctly from GitHub Pages URL (with `/swim-time-converter/` base path)
- [ ] **Import PDF (English):** upload `programa finales sesion uno.pdf`, review rows, convert, export meet `.xlsx`
- [ ] **Import PDF (Spanish):** upload `sesion uno programa de competencia.pdf`, review rows, convert, export meet `.xlsx`

## Tech stack

- Vite + React + TypeScript
- Vitest (unit tests)
- SheetJS (`xlsx`) for Excel export
- pdf.js (`pdfjs-dist`) for client-side PDF text extraction
