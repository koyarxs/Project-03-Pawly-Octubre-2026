import { Transform } from "class-transformer";
import { Equals, IsEmail, MaxLength } from "class-validator";

export class SubscribeNewsletterDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Equals(true)
  consent!: boolean;
}
