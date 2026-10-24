import { expect, test } from "@playwright/test";
import { mockPublicWebsite, publicWebsiteFixture } from "./support/website-fixtures";

test.beforeEach(async ({ page }) => {
  await mockPublicWebsite(page);
});

test("el boletín exige correo válido y consentimiento antes de enviar", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/website/newsletter", async (route) => { calls++; await route.fulfill({ json: { status: "accepted" } }); });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: publicWebsiteFixture.aboutTitle, exact: true })).toBeVisible();
  const form = page.getByRole("form", { name: "Suscripción a novedades" });
  await form.scrollIntoViewIfNeeded();
  await form.getByRole("button", { name: "Suscribirme" }).click();
  await form.getByRole("textbox").fill("persona@example.invalid");
  await form.getByRole("button", { name: "Suscribirme" }).click();
  expect(calls).toBe(0);
  await expect(form.getByRole("textbox")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(form.locator("fieldset")).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("el boletín confirma únicamente una solicitud aceptada y no envía datos de clínica", async ({ page }) => {
  let calls = 0;
  await page.route("**/api/website/newsletter", async (route) => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({ email: "persona@example.invalid", consent: true });
    expect(route.request().headers()["x-pawly-csrf"]).toBe("1");
    await route.fulfill({ json: { status: "accepted" }, status: 201 });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: publicWebsiteFixture.aboutTitle, exact: true })).toBeVisible();
  const form = page.getByRole("form", { name: "Suscripción a novedades" });
  await form.getByRole("textbox").fill("persona@example.invalid");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Suscribirme" }).click();
  await expect(form.getByRole("status")).toContainText("Tu solicitud quedó registrada");
  await expect(form.getByRole("textbox")).toHaveValue("");
  expect(calls).toBe(1);
  await expect(page.getByRole("contentinfo")).not.toContainText("Imágenes ilustrativas");
});

test("el boletín muestra fallos y permite reintentar sin simular éxito", async ({ page }) => {
  await page.route("**/api/website/newsletter", (route) => route.fulfill({ status: 503, json: { message: "unavailable" } }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: publicWebsiteFixture.aboutTitle, exact: true })).toBeVisible();
  const form = page.getByRole("form", { name: "Suscripción a novedades" });
  await form.getByRole("textbox").fill("persona@example.invalid");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Suscribirme" }).click();
  await expect(form.getByRole("alert")).toContainText("No pudimos registrar");
  await expect(form.getByRole("button", { name: "Suscribirme" })).toBeEnabled();
  await expect(form.getByRole("textbox")).toHaveValue("persona@example.invalid");
});
