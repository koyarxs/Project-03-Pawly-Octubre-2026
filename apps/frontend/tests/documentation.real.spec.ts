import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { test, expect, api } from "./support/real-fixtures";
import { isolatedClinics } from "./support/isolated-clinics";
import { displayName } from "../src/lib/display-name";

// Explicitly invoked by the isolated runner. Never signs into a real account.
test("capturas del README con API real y registros ficticios aislados", async ({ page, context }, info) => {
  test.skip(info.project.name !== "desktop", "The capture includes its own mobile viewport.");
  test.setTimeout(300000);
  const directory = path.resolve(process.cwd(), "../../docs/screenshots");
  await mkdir(directory, { recursive: true });
  const manifest: { file: string; route: string; width: number; height: number; fullPage: boolean }[] = [];
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  async function capture(name: string, selector?: string) {
    if (selector) await page.locator(selector).scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
    const fullPage = ["agenda", "consulta-clinica", "ficha-paciente", "servicios", "reserva-profesionales", "reserva-horarios"].includes(name);
    await page.locator("img").evaluateAll(images => Promise.all(images.filter(image => image.getBoundingClientRect().top < innerHeight && image.getBoundingClientRect().bottom > 0).map(image => (image as HTMLImageElement).decode().catch(() => {}))));
    const image = selector ? await page.locator(selector).screenshot({ animations: "disabled", timeout: 20000 }) : await page.screenshot({ animations: "disabled", timeout: 20000, fullPage });
    await sharp(image).webp({ quality: 90 }).toFile(path.join(directory, `${name}.webp`));
    manifest.push({ file: `${name}.webp`, route: new URL(page.url()).pathname.replace(/\b[0-9a-f-]{36}\b/g, ":id"), ...page.viewportSize()!, fullPage });
  }
  const fixtures = await isolatedClinics();
  const clinicId = process.env.PAWLY_QA_WEBSITE_CLINIC_ID!;
  const email = `documentation-${randomUUID()}@example.invalid`;
  const password = randomUUID() + randomUUID();
  const headers = { Origin: "http://localhost:3100", "X-Pawly-CSRF": "1" };
  try {
    const owner = await fixtures.seedOwner({ name: "Administración Porvenir", email, password, clinicId, clinicName: "Clínica Veterinaria Porvenir · DEMOSTRACIÓN", medicalVerified: false });
    const demo = await fixtures.setupPersonalDemo(owner.userId, clinicId);
    await page.goto("/");
    await expect(page.locator("#tu-visita")).toBeVisible();
    await capture("landing");
    for (const [name, selector] of [["tu-visita", "#tu-visita"], ["historia", "#historia"], ["equipo-publico", "#equipo"], ["testimonios", "#testimonios"], ["preguntas-frecuentes", "#preguntas-frecuentes"], ["footer", "footer"]]) await capture(name, selector);
    await page.goto("/iniciar-sesion");
    await expect(page.getByRole("button", { name: "Iniciar sesión", exact: true })).toBeVisible();
    await capture("inicio-sesion");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Iniciar sesión", exact: true }).click();
    await expect(page).toHaveURL(/\/app$/);
    const base = `${api}/clinics/${clinicId}`;
    const route = `/app/clinicas/${clinicId}`;
    async function get(endpoint: string) {
      const response = await context.request.get(base + endpoint);
      expect(response.status(), endpoint).toBe(200);
      return response.json();
    }
    async function post(endpoint: string, data: object) {
      const response = await context.request.post(base + endpoint, { headers, data });
      expect(response.status(), endpoint).toBe(201);
      return response.json();
    }
    const settings = await get("/booking/settings");
    const service = settings.services.find((s: { name: string }) => s.name === "Consulta veterinaria general");
    const professionalMembershipId = service.professionals[0].membershipId;
    const patients = (await get("/patients")).items;
    const day = new Date(Date.now() + 3 * 86400000);
    while (day.getUTCDay() === 0) day.setUTCDate(day.getUTCDate() + 1);
    const date = day.toISOString().slice(0, 10);
    for (let i = 0; i < 5; i++) {
      const slots = await get(`/booking/availability?serviceId=${service.id}&professionalId=${professionalMembershipId}&date=${date}`);
      expect(slots.slots.length).toBeGreaterThan(0);
      const input = { patientId: patients[i].id, tutorId: patients[i].tutors[0].id, professionalMembershipId, serviceId: service.id, durationMinutes: 30, startsAt: slots.slots[0].startsAt, reason: ["Consulta preventiva de ejemplo", "Control de bienestar ficticio", "Revisión general de ejemplo", "Seguimiento de ejemplo", "Control programado ficticio"][i] };
      const appointment = await post("/appointments", input);
      if (i > 0) {
        const response = await context.request.patch(base + `/appointments/${appointment.id}`, { headers, data: { ...input, version: appointment.version, status: i === 4 ? "CANCELLED" : "CONFIRMED", ...(i === 4 ? { cancellationReason: "Cancelación ficticia para documentación" } : {}) } });
        expect(response.status()).toBe(200);
      }
    }
    const consultation = await post("/consultations", { patientId: patients[0].id, professionalMembershipId, requestId: randomUUID(), attendedAt: new Date().toISOString(), reason: "Control preventivo ficticio", anamnesis: "Registro de ejemplo para documentar el flujo de historia clínica. El tutor informa hábitos y antecedentes de su compañero.", physicalExam: "Evaluación ficticia de condición general y signos vitales.", diagnosis: "Evaluación preventiva de ejemplo", diagnosisType: "PRESUMPTIVE", treatment: "Plan ficticio de seguimiento, sin indicaciones terapéuticas reales.", instructions: "Información ilustrativa para revisar la ficha y el control posterior.", weightKg: 8.5, temperatureC: 38.5 });
    await page.goto(route + "/dashboard");
    await expect(page.getByRole("heading", { name: /Hola,/ })).toBeVisible();
    await capture("dashboard");
    await page.goto(route + "/agenda");
    await page.getByLabel("Fecha", { exact: true }).fill(date);
    await expect(page.getByText(displayName(patients[0].name), { exact: true }).first()).toBeVisible();
    await capture("agenda");
    for (const [tab, name, heading] of [["Servicios", "servicios", "Servicios y duración"], ["Disponibilidad", "disponibilidad", "Disponibilidad profesional"], ["Configuración", "configuracion-reservas", "Configuración de reservas"]]) {
      await page.getByRole("navigation", { name: "Navegación de agendamiento" }).getByRole("button", { name: tab, exact: true }).click();
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      await expect(page.getByText("Cargando configuración...", { exact: true })).toHaveCount(0);
      if (name === "servicios") await expect(page.getByText("Consulta veterinaria general", { exact: true }).first()).toBeVisible();
      await capture(name);
    }
    for (const [suffix, name, heading] of [["tutores", "tutores", "Tutores"], ["pacientes", "pacientes", "Pacientes"], ["personal", "personal", "Personal y Accesos"]]) {
      await page.goto(`${route}/${suffix}`);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      await capture(name);
    }
    await page.goto(`${route}/pacientes/${patients[0].id}`);
    await expect(page.getByRole("heading", { name: patients[0].name, exact: true })).toBeVisible();
    await capture("ficha-paciente");
    await page.goto(`${route}/consultas/${consultation.id}`);
    await expect(page.getByRole("button", { name: "Editar borrador" })).toBeVisible();
    await capture("consulta-clinica");
    await page.goto(`/reservar/${demo.slug}`);
    await page.getByLabel("RUT del tutor").fill("12345678-5");
    await page.getByRole("button", { name: "Continuar a servicios" }).click();
    await capture("reserva-servicios");
    await page.getByRole("button", { name: /Consulta veterinaria general/ }).click();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Dra. Camila Rojas", exact: true })).toBeVisible();
    await capture("reserva-profesionales");
    await page.getByRole("button", { name: "Dra. Camila Rojas", exact: true }).click();
    await page.getByRole("button", { name: "Buscar horas", exact: true }).click();
    await page.getByLabel("Fecha de la cita").fill(date);
    await expect(page.getByRole("radio").first()).toBeAttached();
    await capture("reserva-horarios");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/reservar/${demo.slug}`);
    await page.getByLabel("RUT del tutor").fill("12345678-5");
    await page.getByRole("button", { name: "Continuar a servicios" }).click();
    await capture("reserva-servicios-movil");
    await page.getByRole("button", { name: /Consulta veterinaria general/ }).click();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Dra. Camila Rojas", exact: true })).toBeVisible();
    await capture("reserva-movil");
    await writeFile(path.join(directory, "private-captures.json"), JSON.stringify({ capturedAt: new Date().toISOString(), source: "Isolated Nest API + PostgreSQL + Next.js", data: "Exclusively fictional fixtures; not production data", captures: manifest }, null, 2) + "\n");
  } finally {
    await fixtures.close();
  }
});
