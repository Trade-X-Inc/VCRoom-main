// check-grants-core.mjs — the real scanning logic, shared between
// check-grants.mjs (the CI/CLI entry point) and check-grants.test.mjs
// (the self-test suite). Extracted so the tests exercise the EXACT same
// code path the real guard runs, not a duplicated copy that could drift
// from it — see check-grants.mjs's own header for the full rule
// catalogue (R1-R10) and the rationale for parsing real SQL via
// libpg-query instead of regex matching.
//
// R11 (added 11 Oct 2026, Wave 2 review item 6) — see the dedicated
// comment block below, just above extractGrantedColumnsByTable/
// extractPreflightExpected. Self-verifies any migration that follows the
// "preflight schema guard" pattern (a DO block with a v_expected jsonb
// literal, checked against information_schema.columns before any
// REVOKE/GRANT runs — see DRAFT_wave2_lockdown.sql): the guard's own
// v_expected map must exactly equal what the file's GRANT statements
// actually grant, in both directions. Fails CI on any mismatch.

import { readFileSync } from "fs";
import { parse, loadModule } from "libpg-query";

let moduleLoaded = false;
export async function ensureModuleLoaded() {
  if (!moduleLoaded) {
    await loadModule();
    moduleLoaded = true;
  }
}

// ── AST helpers ───────────────────────────────────────────────────────

function fqObjectName(objects) {
  return objects
    .map((o) => {
      if (o.RangeVar) {
        const sn = o.RangeVar.schemaname || "public";
        return `${sn}.${o.RangeVar.relname}`;
      }
      if (o.String) return o.String.sval; // schema name, for ALL IN SCHEMA
      if (o.ObjectWithArgs) {
        const name = (o.ObjectWithArgs.objname || []).map((n) => n.String?.sval).join(".");
        const args = (o.ObjectWithArgs.objargs || [])
          .map((a) => (a.TypeName?.names || []).map((n) => n.String?.sval).join("."))
          .join(", ");
        return `${name}(${args})`;
      }
      return "<unknown object>";
    })
    .join(", ");
}

function roleNames(grantees) {
  return (grantees || []).map((g) => {
    if (g.RoleSpec?.roletype === "ROLESPEC_PUBLIC") return "public";
    return g.RoleSpec?.rolename || "<unknown role>";
  });
}

function hasTopLevelConstTrue(node) {
  // USING (true) / WITH CHECK (true) parse as a bare A_Const boolval node
  // at the top of the qual/with_check tree. A wrapped form like
  // (true) still parses to the same top-level node (parens are not
  // represented as a separate AST layer).
  return !!node?.A_Const?.boolval?.boolval === true;
}

function findFnOption(fn, defname) {
  return (fn.options || []).find((o) => o.DefElem?.defname === defname);
}

function searchPathIsCorrect(fn) {
  const setOpt = findFnOption(fn, "set");
  if (!setOpt) return false;
  const vss = setOpt.DefElem.arg?.VariableSetStmt;
  if (!vss || vss.name !== "search_path") return false;
  const args = vss.args || [];
  if (args.length === 0) return false;
  const last = args[args.length - 1];
  const lastVal = last?.A_Const?.sval?.sval;
  return lastVal === "pg_temp";
}

function isSecurityDefiner(fn) {
  const secOpt = findFnOption(fn, "security");
  return secOpt?.DefElem?.arg?.Boolean?.boolval === true;
}

// ── R11 helpers — self-verifying pre-flight guard. The preflight DO block
// (DRAFT_wave2_lockdown.sql / DRAFT_wave2_dry_run.sql's pattern) hardcodes
// a `v_expected` jsonb literal mapping table -> expected granted columns,
// checked against information_schema.columns at apply time. That literal
// is a second, hand-maintained copy of the same information the file's own
// GRANT statements already encode — exactly the kind of "two places, one
// fact" drift this project has been burned by before (CLAUDE.md §7.2's
// migration-vs-deployed reconciliation lesson, applied here one layer
// earlier: the SQL's own two internal copies of itself). R11 extracts both
// copies from the real AST and asserts they agree, per table, for INSERT
// and UPDATE independently (the two privileges the preflight pattern is
// meant to cover) — not merely that the same bytes appear somewhere.
//
// Extraction of v_expected is NOT a second regex-based SQL parser — the
// real grammar (DoStmt) has already isolated the plpgsql body as an opaque
// string literal the outer parser does not and should not descend into
// (PL/pgSQL has its own grammar). Pulling one well-known `v_expected jsonb
// := '...'::jsonb` literal out of that already-isolated string is a
// narrow, scoped extraction, not the evadable-by-whitespace SQL regex
// matching this guard was rebuilt away from (check-grants.mjs's own
// header). If the literal's shape ever changes, this extraction fails
// loud (see below) — it never silently matches nothing and passes.

function extractGrantedColumnsByTable(parsedStmts) {
  // -> { [table]: { insert: Set<col>, update: Set<col> } }
  const result = {};
  for (const { stmt } of parsedStmts) {
    if (!stmt.GrantStmt || stmt.GrantStmt.is_grant !== true) continue;
    const g = stmt.GrantStmt;
    if (g.objtype !== "OBJECT_TABLE") continue;
    if (!roleNames(g.grantees).includes("authenticated")) continue;
    // Normalize to the bare table name (no schema prefix) to match
    // v_expected's JSON keys, which the preflight pattern writes as bare
    // table names ("founder_documents", not "public.founder_documents") —
    // confirmed against the real DRAFT_wave2_* files.
    const objDesc = fqObjectName(g.objects || []).replace(/^public\./, "");
    for (const p of g.privileges || []) {
      const priv = p.AccessPriv.priv_name;
      if (priv !== "insert" && priv !== "update") continue;
      const cols = (p.AccessPriv.cols || []).map((c) => c.String.sval);
      if (cols.length === 0) continue; // unscoped write — R4 already flags this separately
      result[objDesc] ??= { insert: new Set(), update: new Set() };
      for (const c of cols) result[objDesc][priv].add(c);
    }
  }
  return result;
}

function extractPreflightExpected(sql) {
  // Finds `v_expected jsonb := '<json>'::jsonb;` inside any DO block's raw
  // body text and parses the JSON. Returns null if no such literal exists
  // in the file at all (a file with no preflight guard — R11 has nothing
  // to check, and scanSql treats that as "not applicable", never as a
  // silent pass dressed as success).
  const m = sql.match(/v_expected\s+jsonb\s*:=\s*'((?:[^'\\]|\\.)*)'\s*::\s*jsonb/s);
  if (!m) return null;
  let jsonText;
  try {
    jsonText = JSON.parse(m[1]);
  } catch (e) {
    throw new Error(`R11: found a v_expected literal but could not JSON-parse it: ${e.message}`);
  }
  return jsonText;
}

/**
 * Scan one file's SQL text and return its findings.
 * @param {string} relFile — the file's path, as it should appear in findings (caller decides the label)
 * @param {string} sql — the raw SQL text
 * @param {{public_data_tables: string[], function_execute_without_revoke: Array<{function:string}>}} allowlist
 * @returns {Array<{file, rule, detail, message}>}
 */
export async function scanSql(relFile, sql, allowlist) {
  await ensureModuleLoaded();
  const findings = [];
  const addFinding = (rule, detail, message) => findings.push({ file: relFile, rule, detail, message });

  let parsed;
  try {
    parsed = await parse(sql);
  } catch (e) {
    addFinding("PARSE_ERROR", e.message,
      `${relFile}: could not be parsed by the real PostgreSQL grammar (libpg-query): ${e.message}. A migration this guard cannot parse cannot be verified by it — treat this as a hard stop, not a skip.`);
    return findings;
  }

  // ── R11 — preflight v_expected map must exactly equal the file's own
  // GRANT column lists, per table, per privilege (INSERT, UPDATE
  // independently — the preflight's own flat per-table array is checked
  // against the UNION of both privileges' columns, since the pattern uses
  // one array per table to cover "every column this migration is about to
  // grant" rather than one array per table per privilege; a column present
  // under either privilege must appear in v_expected, and every column in
  // v_expected must be granted under at least one of the two). Runs once
  // per file, before the per-statement walk below, since it needs the
  // whole file's GRANT statements AND the preflight's raw string in one
  // pass.
  {
    let preflightExpected;
    try {
      preflightExpected = extractPreflightExpected(sql);
    } catch (e) {
      addFinding("R11_preflight_unparseable", e.message,
        `${relFile}: ${e.message}. A preflight guard whose own v_expected literal cannot be parsed is not a working guard — fix the literal's quoting/escaping.`);
      preflightExpected = null;
    }
    if (preflightExpected !== null) {
      const granted = extractGrantedColumnsByTable(parsed.stmts);
      const allTables = new Set([...Object.keys(preflightExpected), ...Object.keys(granted)]);
      for (const table of allTables) {
        const expectedCols = new Set(preflightExpected[table] ?? []);
        const grantedCols = new Set([
          ...((granted[table]?.insert) ?? []),
          ...((granted[table]?.update) ?? []),
        ]);
        const missingFromPreflight = [...grantedCols].filter((c) => !expectedCols.has(c)).sort();
        const missingFromGrant = [...expectedCols].filter((c) => !grantedCols.has(c)).sort();
        if (missingFromPreflight.length > 0) {
          addFinding("R11_preflight_drift", `${table}: granted but not in v_expected: ${missingFromPreflight.join(", ")}`,
            `${relFile}: R11 — ${table} GRANTs column(s) [${missingFromPreflight.join(", ")}] under INSERT/UPDATE to authenticated, but the preflight v_expected map for ${table} does not list them. The preflight guard would not validate these columns against the live schema before the GRANT runs — it has silently drifted from what the file actually grants.`);
        }
        if (missingFromGrant.length > 0) {
          addFinding("R11_preflight_drift", `${table}: in v_expected but not granted: ${missingFromGrant.join(", ")}`,
            `${relFile}: R11 — the preflight v_expected map for ${table} lists column(s) [${missingFromGrant.join(", ")}], but no GRANT INSERT/UPDATE ... TO authenticated in this file actually grants them. The preflight is checking a column this migration never grants — dead/stale entries in the self-check itself.`);
        }
      }
    }
  }

  for (const { stmt } of parsed.stmts) {
    // ── GrantStmt (GRANT and REVOKE both parse to this node; REVOKE
    //    statements simply lack the `is_grant` key entirely — it is never
    //    present as `false`, only absent) ──────────────────────────────
    if (stmt.GrantStmt && stmt.GrantStmt.is_grant === true) {
      const g = stmt.GrantStmt;
      const roles = roleNames(g.grantees);
      const objDesc = fqObjectName(g.objects || []);
      const isAllInSchema = g.targtype === "ACL_TARGET_ALL_IN_SCHEMA";
      const objKind = g.objtype === "OBJECT_FUNCTION" ? "function" : g.objtype === "OBJECT_SCHEMA" ? "schema" : "table";

      // R1 — any GRANT to anon
      if (roles.includes("anon")) {
        const privDesc = (g.privileges || []).map((p) => p.AccessPriv.priv_name).join(", ") || "ALL";
        addFinding("R1_anon_grant", `${privDesc} ON ${objDesc} TO anon`,
          `${relFile}: R1 — GRANT ${privDesc} ON ${objDesc} TO anon. SECURITY.md §1.4: anon has zero table/function access except an explicit allowlist.`);
      }

      // R2 — GRANT to PUBLIC (or a role list literally containing "public")
      if (roles.includes("public")) {
        const privDesc = (g.privileges || []).map((p) => p.AccessPriv.priv_name).join(", ") || "ALL";
        addFinding("R2_public_grant", `${privDesc} ON ${objDesc} TO public`,
          `${relFile}: R2 — GRANT ${privDesc} ON ${objDesc} TO public (or a grantee list including the public role). No client-facing object should grant to the public pseudo-role.`);
      }

      // R3 — GRANT ALL / ALL PRIVILEGES (no privileges array at all)
      if (!g.privileges && roles.includes("authenticated") && g.objtype === "OBJECT_TABLE") {
        addFinding("R3_grant_all", `ALL ON ${objDesc} TO authenticated`,
          `${relFile}: R3 — GRANT ALL [PRIVILEGES] ON ${objDesc} TO authenticated. This grants every privilege including DELETE/TRUNCATE/TRIGGER/REFERENCES with no column scoping possible for any of them. Use explicit, named, column-scoped privileges instead.`);
      }

      // R4 — table-level INSERT/UPDATE with no column list, to authenticated
      // (DELETE deliberately excluded — no column-scoped DELETE grant exists in Postgres)
      if (roles.includes("authenticated") && g.objtype === "OBJECT_TABLE" && g.privileges) {
        for (const p of g.privileges) {
          const priv = p.AccessPriv.priv_name;
          if ((priv === "insert" || priv === "update") && !p.AccessPriv.cols) {
            addFinding("R4_unscoped_write", `${priv} ON ${objDesc} TO authenticated (no column list)`,
              `${relFile}: R4 — GRANT ${priv} ON ${objDesc} TO authenticated has NO column list. SECURITY.md §1.1/§1.2: re-grant by column, never table-wide.`);
          }
        }
      }

      // R5 — ON ALL TABLES/FUNCTIONS/SEQUENCES IN SCHEMA
      if (isAllInSchema) {
        addFinding("R5_all_in_schema", `ON ALL ${objKind.toUpperCase()}S IN SCHEMA ${objDesc} TO ${roles.join(",")}`,
          `${relFile}: R5 — GRANT ... ON ALL ${objKind.toUpperCase()}S IN SCHEMA ${objDesc} TO ${roles.join(", ")}. A schema-wide blanket grant is exactly the shape this lockdown exists to prevent — it grants every CURRENT object and nothing about future ones, silently covering anything added later via the schema, not per-object review.`);
      }
    }

    // ── AlterDefaultPrivilegesStmt — NOT reachable via the GrantStmt walk
    //    above; it wraps its own grant description in a nested `action`
    //    field of a different shape. R6 is its own dedicated check,
    //    exactly as instructed, not folded into R1/R2. ──────────────────
    if (stmt.AlterDefaultPrivilegesStmt) {
      const ads = stmt.AlterDefaultPrivilegesStmt;
      const action = ads.action;
      if (action && action.is_grant === true) {
        const roles = roleNames(action.grantees);
        const flagged = roles.filter((r) => r === "anon" || r === "authenticated" || r === "public");
        if (flagged.length > 0) {
          const schemasOpt = (ads.options || []).find((o) => o.DefElem?.defname === "schemas");
          const schemas = schemasOpt
            ? (schemasOpt.DefElem.arg?.List?.items || []).map((i) => i.String?.sval).join(", ")
            : "<global>";
          const privDesc = (action.privileges || []).map((p) => p.AccessPriv.priv_name).join(", ") || "ALL";
          addFinding("R6_default_priv_grant", `${privDesc} IN SCHEMA ${schemas} TO ${flagged.join(",")}`,
            `${relFile}: R6 — ALTER DEFAULT PRIVILEGES [IN SCHEMA ${schemas}] GRANT ${privDesc} TO ${flagged.join(", ")}. A default-privilege grant to a client role means every FUTURE object in scope inherits client access with no individual review. SECURITY.md §1.5 expects REVOKE here, never GRANT, for anon/authenticated/public.`);
        }
      }
    }

    // ── CreateFunctionStmt — R7 (missing REVOKE) and R10 (SECURITY
    //    DEFINER without search_path) ───────────────────────────────────
    if (stmt.CreateFunctionStmt) {
      const fn = stmt.CreateFunctionStmt;
      const fnNameParts = (fn.funcname || []).map((n) => n.String?.sval).filter(Boolean);
      const bareName = fnNameParts[fnNameParts.length - 1];
      const schema = fnNameParts.length > 1 ? fnNameParts[0] : "public";
      const fqName = `${schema}.${bareName}`;
      const argCount = (fn.parameters || []).length;

      // R10
      if (isSecurityDefiner(fn) && !searchPathIsCorrect(fn)) {
        addFinding("R10_security_definer_no_searchpath", `${fqName}(${argCount} args)`,
          `${relFile}: R10 — CREATE FUNCTION ${fqName} is SECURITY DEFINER with no SET search_path ending in pg_temp. CLAUDE.md §7.2: SET search_path TO 'public' alone is NOT safe (pg_temp is searched implicitly first) — use SET search_path = <schema>, pg_temp with pg_temp last, or SET search_path = '' with fully-qualified names.`);
      }

      // R7 — scan the WHOLE FILE (all statements) for a matching REVOKE,
      // not just a file-wide "any ALTER DEFAULT PRIVILEGES exists" check.
      // This is the exact bug fixed from the prior version: the
      // file-wide exemption is REMOVED. A REVOKE must name THIS
      // function's own bare name with a matching argument count.
      let hasMatchingRevoke = false;
      for (const { stmt: otherStmt } of parsed.stmts) {
        if (!otherStmt.GrantStmt || otherStmt.GrantStmt.is_grant === true) continue; // only REVOKE (is_grant absent)
        if (otherStmt.GrantStmt.objtype !== "OBJECT_FUNCTION") continue;
        for (const obj of otherStmt.GrantStmt.objects || []) {
          const owa = obj.ObjectWithArgs;
          if (!owa) continue;
          const revokedName = (owa.objname || []).map((n) => n.String?.sval).filter(Boolean);
          const revokedBare = revokedName[revokedName.length - 1];
          const revokedArgCount = (owa.objargs || []).length;
          const revokedRoles = roleNames(otherStmt.GrantStmt.grantees);
          const revokesFromPublicOrAnon = revokedRoles.some((r) => r === "public" || r === "anon");
          if (revokedBare === bareName && revokedArgCount === argCount && revokesFromPublicOrAnon) {
            hasMatchingRevoke = true;
          }
        }
      }

      if (!hasMatchingRevoke) {
        const allowed = allowlist.function_execute_without_revoke.some(
          (e) => e.function === fqName || e.function === bareName,
        );
        if (!allowed) {
          addFinding("R7_unrevoked_function", `${fqName}(${argCount} args)`,
            `${relFile}: R7 — CREATE [OR REPLACE] FUNCTION ${fqName} has no matching "REVOKE EXECUTE ON FUNCTION ${bareName}(...) FROM PUBLIC, anon" for this exact signature in the same file. New functions inherit EXECUTE TO PUBLIC by default (SECURITY.md §1.5/§7.2). A file-wide ALTER DEFAULT PRIVILEGES no longer exempts this — the revoke must name this function specifically.`);
        }
      }
    }

    // ── CreatePolicyStmt — R8 (true) and R9 (missing WITH CHECK) ────────
    if (stmt.CreatePolicyStmt) {
      const p = stmt.CreatePolicyStmt;
      const schema = p.table?.schemaname || "public";
      const table = `${schema}.${p.table?.relname}`;
      const cmd = p.cmd_name; // "select" | "insert" | "update" | "delete" | "all"

      const isPublicData = allowlist.public_data_tables.includes(table);

      // R8
      if (!isPublicData) {
        if (hasTopLevelConstTrue(p.qual)) {
          addFinding("R8_policy_using_true", `USING (true) ON ${table} (policy ${p.policy_name})`,
            `${relFile}: R8 — CREATE POLICY "${p.policy_name}" ON ${table} USING (true). This grants the policy's command to every row for every ${p.roles ? "named role" : "role"}, for a table not listed in grant-allowlist.json's "public_data_tables". If this table is genuinely public, add it to that allowlist with a reason; otherwise this is an open row.`);
        }
        if (hasTopLevelConstTrue(p.with_check)) {
          addFinding("R8_policy_withcheck_true", `WITH CHECK (true) ON ${table} (policy ${p.policy_name})`,
            `${relFile}: R8 — CREATE POLICY "${p.policy_name}" ON ${table} WITH CHECK (true). This accepts any write value for every row, for a table not listed as public data.`);
        }
      }

      // R9 — UPDATE or ALL policy missing WITH CHECK entirely.
      // Postgres itself falls back to reusing USING as WITH CHECK when
      // WITH CHECK is omitted on an UPDATE/ALL policy — a silent,
      // easy-to-miss behaviour this rule exists specifically to surface.
      if ((cmd === "update" || cmd === "all") && !p.with_check) {
        addFinding("R9_missing_withcheck", `${cmd} ON ${table} (policy ${p.policy_name}) — no WITH CHECK`,
          `${relFile}: R9 — CREATE POLICY "${p.policy_name}" ON ${table} FOR ${cmd.toUpperCase()} has no WITH CHECK clause. SECURITY.md §1.3: every UPDATE policy needs USING and WITH CHECK; every ALL policy needs an explicit WITH CHECK. Without one, Postgres silently reuses the USING clause as the write-time check, which may not be the intended boundary.`);
      }
    }
  }

  return findings;
}

/**
 * Scan a list of file paths (absolute or resolvable) and return all findings,
 * with `file` labeled as the path relative to `repoRoot` if given.
 */
export async function scanFiles(filePaths, allowlist, repoRoot) {
  const all = [];
  for (const filePath of filePaths) {
    const relFile = repoRoot ? filePath.replace(repoRoot + "/", "") : filePath;
    const sql = readFileSync(filePath, "utf8");
    const findings = await scanSql(relFile, sql, allowlist);
    all.push(...findings);
  }
  return all;
}

// ── cutoff-based file classification ────────────────────────────────────
//
// Replaces the whole-history 213-entry baseline (9 Oct 2026, per explicit
// instruction): migrations are supabase-standard `YYYYMMDDHHMMSS_name.sql`
// filenames. A migration whose 14-digit timestamp prefix is strictly less
// than LOCKDOWN_CUTOFF is LEGACY — governed by live-database audit (the
// Phase 4 inventory, SECURITY.md's per-table findings), not by this guard.
// A migration at or after the cutoff is IN-SCOPE and must produce ZERO
// findings, no exceptions, no baseline. A file whose name does not match
// the 14-digit-timestamp-then-underscore pattern at all is a BUILD
// FAILURE on its own — an unparseable migration filename is itself a
// defect (this project's own untracked DRAFT_*.sql scratch files are a
// real, live instance of this: they are presumptively dated AFTER the
// cutoff by being new/WIP, but their name carries no verifiable
// timestamp to prove that, so they cannot be silently classified as
// legacy either — failing loud is correct here, not failing open).
export const LOCKDOWN_CUTOFF = "20261008000000";

const MIGRATION_NAME_RE = /^(\d{14})_.+\.sql$/;

/**
 * Classify a migration's basename as "legacy" | "in-scope" | "unparseable".
 */
export function classifyMigrationFile(basename) {
  const m = basename.match(MIGRATION_NAME_RE);
  if (!m) return { kind: "unparseable", timestamp: null };
  const timestamp = m[1];
  return { kind: timestamp < LOCKDOWN_CUTOFF ? "legacy" : "in-scope", timestamp };
}
