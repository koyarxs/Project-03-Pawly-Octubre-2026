import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import Joi from "joi";
import { HealthModule } from "./health/health.module";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { AuthorizationModule } from "./authorization/authorization.module";
import { HttpSecurityModule } from "./http/http-security.module";
import { ClinicalModule } from "./clinical/clinical.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { ConsultationsModule } from "./consultations/consultations.module";
import { WebsiteModule } from "./website/website.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid("development", "test", "production")
          .default("development"),
        SESSION_TTL_SECONDS: Joi.number()
          .integer()
          .min(60)
          .max(604800)
          .default(28800),
        PORT: Joi.number().port().default(3001),
        WEBSITE_CLINIC_ID: Joi.string().guid({ version: "uuidv4" }).optional(),
        WEBSITE_PUBLIC_NAME: Joi.string().max(160).optional(),
        CORS_ORIGINS: Joi.string()
          .default("http://localhost:3000,http://127.0.0.1:3000")
          .custom((value: string, helpers) => {
            const origins = value.split(",").map((origin) => origin.trim());
            const valid = origins.every((origin) => {
              try {
                const parsed = new URL(origin);
                return (
                  ["http:", "https:"].includes(parsed.protocol) &&
                  parsed.origin === origin
                );
              } catch {
                return false;
              }
            });

            return valid ? value : helpers.error("string.uri");
          }),
        DATABASE_URL: Joi.string()
          .uri({ scheme: ["postgresql"] })
          .required(),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    PrismaModule,
    HealthModule,
    HttpSecurityModule,
    AuthModule,
    AuthorizationModule,
    ClinicalModule,
    AppointmentsModule,
    ConsultationsModule,
    WebsiteModule,
  ],
})
export class AppModule {}
