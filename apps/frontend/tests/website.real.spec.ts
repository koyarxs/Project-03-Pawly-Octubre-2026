import { randomUUID } from "node:crypto";
import { test, expect, api } from "./support/real-fixtures";
import { isolatedClinics } from "./support/isolated-clinics";

test("sitio real: borrador privado, vista previa, publicación, retirada y permisos", async ({
  page,
  context,
}) => {
  test.setTimeout(120000);
  const fixtures = await isolatedClinics();
  const clinicId = process.env.PAWLY_QA_WEBSITE_CLINIC_ID;
  if (!clinicId) throw new Error("Missing isolated website clinic ID");
  const email = `website-${randomUUID()}@example.invalid`,
    password = "Frase privada QA sitio de la veterinaria 2026";
  try {
    const owner = await fixtures.seedOwner({
      name: "Responsable QA Sitio",
      email,
      password,
      clinicName: "Clínica QA Sitio",
      clinicId,
    });
    await page.goto("/iniciar-sesion");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await expect(page).toHaveURL(/\/app$/);
    const editor = `/app/clinicas/${owner.clinic.id}/sitio-web`;
    await page.goto(editor);
    await page
      .getByLabel("Nombre público de la veterinaria", { exact: false })
      .fill("Veterinaria QA Publicada");
    await page
      .getByLabel("Título principal", { exact: true })
      .fill("Una portada de prueba, publicada conscientemente.");
    await page
      .getByLabel("Descripción de la portada", { exact: true })
      .fill(
        "Contenido ficticio de una prueba aislada. No describe servicios reales.",
      );
    await page
      .getByLabel("Correo de contacto público", { exact: false })
      .fill("clinic@example.invalid");
    await page
      .getByRole("button", { name: "Guardar borrador", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "Borrador guardado" }),
    ).toBeVisible();
    const publicDraft = await context.request.get(`${api}/website`);
    expect(publicDraft.status()).toBe(200);
    expect((await publicDraft.json()).content).toBeNull();
    await page
      .getByRole("button", { name: "Vista previa", exact: true })
      .click();
    const preview = page.getByRole("dialog", { name: "Así se verá tu sitio" });
    await expect(preview.getByRole("heading", { level: 1 })).toHaveText(
      "Una portada de prueba, publicada conscientemente.",
    );
    await page.keyboard.press("Escape");
    await page
      .getByRole("button", { name: "Publicar sitio", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "¿Publicar el contenido del sitio?" })
      .getByRole("button", { name: "Confirmar publicación" })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Contenido publicado correctamente" }),
    ).toBeVisible();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Una portada de prueba, publicada conscientemente.",
    );
    await expect(page.locator("#contacto")).toContainText(
      "clinic@example.invalid",
    );
    await expect(page).toHaveTitle("Veterinaria QA Publicada");
    await page.goto(editor);
    await page.getByRole("button", { name: "Retirar publicación" }).click();
    await page
      .getByRole("dialog", { name: "¿Retirar la publicación?" })
      .getByRole("button", { name: "Confirmar retirada" })
      .click();
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "El sitio dejó de estar publicado" }),
    ).toBeVisible();
    expect(
      (await (await context.request.get(`${api}/website`)).json()).content,
    ).toBeNull();
    await fixtures.setRole(owner.userId, clinicId, "RECEPTIONIST");
    await page.reload();
    await expect(
      page.getByRole("heading", {
        name: "Administración del sitio restringida",
      }),
    ).toBeVisible();
    expect(
      (
        await context.request.get(`${api}/clinics/${clinicId}/website`)
      ).status(),
    ).toBe(403);
  } finally {
    await fixtures.close();
  }
});
