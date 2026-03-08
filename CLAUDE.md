# Meld OTP — Claude Project Context

## What This Is
Internal compensation tool for **Property Meld** called **Outcome-to-Pay (OTP)**.
It calculates and tracks three metrics for each employee ("Melder"):
- **OAP%** — Outcome Attainment Percentage: weighted composite of role-specific performance metrics
- **CAP%** — Compensation Attainment Percentage: actual pay ÷ target comp × 100 (company accountability)
- **Ratio** — Comp Ratio: actual pay ÷ market rate × 100 (market positioning)

OTP is framed as a **self-reinforcing flywheel**: performance earns pay → company honors it → market validates it → fair pay sustains performance → repeat.

## Tech Stack
- **React + TypeScript** (Vite)
- **Tailwind CSS v4** (via `@tailwindcss/vite` plugin — no tailwind.config.js)
- **React Router v6** using `HashRouter` (aliased as BrowserRouter)
- **Lucide React** for icons
- **localStorage** for all data persistence (no backend)
- **Deployment**: GitHub Pages at `https://autumn-lgtm.github.io/meld-otp/`

## Build & Deploy
```bash
# Build
cd /home/user/meld-otp
npm run build

# Deploy to gh-pages (from /tmp/gh-pages-deploy which has the remote configured)
cd /tmp/gh-pages-deploy
cp -r /home/user/meld-otp/dist/. .
git add -A
git commit -m "..."
git push origin gh-pages --force
```
- `vite.config.ts` has `base: '/meld-otp/'` and `inlineDynamicImports: true`
- The `/tmp/gh-pages-deploy` directory has the GitHub remote with auth token configured
- GitHub Pages source: `gh-pages` branch, root `/`
- If the gh-pages clone is gone, re-clone: `git clone -b gh-pages https://TOKEN@github.com/autumn-lgtm/meld-otp.git /tmp/gh-pages-deploy`

## Design System
```
Brand colors:
  MELD_BLUE   = '#1175CC'   ← primary blue
  MELD_DARK   = '#022935'   ← dark navy (headers, dark backgrounds)
  MELD_LIGHT  = '#B0E3FF'   ← light blue (text on dark bg)
  MELD_GOLD   = '#FFB41B'   ← brand gold/mustard (used for Ratio metric)

Fonts (loaded via Google Fonts):
  Poppins     ← headings, labels, metric numbers (font-family: 'Poppins, sans-serif')
  Rubik       ← body, badges, UI text

Background: #F1F1F1 (light gray page bg)
```

Health colors: `red=#ef4444`, `yellow=#f59e0b`, `green=#22c55e`, `blue=#1175CC`

## Data Architecture
All data lives in `localStorage` key `meld-otp-storage`. Shape defined in `src/types/index.ts`:
```ts
AppStorage {
  melders: Melder[]        // employees
  reports: MonthlyReport[] // monthly OAP/CAP/Ratio calculations
  roles: Role[]            // role definitions with metric weights
  annualSnapshots: AnnualSnapshot[]  // 2025 review data (imported from CSV)
  version: number
}
```

Storage utils in `src/utils/storage.ts`. Hook: `src/hooks/useStorage.ts`.

## Pages & Routes
| Route | File | Purpose |
|-------|------|---------|
| `/` | `Intro.tsx` | OTP explainer — flywheel diagram, metric definitions, thresholds |
| `/roles` | `Roles.tsx` | Manage role definitions and metric weights |
| `/melders` | `Melders.tsx` | Manage Melder roster, grouped by dept, leaders first |
| `/calculator` | `Calculator.tsx` | Run OAP/CAP/Ratio calculation for one Melder/month |
| `/dashboard` | `Dashboard.tsx` | Team overview cards + 2025 annual snapshots |
| `/history` | `History.tsx` | Per-Melder report history |
| `/analytics` | `Analytics.tsx` | Charts and trend analysis |
| `/review-2025` | `Review2025.tsx` | 2025 annual review snapshot view |
| `/import` | `Import.tsx` | CSV import (Paylocity + Commission formats) |
| `/export` | `Export.tsx` | Export data |
| `/trends` | `Trends.tsx` | Trend charts |

## Seed Data
- `src/data/melders.ts` — 2026 Melder roster (~50 people across CSM, BSE, BDR, Marketing, etc.)
- `src/data/roles.ts` — role definitions with metric weights
- `src/data/seed2025.ts` — 2025 quarterly performance data
- `src/data/seed2025annual.ts` — 2025 annual snapshot data
- `public/melders-2026.csv` — CSV version of 2026 roster

## Key Conventions
- Metric attainment: `actual / target`, capped 0–150%
- OAP threshold for "healthy": ≥100% = green, ≥90% = yellow, <90% = red, ≥110% = blue
- CAP threshold: same as OAP (no blue tier)
- Ratio threshold: ≥95% = green, ≥80% = yellow, <80% = red (no blue tier)
- All monetary values stored as **monthly** figures internally
- `generateId()` in storage.ts for new entity IDs

## Important Notes
- TypeScript strict mode — unused imports/vars will cause build errors
- Tailwind v4 does NOT use `tailwind.config.js` — all config is in CSS or vite plugin
- `HashRouter` is used so GitHub Pages SPA routing works without a server
- The `#FFB41B` gold color is used exclusively for the Ratio metric across the app
