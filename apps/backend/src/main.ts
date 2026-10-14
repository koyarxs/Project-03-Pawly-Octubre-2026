import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  const origins = config
    .getOrThrow<string>("CORS_ORIGINS")
    .split(",")
    .map((origin) => origin.trim());

  app.setGlobalPrefix("api");
  app.enableCors({ origin: origins });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(config.get<number>("PORT", 3001));
}

void bootstrap().catch((error: unknown) => {
  const message =
    error instanceof Error && "code" in error && error.code === "EADDRINUSE"
      ? "El puerto del backend está ocupado. Detén la otra instancia o cambia PORT en apps/backend/.env."
      : error instanceof Error
        ? error.message
        : "No se pudo iniciar el backend.";
  Logger.error(message, "Bootstrap");
  process.exitCode = 1;
});
