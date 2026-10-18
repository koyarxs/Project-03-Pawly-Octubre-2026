import { AuthError, request, type ClinicRole } from "./auth";
import type { Professional, Appointment } from "./appointments";
export const canReadClinical = (role: ClinicRole) => role !== "RECEPTIONIST";
export type ConsultationStatus = "DRAFT" | "FINALIZED";
export const consultationStates = {
  DRAFT: "Borrador",
  FINALIZED: "Finalizada",
} as const;
export const clinicalTextFields = [
  "reason",
  "anamnesis",
  "physicalExam",
  "findings",
  "diagnosis",
  "treatment",
  "instructions",
  "notes",
] as const;
export type ClinicalTextField = (typeof clinicalTextFields)[number];
export const clinicalLabels: Record<ClinicalTextField, string> = {
  reason: "Motivo de consulta",
  anamnesis: "Anamnesis y antecedentes",
  physicalExam: "Examen físico",
  findings: "Hallazgos clínicos",
  diagnosis: "Diagnóstico",
  treatment: "Tratamiento",
  instructions: "Indicaciones",
  notes: "Observaciones adicionales",
};
export interface ClinicalInput {
  professionalMembershipId: string;
  attendedAt: string;
  reason: string;
  anamnesis: string;
  physicalExam: string;
  findings: string;
  diagnosis: string;
  diagnosisType: "PRESUMPTIVE" | "DEFINITIVE" | null;
  treatment: string;
  instructions: string;
  notes: string;
  weightKg: number | null;
  temperatureC: number | null;
  heartRate: number | null;
  respiratoryRate: number | null;
  nextControlAt: string | null;
}
export interface ConsultationSummary {
  id: string;
  clinicId: string;
  patientId: string;
  appointmentId: string | null;
  attendedAt: string;
  reason: string;
  diagnosis: string;
  diagnosisType: ClinicalInput["diagnosisType"];
  treatment: string;
  version: number;
  status: ConsultationStatus;
  patient: { id: string; name: string };
  professional: Professional;
}
export interface Consultation extends ConsultationSummary, ClinicalInput {
  createdAt: string;
  updatedAt: string;
  finalizedAt: string | null;
  creator: Professional;
  finalizer: Professional | null;
  appointment: { id: string; status: string; startsAt: string } | null;
}
export interface Amendment {
  id: string;
  reason: string;
  correction: string;
  createdAt: string;
  actor: Professional;
}
export interface ClinicalEvent {
  id: string;
  kind: string;
  createdAt: string;
  actor: Professional;
  snapshot: Record<string, unknown>;
}
export interface ClinicalPage<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
const person = (v: unknown): v is Professional =>
  object(v) &&
  typeof v.id === "string" &&
  object(v.user) &&
  typeof v.user.name === "string";
const instant = (v: unknown): v is string =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
const nullableInstant = (v: unknown) => v === null || instant(v);
function summary(v: unknown, clinicId: string): v is ConsultationSummary {
  return (
    object(v) &&
    v.clinicId === clinicId &&
    [v.id, v.patientId, v.reason, v.diagnosis, v.treatment].every(
      (x) => typeof x === "string",
    ) &&
    instant(v.attendedAt) &&
    (v.status === "DRAFT" || v.status === "FINALIZED") &&
    typeof v.version === "number" &&
    Number.isSafeInteger(v.version) &&
    v.version > 0 &&
    (v.appointmentId === null || typeof v.appointmentId === "string") &&
    object(v.patient) &&
    v.patient.id === v.patientId &&
    typeof v.patient.name === "string" &&
    person(v.professional) &&
    (v.diagnosisType === null ||
      v.diagnosisType === "PRESUMPTIVE" ||
      v.diagnosisType === "DEFINITIVE")
  );
}
function detail(v: unknown, clinicId: string): v is Consultation {
  return (
    summary(v, clinicId) &&
    object(v) &&
    clinicalTextFields.every((f) => typeof v[f] === "string") &&
    typeof v.professionalMembershipId === "string" &&
    v.professionalMembershipId === v.professional.id &&
    ["weightKg", "temperatureC", "heartRate", "respiratoryRate"].every(
      (k) =>
        v[k] === null || (typeof v[k] === "number" && Number.isFinite(v[k])),
    ) &&
    nullableInstant(v.nextControlAt) &&
    instant(v.createdAt) &&
    instant(v.updatedAt) &&
    nullableInstant(v.finalizedAt) &&
    person(v.creator) &&
    (v.finalizer === null || person(v.finalizer)) &&
    (v.appointmentId === null
      ? v.appointment === null
      : object(v.appointment) &&
        v.appointment.id === v.appointmentId &&
        instant(v.appointment.startsAt) &&
        typeof v.appointment.status === "string")
  );
}
function page<T>(
  v: unknown,
  check: (item: unknown) => item is T,
): ClinicalPage<T> {
  if (
    !object(v) ||
    !Array.isArray(v.items) ||
    v.items.length > 20 ||
    !v.items.every(check) ||
    !Number.isSafeInteger(v.total) ||
    Number(v.total) < 0 ||
    !Number.isSafeInteger(v.page) ||
    Number(v.page) < 1 ||
    !Number.isSafeInteger(v.totalPages) ||
    Number(v.totalPages) < 0
  )
    throw new AuthError(502);
  return v as unknown as ClinicalPage<T>;
}
const endpoint = (clinicId: string) =>
  `/clinics/${encodeURIComponent(clinicId)}/consultations`;
export const consultationPath = (clinicId: string, id?: string) =>
  `/app/clinicas/${encodeURIComponent(clinicId)}/consultas${id ? `/${encodeURIComponent(id)}` : ""}`;
export async function getConsultations(
  clinicId: string,
  query: string,
  signal?: AbortSignal,
) {
  return page(
    await request(`${endpoint(clinicId)}?${query}`, undefined, signal),
    (v): v is ConsultationSummary => summary(v, clinicId),
  );
}
export async function getConsultation(
  clinicId: string,
  id: string,
  signal?: AbortSignal,
) {
  const value = await request(
    `${endpoint(clinicId)}/${encodeURIComponent(id)}`,
    undefined,
    signal,
  );
  if (!detail(value, clinicId)) throw new AuthError(502);
  return value;
}
export async function saveConsultation(
  clinicId: string,
  input: ClinicalInput & {
    patientId?: string;
    appointmentId?: string | null;
    requestId?: string;
    status?: ConsultationStatus;
    version?: number;
  },
  id?: string,
  signal?: AbortSignal,
) {
  const value = await request(
    `${endpoint(clinicId)}${id ? `/${encodeURIComponent(id)}` : ""}`,
    input,
    signal,
    id ? "PATCH" : "POST",
  );
  if (!detail(value, clinicId)) throw new AuthError(502);
  return value;
}
export async function getClinicalEvents(
  clinicId: string,
  id: string,
  p: number,
  signal?: AbortSignal,
) {
  return page(
    await request(
      `${endpoint(clinicId)}/${encodeURIComponent(id)}/history?page=${p}`,
      undefined,
      signal,
    ),
    (v): v is ClinicalEvent =>
      object(v) &&
      typeof v.id === "string" &&
      typeof v.kind === "string" &&
      instant(v.createdAt) &&
      person(v.actor) &&
      object(v.snapshot),
  );
}
export async function getAmendments(
  clinicId: string,
  id: string,
  p: number,
  signal?: AbortSignal,
) {
  return page(
    await request(
      `${endpoint(clinicId)}/${encodeURIComponent(id)}/amendments?page=${p}`,
      undefined,
      signal,
    ),
    (v): v is Amendment =>
      object(v) &&
      [v.id, v.reason, v.correction].every((x) => typeof x === "string") &&
      instant(v.createdAt) &&
      person(v.actor),
  );
}
export async function amendConsultation(
  clinicId: string,
  id: string,
  input: { requestId: string; reason: string; correction: string },
  signal?: AbortSignal,
) {
  const v = await request(
    `${endpoint(clinicId)}/${encodeURIComponent(id)}/amendments`,
    input,
    signal,
  );
  if (
    !object(v) ||
    typeof v.id !== "string" ||
    typeof v.reason !== "string" ||
    typeof v.correction !== "string" ||
    !instant(v.createdAt) ||
    !person(v.actor)
  )
    throw new AuthError(502);
  return v;
}
export async function getClinicalAppointment(
  clinicId: string,
  id: string,
  signal?: AbortSignal,
) {
  const v = await request(
    `/clinics/${encodeURIComponent(clinicId)}/appointments/${encodeURIComponent(id)}`,
    undefined,
    signal,
  );
  if (
    !object(v) ||
    v.clinicId !== clinicId ||
    v.id !== id ||
    typeof v.patientId !== "string" ||
    typeof v.reason !== "string" ||
    !object(v.patient) ||
    v.patient.id !== v.patientId ||
    typeof v.patient.name !== "string" ||
    typeof v.status !== "string" ||
    ![
      "SCHEDULED",
      "CONFIRMED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
    ].includes(v.status) ||
    (v.professionalMembershipId !== null &&
      typeof v.professionalMembershipId !== "string") ||
    (v.consultation !== null &&
      (!object(v.consultation) || typeof v.consultation.id !== "string"))
  )
    throw new AuthError(502);
  return v as unknown as Appointment;
}
export function consultationError(e: unknown) {
  if (e instanceof AuthError) {
    if (e.status === 409)
      return "El registro cambió, ya está finalizado o ya existe una consulta para esta cita. Actualiza la vista antes de continuar.";
    if (e.status === 400)
      return "Revisa los campos clínicos, fechas y profesional. Para finalizar completa motivo, anamnesis, examen físico, diagnóstico, tipo y tratamiento.";
    if (e.status === 403)
      return "No tienes autorización para acceder a la información clínica. Verifica tu acceso.";
    if (e.status === 404)
      return "La consulta o el paciente no está disponible en esta clínica.";
    return "No pudimos conectar con las consultas. Intenta nuevamente.";
  }
  return "Revisa los datos de la consulta e intenta nuevamente.";
}
