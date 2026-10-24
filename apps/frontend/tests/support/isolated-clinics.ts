import { createRequire } from "node:module";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { PrismaClient as Client } from "../../../backend/node_modules/@prisma/client";

export async function isolatedClinics() {
  // Playwright loads this TypeScript fixture through its CommonJS transform.
  const backend = path.resolve(__dirname, "../../../backend");
  process.loadEnvFile(path.join(backend, ".env"));
  const schema = process.env.PAWLY_TEST_SCHEMA;
  const url = new URL(process.env.DATABASE_URL ?? "");
  if (
    process.env.NODE_ENV === "production" ||
    !schema ||
    !/^pawly_frontend_test_[a-f0-9]{32}$/.test(schema) ||
    url.protocol !== "postgresql:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.port !== "5433" ||
    url.pathname !== "/pawly" ||
    (url.searchParams.get("schema") ?? "public") !== "public" ||
    [...url.searchParams.keys()].some((key) => key !== "schema")
  )
    throw new Error(
      "Refusing fixtures outside the runner's isolated local schema.",
    );
  url.searchParams.set("schema", schema);
  url.hostname = "127.0.0.1";
  url.searchParams.set("connection_limit", "3");
  const require = createRequire(path.join(backend, "package.json"));
  const { PrismaClient } = require("@prisma/client") as {
    PrismaClient: typeof Client;
  };
  const client = new PrismaClient({ datasourceUrl: url.toString() });
  async function assertTarget() {
    const [target] = await client.$queryRaw<
      { database: string; schema: string }[]
    >`SELECT current_database() AS database, current_schema() AS schema`;
    if (target?.database !== "pawly" || target.schema !== schema)
      throw new Error("Fixture schema assertion failed.");
  }
  try {
    await assertTarget();
  } catch (error) {
    await client.$disconnect();
    throw error;
  }
  return {
    async seedOwner(input: {
      name: string;
      email: string;
      password: string;
      clinicName: string;
      clinicId?: string;
      medicalVerified?: boolean;
    }) {
      await assertTarget();
      const argon2 =
        require("argon2") as typeof import("../../../backend/node_modules/argon2");
      const passwordHash = await argon2.hash(input.password, {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
      await assertTarget();
      const user = await client.user.create({
        data: {
          name: input.name,
          email: input.email,
          normalizedEmail: input.email.toLowerCase(),
          passwordHash,
          memberships: {
            create: {
              role: "OWNER",
              clinic: {
                create: {
                  ...(input.clinicId ? { id: input.clinicId } : {}),
                  name: input.clinicName,
                  slug: `qa-${randomUUID()}`,
                },
              },
            },
          },
        },
        include: { memberships: { include: { clinic: true } } },
      });
      if (input.medicalVerified !== false) {
        const clinicId = user.memberships[0]!.clinicId;
        const reviewer = await client.user.create({
          data: {
            name: "Independent QA reviewer",
            email: "review-" + randomUUID() + "@example.invalid",
            normalizedEmail: "review-" + randomUUID() + "@example.invalid",
            passwordHash,
            memberships: { create: { clinicId, role: "RECEPTIONIST" } },
          },
          include: { memberships: true },
        });
        await client.staffProfile.create({
          data: {
            clinicId,
            membershipId: user.memberships[0]!.id,
            displayName: input.name,
            job: "VETERINARIAN",
            credentialNumber: "QA-ONLY",
            credentialEvidence: "Synthetic isolated browser fixture",
            credentialStatus: "VERIFIED",
            credentialVerifiedAt: new Date(),
            credentialVerifiedById: reviewer.memberships[0]!.id,
            medicalPracticeEnabled: true,
          },
        });
      }
      return { userId: user.id, clinic: user.memberships[0]!.clinic };
    },
    async verifyMedical(userId: string, clinicId: string) {
      await assertTarget();
      const user = await client.user.findUniqueOrThrow({
        where: { id: userId },
        select: { name: true, passwordHash: true },
      });
      const membership = await client.clinicMembership.findUniqueOrThrow({
        where: { userId_clinicId: { userId, clinicId } },
      });
      const email = `review-${randomUUID()}@example.invalid`;
      const reviewer = await client.user.create({
        data: {
          name: "Independent medical QA reviewer",
          email,
          normalizedEmail: email,
          passwordHash: user.passwordHash,
          memberships: { create: { clinicId, role: "RECEPTIONIST" } },
        },
        include: { memberships: true },
      });
      const data = {
        clinicId,
        displayName: user.name,
        job: "VETERINARIAN" as const,
        credentialNumber: "QA-ONLY",
        credentialEvidence: "Synthetic isolated browser verification",
        credentialStatus: "VERIFIED" as const,
        credentialVerifiedAt: new Date(),
        credentialVerifiedById: reviewer.memberships[0]!.id,
        medicalPracticeEnabled: true,
      };
      await client.staffProfile.upsert({
        where: { membershipId: membership.id },
        create: { membershipId: membership.id, ...data },
        update: data,
      });
    },
    async setRole(
      userId: string,
      clinicId: string,
      role: "OWNER" | "ADMIN" | "VETERINARIAN" | "RECEPTIONIST",
    ) {
      await assertTarget();
      await client.clinicMembership.update({
        where: { userId_clinicId: { userId, clinicId } },
        data: { role },
      });
    },
    async additionalClinic(userId: string) {
      await assertTarget();
      return client.veterinaryClinic.create({
        data: {
          name: "Clínica QA Secundaria",
          slug: `qa-${randomUUID()}`,
          memberships: { create: { userId, role: "VETERINARIAN" } },
        },
      });
    },
    async suspend(userId: string, clinicId: string) {
      await assertTarget();
      await client.clinicMembership.update({
        where: { userId_clinicId: { userId, clinicId } },
        data: { status: "SUSPENDED" },
      });
    },
    async setupBooking(userId: string, clinicId: string) {
      await assertTarget();
      const member = await client.clinicMembership.findUniqueOrThrow({
        where: { userId_clinicId: { userId, clinicId } },
        include: { user: { select: { name: true } } },
      });
      await client.staffProfile.update({
        where: { membershipId: member.id },
        data: {
          publicSnapshot: { displayName: "Profesional QA de reservas" },
          publishedAt: new Date(),
          publishedConsentHash: "a".repeat(64),
        },
      });
      const service = await client.bookingService.create({
        data: {
          clinicId,
          name: "Consulta QA de reservas",
          description: "Servicio exclusivo del esquema de pruebas",
          durationMinutes: 30,
          bufferMinutes: 15,
          enabled: true,
          resourceKey: "consulta-qa",
          professionals: { create: { membershipId: member.id } },
        },
      });
      const hours = Array.from({ length: 7 }, (_, weekday) => ({
        weekday,
        opens: "09:00",
        closes: "18:00",
      }));
      await client.bookingSettings.create({
        data: {
          clinicId,
          configuration: {
            publicEnabled: true,
            autoConfirm: false,
            autoAssign: false,
            minNoticeMinutes: 0,
            maxAdvanceDays: 60,
            stepMinutes: 15,
            cancellationNoticeMinutes: 0,
            message: "Condiciones exclusivas de las pruebas aisladas",
            hours,
            professionals: [{ membershipId: member.id, hours }],
            blocks: [],
          },
        },
      });
      return { professionalId: member.id, serviceId: service.id };
    },
    async setupPersonalDemo(userId: string, clinicId: string) {
      await assertTarget();
      const { seedBookingDemo } = require("./scripts/booking-demo.cjs") as {
        seedBookingDemo: (
          db: Client,
          userId: string,
          options: { clinicId: string },
        ) => Promise<{ id: string; slug: string }>;
      };
      return seedBookingDemo(client, userId, { clinicId });
    },
    close: () => client.$disconnect(),
  };
}
