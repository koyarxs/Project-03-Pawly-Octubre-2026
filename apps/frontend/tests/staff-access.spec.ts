import { test, expect } from "@playwright/test";
import { withAccessFixture } from "./support/access-fixture";
import { returnToTab } from "./support/tab-lifecycle";
const clinic = {
  id: "90555a74-dffb-4437-a493-c3b15a5d2246",
  name: "Clínica de permisos QA",
  slug: "permissions-qa",
  timezone: "America/Santiago",
};
const user = {
  id: "1f603846-d722-49ef-bb7f-07e129ae4fd8",
  name: "Profesional ficticio QA",
  email: "permissions@example.invalid",
  emailVerifiedAt: null,
};
const cors = {
  "Access-Control-Allow-Origin": "http://localhost:3100",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "content-type,x-pawly-csrf",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
};
for (const role of [
  "CLINIC_DIRECTOR",
  "VETERINARIAN",
  "VET_TECHNICIAN",
  "RECEPTIONIST",
  "PET_GROOMER",
]) {
  test(`dashboard contextual de ${role} usa las capacidades del servidor`, async ({
    page,
  },info) => {
    const fixture = withAccessFixture({ clinic: { ...clinic, role } }) as {
      clinic: {
        permissions: string[];
        medicalPracticeEnabled: boolean;
        job: string;
      };
    };
    // Public title "director médico" alone cannot grant any medical capability.
    if (role === "CLINIC_DIRECTOR") {
      fixture.clinic.permissions = fixture.clinic.permissions.filter(
        (p) =>
          !p.startsWith("consultation:") &&
          p !== "patient:notes" &&
          p !== "appointment:clinical",
      );
      fixture.clinic.medicalPracticeEnabled = false;
    }
    fixture.clinic.job = role;
    const requested: string[] = [];
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        path = new URL(req.url()).pathname;
      if (req.method() === "OPTIONS")
        return route.fulfill({ status: 204, headers: cors });
      requested.push(path);
      const body = path.endsWith("/auth/me")
        ? { ...user, memberships: [{ clinic, role }] }
        : path.endsWith("/access")
          ? fixture
          : { items: [], total: 0, totalPages: 0, page: 1, limit: 1 };
      await route.fulfill({ status: 200, headers: cors, json: body });
    });
    await page.goto(`/app/clinicas/${clinic.id}/dashboard`);
    await expect(
      page.getByRole("heading", { name: "Hola, Profesional." }),
    ).toBeVisible();
    await expect(page.locator(".dashboard-metric-value").first()).toHaveText(
      "0",
    );
    let desktopNav = page.locator(".dashboard-sidebar nav");
    if(info.project.name==="mobile") {await page.getByRole("button",{name:"Abrir navegación"}).click();desktopNav=page.getByRole("dialog").getByRole("navigation");}
    await expect(
      desktopNav.getByRole("link", { name: "Consultas", exact: true }),
    ).toHaveCount(role === "VETERINARIAN" ? 1 : 0);
    await expect(
      desktopNav.getByRole("link", { name: "Personal y Accesos", exact: true }),
    ).toHaveCount(role === "CLINIC_DIRECTOR" ? 1 : 0);
    if (["VET_TECHNICIAN", "PET_GROOMER"].includes(role)) {
      expect(
        requested.some(
          (p) => p.endsWith("/tutors") || p.endsWith("/consultations"),
        ),
      ).toBe(false);
      await expect(
        desktopNav.getByRole("link", { name: "Tutores", exact: true }),
      ).toHaveCount(0);
    }
    if (role === "PET_GROOMER") {
      if(info.project.name==="mobile") await page.keyboard.press("Escape");
      expect(requested.some((p) => p.endsWith("/appointments"))).toBe(false);
      await expect(
        page.getByText(/Agenda y servicios de peluquería: pendientes/),
      ).toBeVisible();
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  });
}
test("un cambio de cargo conserva el borrador y una revocación de permisos lo retira", async ({
  page,
}) => {
  const access = withAccessFixture({
    clinic: { ...clinic, role: "OWNER", job: "CLINIC_DIRECTOR" },
  }) as {
    clinic: { permissions: string[]; job: string; accessVersion: number };
  };
  let checks = 0;
  await page.route("**/api/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (req.method() === "OPTIONS")
      return route.fulfill({ status: 204, headers: cors });
    const body = path.endsWith("/auth/me")
      ? { ...user, memberships: [{ clinic, role: "OWNER" }] }
      : path.endsWith("/access")
        ? (checks++, access)
        : { items: [], total: 0, totalPages: 0, page: 1, limit: 20 };
    await route.fulfill({ status: 200, headers: cors, json: body });
  });
  await page.goto(`/app/clinicas/${clinic.id}/tutores/nuevo`);
  const field = page.getByLabel("Nombre", { exact: true });
  await field.fill("Borrador que debo conservar");
  let before = checks;
  access.clinic.job = "RECEPTIONIST";
  await returnToTab(page);
  await expect.poll(() => checks).toBeGreaterThan(before);
  await expect(field).toHaveValue("Borrador que debo conservar");
  before = checks;
  access.clinic.permissions = access.clinic.permissions.filter(
    (p) => p !== "tutor:write",
  );
  access.clinic.accessVersion++;
  await returnToTab(page);
  await expect.poll(() => checks).toBeGreaterThan(before);
  await expect(
    page.getByRole("heading", {
      name: "No tienes permiso para editar tutores.",
    }),
  ).toBeVisible();
  await expect(field).toHaveCount(0);
});

test("historias del equipo muestran formación chilena y tres fotografías propias por perfil", async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.route("**/api/website", (route) => route.fulfill({ status: 200, headers: cors, json: { content: null, publishedAt: null } }));
  await page.route("**/api/website/team", (route) => route.fulfill({ status: 200, headers: cors, json: { items: [] } }));
  await page.goto("/#equipo");
  const section = page.getByRole("region", { name: "Conoce a nuestro equipo" });
  const buttons = section.getByRole("button", { name: /^Ver perfil de / });
  await expect(buttons).toHaveCount(9);
  const gallerySources = new Set<string>();
  for (let index = 0; index < 9; index++) {
    await buttons.nth(index).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Historia y formación ficticias · Demostración", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("heading", { name: "Un camino de vocación." })).toBeVisible();
    await expect(dialog.getByRole("list").first().getByRole("listitem")).toHaveCount(3);
    const thumbnails = dialog.getByRole("group", { name: /^Galería de / });
    await expect(thumbnails.getByRole("button")).toHaveCount(3);
    await expect(dialog.getByRole("img", { name: /^Retrato ficticio de / })).toHaveCount(1);
    const sources = await thumbnails.locator("img").evaluateAll((images) => images.map((image) => image.getAttribute("src")!));
    expect(new Set(sources).size).toBe(3);
    sources.forEach((source) => gallerySources.add(source));
    await dialog.locator("img").evaluateAll((images) => Promise.all(images.map((image) => {
      const photo = image as HTMLImageElement;
      photo.loading = "eager";
      return photo.decode();
    })));
    await thumbnails.getByRole("button").nth(2).click();
    await expect(thumbnails.getByRole("button").nth(2)).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.getByRole("img", { name: /^Escena ficticia de / })).toHaveAttribute("src", /-3\.webp/);
    await dialog.getByRole("button", { name: "Fotografía siguiente del perfil" }).click();
    await expect(thumbnails.getByRole("button").first()).toHaveAttribute("aria-pressed", "true");
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    if (index === 0) {
      await dialog.evaluate((element) => { element.scrollTop = 0; });
      await dialog.screenshot({ path: info.outputPath("perfil-historia.png") });
    }
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(buttons.nth(index)).toBeFocused();
  }
  expect(gallerySources.size).toBe(27);
});

test("el perfil publicado no recibe historias ni formación ficticias", async ({ page }) => {
  await page.route("**/api/website", (route) => route.fulfill({ status: 200, headers: cors, json: { content: null, publishedAt: null } }));
  await page.route("**/api/website/team", (route) => route.fulfill({ status: 200, headers: cors, json: { items: [{ displayName: "Perfil publicado QA", job: "VETERINARIAN", specialty: "Medicina preventiva", biography: "Biografía pública autorizada para esta prueba.", photoKey: "director-demo" }] } }));
  await page.goto("/#equipo");
  const section = page.getByRole("region", { name: "Conoce a nuestro equipo" });
  await expect(section.getByRole("article")).toHaveCount(1);
  await section.getByRole("button", { name: "Ver perfil de Perfil publicado QA" }).click();
  const dialog = page.getByRole("dialog", { name: "Perfil publicado QA" });
  await expect(dialog.getByText("Biografía pública autorizada para esta prueba.", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("group", { name: /^Galería de / })).toHaveCount(0);
  await expect(dialog.getByRole("heading", { name: "Un camino de vocación." })).toHaveCount(0);
  await expect(dialog.getByText(/ficticias/)).toHaveCount(0);
});
test("equipo público identifica las nueve identidades ficticias y sus imágenes ilustrativas", async ({
  page,
}, info) => {
  await page.route("**/api/website", (route) =>
    route.fulfill({
      status: 200,
      headers: cors,
      json: { content: null, publishedAt: null },
    }),
  );
  await page.route("**/api/website/team", (route) =>
    route.fulfill({ status: 200, headers: cors, json: { items: [] } }),
  );
  await page.goto("/#equipo");
  const section = page.getByRole("region", { name: "Conoce a nuestro equipo" });
  await expect(section.getByRole("article")).toHaveCount(9);
  await expect(
    section.getByText("Perfil ficticio de demostración", { exact: true }),
  ).toHaveCount(9);
  await expect(
    section.getByText("Imagen generada · ilustrativa", { exact: true }),
  ).toHaveCount(9);
  await expect(
    section.getByRole("heading", { name: "Dr. Sebastián Morales" }),
  ).toBeVisible();
  await expect(
    section.getByRole("heading", { name: "Daniela Castillo" }),
  ).toBeVisible();
  const portraits = section.getByRole("img", { name: /Retrato ficticio de demostración/ });
  await expect(portraits).toHaveCount(9);
  const sources = await portraits.evaluateAll((images) => images.map((image) => image.getAttribute("src")));
  expect(new Set(sources).size).toBe(9);
  for (const source of sources) expect(source).toContain("-v2.webp");
  const firstCard = section.getByRole("article").first();
  await expect(firstCard.getByRole("list", { name: "Áreas de Dr. Sebastián Morales" }).getByRole("listitem")).toHaveCount(3);
  const profileButton = firstCard.getByRole("button", { name: "Ver perfil de Dr. Sebastián Morales" });
  await profileButton.click();
  const profileDialog = page.getByRole("dialog", { name: "Dr. Sebastián Morales" });
  await expect(profileDialog).toBeVisible();
  await expect(profileDialog.getByText("Dirección clínica", { exact: true })).toBeVisible();
  await expect(profileDialog.getByText(/Identidad y presentación ficticias/)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(profileDialog).not.toBeVisible();
  await expect(profileButton).toBeFocused();
  await profileButton.click();
  await page.getByRole("button", { name: "Cerrar perfil" }).click();
  await expect(profileDialog).not.toBeVisible();
  await expect(section.getByRole("heading", { name: "Dra. Constanza Vega" })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  const boxes = await section.getByRole("article").evaluateAll((cards) => cards.map((card) => {
    const { x, y, width } = card.getBoundingClientRect();
    return { x, y, width };
  }));
  expect(new Set(boxes.slice(0, 5).map((box) => Math.round(box.y))).size).toBe(1);
  expect(new Set(boxes.slice(5).map((box) => Math.round(box.y))).size).toBe(1);
  expect(boxes[5].y).toBeGreaterThan(boxes[0].y);
  expect(Math.abs((boxes[5].x + boxes[8].x + boxes[8].width) / 2 - 720)).toBeLessThan(2);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const portrait of await portraits.all()) {
      const circle = portrait.locator("..");
      await expect(circle).toHaveCSS("border-radius", "50%");
      const box = (await circle.boundingBox())!;
      expect(Math.abs(box.width - box.height)).toBeLessThanOrEqual(1);
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth > innerWidth), { message: `Sin desbordamiento a ${width}px` }).toBe(false);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(section.locator('[class*="movingStroke"]').first()).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(section.locator('[class*="movingStroke"]').first()).not.toHaveCSS("animation-name", "none");
  await page.setViewportSize(info.project.use.viewport!);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await section.locator("img").evaluateAll((images) =>
    Promise.all(
      images.map((image) => {
        if (!(image instanceof HTMLImageElement)) return Promise.resolve();
        image.loading = "eager";
        return image.decode();
      }),
    ),
  );
  await section.screenshot({
    path: info.outputPath("equipo-demostrativo.png"),
  });
});
