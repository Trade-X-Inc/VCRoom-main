// check-grants.mjs — CI build gate for Supabase migrations, parser-based.
// SECURITY.md §1.7. Rebuilt twice on 9 Oct 2026: first from regex to a
// real-parser (libpg-query) implementation after the regex version was
// found under adversarial review to miss most of its own required rules;
// then, same day, from a 213-entry whole-history baseline to a CUTOFF
// model, per explicit instruction, because auto-populating 213 "reasons"
// for pre-existing findings without real individual review would have
// made the baseline a rubber stamp rather than a record of actual
// decisions. The actual detection logic (R1-R10) and the cutoff
// classification both live in check-grants-core.mjs, shared with
// check-grants.test.mjs so the tests exercise the exact same code path
// this CLI entry point runs, not a copy that could drift from it.
//
// RULES — see check-grants-core.mjs's header for the full R1-R10
// catalogue and rationale. Each rule has a dedicated self-test fixture
// pair in scripts/fixtures/ and is exercised by check-grants.test.mjs,
// which CI runs BEFORE this guard (see .github/workflows/ci.yml).
//
// SCOPE — CUTOFF MODEL, not a baseline:
//
//   LEGACY   (14-digit timestamp prefix <  LOCKDOWN_CUTOFF, "20261008000000")
//            — not scanned by this guard at all. Governed by live-database
//            audit instead (the Phase 4 inventory; SECURITY.md's per-table
//            findings) — a real, already-applied schema's current grant
//            state is the thing that matters for a legacy migration, not
//            what its original CREATE/GRANT statements said at the time,
//            since later migrations may have already revoked or replaced
//            them. Re-deriving a static finding against SQL text that no
//            longer reflects the live schema would misrepresent risk
//            either direction — see CLAUDE.md's Phase-4-inventory entry,
//            which found `deal_rooms.investor_memo` had already had its
//            9 Aug 2026 write grant replaced, something a static scan of
//            THAT migration alone could not know.
//
//   IN-SCOPE (14-digit timestamp prefix >= LOCKDOWN_CUTOFF) — must produce
//            ZERO findings across all ten rules. No allowlist exception
//            softens this for an in-scope file; grant-allowlist.json only
//            ever suppresses a genuinely-intended public table/function
//            (R7/R8's narrow exceptions), never a whole file. No baseline
//            exception exists for in-scope files at all.
//
//   UNPARSEABLE (filename does not match ^\d{14}_.+\.sql$) — a hard BUILD
//            FAILURE on its own, regardless of what the file's SQL
//            contains. A migration whose name carries no verifiable
//            timestamp cannot be classified as legacy or in-scope, and
//            silently treating it as either direction (skip it as if
//            legacy, or scan it as if in-scope) would be a guess dressed
//            as a decision. This project's own untracked DRAFT_*.sql
//            scratch files are a live instance: presumptively recent by
//            being work-in-progress, but their names carry no timestamp
//            proving that, so they fail the build until renamed into the
//            real migration-naming convention or removed.
//
// grant-baseline.json remains present (loaded, validated) but plays no
// role in deciding pass/fail for in-scope files under this model — kept
// only so the file format exists if a future, different exception
// mechanism is ever wanted; it is NOT consulted to suppress any finding
// today, and is expected to stay empty.
//
// Run from CI (see .github/workflows/ci.yml) as its own job.

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { scanFiles, classifyMigrationFile, LOCKDOWN_CUTOFF } from "./check-grants-core.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "../..");
const MIGRATIONS_DIR = join(REPO_ROOT, "supabase/migrations");
const ALLOWLIST_PATH = join(__dirname, "grant-allowlist.json");
const BASELINE_PATH = join(__dirname, "grant-baseline.json");

// ── allowlist (public_data_tables for R8; function_execute_without_revoke
//    for R7's genuinely-intended-public functions) ─────────────────────
let allowlist = { public_data_tables: [], function_execute_without_revoke: [] };
if (existsSync(ALLOWLIST_PATH)) {
  const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
  for (const key of Object.keys(allowlist)) {
    allowlist[key] = Array.isArray(raw[key]) ? raw[key] : [];
  }
  for (const [bucket, entries] of Object.entries(allowlist)) {
    for (const e of entries) {
      if (typeof e === "string") continue; // public_data_tables is a plain string array
      if (!e.reason || !e.evidence) {
        console.error(`ALLOWLIST: an entry in "${bucket}" is missing "reason" or "evidence" — ${JSON.stringify(e)}.`);
        process.exit(1);
      }
    }
  }
} else {
  console.error(`✗ check-grants: ${ALLOWLIST_PATH} not found. Refusing to run with an undefined allowlist.`);
  process.exit(1);
}

// ── baseline file: present and validated, but NOT consulted to suppress
//    findings on in-scope files under the cutoff model. Must stay empty. ─
if (existsSync(BASELINE_PATH)) {
  const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf8")).findings || [];
  if (baseline.length > 0) {
    console.error(
      `✗ check-grants: ${BASELINE_PATH} has ${baseline.length} entries, but the cutoff model (9 Oct 2026) ` +
      `does not consult the baseline to suppress in-scope findings — a non-empty baseline here is either stale ` +
      `from the pre-cutoff design or a misunderstanding of the current model. It must stay empty; legacy findings ` +
      `are governed by live-database audit (see SECURITY.md), not this file.`,
    );
    process.exit(1);
  }
} else {
  console.error(`✗ check-grants: ${BASELINE_PATH} not found. Refusing to run with an undefined baseline file.`);
  process.exit(1);
}

// ── classify every file in supabase/migrations ──────────────────────────
const allFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();

const unparseable = [];
const legacy = [];
const inScope = [];

for (const f of allFiles) {
  const { kind, timestamp } = classifyMigrationFile(f);
  if (kind === "unparseable") unparseable.push(f);
  else if (kind === "legacy") legacy.push({ f, timestamp });
  else inScope.push({ f, timestamp });
}

console.log(`check-grants: ${allFiles.length} .sql file(s) in supabase/migrations. Cutoff: ${LOCKDOWN_CUTOFF}.`);
console.log(`  legacy (not scanned, governed by live-DB audit): ${legacy.length}`);
console.log(`  in-scope (must have zero findings): ${inScope.length}`);
if (inScope.length > 0) {
  for (const { f, timestamp } of inScope) console.log(`    · ${f} (${timestamp})`);
}

let hardFail = false;

if (unparseable.length > 0) {
  hardFail = true;
  console.error(`\n✗ check-grants FAILED — ${unparseable.length} migration file(s) have an unparseable name (expected ^\\d{14}_.+\\.sql$):`);
  for (const f of unparseable) console.error(`  • ${f}`);
  console.error(
    `\nA migration filename with no verifiable 14-digit timestamp cannot be classified as legacy or in-scope — ` +
    `this is a hard failure regardless of what the file's SQL contains. Rename to the real ` +
    `YYYYMMDDHHMMSS_description.sql convention (timestamp >= ${LOCKDOWN_CUTOFF} if the file is new/WIP work, ` +
    `since a real timestamp is how this guard tells legacy from in-scope) or remove the file.\n`,
  );
}

if (inScope.length === 0 && !hardFail) {
  console.log("\n✓ check-grants passed — no unparseable filenames, no in-scope migrations to check (nothing at or after the cutoff yet).");
  process.exit(0);
}

const inScopePaths = inScope.map(({ f }) => join(MIGRATIONS_DIR, f));
const findings = inScopePaths.length > 0 ? await scanFiles(inScopePaths, allowlist, REPO_ROOT) : [];

if (findings.length > 0) {
  hardFail = true;
  console.error(`\n✗ check-grants FAILED — ${findings.length} finding(s) in IN-SCOPE migration(s) (timestamp >= ${LOCKDOWN_CUTOFF}). Zero tolerance, no baseline exception applies here.\n`);
  for (const f of findings) console.error("  • " + f.message + "\n");
  console.error(
    "Build aborted. Fix the migration, or — only for R7's genuinely-public functions or R8's genuinely-public " +
    "tables — add a reviewed {reason, evidence} entry to grant-allowlist.json. No other rule has an exception path.\n",
  );
}

if (hardFail) process.exit(1);

console.log(`\n✓ check-grants passed — ${inScope.length} in-scope migration(s) scanned with the real PostgreSQL parser, zero findings.`);
