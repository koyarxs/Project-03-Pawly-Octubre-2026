import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID, randomBytes } from "node:crypto";
import { type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ThrottlerStorage, ThrottlerStorageService } from "@nestjs/throttler";
import request from "supertest";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { configureHttp } from "../http/configure-http";
import {
  civil,
  defaultBookingPolicy,
  type BookingPolicy,
} from "./booking-policy";
import { BookingNotificationWorker } from "./booking-notification-worker";
import { availabilityNotice } from "./booking-notifications";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { createRequire } from "node:module";
import { BookingEngine } from "./booking-engine";
import { emailManagementKey } from "./booking-documents";

describe("Professional booking migration on an owned isolated schema", () => {
  let control: PrismaClient,
    db: PrismaClient,
    schema: string,
    baseline: unknown;
  let owned = false;
  let app: INestApplication,
    clinicId: string,
    slug: string,
    otherClinic: string,
    otherSlug: string,
    ownerCookie: string,
    receptionCookie: string,
    foreignCookie: string,
    doctorCookie: string,
    doctorId: string,
    secondDoctorId: string,
    ownerId: string,
    serviceId: string,
    secondServiceId: string,
    patientId: string,
    tutorId: string;
  const origin = "http://localhost:3000",
    password = "Pawly-Booking-QA-Only-123!";
  const at = (dayOffset = 3, hour = 12) => {
    const d = new Date(Date.now() + dayOffset * 86400000);
    return `${d.toISOString().slice(0, 10)}T${String(hour).padStart(2, "0")}:00:00.000Z`;
  };
  const post = (url: string, cookie?: string) => {
    const r = request(app.getHttpServer())
      .post(url)
      .set("Origin", origin)
      .set("X-Pawly-CSRF", "1");
    return cookie ? r.set("Cookie", cookie) : r;
  };
  const patch = (url: string, cookie: string) =>
    request(app.getHttpServer())
      .patch(url)
      .set("Origin", origin)
      .set("X-Pawly-CSRF", "1")
      .set("Cookie", cookie);
  const publicPath = () => `/api/bookings/${slug}`;
  const privatePath = () => `/api/clinics/${clinicId}/booking`;
  const booking = (changes: Record<string, unknown> = {}) => ({
    requestId: randomUUID(),
    managementToken: randomBytes(32).toString("base64url"),
    serviceId,
    professionalId: doctorId,
    startsAt: at(),
    ownerName: "Tutor de prueba aislada",
    ownerRut: "12345678-5",
    email: `${randomUUID()}@example.invalid`,
    phone: "+56912345678",
    petName: "Paciente QA",
    species: "DOG",
    reason: "Control de prueba",
    additionalInfo: "",
    consent: true,
    ...changes,
  });
  const policy = (): BookingPolicy => {
    const hours = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      opens: "09:00",
      closes: "18:00",
    }));
    return {
      ...structuredClone(defaultBookingPolicy),
      publicEnabled: true,
      minNoticeMinutes: 0,
      cancellationNoticeMinutes: 0,
      hours,
      professionals: [doctorId, secondDoctorId].map((membershipId) => ({
        membershipId,
        hours,
      })),
    };
  };
  const quote = (s: string) => '"' + s.replaceAll('"', '""') + '"';
  async function snapshot() {
    const tables = await control.$queryRaw<
      { table_name: string }[]
    >`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name`;
    const rows = [];
    for (const t of tables)
      rows.push({
        table: t.table_name,
        fingerprint: await control.$queryRawUnsafe(
          `SELECT count(*)::int AS count, md5(COALESCE(string_agg(row_hash, '' ORDER BY row_hash),'')) AS digest FROM (SELECT md5(row_to_json(t)::text) AS row_hash FROM public.${quote(t.table_name)} t) hashes`,
        ),
      });
    return rows;
  }
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (
      process.env.NODE_ENV === "production" ||
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      url.port !== "5433" ||
      url.pathname !== "/pawly" ||
      (url.searchParams.get("schema") || "public") !== "public"
    )
      throw new Error("Requires isolated local Pawly development database");
    url.hostname = "127.0.0.1";
    url.searchParams.set("connection_limit", "5");
    control = new PrismaClient({ datasourceUrl: url.toString() });
    baseline = await snapshot();
    schema = `pawly_booking_test_${randomUUID().replaceAll("-", "")}`;
    await control.$executeRawUnsafe(`CREATE SCHEMA ${quote(schema)}`);
    owned = true;
    url.searchParams.set("schema", schema);
    execFileSync(
      process.execPath,
      [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy"],
      {
        env: { ...process.env, DATABASE_URL: url.toString() },
        stdio: "pipe",
        timeout: 60000,
      },
    );
    db = new PrismaClient({ datasourceUrl: url.toString() });
    process.env.DATABASE_URL = url.toString();
    process.env.NODE_ENV = "test";
    process.env.CORS_ORIGINS = origin;
    process.env.MAIL_MODE = "disabled";
    const { AppModule } = await import("../app.module");
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .compile();
    app = module.createNestApplication({ logger: false });
    configureHttp(app);
    await app.init();
    // Drive delivery explicitly so the interval cannot race per-test mail settings.
    app.get(BookingNotificationWorker).onModuleDestroy();
    const c = await db.veterinaryClinic.create({
      data: {
        name: "Isolated booking clinic",
        slug: `booking-${randomUUID()}`,
      },
    });
    clinicId = c.id;
    slug = c.slug;
    const foreign = await db.veterinaryClinic.create({
      data: { name: "Other isolated clinic", slug: `other-${randomUUID()}` },
    });
    otherClinic = foreign.id;
    otherSlug = foreign.slug;
    const hash = await argon2.hash(password);
    async function account(
      role: "OWNER" | "RECEPTIONIST" | "VETERINARIAN",
      clinic: string,
    ) {
      const email = `${randomUUID()}@example.invalid`;
      const user = await db.user.create({
        data: {
          name: `QA ${role}`,
          email,
          normalizedEmail: email,
          passwordHash: hash,
        },
      });
      const member = await db.clinicMembership.create({
        data: { clinicId: clinic, userId: user.id, role },
      });
      const response = await post("/api/auth/login")
        .send({ email, password })
        .expect(200);
      return {
        member,
        cookie: String(response.get("set-cookie")?.[0]).split(";")[0]!,
      };
    }
    const owner = await account("OWNER", clinicId);
    ownerId = owner.member.id;
    ownerCookie = owner.cookie;
    receptionCookie = (await account("RECEPTIONIST", clinicId)).cookie;
    foreignCookie = (await account("OWNER", otherClinic)).cookie;
    for (const index of [0, 1]) {
      const doctor = await account("VETERINARIAN", clinicId);
      await db.staffProfile.create({
        data: {
          membershipId: doctor.member.id,
          clinicId,
          displayName: `Isolated doctor ${index}`,
          job: "VETERINARIAN",
          credentialStatus: "VERIFIED",
          credentialNumber: "QA-ONLY",
          credentialEvidence: "Synthetic isolated fixture",
          credentialVerifiedById: ownerId,
          credentialVerifiedAt: new Date(),
          medicalPracticeEnabled: true,
          publishedAt: new Date(),
          publishedConsentHash: "a".repeat(64),
          publicSnapshot: { displayName: `Public QA doctor ${index}` },
        },
      });
      if (!index) {
        doctorId = doctor.member.id;
        doctorCookie = doctor.cookie;
      } else secondDoctorId = doctor.member.id;
    }
    const service = await db.bookingService.create({
      data: {
        clinicId,
        name: "QA consultation",
        enabled: true,
        durationMinutes: 30,
        bufferMinutes: 15,
        resourceKey: "room-1",
        professionals: { create: { membershipId: doctorId } },
      },
    });
    serviceId = service.id;
    const otherService = await db.bookingService.create({
      data: {
        clinicId,
        name: "QA second consultation",
        enabled: true,
        durationMinutes: 30,
        bufferMinutes: 15,
        resourceKey: "room-1",
        professionals: { create: { membershipId: secondDoctorId } },
      },
    });
    secondServiceId = otherService.id;
    const tutor = await db.tutor.create({
      data: {
        clinicId,
        firstName: "QA",
        lastName: "Tutor",
        phone: "+56900000000",
        email: "qa@example.invalid",
      },
    });
    tutorId = tutor.id;
    const patient = await db.patient.create({
      data: {
        clinicId,
        name: "QA patient",
        species: "DOG",
        tutors: { create: { tutorId } },
      },
    });
    patientId = patient.id;
  }, 90000);
  beforeEach(async () => {
    if (!app) return;
    app.get<ThrottlerStorageService>(ThrottlerStorage).onApplicationShutdown();
    await db.bookingNotification.deleteMany();
    await db.bookingEvent.deleteMany();
    await db.bookingRequest.deleteMany();
    await db.appointmentEvent.deleteMany();
    await db.appointment.deleteMany();
    await db.bookingService.updateMany({ data: { enabled: true } });
    await db.bookingSettings.upsert({
      where: { clinicId },
      create: {
        clinicId,
        configuration: policy() as unknown as Prisma.InputJsonObject,
      },
      update: { configuration: policy() as unknown as Prisma.InputJsonObject },
    });
  });
  afterAll(async () => {
    if (app) await app.close();
    if (db) await db.$disconnect();
    if (owned) {
      if (!/^pawly_booking_test_[a-f0-9]{32}$/.test(schema))
        throw new Error("Refuse unowned cleanup");
      const tables = await control.$queryRaw<
        { table_name: string }[]
      >`SELECT table_name FROM information_schema.tables WHERE table_schema=${schema} AND table_type='BASE TABLE'`;
      await control.$executeRawUnsafe(
        `DROP TABLE ${tables.map((t) => `${quote(schema)}.${quote(t.table_name)}`).join(",")} RESTRICT`,
      );
      const enums = await control.$queryRaw<
        { typname: string }[]
      >`SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname=${schema} AND t.typtype='e'`;
      for (const e of enums)
        await control.$executeRawUnsafe(
          `DROP TYPE ${quote(schema)}.${quote(e.typname)} RESTRICT`,
        );
      const functions = await control.$queryRaw<
        { proname: string }[]
      >`SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=${schema}`;
      for (const f of functions)
        await control.$executeRawUnsafe(
          `DROP FUNCTION ${quote(schema)}.${quote(f.proname)}() RESTRICT`,
        );
      await control.$executeRawUnsafe(`DROP SCHEMA ${quote(schema)} RESTRICT`);
      expect(await snapshot()).toEqual(baseline);
    }
    if (control) await control.$disconnect();
  });
  it("stores tutor identity and protects private clinical documents across roles and clinics", async () => {
    const newTutor = {firstName:"QA identity",lastName:"Tutor",phone:"+56912345678"};
    await post(`/api/clinics/${clinicId}/tutors`, receptionCookie).send(newTutor).expect(400);
    await post(`/api/clinics/${clinicId}/tutors`, receptionCookie).send({...newTutor,rut:"12345678-5"}).expect(201);
    const tutorPath = `/api/clinics/${clinicId}/tutors/${tutorId}`;
    await request(app.getHttpServer()).patch(tutorPath).set("Origin", origin).set("X-Pawly-CSRF", "1").set("Cookie", receptionCookie).send({rut:"12.345.678-5",insuranceType:"FONASA",fonasaGroup:"B"}).expect(200);
    const tutor = await request(app.getHttpServer()).get(tutorPath).set("Cookie", receptionCookie).expect(200);
    expect(tutor.body).toMatchObject({rut:"12345678-5",insuranceType:"FONASA",fonasaGroup:"B"});
    const endpoint = `/api/clinics/${clinicId}/patients/${patientId}/documents`;
    const pdf = Buffer.from("%PDF-1.4\nQA isolated fixture\n%%EOF");
    await post(endpoint, receptionCookie).attach("file",pdf,"exam.pdf").expect(403);
    await post(endpoint, doctorCookie).attach("file",Buffer.from("<script>bad()</script>"),"fake.pdf").expect(400);
    const uploaded = await post(endpoint, doctorCookie).attach("file",pdf,"exam.pdf").expect(201);
    const listing = await request(app.getHttpServer()).get(endpoint).set("Cookie",doctorCookie).expect(200);
    expect(listing.body).toEqual(expect.arrayContaining([expect.objectContaining({id:uploaded.body.id,name:"exam.pdf"})]));
    expect(listing.body[0]).not.toHaveProperty("content");
    const downloaded = await request(app.getHttpServer()).get(`${endpoint}/${uploaded.body.id}`).set("Cookie",doctorCookie).expect(200);
    expect(downloaded.headers["content-disposition"]).toContain("attachment");
    expect(downloaded.headers["cache-control"]).toContain("no-store");
    await request(app.getHttpServer()).get(`${endpoint}/${uploaded.body.id}`).set("Cookie",foreignCookie).expect(403);
    await request(app.getHttpServer()).get(`${endpoint}/${uploaded.body.id}`).expect(401);
    await db.patientDocument.delete({where:{id:uploaded.body.id}});
  });

  it("creates the booking tables, optional appointment links and arrival/no-show states", async () => {
    const tables = await db.$queryRaw<
      { table_name: string }[]
    >`SELECT table_name FROM information_schema.tables WHERE table_schema=${schema} AND table_name LIKE 'Booking%'`;
    expect(tables.map((t) => t.table_name).sort()).toEqual([
      "BookingEvent",
      "BookingNotification",
      "BookingRequest",
      "BookingService",
      "BookingServiceProfessional",
      "BookingSettings",
    ]);
    const columns = await db.$queryRaw<
      { column_name: string }[]
    >`SELECT column_name FROM information_schema.columns WHERE table_schema=${schema} AND table_name='Appointment'`;
    expect(columns.map((c) => c.column_name)).toEqual(
      expect.arrayContaining([
        "serviceId",
        "source",
        "blockedUntil",
        "resourceKey",
      ]),
    );
    const states = await db.$queryRaw<
      { enumlabel: string }[]
    >`SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname=${schema} AND t.typname='AppointmentStatus'`;
    expect(states.map((s) => s.enumlabel)).toEqual(
      expect.arrayContaining(["ARRIVED", "NO_SHOW"]),
    );
  });
  it("requires browser origin, consent and strict public DTOs", async () => {
    await request(app.getHttpServer())
      .post(publicPath())
      .send(booking())
      .expect(403);
    await post(publicPath())
      .send(booking({ consent: false }))
      .expect(400);
    await post(publicPath())
      .send(booking({ clinicId: otherClinic }))
      .expect(400);
    app.get<ThrottlerStorageService>(ThrottlerStorage).onApplicationShutdown();
    await post(publicPath())
      .send(booking({ website: "spam" }))
      .expect(400);
    await request(app.getHttpServer())
      .get(`${privatePath()}/settings`)
      .expect(401);
  });
  it("creates a pending reservation without manufacturing clinical identities or leaking contacts", async () => {
    const tutorCount = await db.tutor.count({ where: { clinicId } });
    const input = booking();
    const response = await post(publicPath()).send(input).expect(201);
    expect(response.body).toMatchObject({
      status: "PENDING",
      confirmed: false,
    });
    expect(response.body).not.toHaveProperty("email");
    expect(response.body).not.toHaveProperty("tokenHash");
    expect(await db.appointment.count()).toBe(0);
    expect(await db.bookingEvent.count()).toBe(1);
    expect(await db.tutor.count({ where: { clinicId } })).toBe(tutorCount);
    expect(await db.patient.count({ where: { clinicId } })).toBe(1);
  });
  it("exposes only published enabled professionals and actual availability", async () => {
    const catalog = await request(app.getHttpServer())
      .get(publicPath())
      .expect(200);
    expect(catalog.body.professionals[0]).not.toHaveProperty("email");
    expect(
      catalog.body.professionals.map((p: { id: string }) => p.id),
    ).toContain(doctorId);
    const query = `?serviceId=${serviceId}&date=${at().slice(0, 10)}&professionalId=${doctorId}`;
    const before = await request(app.getHttpServer())
      .get(`${publicPath()}/availability${query}`)
      .expect(200);
    expect(
      before.body.slots.map((s: { startsAt: string }) => s.startsAt),
    ).toContain(at());
    await post(publicPath()).send(booking()).expect(201);
    const after = await request(app.getHttpServer())
      .get(`${publicPath()}/availability${query}`)
      .expect(200);
    expect(
      after.body.slots.map((s: { startsAt: string }) => s.startsAt),
    ).not.toContain(at());
    await request(app.getHttpServer())
      .get(
        `${publicPath()}/availability?serviceId=${serviceId}&date=2026-02-30&professionalId=${doctorId}`,
      )
      .expect(400);
  });
  it("rejects outside hours, blocked times and professional absence", async () => {
    await post(publicPath())
      .send(booking({ startsAt: at(3, 6) }))
      .expect(409);
    const p = policy();
    p.blocks = [
      {
        id: randomUUID(),
        professionalId: doctorId,
        resourceKey: null,
        startsAt: at(3, 10),
        endsAt: at(3, 18),
        reason: "QA leave",
        kind: "ABSENCE",
      },
    ];
    await db.bookingSettings.update({
      where: { clinicId },
      data: { configuration: p as unknown as Prisma.InputJsonObject },
    });
    await post(publicPath()).send(booking()).expect(409);
  });
  it("rejects disabled services and another clinic's service identifiers", async () => {
    await db.bookingService.update({
      where: { id: serviceId },
      data: { enabled: false },
    });
    await post(publicPath()).send(booking()).expect(400);
    await post(publicPath())
      .send(booking({ serviceId: randomUUID() }))
      .expect(400);
  });
  it("allows only one simultaneous reservation and retries idempotently", async () => {
    const first = booking(),
      second = booking({ phone: "+56911111111" });
    const responses = await Promise.all([
      post(publicPath()).send(first),
      post(publicPath()).send(second),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const winner = responses[0]!.status === 201 ? first : second;
    const repeat = await post(publicPath()).send(winner).expect(201);
    expect(repeat.body.status).toBe("PENDING");
    expect(await db.bookingRequest.count()).toBe(1);
    expect(await db.bookingEvent.count()).toBe(1);
  });
  it("serializes a public reservation against a private appointment", async () => {
    const responses = await Promise.all([
      post(publicPath()).send(booking()),
      post(`/api/clinics/${clinicId}/appointments`, ownerCookie).send({
        patientId,
        tutorId,
        professionalMembershipId: doctorId,
        serviceId,
        startsAt: at(),
        durationMinutes: 30,
        reason: "Private QA appointment",
      }),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(
      (await db.bookingRequest.count()) + (await db.appointment.count()),
    ).toBe(1);
  });
  it("respects shared resources and preparation intervals between professionals", async () => {
    await post(publicPath()).send(booking()).expect(201);
    await post(publicPath())
      .send(
        booking({
          professionalId: secondDoctorId,
          serviceId: secondServiceId,
          phone: "+56922222222",
        }),
      )
      .expect(409);
    const next = new Date(Date.parse(at()) + 30 * 60000).toISOString();
    await post(publicPath())
      .send(booking({ startsAt: next, phone: "+56933333333" }))
      .expect(409);
  });
  it("uses an unguessable management token and never allows cross-clinic lookups", async () => {
    const input = booking();
    const created = await post(publicPath()).send(input).expect(201);
    const identity = {
      reference: created.body.reference,
      managementToken: input.managementToken,
    };
    await post(`${publicPath()}/lookup`)
      .send({
        ...identity,
        managementToken: randomBytes(32).toString("base64url"),
      })
      .expect(404);
    await post(`/api/bookings/${otherSlug}/lookup`).send(identity).expect(404);
    const lookup = await post(`${publicPath()}/lookup`)
      .send(identity)
      .expect(201);
    expect(lookup.body.petName).toBe("Paciente QA");
    expect(lookup.body).not.toHaveProperty("tokenHash");
  });
  it("reprograms, rejects stale versions and cancels without losing the history", async () => {
    const input = booking();
    const created = await post(publicPath()).send(input).expect(201);
    const identity = {
      reference: created.body.reference,
      managementToken: input.managementToken,
    };
    await post(`${publicPath()}/reschedule`)
      .send({ ...identity, version: 1, startsAt: at(4) })
      .expect(201);
    await post(`${publicPath()}/reschedule`)
      .send({ ...identity, version: 1, startsAt: at(5) })
      .expect(409);
    const cancelled = await post(`${publicPath()}/cancel`)
      .send({ ...identity, reason: "QA cancellation" })
      .expect(201);
    expect(cancelled.body.status).toBe("CANCELLED");
    expect(await db.bookingEvent.count()).toBe(3);
    expect(await db.bookingRequest.count()).toBe(1);
  });
  it("checks role permissions, scope and configuration versions on the server", async () => {
    const settings = await request(app.getHttpServer())
      .get(`${privatePath()}/settings`)
      .set("Cookie", ownerCookie)
      .expect(200);
    await patch(`${privatePath()}/settings`, receptionCookie)
      .send({ version: settings.body.version, configuration: policy() })
      .expect(403);
    await patch(`${privatePath()}/settings`, foreignCookie)
      .send({ version: settings.body.version, configuration: policy() })
      .expect(403);
    await patch(`${privatePath()}/settings`, ownerCookie)
      .send({ version: 999, configuration: policy() })
      .expect(409);
    await post(`${privatePath()}/services`, receptionCookie)
      .send({})
      .expect(403);
  });
  it("confirms and safely links only an existing related tutor and patient", async () => {
    const input = booking();
    const created = await post(publicPath()).send(input).expect(201);
    const url = `${privatePath()}/requests/${created.body.reference}`;
    await patch(url, foreignCookie)
      .send({ action: "CONFIRM", version: 1 })
      .expect(403);
    await patch(url, ownerCookie)
      .send({ action: "CONFIRM", version: 1 })
      .expect(200);
    await patch(url, ownerCookie)
      .send({
        action: "LINK_PATIENT",
        version: 2,
        patientId: randomUUID(),
        tutorId,
      })
      .expect(404);
    const linked = await patch(url, ownerCookie)
      .send({ action: "LINK_PATIENT", version: 2, patientId, tutorId })
      .expect(200);
    expect(linked.body.status).toBe("CONVERTED");
    const appointment = await db.appointment.findUniqueOrThrow({
      where: { id: linked.body.appointmentId },
    });
    expect(appointment).toMatchObject({
      source: "PUBLIC",
      clinicId,
      patientId,
      tutorId,
      serviceId,
      status: "CONFIRMED",
    });
    const history = await request(app.getHttpServer())
      .get(`${url}/history`)
      .set("Cookie", ownerCookie)
      .expect(200);
    expect(history.body).toHaveLength(3);
    expect(
      await db.bookingNotification.count({
        where: { clinicId, kind: "CONFIRMED" },
      }),
    ).toBe(1);
    await db.bookingNotification.deleteMany();
    await patch(
      `/api/clinics/${clinicId}/appointments/${appointment.id}`,
      ownerCookie,
    )
      .send({
        patientId,
        tutorId,
        professionalMembershipId: doctorId,
        serviceId,
        startsAt: at(4),
        durationMinutes: 30,
        reason: appointment.reason,
        version: 1,
        status: "CONFIRMED",
      })
      .expect(200);
    expect(
      await db.bookingNotification.findFirst({
        where: { clinicId, kind: "RESCHEDULED" },
        select: { bookingId: true },
      }),
    ).toEqual({ bookingId: created.body.reference });
  });
  it("enforces arrival, medical progression and future no-show restrictions", async () => {
    const created = await post(
      `/api/clinics/${clinicId}/appointments`,
      ownerCookie,
    )
      .send({
        patientId,
        tutorId,
        professionalMembershipId: doctorId,
        serviceId,
        startsAt: at(),
        durationMinutes: 30,
        reason: "Clinical transition QA",
      })
      .expect(201);
    const input = {
      patientId,
      tutorId,
      professionalMembershipId: doctorId,
      serviceId,
      startsAt: at(),
      durationMinutes: 30,
      reason: "Clinical transition QA",
      version: 1,
      status: "NO_SHOW",
    };
    const url = `/api/clinics/${clinicId}/appointments/${created.body.id}`;
    await patch(url, ownerCookie).send(input).expect(400);
    await patch(url, ownerCookie)
      .send({ ...input, status: "ARRIVED" })
      .expect(200);
    await patch(url, ownerCookie)
      .send({ ...input, version: 2, status: "IN_PROGRESS" })
      .expect(403);
    await patch(url, doctorCookie)
      .send({ ...input, version: 2, status: "IN_PROGRESS" })
      .expect(200);
    await patch(url, doctorCookie)
      .send({ ...input, version: 3, status: "COMPLETED" })
      .expect(200);
    await patch(url, doctorCookie)
      .send({ ...input, version: 4, status: "CONFIRMED" })
      .expect(409);
  });
  it("limits repeated contacts and does not fake notification delivery", async () => {
    for (const day of [3, 4, 5])
      await post(publicPath())
        .send(booking({ startsAt: at(day) }))
        .expect(201);
    app.get<ThrottlerStorageService>(ThrottlerStorage).onApplicationShutdown();
    await post(publicPath())
      .send(booking({ startsAt: at(6) }))
      .expect(429);
    await app.get(BookingNotificationWorker).flush();
    await app.get(BookingNotificationWorker).flush();
    expect(
      await db.bookingNotification.count({ where: { state: "SENT" } }),
    ).toBe(0);
    expect(
      await db.bookingNotification.count({ where: { state: "DISABLED" } }),
    ).toBe(3);
  });
  it("saves service and clinic settings with append-only audit events", async () => {
    const service = await post(`${privatePath()}/services`, ownerCookie)
      .send({
        version: 0,
        name: "Servicio administrativo QA",
        description: "Prueba aislada",
        durationMinutes: 45,
        bufferMinutes: 10,
        resourceKey: null,
        enabled: true,
        professionalIds: [doctorId],
      })
      .expect(201);
    const state = await db.bookingSettings.findUniqueOrThrow({
      where: { clinicId },
    });
    await patch(`${privatePath()}/settings`, ownerCookie)
      .send({
        version: state.version,
        configuration: policy(),
        timezone: "America/Santiago",
      })
      .expect(200);
    expect(
      await db.accessAuditLog.count({
        where: {
          clinicId,
          action: { in: ["BOOKING_SETTINGS", "BOOKING_SERVICE"] },
        },
      }),
    ).toBeGreaterThanOrEqual(2);
    await db.bookingService.update({
      where: { id: service.body.id },
      data: { enabled: false },
    });
  });
  it("notifies only affected future bookings when a service or own schedule changes", async () => {
    await post(publicPath()).send(booking()).expect(201);
    let state = await db.bookingSettings.findUniqueOrThrow({
      where: { clinicId },
    });
    await patch(`${privatePath()}/my-availability`, doctorCookie)
      .send({ version: state.version, hours: policy().hours })
      .expect(200);
    await post(`${privatePath()}/services`, ownerCookie)
      .send({
        id: serviceId,
        version: (
          await db.bookingService.findUniqueOrThrow({
            where: { id: serviceId },
          })
        ).version,
        name: "Consulta QA",
        description: "Cambio QA",
        durationMinutes: 30,
        bufferMinutes: 10,
        resourceKey: null,
        enabled: true,
        professionalIds: [doctorId],
      })
      .expect(201);
    const notices = await db.bookingNotification.findMany({
      where: { clinicId, kind: "AVAILABILITY_CHANGED" },
    });
    expect(notices).toHaveLength(2);
    const count = await db.bookingNotification.count();
    state = await db.bookingSettings.findUniqueOrThrow({ where: { clinicId } });
    await db.$transaction((tx) =>
      availabilityNotice(
        tx,
        clinicId,
        `professional:${doctorId}`,
        state.version,
        { professionalId: doctorId },
      ),
    );
    expect(await db.bookingNotification.count()).toBe(count);
  });
  it("preserves inactive staff configuration without allowing new assignments to them", async () => {
    await db.clinicMembership.update({
      where: { id: secondDoctorId },
      data: { status: "SUSPENDED" },
    });
    try {
      const state = await db.bookingSettings.findUniqueOrThrow({
        where: { clinicId },
      });
      await patch(`${privatePath()}/settings`, ownerCookie)
        .send({ version: state.version, configuration: policy() })
        .expect(200);
      const edited = policy();
      edited.professionals[1]!.hours = [
        { weekday: 1, opens: "10:00", closes: "11:00" },
      ];
      await patch(`${privatePath()}/settings`, ownerCookie)
        .send({ version: state.version + 1, configuration: edited })
        .expect(400);
      expect(
        (
          await app.get(PrismaService).clinicMembership.findUniqueOrThrow({
            where: { id: secondDoctorId },
          })
        ).status,
      ).toBe("SUSPENDED");
    } finally {
      await db.clinicMembership.update({
        where: { id: secondDoctorId },
        data: { status: "ACTIVE" },
      });
    }
  });
  it("lets a verified professional edit only their own working hours", async () => {
    const state = await db.bookingSettings.findUniqueOrThrow({
      where: { clinicId },
    });
    const hours = [{ weekday: 1, opens: "10:00", closes: "16:00" }];
    await patch(`${privatePath()}/my-availability`, receptionCookie)
      .send({ version: state.version, hours })
      .expect(403);
    await patch(`${privatePath()}/my-availability`, doctorCookie)
      .send({ version: state.version, hours, membershipId: secondDoctorId })
      .expect(400);
    await patch(`${privatePath()}/my-availability`, doctorCookie)
      .send({ version: state.version, hours })
      .expect(200);
    const stored = (
      await db.bookingSettings.findUniqueOrThrow({ where: { clinicId } })
    ).configuration as unknown as BookingPolicy;
    expect(
      stored.professionals.find((p) => p.membershipId === doctorId)?.hours,
    ).toEqual(hours);
    expect(
      stored.professionals.find((p) => p.membershipId === secondDoctorId)
        ?.hours,
    ).toEqual(policy().hours);
  });
  it("preserves an existing reservation duration when the service is edited", async () => {
    const created = await post(publicPath()).send(booking()).expect(201);
    await db.bookingService.update({
      where: { id: serviceId },
      data: { durationMinutes: 60, enabled: false },
    });
    try {
      await patch(
        `${privatePath()}/requests/${created.body.reference}`,
        ownerCookie,
      )
        .send({ action: "LINK_PATIENT", version: 1, patientId, tutorId })
        .expect(200);
      const record = await db.appointment.findFirstOrThrow({
        where: { clinicId },
      });
      expect(record.endsAt.valueOf() - record.startsAt.valueOf()).toBe(
        30 * 60000,
      );
    } finally {
      await db.bookingService.update({
        where: { id: serviceId },
        data: { durationMinutes: 30 },
      });
    }
  });
  it("protects reservation PDF and calendar downloads with tenant-scoped credentials", async () => {
    const input = booking();
    const created = await post(publicPath()).send(input).expect(201);
    const access = { reference: created.body.reference, managementToken: input.managementToken };
    await post(`${publicPath()}/receipt`).send({ ...access, managementToken: randomBytes(32).toString("base64url") }).expect(404);
    await post(`/api/bookings/${otherSlug}/receipt`).send(access).expect(404);
    const pdf = await post(`${publicPath()}/receipt`).send(access).expect(201);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect(pdf.headers["cache-control"]).toContain("no-store");
    expect(pdf.body.subarray(0, 4).toString()).toBe("%PDF");
    await post(`${publicPath()}/calendar`).send(access).expect(409);
    await patch(`${privatePath()}/requests/${access.reference}`, ownerCookie).send({ action: "CONFIRM", version: 1 }).expect(200);
    const calendar = await post(`${publicPath()}/calendar`).send(access).expect(201);
    expect(calendar.text).toContain("METHOD:PUBLISH");
    expect(calendar.text).toContain("STATUS:CONFIRMED");
  });
  it("allows signed email management links but rejects a different clinic or forged key", async () => {
    const input = booking();
    const created = await post(publicPath()).send(input).expect(201);
    const config = app.get(ConfigService);
    const previous = config.get<string>("BOOKING_LINK_SECRET");
    config.set("BOOKING_LINK_SECRET", "integration-secret-for-email-links-123456");
    try {
      const row = await db.bookingRequest.findUniqueOrThrow({ where: { id: created.body.reference } });
      const key = emailManagementKey(row, config.get<string>("BOOKING_LINK_SECRET"))!;
      await post(`${publicPath()}/lookup`).send({ reference: row.id, managementToken: key }).expect(201);
      await post(`/api/bookings/${otherSlug}/lookup`).send({ reference: row.id, managementToken: key }).expect(404);
      await post(`${publicPath()}/lookup`).send({ reference: row.id, managementToken: randomBytes(32).toString("base64url") }).expect(404);
    } finally { config.set("BOOKING_LINK_SECRET", previous); }
  });
  it("reports retryable mail as queued and recovers delivery status after retry", async () => {
    const input = booking();
    const created = await post(publicPath()).send(input).expect(201);
    const access = { reference: created.body.reference, managementToken: input.managementToken };
    const config = app.get(ConfigService);
    const previousMode = config.get("MAIL_MODE"), previousPassword = config.get("MAIL_PASSWORD");
    await db.bookingNotification.updateMany({ where: { bookingId: access.reference }, data: { state: "FAILED", attempts: 1, deliverAt: new Date(Date.now() + 86400000) } });
    config.set("MAIL_MODE", "smtp"); config.set("MAIL_PASSWORD", "isolated-status-fixture");
    try {
      const queued = await post(`${publicPath()}/lookup`).send(access).expect(201);
      expect(queued.body.emailDelivery).toBe("queued");
      await db.bookingNotification.updateMany({ where: { bookingId: access.reference }, data: { attempts: 3 } });
      const failed = await post(`${publicPath()}/lookup`).send(access).expect(201);
      expect(failed.body.emailDelivery).toBe("failed");
      await db.bookingNotification.updateMany({ where: { bookingId: access.reference }, data: { state: "SENT", deliveredAt: new Date() } });
      const sent = await post(`${publicPath()}/lookup`).send(access).expect(201);
      expect(sent.body.emailDelivery).toBe("sent");
      await db.bookingRequest.update({ where: { id: access.reference }, data: { status: "CONFIRMED" } });
      await db.bookingNotification.updateMany({ where: { bookingId: access.reference }, data: { state: "SKIPPED", createdAt: new Date(Date.now() + 1000) } });
      await db.bookingNotification.create({ data: { clinicId, bookingId: access.reference, eventKey: `booking:${access.reference}:confirmed-status-check`, kind: "CONFIRMED", state: "SENT", deliveredAt: new Date(), deliverAt: new Date() } });
      const confirmed = await post(`${publicPath()}/lookup`).send(access).expect(201);
      expect(confirmed.body.emailDelivery).toBe("sent");
    } finally { config.set("MAIL_MODE", previousMode); config.set("MAIL_PASSWORD", previousPassword); }
  });
  it("captures a notification in local Mailpit once and never enables external delivery", async () => {
    await post(publicPath()).send(booking()).expect(201);
    const config = app.get(ConfigService);
    config.set("MAIL_MODE", "local");
    config.set("MAIL_HOST", "127.0.0.1");
    config.set("MAIL_PORT", 1025);
    try {
      await app.get(BookingNotificationWorker).flush();
      await app.get(BookingNotificationWorker).flush();
      const notices = await db.bookingNotification.findMany();
      expect(notices).toHaveLength(1);
      expect(notices[0]).toMatchObject({ state: "CAPTURED", attempts: 1 });
    } finally {
      config.set("MAIL_MODE", "disabled");
    }
  });
  it("auto-confirms only when explicitly configured and records idempotent reminders", async () => {
    await db.bookingSettings.update({
      where: { clinicId },
      data: {
        configuration: {
          ...policy(),
          autoConfirm: true,
          autoAssign: true,
        } as unknown as Prisma.InputJsonObject,
      },
    });
    const input = booking();
    delete (input as { professionalId?: string }).professionalId;
    const created = await post(publicPath()).send(input).expect(201);
    expect(created.body).toMatchObject({
      status: "CONFIRMED",
      confirmed: true,
      professionalId: doctorId,
    });
    await post(`${publicPath()}/reschedule`)
      .send({
        reference: created.body.reference,
        managementToken: input.managementToken,
        version: 1,
        startsAt: at(4),
      })
      .expect(201);
    await db.bookingNotification.updateMany({
      data: { deliverAt: new Date() },
    });
    await app.get(BookingNotificationWorker).flush();
    const reminders = await db.bookingNotification.findMany({
      where: { kind: "REMINDER" },
    });
    expect(reminders).toHaveLength(2);
    expect(reminders.filter((r) => r.state === "SKIPPED")).toHaveLength(1);
  });
  it("removes only an unused service and preserves referenced service history", async () => {
    const created = await post(`${privatePath()}/services`, ownerCookie)
      .send({
        version: 0,
        name: "Eliminar QA",
        description: "Prueba",
        durationMinutes: 30,
        bufferMinutes: 0,
        resourceKey: null,
        enabled: false,
        professionalIds: [],
      })
      .expect(201);
    await post(
      `${privatePath()}/services/${created.body.id}/remove`,
      receptionCookie,
    )
      .send({ version: 1 })
      .expect(403);
    await post(
      `${privatePath()}/services/${created.body.id}/remove`,
      ownerCookie,
    )
      .send({ version: 2 })
      .expect(409);
    await post(
      `${privatePath()}/services/${created.body.id}/remove`,
      ownerCookie,
    )
      .send({ version: 1 })
      .expect(201);
    expect(
      await db.bookingService.findUnique({ where: { id: created.body.id } }),
    ).toBeNull();
    await post(publicPath()).send(booking()).expect(201);
    await post(`${privatePath()}/services/${serviceId}/remove`, ownerCookie)
      .send({
        version: (
          await db.bookingService.findUniqueOrThrow({
            where: { id: serviceId },
          })
        ).version,
      })
      .expect(409);
  });
  it("seeds an editable isolated demo without verifying fictitious medical credentials or allowing production bookings", async () => {
    const load = createRequire(path.resolve("package.json"));
    const { seedBookingDemo } = load("./scripts/booking-demo.cjs") as {
      seedBookingDemo: (
        db: PrismaClient,
        userId: string,
      ) => Promise<{ id: string; slug: string }>;
    };
    const owner = await db.clinicMembership.findUniqueOrThrow({
      where: { id: ownerId },
    });
    const demo = await seedBookingDemo(db, owner.userId);
    const editable = await db.bookingService.findFirstOrThrow({
      where: { clinicId: demo.id, name: "Control médico" },
    });
    await db.bookingService.update({
      where: { id: editable.id },
      data: { name: "Control editado QA" },
    });
    await seedBookingDemo(db, owner.userId);
    expect(
      (
        await db.bookingService.findUniqueOrThrow({
          where: { id: editable.id },
        })
      ).name,
    ).toBe("Control editado QA");
    expect(
      await db.bookingService.count({ where: { clinicId: demo.id } }),
    ).toBe(12);
    expect(
      await db.staffProfile.count({
        where: { clinicId: demo.id, credentialStatus: "VERIFIED" },
      }),
    ).toBe(0);
    expect(
      await db.staffProfile.count({
        where: { clinicId: demo.id, publishedAt: { not: null } },
      }),
    ).toBe(0);
    const config = app.get(ConfigService),
      engine = app.get(BookingEngine);
    const previous = config.get("BOOKING_DEMO_CLINIC_ID");
    config.set("BOOKING_DEMO_CLINIC_ID", demo.id);
    try {
      const catalog = await request(app.getHttpServer())
        .get(`/api/bookings/${demo.slug}`)
        .expect(200);
      expect(catalog.body.demo).toBe(true);
      expect(await db.patient.count({ where: { clinicId: demo.id } })).toBe(8);
      const patient = await db.patient.findFirstOrThrow({
        where: { clinicId: demo.id },
        include: { tutors: true },
      });
      const general = await db.bookingService.findFirstOrThrow({
        where: { clinicId: demo.id, name: "Consulta veterinaria general" },
        include: { professionals: true },
      });
      const day = new Date(Date.now() + 3 * 86400000);
      while (day.getUTCDay() === 0) day.setUTCDate(day.getUTCDate() + 1);
      const available = await engine.slots(
        demo.id,
        {
          serviceId: general.id,
          professionalId: general.professionals[0]!.membershipId,
          date: day.toISOString().slice(0, 10),
        },
        false,
      );
      const simulated = await post(
        `/api/clinics/${demo.id}/appointments`,
        ownerCookie,
      )
        .send({
          patientId: patient.id,
          tutorId: patient.tutors[0]!.tutorId,
          serviceId: general.id,
          professionalMembershipId: general.professionals[0]!.membershipId,
          startsAt: available.slots[0]!.startsAt,
          durationMinutes: 30,
          reason: "Atención ficticia de simulación",
        })
        .expect(201);
      const changes = {
        patientId: patient.id,
        tutorId: patient.tutors[0]!.tutorId,
        serviceId: general.id,
        professionalMembershipId: general.professionals[0]!.membershipId,
        startsAt: available.slots[0]!.startsAt,
        durationMinutes: 30,
        reason: "Atención ficticia de simulación",
      };
      await patch(
        `/api/clinics/${demo.id}/appointments/${simulated.body.id}`,
        ownerCookie,
      )
        .send({ ...changes, version: 1, status: "IN_PROGRESS" })
        .expect(200);
      await patch(
        `/api/clinics/${demo.id}/appointments/${simulated.body.id}`,
        ownerCookie,
      )
        .send({ ...changes, version: 2, status: "COMPLETED" })
        .expect(200);
      expect(catalog.body.professionals).toHaveLength(3);
      expect(
        catalog.body.professionals.every((p: { name: string }) =>
          p.name.includes("[DEMO]"),
        ),
      ).toBe(true);
      const vaccine = await db.bookingService.findFirstOrThrow({
        where: { clinicId: demo.id, name: "Vacunación" },
        include: { professionals: true },
      });
      const monday = new Date(Date.now() + 86400000);
      while (monday.getUTCDay() !== 1)
        monday.setUTCDate(monday.getUTCDate() + 1);
      const slots = await engine.slots(
        demo.id,
        {
          serviceId: vaccine.id,
          professionalId: vaccine.professionals[0]!.membershipId,
          date: monday.toISOString().slice(0, 10),
        },
        true,
      );
      expect(slots.slots.length).toBeGreaterThan(0);
      for (const slot of slots.slots) {
        const start = civil(new Date(slot.startsAt), "America/Santiago").minute;
        expect(
          (start >= 9 * 60 && start + 20 <= 14 * 60) ||
            (start >= 15 * 60 && start + 20 <= 19 * 60),
        ).toBe(true);
        expect(Date.parse(slot.endsAt) - Date.parse(slot.startsAt)).toBe(
          20 * 60000,
        );
      }
      config.set("NODE_ENV", "production");
      await db.user.update({
        where: { id: owner.userId },
        data: { emailVerifiedAt: new Date() },
      });
      await request(app.getHttpServer())
        .get(`/api/clinics/${demo.id}/consultations`)
        .set(
          "Cookie",
          ownerCookie.replace(/^pawly_session=/, "__Host-pawly_session="),
        )
        .expect(403);
      expect(await engine.professionals(db, demo.id)).toEqual([]);
      const closed = await request(app.getHttpServer())
        .get(`/api/bookings/${demo.slug}`)
        .expect(200);
      expect(closed.body.available).toBe(false);
    } finally {
      config.set("NODE_ENV", "test");
      config.set("BOOKING_DEMO_CLINIC_ID", previous);
    }
  });
  it("keeps every booking relation tenant scoped and enforces bounds", async () => {
    const constraints = await db.$queryRaw<
      { name: string; definition: string }[]
    >`SELECT c.conname AS name, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid JOIN pg_namespace n ON n.oid=r.relnamespace WHERE n.nspname=${schema} AND r.relname LIKE 'Booking%'`;
    for (const c of constraints.filter(
      (c) => c.name.endsWith("_fkey") && !c.name.endsWith("_clinicId_fkey"),
    ))
      expect(c.definition).toContain('"clinicId"');
    expect(constraints.map((c) => c.name)).toEqual(
      expect.arrayContaining([
        "BookingRequest_bounds",
        "BookingService_bounds",
        "BookingNotification_target",
      ]),
    );
    const clinic = await db.veterinaryClinic.create({
      data: { name: "Isolated booking QA", slug: randomUUID() },
    });
    const id = randomUUID();
    await expect(
      db.$executeRaw`INSERT INTO "BookingService" ("id","clinicId","name","durationMinutes","updatedAt") VALUES (${id}::uuid,${clinic.id}::uuid,'Invalid',0,now())`,
    ).rejects.toThrow();
    await expect(
      db.$executeRaw`INSERT INTO "BookingService" ("id","clinicId","name","durationMinutes","updatedAt") VALUES (${id}::uuid,${randomUUID()}::uuid,'Foreign',30,now())`,
    ).rejects.toThrow();
  });
});
