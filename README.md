# ExternalCalculator

What is served at **solvivaenergy.com/calculator**.

## Layout

| Path | Purpose |
| --- | --- |
| `site/` | The static page that is live. `site/index.html` is the whole calculator (self-contained, images inlined). |
| `cloudflare-worker/` | Cloudflare Worker on the `solvivaenergy.com/calculator*` route. Shows the password screen, then proxies to the GitHub Pages origin. |
| `.github/workflows/deploy.yml` | Publishes `site/` to GitHub Pages on every push to `main` that touches `site/`. |
| `archive/solar-calc/` | The retired React calculator. Not built or deployed. See `archive/README.md`. |

## Updating the page

1. Replace `site/index.html` with the new page (keep it self-contained, or add
   its assets next to it in `site/` and reference them with relative paths).
2. Commit and push to `main`. GitHub Actions deploys within about a minute.
3. The Worker does not need redeploying for page changes.

## Leads to Odoo

"Send me my estimate" posts the lead to the Worker at
`/calculator/api/send-estimate`. The Worker maps it onto the Odoo webhook that
runs the "API - Create lead - V5" server action (partner + CRM lead, round-robin
salesperson, calculator fields and estimate description). Which Odoo receives it
is set by `ODOO_TARGET` in `cloudflare-worker/wrangler.toml`:

| `ODOO_TARGET` | Secret used | Odoo |
| --- | --- | --- |
| `staging` (current) | `ODOO_LEAD_WEBHOOK_URL_STAGING` | solviva-erp-staging.odoo.com (alias for the current Odoo.sh staging build) |
| `production` | `ODOO_LEAD_WEBHOOK_URL` | solvivaenergy-sh.odoo.com |

The staging hook URL is `<staging alias>/web/hook/<webhook_uuid>` of the
"API - Create lead - V5" automation rule on staging. A rebuild of staging keeps
the rule's UUID, so the secret normally survives a rotation; if leads start
returning `odoo_404`, re-read the UUID from the rule and set the secret again.

**At launch:** set `ODOO_TARGET = "production"` in `wrangler.toml`, then run
`npx wrangler deploy` from `cloudflare-worker/`. The page needs no change. The
confirmation screen's routing line names the Odoo that received the lead, so
testers can see which one they hit.

**Check what is live** without creating a lead:
`https://www.solvivaenergy.com/calculator/api/health` returns
`{"ok":true,"target":"staging"|"production","configured":true,"places":true}`.

## City field (Google Places)

The "City or municipality" field shows Google Places suggestions (addresses,
villages, cities). Picking one fetches the place's address components and the
page maps its city and province onto the coverage lists in `site/index.html`
(`CITIES`, `OUT_CITY`, `OUT_PROV`), so Odoo still receives "City, Province".

The page never holds the Google key. It calls the Worker at
`/calculator/api/places/autocomplete` and `/calculator/api/places/details`
(signed-in visitors only), and the Worker calls Places API (New) with the
`GOOGLE_PLACES_API_KEY` secret. That key is restricted in Google Cloud to the
solvivaenergy.com referrer, which the Worker sends. If the Worker or Google
cannot be reached, the field falls back to the built-in city list.
`/calculator/api/health` shows `"places":true` once the secret is set.

## Password gate

The gate lives entirely in `cloudflare-worker/src/worker.js`. Its secrets
(`PASSWORD_HASH`, `HMAC_SECRET`, `ORIGIN_URL`) are set with
`npx wrangler secret put` and are not in this repo. Deploy Worker changes with
`npx wrangler deploy` from `cloudflare-worker/`.
