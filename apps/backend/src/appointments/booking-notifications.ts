import { Prisma } from "@prisma/client";

/** Notify affected future reservations without changing their agreed schedule. */
export async function availabilityNotice(
  tx: Prisma.TransactionClient,
  clinicId: string,
  scope: string,
  version: number,
  filter: { professionalId?: string; serviceId?: string } = {},
) {
  const service = filter.serviceId
    ? Prisma.sql`AND "serviceId"=${filter.serviceId}::uuid`
    : Prisma.empty;
  const professional = filter.professionalId
    ? Prisma.sql`AND "professionalMembershipId"=${filter.professionalId}::uuid`
    : Prisma.empty;
  const key = `${scope}:${version}`;
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "BookingNotification" ("id","clinicId","bookingId","eventKey","kind","deliverAt")
    SELECT gen_random_uuid(),"clinicId","id",'booking:' || "id"::text || ':availability:' || ${key},'AVAILABILITY_CHANGED',now()
    FROM "BookingRequest" WHERE "clinicId"=${clinicId}::uuid AND "status" IN ('PENDING','CONFIRMED') AND "startsAt">now() ${service} ${professional}
    ON CONFLICT ("eventKey") DO NOTHING`);
  await tx.$executeRaw(Prisma.sql`
    INSERT INTO "BookingNotification" ("id","clinicId","appointmentId","eventKey","kind","deliverAt")
    SELECT gen_random_uuid(),"clinicId","id",'appointment:' || "id"::text || ':availability:' || ${key},'AVAILABILITY_CHANGED',now()
    FROM "Appointment" WHERE "clinicId"=${clinicId}::uuid AND "status" IN ('SCHEDULED','CONFIRMED') AND "startsAt">now() ${service} ${professional}
    ON CONFLICT ("eventKey") DO NOTHING`);
}
/** Transactional outbox; delivery is performed separately and never faked. */
export async function bookingNotice(
  tx: Prisma.TransactionClient,
  input: {
    clinicId: string;
    bookingId?: string;
    appointmentId?: string;
    version: number;
    kind: string;
    startsAt: Date;
    remind?: boolean;
  },
) {
  const target = input.bookingId
    ? `booking:${input.bookingId}`
    : `appointment:${input.appointmentId}`;
  const base = {
    clinicId: input.clinicId,
    bookingId: input.bookingId || null,
    appointmentId: input.appointmentId || null,
  };
  await tx.bookingNotification.createMany({
    data: [
      {
        ...base,
        eventKey: `${target}:${input.version}:${input.kind}`,
        kind: input.kind,
        deliverAt: new Date(),
      },
      ...(input.remind && input.startsAt.valueOf() - Date.now() > 86400000
        ? [
            {
              ...base,
              eventKey: `${target}:REMINDER:${input.startsAt.toISOString()}`,
              kind: "REMINDER",
              deliverAt: new Date(input.startsAt.valueOf() - 86400000),
            },
          ]
        : []),
    ],
    skipDuplicates: true,
  });
}
