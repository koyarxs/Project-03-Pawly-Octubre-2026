import { Transform } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { PermissionKey, PatientScope, Role, StaffJob } from "@prisma/client";
const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;
export const photoKeys = [
  "initials",
  "director-demo",
  "veterinarian-demo",
  "technician-demo",
  "reception-demo",
  "groomer-demo",
] as const;
export class ReasonDto {
  @Transform(trim) @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}
export class VersionDto extends ReasonDto {
  @IsInt() @Min(1) version!: number;
}
export class StaffProfileDto extends VersionDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  displayName!: string;
  @IsEnum(StaffJob) job!: StaffJob;
  @Transform(trim) @IsString() @MaxLength(160) specialty!: string;
  @Transform(trim) @IsString() @MaxLength(1500) biography!: string;
  @IsIn(photoKeys) photoKey!: string;
  @IsOptional() @IsString() @MaxLength(32) professionalPhone?: string;
  @IsInt() @Min(0) @Max(9999) publicOrder!: number;
}
export class InviteStaffDto extends ReasonDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @Transform(trim)
  @IsEmail({ allow_utf8_local_part: false })
  @MaxLength(254)
  email!: string;
  @IsEnum(Role) role!: Role;
  @IsEnum(StaffJob) job!: StaffJob;
}
export class StaffAccessDto extends VersionDto {
  @IsEnum(Role) role!: Role;
  @IsEnum(PatientScope) patientScope!: PatientScope;
  @IsArray()
  @ArrayMaxSize(40)
  @ArrayUnique()
  @IsEnum(PermissionKey, { each: true })
  grants!: PermissionKey[];
  @IsArray()
  @ArrayMaxSize(40)
  @ArrayUnique()
  @IsEnum(PermissionKey, { each: true })
  denials!: PermissionKey[];
}
export class StaffStatusDto extends VersionDto {
  @IsIn(["ACTIVE", "SUSPENDED"]) status!: "ACTIVE" | "SUSPENDED";
}
export class CredentialDto extends VersionDto {
  @IsBoolean() verified!: boolean;
  @Transform(trim) @IsString() @MaxLength(120) credentialNumber!: string;
  @Transform(trim) @IsString() @MaxLength(500) evidence!: string;
}
export class PublicationDto extends VersionDto {
  @IsBoolean() visible!: boolean;
}
export class ConsentDto extends VersionDto {
  @IsBoolean() consent!: boolean;
}
export class AssignmentDto extends ReasonDto {
  @IsUUID("4") patientId!: string;
  @IsBoolean() assigned!: boolean;
}
export class InvitationTokenDto {
  @IsString() @Matches(/^[A-Za-z0-9_-]{43}$/) token!: string;
}
export class AcceptInvitationDto extends InvitationTokenDto {
  @IsString() @MinLength(1) @MaxLength(128) password!: string;
}
