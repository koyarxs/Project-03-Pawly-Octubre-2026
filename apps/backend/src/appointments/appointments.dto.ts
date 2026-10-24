import { Transform, Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";
import { AppointmentStatus } from "@prisma/client";

export class AppointmentInput {
  @IsOptional() @IsUUID("4") serviceId?: string | null;
  @IsUUID("4") patientId!: string;
  @IsUUID("4") tutorId!: string;
  @ValidateIf((_o, value: unknown) => value !== null)
  @IsUUID("4")
  professionalMembershipId!: string | null;
  // Require an explicit UTC instant; naive local timestamps are never accepted.
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/)
  startsAt!: string;
  @IsInt() @Min(5) @Max(480) durationMinutes!: number;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  reason!: string;
}
export class UpdateAppointmentDto extends AppointmentInput {
  @IsInt() @Min(1) version!: number;
  @IsEnum(AppointmentStatus) status!: AppointmentStatus;
  @IsOptional() @IsString() @MaxLength(500) cancellationReason?: string;
}
export class AppointmentQueryDto {
  @IsOptional() @IsIn(["upcoming"]) scope?: string;
  @IsOptional() @IsUUID("4") serviceId?: string;
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/)
  from!: string;
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/)
  to!: string;
  @IsOptional() @IsEnum(AppointmentStatus) status?: AppointmentStatus;
  @IsOptional() @IsUUID("4") professionalMembershipId?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
}
