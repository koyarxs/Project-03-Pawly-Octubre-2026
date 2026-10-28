import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  effectivePermissions,
  lockClinic,
  patientScope,
  requireMember,
  requirePatient,
  type Permission,
} from "../authorization/permission-policy";
import { PrismaService } from "../prisma/prisma.service";
import { isValidRut } from "./rut";
import {
  CreatePatientDto,
  CreateTutorDto,
  PatientQueryDto,
  TutorQueryDto,
  UpdatePatientDto,
  UpdateTutorDto,
} from "./clinical.dto";

const tutorSummary = {
  id: true,
  clinicId: true,
  firstName: true,
  lastName: true,
  phone: true,
  rut: true,
  insuranceType: true,
  insuranceProvider: true,
  fonasaGroup: true,
  email: true,
  status: true,
} satisfies Prisma.TutorSelect;
const patientSummary = {
  id: true,
  clinicId: true,
  name: true,
  species: true,
  sex: true,
  status: true,
  tutors: {
    select: {
      tutor: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.PatientSelect;
const patientDetail = {
  tutors: {
    select: { tutor: { select: tutorSummary } },
    orderBy: { tutorId: "asc" },
  },
} satisfies Prisma.PatientInclude;
const dataOnly = (input: object) =>
  Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
const searchTerms = (query: string) =>
  query.trim().split(/\s+/).filter(Boolean);
const tutorSearch = (query: string): Prisma.TutorWhereInput => ({
  AND: searchTerms(query).map((term) => ({
    OR: ["firstName", "lastName", "email", "phone"].map((field) => ({
      [field]: { contains: term, mode: "insensitive" },
    })),
  })),
});

@Injectable()
export class ClinicalService {
  constructor(private readonly prisma: PrismaService) {}
  private restrictNotes<T extends { notes: string | null; tutors: unknown[] }>(
    record: T,
    allowed: boolean,
    contacts: boolean,
  ) {
    return {
      ...record,
      notes: allowed ? record.notes : null,
      notesRestricted: !allowed,
      tutors: record.tutors.map((tutor) =>
        !contacts && typeof tutor === "object" && tutor !== null
          ? { ...tutor, phone: "", email: null, rut: null, insuranceType: null, insuranceProvider: null, fonasaGroup: null }
          : tutor,
      ),
    };
  }
  private async authorizeWrite(
    tx: Prisma.TransactionClient,
    clinicId: string,
    userId: string,
    permission: Permission,
    patientId?: string,
  ) {
    await lockClinic(tx, clinicId);
    const actor = await requireMember(tx, clinicId, userId, [permission]);
    if (patientId) await requirePatient(tx, actor, patientId);
    return actor;
  }
  private async write<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2003", "P2034"].includes(error.code)
      )
        throw new ConflictException("No se pudo completar el cambio.");
      throw error;
    }
  }
  async listTutors(clinicId: string, query: TutorQueryDto, userId: string) {
    const access = await requireMember(this.prisma, clinicId, userId, [
      "tutor:read",
    ]);
    const where: Prisma.TutorWhereInput = {
      clinicId,
      ...(access.patientScope === "ASSIGNED"
        ? { patients: { some: { clinicId, patient: patientScope(access) } } }
        : {}),
      status: query.status ?? "ACTIVE",
      ...(query.q ? tutorSearch(query.q) : {}),
    };
    const [items, total] = await this.prisma.$transaction(
      [
        this.prisma.tutor.findMany({
          where,
          select: tutorSummary,
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.tutor.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
  async getTutor(clinicId: string, id: string, userId: string) {
    const access = await requireMember(this.prisma, clinicId, userId, [
      "tutor:read",
    ]);
    if (
      access.patientScope === "ASSIGNED" &&
      !(await this.prisma.tutor.findFirst({
        where: {
          id,
          clinicId,
          patients: { some: { clinicId, patient: patientScope(access) } },
        },
        select: { id: true },
      }))
    )
      throw new NotFoundException();
    const record = await this.prisma.tutor.findUnique({
      where: { id_clinicId: { id, clinicId } },
    });
    if (!record) throw new NotFoundException();
    return record;
  }
  createTutor(clinicId: string, dto: CreateTutorDto, userId: string) {
    return this.write(async (tx) => {
      await this.authorizeWrite(tx, clinicId, userId, "tutor:write");
      if (!isValidRut(dto.rut ?? "")) throw new BadRequestException("Ingresa un RUT válido para el tutor.");
      return tx.tutor.create({ data: { ...dto, clinicId } });
    });
  }
  updateTutor(
    clinicId: string,
    id: string,
    dto: UpdateTutorDto,
    userId: string,
  ) {
    const data = dataOnly(dto);
    if (!Object.keys(data).length) throw new BadRequestException();
    return this.write(async (tx) => {
      await this.authorizeWrite(tx, clinicId, userId, "tutor:write");
      await this.getTutor(clinicId, id, userId);
      const record = await tx.tutor.findUnique({
        where: { id_clinicId: { id, clinicId } },
      });
      if (!record) throw new NotFoundException();
      if (record.status === "ARCHIVED") throw new ConflictException();
      return tx.tutor.update({
        where: { id_clinicId: { id, clinicId } },
        data,
      });
    });
  }
  archiveTutor(clinicId: string, id: string, userId: string) {
    return this.write(async (tx) => {
      await this.authorizeWrite(tx, clinicId, userId, "clinical:archive");
      await this.getTutor(clinicId, id, userId);
      const record = await tx.tutor.findUnique({
        where: { id_clinicId: { id, clinicId } },
      });
      if (!record) throw new NotFoundException();
      const linked = await tx.patientTutor.count({
        where: {
          clinicId,
          tutorId: id,
          patient: { clinicId, status: { not: "ARCHIVED" } },
        },
      });
      if (linked) throw new ConflictException();
      return tx.tutor.update({
        where: { id_clinicId: { id, clinicId } },
        data: { status: "ARCHIVED" },
      });
    });
  }
  async listPatients(
    clinicId: string,
    query: PatientQueryDto,
    tutorId: string | undefined,
    userId: string,
  ) {
    const access = await requireMember(this.prisma, clinicId, userId, [
      "patient:read",
    ]);
    if (tutorId) await this.getTutor(clinicId, tutorId, userId);
    const where: Prisma.PatientWhereInput = {
      clinicId,
      ...patientScope(access),
      status: query.status ?? { not: "ARCHIVED" },
      ...(tutorId ? { tutors: { some: { clinicId, tutorId } } } : {}),
      ...(query.q
        ? {
            AND: searchTerms(query.q).map((term) => ({
              OR: [
                { name: { contains: term, mode: "insensitive" } },
                { breed: { contains: term, mode: "insensitive" } },
                { microchip: { contains: term, mode: "insensitive" } },
                {
                  tutors: {
                    some: {
                      clinicId,
                      tutor: {
                        clinicId,
                        ...tutorSearch(term),
                      },
                    },
                  },
                },
              ],
            })),
          }
        : {}),
    };
    const [records, total] = await this.prisma.$transaction(
      [
        this.prisma.patient.findMany({
          where,
          select: patientSummary,
          orderBy: [{ name: "asc" }, { id: "asc" }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.patient.count({ where }),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    return {
      items: records.map((record) => ({
        ...record,
        tutors: record.tutors.map((link) => link.tutor),
      })),
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }
  private serializePatient<
    T extends {
      weightKg: Prisma.Decimal | null;
      birthDate: Date | null;
      tutors: { tutor: unknown }[];
    },
  >(record: T) {
    return {
      ...record,
      weightKg: record.weightKg?.toNumber() ?? null,
      birthDate: record.birthDate?.toISOString().slice(0, 10) ?? null,
      tutors: record.tutors.map((link) => link.tutor),
    };
  }
  async getPatient(clinicId: string, id: string, userId: string) {
    const access = await requireMember(this.prisma, clinicId, userId, [
      "patient:read",
    ]);
    await requirePatient(this.prisma, access, id);
    const record = await this.prisma.patient.findUnique({
      where: { id_clinicId: { id, clinicId } },
      include: patientDetail,
    });
    if (!record) throw new NotFoundException();
    return this.restrictNotes(
      this.serializePatient(record),
      effectivePermissions(access).includes("patient:notes"),
      effectivePermissions(access).includes("tutor:read"),
    );
  }
  private async validateTutors(
    tx: Prisma.TransactionClient,
    clinicId: string,
    ids: string[],
  ) {
    const count = await tx.tutor.count({
      where: { clinicId, id: { in: ids }, status: "ACTIVE" },
    });
    if (count !== ids.length) throw new BadRequestException();
  }
  createPatient(clinicId: string, dto: CreatePatientDto, userId: string) {
    return this.write(async (tx) => {
      const access = await this.authorizeWrite(
        tx,
        clinicId,
        userId,
        "patient:create",
      );
      if (!effectivePermissions(access).includes("patient:notes") && dto.notes)
        throw new BadRequestException(
          "No tienes autorización para modificar notas clínicas.",
        );

      await this.validateTutors(tx, clinicId, dto.tutorIds);
      const { tutorIds, birthDate, ...fields } = dto;
      const record = await tx.patient.create({
        data: {
          ...fields,
          clinicId,
          birthDate: birthDate ? new Date(`${birthDate}T00:00:00.000Z`) : null,
        },
        select: { id: true },
      });
      if (access.patientScope === "ASSIGNED")
        await tx.patientAssignment.create({
          data: {
            clinicId,
            membershipId: access.id,
            patientId: record.id,
            assignedByMembershipId: access.id,
          },
        });
      await tx.patientTutor.createMany({
        data: tutorIds.map((tutorId) => ({
          clinicId,
          patientId: record.id,
          tutorId,
        })),
      });
      return this.restrictNotes(
        this.serializePatient(
          await tx.patient.findUniqueOrThrow({
            where: { id_clinicId: { id: record.id, clinicId } },
            include: patientDetail,
          }),
        ),
        effectivePermissions(access).includes("patient:notes"),
        effectivePermissions(access).includes("tutor:read"),
      );
    });
  }
  updatePatient(
    clinicId: string,
    id: string,
    dto: UpdatePatientDto,
    userId: string,
  ) {
    const { tutorIds, birthDate, ...fields } = dto;
    const data = dataOnly(fields) as Prisma.PatientUncheckedUpdateInput;
    if (birthDate !== undefined)
      data.birthDate = birthDate
        ? new Date(`${birthDate}T00:00:00.000Z`)
        : null;
    if (!Object.keys(data).length && tutorIds === undefined)
      throw new BadRequestException();
    return this.write(async (tx) => {
      const access = await this.authorizeWrite(
        tx,
        clinicId,
        userId,
        "patient:update",
        id,
      );
      if (!effectivePermissions(access).includes("patient:notes") && dto.notes)
        throw new BadRequestException(
          "No tienes autorización para modificar notas clínicas.",
        );

      const record = await tx.patient.findUnique({
        where: { id_clinicId: { id, clinicId } },
      });
      if (!record) throw new NotFoundException();
      if (record.status === "ARCHIVED") throw new ConflictException();
      if (tutorIds !== undefined) {
        await this.validateTutors(tx, clinicId, tutorIds);
        await tx.patientTutor.deleteMany({
          where: { clinicId, patientId: id },
        });
        await tx.patientTutor.createMany({
          data: tutorIds.map((tutorId) => ({
            clinicId,
            patientId: id,
            tutorId,
          })),
        });
      }
      if (!effectivePermissions(access).includes("patient:notes"))
        delete data.notes;
      const updated = await tx.patient.update({
        where: { id_clinicId: { id, clinicId } },
        data,
        include: patientDetail,
      });
      return this.restrictNotes(
        this.serializePatient(updated),
        effectivePermissions(access).includes("patient:notes"),
        effectivePermissions(access).includes("tutor:read"),
      );
    });
  }
  archivePatient(clinicId: string, id: string, userId: string) {
    return this.write(async (tx) => {
      const access = await this.authorizeWrite(
        tx,
        clinicId,
        userId,
        "clinical:archive",
        id,
      );

      const record = await tx.patient.findUnique({
        where: { id_clinicId: { id, clinicId } },
      });
      if (!record) throw new NotFoundException();
      const updated = await tx.patient.update({
        where: { id_clinicId: { id, clinicId } },
        data: { status: "ARCHIVED" },
        include: patientDetail,
      });
      return this.restrictNotes(
        this.serializePatient(updated),
        effectivePermissions(access).includes("patient:notes"),
        effectivePermissions(access).includes("tutor:read"),
      );
    });
  }
}
