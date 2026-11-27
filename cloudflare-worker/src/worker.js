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
 *   wrangler secret put ODOO_LEAD_WEBHOOK_URL
 *     → the PRODUCTION Odoo webhook (…/web/hook/<uuid>) that creates the lead
 *
 *   wrangler secret put ODOO_LEAD_WEBHOOK_URL_STAGING
 *     → the same webhook on Odoo STAGING
 *
 *   wrangler secret put GOOGLE_PLACES_API_KEY
 *     → the Google Maps key with "Places API (New)" enabled, used by the city
 *       field (/calculator/api/places/*). It is restricted in Google Cloud to
 *       the solvivaenergy.com referrer, which the Worker sends (PLACES_REFERER).
 *
 *   wrangler secret put ESTIMATE_API_URL
 *     → base URL of the Internal Calculator backend (InternalCalcBackEnd on
 *       Render), no trailing slash. /calculator/api/estimate asks it for every
 *       number the page shows, so the page prices exactly as the Internal
 *       Calculator does.
 *
 *   wrangler secret put PUBLIC_ESTIMATE_KEY
 *     → the same value as PUBLIC_ESTIMATE_KEY on that backend (its
 *       POST /api/public/estimate routes refuse any other caller).
 *
 * ── Odoo target ────────────────────────────────────────────────────────────
 *   ODOO_TARGET (plain var in wrangler.toml, "staging" or "production") picks
 *   which of the two webhook secrets /calculator/api/send-estimate posts to.
 *   Flip it to "production" at launch and run `npx wrangler deploy`.
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
const HEALTH_PATH = "/calculator/api/health";
const PLACES_PREFIX = "/calculator/api/places/";
const ESTIMATE_PATH = "/calculator/api/estimate";
const GOOGLE_PLACES = "https://places.googleapis.com/v1/places";
// The Google key only accepts requests from this referrer.
const PLACES_REFERER = "https://solvivaenergy.com/calculator";

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
        const safePath =
          raw.startsWith(CALC_PREFIX) && !/\/\/|@/.test(raw)
            ? raw
            : CALC_PREFIX + "/";
        // Response.redirect requires an absolute URL in the Workers runtime
        const absoluteUrl = `${url.protocol}//${url.host}${safePath}`;
        return Response.redirect(absoluteUrl, 302);
      }
    }

    // ── API: submit calculator lead to Odoo CRM (no auth required) ──────────
    if (request.method === "POST" && url.pathname === SEND_ESTIMATE_PATH) {
      return handleSendEstimate(request, env, ctx);
    }

    // ── Health: which Odoo receives leads right now (creates nothing) ──────
    if (request.method === "GET" && url.pathname === HEALTH_PATH) {
      return new Response(
        JSON.stringify({
          ok: true,
          target: odooTarget(env),
          configured: Boolean(odooWebhookUrl(env)),
          places: Boolean(env.GOOGLE_PLACES_API_KEY),
          estimate: Boolean(env.ESTIMATE_API_URL && env.PUBLIC_ESTIMATE_KEY),
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    // ── API: Google Places for the city field (signed-in visitors only) ────
    if (url.pathname.startsWith(PLACES_PREFIX)) {
      if (!(await isAuthenticated(request, env))) {
        return json({ ok: false, error: "unauthorized" }, 401);
      }
      return handlePlaces(
        request,
        env,
        url.pathname.slice(PLACES_PREFIX.length),
      );
    }

    // ── API: the estimate's numbers, from the Internal Calculator's engine ──
    // (signed-in visitors only)
    if (url.pathname === ESTIMATE_PATH) {
      if (!(await isAuthenticated(request, env))) {
        return json({ ok: false, error: "unauthorized" }, 401);
      }
      return handleEstimate(request, env);
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
// Estimate numbers → the Internal Calculator backend
//   POST /calculator/api/estimate  { common, scenarios: [{ id, … }] }
//     → { ok, engineVersion, generatedAt, catalog, results: [{ id, estimate | error }] }
// The page sends what the visitor answered and the systems it wants priced; the
// backend runs @solviva/calc-engine on the Internal Calculator's live
// parameters and answers customer-facing figures only (no costs). The key
// stays here; the visitor's address goes along so the backend can rate-limit
// per visitor instead of per Worker.
// Secrets: ESTIMATE_API_URL, PUBLIC_ESTIMATE_KEY.
// ─────────────────────────────────────────────────────────────────────────────

async function handleEstimate(request, env) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method not allowed" }, 405);
  }
  const base = String(env.ESTIMATE_API_URL ?? "").replace(/\/+$/, "");
  if (!base || !env.PUBLIC_ESTIMATE_KEY) {
    return json({ ok: false, error: "not configured" }, 503);
  }
  const body = await request.text();
  if (body.length > 20000) {
    return json({ ok: false, error: "request too large" }, 413);
  }
  let res;
  try {
    res = await fetch(`${base}/api/public/estimate/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-estimate-key": env.PUBLIC_ESTIMATE_KEY,
        "x-estimate-client-ip": request.headers.get("CF-Connecting-IP") ?? "",
      },
      body,
    });
  } catch {
    return json({ ok: false, error: "upstream_error" }, 502);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    // 400 = the page sent something the engine refused; 429 = too many requests
    const status = res.status === 400 || res.status === 429 ? res.status : 502;
    return json({ ok: false, error: data?.error ?? `backend_${res.status}` }, status);
  }
  return json({ ok: true, ...data });
}

// ─────────────────────────────────────────────────────────────────────────────
// Send estimate → Odoo CRM webhook
// Secrets: ODOO_LEAD_WEBHOOK_URL (production), ODOO_LEAD_WEBHOOK_URL_STAGING
// Var:     ODOO_TARGET in wrangler.toml selects which one is used.
// ─────────────────────────────────────────────────────────────────────────────

/** "staging" or "production" — anything other than "staging" means production. */
function odooTarget(env) {
  return String(env.ODOO_TARGET ?? "production").toLowerCase() === "staging"
    ? "staging"
    : "production";
}

function odooWebhookUrl(env) {
  return odooTarget(env) === "staging"
    ? env.ODOO_LEAD_WEBHOOK_URL_STAGING
    : env.ODOO_LEAD_WEBHOOK_URL;
}

async function handleSendEstimate(request, env, ctx) {
  const target = odooTarget(env);
  const webhookUrl = odooWebhookUrl(env);
  const webhookHost = webhookUrl ? new URL(webhookUrl).host : "";
  if (!webhookUrl) {
    console.error(
      `[send-estimate] no webhook secret set for ODOO_TARGET=${target}`,
    );
    return new Response(
      JSON.stringify({ ok: false, error: "not configured", target }),
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
  const debugFingerprint = {
    email: body.email ?? "",
    city: body.city ?? "",
    propertyType: body.propertyType ?? "",
    installTimeline: body.installTimeline ?? "",
    homeOwnership: body.homeOwnership ?? "",
    purchaseMode: body.purchaseMode ?? "",
    packageType: body.packageType ?? "",
    waitlistReason: body.waitlistReason ?? "",
    continuedFromArea: !!body.continuedFromArea,
    continuedWithDQReason: body.continuedWithDQReason ?? "",
    webhookHost,
    target,
  };

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
    utm_form_name: body.waitlistReason
      ? body.waitlistReason === "area"
        ? "Waitlist - DQ Area"
        : body.waitlistReason === "bill"
          ? "Waitlist - Low Bill"
          : body.waitlistReason === "condo"
            ? "Waitlist - Condo"
            : body.waitlistReason === "renter" ||
                body.waitlistReason === "renter-low-bill"
              ? "Waitlist - Renter"
              : "Waitlist"
      : body.continuedFromArea
        ? "External Calculator - DQ Area"
        : "External Calculator",
    kwp_system: String(body.kwpLabel ?? ""),
    battery_kwh: String(body.batteryKwh ?? 0),
    coverage_pct: String(body.coveragePct ?? ""),
    purchase_mode: body.purchaseMode ?? "",
    price_rto: String(body.priceRTO ?? ""),
    price_dp: String(body.priceDP ?? ""),
    monthly_payment_rto: String(body.monthlyPaymentRTO ?? 0),
    monthly_savings: String(body.monthlySavings ?? 0),
    day_time_pct: String(body.dayTimePct ?? 0),
    appliances: body.appliances ?? [],
    package_type: body.packageType ?? "",
    dq_reason: body.continuedWithDQReason ?? "",
    // Alternative packages — only populated when user selects Energy Independence
    alt1_kwp: String(body.alt1Kwp ?? ""),
    alt1_savings: String(body.alt1Savings ?? 0),
    alt1_coverage: String(body.alt1Coverage ?? 0),
    alt1_rto: String(body.alt1RTO ?? 0),
    alt1_dp: String(body.alt1DP ?? 0),
    alt2_kwp: String(body.alt2Kwp ?? ""),
    alt2_battery: String(body.alt2Battery ?? 0),
    alt2_savings: String(body.alt2Savings ?? 0),
    alt2_coverage: String(body.alt2Coverage ?? 0),
    alt2_rto: String(body.alt2RTO ?? 0),
    alt2_dp: String(body.alt2DP ?? 0),
  });

  // Await the Odoo webhook so failures are surfaced to the client.
  let odooRes;
  try {
    odooRes = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SolvivaCalculator/1.0",
      },
      body: payload,
    });
  } catch (err) {
    console.error(`[send-estimate] Odoo webhook fetch failed: ${err}`);
    return new Response(
      JSON.stringify({ ok: false, error: "upstream_error", target }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!odooRes.ok) {
    const odooBody = await odooRes.text().catch(() => "");
    console.error(
      `[send-estimate] Odoo (${target}) webhook returned ${odooRes.status}: ${odooBody.slice(0, 500)}`,
    );
    console.error(
      `[send-estimate] request fingerprint: ${JSON.stringify(debugFingerprint)}`,
    );
    return new Response(
      JSON.stringify({ ok: false, error: `odoo_${odooRes.status}`, target }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  // `target` tells the page which Odoo received the lead (shown during UAT).
  return new Response(JSON.stringify({ ok: true, target }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Places (New) for the city field
// Secret: GOOGLE_PLACES_API_KEY. The key stays here; the page never sees it.
//
//   POST /calculator/api/places/autocomplete  { input, session }
//     → { ok, suggestions: [{ placeId, text, main, secondary }] }
//   POST /calculator/api/places/details       { placeId, session }
//     → { ok, city, province, region }   (from the place's address components)
//
// `session` is the Places session token: the page sends the same one for every
// keystroke and for the details call that ends the search, so Google bills the
// whole search as one session.
// ─────────────────────────────────────────────────────────────────────────────

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

async function handlePlaces(request, env, action) {
  if (request.method !== "POST") {
    return json({ ok: false, error: "method not allowed" }, 405);
  }
  const key = env.GOOGLE_PLACES_API_KEY;
  if (!key) return json({ ok: false, error: "not configured" }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid JSON" }, 400);
  }
  const session = /^[A-Za-z0-9_-]{8,64}$/.test(body.session ?? "")
    ? body.session
    : undefined;
  const headers = { "X-Goog-Api-Key": key, Referer: PLACES_REFERER };

  let res;
  try {
    if (action === "autocomplete") {
      const input = String(body.input ?? "").trim().slice(0, 120);
      if (input.length < 2) return json({ ok: true, suggestions: [] });
      res = await fetch(`${GOOGLE_PLACES}:autocomplete`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          sessionToken: session,
          languageCode: "en",
          regionCode: "ph",
          includedRegionCodes: ["ph"],
          includedPrimaryTypes: ["geocode"],
          // Prefer the service area (Greater Manila, CALABARZON, Central Luzon)
          locationBias: {
            rectangle: {
              low: { latitude: 13.3, longitude: 120.3 },
              high: { latitude: 15.2, longitude: 122.5 },
            },
          },
        }),
      });
    } else if (action === "details") {
      const placeId = String(body.placeId ?? "");
      if (!/^[A-Za-z0-9_-]{10,300}$/.test(placeId)) {
        return json({ ok: false, error: "invalid placeId" }, 400);
      }
      const qs = new URLSearchParams({ languageCode: "en", regionCode: "ph" });
      if (session) qs.set("sessionToken", session);
      res = await fetch(`${GOOGLE_PLACES}/${placeId}?${qs}`, {
        headers: { ...headers, "X-Goog-FieldMask": "addressComponents" },
      });
    } else {
      return json({ ok: false, error: "not found" }, 404);
    }
  } catch (err) {
    console.error(`[places] ${action} fetch failed: ${err}`);
    return json({ ok: false, error: "upstream_error" }, 502);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(
      `[places] ${action} returned ${res.status}: ${data.error?.message ?? ""}`,
    );
    return json({ ok: false, error: `google_${res.status}` }, 502);
  }

  if (action === "autocomplete") {
    const suggestions = (data.suggestions ?? [])
      .filter((s) => s.placePrediction)
      .map(({ placePrediction: p }) => ({
        placeId: p.placeId,
        text: p.text?.text ?? "",
        main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
        secondary: p.structuredFormat?.secondaryText?.text ?? "",
      }));
    return json({ ok: true, suggestions });
  }

  // Details: city = locality; province = admin level 2 (Metro Manila has none,
  // it is the level-1 region); region = admin level 1.
  const part = (type) =>
    (data.addressComponents ?? []).find((c) => c.types?.includes(type))
      ?.longText ?? "";
  return json({
    ok: true,
    city: part("locality") || part("administrative_area_level_3"),
    province: part("administrative_area_level_2"),
    region: part("administrative_area_level_1"),
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
