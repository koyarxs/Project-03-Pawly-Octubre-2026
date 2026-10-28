import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import {
  CreatePatientDto,
  CreateTutorDto,
  PatientQueryDto,
  TutorQueryDto,
  UpdatePatientDto,
  UpdateTutorDto,
} from "./clinical.dto";
const validTutor = {
  firstName: "Ana",
  lastName: "Pérez",
  phone: "+56 9 12345678",
};
const validPatient = {
  name: "Luna",
  species: "CAT",
  sex: "FEMALE",
  tutorIds: ["90555a74-dffb-4437-a493-c3b15a5d2246"],
};
const errors = (value: object) =>
  validate(value, { whitelist: true, forbidNonWhitelisted: true });
describe("clinical input boundaries", () => {
  it("validates tutor RUT and insurance values", async () => {
    const dto = plainToInstance(CreateTutorDto, {
      ...validTutor,
      rut: "12.345.678-5",
      insuranceType: "FONASA",
      fonasaGroup: "B",
    });
    expect(await errors(dto)).toHaveLength(0);
    expect(dto.rut).toBe("12345678-5");
    expect(
      (
        await errors(
          plainToInstance(CreateTutorDto, {
            ...validTutor,
            rut: "12.345.678-9",
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
    expect(
      (
        await errors(
          plainToInstance(UpdateTutorDto, {
            insuranceType: "BAD",
            fonasaGroup: "Z",
          }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it("trims names and contacts and converts empty optional values to null", async () => {
    const dto = plainToInstance(CreateTutorDto, {
      ...validTutor,
      firstName: " Ana ",
      email: " ",
      notes: " ",
    });
    expect(await errors(dto)).toHaveLength(0);
    expect(dto.firstName).toBe("Ana");
    expect(dto.email).toBeNull();
    expect(dto.notes).toBeNull();
  });
  it.each([
    { firstName: " " },
    { phone: "-------" },
    { phone: "1" },
    { email: "invalid" },
    { clinicId: validPatient.tutorIds[0] },
    { status: "ARCHIVED" },
  ])(
    "rejects invalid tutor input or tenant/status claims %j",
    async (change) => {
      expect(
        (
          await errors(
            plainToInstance(CreateTutorDto, { ...validTutor, ...change }),
          )
        ).length,
      ).toBeGreaterThan(0);
    },
  );
  it.each([
    { tutorIds: [] },
    { tutorIds: [...validPatient.tutorIds, ...validPatient.tutorIds] },
    { tutorIds: ["invalid"] },
    { weightKg: 0 },
    { weightKg: 10001 },
    { weightKg: 1.0001 },
    { birthDate: "2026-02-30" },
    { birthDate: "2999-01-01" },
    { species: "constructor" },
    { sex: "invalid" },
    { status: "ARCHIVED" },
  ])("rejects invalid patient input %j", async (change) => {
    expect(
      (
        await errors(
          plainToInstance(CreatePatientDto, { ...validPatient, ...change }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it("supports nullable optional information and rejects null mandatory edits", async () => {
    expect(
      await errors(
        plainToInstance(UpdatePatientDto, {
          weightKg: null,
          birthDate: null,
          notes: null,
        }),
      ),
    ).toHaveLength(0);
    expect(
      (await errors(plainToInstance(UpdatePatientDto, { name: null }))).length,
    ).toBeGreaterThan(0);
    expect(
      (await errors(plainToInstance(UpdateTutorDto, { phone: null }))).length,
    ).toBeGreaterThan(0);
  });
  it.each([
    { page: "0" },
    { page: "1.5" },
    { page: "10001" },
    { limit: "51" },
    { limit: "0" },
    { q: "x".repeat(101) },
    { status: "UNKNOWN" },
  ])("bounds pagination and search %j", async (change) => {
    expect(
      (await errors(plainToInstance(PatientQueryDto, change))).length,
    ).toBeGreaterThan(0);
  });
  it("converts query integers and applies bounded defaults", async () => {
    const dto = plainToInstance(TutorQueryDto, { page: "2", limit: "10" });
    expect(await errors(dto)).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.limit).toBe(10);
    expect(new TutorQueryDto()).toMatchObject({ page: 1, limit: 20 });
  });
});
