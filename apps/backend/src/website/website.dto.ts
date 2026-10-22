import { applyDecorators } from "@nestjs/common";
import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  IsDefined,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

function Text(max: number, required = false) {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === "string" ? value.trim() : value,
    ),
    IsString(),
    MaxLength(max),
    ...(required ? [IsNotEmpty()] : []),
  );
}
export class WebsiteServiceDto {
  @Text(100, true) title!: string;
  @Text(500, true) description!: string;
}
export class WebsiteContentDto {
  @Text(160, true) clinicName!: string;
  @Text(80, true) tagline!: string;
  @Text(140, true) heroTitle!: string;
  @Text(600, true) heroDescription!: string;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ArrayUnique()
  @IsIn(["consultation", "pets", "care"], { each: true })
  heroPhotos!: string[];
  @Text(140) aboutTitle!: string;
  @Text(2000) aboutText!: string;
  @Text(32)
  @Matches(/^$|^(?=(?:\D*\d){7,15}\D*$)\+?[\d\s().-]{7,32}$/)
  phone!: string;
  @Text(254)
  @ValidateIf((_dto, value: unknown) => value !== "")
  @IsEmail()
  email!: string;
  @Text(15) @Matches(/^$|^[1-9]\d{7,14}$/) whatsapp!: string;
  @Text(300) address!: string;
  @Text(500) hours!: string;
  @IsBoolean() showServices!: boolean;
  @IsBoolean() showAbout!: boolean;
  @IsBoolean() showHours!: boolean;
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => WebsiteServiceDto)
  services!: WebsiteServiceDto[];
}
export class WebsiteVersionDto {
  @IsInt() @Min(0) @Max(2147483646) version!: number;
}
export class SaveWebsiteDto extends WebsiteVersionDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => WebsiteContentDto)
  content!: WebsiteContentDto;
}

export function initialWebsiteContent(clinicName: string): WebsiteContentDto {
  return {
    clinicName,
    tagline: "Cerca de ti y de quienes más quieres.",
    heroTitle: "El cuidado que acompaña cada historia.",
    heroDescription:
      "Personaliza esta portada con la presentación real de tu veterinaria antes de publicarla.",
    heroPhotos: ["consultation", "pets", "care"],
    aboutTitle: "Conoce nuestra veterinaria",
    aboutText: "",
    phone: "",
    email: "",
    whatsapp: "",
    address: "",
    hours: "",
    showServices: false,
    showAbout: false,
    showHours: false,
    services: [],
  };
}
