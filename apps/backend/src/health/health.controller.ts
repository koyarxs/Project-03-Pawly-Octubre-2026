import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getHealth(): { status: "ok"; service: "pawly-backend" } {
    return { status: "ok", service: "pawly-backend" };
  }

  @Get("ready")
  async getReadiness(): Promise<{ status: "ok"; database: "connected" }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "connected" };
    } catch {
      throw new ServiceUnavailableException({
        status: "unavailable",
        database: "disconnected",
        message:
          "PostgreSQL no está disponible. Inicia Docker y ejecuta docker compose up -d postgres; revisa DATABASE_URL si el problema persiste.",
      });
    }
  }
}
