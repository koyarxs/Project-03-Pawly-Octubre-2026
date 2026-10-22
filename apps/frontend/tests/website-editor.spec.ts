import { expect, test, type Page } from "@playwright/test";
import { returnToTab } from "./support/tab-lifecycle";
import { publicWebsiteFixture } from "./support/website-fixtures";
import type { WebsiteContent, WebsiteState } from "../src/lib/website";
const clinic = {
  id: "90555a74-dffb-4437-a493-c3b15a5d2246",
  name: "Clinica Pantoja",
  slug: "pantoja",
  timezone: "America/Santiago",
};
const owner = {
  id: "1f603846-d722-49ef-bb7f-07e129ae4fd8",
  name: "Responsable de ejemplo",
  email: "owner@example.invalid",
  emailVerifiedAt: null,
};
const target = `/app/clinicas/${clinic.id}/sitio-web`;
async function mockEditor(page: Page, initialRole = "OWNER") {
  const state = {
    role: initialRole,
    snapshot: {
      clinicId: clinic.id,
      version: 1,
      content: structuredClone(publicWebsiteFixture),
      publishedAt: null,
      updatedAt: "2026-10-21T12:00:00.000Z",
      hasUnpublishedChanges: true,
    } as WebsiteState,
    published: null as WebsiteContent | null,
    failSave: 0,
    writes: [] as {
      method: string;
      path: string;
      body: Record<string, unknown>;
      csrf: string | undefined;
    }[],
    queries: [] as string[],
  };
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      path = new URL(request.url()).pathname,
      method = request.method();
    const headers = {
      "Access-Control-Allow-Origin": "http://localhost:3100",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "content-type,x-pawly-csrf",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    };
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
    state.queries.push(path);
    let body: unknown,
      status = 200;
    if (path === "/api/auth/me")
      body = { ...owner, memberships: [{ clinic, role: state.role }] };
    else if (path.endsWith("/access"))
      body = { clinic: { ...clinic, role: state.role } };
    else if (path === "/api/website")
      body = {
        content: state.published,
        publishedAt: state.snapshot.publishedAt,
      };
    else if (path.endsWith("/website") && method === "GET")
      body = state.snapshot;
    else if (path.includes("/website") && ["PATCH", "POST"].includes(method)) {
      const input = request.postDataJSON() as Record<string, unknown>;
      state.writes.push({
        method,
        path,
        body: input,
        csrf: request.headers()["x-pawly-csrf"],
      });
      if (method === "PATCH" && state.failSave) {
        status = state.failSave;
        body = { statusCode: status, message: "Fallo seguro" };
      } else {
        if (method === "PATCH") {
          state.snapshot.content = input.content as WebsiteContent;
          state.snapshot.hasUnpublishedChanges = true;
        } else if (path.endsWith("/unpublish")) {
          state.published = null;
          state.snapshot.publishedAt = null;
          state.snapshot.hasUnpublishedChanges = true;
        } else {
          state.published = structuredClone(state.snapshot.content);
          state.snapshot.publishedAt = "2026-10-21T15:00:00.000Z";
          state.snapshot.hasUnpublishedChanges = false;
        }
        state.snapshot.version++;
        body = state.snapshot;
        status = method === "POST" ? 201 : 200;
      }
    } else {
      status = 404;
      body = { statusCode: 404 };
    }
    return route.fulfill({
      status,
      headers,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  return state;
}
test("guardar el borrador no publica, y publicar exige confirmación explícita", async ({
  page,
}) => {
  const state = await mockEditor(page);
  await page.goto(target);
  await page
    .getByLabel("Título principal", { exact: true })
    .fill("Una portada nueva para Porvenir.");
  await expect(
    page.getByRole("button", { name: "Publicar sitio", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Borrador guardado" }),
  ).toBeVisible();
  expect(state.published).toBeNull();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].method).toBe("PATCH");
  expect(state.writes[0].body.version).toBe(1);
  expect(state.writes[0].csrf).toBe("1");
  await page
    .getByRole("button", { name: "Publicar sitio", exact: true })
    .click();
  const confirmation = page.getByRole("dialog", {
    name: "¿Publicar el contenido del sitio?",
  });
  await expect(confirmation).toBeVisible();
  expect(state.writes).toHaveLength(1);
  await confirmation.getByRole("button", { name: "Volver al editor" }).click();
  expect(state.published).toBeNull();
  await page
    .getByRole("button", { name: "Publicar sitio", exact: true })
    .click();
  await confirmation
    .getByRole("button", { name: "Confirmar publicación" })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Contenido publicado correctamente" }),
  ).toBeVisible();
  expect(state.published?.heroTitle).toBe("Una portada nueva para Porvenir.");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Una portada nueva para Porvenir.",
  );
});
test("los testimonios se editan en privado y solo se muestran después de publicar", async ({
  page,
}) => {
  const state = await mockEditor(page);
  await page.goto(target);
  await page
    .getByRole("button", { name: "Añadir testimonio", exact: true })
    .click();
  await page
    .getByLabel("Nombre para mostrar 1", { exact: true })
    .fill("Responsable QA");
  await page
    .getByLabel("Mascota o contexto 1", { exact: true })
    .fill("Mascota QA");
  await page
    .getByLabel("Opinión del cliente 1", { exact: true })
    .fill("Contenido ficticio usado para probar el editor.");
  await page.getByRole("button", { name: "Vista previa", exact: true }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Así se verá tu sitio" })
      .locator("#testimonios"),
  ).toContainText("Contenido ficticio usado para probar el editor.");
  expect(state.published).toBeNull();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Borrador guardado" }),
  ).toBeVisible();
  expect(state.published).toBeNull();
  await page
    .getByRole("button", { name: "Publicar sitio", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "¿Publicar el contenido del sitio?" })
    .getByRole("button", { name: "Confirmar publicación" })
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Contenido publicado correctamente" }),
  ).toBeVisible();
  await page.goto("/");
  await expect(page.locator("#testimonios")).toContainText(
    "Contenido ficticio usado para probar el editor.",
  );
  await expect(page.locator("#testimonios")).not.toContainText(
    "TESTIMONIOS FICTICIOS",
  );
});
test("la vista previa usa cambios sin guardar y restaura el foco sin publicar", async ({
  page,
}) => {
  const state = await mockEditor(page);
  await page.goto(target);
  await page
    .getByLabel("Título principal", { exact: true })
    .fill("Texto privado sin guardar.");
  const trigger = page.getByRole("button", {
    name: "Vista previa",
    exact: true,
  });
  await trigger.click();
  const preview = page.getByRole("dialog", { name: "Así se verá tu sitio" });
  await expect(
    preview.getByRole("heading", { name: "Texto privado sin guardar." }),
  ).toBeVisible();
  await expect(preview).toContainText(
    "No publica ni modifica la información clínica",
  );
  expect(state.writes).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(preview).not.toBeVisible();
  await expect(trigger).toBeFocused();
});
test("un conflicto al guardar conserva los textos y no informa un éxito ficticio", async ({
  page,
}) => {
  const state = await mockEditor(page);
  state.failSave = 409;
  await page.goto(target);
  const input = page.getByLabel("Título principal", { exact: true });
  await input.fill("Mi borrador debe conservarse.");
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await expect(
    page.locator(".website-workspace").getByRole("alert"),
  ).toContainText("cambió en otra sesión");
  await expect(input).toHaveValue("Mi borrador debe conservarse.");
  expect(state.published).toBeNull();
  await expect(
    page.getByText("Borrador guardado.", { exact: false }),
  ).toHaveCount(0);
});
test("veterinarios y recepción no obtienen el editor ni solicitan su contenido", async ({
  page,
}) => {
  for (const role of ["VETERINARIAN", "RECEPTIONIST"]) {
    const state = await mockEditor(page, role);
    await page.goto(target);
    await expect(
      page.getByRole("heading", {
        name: "Administración del sitio restringida",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("form", { name: "Contenido del sitio de la veterinaria" }),
    ).toHaveCount(0);
    expect(state.queries.some((path) => path.endsWith("/website"))).toBe(false);
    await page.unrouteAll({ behavior: "wait" });
  }
});
test("cambiar de rol al volver a la pestaña retira los borradores privados", async ({
  page,
}) => {
  const state = await mockEditor(page);
  await page.goto(target);
  await page
    .getByLabel("Título principal", { exact: true })
    .fill("Borrador privado de administración.");
  state.role = "VETERINARIAN";
  await returnToTab(page);
  await expect(
    page.getByRole("heading", { name: "Administración del sitio restringida" }),
  ).toBeVisible();
  await expect(page.locator('input[name="heroTitle"]')).toHaveCount(0);
});
test("el formulario y la vista previa se adaptan sin desbordamiento", async ({
  page,
}, info) => {
  await mockEditor(page);
  await page.goto(target);
  await expect(
    page.getByLabel("Título principal", { exact: true }),
  ).toBeVisible();
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Editor ${width}`,
    ).toBe(true);
    await page
      .getByRole("button", { name: "Vista previa", exact: true })
      .click();
    const preview = page.getByRole("dialog", { name: "Así se verá tu sitio" });
    await expect(preview).toBeVisible();
    const box = await preview.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.width).toBeLessThanOrEqual(width);
    await page.keyboard.press("Escape");
  }
  await page.setViewportSize(info.project.use.viewport!);
  await page.screenshot({
    path: `.next/qa/${info.project.name}-website-editor.png`,
    fullPage: true,
  });
});
