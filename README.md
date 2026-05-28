# AFFC HS Swim Invoice

Concise billing site for **2025–2026** high school swim lane rentals at American Fork Fitness Center.

## What’s included

- **333 verified sessions** (`data/sessions.json`)
- **Short course** and **long course**, each split by:
  - **Monday · Tuesday · Thursday · Friday** (together)
  - **Wednesday** (separate)
  - **Weekend** (Saturday / Sunday)
- **Holiday & special rentals** (break slots, Saturdays, January PM, etc.)
- **Noteworthy** notes (flags, excluded cells)
- **One-click invoice** → copy email text + subject

## Live site (Vercel)

**Production:** **https://affc-hs-swim-invoice.vercel.app**

Repo: [github.com/Tide-Trends/affc-hs-swim-invoice](https://github.com/Tide-Trends/affc-hs-swim-invoice)

### Deploy on Vercel (recommended)

1. Go to [vercel.com/new](https://vercel.com/new) → **Import** `Tide-Trends/affc-hs-swim-invoice`
2. Framework preset: **Other** (static site, no build command)
3. Root directory: `.` → **Deploy**

Or from this folder (after `npx vercel login`):

```bash
npx vercel --prod
```

## GitHub Pages (optional)

**Settings → Pages →** GitHub Actions workflow included. URL: `https://tide-trends.github.io/affc-hs-swim-invoice/`

## Local preview

```bash
python -m http.server 8080
```

Open http://localhost:8080 (required for `fetch` of JSON).

## Refresh data from Excel

```bash
py scripts/build-data.py
```

Requires the schedule file path in `scripts/build-data.py` (default: Downloads folder).

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell |
| `app.css` | Styles |
| `app.js` | Logic, rates, invoice |
| `data/sessions.json` | All sessions (committed) |
| `scripts/build-data.py` | Rebuild JSON from Excel |

Rates are stored in **localStorage** only (your browser).

## Billing rules (built into data)

| | |
|--|--|
| **Short course** | Mon, Wed, Fri sessions |
| **Long course** | Tue, Thu, Sat, Sun |
| **Holiday section** | Holiday / special columns only (not double-counted in SC/LC grid) |
| **Wednesday** | Own row under SC/LC (calendar Wednesday, including Wed block columns) |

Confirm SC/LC rules with AFFC before sending invoices.
