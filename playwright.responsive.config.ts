import { defineConfig, devices } from "@playwright/test";

// Mobile-responsiveness QA harness (Phase 3).
//
// Deliberately separate from playwright.config.ts, which is Lovable's
// agent-managed config — this one owns the funnel's cross-device viewport matrix
// and nothing else. Run it with `npm run test:responsive`.
//
// Every project below is Chromium so the only prerequisite is
// `npx playwright install chromium`. Real iOS Safari coverage is opt-in via
// PW_WEBKIT=1 (needs `npx playwright install webkit`), because Safari is the
// one engine where safe-area insets and 100vh behave differently.

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:8080";

const webkitProjects = process.env.PW_WEBKIT
  ? [
      {
        name: "mobile-safari",
        use: { ...devices["iPhone 13"] },
      },
      {
        name: "tablet-safari",
        use: { ...devices["iPad Mini"] },
      },
    ]
  : [];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      // 320px — the narrowest viewport still in real use (iPhone SE 1st gen).
      // This is the canary for horizontal overflow; if anything is going to
      // break the "no sideways scroll" rule, it breaks here first.
      name: "mobile-small",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 320, height: 568 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 820, height: 1180 },
        hasTouch: true,
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    ...webkitProjects,
  ],
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
