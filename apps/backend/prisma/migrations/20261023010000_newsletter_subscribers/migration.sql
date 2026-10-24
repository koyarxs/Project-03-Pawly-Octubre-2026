BEGIN;

CREATE TABLE "NewsletterSubscriber" (
  "id" UUID NOT NULL,
  "clinicId" UUID NOT NULL,
  "email" VARCHAR(254) NOT NULL,
  "consentVersion" VARCHAR(32) NOT NULL DEFAULT 'newsletter-v1',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NewsletterSubscriber_email_check" CHECK (
    "email" = lower(btrim("email")) AND "email" ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  CONSTRAINT "NewsletterSubscriber_consent_check" CHECK ("consentVersion" = 'newsletter-v1'),
  CONSTRAINT "NewsletterSubscriber_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "NewsletterSubscriber_clinicId_email_key" ON "NewsletterSubscriber"("clinicId", "email");

COMMIT;
