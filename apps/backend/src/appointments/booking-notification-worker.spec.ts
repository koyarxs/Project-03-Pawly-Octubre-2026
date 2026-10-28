import nodemailer from "nodemailer";
import { ConfigService } from "@nestjs/config";
import type { PrismaService } from "../prisma/prisma.service";
import { BookingNotificationWorker } from "./booking-notification-worker";
import type { BookingDocumentsService } from "./booking-documents.service";
import * as documents from "./booking-documents";

jest.mock("nodemailer", () => ({ __esModule: true, default: { createTransport: jest.fn() } }));
describe("booking mail delivery", () => {
  const fixture = (status: string) => ({ reference: "c5a30a34-5882-4e3e-86e7-d688590ec16e", version: 1, status, clinicName: "Clínica Veterinaria Porvenir", clinicSlug: "porvenir", address: "Valparaíso", phone: "", timezone: "America/Santiago", service: "Consulta veterinaria", professional: "Equipo veterinario", startsAt: new Date("2030-11-02T12:00:00Z"), endsAt: new Date("2030-11-02T12:30:00Z"), ownerName: "Tutor", email: "tutor@example.invalid", petName: "Luna", species: "Gato", managementUrl: "https://porvenir.example.invalid/reservar/porvenir#reference=private&key=private" });
  afterEach(() => jest.restoreAllMocks());
  for (const [status, mode] of [["PENDING", "smtp"], ["CONFIRMED", "smtp"], ["PENDING", "local"]] as const) it(`delivers ${status} through ${mode} with a branded PDF and accurate delivery state`, async () => {
    const data = fixture(status);
    const notice = { id: "notice-id", clinicId: "clinic-id", bookingId: data.reference, state: "PENDING", attempts: 0, kind: status === "PENDING" ? "RECEIVED" : "CONFIRMED", eventKey: "event-id", clinic: { name: data.clinicName, timezone: data.timezone }, booking: { id: data.reference, status, startsAt: data.startsAt, email: data.email, appointment: null }, appointment: null };
    const updates: unknown[] = [];
    const tx = { $queryRaw: jest.fn().mockResolvedValue([{ locked: true }]), bookingNotification: { findUnique: jest.fn().mockResolvedValue(notice), update: jest.fn().mockImplementation(({ data: change }) => { Object.assign(notice, { state: change.state }); updates.push(change); return Promise.resolve(notice); }) } };
    const db = { bookingNotification: { findMany: jest.fn().mockImplementation(() => Promise.resolve(["SENT", "CAPTURED"].includes(notice.state) ? [] : [{ id: notice.id }])) }, $transaction: jest.fn().mockImplementation(callback => callback(tx)) };
    const sendMail = jest.fn().mockResolvedValue({ accepted: [data.email] }), close = jest.fn();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail, close });
    jest.spyOn(documents, "reservationPdf").mockResolvedValue(Buffer.from("%PDF-1.4\nfixture"));
    const documentService = { data: jest.fn().mockResolvedValue(data) };
    const env = new ConfigService({ MAIL_MODE: mode, MAIL_HOST: mode === "smtp" ? "smtp.gmail.com" : "127.0.0.1", MAIL_PORT: 587, MAIL_USER: "agenda@example.invalid", MAIL_PASSWORD: "not-a-real-password", NODE_ENV: "test" });
    const worker = new BookingNotificationWorker(db as unknown as PrismaService, env, documentService as unknown as BookingDocumentsService);
    await worker.flush(); await worker.flush();
    expect(sendMail).toHaveBeenCalledTimes(1);
    const message = sendMail.mock.calls[0]![0];
    expect(message.to).toBe(data.email);
    expect(message.html).toContain("cid:porvenir-logo");
    expect(message.attachments[0]).toMatchObject({ filename: expect.stringMatching(/\.pdf$/), contentType: "application/pdf" });
    expect(message.attachments[0].content.subarray(0, 4).toString()).toBe("%PDF");
    expect(message.text).not.toMatch(/DEMOSTRACIÓN|Prueba local/i);
    if (status === "CONFIRMED") expect(message.icalEvent).toMatchObject({ method: "REQUEST", content: expect.stringContaining("STATUS:CONFIRMED") });
    else { expect(message.icalEvent).toBeUndefined(); expect(message.text).toContain("Todavía no es una cita confirmada"); }
    expect(updates).toEqual([expect.objectContaining({ state: mode === "smtp" ? "SENT" : "CAPTURED", deliveredAt: expect.any(Date) })]);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
