import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, type VeterinaryWebsite } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  initialWebsiteContent,
  type SaveWebsiteDto,
  type WebsiteVersionDto,
} from "./website.dto";

@Injectable()
export class WebsiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private requireClinic(clinicId: string) {
    const configured = this.config.get<string>("WEBSITE_CLINIC_ID");
    if (!configured) throw new ServiceUnavailableException();
    if (configured !== clinicId) throw new ForbiddenException();
  }

  private state(
    row: VeterinaryWebsite | null,
    clinicId: string,
    clinicName: string,
  ) {
    if (row && row.clinicId !== clinicId) throw new ForbiddenException();
    return {
      clinicId,
      version: row?.version ?? 0,
      content:
        row?.draft ??
        initialWebsiteContent(
          this.config.get<string>("WEBSITE_PUBLIC_NAME") || clinicName,
        ),
      publishedAt: row?.publishedAt?.toISOString() ?? null,
      updatedAt: row?.updatedAt.toISOString() ?? null,
      hasUnpublishedChanges:
        !row || JSON.stringify(row.draft) !== JSON.stringify(row.published),
    };
  }

  private databaseError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2021") throw new ServiceUnavailableException();
      if (["P2002", "P2034"].includes(error.code))
        throw new ConflictException();
    }
    throw error;
  }

  async publicSite() {
    const clinicId = this.config.get<string>("WEBSITE_CLINIC_ID");
    if (!clinicId) return { content: null, publishedAt: null };
    try {
      const row = await this.prisma.veterinaryWebsite.findFirst({
        where: { id: "main", clinicId, clinic: { status: "ACTIVE" } },
        select: { published: true, publishedAt: true },
      });
      // Deliberately omit draft, authors, clinic IDs and all clinical records.
      return {
        content: row?.published ?? null,
        publishedAt: row?.publishedAt?.toISOString() ?? null,
      };
    } catch (error) {
      this.databaseError(error);
    }
  }

  async read(clinicId: string, clinicName: string) {
    this.requireClinic(clinicId);
    try {
      return this.state(
        await this.prisma.veterinaryWebsite.findUnique({
          where: { id: "main" },
        }),
        clinicId,
        clinicName,
      );
    } catch (error) {
      this.databaseError(error);
    }
  }

  async save(
    clinicId: string,
    clinicName: string,
    userId: string,
    input: SaveWebsiteDto,
  ) {
    this.requireClinic(clinicId);
    const draft = JSON.parse(
      JSON.stringify(input.content),
    ) as Prisma.InputJsonObject;
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const actor = await this.actor(tx, clinicId, userId);
        if (input.version === 0) {
          return tx.veterinaryWebsite.create({
            data: {
              id: "main",
              clinicId,
              draft,
              updatedByMembershipId: actor.id,
            },
          });
        }
        const updated = await tx.veterinaryWebsite.updateMany({
          where: { id: "main", clinicId, version: input.version },
          data: {
            draft,
            version: { increment: 1 },
            updatedByMembershipId: actor.id,
          },
        });
        if (updated.count !== 1) throw new ConflictException();
        return tx.veterinaryWebsite.findUniqueOrThrow({
          where: { id: "main" },
        });
      });
      return this.state(row, clinicId, clinicName);
    } catch (error) {
      this.databaseError(error);
    }
  }

  async publish(
    clinicId: string,
    clinicName: string,
    userId: string,
    input: WebsiteVersionDto,
  ) {
    this.requireClinic(clinicId);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const actor = await this.actor(tx, clinicId, userId);
        const current = await tx.veterinaryWebsite.findFirst({
          where: { id: "main", clinicId, version: input.version },
        });
        if (!current) throw new ConflictException();
        const content = current.draft as Record<string, unknown>;
        if (
          (!content.phone && !content.email && !content.whatsapp) ||
          (content.showServices &&
            (!Array.isArray(content.services) || !content.services.length)) ||
          (content.showAbout && (!content.aboutTitle || !content.aboutText)) ||
          (content.showHours && !content.hours)
        )
          throw new BadRequestException();
        const updated = await tx.veterinaryWebsite.updateMany({
          where: { id: "main", clinicId, version: input.version },
          data: {
            published: current.draft as Prisma.InputJsonObject,
            publishedAt: new Date(),
            publishedByMembershipId: actor.id,
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1) throw new ConflictException();
        return tx.veterinaryWebsite.findUniqueOrThrow({
          where: { id: "main" },
        });
      });
      return this.state(row, clinicId, clinicName);
    } catch (error) {
      this.databaseError(error);
    }
  }

  async unpublish(
    clinicId: string,
    clinicName: string,
    userId: string,
    input: WebsiteVersionDto,
  ) {
    this.requireClinic(clinicId);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await this.actor(tx, clinicId, userId);
        const result = await tx.veterinaryWebsite.updateMany({
          where: { id: "main", clinicId, version: input.version },
          data: {
            published: Prisma.DbNull,
            publishedAt: null,
            publishedByMembershipId: null,
            version: { increment: 1 },
          },
        });
        if (result.count !== 1) throw new ConflictException();
        return tx.veterinaryWebsite.findUniqueOrThrow({
          where: { id: "main" },
        });
      });
      return this.state(row, clinicId, clinicName);
    } catch (error) {
      this.databaseError(error);
    }
  }

  private async actor(
    tx: Prisma.TransactionClient,
    clinicId: string,
    userId: string,
  ) {
    const member = await tx.clinicMembership.findFirst({
      where: {
        clinicId,
        userId,
        role: { in: ["OWNER", "ADMIN"] },
        status: "ACTIVE",
        user: { status: "ACTIVE" },
        clinic: { status: "ACTIVE" },
      },
      select: { id: true },
    });
    if (!member) throw new ForbiddenException();
    return member;
  }
}
