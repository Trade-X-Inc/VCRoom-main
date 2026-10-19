#!/usr/bin/env node
// Live-spec guard. Fails if a test could touch production by default.
//
// Rules:
//   1. Every git-tracked tests/*.spec.ts is listed in tests/spec-classes.json under exactly one class
//      (pure, local or live), and every listed file exists.
//   2. A pure spec uses no network or database API (after comments and string literals are removed): no page,
//      request, fetch, goto, browser launch, supabase client, service-role key, env file or password sign-in,
//      and it imports only from ../src.
//   3. A local spec names no host except localhost / 127.0.0.1 and no production domain. A loopback spec (starts its
//      own mock server on 127.0.0.1, runs by default) names no production domain and uses no browser, no
//      fetch, no process.env and no database client, and imports only from ../src and ./support.
//   4. playwright.config.ts reads the manifest and, unless CWL_FIXTURES_READY === "1", restricts testMatch to
//      the pure and local specs (fail closed; unknown and untracked specs never run by default).
//   5. Every tracked tests/*.mjs live script starts with a CWL_FIXTURES_READY guard.
//   6. A spec outside the live class never imports the admin or service-role fixture helpers.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const fail = (m) => failures.push(m);

const manifest = JSON.parse(
  readFileSync(join(root, "tests/spec-classes.json"), "utf8"),
);
const tracked = execFileSync("git", ["ls-files", "tests"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);
const specs = tracked.filter((f) => f.endsWith(".spec.ts"));
const scripts = tracked.filter((f) => f.endsWith(".mjs"));

// ---- rule 1
const where = new Map();
for (const cls of ["pure", "local", "loopback", "live"])
  for (const f of manifest[cls] ?? []) {
    if (where.has(f)) fail(`${f} is listed in more than one class`);
    where.set(f, cls);
    if (!existsSync(join(root, f)))
      fail(`${f} is in the manifest but does not exist`);
  }
for (const f of specs)
  if (!where.has(f)) fail(`${f} is not classified in tests/spec-classes.json`);
for (const f of where.keys())
  if (!f.endsWith(".spec.ts"))
    fail(`${f}: manifest entries must be *.spec.ts files`);

// strip comments and string/template/regex-free approximation: remove comments and quoted strings
function code(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(
      /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`/g,
      '""',
    );
}
const NETWORK = [
  [/\bpage\s*\./, "page."],
  [/\brequest\s*\./, "request."],
  [/\bfetch\s*\(/, "fetch("],
  [/\.goto\s*\(/, ".goto("],
  [/\bchromium\b|\bfirefox\b|\bwebkit\b/, "browser launch"],
  [/\bbrowser\s*\./, "browser."],
  [/createClient\s*\(/, "createClient("],
  [/SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE/, "service-role key"],
  [/\.env\.(test|local)/, "env file"],
  [/signInWithPassword/, "signInWithPassword"],
  [/process\.env/, "process.env"],
];

// ---- rules 2, 3, 6
const ADMIN_HELPER =
  /(?:from|import)\s*\(?\s*["'][^"']*(admin|service-?role|fixtures?)[^"']*["']/i;
for (const [f, cls] of where) {
  if (!existsSync(join(root, f))) continue;
  const raw = readFileSync(join(root, f), "utf8");
  const src = code(raw);
  if (cls !== "live" && ADMIN_HELPER.test(raw))
    fail(`${f} (${cls}) imports an admin, service-role or fixture helper`);
  if (cls === "pure") {
    for (const [re, label] of NETWORK)
      if (re.test(src)) fail(`${f} (pure) uses ${label}`);
    for (const m of raw.matchAll(/from\s+["']([^"']+)["']/g))
      if (m[1].startsWith(".") && !m[1].startsWith("../src/"))
        fail(`${f} (pure) imports ${m[1]}; pure specs import only from ../src`);
  }
  if (cls === "loopback") {
    // Host names in the text are test data (the spec has no way to contact them: no fetch, no process.env, no client).
    if (/lengdon\.com|hockystick\.app|supabase\.co/.test(raw)) fail(`${f} (loopback) names a production domain`);
    if (/SERVICE_ROLE|createClient\s*\(/.test(src)) fail(`${f} (loopback) uses the service role or a database client`);
    for (const re of [/\bpage\s*\./, /\bbrowser\s*\./, /\bfetch\s*\(/, /process\.env/, /\.env\.(test|local)/, /signInWithPassword/])
      if (re.test(src)) fail(`${f} (loopback) uses ${re.source}`);
    for (const m of raw.matchAll(/from\s+["']([^"']+)["']/g))
      if (m[1].startsWith(".") && !m[1].startsWith("../src/") && !m[1].startsWith("./support/"))
        fail(`${f} (loopback) imports ${m[1]}; loopback specs import only from ../src and ./support`);
  }
  if (cls === "local") {
    for (const m of raw.matchAll(/https?:\/\/([^/"'`\s)]+)/g))
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(m[1]))
        fail(`${f} (local) names a non-local host: ${m[1]}`);
    if (/lengdon\.com|hockystick\.app|supabase\.co/.test(raw))
      fail(`${f} (local) names a production domain`);
    if (/SERVICE_ROLE|createClient\s*\(/.test(src))
      fail(`${f} (local) uses the service role or a database client`);
  }
}

// ---- rule 4
const cfg = readFileSync(join(root, "playwright.config.ts"), "utf8");
if (!/spec-classes\.json/.test(cfg))
  fail("playwright.config.ts does not read tests/spec-classes.json");
if (!/CWL_FIXTURES_READY\s*===\s*"1"/.test(cfg))
  fail('playwright.config.ts does not gate on CWL_FIXTURES_READY === "1"');
if (!/testMatch\s*:\s*safeSpecs/.test(cfg))
  fail(
    "playwright.config.ts does not restrict testMatch to the safe specs by default",
  );
if (/classes\.live/.test(cfg.replace(/\/\/.*$/gm, "")))
  fail(
    "playwright.config.ts references the live class (it must never be matched by default)",
  );

// ---- rule 5
for (const f of scripts) {
  if (!(manifest.liveScripts ?? []).includes(f))
    fail(`${f} is a tracked script but not listed under liveScripts`);
  const head = readFileSync(join(root, f), "utf8")
    .split("\n")
    .slice(0, 12)
    .join("\n");
  if (!/CWL_FIXTURES_READY/.test(head))
    fail(`${f} has no CWL_FIXTURES_READY guard in its first lines`);
}
for (const f of manifest.liveScripts ?? [])
  if (!scripts.includes(f))
    fail(`${f} is under liveScripts but is not a tracked tests/*.mjs file`);

if (failures.length) {
  console.error("✗ live-spec guard failed:");
  for (const m of failures) console.error("  - " + m);
  process.exit(1);
}
console.log(
  `✓ live-spec guard passed — ${specs.length} specs classified (${manifest.pure.length} pure, ${manifest.local.length} local, ${(manifest.loopback ?? []).length} loopback, ${manifest.live.length} live), ${scripts.length} live scripts guarded.`,
);
