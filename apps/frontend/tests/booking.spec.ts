import { expect, test, type Page } from "@playwright/test";
import { withAccessFixture } from "./support/access-fixture";
import type { BookingPolicy, BookingSettings } from "../src/lib/booking";
const clinic = {
  id: "90555a74-dffb-4437-a493-c3b15a5d2246",
  name: "Clínica QA Reservas",
  slug: "qa-reservas",
  timezone: "America/Santiago",
};
const doctor = {
  id: "92244981-bd22-4428-9221-aab03a192741",
  name: "Profesional QA publicado",
};
const serviceId = "dd282ecb-984b-42c8-929c-0ad46ecb9ddd";
const reference = "c5a30a34-5882-4e3e-86e7-d688590ec16e";
const policy: BookingPolicy = {
  publicEnabled: true,
  autoConfirm: false,
  autoAssign: false,
  minNoticeMinutes: 0,
  maxAdvanceDays: 60,
  stepMinutes: 15,
  cancellationNoticeMinutes: 0,
  message: "Condiciones de la prueba de interfaz",
  hours: [],
  professionals: [],
  blocks: [],
};
const headers = {
  "Access-Control-Allow-Origin": "http://localhost:3100",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "content-type,x-pawly-csrf",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
};
const day = (offset = 3) =>
  new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
async function publicRoutes(page: Page, enabled = true, conflict = false) {
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  let startsAt = `${day()}T12:00:00.000Z`,
    status = "PENDING",
    version = 1;
  const receipt = () => ({
    reference,
    status,
    version,
    startsAt,
    endsAt: new Date(Date.parse(startsAt) + 1800000).toISOString(),
    serviceId,
    professionalId: doctor.id,
    timezone: clinic.timezone,
    confirmed: false,
    message:
      status === "PENDING"
        ? "Solicitud recibida, pendiente de aprobación. Todavía no es una cita confirmada."
        : "Esta reserva está cerrada.",
  });
  await page.route("**/api/bookings**", async (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ headers, status: 204 });
    const path = new URL(route.request().url()).pathname;
    const body =
      route.request().method() === "GET" ? {} : route.request().postDataJSON();
    calls.push({ path, body });
    let data: object;
    if (path.endsWith("/site")) data = { slug: clinic.slug };
    else if (path.endsWith("/availability")) {
      const date = new URL(route.request().url()).searchParams.get("date");
      data = {
        timezone: clinic.timezone,
        slots: [
          {
            startsAt: `${date}T12:00:00.000Z`,
            endsAt: `${date}T12:30:00.000Z`,
            professionalId: doctor.id,
          },
        ],
        truncated: false,
      };
    } else if (route.request().method() === "GET")
      data = {
        available: enabled,
        clinic,
        professionals: enabled ? [doctor] : [],
        services: enabled
          ? [
              {
                id: serviceId,
                name: "Consulta QA",
                description: "Servicio de prueba de interfaz",
                durationMinutes: 30,
                professionalIds: [doctor.id],
              },
            ]
          : [],
        policy: {
          ...policy,
          message: enabled
            ? policy.message
            : "El agendamiento público aún no está habilitado.",
        },
      };
    else if (path.endsWith("/cancel")) {
      status = "CANCELLED";
      version++;
      data = receipt();
    } else if (path.endsWith("/reschedule")) {
      startsAt = body.startsAt;
      version++;
      data = receipt();
    } else if (path.endsWith("/lookup")) data = receipt();
    else {
      if (conflict)
        return route.fulfill({
          headers,
          status: 409,
          json: { message: "Conflicto de prueba" },
        });
      data = receipt();
    }
    return route.fulfill({
      headers,
      status: route.request().method() === "GET" ? 200 : 201,
      json: data,
    });
  });
  return calls;
}
async function throughDetails(page: Page) {
  await page.goto("/agendar-cita");
  await page.getByRole("button", { name: /Consulta QA/ }).click();
  await page.getByRole("button", { name: doctor.name }).click();
  await page.getByLabel("Fecha de la cita").fill(day());
  await page
    .locator("label")
    .filter({ has: page.getByRole("radio") })
    .first()
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page
    .getByLabel("Nombre del tutor", { exact: true })
    .fill("Tutor QA de interfaz");
  await page
    .getByLabel("Correo electrónico", { exact: true })
    .fill("booking-qa@example.invalid");
  await page.getByLabel("Teléfono de contacto").fill("+56912345678");
  await page.getByLabel("Nombre de tu mascota").fill("Luna QA");
  await page
    .getByLabel("Motivo de la cita")
    .fill("Control de prueba de interfaz");
  await page.getByRole("button", { name: "Revisar solicitud" }).click();
}
test("portal cerrado no inventa servicios ni horarios", async ({ page }) => {
  await publicRoutes(page, false);
  await page.goto("/agendar-cita");
  await expect(
    page.getByRole("heading", { name: "Estamos preparando nuestra agenda." }),
  ).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

test("selección explícita de médico con retratos y solo personal compatible", async ({ page }) => {
  await publicRoutes(page);
  const team = [
    { id: doctor.id, name: "Dra. Camila Rojas" },
    { id: "3911ae97-1006-43ee-bdf1-33df4b10de8c", name: "Dr. Matías Herrera" },
    { id: "f624d450-3db9-4279-9476-3af680794315", name: "Dra. Valentina Morales" },
  ];
  await page.route("**/api/bookings/qa-reservas", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    return route.fulfill({ headers, json: {
      demo: true,
      available: true,
      clinic,
      professionals: team,
      policy: { ...policy, autoAssign: true },
      services: [
        { id: serviceId, name: "Consulta veterinaria general", description: "Consulta", durationMinutes: 30, professionalIds: team.map((p) => p.id) },
        { id: "7a7dfb0a-df87-488e-abef-891db56f4d3e", name: "Cirugía veterinaria", description: "Evaluación previa", durationMinutes: 120, professionalIds: [team[1].id] },
      ],
    } });
  });
  await page.goto("/agendar-cita");
  await page.getByRole("button", { name: /Consulta veterinaria general/ }).click();
  await expect(page.getByRole("button", { name: "Sin preferencia" })).toHaveCount(0);
  for (const person of team) {
    const card = page.getByRole("button", { name: person.name, exact: true });
    await expect(card).toBeVisible();
    await expect(card.locator("img")).toHaveCount(1);
    await expect.poll(() => card.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  }
  await page.getByRole("navigation", { name: "Atenciones frecuentes" }).getByRole("button", { name: "Consulta general" }).click();
  await expect(page.getByRole("button", { name: team[0].name, exact: true })).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('img[src*="pawly-companions"]')).toHaveCSS("animation-name", "none");
  await page.getByRole("button", { name: "Atrás", exact: true }).click();
  await page.getByRole("button", { name: /Cirugía veterinaria/ }).click();
  await expect(page.getByRole("button", { name: team[1].name, exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: team[0].name, exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: team[2].name, exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sin preferencia" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole("button", { name: team[1].name, exact: true }).click();
  await expect(page.getByLabel("Fecha de la cita")).toBeVisible();
});
test("reserva pública exige consentimiento, diferencia solicitud de confirmación y permite cambios con clave", async ({
  page,
}) => {
  const calls = await publicRoutes(page);
  await throughDetails(page);
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  expect(
    calls.filter(
      (c) => c.path === `/api/bookings/${clinic.slug}` && "consent" in c.body,
    ),
  ).toHaveLength(0);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(
    page.getByRole("heading", { name: "Recibimos tu solicitud." }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Todavía no es una cita confirmada",
  );
  const sent = calls.find((c) => "consent" in c.body)!.body;
  expect(sent).toMatchObject({
    consent: true,
    professionalId: doctor.id,
    serviceId,
  });
  expect(String(sent.managementToken)).toHaveLength(43);
  expect(sent).not.toHaveProperty("clinicId");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Guardar comprobante y clave de gestión" })
    .click();
  expect((await download).suggestedFilename()).toContain(reference);
  await page.getByRole("button", { name: "Reprogramar", exact: true }).click();
  await page.getByLabel("Fecha de la cita").fill(day(4));
  await page
    .locator("label")
    .filter({ has: page.getByRole("radio") })
    .first()
    .click();
  await page.getByRole("button", { name: "Guardar nueva fecha" }).click();
  await expect(
    page.getByRole("button", { name: "Reprogramar", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Motivo de cancelación")
    .fill("Cancelación QA de interfaz");
  await page
    .getByRole("button", { name: "Cancelar reserva", exact: true })
    .click();
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
test("un cupo ocupado vuelve al selector sin anunciar una reserva", async ({
  page,
}) => {
  await publicRoutes(page, true, true);
  await throughDetails(page);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "El horario o registro cambió" }),
  ).toContainText("El horario o registro cambió");
  await expect(
    page.getByRole("heading", { name: "Elige un momento para su cuidado." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recibimos tu solicitud." }),
  ).toHaveCount(0);
});
test("administración crea servicios reales desde el formulario sin enviar un identificador vacío", async ({
  page,
}) => {
  const settings: BookingSettings = {
    configuration: { ...policy, publicEnabled: false },
    version: 1,
    clinic,
    professionals: [doctor],
    services: [],
  };
  let saved: Record<string, unknown> | undefined;
  await page.route("**/api/**", async (route) => {
    if (route.request().method() === "OPTIONS")
      return route.fulfill({ headers, status: 204 });
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/auth/me"))
      data = {
        id: "1f603846-d722-49ef-bb7f-07e129ae4fd8",
        name: "Responsable QA",
        email: "qa@example.invalid",
        emailVerifiedAt: null,
        memberships: [{ role: "OWNER", clinic }],
      };
    else if (path.endsWith("/access"))
      data = withAccessFixture({ clinic: { ...clinic, role: "OWNER" } });
    else if (path.endsWith("/booking/settings")) data = settings;
    else if (path.endsWith("/booking/services")) {
      saved = route.request().postDataJSON();
      data = { id: serviceId, version: 1 };
    } else if (path.endsWith("/appointments/professionals"))
      data = [{ id: doctor.id, user: { name: doctor.name } }];
    else if (path.endsWith("/appointments"))
      data = { items: [], total: 0, totalPages: 0 };
    await route.fulfill({ headers, json: data });
  });
  await page.goto(`/app/clinicas/${clinic.id}/agenda`);
  await page.getByRole("button", { name: "Servicios", exact: true }).click();
  await page.getByLabel("Nombre del servicio").fill("Control veterinario QA");
  await page
    .getByLabel("Descripción pública")
    .fill("Atención configurada por la clínica de prueba");
  await page.getByLabel(doctor.name).check();
  await page.getByLabel("Habilitar servicio para reservas").check();
  await page.getByRole("button", { name: "Guardar servicio" }).click();
  await expect(page.getByRole("status")).toContainText("Servicio guardado");
  expect(saved).toMatchObject({
    name: "Control veterinario QA",
    version: 0,
    professionalIds: [doctor.id],
    enabled: true,
    resourceKey: null,
  });
  expect(saved).not.toHaveProperty("id");
});
