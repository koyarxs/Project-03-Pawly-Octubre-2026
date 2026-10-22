import { expect, test, type Page } from "@playwright/test";

// Synthetic HTTP fixtures only. Every API request is intercepted; these tests
// never create sessions or clinical data in the development database.
const clinic = {
  id: "90555a74-dffb-4437-a493-c3b15a5d2246",
  name: "Clínica QA Premium",
  slug: "premium-qa",
  timezone: "America/Santiago",
};
const owner = {
  id: "1f603846-d722-49ef-bb7f-07e129ae4fd8",
  name: "Profesional QA",
  email: "premium@example.invalid",
  emailVerifiedAt: null,
};
const professional = {
  id: "a84337ac-f937-4de9-96d9-b2acdb73941b",
  user: { name: owner.name },
};
const tutor = {
  id: "20ddd5fa-2301-4f65-b205-de9235d6742f",
  clinicId: clinic.id,
  firstName: "Ana",
  lastName: "Pruebas",
  phone: "+56912345678",
  email: null,
  address: null,
  notes: null,
  status: "ACTIVE",
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-01T12:00:00.000Z",
};
const patient = {
  id: "d38e58d2-de41-4bba-98fc-a0c65f1b9fd2",
  clinicId: clinic.id,
  name: "Luna QA",
  species: "CAT",
  sex: "FEMALE",
  breed: null,
  birthDate: null,
  weightKg: 4,
  color: null,
  microchip: null,
  notes: null,
  status: "ACTIVE",
  tutors: [tutor],
  createdAt: tutor.createdAt,
  updatedAt: tutor.updatedAt,
};
const initialAppointment = {
  id: "7b599a48-eb04-4a3b-8ad9-d6c65569302b",
  clinicId: clinic.id,
  patientId: patient.id,
  tutorId: tutor.id,
  professionalMembershipId: professional.id,
  startsAt: "2030-01-07T12:00:00.000Z",
  endsAt: "2030-01-07T12:30:00.000Z",
  reason: "Control preventivo QA",
  status: "CONFIRMED",
  version: 1,
  cancellationReason: null,
  patient: { id: patient.id, name: patient.name },
  tutor,
  professional,
  consultation: null,
};
const initialConsultation = {
  id: "b31bc105-4723-4607-9d05-0aa4690a1257",
  clinicId: clinic.id,
  patientId: patient.id,
  appointmentId: null,
  professionalMembershipId: professional.id,
  attendedAt: "2026-10-19T12:00:00.000Z",
  reason: "Consulta preventiva QA",
  anamnesis: "",
  physicalExam: "",
  findings: "",
  diagnosis: "",
  diagnosisType: null,
  treatment: "",
  instructions: "",
  notes: "",
  weightKg: null,
  temperatureC: null,
  heartRate: null,
  respiratoryRate: null,
  nextControlAt: null,
  status: "DRAFT",
  version: 1,
  createdAt: "2026-10-19T12:00:00.000Z",
  updatedAt: "2026-10-19T12:00:00.000Z",
  finalizedAt: null,
  patient: { id: patient.id, name: patient.name },
  professional,
  creator: professional,
  finalizer: null,
  appointment: null,
};
const base = `/app/clinicas/${clinic.id}`;
const headers = {
  "Access-Control-Allow-Origin": "http://localhost:3100",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Headers": "content-type,x-pawly-csrf",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
};

async function mockModules(page: Page, role = "OWNER") {
  const state = {
    appointments: [{ ...initialAppointment }] as Record<string, unknown>[],
    consultation: { ...initialConsultation } as Record<string, unknown>,
    writes: [] as {
      path: string;
      method: string;
      body: Record<string, unknown>;
      csrf: string | undefined;
    }[],
    queries: [] as URL[],
  };
  const paginated = (items: unknown[], limit = 20) => ({
    items,
    total: items.length,
    page: 1,
    totalPages: items.length ? 1 : 0,
    limit,
  });
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname,
      method = request.method();
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers });
    state.queries.push(url);
    let body: unknown,
      status = 200;
    if (path.endsWith("/auth/me"))
      body = { ...owner, memberships: [{ role, clinic }] };
    else if (path.endsWith("/access")) body = { clinic: { ...clinic, role } };
    else if (path.endsWith("/appointments/professionals"))
      body = [professional];
    else if (path.endsWith(`/patients/${patient.id}`)) body = patient;
    else if (path.endsWith("/patients")) body = paginated([patient]);
    else if (path.endsWith("/tutors")) body = paginated([tutor]);
    else if (/\/appointments\/[^/]+\/history$/.test(path))
      body = [
        {
          id: "5f91835b-97ee-491d-a69c-7d9fe7d51f55",
          createdAt: "2026-10-19T12:00:00.000Z",
          before: null,
          after: initialAppointment,
          actor: professional,
        },
      ];
    else if (path.endsWith("/appointments") && method === "GET")
      body = paginated(
        state.appointments.filter(
          (a) =>
            Date.parse(String(a.startsAt)) <
              Date.parse(url.searchParams.get("to")!) &&
            Date.parse(String(a.endsAt)) >
              Date.parse(url.searchParams.get("from")!) &&
            (!url.searchParams.get("status") ||
              a.status === url.searchParams.get("status")) &&
            (!url.searchParams.get("professionalMembershipId") ||
              a.professionalMembershipId ===
                url.searchParams.get("professionalMembershipId")),
        ),
        100,
      );
    else if (
      path.includes("/appointments") &&
      ["POST", "PATCH"].includes(method)
    ) {
      const input = request.postDataJSON();
      state.writes.push({
        path,
        method,
        body: input,
        csrf: request.headers()["x-pawly-csrf"],
      });
      const previous =
        method === "PATCH"
          ? state.appointments.find((a) => path.endsWith(String(a.id)))!
          : initialAppointment;
      const saved = {
        ...previous,
        ...input,
        id:
          method === "POST"
            ? "c2db73d9-e48c-4152-9a10-37ca51d4d67e"
            : previous.id,
        status: input.status || "SCHEDULED",
        professional: input.professionalMembershipId ? professional : null,
        endsAt: new Date(
          Date.parse(input.startsAt) + input.durationMinutes * 60000,
        ).toISOString(),
        version: Number(previous.version) + 1,
      };
      state.appointments =
        method === "POST"
          ? [...state.appointments, saved]
          : state.appointments.map((a) => (a.id === saved.id ? saved : a));
      body = saved;
      status = method === "POST" ? 201 : 200;
    } else if (/\/consultations\/[^/]+\/history$/.test(path))
      body = paginated([
        {
          id: "5f91835b-97ee-491d-a69c-7d9fe7d51f55",
          kind: "CREATED",
          createdAt: initialConsultation.createdAt,
          actor: professional,
          snapshot: state.consultation,
        },
      ]);
    else if (path.endsWith("/amendments")) body = paginated([]);
    else if (
      path.includes("/consultations") &&
      ["POST", "PATCH"].includes(method)
    ) {
      const input = request.postDataJSON();
      state.writes.push({
        path,
        method,
        body: input,
        csrf: request.headers()["x-pawly-csrf"],
      });
      state.consultation = {
        ...state.consultation,
        ...input,
        status: input.status || "DRAFT",
        version: Number(state.consultation.version) + 1,
        ...(input.status === "FINALIZED"
          ? {
              finalizedAt: initialConsultation.createdAt,
              finalizer: professional,
            }
          : {}),
      };
      body = state.consultation;
      status = method === "POST" ? 201 : 200;
    } else if (path.endsWith(`/consultations/${initialConsultation.id}`))
      body = state.consultation;
    else if (path.endsWith("/consultations"))
      body = paginated([state.consultation]);
    else {
      status = 404;
      body = { statusCode: 404, message: "Fixture no disponible" };
    }
    await route.fulfill({ status, headers, json: body });
  });
  return state;
}

test("agenda premium conserva vistas y filtros con respuestas de la clínica activa", async ({
  page,
}) => {
  const state = await mockModules(page);
  await page.goto(`${base}/agenda`);
  await page.getByLabel("Fecha", { exact: true }).fill("2030-01-07");
  await expect(
    page.getByRole("button", { name: /09:00.*Luna QA/ }),
  ).toBeVisible();
  await expect(page.locator(".agenda-column")).toHaveCount(7);
  await page.getByRole("button", { name: "Día", exact: true }).click();
  await expect(page.locator(".agenda-column")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("CONFIRMED");
  await page
    .getByRole("combobox", { name: "Profesional", exact: true })
    .selectOption(professional.id);
  await expect
    .poll(() =>
      state.queries.some(
        (url) =>
          url.searchParams.get("status") === "CONFIRMED" &&
          url.searchParams.get("professionalMembershipId") === professional.id,
      ),
    )
    .toBe(true);
  await expect(
    page.getByRole("button", { name: /09:00.*Luna QA/ }),
  ).toContainText("Confirmada");
  await page.getByRole("button", { name: "Semana", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Calendario semanal de citas" }),
  ).toBeVisible();
  expect(state.writes).toHaveLength(0);
});

test("nueva cita preserva el contrato UTC, paciente, tutor y protección CSRF", async ({
  page,
}) => {
  const state = await mockModules(page);
  await page.goto(`${base}/agenda`);
  await page.getByLabel("Fecha", { exact: true }).fill("2030-01-07");
  await page.getByRole("button", { name: "Nueva cita", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Nueva cita", exact: true });
  await dialog
    .getByRole("combobox", { name: "Paciente", exact: true })
    .selectOption(patient.id);
  await dialog
    .getByRole("combobox", { name: "Tutor responsable", exact: true })
    .selectOption(tutor.id);
  await dialog
    .getByLabel("Fecha y hora de inicio", { exact: true })
    .fill("2030-01-07T10:00");
  await dialog.getByLabel("Duración (minutos)", { exact: true }).fill("45");
  await dialog
    .getByRole("combobox", { name: "Profesional responsable", exact: true })
    .selectOption(professional.id);
  await dialog
    .getByLabel("Motivo", { exact: true })
    .fill("Atención de prueba premium");
  await dialog.getByRole("button", { name: "Crear cita", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0]).toMatchObject({
    method: "POST",
    csrf: "1",
    body: {
      patientId: patient.id,
      tutorId: tutor.id,
      professionalMembershipId: professional.id,
      startsAt: "2030-01-07T13:00:00.000Z",
      durationMinutes: 45,
    },
  });
  expect(state.writes[0].body).not.toHaveProperty("clinicId");
  expect(state.writes[0].body).not.toHaveProperty("role");
  await expect(
    page.getByRole("button", {
      name: /10:00.*Luna QA.*Atención de prueba premium/,
    }),
  ).toBeVisible();
});

test("cancelar conserva la cita, su historial y el retorno del foco del diálogo", async ({
  page,
}) => {
  const state = await mockModules(page);
  await page.goto(`${base}/agenda`);
  await page.getByLabel("Fecha", { exact: true }).fill("2030-01-07");
  const card = page.getByRole("button", { name: /09:00.*Luna QA/ });
  await card.click();
  const dialog = page.getByRole("dialog", {
    name: "Detalle de cita",
    exact: true,
  });
  await dialog
    .getByRole("combobox", { name: "Estado de la cita", exact: true })
    .selectOption("CANCELLED");
  await dialog
    .getByLabel(/^Motivo de cancelación/)
    .fill("Tutor solicita otra fecha");
  await dialog.getByRole("button", { name: "Confirmar cancelación" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(card).toContainText("Cancelada");
  expect(state.writes[0]).toMatchObject({
    method: "PATCH",
    csrf: "1",
    body: {
      status: "CANCELLED",
      cancellationReason: "Tutor solicita otra fecha",
      version: 1,
      startsAt: initialAppointment.startsAt,
    },
  });
  await card.click();
  await expect(
    dialog.getByRole("button", { name: "Guardar cambios" }),
  ).toHaveCount(0);
  await dialog
    .getByRole("button", { name: "Ver historial", exact: true })
    .click();
  await expect(
    dialog
      .getByRole("region", { name: "Historial de la cita" })
      .getByRole("listitem"),
  ).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(card).toBeFocused();
});

test("consulta premium guarda borrador y finaliza únicamente tras validar y confirmar", async ({
  page,
}) => {
  const state = await mockModules(page);
  await page.goto(`${base}/consultas/nueva?patientId=${patient.id}`);
  await expect(
    page.getByRole("heading", { name: "Nueva consulta", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Secciones de la consulta" })
    .getByRole("link", { name: /Plan y seguimiento/ })
    .click();
  await expect(
    page.getByLabel("Próximo control", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Motivo de consulta *", { exact: true })
    .fill("Revisión premium QA");
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Editar borrador", exact: true }),
  ).toBeVisible();
  expect(state.writes[0]).toMatchObject({
    method: "POST",
    csrf: "1",
    body: {
      patientId: patient.id,
      appointmentId: null,
      professionalMembershipId: professional.id,
      reason: "Revisión premium QA",
    },
  });
  expect(state.writes[0].body.requestId).toMatch(/^[a-f0-9-]{36}$/);
  expect(state.writes[0].body).not.toHaveProperty("clinicId");
  await page
    .getByRole("button", { name: "Editar borrador", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finalizar consulta", exact: true })
    .click();
  await expect(
    page.locator(".medical-workspace").getByRole("alert"),
  ).toContainText("Para finalizar completa");
  expect(state.writes).toHaveLength(1);
  for (const label of [
    "Anamnesis y antecedentes",
    "Examen físico",
    "Diagnóstico",
    "Tratamiento",
  ])
    await page.getByLabel(label, { exact: true }).fill(`${label} QA`);
  await page
    .getByRole("combobox", { name: "Tipo de diagnóstico", exact: true })
    .selectOption("PRESUMPTIVE");
  await page
    .getByRole("button", { name: "Finalizar consulta", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "¿Finalizar esta consulta?",
  });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  expect(state.writes).toHaveLength(1);
  await page
    .getByRole("button", { name: "Finalizar consulta", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Confirmar finalización", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Rectificaciones", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Editar borrador", exact: true }),
  ).toHaveCount(0);
  expect(state.writes[1]).toMatchObject({
    method: "PATCH",
    csrf: "1",
    body: { status: "FINALIZED", diagnosisType: "PRESUMPTIVE" },
  });
});

test("recepción conserva la restricción clínica y los módulos no desbordan entre 320 y 1440 px", async ({
  page,
}) => {
  const restricted = await mockModules(page, "RECEPTIONIST");
  await page.goto(`${base}/consultas`);
  await expect(
    page.getByRole("heading", { name: "Acceso clínico restringido" }),
  ).toBeVisible();
  expect(
    restricted.queries.some((url) => url.pathname.endsWith("/consultations")),
  ).toBe(false);
  await page.unrouteAll();
  await mockModules(page);
  for (const path of [
    "agenda",
    "pacientes",
    `pacientes/${patient.id}`,
    "consultas/nueva",
  ]) {
    await page.goto(`${base}/${path}`);
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1 }),
    ).toBeVisible();
    for (const width of [320, 375, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} a ${width}px`,
      ).toBe(true);
    }
  }
});
