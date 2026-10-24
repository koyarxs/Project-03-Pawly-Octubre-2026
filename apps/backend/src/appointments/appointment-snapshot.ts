import { AppointmentStatus, Prisma } from "@prisma/client";
export function appointmentSnapshot(r: {
  startsAt: Date;
  endsAt: Date;
  patientId: string;
  tutorId: string;
  professionalMembershipId: string | null;
  reason: string;
  status: AppointmentStatus;
  cancellationReason: string | null;
  version: number;
  serviceId?: string | null;
  resourceKey?: string | null;
  blockedUntil?: Date | null;
}): Prisma.InputJsonObject {
  return {
    serviceId: r.serviceId || null,
    resourceKey: r.resourceKey || null,
    blockedUntil: r.blockedUntil?.toISOString() || null,
    patientId: r.patientId,
    tutorId: r.tutorId,
    professionalMembershipId: r.professionalMembershipId,
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt.toISOString(),
    reason: r.reason,
    status: r.status,
    cancellationReason: r.cancellationReason,
    version: r.version,
  };
}
