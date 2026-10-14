// Real Nest API for browser tests. Never use existing tables for fixtures.
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const backend = fileURLToPath(new URL("../../../backend/", import.meta.url));
const require = createRequire(path.join(backend, "package.json"));
const { PrismaClient, Prisma } = require("@prisma/client");
const { NestFactory } = require("@nestjs/core");
process.loadEnvFile(path.join(backend, ".env"));
const url = new URL(process.env.DATABASE_URL ?? "");
if (
  process.env.NODE_ENV === "production" ||
  url.protocol !== "postgresql:" ||
  !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
  url.port !== "5433" ||
  url.pathname !== "/pawly" ||
  (url.searchParams.get("schema") ?? "public") !== "public" ||
  [...url.searchParams.keys()].some((k) => k !== "schema")
)
  throw new Error("Browser tests require local pawly on loopback:5433/public");
const control = new PrismaClient({ datasourceUrl: url.toString() });
const schema = `pawly_frontend_test_${randomUUID().replaceAll("-", "")}`;
let ownsSchema = false;
let app, prisma, baseline;
let stopping = false;

async function snapshot() {
  return control.$transaction(
    async (tx) => {
      const columns =
        await tx.$queryRaw`SELECT table_name, column_name, data_type, udt_name, character_maximum_length, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`;
      const constraints =
        await tx.$queryRaw`SELECT c.relname, k.conname, pg_get_constraintdef(k.oid) AS definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,k.conname`;
      const indexes =
        await tx.$queryRaw`SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname`;
      const enums =
        await tx.$queryRaw`SELECT t.typname,e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' ORDER BY t.typname,e.enumsortorder`;
      const tables =
        await tx.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`;
      const rows = [];
      for (const { table_name } of tables) {
        const name = table_name.replaceAll('"', '""');
        const digest = await tx.$queryRawUnsafe(
          `SELECT count(*)::text AS count, md5(COALESCE(string_agg(md5(to_jsonb(t)::text),'' ORDER BY md5(to_jsonb(t)::text)),'')) AS digest FROM public."${name}" t`,
        );
        rows.push({ table: table_name, digest });
      }
      return JSON.stringify({ columns, constraints, indexes, enums, rows });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
async function assertOwned(client) {
  if (!ownsSchema || !/^pawly_frontend_test_[a-f0-9]{32}$/.test(schema))
    throw new Error("Refusing writes or cleanup without an owned schema");
  const [target] =
    await client.$queryRaw`SELECT current_database() AS database,current_schema() AS schema`;
  if (target.database !== "pawly" || target.schema !== schema)
    throw new Error("Unexpected test connection");
}
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  try {
    if (app) await app.close();
    if (ownsSchema) {
      await assertOwned(prisma);
      await control.$executeRawUnsafe(
        `DROP TABLE IF EXISTS "${schema}"."Session", "${schema}"."ClinicMembership", "${schema}"."User", "${schema}"."VeterinaryClinic", "${schema}"."_prisma_migrations" RESTRICT`,
      );
      await control.$executeRawUnsafe(
        `DROP TYPE IF EXISTS "${schema}"."UserStatus", "${schema}"."ClinicStatus", "${schema}"."MembershipStatus", "${schema}"."Role" RESTRICT`,
      );
      await control.$executeRawUnsafe(`DROP SCHEMA "${schema}" RESTRICT`);
      ownsSchema = false;
      console.info("Owned browser test schema removed with RESTRICT.");
    }
    if (baseline && (await snapshot()) !== baseline)
      throw new Error("public changed during browser tests");
    if (baseline)
      console.info("public structure and row fingerprints unchanged.");
  } catch {
    console.error(
      "Browser test cleanup or public verification failed; inspect the owned schema.",
    );
    code = 1;
  } finally {
    if (prisma) await prisma.$disconnect();
    await control.$disconnect();
    process.exit(code);
  }
}
process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
process.stdin.resume();
process.stdin.on("data", () => void stop());

try {
  const [target] =
    await control.$queryRaw`SELECT current_database() AS database,current_schema() AS schema`;
  if (target.database !== "pawly" || target.schema !== "public")
    throw new Error("Unexpected source connection");
  baseline = await snapshot();
  await control.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  ownsSchema = true;
  url.searchParams.set("schema", schema);
  process.env.DATABASE_URL = url.toString();
  process.env.NODE_ENV = "test";
  process.env.CORS_ORIGINS = "http://localhost:3100";
  prisma = new PrismaClient({ datasourceUrl: url.toString() });
  await assertOwned(prisma);
  execFileSync(
    process.execPath,
    [
      path.join(backend, "node_modules/prisma/build/index.js"),
      "migrate",
      "deploy",
    ],
    { cwd: backend, env: process.env, stdio: "pipe", timeout: 30000 },
  );
  const { AppModule } = require(path.join(backend, "dist/app.module.js"));
  const { PrismaService } = require(
    path.join(backend, "dist/prisma/prisma.service.js"),
  );
  const { configureHttp } = require(
    path.join(backend, "dist/http/configure-http.js"),
  );
  app = await NestFactory.create(AppModule, { logger: ["error"] });
  configureHttp(app);
  await assertOwned(app.get(PrismaService));
  await app.listen(4001, "127.0.0.1");
  console.info(
    `Browser test API ready: localhost:4001/pawly; schema=${schema}`,
  );
} catch {
  console.error("Isolated browser API could not start.");
  await stop(1);
}
