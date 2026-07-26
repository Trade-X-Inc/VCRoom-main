import { existsSync, readFileSync, writeFileSync, unlinkSync, rmSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

// 0. Remove cached wrangler deploy config that conflicts with wrangler.toml.
// Runs at postbuild start, before CF's wrangler deploy phase reads it.
const deployConfig = join(process.cwd(), ".wrangler", "deploy", "config.json");
if (existsSync(deployConfig)) {
  rmSync(deployConfig, { force: true });
  console.log("✓ .wrangler/deploy/config.json removed (prevents config conflict)");
}

// 1. Remove dist/client/wrangler.json so CF uses wrangler.toml instead.
// The @cloudflare/vite-plugin generates this file with absolute local Mac paths
// which CF rejects as invalid. With it absent CF falls back to wrangler.toml.
const pagesWranglerPath = "dist/client/wrangler.json";
if (existsSync(pagesWranglerPath)) {
  unlinkSync(pagesWranglerPath);
  console.log("✓ dist/client/wrangler.json removed (CF will use wrangler.toml)");
}

// 1b. Remove stale .wrangler/deploy/config.json which references the now-deleted
// dist/client/wrangler.json. If this file exists from a previous local deploy,
// wrangler aborts on CF's build servers because the redirected path doesn't exist.
const deployConfigPath = ".wrangler/deploy/config.json";
if (existsSync(deployConfigPath)) {
  unlinkSync(deployConfigPath);
  console.log("✓ .wrangler/deploy/config.json removed (stale redirect reference)");
}

// 2. Bundle dist/server/server.js → dist/client/_worker.js
// Pages Advanced Mode: _worker.js handles SSR, Pages CDN serves static assets.
if (!existsSync("dist/server/server.js")) {
  console.error("✘ dist/server/server.js not found — did the build run?");
  process.exit(1);
}

console.log("Bundling server.js → _worker.js ...");
// External libraries that are client-side only and must not be bundled into the
// CF Worker. They are only called from browser event handlers (file upload/parse)
// and are loaded via dynamic import on the client. Including them in the server
// bundle pushes the compressed worker past CF's 1MB script limit.
// Step 1: bundle unminified (so the regex patch below can find the export marker)
execSync(
  [
    "node_modules/.bin/esbuild",
    "dist/server/server.js",
    "--bundle",
    "--format=esm",
    "--platform=browser",
    "--external:node:*",
    "--external:ws",
    "--external:pdfjs-dist",
    "--external:xlsx",
    "--external:papaparse",
    "--external:jszip",
    "--external:@daily-co/daily-js",
    "--external:react-markdown",
    "--external:recharts",
    "--define:process.env.NODE_ENV='\"production\"'",
    "--define:global.process.env.NODE_ENV='\"production\"'",
    "--conditions=worker,browser",
    "--outfile=dist/client/_worker.js",
    "--log-level=warning",
  ].join(" "),
  { stdio: "inherit" }
);

// 3. Prepend MessageChannel polyfill
// react-dom/server.browser uses MessageChannel which may not be available
// in all Cloudflare Pages environments. This polyfill is a no-op when the
// runtime already provides it.
const polyfill = `\
if(typeof MessageChannel==="undefined"){
  class _MC{constructor(){this.port1={onmessage:null,postMessage:(d)=>{this.port2.onmessage&&this.port2.onmessage({data:d})}};this.port2={onmessage:null,postMessage:(d)=>{this.port1.onmessage&&this.port1.onmessage({data:d})}}}}
  globalThis.MessageChannel=_MC;
}
`;

// 4. Patch _worker.js to expose Cloudflare Pages secrets via process.env
// CF Pages passes secrets as the `env` parameter of fetch(request, env, ctx).
// TanStack Start's createServerEntry swallows this — it only uses `request`.
// We wrap the default export so secrets are injected before any handler runs.
const cfEnvPatch = `\
(function patchCFEnv() {
  const __orig = self.__cfWorkerExports || {};
  const __origFetch = typeof __orig.fetch === 'function' ? __orig.fetch.bind(__orig) : null;
  if (!__origFetch) return;
  __orig.fetch = async function(request, env, ctx) {
    if (env && typeof env === 'object') {
      try {
        globalThis.__cf_env = env;
        for (const [k, v] of Object.entries(env)) {
          if (typeof v === 'string' && typeof process !== 'undefined' && process.env && !process.env[k]) {
            process.env[k] = v;
          }
        }
      } catch(e) {}
    }
    return __origFetch(request, env, ctx);
  };
})();
`;

// 4b. Security headers for the SSR path.
// public/_headers ONLY applies to static-asset responses (paths excluded from
// _routes.json's SSR include list) — every dynamic route (/, /pricing,
// /tools/*, /app/*, ...) is served by this worker directly, and CF Pages does
// NOT run _headers rules against a worker-generated Response. Verified live:
// favicon.svg carried the _headers rules, "/" carried none of them. So the
// only way to apply security headers to the actual HTML document is to set
// them on the Response inside the worker itself, mirroring the SAME policy
// documented in public/_headers so the two never drift apart.
//
// CSP ships Report-Only in this branch (R7C) — collect violation data before
// ever enforcing. Do not flip this to an enforcing header without a
// dedicated follow-up that reviews real report-uri traffic first.
//
// COEP is deliberately NOT set: `require-corp` blocks cross-origin iframes
// and subresources that don't send a matching Cross-Origin-Resource-Policy
// header, and Daily.co's embedded call iframe (used in /app/deal-rooms/*/meetings
// and /app/roast/*) is exactly that kind of embed. Breaking a working video
// feature to satisfy a header scanner is not an acceptable trade — skipped,
// reported instead. COOP and CORP are safe (Google OAuth here is a full-page
// redirect via redirectTo, never a window.open popup, so COOP: same-origin
// doesn't sever anything) and are included below.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  // Tailwind/inline style props are used throughout (design system is all
  // inline `style={{}}`) — 'unsafe-inline' on style-src is required, not
  // optional, given the current styling approach.
  "style-src 'self' 'unsafe-inline'",
  // React hydration + Vite's dev/prod bundle currently rely on inline
  // bootstrap scripts; Turnstile and Daily's SDK are loaded as external
  // scripts from their own origins.
  "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://*.daily.co",
  "img-src 'self' data: blob: https://ldimninnjlvxozubheib.supabase.co https://*.daily.co",
  "font-src 'self' data:",
  "connect-src 'self' https://ldimninnjlvxozubheib.supabase.co wss://ldimninnjlvxozubheib.supabase.co https://*.daily.co wss://*.daily.co https://challenges.cloudflare.com",
  "frame-src 'self' https://challenges.cloudflare.com https://*.daily.co",
  "media-src 'self' blob: https://*.daily.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "report-uri /api/csp-report",
].join("; ");

// NOTE: this list must stay in sync with the header block in
// public/_headers. This applies to SSR-routed responses (everything
// _routes.json includes); _headers only applies to paths excluded from the
// worker (static assets) — see CLAUDE.md §44. Editing one list without the
// other silently diverges what's actually live between static and
// SSR-routed responses.
const SECURITY_HEADERS = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // camera/microphone scoped to self — Daily.co interviews run in an
  // iframe on our own /app/* routes, so self is sufficient; every other
  // sensitive permission is denied outright.
  "Permissions-Policy": "camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), interest-cohort=()",
  // No preload: irreversible once submitted to hstspreload.org and
  // permanently constrains every future subdomain. includeSubDomains gives
  // the real security benefit without that lock-in.
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Content-Security-Policy-Report-Only": CSP_REPORT_ONLY,
};

// 4c. public/_redirects, applied inside the worker.
// Found live in production during R7C step 0: EVERY existing _redirects rule
// (e.g. /signup -> /sign-up, /accelerators -> /resources, all the old
// /app/* consolidation redirects from a prior session) 404s instead of
// 301ing. Root cause is the same class of bug as the _headers issue above —
// _routes.json's include: ["/*"] routes every request through this worker
// BEFORE CF Pages' native _redirects file ever gets a chance to run, and
// there is no fallback to the static-redirects layer once the worker has
// produced its own (404) response. This is a real, previously-undiscovered
// bug affecting redirects that predate this branch, not just the new
// /waitlist one added in this pass — fixed here by parsing _redirects at
// build time and checking it first, before any other request handling.
const redirectsPath = "public/_redirects";
let REDIRECT_RULES = [];
if (existsSync(redirectsPath)) {
  REDIRECT_RULES = readFileSync(redirectsPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const parts = line.split(/\s+/);
      if (parts.length < 2) return null;
      const [from, to, statusStr] = parts;
      const status = statusStr ? parseInt(statusStr, 10) : 301;
      return { from, to, status: Number.isFinite(status) ? status : 301 };
    })
    .filter(Boolean);
  console.log(`✓ Parsed ${REDIRECT_RULES.length} rule(s) from public/_redirects for in-worker redirect handling`);
}

const redirectInjectionSnippet = `
const __REDIRECT_RULES = ${JSON.stringify(REDIRECT_RULES)};
function __checkRedirect(request) {
  const url = new URL(request.url);
  const rule = __REDIRECT_RULES.find((r) => r.from === url.pathname);
  if (!rule) return null;
  const dest = rule.to.startsWith("http") ? rule.to : url.origin + rule.to;
  return Response.redirect(dest, rule.status);
}
`;

const headerInjectionSnippet = `
const __SECURITY_HEADERS = ${JSON.stringify(SECURITY_HEADERS)};
function __applySecurityHeaders(request, response) {
  try {
    const url = new URL(request.url);
    // /app/* keeps its own noindex header (still set below) but does not need
    // the full document CSP — API/data routes return JSON, not HTML, and a
    // document-oriented CSP on a JSON response is meaningless. Apply the base
    // hardening headers everywhere; reserve CSP + frame-ancestors for actual
    // document responses.
    const contentType = response.headers.get("content-type") || "";
    const isDocument = contentType.includes("text/html");
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(__SECURITY_HEADERS)) {
      if (!isDocument && (k === "Content-Security-Policy-Report-Only" || k === "X-Frame-Options" || k === "Frame-Options")) continue;
      headers.set(k, v);
    }
    if (url.pathname.startsWith("/app/")) {
      headers.set("X-Robots-Tag", "noindex, nofollow");
    }
    // Cache-Control: hashed static assets (never true here — those are
    // served by CF Pages CDN directly per _routes.json's exclude list, not
    // by this worker) vs. HTML documents, which must never be cached shared
    // since responses are per-session (auth state, personalized nav).
    if (isDocument && !headers.has("cache-control")) {
      headers.set("Cache-Control", "private, no-cache, must-revalidate");
    }
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch (e) {
    return response;
  }
}
`;

const cspReportInjectionSnippet = `
// CSP report handling (R7C follow-up). Persists to D1 (CSP_REPORTS_DB),
// never Supabase — this endpoint is public and unauthenticated. Handles
// both report formats browsers actually send:
//   - application/csp-report (the older report-uri format; a single
//     top-level "csp-report" object)
//   - application/reports+json (the newer Reporting API / Report-To
//     format; a JSON ARRAY of {type, url, body} envelopes, one or more of
//     which may have type "csp-violation")
const __CSP_MAX_BODY_BYTES = 8192;
const __CSP_FIELD_MAX = 1024;
const __CSP_RATE_LIMIT_PER_MIN = 30;
const __CSP_RETENTION_DAYS = 30;
const __CSP_D1_TIMEOUT_MS = 5000;
let __cspLastPrune = 0;
// NOT A REAL RATE LIMIT — read this before assuming this endpoint is
// protected against abuse. This is a per-isolate, in-memory Map keyed by
// CF-Connecting-IP. Cloudflare runs many concurrent isolates across many
// edge locations with no shared state between them, and any isolate can be
// evicted/recycled at any time — a client hitting a different PoP, or
// hitting a fresh isolate after recycling, resets this counter to zero.
// There is no cross-isolate or cross-edge enforcement. This only blunts a
// single sustained client hammering the same warm isolate; it is not a
// distributed rate limit and must not be relied on as one. A real limit
// would need Cloudflare's Rate Limiting binding or a Durable Object — not
// implemented here (see CLAUDE.md §45 for the decision not to build one
// given current traffic volume). Deliberately NOT persisted to D1 either —
// the csp_reports schema has no ip column, and storing raw IPs indefinitely
// would itself be a data-minimization concern on a public endpoint.
const __cspIpHits = new Map();

function __cspTruncate(v) {
  if (v == null) return null;
  const s = String(v);
  return s.length > __CSP_FIELD_MAX ? s.slice(0, __CSP_FIELD_MAX) : s;
}

function __cspRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - 60 * 1000;
  let hits = __cspIpHits.get(ip);
  if (!hits) { hits = []; __cspIpHits.set(ip, hits); }
  while (hits.length && hits[0] < windowStart) hits.shift();
  if (hits.length >= __CSP_RATE_LIMIT_PER_MIN) return true;
  hits.push(now);
  // Bound the map itself so a flood of distinct IPs can't grow it forever
  // within one isolate's lifetime.
  if (__cspIpHits.size > 5000) __cspIpHits.clear();
  return false;
}

// Strips identifiers out of a document-uri before it's ever considered for
// storage: keeps origin + path structure (useful for spotting which ROUTE a
// violation is coming from) but replaces UUID and pure-numeric path
// segments with a placeholder. This endpoint is public and unauthenticated
// — a deal room id (e.g. /app/deal-rooms/957f9750-00c7-402a-b1ba-d9c7a4e3ba2f)
// or any other UUID/numeric-keyed resource id must never land in a table
// anyone can write to without auth, regardless of how well the rest of the
// pipeline is locked down.
// NOTE for future edits to this function: this whole snippet is assembled
// as a JS template literal in patch-wrangler.mjs (cspReportInjectionSnippet
// = \`...\`) and later written verbatim into dist/client/_worker.js. A
// literal backslash here (e.g. in a regex like /\\d+/ or /\\//) is a
// template-literal escape sequence AT BUILD TIME, not a regex escape at
// RUNTIME — "\\d" and "\\/" were silently stripped to "d" and "/" the first
// time this was written with normal regex syntax, producing a regex with
// completely different (broken) semantics with no build error. Avoid
// constructs needing a literal backslash in this snippet; the numeric-
// segment matcher below is written using RegExp(String.fromCharCode(92)+...)
// specifically to sidestep this rather than risk it recurring silently.
const __CSP_SLASH_DIGIT_RE = new RegExp(
  String.fromCharCode(92) + "/" + String.fromCharCode(92) + "d+(?=" + String.fromCharCode(92) + "/|$)",
  "g"
);
function __cspStripDocumentUri(uri) {
  if (!uri) return null;
  try {
    const u = new URL(uri);
    let pathname = u.pathname.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id");
    pathname = pathname.replace(__CSP_SLASH_DIGIT_RE, "/:id");
    return u.origin + pathname;
  } catch (e) {
    // Not a parseable absolute URL — still redact any UUID/id-shaped
    // segments from the raw string rather than storing it verbatim.
    return String(uri)
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
      .replace(__CSP_SLASH_DIGIT_RE, "/:id");
  }
}

function __cspExtractRows(bodyText, contentType) {
  // Returns an array of normalized row objects. Never throws — a parse
  // failure yields an empty array, which results in nothing being stored
  // (no partial/garbage rows); the caller always responds 204 regardless,
  // so parse failure is never visible to whatever sent the report.
  const rows = [];
  try {
    const parsed = JSON.parse(bodyText);
    if (contentType.includes("application/reports+json") || Array.isArray(parsed)) {
      const envelopes = Array.isArray(parsed) ? parsed : [parsed];
      for (const envelope of envelopes) {
        if (!envelope || typeof envelope !== "object") continue;
        if (envelope.type && envelope.type !== "csp-violation") continue;
        const b = envelope.body || {};
        rows.push({
          document_uri: __cspTruncate(__cspStripDocumentUri(b.documentURL || b["document-uri"] || envelope.url)),
          violated_directive: __cspTruncate(b.effectiveDirective || b["violated-directive"]),
          blocked_uri: __cspTruncate(b.blockedURL || b["blocked-uri"]),
          source_file: __cspTruncate(b.sourceFile || b["source-file"]),
          line_number: Number.isFinite(b.lineNumber) ? b.lineNumber : (Number.isFinite(b["line-number"]) ? b["line-number"] : null),
          disposition: __cspTruncate(b.disposition),
        });
      }
    } else {
      // application/csp-report shape: { "csp-report": { ... } }
      const b = (parsed && parsed["csp-report"]) || parsed || {};
      rows.push({
        document_uri: __cspTruncate(__cspStripDocumentUri(b["document-uri"])),
        violated_directive: __cspTruncate(b["violated-directive"]),
        blocked_uri: __cspTruncate(b["blocked-uri"]),
        source_file: __cspTruncate(b["source-file"]),
        line_number: Number.isFinite(b["line-number"]) ? b["line-number"] : null,
        disposition: __cspTruncate(b.disposition),
      });
    }
  } catch (e) {
    return [];
  }
  return rows;
}

// Races any promise against a hard timeout so a hung D1 call can never
// block the caller indefinitely. Used both here and wherever this endpoint
// touches D1 — a throw is already caught by each call site's own try/catch,
// but a genuine network hang has no other bound without this.
function __withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout after " + ms + "ms")), ms)),
  ]);
}

// Validates and parses the incoming request synchronously (fast, no D1
// involved) and returns either null (reject silently — oversized body or
// rate-limited) or the extracted rows + metadata needed to write them.
// Split out from the actual D1 write so the write can be handed to
// ctx.waitUntil() and the 204 response returned immediately — a slow or
// hung D1 call must never delay, let alone block, the response to whatever
// sent the report.
async function __prepareCspReport(request) {
  const contentType = request.headers.get("content-type") || "";
  console.warn("[CSP Report] received, content-type=" + contentType);

  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  if (__cspRateLimited(ip)) {
    console.warn("[CSP Report] rate-limited ip=" + ip);
    return null;
  }

  // Reject bodies over 8KB. Check Content-Length first (cheap), then the
  // real decoded length as a fallback for chunked requests with no
  // Content-Length header.
  const declaredLen = Number(request.headers.get("content-length") || 0);
  if (declaredLen && declaredLen > __CSP_MAX_BODY_BYTES) {
    console.warn("[CSP Report] rejected: declared length " + declaredLen + " exceeds " + __CSP_MAX_BODY_BYTES);
    return null;
  }
  let bodyText;
  try { bodyText = await request.text(); } catch (e) { return null; }
  if (bodyText.length > __CSP_MAX_BODY_BYTES) {
    console.warn("[CSP Report] rejected: actual length " + bodyText.length + " exceeds " + __CSP_MAX_BODY_BYTES);
    return null;
  }

  const ua = __cspTruncate(request.headers.get("user-agent"));
  const rows = __cspExtractRows(bodyText, contentType);
  if (!rows.length) return null;
  return { rows, ua };
}

// The actual D1 write. Runs inside ctx.waitUntil() — never awaited by the
// response path. Every D1 call is both try/caught (covers a throw) AND
// raced against a timeout (covers a genuine hang) — either failure mode
// is swallowed here and logged, never surfaced anywhere the client (or the
// response path) could observe it.
async function __writeCspReport(env, rows, ua) {
  const db = env && env.CSP_REPORTS_DB;
  if (!db) { console.error("[CSP Report] no CSP_REPORTS_DB binding — dropping"); return; }

  // NOT A REAL TTL — there is no cron trigger and no scheduled handler
  // anywhere in this project (checked: zero [triggers]/scheduled config in
  // wrangler.toml). This DELETE only runs as a side effect of a report
  // actually being written, gated by __cspLastPrune — which is per-isolate
  // module state, so it resets to 0 on every fresh isolate. In practice
  // that means a burst of cold starts prunes far more often than the
  // "~10 min" the gate implies, while a quiet period with no report
  // traffic at all prunes never, no matter how old the rows get. If
  // reports stop arriving, nothing enforces the 30-day retention until
  // they resume. See CLAUDE.md §45 for the decision to accept this given
  // current traffic volume rather than build a real scheduled prune.
  const __now = Date.now();
  if (__now - __cspLastPrune > 10 * 60 * 1000) {
    __cspLastPrune = __now;
    try {
      await __withTimeout(
        db.prepare("DELETE FROM csp_reports WHERE received_at < datetime('now', '-" + __CSP_RETENTION_DAYS + " days')").run(),
        __CSP_D1_TIMEOUT_MS
      );
    } catch (e) { console.error("[CSP Report] prune failed:", e); }
  }

  for (const row of rows) {
    try {
      await __withTimeout(
        db
          .prepare("INSERT INTO csp_reports (document_uri, violated_directive, blocked_uri, source_file, line_number, user_agent, disposition) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .bind(row.document_uri, row.violated_directive, row.blocked_uri, row.source_file, row.line_number, ua, row.disposition)
          .run(),
        __CSP_D1_TIMEOUT_MS
      );
    } catch (e) {
      console.error("[CSP Report] insert failed:", e);
    }
  }
}
`;

let workerCode = readFileSync("dist/client/_worker.js", "utf8");

// Wrap default export to inject CF env on every request.
// The init_serverN() call number changes each build, so we use a regex.
const initCallMatch = workerCode.match(/init_server\d*\(\);\nexport \{/);
if (initCallMatch) {
  const initCall = initCallMatch[0].replace('\nexport {', '');   // e.g. "init_server4();"
  const injection = `\
${initCall}
${redirectInjectionSnippet}
${headerInjectionSnippet}
${cspReportInjectionSnippet}
// Inject CF env into globalThis.__cf_env and process.env before any handler runs
const __origServer = server;
const __patchedServer = {
  async fetch(request, env, ctx) {
    const __redirect = __checkRedirect(request);
    if (__redirect) return __redirect;
    if (env && typeof env === 'object') {
      try {
        globalThis.__cf_env = { ...env };
        for (const [k, v] of Object.entries(env)) {
          if (typeof v === 'string' && typeof process !== 'undefined' && process.env && !process.env[k]) {
            process.env[k] = v;
          }
        }
    const safeKeys = Object.keys(env).filter(k => !k.includes('KEY') && !k.includes('SECRET') && !k.includes('TOKEN'));
        const secretKeys = Object.keys(env).filter(k => k.includes('KEY') || k.includes('SECRET') || k.includes('TOKEN'));
        console.log('[Worker] CF env keys available:', safeKeys);
        console.log('[Worker] Secret keys present:', secretKeys.map(k => k + '=' + (env[k] ? '\\u2713' : '\\u2717')));
      } catch(e) { console.error('[Worker] env injection error:', e); }
    }
    // CSP violation reports (report-uri) intercepted here, before TanStack
    // Start's router ever sees the request. This app has no working raw-HTTP
    // route mechanism to hang a receiver off of — createAPIFileRoute /
    // createAPIHandler both import from module paths that don't exist in the
    // installed @tanstack/react-start version (verified: api.health.ts and
    // api.invites.ts, both built on createAPIFileRoute, 404 in production
    // today, a real pre-existing bug unrelated to this branch). Handling it
    // here, ahead of the router, sidesteps that gap entirely rather than
    // building a fourth broken variant of the same pattern.
    //
    // Persisted to its own D1 database (CSP_REPORTS_DB), never Supabase —
    // this is a public, unauthenticated write endpoint and must not have a
    // path to the product database. Always returns 204 immediately — on
    // success, on rejection (oversized body, rate-limited), on parse
    // failure, on a missing/unbound D1, and even if D1 hangs — the actual
    // write is handed to ctx.waitUntil() and never awaited on the response
    // path, so this endpoint can never 500 and can never block on D1.
    try {
      const __u = new URL(request.url);
      if (__u.pathname === '/api/csp-report' && request.method === 'POST') {
        try {
          const __prepared = await __prepareCspReport(request);
          if (__prepared && ctx && typeof ctx.waitUntil === 'function') {
            ctx.waitUntil(__writeCspReport(env, __prepared.rows, __prepared.ua));
          }
        } catch (e) { console.error('[CSP Report] prepare failed:', e); }
        return new Response(null, { status: 204 });
      }
    } catch(e) {}
    // TanStack Start's own router hard-codes a 500 (Response.json, wrong
    // status for the situation — should never be a 5xx for "I don't support
    // this content-type") whenever a request's Accept header doesn't contain
    // "*/*" or "text/html" (createStartHandler.js: executeRouter). AI
    // crawlers/agents sometimes send "Accept: text/markdown" for content
    // negotiation; this is not a bug in this app's own route code, it is
    // framework-level, and cannot be patched in node_modules. Rewrite the
    // request's Accept header to text/html before it reaches the router for
    // any page navigation (never for /api/* — those routes have their own
    // real content-type contracts and must not be silently coerced) so a
    // crawler asking for markdown still gets real HTML (200) instead of a
    // 500 with a JSON error body.
    let __req = request;
    try {
      const __u2 = new URL(request.url);
      const __accept = request.headers.get('Accept') || '';
      const __ok = __accept.includes('*/*') || __accept.includes('text/html');
      if (!__ok && !__u2.pathname.startsWith('/api/')) {
        const __h = new Headers(request.headers);
        __h.set('Accept', 'text/html');
        __req = new Request(request, { headers: __h });
      }
    } catch(e) {}
    const __response = await __origServer.fetch(__req, env, ctx);
    return __applySecurityHeaders(request, __response);
  }
};
// IMPORTANT: Only export default — CF Workers runtime rejects named exports that
// are not ExportedHandler functions (e.g. TSS_SERVER_FUNCTION is a string/object,
// not a function, which causes "Incorrect type for map entry" startup crash).
export default __patchedServer;
// REMOVE_NAMED_EXPORTS_MARKER`;
  // Replace the entire export { ... } block with just the default export above.
  // The block ends at the first }; after "export {" — use a targeted replacement.
  workerCode = workerCode.replace(initCallMatch[0], injection);
  // Remove the old named export block that esbuild generated (everything from
  // "// REMOVE_NAMED_EXPORTS_MARKER" up to and including the closing "};" of export{}).
  // The named exports block looks like: \n  TSS_SERVER_FUNCTION as T,\n  ...\n  __patchedServer as default,\n  ...\n};
  workerCode = workerCode.replace(
    /\/\/ REMOVE_NAMED_EXPORTS_MARKER\n[\s\S]*?^};/m,
    '// named exports removed — CF Workers only needs default'
  );
  console.log("✓ dist/client/_worker.js patched (CF env injection)");
} else {
  console.warn("⚠ Could not find export marker in _worker.js — CF env patch skipped");
}

writeFileSync("dist/client/_worker.js", polyfill + workerCode);
console.log("✓ dist/client/_worker.js ready (with MessageChannel polyfill)");

// Step 2: minify the patched worker in-place to get under CF Pages' 1MB gzip limit
console.log("Minifying _worker.js ...");
execSync(
  [
    "node_modules/.bin/esbuild",
    "dist/client/_worker.js",
    "--minify",
    "--format=esm",
    "--platform=browser",
    "--legal-comments=none",
    "--charset=utf8",
    "--outfile=dist/client/_worker.js",
    "--allow-overwrite",
    "--log-level=warning",
  ].join(" "),
  { stdio: "inherit" }
);
const minifiedSize = (readFileSync("dist/client/_worker.js").length / 1024 / 1024).toFixed(2);
console.log(`✓ _worker.js minified (${minifiedSize} MB uncompressed)`);

// Report gzip size
try {
  const gzSize = execSync("gzip -c dist/client/_worker.js | wc -c").toString().trim();
  const gzMB = (parseInt(gzSize) / 1024 / 1024).toFixed(2);
  console.log(`✓ _worker.js gzip size: ${gzMB} MB (CF Pages limit: 1 MB)`);
  if (parseFloat(gzMB) > 1.0) {
    console.error(`✘ WARNING: worker is ${gzMB} MB gzipped — exceeds CF Pages 1 MB limit`);
  }
} catch (_) {}

// Rewrite export to CF Pages compatible format
const wp = "dist/client/_worker.js";
let wc = readFileSync(wp, "utf8");
wc = wc.replace(
  /export\s*\{([^}]+)as default\s*\};?\s*$/,
  (match, name) => {
    const varName = name.trim();
    return `var __D=${varName};export default{fetch:(r,e,c)=>{if(__D&&typeof __D.fetch==="function")return __D.fetch(r,e,c);if(typeof __D==="function")return __D(r,e,c);return new Response("no handler",{status:500});}}; `;
  }
);
writeFileSync(wp, wc);
console.log("✓ _worker.js export rewritten to CF Pages fetch handler");
