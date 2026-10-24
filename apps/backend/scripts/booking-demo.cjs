// Explicitly authorized, local-only demonstration tenant; never a medical credential seed.
const { randomBytes, createHash } = require("node:crypto");
const argon2 = require("argon2");
const marker = "PAWLY_BOOKING_DEMO_ONLY";
async function seedBookingDemo(db, ownerUserId, options = {}) {
  const passwordHash = await argon2.hash(randomBytes(48).toString("base64url"));
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`booking-demo:${ownerUserId}`},8412))`;
      const owner = await tx.clinicMembership.findFirst({
        where: {
          userId: ownerUserId,
          role: "OWNER",
          status: "ACTIVE",
          user: { status: "ACTIVE" },
        },
      });
      if (!owner)
        throw new Error("An existing active clinic owner is required");
      const slug = `porvenir-demo-${ownerUserId.slice(0, 8)}`;
      let clinic = await tx.veterinaryClinic.findUnique({
        where: options.clinicId ? { id: options.clinicId } : { slug },
      });
      if (
        clinic &&
        (!clinic.name.includes("DEMOSTRACIÓN") ||
          !(await tx.clinicMembership.findFirst({
            where: { clinicId: clinic.id, userId: ownerUserId, role: "OWNER" },
          })))
      )
        throw new Error("Refusing to overwrite another clinic");
      if (!clinic)
        clinic = await tx.veterinaryClinic.create({
          data: {
            ...(options.clinicId ? { id: options.clinicId } : {}),
            name: "Clínica Veterinaria Porvenir · DEMOSTRACIÓN",
            slug,
            timezone: "America/Santiago",
            memberships: { create: { userId: ownerUserId, role: "OWNER" } },
          },
        });
      const names = [
        "Dra. Camila Rojas",
        "Dr. Matías Herrera",
        "Dra. Valentina Morales",
      ];
      const doctors = [];
      for (let i = 0; i < names.length; i++) {
        const email = `professional-${i}.${clinic.id}@booking-demo.pawly.invalid`;
        const user = await tx.user.upsert({
          where: { normalizedEmail: email },
          create: {
            name: `[DEMO] ${names[i]}`,
            email,
            normalizedEmail: email,
            passwordHash,
          },
          update: {},
        });
        const member = await tx.clinicMembership.upsert({
          where: { userId_clinicId: { userId: user.id, clinicId: clinic.id } },
          create: {
            userId: user.id,
            clinicId: clinic.id,
            role: "VETERINARIAN",
          },
          update: {},
        });
        const profile = await tx.staffProfile.findUnique({
          where: { membershipId: member.id },
        });
        if (profile && profile.credentialEvidence !== marker)
          throw new Error("Refusing to overwrite a real staff profile");
        if (!profile)
          await tx.staffProfile.create({
            data: {
              membershipId: member.id,
              clinicId: clinic.id,
              displayName: `[DEMO] ${names[i]}`,
              job: "VETERINARIAN",
              specialty: [
                "Medicina veterinaria general · DEMOSTRACIÓN",
                "Cirugía y procedimientos · DEMOSTRACIÓN",
                "Medicina preventiva y controles · DEMOSTRACIÓN",
              ][i],
              biography:
                "Perfil ficticio para pruebas locales de agendamiento. No representa un profesional real ni habilita atención médica.",
              credentialEvidence: marker,
              medicalPracticeEnabled: false,
            },
          });
        doctors.push(member.id);
      }
      const services = [
        ["Consulta veterinaria general", 30, [0, 1, 2]],
        ["Vacunación", 20, [0, 2]],
        ["Desparasitación", 20, [0, 2]],
        ["Control médico", 30, [0, 2]],
        ["Consulta dermatológica", 40, [0]],
        ["Consulta de especialidad", 45, [0, 1]],
        ["Exámenes de laboratorio", 30, [0, 2]],
        ["Ecografía", 45, [1]],
        ["Radiografía", 30, [1]],
        ["Procedimientos menores", 60, [1]],
        ["Cirugía veterinaria", 120, [1]],
        ["Control postoperatorio", 30, [1, 2]],
      ];
      const demoOwner = await tx.clinicMembership.findUniqueOrThrow({
        where: {
          userId_clinicId: { userId: ownerUserId, clinicId: clinic.id },
        },
      });
      if (
        !(await tx.staffProfile.findUnique({
          where: { membershipId: demoOwner.id },
        }))
      )
        await tx.staffProfile.create({
          data: {
            membershipId: demoOwner.id,
            clinicId: clinic.id,
            displayName: "[DEMO] Responsable de simulación",
            job: "CLINIC_DIRECTOR",
            specialty: "Simulación local",
            biography:
              "Perfil exclusivo de demostración. No acredita formación ni autorización médica real.",
            credentialEvidence: marker,
            medicalPracticeEnabled: false,
          },
        });
      const stableId = (key) => {
        const h = createHash("sha256")
          .update(`${clinic.id}:${key}`)
          .digest("hex");
        return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
      };
      const pets = [
        ["Luna", "DOG", "FEMALE"],
        ["Simón", "CAT", "MALE"],
        ["Nala", "DOG", "FEMALE"],
        ["Milo", "CAT", "MALE"],
        ["Coco", "BIRD", "UNKNOWN"],
        ["Copito", "RABBIT", "MALE"],
        ["Kiwi", "RODENT", "FEMALE"],
        ["Rocky", "DOG", "MALE"],
      ];
      const families = [
        ["Sofía", "Pérez"],
        ["Tomás", "Díaz"],
        ["Emilia", "Rojas"],
        ["Mateo", "Soto"],
        ["Antonia", "Vera"],
        ["Benjamín", "Muñoz"],
        ["Isidora", "Lagos"],
        ["Lucas", "Fuentes"],
      ];
      for (let i = 0; i < pets.length; i++) {
        const tutorId = stableId(`demo-tutor:${i}`),
          patientId = stableId(`demo-patient:${i}`);
        await tx.tutor.upsert({
          where: { id: tutorId },
          create: {
            id: tutorId,
            clinicId: clinic.id,
            firstName: `[DEMO] ${families[i][0]}`,
            lastName: families[i][1],
            email: `tutor-${i + 1}@porvenir-demo.invalid`,
            phone: `+5690000000${i + 1}`,
            notes: "DATOS FICTICIOS para pruebas personales. No contactar.",
          },
          update: {},
        });
        await tx.patient.upsert({
          where: { id: patientId },
          create: {
            id: patientId,
            clinicId: clinic.id,
            name: `[DEMO] ${pets[i][0]}`,
            species: pets[i][1],
            sex: pets[i][2],
            notes:
              "Paciente ficticio de demostración. No es una ficha clínica real.",
            tutors: { create: { tutorId } },
          },
          update: {},
        });
      }
      for (const [name, durationMinutes, assigned] of services) {
        const hash = createHash("sha256")
          .update(`${clinic.id}:${name}`)
          .digest("hex");
        const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
        if (!(await tx.bookingService.findUnique({ where: { id } }))) {
          await tx.bookingService.create({
            data: {
              id,
              clinicId: clinic.id,
              name,
              description: `DEMOSTRACIÓN: duración referencial, editable.${name === "Cirugía veterinaria" ? " Requiere confirmación previa." : ""}`,
              durationMinutes,
              bufferMinutes: 0,
              enabled: true,
              professionals: {
                create: assigned.map((i) => ({ membershipId: doctors[i] })),
              },
            },
          });
          await tx.accessAuditLog.create({
            data: {
              clinicId: clinic.id,
              actorMembershipId: demoOwner.id,
              targetMembershipId: demoOwner.id,
              action: "BOOKING_SERVICE",
              reason: "Inicialización autorizada de servicio demostrativo",
              after: { serviceId: id, name, demo: true },
            },
          });
        }
      }
      const hours = Array.from({ length: 5 }, (_, i) => [
        { weekday: i + 1, opens: "09:00", closes: "14:00" },
        { weekday: i + 1, opens: "15:00", closes: "19:00" },
      ]).flat();
      hours.push({ weekday: 6, opens: "09:00", closes: "14:00" });
      await tx.bookingSettings.upsert({
        where: { clinicId: clinic.id },
        create: {
          clinicId: clinic.id,
          configuration: {
            publicEnabled: true,
            autoConfirm: false,
            autoAssign: true,
            minNoticeMinutes: 0,
            maxAdvanceDays: 60,
            stepMinutes: 5,
            cancellationNoticeMinutes: 0,
            message:
              "DEMOSTRACIÓN LOCAL. Profesionales ficticios y reservas de prueba. Ninguna solicitud constituye atención real. Todas requieren confirmación previa. No ingreses datos personales reales.",
            hours,
            professionals: doctors.map((membershipId) => ({
              membershipId,
              hours,
            })),
            blocks: [],
          },
        },
        update: {},
      });
      return { id: clinic.id, slug: clinic.slug };
    },
    { timeout: 20000 },
  );
}
module.exports = { seedBookingDemo };
if (require.main === module) {
  const fs = require("node:fs");
  const { PrismaClient } = require("@prisma/client");
  process.loadEnvFile(".env");
  const url = new URL(process.env.DATABASE_URL || "");
  if (
    process.env.NODE_ENV === "production" ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.port !== "5433" ||
    url.pathname !== "/pawly" ||
    (url.searchParams.get("schema") || "public") !== "public"
  )
    throw new Error("Only the local Pawly development database is allowed");
  url.hostname = "127.0.0.1";
  url.searchParams.set("connection_limit", "3");
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  (async () => {
    if (!/^[a-f0-9-]{36}$/.test(process.env.WEBSITE_CLINIC_ID || ""))
      throw new Error("An explicitly mapped website clinic is required");
    const owner = await db.clinicMembership.findFirst({
      where: {
        clinicId: process.env.WEBSITE_CLINIC_ID,
        role: "OWNER",
        status: "ACTIVE",
        user: { status: "ACTIVE" },
      },
      select: { userId: true },
    });
    if (!owner) throw new Error("Website clinic owner not found");
    const result = await seedBookingDemo(db, owner.userId);
    const content = fs.readFileSync(".env", "utf8");
    const line = `BOOKING_DEMO_CLINIC_ID=${result.id}`;
    fs.writeFileSync(
      ".env",
      /^BOOKING_DEMO_CLINIC_ID=.*$/m.test(content)
        ? content.replace(/^BOOKING_DEMO_CLINIC_ID=.*$/m, line)
        : content.trimEnd() + "\r\n" + line + "\r\n",
    );
    console.log(
      JSON.stringify({
        demoClinic: result.id,
        slug: result.slug,
        services: 12,
        syntheticProfessionals: 3,
        medicalCredentialsVerified: false,
        productionBookingEnabled: false,
      }),
    );
  })()
    .catch(() => {
      console.error(
        "Demo setup failed; credentials and personal records were not printed.",
      );
      process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
}
