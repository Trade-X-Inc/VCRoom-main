// check-action-split.mjs — BUILD GATE for the gateway action layer.
//
// WHY THIS EXISTS (CLAUDE.md §20.11)
//
// TanStack Start's server-fn transform is a compile-time AST rewrite that only
// finds statically-analysable TOP-LEVEL `createServerFn(...).handler(...)`
// calls. When `defineAction(def)` RETURNED `createServerFn(...)`, the transform
// never found it: no RPC stub was emitted, no server registration happened, and
// the handler — requireUser, the service-role client, the pack_api RPC, the
// record append — was bundled into the CLIENT and executed in the browser.
// There, getEnvVar("SUPABASE_SERVICE_ROLE_KEY") is correctly empty, so every
// gateway call failed with `db_unavailable` having made no network request at
// all. Fails closed on list routes (degraded to []) and fail-closed on detail
// routes. Undetected for eleven days.
//
// The source was correct. The ARTIFACT was wrong. That is this codebase's
// characteristic failure mode (§7.3 template-literal backslash bug; §19e
// OpenAI key in the bundle), and it is why a source-level lint rule alone is
// not sufficient: lint catches a developer writing the wrong shape, this
// catches a wrong bundle for ANY reason, including causes nobody anticipated.
//
// Two assertions, both directions, build fails on either:
//   1. FORWARD  — every action server fn in src/lib/actions/** is bound to a
//                 direct runAction(<def>, data) call (no bypassing the pipeline).
//   2. REVERSE  — ZERO handler bodies from src/lib/actions/** appear anywhere in
//                 dist/client. This is the direct regression test for the bug.
//
// Run from scripts/patch-wrangler.mjs (postbuild), after dist/ exists.

import { readFileSync, readdirSync, existsSync, statSync } from "fs";
import { join } from "path";

const ACTIONS_DIR = "src/lib/actions";
const CLIENT_DIR = "dist/client";
const SERVER_DIR = "dist/server";

let failures = [];

// STALE-ARTIFACT GUARD. This check is only meaningful against output produced
// by the CURRENT source. Run standalone against an old dist/ it will report the
// previous build's state — which during development reads as a terrifying false
// alarm, and worse, could read as a false PASS after a fix is reverted. If any
// action source is newer than the client bundle, refuse to answer.
if (existsSync(CLIENT_DIR)) {
  const newestSource = Math.max(
    ...readdirSync(ACTIONS_DIR)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => statSync(join(ACTIONS_DIR, f)).mtimeMs),
  );
  const assetsDir = join(CLIENT_DIR, "assets");
  const bundleTimes = existsSync(assetsDir)
    ? readdirSync(assetsDir)
        .filter((f) => f.endsWith(".js"))
        .map((f) => statSync(join(assetsDir, f)).mtimeMs)
    : [];
  const newestBundle = bundleTimes.length ? Math.max(...bundleTimes) : 0;
  if (newestSource > newestBundle) {
    console.error(
      "\n✗ check-action-split: dist/client is STALE (action source is newer than the bundle).\n" +
        "  This check must run against output built from the current source — run `npm run build`.\n" +
        "  Refusing to report on a stale artifact.\n",
    );
    process.exit(1);
  }
}

// ── 1. FORWARD: source shape ────────────────────────────────────────────────
// Every exported createServerFn in the actions dir must hand off to runAction.
const actionFiles = readdirSync(ACTIONS_DIR).filter((f) => f.endsWith(".ts") && f !== "gateway.ts" && f !== "call.ts");

const declaredActions = []; // { file, name, rpcName }
for (const f of actionFiles) {
  const src = readFileSync(join(ACTIONS_DIR, f), "utf8");

  // exported server functions
  const exported = [...src.matchAll(/export const (\w+)\s*=\s*createServerFn\(/g)].map((m) => m[1]);
  for (const name of exported) {
    // the binding must be `.handler(({ data }) ... => runAction(<X>Def, data))`
    const bindingRe = new RegExp(
      `export const ${name}\\s*=\\s*createServerFn\\([^)]*\\)[\\s\\S]{0,400}?runAction\\(\\s*(\\w+)\\s*,\\s*data\\s*\\)`,
    );
    const m = src.match(bindingRe);
    if (!m) {
      failures.push(
        `FORWARD: ${f} → export "${name}" is a createServerFn that does not hand off to runAction(<def>, data). ` +
        `Every gateway action must route through the pipeline (authorize + record append are enforced there).`,
      );
    } else {
      declaredActions.push({ file: f, name, defName: m[1] });
    }
  }

  // a createServerFn returned from a function is the exact bug this guards
  if (/return\s+createServerFn\(/.test(src)) {
    failures.push(
      `FORWARD: ${f} → contains \`return createServerFn(\`. A factory-returned server function is invisible to ` +
      `TanStack Start's transform and will be bundled into the CLIENT. Declare createServerFn at module top level ` +
      `and have the factory build the ActionDef object instead. See CLAUDE.md §20.11.`,
    );
  }
}

if (declaredActions.length === 0) {
  failures.push(`FORWARD: no gateway actions found in ${ACTIONS_DIR} — the check is not actually testing anything.`);
}

// ── 2. REVERSE: artifact contents ───────────────────────────────────────────
// Collect distinctive strings that exist ONLY inside action handler bodies.
// The pack_api RPC names are ideal: they appear in `handle:` and nowhere in
// legitimate client code.
// Only REAL pack_api function names count. Two exclusions, both deliberate:
//   • "pack_api" itself is the schema name, not an RPC.
//   • "<fn>_failed" strings are error-message fallbacks, not RPC names; they
//     legitimately appear nowhere but are not what we are testing for.
// A name qualifies only if it is actually passed to .rpc(...) somewhere.
const rpcNames = new Set();
for (const f of actionFiles) {
  const src = readFileSync(join(ACTIONS_DIR, f), "utf8");
  // direct: .schema("pack_api").rpc("name", …)
  for (const m of src.matchAll(/\.rpc\(\s*"([a-z0-9_]+)"/g)) rpcNames.add(m[1]);
  // indirect: the def builders take the rpc name as an argument —
  //   roomGetDef("deal_room.getX", "room_get_x")
  //   listActionDef("documents.listRoom", "doc_list_room")
  for (const m of src.matchAll(/\w*Def\(\s*"[^"]+"\s*,\s*"([a-z0-9_]+)"\s*\)/g)) rpcNames.add(m[1]);
}
// append_record is the record-chain write — must never be client-side either
rpcNames.add("append_record");
for (const bad of ["pack_api"]) rpcNames.delete(bad);
for (const n of [...rpcNames]) if (n.endsWith("_failed")) rpcNames.delete(n);

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (/\.(js|mjs)$/.test(entry)) out.push(p);
  }
  return out;
}

const clientFiles = walk(CLIENT_DIR).filter((p) => !p.endsWith("_worker.js")); // _worker.js IS the server
const leaked = new Map(); // rpcName -> [files]

for (const p of clientFiles) {
  const js = readFileSync(p, "utf8");
  for (const rpc of rpcNames) {
    // the RPC name as a quoted string literal = the handler body shipped
    if (js.includes(`"${rpc}"`) || js.includes(`'${rpc}'`)) {
      if (!leaked.has(rpc)) leaked.set(rpc, []);
      leaked.get(rpc).push(p);
    }
  }
}

for (const [rpc, files] of leaked) {
  failures.push(
    `REVERSE: pack_api RPC "${rpc}" appears in the CLIENT bundle (${files.join(", ")}). ` +
    `A gateway handler body has been bundled client-side — the server-fn transform did not split it. ` +
    `This is the §20.11 bug. The handler will execute in the browser without the service-role key.`,
  );
}

// Sanity: the reverse check must not pass vacuously. If NO action handler is
// present server-side at all, the "0 in client" result means nothing — the
// whole action layer would have been dropped.
//
// Note this is a whole-layer assertion, not per-RPC: an individual action with
// no caller anywhere is legitimately tree-shaken out of BOTH bundles, which is
// correct behaviour, not a split failure. (Verified: packGet,
// documentRequestAccess and documentGrantRelease currently have zero call
// sites — see CLAUDE.md §20.2's dead-code notes.) Flagging those would train
// people to ignore this check, which is worse than not having it.
const serverBlob =
  walk(SERVER_DIR)
    .map((p) => readFileSync(p, "utf8"))
    .join("\n") +
  (existsSync(join(CLIENT_DIR, "_worker.js"))
    ? readFileSync(join(CLIENT_DIR, "_worker.js"), "utf8")
    : "");
const presentServerSide = [...rpcNames].filter(
  (rpc) => serverBlob.includes(`"${rpc}"`) || serverBlob.includes(`'${rpc}'`),
);
if (presentServerSide.length === 0) {
  failures.push(
    `SANITY: NOT ONE pack_api RPC appears in the server bundle. The reverse check is passing vacuously — ` +
      `the action layer is missing from the server build entirely.`,
  );
}

// ── report ──────────────────────────────────────────────────────────────────
if (failures.length) {
  console.error("\n✗ check-action-split FAILED — the gateway action layer is mis-split.\n");
  for (const f of failures) console.error("  • " + f + "\n");
  console.error("Build aborted. See CLAUDE.md §20.11.\n");
  process.exit(1);
}

console.log(
  `✓ action split verified — ${declaredActions.length} actions bound to runAction; ` +
  `${rpcNames.size} pack_api RPCs confirmed server-only (0 in dist/client)`,
);
