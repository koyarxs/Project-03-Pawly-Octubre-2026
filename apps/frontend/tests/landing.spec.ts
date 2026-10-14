import { expect, test } from "@playwright/test";

test("el carrusel recorre 15 fotos distintas sin contador visible", async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "La propuesta de Pawly" });
  await carousel.getByRole("button", { name: /Pausar rotaci/ }).click();
  await expect(carousel.locator(".carousel-controls")).toHaveCount(0);
  const sources = new Set<string>();
  for (let number = 1; number <= 15; number++) {
    await expect(carousel.getByRole("status")).toHaveText(
      `Imagen ${number} de 15`,
    );
    const picture = carousel.getByRole("img");
    await expect
      .poll(() =>
        picture.evaluate(
          (element) => (element as HTMLImageElement).naturalWidth,
        ),
      )
      .toBeGreaterThan(0);
    sources.add((await picture.getAttribute("src"))!);
    await expect(carousel.locator(".carousel-photo-layer")).toHaveCount(1);
    await carousel.locator(".animal-photo").screenshot({ path: `.next/qa/${testInfo.project.name}-face-${number}.png` });
    if ([2, 7, 15].includes(number))
      await carousel.screenshot({
        path: `.next/qa/${testInfo.project.name}-slide-${number}.png`,
      });
    await carousel
      .getByRole("button", { name: "Diapositiva siguiente" })
      .click();
  }
  expect(sources.size).toBe(15);
  await expect(carousel.getByRole("status")).toHaveText("Imagen 1 de 15");
  await page.keyboard.press("ArrowLeft");
  await expect(carousel.getByRole("status")).toHaveText("Imagen 15 de 15");
  for (const width of [320, 390, 768, 1024, 1100, 1199, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false);
  }
});

test("la rotacion automatica se puede pausar", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  const carousel = page.getByRole("region", { name: "La propuesta de Pawly" });
  await expect(carousel.getByRole("status")).toHaveText("Imagen 1 de 15");
  await carousel.hover({ position: { x: 10, y: 10 } });
  await expect(carousel.getByRole("status")).toHaveText("Imagen 2 de 15", {
    timeout: 12_000,
  });
  await carousel.getByRole("button", { name: "Diapositiva siguiente" }).click();
  await expect(carousel.getByRole("status")).toHaveText("Imagen 3 de 15");
  await expect(carousel.getByRole("status")).toHaveText("Imagen 4 de 15", {
    timeout: 12_000,
  });
  await carousel.getByRole("button", { name: /Pausar rotaci/ }).click();
  await expect(
    carousel.getByRole("button", { name: /Activar rotaci/ }),
  ).toBeVisible();
  await page.clock.install();
  await page.clock.runFor(15000);
  await expect(carousel.getByRole("status")).toHaveText("Imagen 4 de 15");
});

test("header y hero conservan sus acciones y una composición contenida", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const hero = page.locator("#inicio");
  await expect(
    hero.locator(".animal-slide:not([hidden]) .hero-description"),
  ).toHaveText(
    "Organiza pacientes, citas e historiales clínicos en un solo lugar. Más claridad para tu equipo, más tiempo para cuidar.",
  );
  await expect(
    hero.getByRole("link", { name: "Solicitar demostración" }),
  ).toHaveAttribute("href", "#contacto");
  await expect(
    hero.getByRole("link", { name: "Explorar funcionalidades" }),
  ).toHaveAttribute("href", "#funcionalidades");
  await expect(hero.locator("figcaption")).toHaveCount(0);
  await expect(hero.locator(".compact-disclaimer")).toContainText(
    "Datos ficticios",
  );
  for (const width of [320, 390, 768, 1024, 1100, 1199, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const bounds = await page.evaluate(() => {
      const header = document
        .querySelector(".header-inner")!
        .getBoundingClientRect();
      const mockup = document
        .querySelector(".hero-interface")!
        .getBoundingClientRect();
      const next = document.querySelector("#desafios")!.getBoundingClientRect();
      return {
        headerHeight: header.height,
        separate: mockup.bottom < next.top,
      };
    });
    expect(bounds.headerHeight).toBeLessThanOrEqual(132);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const visual = document
            .querySelector("#inicio")!
            .getBoundingClientRect();
          const mockup = document
            .querySelector(".hero-interface")!
            .getBoundingClientRect();
          return mockup.bottom <= visual.bottom + 1;
        }),
      )
      .toBe(true);
    expect(bounds.separate).toBe(true);
    if (width === 1024)
      await page.screenshot({
        path: `.next/qa/${testInfo.project.name}-tablet-hero.png`,
      });
  }
  await page.setViewportSize(testInfo.project.use.viewport!);
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Abrir menú" }).click();
  await page
    .locator(".site-header")
    .getByRole("link", { name: "Solicitar demo", exact: true })
    .click();
  await expect(page).toHaveURL(/#contacto$/);
});

test("la landing tiene destinos reales, metadatos y no desborda", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Menos gestión.Más cuidado.",
  );
  await expect(page).toHaveTitle("Pawly · Menos gestión. Más cuidado.");
  const missing = await page
    .locator('a[href^="#"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href")!)
        .filter((href) => !document.getElementById(href.slice(1))),
    );
  expect(missing).toEqual([]);
  for (const width of [320, 390, 768, 1024, 1100, 1199, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(
      overflow,
      `No debe existir desplazamiento horizontal a ${width}px`,
    ).toBe(false);
  }
  await page.setViewportSize(testInfo.project.use.viewport!);
  await page.screenshot({ path: `.next/qa/${testInfo.project.name}.png` });
  await page.locator(".features-grid").screenshot({
    path: `.next/qa/${testInfo.project.name}-features.png`,
    style: ".site-header { visibility: hidden !important; }",
  });
  await page.locator(".contact-grid").screenshot({
    path: `.next/qa/${testInfo.project.name}-contact.png`,
    style: ".site-header { visibility: hidden !important; }",
  });
  for (const [selector, name] of [
    [".product-introduction", "product-introduction"],
    [".showcase-workspace", "demo"],
    [".solutions-layout", "solutions"],
  ]) {
    await page.locator(selector).screenshot({
      path: `.next/qa/${testInfo.project.name}-${name}.png`,
      style: ".site-header { visibility: hidden !important; }",
    });
  }
  expect(errors).toEqual([]);
});

test("el menú móvil funciona con teclado y enlaces", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Abrir menú" });
  await trigger.click();
  const navigation = page.getByRole("navigation", { name: "Navegación móvil" });
  await expect(navigation).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await navigation.getByRole("link", { name: "Funcionalidades" }).click();
  await expect(page).toHaveURL(/#funcionalidades$/);
  await expect(navigation).toBeHidden();
});

test("la demo y las preguntas responden sin simular datos reales", async ({
  page,
}) => {
  await page.goto("/");
  const demo = page.locator("#demostracion");
  const tabs = demo.getByRole("tab");
  await expect(tabs).toHaveCount(4);
  const panel = demo.getByRole("tabpanel");
  await expect(panel.getByRole("img")).toHaveAttribute(
    "aria-label",
    /Atenciones ficticias/,
  );
  await demo.getByRole("tab", { name: "Pacientes", exact: true }).click();
  await expect(
    demo.getByRole("tab", { name: "Pacientes", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(panel.locator(".demo-patient-grid article")).toHaveCount(3);
  await demo.getByRole("tab", { name: "Agenda", exact: true }).click();
  await expect(
    panel.getByRole("heading", { name: "14 de octubre" }),
  ).toBeVisible();
  await page.keyboard.press("End");
  await expect(demo.getByRole("tab", { name: "Ficha clínica" })).toBeFocused();
  await expect(
    panel.getByRole("heading", { name: "Control preventivo" }),
  ).toBeVisible();
  await page.keyboard.press("Home");
  await expect(demo.getByRole("tab", { name: "Dashboard" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(
    demo.getByRole("tab", { name: "Agenda", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  const question = page
    .locator("details")
    .filter({ hasText: "¿Cuánto costará Pawly?" });
  await question.locator("summary").click();
  await expect(question).toHaveAttribute("open", "");
  await expect(question.locator("p")).toBeVisible();
  await question.locator("summary").click();
  await expect(question).not.toHaveAttribute("open", "");
});

test("la solicitud valida y descarga, sin envío remoto", async ({ page }) => {
  const submitted: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH"].includes(request.method()))
      submitted.push(request.url());
  });
  await page.goto("/#contacto");
  const submit = page.getByRole("button", {
    name: "Descargar solicitud de demo",
  });
  await submit.click();
  expect(
    await page
      .locator(".demo-form")
      .evaluate((form) => (form as HTMLFormElement).checkValidity()),
  ).toBe(false);
  await page
    .getByLabel("Nombre (requerido)", { exact: true })
    .fill("Persona de prueba");
  await page
    .getByLabel("Correo (requerido)", { exact: true })
    .fill("prueba@example.com");
  await page
    .getByLabel("Clínica o consulta (requerido)", { exact: true })
    .fill("Clínica de prueba");
  const downloadPromise = page.waitForEvent("download");
  await submit.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("solicitud-demo-pawly.txt");
  await expect(
    page.getByRole("status").filter({ hasText: "Solicitud preparada" }),
  ).toBeVisible();
  expect(submitted).toEqual([]);
});

test("el acceso tiene formulario y se respeta movimiento reducido", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Saltar al contenido" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#contenido$/);
  await page.goto("/iniciar-sesion");
  await expect(
    page.getByRole("heading", { name: "Qué bueno verte de nuevo." }),
  ).toBeVisible();
  await expect(page.locator("input")).toHaveCount(2);
  await page.getByRole("link", { name: "Volver a Pawly" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("fotografías locales optimizadas y vista previa social", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const photos = page.locator(
    ".animal-slide:not([hidden]) .hero-photo img, .practice-photo img",
  );
  await expect(photos).toHaveCount(2);
  const sources: string[] = [];
  for (const photo of await photos.all()) {
    await photo.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        photo.evaluate((element) => (element as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    expect(await photo.getAttribute("alt")).toBeTruthy();
    sources.push((await photo.getAttribute("src"))!);
  }
  expect(new Set(sources).size).toBe(2);
  expect(sources.every((source) => source.startsWith("/_next/image"))).toBe(
    true,
  );
  const social = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(social).toContain("opengraph-image");
  const response = await request.get(new URL(social!, page.url()).pathname);
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
});
