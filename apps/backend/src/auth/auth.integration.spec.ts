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
          `DROP TABLE IF EXISTS "${schema}"."ConsultationEvent", "${schema}"."ConsultationAmendment", "${schema}"."Consultation", "${schema}"."AppointmentEvent", "${schema}"."Appointment", "${schema}"."PatientTutor", "${schema}"."Patient", "${schema}"."Tutor", "${schema}"."Session", "${schema}"."ClinicMembership",
           "${schema}"."User", "${schema}"."VeterinaryClinic",
           "${schema}"."_prisma_migrations" RESTRICT`,
        );
        await control.$executeRawUnsafe(
          `DROP TYPE IF EXISTS "${schema}"."ConsultationStatus", "${schema}"."DiagnosisType", "${schema}"."AppointmentStatus", "${schema}"."TutorStatus", "${schema}"."PatientStatus", "${schema}"."Species", "${schema}"."PatientSex", "${schema}"."UserStatus", "${schema}"."ClinicStatus",
           "${schema}"."MembershipStatus", "${schema}"."Role" RESTRICT`,
        );
        for (const fn of [
          "protectFinalizedConsultation",
          "protectClinicalAppendOnly",
          "requireFinalizedForAmendment",
          "checkClinicalAppointment",
        ]) {
          await control.$executeRawUnsafe(
            `DROP FUNCTION "${schema}"."${fn}"() RESTRICT`,
          );
        }
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
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "${schema}"."ConsultationEvent", "${schema}"."ConsultationAmendment", "${schema}"."Consultation" RESTRICT`,
    );
    await prisma.$transaction([
      prisma.appointmentEvent.deleteMany(),
      prisma.appointment.deleteMany(),
      prisma.patientTutor.deleteMany(),
      prisma.patient.deleteMany(),
      prisma.tutor.deleteMany(),
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

  describe("clinical records and tenant isolation", () => {
    const tutors = () => `/api/clinics/${clinicId}/tutors`;
    const patients = () => `/api/clinics/${clinicId}/patients`;
    const patch = (url: string) =>
      request(app.getHttpServer())
        .patch(url)
        .set("Origin", origin)
        .set("X-Pawly-CSRF", "1")
        .set("Cookie", cookie);
    const tutorInput = {
      firstName: "Ana",
      lastName: "Pérez",
      phone: "+56 9 12345678",
      email: "ana@example.invalid",
      address: "Dirección QA",
      notes: "PRIVATE_NOTES_QA",
    };
    async function createTutor() {
      return (
        await post(tutors()).set("Cookie", cookie).send(tutorInput).expect(201)
      ).body as { id: string };
    }
    async function createPatient(tutorId: string) {
      return (
        await post(patients())
          .set("Cookie", cookie)
          .send({
            name: "Luna",
            species: "CAT",
            sex: "FEMALE",
            tutorIds: [tutorId],
            weightKg: 4.125,
            birthDate: "2020-02-29",
          })
          .expect(201)
      ).body as { id: string };
    }
    async function foreignRecords() {
      const tutor = await prisma.tutor.create({
        data: {
          clinicId: otherClinicId,
          ...tutorInput,
          firstName: "PRIVATE_FOREIGN_TUTOR",
        },
      });
      const patient = await prisma.patient.create({
        data: {
          clinicId: otherClinicId,
          name: "PRIVATE_FOREIGN_PATIENT",
          species: "DOG",
          sex: "UNKNOWN",
        },
      });
      await prisma.patientTutor.create({
        data: {
          clinicId: otherClinicId,
          patientId: patient.id,
          tutorId: tutor.id,
        },
      });
      return { tutor, patient };
    }
    it("creates and edits real tutors and patients with multiple responsible adults", async () => {
      const first = await createTutor();
      const second = await createTutor();
      const patient = await createPatient(first.id);
      const edited = await patch(`${patients()}/${patient.id}`)
        .send({
          tutorIds: [first.id, second.id],
          weightKg: 4.5,
          notes: "Seguimiento QA",
        })
        .expect(200);
      expect(edited.body.tutors).toHaveLength(2);
      expect(edited.body.weightKg).toBe(4.5);
      expect(edited.body.birthDate).toBe("2020-02-29");
      const detail = await request(app.getHttpServer())
        .get(`${patients()}/${patient.id}`)
        .set("Cookie", cookie)
        .expect(200);
      expect(detail.body.notes).toBe("Seguimiento QA");
      await patch(`${tutors()}/${first.id}`)
        .send({ phone: "+56 9 87654321", email: null })
        .expect(200);
      const linked = await request(app.getHttpServer())
        .get(`${tutors()}/${first.id}/patients`)
        .set("Cookie", cookie)
        .expect(200);
      expect(linked.body.items.map((item: { id: string }) => item.id)).toEqual([
        patient.id,
      ]);
      const list = await request(app.getHttpServer())
        .get(tutors())
        .set("Cookie", cookie)
        .expect(200);
      expect(JSON.stringify(list.body)).not.toContain("PRIVATE_NOTES_QA");
      expect(list.body.items[0]).not.toHaveProperty("address");
      const named = await request(app.getHttpServer())
        .get(`${tutors()}?q=${encodeURIComponent("Ana Pérez")}`)
        .set("Cookie", cookie)
        .expect(200);
      expect(named.body.total).toBe(2);
      const byResponsible = await request(app.getHttpServer())
        .get(`${patients()}?q=${encodeURIComponent("Luna Ana Pérez")}`)
        .set("Cookie", cookie)
        .expect(200);
      expect(byResponsible.body.total).toBe(1);
    });
    it("denies absent sessions and suspended clinic memberships", async () => {
      await request(app.getHttpServer()).get(tutors()).expect(401);
      await post(patients()).send({}).expect(401);
      await prisma.clinicMembership.update({
        where: { userId_clinicId: { userId, clinicId } },
        data: { status: "SUSPENDED" },
      });
      await request(app.getHttpServer())
        .get(tutors())
        .set("Cookie", cookie)
        .expect(403);
      await request(app.getHttpServer())
        .get(patients())
        .set("Cookie", cookie)
        .expect(403);
      await post(tutors()).set("Cookie", cookie).send(tutorInput).expect(403);
    });
    it("does not read or mutate a foreign record even for a user in both clinics", async () => {
      const other = await foreignRecords();
      await request(app.getHttpServer())
        .get(`/api/clinics/${otherClinicId}/tutors`)
        .set("Cookie", cookie)
        .expect(403);
      await prisma.clinicMembership.create({
        data: { userId, clinicId: otherClinicId, role: "OWNER" },
      });
      for (const [base, id] of [
        [tutors(), other.tutor.id],
        [patients(), other.patient.id],
      ]) {
        const denied = await request(app.getHttpServer())
          .get(`${base}/${id}`)
          .set("Cookie", cookie)
          .expect(404);
        expect(JSON.stringify(denied.body)).not.toContain("PRIVATE_FOREIGN");
        await patch(`${base}/${id}/archive`).send({}).expect(404);
      }
      await patch(`${tutors()}/${other.tutor.id}`)
        .send({ firstName: "Changed" })
        .expect(404);
      await patch(`${patients()}/${other.patient.id}`)
        .send({ name: "Changed" })
        .expect(404);
      await request(app.getHttpServer())
        .get(`${tutors()}/${other.tutor.id}/patients`)
        .set("Cookie", cookie)
        .expect(404);
      expect(
        (
          await prisma.tutor.findUniqueOrThrow({
            where: { id: other.tutor.id },
          })
        ).firstName,
      ).toBe("PRIVATE_FOREIGN_TUTOR");
      expect(
        (
          await prisma.patient.findUniqueOrThrow({
            where: { id: other.patient.id },
          })
        ).name,
      ).toBe("PRIVATE_FOREIGN_PATIENT");
    });
    it("rejects cross-clinic associations and rolls back replacement atomically", async () => {
      const own = await createTutor();
      const patient = await createPatient(own.id);
      const other = await foreignRecords();
      await post(patients())
        .set("Cookie", cookie)
        .send({
          name: "Invalid",
          species: "DOG",
          sex: "MALE",
          tutorIds: [other.tutor.id],
        })
        .expect(400);
      await patch(`${patients()}/${patient.id}`)
        .send({ tutorIds: [own.id, other.tutor.id], name: "Not persisted" })
        .expect(400);
      const detail = await request(app.getHttpServer())
        .get(`${patients()}/${patient.id}`)
        .set("Cookie", cookie)
        .expect(200);
      expect(detail.body.name).toBe("Luna");
      expect(detail.body.tutors.map((t: { id: string }) => t.id)).toEqual([
        own.id,
      ]);
      await expect(
        prisma.patientTutor.create({
          data: { clinicId, patientId: patient.id, tutorId: other.tutor.id },
        }),
      ).rejects.toMatchObject({ code: "P2003" });
      await expect(
        prisma.patientTutor.create({
          data: {
            clinicId: otherClinicId,
            patientId: patient.id,
            tutorId: other.tutor.id,
          },
        }),
      ).rejects.toMatchObject({ code: "P2003" });
    });
    it("scopes searches, totals, pagination and associated-patient lists to the clinic", async () => {
      await foreignRecords();
      const rows = await prisma.tutor.createManyAndReturn({
        data: Array.from({ length: 23 }, (_, index) => ({
          clinicId,
          firstName: "SearchQA",
          lastName: `Family${String(index).padStart(2, "0")}`,
          phone: "+56 9 12345678",
        })),
        select: { id: true },
      });
      const one = await request(app.getHttpServer())
        .get(`${tutors()}?q=SearchQA&page=1&limit=10`)
        .set("Cookie", cookie)
        .expect(200);
      const two = await request(app.getHttpServer())
        .get(`${tutors()}?q=SearchQA&page=2&limit=10`)
        .set("Cookie", cookie)
        .expect(200);
      const three = await request(app.getHttpServer())
        .get(`${tutors()}?q=SearchQA&page=3&limit=10`)
        .set("Cookie", cookie)
        .expect(200);
      expect(one.body).toMatchObject({ total: 23, totalPages: 3, limit: 10 });
      expect(one.body.items).toHaveLength(10);
      expect(three.body.items).toHaveLength(3);
      expect(
        new Set(
          [...one.body.items, ...two.body.items, ...three.body.items].map(
            (row: { id: string }) => row.id,
          ),
        ).size,
      ).toBe(23);
      const patient = await createPatient(rows[0]!.id);
      const listed = await request(app.getHttpServer())
        .get(`${patients()}?q=Luna&limit=1`)
        .set("Cookie", cookie)
        .expect(200);
      expect(listed.body.total).toBe(1);
      expect(listed.body.items[0].id).toBe(patient.id);
      const foreignSearch = await request(app.getHttpServer())
        .get(`${patients()}?q=PRIVATE_FOREIGN`)
        .set("Cookie", cookie)
        .expect(200);
      expect(foreignSearch.body.total).toBe(0);
      for (const query of [
        "limit=51",
        "page=0",
        "page=1.1",
        "page=10001",
        "q=" + "x".repeat(101),
        "clinicId=" + otherClinicId,
      ])
        await request(app.getHttpServer())
          .get(`${tutors()}?${query}`)
          .set("Cookie", cookie)
          .expect(400);
    });
    it.each(["OWNER", "ADMIN", "VETERINARIAN", "RECEPTIONIST"] as const)(
      "enforces %s role permissions on write and archive",
      async (role) => {
        const tutor = await createTutor();
        const existing = await createPatient(tutor.id);
        await prisma.clinicMembership.update({
          where: { userId_clinicId: { userId, clinicId } },
          data: { role },
        });
        await post(tutors()).set("Cookie", cookie).send(tutorInput).expect(201);
        await request(app.getHttpServer())
          .get(patients())
          .set("Cookie", cookie)
          .expect(200);
        await post(patients())
          .set("Cookie", cookie)
          .send({
            name: "Second",
            species: "DOG",
            sex: "UNKNOWN",
            tutorIds: [tutor.id],
          })
          .expect(role === "RECEPTIONIST" ? 403 : 201);
        await patch(`${patients()}/${existing.id}`)
          .send({ name: "Updated" })
          .expect(role === "RECEPTIONIST" ? 403 : 200);
        await patch(`${patients()}/${existing.id}/archive`)
          .send({})
          .expect(["OWNER", "ADMIN"].includes(role) ? 200 : 403);
      },
    );
    it("archives without deletion, protects linked tutors and makes archived records read-only", async () => {
      const tutor = await createTutor();
      const patient = await createPatient(tutor.id);
      await patch(`${tutors()}/${tutor.id}/archive`).send({}).expect(409);
      await patch(`${patients()}/${patient.id}/archive`).send({}).expect(200);
      await patch(`${patients()}/${patient.id}`)
        .send({ name: "Forbidden edit" })
        .expect(409);
      const list = await request(app.getHttpServer())
        .get(patients())
        .set("Cookie", cookie)
        .expect(200);
      expect(list.body.total).toBe(0);
      const archived = await request(app.getHttpServer())
        .get(`${patients()}?status=ARCHIVED`)
        .set("Cookie", cookie)
        .expect(200);
      expect(archived.body.total).toBe(1);
      await patch(`${tutors()}/${tutor.id}/archive`).send({}).expect(200);
      await patch(`${tutors()}/${tutor.id}`)
        .send({ firstName: "Forbidden" })
        .expect(409);
      expect(
        await prisma.patient.count({ where: { id: patient.id, clinicId } }),
      ).toBe(1);
      expect(
        await prisma.tutor.count({ where: { id: tutor.id, clinicId } }),
      ).toBe(1);
      await post(patients())
        .set("Cookie", cookie)
        .send({
          name: "Invalid",
          species: "DOG",
          sex: "MALE",
          tutorIds: [tutor.id],
        })
        .expect(400);
    });
    it("rejects malformed data and status/tenant injection without reflecting personal data", async () => {
      const tutor = await createTutor();
      const patient = await createPatient(tutor.id);
      for (const body of [
        { name: null },
        { tutorIds: [] },
        { tutorIds: [tutor.id, tutor.id] },
        { weightKg: -1 },
        { birthDate: "2999-01-01" },
        { birthDate: "2026-02-30" },
        { status: "ARCHIVED" },
        { clinicId: otherClinicId },
        { role: "OWNER" },
      ])
        await patch(`${patients()}/${patient.id}`).send(body).expect(400);
      await patch(`${patients()}/${patient.id}`).send({}).expect(400);
      const malformed = await patch(`${patients()}/${patient.id}`)
        .set("Content-Type", "application/json")
        .send('{"notes":"PRIVATE_MALFORMED')
        .expect(400);
      expect(JSON.stringify(malformed.body)).not.toContain("PRIVATE_MALFORMED");
      expect(malformed.headers["cache-control"]).toBe("no-store");
      await request(app.getHttpServer())
        .patch(`${patients()}/${patient.id}`)
        .set("Cookie", cookie)
        .send({ name: "CSRF" })
        .expect(403);
      await patch(`${patients()}/${patient.id}`)
        .set("Origin", "https://evil.invalid")
        .send({ name: "CSRF" })
        .expect(403);
    });
    it("keeps microchips unique per clinic, without disclosing another clinic's patient", async () => {
      const tutor = await createTutor();
      const other = await foreignRecords();
      await prisma.patient.update({
        where: { id: other.patient.id },
        data: { microchip: "QA-CHIP" },
      });
      const input = {
        name: "Luna",
        species: "CAT",
        sex: "FEMALE",
        tutorIds: [tutor.id],
        microchip: "qa-chip",
      };
      await post(patients()).set("Cookie", cookie).send(input).expect(201);
      const duplicate = await post(patients())
        .set("Cookie", cookie)
        .send(input)
        .expect(409);
      expect(JSON.stringify(duplicate.body)).not.toContain("QA-CHIP");
    });
  });

  describe("appointments", () => {
    const endpoint = () => `/api/clinics/${clinicId}/appointments`;
    const range = "?from=2030-01-07T00:00:00Z&to=2030-01-14T00:00:00Z";
    const patch = (id: string) =>
      request(app.getHttpServer())
        .patch(`${endpoint()}/${id}`)
        .set("Cookie", cookie)
        .set("Origin", origin)
        .set("X-Pawly-CSRF", "1");
    async function fixture(target = clinicId) {
      const tutor = await prisma.tutor.create({
        data: {
          clinicId: target,
          firstName: "Tutor QA",
          lastName: "Agenda",
          phone: "+56912345678",
        },
      });
      const patient = await prisma.patient.create({
        data: {
          clinicId: target,
          name: "Paciente QA Agenda",
          species: "CAT",
          tutors: { create: { tutorId: tutor.id } },
        },
      });
      const member = await prisma.clinicMembership.findFirstOrThrow({
        where: { clinicId: target },
      });
      return {
        patientId: patient.id,
        tutorId: tutor.id,
        professionalMembershipId: member.id,
        startsAt: "2030-01-07T12:00:00.000Z",
        durationMinutes: 30,
        reason: "Control QA",
      };
    }
    async function create(input: Awaited<ReturnType<typeof fixture>>) {
      return (
        await post(endpoint()).set("Cookie", cookie).send(input).expect(201)
      ).body as { id: string; version: number; status: string };
    }
    it("creates, reschedules, confirms, progresses and retains complete history", async () => {
      const input = await fixture();
      const created = await create(input);
      const updated = await patch(created.id)
        .send({
          ...input,
          startsAt: "2030-01-07T13:00:00.000Z",
          version: 1,
          status: "CONFIRMED",
        })
        .expect(200);
      expect(updated.body.version).toBe(2);
      await patch(created.id)
        .send({
          ...input,
          startsAt: "2030-01-07T13:00:00.000Z",
          version: 2,
          status: "IN_PROGRESS",
        })
        .expect(200);
      await patch(created.id)
        .send({
          ...input,
          startsAt: "2030-01-07T13:00:00.000Z",
          version: 3,
          status: "COMPLETED",
        })
        .expect(200);
      await patch(created.id)
        .send({ ...input, version: 4, status: "CONFIRMED" })
        .expect(409);
      const history = await request(app.getHttpServer())
        .get(`${endpoint()}/${created.id}/history`)
        .set("Cookie", cookie)
        .expect(200);
      expect(history.body).toHaveLength(4);
      expect(history.body[1].before.startsAt).toBe(input.startsAt);
      expect(history.body[3].after.status).toBe("COMPLETED");
    });
    it("cancels without deletion and frees the professional slot", async () => {
      const input = await fixture();
      const a = await create(input);
      await patch(a.id)
        .send({ ...input, version: 1, status: "CANCELLED" })
        .expect(400);
      await patch(a.id)
        .send({
          ...input,
          version: 1,
          status: "CANCELLED",
          cancellationReason: "Tutor cancela QA",
        })
        .expect(200);
      await create(input);
      expect(await prisma.appointment.count()).toBe(2);
      expect(await prisma.appointmentEvent.count()).toBe(3);
      await patch(a.id)
        .send({ ...input, version: 2, status: "SCHEDULED" })
        .expect(409);
    });
    it("rejects overlaps, permits adjacent slots and protects stale edits", async () => {
      const input = await fixture();
      const a = await create(input);
      await post(endpoint())
        .set("Cookie", cookie)
        .send({ ...input, startsAt: "2030-01-07T12:15:00Z" })
        .expect(409);
      const b = await create({ ...input, startsAt: "2030-01-07T12:30:00Z" });
      await patch(b.id)
        .send({ ...input, version: 1, status: "SCHEDULED" })
        .expect(409);
      await patch(a.id)
        .send({ ...input, version: 1, status: "CONFIRMED" })
        .expect(200);
      await patch(a.id)
        .send({
          ...input,
          version: 1,
          status: "CANCELLED",
          cancellationReason: "stale",
        })
        .expect(409);
    });
    it("serializes simultaneous bookings with one winner and no duplicate history", async () => {
      const input = await fixture();
      const results = await Promise.all([
        post(endpoint()).set("Cookie", cookie).send(input),
        post(endpoint()).set("Cookie", cookie).send(input),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(await prisma.appointment.count()).toBe(1);
      expect(await prisma.appointmentEvent.count()).toBe(1);
    });
    it("allows unassigned appointments without inventing professionals", async () => {
      const input = await fixture();
      await post(endpoint())
        .set("Cookie", cookie)
        .send({ ...input, professionalMembershipId: null })
        .expect(201);
      await post(endpoint())
        .set("Cookie", cookie)
        .send({ ...input, professionalMembershipId: null })
        .expect(201);
    });
    it("validates real dates, duration, past dates, bounds and injected scope", async () => {
      const input = await fixture();
      for (const invalid of [
        { startsAt: "2030-02-30T12:00:00Z" },
        { startsAt: "2030-01-07T09:00:00-03:00" },
        { startsAt: "2020-01-01T00:00:00Z" },
        { durationMinutes: 0 },
        { durationMinutes: 481 },
        { reason: " " },
        { clinicId: otherClinicId },
      ])
        await post(endpoint())
          .set("Cookie", cookie)
          .send({ ...input, ...invalid })
          .expect(400);
      await request(app.getHttpServer())
        .get(endpoint() + "?from=2030-01-01T00:00:00Z&to=2030-05-01T00:00:00Z")
        .set("Cookie", cookie)
        .expect(400);
    });
    it("enforces patient/tutor association and active eligible professionals", async () => {
      const input = await fixture();
      const extra = await prisma.tutor.create({
        data: {
          clinicId,
          firstName: "No asociado",
          lastName: "QA",
          phone: "+56912345678",
        },
      });
      await post(endpoint())
        .set("Cookie", cookie)
        .send({ ...input, tutorId: extra.id })
        .expect(400);
      const unqualified = await prisma.user.create({
        data: {
          name: "Recepcion QA",
          email: "reception-agenda@example.invalid",
          normalizedEmail: "reception-agenda@example.invalid",
          passwordHash: fixtureHash,
          memberships: { create: { clinicId, role: "RECEPTIONIST" } },
        },
        include: { memberships: true },
      });
      await post(endpoint())
        .set("Cookie", cookie)
        .send({
          ...input,
          professionalMembershipId: unqualified.memberships[0]!.id,
        })
        .expect(400);
      const professionals = await request(app.getHttpServer())
        .get(endpoint() + "/professionals")
        .set("Cookie", cookie)
        .expect(200);
      expect(professionals.body.map((p: { id: string }) => p.id)).not.toContain(
        unqualified.memberships[0]!.id,
      );
      await prisma.user.update({
        where: { id: userId },
        data: { status: "SUSPENDED" },
      });
      await post(endpoint()).set("Cookie", cookie).send(input).expect(401);
    });
    it("restricts clinical states for reception, checks suspension and missing session", async () => {
      const input = await fixture();
      const a = await create(input);
      await prisma.clinicMembership.update({
        where: { userId_clinicId: { userId, clinicId } },
        data: { role: "RECEPTIONIST" },
      });
      await patch(a.id)
        .send({
          ...input,
          professionalMembershipId: null,
          version: 1,
          status: "IN_PROGRESS",
        })
        .expect(403);
      await patch(a.id)
        .send({
          ...input,
          professionalMembershipId: null,
          version: 1,
          status: "CONFIRMED",
        })
        .expect(200);
      await prisma.clinicMembership.update({
        where: { userId_clinicId: { userId, clinicId } },
        data: { status: "SUSPENDED" },
      });
      await request(app.getHttpServer())
        .get(endpoint() + range)
        .set("Cookie", cookie)
        .expect(403);
      await request(app.getHttpServer())
        .get(endpoint() + range)
        .expect(401);
    });
    it("isolates listing, history and mutations even for a user in both clinics", async () => {
      const input = await fixture();
      const foreign = await fixture(otherClinicId);
      const a = await create(input);
      await post(endpoint())
        .set("Cookie", cookie)
        .send({
          ...input,
          patientId: foreign.patientId,
          tutorId: foreign.tutorId,
        })
        .expect(400);
      await post(endpoint())
        .set("Cookie", cookie)
        .send({
          ...input,
          professionalMembershipId: foreign.professionalMembershipId,
        })
        .expect(400);
      const path = `/api/clinics/${otherClinicId}/appointments`;
      await request(app.getHttpServer())
        .get(path + range)
        .set("Cookie", cookie)
        .expect(403);
      await prisma.clinicMembership.create({
        data: { clinicId: otherClinicId, userId, role: "VETERINARIAN" },
      });
      const list = await request(app.getHttpServer())
        .get(path + range)
        .set("Cookie", cookie)
        .expect(200);
      expect(list.body.total).toBe(0);
      await request(app.getHttpServer())
        .get(`${path}/${a.id}/history`)
        .set("Cookie", cookie)
        .expect(404);
      await request(app.getHttpServer())
        .patch(`${path}/${a.id}`)
        .set("Cookie", cookie)
        .set("Origin", origin)
        .set("X-Pawly-CSRF", "1")
        .send({ ...foreign, version: 1, status: "CONFIRMED" })
        .expect(404);
      expect(await prisma.appointmentEvent.count()).toBe(1);
    });
    it("enforces composite foreign keys and bounds in PostgreSQL independently of API", async () => {
      const input = await fixture(),
        foreign = await fixture(otherClinicId);
      const a = await create(input);
      await expect(
        prisma.appointment.update({
          where: { id: a.id },
          data: { patientId: foreign.patientId },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.appointment.update({
          where: { id: a.id },
          data: { tutorId: foreign.tutorId },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.appointment.update({
          where: { id: a.id },
          data: { professionalMembershipId: foreign.professionalMembershipId },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.appointment.update({
          where: { id: a.id },
          data: { endsAt: new Date(input.startsAt) },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.appointment.update({
          where: { id: a.id },
          data: { status: "CANCELLED" },
        }),
      ).rejects.toThrow();
    });
    it("filters by period, status and professional and keeps CSRF/no-store", async () => {
      const input = await fixture();
      await create(input);
      const list = await request(app.getHttpServer())
        .get(
          endpoint() +
            range +
            `&status=SCHEDULED&professionalMembershipId=${input.professionalMembershipId}`,
        )
        .set("Cookie", cookie)
        .expect(200);
      expect(list.body.total).toBe(1);
      expect(list.headers["cache-control"]).toBe("no-store");
      const empty = await request(app.getHttpServer())
        .get(endpoint() + range + "&status=CANCELLED")
        .set("Cookie", cookie)
        .expect(200);
      expect(empty.body.total).toBe(0);
      await request(app.getHttpServer())
        .post(endpoint())
        .set("Cookie", cookie)
        .send(input)
        .expect(403);
    });
  });

  describe("consultations and electronic medical history", () => {
    const endpoint = (target = clinicId) =>
      `/api/clinics/${target}/consultations`;
    const get = (url: string) =>
      request(app.getHttpServer()).get(url).set("Cookie", cookie);
    const patch = (id: string, target = clinicId) =>
      request(app.getHttpServer())
        .patch(`${endpoint(target)}/${id}`)
        .set("Cookie", cookie)
        .set("Origin", origin)
        .set("X-Pawly-CSRF", "1");
    async function fixture(target = clinicId) {
      const patient = await prisma.patient.create({
        data: { clinicId: target, name: "Clinical QA", species: "CAT" },
      });
      const member = await prisma.clinicMembership.findFirstOrThrow({
        where: { clinicId: target },
      });
      return {
        patientId: patient.id,
        professionalMembershipId: member.id,
        requestId: randomUUID(),
        attendedAt: new Date(Date.now() - 60000).toISOString(),
        reason: "Control clínico",
        anamnesis: "Antecedentes QA",
        physicalExam: "Examen QA",
        diagnosis: "Diagnóstico QA",
        diagnosisType: "PRESUMPTIVE",
        treatment: "Plan QA",
        weightKg: 4.125,
        temperatureC: 38.5,
      };
    }
    async function create(input: Awaited<ReturnType<typeof fixture>>) {
      return (
        await post(endpoint()).set("Cookie", cookie).send(input).expect(201)
      ).body as { id: string; version: number; status: string };
    }
    async function booking(input: Awaited<ReturnType<typeof fixture>>) {
      const tutor = await prisma.tutor.create({
        data: {
          clinicId,
          firstName: "Tutor",
          lastName: "QA",
          phone: "+56912345678",
        },
      });
      await prisma.patientTutor.create({
        data: { clinicId, patientId: input.patientId, tutorId: tutor.id },
      });
      return prisma.appointment.create({
        data: {
          clinicId,
          patientId: input.patientId,
          tutorId: tutor.id,
          professionalMembershipId: input.professionalMembershipId,
          startsAt: new Date("2030-01-07T12:00:00Z"),
          endsAt: new Date("2030-01-07T12:30:00Z"),
          reason: input.reason,
        },
      });
    }
    const updateFields = (input: Awaited<ReturnType<typeof fixture>>) => {
      const { patientId, requestId, ...fields } = input;
      void patientId;
      void requestId;
      return fields;
    };
    it("creates, edits, finalizes and appends a correction without rewriting the original", async () => {
      const input = await fixture(),
        c = await create(input),
        fields = updateFields(input);
      expect(c.status).toBe("DRAFT");
      await patch(c.id)
        .send({
          ...fields,
          reason: "Control editado",
          version: 1,
          status: "DRAFT",
        })
        .expect(200);
      await patch(c.id)
        .send({ ...fields, version: 1, status: "DRAFT" })
        .expect(409);
      await post(`${endpoint()}/${c.id}/amendments`)
        .set("Cookie", cookie)
        .send({
          requestId: randomUUID(),
          reason: "Corrección",
          correction: "QA",
        })
        .expect(409);
      await patch(c.id)
        .send({ ...fields, treatment: "", version: 2, status: "FINALIZED" })
        .expect(400);
      await patch(c.id)
        .send({ ...fields, version: 2, status: "FINALIZED" })
        .expect(200);
      const original = await prisma.consultation.findUniqueOrThrow({
        where: { id: c.id },
      });
      await patch(c.id)
        .send({ ...fields, version: 3, status: "DRAFT" })
        .expect(409);
      const amendment = await post(`${endpoint()}/${c.id}/amendments`)
        .set("Cookie", cookie)
        .send({
          requestId: randomUUID(),
          reason: "Dato adicional",
          correction: "Información corregida QA",
        })
        .expect(201);
      expect(
        await prisma.consultation.findUniqueOrThrow({ where: { id: c.id } }),
      ).toEqual(original);
      expect(
        (await get(`${endpoint()}/${c.id}/history`).expect(200)).body.total,
      ).toBe(4);
      expect(
        (await get(`${endpoint()}/${c.id}/amendments`).expect(200)).body.total,
      ).toBe(1);
      await expect(
        prisma.consultation.update({
          where: { id: c.id },
          data: { notes: "rewrite" },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.consultation.delete({ where: { id: c.id } }),
      ).rejects.toThrow();
      await expect(
        prisma.consultationAmendment.update({
          where: { id: String(amendment.body.id) },
          data: { correction: "rewrite" },
        }),
      ).rejects.toThrow();
      const event = await prisma.consultationEvent.findFirstOrThrow({
        where: { consultationId: c.id },
      });
      await expect(
        prisma.consultationEvent.update({
          where: { id: event.id },
          data: { kind: "rewrite" },
        }),
      ).rejects.toThrow();
    });
    it("starts the booked appointment atomically, prevents duplicates and completes only on finalization", async () => {
      const input = await fixture(),
        a = await booking(input);
      const c = await create({ ...input, appointmentId: a.id } as typeof input);
      expect(
        (await prisma.appointment.findUniqueOrThrow({ where: { id: a.id } }))
          .status,
      ).toBe("IN_PROGRESS");
      await post(endpoint())
        .set("Cookie", cookie)
        .send({ ...input, requestId: randomUUID(), appointmentId: a.id })
        .expect(409);
      await request(app.getHttpServer())
        .patch(`/api/clinics/${clinicId}/appointments/${a.id}`)
        .set("Cookie", cookie)
        .set("Origin", origin)
        .set("X-Pawly-CSRF", "1")
        .send({
          patientId: input.patientId,
          tutorId: a.tutorId,
          professionalMembershipId: input.professionalMembershipId,
          startsAt: a.startsAt.toISOString(),
          durationMinutes: 30,
          version: 2,
          status: "CANCELLED",
          reason: "QA",
          cancellationReason: "QA",
        })
        .expect(409);
      await expect(
        prisma.appointment.update({
          where: { id: a.id },
          data: { status: "CONFIRMED" },
        }),
      ).rejects.toThrow();
      await patch(c.id)
        .send({ ...updateFields(input), version: 1, status: "FINALIZED" })
        .expect(200);
      expect(
        (await prisma.appointment.findUniqueOrThrow({ where: { id: a.id } }))
          .status,
      ).toBe("COMPLETED");
      expect(
        await prisma.appointmentEvent.count({ where: { appointmentId: a.id } }),
      ).toBe(2);
    });
    it("serializes simultaneous starts so exactly one clinical record exists", async () => {
      const input = await fixture(),
        a = await booking(input);
      const results = await Promise.all(
        [0, 1].map(() =>
          post(endpoint())
            .set("Cookie", cookie)
            .send({ ...input, requestId: randomUUID(), appointmentId: a.id }),
        ),
      );
      expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
      expect(
        await prisma.consultation.count({ where: { appointmentId: a.id } }),
      ).toBe(1);
    });
    it("isolates reads, history, edits, patient and professional relationships across clinics", async () => {
      const input = await fixture(),
        foreign = await fixture(otherClinicId),
        c = await create(input);
      await get(endpoint(otherClinicId)).expect(403);
      await prisma.clinicMembership.create({
        data: { clinicId: otherClinicId, userId, role: "VETERINARIAN" },
      });
      expect((await get(endpoint(otherClinicId)).expect(200)).body.total).toBe(
        0,
      );
      for (const suffix of ["", "/history", "/amendments"])
        await get(`${endpoint(otherClinicId)}/${c.id}${suffix}`).expect(404);
      await patch(c.id, otherClinicId)
        .send({ ...updateFields(foreign), version: 1, status: "DRAFT" })
        .expect(404);
      for (const extra of [
        { patientId: foreign.patientId },
        { professionalMembershipId: foreign.professionalMembershipId },
        { clinicId: otherClinicId },
        { createdByMembershipId: foreign.professionalMembershipId },
      ])
        await post(endpoint())
          .set("Cookie", cookie)
          .send({ ...input, requestId: randomUUID(), ...extra })
          .expect(400);
      await expect(
        prisma.consultation.update({
          where: { id: c.id },
          data: { patientId: foreign.patientId },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.consultation.update({
          where: { id: c.id },
          data: { professionalMembershipId: foreign.professionalMembershipId },
        }),
      ).rejects.toThrow();
    });
    it("denies clinical content to reception, suspended members and unauthenticated clients", async () => {
      const input = await fixture(),
        c = await create(input);
      await prisma.clinicMembership.update({
        where: { id: input.professionalMembershipId },
        data: { role: "RECEPTIONIST" },
      });
      for (const path of [
        endpoint(),
        `${endpoint()}/${c.id}`,
        `${endpoint()}/${c.id}/history`,
        `${endpoint()}/${c.id}/amendments`,
      ])
        await get(path).expect(403);
      await post(endpoint())
        .set("Cookie", cookie)
        .send({ ...input, requestId: randomUUID() })
        .expect(403);
      await patch(c.id)
        .send({ ...updateFields(input), version: 1, status: "DRAFT" })
        .expect(403);
      await prisma.clinicMembership.update({
        where: { id: input.professionalMembershipId },
        data: { role: "VETERINARIAN", status: "SUSPENDED" },
      });
      await get(endpoint()).expect(403);
      await request(app.getHttpServer()).get(endpoint()).expect(401);
    });
    it("validates dates, vital bounds, query filters and database constraints", async () => {
      const input = await fixture(),
        c = await create(input);
      for (const extra of [
        { attendedAt: "2026-02-30T12:00:00Z" },
        { attendedAt: new Date(Date.now() + 3600000).toISOString() },
        { nextControlAt: input.attendedAt },
        { weightKg: -1 },
        { temperatureC: 60 },
        { heartRate: 1.2 },
        { reason: " " },
      ])
        await post(endpoint())
          .set("Cookie", cookie)
          .send({ ...input, requestId: randomUUID(), ...extra })
          .expect(400);
      await expect(
        prisma.consultation.update({
          where: { id: c.id },
          data: { weightKg: -1 },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.consultation.update({
          where: { id: c.id },
          data: { status: "FINALIZED" },
        }),
      ).rejects.toThrow();
      expect(
        (
          await get(
            `${endpoint()}?patientId=${input.patientId}&status=DRAFT`,
          ).expect(200)
        ).body.total,
      ).toBe(1);
      expect(
        (await get(`${endpoint()}?status=FINALIZED`).expect(200)).body.total,
      ).toBe(0);
      await get(`${endpoint()}?from=2026-01-01T00:00:00Z`).expect(400);
      await get(
        `${endpoint()}?from=2026-10-18T00:00:00Z&to=2026-01-01T00:00:00Z`,
      ).expect(400);
      await request(app.getHttpServer())
        .post(endpoint())
        .set("Cookie", cookie)
        .send(input)
        .expect(403);
    });
    it.each(["OWNER", "ADMIN", "VETERINARIAN"] as const)(
      "allows authorized %s clinical work",
      async (role) => {
        const input = await fixture();
        await prisma.clinicMembership.update({
          where: { id: input.professionalMembershipId },
          data: { role },
        });
        const c = await create(input);
        await patch(c.id)
          .send({ ...updateFields(input), version: 1, status: "FINALIZED" })
          .expect(200);
      },
    );
    it("paginates a patient timeline chronologically and filters UTC periods without leaking other patients", async () => {
      const input = await fixture(),
        other = await fixture();
      await prisma.consultation.createMany({
        data: Array.from({ length: 22 }, (_, i) => ({
          clinicId,
          patientId: i === 21 ? other.patientId : input.patientId,
          professionalMembershipId: input.professionalMembershipId,
          createdByMembershipId: input.professionalMembershipId,
          requestId: randomUUID(),
          attendedAt: new Date(Date.UTC(2025, 0, i + 1)),
          reason: `Control ${i}`,
        })),
      });
      const first = await get(
        `${endpoint()}?patientId=${input.patientId}`,
      ).expect(200);
      expect(first.body.total).toBe(21);
      expect(first.body.items).toHaveLength(20);
      expect(first.body.items[0].reason).toBe("Control 20");
      const second = await get(
        `${endpoint()}?patientId=${input.patientId}&page=2`,
      ).expect(200);
      expect(second.body.items).toHaveLength(1);
      expect(second.body.items[0].reason).toBe("Control 0");
      const range = await get(
        `${endpoint()}?patientId=${input.patientId}&from=2025-01-01T00:00:00Z&to=2025-01-03T00:00:00Z`,
      ).expect(200);
      expect(range.body.total).toBe(2);
    });
    it("rejects a concurrent stale draft edit without duplicating version history", async () => {
      const input = await fixture(),
        c = await create(input);
      const results = await Promise.all(
        [0, 1].map((i) =>
          patch(c.id).send({
            ...updateFields(input),
            reason: `Edición ${i}`,
            version: 1,
            status: "DRAFT",
          }),
        ),
      );
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(
        (await prisma.consultation.findUniqueOrThrow({ where: { id: c.id } }))
          .version,
      ).toBe(2);
      expect(
        await prisma.consultationEvent.count({
          where: { consultationId: c.id },
        }),
      ).toBe(2);
    });
    it("rejects cancelled appointments and patient mismatches without partial records", async () => {
      const input = await fixture(),
        second = await fixture(),
        a = await booking(input);
      await post(endpoint())
        .set("Cookie", cookie)
        .send({ ...second, appointmentId: a.id })
        .expect(400);
      await prisma.appointment.update({
        where: { id: a.id },
        data: { status: "CANCELLED", cancellationReason: "QA" },
      });
      await post(endpoint())
        .set("Cookie", cookie)
        .send({ ...input, appointmentId: a.id })
        .expect(409);
      expect(await prisma.consultation.count()).toBe(0);
      expect(await prisma.consultationEvent.count()).toBe(0);
    });
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
