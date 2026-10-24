import { randomUUID } from "node:crypto";
import { test, expect, api } from "./support/real-fixtures";
import { isolatedClinics } from "./support/isolated-clinics";
import { localStamp } from "../src/lib/appointment-time";
test("proyecto personal: pacientes ficticios y ciclo de atención con permisos simulados locales", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  const fixtures = await isolatedClinics();
  const email = `simulation-${randomUUID()}@example.invalid`,
    password = "Frase exclusivamente ficticia de QA 2030";
  try {
    const clinicId = process.env.PAWLY_QA_WEBSITE_CLINIC_ID!;
    const owner = await fixtures.seedOwner({
      name: "Responsable ficticio QA",
      email,
      password,
      clinicId,
      clinicName: "Porvenir DEMOSTRACIÓN QA",
      medicalVerified: false,
    });
    await fixtures.setupPersonalDemo(owner.userId, clinicId);
    await page.goto("/iniciar-sesion");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await expect(page).toHaveURL(/\/app$/);
    const base = `${api}/clinics/${clinicId}`;
    const settings = await (
      await context.request.get(`${base}/booking/settings`)
    ).json();
    const service = settings.services.find(
      (s: { name: string }) => s.name === "Consulta veterinaria general",
    );
    const professionalId = service.professionals[0].membershipId;
    const day = new Date(Date.now() + 3 * 86400000);
    while (day.getUTCDay() === 0) day.setUTCDate(day.getUTCDate() + 1);
    const date = day.toISOString().slice(0, 10);
    const response = await context.request.get(
      `${base}/booking/availability?serviceId=${service.id}&professionalId=${professionalId}&date=${date}`,
    );
    expect(response.status()).toBe(200);
    const slot = (await response.json()).slots[0];
    await page.goto(`/app/clinicas/${clinicId}/agenda`);
    await expect(page.getByRole("note")).toContainText("Proyecto personal");
    await page.getByLabel("Fecha", { exact: true }).fill(date);
    await page.getByRole("button", { name: "Nueva cita", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const patient = dialog.getByRole("combobox", {
      name: "Paciente",
      exact: true,
    });
    await expect(patient.locator("option")).not.toHaveCount(1);
    await patient.selectOption({ index: 1 });
    const patientName = await patient.locator("option:checked").innerText();
    await dialog
      .getByRole("combobox", { name: "Tutor responsable", exact: true })
      .selectOption({ index: 1 });
    await dialog.getByLabel("Servicio de la cita").selectOption(service.id);
    await dialog
      .getByRole("combobox", { name: "Profesional responsable", exact: true })
      .selectOption(professionalId);
    await dialog
      .getByLabel("Fecha y hora de inicio", { exact: true })
      .fill(localStamp(slot.startsAt, "America/Santiago"));
    await dialog
      .getByLabel("Motivo", { exact: true })
      .fill("Simulación personal completa de agendamiento");
    await dialog
      .getByRole("button", { name: "Crear cita", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    for (const state of ["CONFIRMED", "ARRIVED", "IN_PROGRESS", "COMPLETED"]) {
      await page
        .getByRole("button")
        .filter({ has: page.getByText(patientName, { exact: true }) })
        .click();
      await dialog.getByLabel("Estado de la cita").selectOption(state);
      await dialog
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click();
      await expect(dialog).not.toBeVisible();
    }
    await page
      .getByRole("button")
      .filter({ has: page.getByText(patientName, { exact: true }) })
      .click();
    await expect(dialog).toContainText("Completada");
    await dialog
      .getByRole("button", { name: "Ver historial", exact: true })
      .click();
    await expect(
      dialog.getByRole("region", { name: "Historial de la cita" }),
    ).toContainText("En atención");
    await page.screenshot({
      path: `.next/qa/personal-demo-${info.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await fixtures.close();
  }
});
