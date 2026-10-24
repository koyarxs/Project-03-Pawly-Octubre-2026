import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { configureHttp } from "./http/configure-http";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  const config = app.get(ConfigService);
  configureHttp(app);

  try {
    await app.listen(config.get<number>("PORT", 3001));
  } catch (error) {
    // Release database connections and timers when startup fails.
    await app.close();
    throw error;
  }
}

void bootstrap().catch((error: unknown) => {
  const message =
    error instanceof Error && "code" in error && error.code === "EADDRINUSE"
      ? "El puerto del backend está ocupado. Detén la otra instancia o cambia PORT en apps/backend/.env."
      : "No se pudo iniciar el backend. Revisa la configuración y los servicios requeridos.";
  Logger.error(message, "Bootstrap");
  process.exitCode = 1;
});
