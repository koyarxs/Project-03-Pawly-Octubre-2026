-- PostgreSQL 17; additive migration, no existing business rows updated.
BEGIN;

-- CreateEnum
CREATE TYPE "StaffJob" AS ENUM ('CLINIC_DIRECTOR', 'VETERINARIAN', 'VET_TECHNICIAN', 'RECEPTIONIST', 'PET_GROOMER');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'REVOKED');

-- CreateEnum
CREATE TYPE "PatientScope" AS ENUM ('CLINIC', 'ASSIGNED');

-- CreateEnum
CREATE TYPE "PermissionKey" AS ENUM ('CLINIC_READ', 'CLINIC_MANAGE', 'STAFF_READ', 'STAFF_CREATE', 'STAFF_UPDATE', 'STAFF_DEACTIVATE', 'PERMISSIONS_MANAGE', 'CREDENTIALS_VERIFY', 'PUBLIC_PROFILES_MANAGE', 'AUDIT_READ', 'TUTOR_READ', 'TUTOR_WRITE', 'PATIENT_READ', 'PATIENT_CREATE', 'PATIENT_UPDATE', 'PATIENT_NOTES', 'PATIENT_ASSIGN', 'CLINICAL_ARCHIVE', 'APPOINTMENT_READ', 'APPOINTMENT_WRITE', 'APPOINTMENT_CLINICAL', 'CONSULTATION_READ', 'CONSULTATION_WRITE', 'PRESCRIPTION_CREATE', 'VACCINATION_MANAGE', 'HOSPITALIZATION_READ', 'HOSPITALIZATION_UPDATE', 'INVENTORY_MANAGE', 'CASH_REGISTER_OPEN', 'CASH_REGISTER_CLOSE', 'PAYMENTS_MANAGE', 'FINANCIAL_REPORTS_READ', 'GROOMING_MANAGE');

-- AlterEnum
ALTER TYPE "MembershipStatus" ADD VALUE 'INVITED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Role" ADD VALUE 'CLINIC_DIRECTOR';
ALTER TYPE "Role" ADD VALUE 'VET_TECHNICIAN';
ALTER TYPE "Role" ADD VALUE 'PET_GROOMER';

-- AlterTable
ALTER TABLE "ClinicMembership" ADD COLUMN     "accessVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "patientScope" "PatientScope" NOT NULL DEFAULT 'CLINIC',
ADD COLUMN     "permissionDenials" "PermissionKey"[] NOT NULL DEFAULT ARRAY[]::"PermissionKey"[],
ADD COLUMN     "permissionGrants" "PermissionKey"[] NOT NULL DEFAULT ARRAY[]::"PermissionKey"[];

-- CreateTable
CREATE TABLE "StaffProfile" (
    "membershipId" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "job" "StaffJob" NOT NULL,
    "specialty" VARCHAR(160) NOT NULL DEFAULT '',
    "biography" VARCHAR(1500) NOT NULL DEFAULT '',
    "photoKey" VARCHAR(40) NOT NULL DEFAULT 'initials',
    "professionalPhone" VARCHAR(32),
    "credentialNumber" VARCHAR(120),
    "credentialStatus" "CredentialStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "credentialEvidence" VARCHAR(500),
    "credentialVerifiedAt" TIMESTAMPTZ(3),
    "credentialVerifiedById" UUID,
    "medicalPracticeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "publicConsentHash" VARCHAR(64),
    "publicConsentAt" TIMESTAMPTZ(3),
    "publicSnapshot" JSONB,
    "publishedAt" TIMESTAMPTZ(3),
    "publishedConsentHash" VARCHAR(64),
    "publicOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("membershipId")
);

-- CreateTable
CREATE TABLE "StaffInvitation" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "issuedByMembershipId" UUID NOT NULL,
    "tokenHash" VARCHAR(64) NOT NULL,
    "accountCreated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "StaffInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessAuditLog" (
    "id" UUID NOT NULL,
    "clinicId" UUID NOT NULL,
    "actorMembershipId" UUID NOT NULL,
    "targetMembershipId" UUID NOT NULL,
    "action" VARCHAR(60) NOT NULL,
    "before" JSONB,
    "after" JSONB NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAssignment" (
    "clinicId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "assignedByMembershipId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientAssignment_pkey" PRIMARY KEY ("clinicId","membershipId","patientId")
);

-- CreateIndex
CREATE INDEX "StaffProfile_clinicId_job_idx" ON "StaffProfile"("clinicId", "job");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProfile_membershipId_clinicId_key" ON "StaffProfile"("membershipId", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffInvitation_tokenHash_key" ON "StaffInvitation"("tokenHash");

-- CreateIndex
CREATE INDEX "StaffInvitation_clinicId_membershipId_expiresAt_idx" ON "StaffInvitation"("clinicId", "membershipId", "expiresAt");

-- CreateIndex
CREATE INDEX "AccessAuditLog_clinicId_createdAt_id_idx" ON "AccessAuditLog"("clinicId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "AccessAuditLog_clinicId_targetMembershipId_createdAt_idx" ON "AccessAuditLog"("clinicId", "targetMembershipId", "createdAt");

-- CreateIndex
CREATE INDEX "PatientAssignment_clinicId_patientId_idx" ON "PatientAssignment"("clinicId", "patientId");

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_membershipId_clinicId_fkey" FOREIGN KEY ("membershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_credentialVerifiedById_clinicId_fkey" FOREIGN KEY ("credentialVerifiedById", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_membershipId_clinicId_fkey" FOREIGN KEY ("membershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_issuedByMembershipId_clinicId_fkey" FOREIGN KEY ("issuedByMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AccessAuditLog" ADD CONSTRAINT "AccessAuditLog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AccessAuditLog" ADD CONSTRAINT "AccessAuditLog_actorMembershipId_clinicId_fkey" FOREIGN KEY ("actorMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AccessAuditLog" ADD CONSTRAINT "AccessAuditLog_targetMembershipId_clinicId_fkey" FOREIGN KEY ("targetMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PatientAssignment" ADD CONSTRAINT "PatientAssignment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PatientAssignment" ADD CONSTRAINT "PatientAssignment_membershipId_clinicId_fkey" FOREIGN KEY ("membershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PatientAssignment" ADD CONSTRAINT "PatientAssignment_patientId_clinicId_fkey" FOREIGN KEY ("patientId", "clinicId") REFERENCES "Patient"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PatientAssignment" ADD CONSTRAINT "PatientAssignment_assignedByMembershipId_clinicId_fkey" FOREIGN KEY ("assignedByMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT;



ALTER TABLE "ClinicMembership" ADD CONSTRAINT "ClinicMembership_access_version_check" CHECK ("accessVersion" >= 1),
ADD CONSTRAINT "ClinicMembership_permission_overlap_check" CHECK (NOT ("permissionGrants" && "permissionDenials"));
ALTER TABLE "StaffProfile"
ADD CONSTRAINT "StaffProfile_version_order_check" CHECK ("version">=1 AND "publicOrder" BETWEEN 0 AND 9999),
ADD CONSTRAINT "StaffProfile_verification_check" CHECK (
  ("credentialStatus" <> 'VERIFIED' AND NOT "medicalPracticeEnabled") OR
  ("credentialStatus" = 'VERIFIED' AND "credentialNumber" IS NOT NULL AND "credentialEvidence" IS NOT NULL AND length(trim("credentialNumber"))>0 AND length(trim("credentialEvidence"))>0 AND "credentialVerifiedAt" IS NOT NULL AND "credentialVerifiedById" IS NOT NULL AND "credentialVerifiedById" <> "membershipId")
),
ADD CONSTRAINT "StaffProfile_consent_check" CHECK (("publicConsentHash" IS NULL AND "publicConsentAt" IS NULL) OR ("publicConsentHash" IS NOT NULL AND "publicConsentHash" ~ '^[a-f0-9]{64}$' AND "publicConsentAt" IS NOT NULL)),
ADD CONSTRAINT "StaffProfile_publication_check" CHECK (("publicSnapshot" IS NULL AND "publishedAt" IS NULL AND "publishedConsentHash" IS NULL) OR ("publicSnapshot" IS NOT NULL AND jsonb_typeof("publicSnapshot")='object' AND "publishedAt" IS NOT NULL AND "publishedConsentHash" IS NOT NULL AND "publishedConsentHash" ~ '^[a-f0-9]{64}$'));
ALTER TABLE "StaffInvitation" ADD CONSTRAINT "StaffInvitation_bounds_check" CHECK ("expiresAt">"createdAt" AND "tokenHash" ~ '^[a-f0-9]{64}$');
ALTER TABLE "AccessAuditLog" ADD CONSTRAINT "AccessAuditLog_payload_check" CHECK (jsonb_typeof("after")='object' AND ("before" IS NULL OR jsonb_typeof("before")='object') AND length(trim("reason"))>=3),
ADD CONSTRAINT "AccessAuditLog_action_check" CHECK ("action" IN ('INVITED','INVITATION_ROTATED','INVITATION_ACCEPTED','PROFILE_UPDATED','ACCESS_UPDATED','SUSPENDED','ACTIVATED','CREDENTIAL_VERIFIED','CREDENTIAL_REVOKED','PUBLIC_CONSENT_GIVEN','PUBLIC_CONSENT_WITHDRAWN','PROFILE_PUBLISHED','PROFILE_HIDDEN','PATIENT_ASSIGNED','PATIENT_UNASSIGNED'));
CREATE FUNCTION "protectAccessAudit"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Access audit records are append-only' USING ERRCODE='23514'; END;
$$;
CREATE TRIGGER "AccessAuditLog_append_only" BEFORE UPDATE OR DELETE ON "AccessAuditLog" FOR EACH ROW EXECUTE FUNCTION "protectAccessAudit"();

COMMIT;
