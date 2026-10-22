import { expect, test } from "@playwright/test";
import {
  mockPublicWebsite,
  publicWebsiteFixture,
} from "./support/website-fixtures";

test("la portada editorial se ve sin publicar borradores ni inventar contactos", async ({
  page,
}) => {
  await mockPublicWebsite(page, null);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "El amor deja huellas. El cuidado, también.",
  );
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "El sitio público está en preparación" }),
  ).toBeVisible();
  await expect(
    page
      .locator("#companeros")
      .getByRole("group", { name: "Elegir tipo de mascota" })
      .getByRole("button"),
  ).toHaveCount(5);
  await expect(
    page.getByRole("region", { name: "Cinco formas de querer sin medida." }),
  ).toBeVisible();
  await expect(page.locator("#ubicacion")).toContainText(
    "C. Veinticinco 26, Valparaíso",
  );
  await expect(page.locator("#servicios")).toHaveCount(0);
  await expect(
    page.locator(
      'a[href^="tel:"],a[href^="mailto:"],a[href^="https://wa.me/"]',
    ),
  ).toHaveCount(0);
  await expect(page.locator("iframe")).toHaveCount(0);
});
test("un fallo de API informa el problema y mantiene el diseño sin borradores", async ({
  page,
}) => {
  await page.route("**/api/website", (route) =>
    route.fulfill({
      status: 503,
      headers: { "Access-Control-Allow-Origin": "*" },
      contentType: "application/json",
      body: "{}",
    }),
  );
  await page.goto("/");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "No pudimos actualizar el contenido" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "El amor deja huellas. El cuidado, también.",
  );
  await expect(page.locator("#servicios")).toHaveCount(0);
});
test("las cinco mascotas muestran sus razas o especie y la navegación mantiene el foco", async ({
  page,
}) => {
  await mockPublicWebsite(page);
  await page.goto("/");
  const gallery = page.locator("#companeros"),
    group = gallery.getByRole("group", { name: "Elegir tipo de mascota" });
  for (const [species, breed] of [
    ["Perros", "Golden retriever"],
    ["Gatos", "Persa"],
    ["Conejos", "Enano · Bélier"],
    ["Cobayos", "Americano · Abisinio"],
    ["Aves", "Ninfa / carolina"],
  ]) {
    const control = group.getByRole("button", { name: new RegExp(species) });
    await control.click();
    await expect(control).toHaveAttribute("aria-pressed", "true");
    await expect(control).toBeFocused();
    await expect(gallery.getByText(breed, { exact: true })).toBeVisible();
    const photo = gallery.getByRole("img", { name: /Fotografía ilustrativa/ });
    await expect
      .poll(() => photo.evaluate((el) => (el as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await expect(gallery.locator('button[aria-pressed="true"]')).toHaveCount(1);
  }
  await gallery
    .getByRole("button", { name: "Mascota siguiente", exact: true })
    .click();
  await expect(
    gallery.getByText("Golden retriever", { exact: true }),
  ).toBeVisible();
  await gallery
    .getByRole("button", { name: "Mascota anterior", exact: true })
    .click();
  await expect(
    gallery.getByText("Ninfa / carolina", { exact: true }),
  ).toBeVisible();
});
test("los testimonios ficticios se identifican y permiten recorrer tres ejemplos", async ({
  page,
}) => {
  await mockPublicWebsite(page);
  await page.goto("/");
  const section = page.locator("#testimonios");
  await expect(section).toContainText("DEMOSTRACIÓN · TESTIMONIOS FICTICIOS");
  await expect(section).toContainText(
    "No corresponden a clientes ni atenciones reales.",
  );
  for (const name of [
    "Camila · ejemplo",
    "Tomás · ejemplo",
    "Valentina · ejemplo",
  ]) {
    await expect(section.getByText(name, { exact: true })).toBeVisible();
    await section.getByRole("button", { name: "Testimonio siguiente" }).click();
  }
  await expect(
    section.getByText("Camila · ejemplo", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('[itemtype*="AggregateRating"]')).toHaveCount(0);
});
test("los testimonios publicados reemplazan la demostración y los textos son seguros", async ({
  page,
}) => {
  const quote = '<img src=x onerror="window.__reviewInjected=true">';
  await mockPublicWebsite(page, {
    ...publicWebsiteFixture,
    testimonials: [
      { author: "Responsable QA", companion: "Mascota QA", quote },
    ],
  });
  await page.goto("/");
  const section = page.locator("#testimonios");
  await expect(section).toContainText(quote);
  await expect(section).not.toContainText("TESTIMONIOS FICTICIOS");
  await expect(section.getByRole("button")).toHaveCount(0);
  expect(
    await page.evaluate(() => Reflect.get(window, "__reviewInjected")),
  ).toBeUndefined();
});
test("el mapa usa la dirección configurada y solo carga tras una acción explícita", async ({
  page,
}) => {
  let requests = 0;
  await page.route("https://maps.google.com/**", (route) => {
    requests++;
    return route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="es"><title>Mapa QA aislado</title><body>Mapa de prueba</body></html>',
    });
  });
  await mockPublicWebsite(page);
  await page.goto("/");
  const location = page.locator("#ubicacion");
  await location.scrollIntoViewIfNeeded();
  await expect(location.locator("iframe")).toHaveCount(0);
  expect(requests).toBe(0);
  await location.getByRole("button", { name: "Explorar mapa" }).click();
  const map = location.getByTitle("Mapa de ubicación de la veterinaria");
  await expect(map).toBeVisible();
  const url = new URL((await map.getAttribute("src"))!);
  expect(url.hostname).toBe("maps.google.com");
  expect(url.searchParams.get("q")).toBe(publicWebsiteFixture.address);
  await expect.poll(() => requests).toBe(1);
});
test("sin dirección el mapa no inventa una ubicación ni ofrece cargarla", async ({
  page,
}) => {
  await mockPublicWebsite(page, { ...publicWebsiteFixture, address: "" });
  await page.goto("/");
  const location = page.locator("#ubicacion");
  await expect(location).toContainText("Ubicación por confirmar");
  await expect(location.getByRole("button")).toHaveCount(0);
  await expect(location.locator("iframe")).toHaveCount(0);
});
