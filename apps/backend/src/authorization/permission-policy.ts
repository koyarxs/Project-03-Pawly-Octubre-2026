import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { PermissionKey, Prisma, Role } from "@prisma/client";

/** Stable API names; enum-backed storage prevents arbitrary permission strings. */
export const permissionCatalog = {
  CLINIC_READ: "clinic:read",
  CLINIC_MANAGE: "clinic:manage",
  STAFF_READ: "staff:read",
  STAFF_CREATE: "staff:create",
  STAFF_UPDATE: "staff:update",
  STAFF_DEACTIVATE: "staff:deactivate",
  PERMISSIONS_MANAGE: "permissions:manage",
  CREDENTIALS_VERIFY: "credentials:verify",
  PUBLIC_PROFILES_MANAGE: "public-profiles:manage",
  AUDIT_READ: "audit:read",
  TUTOR_READ: "tutor:read",
  TUTOR_WRITE: "tutor:write",
  PATIENT_READ: "patient:read",
  PATIENT_CREATE: "patient:create",
  PATIENT_UPDATE: "patient:update",
  PATIENT_NOTES: "patient:notes",
  PATIENT_ASSIGN: "patient:assign",
  CLINICAL_ARCHIVE: "clinical:archive",
  APPOINTMENT_READ: "appointment:read",
  APPOINTMENT_WRITE: "appointment:write",
  APPOINTMENT_CLINICAL: "appointment:clinical",
  CONSULTATION_READ: "consultation:read",
  CONSULTATION_WRITE: "consultation:write",
} as const satisfies Partial<Record<PermissionKey, string>>;
export type Permission =
  (typeof permissionCatalog)[keyof typeof permissionCatalog] | "patient:write";
export const implementedKeys = Object.keys(
  permissionCatalog,
) as (keyof typeof permissionCatalog)[];
const administration: PermissionKey[] = [
  "CLINIC_READ",
  "CLINIC_MANAGE",
  "STAFF_READ",
  "STAFF_CREATE",
  "STAFF_UPDATE",
  "STAFF_DEACTIVATE",
  "PERMISSIONS_MANAGE",
  "PUBLIC_PROFILES_MANAGE",
  "AUDIT_READ",
  "PATIENT_ASSIGN",
  "CLINICAL_ARCHIVE",
];
const reception: PermissionKey[] = [
  "CLINIC_READ",
  "TUTOR_READ",
  "TUTOR_WRITE",
  "PATIENT_READ",
  "PATIENT_CREATE",
  "PATIENT_UPDATE",
  "APPOINTMENT_READ",
  "APPOINTMENT_WRITE",
];
const medicine: PermissionKey[] = [
  "PATIENT_NOTES",
  "CONSULTATION_READ",
  "CONSULTATION_WRITE",
  "APPOINTMENT_CLINICAL",
];
export const roleDefaults: Record<Role, PermissionKey[]> = {
  OWNER: [
    ...administration,
    ...reception,
    ...medicine,
    "PERMISSIONS_MANAGE",
    "CREDENTIALS_VERIFY",
  ],
  ADMIN: [...administration, ...reception, ...medicine],
  CLINIC_DIRECTOR: [...administration, ...reception, ...medicine],
  VETERINARIAN: [...reception, ...medicine],
  RECEPTIONIST: reception,
  VET_TECHNICIAN: ["CLINIC_READ", "PATIENT_READ", "APPOINTMENT_READ"],
  PET_GROOMER: ["CLINIC_READ", "PATIENT_READ"],
};
export const medicalRoles: Role[] = [
  "OWNER",
  "ADMIN",
  "CLINIC_DIRECTOR",
  "VETERINARIAN",
];
export const memberInclude = {
  staffProfile: true,
  clinic: { select: { id: true, name: true, slug: true, status: true } },
  user: { select: { status: true } },
} satisfies Prisma.ClinicMembershipInclude;
export type AccessMember = Prisma.ClinicMembershipGetPayload<{
  include: typeof memberInclude;
}>;
export function effectivePermissions(
  member: Pick<
    AccessMember,
    | "id"
    | "role"
    | "status"
    | "permissionGrants"
    | "permissionDenials"
    | "staffProfile"
    | "user"
    | "clinic"
  >,
): Permission[] {
  if (
    member.status !== "ACTIVE" ||
    member.user.status !== "ACTIVE" ||
    member.clinic.status !== "ACTIVE"
  )
    return [];
  const keys = new Set([
    ...roleDefaults[member.role],
    ...member.permissionGrants,
  ]);
  for (const key of member.permissionDenials) keys.delete(key);
  const p = member.staffProfile;
  // Explicit, local-only simulation. It does not represent credential verification.
  const synthetic = p?.credentialEvidence === "PAWLY_BOOKING_DEMO_ONLY";
  const localSimulation =
    synthetic &&
    ["development", "test"].includes(process.env.NODE_ENV || "") &&
    process.env.BOOKING_DEMO_CLINIC_ID === member.clinic.id;
  const authorizedDoctor =
    medicalRoles.includes(member.role) &&
    (localSimulation ||
      (!synthetic &&
        p?.credentialStatus === "VERIFIED" &&
        p.medicalPracticeEnabled &&
        p.credentialVerifiedById !== member.id));
  // Reading a medical record is also an independently authorized clinical faculty.
  if (!authorizedDoctor) for (const key of medicine) keys.delete(key);
  const result: Permission[] = implementedKeys
    .filter((key) => keys.has(key))
    .map((key) => permissionCatalog[key]);
  // Compatibility for old clients; new controllers authorize create/update separately.
  if (result.includes("patient:create") && result.includes("patient:update"))
    result.push("patient:write");
  return [...new Set(result)];
}
export async function requireMember(
  db: Prisma.TransactionClient,
  clinicId: string,
  userId: string,
  required: Permission[],
) {
  const member = await db.clinicMembership.findFirst({
    where: { clinicId, userId },
    include: memberInclude,
  });
  if (
    !member ||
    !required.length ||
    !required.every((p) => effectivePermissions(member).includes(p))
  )
    throw new ForbiddenException("Acceso no permitido.");
  return member;
}
/** Use inside READ COMMITTED writes, before reading authority/resources. Each
 * statement after a waiting lock sees the latest committed permission state. */
export async function lockClinic(
  tx: Prisma.TransactionClient,
  clinicId: string,
) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clinicId}, 0))::text`;
}
export function patientScope(
  member: Pick<AccessMember, "id" | "patientScope" | "clinicId">,
): Prisma.PatientWhereInput {
  return member.patientScope === "CLINIC"
    ? {}
    : {
        OR: [
          {
            assignments: {
              some: { clinicId: member.clinicId, membershipId: member.id },
            },
          },
          {
            appointments: {
              some: {
                clinicId: member.clinicId,
                professionalMembershipId: member.id,
                status: { not: "CANCELLED" },
              },
            },
          },
          {
            consultations: {
              some: {
                clinicId: member.clinicId,
                professionalMembershipId: member.id,
              },
            },
          },
        ],
      };
}
export async function requirePatient(
  db: Prisma.TransactionClient,
  member: AccessMember,
  id: string,
) {
  if (
    !(await db.patient.findFirst({
      where: { id, clinicId: member.clinicId, ...patientScope(member) },
      select: { id: true },
    }))
  )
    throw new NotFoundException("Paciente no disponible.");
}
