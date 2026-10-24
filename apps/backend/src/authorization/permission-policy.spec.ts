import {
  effectivePermissions,
  patientScope,
  type AccessMember,
} from "./permission-policy";
function member(role: AccessMember["role"], verified = false): AccessMember {
  return {
    id: "member",
    clinicId: "clinic",
    role,
    status: "ACTIVE",
    permissionGrants: [],
    permissionDenials: [],
    patientScope: "CLINIC",
    user: { status: "ACTIVE" },
    clinic: { status: "ACTIVE" },
    staffProfile: verified
      ? {
          credentialStatus: "VERIFIED",
          medicalPracticeEnabled: true,
          credentialVerifiedById: "independent-reviewer",
        }
      : null,
  } as unknown as AccessMember;
}
describe("effective clinic permissions", () => {
  it("scopes simulated medical permissions to local demo, respecting denials", () => {
    const oldMode = process.env.NODE_ENV,
      oldClinic = process.env.BOOKING_DEMO_CLINIC_ID;
    const m = member("OWNER");
    m.clinic.id = "demo-clinic";
    m.staffProfile = {
      credentialEvidence: "PAWLY_BOOKING_DEMO_ONLY",
      credentialStatus: "UNVERIFIED",
      medicalPracticeEnabled: false,
    } as AccessMember["staffProfile"];
    try {
      process.env.NODE_ENV = "development";
      process.env.BOOKING_DEMO_CLINIC_ID = "demo-clinic";
      expect(effectivePermissions(m)).toContain("appointment:clinical");
      m.permissionDenials = ["APPOINTMENT_CLINICAL"];
      expect(effectivePermissions(m)).not.toContain("appointment:clinical");
      m.permissionDenials = [];
      process.env.BOOKING_DEMO_CLINIC_ID = "another-clinic";
      expect(effectivePermissions(m)).not.toContain("consultation:write");
      process.env.BOOKING_DEMO_CLINIC_ID = "demo-clinic";
      process.env.NODE_ENV = "production";
      expect(effectivePermissions(m)).not.toContain("consultation:write");
    } finally {
      if (oldMode === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = oldMode;
      if (oldClinic === undefined) delete process.env.BOOKING_DEMO_CLINIC_ID;
      else process.env.BOOKING_DEMO_CLINIC_ID = oldClinic;
    }
  });
  it.each(["OWNER", "ADMIN", "CLINIC_DIRECTOR", "VETERINARIAN"] as const)(
    "%s requires independent verification for medical faculties",
    (role) => {
      expect(effectivePermissions(member(role))).not.toContain(
        "consultation:write",
      );
      expect(effectivePermissions(member(role, true))).toContain(
        "consultation:write",
      );
    },
  );
  it.each(["RECEPTIONIST", "VET_TECHNICIAN", "PET_GROOMER"] as const)(
    "%s cannot acquire medical faculties through grants or job title",
    (role) => {
      const m = member(role, true);
      m.permissionGrants = [
        "CONSULTATION_WRITE",
        "PATIENT_NOTES",
        "APPOINTMENT_CLINICAL",
      ];
      expect(effectivePermissions(m)).not.toEqual(
        expect.arrayContaining(["consultation:write"]),
      );
      expect(effectivePermissions(m)).not.toContain("patient:notes");
    },
  );
  it("director has no ownership/security delegation authority by default", () => {
    const p = effectivePermissions(member("CLINIC_DIRECTOR"));
    expect(p).toContain("staff:create");
    expect(p).toContain("permissions:manage");
    expect(p).not.toContain("credentials:verify");
  });
  it("denials win and pending modules never become operational through grants", () => {
    const m = member("OWNER", true);
    m.permissionDenials = ["TUTOR_WRITE"];
    m.permissionGrants = ["TUTOR_WRITE", "PAYMENTS_MANAGE", "GROOMING_MANAGE"];
    expect(effectivePermissions(m)).not.toContain("tutor:write");
    expect(effectivePermissions(m)).not.toContain("payments:manage");
  });
  it.each(["SUSPENDED", "INVITED"] as const)(
    "%s memberships have no effective permissions",
    (status) => {
      const m = member("OWNER", true);
      m.status = status;
      expect(effectivePermissions(m)).toEqual([]);
    },
  );
  it("suspending the global account or clinic also revokes access", () => {
    const m = member("OWNER", true);
    m.user.status = "SUSPENDED";
    expect(effectivePermissions(m)).toEqual([]);
    m.user.status = "ACTIVE";
    m.clinic.status = "SUSPENDED";
    expect(effectivePermissions(m)).toEqual([]);
  });
  it("self verification cannot unlock medical actions", () => {
    const m = member("OWNER", true);
    m.staffProfile!.credentialVerifiedById = m.id;
    expect(effectivePermissions(m)).not.toContain("consultation:write");
  });
  it("assigned scope includes only explicit assignments or a genuine care relationship", () => {
    const m = member("PET_GROOMER");
    m.patientScope = "ASSIGNED";
    expect(patientScope(m)).toHaveProperty("OR");
    expect(patientScope({ ...m, patientScope: "CLINIC" })).toEqual({});
  });
});
