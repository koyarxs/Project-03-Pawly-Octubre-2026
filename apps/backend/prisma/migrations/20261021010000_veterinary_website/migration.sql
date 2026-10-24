BEGIN;

CREATE TABLE "VeterinaryWebsite" (
  "id" VARCHAR(32) NOT NULL DEFAULT 'main',
  "clinicId" UUID NOT NULL,
  "draft" JSONB NOT NULL,
  "published" JSONB,
  "version" INTEGER NOT NULL DEFAULT 1,
  "publishedAt" TIMESTAMPTZ(3),
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "updatedByMembershipId" UUID NOT NULL,
  "publishedByMembershipId" UUID,
  CONSTRAINT "VeterinaryWebsite_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VeterinaryWebsite_single_site_check" CHECK ("id" = 'main'),
  CONSTRAINT "VeterinaryWebsite_version_check" CHECK ("version" >= 1),
  CONSTRAINT "VeterinaryWebsite_draft_check" CHECK (jsonb_typeof("draft") = 'object'),
  CONSTRAINT "VeterinaryWebsite_publication_check" CHECK (
    ("published" IS NULL AND "publishedAt" IS NULL AND "publishedByMembershipId" IS NULL)
    OR ("published" IS NOT NULL AND jsonb_typeof("published") = 'object' AND "publishedAt" IS NOT NULL AND "publishedByMembershipId" IS NOT NULL)
  ),
  CONSTRAINT "VeterinaryWebsite_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "VeterinaryClinic"("id") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "VeterinaryWebsite_updatedByMembershipId_clinicId_fkey" FOREIGN KEY ("updatedByMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT "VeterinaryWebsite_publishedByMembershipId_clinicId_fkey" FOREIGN KEY ("publishedByMembershipId", "clinicId") REFERENCES "ClinicMembership"("id", "clinicId") ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX "VeterinaryWebsite_clinicId_key" ON "VeterinaryWebsite"("clinicId");

COMMIT;
