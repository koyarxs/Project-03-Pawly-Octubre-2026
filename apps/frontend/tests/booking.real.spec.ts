import { randomUUID } from "node:crypto";
import { test, expect, api } from "./support/real-fixtures";
import { isolatedClinics } from "./support/isolated-clinics";
test("reservas reales: portal, recepción, paciente verificado, calendario mensual, reprogramación y cancelación", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180000);
  const fixtures = await isolatedClinics(),
    email = `booking-${randomUUID()}@example.invalid`,
    password = "Frase privada QA para agendamiento 2030";
  const headers = { Origin: "http://localhost:3100", "X-Pawly-CSRF": "1" };
  try {
    const owner = await fixtures.seedOwner({
      name: "Responsable QA Reservas",
      email,
      password,
      clinicName: "Veterinaria QA Reservas",
    });
    const setup = await fixtures.setupBooking(owner.userId, owner.clinic.id);
    const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    await page.goto(`/reservar/${owner.clinic.slug}`);
    await page.getByRole("button", { name: /Consulta QA de reservas/ }).click();
    await page
      .getByRole("button", { name: "Profesional QA de reservas" })
      .click();
    await page.getByLabel("Fecha de la cita").fill(date);
    await page
      .locator("label")
      .filter({ has: page.getByRole("radio") })
      .first()
      .click();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page
      .getByLabel("Nombre del tutor", { exact: true })
      .fill("Tutor QA Reservas");
    await page
      .getByLabel("Correo electrónico", { exact: true })
      .fill("tutor-reservas@example.invalid");
    await page.getByLabel("Teléfono de contacto").fill("+56912345678");
    await page.getByLabel("Nombre de tu mascota").fill("Luna QA Reservas");
    await page.getByLabel("Motivo de la cita").fill("Control veterinario QA");
    await page.getByRole("button", { name: "Revisar solicitud" }).click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Enviar solicitud" }).click();
    await expect(
      page.getByRole("heading", { name: "Recibimos tu solicitud." }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText(
      "pendiente de aprobación",
    );
    await page.screenshot({
      path: `.next/qa/booking-public-${info.project.name}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.goto("/iniciar-sesion");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await expect(page).toHaveURL(/\/app$/);
    const base = `${api}/clinics/${owner.clinic.id}`;
    const tutorResult = await context.request.post(`${base}/tutors`, {
      headers,
      data: {
        firstName: "Tutor QA",
        lastName: "Reservas",
        phone: "+56912345678",
      },
    });
    expect(tutorResult.status()).toBe(201);
    const tutorId = (await tutorResult.json()).id;
    const patientResult = await context.request.post(`${base}/patients`, {
      headers,
      data: {
        name: "Luna QA Reservas",
        species: "DOG",
        sex: "FEMALE",
        tutorIds: [tutorId],
      },
    });
    expect(patientResult.status()).toBe(201);
    const patientId = (await patientResult.json()).id;
    await page.goto(`/app/clinicas/${owner.clinic.id}/agenda`);
    await page
      .getByRole("button", { name: "Solicitudes pendientes", exact: true })
      .click();
    let card = page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: /Luna QA Reservas/ }) });
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Confirmar", exact: true }).click();
    await card.getByRole("button", { name: "Aplicar cambio" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Reserva actualizada" }),
    ).toBeVisible();
    await page.getByLabel("Estado de solicitud").selectOption("CONFIRMED");
    card = page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: /Luna QA Reservas/ }) });
    await card
      .getByRole("button", { name: "Vincular paciente", exact: true })
      .click();
    await card.getByLabel("Paciente de la reserva").selectOption(patientId);
    await card.getByLabel("Tutor vinculado").selectOption(tutorId);
    await card.getByRole("checkbox").check();
    await card.getByRole("button", { name: "Aplicar cambio" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Reserva actualizada" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Calendario", exact: true }).click();
    await page.getByLabel("Fecha", { exact: true }).fill(date);
    await page.getByRole("button", { name: "Mes", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Calendario mensual de citas" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("button")
        .filter({ has: page.getByText("Luna QA Reservas", { exact: true }) }),
    ).toBeVisible();
    await page.screenshot({
      path: `.next/qa/booking-month-${info.project.name}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button")
      .filter({ has: page.getByText("Luna QA Reservas", { exact: true }) })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Servicio de la cita")).toHaveValue(
      setup.serviceId,
    );
    const next = new Date(Date.now() + 4 * 86400000).toISOString().slice(0, 10);
    await dialog.getByLabel("Fecha y hora de inicio").fill(`${next}T10:00`);
    await dialog
      .getByRole("button", { name: "Guardar cambios", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    await page.getByLabel("Fecha", { exact: true }).fill(next);
    await page
      .getByRole("button")
      .filter({ has: page.getByText("Luna QA Reservas", { exact: true }) })
      .click();
    await dialog.getByLabel("Estado de la cita").selectOption("CANCELLED");
    await dialog
      .getByLabel("Motivo de cancelación")
      .fill("Cancelación de prueba real aislada");
    await dialog
      .getByRole("button", { name: "Confirmar cancelación", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    const result = await context.request.get(
      `${base}/booking/requests?from=${date}T00:00:00.000Z&to=${next}T23:59:00.000Z`,
    );
    expect(result.status()).toBe(200);
    const rows = await result.json();
    expect(rows.items).toHaveLength(1);
    expect(rows.items[0].status).toBe("CANCELLED");
    expect(rows.items[0]).not.toHaveProperty("tokenHash");
  } finally {
    await fixtures.close();
  }
});
