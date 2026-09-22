/**
 * Playwright tests: axe-core accessibility scan (report-only)
 *
 * Runs @axe-core/playwright against a small, deliberately narrow set of
 * unauthenticated routes — the ones that serve a stable 200 with no
 * session and no secrets, on a freshly built local worker
 * (`wrangler pages dev`, never `vite dev` — see CLAUDE.md's standing
 * rule on this). Authenticated /app/* routes are out of scope for this
 * pass: they need the same session-injection pattern the other 56
 * secret-gated specs in this directory already require, which is what
 * keeps those specs out of CI in the first place.
 *
 * Deliberately targets `A11Y_SCAN_BASE_URL` (default localhost, the
 * server this project's own CI build step stands up) rather than
 * playwright.config.ts's `baseURL` (hardcoded to production) — this
 * scan needs to test THIS build, not whatever happens to be live.
 *
 * REPORT-ONLY: this file never asserts on violation counts and never
 * fails the test run on a finding. It prints every violation with
 * enough detail to act on (rule id, impact, node count, and each
 * node's HTML + target selector) and lets CI show that in the job log.
 * No baseline exists yet for what this flags across the app, so a hard
 * gate here risks blocking unrelated work or forcing a rushed mass-fix
 * — see CLAUDE.md's ACCESSIBILITY-CHECKLIST.md entry. Promote to a
 * real assertion (and only then can violations fail the build) once a
 * real report has been reviewed and triaged.
 */

import { test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.A11Y_SCAN_BASE_URL ?? "http://localhost:8788";

// Unauthenticated routes only — see file header. Kept deliberately small;
// this is a starting scope, not full route coverage in one pass.
const ROUTES = ["/", "/sign-in", "/sign-up", "/legal/privacy", "/for/founders"];

test.describe("Accessibility scan (axe-core, report-only)", () => {
  for (const route of ROUTES) {
    test(`axe: ${route}`, async ({ page }) => {
      await page.goto(BASE + route, { waitUntil: "networkidle" });
      const results = await new AxeBuilder({ page }).analyze();

      console.log(`\n=== axe scan: ${route} ===`);
      console.log(`Violations: ${results.violations.length}`);
      for (const v of results.violations) {
        console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
        for (const node of v.nodes) {
          console.log(`      target: ${JSON.stringify(node.target)}`);
          console.log(`      html: ${node.html.slice(0, 200)}`);
        }
      }
      console.log(`Incomplete (needs manual review): ${results.incomplete.length}`);
      for (const v of results.incomplete) {
        console.log(`  [incomplete] ${v.id}: ${v.help} (${v.nodes.length} node(s))`);
      }
      console.log(`Passes: ${results.passes.length}`);

      // No expect() on violations — see file header. This test always
      // passes as long as the page loads and axe itself runs cleanly.
    });
  }
});
