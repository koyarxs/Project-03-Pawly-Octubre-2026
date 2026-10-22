import { expect, test, type Page } from "@playwright/test";
import { returnToTab } from "./support/tab-lifecycle";

test.use({ timezoneId: "Asia/Tokyo" });

const clinic = {
  id: "90555a74-dffb-4437-a493-c3b15a5d2246",
  name: "Clínica Resumen QA",
  slug: "resumen",
  timezone: "America/Santiago",
};
const other = {
  ...clinic,
  id: "a84337ac-f937-4de9-96d9-b2acdb73941b",
  name: "Clínica Alternativa QA",
};
const profile = {
  id: "1f603846-d722-49ef-bb7f-07e129ae4fd8",
  name: "Responsable QA",
  email: "overview@example.invalid",
  emailVerifiedAt: null,
  memberships: [
    { clinic, role: "OWNER" },
    { clinic: other, role: "OWNER" },
  ],
};
const cors = {
  "Access-Control-Allow-Origin": "http://localhost:3100",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "content-type,x-pawly-csrf",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};
const path = (id = clinic.id) => `/app/clinicas/${id}/dashboard`;
const tutor = {
  id: "tutor-qa",
  clinicId: clinic.id,
  firstName: "Familia",
  lastName: "QA",
  phone: "+56911111111",
  email: null,
  status: "ACTIVE",
};
const patient = {
  id: "patient-qa",
  clinicId: clinic.id,
  name: "Paciente QA",
  species: "CAT",
  sex: "FEMALE",
  status: "ACTIVE",
  tutors: [tutor],
};
const consultation = {
  id: "consultation-qa",
  clinicId: clinic.id,
  patientId: patient.id,
  appointmentId: null,
  attendedAt: "2026-10-21T13:00:00Z",
  reason: "Consulta QA",
  diagnosis: "",
  diagnosisType: null,
  treatment: "",
  version: 1,
  status: "DRAFT",
  patient,
  professional: { id: "professional-qa", user: { name: "Profesional QA" } },
};
const appointment = (id: string, options: Record<string, unknown> = {}) => ({
  id,
  clinicId: clinic.id,
  patientId: patient.id,
  tutorId: tutor.id,
  professionalMembershipId: null,
  startsAt: "2026-10-22T01:30:00Z",
  endsAt: "2026-10-22T02:00:00Z",
  reason: "Control QA",
  status: "CONFIRMED",
  version: 1,
  cancellationReason: null,
  patient: { id: patient.id, name: patient.name },
  tutor,
  professional: null,
  ...options,
});
type Reply = { status: number; body?: object };
async function mock(
  page: Page,
  handler?: (url: URL) => Reply | Promise<Reply>,
  role = "OWNER",
) {
  await page.clock.install({ time: new Date("2026-10-22T01:00:00Z") });
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    let reply: Reply;
    if (route.request().method() === "OPTIONS") reply = { status: 204 };
    else if (url.pathname.endsWith("/me"))
      reply = {
        status: 200,
        body: {
          ...profile,
          memberships: profile.memberships.map((m) => ({ ...m, role })),
        },
      };
    else if (url.pathname.endsWith("/access"))
      reply = {
        status: 200,
        body: {
          clinic: {
            ...(url.pathname.includes(other.id) ? other : clinic),
            role,
          },
        },
      };
    else reply = handler ? await handler(url) : response(url);
    await route.fulfill({
      status: reply.status,
      headers: cors,
      ...(reply.body ? { json: reply.body } : {}),
    });
  });
}
function response(url: URL): Reply {
  if (url.pathname.endsWith("/appointments"))
    return {
      status: 200,
      body: {
        items: [appointment("appointment-qa")],
        total: 1,
        page: 1,
        totalPages: 1,
      },
    };
  if (url.pathname.endsWith("/patients"))
    return {
      status: 200,
      body: { items: [patient], total: 23, page: 1, limit: 1, totalPages: 23 },
    };
  if (url.pathname.endsWith("/tutors"))
    return {
      status: 200,
      body: { items: [tutor], total: 17, page: 1, limit: 1, totalPages: 17 },
    };
  return {
    status: 200,
    body: {
      items: Array.from({ length: 4 }, (_, i) => ({
        ...consultation,
        id: `consultation-${i}`,
      })),
      total: 4,
      page: 1,
      totalPages: 1,
    },
  };
}
const metric = (page: Page, name: string) =>
  page.getByRole("article", { name, exact: true });

test("el resumen usa totales reales y la fecha de la clínica, no la del navegador", async ({
  page,
}) => {
  const urls: URL[] = [];
  await mock(page, (url) => {
    urls.push(url);
    return response(url);
  });
  await page.goto(path());
  await expect(
    metric(page, "Citas de hoy").locator(".dashboard-metric-value"),
  ).toHaveText("1");
  await expect(
    metric(page, "Pacientes activos").locator(".dashboard-metric-value"),
  ).toHaveText("23");
  await expect(
    metric(page, "Tutores activos").locator(".dashboard-metric-value"),
  ).toHaveText("17");
  await expect(
    metric(page, "Consultas en borrador").locator(".dashboard-metric-value"),
  ).toHaveText("4");
  await expect(page.locator(".dashboard-date time")).toHaveAttribute(
    "datetime",
    "2026-10-21",
  );
  expect(await page.evaluate(() => new Date().getDate())).toBe(22);
  await expect(
    page
      .locator(".dashboard-upcoming")
      .getByRole("link", { name: patient.name }),
  ).toBeVisible();
  await expect(page.locator(".dashboard-upcoming-time time")).toHaveText(
    "22:30",
  );
  expect(
    urls
      .find((u) => u.pathname.endsWith("/appointments"))
      ?.searchParams.get("from"),
  ).toBe("2026-10-21T03:00:00.000Z");
  expect(
    urls
      .find((u) => u.pathname.endsWith("/appointments"))
      ?.searchParams.get("to"),
  ).toBe("2026-10-22T03:00:00.000Z");
  for (const resource of ["patients", "tutors"]) {
    const url = urls.find((u) => u.pathname.endsWith(`/${resource}`))!;
    expect(url.searchParams.get("status")).toBe("ACTIVE");
    expect(url.searchParams.get("limit")).toBe("1");
  }
  expect(
    urls
      .find((u) => u.pathname.endsWith("/consultations"))
      ?.searchParams.get("status"),
  ).toBe("DRAFT");
});

test("busca las próximas citas en páginas posteriores y excluye canceladas/completadas", async ({
  page,
}) => {
  const pages: string[] = [];
  await mock(page, (url) => {
    if (!url.pathname.endsWith("/appointments")) return response(url);
    const current = url.searchParams.get("page")!;
    pages.push(current);
    return {
      status: 200,
      body: {
        items:
          current === "1"
            ? Array.from({ length: 100 }, (_, i) =>
                appointment(`past-${i}`, {
                  startsAt: "2026-10-21T12:00:00Z",
                  endsAt: "2026-10-21T12:30:00Z",
                  status: "COMPLETED",
                }),
              )
            : [
                appointment("cancelled", {
                  status: "CANCELLED",
                  reason: "CANCELLED_PRIVATE",
                }),
                appointment("next", { reason: "Próxima real QA" }),
              ],
        total: 102,
        totalPages: 2,
      },
    };
  });
  await page.goto(path());
  await expect(
    metric(page, "Citas de hoy").locator(".dashboard-metric-value"),
  ).toHaveText("102");
  await expect(page.locator(".dashboard-upcoming li")).toHaveCount(1);
  await expect(page.locator(".dashboard-upcoming")).toContainText(
    "Próxima real QA",
  );
  await expect(page.getByText("CANCELLED_PRIVATE")).toHaveCount(0);
  expect(pages).toEqual(["1", "2"]);
});

test("recepción no solicita ni presenta indicadores o accesos clínicos", async ({
  page,
}) => {
  let consultationRequests = 0;
  await mock(
    page,
    (url) => {
      if (url.pathname.endsWith("/consultations")) consultationRequests++;
      return response(url);
    },
    "RECEPTIONIST",
  );
  await page.goto(path());
  await expect(
    metric(page, "Pacientes activos").locator(".dashboard-metric-value"),
  ).toHaveText("23");
  await expect(metric(page, "Consultas en borrador")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /^Nueva consulta\b/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /^Registrar un paciente\b/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /^Consultar pacientes\b/ }),
  ).toBeVisible();
  expect(consultationRequests).toBe(0);
});

test("un fallo parcial no se transforma en cero y permite recuperar el resumen", async ({
  page,
}) => {
  let failed = true;
  await mock(page, (url) =>
    failed && url.pathname.endsWith("/patients")
      ? { status: 500, body: { message: "SECRET_INTERNAL" } }
      : response(url),
  );
  await page.goto(path());
  await expect(metric(page, "Pacientes activos")).toContainText(
    "No disponible",
  );
  await expect(
    metric(page, "Pacientes activos").locator(".dashboard-metric-value"),
  ).toHaveCount(0);
  await expect(
    metric(page, "Tutores activos").locator(".dashboard-metric-value"),
  ).toHaveText("17");
  await expect(page.getByText("SECRET_INTERNAL")).toHaveCount(0);
  failed = false;
  await page.getByRole("button", { name: "Actualizar resumen" }).click();
  await expect(
    metric(page, "Pacientes activos").locator(".dashboard-metric-value"),
  ).toHaveText("23");
});

test("un cero verificado muestra un estado vacío honesto", async ({ page }) => {
  await mock(page, () => ({
    status: 200,
    body: { items: [], total: 0, page: 1, limit: 1, totalPages: 0 },
  }));
  await page.goto(path());
  await expect(
    metric(page, "Citas de hoy").locator(".dashboard-metric-value"),
  ).toHaveText("0");
  await expect(
    page.getByRole("heading", { name: "Tu jornada tiene espacio." }),
  ).toBeVisible();
  await expect(page.locator(".dashboard-upcoming li")).toHaveCount(0);
});

test("rechaza filas de otra clínica y no expone el contenido recibido", async ({
  page,
}) => {
  await mock(page, (url) =>
    url.pathname.endsWith("/appointments")
      ? {
          status: 200,
          body: {
            items: [
              appointment("foreign", {
                clinicId: other.id,
                reason: "FOREIGN_PRIVATE",
              }),
            ],
            total: 1,
            totalPages: 1,
          },
        }
      : response(url),
  );
  await page.goto(path());
  await expect(metric(page, "Citas de hoy")).toContainText("No disponible");
  await expect(
    page.getByRole("heading", { name: "No pudimos cargar las citas." }),
  ).toBeVisible();
  await expect(page.getByText("FOREIGN_PRIVATE")).toHaveCount(0);
});

test("cambiar de clínica descarta una respuesta del resumen que llega tarde", async ({
  page,
}) => {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await mock(page, async (url) => {
    if (
      url.pathname.includes(clinic.id) &&
      url.pathname.endsWith("/appointments")
    ) {
      await wait;
      return {
        status: 200,
        body: {
          items: [appointment("old", { reason: "OLD_CLINIC_PRIVATE" })],
          total: 1,
          totalPages: 1,
        },
      };
    }
    if (url.pathname.includes(other.id))
      return {
        status: 200,
        body: { items: [], total: 0, page: 1, limit: 1, totalPages: 0 },
      };
    return response(url);
  });
  await page.goto(path());
  await expect(
    page.getByRole("heading", { name: clinic.name, exact: true }),
  ).toBeVisible();
  await page.getByLabel("Cambiar clínica").selectOption(other.id);
  await expect(
    page.getByRole("heading", { name: other.name, exact: true }),
  ).toBeVisible();
  release();
  await expect(
    metric(page, "Citas de hoy").locator(".dashboard-metric-value"),
  ).toHaveText("0");
  await expect(page.getByText("OLD_CLINIC_PRIVATE")).toHaveCount(0);
});

test("un 403 de resumen oculta los datos y ofrece revalidar sin bucle", async ({
  page,
}) => {
  let requests = 0;
  await mock(page, (url) => {
    requests++;
    return url.pathname.endsWith("/appointments")
      ? { status: 403 }
      : response(url);
  });
  await page.goto(path());
  await expect(
    page.getByRole("heading", {
      name: "No pudimos verificar el acceso al resumen.",
    }),
  ).toBeVisible();
  await expect(metric(page, "Pacientes activos")).toHaveCount(0);
  const before = requests;
  await page.clock.runFor(1000);
  expect(requests).toBe(before);
  await expect(
    page.getByRole("button", { name: "Volver a verificar mi acceso" }),
  ).toBeVisible();
});

test("un 401 al cargar indicadores redirige sin presentar datos parciales", async ({
  page,
}) => {
  await mock(page, (url) =>
    url.pathname.endsWith("/appointments") ? { status: 401 } : response(url),
  );
  await page.goto(path());
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
  await expect(metric(page, "Pacientes activos")).toHaveCount(0);
  await expect(page.getByText(patient.name)).toHaveCount(0);
});

test("la revalidación de permisos retira también los indicadores ya cargados", async ({
  page,
}) => {
  await mock(page);
  await page.goto(path());
  await expect(
    metric(page, "Pacientes activos").locator(".dashboard-metric-value"),
  ).toHaveText("23");
  await page.route("**/api/clinics/*/access", (route) =>
    route.fulfill({ status: 403, headers: cors }),
  );
  await returnToTab(page);
  await expect(
    page.getByRole("heading", { name: "No tienes acceso a esta clínica." }),
  ).toBeVisible();
  await expect(metric(page, "Pacientes activos")).toHaveCount(0);
  await expect(page.getByText(patient.name)).toHaveCount(0);
});
