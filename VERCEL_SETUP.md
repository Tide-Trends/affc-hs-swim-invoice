# Deploy to Vercel

Repo: **https://github.com/Tide-Trends/affc-hs-swim-invoice**

## Option A — Import in browser (easiest)

You’re already logged into GitHub. Connect Vercel once:

1. Open **[vercel.com/new](https://vercel.com/new)**
2. Sign in with **GitHub** if prompted → authorize **Tide-Trends**
3. Click **Import** next to **affc-hs-swim-invoice**
4. Settings (should be automatic for this static site):
   - **Framework Preset:** Other
   - **Root Directory:** `./`
   - **Build Command:** *(leave empty)*
   - **Output Directory:** `./`
5. Click **Deploy**

After ~30 seconds you’ll get a URL like:

`https://affc-hs-swim-invoice.vercel.app`

Every push to `main` will redeploy automatically.

## Option B — Vercel CLI (for Cursor / terminal)

```powershell
cd "c:\Users\fitdesk\Desktop\Cursor\affc-hs-swim-invoice"
npx vercel login
npx vercel link   # choose Tide-Trends, affc-hs-swim-invoice
npx vercel --prod
```

To let Cursor deploy without browser login, create a token at  
[vercel.com/account/tokens](https://vercel.com/account/tokens) and set:

```powershell
$env:VERCEL_TOKEN = "your_token_here"
```

## Give Cursor access to Vercel

1. Create token: [vercel.com/account/tokens](https://vercel.com/account/tokens) → name it `cursor` → copy token
2. In Cursor: **Settings → Environment** (or project `.env` — do not commit tokens)
3. Add `VERCEL_TOKEN` with that value  
   Or run in terminal before asking the agent to deploy:  
   `$env:VERCEL_TOKEN = "..."`

## Troubleshooting

- **Blank page:** Site must be served over HTTPS; `data/sessions.json` must load. Check browser DevTools → Network.
- **404 on refresh:** Not needed for this single-page app; all routes are `index.html`.
