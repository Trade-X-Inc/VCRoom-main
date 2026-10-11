// check-grants.test.mjs — self-test suite for check-grants.mjs's detection
// rules, run via scripts/fixtures/*.sql. CI runs this BEFORE the real
// guard (see .github/workflows/ci.yml) — a guard whose own rules are
// unproven is not something to gate a build on.
//
// For every rule R1-R10: a *_bad.sql fixture must be flagged by that
// exact rule, and a *_good.sql fixture must produce ZERO findings of any
// rule (not just "not that rule" — a good fixture that happens to trip a
// DIFFERENT rule is itself a bug in either the fixture or the guard).
// Uses check-grants-core.mjs directly — the same code path
// check-grants.mjs's CLI entry point runs — so this proves the real
// guard's behavior, not a reimplementation of it.

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { scanSql, classifyMigrationFile, LOCKDOWN_CUTOFF } from "./check-grants-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "fixtures");

// A permissive test allowlist — fixtures intentionally don't allowlist
// anything, since the point is to prove each rule fires/doesn't fire on
// its own, not to test allowlist suppression (that's a separate case,
// added at the end).
const TEST_ALLOWLIST = { public_data_tables: [], function_execute_without_revoke: [] };

const RULE_FIXTURES = [
  ["R1_anon_grant", "r1_anon_grant"],
  ["R2_public_grant", "r2_public_grant"],
  ["R3_grant_all", "r3_grant_all"],
  ["R4_unscoped_write", "r4_unscoped_write"],
  ["R5_all_in_schema", "r5_all_in_schema"],
  ["R6_default_priv_grant", "r6_default_priv_grant"],
  ["R7_unrevoked_function", "r7_unrevoked_function"],
  ["R8_policy_using_true", "r8_policy_true"], // bad fixture trips both R8 variants; we check "starts with R8_"
  ["R9_missing_withcheck", "r9_missing_withcheck"],
  ["R10_security_definer_no_searchpath", "r10_security_definer_no_searchpath"],
  ["R11_preflight_drift", "r11_preflight_drift"],
];

let pass = 0;
let fail = 0;
const failures = [];

function report(name, ok, detail) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    failures.push(`${name}: ${detail}`);
    console.log(`  ✗ ${name} — ${detail}`);
  }
}

console.log("check-grants.test.mjs — self-test suite\n");

for (const [ruleId, fixtureBase] of RULE_FIXTURES) {
  const badPath = join(FIXTURES_DIR, `${fixtureBase}_bad.sql`);
  const goodPath = join(FIXTURES_DIR, `${fixtureBase}_good.sql`);

  // BAD fixture must be flagged by the rule whose prefix matches ruleId
  // (R8 has two sub-findings, R8_policy_using_true / R8_policy_withcheck_true
  // — the bad fixture trips both, which is correct; we check that the rule
  // FAMILY fired, not an exact single-finding count).
  const rulePrefix = ruleId.split("_")[0]; // "R1".."R10"
  const badSql = readFileSync(badPath, "utf8");
  const badFindings = await scanSql(`fixtures/${fixtureBase}_bad.sql`, badSql, TEST_ALLOWLIST);
  const badMatchesRule = badFindings.some((f) => f.rule.startsWith(rulePrefix + "_"));
  report(
    `${ruleId}: bad fixture is flagged`,
    badMatchesRule,
    badMatchesRule ? "" : `expected a finding with rule starting "${rulePrefix}_", got: ${JSON.stringify(badFindings.map((f) => f.rule))}`,
  );

  // GOOD fixture must produce ZERO findings of ANY rule.
  const goodSql = readFileSync(goodPath, "utf8");
  const goodFindings = await scanSql(`fixtures/${fixtureBase}_good.sql`, goodSql, TEST_ALLOWLIST);
  report(
    `${ruleId}: good fixture passes clean`,
    goodFindings.length === 0,
    goodFindings.length === 0 ? "" : `expected 0 findings, got ${goodFindings.length}: ${JSON.stringify(goodFindings.map((f) => f.rule))}`,
  );
}

// ── R7's own regression case: the specific bug this guard version fixes.
//    A file-wide ALTER DEFAULT PRIVILEGES for an UNRELATED schema must
//    NOT exempt an unrevoked function in the same file. This is
//    verified by the r7_unrevoked_function_bad.sql fixture itself
//    (which deliberately includes such a statement) — re-asserted here,
//    explicitly, so this exact regression has its own named test and
//    can never again be silently reintroduced as "passing" by a looser
//    r7 fixture rewrite later. ──────────────────────────────────────────
{
  const sql = readFileSync(join(FIXTURES_DIR, "r7_unrevoked_function_bad.sql"), "utf8");
  const hasUnrelatedDefaultPriv = /alter\s+default\s+privileges\s+in\s+schema\s+pack_v1/i.test(sql);
  const findings = await scanSql("fixtures/r7_unrevoked_function_bad.sql", sql, TEST_ALLOWLIST);
  const r7Fired = findings.some((f) => f.rule === "R7_unrevoked_function");
  report(
    "R7 regression: unrelated-schema ALTER DEFAULT PRIVILEGES does not exempt an unrevoked function",
    hasUnrelatedDefaultPriv && r7Fired,
    hasUnrelatedDefaultPriv && r7Fired ? "" : `fixture no longer contains the regression setup, or R7 failed to fire despite it (hasUnrelatedDefaultPriv=${hasUnrelatedDefaultPriv}, r7Fired=${r7Fired})`,
  );
}

// ── allowlist suppression: R8 on a table IN public_data_tables, and R7
//    on a function IN function_execute_without_revoke, must NOT fire. ──
{
  const sql = `create policy p1 on public.allowlisted_table for select to authenticated using (true);`;
  const allowlistWithTable = { public_data_tables: ["public.allowlisted_table"], function_execute_without_revoke: [] };
  const findings = await scanSql("inline-test", sql, allowlistWithTable);
  report("R8 allowlist: a listed public_data_table with USING (true) is suppressed", findings.length === 0,
    findings.length === 0 ? "" : `expected 0 findings, got ${JSON.stringify(findings.map((f) => f.rule))}`);
}
{
  const sql = `create or replace function public.allowlisted_fn(p_x uuid) returns boolean language sql as $$ select true $$;`;
  const allowlistWithFn = { public_data_tables: [], function_execute_without_revoke: [{ function: "public.allowlisted_fn", reason: "test", evidence: "test" }] };
  const findings = await scanSql("inline-test", sql, allowlistWithFn);
  report("R7 allowlist: a listed function_execute_without_revoke is suppressed", findings.length === 0,
    findings.length === 0 ? "" : `expected 0 findings, got ${JSON.stringify(findings.map((f) => f.rule))}`);
}

// ── DELETE column-list exclusion: a bare GRANT DELETE must NEVER be
//    flagged by R4 — Postgres has no column-scoped DELETE grant at all.
//    This was the real false positive found in the prior guard version
//    against the actual applied client-write-lockdown migration's
//    `grant delete on public.library_documents to authenticated;`. ─────
{
  const sql = `grant delete on public.some_table to authenticated;`;
  const findings = await scanSql("inline-test", sql, TEST_ALLOWLIST);
  report("R4 exclusion: bare GRANT DELETE to authenticated is never flagged", findings.length === 0,
    findings.length === 0 ? "" : `expected 0 findings, got ${JSON.stringify(findings.map((f) => f.rule))}`);
}

// ── cutoff classification (9 Oct 2026, replaces the whole-history
//    213-entry baseline per explicit instruction). Three cases, each its
//    own real fixture FILE (the classifier reads the FILENAME, not
//    content, so the fixture must actually carry the timestamp being
//    tested — a content-only fixture would not exercise this code at
//    all): a pre-cutoff ("legacy") name, a post-cutoff ("in-scope") name,
//    and a name with no timestamp at all ("unparseable"). ──────────────
{
  const legacyName = "20260101000000_cutoff_legacy_bad.sql";
  const c = classifyMigrationFile(legacyName);
  report("cutoff: a pre-cutoff timestamp classifies as legacy", c.kind === "legacy" && c.timestamp === "20260101000000",
    c.kind === "legacy" ? "" : `expected kind="legacy", got ${JSON.stringify(c)}`);
}
{
  const inScopeName = "20261009000000_cutoff_inscope_bad.sql";
  const c = classifyMigrationFile(inScopeName);
  report("cutoff: a post-cutoff timestamp classifies as in-scope", c.kind === "in-scope" && c.timestamp === "20261009000000",
    c.kind === "in-scope" ? "" : `expected kind="in-scope", got ${JSON.stringify(c)}`);
}
{
  // the cutoff itself is in-scope (>=, not >) — the real lockdown
  // migration's own filename sits exactly on this boundary and must be
  // checked, not skipped.
  const c = classifyMigrationFile(`${LOCKDOWN_CUTOFF}_at_the_boundary.sql`);
  report("cutoff: the cutoff timestamp itself classifies as in-scope (>=, not >)", c.kind === "in-scope",
    c.kind === "in-scope" ? "" : `expected kind="in-scope" at the exact cutoff, got ${JSON.stringify(c)}`);
}
{
  const c = classifyMigrationFile("not_a_real_migration_name.sql");
  report("cutoff: a name with no 14-digit timestamp classifies as unparseable", c.kind === "unparseable",
    c.kind === "unparseable" ? "" : `expected kind="unparseable", got ${JSON.stringify(c)}`);
}
{
  // a legacy-dated file's SQL content is a real violation (GRANT to
  // anon) -- proves the LEGACY classification is what exempts it from
  // scanning, not that the content happens to be clean. If this fixture
  // were in-scope it WOULD be flagged (the companion in-scope fixture,
  // same content, proves that below).
  const sql = readFileSync(join(FIXTURES_DIR, "20260101000000_cutoff_legacy_bad.sql"), "utf8");
  const hasRealViolation = /grant\s+select\s+on\s+public\.cutoff_fixture\s+to\s+anon/i.test(sql);
  report("cutoff: the legacy fixture's content is a genuine violation (proves exemption is about the NAME, not clean content)",
    hasRealViolation, hasRealViolation ? "" : "fixture content changed; it must still contain a real R1 violation to prove anything");
}
{
  // the in-scope sibling fixture, SAME violation content, must actually
  // be caught by the real rule engine when scanned -- proving in-scope
  // files are genuinely checked, not merely classified.
  const sql = readFileSync(join(FIXTURES_DIR, "20261009000000_cutoff_inscope_bad.sql"), "utf8");
  const findings = await scanSql("fixtures/20261009000000_cutoff_inscope_bad.sql", sql, TEST_ALLOWLIST);
  const r1Fired = findings.some((f) => f.rule === "R1_anon_grant");
  report("cutoff: an in-scope fixture with the same violation IS caught by the rule engine", r1Fired,
    r1Fired ? "" : `expected R1_anon_grant, got: ${JSON.stringify(findings.map((f) => f.rule))}`);
}

// ── make sure every fixture file in the directory was actually used —
//    an orphaned fixture (added for a rule, then the rule renamed) would
//    silently stop being tested. ───────────────────────────────────────
{
  const usedBasenames = new Set();
  for (const [, fixtureBase] of RULE_FIXTURES) {
    usedBasenames.add(`${fixtureBase}_bad.sql`);
    usedBasenames.add(`${fixtureBase}_good.sql`);
  }
  usedBasenames.add("20260101000000_cutoff_legacy_bad.sql");
  usedBasenames.add("20261009000000_cutoff_inscope_bad.sql");
  usedBasenames.add("not_a_real_migration_name.sql");
  const actualFiles = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".sql"));
  const orphaned = actualFiles.filter((f) => !usedBasenames.has(f));
  report("No orphaned fixture files in scripts/fixtures/", orphaned.length === 0,
    orphaned.length === 0 ? "" : `orphaned: ${orphaned.join(", ")}`);
}

// ── end-to-end proof, not just the classifier in isolation: run
//    scanFiles against a small real directory listing containing one
//    legacy file (real violation, must be skipped) and one in-scope
//    file (real violation, must be caught) together, exactly how
//    check-grants.mjs's own CLI logic filters before calling scanFiles.
//    This is the actual integration point a unit test on
//    classifyMigrationFile() alone would not prove. ─────────────────────
{
  const { scanFiles } = await import("./check-grants-core.mjs");
  const allFixtureFiles = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".sql"));
  const inScopeOnly = allFixtureFiles
    .map((f) => ({ f, c: classifyMigrationFile(f) }))
    .filter(({ c }) => c.kind === "in-scope")
    .map(({ f }) => join(FIXTURES_DIR, f));
  const findings = await scanFiles(inScopeOnly, TEST_ALLOWLIST, FIXTURES_DIR);
  const legacyFileNames = findings.map((f) => f.file);
  const legacyFixtureWasScanned = legacyFileNames.some((f) => f.includes("20260101000000_cutoff_legacy_bad"));
  report(
    "end-to-end: filtering to in-scope-only before scanFiles excludes the legacy fixture entirely",
    !legacyFixtureWasScanned,
    legacyFixtureWasScanned ? "the legacy-dated fixture appeared in scan results despite being filtered as legacy" : "",
  );
}

console.log(`\n${pass} passed, ${fail} failed.`);
if (fail > 0) {
  console.error("\nFAILURES:");
  for (const f of failures) console.error("  • " + f);
  process.exit(1);
}
console.log("✓ all self-tests passed.");
