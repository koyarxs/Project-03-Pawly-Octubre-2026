import {
  ForbiddenException,
  ServiceUnavailableException,
  type ExecutionContext,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { PrismaService } from "../prisma/prisma.service";
import { NewsletterService } from "./newsletter.service";
import { SubscribeNewsletterDto } from "./newsletter.dto";
import { BrowserRequestGuard } from "../http/http-security.module";
import { NewsletterMailService } from "./newsletter-mail.service";

describe("Newsletter subscriptions", () => {
  const clinicId = "00000000-0000-4000-8000-000000000001";
  const execute = jest.fn();
  const find = jest.fn();
  const prisma = {
    $executeRaw: execute,
    $transaction: jest.fn(),
    veterinaryClinic: { findFirst: find },
  } as unknown as PrismaService;
  const config = { get: jest.fn() } as unknown as ConfigService;
  const acknowledge = jest.fn();
  const mail = { acknowledge } as unknown as NewsletterMailService;
  const service = new NewsletterService(prisma, config, mail);
  beforeEach(() => {
    jest.resetAllMocks();
    (config.get as jest.Mock).mockReturnValue(clinicId);
    execute.mockResolvedValue(1);
    find.mockResolvedValue({ id: clinicId });
    acknowledge.mockResolvedValue(undefined);
    (prisma.$transaction as jest.Mock).mockImplementation(
      (callback: (client: PrismaService) => Promise<unknown>) =>
        callback(prisma),
    );
  });
  it("normalizes email and scopes the insert to the configured active clinic", async () => {
    await expect(
      service.subscribe("  PERSON@example.invalid "),
    ).resolves.toEqual({ status: "accepted" });
    expect(execute.mock.calls[0].slice(1)).toEqual([
      expect.any(String),
      "person@example.invalid",
      clinicId,
    ]);
    expect(find).toHaveBeenCalledWith({
      where: { id: clinicId, status: "ACTIVE" },
      select: { id: true },
    });
    expect(acknowledge).toHaveBeenCalledWith("person@example.invalid");
  });
  it("returns the same response for an existing email", async () => {
    execute.mockResolvedValue(0);
    await expect(service.subscribe("person@example.invalid")).resolves.toEqual({
      status: "accepted",
    });
    expect(acknowledge).not.toHaveBeenCalled();
  });
  it("fails instead of claiming success when SMTP rejects a new subscription", async () => {
    acknowledge.mockRejectedValue(new Error("private SMTP detail"));
    await expect(
      service.subscribe("person@example.invalid"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it("refuses missing configuration without writing", async () => {
    (config.get as jest.Mock).mockReturnValue(undefined);
    await expect(
      service.subscribe("person@example.invalid"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(execute).not.toHaveBeenCalled();
  });
  it("refuses inactive clinics and hides persistence failures", async () => {
    find.mockResolvedValue(null);
    await expect(
      service.subscribe("person@example.invalid"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    execute.mockRejectedValue(new Error("private database detail"));
    await expect(
      service.subscribe("person@example.invalid"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it("protects the public subscription endpoint against cross-origin form submissions", () => {
    const guardConfig = {
      getOrThrow: () => "http://localhost:3000",
    } as unknown as ConfigService;
    const guard = new BrowserRequestGuard(guardConfig);
    const headers: Record<string, string> = {
      origin: "http://localhost:3000",
      "x-pawly-csrf": "1",
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          path: "/api/website/newsletter",
          method: "POST",
          get: (key: string) => headers[key],
          is: () => true,
        }),
        getResponse: () => ({ setHeader: jest.fn() }),
      }),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(context)).toBe(true);
    headers.origin = "https://untrusted.example";
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    headers.origin = "http://localhost:3000";
    delete headers["x-pawly-csrf"];
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
  it("requires a valid email and explicit consent, rejecting extra fields", async () => {
    for (const input of [
      { email: "invalid", consent: true },
      { email: "person@example.invalid", consent: false },
      { email: "person@example.invalid" },
      { email: "person@example.invalid", consent: true, clinicId },
    ]) {
      const errors = await validate(
        plainToInstance(SubscribeNewsletterDto, input),
        { whitelist: true, forbidNonWhitelisted: true },
      );
      expect(errors.length).toBeGreaterThan(0);
    }
    expect(
      await validate(
        plainToInstance(SubscribeNewsletterDto, {
          email: " PERSON@example.invalid ",
          consent: true,
        }),
      ),
    ).toEqual([]);
  });
});
