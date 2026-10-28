import { test, expect, type Page } from "@playwright/test";

const slug = "porvenir-reservas";
const doctor = { id: "92244981-bd22-4428-9221-aab03a192741", name: "Dra. Camila Rojas" };
const other = { id: "3911ae97-1006-43ee-bdf1-33df4b10de8c", name: "Dr. Matías Herrera" };
const serviceId = "dd282ecb-984b-42c8-929c-0ad46ecb9ddd";
const reference = "c5a30a34-5882-4e3e-86e7-d688590ec16e";
async function routes(page: Page, confirmed = false) {
  const calls: { path: string; body: Record<string, string> }[] = [];
  let startsAt = "2026-11-02T12:00:00.000Z";
  let cancelled = false;
  await page.route("**/api/bookings**", async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    const headers = { "Access-Control-Allow-Origin": req.headers().origin || new URL(page.url()).origin, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "content-type,x-pawly-csrf", "Access-Control-Allow-Methods": "GET,POST,OPTIONS" };
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    const body = req.method() === "POST" ? req.postDataJSON() : {};
    calls.push({ path, body });
    if (path.endsWith("/cancel")) cancelled = true;
    if (path.endsWith("/receipt")) return route.fulfill({ headers, contentType: "application/pdf", body: Buffer.from("%PDF-1.4\nPorvenir browser fixture\n%%EOF") });
    if (path.endsWith("/calendar")) return route.fulfill({ headers, contentType: "text/calendar", body: "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n" });
    let json: unknown;
    if (path.endsWith("/site")) json = { slug };
    else if (path.endsWith("/availability")) {
      const date = new URL(req.url()).searchParams.get("date");
      startsAt = `${date}T12:00:00.000Z`;
      json = { slots: [{ startsAt, endsAt: `${date}T12:30:00.000Z`, professionalId: doctor.id }, { startsAt: `${date}T13:00:00.000Z`, endsAt: `${date}T13:30:00.000Z`, professionalId: doctor.id }] };
    } else if (req.method() === "GET") json = {
      available: true, clinic: { name: "Clínica Veterinaria Porvenir", slug, timezone: "America/Santiago", address: "C. Veinticinco 26, Valparaíso" }, professionals: [doctor, other],
      services: [
        { id: serviceId, name: "Consulta veterinaria general", description: "Evaluación y seguimiento de tu mascota.", durationMinutes: 30, professionalIds: [doctor.id] },
        { id: "7a7dfb0a-df87-488e-abef-891db56f4d3e", name: "Vacunación", description: "Prevención y bienestar.", durationMinutes: 20, professionalIds: [other.id] },
      ], policy: { autoConfirm: confirmed, autoAssign: false, maxAdvanceDays: 60, message: "Conserva tu comprobante para gestionar la reserva." },
    };
    else json = { reference, status: cancelled ? "CANCELLED" : confirmed ? "CONFIRMED" : "PENDING", version: cancelled ? 2 : 1, startsAt, endsAt: new Date(Date.parse(startsAt) + 1800000).toISOString(), serviceId, professionalId: doctor.id, timezone: "America/Santiago", confirmed: confirmed && !cancelled, message: cancelled ? "Esta reserva está cerrada." : confirmed ? "Reserva confirmada por la clínica." : "Solicitud recibida, pendiente de aprobación. Todavía no es una cita confirmada.", ownerName: "Tutor de la reserva", petName: "Luna", email: "reserva@example.invalid", emailDelivery: "queued" };
    return route.fulfill({ status: req.method() === "GET" ? 200 : 201, headers, json });
  });
  return calls;
}
async function fillReservation(page: Page) {
  await page.goto("/agendar-cita");
  await page.getByLabel("RUT del tutor").fill("12345678-9");
  await page.getByRole("button", { name: "Continuar a servicios" }).click();
  await expect(page.locator('section[aria-label="Agendamiento veterinario"]').getByRole("alert")).toContainText("Revisa el RUT");
  await page.getByLabel("RUT del tutor").fill("12345678-5");
  await page.getByRole("button", { name: "Continuar a servicios" }).click();
  await page.getByRole("button", { name: /Consulta veterinaria general/ }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Por profesional", exact: true }).click();
  await page.getByLabel("Buscar profesional").fill("Camila");
  await expect(page.getByRole("button", { name: other.name, exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: doctor.name, exact: true }).click();
  await page.getByRole("button", { name: "Buscar horas", exact: true }).click();
  await page.getByRole("button", { name: "Ver semana siguiente" }).click();
  await page.getByRole("group", { name: "Selecciona un día" }).getByRole("button").first().click();
  await page.locator('label:has(input[name="slot"])').first().click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByLabel("Nombre del tutor", { exact: true }).fill("Tutor de la reserva");
  await page.getByLabel("Correo electrónico", { exact: true }).fill("reserva@example.invalid");
  await page.getByLabel("Teléfono de contacto").fill("+56912345678");
  await page.getByLabel("Nombre de tu mascota").fill("Luna");
  await page.getByLabel("Motivo de la cita").fill("Control general");
  await page.getByRole("button", { name: "Revisar solicitud" }).click();
  await page.getByRole("checkbox").check();
}
test("reserva veterinaria completa con RUT, filtros compatibles y PDF privado", async ({ page }, info) => {
  const calls = await routes(page);
  await fillReservation(page);
  await page.getByRole("button", { name: "Enviar solicitud", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Recibimos tu solicitud." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Añadir al calendario" })).toHaveCount(0);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar comprobante PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`comprobante-porvenir-${reference}.pdf`);
  const request = calls.find(call => call.path.endsWith("/receipt"))!;
  expect(request.body.reference).toBe(reference);
  expect(request.body.managementToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(calls.filter(call => call.path === `/api/bookings/${slug}` && call.body.requestId)).toHaveLength(1);
  await expect(page.getByText("Todavía no es una cita confirmada.", { exact: false })).toBeVisible();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  await page.setViewportSize(info.project.use.viewport!);
  await page.screenshot({ path: info.outputPath("reserva-porvenir.png"), fullPage: true });
});
test("solo una reserva confirmada ofrece invitación de calendario", async ({ page }) => {
  const calls = await routes(page, true);
  await fillReservation(page);
  await page.getByRole("button", { name: "Confirmar reserva", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tu reserva está confirmada." })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Añadir al calendario" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe(`cita-porvenir-${reference}.ics`);
  expect(calls.find(call => call.path.endsWith("/calendar"))?.body.reference).toBe(reference);
});
test("enlace privado de correo abre la reserva sin confirmar cambios automáticamente", async ({ page }) => {
  const calls = await routes(page);
  const key = "a".repeat(43);
  await page.goto(`/reservar/${slug}#reference=${reference}&key=${key}`);
  await expect(page.getByRole("heading", { name: "Recibimos tu solicitud." })).toBeVisible();
  expect(page.url()).not.toContain(key);
  expect(calls.find(call => call.path.endsWith("/lookup"))?.body).toEqual({ reference, managementToken: key });
  expect(calls.some(call => /\/(cancel|reschedule)$/.test(call.path))).toBe(false);
});

test("anulación con revisión previa, opción de conservar y comprobante actualizado", async ({ page }, info) => {
  const calls = await routes(page, true);
  await page.goto(`/reservar/${slug}#reference=${reference}&key=${"a".repeat(43)}`);
  await page.getByRole("button", { name: "Anular hora", exact: true }).click();
  await expect(page.getByRole("heading", { name: "¿Necesitas anular su hora?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar anulación", exact: true })).toBeDisabled();
  expect(calls.filter(call => call.path.endsWith("/cancel"))).toHaveLength(0);
  await page.getByRole("button", { name: "Conservar mi hora", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tu reserva está confirmada." })).toBeVisible();
  expect(calls.filter(call => call.path.endsWith("/cancel"))).toHaveLength(0);
  await page.getByRole("button", { name: "Anular hora", exact: true }).click();
  await page.getByLabel("¿Por qué necesitas anular?").selectOption("No puedo asistir en ese horario");
  await page.screenshot({ path: info.outputPath("anulacion-revisar.png"), fullPage: true });
  await page.getByRole("button", { name: "Confirmar anulación", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tu hora quedó anulada." })).toBeVisible();
  const cancellation = calls.filter(call => call.path.endsWith("/cancel"));
  expect(cancellation).toHaveLength(1);
  expect(cancellation[0].body).toEqual({ reference, managementToken: "a".repeat(43), reason: "No puedo asistir en ese horario" });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Comprobante de anulación", exact: true }).click();
  expect((await downloadPromise).suggestedFilename()).toContain(".pdf");
  await page.screenshot({ path: info.outputPath("anulacion-confirmada.png"), fullPage: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
  await page.getByRole("button", { name: "Reservar otra hora", exact: true }).click();
  await expect(page.getByLabel("RUT del tutor")).toBeVisible();
});

test("la anulación conserva la reserva cuando el servidor rechaza el cambio", async ({ page }) => {
  const calls = await routes(page, true);
  await page.route(`**/api/bookings/${slug}/cancel`, async route => {
    const headers = { "Access-Control-Allow-Origin": route.request().headers().origin || new URL(page.url()).origin, "Access-Control-Allow-Headers": "content-type,x-pawly-csrf", "Access-Control-Allow-Methods": "POST,OPTIONS" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    return route.fulfill({ status: 409, headers, json: { message: "El plazo de modificación terminó." } });
  });
  await page.goto(`/reservar/${slug}#reference=${reference}&key=${"a".repeat(43)}`);
  await page.getByRole("button", { name: "Anular hora", exact: true }).click();
  await page.getByLabel("¿Por qué necesitas anular?").selectOption("Otro motivo");
  await expect(page.getByRole("button", { name: "Confirmar anulación", exact: true })).toBeDisabled();
  await page.getByLabel("Cuéntanos el motivo").fill("Necesito coordinar una nueva visita.");
  await page.getByRole("button", { name: "Confirmar anulación", exact: true }).click();
  await expect(page.locator('section[aria-label="Agendamiento veterinario"]').getByRole("alert")).toContainText("No pudimos anular la reserva");
  await expect(page.getByRole("heading", { name: "Tu hora quedó anulada." })).toHaveCount(0);
  await page.getByRole("button", { name: "Conservar mi hora", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tu reserva está confirmada." })).toBeVisible();
  expect(calls.filter(call => call.path.endsWith("/cancel"))).toHaveLength(0);
});

test("el plazo de anulación se actualiza mientras el tutor revisa su hora", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install({ time: new Date("2026-11-02T11:59:00.000Z") });
  await page.clock.pauseAt(new Date("2026-11-02T11:59:30.000Z"));
  const calls = await routes(page, true);
  await page.goto(`/reservar/${slug}#reference=${reference}&key=${"a".repeat(43)}`);
  await page.getByRole("button", { name: "Anular hora", exact: true }).click();
  await page.getByLabel("¿Por qué necesitas anular?").selectOption("No puedo asistir en ese horario");
  await expect(page.getByRole("button", { name: "Confirmar anulación", exact: true })).toBeEnabled();
  await page.clock.fastForward(31000);
  await expect(page.getByRole("button", { name: "Confirmar anulación", exact: true })).toBeDisabled();
  await expect(page.getByText("El plazo para anular por internet terminó.", { exact: false })).toBeVisible();
  expect(calls.filter(call => call.path.endsWith("/cancel"))).toHaveLength(0);
});

test("el aviso de correo se recupera cuando un reintento termina enviado", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-01T12:00:00.000Z") });
  await page.clock.pauseAt(new Date("2026-11-01T12:00:01.000Z"));
  await routes(page);
  let lookups = 0;
  await page.route(`**/api/bookings/${slug}/lookup`, async route => {
    const headers = { "Access-Control-Allow-Origin": route.request().headers().origin || new URL(page.url()).origin, "Access-Control-Allow-Headers": "content-type,x-pawly-csrf", "Access-Control-Allow-Methods": "POST,OPTIONS" };
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    lookups++;
    return route.fulfill({ headers, json: { reference, status: "PENDING", version: 1, startsAt: "2026-11-02T12:00:00.000Z", endsAt: "2026-11-02T12:30:00.000Z", serviceId, professionalId: doctor.id, timezone: "America/Santiago", confirmed: false, message: "Solicitud pendiente.", email: "reserva@example.invalid", emailDelivery: lookups === 1 ? "failed" : "sent" } });
  });
  await page.goto(`/reservar/${slug}#reference=${reference}&key=${"a".repeat(43)}`);
  await expect(page.getByText("No pudimos entregar el correo.", { exact: false })).toBeVisible();
  await page.clock.fastForward(10001);
  await expect(page.getByText("Comprobante enviado a reserva@example.invalid.", { exact: false })).toBeVisible();
  await page.clock.fastForward(30000);
  expect(lookups).toBe(2);
});
