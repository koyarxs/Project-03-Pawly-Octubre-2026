// Use the existing appointment service; one explicitly labelled historical fixture initializes history.
const path = require("node:path");
process.loadEnvFile(".env");
const url = new URL(process.env.DATABASE_URL || "");
if (
  !["development", "test"].includes(process.env.NODE_ENV || "") ||
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.port !== "5433" ||
  url.pathname !== "/pawly" ||
  !process.env.BOOKING_DEMO_CLINIC_ID
)
  throw new Error("Local demo configuration required");
url.hostname = "127.0.0.1";
url.searchParams.set("connection_limit", "5");
process.env.DATABASE_URL = url.toString();
process.env.MAIL_MODE = "disabled"; // Only this initializer; the live backend keeps its Mailpit configuration.
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require(path.resolve("dist/app.module.js"));
const { PrismaService } = require(
  path.resolve("dist/prisma/prisma.service.js"),
);
const { AppointmentsService } = require(
  path.resolve("dist/appointments/appointments.service.js"),
);
const { BookingEngine } = require(
  path.resolve("dist/appointments/booking-engine.js"),
);
const { UpdateAppointmentDto } = require(
  path.resolve("dist/appointments/appointments.dto.js"),
);
(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  try {
    const db = app.get(PrismaService),
      engine = app.get(BookingEngine),
      appointments = app.get(AppointmentsService),
      clinicId = process.env.BOOKING_DEMO_CLINIC_ID;
    const clinic = await db.veterinaryClinic.findUniqueOrThrow({
      where: { id: clinicId },
    });
    if (!clinic.name.includes("DEMOSTRACIÓN") || !engine.isDemoClinic(clinicId))
      throw new Error("Unexpected clinic");
    const actor = await db.clinicMembership.findFirstOrThrow({
      where: {
        clinicId,
        role: "OWNER",
        staffProfile: { credentialEvidence: "PAWLY_BOOKING_DEMO_ONLY" },
      },
    });
    const patients = await db.patient.findMany({
      where: { clinicId, name: { startsWith: "[DEMO]" } },
      include: { tutors: true },
      orderBy: { name: "asc" },
    });
    const service = await db.bookingService.findFirstOrThrow({
      where: { clinicId, name: "Consulta veterinaria general", enabled: true },
      include: { professionals: true },
    });
    let created = 0;
    for (let i = 0; i < 6; i++) {
      const reason = `[DEMO] Escenario de agendamiento ${i + 1}`;
      if (await db.appointment.findFirst({ where: { clinicId, reason } }))
        continue;
      const patient = patients[i % patients.length],
        professionalId =
          service.professionals[i % service.professionals.length].membershipId;
      let slot;
      for (let offset = Math.floor(i / 3); offset < 10; offset++) {
        const day = new Intl.DateTimeFormat("en-CA", {
          timeZone: clinic.timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(Date.now() + offset * 86400000));
        slot = (
          await engine.slots(
            clinicId,
            { serviceId: service.id, professionalId, date: day },
            false,
          )
        ).slots[0];
        if (slot) break;
      }
      if (!slot || !patient?.tutors.length)
        throw new Error("Demo availability or patient missing");
      const input = {
        patientId: patient.id,
        tutorId: patient.tutors[0].tutorId,
        professionalMembershipId: professionalId,
        serviceId: service.id,
        startsAt: slot.startsAt,
        durationMinutes: service.durationMinutes,
        reason,
      };
      let row = await appointments.save(clinicId, actor.userId, input);
      const steps = [
        [],
        ["CONFIRMED"],
        ["CONFIRMED", "ARRIVED"],
        ["CONFIRMED", "ARRIVED", "IN_PROGRESS"],
        ["CONFIRMED", "ARRIVED", "IN_PROGRESS", "COMPLETED"],
        ["CANCELLED"],
      ][i];
      for (const status of steps)
        row = await appointments.save(
          clinicId,
          actor.userId,
          Object.assign(new UpdateAppointmentDto(), {
            ...input,
            version: row.version,
            status,
            cancellationReason:
              status === "CANCELLED" ? "Cancelación ficticia de ejemplo" : "",
          }),
          row.id,
        );
      created++;
    }
    // A clearly labelled historical fixture makes the history/no-show view testable.
    // Normal application creation still rejects past appointments.
    const historicalReason =
      "[DEMO] Inasistencia histórica de ejemplo (importación ficticia)";
    if (
      !(await db.appointment.findFirst({
        where: { clinicId, reason: historicalReason },
      }))
    ) {
      const startsAt = new Date(Date.now() - 86400000);
      startsAt.setUTCSeconds(0, 0);
      const endsAt = new Date(startsAt.valueOf() + 30 * 60000),
        patient = patients[0];
      const row = await db.$transaction(async (tx) => {
        const record = await tx.appointment.create({
          data: {
            clinicId,
            patientId: patient.id,
            tutorId: patient.tutors[0].tutorId,
            professionalMembershipId: service.professionals[0].membershipId,
            serviceId: service.id,
            startsAt,
            endsAt,
            blockedUntil: endsAt,
            reason: historicalReason,
            status: "SCHEDULED",
          },
        });
        await tx.appointmentEvent.create({
          data: {
            clinicId,
            appointmentId: record.id,
            actorMembershipId: actor.id,
            after: {
              status: record.status,
              startsAt: startsAt.toISOString(),
              endsAt: endsAt.toISOString(),
              reason: historicalReason,
              syntheticImport: true,
            },
          },
        });
        return record;
      });
      await appointments.save(
        clinicId,
        actor.userId,
        Object.assign(new UpdateAppointmentDto(), {
          patientId: row.patientId,
          tutorId: row.tutorId,
          professionalMembershipId: row.professionalMembershipId,
          serviceId: service.id,
          startsAt: startsAt.toISOString(),
          durationMinutes: 30,
          reason: historicalReason,
          version: row.version,
          status: "NO_SHOW",
        }),
        row.id,
      );
      created++;
    }
    console.log(
      JSON.stringify({
        demoExamplesCreated: created,
        clinicId,
        syntheticOnly: true,
      }),
    );
  } finally {
    await app.close();
  }
})().catch(() => {
  console.error(
    "Demo example setup failed. Existing data was preserved; inspect local QA before retrying.",
  );
  process.exitCode = 1;
});
