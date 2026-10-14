import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("registro, login, selección y logout con Nest/PostgreSQL reales", async ({
  page,
  context,
  request,
}) => {
  const name = `Responsable QA ${test.info().project.name}`;
  const email = `qa-${randomUUID()}@example.invalid`;
  const clinic = `Clínica QA ${test.info().project.name}`;
  const password = "Frase privada de pruebas Pawly 2026";
  await page.goto("/app");
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
  await page.getByRole("link", { name: "Registra tu clínica" }).click();
  await page.getByLabel("Nombre del responsable").fill(name);
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill(password);
  await page.getByLabel("Nombre de la clínica veterinaria").fill(clinic);
  await page.getByRole("button", { name: "Crear cuenta y clínica" }).click();
  await expect(
    page.getByRole("heading", { name: "Bienvenido a Pawly." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Ir a iniciar sesión" }).click();
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña", { exact: true }).fill("incorrecta");
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Revisa tu correo y contraseña",
  );
  await page.getByLabel("Contraseña", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Iniciar sesión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: `Hola, ${name}.` }),
  ).toBeVisible();
  const cookies = await context.cookies();
  const cookie = cookies.find((c) => c.name === "pawly_session");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(
    await page.evaluate(() => document.cookie.includes("pawly_session")),
  ).toBe(false);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: `Hola, ${name}.` }),
  ).toBeVisible();
  await page.getByRole("button", { name: new RegExp(clinic) }).click();
  await expect(page.getByText("Acceso verificado")).toBeVisible();
  const me = await context.request.get("http://localhost:3001/api/auth/me");
  expect(me.status()).toBe(200);
  const profile = await me.json();
  expect(profile.memberships).toHaveLength(1);
  const foreign = await context.request.get(
    `http://localhost:3001/api/clinics/${randomUUID()}/access`,
  );
  expect(foreign.status()).toBe(403);
  const csrf = await context.request.post(
    "http://localhost:3001/api/auth/logout",
    { data: {} },
  );
  expect(csrf.status()).toBe(403);
  const publicHtml = await request.get("/app");
  expect(await publicHtml.text()).not.toContain(name);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
  expect(
    (await context.cookies()).some((c) => c.name === "pawly_session"),
  ).toBe(false);
  expect(
    (await context.request.get("http://localhost:3001/api/auth/me")).status(),
  ).toBe(401);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
});
