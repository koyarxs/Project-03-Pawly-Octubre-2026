import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  // Real authorization + DB reads are sequential; include their latency in the
  // DOM wait budget without changing assertions, responses or security limits.
  expect: { timeout: 15000 },
  testIgnore: [],
  testMatch: "**/*.real.spec.ts",
  webServer: base.webServer,
});
