// serverfn-guard-core.mjs — detection logic for the server-function guard (scripts/check-serverfn-authz.mjs), kept
// separate so the self-tests (check-serverfn-authz.test.mjs) can feed it in-memory sources.
//
// Rules (all use the real TypeScript compiler API, not text matching):
//
//   R1  A server function that uses a service-role/admin client DIRECTLY in its handler body must call a recognised
//       auth helper (or an inline auth.getUser) somewhere in that body. (The original 11 Oct 2026 rule.)
//
//   R2  EFFECTS REGISTRY. A server function (exported or not) that, directly or through any helper it calls (followed within
//       its file and through relative or "@/" imports), sends email, writes to a CRM or Notion, or creates a
//       service-role client, must be listed in the allow-list with a policy letter and a written reason. Policy letters:
//         A own-email, B members-only, C public form, E invite, F admin-key operator route, G service-role data
//         function (no email or CRM; file-level wildcard allowed, identity rule R1/R3 still applies), H anonymous
//         capability-token endpoint (the unguessable token is the credential; it must pass isUuid before use).
//       Letters A, B, E, G need a recognised auth helper reachable from the function. C needs a strict input parser
//       (an identifier ending in "Input" starting with "parse", or hasOnlyKeys). F needs verifyAdminKey. Email and
//       CRM reaching functions must be listed one by one (no wildcard). A stale allow-list entry is itself a failure.
//
//   R3  (the reachability half of R1) a function that reaches a service-role client through a helper, with no
//       recognised auth helper reachable, fails even if it is allow-listed with A, B, E or G.
//
//   R4  LOG RULE. No console.* call may have an argument expression that names a token, key, secret, password,
//       authorization value or an email address. String literals are ignored; variable and property names are not.

import ts from "typescript";
import { dirname, posix } from "node:path";

export const RECOGNISED_AUTH_HELPERS = new Set([
  "requireUser",
  "requireUserIdentity",
  "resolveIdentity",
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
  // lib/step-up-fn.ts: resolves the caller from their own token, then re-verifies their password.
  "verifyPassword",
]);

export const SERVICE_ROLE_MARKERS = new Set([
  "getAdminClient",
  "getAdmin",
  "adminClient",
  "getServiceClient",
  "serviceClient",
  "SUPABASE_SERVICE_ROLE_KEY",
  "serviceKey",
  "serviceRoleKey",
]);

export const EMAIL_MARKERS = new Set(["sendEmail", "sendEmailWith"]);
export const CRM_MARKERS = new Set([
  "upsertHubSpotContact",
  "upsertContactWith",
  "bulkSyncUsersToHubSpot",
  "notionWaitlistPage",
]);
const HOST_LITERALS = [
  "api.hubapi.com",
  "api.notion.com",
  "api.resend.com",
  "hsforms.com",
];

const POLICY_LETTERS = new Set(["A", "B", "C", "E", "F", "G", "H"]);
const NEEDS_AUTH = new Set(["A", "B", "E", "G"]);

function isInlineGetUserCall(node) {
  if (!ts.isCallExpression(node)) return false;
  const expr = node.expression;
  if (!ts.isPropertyAccessExpression(expr) || expr.name.text !== "getUser")
    return false;
  const obj = expr.expression;
  return ts.isPropertyAccessExpression(obj) && obj.name.text === "auth";
}

function parse(path, text) {
  return ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function lineOf(sf, node) {
  return sf.getLineAndCharacterOfPosition(node.getStart()).line + 1;
}

// ── server-function discovery ────────────────────────────────────────────────────────────────────────

function handlerArgOf(node) {
  if (!ts.isCallExpression(node)) return null;
  const expr = node.expression;
  if (!ts.isPropertyAccessExpression(expr)) return null;
  if (expr.name.text === "handler") {
    let base = expr.expression;
    while (true) {
      if (ts.isCallExpression(base)) {
        const be = base.expression;
        if (ts.isIdentifier(be) && be.text === "createServerFn")
          return node.arguments[0] ?? null;
        if (ts.isPropertyAccessExpression(be)) {
          base = be.expression;
          continue;
        }
      }
      break;
    }
  }
  return handlerArgOf(expr.expression);
}

function findServerFns(sf) {
  const out = [];
  const visit = (node) => {
    // Exported or not: an unexported server function in a route file is still reachable through the route loader.
    if (ts.isVariableStatement(node)) {
      for (const d of node.declarationList.declarations) {
        if (!d.initializer) continue;
        const h = handlerArgOf(d.initializer);
        if (h)
          out.push({ name: d.name.getText(sf), body: h, line: lineOf(sf, d) });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

// ── per-file index: function declarations and local imports ─────────────────────────────────────────

function resolveImport(fromPath, spec, known) {
  let base;
  if (spec.startsWith("@/")) base = "src/" + spec.slice(2);
  else if (spec.startsWith("."))
    base = posix.normalize(posix.join(dirname(fromPath), spec));
  else return null;
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"])
    if (known.has(base + ext)) return base + ext;
  return known.has(base) ? base : null;
}

function indexFile(path, sf, known) {
  const funcs = new Map(); // name -> node (function body holder)
  const imports = new Map(); // local name -> { file, name }
  const visit = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name && node.body)
      funcs.set(node.name.text, node);
    if (ts.isVariableStatement(node)) {
      for (const d of node.declarationList.declarations) {
        if (
          ts.isIdentifier(d.name) &&
          d.initializer &&
          (ts.isArrowFunction(d.initializer) ||
            ts.isFunctionExpression(d.initializer))
        )
          funcs.set(d.name.text, d.initializer);
      }
    }
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      const target = resolveImport(path, node.moduleSpecifier.text, known);
      if (target)
        for (const el of node.importClause.namedBindings.elements)
          imports.set(el.name.text, {
            file: target,
            name: (el.propertyName ?? el.name).text,
          });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { sf, funcs, imports };
}

// Reachability: collect marker identifiers and host literals through the handler and every helper it calls.
function reach(startFile, startNode, index) {
  const seen = new Set();
  const found = {
    email: false,
    crm: false,
    service: false,
    auth: false,
    parser: false,
    uuid: false,
    adminKey: false,
    inlineGetUser: false,
  };
  const walk = (file, node) => {
    const idx = index.get(file);
    const visit = (n) => {
      if (isInlineGetUserCall(n)) found.inlineGetUser = true;
      if (
        ts.isStringLiteralLike(n) &&
        HOST_LITERALS.some((h) => n.text.includes(h))
      )
        found.crm = true;
      if (ts.isStringLiteralLike(n) && n.text === "SUPABASE_SERVICE_ROLE_KEY")
        found.service = true;
      if (ts.isIdentifier(n)) {
        const t = n.text;
        if (EMAIL_MARKERS.has(t)) found.email = true;
        if (CRM_MARKERS.has(t)) found.crm = true;
        if (SERVICE_ROLE_MARKERS.has(t)) found.service = true;
        if (RECOGNISED_AUTH_HELPERS.has(t)) found.auth = true;
        if (t === "verifyAdminKey") found.adminKey = true;
        if (t === "isUuid") found.uuid = true;
        if (t === "hasOnlyKeys" || /^parse[A-Za-z]*Input$/.test(t))
          found.parser = true;
        // follow into helpers
        const local = idx.funcs.get(t);
        if (local && !seen.has(file + "#" + t)) {
          seen.add(file + "#" + t);
          walk(file, local);
        }
        const imp = idx.imports.get(t);
        if (imp && !seen.has(imp.file + "#" + imp.name)) {
          seen.add(imp.file + "#" + imp.name);
          const tidx = index.get(imp.file);
          const fn = tidx?.funcs.get(imp.name);
          if (fn) walk(imp.file, fn);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(node);
  };
  walk(startFile, startNode);
  return found;
}

// ── log rule ─────────────────────────────────────────────────────────────────────────────────────────

const SENSITIVE_EXACT = new Set([
  "token",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "idtoken",
  "invitetoken",
  "jwt",
  "bearer",
  "authorization",
  "apikey",
  "api_key",
  "secret",
  "password",
  "passwd",
  "key",
  "servicekey",
  "servicerolekey",
  "resendkey",
  "openaikey",
  "adminkey",
  "hubspottoken",
  "notionkey",
  "recipient",
  "recipients",
  "to_email",
  "email_to",
]);
function isSensitiveName(name) {
  const l = name.toLowerCase();
  if (SENSITIVE_EXACT.has(l)) return true;
  if (
    /(secret|password|apikey|api_key|servicekey|resendkey|openaikey|adminkey)$/.test(
      l,
    )
  )
    return true;
  if (/token$/.test(l)) return true; // "tokens" and "total_tokens" do not end in token
  if (/email$/.test(l) || l === "emails") return true;
  return false;
}

function logFindings(path, sf) {
  const out = [];
  const visit = (node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "console" &&
      ["log", "info", "warn", "error", "debug"].includes(
        node.expression.name.text,
      )
    ) {
      const hit = new Set();
      const scan = (n) => {
        // A presence check (!!apiKey, Boolean(apiKey), typeof apiKey) prints a boolean, not the value.
        if (
          ts.isPrefixUnaryExpression(n) &&
          n.operator === ts.SyntaxKind.ExclamationToken
        )
          return;
        if (ts.isTypeOfExpression(n)) return;
        if (
          ts.isCallExpression(n) &&
          ts.isIdentifier(n.expression) &&
          n.expression.text === "Boolean"
        )
          return;
        if (ts.isIdentifier(n) && isSensitiveName(n.text)) hit.add(n.text);
        if (ts.isPropertyAccessExpression(n) && isSensitiveName(n.name.text))
          hit.add(n.name.text);
        ts.forEachChild(n, scan);
      };
      for (const arg of node.arguments)
        if (!ts.isStringLiteralLike(arg)) scan(arg);
      if (hit.size)
        out.push({
          rule: "R4",
          file: path,
          line: lineOf(sf, node),
          message: `${path}:${lineOf(sf, node)} — console.${node.expression.name.text} prints a value named ${[...hit].join(", ")} (a token, key, secret or email address). Log a fixed message or a boolean instead.`,
        });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

// ── main entry ───────────────────────────────────────────────────────────────────────────────────────

/**
 * @param {{path:string,text:string}[]} files  repo-relative paths ("src/lib/x.ts") and their text
 * @param {{file:string,name:string,policy:string,reason:string}[]} allowlist
 * @param {{logScope?:(path:string)=>boolean}} [opts]
 */
export function analyze(files, allowlist, opts = {}) {
  const known = new Set(files.map((f) => f.path));
  const parsed = new Map(files.map((f) => [f.path, parse(f.path, f.text)]));
  const index = new Map(
    [...parsed].map(([p, sf]) => [p, indexFile(p, sf, known)]),
  );
  const findings = [];

  // allow-list hygiene
  for (const e of allowlist) {
    if (!POLICY_LETTERS.has(e.policy))
      findings.push({
        rule: "R2",
        file: e.file,
        line: 0,
        message: `allow-list entry ${e.file}:${e.name} has unknown policy letter "${e.policy}"`,
      });
    if (!e.reason || e.reason.trim().length < 15)
      findings.push({
        rule: "R2",
        file: e.file,
        line: 0,
        message: `allow-list entry ${e.file}:${e.name} needs a written reason`,
      });
  }
  const used = new Set();
  const entryFor = (file, name) =>
    allowlist.find((e) => e.file === file && e.name === name) ??
    allowlist.find(
      (e) => e.file === file && e.name === "*" && e.policy === "G",
    );

  const serverFnNames = new Set();
  for (const [path, sf] of parsed) {
    if (path.startsWith("src/lib/actions/")) continue; // separate chokepoint (check-action-split.mjs)
    for (const fn of findServerFns(sf)) {
      serverFnNames.add(path + ":" + fn.name);
      const r = reach(path, fn.body, index);
      const reaches = r.email || r.crm || r.service;
      if (!reaches) continue;
      const hasAuth = r.auth || r.inlineGetUser;
      const label = `${path}:${fn.line} export const ${fn.name}`;
      const e = entryFor(path, fn.name);
      if (!e) {
        findings.push({
          rule: "R2",
          file: path,
          line: fn.line,
          message: `${label} ${[r.email && "sends email", r.crm && "writes to a CRM or Notion", r.service && "creates a service-role client"].filter(Boolean).join(", ")} (directly or through a helper) but is not in scripts/serverfn-effects-allowlist.json. Add it with a policy letter (A, B, C, E, F or G) and a written reason, after the function meets that policy.`,
        });
        continue;
      }
      used.add(e);
      if ((r.email || r.crm) && e.name === "*")
        findings.push({
          rule: "R2",
          file: path,
          line: fn.line,
          message: `${label} sends email or writes to a CRM, so it must be listed by name, not by a file wildcard.`,
        });
      if (r.email && (e.policy === "G" || e.policy === "C"))
        findings.push({
          rule: "R2",
          file: path,
          line: fn.line,
          message: `${label} sends email but is listed as policy ${e.policy}. Email senders are A, B, E (or F for the admin test route).`,
        });
      if (NEEDS_AUTH.has(e.policy) && !hasAuth)
        findings.push({
          rule: "R3",
          file: path,
          line: fn.line,
          message: `${label} is listed as policy ${e.policy} but reaches no recognised auth helper (${[...RECOGNISED_AUTH_HELPERS].join(", ")}). Derive the caller from their token before any effect.`,
        });
      if (e.policy === "C" && !r.parser)
        findings.push({
          rule: "R2",
          file: path,
          line: fn.line,
          message: `${label} is listed as policy C (public form) but reaches no strict input parser (a parse...Input function or hasOnlyKeys).`,
        });
      if (e.policy === "H" && !r.uuid)
        findings.push({
          rule: "R2",
          file: path,
          line: fn.line,
          message: `${label} is listed as policy H (anonymous capability-token endpoint) but never validates the token with isUuid.`,
        });
      if (e.policy === "F" && !r.adminKey)
        findings.push({
          rule: "R2",
          file: path,
          line: fn.line,
          message: `${label} is listed as policy F (admin-key route) but never calls verifyAdminKey.`,
        });
    }
  }
  for (const e of allowlist) {
    if (used.has(e)) continue;
    findings.push({
      rule: "R2",
      file: e.file,
      line: 0,
      message: `stale allow-list entry: ${e.file}:${e.name} matches no server function that sends email, writes to a CRM or creates a service-role client. Remove it.`,
    });
  }

  const inLogScope =
    opts.logScope ??
    ((p) => p.startsWith("src/") && !p.endsWith("routeTree.gen.ts"));
  for (const [path, sf] of parsed)
    if (inLogScope(path)) findings.push(...logFindings(path, sf));
  return findings;
}
