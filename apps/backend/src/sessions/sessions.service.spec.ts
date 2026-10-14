import { ConfigService } from "@nestjs/config";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { SessionsService } from "./sessions.service";

describe("production session cookies", () => {
  it("sets a host-only Secure HttpOnly cookie with a fixed expiry and stores no raw token", async () => {
    const create = jest.fn().mockResolvedValue({});
    const cookie = jest.fn();
    const service = new SessionsService(
      { session: { create } } as unknown as PrismaService,
      new ConfigService({ NODE_ENV: "production", SESSION_TTL_SECONDS: 60 }),
    );
    const before = Date.now();
    await service.create("user-id", { cookie } as unknown as Response);
    const [name, token, options] = cookie.mock.calls[0]!;
    expect(name).toBe("__Host-pawly_session");
    expect(options).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60000,
    });
    expect(options).not.toHaveProperty("domain");
    expect(options.expires.getTime()).toBeGreaterThanOrEqual(before + 60000);
    const stored = create.mock.calls[0]![0].data;
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(stored.tokenHash).not.toBe(token);
  });
});
