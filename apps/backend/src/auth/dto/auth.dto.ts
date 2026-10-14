import { Transform } from "class-transformer";
import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === "string" ? value.trim() : value;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export class LoginDto {
  @Transform(trim)
  @IsEmail({ allow_utf8_local_part: false })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}

export class RegisterClinicDto {
  @Transform(trim)
  @IsString()
  @Matches(/\S/)
  @MaxLength(120)
  name!: string;

  @Transform(trim)
  @IsEmail({ allow_utf8_local_part: false })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(15)
  @MaxLength(128)
  password!: string;

  @Transform(trim)
  @IsString()
  @Matches(/\S/)
  @MaxLength(160)
  clinicName!: string;
}
