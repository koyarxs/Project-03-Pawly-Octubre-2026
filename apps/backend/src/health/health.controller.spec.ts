import { HealthController } from "./health.controller";
import { ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

describe("HealthController", () => {
  const queryRaw = jest.fn();
  const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;
  const controller = new HealthController(prisma);

  beforeEach(() => queryRaw.mockReset());

  it("returns the API health status", () => {
    expect(controller.getHealth()).toEqual({
      status: "ok",
      service: "pawly-backend",
    });
  });

  it("checks PostgreSQL before reporting readiness", async () => {
    queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    await expect(controller.getReadiness()).resolves.toEqual({
      status: "ok",
      database: "connected",
    });
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it("reports an unavailable database and can recover on the next request", async () => {
    queryRaw.mockRejectedValueOnce(new Error("connection refused"));
    try {
      await controller.getReadiness();
      throw new Error("Expected readiness to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      const exception = error as ServiceUnavailableException;
      expect(exception.getStatus()).toBe(503);
      expect(exception.getResponse()).toMatchObject({
        status: "unavailable",
        database: "disconnected",
      });
    }
    queryRaw.mockResolvedValueOnce([{ "?column?": 1 }]);
    await expect(controller.getReadiness()).resolves.toEqual({
      status: "ok",
      database: "connected",
    });
  });
});
