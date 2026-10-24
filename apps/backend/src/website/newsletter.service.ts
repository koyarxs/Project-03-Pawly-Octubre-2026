import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { NewsletterMailService } from "./newsletter-mail.service";

@Injectable()
export class NewsletterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: NewsletterMailService,
  ) {}

  async subscribe(email: string) {
    const clinicId = this.config.get<string>("WEBSITE_CLINIC_ID");
    if (!clinicId) throw new ServiceUnavailableException();
    try {
      // One atomic statement validates the configured clinic and ignores duplicates.
      // Parameterized SQL avoids both races and exposing subscriber existence.
      await this.prisma.$transaction(
        async (tx) => {
          const clinic = await tx.veterinaryClinic.findFirst({
            where: { id: clinicId, status: "ACTIVE" },
            select: { id: true },
          });
          if (!clinic) throw new ServiceUnavailableException();
          const inserted = await tx.$executeRaw`
        INSERT INTO "NewsletterSubscriber" ("id", "clinicId", "email", "consentVersion")
        SELECT ${randomUUID()}::uuid, "id", ${email.trim().toLowerCase()}, 'newsletter-v1'
        FROM "VeterinaryClinic" WHERE "id" = ${clinicId}::uuid AND "status" = 'ACTIVE'
        ON CONFLICT ("clinicId", "email") DO NOTHING
      `;
          if (inserted > 0)
            await this.mail.acknowledge(email.trim().toLowerCase());
        },
        { timeout: 10000 },
      );
      return { status: "accepted" as const };
    } catch {
      // Never serialize database errors, subscriber addresses or credentials.
      throw new ServiceUnavailableException();
    }
  }
}
