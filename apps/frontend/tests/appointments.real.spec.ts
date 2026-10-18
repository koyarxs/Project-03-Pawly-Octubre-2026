import { randomUUID } from "node:crypto";
import { test, expect, api } from "./support/real-fixtures";
import { isolatedClinics } from "./support/isolated-clinics";

test("agenda real: crear, reprogramar, conflicto, cancelar, historial y vista responsive", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const fixtures = await isolatedClinics();
  const email = `agenda-${randomUUID()}@example.invalid`,
    password = "Frase privada QA agenda veterinaria 2030";
  const headers = { Origin: "http://localhost:3100", "X-Pawly-CSRF": "1" };
  try {
    const owner = await fixtures.seedOwner({
      name: "Veterinaria QA Agenda",
      email,
      password,
      clinicName: "Clínica QA Agenda",
    });
    const base = `${api}/clinics/${owner.clinic.id}`;
    await page.goto("/iniciar-sesion");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await expect(page).toHaveURL(/\/app$/);
    const tutor = await context.request.post(base + "/tutors", {
      headers,
      data: { firstName: "Ana QA", lastName: "Agenda", phone: "+56912345678" },
    });
    expect(tutor.status()).toBe(201);
    const tutorId = (await tutor.json()).id;
    const patient = await context.request.post(base + "/patients", {
      headers,
      data: {
        name: "Luna QA Agenda",
        species: "CAT",
        sex: "FEMALE",
        tutorIds: [tutorId],
      },
    });
    expect(patient.status()).toBe(201);
    const patientId = (await patient.json()).id;
    await page.goto(`/app/clinicas/${owner.clinic.id}/agenda`);
    await expect(
      page.getByRole("heading", { name: "Agenda veterinaria" }),
    ).toBeVisible();
    await page.getByLabel("Fecha", { exact: true }).fill("2030-01-07");
    await expect(
      page.getByText("No hay citas con estos filtros.", { exact: false }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Nueva cita", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("combobox", { name: "Paciente", exact: true })
      .selectOption(patientId);
    await dialog
      .getByRole("combobox", { name: "Tutor responsable", exact: true })
      .selectOption(tutorId);
    await dialog
      .getByLabel("Fecha y hora de inicio", { exact: true })
      .fill("2030-01-07T09:00");
    const professionals = await (
      await context.request.get(base + "/appointments/professionals")
    ).json();
    const professionalId = professionals[0].id;
    await dialog
      .getByRole("combobox", { name: "Profesional responsable", exact: true })
      .selectOption(professionalId);
    await dialog
      .getByLabel("Motivo", { exact: true })
      .fill("Control preventivo QA");
    await dialog
      .getByRole("button", { name: "Crear cita", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    const card = page.getByRole("button", { name: /09:00.*Luna QA Agenda/ });
    await expect(card).toBeVisible();
    const list = await context.request.get(
      base + "/appointments?from=2030-01-07T00:00:00Z&to=2030-01-08T00:00:00Z",
    );
    const appointment = (await list.json()).items[0];
    expect(appointment.startsAt).toBe("2030-01-07T12:00:00.000Z");
    const conflict = await context.request.post(base + "/appointments", {
      headers,
      data: {
        patientId,
        tutorId,
        professionalMembershipId: professionalId,
        startsAt: appointment.startsAt,
        durationMinutes: 30,
        reason: "Conflicto QA",
      },
    });
    expect(conflict.status()).toBe(409);
    await card.click();
    await dialog
      .getByLabel("Fecha y hora de inicio", { exact: true })
      .fill("2030-01-07T10:00");
    await dialog
      .getByRole("combobox", { name: "Estado de la cita", exact: true })
      .selectOption("CONFIRMED");
    await dialog
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    const updated = page.getByRole("button", { name: /10:00.*Luna QA Agenda/ });
    await expect(updated).toContainText("Confirmada");
    await page.screenshot({
      path: `.next/qa/agenda-week-${test.info().project.name}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Día", exact: true }).click();
    await expect(updated).toBeVisible();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
    }
    await page.setViewportSize(test.info().project.use.viewport!);
    await page.screenshot({
      path: `.next/qa/agenda-${test.info().project.name}.png`,
      fullPage: true,
    });
    await updated.click();
    await dialog
      .getByRole("button", { name: "Ver historial", exact: true })
      .click();
    await expect(
      dialog
        .getByRole("region", { name: "Historial de la cita" })
        .getByRole("listitem"),
    ).toHaveCount(2);
    await dialog
      .getByRole("combobox", { name: "Estado de la cita", exact: true })
      .selectOption("CANCELLED");
    await dialog
      .getByLabel(/^Motivo de cancelación/)
      .fill("Tutor solicita cancelar QA");
    await dialog
      .getByRole("button", { name: "Confirmar cancelación", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await expect(updated).toContainText("Cancelada");
    await page.reload();
    await page.getByLabel("Fecha", { exact: true }).fill("2030-01-07");
    await page.getByRole("button", { name: /10:00.*Luna QA Agenda/ }).click();
    await expect(
      dialog.getByRole("button", { name: "Guardar cambios", exact: true }),
    ).toHaveCount(0);
    await dialog
      .getByRole("button", { name: "Ver historial", exact: true })
      .click();
    await expect(
      dialog
        .getByRole("region", { name: "Historial de la cita" })
        .getByRole("listitem"),
    ).toHaveCount(3);
    await dialog
      .getByRole("button", { name: "Cerrar cita", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Estado", exact: true })
      .selectOption("SCHEDULED");
    await expect(
      page.getByText("No hay citas con estos filtros.", { exact: false }),
    ).toBeVisible();
    await context.route("**/appointments?**", (route) =>
      route.fulfill({
        status: 503,
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:3100",
          "Access-Control-Allow-Credentials": "true",
        },
        json: { message: "Error interno" },
      }),
    );
    await page.getByRole("button", { name: "Actualizar", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "No pudimos cargar la agenda." }),
    ).toBeVisible();
    await context.unroute("**/appointments?**");
    await page.getByRole("button", { name: "Reintentar", exact: true }).click();
    await expect(
      page.getByText("No hay citas con estos filtros.", { exact: false }),
    ).toBeVisible();
  } finally {
    await fixtures.close();
  }
});
