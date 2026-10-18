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
}): Prisma.InputJsonObject {
  return {
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
