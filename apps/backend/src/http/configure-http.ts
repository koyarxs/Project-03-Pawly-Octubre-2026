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
import type { NextFunction, Request, Response } from "express";
import helmet from "helmet";

const parserStatuses = new Map<string, number>([
  ["entity.parse.failed", 400],
  ["request.size.invalid", 400],
  ["entity.too.large", 413],
  ["charset.unsupported", 415],
  ["encoding.unsupported", 415],
]);

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : typeof error === "object" &&
            error !== null &&
            "type" in error &&
            typeof error.type === "string"
          ? (parserStatuses.get(error.type) ?? 500)
          : 500;
    if (status < 500) {
      // Nest wraps parser SyntaxErrors in a 400 containing the raw parser message.
      // Never serialize exception messages, payloads or validation property names.
      const messages: Record<number, string> = {
        400: "Solicitud inválida.",
        401: "Credenciales inválidas.",
        403: "Acceso no permitido.",
        404: "Recurso no encontrado.",
        409: "No se pudo completar el registro.",
        413: "Solicitud demasiado grande.",
        415: "Tipo de contenido no permitido.",
        429: "Demasiadas solicitudes.",
      };
      response.status(status).json({
        statusCode: status,
        message: messages[status] ?? "Solicitud no permitida.",
      });
      return;
    }
    // Do not serialize Prisma errors, request bodies, cookies or credentials.
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
  // configureHttp must run before init/listen: Nest appends its body parsers
  // during init, after this Express middleware. Guards run after the parsers.
  app.use((request: Request, response: Response, next: NextFunction) => {
    const pathname = request.path.toLowerCase();
    if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/clinics"))
      response.setHeader("Cache-Control", "no-store");
    next();
  });
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
