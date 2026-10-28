import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SessionsService } from "../sessions/sessions.service";
import { AuthService } from "./auth.service";
import { PasswordService } from "./password.service";

describe("AuthService edge cases", () => {
  const dto = {
    name: "Admin",
    email: "owner@example.invalid",
    password: "long test passphrase",
    clinicName: "Clínica",
  };
  const transaction = jest.fn();
  const findUnique = jest.fn();
  const verify = jest.fn();
  const create = jest.fn();
  const prisma = {
    $transaction: transaction,
    user: { findUnique },
  } as unknown as PrismaService;
  const passwords = {
    hash: jest.fn().mockResolvedValue("hash"),
    verify,
  } as unknown as PasswordService;
  const sessions = { create } as unknown as SessionsService;
  const service = (env = "test") =>
    new AuthService(
      prisma,
      passwords,
      sessions,
      new ConfigService({ NODE_ENV: env, WEBSITE_CLINIC_ID: "" }),
    );
  const collision = new Prisma.PrismaClientKnownRequestError("unique", {
    code: "P2002",
    clientVersion: "6",
    meta: { target: ["slug"] },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.mockReset();
  });

  it.each([
    ["long names", "A".repeat(160), "a".repeat(63)],
    [
      "accents and punctuation",
      "¡Clínica Ñandú & Mascotas!",
      "clinica-nandu-mascotas",
    ],
    ["names without ASCII letters", "🐾✨", "clinica"],
    ["truncated separators", `${"a".repeat(62)} & more`, "a".repeat(62)],
  ])(
    "generates a valid bounded slug for %s",
    async (_label, clinicName, base) => {
      const clinicCreate = jest.fn().mockResolvedValue({ id: "clinic" });
      transaction.mockImplementation((callback) =>
        callback({
          user: { create: jest.fn().mockResolvedValue({ id: "user" }) },
          veterinaryClinic: { create: clinicCreate },
          clinicMembership: { create: jest.fn().mockResolvedValue({}) },
        }),
      );
      await service().register({ ...dto, clinicName });
      const slug = clinicCreate.mock.calls[0]![0].data.slug as string;
      expect(slug.length).toBeLessThanOrEqual(100);
      expect(slug).toMatch(new RegExp(`^${base}-[a-f0-9-]{36}$`));
    },
  );

  it("uses a different UUID after an actual slug uniqueness collision", async () => {
    const slugs: string[] = [];
    transaction.mockImplementation(async (callback) =>
      callback({
        user: { create: jest.fn().mockResolvedValue({ id: "user" }) },
        veterinaryClinic: {
          create: jest.fn(async ({ data }: { data: { slug: string } }) => {
            slugs.push(data.slug);
            if (slugs.length === 1) throw collision;
            return { id: "clinic", slug: data.slug };
          }),
        },
        clinicMembership: { create: jest.fn().mockResolvedValue({}) },
      }),
    );
    await expect(service().register(dto)).resolves.toMatchObject({
      role: "OWNER",
    });
    expect(slugs).toHaveLength(2);
    expect(slugs[0]).not.toBe(slugs[1]);
  });

  it("retries a slug collision using a fresh transaction", async () => {
    transaction
      .mockRejectedValueOnce(collision)
      .mockResolvedValueOnce({ role: "OWNER" });
    await expect(service().register(dto)).resolves.toEqual({ role: "OWNER" });
    expect(transaction).toHaveBeenCalledTimes(2);
  });

  it("bounds collision retries", async () => {
    transaction.mockRejectedValue(collision);
    await expect(service().register(dto)).rejects.toMatchObject({
      status: 409,
    });
    expect(transaction).toHaveBeenCalledTimes(3);
  });

  it("fails closed for registration in production before writing", async () => {
    await expect(service("production").register(dto)).rejects.toMatchObject({
      status: 503,
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("does not issue production sessions to unverified users", async () => {
    findUnique.mockResolvedValue({
      id: "id",
      status: "ACTIVE",
      emailVerifiedAt: null,
      passwordHash: "hash",
    });
    verify.mockResolvedValue(true);
    await expect(
      service("production").login(dto, {} as never),
    ).rejects.toMatchObject({ status: 401 });
    expect(create).not.toHaveBeenCalled();
  });
});
