-- Mailpit capture is distinct from external SMTP delivery.
-- Preserve the target and attempt constraints while allowing the worker's local state.
ALTER TABLE "BookingNotification" DROP CONSTRAINT "BookingNotification_target";
ALTER TABLE "BookingNotification" ADD CONSTRAINT "BookingNotification_target" CHECK (
  ("bookingId" IS NOT NULL)::int + ("appointmentId" IS NOT NULL)::int = 1
  AND "state" IN ('PENDING','SENT','CAPTURED','DISABLED','FAILED','SKIPPED')
  AND "attempts" >= 0
);
