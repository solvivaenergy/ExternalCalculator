# Archive

## solar-calc (retired 4 Nov 2026)

The original Solviva external calculator: a React + Vite + TypeScript app that
was built by GitHub Actions and served at solvivaenergy.com/calculator behind
the Cloudflare Worker password gate.

It was replaced by the single-file prototype page in `../site/index.html`.
Nothing in this folder is built or deployed any more.

- Last commit while live: `f797bf9` (9 Jul 2026), tagged `archive/react-calculator`.
- To bring it back temporarily: `git checkout archive/react-calculator`, then
  `cd solar-calc && npm ci && npm run dev`.
- The Worker's `/calculator/api/send-estimate` endpoint and the Odoo webhook
  payload in `cloudflare-worker/src/worker.js` were written for this app. The
  current page does not call them.
