import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AppointmentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  AppointmentInput,
  AppointmentQueryDto,
  UpdateAppointmentDto,
} from "./appointments.dto";

const include = {
  patient: { select: { id: true, name: true } },
  tutor: { select: { id: true, firstName: true, lastName: true } },
  professional: { select: { id: true, user: { select: { name: true } } } },
} satisfies Prisma.AppointmentInclude;
const eligibleRoles = ["OWNER", "ADMIN", "VETERINARIAN"] as const;
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
  SCHEDULED: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "CANCELLED"],
  CONFIRMED: ["CONFIRMED", "SCHEDULED", "IN_PROGRESS", "CANCELLED"],
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
  constructor(private readonly prisma: PrismaService) {}
  async list(clinicId: string, q: AppointmentQueryDto) {
    const from = utcDate(q.from),
      to = utcDate(q.to);
    if (to <= from || to.valueOf() - from.valueOf() > 32 * 86400000)
      throw new BadRequestException();
    const where: Prisma.AppointmentWhereInput = {
      clinicId,
      startsAt: { lt: to },
      endsAt: { gt: from },
      ...(q.status ? { status: q.status } : {}),
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
  professionals(clinicId: string) {
    return this.prisma.clinicMembership.findMany({
      where: {
        clinicId,
        status: "ACTIVE",
        user: { status: "ACTIVE" },
        role: { in: [...eligibleRoles] },
      },
      select: { id: true, user: { select: { name: true } } },
      orderBy: [{ user: { name: "asc" } }, { id: "asc" }],
    });
  }
  async history(clinicId: string, id: string) {
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
          const actor = await tx.clinicMembership.findUnique({
            where: { userId_clinicId: { userId, clinicId } },
          });
          if (!actor || actor.status !== "ACTIVE")
            throw new ConflictException();
          const old = id
            ? await tx.appointment.findUnique({
                where: { id_clinicId: { id, clinicId } },
              })
            : null;
          if (id && !old) throw new NotFoundException();
          const update = dto instanceof UpdateAppointmentDto ? dto : null;
          if (old && (!update || old.version !== update.version))
            throw new ConflictException();
          const status = update?.status ?? AppointmentStatus.SCHEDULED;
          if (old) assertTransition(old.status, status);
          if (
            ["IN_PROGRESS", "COMPLETED"].includes(status) &&
            actor.role === "RECEPTIONIST"
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
          if (
            !cancelling &&
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
            });
            if (!professional && !cancelling) throw new BadRequestException();
            if (!cancelling) {
              const conflict = await tx.appointment.findFirst({
                where: {
                  clinicId,
                  professionalMembershipId: dto.professionalMembershipId,
                  status: { not: "CANCELLED" },
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
            cancelling &&
            old &&
            (dto.patientId !== old.patientId ||
              dto.tutorId !== old.tutorId ||
              dto.professionalMembershipId !== old.professionalMembershipId ||
              startsAt.valueOf() !== old.startsAt.valueOf() ||
              endsAt.valueOf() !== old.endsAt.valueOf() ||
              dto.reason !== old.reason)
          )
            throw new BadRequestException();
          const data = {
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
          const snapshot = (r: {
            startsAt: Date;
            endsAt: Date;
            patientId: string;
            tutorId: string;
            professionalMembershipId: string | null;
            reason: string;
            status: AppointmentStatus;
            cancellationReason: string | null;
            version: number;
          }): Prisma.InputJsonObject => ({
            patientId: r.patientId,
            tutorId: r.tutorId,
            professionalMembershipId: r.professionalMembershipId,
            startsAt: r.startsAt.toISOString(),
            endsAt: r.endsAt.toISOString(),
            reason: r.reason,
            status: r.status,
            cancellationReason: r.cancellationReason,
            version: r.version,
          });
          await tx.appointmentEvent.create({
            data: {
              clinicId,
              appointmentId: record.id,
              actorMembershipId: actor.id,
              ...(old ? { before: snapshot(old) } : {}),
              after: snapshot(record),
            },
          });
          return record;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
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
