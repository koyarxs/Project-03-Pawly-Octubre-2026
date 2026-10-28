import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";
import { PrismaService } from "../prisma/prisma.service";
import { readFileSync } from "node:fs";
import { BookingDocumentsService } from "./booking-documents.service";
import { bookingLogo, confirmedReservation, reservationCalendar, reservationEmail, reservationPdf } from "./booking-documents";
import { bookingMailSettings } from "./booking-mail";

/** Deliver committed reservation events through the configured mail provider. */
@Injectable()
export class BookingNotificationWorker
  implements OnModuleInit, OnModuleDestroy
{
  private timer?: ReturnType<typeof setInterval>;
  private working = false;
  constructor(
    private readonly db: PrismaService,
    private readonly env: ConfigService,
    private readonly documents: BookingDocumentsService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.flush();
    }, 15000);
    this.timer.unref();
    void this.flush();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async flush() {
    if (this.working) return;
    this.working = true;
    try {
      const rows = await this.db.bookingNotification.findMany({
        where: {
          state: { in: ["PENDING", "FAILED"] },
          attempts: { lt: 3 },
          deliverAt: { lte: new Date() },
        },
        orderBy: [{ deliverAt: "asc" }, { id: "asc" }],
        take: 10,
        select: { id: true },
      });
      for (const row of rows) await this.deliver(row.id);
    } catch {
      /* Remains pending; never log contact data or provider errors. */
    } finally {
      this.working = false;
    }
  }
  private async deliver(id: string) {
    await this.db.$transaction(
      async (tx) => {
        const lock = await tx.$queryRaw<
          { locked: boolean }[]
        >`SELECT pg_try_advisory_xact_lock(hashtextextended(${id},8412)) AS locked`;
        if (!lock[0]?.locked) return;
        const row = await tx.bookingNotification.findUnique({
          where: { id },
          include: {
            clinic: { select: { name: true, timezone: true } },
            booking: {
              include: {
                appointment: { select: { status: true, startsAt: true } },
              },
            },
            appointment: {
              include: {
                tutor: { select: { email: true } },
                publicBooking: { select: { email: true } },
              },
            },
          },
        });
        if (
          !row ||
          !["PENDING", "FAILED"].includes(row.state) ||
          row.attempts >= 3
        )
          return;
        const record = row.booking?.appointment
          ? {
              ...row.booking,
              status: row.booking.appointment.status,
              startsAt: row.booking.appointment.startsAt,
            }
          : row.booking || row.appointment;
        const email =
          row.booking?.email ||
          row.appointment?.publicBooking?.email ||
          row.appointment?.tutor.email;
        const closed =
          !record ||
          ["CANCELLED", "REJECTED", "NO_SHOW", "COMPLETED"].includes(
            record.status,
          );
        const staleReminder =
          row.kind === "REMINDER" &&
          (closed ||
            !["CONFIRMED", "CONVERTED"].includes(record!.status) ||
            !row.eventKey.endsWith(record!.startsAt.toISOString()) ||
            record!.startsAt <= new Date());
        const eventVersion = row.eventKey.match(/:(\d+):[^:]+$/)?.[1];
        const staleUpdate = !["REMINDER", "AVAILABILITY_CHANGED"].includes(row.kind) && eventVersion && Number(eventVersion) !== record?.version;
        const obsoleteConfirmation = row.kind === "CONFIRMED" && (!record || !confirmedReservation(record.status));
        if (!email || staleReminder || staleUpdate || obsoleteConfirmation || (closed && !["CANCELLED", "AVAILABILITY_CHANGED"].includes(row.kind))) {
          await tx.bookingNotification.update({
            where: { id },
            data: { state: "SKIPPED" },
          });
          return;
        }
        const settings = bookingMailSettings(this.env);
        if (!settings) {
          await tx.bookingNotification.update({
            where: { id },
            data: { state: "DISABLED" },
          });
          return;
        }
        if (row.kind === "RECEIVED" && confirmedReservation(record!.status)) {
          await tx.bookingNotification.update({ where: { id }, data: { state: "SKIPPED" } });
          return;
        }
        const label: Record<string, string> = {
          RECEIVED: "Solicitud de cita recibida",
          CONFIRMED: "Reserva confirmada",
          RESCHEDULED: "Reserva reprogramada",
          CANCELLED: "Reserva cancelada",
          REMINDER: "Recordatorio de cita",
          AVAILABILITY_CHANGED: "Cambio de disponibilidad",
        };
        const transport = nodemailer.createTransport(settings.options);
        try {
          const starts = new Intl.DateTimeFormat("es-CL", {
            timeZone: row.clinic.timezone,
            dateStyle: "full",
            timeStyle: "short",
          }).format(record!.startsAt);
          const data = row.bookingId ? await this.documents.data(row.bookingId) : undefined;
          const message = data ? reservationEmail(data, row.kind === "RECEIVED" ? undefined : label[row.kind]) : undefined;
          const logo = bookingLogo();
          const invitation = data && (confirmedReservation(data.status) || row.kind === "CANCELLED") ? reservationCalendar(data, settings.from, row.kind === "CANCELLED") : undefined;
          const info = await transport.sendMail({
            from: {
              name: data?.clinicName || row.clinic.name,
              address: settings.from,
            },
            to: email,
            messageId: `<${row.id}@pawly.example.invalid>`,
            subject: message?.subject || label[row.kind] || "Actualización de agendamiento",
            text: message?.text || `${label[row.kind] || "Actualización de agendamiento"}\n${row.clinic.name}\nFecha: ${starts} (${row.clinic.timezone})\nEstado: ${record!.status}\nReferencia: ${record!.id}`,
            ...(message ? { html: message.html } : {}),
            ...(data ? { attachments: [
              { filename: `comprobante-porvenir-${data.reference}.pdf`, content: await reservationPdf(data), contentType: "application/pdf" },
              ...(logo ? [{ filename: "porvenir.png", content: readFileSync(logo), cid: "porvenir-logo" }] : []),
            ] } : {}),
            ...(invitation ? { icalEvent: { method: row.kind === "CANCELLED" ? "CANCEL" : "REQUEST", content: invitation } } : {}),
          });
          if (!info.accepted?.length) throw new Error();
          await tx.bookingNotification.update({
            where: { id },
            data: {
              state: this.env.get("MAIL_MODE") === "smtp" ? "SENT" : "CAPTURED",
              attempts: { increment: 1 },
              deliveredAt: new Date(),
            },
          });
        } catch {
          await tx.bookingNotification.update({
            where: { id },
            data: {
              state: "FAILED",
              attempts: { increment: 1 },
              deliverAt: new Date(Date.now() + 300000),
            },
          });
        } finally {
          transport.close();
        }
      },
      { timeout: 30000, maxWait: 5000 },
    );
  }
}
