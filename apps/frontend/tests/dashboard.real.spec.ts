import { randomUUID } from "node:crypto";
import { test, expect, api } from "./support/real-fixtures";
import { isolatedClinics } from "./support/isolated-clinics";

test("dashboard real: autorización, cambio de clínica, suspensión y logout", async ({
  page,
  context,
  request,
}) => {
  const email = `workspace-${randomUUID()}@example.invalid`;
  const password = "Frase privada de pruebas Workspace 2026";
  const name = "Responsable QA Dashboard";
  const firstName = `Clínica QA Dashboard ${test.info().project.name}`;
  const headers = { Origin: "http://localhost:3100", "X-Pawly-CSRF": "1" };
  const registration = await context.request.post(
    `${api}/auth/register-clinic`,
    { headers, data: { name, email, password, clinicName: firstName } },
  );
  expect(registration.status()).toBe(201);
  const { user, clinic } = await registration.json();
  const fixtures = await isolatedClinics();
  try {
    const second = await fixtures.additionalClinic(user.id);
    const target = `/app/clinicas/${clinic.id}/dashboard`;
    await page.goto(target);
    await expect(page).toHaveURL(/\/iniciar-sesion$/);
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await expect(page).toHaveURL(/\/app$/);
    await page.getByRole("button", { name: new RegExp(firstName) }).click();
    await page.getByRole("link", { name: "Entrar al dashboard" }).click();
    await expect(page.getByRole("heading", { name: firstName })).toBeVisible();
    await expect(page.locator(".dashboard-user")).toContainText("Propietario");
    expect(await (await request.get(target)).text()).not.toContain(name);
    const unknownId = randomUUID();
    expect(
      (
        await context.request.get(`${api}/clinics/${unknownId}/access`)
      ).status(),
    ).toBe(403);
    await page.goto(`/app/clinicas/${unknownId}/dashboard`);
    await expect(
      page.getByRole("heading", { name: "No tienes acceso a esta clínica." }),
    ).toBeVisible();
    await expect(page.getByText(name)).toHaveCount(0);
    await page.goto(target);
    await expect(page.getByRole("heading", { name: firstName })).toBeVisible();
    await page.getByLabel("Cambiar clínica").selectOption(second.id);
    await expect(
      page.getByRole("heading", { name: second.name }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: firstName })).toHaveCount(0);
    await expect(page.locator(".dashboard-user")).toContainText("Veterinario");
    await page.reload();
    await expect(
      page.getByRole("heading", { name: second.name }),
    ).toBeVisible();
    await fixtures.suspend(user.id, second.id);
    expect(
      (
        await context.request.get(`${api}/clinics/${second.id}/access`)
      ).status(),
    ).toBe(403);
    await page
      .getByRole("button", { name: "Volver a verificar mi acceso" })
      .click();
    await expect(
      page.getByRole("heading", { name: "No tienes acceso a esta clínica." }),
    ).toBeVisible();
    await expect(page.getByText(name)).toHaveCount(0);
    await page.getByRole("link", { name: "Volver a mis clínicas" }).click();
    await expect(
      page.getByRole("button", { name: new RegExp(firstName) }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: new RegExp(second.name) }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: new RegExp(firstName) }).click();
    await page.getByRole("link", { name: "Entrar al dashboard" }).click();
    await expect(page.getByRole("heading", { name: firstName })).toBeVisible();
    const csrf = await context.request.post(`${api}/auth/logout`, { data: {} });
    expect(csrf.status()).toBe(403);
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/iniciar-sesion$/);
    expect((await context.request.get(`${api}/auth/me`)).status()).toBe(401);
    expect(
      (await context.cookies()).some(
        (cookie) => cookie.name === "pawly_session",
      ),
    ).toBe(false);
    await page.goto(target);
    await expect(page).toHaveURL(/\/iniciar-sesion$/);
  } finally {
    await fixtures.close();
  }
});
