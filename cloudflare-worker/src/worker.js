/**
 * Solviva Calculator — Cloudflare Worker Auth Gate
 *
 * Intercepts all traffic to solvivaenergy.com/calculator* and enforces
 * password authentication before proxying to the GitHub Pages origin.
 *
 * ── Required Worker Secrets (set once via Wrangler CLI) ────────────────────
 *
 *   wrangler secret put PASSWORD_HASH
 *     → paste the SHA-256 hex of your chosen password (lowercase, 64 chars)
 *     → generate it: echo -n "yourpassword" | sha256sum
 *
 *   wrangler secret put HMAC_SECRET
 *     → paste any long random string (32+ chars) used to sign session tokens
 *     → generate it: openssl rand -hex 32
 *
 *   wrangler secret put ORIGIN_URL
 *     → your GitHub Pages base URL, e.g. https://yourusername.github.io/repo-name
 *
 * ── Session ────────────────────────────────────────────────────────────────
 *   Sessions last 8 hours. Cookie is HttpOnly + Secure + SameSite=Strict.
 *   Token is HMAC-SHA256 signed — cannot be forged without HMAC_SECRET.
 */

const COOKIE_NAME = "sv_calc_auth";
const SESSION_HOURS = 8;
const LOGIN_PATH = "/calculator/_login";
const CALC_PREFIX = "/calculator";
const SEND_ESTIMATE_PATH = "/calculator/api/send-estimate";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── Login form submission ──────────────────────────────────────────────
    if (request.method === "POST" && url.pathname === LOGIN_PATH) {
      return handleLogin(request, env, url);
    }

    // ── Redirect authenticated users away from the login page ──────────────
    // Without this, an authenticated user hitting GET /_login gets proxied to
    // GitHub Pages which has no such file → 404.
    if (url.pathname === LOGIN_PATH) {
      if (await isAuthenticated(request, env)) {
        const raw = url.searchParams.get("next") ?? "";
        const safe =
          raw.startsWith(CALC_PREFIX) && !/\/\/|@/.test(raw)
            ? raw
            : CALC_PREFIX + "/";
        return Response.redirect(safe, 302);
      }
    }

    // ── API: submit calculator lead to Odoo CRM (no auth required) ──────────
    if (request.method === "POST" && url.pathname === SEND_ESTIMATE_PATH) {
      return handleSendEstimate(request, env, ctx);
    }

    // ── Auth check ────────────────────────────────────────────────────────
    if (!(await isAuthenticated(request, env))) {
      return renderLoginPage(false, url);
    }

    // ── Authenticated — proxy to GitHub Pages origin ──────────────────────
    return proxy(request, env);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Send estimate → Odoo CRM webhook
// Required secret: ODOO_LEAD_WEBHOOK_URL
//   wrangler secret put ODOO_LEAD_WEBHOOK_URL
//   → https://solvivaenergy-sh.odoo.com/web/hook/a6d7b50b-ab00-44b9-a9b0-28ccada012b4
// ─────────────────────────────────────────────────────────────────────────────

async function handleSendEstimate(request, env, ctx) {
  const webhookUrl = env.ODOO_LEAD_WEBHOOK_URL;
  if (!webhookUrl) {
    return new Response(
      JSON.stringify({ ok: false, error: "not configured" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Required fields check
  const { email, firstName, phone } = body;
  if (!email || !firstName || !phone) {
    return new Response(
      JSON.stringify({ ok: false, error: "missing required fields" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Build the payload matching the existing Meta-to-CRM field schema
  const payload = JSON.stringify({
    first_name: body.firstName ?? "",
    last_name: body.lastName ?? "",
    phone: body.phone ?? "",
    email: body.email ?? "",
    monthly_bill: String(body.monthlyBill ?? ""),
    city: body.city ?? "",
    type_of_home: body.propertyType ?? "",
    solar_timeline: body.installTimeline ?? "",
    own_home: body.homeOwnership ?? "",
    lead_next_step: "Consultation",
    utm_source: "Calculator",
    utm_medium: "organic",
    utm_channel: "website",
    utm_form_name: body.waitlistReason ? "Waitlist" : "External Calculator",
    kwp_system: String(body.kwpLabel ?? ""),
    battery_kwh: String(body.batteryKwh ?? 0),
    coverage_pct: String(body.coveragePct ?? ""),
    purchase_mode: body.purchaseMode ?? "",
    price_rto: String(body.priceRTO ?? ""),
    price_dp: String(body.priceDP ?? ""),
  });

  // Fire the webhook in the background so the button responds immediately.
  // ctx.waitUntil keeps the Worker alive until the Odoo call finishes.
  ctx.waitUntil(
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    }).catch(() => {}),
  );

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Login handler
// ─────────────────────────────────────────────────────────────────────────────

async function handleLogin(request, env, url) {
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const password = (formData.get("password") ?? "").toString();
  const inputHash = await sha256hex(password);

  // Constant-time comparison — prevents timing-based password enumeration
  if (!timingSafeEqual(inputHash, (env.PASSWORD_HASH ?? "").toLowerCase())) {
    return renderLoginPage(true, url);
  }

  const expires = Date.now() + SESSION_HOURS * 3_600_000;
  const token = await signToken(String(expires), env.HMAC_SECRET);
  const cookie = [
    `${COOKIE_NAME}=${token}`,
    `Path=${CALC_PREFIX}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${SESSION_HOURS * 3600}`,
  ].join("; ");

  // Validate the `next` redirect — only allow paths within /calculator
  const raw = url.searchParams.get("next") ?? "";
  const safe =
    raw.startsWith(CALC_PREFIX) && !/\/\/|@/.test(raw) ? raw : CALC_PREFIX;

  return new Response(null, {
    status: 302,
    headers: { Location: safe, "Set-Cookie": cookie },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth check
// ─────────────────────────────────────────────────────────────────────────────

async function isAuthenticated(request, env) {
  const token = getCookie(request, COOKIE_NAME);
  if (!token) return false;
  return verifyToken(token, env.HMAC_SECRET);
}

// ─────────────────────────────────────────────────────────────────────────────
// Proxy to GitHub Pages origin
// ─────────────────────────────────────────────────────────────────────────────

async function proxy(request, env) {
  const url = new URL(request.url);
  // Strip /calculator prefix when forwarding — GitHub Pages serves from its root
  const path = url.pathname.replace(/^\/calculator\/?/, "/") + url.search;
  const target = (env.ORIGIN_URL ?? "").replace(/\/$/, "") + path;

  const headers = new Headers(request.headers);
  // Never forward the auth cookie to the upstream origin
  headers.delete("cookie");

  const init = { method: request.method, headers };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  return fetch(target, init);
}

// ─────────────────────────────────────────────────────────────────────────────
// Token helpers — HMAC-SHA256 via Web Crypto (available in Workers runtime)
// Token format:  encodeURIComponent(`${expiresMs}.${hmacHex}`)
// ─────────────────────────────────────────────────────────────────────────────

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signToken(payload, secret) {
  const key = await importHmacKey(secret);
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  const sigHex = uint8ToHex(new Uint8Array(sigBuf));
  return encodeURIComponent(`${payload}.${sigHex}`);
}

async function verifyToken(rawToken, secret) {
  let token;
  try {
    token = decodeURIComponent(rawToken);
  } catch {
    return false;
  }

  const dot = token.lastIndexOf(".");
  if (dot === -1) return false;

  const payload = token.slice(0, dot);
  const sigHex = token.slice(dot + 1);

  // Reject expired sessions
  const expires = Number(payload);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;

  // Verify HMAC signature
  const key = await importHmacKey(secret);
  const expectedBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  const expectedHex = uint8ToHex(new Uint8Array(expectedBuf));

  return timingSafeEqual(sigHex, expectedHex);
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────────────────────────────────────

async function sha256hex(text) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return uint8ToHex(new Uint8Array(buf));
}

function uint8ToHex(arr) {
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison — prevents timing attacks */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function getCookie(request, name) {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return part.slice(eq + 1).trim();
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Login page — Solviva brand colors (#d2ff1e / #1f522b)
// ─────────────────────────────────────────────────────────────────────────────

function renderLoginPage(wrongPassword, url) {
  const next = encodeURIComponent(url.pathname + url.search);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Solviva Calculator — Access Required</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #1f522b;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .card {
      background: #ffffff;
      border-radius: 16px;
      padding: 2.5rem 2rem;
      width: 100%;
      max-width: 380px;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
    }
    .logo { text-align: center; margin-bottom: 1.75rem; }
    .logo img { height: 40px; width: auto; }
    h1 {
      font-size: 1.125rem;
      font-weight: 600;
      color: #1f522b;
      text-align: center;
      margin-bottom: 1.5rem;
    }
    label {
      display: block;
      font-size: 0.8125rem;
      font-weight: 500;
      color: #374151;
      margin-bottom: 0.375rem;
    }
    input[type="password"] {
      width: 100%;
      padding: 0.625rem 0.875rem;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.15s;
    }
    input[type="password"]:focus { border-color: #1f522b; }
    .error {
      margin-top: 0.5rem;
      font-size: 0.8125rem;
      color: #dc2626;
    }
    button {
      margin-top: 1.25rem;
      width: 100%;
      padding: 0.75rem;
      background: #d2ff1e;
      color: #1f522b;
      font-weight: 700;
      font-size: 1rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    button:hover { opacity: 0.85; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <img src="/logo.webp" alt="Solviva" onerror="this.style.display='none'" />
    </div>
    <h1>Enter Access Password</h1>
    <form method="POST" action="${LOGIN_PATH}?next=${next}">
      <label for="pw">Password</label>
      <input id="pw" type="password" name="password" autofocus autocomplete="current-password" required />
      ${wrongPassword ? '<p class="error">Incorrect password. Please try again.</p>' : ""}
      <button type="submit">Continue</button>
    </form>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: wrongPassword ? 401 : 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
