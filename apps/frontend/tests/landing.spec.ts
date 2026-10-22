import { expect, test } from "@playwright/test";
import {
  mockPublicWebsite,
  publicWebsiteFixture,
} from "./support/website-fixtures";

test.beforeEach(async ({ page }) => {
  await mockPublicWebsite(page);
});
test("la portada de Porvenir presenta el contenido publicado y metadatos propios", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Clínica Veterinaria Porvenir");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    publicWebsiteFixture.heroTitle,
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    "content",
    "es_CL",
  );
  const canonical = new URL(
    (await page.locator('link[rel="canonical"]').getAttribute("href"))!,
  );
  expect(canonical.pathname).toBe("/");
  expect(canonical.search).toBe("");
  expect(canonical.hash).toBe("");
  const missing = await page
    .locator('a[href^="#"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href")!)
        .filter((href) => !document.getElementById(href.slice(1))),
    );
  expect(missing).toEqual([]);
  await expect(page.locator("#servicios").getByRole("article")).toHaveCount(3);
  await expect(page.locator("#contacto")).toContainText(
    publicWebsiteFixture.hours,
  );
});
test("el sitio conserva legibilidad y acciones sin desbordamiento entre 320 y 1440", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    publicWebsiteFixture.heroTitle,
  );
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Ancho ${width}`,
    ).toBe(true);
    await expect(
      page
        .locator("#inicio")
        .getByRole("link", { name: "Conversemos sobre su cuidado" }),
    ).toBeVisible();
  }
  await page.setViewportSize(info.project.use.viewport!);
  await page.screenshot({
    path: `.next/qa/${info.project.name}-porvenir-landing.png`,
    fullPage: true,
  });
});
test("el menú móvil funciona con teclado, Escape y selección de sección", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Abrir menú", exact: true });
  const nav = page.getByRole("navigation", { name: "Navegación móvil" });
  await trigger.click();
  await expect(
    page.getByRole("button", { name: "Cerrar menú", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(nav).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(nav).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await nav.getByRole("link", { name: "Servicios", exact: true }).click();
  await expect(page).toHaveURL(/#servicios$/);
  await expect(nav).toBeHidden();
});
test("la navegación móvil se cierra al salir del encabezado y al pasar a escritorio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navegación móvil" });
  await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
  await nav.getByRole("link", { name: "Contacto y horarios" }).focus();
  await page.keyboard.press("Tab");
  await expect(nav).toBeHidden();
  await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
  await page.setViewportSize({ width: 1024, height: 1000 });
  await expect(nav).toBeHidden();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
});
test("el contacto usa canales configurados y enlaces externos seguros", async ({
  page,
}) => {
  await page.goto("/");
  const contact = page.locator("#contacto");
  await expect(
    contact.getByRole("link", {
      name: publicWebsiteFixture.phone,
      exact: true,
    }),
  ).toHaveAttribute("href", "tel:+56912345678");
  await expect(
    contact.getByRole("link", {
      name: publicWebsiteFixture.email,
      exact: true,
    }),
  ).toHaveAttribute("href", "mailto:contact%40example.invalid");
  const whatsapp = contact.getByRole("link", { name: /Escribir por WhatsApp/ });
  await expect(whatsapp).toHaveAttribute("href", "https://wa.me/56912345678");
  await expect(whatsapp).toHaveAttribute("rel", /noopener/);
  const map = contact.getByRole("link", { name: /Ver ubicación en el mapa/ });
  const target = new URL((await map.getAttribute("href"))!);
  expect(target.searchParams.get("query")).toBe(publicWebsiteFixture.address);
  await expect(map).toHaveAttribute("target", "_blank");
});
test("la portada es de la veterinaria y conduce al acceso privado sin vender suscripciones", async ({
  page,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method()))
      writes.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    publicWebsiteFixture.heroTitle,
  );
  await expect(page.getByRole("form")).toHaveCount(0);
  await expect(page.locator('a[href="/registrarse"]')).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(
    /suscripciones|software SaaS|precio por definir|registrar mi clínica/i,
  );
  await page.getByRole("link", { name: "Acceso del equipo" }).click();
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
  await expect(
    page.getByRole("form", { name: "Inicio de sesión" }),
  ).toBeVisible();
  expect(writes).toEqual([]);
});
test("el enlace de salto y el movimiento reducido evitan animaciones automáticas", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    publicWebsiteFixture.heroTitle,
  );
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", {
    name: "Saltar al contenido",
    exact: true,
  });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#contenido-veterinaria$/);
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  await expect(
    page.getByRole("button", {
      name: "Reproducción automática desactivada por movimiento reducido",
    }),
  ).toBeDisabled();
  await expect
    .poll(() =>
      page
        .locator("main")
        .evaluate(
          (main) =>
            main
              .getAnimations({ subtree: true })
              .filter((animation) => animation.playState === "running").length,
        ),
    )
    .toBe(0);
});
test("las fotografías son locales, optimizadas y cargan con textos alternativos", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const carousel = page.getByRole("region", {
    name: "Carrusel de cuidado veterinario",
    exact: true,
  });
  await expect(carousel).toBeVisible();
  const sources = new Set<string>();
  for (const number of [1, 2, 3]) {
    await carousel
      .getByRole("button", { name: new RegExp(`^Ver fotografía ${number}:`) })
      .click();
    const image = carousel.getByRole("img");
    await expect
      .poll(() =>
        image.evaluate((element) => (element as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    await expect(image).toHaveAttribute("alt", /.+/);
    const url = new URL((await image.getAttribute("src"))!, page.url());
    expect(url.pathname).toBe("/_next/image");
    sources.add(url.searchParams.get("url")!);
  }
  const about = page.locator("#nosotros").getByRole("img");
  await about.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      about.evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  sources.add(
    new URL((await about.getAttribute("src"))!, page.url()).searchParams.get(
      "url",
    )!,
  );
  expect(sources.size).toBe(4);
  for (const source of sources) expect(source).toMatch(/^\/images\/.+\.webp$/);
  expect(errors).toEqual([]);
});
test("la imagen social se publica como PNG válido", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const social = new URL(
    (await page.locator('meta[property="og:image"]').getAttribute("content"))!,
    page.url(),
  );
  const response = await request.get(`${social.pathname}${social.search}`);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
});
