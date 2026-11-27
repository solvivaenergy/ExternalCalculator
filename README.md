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

The page follows the Figma file "External Calc", page "v3": two questions
(bill, home), the estimate (savings gauge, coverage slider, fine-tune, three
packages), the contact form and the confirmation. Desktop shows both questions
side by side; under 900px they are two steps with a fixed button. Everyone gets
an estimate whatever the city or home type; the lead still tells Odoo when it is
a renter, a condo or outside the service area.

### Where the numbers come from

Every figure on the estimate comes from the Internal Calculator's engine. The
page holds no prices. It posts to the Worker at `/calculator/api/estimate`
(signed-in visitors only), the Worker forwards to `InternalCalcBackEnd`'s
`POST /api/public/estimate/batch` with a shared key, and the backend runs
`@solviva/calc-engine` on the Internal Calculator's live parameters. A change of
margin, cost, promo code, battery package or device saved there shows on the
website within about 30 seconds, for any bill a visitor types.

What the page asks for:

1. the engine's sizing at each savings target, 10% to 100% (the slider);
2. three packages on the panels of the 50% sizing: Solar only, Solar + battery
   (the engine's recommendation) and Bigger battery (one more battery unit),
   each priced for pay in full with the `CASH` promo code and for rent-to-own
   with the `RTO` code at the chosen term and down payment;
3. the selected package as the visitor adjusts it.

Payback, 25-year savings, IRR and LCOE are the engine's, with its own tariff
inflation (5% a year today). Rules that live in the page, not the engine: no
system under 5 kWp of panels (`MIN_KWP`), up to 4 units of a 5 kWh battery or 5
of a 16 kWh one (`maxUnits`), and how many hours a day each appliance is taken
to run (`APPS[].h`), because the page asks when an appliance runs, not for how
long.

The appliances offered map to devices in the engine's device library (`APPS` in
the page) and are sent to the engine by those names. One the library no longer
has is not offered.

If the Worker or the backend cannot be reached the estimate screen says so and
offers "Try again"; it never falls back to stored numbers.

Worker secrets for this, set with `npx wrangler secret put` from
`cloudflare-worker/`: `ESTIMATE_API_URL` (the backend's base URL) and
`PUBLIC_ESTIMATE_KEY` (the same value as on the backend). The health check
below shows `"estimate":true` once both are set.

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
page itself does not say which Odoo received a lead; use the health check below.

The Worker sends the city in the form Odoo's lead qualification recognises
(`odooCity` in the Worker): "Metro Manila ~ Makati" for Metro Manila, the
province alone for the other provinces we install in ("Cavite", "Quezon
Province"), and the page's "City, Province" unchanged for a place outside the
service area. Odoo's "Installation City" is the customer's city and is checked
against a fixed list the moment the lead is created; any other form is tagged
"Area DQ" and parked. If that list changes in Odoo (auto-qualify action,
`allowed_cities`), change `odooCity` with it.

The lead's `packageType` is the package name as shown on the page: "Solar only",
"Solar + battery" or "Bigger battery" (it was "starter" / "recommended"). The
"API - Create lead - V5" action does not read `package_type` yet, so nothing in
Odoo changes until it does. Each appliance row carries `device`, its name in the
Internal Calculator's device library, beside the name shown to the visitor.

**Check what is live** without creating a lead:
`https://www.solvivaenergy.com/calculator/api/health` returns
`{"ok":true,"target":"staging"|"production","configured":true,"places":true,"estimate":true}`.

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
