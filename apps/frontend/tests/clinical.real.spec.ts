import { randomUUID } from "node:crypto";
import { test, expect, api } from "./support/real-fixtures";
import { isolatedClinics } from "./support/isolated-clinics";

test("tutores y pacientes reales: fichas, edición, aislamiento, roles y archivado", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(120000);
  const fixtures = await isolatedClinics();
  const email = `clinical-${randomUUID()}@example.invalid`,
    password = "Frase privada clínica de pruebas Pawly 2026";
  const headers = { Origin: "http://localhost:3100", "X-Pawly-CSRF": "1" };
  try {
    const owner = await fixtures.seedOwner({
      name: "Responsable QA Clínico",
      email,
      password,
      clinicName: `Clínica QA Sprint 07 ${test.info().project.name}`,
    });
    const other = await fixtures.additionalClinic(owner.userId);
    const base = `/app/clinicas/${owner.clinic.id}`;
    const endpoint = `${api}/clinics/${owner.clinic.id}`;
    await page.goto(`${base}/tutores`);
    await expect(page).toHaveURL(/\/iniciar-sesion$/);
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await expect(page).toHaveURL(/\/app$/);
    await page.goto(`${base}/tutores`);
    await expect(
      page.getByRole("heading", { name: "Tu primer tutor empieza aquí." }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Nuevo tutor", exact: true }).click();
    await page.getByLabel("Nombre", { exact: true }).fill("Ana QA");
    await page.getByLabel("Apellidos", { exact: true }).fill("Pérez");
    await page
      .getByLabel("Teléfono de contacto", { exact: true })
      .fill("+56 9 12345678");
    await page.getByLabel(/^Correo electrónico/).fill("ana-qa@example.invalid");
    await page
      .getByRole("button", { name: "Registrar tutor", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Tutor registrado." }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Ver ficha", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Ana QA Pérez", exact: true }),
    ).toBeVisible();
    const tutorId = new URL(page.url()).pathname.split("/").at(-1)!;
    const secondResponse = await context.request.post(`${endpoint}/tutors`, {
      headers,
      data: { firstName: "Luis QA", lastName: "Soto", phone: "+56 9 11112222" },
    });
    expect(secondResponse.status()).toBe(201);
    const second = await secondResponse.json();
    await page.getByRole("link", { name: "Editar tutor", exact: true }).click();
    await page.getByLabel("Teléfono de contacto").fill("+56 9 87654321");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(
      page.getByRole("heading", { name: "Tutor actualizado." }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Ver ficha", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Información registrada" }),
    ).toContainText("+56 9 87654321");
    await page.goto(`${base}/pacientes`);
    await expect(
      page.getByRole("heading", { name: "Tu primera ficha está por llegar." }),
    ).toBeVisible();
    await page
      .getByRole("link", { name: "Nuevo paciente", exact: true })
      .click();
    await page
      .getByLabel("Nombre de la mascota", { exact: true })
      .fill("Luna QA");
    await page.getByLabel("Especie", { exact: true }).selectOption("CAT");
    await page.getByLabel("Sexo", { exact: true }).selectOption("FEMALE");
    await page.getByLabel(/^Peso/).fill("4.125");
    await page.getByLabel(/^Fecha de nacimiento/).fill("2020-02-29");
    await page.getByRole("checkbox", { name: /Ana QA Pérez/ }).check();
    await page.getByRole("checkbox", { name: /Luis QA Soto/ }).check();
    await page
      .getByRole("button", { name: "Registrar paciente", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Paciente registrado." }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Ver ficha", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Luna QA", exact: true }),
    ).toBeVisible();
    const patientId = new URL(page.url()).pathname.split("/").at(-1)!;
    await expect(
      page.getByRole("region", { name: "Responsables del paciente" }),
    ).toContainText("Luis QA Soto");
    await expect(
      page.getByRole("region", { name: "Información registrada" }),
    ).toContainText("29/02/2020");
    expect(
      await (await request.get(`${base}/pacientes/${patientId}`)).text(),
    ).not.toContain("Luna QA");
    await page
      .getByRole("link", { name: "Editar paciente", exact: true })
      .click();
    await page.getByLabel(/^Peso/).fill("4.5");
    await page
      .getByLabel(/^Observaciones/)
      .fill("Observación QA guardada mediante API real.");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(
      page.getByRole("heading", { name: "Paciente actualizado." }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Ver ficha", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Información registrada" }),
    ).toContainText("4,5 kg");
    await page.reload();
    await expect(
      page.getByRole("region", { name: "Información registrada" }),
    ).toContainText("Observación QA guardada");
    await page.goto(`${base}/tutores/${tutorId}`);
    await expect(
      page.getByRole("region", { name: "Mascotas asociadas" }),
    ).toContainText("Luna QA");
    await page
      .getByRole("button", { name: "Archivar tutor", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirmar archivado" }).click();
    await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
      "No se pudo archivar",
    );
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancelar", exact: true })
      .click();
    const foreignResponse = await context.request.post(
      `${api}/clinics/${other.id}/tutors`,
      {
        headers,
        data: {
          firstName: "Tutor QA Externo",
          lastName: "Bosque",
          phone: "+56 9 22223333",
        },
      },
    );
    expect(foreignResponse.status()).toBe(201);
    const foreign = await foreignResponse.json();
    expect(
      (
        await context.request.patch(`${endpoint}/patients/${patientId}`, {
          headers,
          data: { tutorIds: [foreign.id] },
        })
      ).status(),
    ).toBe(400);
    await page.goto(`${base}/tutores/${foreign.id}`);
    await expect(
      page.getByRole("heading", { name: "No pudimos abrir la ficha." }),
    ).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("Tutor QA Externo");
    await page.goto(`${base}/pacientes/${patientId}`);
    await page
      .getByRole("button", { name: "Archivar paciente", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirmar archivado" }).click();
    await expect(page.getByText("Archivado", { exact: true })).toBeVisible();
    await page.goto(`${base}/pacientes`);
    await page.getByLabel("Estado de pacientes").selectOption("ARCHIVED");
    await expect(page.getByRole("table")).toContainText("Luna QA");
    await fixtures.setRole(owner.userId, owner.clinic.id, "RECEPTIONIST");
    await page.reload();
    await expect(
      page.getByRole("link", { name: "Nuevo paciente", exact: true }),
    ).toHaveCount(0);
    expect(
      (
        await context.request.patch(`${endpoint}/patients/${patientId}`, {
          headers,
          data: { name: "Forbidden" },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await context.request.patch(`${endpoint}/tutors/${second.id}/archive`, {
          headers,
          data: {},
        })
      ).status(),
    ).toBe(403);
    await page.goto(`${base}/pacientes/nuevo`);
    await expect(
      page.getByRole("heading", {
        name: "No tienes permiso para editar pacientes.",
      }),
    ).toBeVisible();
    await fixtures.setRole(owner.userId, owner.clinic.id, "OWNER");
    await page.goto(`${base}/tutores/${tutorId}`);
    await page
      .getByRole("button", { name: "Archivar tutor", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirmar archivado" }).click();
    await expect(page.getByText("Archivado", { exact: true })).toBeVisible();
    await page.goto(`${base}/tutores`);
    await page.getByLabel("Buscar tutores", { exact: true }).fill("Luis QA");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page.getByRole("table")).toContainText("Luis QA Soto");
    await page.getByLabel("Cambiar clínica").selectOption(other.id);
    await expect(page.getByRole("table")).toContainText("Tutor QA Externo");
    await expect(page.getByRole("main")).not.toContainText("Luis QA Soto");
    await fixtures.suspend(owner.userId, other.id);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "No tienes acceso a esta clínica." }),
    ).toBeVisible();
    await expect(page.getByRole("main")).not.toContainText("Tutor QA Externo");
    expect(
      (await context.request.get(`${api}/clinics/${other.id}/tutors`)).status(),
    ).toBe(403);
    await page.getByRole("link", { name: "Volver a mis clínicas" }).click();
    await page
      .getByRole("button", { name: "Cerrar sesión", exact: true })
      .click();
    await expect(page).toHaveURL(/\/iniciar-sesion$/);
    expect((await context.request.get(`${api}/auth/me`)).status()).toBe(401);
  } finally {
    await fixtures.close();
  }
});
