import { expect, test } from "@playwright/test";
import {
  mockPublicWebsite,
  publicWebsiteFixture,
} from "./support/website-fixtures";
test("el sitio oculta las secciones desactivadas sin inventar servicios", async ({
  page,
}) => {
  await mockPublicWebsite(page, {
    ...publicWebsiteFixture,
    showServices: false,
    showAbout: false,
    showHours: false,
    address: "",
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    publicWebsiteFixture.heroTitle,
  );
  await expect(page.locator("#servicios")).toHaveCount(0);
  await expect(page.locator("#nosotros")).toHaveCount(0);
  await expect(
    page.getByText("Horarios de atención", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('a[href="#servicios"]')).toHaveCount(0);
  await expect(page.locator("#contacto")).toBeVisible();
});
test("un sitio sin publicación muestra preparación y no un borrador privado", async ({
  page,
}) => {
  await mockPublicWebsite(page, null);
  await page.goto("/");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "El sitio público está en preparación" }),
  ).toContainText("El sitio público está en preparación");
  await expect(
    page.getByRole("link", { name: "Acceso del equipo" }),
  ).toBeVisible();
  await expect(page.locator("#servicios")).toHaveCount(0);
  await expect(page.getByRole("form")).toHaveCount(0);
  await expect(
    page.getByText(publicWebsiteFixture.email, { exact: true }),
  ).toHaveCount(0);
});
test("los textos administrados se muestran como texto y no se ejecutan como HTML", async ({
  page,
}) => {
  const marker = '<img src=x onerror="window.__siteInjected=true">';
  await mockPublicWebsite(page, {
    ...publicWebsiteFixture,
    aboutText: marker,
    services: [{ title: "Texto seguro", description: marker }],
  });
  await page.goto("/");
  await expect(page.locator("#nosotros")).toContainText(marker);
  await expect(page.locator("#servicios")).toContainText(marker);
  expect(
    await page.evaluate(() => Reflect.get(window, "__siteInjected")),
  ).toBeUndefined();
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
});
