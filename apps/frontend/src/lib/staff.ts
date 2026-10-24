import { AuthError, request, type ClinicRole } from "./auth";
export type StaffJob =
  | "CLINIC_DIRECTOR"
  | "VETERINARIAN"
  | "VET_TECHNICIAN"
  | "RECEPTIONIST"
  | "PET_GROOMER";
export interface StaffProfile {
  displayName: string;
  job: StaffJob;
  specialty: string;
  biography: string;
  photoKey: string;
  professionalPhone: string | null;
  credentialNumber: string | null;
  credentialStatus: "UNVERIFIED" | "VERIFIED" | "REVOKED";
  credentialEvidence: string | null;
  medicalPracticeEnabled: boolean;
  publicConsentAt: string | null;
  publishedAt: string | null;
  publicOrder: number;
  version: number;
}
export interface StaffMember {
  id: string;
  role: ClinicRole;
  status: "ACTIVE" | "SUSPENDED" | "INVITED";
  patientScope: "CLINIC" | "ASSIGNED";
  accessVersion: number;
  permissionGrants: string[];
  permissionDenials: string[];
  permissions: string[];
  staffProfile: StaffProfile | null;
  user: { name: string; email: string; status: string };
}
export interface StaffCatalog {
  permissions: { key: string; name: string; label: string }[];
  roles: ClinicRole[];
  jobs: StaffJob[];
  pendingPermissions: string[];
}
export interface AuditEntry {
  id: string;
  action: string;
  reason: string;
  createdAt: string;
  before: unknown;
  after: unknown;
  targetMembershipId: string;
  actor: { user: { name: string } };
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;
export async function getStaff(
  clinicId: string,
  signal?: AbortSignal,
): Promise<{ items: StaffMember[]; catalog: StaffCatalog }> {
  const value = await request(
    `/clinics/${encodeURIComponent(clinicId)}/staff`,
    undefined,
    signal,
  );
  if (
    !record(value) ||
    !Array.isArray(value.items) ||
    !record(value.catalog) ||
    !Array.isArray(value.catalog.permissions) ||
    !value.items.every(
      (m) =>
        record(m) &&
        typeof m.id === "string" &&
        record(m.user) &&
        typeof m.user.name === "string" &&
        Number.isInteger(m.accessVersion),
    )
  )
    throw new AuthError(502);
  return value as unknown as { items: StaffMember[]; catalog: StaffCatalog };
}
export async function staffMutation(
  clinicId: string,
  path: string,
  body: object,
  method: "POST" | "PATCH" = "PATCH",
) {
  return request(
    `/clinics/${encodeURIComponent(clinicId)}/staff${path}`,
    body,
    undefined,
    method,
  );
}
export async function getMyProfile(
  clinicId: string,
  signal?: AbortSignal,
): Promise<{ membershipId: string; profile: StaffProfile | null }> {
  const value = await request(
    `/clinics/${encodeURIComponent(clinicId)}/staff/me`,
    undefined,
    signal,
  );
  if (
    !record(value) ||
    typeof value.membershipId !== "string" ||
    !(
      value.profile === null ||
      (record(value.profile) && Number.isInteger(value.profile.version))
    )
  )
    throw new AuthError(502);
  return value as unknown as {
    membershipId: string;
    profile: StaffProfile | null;
  };
}
export const staffError = (e: unknown) =>
  e instanceof AuthError
    ? ({
        400: "Revisa los campos y el motivo del cambio.",
        403: "No tienes autorización para esta acción. Verifica tus permisos.",
        404: "El registro no está disponible en esta clínica.",
        409: "El registro cambió o el acceso ya existe. Recarga antes de reintentar.",
        429: "Demasiadas solicitudes. Espera un minuto antes de reintentar.",
      }[e.status] ?? "No pudimos completar la solicitud. Inténtalo nuevamente.")
    : "No pudimos conectar con Pawly.";
