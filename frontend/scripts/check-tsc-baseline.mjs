// check-tsc-baseline.mjs — CI type-check gate, diffed against a tracked
// baseline rather than a bare `tsc --noEmit` pass/fail.
//
// WHY THIS EXISTS
//
// `npx tsc --noEmit` exits non-zero the moment ANY error exists — it has
// no concept of "pre-existing" vs "new". This project has carried a
// known, tracked set of pre-existing errors throughout its history
// (CLAUDE.md's §5 baseline table — currently 55), verified clean by
// hand before every push all session via an error-SET diff against the
// previous baseline, never by raw exit code or count alone (two
// different 55-sized error sets is not a pass — CLAUDE.md §20.3). A
// naive `tsc --noEmit` CI step would be red from its very first run
// and would stay red until someone either fixed all 55 pre-existing
// errors or disabled the check — neither of which is the actual goal.
// This script reproduces the same set-diff discipline this project's
// own manual checks have always used, as a real CI gate.
//
// METHOD
//
// 1. Run `tsc --noEmit`, capture its full output (ignore its exit code —
//    the diff below is the real verdict, not tsc's own).
// 2. Normalize each error line to `file: error TSxxxx: message`, WITHOUT
//    line:col. Line numbers shift when unrelated code earlier in the
//    same file changes (confirmed in this project's own history — see
//    CLAUDE.md's Group 0 entry, "two pre-existing errors in this file
//    shifted line numbers only, confirmed identical before/after via
//    git stash") — including line:col in the comparison key would make
//    a baseline error falsely register as "new" on any unrelated edit
//    above it in the same file.
// 3. Sort both the baseline file (scripts/tsc-baseline.txt) and the
//    current normalized output, then take a genuine multiset diff (not
//    a set diff) — duplicates matter: the same error text can
//    legitimately occur at two different real call sites in one file,
//    and a THIRD occurrence of an already-duplicated error is a real
//    new error even though its text matches an existing baseline line.
//    Verified this handles all three cases correctly before wiring it
//    in: identical sets diff to zero, a genuinely new error is caught,
//    an error being FIXED (baseline shrinks) also diffs to zero rather
//    than failing.
// 4. Fail ONLY if the current output contains lines not present in the
//    baseline (in multiset terms). A SHRUNK baseline (errors fixed)
//    passes — that's improvement, not a regression — and prints a
//    reminder to update scripts/tsc-baseline.txt so future drift is
//    measured against the new, smaller reality (matching CLAUDE.md §5's
//    own instruction: "If it drops, update this line and record why").

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";

const BASELINE_PATH = "scripts/tsc-baseline.txt";

function normalize(tscOutput) {
  return tscOutput
    .split("\n")
    .filter((line) => line.includes("error TS"))
    .map((line) => line.replace(/\((\d+),(\d+)\): /, ": "))
    .sort();
}

if (!existsSync(BASELINE_PATH)) {
  console.error(`✗ Missing ${BASELINE_PATH} — cannot diff against a baseline that doesn't exist.`);
  process.exit(1);
}

const baseline = readFileSync(BASELINE_PATH, "utf-8")
  .split("\n")
  .filter((l) => l.trim().length > 0)
  .sort();

let tscOutput = "";
try {
  tscOutput = execSync("npx tsc --noEmit", { encoding: "utf-8", stdio: "pipe" });
} catch (e) {
  // tsc exits non-zero when errors exist — that's expected and not
  // itself the failure condition here. Its stdout still has the output.
  tscOutput = (e.stdout || "") + (e.stderr || "");
}

const current = normalize(tscOutput);

// Multiset diff: consume one baseline occurrence per matching current
// line; anything left in `current` after that has no baseline match.
const baselineRemaining = [...baseline];
const newErrors = [];
for (const line of current) {
  const idx = baselineRemaining.indexOf(line);
  if (idx === -1) {
    newErrors.push(line);
  } else {
    baselineRemaining.splice(idx, 1);
  }
}

console.log(`tsc baseline: ${baseline.length} tracked errors. Current run: ${current.length} errors.`);

if (newErrors.length > 0) {
  console.error(`\n✗ ${newErrors.length} NEW tsc error(s) not present in ${BASELINE_PATH}:\n`);
  for (const e of newErrors) console.error("  • " + e);
  console.error(`\nIf these are genuinely new, fix them. If ${BASELINE_PATH} is simply stale (baseline`);
  console.error(`intentionally changed), update it explicitly and record why — see CLAUDE.md §5.\n`);
  process.exit(1);
}

if (current.length < baseline.length) {
  console.log(
    `\n✓ No new errors. Baseline SHRANK (${baseline.length} → ${current.length}) — ` +
    `some pre-existing error(s) were fixed. Update ${BASELINE_PATH} to reflect this ` +
    `and record why in CLAUDE.md §5, per its existing baseline-tracking convention. ` +
    `Not failing CI for this — it's an improvement, not a regression.\n`
  );
} else {
  console.log(`\n✓ No new tsc errors against the tracked baseline.\n`);
}

process.exit(0);
