// check-serverfn-authz.mjs — CI guard: every createServerFn handler in
// src/lib that uses the service-role/admin Supabase client must call a
// recognised auth helper somewhere in its own body. Added 11 Oct 2026
// after an audit (CLAUDE.md) found five such handlers trusting a
// client-supplied id with no identity cross-check — one of them
// (deal-room-workflow-fn.ts's getDealRoomWorkflow) had NO identity
// derivation at all. Uses the real TypeScript compiler API (not regex)
// to parse each file and walk every exported `createServerFn(...)`
// call's `.handler(...)` argument — the same "real parser, not text
// matching" discipline check-grants.mjs already established for SQL,
// applied here to TypeScript.
//
// What this check CANNOT do: prove the auth helper's own result is
// actually checked/branched on (e.g. `if (!auth.ok) return ...`) or
// that every client-supplied id is cross-referenced against the
// derived identity — that's what the dd-fn.ts/deal-room-fn.ts/
// doc-request-fn.ts audit found by hand, and a per-id cross-check is a
// semantic question this structural check does not attempt. It only
// proves a recognised auth-helper CALL is present somewhere in the
// handler body. A handler that calls `requireUser()` and ignores the
// result still passes this check — it would not have caught the
// original "0-row UPDATE is indistinguishable from success" class of
// defect (CLAUDE.md §7.4), only the simpler "no identity derivation at
// all" class (the getDealRoomWorkflow shape). Documented here so this
// script is never mistaken for a complete authorization audit.
//
// Scope: every *-fn.ts / *.ts file directly under src/lib (not
// src/lib/actions/**, which routes through runAction/pack_api and has
// its own, separate, already-enforced chokepoint guarantee — see
// check-action-split.mjs and CLAUDE.md §20.11).

import { readFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import ts from "typescript";
import { analyze } from "./serverfn-guard-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = join(__dirname, "../src/lib");

// Recognised auth-helper identifiers — every one of these was found in
// this codebase's own *-fn.ts files by the 11 Oct 2026 audit, deriving
// identity from the caller's own token before any service-role query
// runs. Extend this list only when a new, genuinely equivalent helper
// is introduced — not to silence a real finding.
const RECOGNISED_AUTH_HELPERS = new Set([
  "requireUser",
  "verifyUser",
  "requireRoomMember",
  "principalRoomMember",
  "authorizeMember",
  "authorizePrincipal",
  "requireSideMember",
  "verifyPrincipalMember",
  "verifyLawyerMember",
  "ownsStartup",
  "anyRoomRole",
]);

// Service-role / admin-client indicators — any of these appearing
// (as an identifier, not inside a string) inside a handler body marks
// it as using a client that bypasses RLS, per CLAUDE.md §7.1: "Service-
// role code bypasses RLS entirely. There is no database backstop."
const SERVICE_ROLE_INDICATORS = new Set([
  "getAdminClient",
  "getAdmin",
  "SUPABASE_SERVICE_ROLE_KEY",
]);

/** Also recognise `sb.auth.getUser(...)` / `supabase.auth.getUser(...)`
 * as an inline auth derivation (dd-fn.ts's runConfrontationalAnalysis
 * uses this shape directly instead of a named helper). */
function isInlineGetUserCall(node) {
  if (!ts.isCallExpression(node)) return false;
  const expr = node.expression;
  if (!ts.isPropertyAccessExpression(expr)) return false;
  if (expr.name.text !== "getUser") return false;
  const obj = expr.expression; // should be <something>.auth
  if (!ts.isPropertyAccessExpression(obj)) return false;
  return obj.name.text === "auth";
}

function collectIdentifiersAndCalls(node, identifiers, inlineGetUserFound) {
  if (ts.isIdentifier(node)) identifiers.add(node.text);
  if (isInlineGetUserCall(node)) inlineGetUserFound.value = true;
  ts.forEachChild(node, (child) => collectIdentifiersAndCalls(child, identifiers, inlineGetUserFound));
}

/**
 * Finds every `export const X = createServerFn(...)` declaration and
 * extracts the function body passed to its `.handler(...)` call (the
 * actual handler logic, regardless of how many other chained calls
 * like `.inputValidator(...)` sit in between).
 */
function findServerFnHandlers(sourceFile) {
  const results = [];

  function visit(node) {
    if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const decl of node.declarationList.declarations) {
        if (!decl.initializer) continue;
        const name = decl.name.getText(sourceFile);
        const handlerBody = findHandlerBodyInChain(decl.initializer);
        if (handlerBody) {
          results.push({ name, body: handlerBody, line: sourceFile.getLineAndCharacterOfPosition(decl.getStart()).line + 1 });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  // Walks a chained call expression like
  // createServerFn({...}).inputValidator(...).handler(fn) looking for
  // a call whose callee property name is "handler", chained off a
  // createServerFn(...) call somewhere in its own chain.
  function findHandlerBodyInChain(node) {
    if (!ts.isCallExpression(node)) return null;
    const expr = node.expression;
    if (ts.isPropertyAccessExpression(expr)) {
      if (expr.name.text === "handler") {
        // Confirm this chain traces back to createServerFn(...) —
        // walk down expr.expression repeatedly.
        let base = expr.expression;
        let isServerFn = false;
        while (true) {
          if (ts.isCallExpression(base)) {
            const baseExpr = base.expression;
            if (ts.isIdentifier(baseExpr) && baseExpr.text === "createServerFn") {
              isServerFn = true;
              break;
            }
            if (ts.isPropertyAccessExpression(baseExpr)) {
              base = baseExpr.expression;
              continue;
            }
          }
          break;
        }
        if (isServerFn && node.arguments.length > 0) {
          return node.arguments[0]; // the handler function itself
        }
      }
      // keep searching deeper in the chain (handles
      // createServerFn(...).inputValidator(...).handler(...) where the
      // outer node might itself be another call we don't care about)
      const inner = findHandlerBodyInChain(expr.expression);
      if (inner) return inner;
    }
    return null;
  }

  visit(sourceFile);
  return results;
}

function scanFile(filePath, relPath) {
  const text = readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(relPath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const handlers = findServerFnHandlers(sourceFile);
  const findings = [];

  for (const { name, body, line } of handlers) {
    const identifiers = new Set();
    const inlineGetUserFound = { value: false };
    collectIdentifiersAndCalls(body, identifiers, inlineGetUserFound);

    const usesServiceRole = [...SERVICE_ROLE_INDICATORS].some((ind) => identifiers.has(ind));
    if (!usesServiceRole) continue; // out of scope — this check only governs service-role handlers

    const hasRecognisedHelper = [...RECOGNISED_AUTH_HELPERS].some((h) => identifiers.has(h));
    const hasInlineGetUser = inlineGetUserFound.value;

    if (!hasRecognisedHelper && !hasInlineGetUser) {
      findings.push({
        file: relPath,
        line,
        name,
        message: `${relPath}:${line} — export const ${name} = createServerFn(...) uses a service-role/admin client (found ${[...SERVICE_ROLE_INDICATORS].filter((i) => identifiers.has(i)).join(", ")}) but calls no recognised auth helper (${[...RECOGNISED_AUTH_HELPERS].join(", ")}) and has no inline sb.auth.getUser(...)/supabase.auth.getUser(...) call anywhere in its handler body. A service-role handler with no identity derivation is reachable by any caller, authenticated or not, for any id it accepts — see CLAUDE.md's getDealRoomWorkflow incident.`,
      });
    }
  }

  return findings;
}

// ── scan src/lib/*.ts, NOT src/lib/actions/** (separate chokepoint,
//    separately enforced by check-action-split.mjs) ──────────────────
function listLibFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "actions") continue; // separate chokepoint, separate guard
      out.push(...listLibFiles(full));
    } else if (entry.endsWith(".ts") && !entry.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

const files = listLibFiles(LIB_DIR);
let allFindings = [];
for (const f of files) {
  const rel = "src/lib/" + f.slice(LIB_DIR.length + 1);
  allFindings.push(...scanFile(f, rel));
}

console.log(`check-serverfn-authz: scanned ${files.length} file(s) under src/lib (excluding src/lib/actions/).`);

// ── Rules R2, R3, R4 (added 19 Oct 2026, after an audit found the 12 email trigger functions and the CRM sync
// function callable by anyone: the original rule above only looked for a service-role identifier inside the handler
// body, and those functions created their service client in a helper). See serverfn-guard-core.mjs for the rules
// and CLAUDE.md §20.23 for the policy letters.
function listSrc(dir, base) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listSrc(full, base));
    else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith(".d.ts") && entry !== "routeTree.gen.ts") out.push(full);
  }
  return out;
}
const SRC_DIR = join(__dirname, "../src");
const srcFiles = listSrc(SRC_DIR).map((f) => ({ path: "src/" + f.slice(SRC_DIR.length + 1), text: readFileSync(f, "utf8") }));
const allowlist = JSON.parse(readFileSync(join(__dirname, "serverfn-effects-allowlist.json"), "utf8")).entries;
const coreFindings = analyze(srcFiles, allowlist);
console.log(`check-serverfn-authz: analysed ${srcFiles.length} source file(s) against ${allowlist.length} allow-list entr${allowlist.length === 1 ? "y" : "ies"}.`);

if (allFindings.length > 0 || coreFindings.length > 0) {
  if (allFindings.length > 0) {
    console.error(`\n✗ check-serverfn-authz FAILED — ${allFindings.length} service-role createServerFn handler(s) with no recognised auth helper call:\n`);
    for (const f of allFindings) console.error("  • " + f.message + "\n");
    console.error(
      "Fix: call one of the recognised helpers (or sb.auth.getUser(token)/supabase.auth.getUser(token)) " +
      "before any service-role query runs, deriving identity from the caller's own token — never a " +
      "client-supplied id. If a new, genuinely equivalent helper is introduced, add its name to " +
      "RECOGNISED_AUTH_HELPERS in this script, with a comment citing where it's defined.\n",
    );
  }
  if (coreFindings.length > 0) {
    console.error(`\n✗ check-serverfn-authz FAILED — ${coreFindings.length} finding(s) from the effects and log rules:\n`);
    for (const f of coreFindings) console.error(`  • [${f.rule}] ${f.message}\n`);
  }
  process.exit(1);
}

console.log(`\n✓ check-serverfn-authz passed — every service-role handler calls a recognised auth helper, every email, CRM and service-role server function is on the allow-list with a policy letter, and no log call prints a token, key or email.`);
