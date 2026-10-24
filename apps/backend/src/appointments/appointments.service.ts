import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AppointmentStatus, Prisma } from "@prisma/client";
import {
  effectivePermissions,
  lockClinic,
  medicalRoles,
  memberInclude,
  patientScope,
  requireMember,
  requirePatient,
} from "../authorization/permission-policy";
import { PrismaService } from "../prisma/prisma.service";
import { appointmentSnapshot } from "./appointment-snapshot";
import { BookingEngine } from "./booking-engine";
import { bookingNotice } from "./booking-notifications";
import {
  AppointmentInput,
  AppointmentQueryDto,
  UpdateAppointmentDto,
} from "./appointments.dto";

const include = {
  service: { select: { id: true, name: true, durationMinutes: true } },
  consultation: { select: { id: true, status: true } },
  patient: { select: { id: true, name: true } },
  tutor: { select: { id: true, firstName: true, lastName: true } },
  professional: { select: { id: true, user: { select: { name: true } } } },
} satisfies Prisma.AppointmentInclude;
const eligibleRoles = medicalRoles;
export function utcDate(input: string): Date {
  const result = new Date(input);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(input) ||
    !Number.isFinite(result.valueOf()) ||
    result.toISOString() !==
      input.replace(/Z$/, input.includes(".") ? "Z" : ".000Z") ||
    result.getUTCFullYear() < 2000 ||
    result.getUTCFullYear() > 2100
  )
    throw new BadRequestException();
  return result;
}
const transitions: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  SCHEDULED: [
    "SCHEDULED",
    "CONFIRMED",
    "ARRIVED",
    "IN_PROGRESS",
    "CANCELLED",
    "NO_SHOW",
  ],
  CONFIRMED: [
    "CONFIRMED",
    "SCHEDULED",
    "ARRIVED",
    "IN_PROGRESS",
    "CANCELLED",
    "NO_SHOW",
  ],
  ARRIVED: ["ARRIVED", "IN_PROGRESS", "CANCELLED"],
  NO_SHOW: [],
  IN_PROGRESS: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
export function assertTransition(
  before: AppointmentStatus,
  after: AppointmentStatus,
) {
  if (!transitions[before].includes(after)) throw new ConflictException();
}
@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly booking: BookingEngine,
  ) {}
  async detail(clinicId: string, id: string, userId: string) {
    const access = await requireMember(this.prisma, clinicId, userId, [
      "appointment:read",
    ]);
    const record = await this.prisma.appointment.findUnique({
      where: { id_clinicId: { id, clinicId } },
      include,
    });
    if (!record) throw new NotFoundException();
    await requirePatient(this.prisma, access, record.patientId);
    return record;
  }
  async list(clinicId: string, q: AppointmentQueryDto, userId: string) {
    const access = await requireMember(this.prisma, clinicId, userId, [
      "appointment:read",
    ]);
    const from = utcDate(q.from),
      to = utcDate(q.to);
    if (to <= from || to.valueOf() - from.valueOf() > 32 * 86400000)
      throw new BadRequestException();
    const where: Prisma.AppointmentWhereInput = {
      clinicId,
      patient: patientScope(access),
      startsAt: { lt: to },
      endsAt: { gt: from },
      ...(q.status ? { status: q.status } : {}),
      ...(q.serviceId ? { serviceId: q.serviceId } : {}),
      ...(q.scope === "upcoming"
        ? {
            status: q.status || {
              notIn: ["CANCELLED", "COMPLETED", "NO_SHOW"],
            },
            startsAt: {
              gte: new Date(Math.max(from.valueOf(), Date.now())),
              lt: to,
            },
          }
        : {}),
      ...(q.professionalMembershipId
        ? { professionalMembershipId: q.professionalMembershipId }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.appointment.findMany({
          where,
          include,
          orderBy: [{ startsAt: "asc" }, { id: "asc" }],
          take: 100,
          skip: (q.page - 1) * 100,
        }),
        this.prisma.appointment.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { items, total, page: q.page, totalPages: Math.ceil(total / 100) };
  }
  async professionals(clinicId: string) {
    const candidates = await this.prisma.clinicMembership.findMany({
      where: {
        clinicId,
        status: "ACTIVE",
        user: { status: "ACTIVE" },
        role: { in: [...eligibleRoles] },
      },
      include: {
        ...memberInclude,
        user: { select: { name: true, status: true } },
      },
      orderBy: [{ user: { name: "asc" } }, { id: "asc" }],
    });
    return candidates
      .filter(
        (m) =>
          this.booking.isDemoProfessional(clinicId, m.staffProfile) ||
          (m.staffProfile?.credentialEvidence !== "PAWLY_BOOKING_DEMO_ONLY" &&
            effectivePermissions(m).includes("consultation:write")),
      )
      .map((m) => ({ id: m.id, user: { name: m.user.name } }));
  }
  async history(clinicId: string, id: string, userId: string) {
    await this.detail(clinicId, id, userId);
    const record = await this.prisma.appointment.findUnique({
      where: { id_clinicId: { id, clinicId } },
    });
    if (!record) throw new NotFoundException();
    return this.prisma.appointmentEvent.findMany({
      where: { clinicId, appointmentId: id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        before: true,
        after: true,
        createdAt: true,
        actor: { select: { user: { select: { name: true } } } },
      },
    });
  }
  async save(
    clinicId: string,
    userId: string,
    dto: AppointmentInput | UpdateAppointmentDto,
    id?: string,
  ) {
    const startsAt = utcDate(dto.startsAt),
      endsAt = new Date(startsAt.valueOf() + dto.durationMinutes * 60000);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await lockClinic(tx, clinicId);
          const actor = await requireMember(tx, clinicId, userId, [
            "appointment:write",
          ]);
          if (actor.patientScope === "ASSIGNED")
            await requirePatient(tx, actor, dto.patientId);
          const old = id
            ? await tx.appointment.findUnique({
                where: { id_clinicId: { id, clinicId } },
              })
            : null;
          if (id && !old) throw new NotFoundException();
          if (old) await requirePatient(tx, actor, old.patientId);
          if (
            old &&
            (await tx.consultation.findFirst({
              where: { clinicId, appointmentId: old.id },
            }))
          )
            throw new ConflictException();
          const update = dto instanceof UpdateAppointmentDto ? dto : null;
          if (old && (!update || old.version !== update.version))
            throw new ConflictException();
          const status = update?.status ?? AppointmentStatus.SCHEDULED;
          if (old) assertTransition(old.status, status);
          if (status === "NO_SHOW" && startsAt > new Date())
            throw new BadRequestException(
              "Una cita futura no puede marcarse como inasistencia.",
            );
          if (
            ["IN_PROGRESS", "COMPLETED"].includes(status) &&
            !effectivePermissions(actor).includes("appointment:clinical")
          )
            throw new ForbiddenException();
          if (
            (!old || old.startsAt.valueOf() !== startsAt.valueOf()) &&
            startsAt.valueOf() < Date.now() - 60000
          )
            throw new BadRequestException();
          const relation = await tx.patientTutor.findUnique({
            where: {
              clinicId_patientId_tutorId: {
                clinicId,
                patientId: dto.patientId,
                tutorId: dto.tutorId,
              },
            },
            include: { patient: true, tutor: true },
          });
          // A historical cancelled appointment can still be cancelled after archival.
          const cancelling = status === "CANCELLED";
          const closing = cancelling || status === "NO_SHOW";
          if (
            !closing &&
            (!relation ||
              relation.patient.status !== "ACTIVE" ||
              relation.tutor.status !== "ACTIVE")
          )
            throw new BadRequestException();
          if (dto.professionalMembershipId) {
            const professional = await tx.clinicMembership.findFirst({
              where: {
                id: dto.professionalMembershipId,
                clinicId,
                status: "ACTIVE",
                user: { status: "ACTIVE" },
                role: { in: [...eligibleRoles] },
              },
              include: memberInclude,
            });
            if (
              (!professional ||
                (!this.booking.isDemoProfessional(
                  clinicId,
                  professional.staffProfile,
                ) &&
                  (professional.staffProfile?.credentialEvidence ===
                    "PAWLY_BOOKING_DEMO_ONLY" ||
                    !effectivePermissions(professional).includes(
                      "consultation:write",
                    )))) &&
              !closing
            )
              throw new BadRequestException();
            if (!closing) {
              const conflict = await tx.appointment.findFirst({
                where: {
                  clinicId,
                  professionalMembershipId: dto.professionalMembershipId,
                  status: { notIn: ["CANCELLED", "NO_SHOW"] },
                  startsAt: { lt: endsAt },
                  endsAt: { gt: startsAt },
                  ...(id ? { id: { not: id } } : {}),
                },
              });
              if (conflict) throw new ConflictException();
            }
          }
          if (cancelling && !update?.cancellationReason?.trim())
            throw new BadRequestException();
          if (
            closing &&
            old &&
            (dto.patientId !== old.patientId ||
              dto.tutorId !== old.tutorId ||
              dto.professionalMembershipId !== old.professionalMembershipId ||
              startsAt.valueOf() !== old.startsAt.valueOf() ||
              endsAt.valueOf() !== old.endsAt.valueOf() ||
              dto.reason !== old.reason)
          )
            throw new BadRequestException();
          const changedTime =
            !old ||
            old.startsAt.valueOf() !== startsAt.valueOf() ||
            old.endsAt.valueOf() !== endsAt.valueOf() ||
            old.professionalMembershipId !== dto.professionalMembershipId ||
            (dto.serviceId !== undefined && dto.serviceId !== old.serviceId);
          const bookingData =
            changedTime && status !== "CANCELLED" && status !== "NO_SHOW"
              ? await this.booking.checkManual(tx, clinicId, {
                  serviceId: dto.serviceId ?? old?.serviceId ?? null,
                  professionalId: dto.professionalMembershipId,
                  startsAt,
                  endsAt,
                  ...(old ? { appointmentId: old.id } : {}),
                })
              : {
                  serviceId: old?.serviceId ?? null,
                  resourceKey: old?.resourceKey ?? null,
                  blockedUntil: old?.blockedUntil ?? null,
                };
          const data = {
            ...bookingData,
            patientId: dto.patientId,
            tutorId: dto.tutorId,
            professionalMembershipId: dto.professionalMembershipId,
            startsAt,
            endsAt,
            reason: dto.reason,
            status,
            cancellationReason: cancelling
              ? update!.cancellationReason!.trim()
              : null,
          };
          const record = old
            ? await tx.appointment.update({
                where: { id_clinicId: { id: old.id, clinicId } },
                data: { ...data, version: { increment: 1 } },
                include,
              })
            : await tx.appointment.create({
                data: { ...data, clinicId },
                include,
              });
          await tx.appointmentEvent.create({
            data: {
              clinicId,
              appointmentId: record.id,
              actorMembershipId: actor.id,
              ...(old ? { before: appointmentSnapshot(old) } : {}),
              after: appointmentSnapshot(record),
            },
          });
          const linked = await tx.bookingRequest.findFirst({
            where: { clinicId, appointmentId: record.id },
          });
          if (linked && record.serviceId && record.professionalMembershipId) {
            await tx.bookingRequest.update({
              where: { id: linked.id },
              data: {
                serviceId: record.serviceId,
                professionalMembershipId: record.professionalMembershipId,
                startsAt: record.startsAt,
                endsAt: record.endsAt,
                blockedUntil: record.blockedUntil || record.endsAt,
                resourceKey: record.resourceKey,
                status:
                  record.status === "CANCELLED" || record.status === "NO_SHOW"
                    ? "CANCELLED"
                    : "CONVERTED",
                cancellationReason:
                  record.status === "NO_SHOW"
                    ? "Inasistencia registrada por la clínica"
                    : record.cancellationReason,
                version: { increment: 1 },
              },
            });
            await tx.bookingEvent.create({
              data: {
                clinicId,
                bookingId: linked.id,
                actorMembershipId: actor.id,
                action: `APPOINTMENT_${record.status}`,
                snapshot: {
                  status:
                    record.status === "CANCELLED" || record.status === "NO_SHOW"
                      ? "CANCELLED"
                      : "CONVERTED",
                  appointmentStatus: record.status,
                  startsAt: record.startsAt.toISOString(),
                  endsAt: record.endsAt.toISOString(),
                  version: linked.version + 1,
                },
              },
            });
          }
          const notificationKind =
            record.status === "CANCELLED"
              ? "CANCELLED"
              : !old
                ? "RECEIVED"
                : changedTime
                  ? "RESCHEDULED"
                  : record.status === "CONFIRMED" && old.status !== "CONFIRMED"
                    ? "CONFIRMED"
                    : null;
          if (notificationKind)
            await bookingNotice(tx, {
              clinicId,
              ...(linked
                ? { bookingId: linked.id }
                : { appointmentId: record.id }),
              version: linked ? linked.version + 1 : record.version,
              kind: notificationKind,
              startsAt: record.startsAt,
              remind: record.status === "CONFIRMED",
            });
          return record;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          maxWait: 5000,
          timeout: 10000,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2003", "P2034"].includes(error.code)
      )
        throw new ConflictException();
      throw error;
    }
  }
}
