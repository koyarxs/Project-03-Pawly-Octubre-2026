import { randomUUID } from "node:crypto";
import { test, expect, api } from "./support/real-fixtures";
import { isolatedClinics } from "./support/isolated-clinics";

test("personal real: invitación, consentimiento, publicación, permisos y suspensión", async ({
  page,
  context,
}, info) => {
  test.setTimeout(150000);
  const fixtures = await isolatedClinics();
  const ownerEmail = `owner-staff-${randomUUID()}@example.invalid`,
    workerEmail = `worker-${randomUUID()}@example.invalid`,
    password = "Frase de prueba privada del equipo 2026";
  const clinicId = process.env.PAWLY_QA_WEBSITE_CLINIC_ID!;
  async function login(email: string) {
    await page.goto("/iniciar-sesion");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await expect(page).toHaveURL(/\/app$/);
  }
  page.on("dialog", (dialog) => void dialog.accept());
  try {
    await fixtures.seedOwner({
      name: "Responsable QA Equipo",
      email: ownerEmail,
      password,
      clinicName: "Clínica QA Equipo",
      clinicId,
      medicalVerified: false,
    });
    await login(ownerEmail);
    const ownerCookies = await context.cookies();
    await page.goto(`/app/clinicas/${clinicId}/personal`);
    await expect(
      page.getByRole("heading", { name: "Personal y Accesos", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Invitar trabajador", exact: true })
      .click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Nombre completo").fill("Profesional QA Equipo");
    await dialog.getByLabel("Correo de acceso").fill(workerEmail);
    await dialog
      .getByLabel("Motivo del cambio")
      .fill("Alta ficticia para prueba aislada");
    await dialog
      .getByRole("button", { name: "Crear enlace de invitación" })
      .click();
    const activation = await dialog
      .getByLabel("Enlace de activación")
      .inputValue();
    expect(new URL(activation).pathname).toBe("/activar-acceso");
    await dialog.getByRole("button", { name: "Listo", exact: true }).click();
    await expect(
      page.getByRole("row").filter({ hasText: workerEmail }),
    ).toContainText("Invitación pendiente");
    await page.screenshot({
      path: info.outputPath("personal-equipo.png"),
      fullPage: true,
    });
    await page
      .getByRole("row")
      .filter({ hasText: workerEmail })
      .getByRole("button", { name: /Administrar/ })
      .click();
    dialog = page.getByRole("dialog");
    await dialog
      .getByLabel("Nombre público", { exact: true })
      .fill("Nombre público QA Equipo");
    await dialog
      .getByLabel("Especialidad", { exact: true })
      .fill("Coordinación de atención");
    await dialog
      .getByLabel("Descripción profesional", { exact: true })
      .fill("Presentación pública ficticia para validar consentimiento.");
    await dialog
      .getByLabel("Motivo del cambio")
      .fill("Preparar borrador de presentación");
    await dialog
      .getByRole("button", { name: "Guardar borrador del perfil" })
      .click();
    await expect(dialog).not.toBeVisible();
    await page
      .getByRole("row")
      .filter({ hasText: workerEmail })
      .getByRole("button", { name: /Administrar/ })
      .click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Acceso", exact: true }).click();
    await dialog
      .getByLabel("Excepción Crear y reprogramar citas", { exact: true })
      .selectOption("deny");
    await dialog
      .getByLabel("Motivo del cambio")
      .fill("Limitar reservas durante la prueba de permisos");
    await dialog.getByRole("button", { name: "Confirmar permisos" }).click();
    await expect(dialog).not.toBeVisible();
    await context.clearCookies();
    await page.goto(new URL(activation).pathname + new URL(activation).hash);
    await page.getByLabel("Nueva contraseña", { exact: true }).fill(password);
    expect(new URL(page.url()).hash).toBe("");
    await page
      .getByRole("button", { name: "Activar acceso", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Tu acceso está activado" }),
    ).toBeVisible();
    await login(workerEmail);
    const workerCookies = await context.cookies();
    await page.goto(`/app/clinicas/${clinicId}/dashboard`);
    await expect(
      page.getByRole("link", { name: "Personal y Accesos", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "Consultas", exact: true }),
    ).toHaveCount(0);
    await page.goto(`/app/clinicas/${clinicId}/agenda`);
    await expect(
      page.getByRole("heading", { name: "Agenda veterinaria", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Nueva cita", exact: true }),
    ).toHaveCount(0);
    expect(
      (
        await context.request.post(`${api}/clinics/${clinicId}/appointments`, {
          headers: { Origin: "http://localhost:3100", "X-Pawly-CSRF": "1" },
          data: {},
        })
      ).status(),
    ).toBe(403);
    await page.goto(`/app/clinicas/${clinicId}/mi-perfil`);
    await expect(
      page.getByRole("heading", { name: "Nombre público QA Equipo" }),
    ).toBeVisible();
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().endsWith("/staff/me/consent") &&
          response.status() === 201,
      ),
      page
        .getByRole("button", { name: "Autorizar contenido revisado" })
        .click(),
    ]);
    await expect(
      page.getByRole("heading", { name: "Mi perfil público", exact: true }),
    ).toBeVisible();
    await context.clearCookies();
    await context.addCookies(ownerCookies);
    await page.goto(`/app/clinicas/${clinicId}/personal`);
    await page
      .getByRole("row")
      .filter({ hasText: workerEmail })
      .getByRole("button", { name: /Administrar/ })
      .click();
    dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: "Publicación", exact: true })
      .click();
    await dialog
      .getByLabel("Motivo del cambio")
      .fill("Publicar la versión autorizada");
    await dialog
      .getByRole("button", { name: "Publicar perfil autorizado" })
      .click();
    await expect(dialog).not.toBeVisible();
    const published = await context.request.get(`${api}/website/team`);
    expect(published.status()).toBe(200);
    const team = await published.json();
    expect(team.items).toHaveLength(1);
    expect(JSON.stringify(team).includes(workerEmail)).toBe(false);
    await page.goto("/#equipo");
    await expect(
      page.getByRole("heading", { name: "Nombre público QA Equipo" }),
    ).toBeVisible();
    await expect(
      page.getByText("Dr. Sebastián Morales", { exact: true }),
    ).toHaveCount(0);
    await page.goto(`/app/clinicas/${clinicId}/personal`);
    await page
      .getByRole("row")
      .filter({ hasText: workerEmail })
      .getByRole("button", { name: /Administrar/ })
      .click();
    dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Estado", exact: true }).click();
    await dialog
      .getByLabel("Motivo del cambio")
      .fill("Suspender acceso de prueba");
    await dialog
      .getByRole("button", { name: "Suspender acceso", exact: true })
      .click();
    await expect(dialog).not.toBeVisible();
    expect(
      (await (await context.request.get(`${api}/website/team`)).json()).items,
    ).toHaveLength(0);
    await context.clearCookies();
    await context.addCookies(workerCookies);
    await page.goto(`/app/clinicas/${clinicId}/dashboard`);
    await expect(
      page.getByRole("heading", { name: "Hola, Profesional." }),
    ).toHaveCount(0);
    expect(
      (await context.request.get(`${api}/clinics/${clinicId}/access`)).status(),
    ).toBe(403);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  } finally {
    await fixtures.close();
  }
});
