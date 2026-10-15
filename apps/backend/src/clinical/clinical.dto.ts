import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateBy,
  ValidateIf,
} from "class-validator";
import {
  PatientSex,
  PatientStatus,
  Species,
  TutorStatus,
} from "@prisma/client";

const trim = Transform(({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value,
);
const optionalText = Transform(({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() || null : value,
);
const present = ValidateIf((_object, value: unknown) => value !== undefined);
const birthDate = ValidateBy({
  name: "calendarBirthDate",
  validator: {
    validate: (value: unknown) => {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(parsed.valueOf()) &&
        parsed.toISOString().slice(0, 10) === value &&
        value >= "1900-01-01" &&
        value <= new Date().toISOString().slice(0, 10)
      );
    },
  },
});

export class TutorFieldsDto {
  @IsOptional() @optionalText @IsEmail() @MaxLength(254) email?: string | null;
  @IsOptional() @optionalText @IsString() @MaxLength(500) address?:
    string | null;
  @IsOptional() @optionalText @IsString() @MaxLength(2000) notes?:
    string | null;
}
export class CreateTutorDto extends TutorFieldsDto {
  @trim @IsString() @IsNotEmpty() @MaxLength(100) firstName!: string;
  @trim @IsString() @IsNotEmpty() @MaxLength(100) lastName!: string;
  @trim
  @IsString()
  @Matches(/^(?=(?:\D*\d){7,15}\D*$)\+?[\d\s().-]{7,32}$/)
  phone!: string;
}
export class UpdateTutorDto extends TutorFieldsDto {
  @present @trim @IsString() @IsNotEmpty() @MaxLength(100) firstName?: string;
  @present @trim @IsString() @IsNotEmpty() @MaxLength(100) lastName?: string;
  @present
  @trim
  @IsString()
  @Matches(/^(?=(?:\D*\d){7,15}\D*$)\+?[\d\s().-]{7,32}$/)
  phone?: string;
}
export class PatientFieldsDto {
  @IsOptional() @optionalText @IsString() @MaxLength(100) breed?: string | null;
  @IsOptional() @optionalText @birthDate birthDate?: string | null;
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3, allowInfinity: false, allowNaN: false })
  @Min(0.001)
  @Max(10000)
  weightKg?: number | null;
  @IsOptional() @optionalText @IsString() @MaxLength(100) color?: string | null;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toUpperCase() || null : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9-]{1,64}$/)
  microchip?: string | null;
  @IsOptional() @optionalText @IsString() @MaxLength(2000) notes?:
    string | null;
  @present @IsIn([PatientStatus.ACTIVE, PatientStatus.DECEASED]) status?:
    "ACTIVE" | "DECEASED";
}
export class CreatePatientDto extends PatientFieldsDto {
  @trim @IsString() @IsNotEmpty() @MaxLength(100) name!: string;
  @IsEnum(Species) species!: Species;
  @IsEnum(PatientSex) sex!: PatientSex;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsUUID("4", { each: true })
  tutorIds!: string[];
}
export class UpdatePatientDto extends PatientFieldsDto {
  @present @trim @IsString() @IsNotEmpty() @MaxLength(100) name?: string;
  @present @IsEnum(Species) species?: Species;
  @present @IsEnum(PatientSex) sex?: PatientSex;
  @present
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsUUID("4", { each: true })
  tutorIds?: string[];
}
export class ListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
  @IsOptional() @trim @IsString() @MaxLength(100) q?: string;
}
export class TutorQueryDto extends ListQueryDto {
  @IsOptional() @IsEnum(TutorStatus) status?: TutorStatus;
}
export class PatientQueryDto extends ListQueryDto {
  @IsOptional() @IsEnum(PatientStatus) status?: PatientStatus;
}
