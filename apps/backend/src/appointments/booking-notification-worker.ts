import {
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";
import { PrismaService } from "../prisma/prisma.service";

/** Only local Mailpit is supported here. No external or paid sender is enabled. */
@Injectable()
export class BookingNotificationWorker
  implements OnModuleInit, OnModuleDestroy
{
  private timer?: ReturnType<typeof setInterval>;
  private working = false;
  constructor(
    private readonly db: PrismaService,
    private readonly env: ConfigService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => {
      void this.flush();
    }, 60000);
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
        if (!email || staleReminder) {
          await tx.bookingNotification.update({
            where: { id },
            data: { state: "SKIPPED" },
          });
          return;
        }
        const local =
          this.env.get("MAIL_MODE") === "local" &&
          this.env.get("NODE_ENV") !== "production";
        if (!local) {
          await tx.bookingNotification.update({
            where: { id },
            data: { state: "DISABLED" },
          });
          return;
        }
        const host = this.env.get<string>("MAIL_HOST") || "127.0.0.1";
        if (!["127.0.0.1", "localhost", "::1"].includes(host)) return;
        const label: Record<string, string> = {
          RECEIVED: "Solicitud de cita recibida",
          CONFIRMED: "Reserva confirmada",
          RESCHEDULED: "Reserva reprogramada",
          CANCELLED: "Reserva cancelada",
          REMINDER: "Recordatorio de cita",
          AVAILABILITY_CHANGED: "Cambio de disponibilidad",
        };
        const transport = nodemailer.createTransport({
          host,
          port: Number(this.env.get("MAIL_PORT") || 1025),
          secure: false,
          ignoreTLS: true,
          logger: false,
          debug: false,
          connectionTimeout: 2000,
          greetingTimeout: 2000,
          socketTimeout: 3000,
          disableFileAccess: true,
          disableUrlAccess: true,
        });
        try {
          const starts = new Intl.DateTimeFormat("es-CL", {
            timeZone: row.clinic.timezone,
            dateStyle: "full",
            timeStyle: "short",
          }).format(record!.startsAt);
          const info = await transport.sendMail({
            from: {
              name: row.clinic.name,
              address: "agenda@pawly.example.invalid",
            },
            to: email,
            messageId: `<${row.id}@pawly.example.invalid>`,
            subject: label[row.kind] || "Actualización de agendamiento",
            text: `${label[row.kind] || "Actualización de agendamiento"}\n${row.clinic.name}\nFecha: ${starts} (${row.clinic.timezone})\nEstado: ${record!.status}\nReferencia: ${record!.id}\n\n${record!.status === "PENDING" ? "Pendiente de aprobación: todavía no es una cita confirmada.\n" : ""}Prueba local capturada en Mailpit; no se envió a una bandeja real. No se incluyen fichas clínicas ni enlaces con secretos.`,
          });
          if (!info.accepted?.length) throw new Error();
          await tx.bookingNotification.update({
            where: { id },
            data: {
              state: "SENT",
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
      { timeout: 12000, maxWait: 5000 },
    );
  }
}
