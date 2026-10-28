import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { Prisma, type BookingRequest } from "@prisma/client";
import {
  lockClinic,
  requireMember,
  requirePatient,
} from "../authorization/permission-policy";
import { BookingEngine, activeBookingStates } from "./booking-engine";
import { appointmentSnapshot } from "./appointment-snapshot";
import { utcDate } from "./appointments.service";
import { bookingNotice } from "./booking-notifications";
import { reservationCredential } from "./booking-documents";
import { canBook } from "./booking-policy";
import type {
  BookingListDto,
  BookingLookupDto,
  BookingSlotsDto,
  ManageBookingDto,
  PublicBookingDto,
  PublicCancelBookingDto,
  PublicRescheduleBookingDto,
} from "./booking.dto";

export const bookingTokenHash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const include = {
  service: { select: { name: true, durationMinutes: true } },
  professional: { select: { user: { select: { name: true } } } },
} satisfies Prisma.BookingRequestInclude;
@Injectable()
export class PublicBookingService {
  constructor(
    readonly engine: BookingEngine,
    private readonly env: ConfigService,
  ) {}
  async clinic(slug: string) {
    if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(slug)) throw new NotFoundException();
    const clinic = await this.engine.prisma.veterinaryClinic.findFirst({
      where: { slug, status: "ACTIVE" },
      select: { id: true, name: true, slug: true, timezone: true },
    });
    if (!clinic) throw new NotFoundException();
    return clinic;
  }
  async catalog(slug: string) {
    const clinic = await this.clinic(slug),
      { configuration: policy } = await this.engine.policy(
        this.engine.prisma,
        clinic.id,
      );
    const website = await this.engine.prisma.veterinaryWebsite.findUnique({
      where: { clinicId: clinic.id },
      select: { published: true },
    });
    const published = website?.published as Record<string, unknown> | null;
    const name =
      typeof published?.clinicName === "string"
        ? published.clinicName
        : this.env.get<string>("WEBSITE_CLINIC_ID") === clinic.id
          ? this.env.get<string>("WEBSITE_PUBLIC_NAME") || clinic.name
          : clinic.name;
    const address = typeof published?.address === "string" && published.address.trim() ? published.address.trim() : this.env.get<string>("WEBSITE_CLINIC_ID") === clinic.id ? this.env.get<string>("WEBSITE_PUBLIC_ADDRESS") || "" : "";
    const demo = this.engine.isDemoClinic(clinic.id);
    if (
      !policy.publicEnabled ||
      (this.env.get("BOOKING_DEMO_CLINIC_ID") === clinic.id && !demo)
    )
      return {
        available: false,
        clinic: { name, slug, timezone: clinic.timezone, address },
        services: [],
        professionals: [],
        policy: {
          message:
            "El agendamiento público aún no está habilitado. Contacta directamente a la clínica.",
        },
      };
    const services = await this.engine.prisma.bookingService.findMany({
      where: { clinicId: clinic.id, enabled: true },
      include: { professionals: { select: { membershipId: true } } },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 100,
    });
    const professionals = await this.engine.professionals(
      this.engine.prisma,
      clinic.id,
      undefined,
      true,
    );
    return {
      available: true,
      demo,
      clinic: { name, slug, timezone: clinic.timezone, address },
      professionals,
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMinutes: s.durationMinutes,
        professionalIds: s.professionals
          .map((p) => p.membershipId)
          .filter((id) => professionals.some((p) => p.id === id)),
      })),
      policy: {
        message: policy.message,
        minNoticeMinutes: policy.minNoticeMinutes,
        maxAdvanceDays: policy.maxAdvanceDays,
        autoConfirm: policy.autoConfirm,
        autoAssign: policy.autoAssign,
        cancellationNoticeMinutes: policy.cancellationNoticeMinutes,
      },
    };
  }
  async slots(slug: string, query: BookingSlotsDto) {
    return this.engine.slots((await this.clinic(slug)).id, query, true);
  }
  private view(row: BookingRequest, timezone: string) {
    return {
      reference: row.id,
      status: row.status,
      version: row.version,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      serviceId: row.serviceId,
      professionalId: row.professionalMembershipId,
      timezone,
      confirmed: ["CONFIRMED", "CONVERTED"].includes(row.status),
      emailDelivery: this.env.get("MAIL_MODE") === "smtp" && this.env.get("MAIL_PASSWORD") ? "queued" : "unavailable",
      message:
        row.status === "PENDING"
          ? "Solicitud recibida, pendiente de aprobación. Todavía no es una cita confirmada."
          : ["CONFIRMED", "CONVERTED"].includes(row.status)
            ? "Reserva confirmada por la clínica."
            : "Esta reserva está cerrada.",
    };
  }
  async create(slug: string, dto: PublicBookingDto) {
    const digits = dto.phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15)
      throw new BadRequestException("Teléfono inválido.");
    const phone = `+${digits.length === 9 && digits.startsWith("9") ? "56" : ""}${digits}`;
    const clinic = await this.clinic(slug),
      startsAt = utcDate(dto.startsAt);
    return this.engine.prisma.$transaction(
      async (tx) => {
        await lockClinic(tx, clinic.id);
        const old = await tx.bookingRequest.findUnique({
          where: {
            clinicId_requestId: {
              clinicId: clinic.id,
              requestId: dto.requestId,
            },
          },
        });
        if (old) {
          if (old.tokenHash !== bookingTokenHash(dto.managementToken))
            throw new ConflictException();
          return this.view(old, clinic.timezone);
        }
        const { configuration: policy } = await this.engine.policy(
          tx,
          clinic.id,
        );
        const recent = await tx.bookingRequest.count({
          where: {
            clinicId: clinic.id,
            createdAt: { gte: new Date(Date.now() - 86400000) },
            OR: [{ email: dto.email.toLowerCase() }, { phone }],
          },
        });
        const pending = await tx.bookingRequest.count({
          where: {
            clinicId: clinic.id,
            status: "PENDING",
            startsAt: { gte: new Date() },
          },
        });
        if (recent >= 3 || pending >= 300)
          throw new HttpException(
            "No pudimos recibir más solicitudes. Contacta directamente a la clínica.",
            429,
          );
        if (
          !policy.publicEnabled ||
          (!dto.professionalId && !policy.autoAssign)
        )
          throw new BadRequestException(
            "Selecciona un profesional habilitado.",
          );
        const candidates = await this.engine.professionals(
          tx,
          clinic.id,
          dto.serviceId,
          true,
        );
        const liveClinic = await this.engine.clinic(tx, clinic.id);
        const currentService = await this.engine.service(
          tx,
          clinic.id,
          dto.serviceId,
        );
        const occupied = await this.engine.occupied(
          tx,
          clinic.id,
          new Date(startsAt.valueOf() - 600 * 60000),
          new Date(startsAt.valueOf() + 600 * 60000),
        );
        let chosen: Awaited<ReturnType<BookingEngine["check"]>> | null = null;
        let professionalId = "";
        for (const candidate of candidates.filter(
          (c) => !dto.professionalId || dto.professionalId === c.id,
        )) {
          if (
            !canBook({
              startsAt,
              professionalId: candidate.id,
              timezone: liveClinic.timezone,
              policy,
              service: currentService,
              occupied,
              now: new Date(),
            })
          )
            continue;
          try {
            chosen = await this.engine.check(
              tx,
              clinic.id,
              dto.serviceId,
              candidate.id,
              startsAt,
              true,
            );
            professionalId = candidate.id;
            break;
          } catch (error) {
            if (!(error instanceof ConflictException)) throw error;
          }
        }
        if (!chosen)
          throw new ConflictException("Ese horario ya no está disponible.");
        const row = await tx.bookingRequest.create({
          data: {
            clinicId: clinic.id,
            requestId: dto.requestId,
            tokenHash: bookingTokenHash(dto.managementToken),
            serviceId: dto.serviceId,
            professionalMembershipId: professionalId,
            startsAt,
            endsAt: chosen.endsAt,
            blockedUntil: chosen.blockedUntil,
            resourceKey: chosen.service.resourceKey,
            status: policy.autoConfirm ? "CONFIRMED" : "PENDING",
            ownerName: dto.ownerName,
            ownerRut: dto.ownerRut,
            email: dto.email.toLowerCase(),
            phone,
            petName: dto.petName,
            species: dto.species,
            reason: dto.reason,
            additionalInfo: dto.additionalInfo,
          },
        });
        await this.event(tx, row, "RECEIVED");
        await bookingNotice(tx, {
          clinicId: clinic.id,
          bookingId: row.id,
          version: row.version,
          kind: "RECEIVED",
          startsAt,
          remind: false,
        });
        if (policy.autoConfirm)
          await bookingNotice(tx, {
            clinicId: clinic.id,
            bookingId: row.id,
            version: row.version,
            kind: "CONFIRMED",
            startsAt,
            remind: true,
          });
        return this.view(row, clinic.timezone);
      },
      { maxWait: 10000, timeout: 15000 },
    );
  }
  private async authorized(
    db: Prisma.TransactionClient,
    clinicId: string,
    dto: BookingLookupDto,
  ) {
    const row = await db.bookingRequest.findFirst({
      where: {
        clinicId,
        id: dto.reference,
      },
    });
    if (!row || !reservationCredential(row, dto.managementToken, this.env.get<string>("BOOKING_LINK_SECRET"))) throw new NotFoundException("Reserva no encontrada.");
    return row;
  }
  async lookup(slug: string, dto: BookingLookupDto) {
    const clinic = await this.clinic(slug),
      row = await this.authorized(this.engine.prisma, clinic.id, dto);
    const kinds = row.status === "CANCELLED" ? ["CANCELLED"] : ["CONFIRMED", "CONVERTED"].includes(row.status) ? ["CONFIRMED", "RESCHEDULED"] : ["RECEIVED", "RESCHEDULED"];
    const mail = await this.engine.prisma.bookingNotification.findFirst({ where: { bookingId: row.id, kind: { in: kinds } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { state: true, attempts: true } });
    const configured = this.env.get("MAIL_MODE") === "smtp" && this.env.get("MAIL_PASSWORD");
    return {
      ...this.view(row, clinic.timezone),
      emailDelivery: !configured || ["CAPTURED", "DISABLED"].includes(mail?.state || "") ? "unavailable" : mail?.state === "SENT" ? "sent" : mail?.state === "FAILED" && mail.attempts >= 3 ? "failed" : "queued",
      email: row.email,
      ownerName: row.ownerName,
      ownerRut: row.ownerRut,
      petName: row.petName,
      reason: row.reason,
    };
  }
  async visitorChange(
    slug: string,
    dto: PublicCancelBookingDto | PublicRescheduleBookingDto,
    cancel: boolean,
  ) {
    const clinic = await this.clinic(slug);
    return this.engine.prisma.$transaction(async (tx) => {
      await lockClinic(tx, clinic.id);
      const old = await this.authorized(tx, clinic.id, dto),
        { configuration: policy } = await this.engine.policy(tx, clinic.id);
      if (old.status === "CONVERTED")
        throw new ConflictException(
          "La clínica ya vinculó tu reserva a una cita. Contacta al equipo para modificarla.",
        );
      if (
        !activeBookingStates.includes(old.status) ||
        old.startsAt.valueOf() - Date.now() <
          policy.cancellationNoticeMinutes * 60000
      )
        throw new ConflictException(
          "El plazo de modificación terminó. Contacta a la clínica.",
        );
      let data: Prisma.BookingRequestUpdateInput;
      if (cancel)
        data = {
          status: "CANCELLED",
          cancellationReason: (dto as PublicCancelBookingDto).reason,
        };
      else {
        const change = dto as PublicRescheduleBookingDto;
        if (change.version !== old.version) throw new ConflictException();
        const startsAt = utcDate(change.startsAt),
          checked = await this.engine.check(
            tx,
            clinic.id,
            old.serviceId,
            old.professionalMembershipId,
            startsAt,
            true,
            { bookingId: old.id },
          );
        data = {
          startsAt,
          endsAt: checked.endsAt,
          blockedUntil: checked.blockedUntil,
          resourceKey: checked.service.resourceKey,
          status: policy.autoConfirm ? "CONFIRMED" : "PENDING",
        };
      }
      const row = await tx.bookingRequest.update({
        where: { id_clinicId: { id: old.id, clinicId: clinic.id } },
        data: { ...data, version: { increment: 1 } },
      });
      await this.event(tx, row, cancel ? "CANCELLED" : "RESCHEDULED");
      await bookingNotice(tx, {
        clinicId: clinic.id,
        bookingId: row.id,
        version: row.version,
        kind: cancel ? "CANCELLED" : "RESCHEDULED",
        startsAt: row.startsAt,
        remind: row.status === "CONFIRMED",
      });
      return this.view(row, clinic.timezone);
    });
  }
  private async event(
    tx: Prisma.TransactionClient,
    row: BookingRequest,
    action: string,
    actorMembershipId?: string,
  ) {
    await tx.bookingEvent.create({
      data: {
        clinicId: row.clinicId,
        bookingId: row.id,
        actorMembershipId: actorMembershipId || null,
        action,
        snapshot: {
          status: row.status,
          startsAt: row.startsAt.toISOString(),
          endsAt: row.endsAt.toISOString(),
          professionalId: row.professionalMembershipId,
          serviceId: row.serviceId,
          version: row.version,
          cancellationReason: row.cancellationReason,
        },
      },
    });
  }
  async list(clinicId: string, userId: string, q: BookingListDto) {
    const member = await requireMember(this.engine.prisma, clinicId, userId, [
      "appointment:read",
    ]);
    const from = utcDate(q.from),
      to = utcDate(q.to);
    if (to <= from || to.valueOf() - from.valueOf() > 32 * 86400000)
      throw new BadRequestException();
    const where: Prisma.BookingRequestWhereInput = {
      clinicId,
      ...(q.calendar === "1"
        ? { AND: [{ status: { in: activeBookingStates } }] }
        : {}),
      startsAt: { lt: to },
      endsAt: { gt: from },
      ...(q.status ? { status: q.status } : {}),
      ...(q.serviceId ? { serviceId: q.serviceId } : {}),
      ...(q.professionalId
        ? { professionalMembershipId: q.professionalId }
        : {}),
      ...(member.patientScope === "ASSIGNED"
        ? { professionalMembershipId: member.id }
        : {}),
    };
    const [items, total] = await this.engine.prisma.$transaction([
      this.engine.prisma.bookingRequest.findMany({
        where,
        include,
        omit: { tokenHash: true },
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
        skip: (q.page - 1) * 50,
        take: 50,
      }),
      this.engine.prisma.bookingRequest.count({ where }),
    ]);
    return {
      items,
      total,
      totalPages: Math.ceil(total / 50),
    };
  }
  async history(clinicId: string, userId: string, id: string) {
    const member = await requireMember(this.engine.prisma, clinicId, userId, [
      "appointment:read",
    ]);
    const row = await this.engine.prisma.bookingRequest.findFirst({
      where: {
        clinicId,
        id,
        ...(member.patientScope === "ASSIGNED"
          ? { professionalMembershipId: member.id }
          : {}),
      },
    });
    if (!row) throw new NotFoundException();
    return this.engine.prisma.bookingEvent.findMany({
      where: { clinicId, bookingId: id },
      select: {
        action: true,
        snapshot: true,
        createdAt: true,
        actor: { select: { user: { select: { name: true } } } },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: 200,
    });
  }
  async manage(
    clinicId: string,
    userId: string,
    id: string,
    dto: ManageBookingDto,
  ) {
    return this.engine.prisma.$transaction(
      async (tx) => {
        await lockClinic(tx, clinicId);
        const actor = await requireMember(tx, clinicId, userId, [
          "appointment:write",
        ]);
        const old = await tx.bookingRequest.findFirst({
          where: { clinicId, id },
        });
        if (!old) throw new NotFoundException();
        if (
          actor.patientScope === "ASSIGNED" &&
          old.professionalMembershipId !== actor.id
        )
          throw new ForbiddenException();
        if (
          old.version !== dto.version ||
          !activeBookingStates.includes(old.status)
        )
          throw new ConflictException();
        let data: Prisma.BookingRequestUncheckedUpdateInput = {};
        if (["CANCEL", "REJECT"].includes(dto.action)) {
          if (!dto.reason) throw new BadRequestException("Indica el motivo.");
          data = {
            status: dto.action === "CANCEL" ? "CANCELLED" : "REJECTED",
            cancellationReason: dto.reason,
          };
        } else if (dto.action === "RESCHEDULE") {
          if (!dto.startsAt) throw new BadRequestException();
          const startsAt = utcDate(dto.startsAt),
            checked = await this.engine.check(
              tx,
              clinicId,
              old.serviceId,
              old.professionalMembershipId,
              startsAt,
              false,
              { bookingId: id },
            );
          data = {
            startsAt,
            endsAt: checked.endsAt,
            blockedUntil: checked.blockedUntil,
            resourceKey: checked.service.resourceKey,
          };
        } else {
          await this.engine.checkExisting(tx, old);
          if (dto.action === "CONFIRM") data = { status: "CONFIRMED" };
          else if (dto.action === "LINK_PATIENT") {
            if (!dto.patientId || !dto.tutorId)
              throw new BadRequestException(
                "Selecciona paciente y tutor existentes y verificados.",
              );
            await requirePatient(tx, actor, dto.patientId);
            const relation = await tx.patientTutor.findFirst({
              where: {
                clinicId,
                patientId: dto.patientId,
                tutorId: dto.tutorId,
                patient: { status: "ACTIVE" },
                tutor: { status: "ACTIVE" },
              },
            });
            if (!relation)
              throw new BadRequestException(
                "El tutor y paciente no están vinculados.",
              );
            const appointment = await tx.appointment.create({
              data: {
                clinicId,
                patientId: dto.patientId,
                tutorId: dto.tutorId,
                professionalMembershipId: old.professionalMembershipId,
                serviceId: old.serviceId,
                resourceKey: old.resourceKey,
                startsAt: old.startsAt,
                endsAt: old.endsAt,
                blockedUntil: old.blockedUntil,
                reason: old.reason,
                status: "CONFIRMED",
                source: "PUBLIC",
              },
            });
            await tx.appointmentEvent.create({
              data: {
                clinicId,
                appointmentId: appointment.id,
                actorMembershipId: actor.id,
                after: appointmentSnapshot(appointment),
              },
            });
            data = { status: "CONVERTED", appointmentId: appointment.id };
          } else throw new BadRequestException();
        }
        const row = await tx.bookingRequest.update({
          where: { id_clinicId: { id, clinicId } },
          data: { ...data, version: { increment: 1 } },
        });
        await this.event(tx, row, dto.action, actor.id);
        if (!(dto.action === "LINK_PATIENT" && old.status === "CONFIRMED"))
          await bookingNotice(tx, {
            clinicId,
            bookingId: id,
            version: row.version,
            kind:
              dto.action === "CONFIRM" || dto.action === "LINK_PATIENT"
                ? "CONFIRMED"
                : dto.action === "RESCHEDULE"
                  ? "RESCHEDULED"
                  : "CANCELLED",
            startsAt: row.startsAt,
            remind: ["CONFIRMED", "CONVERTED"].includes(row.status),
          });
        return {
          saved: true,
          status: row.status,
          appointmentId: row.appointmentId,
        };
      },
      { maxWait: 10000, timeout: 15000 },
    );
  }
}
