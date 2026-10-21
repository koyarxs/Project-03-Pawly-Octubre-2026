import { expect, test } from "@playwright/test";

test("la landing presenta el producto actual con metadatos y destinos válidos", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle(
    "Pawly · Tu clínica conectada. Más tiempo para cuidar.",
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Más tiempo\s*para cuidar\./,
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    /pacientes.*tutores.*agenda.*historia clínica/i,
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    "content",
    "es_CL",
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    "Pawly · Tu clínica conectada. Más tiempo para cuidar.",
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  const canonical = new URL(
    (await page.locator('link[rel="canonical"]').getAttribute("href"))!,
  );
  expect(canonical.protocol).toMatch(/^https?:$/);
  expect(canonical.pathname).toBe("/");
  expect(canonical.search).toBe("");
  expect(canonical.hash).toBe("");
  for (const id of [
    "inicio",
    "plataforma",
    "funcionalidades",
    "como-funciona",
    "nosotros",
    "preguntas",
    "comenzar",
    "contenido",
  ]) {
    await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
  }
  const missingAnchors = await page
    .locator('a[href^="#"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href")!)
        .filter((href) => !document.getElementById(href.slice(1))),
    );
  expect(missingAnchors).toEqual([]);
  await expect(
    page
      .locator("#inicio")
      .getByRole("link", { name: "Registrar mi clínica", exact: true }),
  ).toHaveAttribute("href", "/registrarse");
  await expect(
    page
      .locator("#inicio")
      .getByRole("link", { name: "Conocer Pawly", exact: true }),
  ).toHaveAttribute("href", "#plataforma");
  if (
    await page
      .getByRole("button", { name: "Abrir menú", exact: true })
      .isVisible()
  ) {
    await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
  }
  await expect(
    page
      .getByRole("banner")
      .getByRole("link", { name: "Crear cuenta", exact: true })
      .first(),
  ).toHaveAttribute("href", "/registrarse");
  await expect(
    page
      .getByRole("banner")
      .getByRole("link", { name: "Iniciar sesión", exact: true })
      .first(),
  ).toHaveAttribute("href", "/iniciar-sesion");
});

test("la composición se adapta sin desbordamientos y conserva sus acciones", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  for (const width of [320, 360, 390, 768, 1080, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(
        () =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        {
          message: `La página debe caber a ${width}px sin desplazamiento horizontal`,
        },
      )
      .toBe(true);
    await expect(
      page
        .locator("#inicio")
        .getByRole("link", { name: "Registrar mi clínica", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator("#inicio").getByRole("heading", { level: 1 }),
    ).toBeVisible();
  }
  await page.setViewportSize(testInfo.project.use.viewport!);
  await page
    .locator("#inicio")
    .screenshot({ path: `.next/qa/${testInfo.project.name}-landing-hero.png` });
  for (const id of ["plataforma", "funcionalidades", "nosotros", "comenzar"]) {
    await page.locator(`#${id}`).screenshot({
      path: `.next/qa/${testInfo.project.name}-landing-${id}.png`,
    });
  }
});

test("el menú móvil se cierra con Escape y al elegir un enlace", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Abrir menú", exact: true });
  const navigation = page.getByRole("navigation", { name: "Navegación móvil" });
  await expect(navigation).toBeHidden();
  await trigger.click();
  await expect(
    page.getByRole("button", { name: "Cerrar menú", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(navigation).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(navigation).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Enter");
  await navigation
    .getByRole("link", { name: "Funcionalidades", exact: true })
    .click();
  await expect(page).toHaveURL(/#funcionalidades$/);
  await expect(navigation).toBeHidden();
});

test("el menú conserva navegación por Tab y se cierra al pasar a escritorio", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Navegación móvil" });
  await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
  const signup = navigation.getByRole("link", {
    name: "Crear cuenta",
    exact: true,
  });
  await signup.focus();
  await page.keyboard.press("Tab");
  await expect(navigation).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Abrir menú", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
  await page.setViewportSize({ width: 1080, height: 1000 });
  await expect(navigation).toBeHidden();
  await expect(
    page.getByRole("navigation", { name: "Navegación principal" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Abrir menú", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(navigation).toBeHidden();
});

test("las preguntas frecuentes se pueden abrir y cerrar con teclado", async ({
  page,
}) => {
  await page.goto("/");
  const questions = page.locator("#preguntas details");
  await expect(questions).toHaveCount(7);
  const pricing = questions.filter({
    has: page.locator("summary", { hasText: "¿Cuánto cuesta Pawly?" }),
  });
  await expect(pricing).not.toHaveAttribute("open", "");
  await pricing.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(pricing).toHaveAttribute("open", "");
  await expect(pricing.locator("p")).toBeVisible();
  await expect(pricing).toContainText(
    /preparación|definición|definir|precios/i,
  );
  await page.keyboard.press("Space");
  await expect(pricing).not.toHaveAttribute("open", "");
});

test("los accesos llevan a formularios reales y permiten volver sin enviar datos", async ({
  page,
}) => {
  const mutations: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method()))
      mutations.push(request.url());
  });
  await page.goto("/");
  await page
    .locator("#inicio")
    .getByRole("link", { name: "Registrar mi clínica", exact: true })
    .click();
  await expect(page).toHaveURL(/\/registrarse$/);
  await expect(
    page.getByRole("form", { name: "Registro de clínica" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Crear cuenta y clínica", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Volver a Pawly", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  if (
    await page
      .getByRole("button", { name: "Abrir menú", exact: true })
      .isVisible()
  ) {
    await page.getByRole("button", { name: "Abrir menú", exact: true }).click();
    await page
      .getByRole("navigation", { name: "Navegación móvil" })
      .getByRole("link", { name: "Iniciar sesión", exact: true })
      .click();
  } else {
    await page
      .getByRole("banner")
      .getByRole("link", { name: "Iniciar sesión", exact: true })
      .click();
  }
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
  await expect(
    page.getByRole("form", { name: "Inicio de sesión" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Qué bueno verte de nuevo.",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Volver a Pawly", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(mutations).toEqual([]);
});

test("el enlace de salto y el movimiento reducido permiten acceso directo al contenido", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", {
    name: "Saltar al contenido",
    exact: true,
  });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#contenido$/);
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
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

test("las fotografías y capturas son locales, optimizadas y se cargan sin errores", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.locator("main img")).toHaveCount(5);
  const allSources = new Set<string>();
  for (const image of await page.locator("main").getByRole("img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (element) =>
            (element as HTMLImageElement).complete &&
            (element as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
    expect((await image.getAttribute("alt"))?.trim()).toBeTruthy();
    const source = await image.getAttribute("src");
    expect(source).toMatch(/^\/_next\/image\?/);
    const localSource = new URL(source!, page.url()).searchParams.get("url");
    expect(localSource).toMatch(/^\/images\/.+\.webp$/);
    allSources.add(localSource!);
  }
  await page
    .getByRole("tab", { name: "Consulta e historia", exact: true })
    .click();
  const clinicalImage = page
    .getByRole("tabpanel", { name: "Consulta e historia", exact: true })
    .getByRole("img");
  await clinicalImage.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      clinicalImage.evaluate(
        (element) => (element as HTMLImageElement).naturalWidth,
      ),
    )
    .toBeGreaterThan(0);
  const clinicalSource = new URL(
    (await clinicalImage.getAttribute("src"))!,
    page.url(),
  ).searchParams.get("url");
  allSources.add(clinicalSource!);
  expect(allSources.size).toBe(5);
  expect(errors).toEqual([]);
});

test("la imagen social se publica y corresponde a una imagen válida", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const social = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(social).toContain("opengraph-image");
  const socialUrl = new URL(social!, page.url());
  const response = await request.get(
    `${socialUrl.pathname}${socialUrl.search}`,
  );
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toContain("image/png");
});
