import { expect, test } from "@playwright/test";

test("las vistas reales del producto se exploran con clic y teclado accesible", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator("#inicio")
    .getByRole("link", { name: "Conocer Pawly", exact: true })
    .click();
  await expect(page).toHaveURL(/#plataforma$/);
  const tour = page.locator("#plataforma");
  const tabs = tour.getByRole("tablist", {
    name: "Vistas del producto",
    exact: true,
  });
  const agenda = tabs.getByRole("tab", {
    name: "Agenda veterinaria",
    exact: true,
  });
  const consultations = tabs.getByRole("tab", {
    name: "Consulta e historia",
    exact: true,
  });
  const agendaPanel = tour.getByRole("tabpanel", {
    name: "Agenda veterinaria",
    exact: true,
  });
  const clinicalPanel = tour.getByRole("tabpanel", {
    name: "Consulta e historia",
    exact: true,
  });
  await expect(tabs.getByRole("tab")).toHaveCount(2);
  await expect(agenda).toHaveAttribute("aria-selected", "true");
  await expect(agenda).toHaveAttribute("tabindex", "0");
  await expect(consultations).toHaveAttribute("tabindex", "-1");
  await expect(agendaPanel).toBeVisible();
  await expect(clinicalPanel).toBeHidden();
  await expect(tour).toContainText(/INTERFAZ REAL.*DATOS DE EJEMPLO/);
  await expect(agendaPanel.getByRole("img")).toHaveAttribute(
    "alt",
    /Interfaz real.*fictici/,
  );
  await consultations.click();
  await expect(consultations).toHaveAttribute("aria-selected", "true");
  await expect(consultations).toHaveAttribute("tabindex", "0");
  await expect(agenda).toHaveAttribute("tabindex", "-1");
  await expect(clinicalPanel).toBeVisible();
  await expect(agendaPanel).toBeHidden();
  await expect(clinicalPanel.getByRole("img")).toHaveAttribute(
    "alt",
    /Interfaz real.*fictici/,
  );
  await page.keyboard.press("Home");
  await expect(agenda).toBeFocused();
  await expect(agenda).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(consultations).toBeFocused();
  await expect(consultations).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowRight");
  await expect(agenda).toBeFocused();
  await expect(agenda).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(consultations).toBeFocused();
  await expect(consultations).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Tab");
  await expect(clinicalPanel).toBeFocused();
  await tour
    .getByRole("link", { name: "Conocer las funciones", exact: true })
    .click();
  await expect(page).toHaveURL(/#funcionalidades$/);
});

test("el catálogo distingue las capacidades actuales y presenta el flujo de atención", async ({
  page,
}) => {
  await page.goto("/");
  const features = page.locator("#funcionalidades");
  await expect(features.getByRole("article")).toHaveCount(4);
  await expect(features).toContainText(/tutores/i);
  await expect(features).toContainText(/pacientes/i);
  await expect(features).toContainText(/agenda/i);
  await expect(features).toContainText(/consulta/i);
  await expect(features).toContainText(/clínica/i);
  // Los módulos futuros no deben confundirse con funciones del catálogo actual.
  await expect(features).not.toContainText(
    /inventario|vacunación|facturación|suscripciones|recordatorios automáticos/i,
  );
  await expect(
    page.locator("#como-funciona").getByRole("listitem"),
  ).toHaveCount(3);
  await expect(
    page
      .locator("#comenzar")
      .getByRole("link", {
        name: /Registrar mi clínica|Crear cuenta|Crear.*clínica/i,
      })
      .first(),
  ).toHaveAttribute("href", "/registrarse");
});

test("las capturas ampliadas se cargan y devuelven el foco al cerrar con botón o Escape", async ({
  page,
}) => {
  await page.goto("/");
  const tour = page.locator("#plataforma");
  const expand = tour.getByRole("button", {
    name: "Ampliar captura",
    exact: true,
  });
  for (const view of ["Agenda veterinaria", "Consulta e historia"]) {
    await tour.getByRole("tab", { name: view, exact: true }).click();
    await expand.click();
    const dialog = page.getByRole("dialog", {
      name: `Captura ampliada: ${view}`,
      exact: true,
    });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Captura estática con datos ficticios");
    const image = dialog.getByRole("img");
    await expect(image).toHaveAttribute("alt", /Interfaz real.*fictici/);
    await expect
      .poll(() =>
        image.evaluate(
          (element) =>
            (element as HTMLImageElement).complete &&
            (element as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
    await dialog.getByRole("button", { name: "Cerrar captura" }).click();
    await expect(dialog).not.toBeVisible();
    await expect(expand).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(expand).toBeFocused();
  }
});
