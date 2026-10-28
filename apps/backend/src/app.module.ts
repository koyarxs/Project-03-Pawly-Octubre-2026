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
import { BookingModule } from "./appointments/booking.module";
import { ConsultationsModule } from "./consultations/consultations.module";
import { WebsiteModule } from "./website/website.module";
import { StaffModule } from "./staff/staff.module";

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
        WEBSITE_PUBLIC_ADDRESS: Joi.string().max(260).optional(),
        WEBSITE_PUBLIC_PHONE: Joi.string().max(32).optional(),
        MAIL_MODE: Joi.string().valid("disabled", "local", "smtp").default("disabled"),
        MAIL_HOST: Joi.string().hostname().default("127.0.0.1"),
        MAIL_PORT: Joi.number().port().default(1025),
        MAIL_SECURE: Joi.boolean().default(false),
        MAIL_USER: Joi.string().email().allow("").optional(),
        MAIL_PASSWORD: Joi.string().allow("").optional(),
        MAIL_FROM: Joi.string().email().allow("").optional(),
        BOOKING_LINK_SECRET: Joi.string().min(32).optional(),
        PUBLIC_SITE_URL: Joi.string().uri({ scheme: ["http", "https"] }).default("http://localhost:3000"),
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
    BookingModule,
    ConsultationsModule,
    WebsiteModule,
    StaffModule,
  ],
})
export class AppModule {}
