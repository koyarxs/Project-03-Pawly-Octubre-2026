import { expect, test } from "@playwright/test";

test("los módulos se exploran por categoría y los accesos rápidos tienen destinos reales", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const shortcuts = page.getByRole("navigation", { name: "Accesos rápidos a Pawly" });
  await expect(shortcuts.getByRole("link")).toHaveCount(4);
  await shortcuts.getByRole("link", { name: /Ver los módulos/ }).click();
  await expect(page).toHaveURL(/#funcionalidades$/);

  const modules = page.locator("#funcionalidades");
  await expect(modules.locator("article:visible")).toHaveCount(6);
  await modules.getByRole("button", { name: "Atención clínica", exact: true }).click();
  await expect(modules.locator("article:visible")).toHaveCount(3);
  await expect(modules.getByRole("heading", { name: /Cada atención/ })).toBeVisible();
  await expect(modules.getByRole("heading", { name: /El día, en orden/ })).toBeHidden();
  await expect(modules.getByRole("status")).toContainText("3 módulos planificados");

  const organization = modules.getByRole("button", { name: "Organización", exact: true });
  await organization.focus();
  await page.keyboard.press("Enter");
  await expect(organization).toHaveAttribute("aria-pressed", "true");
  await expect(modules.locator("article:visible")).toHaveCount(3);
  await expect(modules.getByRole("heading", { name: /El día, en orden/ })).toBeVisible();
  await expect(modules.getByRole("heading", { name: /Lo que tu clínica necesita/ })).toBeVisible();
  await expect(modules.getByRole("heading", { name: /Cada atención/ })).toBeHidden();

  await modules.getByRole("button", { name: "Todos los módulos", exact: true }).click();
  await expect(modules.locator("article:visible")).toHaveCount(6);
  expect(errors).toEqual([]);
});
