import { createHash, randomBytes } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { bookingMailSettings } from "./booking-mail";
import { emailManagementKey, reservationCredential, reservationCalendar, reservationEmail, reservationPdf, type ReservationDocument } from "./booking-documents";

const sample = (): ReservationDocument => ({
  reference: "c5a30a34-5882-4e3e-86e7-d688590ec16e", version: 2, status: "PENDING", clinicName: "Clínica Veterinaria Porvenir", clinicSlug: "porvenir",
  address: "C. Veinticinco 26, Valparaíso", phone: "+56900000000", timezone: "America/Santiago", service: "Consulta veterinaria", professional: "Profesional de la clínica",
  startsAt: new Date("2026-11-02T12:00:00Z"), endsAt: new Date("2026-11-02T12:30:00Z"), ownerName: "Tutor de la reserva", email: "tutor@example.invalid", petName: "Luna", species: "Gato", managementUrl: "https://porvenir.example.invalid/reservar/porvenir#reference=private",
});
describe("reservation documents and mail", () => {
  it("accepts original credentials and clinic-bound signed email credentials without exposing the token hash", () => {
    const original = randomBytes(32).toString("base64url"), secret = randomBytes(32).toString("hex");
    const row = { id: sample().reference, clinicId: "clinic-one", tokenHash: createHash("sha256").update(original).digest("hex") };
    const signed = emailManagementKey(row, secret)!;
    expect(signed).toHaveLength(43);
    expect(signed).not.toBe(original);
    expect(reservationCredential(row, original, secret)).toBe(true);
    expect(reservationCredential(row, signed, secret)).toBe(true);
    expect(reservationCredential({ ...row, clinicId: "clinic-two" }, signed, secret)).toBe(false);
    expect(reservationCredential(row, randomBytes(32).toString("base64url"), secret)).toBe(false);
    expect(reservationCredential(row, signed, "different-secret-that-is-long-enough")).toBe(false);
  });
  it("keeps a normal PDF on one page and supports long tutor and service names", async () => {
    const pdf = await reservationPdf(sample());
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.toString("latin1").match(/\/Type \/Page\b/g)).toHaveLength(1);
    const long = await reservationPdf({ ...sample(), ownerName: "Nombre ".repeat(17), professional: "Profesional ".repeat(12), address: "Dirección larga ".repeat(10), service: "Atención veterinaria ".repeat(5) });
    expect(long.subarray(0, 4).toString()).toBe("%PDF");
    expect(long.toString("latin1")).toContain("%%EOF");
  });
  it("escapes contact content and distinguishes pending requests from confirmed appointments", () => {
    const mail = reservationEmail({ ...sample(), petName: '<img src=x onerror="alert(1)">' });
    expect(mail.html).not.toContain('<img src=x');
    expect(mail.html).toContain("&lt;img");
    expect(mail.text).toContain("Todavía no es una cita confirmada");
    expect(mail.subject).toContain("pendiente");
    expect(reservationEmail({ ...sample(), status: "CONFIRMED" }).text).toContain("Tu hora está confirmada");
  });
  it("generates timezone-independent calendar invitations, stable updates and cancellation", () => {
    const confirmed = { ...sample(), status: "CONFIRMED", service: "Vacunación, seguimiento; anual\nConsulta" };
    const invite = reservationCalendar(confirmed, "agenda@example.invalid");
    expect(invite).toContain("METHOD:REQUEST\r\n");
    expect(invite).toContain("DTSTART:20261102T120000Z\r\n");
    expect(invite).toContain("DTEND:20261102T123000Z\r\n");
    expect(invite).toContain(`UID:${confirmed.reference}@porvenir`);
    expect(invite).toContain("SEQUENCE:2\r\n");
    expect(invite).toContain("ATTENDEE;RSVP=TRUE:mailto:tutor@example.invalid");
    expect(invite).toContain("Vacunación\\, seguimiento\\; anual\\nConsulta");
    expect(invite.replace(/\r\n /g, "")).toContain(`DESCRIPTION:Profesional: ${confirmed.professional}\\nReferencia: ${confirmed.reference}\\nConsulta`);
    expect(invite.split("\r\n").every(line => Buffer.byteLength(line) <= 75)).toBe(true);
    expect(reservationCalendar(confirmed, "agenda@example.invalid", true)).toContain("METHOD:CANCEL\r\n");
    expect(reservationCalendar(confirmed)).toContain("METHOD:PUBLISH\r\n");
  });
  it("requires explicit SMTP configuration and encrypted delivery while keeping local capture local", () => {
    expect(bookingMailSettings(new ConfigService({ MAIL_MODE: "smtp", MAIL_USER: "agenda@gmail.com" }))).toBeNull();
    expect(bookingMailSettings(new ConfigService({ MAIL_MODE: "local", MAIL_HOST: "smtp.gmail.com", NODE_ENV: "development" }))).toBeNull();
    expect(bookingMailSettings(new ConfigService({ MAIL_MODE: "local", MAIL_HOST: "localhost", NODE_ENV: "production" }))).toBeNull();
    const settings = bookingMailSettings(new ConfigService({ MAIL_MODE: "smtp", MAIL_HOST: "smtp.gmail.com", MAIL_PORT: 587, MAIL_USER: "agenda@gmail.com", MAIL_PASSWORD: "application-password", MAIL_SECURE: false }))!;
    expect(settings.options).toMatchObject({ host: "smtp.gmail.com", port: 587, secure: false, requireTLS: true, auth: { user: "agenda@gmail.com" }, disableFileAccess: true, disableUrlAccess: true });
  });
});
