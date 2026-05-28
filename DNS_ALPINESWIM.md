# Custom domain: alpineswim.lukaah.com

## Status

| Step | Status |
|------|--------|
| Domain added to Vercel project `affc-hs-swim-invoice` | Done |
| DNS A record created in **Vercel DNS** for `lukaah.com` | Done (`alpineswim` → `76.76.21.21`) |
| SSL certificate | Pending until DNS propagates |
| Live URL | https://alpineswim.lukaah.com (after DNS) |

## What you need to do (pick one)

### Option A — Add record at WordPress (current nameservers)

Your domain currently uses **WordPress nameservers** (`ns1.wordpress.com`, etc.).

In **WordPress.com → Domains → lukaah.com → DNS** (or your registrar), add:

| Type | Name / Host | Value |
|------|-------------|--------|
| **A** | `alpineswim` | `76.76.21.21` |

Save and wait 5–60 minutes for propagation.

### Option B — Use Vercel nameservers (if `lukaah.com` is fully on Vercel)

At your registrar, set nameservers to:

- `ns1.vercel-dns.com`
- `ns2.vercel-dns.com`

The `alpineswim` A record is already in your Vercel DNS zone for `lukaah.com`.

> Only do this if the main site `lukaah.com` is meant to run on Vercel (your `lukaah-portfolio` project). Changing nameservers away from WordPress can break WordPress-hosted DNS unless everything is migrated.

## Verify

```bash
npx vercel domains inspect alpineswim.lukaah.com
```

When configured correctly, Vercel will issue SSL and the site will load at:

**https://alpineswim.lukaah.com**

Fallback (always works): https://affc-hs-swim-invoice.vercel.app

## Vercel dashboard

Project → **affc-hs-swim-invoice** → **Settings** → **Domains** → `alpineswim.lukaah.com`
