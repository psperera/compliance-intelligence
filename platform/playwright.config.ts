import { defineConfig, devices } from "@playwright/test";

// Smoke tests drive the self-contained prototype (../compliance-intelligence.html)
// directly over file://. No server needed. For the full Next.js app, set webServer below.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // webServer: { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI },
});
