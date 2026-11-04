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

## Password gate

The gate lives entirely in `cloudflare-worker/src/worker.js`. Its secrets
(`PASSWORD_HASH`, `HMAC_SECRET`, `ORIGIN_URL`) are set with
`npx wrangler secret put` and are not in this repo. Deploy Worker changes with
`npx wrangler deploy` from `cloudflare-worker/`.
