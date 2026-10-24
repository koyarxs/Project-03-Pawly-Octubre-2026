import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Consultation } from "@prisma/client";
import {
  effectivePermissions,
  lockClinic,
  memberInclude,
  patientScope,
  requireMember,
  requirePatient,
} from "../authorization/permission-policy";
import { PrismaService } from "../prisma/prisma.service";
import { utcDate } from "../appointments/appointments.service";
import { appointmentSnapshot } from "../appointments/appointment-snapshot";
import { BookingEngine } from "../appointments/booking-engine";
import {
  AmendmentDto,
  ClinicalFieldsDto,
  ConsultationQueryDto,
  CreateConsultationDto,
  UpdateConsultationDto,
} from "./consultations.dto";

const person = {
  select: { id: true, user: { select: { name: true } } },
} as const;
const include = {
  patient: { select: { id: true, name: true } },
  professional: person,
  creator: person,
  finalizer: person,
  appointment: { select: { id: true, status: true, startsAt: true } },
} satisfies Prisma.ConsultationInclude;
export function clinicalData(dto: ClinicalFieldsDto) {
  const attendedAt = utcDate(dto.attendedAt),
    nextControlAt = dto.nextControlAt ? utcDate(dto.nextControlAt) : null;
  if (
    attendedAt.valueOf() > Date.now() + 300000 ||
    (nextControlAt && nextControlAt <= attendedAt)
  )
    throw new BadRequestException();
  return {
    professionalMembershipId: dto.professionalMembershipId,
    attendedAt,
    reason: dto.reason,
    anamnesis: dto.anamnesis,
    physicalExam: dto.physicalExam,
    findings: dto.findings,
    diagnosis: dto.diagnosis,
    diagnosisType: dto.diagnosisType ?? null,
    treatment: dto.treatment,
    instructions: dto.instructions,
    notes: dto.notes,
    weightKg: dto.weightKg ?? null,
    temperatureC: dto.temperatureC ?? null,
    heartRate: dto.heartRate ?? null,
    respiratoryRate: dto.respiratoryRate ?? null,
    nextControlAt,
  };
}
export function assertFinalizable(dto: ClinicalFieldsDto) {
  if (
    ![
      dto.reason,
      dto.anamnesis,
      dto.physicalExam,
      dto.diagnosis,
      dto.treatment,
    ].every((v) => typeof v === "string" && v.trim()) ||
    !dto.diagnosisType
  )
    throw new BadRequestException();
}
@Injectable()
export class ConsultationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly booking: BookingEngine,
  ) {}
  private serialize<
    T extends {
      weightKg: Prisma.Decimal | null;
      temperatureC: Prisma.Decimal | null;
    },
  >(r: T) {
    return {
      ...r,
      weightKg: r.weightKg?.toNumber() ?? null,
      temperatureC: r.temperatureC?.toNumber() ?? null,
    };
  }
  private async write<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    try {
      return await this.prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 5000,
        timeout: 10000,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2003", "P2034", "P2004"].includes(error.code)
      )
        throw new ConflictException();
      throw error;
    }
  }
  private async actor(
    tx: Prisma.TransactionClient,
    clinicId: string,
    userId: string,
  ) {
    await lockClinic(tx, clinicId);
    return requireMember(tx, clinicId, userId, ["consultation:write"]);
  }
  private async professional(
    tx: Prisma.TransactionClient,
    clinicId: string,
    id: string,
  ) {
    const member = await tx.clinicMembership.findFirst({
      where: { id, clinicId },
      include: memberInclude,
    });
    if (!member || !effectivePermissions(member).includes("consultation:write"))
      throw new BadRequestException();
  }

  private async record(
    tx: Prisma.TransactionClient,
    clinicId: string,
    id: string,
  ) {
    const r = await tx.consultation.findUnique({
      where: { id_clinicId: { id, clinicId } },
    });
    if (!r) throw new NotFoundException();
    return r;
  }
  private async event(
    tx: Prisma.TransactionClient,
    record: Consultation,
    actorId: string,
    kind: string,
    snapshot?: unknown,
  ) {
    const content =
      snapshot ??
      Object.fromEntries(
        Object.entries(record).filter(
          ([key]) =>
            ![
              "patient",
              "professional",
              "creator",
              "finalizer",
              "appointment",
            ].includes(key),
        ),
      );
    await tx.consultationEvent.create({
      data: {
        clinicId: record.clinicId,
        consultationId: record.id,
        actorMembershipId: actorId,
        kind,
        snapshot: JSON.parse(JSON.stringify(content)) as Prisma.InputJsonObject,
      },
    });
  }
  private async syncAppointment(
    tx: Prisma.TransactionClient,
    record: Consultation,
    actorId: string,
  ) {
    if (!record.appointmentId) return;
    const appointment = await tx.appointment.findUnique({
      where: {
        id_clinicId: { id: record.appointmentId, clinicId: record.clinicId },
      },
    });
    if (
      !appointment ||
      appointment.patientId !== record.patientId ||
      ["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appointment.status)
    )
      throw new ConflictException();
    const conflict = await tx.appointment.findFirst({
      where: {
        clinicId: record.clinicId,
        id: { not: appointment.id },
        professionalMembershipId: record.professionalMembershipId,
        status: { notIn: ["CANCELLED", "NO_SHOW"] },
        startsAt: { lt: appointment.endsAt },
        endsAt: { gt: appointment.startsAt },
      },
    });
    if (conflict) throw new ConflictException();
    if (
      appointment.professionalMembershipId !== record.professionalMembershipId
    ) {
      const end = appointment.blockedUntil || appointment.endsAt;
      const occupied = await this.booking.occupied(
        tx,
        record.clinicId,
        appointment.startsAt,
        end,
        { appointmentId: appointment.id },
      );
      if (
        occupied.some(
          (o) =>
            o.professionalId === record.professionalMembershipId &&
            o.startsAt < end &&
            o.blockedUntil > appointment.startsAt,
        )
      )
        throw new ConflictException();
    }
    const status = record.status === "FINALIZED" ? "COMPLETED" : "IN_PROGRESS";
    if (
      appointment.status === status &&
      appointment.professionalMembershipId === record.professionalMembershipId
    )
      return;
    const updated = await tx.appointment.update({
      where: { id_clinicId: { id: appointment.id, clinicId: record.clinicId } },
      data: {
        status,
        professionalMembershipId: record.professionalMembershipId,
        version: { increment: 1 },
      },
    });
    await tx.appointmentEvent.create({
      data: {
        clinicId: record.clinicId,
        appointmentId: appointment.id,
        actorMembershipId: actorId,
        before: appointmentSnapshot(appointment),
        after: appointmentSnapshot(updated),
      },
    });
    const publicBooking = await tx.bookingRequest.findFirst({
      where: { clinicId: record.clinicId, appointmentId: appointment.id },
    });
    if (publicBooking) {
      await tx.bookingRequest.update({
        where: { id: publicBooking.id },
        data: {
          professionalMembershipId: updated.professionalMembershipId!,
          version: { increment: 1 },
        },
      });
      await tx.bookingEvent.create({
        data: {
          clinicId: record.clinicId,
          bookingId: publicBooking.id,
          actorMembershipId: actorId,
          action:
            record.status === "FINALIZED"
              ? "CONSULTATION_COMPLETED"
              : "CONSULTATION_STARTED",
          snapshot: {
            status: publicBooking.status,
            appointmentStatus: updated.status,
            startsAt: updated.startsAt.toISOString(),
          },
        },
      });
    }
  }
  async list(clinicId: string, q: ConsultationQueryDto, userId: string) {
    const access = await requireMember(this.prisma, clinicId, userId, [
      "consultation:read",
    ]);
    const where: Prisma.ConsultationWhereInput = {
      clinicId,
      patient: patientScope(access),
      ...(q.patientId ? { patientId: q.patientId } : {}),
      ...(q.status ? { status: q.status } : {}),
    };
    if (q.from || q.to) {
      if (!q.from || !q.to) throw new BadRequestException();
      const from = utcDate(q.from),
        to = utcDate(q.to);
      if (to <= from) throw new BadRequestException();
      where.attendedAt = { gte: from, lt: to };
    }
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.consultation.findMany({
          where,
          select: {
            id: true,
            clinicId: true,
            patientId: true,
            appointmentId: true,
            attendedAt: true,
            reason: true,
            status: true,
            diagnosis: true,
            diagnosisType: true,
            treatment: true,
            version: true,
            patient: { select: { id: true, name: true } },
            professional: person,
          },
          orderBy: [{ attendedAt: "desc" }, { id: "asc" }],
          take: 20,
          skip: (q.page - 1) * 20,
        }),
        this.prisma.consultation.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { items, total, page: q.page, totalPages: Math.ceil(total / 20) };
  }
  async detail(clinicId: string, id: string, userId: string) {
    const access = await requireMember(this.prisma, clinicId, userId, [
      "consultation:read",
    ]);
    const r = await this.prisma.consultation.findUnique({
      where: { id_clinicId: { id, clinicId } },
      include,
    });
    if (!r) throw new NotFoundException();
    await requirePatient(this.prisma, access, r.patientId);
    return this.serialize(r);
  }
  async history(clinicId: string, id: string, page: number, userId: string) {
    await this.detail(clinicId, id, userId);
    const where = { clinicId, consultationId: id };
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.consultationEvent.findMany({
          where,
          select: {
            id: true,
            kind: true,
            createdAt: true,
            snapshot: true,
            actor: person,
          },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: 20,
          skip: (page - 1) * 20,
        }),
        this.prisma.consultationEvent.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { items, total, page, totalPages: Math.ceil(total / 20) };
  }
  async amendments(clinicId: string, id: string, page: number, userId: string) {
    await this.detail(clinicId, id, userId);
    const where = { clinicId, consultationId: id };
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.consultationAmendment.findMany({
          where,
          select: {
            id: true,
            reason: true,
            correction: true,
            createdAt: true,
            actor: person,
          },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: 20,
          skip: (page - 1) * 20,
        }),
        this.prisma.consultationAmendment.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return { items, total, page, totalPages: Math.ceil(total / 20) };
  }
  create(clinicId: string, userId: string, dto: CreateConsultationDto) {
    const data = clinicalData(dto);
    return this.write(async (tx) => {
      const actor = await this.actor(tx, clinicId, userId);
      await this.professional(tx, clinicId, dto.professionalMembershipId);
      if ("patientId" in dto && actor.patientScope === "ASSIGNED")
        await requirePatient(tx, actor, dto.patientId);
      const patient = await tx.patient.findUnique({
        where: { id_clinicId: { id: dto.patientId, clinicId } },
      });
      if (!patient || patient.status !== "ACTIVE")
        throw new BadRequestException();
      if (dto.appointmentId) {
        const appointment = await tx.appointment.findUnique({
          where: { id_clinicId: { id: dto.appointmentId, clinicId } },
        });
        if (!appointment || appointment.patientId !== dto.patientId)
          throw new BadRequestException();
        if (
          appointment.professionalMembershipId &&
          appointment.professionalMembershipId !== dto.professionalMembershipId
        )
          throw new BadRequestException();
        if (["CANCELLED", "COMPLETED", "NO_SHOW"].includes(appointment.status))
          throw new ConflictException();
      }
      const r = await tx.consultation.create({
        data: {
          ...data,
          clinicId,
          patientId: dto.patientId,
          appointmentId: dto.appointmentId ?? null,
          requestId: dto.requestId,
          createdByMembershipId: actor.id,
        },
        include,
      });
      await this.syncAppointment(tx, r, actor.id);
      await this.event(tx, r, actor.id, "CREATED");
      return this.serialize(
        await tx.consultation.findUniqueOrThrow({
          where: { id_clinicId: { id: r.id, clinicId } },
          include,
        }),
      );
    });
  }
  update(
    clinicId: string,
    userId: string,
    id: string,
    dto: UpdateConsultationDto,
  ) {
    const data = clinicalData(dto);
    if (dto.status === "FINALIZED") assertFinalizable(dto);
    return this.write(async (tx) => {
      const actor = await this.actor(tx, clinicId, userId);
      const old = await this.record(tx, clinicId, id);
      await requirePatient(tx, actor, old.patientId);
      if (old.status !== "DRAFT" || old.version !== dto.version)
        throw new ConflictException();
      await this.professional(tx, clinicId, dto.professionalMembershipId);
      const r = await tx.consultation.update({
        where: { id_clinicId: { id, clinicId } },
        data: {
          ...data,
          status: dto.status,
          version: { increment: 1 },
          ...(dto.status === "FINALIZED"
            ? { finalizedAt: new Date(), finalizedByMembershipId: actor.id }
            : {}),
        },
        include,
      });
      await this.syncAppointment(tx, r, actor.id);
      await this.event(
        tx,
        r,
        actor.id,
        dto.status === "FINALIZED" ? "FINALIZED" : "DRAFT_UPDATED",
      );
      return this.serialize(
        await tx.consultation.findUniqueOrThrow({
          where: { id_clinicId: { id, clinicId } },
          include,
        }),
      );
    });
  }
  amend(clinicId: string, userId: string, id: string, dto: AmendmentDto) {
    return this.write(async (tx) => {
      const actor = await this.actor(tx, clinicId, userId);
      const old = await this.record(tx, clinicId, id);
      await requirePatient(tx, actor, old.patientId);
      if (old.status !== "FINALIZED") throw new ConflictException();
      const amendment = await tx.consultationAmendment.create({
        data: {
          clinicId,
          consultationId: id,
          actorMembershipId: actor.id,
          ...dto,
        },
        select: {
          id: true,
          reason: true,
          correction: true,
          createdAt: true,
          actor: person,
        },
      });
      await this.event(tx, old, actor.id, "RECTIFIED", amendment);
      return amendment;
    });
  }
}
