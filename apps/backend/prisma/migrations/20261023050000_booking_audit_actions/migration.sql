-- Permit the new booking configuration audit events while preserving all existing events.
-- Transactional replacement: no window without the constraint and no row updates.
BEGIN;
ALTER TABLE "AccessAuditLog" DROP CONSTRAINT "AccessAuditLog_action_check";
ALTER TABLE "AccessAuditLog" ADD CONSTRAINT "AccessAuditLog_action_check" CHECK (
  "action" IN (
    'INVITED','INVITATION_ROTATED','INVITATION_ACCEPTED','PROFILE_UPDATED','ACCESS_UPDATED',
    'SUSPENDED','ACTIVATED','CREDENTIAL_VERIFIED','CREDENTIAL_REVOKED','PUBLIC_CONSENT_GIVEN',
    'PUBLIC_CONSENT_WITHDRAWN','PROFILE_PUBLISHED','PROFILE_HIDDEN','PATIENT_ASSIGNED','PATIENT_UNASSIGNED',
    'BOOKING_SETTINGS','BOOKING_SERVICE','BOOKING_OWN_HOURS'
  )
);
COMMIT;
