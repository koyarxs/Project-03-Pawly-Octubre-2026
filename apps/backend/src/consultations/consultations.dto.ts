import { Transform, Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ConsultationStatus, DiagnosisType } from "@prisma/client";
const trim = Transform(({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value,
);
const utc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
export class ClinicalFieldsDto {
  @IsUUID("4") professionalMembershipId!: string;
  @IsString() @Matches(utc) attendedAt!: string;
  @trim @IsString() @MinLength(1) @MaxLength(1000) reason!: string;
  @trim @IsString() @MaxLength(8000) anamnesis = "";
  @trim @IsString() @MaxLength(8000) physicalExam = "";
  @trim @IsString() @MaxLength(8000) findings = "";
  @trim @IsString() @MaxLength(4000) diagnosis = "";
  @IsOptional() @IsEnum(DiagnosisType) diagnosisType?: DiagnosisType | null;
  @trim @IsString() @MaxLength(8000) treatment = "";
  @trim @IsString() @MaxLength(8000) instructions = "";
  @trim @IsString() @MaxLength(4000) notes = "";
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3, allowInfinity: false, allowNaN: false })
  @Min(0.001)
  @Max(10000)
  weightKg?: number | null;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1, allowInfinity: false, allowNaN: false })
  @Min(20)
  @Max(50)
  temperatureC?: number | null;
  @IsOptional() @IsInt() @Min(1) @Max(500) heartRate?: number | null;
  @IsOptional() @IsInt() @Min(1) @Max(300) respiratoryRate?: number | null;
  @IsOptional() @IsString() @Matches(utc) nextControlAt?: string | null;
}
export class CreateConsultationDto extends ClinicalFieldsDto {
  @IsUUID("4") patientId!: string;
  @IsUUID("4") requestId!: string;
  @IsOptional() @IsUUID("4") appointmentId?: string | null;
}
export class UpdateConsultationDto extends ClinicalFieldsDto {
  @IsInt() @Min(1) version!: number;
  @IsEnum(ConsultationStatus) status!: ConsultationStatus;
}
export class AmendmentDto {
  @IsUUID("4") requestId!: string;
  @trim @IsString() @MinLength(1) @MaxLength(1000) reason!: string;
  @trim @IsString() @MinLength(1) @MaxLength(8000) correction!: string;
}
export class ConsultationPageDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
}
export class ConsultationQueryDto extends ConsultationPageDto {
  @IsOptional() @IsUUID("4") patientId?: string;
  @IsOptional() @IsEnum(ConsultationStatus) status?: ConsultationStatus;
  @IsOptional() @IsString() @Matches(utc) from?: string;
  @IsOptional() @IsString() @Matches(utc) to?: string;
}
