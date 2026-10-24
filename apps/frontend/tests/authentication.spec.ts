import { withAccessFixture } from "./support/access-fixture";
import { expect, test, type Page } from "@playwright/test";
import { returnToTab } from "./support/tab-lifecycle";
const user = {
  id: "1f603846-d722-49ef-bb7f-07e129ae4fd8",
  name: "Responsable de pruebas",
  email: "owner@example.invalid",
  emailVerifiedAt: null,
};
const clinic = {
  id: "90555a74-dffb-4437-a493-c3b15a5d2246",
  name: "Clínica de pruebas",
  slug: "test-clinic",
  timezone: "America/Santiago",
};
const session = { ...user, memberships: [{ role: "OWNER", clinic }] };
const password = "Una frase privada de pruebas";
for (const mode of ["registrarse", "iniciar-sesion"] as const) {
  test(`${mode} conserva campos al cambiar de pestaña antes del dashboard`, async ({
    page,
  }) => {
    let calls = 0;
    await mock(page, () => {
      calls++;
      return { status: 401 };
    });
    await page.goto(`/${mode}`);
    if (mode === "registrarse") await fillRegistration(page);
    else {
      await page.getByLabel("Correo electrónico").fill(user.email);
      await page.getByLabel("Contraseña", { exact: true }).fill(password);
    }
    await returnToTab(page);
    await page.evaluate(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      ),
    );
    await expect(page.getByLabel("Correo electrónico")).toHaveValue(user.email);
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue(
      password,
    );
    if (mode === "registrarse") {
      await expect(page.getByLabel("Nombre del responsable")).toHaveValue(
        user.name,
      );
      await expect(
        page.getByLabel("Confirmar contraseña", { exact: true }),
      ).toHaveValue(password);
      await expect(
        page.getByLabel("Nombre de la clínica veterinaria"),
      ).toHaveValue(clinic.name);
    }
    expect(calls).toBe(0);
    expect(
      await page.evaluate(() => localStorage.length + sessionStorage.length),
    ).toBe(0);
  });
}
async function mock(
  page: Page,
  handler: (path: string, method: string) => { status: number; body?: object },
) {
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const result =
      req.method() === "OPTIONS"
        ? { status: 204 }
        : handler(new URL(req.url()).pathname, req.method());
    await route.fulfill({
      status: result.status,
      headers: {
        "Access-Control-Allow-Origin": "http://localhost:3100",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Headers": "content-type,x-pawly-csrf",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Content-Type": "application/json",
      },
      body: result.body
        ? JSON.stringify(withAccessFixture(result.body))
        : undefined,
    });
  });
}
async function fillRegistration(page: Page) {
  await page.getByLabel("Nombre del responsable").fill(user.name);
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill(password);
  await page.getByLabel("Nombre de la clínica veterinaria").fill(clinic.name);
}

test("valida localmente sin enviar confirmación ni peticiones inválidas", async ({
  page,
}) => {
  const posts: object[] = [];
  await mock(page, (_path, method) => {
    if (method === "POST") posts.push({});
    return { status: 201, body: { user, clinic, role: "OWNER" } };
  });
  await page.goto("/registrarse");
  await page.getByRole("button", { name: "Crear cuenta y clínica" }).click();
  await expect(
    page.getByText("Ingresa un correo electrónico válido."),
  ).toBeVisible();
  await fillRegistration(page);
  await page
    .getByLabel("Confirmar contraseña", { exact: true })
    .fill("diferente");
  await page.getByRole("button", { name: "Crear cuenta y clínica" }).click();
  await expect(
    page.getByText("Las contraseñas deben coincidir."),
  ).toBeVisible();
  expect(posts).toHaveLength(0);
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill(password);
  let payload: Record<string, unknown> | undefined;
  page.on("request", (req) => {
    if (req.method() === "POST") {
      payload = req.postDataJSON();
      expect(req.headers()["x-pawly-csrf"]).toBe("1");
    }
  });
  await page.getByRole("button", { name: "Crear cuenta y clínica" }).click();
  await expect(
    page.getByRole("heading", { name: "Bienvenido a Pawly." }),
  ).toBeVisible();
  expect(payload).toEqual({
    name: user.name,
    email: user.email,
    password,
    clinicName: clinic.name,
  });
  expect(payload).not.toHaveProperty("confirmation");
});

for (const status of [400, 403, 409, 429, 503]) {
  test(`registro muestra error seguro ${status} sin éxito simulado`, async ({
    page,
  }) => {
    await mock(page, () => ({
      status,
      body: { message: "SECRET_INTERNAL_ERROR_passwordHash" },
    }));
    await page.goto("/registrarse");
    await fillRegistration(page);
    await page.getByRole("button", { name: "Crear cuenta y clínica" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
    await expect(page.getByRole("main").getByRole("alert")).not.toContainText(
      "SECRET_INTERNAL",
    );
    await expect(
      page.getByRole("heading", { name: "Bienvenido a Pawly." }),
    ).toHaveCount(0);
    if (status === 503)
      await expect(page.getByRole("main").getByRole("alert")).toContainText(
        "no está disponible",
      );
  });
}

test("login valida, muestra contraseña y respeta fallos de credenciales", async ({
  page,
}) => {
  await mock(page, () => ({ status: 401, body: { message: "SECRET" } }));
  await page.goto("/iniciar-sesion");
  await page.getByLabel("Correo electrónico").fill(user.email);
  await page.getByLabel("Contraseña", { exact: true }).fill("incorrecta");
  await page
    .getByRole("button", { name: "Mostrar contraseña", exact: true })
    .click();
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await page
    .getByRole("button", { name: "Ocultar contraseña", exact: true })
    .click();
  await expect(page.getByLabel("Contraseña", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Revisa tu correo y contraseña",
  );
  await expect(page).toHaveURL(/iniciar-sesion$/);
});

test("área privada no expone datos antes de verificar y redirige solo ante 401", async ({
  page,
}) => {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/auth/me", async (route) => {
    await wait;
    await route.fulfill({
      status: 401,
      headers: {
        "Access-Control-Allow-Origin": "http://localhost:3100",
        "Access-Control-Allow-Credentials": "true",
      },
      json: {},
    });
  });
  await page.goto("/app?next=https://evil.invalid");
  await expect(
    page.getByRole("heading", { name: "Preparando tu espacio…" }),
  ).toBeVisible();
  await expect(page.getByText(user.name)).toHaveCount(0);
  release();
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
});

test("fallo de conexión permite reintentar sin bucle ni datos privados", async ({
  page,
}) => {
  await page.route("**/api/auth/me", (route) => route.abort("failed"));
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "No pudimos abrir tu espacio." }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("button", { name: "Volver a intentar" }),
  ).toBeVisible();
});

test("verifica acceso a clínica y conserva sesión si falla logout", async ({
  page,
}) => {
  let access = false;
  let logoutStatus = 500;
  await mock(page, (path) => {
    if (path.endsWith("/me")) return { status: 200, body: session };
    if (path.endsWith("/access"))
      return access
        ? { status: 200, body: { clinic: { ...clinic, role: "OWNER" } } }
        : { status: 403 };
    return { status: logoutStatus };
  });
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: `Hola, ${user.name}.` }),
  ).toBeVisible();
  await page.getByRole("button", { name: new RegExp(clinic.name) }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Ya no tienes acceso",
  );
  await expect(page.getByText("Acceso verificado")).toHaveCount(0);
  access = true;
  await page.getByRole("button", { name: new RegExp(clinic.name) }).click();
  await expect(page.getByText("Acceso verificado")).toBeVisible();
  await page.screenshot({
    path: `.next/qa/workspace-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "No pudimos cerrar la sesión",
  );
  await expect(page).toHaveURL(/\/app$/);
  logoutStatus = 204;
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
});

test("sin clínicas muestra un estado vacío real y sin estadísticas inventadas", async ({
  page,
}) => {
  await mock(page, () => ({ status: 200, body: { ...user, memberships: [] } }));
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: "Aún no tienes clínicas disponibles." }),
  ).toBeVisible();
  await expect(page.locator(".workspace-clinic")).toHaveCount(0);
});

test("formularios accesibles sin desbordamiento a 320px y escritorio", async ({
  page,
}) => {
  for (const route of ["/registrarse", "/iniciar-sesion"]) {
    await page.goto(route);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
    }
    await page.setViewportSize(test.info().project.use.viewport!);
    await page.screenshot({
      path: `.next/qa/${route.slice(1)}-${test.info().project.name}.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel("Correo electrónico").focus();
    await expect(page.getByLabel("Correo electrónico")).toBeFocused();
  }
});
