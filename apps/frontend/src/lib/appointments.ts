import { AuthError, request } from "./auth";
export const appointmentStates = {
  SCHEDULED: "Programada",
  CONFIRMED: "Confirmada",
  IN_PROGRESS: "En atención",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
} as const;
export type AppointmentStatus = keyof typeof appointmentStates;
export interface Professional {
  id: string;
  user: { name: string };
}
export interface Appointment {
  id: string;
  clinicId: string;
  patientId: string;
  tutorId: string;
  professionalMembershipId: string | null;
  startsAt: string;
  endsAt: string;
  reason: string;
  status: AppointmentStatus;
  version: number;
  cancellationReason: string | null;
  patient: { id: string; name: string };
  tutor: { id: string; firstName: string; lastName: string };
  professional: Professional | null;
}
export interface AppointmentInput {
  patientId: string;
  tutorId: string;
  professionalMembershipId: string | null;
  startsAt: string;
  durationMinutes: number;
  reason: string;
}
export interface AppointmentEvent {
  id: string;
  createdAt: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  actor: { user: { name: string } };
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const professional = (v: unknown): v is Professional =>
  record(v) &&
  typeof v.id === "string" &&
  record(v.user) &&
  typeof v.user.name === "string";
function appointment(v: unknown, clinicId: string): v is Appointment {
  return (
    record(v) &&
    v.clinicId === clinicId &&
    [v.id, v.patientId, v.tutorId, v.startsAt, v.endsAt, v.reason].every(
      (x) => typeof x === "string",
    ) &&
    typeof v.version === "number" &&
    Number.isSafeInteger(v.version) &&
    v.version >= 1 &&
    typeof v.startsAt === "string" &&
    Number.isFinite(Date.parse(v.startsAt)) &&
    typeof v.endsAt === "string" &&
    Number.isFinite(Date.parse(v.endsAt)) &&
    Date.parse(v.endsAt) > Date.parse(v.startsAt) &&
    typeof v.status === "string" &&
    Object.hasOwn(appointmentStates, v.status) &&
    (v.professionalMembershipId === null ||
      typeof v.professionalMembershipId === "string") &&
    (v.cancellationReason === null ||
      typeof v.cancellationReason === "string") &&
    record(v.patient) &&
    v.patient.id === v.patientId &&
    typeof v.patient.name === "string" &&
    record(v.tutor) &&
    v.tutor.id === v.tutorId &&
    typeof v.tutor.firstName === "string" &&
    typeof v.tutor.lastName === "string" &&
    (v.professionalMembershipId === null
      ? v.professional === null
      : professional(v.professional) &&
        v.professional.id === v.professionalMembershipId)
  );
}
const base = (clinicId: string) =>
  `/clinics/${encodeURIComponent(clinicId)}/appointments`;
export async function getAppointments(
  clinicId: string,
  params: string,
  signal?: AbortSignal,
) {
  const value = await request(`${base(clinicId)}?${params}`, undefined, signal);
  if (
    !record(value) ||
    !Array.isArray(value.items) ||
    value.items.length > 100 ||
    !value.items.every((v) => appointment(v, clinicId)) ||
    !Number.isInteger(value.total) ||
    !Number.isInteger(value.totalPages) ||
    Number(value.total) < 0 ||
    Number(value.totalPages) < 0
  )
    throw new AuthError(502);
  return {
    items: value.items as Appointment[],
    total: value.total as number,
    totalPages: value.totalPages as number,
  };
}
export async function getProfessionals(clinicId: string, signal?: AbortSignal) {
  const value = await request(
    `${base(clinicId)}/professionals`,
    undefined,
    signal,
  );
  if (!Array.isArray(value) || !value.every(professional))
    throw new AuthError(502);
  return value as Professional[];
}
export async function saveAppointment(
  clinicId: string,
  input: AppointmentInput & {
    version?: number;
    status?: AppointmentStatus;
    cancellationReason?: string;
  },
  id?: string,
  signal?: AbortSignal,
) {
  const value = await request(
    `${base(clinicId)}${id ? `/${encodeURIComponent(id)}` : ""}`,
    input,
    signal,
    id ? "PATCH" : "POST",
  );
  if (!appointment(value, clinicId)) throw new AuthError(502);
  return value;
}
export async function getAppointmentHistory(
  clinicId: string,
  id: string,
  signal?: AbortSignal,
) {
  const value = await request(
    `${base(clinicId)}/${encodeURIComponent(id)}/history`,
    undefined,
    signal,
  );
  if (
    !Array.isArray(value) ||
    !value.every(
      (v) =>
        record(v) &&
        typeof v.id === "string" &&
        typeof v.createdAt === "string" &&
        record(v.after) &&
        (v.before === null || record(v.before)) &&
        record(v.actor) &&
        record(v.actor.user) &&
        typeof v.actor.user.name === "string",
    )
  )
    throw new AuthError(502);
  return value as AppointmentEvent[];
}
export function appointmentError(error: unknown) {
  if (!(error instanceof AuthError))
    return error instanceof Error
      ? error.message
      : "No pudimos completar la operación.";
  if (error.status === 409)
    return "El horario está ocupado, la cita cambió o su estado ya no permite modificaciones. Actualiza la agenda antes de reintentar.";
  if (error.status === 400)
    return "Revisa la fecha, duración y relaciones del paciente, tutor y profesional. Una cita nueva o reprogramada debe estar en el futuro.";
  if (error.status === 403)
    return "Tu acceso o rol cambió. Vuelve a verificar tu acceso.";
  return "No pudimos conectar con la agenda. Intenta nuevamente.";
}
