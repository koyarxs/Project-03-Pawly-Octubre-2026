import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
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
  private async write<T>(
    operation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
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
  async listTutors(clinicId: string, query: TutorQueryDto) {
    const where: Prisma.TutorWhereInput = {
      clinicId,
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
  async getTutor(clinicId: string, id: string) {
    const record = await this.prisma.tutor.findUnique({
      where: { id_clinicId: { id, clinicId } },
    });
    if (!record) throw new NotFoundException();
    return record;
  }
  createTutor(clinicId: string, dto: CreateTutorDto) {
    return this.write((tx) => tx.tutor.create({ data: { ...dto, clinicId } }));
  }
  updateTutor(clinicId: string, id: string, dto: UpdateTutorDto) {
    const data = dataOnly(dto);
    if (!Object.keys(data).length) throw new BadRequestException();
    return this.write(async (tx) => {
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
  archiveTutor(clinicId: string, id: string) {
    return this.write(async (tx) => {
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
    tutorId?: string,
  ) {
    if (tutorId) await this.getTutor(clinicId, tutorId);
    const where: Prisma.PatientWhereInput = {
      clinicId,
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
  async getPatient(clinicId: string, id: string) {
    const record = await this.prisma.patient.findUnique({
      where: { id_clinicId: { id, clinicId } },
      include: patientDetail,
    });
    if (!record) throw new NotFoundException();
    return this.serializePatient(record);
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
  createPatient(clinicId: string, dto: CreatePatientDto) {
    return this.write(async (tx) => {
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
      await tx.patientTutor.createMany({
        data: tutorIds.map((tutorId) => ({
          clinicId,
          patientId: record.id,
          tutorId,
        })),
      });
      return this.serializePatient(
        await tx.patient.findUniqueOrThrow({
          where: { id_clinicId: { id: record.id, clinicId } },
          include: patientDetail,
        }),
      );
    });
  }
  updatePatient(clinicId: string, id: string, dto: UpdatePatientDto) {
    const { tutorIds, birthDate, ...fields } = dto;
    const data = dataOnly(fields) as Prisma.PatientUncheckedUpdateInput;
    if (birthDate !== undefined)
      data.birthDate = birthDate
        ? new Date(`${birthDate}T00:00:00.000Z`)
        : null;
    if (!Object.keys(data).length && tutorIds === undefined)
      throw new BadRequestException();
    return this.write(async (tx) => {
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
      const updated = await tx.patient.update({
        where: { id_clinicId: { id, clinicId } },
        data,
        include: patientDetail,
      });
      return this.serializePatient(updated);
    });
  }
  archivePatient(clinicId: string, id: string) {
    return this.write(async (tx) => {
      const record = await tx.patient.findUnique({
        where: { id_clinicId: { id, clinicId } },
      });
      if (!record) throw new NotFoundException();
      const updated = await tx.patient.update({
        where: { id_clinicId: { id, clinicId } },
        data: { status: "ARCHIVED" },
        include: patientDetail,
      });
      return this.serializePatient(updated);
    });
  }
}
