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
    close: () => client.$disconnect(),
  };
}
