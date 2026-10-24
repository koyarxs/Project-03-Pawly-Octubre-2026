import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
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
import { Species } from "@prisma/client";
const trim = ({ value }: { value: unknown }) =>
  typeof value === "string" ? value.trim() : value;
export class BookingSettingsDto {
  @IsOptional() @IsString() @MaxLength(100) timezone?: string;
  @IsInt() @Min(0) version!: number;
  @IsObject() configuration!: Record<string, unknown>;
}
export class BookingServiceRemovalDto {
  @IsInt() @Min(1) version!: number;
}
export class OwnBookingAvailabilityDto {
  @IsInt() @Min(0) version!: number;
  @IsArray() @ArrayMaxSize(28) @IsObject({ each: true }) hours!: Record<
    string,
    unknown
  >[];
}
export class BookingServiceDto {
  @IsOptional() @IsUUID("4") id?: string;
  @IsInt() @Min(0) version!: number;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100) name!: string;
  @Transform(trim) @IsString() @MaxLength(500) description!: string;
  @IsInt() @Min(5) @Max(480) durationMinutes!: number;
  @IsInt() @Min(0) @Max(120) bufferMinutes!: number;
  @ValidateIf((_o, value: unknown) => value !== null)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  resourceKey!: string | null;
  @IsBoolean() enabled!: boolean;
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID("4", { each: true })
  professionalIds!: string[];
}
export class BookingSlotsDto {
  @IsUUID("4") serviceId!: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
  @IsOptional() @IsUUID("4") professionalId?: string;
}
export class PublicBookingDto {
  @IsUUID("4") requestId!: string;
  @Matches(/^[A-Za-z0-9_-]{43}$/) managementToken!: string;
  @IsUUID("4") serviceId!: string;
  @IsOptional() @IsUUID("4") professionalId?: string;
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  startsAt!: string;
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) ownerName!: string;
  @Transform(trim) @IsEmail() @MaxLength(254) email!: string;
  @Transform(trim) @IsString() @Matches(/^\+?[\d ()-]{8,24}$/) phone!: string;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(100) petName!: string;
  @IsEnum(Species) species!: Species;
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(1000) reason!: string;
  @Transform(trim) @IsString() @MaxLength(1000) additionalInfo!: string;
  @Equals(true) consent!: boolean;
  @IsOptional() @IsString() @MaxLength(0) website?: string;
}
export class BookingLookupDto {
  @IsUUID("4") reference!: string;
  @Matches(/^[A-Za-z0-9_-]{43}$/) managementToken!: string;
}
export class PublicCancelBookingDto extends BookingLookupDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(500) reason!: string;
}
export class PublicRescheduleBookingDto extends BookingLookupDto {
  @IsInt() @Min(1) version!: number;
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  startsAt!: string;
}
export class ManageBookingDto {
  @IsInt() @Min(1) version!: number;
  @IsIn(["CONFIRM", "CANCEL", "REJECT", "RESCHEDULE", "LINK_PATIENT"])
  action!: string;
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason?: string;
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  startsAt?: string;
  @IsOptional() @IsUUID("4") patientId?: string;
  @IsOptional() @IsUUID("4") tutorId?: string;
}
export class BookingListDto {
  @IsOptional() @IsIn(["1"]) calendar?: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}T/) from!: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}T/) to!: string;
  @IsOptional()
  @IsIn(["PENDING", "CONFIRMED", "CONVERTED", "CANCELLED", "REJECTED"])
  status?: string;
  @IsOptional() @IsUUID("4") professionalId?: string;
  @IsOptional() @IsUUID("4") serviceId?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
}
