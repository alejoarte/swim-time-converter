# Swim Time Converter

Convert swimming times between **SCY** (Short Course Yards), **SCM** (Short Course Meters), and **LCM** (Long Course Meters) using Classical (Colorado Timing) conversion factors.

## Live demo

After deploying to GitHub Pages, the app will be available at:

`https://<your-github-username>.github.io/swim-time-converter/`

## Features

- **Manual entry** — select one source course, pick events, enter times in `MM:SS.hh` or `SS.hh` format
- **Plan training** — enter a goal time and generate training zone paces from multiple zone systems
- Generate conversion tables on demand (SCY, SCM, LCM columns)
- Export conversion or training zone results to Excel (`.xlsx`)
- **Shareable plan links** — copy a URL that opens Plan training with the same course, event, goal time, and zone settings pre-loaded
- Comma decimal times (`59,24`) supported for European/Latin American entry

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
| `npm run preview` | Preview production build |

## Deployment (GitHub Pages)

1. Push to the `main` branch — the [deploy workflow](.github/workflows/deploy.yml) builds and publishes to the `gh-pages` branch.
2. In your repo **Settings → Pages**, set source to **Deploy from branch**, branch `gh-pages`, folder `/ (root)`.
3. Visit `https://<username>.github.io/swim-time-converter/`.

## Conversion model

Conversions use the Classical (Colorado Timing) factors documented by [SportsEngine Motion](https://motion-help.sportsengine.com/en/articles/8538107-how-to-perform-course-conversion-factoring-of-times) — the same model used by SwimSwam's Classic Converter.

Distance factors (0.8925 and 1.02) apply only to **distance freestyle** yard↔meter pairs (e.g. 500y↔400m). **400 IM** uses the standard 1.11 factor plus the medley increment on SCY↔LCM.

**Disclaimer:** Converted times are estimates and are not official. They cannot be used for records or qualification purposes.

## Shareable plan links

In **Plan training**, after the zone table appears, use **Copy link** to copy a URL. Anyone who opens that link lands in Plan mode with the same settings and sees the zone table immediately.

Example query parameters:

```
?plan=1&c=SCY&e=200-free&t=12834&z=a-system&o=fixed
```

| Param | Meaning |
|-------|---------|
| `plan` | Always `1` for plan share links |
| `c` | Course: `SCY`, `SCM`, or `LCM` |
| `e` | Event id (e.g. `200-free`) |
| `t` | Goal time in centiseconds |
| `z` | Zone system: `a-system`, `us-system`, or `dual` (optional, default `a-system`) |
| `o` | Pace model: `fixed` or `percent` (optional, default `fixed`) |
| `lng` | UI language: `en` or `es` (optional) |

Shared links include your goal time in the URL. Only share with people you trust.

## Manual smoke test checklist

- [ ] Select SCY, pick 100 Free, enter `1:02.34`, generate — LCM shows ~`1:10.80`
- [ ] Select multiple events, verify all appear in results table
- [ ] Source column is highlighted with `*`
- [ ] Edit times scrolls back and clears results
- [ ] Export downloads a valid `.xlsx` file
- [ ] App loads correctly from GitHub Pages URL (with `/swim-time-converter/` base path)
- [ ] Plan training: enter goal time, verify zone table and Excel export
- [ ] Plan training: Copy link → open in incognito → plan mode loads with same zones
- [ ] Invalid share link (`?plan=1&c=SCY&e=200-free&t=abc`) shows warning, no crash

## Tech stack

- Vite + React + TypeScript
- i18next (English / Spanish)
- SheetJS (`xlsx`) for Excel export
