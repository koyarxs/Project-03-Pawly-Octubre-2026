import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, type BookingRequest } from "@prisma/client";
import { isDeepStrictEqual } from "node:util";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { availabilityNotice } from "./booking-notifications";
import {
  effectivePermissions,
  lockClinic,
  memberInclude,
  requireMember,
} from "../authorization/permission-policy";
import {
  canBook,
  daySlots,
  defaultBookingPolicy,
  validateBookingPolicy,
  type Occupancy,
} from "./booking-policy";
import type {
  BookingServiceDto,
  BookingSettingsDto,
  BookingSlotsDto,
} from "./booking.dto";

type DB = Prisma.TransactionClient;
export const activeBookingStates = ["PENDING", "CONFIRMED"];
@Injectable()
export class BookingEngine {
  constructor(
    readonly prisma: PrismaService,
    private readonly env: ConfigService,
  ) {}
  /** Local scheduling preview only; never grants medical permissions or production access. */
  isDemoClinic(clinicId: string) {
    return (
      this.env.get("NODE_ENV") !== "production" &&
      this.env.get("BOOKING_DEMO_CLINIC_ID") === clinicId
    );
  }
  isDemoProfessional(
    clinicId: string,
    profile:
      { credentialEvidence: string | null; job?: string } | null | undefined,
  ) {
    return (
      this.isDemoClinic(clinicId) &&
      profile?.job === "VETERINARIAN" &&
      profile?.credentialEvidence === "PAWLY_BOOKING_DEMO_ONLY"
    );
  }
  async policy(db: DB, clinicId: string) {
    const row = await db.bookingSettings.findUnique({ where: { clinicId } });
    return {
      configuration: row
        ? validateBookingPolicy(row.configuration)
        : structuredClone(defaultBookingPolicy),
      version: row?.version || 0,
    };
  }
  async clinic(db: DB, clinicId: string) {
    const clinic = await db.veterinaryClinic.findFirst({
      where: { id: clinicId, status: "ACTIVE" },
      select: { id: true, name: true, slug: true, timezone: true },
    });
    if (!clinic) throw new NotFoundException();
    return clinic;
  }
  async professionals(
    db: DB,
    clinicId: string,
    serviceId?: string,
    publicOnly = false,
  ) {
    const members = await db.clinicMembership.findMany({
      where: {
        clinicId,
        status: "ACTIVE",
        user: { status: "ACTIVE" },
        ...(serviceId
          ? { bookingServices: { some: { clinicId, serviceId } } }
          : {}),
      },
      include: {
        ...memberInclude,
        user: { select: { name: true, status: true } },
      },
      orderBy: { id: "asc" },
      take: 100,
    });
    return members
      .filter(
        (m) =>
          (this.isDemoProfessional(clinicId, m.staffProfile) ||
            (m.staffProfile?.credentialEvidence !== "PAWLY_BOOKING_DEMO_ONLY" &&
              effectivePermissions(m).includes("consultation:write"))) &&
          (!publicOnly ||
            this.isDemoProfessional(clinicId, m.staffProfile) ||
            (!!m.staffProfile?.publishedAt &&
              !!m.staffProfile.publishedConsentHash &&
              typeof (
                m.staffProfile.publicSnapshot as Record<string, unknown> | null
              )?.displayName === "string")),
      )
      .map((m) => ({
        id: m.id,
        name:
          publicOnly && !this.isDemoProfessional(clinicId, m.staffProfile)
            ? String(
                (m.staffProfile!.publicSnapshot as Record<string, unknown>)
                  .displayName,
              )
            : m.user.name,
      }));
  }
  async occupied(
    db: DB,
    clinicId: string,
    from: Date,
    to: Date,
    exclude?: {
      appointmentId?: string;
      bookingId?: string;
      enforceLead?: boolean;
    },
  ): Promise<Occupancy[]> {
    const [appointments, bookings] = await Promise.all([
      db.appointment.findMany({
        where: {
          clinicId,
          status: { notIn: ["CANCELLED", "NO_SHOW"] },
          startsAt: { lt: to },
          OR: [{ endsAt: { gt: from } }, { blockedUntil: { gt: from } }],
          ...(exclude?.appointmentId
            ? { id: { not: exclude.appointmentId } }
            : {}),
        },
        select: {
          startsAt: true,
          endsAt: true,
          blockedUntil: true,
          resourceKey: true,
          professionalMembershipId: true,
        },
        take: 3001,
      }),
      db.bookingRequest.findMany({
        where: {
          clinicId,
          status: { in: activeBookingStates },
          startsAt: { lt: to },
          blockedUntil: { gt: from },
          ...(exclude?.bookingId ? { id: { not: exclude.bookingId } } : {}),
        },
        select: {
          startsAt: true,
          blockedUntil: true,
          resourceKey: true,
          professionalMembershipId: true,
        },
        take: 3001,
      }),
    ]);
    if (appointments.length > 3000 || bookings.length > 3000)
      throw new ConflictException("Acota el rango de disponibilidad.");
    return [
      ...appointments.map((a) => ({
        startsAt: a.startsAt,
        blockedUntil: a.blockedUntil || a.endsAt,
        resourceKey: a.resourceKey,
        professionalId: a.professionalMembershipId,
      })),
      ...bookings.map((b) => ({
        ...b,
        professionalId: b.professionalMembershipId,
      })),
    ];
  }
  async service(db: DB, clinicId: string, id: string) {
    const service = await db.bookingService.findFirst({
      where: { id, clinicId, enabled: true },
    });
    if (!service)
      throw new BadRequestException("El servicio no está habilitado.");
    return service;
  }
  async check(
    db: DB,
    clinicId: string,
    serviceId: string,
    professionalId: string,
    startsAt: Date,
    publicOnly: boolean,
    exclude?: {
      appointmentId?: string;
      bookingId?: string;
      enforceLead?: boolean;
    },
  ) {
    const [service, clinic, { configuration }, professionals] =
      await Promise.all([
        this.service(db, clinicId, serviceId),
        this.clinic(db, clinicId),
        this.policy(db, clinicId),
        this.professionals(db, clinicId, serviceId, publicOnly),
      ]);
    if (
      (publicOnly && !configuration.publicEnabled) ||
      !professionals.some((p) => p.id === professionalId)
    )
      throw new BadRequestException("Profesional o reservas no disponibles.");
    const occupied = await this.occupied(
      db,
      clinicId,
      new Date(startsAt.valueOf() - 600 * 60000),
      new Date(startsAt.valueOf() + 600 * 60000),
      exclude,
    );
    if (
      !canBook({
        startsAt,
        professionalId,
        timezone: clinic.timezone,
        policy: configuration,
        service,
        occupied,
        now: new Date(),
        ...(exclude?.enforceLead === false ? { enforceLead: false } : {}),
      })
    )
      throw new ConflictException(
        "El horario ya no está disponible. Selecciona otro.",
      );
    return {
      service,
      configuration,
      endsAt: new Date(startsAt.valueOf() + service.durationMinutes * 60000),
      blockedUntil: new Date(
        startsAt.valueOf() +
          (service.durationMinutes + service.bufferMinutes) * 60000,
      ),
    };
  }
  async slots(clinicId: string, query: BookingSlotsDto, publicOnly: boolean) {
    const [service, clinic, { configuration }, allProfessionals] =
      await Promise.all([
        this.service(this.prisma, clinicId, query.serviceId),
        this.clinic(this.prisma, clinicId),
        this.policy(this.prisma, clinicId),
        this.professionals(this.prisma, clinicId, query.serviceId, publicOnly),
      ]);
    if (publicOnly && !configuration.publicEnabled)
      throw new NotFoundException();
    if (!query.professionalId && !configuration.autoAssign)
      throw new BadRequestException("Selecciona un profesional.");
    const professionals = allProfessionals.filter(
      (p) => !query.professionalId || query.professionalId === p.id,
    );
    const naive = Date.parse(`${query.date}T00:00:00Z`);
    if (!Number.isFinite(naive)) throw new BadRequestException();
    if (
      Math.abs(naive - Date.now()) >
      (configuration.maxAdvanceDays + 2) * 86400000
    )
      throw new BadRequestException("Fecha fuera del rango reservable.");
    const occupied = await this.occupied(
      this.prisma,
      clinicId,
      new Date(naive - 86400000),
      new Date(naive + 2 * 86400000),
    );
    const slots = professionals
      .flatMap((p) =>
        daySlots(query.date, {
          professionalId: p.id,
          timezone: clinic.timezone,
          policy: configuration,
          service,
          occupied,
          now: new Date(),
        }).map((startsAt) => ({
          startsAt,
          professionalId: p.id,
          endsAt: new Date(
            Date.parse(startsAt) + service.durationMinutes * 60000,
          ).toISOString(),
        })),
      )
      .sort(
        (a, b) =>
          a.startsAt.localeCompare(b.startsAt) ||
          a.professionalId.localeCompare(b.professionalId),
      );
    const offered = query.professionalId
      ? slots
      : [...new Map(slots.map((slot) => [slot.startsAt, slot])).values()];
    return {
      timezone: clinic.timezone,
      slots: offered.slice(0, 1000),
      truncated: offered.length > 1000,
    };
  }
  async checkExisting(db: DB, row: BookingRequest) {
    const [clinic, { configuration }, professionals, occupied] =
      await Promise.all([
        this.clinic(db, row.clinicId),
        this.policy(db, row.clinicId),
        this.professionals(db, row.clinicId),
        this.occupied(db, row.clinicId, row.startsAt, row.blockedUntil, {
          bookingId: row.id,
        }),
      ]);
    if (
      !professionals.some((p) => p.id === row.professionalMembershipId) ||
      !canBook({
        startsAt: row.startsAt,
        professionalId: row.professionalMembershipId,
        timezone: clinic.timezone,
        policy: configuration,
        service: {
          durationMinutes:
            (row.endsAt.valueOf() - row.startsAt.valueOf()) / 60000,
          bufferMinutes:
            (row.blockedUntil.valueOf() - row.endsAt.valueOf()) / 60000,
          resourceKey: row.resourceKey,
        },
        occupied,
        now: new Date(),
        enforceLead: false,
      })
    )
      throw new ConflictException(
        "Revisa la disponibilidad de esta reserva antes de confirmarla.",
      );
  }
  async readSettings(clinicId: string, userId: string) {
    await requireMember(this.prisma, clinicId, userId, ["appointment:read"]);
    const [policy, services, professionals, clinic] = await Promise.all([
      this.policy(this.prisma, clinicId),
      this.prisma.bookingService.findMany({
        where: { clinicId },
        include: { professionals: { select: { membershipId: true } } },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: 200,
      }),
      this.professionals(this.prisma, clinicId),
      this.clinic(this.prisma, clinicId),
    ]);
    return {
      ...policy,
      services,
      professionals,
      clinic,
      demo: this.isDemoClinic(clinicId),
    };
  }
  async saveSettings(
    clinicId: string,
    userId: string,
    dto: BookingSettingsDto,
  ) {
    const configuration = validateBookingPolicy(dto.configuration);
    if (dto.timezone) {
      try {
        new Intl.DateTimeFormat("es-CL", { timeZone: dto.timezone }).format();
      } catch {
        throw new BadRequestException("Zona horaria inválida.");
      }
    }
    return this.prisma.$transaction(async (tx) => {
      await lockClinic(tx, clinicId);
      const actor = await requireMember(tx, clinicId, userId, [
        "clinic:manage",
      ]);
      const existing = await this.policy(tx, clinicId);
      if (existing.version !== dto.version)
        throw new ConflictException(
          "La configuración cambió. Recarga antes de guardar.",
        );
      const professionals = await this.professionals(tx, clinicId);
      if (
        configuration.professionals.some(
          (p) =>
            !professionals.some((m) => m.id === p.membershipId) &&
            !existing.configuration.professionals.some((old) =>
              isDeepStrictEqual(old, p),
            ),
        ) ||
        configuration.blocks.some(
          (b) =>
            b.professionalId &&
            !professionals.some((m) => m.id === b.professionalId) &&
            !existing.configuration.blocks.some((old) =>
              isDeepStrictEqual(old, b),
            ),
        )
      )
        throw new BadRequestException(
          "Incluye solo profesionales habilitados de esta clínica.",
        );
      const row = await tx.bookingSettings.upsert({
        where: { clinicId },
        create: {
          clinicId,
          configuration: configuration as unknown as Prisma.InputJsonObject,
        },
        update: {
          configuration: configuration as unknown as Prisma.InputJsonObject,
          version: { increment: 1 },
        },
      });
      await tx.accessAuditLog.create({
        data: {
          clinicId,
          actorMembershipId: actor.id,
          targetMembershipId: actor.id,
          action: "BOOKING_SETTINGS",
          reason: "Actualización de configuración de agendamiento",
          before: existing.configuration as unknown as Prisma.InputJsonObject,
          after: configuration as unknown as Prisma.InputJsonObject,
        },
      });
      if (dto.timezone)
        await tx.veterinaryClinic.update({
          where: { id: clinicId },
          data: { timezone: dto.timezone },
        });
      await availabilityNotice(tx, clinicId, "settings", row.version);
      return { version: row.version };
    });
  }
  async saveOwnSchedule(
    clinicId: string,
    userId: string,
    version: number,
    hours: unknown,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await lockClinic(tx, clinicId);
      const actor = await requireMember(tx, clinicId, userId, [
        "appointment:write",
        "consultation:write",
      ]);
      const old = await this.policy(tx, clinicId);
      if (old.version !== version) throw new ConflictException();
      const configuration = validateBookingPolicy({
        ...old.configuration,
        professionals: [
          ...old.configuration.professionals.filter(
            (p) => p.membershipId !== actor.id,
          ),
          { membershipId: actor.id, hours },
        ],
      });
      const row = await tx.bookingSettings.upsert({
        where: { clinicId },
        create: {
          clinicId,
          configuration: configuration as unknown as Prisma.InputJsonObject,
        },
        update: {
          configuration: configuration as unknown as Prisma.InputJsonObject,
          version: { increment: 1 },
        },
      });
      await tx.accessAuditLog.create({
        data: {
          clinicId,
          actorMembershipId: actor.id,
          targetMembershipId: actor.id,
          action: "BOOKING_OWN_HOURS",
          reason: "Actualización del horario propio autorizado",
          before: {
            membershipId: actor.id,
            hours:
              old.configuration.professionals.find(
                (p) => p.membershipId === actor.id,
              )?.hours || [],
          },
          after: {
            membershipId: actor.id,
            hours: hours as Prisma.InputJsonValue,
          },
        },
      });
      await availabilityNotice(
        tx,
        clinicId,
        `professional:${actor.id}`,
        row.version,
        { professionalId: actor.id },
      );
      return { version: row.version };
    });
  }
  async saveService(clinicId: string, userId: string, dto: BookingServiceDto) {
    return this.prisma.$transaction(async (tx) => {
      await lockClinic(tx, clinicId);
      const actor = await requireMember(tx, clinicId, userId, [
        "clinic:manage",
      ]);
      const professionals = await this.professionals(tx, clinicId);
      const oldAssignments = dto.id
        ? await tx.bookingServiceProfessional.findMany({
            where: { clinicId, serviceId: dto.id },
            select: { membershipId: true },
          })
        : [];
      if (
        new Set(dto.professionalIds).size !== dto.professionalIds.length ||
        dto.professionalIds.some(
          (id) =>
            !professionals.some((p) => p.id === id) &&
            !oldAssignments.some((p) => p.membershipId === id),
        )
      )
        throw new BadRequestException("Profesionales no habilitados.");
      const existing = dto.id
        ? await tx.bookingService.findFirst({ where: { id: dto.id, clinicId } })
        : null;
      if (dto.id && !existing) throw new NotFoundException();
      if (
        (existing && dto.version !== existing.version) ||
        (!existing && dto.version !== 0)
      )
        throw new ConflictException();
      const data = {
        name: dto.name,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        bufferMinutes: dto.bufferMinutes,
        resourceKey: dto.resourceKey?.trim().toLowerCase() || null,
        enabled: dto.enabled,
      };
      const row = existing
        ? await tx.bookingService.update({
            where: { id_clinicId: { id: existing.id, clinicId } },
            data: { ...data, version: { increment: 1 } },
          })
        : await tx.bookingService.create({ data: { ...data, clinicId } });
      await tx.bookingServiceProfessional.deleteMany({
        where: { clinicId, serviceId: row.id },
      });
      await tx.bookingServiceProfessional.createMany({
        data: dto.professionalIds.map((membershipId) => ({
          clinicId,
          serviceId: row.id,
          membershipId,
        })),
      });
      await tx.accessAuditLog.create({
        data: {
          clinicId,
          actorMembershipId: actor.id,
          targetMembershipId: actor.id,
          action: "BOOKING_SERVICE",
          reason: "Actualización de servicio reservable",
          before: existing
            ? {
                ...existing,
                createdAt: existing.createdAt.toISOString(),
                updatedAt: existing.updatedAt.toISOString(),
                professionalIds: oldAssignments.map((p) => p.membershipId),
              }
            : Prisma.DbNull,
          after: {
            serviceId: row.id,
            ...data,
            professionalIds: dto.professionalIds,
          },
        },
      });
      if (existing)
        await availabilityNotice(
          tx,
          clinicId,
          `service:${row.id}`,
          row.version,
          { serviceId: row.id },
        );
      return { id: row.id, version: row.version };
    });
  }
  async removeService(
    clinicId: string,
    userId: string,
    id: string,
    version: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await lockClinic(tx, clinicId);
      const actor = await requireMember(tx, clinicId, userId, [
        "clinic:manage",
      ]);
      const row = await tx.bookingService.findFirst({
        where: { id, clinicId },
      });
      if (!row) throw new NotFoundException();
      if (row.version !== version) throw new ConflictException();
      if (
        (await tx.appointment.count({ where: { clinicId, serviceId: id } })) ||
        (await tx.bookingRequest.count({ where: { clinicId, serviceId: id } }))
      )
        throw new ConflictException(
          "El servicio tiene historial. Desactívalo para conservarlo.",
        );
      await tx.bookingServiceProfessional.deleteMany({
        where: { clinicId, serviceId: id },
      });
      await tx.bookingService.delete({
        where: { id_clinicId: { id, clinicId } },
      });
      await tx.accessAuditLog.create({
        data: {
          clinicId,
          actorMembershipId: actor.id,
          targetMembershipId: actor.id,
          action: "BOOKING_SERVICE",
          reason: "Eliminación de servicio sin historial",
          after: { serviceId: id, name: row.name, deleted: true },
        },
      });
      return { removed: true };
    });
  }
  async checkManual(
    db: DB,
    clinicId: string,
    data: {
      serviceId?: string | null;
      professionalId: string | null;
      startsAt: Date;
      endsAt: Date;
      appointmentId?: string;
    },
  ) {
    if (data.serviceId) {
      if (!data.professionalId)
        throw new BadRequestException(
          "Selecciona un profesional para el servicio.",
        );
      const checked = await this.check(
        db,
        clinicId,
        data.serviceId,
        data.professionalId,
        data.startsAt,
        false,
        data.appointmentId ? { appointmentId: data.appointmentId } : undefined,
      );
      if (checked.endsAt.valueOf() !== data.endsAt.valueOf())
        throw new BadRequestException(
          "La duración debe coincidir con el servicio.",
        );
      return {
        serviceId: data.serviceId,
        resourceKey: checked.service.resourceKey,
        blockedUntil: checked.blockedUntil,
      };
    }
    const policy = await this.policy(db, clinicId);
    if (policy.configuration.hours.length && data.professionalId)
      throw new BadRequestException(
        "Selecciona un servicio para respetar la disponibilidad configurada.",
      );
    if (data.professionalId) {
      const occupied = await this.occupied(
        db,
        clinicId,
        data.startsAt,
        data.endsAt,
        data.appointmentId ? { appointmentId: data.appointmentId } : undefined,
      );
      if (
        occupied.some(
          (o) =>
            o.professionalId === data.professionalId &&
            o.startsAt < data.endsAt &&
            o.blockedUntil > data.startsAt,
        )
      )
        throw new ConflictException(
          "El profesional ya tiene una cita o reserva.",
        );
    }
    return { serviceId: null, resourceKey: null, blockedUntil: null };
  }
}
