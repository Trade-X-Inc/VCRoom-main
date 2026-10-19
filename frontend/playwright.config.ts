import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "fs";

// SAFE BY DEFAULT. tests/spec-classes.json classifies every spec. Unless CWL_FIXTURES_READY=1, only the "pure" and
// "local" specs are matched, so `npx playwright test` can never touch production: live specs (production, fixtures,
// service role) and any spec not in the manifest (including untracked scratch specs) are not even loaded. Set
// CWL_FIXTURES_READY=1 only when you mean to run live specs against fixtures you created for that purpose.
// scripts/check-live-specs.mjs fails CI if this logic or the manifest drifts.
const classes = JSON.parse(
  readFileSync(new URL("./tests/spec-classes.json", import.meta.url), "utf8"),
) as { pure: string[]; local: string[]; live: string[] };
const liveAllowed = process.env.CWL_FIXTURES_READY === "1";
// "local" specs need a server you started yourself, so they are matched only when A11Y_SCAN_BASE_URL is set.
const safeSpecs = [
  ...classes.pure,
  ...(process.env.A11Y_SCAN_BASE_URL ? classes.local : []),
].map(
  (f) =>
    new RegExp(
      "[\\\\/]" + f.replace(/^tests\//, "").replace(/\./g, "\\.") + "$",
    ),
);

export default defineConfig({
  testDir: "./tests",
  ...(liveAllowed ? {} : { testMatch: safeSpecs }),
  timeout: 45_000,
  retries: 0,
  workers: 1, // Serial — avoids parallel logins on same accounts
  reporter: "line",
  use: {
    headless: true,
    baseURL: "https://lengdon.com",
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
