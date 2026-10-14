import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ThrottlerStorage, ThrottlerStorageService } from "@nestjs/throttler";
import { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID, createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import request from "supertest";
import * as argon2 from "argon2";
import { configureHttp } from "../http/configure-http";
import { ClinicAuthorizationService } from "../authorization/authorization.module";
import { PrismaService } from "../prisma/prisma.service";

// Capture structure and row fingerprints without printing credentials or real rows.
async function publicSnapshot(client: PrismaClient) {
  return client.$transaction(
    async (tx) => {
      const columns = await tx.$queryRaw`
      SELECT table_name, column_name, data_type, udt_name, character_maximum_length,
             is_nullable, column_default
      FROM information_schema.columns WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position`;
      const constraints = await tx.$queryRaw`
      SELECT c.relname, k.conname, pg_get_constraintdef(k.oid) AS definition
      FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' ORDER BY c.relname, k.conname`;
      const indexes = await tx.$queryRaw`
      SELECT tablename, indexname, indexdef FROM pg_indexes
      WHERE schemaname = 'public' ORDER BY tablename, indexname`;
      const enums = await tx.$queryRaw`
      SELECT t.typname, e.enumlabel FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' ORDER BY t.typname, e.enumsortorder`;
      const tables = await tx.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name`;
      const rows = [];
      for (const { table_name } of tables) {
        const quoted = table_name.replaceAll('"', '""');
        const fingerprint = await tx.$queryRawUnsafe(
          `SELECT count(*)::text AS count,
                md5(COALESCE(string_agg(md5(to_jsonb(t)::text), ''
                  ORDER BY md5(to_jsonb(t)::text)), '')) AS digest
         FROM public."${quoted}" t`,
        );
        rows.push({ table: table_name, fingerprint });
      }
      return { columns, constraints, indexes, enums, rows };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}

// Every run owns a fresh random schema; existing tables/data are never reused or deleted.
describe("authentication with isolated PostgreSQL", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let control: PrismaClient;
  let schema: string;
  let ownsSchema = false;
  let baseline: Awaited<ReturnType<typeof publicSnapshot>>;
  let fixtureHash: string;
  const previousEnvironment = {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    CORS_ORIGINS: process.env.CORS_ORIGINS,
  };
  let cookie: string;
  let userId: string;
  let clinicId: string;
  let otherClinicId: string;
  const email = "Administrator@example.invalid";
  const password = "A long private passphrase 123!";
  const origin = "http://localhost:3000";
  const input = {
    name: "Administrador",
    email,
    password,
    clinicName: "Clínica Pawly",
  };
  const post = (url: string) =>
    request(app.getHttpServer())
      .post(url)
      .set("Origin", origin)
      .set("X-Pawly-CSRF", "1");

  async function assertTestConnection(client = prisma) {
    if (!ownsSchema || !/^pawly_auth_test_[a-f0-9]{32}$/.test(schema))
      throw new Error(
        "Refusing writes or cleanup without an owned test schema",
      );
    const [connection] = await client.$queryRaw<
      Array<{ database: string; schema: string }>
    >`
      SELECT current_database() AS database, current_schema() AS schema`;
    expect(connection).toEqual({ database: "pawly", schema });
  }

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) process.loadEnvFile(path.resolve(".env"));
    const url = new URL(process.env.DATABASE_URL ?? "");
    if (
      process.env.NODE_ENV === "production" ||
      url.protocol !== "postgresql:" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.port !== "5433" ||
      url.pathname !== "/pawly" ||
      (url.searchParams.get("schema") ?? "public") !== "public" ||
      [...url.searchParams.keys()].some((key) => key !== "schema")
    )
      throw new Error(
        "Tests require local development PostgreSQL: pawly on loopback:5433/public",
      );
    control = new PrismaClient({ datasourceUrl: url.toString() });
    const [source] = await control.$queryRaw<
      Array<{ database: string; schema: string }>
    >`
      SELECT current_database() AS database, current_schema() AS schema`;
    expect(source).toEqual({ database: "pawly", schema: "public" });
    baseline = await publicSnapshot(control);
    schema = `pawly_auth_test_${randomUUID().replaceAll("-", "")}`;
    // No IF NOT EXISTS: failure can never grant ownership of an existing schema.
    await control.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    ownsSchema = true;
    url.searchParams.set("schema", schema);
    process.env.DATABASE_URL = url.toString();
    process.env.NODE_ENV = "test";
    process.env.CORS_ORIGINS = origin;
    prisma = new PrismaClient({ datasourceUrl: url.toString() });
    await assertTestConnection();
    console.info(
      `Integration target: ${url.hostname}:5433/pawly; schema=${schema}`,
    );
    execFileSync(
      process.execPath,
      [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"],
      { env: process.env, stdio: "pipe", timeout: 30000 },
    );
    const { AppModule } = await import("../app.module");
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication({ logger: ["error"] });
    configureHttp(app);
    await app.listen(0, "127.0.0.1");
    await assertTestConnection(app.get(PrismaService));
    fixtureHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }, 120000);

  afterAll(async () => {
    try {
      if (app) await app.close();
      if (ownsSchema) {
        // RESTRICT blocks external dependencies; never cascade into another schema.
        await assertTestConnection();
        await control.$executeRawUnsafe(
          `DROP TABLE IF EXISTS "${schema}"."Session", "${schema}"."ClinicMembership",
           "${schema}"."User", "${schema}"."VeterinaryClinic",
           "${schema}"."_prisma_migrations" RESTRICT`,
        );
        await control.$executeRawUnsafe(
          `DROP TYPE IF EXISTS "${schema}"."UserStatus", "${schema}"."ClinicStatus",
           "${schema}"."MembershipStatus", "${schema}"."Role" RESTRICT`,
        );
        await control.$executeRawUnsafe(`DROP SCHEMA "${schema}" RESTRICT`);
        ownsSchema = false;
        const remaining = await control.$queryRaw<
          Array<{ schema_name: string }>
        >`
          SELECT schema_name FROM information_schema.schemata WHERE schema_name = ${schema}`;
        expect(remaining).toEqual([]);
        console.info("Owned integration schema removed with RESTRICT.");
      }
    } finally {
      try {
        if (baseline) {
          expect(await publicSnapshot(control)).toEqual(baseline);
          console.info(
            "public structure and all table row fingerprints unchanged.",
          );
        }
      } finally {
        if (prisma) await prisma.$disconnect();
        if (control) await control.$disconnect();
        for (const [key, value] of Object.entries(previousEnvironment)) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      }
    }
  });

  beforeEach(async () => {
    await assertTestConnection();
    await prisma.$transaction([
      prisma.session.deleteMany(),
      prisma.clinicMembership.deleteMany(),
      prisma.user.deleteMany(),
      prisma.veterinaryClinic.deleteMany(),
    ]);
    const owner = await prisma.user.create({
      data: {
        name: input.name,
        email,
        normalizedEmail: email.toLowerCase(),
        passwordHash: fixtureHash,
        memberships: {
          create: {
            role: "OWNER",
            clinic: {
              create: {
                name: input.clinicName,
                slug: `fixture-${randomUUID()}`,
              },
            },
          },
        },
      },
      include: { memberships: true },
    });
    userId = owner.id;
    clinicId = owner.memberships[0]!.clinicId;
    const other = await prisma.user.create({
      data: {
        name: "Other owner",
        email: "second@example.invalid",
        normalizedEmail: "second@example.invalid",
        passwordHash: fixtureHash,
        memberships: {
          create: {
            role: "OWNER",
            clinic: {
              create: {
                name: input.clinicName,
                slug: `fixture-${randomUUID()}`,
              },
            },
          },
        },
      },
      include: { memberships: true },
    });
    otherClinicId = other.memberships[0]!.clinicId;
    app.get<ThrottlerStorageService>(ThrottlerStorage).onApplicationShutdown();
    const login = await post("/api/auth/login")
      .send({ email, password })
      .expect(200);
    cookie = String(login.get("set-cookie")?.[0]).split(";")[0]!;
    // Every scenario has fresh fixtures and independent counters, with limits enabled.
    app.get<ThrottlerStorageService>(ThrottlerStorage).onApplicationShutdown();
  });

  it("rejects unauthenticated requests and invalid input, including arbitrary roles", async () => {
    await request(app.getHttpServer()).get("/api/auth/me").expect(401);
    for (const invalid of [
      { ...input, role: "ADMIN" },
      { ...input, email: "bad" },
      { ...input, password: "short" },
      { ...input, name: " " },
      { ...input, clinicName: " " },
    ]) {
      const r = await post("/api/auth/register-clinic")
        .send(invalid)
        .expect(400);
      expect(JSON.stringify(r.body)).not.toContain(password);
      expect(r.body).toEqual({
        statusCode: 400,
        message: "Solicitud inválida.",
      });
      expect(r.headers["cache-control"]).toBe("no-store");
    }
  });

  it("rejects malformed JSON before guards without reflecting credentials or losing no-store", async () => {
    const marker = "CANARY_PASSWORD_TOKEN_COOKIE";
    for (const route of [
      "/api/auth/login",
      "/API/AUTH/register-clinic",
      "/api/auth/logout",
      `/api/clinics/${clinicId}/access`,
    ]) {
      for (const body of [
        `{"password":${marker}}`,
        `{"password":"${marker}",broken}`,
        `{"token":"${marker}",`,
      ]) {
        // No Origin/CSRF header: a parser 400 proves this runs before the guards.
        const result = await request(app.getHttpServer())
          .post(route)
          .set("Content-Type", "application/json")
          .set("Cookie", cookie)
          .send(body)
          .expect(400);
        expect(result.body).toEqual({
          statusCode: 400,
          message: "Solicitud inválida.",
        });
        expect(result.headers["cache-control"]).toBe("no-store");
        expect(result.text).not.toMatch(
          /CANARY|password|token|cookie|Unexpected|position/i,
        );
      }
    }
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", cookie)
      .expect(200);
    expect(await prisma.user.count()).toBe(2);
    expect(await prisma.veterinaryClinic.count()).toBe(2);
    expect(await prisma.session.count()).toBe(1);
  });

  it("does not reflect attacker-controlled validation property names or bad cookies", async () => {
    const marker = "CANARY_PASSWORD_TOKEN_COOKIE";
    const invalid = await post("/api/auth/register-clinic")
      .send({ ...input, [marker]: marker })
      .expect(400);
    const unauthorized = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", `pawly_session=${marker}`)
      .expect(401);
    const missing = await request(app.getHttpServer())
      .get(`/api/auth/${marker}`)
      .expect(404);
    for (const result of [invalid, unauthorized, missing]) {
      expect(result.headers["cache-control"]).toBe("no-store");
      expect(result.text).not.toContain("CANARY");
    }
  });

  it("keeps oversized and unsupported-charset parser errors private with their HTTP status", async () => {
    const oversized = await post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send(`{"password":"${"CANARY".repeat(20000)}"}`)
      .expect(413);
    const charset = await post("/api/auth/login")
      .set("Content-Type", "application/json; charset=unsupported")
      .send('{"password":"CANARY"}')
      .expect(415);
    for (const result of [oversized, charset]) {
      expect(result.headers["cache-control"]).toBe("no-store");
      expect(result.text).not.toMatch(
        /CANARY|password|charset|unsupported|stack/i,
      );
      expect(Object.keys(result.body).sort()).toEqual([
        "message",
        "statusCode",
      ]);
    }
  });

  it("rejects absent/untrusted origins, missing CSRF headers and simple content types", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password })
      .expect(403);
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("Origin", "https://evil.invalid")
      .set("X-Pawly-CSRF", "1")
      .send({ email, password })
      .expect(403);
    await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("Origin", origin)
      .send({ email, password })
      .expect(403);
    await post("/api/auth/login")
      .type("form")
      .send({ email, password })
      .expect(403);
  });

  it("enforces CSRF and private caching for case-insensitive Express routes", async () => {
    for (const route of [
      "/API/AUTH/login",
      "/api/AuTh/register-clinic",
      "/API/AUTH/logout",
    ]) {
      const result = await request(app.getHttpServer())
        .post(route)
        .set("Cookie", cookie)
        .send(input)
        .expect(403);
      expect(result.headers["cache-control"]).toBe("no-store");
    }
    const me = await request(app.getHttpServer())
      .get("/API/AUTH/me")
      .set("Cookie", cookie)
      .expect(200);
    expect(me.headers["cache-control"]).toBe("no-store");
  });

  it("registers an owner atomically with an Argon2id hash and unverified email", async () => {
    const result = await post("/api/auth/register-clinic")
      .send({ ...input, email: "registration@example.invalid" })
      .expect(201);
    userId = result.body.user.id;
    clinicId = result.body.clinic.id;
    expect(result.body.role).toBe("OWNER");
    expect(result.body.user.emailVerifiedAt).toBeNull();
    expect(JSON.stringify(result.body)).not.toMatch(
      /passwordHash|tokenHash|normalizedEmail/,
    );
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await argon2.verify(user.passwordHash, password)).toBe(true);
    expect(user.normalizedEmail).toBe("registration@example.invalid");
    const membership = await prisma.clinicMembership.findUniqueOrThrow({
      where: { userId_clinicId: { userId, clinicId } },
    });
    expect(membership.role).toBe("OWNER");
  });

  it("rejects case-insensitive duplicate email without database details", async () => {
    const result = await post("/api/auth/register-clinic")
      .send({ ...input, email: ` ${email.toUpperCase()} ` })
      .expect(409);
    expect(JSON.stringify(result.body)).not.toMatch(
      /Prisma|normalizedEmail|passwordHash|constraint/,
    );
    expect(await prisma.user.count()).toBe(2);
    expect(await prisma.veterinaryClinic.count()).toBe(2);
  });

  it("rolls back all registration writes when membership creation fails", async () => {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${schema}"."ClinicMembership" ADD CONSTRAINT "test_failure" CHECK (false) NOT VALID`,
    );
    try {
      const result = await post("/api/auth/register-clinic")
        .send({ ...input, email: "rollback@example.invalid" })
        .expect(500);
      expect(result.body).toEqual({
        statusCode: 500,
        message: "Error interno del servidor.",
      });
      expect(await prisma.user.count()).toBe(2);
      expect(await prisma.veterinaryClinic.count()).toBe(2);
    } finally {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE "${schema}"."ClinicMembership" DROP CONSTRAINT "test_failure"`,
      );
    }
  });

  it("creates distinct slugs for clinics with the same name", async () => {
    const r = await post("/api/auth/register-clinic")
      .send({ ...input, email: "same-name@example.invalid" })
      .expect(201);
    otherClinicId = r.body.clinic.id;
    const clinics = await prisma.veterinaryClinic.findMany();
    expect(new Set(clinics.map((c) => c.slug)).size).toBe(3);
  });

  it("retries a PostgreSQL slug collision without leaving an orphan user", async () => {
    const suffix = randomUUID();
    const existingSlug = `clinica-pawly-${suffix}`;
    await prisma.veterinaryClinic.create({
      data: { name: "Existing clinic", slug: existingSlug },
    });
    const beforeUsers = await prisma.user.count();
    const beforeClinics = await prisma.veterinaryClinic.count();
    const uuid = jest
      .spyOn(
        jest.requireActual<typeof import("node:crypto")>("node:crypto"),
        "randomUUID",
      )
      .mockReturnValueOnce(suffix);
    try {
      const result = await post("/api/auth/register-clinic")
        .send({ ...input, email: "collision@example.invalid" })
        .expect(201);
      expect(uuid).toHaveBeenCalledTimes(2);
      expect(result.body.clinic.slug).not.toBe(existingSlug);
      expect(await prisma.user.count()).toBe(beforeUsers + 1);
      expect(await prisma.veterinaryClinic.count()).toBe(beforeClinics + 1);
      expect(
        await prisma.clinicMembership.count({
          where: { userId: result.body.user.id },
        }),
      ).toBe(1);
    } finally {
      uuid.mockRestore();
    }
  });

  it.each([
    ["A".repeat(160), "a".repeat(63)],
    ["¡Clínica Ñandú & Mascotas!", "clinica-nandu-mascotas"],
    ["🐾✨", "clinica"],
  ])("persists a bounded slug for clinic name %s", async (clinicName, base) => {
    const result = await post("/api/auth/register-clinic")
      .send({ ...input, email: "slug@example.invalid", clinicName })
      .expect(201);
    expect(result.body.clinic.slug.length).toBeLessThanOrEqual(100);
    expect(result.body.clinic.slug).toMatch(
      new RegExp(`^${base}-[a-f0-9-]{36}$`),
    );
    const clinic = await prisma.veterinaryClinic.findUniqueOrThrow({
      where: { id: result.body.clinic.id },
    });
    expect(clinic.slug).toBe(result.body.clinic.slug);
  });

  it("explicitly blocks public production registration and unverified login/access", async () => {
    const config = app.get(ConfigService);
    config.set("NODE_ENV", "production");
    try {
      await post("/api/auth/register-clinic")
        .send({ ...input, email: "production@example.invalid" })
        .expect(503);
      await post("/api/auth/login").send({ email, password }).expect(401);
      await request(app.getHttpServer())
        .get("/api/auth/me")
        .set(
          "Cookie",
          cookie.replace("pawly_session=", "__Host-pawly_session="),
        )
        .expect(401);
      expect(await prisma.user.count()).toBe(2);
      await prisma.user.update({
        where: { id: userId },
        data: { emailVerifiedAt: new Date() },
      });
      const login = await post("/api/auth/login")
        .send({ email, password })
        .expect(200);
      const header = String(login.get("set-cookie")?.[0]);
      expect(header).toMatch(/^__Host-pawly_session=/);
      expect(header).toMatch(/; Secure/);
      expect(header).toMatch(/; HttpOnly/);
      expect(header).not.toMatch(/; Domain=/);
      expect(JSON.stringify(login.body)).not.toMatch(
        /passwordHash|tokenHash|normalizedEmail/,
      );
      await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Cookie", header.split(";")[0]!)
        .expect(200);
    } finally {
      config.set("NODE_ENV", "test");
    }
  });

  it("limits registration attempts", async () => {
    for (let i = 0; i < 5; i++) {
      await post("/api/auth/register-clinic")
        .send({ ...input, email: `rate-${i}@example.invalid` })
        .expect(201);
    }
    await post("/api/auth/register-clinic")
      .send({ ...input, email: "rate-blocked@example.invalid" })
      .expect(429);
  });

  it("handles concurrent registration of one normalized email without orphan clinics", async () => {
    const before = await prisma.veterinaryClinic.count();
    const responses = await Promise.all([
      post("/api/auth/register-clinic").send({
        ...input,
        email: "race@example.invalid",
      }),
      post("/api/auth/register-clinic").send({
        ...input,
        email: "RACE@example.invalid",
      }),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      await prisma.user.count({
        where: { normalizedEmail: "race@example.invalid" },
      }),
    ).toBe(1);
    expect(await prisma.veterinaryClinic.count()).toBe(before + 1);
  });

  it("returns generic failures for wrong passwords, missing users and suspended accounts", async () => {
    const wrong = await post("/api/auth/login")
      .send({ email, password: "incorrect" })
      .expect(401);
    const missing = await post("/api/auth/login")
      .send({ email: "missing@example.invalid", password })
      .expect(401);
    await prisma.user.update({
      where: { id: userId },
      data: { status: "SUSPENDED" },
    });
    const suspended = await post("/api/auth/login")
      .send({ email, password })
      .expect(401);
    expect(wrong.body).toEqual(missing.body);
    expect(wrong.body).toEqual(suspended.body);
    await prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
    });
  });

  it("logs in with a private cookie and stores only its hash", async () => {
    const result = await post("/api/auth/login")
      .send({ email: email.toUpperCase(), password })
      .expect(200);
    const header = String(result.get("set-cookie")?.[0]);
    expect(header).toMatch(/HttpOnly/);
    expect(header).toMatch(/SameSite=Lax/);
    expect(header).toMatch(/Path=\//);
    expect(header).not.toMatch(/; Secure/);
    expect(result.headers["cache-control"]).toBe("no-store");
    cookie = header.split(";")[0]!;
    const token = cookie.split("=")[1]!;
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const session = await prisma.session.findUniqueOrThrow({
      where: { tokenHash: createHash("sha256").update(token).digest("hex") },
    });
    expect(session.tokenHash).toBe(
      createHash("sha256").update(token).digest("hex"),
    );
    expect(session.tokenHash).not.toBe(token);
    expect(JSON.stringify(result.body)).not.toMatch(/passwordHash|tokenHash/);
  });

  it("returns only public profile and authorized clinics; rejects foreign clinics", async () => {
    const me = await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", cookie)
      .expect(200);
    expect(me.body.memberships).toHaveLength(1);
    expect(me.body.memberships[0].clinic.id).toBe(clinicId);
    expect(JSON.stringify(me.body)).not.toMatch(
      /passwordHash|tokenHash|normalizedEmail/,
    );
    await request(app.getHttpServer())
      .get(`/api/clinics/${clinicId}/access`)
      .set("Cookie", cookie)
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/clinics/${otherClinicId}/access`)
      .set("Cookie", cookie)
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/clinics/${otherClinicId}/access`)
      .expect(401);
    await request(app.getHttpServer())
      .get("/api/clinics/invalid/access")
      .set("Cookie", cookie)
      .expect(400);
  });

  it("enforces roles independently for multiple memberships", async () => {
    await prisma.clinicMembership.create({
      data: { userId, clinicId: otherClinicId, role: "RECEPTIONIST" },
    });
    const authorization = app.get(ClinicAuthorizationService);
    await expect(
      authorization.authorize(userId, clinicId, ["clinic:manage"]),
    ).resolves.toMatchObject({ role: "OWNER" });
    await expect(
      authorization.authorize(userId, otherClinicId, ["clinic:manage"]),
    ).rejects.toThrow();
    await request(app.getHttpServer())
      .get(`/api/clinics/${otherClinicId}/access`)
      .set("Cookie", cookie)
      .expect(200);
    await prisma.clinicMembership.update({
      where: { userId_clinicId: { userId, clinicId: otherClinicId } },
      data: { status: "SUSPENDED" },
    });
    await request(app.getHttpServer())
      .get(`/api/clinics/${otherClinicId}/access`)
      .set("Cookie", cookie)
      .expect(403);
    await prisma.veterinaryClinic.update({
      where: { id: clinicId },
      data: { status: "SUSPENDED" },
    });
    await request(app.getHttpServer())
      .get(`/api/clinics/${clinicId}/access`)
      .set("Cookie", cookie)
      .expect(403);
    await prisma.veterinaryClinic.update({
      where: { id: clinicId },
      data: { status: "ACTIVE" },
    });
  });

  it("rejects a suspended user even with an existing session", async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { status: "SUSPENDED" },
    });
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", cookie)
      .expect(401);
    await prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
    });
  });

  it("protects logout from CSRF, revokes the session and clears its cookie", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/logout")
      .set("Cookie", cookie)
      .send({})
      .expect(403);
    const result = await post("/api/auth/logout")
      .set("Cookie", cookie)
      .send({})
      .expect(204);
    expect(String(result.get("set-cookie")?.[0])).toMatch(
      /Expires=Thu, 01 Jan 1970/,
    );
    expect(
      (await prisma.session.findFirstOrThrow({ where: { userId } })).revokedAt,
    ).not.toBeNull();
    await request(app.getHttpServer())
      .get("/api/auth/me")
      .set("Cookie", cookie)
      .expect(401);
  });

  it("rejects expired, malformed and unknown sessions", async () => {
    const token = "a".repeat(43);
    await prisma.session.create({
      data: {
        userId,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    for (const value of [token, "bad", "b".repeat(43)]) {
      await request(app.getHttpServer())
        .get("/api/auth/me")
        .set("Cookie", `pawly_session=${value}`)
        .expect(401);
    }
  });

  it("limits login attempts without trusting forwarded IP headers", async () => {
    for (let i = 0; i < 10; i++)
      await post("/api/auth/login")
        .set("X-Forwarded-For", `192.0.2.${i}`)
        .send({ email, password: "bad" })
        .expect(401);
    await post("/api/auth/login").send({ email, password }).expect(429);
  });

  it("sets CORS credentials only for allowed browser origins", async () => {
    const r = await request(app.getHttpServer())
      .options("/api/auth/login")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type,x-pawly-csrf")
      .expect(204);
    expect(r.headers["access-control-allow-origin"]).toBe(origin);
    expect(r.headers["access-control-allow-credentials"]).toBe("true");
    const bad = await request(app.getHttpServer())
      .options("/api/auth/login")
      .set("Origin", "https://evil.invalid")
      .set("Access-Control-Request-Method", "POST");
    expect(bad.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
