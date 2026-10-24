/** Synthetic, explicitly verified fixture for pre-existing UI scenarios.
 * Production receives these capabilities only from NestJS, never from a role fallback. */
export function withAccessFixture(value: unknown): unknown {
  if (
    typeof value !== "object" ||
    value === null ||
    !("clinic" in value) ||
    typeof value.clinic !== "object" ||
    value.clinic === null ||
    !("role" in value.clinic)
  )
    return value;
  const c = value.clinic as Record<string, unknown>,
    role = c.role;
  const admin = [
    "clinic:manage",
    "staff:read",
    "staff:create",
    "staff:update",
    "staff:deactivate",
    "public-profiles:manage",
    "audit:read",
    "patient:assign",
    "clinical:archive",
  ];
  const reception = [
    "clinic:read",
    "tutor:read",
    "tutor:write",
    "patient:read",
    "patient:create",
    "patient:update",
    "patient:write",
    "appointment:read",
    "appointment:write",
  ];
  const medical = [
    "consultation:read",
    "consultation:write",
    "patient:notes",
    "appointment:clinical",
  ];
  const permissions =
    role === "RECEPTIONIST"
      ? reception
      : role === "VET_TECHNICIAN"
        ? ["clinic:read", "patient:read", "appointment:read"]
        : role === "PET_GROOMER"
          ? ["clinic:read", "patient:read"]
          : role === "VETERINARIAN"
            ? [...reception, ...medical]
            : [
                ...reception,
                ...medical,
                ...admin,
                ...(role === "OWNER"
                  ? ["permissions:manage", "credentials:verify"]
                  : []),
              ];
  return {
    ...value,
    clinic: {
      membershipId: "92244981-bd22-4428-9221-aab03a192741",
      permissions,
      accessVersion: 1,
      patientScope: "CLINIC",
      job: null,
      medicalPracticeEnabled: permissions.includes("consultation:write"),
      ...c,
    },
  };
}
