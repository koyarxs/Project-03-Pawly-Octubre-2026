import { randomUUID } from "node:crypto";
import { test, expect, api } from "./support/real-fixtures";
import { isolatedClinics } from "./support/isolated-clinics";

test("consulta real: cita, borrador, finalización, rectificación, historia y permisos", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  const fixtures = await isolatedClinics();
  const email = `clinical-${randomUUID()}@example.invalid`,
    password = "Frase QA de consulta veterinaria 2030";
  const headers = { Origin: "http://localhost:3100", "X-Pawly-CSRF": "1" };
  try {
    const owner = await fixtures.seedOwner({
      name: "Profesional QA Clínica",
      email,
      password,
      clinicName: "Clínica QA Consultas",
    });
    const base = `${api}/clinics/${owner.clinic.id}`,
      path = `/app/clinicas/${owner.clinic.id}`;
    await page.goto("/iniciar-sesion");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await expect(page).toHaveURL(/\/app$/);
    const tutor = await context.request.post(base + "/tutors", {
      headers,
      data: { firstName: "Ana QA", lastName: "Clínica", phone: "+56912345678" },
    });
    expect(tutor.status()).toBe(201);
    const tutorId = (await tutor.json()).id;
    const patient = await context.request.post(base + "/patients", {
      headers,
      data: {
        name: "Luna QA Clínica",
        species: "CAT",
        sex: "FEMALE",
        tutorIds: [tutorId],
      },
    });
    expect(patient.status()).toBe(201);
    const patientId = (await patient.json()).id;
    const professionals = await (
      await context.request.get(base + "/appointments/professionals")
    ).json();
    const professionalMembershipId = professionals[0].id;
    const appointment = await context.request.post(base + "/appointments", {
      headers,
      data: {
        patientId,
        tutorId,
        professionalMembershipId,
        startsAt: "2030-01-07T12:00:00.000Z",
        durationMinutes: 30,
        reason: "Control clínico QA",
      },
    });
    expect(appointment.status()).toBe(201);
    const appointmentId = (await appointment.json()).id;
    await page.goto(path + "/agenda");
    await page.getByLabel("Fecha", { exact: true }).fill("2030-01-07");
    await page.getByRole("button", { name: /09:00.*Luna QA Clínica/ }).click();
    await page.getByRole("link", { name: "Iniciar consulta clínica" }).click();
    await expect(
      page.getByRole("heading", { name: "Nueva consulta", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Guardar borrador", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Editar borrador" }),
    ).toBeVisible();
    const consultationId = page.url().split("/").pop()!;
    const detail = async () => {
      const r = await context.request.get(
        base + `/consultations/${consultationId}`,
      );
      expect(r.status()).toBe(200);
      return r.json();
    };
    expect((await detail()).appointment.status).toBe("IN_PROGRESS");
    expect((await detail()).appointment.id).toBe(appointmentId);
    await page.reload();
    await page.getByRole("button", { name: "Editar borrador" }).click();
    await page
      .getByLabel("Anamnesis y antecedentes", { exact: true })
      .fill("Antecedentes informados por el tutor QA");
    await page
      .getByLabel("Examen físico", { exact: true })
      .fill("Examen físico de prueba QA");
    await page.getByLabel("Peso (kg)", { exact: true }).fill("4.125");
    await page.getByLabel("Temperatura (°C)", { exact: true }).fill("38.5");
    await page
      .getByLabel("Diagnóstico", { exact: true })
      .fill("Diagnóstico presuntivo QA");
    await page
      .getByLabel("Tipo de diagnóstico", { exact: true })
      .selectOption("PRESUMPTIVE");
    await page
      .getByLabel("Tratamiento", { exact: true })
      .fill("Plan de seguimiento QA");
    await page.screenshot({
      path: `.next/qa/consultation-form-${test.info().project.name}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Finalizar consulta", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Confirmar finalización", exact: true })
      .click();
    await expect(
      page.getByText(
        "Consulta finalizada. El registro original se conserva; cualquier corrección se agrega al final.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Editar borrador" }),
    ).toHaveCount(0);
    const original = await detail();
    expect(original.status).toBe("FINALIZED");
    expect(original.appointment.status).toBe("COMPLETED");
    expect(original.weightKg).toBe(4.125);
    await page
      .getByLabel("Motivo de la rectificación", { exact: true })
      .fill("Dato adicional QA");
    await page
      .getByLabel("Corrección o información adicional", { exact: true })
      .fill("Antecedente complementario QA");
    await page
      .getByRole("button", { name: "Guardar rectificación", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Dato adicional QA", exact: true }),
    ).toBeVisible();
    expect(await detail()).toEqual(original);
    await expect(
      page.getByText("Rectificación agregada", { exact: true }),
    ).toBeVisible();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      ).toBe(false);
    }
    await page.setViewportSize(test.info().project.use.viewport!);
    await page.screenshot({
      path: `.next/qa/consultation-detail-${test.info().project.name}.png`,
      fullPage: true,
    });
    await page.getByRole("link", { name: "Historia del paciente" }).click();
    const history = page.getByRole("region", {
      name: "Historia clínica del paciente",
    });
    await expect(
      history.getByRole("heading", { name: "Historia clínica", exact: true }),
    ).toBeVisible();
    await expect(
      history.getByRole("link", { name: "Control clínico QA", exact: true }),
    ).toBeVisible();
    await history.getByLabel("Estado clínico").selectOption("DRAFT");
    await expect(
      history.getByText("Aún no hay atenciones con estos filtros."),
    ).toBeVisible();
    await history.getByLabel("Estado clínico").selectOption("FINALIZED");
    await expect(
      history.getByRole("link", { name: "Control clínico QA", exact: true }),
    ).toBeVisible();
    // A walk-in draft starts from a real patient's history, with no appointment.
    await history.getByRole("link", { name: "Nueva consulta" }).click();
    await page
      .getByLabel("Motivo de consulta *", { exact: true })
      .fill("Consulta sin cita QA");
    await page
      .getByRole("button", { name: "Guardar borrador", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Editar borrador" }),
    ).toBeVisible();
    const walkInId = page.url().split("/").pop()!;
    expect(
      (
        await (
          await context.request.get(base + `/consultations/${walkInId}`)
        ).json()
      ).appointmentId,
    ).toBeNull();
    const audit = page
      .getByRole("heading", { name: "Trazabilidad", exact: true })
      .locator("..");
    await page.goto(path + `/consultas/${consultationId}`);
    await expect(
      audit.getByText("Rectificación agregada", { exact: true }),
    ).toBeVisible();
    const archived = await context.request.patch(
      base + `/patients/${patientId}/archive`,
      { headers, data: {} },
    );
    expect(archived.status()).toBe(200);
    await page.goto(path + `/pacientes/${patientId}`);
    await expect(
      history.getByRole("link", { name: "Control clínico QA", exact: true }),
    ).toBeVisible();
    await expect(
      history.getByRole("link", { name: "Nueva consulta", exact: true }),
    ).toHaveCount(0);
    await page.goto(path + `/consultas/nueva?patientId=${patientId}`);
    await expect(
      page.getByRole("heading", {
        name: "El paciente está archivado.",
        exact: true,
      }),
    ).toBeVisible();
    const other = await fixtures.additionalClinic(owner.userId);
    expect((await context.request.get(`${api}/clinics/${other.id}/consultations/${consultationId}`)).status()).toBe(403);
    await fixtures.verifyMedical(owner.userId,other.id);
    expect(
      (
        await context.request.get(
          `${api}/clinics/${other.id}/consultations/${consultationId}`,
        )
      ).status(),
    ).toBe(404);
    await fixtures.setRole(owner.userId, owner.clinic.id, "RECEPTIONIST");
    await page.goto(path + `/consultas/${consultationId}`);
    await expect(
      page.getByRole("heading", { name: "Acceso clínico restringido" }),
    ).toBeVisible();
    expect(
      (
        await context.request.get(base + `/consultations/${consultationId}`)
      ).status(),
    ).toBe(403);
  } finally {
    await fixtures.close();
  }
});
