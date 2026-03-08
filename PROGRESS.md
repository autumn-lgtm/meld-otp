# OTP Progress Tracker

## Current Status: Active Development
**Last updated:** 2026-03-08

---

## Completed Features

### Core System
- [x] Full OTP calculation engine (OAP, CAP%, Ratio) with health color thresholds
- [x] localStorage persistence with `AppStorage` schema
- [x] Seed data: 2026 Melder roster, role definitions, 2025 historical data
- [x] CSV import (Paylocity format, Commission format)
- [x] PDF export

### Pages
- [x] **Intro** — flywheel diagram (SVG, OAP→CAP→Ratio cycle), definition cards with formulas, health threshold tables, performance bands
- [x] **Roles** — view/edit role definitions, add/delete custom roles, inline metric weight editing, editable role titles
- [x] **Melders** — roster grouped by department, leaders surfaced first with badge, inline "Add Role" in dropdown, Edit/Delete modal
- [x] **Calculator** — single Melder/month calculation with OAP breakdown, CAP, Ratio
- [x] **Dashboard** — team overview + 2025 annual snapshot cards (salary toggle: monthly/annual)
- [x] **Analytics** — charts, summary stats, roster tab; pre-populated with 2025 baseline
- [x] **Review 2025** — annual review snapshot view
- [x] **History** — per-Melder report history
- [x] **Import** — Paylocity + Commission CSV importers
- [x] **Export** — data export

### Design
- [x] Brand system: MELD_BLUE (#1175CC), MELD_DARK (#022935), MELD_GOLD (#FFB41B) for Ratio
- [x] Poppins (headings) + Rubik (body) typography
- [x] Health color system: red/yellow/green/blue
- [x] Dark gradient hero on Intro page
- [x] Leader cards: dark ombre blue gradient header in Melders

---

## Known Issues / Open Questions

### Deployment (GitHub Pages)
- The site at `https://autumn-lgtm.github.io/meld-otp/` has been successfully built and pushed
- GitHub Pages API confirms: `status: built`, `source: gh-pages branch /`
- User reports site "not showing" — suspected causes: browser cache, CDN propagation delay
- **Action**: User should try hard refresh (Cmd+Shift+R), wait 2-3 min after a new deploy, or try incognito
- Deploy process works: build → copy dist to `/tmp/gh-pages-deploy` → force push gh-pages

### Data
- Benjamin Capelle transfer data was fixed in a recent commit
- Jace Holzer visible in screenshot without a role assigned (normal — role is optional)

---

## Pending / Next Up

### High Priority
- [ ] Resolve GitHub Pages loading issue for user (confirm it's cache vs real problem)
- [ ] Verify flywheel intro looks correct in production

### Backlog / Ideas
- [ ] Quarterly cadence support in Calculator (some roles use quarterly, not monthly)
- [ ] Alert/flag logic polish (flight risk, comp structure broken, sweet spot indicators)
- [ ] Trends page deeper implementation
- [ ] Mobile responsive pass on Melders and Dashboard

---

## Recent Commits (newest first)
- `fada8f1` Intro: brand gold Ratio (#FFB41B), definition cards with formula + full name
- `4549321` Flywheel intro: OAP→CAP→Ratio cycle diagram; market-fair pay sustains performance
- `1c18df0` Clean deploy: leaders first, dept grouping, editable roles, Benjamin Capelle fix
- `8c10f67` Melders: group by dept with leaders first; inline add-role in dropdown
- `ea5d718` Fix Benjamin Capelle transfer data; editable role titles; add new role; show all depts in Roles page
- `a04729a` Leader cards: dark ombre blue gradient header
