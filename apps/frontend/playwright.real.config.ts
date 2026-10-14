import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testIgnore: [],
  testMatch: "**/authentication.real.spec.ts",
  webServer: base.webServer,
});
