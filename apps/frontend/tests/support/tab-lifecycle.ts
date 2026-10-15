import type { Page } from "@playwright/test";

export async function returnToTab(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true, get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", {
      configurable: true, get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
}
