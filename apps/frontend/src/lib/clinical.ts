import { AuthError, request } from "./auth";
import type { ClinicRole } from "./auth";
import { workspacePath } from "./workspace";

export type ClinicalKind = "tutores" | "pacientes";
export const speciesNames = {
  DOG: "Perro",
  CAT: "Gato",
  BIRD: "Ave",
  RABBIT: "Conejo",
  RODENT: "Roedor",
  REPTILE: "Reptil",
  HORSE: "Caballo",
  OTHER: "Otra especie",
} as const;
export const sexNames = {
  FEMALE: "Hembra",
  MALE: "Macho",
  UNKNOWN: "Sin determinar",
} as const;
export const statusNames = {
  ACTIVE: "Activo",
  DECEASED: "Fallecido",
  ARCHIVED: "Archivado",
} as const;
export interface TutorSummary {
  id: string;
  clinicId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  status: "ACTIVE" | "ARCHIVED";
}
export interface Tutor extends TutorSummary {
  address: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PatientSummary {
  id: string;
  clinicId: string;
  name: string;
  species: keyof typeof speciesNames;
  sex: keyof typeof sexNames;
  status: keyof typeof statusNames;
  tutors: { id: string; firstName: string; lastName: string }[];
}
export interface Patient extends PatientSummary {
  breed: string | null;
  birthDate: string | null;
  weightKg: number | null;
  color: string | null;
  microchip: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
export type TutorInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
};
export type PatientInput = {
  name: string;
  species: Patient["species"];
  sex: Patient["sex"];
  breed: string | null;
  birthDate: string | null;
  weightKg: number | null;
  color: string | null;
  microchip: string | null;
  notes: string | null;
  status: "ACTIVE" | "DECEASED";
  tutorIds: string[];
};
export const fullName = (person: { firstName: string; lastName: string }) =>
  `${person.firstName} ${person.lastName}`;
export function canWrite(kind: ClinicalKind, role: ClinicRole) {
  return kind === "tutores" || role !== "RECEPTIONIST";
}
export function canArchive(role: ClinicRole) {
  return role === "OWNER" || role === "ADMIN";
}
export const clinicalPath = (
  clinicId: string,
  kind: ClinicalKind,
  id?: string,
  edit = false,
) =>
  `${workspacePath(clinicId, kind)}${id ? `/${encodeURIComponent(id)}${edit ? "/editar" : ""}` : ""}`;
export const calendarDate = (value: string | null) =>
  value ? value.split("-").reverse().join("/") : "Sin registrar";
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const strings = (...values: unknown[]) =>
  values.every((value) => typeof value === "string");
const nullable = (value: unknown) =>
  value === null || typeof value === "string";
const isTutor = (value: unknown, clinicId: string): value is TutorSummary =>
  object(value) &&
  value.clinicId === clinicId &&
  strings(value.id, value.firstName, value.lastName, value.phone) &&
  nullable(value.email) &&
  typeof value.status === "string" &&
  ["ACTIVE", "ARCHIVED"].includes(value.status);
const isPatient = (value: unknown, clinicId: string): value is PatientSummary =>
  object(value) &&
  value.clinicId === clinicId &&
  strings(value.id, value.name) &&
  typeof value.species === "string" &&
  Object.hasOwn(speciesNames, value.species) &&
  typeof value.sex === "string" &&
  Object.hasOwn(sexNames, value.sex) &&
  typeof value.status === "string" &&
  Object.hasOwn(statusNames, value.status) &&
  Array.isArray(value.tutors) &&
  value.tutors.length > 0 &&
  value.tutors.every(
    (tutor) =>
      object(tutor) && strings(tutor.id, tutor.firstName, tutor.lastName),
  );
function verifiedDetail(
  value: unknown,
  clinicId: string,
  kind: ClinicalKind,
): Tutor | Patient {
  if (
    !object(value) ||
    !strings(value.createdAt, value.updatedAt, value.id) ||
    !nullable(value.notes)
  )
    throw new AuthError(502);
  if (kind === "tutores" && isTutor(value, clinicId) && nullable(value.address))
    return value as unknown as Tutor;
  if (
    kind === "pacientes" &&
    isPatient(value, clinicId) &&
    [value.breed, value.birthDate, value.color, value.microchip].every(
      nullable,
    ) &&
    (value.weightKg === null ||
      (typeof value.weightKg === "number" &&
        Number.isFinite(value.weightKg) &&
        value.weightKg > 0))
  )
    return value as unknown as Patient;
  throw new AuthError(502);
}
function endpoint(clinicId: string, kind: ClinicalKind) {
  return `/clinics/${encodeURIComponent(clinicId)}/${kind === "tutores" ? "tutors" : "patients"}`;
}
export async function listRecords(
  clinicId: string,
  kind: ClinicalKind,
  query: string,
  signal?: AbortSignal,
  tutorId?: string,
): Promise<PageResult<TutorSummary | PatientSummary>> {
  const path = tutorId
    ? `${endpoint(clinicId, "tutores")}/${encodeURIComponent(tutorId)}/patients`
    : endpoint(clinicId, kind);
  const result = await request(`${path}?${query}`, undefined, signal);
  if (
    !object(result) ||
    !Array.isArray(result.items) ||
    ![result.total, result.page, result.limit, result.totalPages].every(
      (value) => typeof value === "number" && Number.isSafeInteger(value),
    ) ||
    Number(result.total) < 0 ||
    Number(result.page) < 1 ||
    Number(result.limit) < 1 ||
    Number(result.limit) > 50 ||
    result.items.length > Number(result.limit) ||
    !result.items.every((value) =>
      kind === "tutores"
        ? isTutor(value, clinicId)
        : isPatient(value, clinicId),
    )
  )
    throw new AuthError(502);
  return result as unknown as PageResult<TutorSummary | PatientSummary>;
}
export async function getRecord(
  clinicId: string,
  kind: ClinicalKind,
  id: string,
  signal?: AbortSignal,
) {
  const result = verifiedDetail(
    await request(
      `${endpoint(clinicId, kind)}/${encodeURIComponent(id)}`,
      undefined,
      signal,
    ),
    clinicId,
    kind,
  );
  if (result.id !== id) throw new AuthError(502);
  return result;
}
export async function saveRecord(
  clinicId: string,
  kind: ClinicalKind,
  input: TutorInput | PatientInput,
  id?: string,
  signal?: AbortSignal,
) {
  const result = verifiedDetail(
    await request(
      `${endpoint(clinicId, kind)}${id ? `/${encodeURIComponent(id)}` : ""}`,
      input,
      signal,
      id ? "PATCH" : "POST",
    ),
    clinicId,
    kind,
  );
  if (id && result.id !== id) throw new AuthError(502);
  return result;
}
export async function archiveRecord(
  clinicId: string,
  kind: ClinicalKind,
  id: string,
  signal?: AbortSignal,
) {
  const result = verifiedDetail(
    await request(
      `${endpoint(clinicId, kind)}/${encodeURIComponent(id)}/archive`,
      {},
      signal,
      "PATCH",
    ),
    clinicId,
    kind,
  );
  if (result.id !== id || result.status !== "ARCHIVED")
    throw new AuthError(502);
  return result;
}
export function clinicalError(
  error: unknown,
  action: "read" | "save" | "archive" = "read",
) {
  const status = error instanceof AuthError ? error.status : 0;
  if (status === 404) return "No encontramos este registro en tu clínica.";
  if (status === 403)
    return "Tu cuenta no tiene permiso para realizar esta acción. Vuelve a verificar tu acceso.";
  if (status === 400)
    return "Revisa los datos y los responsables seleccionados. No se pudo completar la solicitud.";
  if (status === 409)
    return action === "archive"
      ? "No se pudo archivar. Si es un tutor, primero reasigna o archiva sus pacientes vinculados. Actualiza la ficha e inténtalo nuevamente."
      : "No se pudo guardar. Revisa que el microchip no esté registrado en esta clínica o actualiza la ficha e inténtalo nuevamente.";
  if (status === 429)
    return "Has realizado varias solicitudes. Espera un minuto antes de volver a intentarlo.";
  return "No pudimos conectar con Pawly. Inténtalo nuevamente en unos momentos.";
}
