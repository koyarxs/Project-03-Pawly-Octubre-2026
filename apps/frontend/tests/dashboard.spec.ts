import { test, expect, type Page } from "@playwright/test";

import { returnToTab } from "./support/tab-lifecycle";
const owner = {
  id: "1f603846-d722-49ef-bb7f-07e129ae4fd8",
  name: "Responsable del workspace",
  email: "workspace@example.invalid",
  emailVerifiedAt: null,
};
const first = {
  id: "90555a74-dffb-4437-a493-c3b15a5d2246",
  name: "Clínica del Parque",
  slug: "parque",
  timezone: "America/Santiago",
};
const second = {
  ...first,
  id: "a84337ac-f937-4de9-96d9-b2acdb73941b",
  name: "Clínica del Bosque",
  slug: "bosque",
};
const session = {
  ...owner,
  memberships: [
    { clinic: first, role: "OWNER" },
    { clinic: second, role: "VETERINARIAN" },
  ],
};
const path = (id = first.id) => `/app/clinicas/${id}/dashboard`;
const cors = {
  "Access-Control-Allow-Origin": "http://localhost:3100",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "content-type,x-pawly-csrf",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};
async function routes(
  page: Page,
  handler?: (
    path: string,
  ) =>
    | Promise<{ status: number; body?: object }>
    | { status: number; body?: object },
) {
  await page.route("**/api/**", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    const pathname = new URL(route.request().url()).pathname;
    const summaryResource =
      /\/(appointments|patients|tutors|consultations)$/.test(pathname);
    const result = summaryResource
      ? {
          status: 200,
          body: { items: [], total: 0, page: 1, limit: 1, totalPages: 0 },
        }
      : handler
        ? await handler(pathname)
        : pathname.endsWith("/me")
          ? { status: 200, body: session }
          : {
              status: 200,
              body: {
                clinic: {
                  ...(pathname.includes(second.id) ? second : first),
                  role: pathname.includes(second.id) ? "VETERINARIAN" : "OWNER",
                },
              },
            };
    await route.fulfill({
      status: result.status,
      headers: cors,
      ...(result.body ? { json: result.body } : {}),
    });
  });
}

test("selector conserva la clínica al volver a la pestaña", async ({
  page,
}) => {
  let checks = 0;
  await routes(page, (pathname) => {
    if (pathname.endsWith("/me")) {
      checks++;
      return { status: 200, body: session };
    }
    return { status: 200, body: { clinic: { ...first, role: "OWNER" } } };
  });
  await page.goto("/app");
  await page.getByRole("button", { name: new RegExp(first.name) }).click();
  await expect(
    page.getByRole("link", { name: "Entrar al dashboard" }),
  ).toBeVisible();
  const before = checks;
  await returnToTab(page);
  await expect.poll(() => checks).toBeGreaterThan(before);
  await expect(
    page.getByRole("link", { name: "Entrar al dashboard" }),
  ).toBeVisible();
});

for (const status of [401, 403]) {
  test(`volver a la pestaña retira acceso ante ${status}`, async ({ page }) => {
    let denied = false;
    await routes(page, (pathname) => {
      if (denied && (status === 401 || !pathname.endsWith("/me")))
        return { status };
      return pathname.endsWith("/me")
        ? { status: 200, body: session }
        : { status: 200, body: { clinic: { ...first, role: "OWNER" } } };
    });
    await page.goto(path());
    await expect(page.getByRole("heading", { name: first.name })).toBeVisible();
    denied = true;
    await returnToTab(page);
    if (status === 401) await expect(page).toHaveURL(/\/iniciar-sesion$/);
    else
      await expect(
        page.getByRole("heading", { name: "No tienes acceso a esta clínica." }),
      ).toBeVisible();
    await expect(page.getByText(owner.name)).toHaveCount(0);
  });
}

test("espera sesión y autorización antes de mostrar datos protegidos", async ({
  page,
}) => {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await routes(page, async (pathname) => {
    if (pathname.endsWith("/me")) return { status: 200, body: session };
    await wait;
    return { status: 200, body: { clinic: { ...first, role: "OWNER" } } };
  });
  await page.goto(path());
  await expect(
    page.getByRole("heading", { name: "Preparando tu espacio…" }),
  ).toBeVisible();
  await expect(page.getByText(owner.name)).toHaveCount(0);
  await expect(page.getByText(first.name)).toHaveCount(0);
  release();
  await expect(page.getByRole("heading", { name: first.name })).toBeVisible();
});

test("sesión ausente redirige sin aceptar destinos externos", async ({
  page,
}) => {
  await routes(page, () => ({ status: 401 }));
  await page.goto(`${path()}?next=https://evil.invalid`);
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
  await expect(page.getByText(owner.name)).toHaveCount(0);
});

test("backend deniega clínica ajena o suspendida incluso con membresía en /me", async ({
  page,
}) => {
  await routes(page, (pathname) =>
    pathname.endsWith("/me")
      ? { status: 200, body: session }
      : { status: 403, body: { message: "SECRET_password_cookie" } },
  );
  await page.goto(path());
  await expect(
    page.getByRole("heading", { name: "No tienes acceso a esta clínica." }),
  ).toBeVisible();
  await expect(page.getByRole("main").getByRole("alert")).not.toContainText(
    "SECRET",
  );
  await expect(page.getByText(owner.name)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: first.name })).toHaveCount(0);
  await page.getByRole("link", { name: "Volver a mis clínicas" }).click();
  await expect(page).toHaveURL(/\/app$/);
});

test("cambio de clínica oculta la anterior hasta nueva autorización y respeta rol", async ({
  page,
}) => {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await routes(page, async (pathname) => {
    if (pathname.endsWith("/me")) return { status: 200, body: session };
    if (pathname.includes(second.id)) {
      await wait;
      return {
        status: 200,
        body: { clinic: { ...second, role: "VETERINARIAN" } },
      };
    }
    return { status: 200, body: { clinic: { ...first, role: "OWNER" } } };
  });
  await page.goto(path());
  await expect(page.getByRole("heading", { name: first.name })).toBeVisible();
  await page.getByLabel("Cambiar clínica").selectOption(second.id);
  await expect(page.getByRole("heading", { name: first.name })).toHaveCount(0);
  await expect(page.getByText(owner.name)).toHaveCount(0);
  release();
  await expect(page).toHaveURL(path(second.id));
  await expect(page.getByRole("heading", { name: second.name })).toBeVisible();
  await expect(page.locator(".dashboard-user")).toContainText("Veterinario");
  await expect(page.getByText("Propietario", { exact: true })).toHaveCount(0);
});

test("revalidación retira acceso suspendido sin conservar datos anteriores", async ({
  page,
}) => {
  let suspended = false;
  await routes(page, (pathname) =>
    pathname.endsWith("/me")
      ? { status: 200, body: session }
      : suspended
        ? { status: 403 }
        : { status: 200, body: { clinic: { ...first, role: "OWNER" } } },
  );
  await page.goto(path());
  await expect(page.getByRole("heading", { name: first.name })).toBeVisible();
  suspended = true;
  await page
    .getByRole("button", { name: "Volver a verificar mi acceso" })
    .click();
  await expect(
    page.getByRole("heading", { name: "No tienes acceso a esta clínica." }),
  ).toBeVisible();
  await expect(page.getByText(owner.name)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: first.name })).toHaveCount(0);
});

test("respuesta de otra clínica o rol inválido nunca habilita dashboard", async ({
  page,
}) => {
  for (const clinic of [
    { ...second, role: "OWNER" },
    { ...first, role: ["OWNER"] },
  ]) {
    await page.unrouteAll();
    await routes(page, (pathname) =>
      pathname.endsWith("/me")
        ? { status: 200, body: session }
        : { status: 200, body: { clinic } },
    );
    await page.goto(path());
    await expect(
      page.getByRole("heading", { name: "No pudimos abrir tu espacio." }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: first.name })).toHaveCount(
      0,
    );
  }
});

test("logout informa fallo seguro y después revoca navegación privada", async ({
  page,
}) => {
  let status = 500;
  await routes(page, (pathname) =>
    pathname.endsWith("/me")
      ? { status: 200, body: session }
      : pathname.endsWith("/logout")
        ? { status, body: { message: "SECRET" } }
        : { status: 200, body: { clinic: { ...first, role: "OWNER" } } },
  );
  await page.goto(path());
  await expect(page.getByRole("heading", { name: first.name })).toBeVisible();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "No pudimos cerrar la sesión",
  );
  await expect(page.getByRole("main").getByRole("alert")).not.toContainText(
    "SECRET",
  );
  status = 204;
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
});

test("selector mantiene verificación y permite entrar al dashboard", async ({
  page,
}) => {
  await routes(page);
  await page.goto("/app");
  await expect(
    page.getByRole("link", { name: "Entrar al dashboard" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: new RegExp(first.name) }).click();
  await page.getByRole("link", { name: "Entrar al dashboard" }).click();
  await expect(page).toHaveURL(path());
  await expect(page.getByRole("heading", { name: first.name })).toBeVisible();
});

test("dashboard responsive, menú accesible y módulos claramente pendientes", async ({
  page,
}) => {
  await routes(page);
  await page.goto(path());
  await expect(page.getByRole("heading", { name: first.name })).toBeVisible();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    (await page.getByLabel("Cambiar clínica").boundingBox())!.width,
  ).toBeGreaterThan(200);
  const toggle = page.getByRole("button", { name: "Abrir navegación" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  const nav = page.getByRole("dialog").getByRole("navigation");
  for (const name of ["Vacunación", "Inventario", "Reportes", "Configuración"])
    await expect(
      nav.getByRole("button", { name: `${name} Próximamente`, exact: true }),
    ).toBeDisabled();
  await expect(
    nav.getByRole("link", { name: "Consultas", exact: true }),
  ).toHaveAttribute("href", /\/consultas$/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(toggle).toBeFocused();
  await expect(
    page.getByRole("region", { name: "Indicadores operativos" }),
  ).not.toContainText("No disponible");
  await expect(
    page
      .getByRole("article", { name: "Citas de hoy", exact: true })
      .locator(".dashboard-metric-value"),
  ).toHaveText("0");
  await page.setViewportSize(test.info().project.use.viewport!);
  await page.screenshot({
    path: `.next/qa/dashboard-${test.info().project.name}.png`,
    fullPage: true,
  });
});
