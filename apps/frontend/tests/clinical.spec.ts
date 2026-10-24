import { withAccessFixture } from "./support/access-fixture";
import { test, expect, type Page } from "@playwright/test";
import { returnToTab } from "./support/tab-lifecycle";
const clinic = {
  id: "90555a74-dffb-4437-a493-c3b15a5d2246",
  name: "Clínica del Parque",
  slug: "parque",
  timezone: "America/Santiago",
};
const secondClinic = {
  ...clinic,
  id: "a84337ac-f937-4de9-96d9-b2acdb73941b",
  name: "Clínica del Bosque",
};
const tutor = {
  id: "20ddd5fa-2301-4f65-b205-de9235d6742f",
  clinicId: clinic.id,
  firstName: "Ana",
  lastName: "Pérez",
  phone: "+56 9 12345678",
  email: "qa@example.invalid",
  address: "Dirección QA",
  notes: "PRIVATE_NOTES_QA",
  status: "ACTIVE",
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-01T12:00:00.000Z",
};
const otherTutor = {
  ...tutor,
  id: "c2db73d9-e48c-4152-9a10-37ca51d4d67e",
  firstName: "Luis",
  lastName: "Soto",
};
const patient = {
  id: "d38e58d2-de41-4bba-98fc-a0c65f1b9fd2",
  clinicId: clinic.id,
  name: "Luna",
  species: "CAT",
  sex: "FEMALE",
  breed: null,
  birthDate: "2020-02-29",
  weightKg: 4.125,
  color: null,
  microchip: null,
  notes: "Ficha QA",
  status: "ACTIVE",
  createdAt: tutor.createdAt,
  updatedAt: tutor.updatedAt,
  tutors: [tutor, otherTutor],
};
const profile = {
  id: "1f603846-d722-49ef-bb7f-07e129ae4fd8",
  name: "Responsable QA",
  email: "owner@example.invalid",
  emailVerifiedAt: null,
  memberships: [
    { clinic, role: "OWNER" },
    { clinic: secondClinic, role: "OWNER" },
  ],
};
const base = `/app/clinicas/${clinic.id}`;
const headers = {
  "Access-Control-Allow-Origin": "http://localhost:3100",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "content-type,x-pawly-csrf",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
};
type Reply = { status: number; body?: object };
type Handler = (
  url: URL,
  method: string,
  body: Record<string, unknown> | null,
) => Reply | Promise<Reply>;
async function mock(page: Page, handler?: Handler, role = "OWNER") {
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    let result: Reply;
    if (req.method() === "OPTIONS") result = { status: 204 };
    else if (url.pathname.endsWith("/me"))
      result = { status: 200, body: profile };
    else if (url.pathname.endsWith("/access"))
      result = {
        status: 200,
        body: {
          clinic: {
            ...(url.pathname.includes(secondClinic.id) ? secondClinic : clinic),
            role,
          },
        },
      };
    else
      result = handler
        ? await handler(url, req.method(), req.postDataJSON())
        : defaultResponse(url);
    await route.fulfill({
      status: result.status,
      headers,
      ...(result.body ? { json: withAccessFixture(result.body) } : {}),
    });
  });
}
function defaultResponse(url: URL): Reply {
  const path = url.pathname;
  if (path.endsWith("/consultations"))
    return {
      status: 200,
      body: { items: [], page: 1, total: 0, totalPages: 0 },
    };
  if (path.endsWith(`/tutors/${tutor.id}`)) return { status: 200, body: tutor };
  if (path.endsWith(`/patients/${patient.id}`))
    return { status: 200, body: patient };
  if (path.endsWith("/tutors"))
    return {
      status: 200,
      body: {
        items: [tutor, otherTutor],
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      },
    };
  return {
    status: 200,
    body: { items: [patient], page: 1, limit: 20, total: 1, totalPages: 1 },
  };
}
async function fillTutor(page: Page) {
  await page.getByLabel("Nombre", { exact: true }).fill("Ana");
  await page.getByLabel("Apellidos", { exact: true }).fill("Pérez");
  await page
    .getByLabel("Teléfono de contacto", { exact: true })
    .fill("+56 9 12345678");
}

test("un cambio de cuenta nunca hereda el borrador anterior", async ({
  page,
}) => {
  let changed = false;
  await mock(page);
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      headers,
      json: changed
        ? {
            ...profile,
            id: "a84337ac-f937-4de9-96d9-b2acdb73941b",
            name: "Otra cuenta QA",
          }
        : profile,
    }),
  );
  await page.goto(`${base}/tutores/nuevo`);
  await page
    .getByLabel("Nombre", { exact: true })
    .fill("Borrador privado anterior");
  changed = true;
  await returnToTab(page);
  await expect(page.getByText("Otra cuenta QA", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("");
});

test("búsqueda sin enviar conserva el texto al volver a la pestaña", async ({
  page,
}) => {
  let checks = 0;
  await mock(page);
  page.on("response", (response) => {
    if (new URL(response.url()).pathname.endsWith("/access")) checks++;
  });
  await page.goto(`${base}/tutores`);
  await expect(page.getByRole("table")).toBeVisible();
  await page
    .getByLabel("Buscar tutores", { exact: true })
    .fill("Texto pendiente");
  const before = checks;
  await returnToTab(page);
  await expect.poll(() => checks).toBeGreaterThan(before);
  await expect(page.getByLabel("Buscar tutores", { exact: true })).toHaveValue(
    "Texto pendiente",
  );
});

test("un fallo temporal al volver a la pestaña conserva la edición y permite recuperar conexión", async ({
  page,
}) => {
  let offline = false;
  let accessChecks = 0;
  await mock(page);
  await page.route("**/api/auth/me", async (route) => {
    if (offline) await route.abort("failed");
    else await route.fulfill({ status: 200, headers, json: profile });
  });
  page.on("response", (response) => {
    if (new URL(response.url()).pathname.endsWith("/access")) accessChecks++;
  });
  await page.goto(`${base}/tutores/${tutor.id}/editar`);
  const name = page.getByLabel("Nombre", { exact: true });
  await name.fill("Edición pendiente");
  offline = true;
  await returnToTab(page);
  await expect(page.getByRole("status")).toContainText(
    "Conservamos lo que estás escribiendo",
  );
  await expect(name).toHaveValue("Edición pendiente");
  offline = false;
  const before = accessChecks;
  await returnToTab(page);
  await expect.poll(() => accessChecks).toBeGreaterThan(before);
  await expect(name).toHaveValue("Edición pendiente");
  await expect(
    page.getByText("Conservamos lo que estás escribiendo", { exact: false }),
  ).toHaveCount(0);
});

for (const route of [
  "tutores/nuevo",
  `tutores/${tutor.id}/editar`,
  "pacientes/nuevo",
  `pacientes/${patient.id}/editar`,
]) {
  test(`conserva borrador y foco al volver a la pestaña: ${route}`, async ({
    page,
  }) => {
    let accessChecks = 0;
    await mock(page);
    page.on("response", (response) => {
      if (new URL(response.url()).pathname.endsWith("/access")) accessChecks++;
    });
    await page.goto(`${base}/${route}`);
    const field = page.getByLabel(
      route.startsWith("tutores") ? "Nombre" : "Nombre de la mascota",
      { exact: true },
    );
    await field.fill("Borrador sin guardar");
    const before = accessChecks;
    await returnToTab(page);
    await expect.poll(() => accessChecks).toBeGreaterThan(before);
    await expect(field).toHaveValue("Borrador sin guardar");
    await expect(field).toBeFocused();
    const again = accessChecks;
    await page.evaluate(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      ),
    );
    await expect.poll(() => accessChecks).toBeGreaterThan(again);
    await expect(field).toHaveValue("Borrador sin guardar");
  });
}

test("listas reales, búsqueda, estado vacío y paginación sin notas privadas", async ({
  page,
}) => {
  const requested: string[] = [];
  await mock(page, (url) => {
    requested.push(url.search);
    if (url.searchParams.get("q") === "sin-coincidencia")
      return {
        status: 200,
        body: { items: [], page: 1, limit: 20, total: 0, totalPages: 0 },
      };
    return defaultResponse(url);
  });
  await page.goto(`${base}/tutores`);
  await expect(page.getByRole("table")).toContainText("Ana");
  await expect(page.getByRole("main")).not.toContainText("PRIVATE_NOTES_QA");
  await page
    .getByLabel("Buscar tutores", { exact: true })
    .fill("sin-coincidencia");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No encontramos coincidencias." }),
  ).toBeVisible();
  expect(requested.some((query) => query.includes("q=sin-coincidencia"))).toBe(
    true,
  );
  await expect(
    page.getByRole("button", { name: "Página siguiente" }),
  ).toBeDisabled();
});
test("registro de tutor valida y confirma solo una respuesta real sin enviar clínica ni permisos", async ({
  page,
}) => {
  let payload: Record<string, unknown> | null = null;
  await mock(page, (url, method, body) => {
    if (method === "POST") {
      payload = body;
      return { status: 201, body: { ...tutor, ...body } };
    }
    return defaultResponse(url);
  });
  await page.goto(`${base}/tutores/nuevo`);
  await page
    .getByRole("button", { name: "Registrar tutor", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Revisa los campos",
  );
  expect(payload).toBeNull();
  await fillTutor(page);
  await page
    .getByRole("button", { name: "Registrar tutor", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tutor registrado." }),
  ).toBeVisible();
  expect(payload).not.toHaveProperty("clinicId");
  expect(payload).not.toHaveProperty("role");
  await page.getByRole("link", { name: "Ver ficha", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Ana Pérez", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Mascotas asociadas" }),
  ).toContainText("Luna");
});
test("paciente requiere especie y responsables y permite varios tutores y peso en kg", async ({
  page,
}) => {
  let payload: Record<string, unknown> | null = null;
  await mock(page, (url, method, body) => {
    if (method === "POST") {
      payload = body;
      return {
        status: 201,
        body: { ...patient, ...body, tutors: [tutor, otherTutor] },
      };
    }
    return defaultResponse(url);
  });
  await page.goto(`${base}/pacientes/nuevo`);
  await page.getByLabel("Nombre de la mascota", { exact: true }).fill("Luna");
  await page
    .getByRole("button", { name: "Registrar paciente", exact: true })
    .click();
  await expect(
    page.getByText("Selecciona al menos un responsable de esta clínica."),
  ).toBeVisible();
  expect(payload).toBeNull();
  await page.getByLabel("Especie", { exact: true }).selectOption("CAT");
  await page.getByLabel("Sexo", { exact: true }).selectOption("FEMALE");
  await page.getByLabel(/^Peso/).fill("4.125");
  await page.getByRole("checkbox", { name: /Ana Pérez/ }).check();
  await page.getByRole("checkbox", { name: /Luis Soto/ }).check();
  await page
    .getByRole("button", { name: "Registrar paciente", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Paciente registrado." }),
  ).toBeVisible();
  expect(payload).toMatchObject({
    tutorIds: [tutor.id, otherTutor.id],
    weightKg: 4.125,
    species: "CAT",
  });
  expect(payload).not.toHaveProperty("clinicId");
});
test("edita fichas mediante PATCH con CSRF y conserva los responsables", async ({
  page,
}) => {
  const edits: { url: string; body: Record<string, unknown> | null }[] = [];
  page.on("request", (request) => {
    if (request.method() === "PATCH")
      expect(request.headers()["x-pawly-csrf"]).toBe("1");
  });
  await mock(page, (url, method, body) => {
    if (method === "PATCH") {
      edits.push({ url: url.pathname, body });
      return {
        status: 200,
        body: {
          ...(url.pathname.includes("/patients/") ? patient : tutor),
          ...body,
        },
      };
    }
    return defaultResponse(url);
  });
  await page.goto(`${base}/tutores/${tutor.id}/editar`);
  await expect(page.getByLabel("Teléfono de contacto")).toHaveValue(
    tutor.phone,
  );
  await page.getByLabel("Teléfono de contacto").fill("+56 9 87654321");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByRole("heading", { name: "Tutor actualizado." }),
  ).toBeVisible();
  await page.goto(`${base}/pacientes/${patient.id}/editar`);
  await expect(page.getByLabel(/^Peso/)).toHaveValue("4.125");
  await page.getByLabel(/^Peso/).fill("4.5");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(
    page.getByRole("heading", { name: "Paciente actualizado." }),
  ).toBeVisible();
  expect(edits[1].body?.tutorIds).toEqual([tutor.id, otherTutor.id]);
});
test("recepción registra datos administrativos sin notas clínicas ni archivo", async ({
  page,
}) => {
  await mock(page, undefined, "RECEPTIONIST");
  await page.goto(`${base}/pacientes`);
  await expect(page.getByRole("table")).toContainText("Luna");
  await expect(
    page.getByRole("link", { name: "Nuevo paciente" }),
  ).toBeVisible();
  await page.goto(`${base}/pacientes/nuevo`);
  await expect(
    page.getByLabel("Nombre de la mascota", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Registrar paciente", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Observaciones", { exact: false })).toHaveCount(
    0,
  );
  await page.goto(`${base}/pacientes/${patient.id}`);
  await expect(
    page.getByRole("heading", { name: "Luna", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Editar paciente" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Archivar paciente" }),
  ).toHaveCount(0);
});
test("archivado exige confirmación y mantiene la ficha disponible sin edición", async ({
  page,
}) => {
  let blocked = true;
  let archived = false;
  await mock(page, (url, method) => {
    if (method === "PATCH") {
      if (blocked) return { status: 409 };
      archived = true;
      return { status: 200, body: { ...patient, status: "ARCHIVED" } };
    }
    if (url.pathname.endsWith(`/patients/${patient.id}`))
      return {
        status: 200,
        body: { ...patient, status: archived ? "ARCHIVED" : "ACTIVE" },
      };
    return defaultResponse(url);
  });
  await page.goto(`${base}/pacientes/${patient.id}`);
  await page
    .getByRole("button", { name: "Archivar paciente", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar archivado" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "No se pudo archivar",
  );
  blocked = false;
  await page.getByRole("button", { name: "Confirmar archivado" }).click();
  await expect(page.getByText("Archivado", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Luna", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar paciente" })).toHaveCount(
    0,
  );
});
test("rechaza respuestas de otra clínica antes de presentar datos personales", async ({
  page,
}) => {
  await mock(page, () => ({
    status: 200,
    body: { ...tutor, clinicId: secondClinic.id, firstName: "PRIVATE_FOREIGN" },
  }));
  await page.goto(`${base}/tutores/${tutor.id}`);
  await expect(
    page.getByRole("heading", { name: "No pudimos abrir la ficha." }),
  ).toBeVisible();
  await expect(page.getByText("PRIVATE_FOREIGN")).toHaveCount(0);
});

test("un 403 de lectura oculta registros y ofrece revalidación sin bucle", async ({
  page,
}) => {
  let reads = 0;
  await mock(page, () => {
    reads++;
    return { status: 403, body: { message: "PRIVATE_FORBIDDEN" } };
  });
  await page.goto(`${base}/tutores`);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Tu cuenta no tiene permiso",
  );
  await expect(page.getByRole("main")).not.toContainText("PRIVATE_FORBIDDEN");
  await expect(
    page.getByRole("button", { name: "Verificar mi acceso", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("table")).toHaveCount(0);
  expect(reads).toBe(1);
});
test("cambiar de clínica cancela solicitudes activas y no conserva datos anteriores", async ({
  page,
}) => {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await mock(page, async (url) => {
    if (url.pathname.includes(clinic.id)) {
      await wait;
      return {
        status: 200,
        body: {
          items: [{ ...tutor, firstName: "PRIVATE_PREVIOUS" }],
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };
    }
    return {
      status: 200,
      body: {
        items: [{ ...tutor, clinicId: secondClinic.id, firstName: "Actual" }],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    };
  });
  await page.goto(`${base}/tutores`);
  await expect(page.getByLabel("Cambiar clínica")).toBeVisible();
  await page.getByLabel("Cambiar clínica").selectOption(secondClinic.id);
  await expect(page.getByRole("table")).toContainText("Actual");
  release();
  await expect(page.getByRole("main")).not.toContainText("PRIVATE_PREVIOUS");
  await expect(page).toHaveURL(`/app/clinicas/${secondClinic.id}/tutores`);
});
for (const status of [400, 409, 429])
  test(`error ${status} al guardar no refleja información interna ni simula éxito`, async ({
    page,
  }) => {
    await mock(page, (url, method) =>
      method === "POST"
        ? { status, body: { message: "PRIVATE_INTERNAL_TOKEN" } }
        : defaultResponse(url),
    );
    await page.goto(`${base}/tutores/nuevo`);
    await fillTutor(page);
    await page
      .getByRole("button", { name: "Registrar tutor", exact: true })
      .click();
    await expect(page.getByRole("main").getByRole("alert")).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("PRIVATE_INTERNAL");
    await expect(
      page.getByRole("heading", { name: "Tutor registrado." }),
    ).toHaveCount(0);
  });
test("tablas, formularios y fichas son responsive y accesibles", async ({
  page,
}) => {
  await mock(page);
  for (const [suffix, label] of [
    ["tutores", "tutors-list"],
    ["tutores/nuevo", "tutor-form"],
    ["pacientes/nuevo", "patient-form"],
    [`pacientes/${patient.id}`, "patient-detail"],
  ]) {
    await page.goto(`${base}/${suffix}`);
    await expect(
      page
        .locator(".clinical-list,.clinical-form,.clinical-detail-card")
        .first(),
    ).toBeVisible();
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
      path: `.next/qa/${label}-${test.info().project.name}.png`,
      fullPage: true,
    });
  }
});
