import { expect, test } from "@playwright/test";
import {
  mockPublicWebsite,
  publicWebsiteFixture,
} from "./support/website-fixtures";

test("la bienvenida sigue al carrusel sin cubrir las imágenes y conserva sus cuatro valores", async ({ page }) => {
  await mockPublicWebsite(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const welcome = page.getByRole("region", { name: "Más que compañía, una vida más feliz." });
  await expect(welcome.getByRole("list", { name: "Compañeros de vida" }).getByRole("listitem")).toHaveCount(4);
  await expect(welcome.getByRole("link", { name: "Agendar cita" })).toHaveAttribute("href", "/agendar-cita");
  const carousel = page.getByRole("region", { name: "Carrusel de cuidado veterinario", exact: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await carousel.focus();
    await page.keyboard.press("Home");
    for (let slide = 0; slide < 3; slide++) {
      const image = carousel.getByRole("img");
      await expect(image).toHaveCSS("object-fit", "contain");
      const imageBox = (await image.boundingBox())!;
      const welcomeBox = (await welcome.boundingBox())!;
      expect(welcomeBox.y).toBeGreaterThanOrEqual(imageBox.y + imageBox.height - 1);
      await page.keyboard.press("ArrowRight");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
});

test("las letras del logo crecen al bajar sin desplazar la cabecera", async ({ page }) => {
  await mockPublicWebsite(page);
  await page.goto("/");
  const header = page.locator("header");
  const wordmark = header.getByRole("img", { name: "Clínica Veterinaria Porvenir", exact: true }).locator("..");
  await expect(header).toHaveAttribute("data-scrolled", "false");
  const initial = (await wordmark.boundingBox())!.width;
  const height = (await header.boundingBox())!.height;
  await page.evaluate(() => window.scrollTo({ top: 450, behavior: "instant" }));
  await expect(header).toHaveAttribute("data-scrolled", "true");
  await expect.poll(async () => (await wordmark.boundingBox())!.width).toBeGreaterThan(initial + 10);
  expect((await header.boundingBox())!.height).toBe(height);
  await expect(header.getByRole("link", { name: "Iniciar sesión", exact: true })).toBeInViewport();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(wordmark).toHaveCSS("transition-duration", "0s");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(header).toHaveAttribute("data-scrolled", "false");
  expect((await wordmark.boundingBox())!.width).toBeCloseTo(initial, 0);
});

test("los accesos al sistema están visibles en la cabecera sin abrir el menú", async ({
  page,
}) => {
  await mockPublicWebsite(page);
  await page.goto("/");
  const access = page.getByRole("navigation", { name: "Acceso a Pawly" });
  const logo = page.locator("header").getByRole("img", { name: "Clínica Veterinaria Porvenir", exact: true });
  await expect(logo).toBeVisible();
  await expect.poll(() => logo.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const login = access.getByRole("link", { name: "Iniciar sesión", exact: true });
  const register = access.getByRole("link", { name: "Registrarse", exact: true });
  await expect(login).toBeVisible();
  await expect(register).toBeVisible();
  await expect(login).toHaveAttribute("href", "/iniciar-sesion");
  await expect(register).toHaveAttribute("href", "/registrarse");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    .toBe(true);
  await login.click();
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
  await expect(page.getByRole("img", { name: "Clínica Veterinaria Porvenir", exact: true })).toBeVisible();
  await page.goto("/");
  await page.getByRole("navigation", { name: "Acceso a Pawly" })
    .getByRole("link", { name: "Registrarse", exact: true }).click();
  await expect(page).toHaveURL(/\/registrarse$/);
});

test("la portada editorial se ve sin publicar borradores ni inventar contactos", async ({
  page,
}) => {
  await mockPublicWebsite(page, null);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Su bienestar empieza con una buena decisión.",
  );
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "El sitio público está en preparación" }),
  ).toHaveCount(0);
  await expect(
    page
      .locator("#companeros")
      .getByRole("group", { name: "Elegir tipo de mascota" })
      .getByRole("button"),
  ).toHaveCount(5);
  await expect(
    page.getByRole("region", { name: "Cinco formas de querer sin medida." }),
  ).toBeVisible();
  const locationLink = page.locator("#ubicacion").getByRole("link", {name: "Ver en Google Maps", exact: true});
  expect(new URL((await locationLink.getAttribute("href"))!).searchParams.get("query")).toBe("C. Veinticinco 26, Valparaíso");
  await expect(page.locator("#servicios")).toHaveCount(0);
  await expect(
    page.locator(
      'a[href^="tel:"],a[href^="mailto:"],a[href^="https://wa.me/"]',
    ),
  ).toHaveCount(0);
  await expect(page.locator("#ubicacion iframe")).toHaveCount(1);
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

test("la galería abre una fotografía real, restaura el foco y conserva cinco opciones en móvil", async ({ page }) => {
  await mockPublicWebsite(page);
  await page.goto("/");
  const gallery = page.locator("#companeros");
  const open = gallery.getByRole("button", { name: "Ver fotografía", exact: true });
  await open.click();
  const dialog = page.getByRole("dialog", { name: "Fotografía de perros", exact: true });
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.getByRole("img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => dialog.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return Math.max(Math.abs(box.x + box.width / 2 - innerWidth / 2), Math.abs(box.y + box.height / 2 - innerHeight / 2));
    })).toBeLessThanOrEqual(1);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(open).toBeFocused();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(gallery.getByRole("group", { name: "Elegir tipo de mascota" }).getByRole("button")).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  await expect(gallery.getByRole("button", { name: "Ver video" })).toHaveCount(0);
});

test("la galería comparte márgenes con la bienvenida y alinea la altura de foto y ficha", async ({ page }) => {
  await mockPublicWebsite(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const gallery = page.locator("#companeros");
  const values = page.getByRole("list", { name: "Compañeros de vida", exact: true });
  const choices = gallery.getByRole("group", { name: "Elegir tipo de mascota" });
  for (const width of [320, 390, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1100 });
    const above = (await values.boundingBox())!;
    const below = (await choices.boundingBox())!;
    const heading = (await gallery.getByRole("heading", { level: 2 }).boundingBox())!;
    expect(Math.abs(above.x - below.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(above.width - below.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(heading.x - above.x)).toBeLessThanOrEqual(1);
    if (width > 1000) {
      let previousHeight: number | undefined;
      for (const button of await choices.getByRole("button").all()) {
        await button.click();
        const photo = (await gallery.getByRole("img", { name: /Fotografía ilustrativa/ }).locator("..").boundingBox())!;
        const story = (await gallery.locator('[aria-live="polite"]').boundingBox())!;
        expect(Math.abs(photo.y - story.y)).toBeLessThanOrEqual(1);
        expect(Math.abs(photo.height - story.height)).toBeLessThanOrEqual(1);
        if (previousHeight !== undefined) expect(Math.abs(photo.height - previousHeight)).toBeLessThanOrEqual(1);
        previousHeight = photo.height;
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
});
test("los testimonios ficticios se identifican y permiten recorrer seis ejemplos", async ({
  page,
}) => {
  await mockPublicWebsite(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const section = page.locator("#testimonios");
  await expect(section).toContainText("DEMOSTRACIÓN · TESTIMONIOS FICTICIOS");
  await expect(section).toContainText(
    "No corresponden a clientes ni atenciones reales.",
  );
  for (const name of [
    "Catalina Fuentes",
    "Rodrigo Mella",
    "Isabel Arancibia",
    "Andrés Salinas",
    "Paula Vergara",
    "Felipe Rojas",
  ]) {
    await expect(section.getByText(name, { exact: true })).toBeVisible();
    await section.getByRole("button", { name: "Testimonio siguiente" }).click();
  }
  await expect(
    section.getByText("Catalina Fuentes", { exact: true }),
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

test("la ubicación conserva las mascotas y el mapa sin franjas ni tarjetas adicionales", async ({ page }, info) => {
  await page.route("https://maps.google.com/**", (route) => route.fulfill({ contentType: "text/html", body: '<html><body style="background:#8bd8ee">Mapa de prueba</body></html>' }));
  await mockPublicWebsite(page, { ...publicWebsiteFixture, address: "C. Veinticinco 26, Valparaíso", hours: "Horario privado que no debe mostrarse", showHours: false, phone: "", email: "" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: publicWebsiteFixture.aboutTitle, exact: true })).toBeVisible();
  const section = page.locator("#ubicacion");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("heading", { name: "Un lugar pensado para su bienestar." })).toBeVisible();
  await expect(section).not.toContainText("Horarios por confirmar");
  await expect(section).not.toContainText("Horario privado que no debe mostrarse");
  await expect(section).not.toContainText("Contactos por confirmar");
  await expect(section).not.toContainText("REFERENCIAS DE VALPARAÍSO");
  await expect(section.getByRole("img", { name: /perro y un gato descansando/ })).toBeVisible();
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
