import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterUserDto, registrationRoles } from "./dto/auth.dto";
import type { PrismaService } from "../prisma/prisma.service";
import type { PasswordService } from "./password.service";
import type { SessionsService } from "../sessions/sessions.service";

describe("direct user registration", () => {
  const dto: RegisterUserDto = {
    name: "Ana Pérez",
    email: "ANA@example.invalid",
    password: "a long private passphrase",
    role: "RECEPTIONIST",
  };
  const clinic = {
    id: "clinic",
    name: "Porvenir",
    slug: "porvenir",
    timezone: "America/Santiago",
  };
  const tx = {
    veterinaryClinic: {
      findFirst: jest.fn().mockResolvedValue(clinic),
      update: jest.fn(),
    },
    user: { create: jest.fn() },
    clinicMembership: {
      create: jest.fn().mockResolvedValue({ id: "membership" }),
    },
    staffProfile: { create: jest.fn() },
  };
  const transaction = jest.fn((callback) => callback(tx));
  const session = jest.fn();
  const passwords = { hash: jest.fn().mockResolvedValue("password-hash") };
  const service = () =>
    new AuthService(
      { $transaction: transaction } as unknown as PrismaService,
      passwords as unknown as PasswordService,
      { create: session } as unknown as SessionsService,
      new ConfigService({ NODE_ENV: "test", WEBSITE_CLINIC_ID: "clinic" }),
    );
  beforeEach(() => {
    jest.clearAllMocks();
    tx.user.create
      .mockReset()
      .mockResolvedValue({
        id: "user",
        name: dto.name,
        email: dto.email,
        emailVerifiedAt: null,
      });
  });
  it.each(registrationRoles)(
    "creates a user with %s and opens a session without invitations",
    async (role) => {
      const response = {} as Response;
      expect(
        await service().registerUser({ ...dto, role }, response),
      ).toMatchObject({ user: { id: "user" }, clinic, role });
      expect(tx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            normalizedEmail: "ana@example.invalid",
            passwordHash: "password-hash",
          }),
        }),
      );
      expect(tx.clinicMembership.create).toHaveBeenCalledWith({
        data: { userId: "user", clinicId: "clinic", role },
      });
      expect(tx.staffProfile.create).toHaveBeenCalledWith({
        data: {
          clinicId: "clinic",
          membershipId: "membership",
          displayName: dto.name,
          job: role,
        },
      });
      expect(session).toHaveBeenCalledWith("user", response);
    },
  );
  it("rejects duplicate emails without opening a session", async () => {
    tx.user.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("unique", {
        code: "P2002",
        clientVersion: "6",
      }),
    );
    await expect(
      service().registerUser(dto, {} as Response),
    ).rejects.toMatchObject({ status: 409 });
    expect(session).not.toHaveBeenCalled();
    expect(tx.clinicMembership.create).not.toHaveBeenCalled();
  });
  it.each(["OWNER", "ADMIN", "CLINIC_DIRECTOR", "WEBSITE_EDITOR"])(
    "rejects a self-selected privileged role: %s",
    async (role) => {
      expect(
        (
          await validate(plainToInstance(RegisterUserDto, { ...dto, role }), {
            whitelist: true,
            forbidNonWhitelisted: true,
          })
        ).length,
      ).toBeGreaterThan(0);
    },
  );
  it("rejects extra clinic claims and short passwords", async () => {
    expect(
      (
        await validate(
          plainToInstance(RegisterUserDto, {
            ...dto,
            clinicId: "other",
            password: "short",
          }),
          { whitelist: true, forbidNonWhitelisted: true },
        )
      ).length,
    ).toBeGreaterThan(0);
  });
});
