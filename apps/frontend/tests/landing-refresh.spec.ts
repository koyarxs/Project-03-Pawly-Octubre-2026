import { expect, test } from "@playwright/test";
import {
  mockPublicWebsite,
  publicWebsiteFixture,
} from "./support/website-fixtures";

test("los accesos rápidos y el carrusel conservan separación en móvil y escritorio", async ({ page }) => {
  await mockPublicWebsite(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const welcome = page.getByRole("region", { name: "¿Qué necesitas hoy?" });
  await expect(welcome.getByRole("link")).toHaveCount(3);
  await expect(welcome.getByRole("link", { name: /Reserva una atención/ })).toHaveAttribute("href", "/agendar-cita");
  const carousel = page.getByRole("region", { name: "Carrusel de cuidado veterinario", exact: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const hero = (await carousel.boundingBox())!;
    const links = (await welcome.boundingBox())!;
    expect(links.y).toBeGreaterThanOrEqual(hero.y + hero.height - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
});

test("el acceso privado funciona desde escritorio y menú móvil", async ({ page }) => {
  await mockPublicWebsite(page);
  await page.goto("/");
  const mobile = page.viewportSize()!.width <= 600;
  if (mobile) await page.getByRole("button", { name: "Abrir menú" }).click();
  const access = mobile ? page.locator("#navegacion-veterinaria") : page.getByRole("navigation", { name: "Acceso a Pawly" });
  await expect(access.getByRole("link", { name: /Registrarse/ })).toHaveAttribute("href", "/registrarse");
  await access.getByRole("link", { name: /Iniciar sesión/ }).click();
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
  await expect(page.getByRole("button", { name: "Iniciar sesión", exact: true })).toBeVisible();
});

test("la portada sin publicación mantiene accesos y no muestra servicios privados", async ({ page }) => {
  await mockPublicWebsite(page, null);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Su bienestar empieza con una buena decisión.");
  await expect(page.locator("#servicios")).toHaveCount(0);
  await expect(page.locator("#tu-visita")).toBeVisible();
  await expect(page.locator("#ubicacion iframe")).toHaveCount(1);
  await expect(page.getByRole("region", { name: "¿Qué necesitas hoy?" }).getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", /^https:\/\/wa.me\//);
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
    "Su bienestar empieza con una buena decisión.",
  );
  await expect(page.locator("#servicios")).toHaveCount(0);
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
test("el mapa clásico de Google aparece directamente con la dirección configurada", async ({
  page,
}) => {
  let requests = 0;
  await page.route("https://maps.google.com/**", (route) => {
    if (new URL(route.request().url()).searchParams.get("q") === publicWebsiteFixture.address) requests++;
    return route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="es"><title>Mapa QA aislado</title><body>Mapa de prueba</body></html>',
    });
  });
  await mockPublicWebsite(page);
  await page.goto("/");
  const location = page.locator("#ubicacion");
  await expect(page.getByRole("heading", { name: publicWebsiteFixture.aboutTitle, exact: true })).toBeVisible();
  await location.scrollIntoViewIfNeeded();
  await expect(location.locator("iframe")).toHaveCount(1);
  await expect(location.getByRole("button")).toHaveCount(0);
  await expect(location).not.toContainText("Vista ilustrativa");
  const map = location.getByTitle("Mapa de ubicación de la veterinaria");
  await expect(map).toBeVisible();
  const url = new URL((await map.getAttribute("src"))!);
  expect(url.hostname).toBe("maps.google.com");
  expect(url.searchParams.get("q")).toBe(publicWebsiteFixture.address);
  expect(url.searchParams.get("t")).toBe("m");
  await expect(map).toHaveCSS("filter", "none");
  await expect(map).toHaveCSS("opacity", "1");
  await expect.poll(() => requests).toBe(1);
});

test("la ubicación presenta la dirección y el recorrido junto al mapa", async ({ page }, info) => {
  await page.route("https://maps.google.com/**", (route) => route.fulfill({ contentType: "text/html", body: '<html><body style="background:#8bd8ee">Mapa de prueba</body></html>' }));
  await mockPublicWebsite(page, { ...publicWebsiteFixture, address: "C. Veinticinco 26, Valparaíso", hours: "Horario privado que no debe mostrarse", showHours: false, phone: "", email: "" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: publicWebsiteFixture.aboutTitle, exact: true })).toBeVisible();
  const section = page.locator("#ubicacion");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("heading", { name: "El cuidado tiene un lugar." })).toBeVisible();
  await expect(section.locator("address")).toHaveText("C. Veinticinco 26, Valparaíso");
  await expect(section).not.toContainText("Horarios por confirmar");
  await expect(section).not.toContainText("Horario privado que no debe mostrarse");
  await expect(section).not.toContainText("Contactos por confirmar");
  await expect(section).not.toContainText("REFERENCIAS DE VALPARAÍSO");
  const directions = new URL((await section.getByRole("link", { name: "Cómo llegar a la veterinaria", exact: true }).getAttribute("href"))!);
  expect(directions.searchParams.get("destination")).toBe("C. Veinticinco 26, Valparaíso");
  await expect(section.getByRole("link", { name: /Ver punto en Maps/ })).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  await page.setViewportSize(info.project.use.viewport!);
  await section.locator("img").evaluateAll((images) => Promise.all(images.map((image) => { const photo = image as HTMLImageElement; photo.loading = "eager"; return photo.decode(); })));
  await section.screenshot({ path: info.outputPath("ubicacion-color.png") });
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
