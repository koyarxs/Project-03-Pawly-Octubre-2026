import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { randomUUID } from "node:crypto";
import { ClinicalFieldsDto, CreateConsultationDto } from "./consultations.dto";
import { clinicalData, assertFinalizable } from "./consultations.service";
describe("clinical validation", () => {
  const input = () => ({
    patientId: randomUUID(),
    requestId: randomUUID(),
    professionalMembershipId: randomUUID(),
    attendedAt: new Date(Date.now() - 60000).toISOString(),
    reason: "Control",
  });
  it("allows a minimal draft without inventing clinical findings", async () => {
    const dto = plainToInstance(CreateConsultationDto, input());
    expect(await validate(dto)).toHaveLength(0);
    expect(clinicalData(dto)).toMatchObject({
      anamnesis: "",
      weightKg: null,
      diagnosisType: null,
    });
    expect(() => assertFinalizable(dto)).toThrow();
  });
  it.each([
    { weightKg: 0 },
    { weightKg: 1.0001 },
    { temperatureC: 39.25 },
    { temperatureC: 51 },
    { heartRate: 1.5 },
    { respiratoryRate: 301 },
    { diagnosisType: "AUTOMATIC" },
    { reason: " " },
    { attendedAt: "2026-10-01T12:00:00-03:00" },
  ])("rejects invalid measurements and input %j", async (invalid) => {
    expect(
      (
        await validate(
          plainToInstance(CreateConsultationDto, { ...input(), ...invalid }),
        )
      ).length,
    ).toBeGreaterThan(0);
  });
  it.each(["2026-02-30T12:00:00Z", "2101-01-01T00:00:00Z"])(
    "rejects impossible or unsupported dates %s",
    (attendedAt) => {
      expect(() =>
        clinicalData(
          plainToInstance(ClinicalFieldsDto, { ...input(), attendedAt }),
        ),
      ).toThrow();
    },
  );
  it("rejects future attendance and control before attendance", () => {
    expect(() =>
      clinicalData(
        plainToInstance(ClinicalFieldsDto, {
          ...input(),
          attendedAt: new Date(Date.now() + 3600000).toISOString(),
        }),
      ),
    ).toThrow();
    const dto = plainToInstance(ClinicalFieldsDto, input());
    dto.nextControlAt = dto.attendedAt;
    expect(() => clinicalData(dto)).toThrow();
  });
  it("requires a deliberate complete clinical record to finalize", () => {
    const dto = plainToInstance(ClinicalFieldsDto, {
      ...input(),
      anamnesis: "Antecedentes",
      physicalExam: "Examen",
      diagnosis: "Diagnóstico",
      diagnosisType: "PRESUMPTIVE",
      treatment: "Plan",
    });
    expect(() => assertFinalizable(dto)).not.toThrow();
    dto.treatment = " ";
    expect(() => assertFinalizable(dto)).toThrow();
  });
});
