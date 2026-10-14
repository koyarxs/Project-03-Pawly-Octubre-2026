import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  INestApplication,
  Logger,
  ValidationPipe,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import helmet from "helmet";

@Catch()
class SafeExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof HttpException && error.getStatus() < 500) {
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }
    // Do not serialize Prisma errors, request bodies, cookies or credentials.
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string" &&
      /^P\d{4}$/.test(error.code)
        ? error.code
        : "internal_error";
    Logger.error(`HTTP ${status}: ${code}`, "HttpError");
    response.status(status).json({
      statusCode: status,
      message:
        status === 503
          ? "Servicio no disponible."
          : "Error interno del servidor.",
    });
  }
}

export function configureHttp(app: INestApplication): void {
  const config = app.get(ConfigService);
  const origins = config
    .getOrThrow<string>("CORS_ORIGINS")
    .split(",")
    .map((origin) => origin.trim());
  app.setGlobalPrefix("api");
  app.use(helmet());
  app.enableCors({
    origin: origins,
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Pawly-CSRF"],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: { target: false, value: false },
    }),
  );
  app.useGlobalFilters(new SafeExceptionFilter());
}
