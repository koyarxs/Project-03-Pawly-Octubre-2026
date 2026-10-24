import { expect, test } from "@playwright/test";
import { mockPublicWebsite, publicWebsiteFixture } from "./support/website-fixtures";
import type { Page } from "@playwright/test";

async function openReviews(page: Page) {
  await page.goto("/");
  // Wait for the public fixture to replace the initial editorial shell before scrolling.
  await expect(page.getByRole("heading", { name: publicWebsiteFixture.aboutTitle, exact: true })).toBeVisible();
  const section = page.locator("#testimonios");
  await section.scrollIntoViewIfNeeded();
  return section;
}

test("las seis cartas de ejemplo tienen retratos propios, estrellas y navegación responsive", async ({ page }, info) => {
  await mockPublicWebsite(page, { ...publicWebsiteFixture, address: "C. Veinticinco 26, Valparaíso" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const section = await openReviews(page);
  const carousel = section.getByRole("region", { name: "Testimonios de las familias" });
  await expect(section.getByRole("article")).toHaveCount(6);
  await expect(section.getByRole("img", { name: "Valoración ilustrativa: 5 de 5 estrellas", exact: true })).toHaveCount(6);
  const portraits = section.getByRole("img", { name: /^Retrato ficticio de / });
  await expect(portraits).toHaveCount(6);
  const scenes = section.getByRole("img", { name: /^Escena ficticia de / });
  await expect(scenes).toHaveCount(6);
  expect(new Set(await scenes.evaluateAll((images) => images.map((image) => image.getAttribute("src")))).size).toBe(6);
  expect(new Set(await portraits.evaluateAll((images) => images.map((image) => image.getAttribute("src")))).size).toBe(6);
  await expect(section.getByText(/no son reseñas de Google/)).toBeVisible();
  const maps = new URL((await section.getByRole("link", { name: "Encontrarnos en Google Maps" }).getAttribute("href"))!);
  expect(maps.searchParams.get("query")).toBe("C. Veinticinco 26, Valparaíso");
  await carousel.focus();
  await page.keyboard.press("End");
  await expect(section.getByRole("button", { name: "Ir al testimonio de Felipe Rojas" })).toHaveAttribute("aria-pressed", "true");
  await section.getByRole("button", { name: "Testimonio siguiente" }).click();
  await expect(section.getByRole("button", { name: "Ir al testimonio de Catalina Fuentes" })).toHaveAttribute("aria-pressed", "true");
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    const boxes = await section.getByRole("article").evaluateAll((cards) => cards.map((card) => card.getBoundingClientRect().width));
    expect(Math.max(...boxes) - Math.min(...boxes)).toBeLessThan(1);
    const container = await carousel.boundingBox();
    expect(boxes[0]).toBeLessThanOrEqual(container!.width);
  }
  await page.setViewportSize(info.project.use.viewport!);
  await section.locator("img").evaluateAll((images) => Promise.all(images.map((image) => { const photo = image as HTMLImageElement; photo.loading = "eager"; return photo.decode(); })));
  await section.screenshot({ path: info.outputPath("testimonios-nocturnos.png") });
});

test("Google conserva autores, enlaces, puntuaciones bajas y reemplaza los ejemplos", async ({ page }) => {
  await mockPublicWebsite(page);
  await page.route("**/api/google-reviews", (route) => route.fulfill({ json: { status: "ready", placeName: "Clínica QA Google", rating: 3.5, total: 18, mapsUrl: "https://www.google.com/maps?cid=123", reviews: [
    { author: "Autor real simulado QA", authorUrl: "https://www.google.com/maps/contrib/123", reviewUrl: "https://www.google.com/maps/reviews/123", quote: '<img src=x onerror="window.__reviewInjected=true">', rating: 2, date: "Hace una semana", translated: false },
    { author: "Otra autora QA", quote: "Texto de prueba de Google", rating: 5, date: "Hace un mes", translated: true },
  ] } }));
  const section = await openReviews(page);
  await expect(section.getByRole("article")).toHaveCount(2);
  await expect(section.getByRole("img", { name: /^Escena ficticia de / })).toHaveCount(0);
  await expect(section).not.toContainText("TESTIMONIOS FICTICIOS");
  await expect(section).not.toContainText("Catalina Fuentes");
  await expect(section.getByRole("img", { name: "2 de 5 estrellas", exact: true })).toBeVisible();
  await expect(section.getByRole("link", { name: "Autor real simulado QA" })).toHaveAttribute("href", "https://www.google.com/maps/contrib/123");
  await expect(section.getByRole("link", { name: "Ver reseña original" })).toHaveAttribute("href", "https://www.google.com/maps/reviews/123");
  await expect(section).toContainText("Ordenadas por relevancia de Google. Sin filtro por puntuación.");
  await expect(section).toContainText('<img src=x onerror="window.__reviewInjected=true">');
  expect(await page.evaluate(() => Reflect.get(window, "__reviewInjected"))).toBeUndefined();
});

test("una ficha Google sin reseñas no se rellena con identidades ficticias", async ({ page }) => {
  await mockPublicWebsite(page);
  await page.route("**/api/google-reviews", (route) => route.fulfill({ json: { status: "ready", placeName: "QA", reviews: [] } }));
  const section = await openReviews(page);
  await expect(section).toContainText("Esta ficha todavía no tiene reseñas disponibles.");
  await expect(section.getByRole("article")).toHaveCount(0);
  await expect(section).not.toContainText("TESTIMONIOS FICTICIOS");
});

test("un fallo de Google conserva los testimonios publicados sin añadir estrellas inventadas", async ({ page }) => {
  await mockPublicWebsite(page, { ...publicWebsiteFixture, testimonials: [{ author: "Testimonio autorizado QA", companion: "Familia QA", quote: "Texto publicado de prueba." }] });
  await page.route("**/api/google-reviews", (route) => route.fulfill({ status: 503, json: { status: "unavailable", reviews: [] } }));
  const section = await openReviews(page);
  await expect(section.getByRole("status")).toContainText("No pudimos cargar");
  await expect(section.getByRole("article")).toHaveCount(1);
  await expect(section.getByRole("img", { name: /estrellas/ })).toHaveCount(0);
  await expect(section).toContainText("Testimonio autorizado QA");
});

test("el avance automático permite pausar y respeta movimiento reducido", async ({ page }) => {
  await mockPublicWebsite(page);
  await page.clock.install();
  const section = await openReviews(page);
  await section.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  const first = section.getByRole("button", { name: "Ir al testimonio de Catalina Fuentes" });
  const second = section.getByRole("button", { name: "Ir al testimonio de Rodrigo Mella" });
  await expect(first).toHaveAttribute("aria-pressed", "true");
  await page.clock.runFor(7100);
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await section.getByRole("button", { name: "Pausar testimonios" }).click();
  await page.clock.runFor(8000);
  await expect(second).toHaveAttribute("aria-pressed", "true");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(section.getByRole("button", { name: /Reproducir testimonios|Pausar testimonios/ })).toHaveCount(0);
});
