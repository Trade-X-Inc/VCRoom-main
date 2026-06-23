import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  retries: 0,
  workers: 1, // Serial — avoids parallel logins on same accounts
  reporter: "line",
  use: {
    headless: true,
    baseURL: "https://hockystick.app",
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
