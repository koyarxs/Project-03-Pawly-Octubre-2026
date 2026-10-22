import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  // Real authorization + DB reads are sequential; include their latency in the
  // DOM wait budget without changing assertions, responses or security limits.
  expect: { timeout: 15000 },
  testIgnore: [],
  testMatch: "**/*.real.spec.ts",
  webServer: {
    command: "node node_modules/next/dist/bin/next start --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      WEBSITE_SERVER_API_URL: "http://localhost:4001/api",
    },
  },
});
