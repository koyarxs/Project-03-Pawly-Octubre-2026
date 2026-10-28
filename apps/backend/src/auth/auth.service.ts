import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { SessionsService } from "../sessions/sessions.service";
import {
  LoginDto,
  normalizeEmail,
  RegisterClinicDto,
  RegisterUserDto,
} from "./dto/auth.dto";
import { PasswordService } from "./password.service";

const publicUser = {
  id: true,
  name: true,
  email: true,
  emailVerifiedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionsService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterClinicDto) {
    // No provider exists yet: public registration is explicitly development-only.
    if (
      this.config.get<string>("NODE_ENV") === "production" ||
      this.config.get<string>("WEBSITE_CLINIC_ID")
    )
      throw new ServiceUnavailableException("Registro no disponible.");
    const passwordHash = await this.passwords.hash(dto.password);
    const base =
      dto.clinicName
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        // Reserve 37 characters for the separator and the complete random UUID.
        .slice(0, 100 - 1 - 36)
        .replace(/-+$/g, "") || "clinica";
    for (let attempt = 0; attempt < 3; attempt++) {
      const slug = `${base}-${randomUUID()}`;
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const user = await tx.user.create({
              data: {
                name: dto.name,
                email: dto.email,
                normalizedEmail: normalizeEmail(dto.email),
                passwordHash,
              },
              select: publicUser,
            });
            const clinic = await tx.veterinaryClinic.create({
              data: { name: dto.clinicName, slug },
              select: { id: true, name: true, slug: true, timezone: true },
            });
            await tx.clinicMembership.create({
              data: { userId: user.id, clinicId: clinic.id, role: "OWNER" },
            });
            return { user, clinic, role: "OWNER" as const };
          },
          { maxWait: 5000, timeout: 10000 },
        );
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2002"
        )
          throw error;
        const target = error.meta?.target;
        if (Array.isArray(target) && target.includes("slug") && attempt < 2)
          continue;
        throw new ConflictException("No se pudo completar el registro.");
      }
    }
    throw new ConflictException("No se pudo completar el registro.");
  }

  async login(dto: LoginDto, response: Response) {
    const user = await this.prisma.user.findUnique({
      where: { normalizedEmail: normalizeEmail(dto.email) },
      select: { ...publicUser, status: true, passwordHash: true },
    });
    const valid = await this.passwords.verify(user?.passwordHash, dto.password);
    if (
      !user ||
      !valid ||
      user.status !== "ACTIVE" ||
      (this.config.get<string>("NODE_ENV") === "production" &&
        !user.emailVerifiedAt)
    )
      throw new UnauthorizedException("Credenciales inválidas.");
    await this.sessions.create(user.id, response);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerifiedAt: user.emailVerifiedAt,
      },
    };
  }

  async registerUser(dto: RegisterUserDto, response: Response) {
    const clinicId = this.config.get<string>("WEBSITE_CLINIC_ID");
    if (!clinicId || this.config.get<string>("NODE_ENV") === "production")
      throw new ServiceUnavailableException("Registro no disponible.");
    const passwordHash = await this.passwords.hash(dto.password);
    let result;
    try {
      result = await this.prisma.$transaction(async (tx) => {
        const clinic = await tx.veterinaryClinic.findFirst({
          where: { id: clinicId, status: "ACTIVE" },
          select: { id: true, name: true, slug: true, timezone: true },
        });
        if (!clinic)
          throw new ServiceUnavailableException("Registro no disponible.");
        const user = await tx.user.create({
          data: {
            name: dto.name.trim(),
            email: dto.email.trim(),
            normalizedEmail: normalizeEmail(dto.email),
            passwordHash,
          },
          select: publicUser,
        });
        const member = await tx.clinicMembership.create({
          data: { userId: user.id, clinicId, role: dto.role },
        });
        await tx.staffProfile.create({
          data: {
            clinicId,
            membershipId: member.id,
            displayName: user.name,
            job: dto.role,
          },
        });
        return { user, clinic, role: dto.role };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException("No se pudo completar el registro.");
      throw error;
    }
    await this.sessions.create(result.user.id, response);
    return result;
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        ...publicUser,
        memberships: {
          where: { status: "ACTIVE", clinic: { status: "ACTIVE" } },
          select: {
            role: true,
            clinic: {
              select: { id: true, name: true, slug: true, timezone: true },
            },
          },
        },
      },
    });
  }
}
