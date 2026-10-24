import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PermissionKey, Prisma, Role, StaffJob } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { PasswordService } from "../auth/password.service";
import { permissionLabels } from "./permission-labels";
import { normalizeEmail } from "../auth/dto/auth.dto";
import {
  effectivePermissions,
  implementedKeys,
  lockClinic,
  medicalRoles,
  memberInclude,
  permissionCatalog,
  requireMember,
  requirePatient,
  roleDefaults,
  type AccessMember,
  type Permission,
} from "../authorization/permission-policy";
import {
  AcceptInvitationDto,
  AssignmentDto,
  ConsentDto,
  CredentialDto,
  InviteStaffDto,
  PublicationDto,
  StaffAccessDto,
  StaffProfileDto,
  StaffStatusDto,
  VersionDto,
} from "./staff.dto";

const hash = (text: string) => createHash("sha256").update(text).digest("hex");
const internalSelect = {
  id: true,
  role: true,
  status: true,
  patientScope: true,
  accessVersion: true,
  permissionGrants: true,
  permissionDenials: true,
  staffProfile: true,
  user: { select: { name: true, email: true, status: true } },
} satisfies Prisma.ClinicMembershipSelect;
const defaultJob = (role: Role): StaffJob =>
  role === "OWNER" || role === "ADMIN" ? "CLINIC_DIRECTOR" : role;
const publicFields = (p: {
  displayName: string;
  job: StaffJob;
  specialty: string;
  biography: string;
  photoKey: string;
}) => ({
  displayName: p.displayName,
  job: p.job,
  specialty: p.specialty,
  biography: p.biography,
  photoKey: p.photoKey,
});

@Injectable()
export class StaffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly config: ConfigService,
  ) {}

  catalog() {
    return {
      permissions: implementedKeys.map((key) => ({
        key,
        name: permissionCatalog[key],
        label: permissionLabels[key],
      })),
      roles: Object.keys(roleDefaults),
      jobs: Object.values(StaffJob),
      pendingPermissions: Object.values(PermissionKey).filter(
        (key) =>
          !implementedKeys.includes(key as keyof typeof permissionCatalog),
      ),
    };
  }

  private async write<T>(
    clinicId: string,
    userId: string,
    permission: Permission,
    operation: (
      tx: Prisma.TransactionClient,
      actor: AccessMember,
    ) => Promise<T>,
  ) {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await lockClinic(tx, clinicId);
          const actor = await requireMember(tx, clinicId, userId, [permission]);
          return operation(tx, actor);
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          maxWait: 5000,
          timeout: 15000,
        },
      );
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2003", "P2034"].includes(e.code)
      )
        throw new ConflictException(
          "Los datos cambiaron. Recarga e inténtalo nuevamente.",
        );
      throw e;
    }
  }
  private async target(
    tx: Prisma.TransactionClient,
    clinicId: string,
    id: string,
  ) {
    const m = await tx.clinicMembership.findFirst({
      where: { id, clinicId },
      include: {
        ...memberInclude,
        user: { select: { status: true, name: true, email: true } },
      },
    });
    if (!m) throw new NotFoundException();
    return m;
  }
  private protect(actor: AccessMember, target: AccessMember) {
    if (actor.id === target.id || target.role === "OWNER")
      throw new ForbiddenException(
        "No puedes cambiar tu propio acceso ni el del propietario.",
      );
    if (
      actor.role !== "OWNER" &&
      ["ADMIN", "CLINIC_DIRECTOR"].includes(target.role)
    )
      throw new ForbiddenException("Este acceso requiere al propietario.");
  }
  private delegationCeiling(
    actor: AccessMember,
    proposed: Permission[],
    existing: Permission[] = [],
  ) {
    if (
      actor.role !== "OWNER" &&
      proposed.some(
        (p) =>
          !effectivePermissions(actor).includes(p) && !existing.includes(p),
      )
    )
      throw new ForbiddenException(
        "No puedes conceder facultades que no posees.",
      );
  }
  private async audit(
    tx: Prisma.TransactionClient,
    actor: AccessMember,
    targetId: string,
    action: string,
    reason: string,
    before: object | null,
    after: object,
  ) {
    await tx.accessAuditLog.create({
      data: {
        clinicId: actor.clinicId,
        actorMembershipId: actor.id,
        targetMembershipId: targetId,
        action,
        reason,
        before: before
          ? (JSON.parse(JSON.stringify(before)) as Prisma.InputJsonObject)
          : Prisma.DbNull,
        after: JSON.parse(JSON.stringify(after)) as Prisma.InputJsonObject,
      },
    });
  }
  private async profile(
    tx: Prisma.TransactionClient,
    m: Awaited<ReturnType<StaffService["target"]>>,
  ) {
    return (
      m.staffProfile ??
      tx.staffProfile.create({
        data: {
          membershipId: m.id,
          clinicId: m.clinicId,
          displayName: m.user.name,
          job: defaultJob(m.role),
        },
      })
    );
  }
  async list(clinicId: string, userId: string) {
    await requireMember(this.prisma, clinicId, userId, ["staff:read"]);
    const members = await this.prisma.clinicMembership.findMany({
      where: { clinicId },
      select: {
        ...internalSelect,
        clinic: { select: { id: true, name: true, slug: true, status: true } },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    return {
      items: members.map((m) => ({
        id: m.id,
        role: m.role,
        status: m.status,
        patientScope: m.patientScope,
        accessVersion: m.accessVersion,
        permissionGrants: m.permissionGrants,
        permissionDenials: m.permissionDenials,
        staffProfile: m.staffProfile,
        user: m.user,
        permissions: effectivePermissions(m),
      })),
      catalog: this.catalog(),
    };
  }
  async me(clinicId: string, userId: string) {
    const m = await requireMember(this.prisma, clinicId, userId, [
      "clinic:read",
    ]);
    // No profile is created by a read. A worker can consent only to an explicit draft.
    return {
      membershipId: m.id,
      profile: m.staffProfile,
      permissions: effectivePermissions(m),
    };
  }
  async auditList(clinicId: string, userId: string, targetId?: string) {
    await requireMember(this.prisma, clinicId, userId, ["audit:read"]);
    if (targetId) await this.target(this.prisma, clinicId, targetId);
    return {
      items: await this.prisma.accessAuditLog.findMany({
        where: {
          clinicId,
          ...(targetId ? { targetMembershipId: targetId } : {}),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 100,
        select: {
          id: true,
          action: true,
          reason: true,
          before: true,
          after: true,
          createdAt: true,
          targetMembershipId: true,
          actor: { select: { user: { select: { name: true } } } },
        },
      }),
    };
  }
  async invite(clinicId: string, userId: string, dto: InviteStaffDto) {
    if (dto.role === "OWNER")
      throw new ForbiddenException(
        "La propiedad no se asigna mediante invitaciones.",
      );
    const token = randomBytes(32).toString("base64url"),
      passwordHash = await this.passwords.hash(
        randomBytes(48).toString("base64url"),
      );
    return this.write(clinicId, userId, "staff:create", async (tx, actor) => {
      if (
        actor.role !== "OWNER" &&
        ["ADMIN", "CLINIC_DIRECTOR"].includes(dto.role)
      )
        throw new ForbiddenException();
      this.delegationCeiling(
        actor,
        effectivePermissions({
          id: "pending",
          role: dto.role,
          status: "ACTIVE",
          user: { status: "ACTIVE" },
          clinic: actor.clinic,
          staffProfile: null,
          permissionGrants: [],
          permissionDenials: [],
        }),
      );
      const normalizedEmail = normalizeEmail(dto.email);
      let user = await tx.user.findUnique({
        where: { normalizedEmail },
        select: { id: true },
      });
      const accountCreated = !user;
      if (!user)
        user = await tx.user.create({
          data: {
            name: dto.name,
            email: dto.email,
            normalizedEmail,
            passwordHash,
          },
          select: { id: true },
        });
      if (
        await tx.clinicMembership.findUnique({
          where: { userId_clinicId: { userId: user.id, clinicId } },
        })
      )
        throw new ConflictException(
          "No se pudo crear este acceso. Revisa el listado de personal.",
        );
      const member = await tx.clinicMembership.create({
        data: {
          userId: user.id,
          clinicId,
          role: dto.role,
          status: "INVITED",
          patientScope:
            actor.patientScope === "ASSIGNED" ||
            ["VETERINARIAN", "VET_TECHNICIAN", "PET_GROOMER"].includes(dto.role)
              ? "ASSIGNED"
              : "CLINIC",
        },
      });
      await tx.staffProfile.create({
        data: {
          membershipId: member.id,
          clinicId,
          displayName: dto.name,
          job: dto.job,
        },
      });
      const expiresAt = new Date(Date.now() + 48 * 3600000);
      await tx.staffInvitation.create({
        data: {
          clinicId,
          membershipId: member.id,
          issuedByMembershipId: actor.id,
          tokenHash: hash(token),
          accountCreated,
          expiresAt,
        },
      });
      await this.audit(tx, actor, member.id, "INVITED", dto.reason, null, {
        role: member.role,
        status: "INVITED",
        patientScope: member.patientScope,
      });
      return {
        membershipId: member.id,
        activationToken: token,
        expiresAt,
        delivery: "MANUAL_LINK",
      };
    });
  }
  async rotate(clinicId: string, userId: string, id: string, dto: VersionDto) {
    const token = randomBytes(32).toString("base64url");
    return this.write(clinicId, userId, "staff:create", async (tx, actor) => {
      const m = await this.target(tx, clinicId, id);
      this.protect(actor, m);
      if (m.status !== "INVITED" || m.accessVersion !== dto.version)
        throw new ConflictException();
      this.delegationCeiling(
        actor,
        effectivePermissions({
          ...m,
          status: "ACTIVE",
          user: { status: "ACTIVE" },
        }),
      );
      if (
        actor.role !== "OWNER" &&
        actor.patientScope === "ASSIGNED" &&
        m.patientScope !== "ASSIGNED"
      )
        throw new ForbiddenException();
      const previous = await tx.staffInvitation.findFirst({
        where: { clinicId, membershipId: id },
        orderBy: { createdAt: "desc" },
      });
      if (!previous) throw new ConflictException();
      await tx.staffInvitation.updateMany({
        where: {
          clinicId,
          membershipId: id,
          consumedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      const expiresAt = new Date(Date.now() + 48 * 3600000);
      await tx.staffInvitation.create({
        data: {
          clinicId,
          membershipId: id,
          issuedByMembershipId: actor.id,
          accountCreated: previous.accountCreated,
          expiresAt,
          tokenHash: hash(token),
        },
      });
      await tx.clinicMembership.update({
        where: { id },
        data: { accessVersion: { increment: 1 } },
      });
      await this.audit(tx, actor, id, "INVITATION_ROTATED", dto.reason, null, {
        expiresAt,
      });
      return { activationToken: token, expiresAt, delivery: "MANUAL_LINK" };
    });
  }
  async updateProfile(
    clinicId: string,
    userId: string,
    id: string,
    dto: StaffProfileDto,
  ) {
    return this.write(clinicId, userId, "staff:update", async (tx, actor) => {
      const m = await this.target(tx, clinicId, id);
      // Editing public descriptions grants no privileges. Owner profiles may be edited by their owner only.
      if (m.role === "OWNER" && m.id !== actor.id)
        throw new ForbiddenException();
      const p = await this.profile(tx, m);
      if (p.version !== dto.version) throw new ConflictException();
      const data = {
        displayName: dto.displayName,
        job: dto.job,
        specialty: dto.specialty,
        biography: dto.biography,
        photoKey: dto.photoKey,
        professionalPhone: dto.professionalPhone || null,
        publicOrder: dto.publicOrder,
      };
      const updated = await tx.staffProfile.update({
        where: { membershipId: id },
        data: {
          ...data,
          version: { increment: 1 },
          publicConsentHash: null,
          publicConsentAt: null,
        },
      });
      await this.audit(
        tx,
        actor,
        id,
        "PROFILE_UPDATED",
        dto.reason,
        publicFields(p),
        publicFields(updated),
      );
      return updated;
    });
  }
  async access(
    clinicId: string,
    userId: string,
    id: string,
    dto: StaffAccessDto,
  ) {
    return this.write(
      clinicId,
      userId,
      "permissions:manage",
      async (tx, actor) => {
        const m = await this.target(tx, clinicId, id);
        this.protect(actor, m);
        // Managers may configure operational staff, never ownership or their own access.
        if (
          dto.role === "OWNER" ||
          (actor.role !== "OWNER" &&
            ["ADMIN", "CLINIC_DIRECTOR"].includes(dto.role))
        )
          throw new ForbiddenException();
        if (actor.role !== "OWNER") {
          const critical: PermissionKey[] = [
            "CLINIC_MANAGE",
            "STAFF_CREATE",
            "STAFF_UPDATE",
            "STAFF_DEACTIVATE",
            "PERMISSIONS_MANAGE",
            "CREDENTIALS_VERIFY",
            "PUBLIC_PROFILES_MANAGE",
            "AUDIT_READ",
          ];
          // Preserve owner-issued security exceptions; only the owner may alter them.
          for (const key of critical)
            if (
              dto.grants.includes(key) !== m.permissionGrants.includes(key) ||
              dto.denials.includes(key) !== m.permissionDenials.includes(key)
            )
              throw new ForbiddenException();
          const own = effectivePermissions(actor);
          if (
            dto.grants.some(
              (key) =>
                !m.permissionGrants.includes(key) &&
                (!implementedKeys.includes(
                  key as keyof typeof permissionCatalog,
                ) ||
                  !own.includes(
                    permissionCatalog[key as keyof typeof permissionCatalog],
                  )),
            )
          )
            throw new ForbiddenException();
          if (
            actor.patientScope === "ASSIGNED" &&
            dto.patientScope !== "ASSIGNED"
          )
            throw new ForbiddenException();
          const assumedActive = {
            ...m,
            status: "ACTIVE" as const,
            user: { status: "ACTIVE" as const },
            clinic: { ...m.clinic, status: "ACTIVE" as const },
          };
          this.delegationCeiling(
            actor,
            effectivePermissions({
              ...assumedActive,
              role: dto.role,
              permissionGrants: dto.grants,
              permissionDenials: dto.denials,
            }),
            effectivePermissions(assumedActive),
          );
        }
        if (m.accessVersion !== dto.version) throw new ConflictException();
        if (
          [...dto.grants, ...dto.denials].some(
            (k) =>
              !implementedKeys.includes(k as keyof typeof permissionCatalog),
          ) ||
          dto.grants.some((k) => dto.denials.includes(k))
        )
          throw new BadRequestException(
            "Permisos no disponibles o contradictorios.",
          );
        const updated = await tx.clinicMembership.update({
          where: { id },
          data: {
            role: dto.role,
            patientScope: dto.patientScope,
            permissionGrants: dto.grants,
            permissionDenials: dto.denials,
            accessVersion: { increment: 1 },
          },
        });
        await this.audit(
          tx,
          actor,
          id,
          "ACCESS_UPDATED",
          dto.reason,
          {
            role: m.role,
            scope: m.patientScope,
            grants: m.permissionGrants,
            denials: m.permissionDenials,
          },
          {
            role: updated.role,
            scope: updated.patientScope,
            grants: updated.permissionGrants,
            denials: updated.permissionDenials,
          },
        );
        return { accessVersion: updated.accessVersion };
      },
    );
  }
  async status(
    clinicId: string,
    userId: string,
    id: string,
    dto: StaffStatusDto,
  ) {
    return this.write(
      clinicId,
      userId,
      "staff:deactivate",
      async (tx, actor) => {
        const m = await this.target(tx, clinicId, id);
        this.protect(actor, m);
        if (m.accessVersion !== dto.version || m.status === "INVITED")
          throw new ConflictException();
        await tx.clinicMembership.update({
          where: { id },
          data: { status: dto.status, accessVersion: { increment: 1 } },
        });
        await this.audit(
          tx,
          actor,
          id,
          dto.status === "ACTIVE" ? "ACTIVATED" : "SUSPENDED",
          dto.reason,
          { status: m.status },
          { status: dto.status },
        );
        return { status: dto.status };
      },
    );
  }
  async credential(
    clinicId: string,
    userId: string,
    id: string,
    dto: CredentialDto,
  ) {
    return this.write(
      clinicId,
      userId,
      "credentials:verify",
      async (tx, actor) => {
        const m = await this.target(tx, clinicId, id);
        if (
          actor.id === m.id ||
          !medicalRoles.includes(m.role) ||
          m.status !== "ACTIVE"
        )
          throw new ForbiddenException(
            "La verificación requiere otro usuario autorizado y un rol médico activo.",
          );
        const p = await this.profile(tx, m);
        if (p.version !== dto.version) throw new ConflictException();
        if (dto.verified && (!dto.credentialNumber || !dto.evidence))
          throw new BadRequestException();
        await tx.staffProfile.update({
          where: { membershipId: id },
          data: {
            credentialNumber: dto.credentialNumber || null,
            credentialStatus: dto.verified ? "VERIFIED" : "REVOKED",
            credentialEvidence: dto.evidence || null,
            credentialVerifiedById: actor.id,
            credentialVerifiedAt: new Date(),
            medicalPracticeEnabled: dto.verified,
            version: { increment: 1 },
          },
        });
        await tx.clinicMembership.update({
          where: { id },
          data: { accessVersion: { increment: 1 } },
        });
        await this.audit(
          tx,
          actor,
          id,
          dto.verified ? "CREDENTIAL_VERIFIED" : "CREDENTIAL_REVOKED",
          dto.reason,
          { status: p.credentialStatus },
          {
            status: dto.verified ? "VERIFIED" : "REVOKED",
            verifiedBy: actor.id,
          },
        );
        return { verified: dto.verified };
      },
    );
  }
  async consent(clinicId: string, userId: string, dto: ConsentDto) {
    return this.write(clinicId, userId, "clinic:read", async (tx, actor) => {
      const p = actor.staffProfile;
      if (!p || p.version !== dto.version)
        throw new ConflictException(
          "Solicita que preparen tu perfil antes de autorizarlo.",
        );
      const consentHash = dto.consent
        ? hash(JSON.stringify(publicFields(p)))
        : null;
      await tx.staffProfile.update({
        where: { membershipId: actor.id },
        data: {
          publicConsentHash: consentHash,
          publicConsentAt: dto.consent ? new Date() : null,
          version: { increment: 1 },
          ...(!dto.consent
            ? {
                publicSnapshot: Prisma.DbNull,
                publishedAt: null,
                publishedConsentHash: null,
              }
            : {}),
        },
      });
      await this.audit(
        tx,
        actor,
        actor.id,
        dto.consent ? "PUBLIC_CONSENT_GIVEN" : "PUBLIC_CONSENT_WITHDRAWN",
        dto.reason,
        null,
        { consent: dto.consent },
      );
      return { consent: dto.consent };
    });
  }
  async publish(
    clinicId: string,
    userId: string,
    id: string,
    dto: PublicationDto,
  ) {
    return this.write(
      clinicId,
      userId,
      "public-profiles:manage",
      async (tx, actor) => {
        const m = await this.target(tx, clinicId, id),
          p = m.staffProfile;
        if (!p || p.version !== dto.version) throw new ConflictException();
        const snapshot = publicFields(p),
          consentHash = hash(JSON.stringify(snapshot));
        if (
          dto.visible &&
          (m.status !== "ACTIVE" ||
            m.user.status !== "ACTIVE" ||
            p.publicConsentHash !== consentHash ||
            !p.publicConsentAt)
        )
          throw new ForbiddenException(
            "El trabajador debe autorizar este contenido antes de publicarlo.",
          );
        await tx.staffProfile.update({
          where: { membershipId: id },
          data: {
            publicSnapshot: dto.visible ? snapshot : Prisma.DbNull,
            publishedAt: dto.visible ? new Date() : null,
            publishedConsentHash: dto.visible ? consentHash : null,
            version: { increment: 1 },
          },
        });
        await this.audit(
          tx,
          actor,
          id,
          dto.visible ? "PROFILE_PUBLISHED" : "PROFILE_HIDDEN",
          dto.reason,
          null,
          { visible: dto.visible },
        );
        return { visible: dto.visible };
      },
    );
  }
  async assign(
    clinicId: string,
    userId: string,
    id: string,
    dto: AssignmentDto,
  ) {
    return this.write(clinicId, userId, "patient:assign", async (tx, actor) => {
      const m = await this.target(tx, clinicId, id);
      if (m.status !== "ACTIVE") throw new BadRequestException();
      await requirePatient(tx, actor, dto.patientId);
      if (dto.assigned)
        await tx.patientAssignment.upsert({
          where: {
            clinicId_membershipId_patientId: {
              clinicId,
              membershipId: id,
              patientId: dto.patientId,
            },
          },
          create: {
            clinicId,
            membershipId: id,
            patientId: dto.patientId,
            assignedByMembershipId: actor.id,
          },
          update: {},
        });
      else
        await tx.patientAssignment.deleteMany({
          where: { clinicId, membershipId: id, patientId: dto.patientId },
        });
      await this.audit(
        tx,
        actor,
        id,
        dto.assigned ? "PATIENT_ASSIGNED" : "PATIENT_UNASSIGNED",
        dto.reason,
        null,
        { patientId: dto.patientId, assigned: dto.assigned },
      );
      return { assigned: dto.assigned };
    });
  }
  async publicTeam() {
    const clinicId = this.config.get<string>("WEBSITE_CLINIC_ID");
    if (!clinicId) return { items: [] };
    const profiles = await this.prisma.staffProfile.findMany({
      where: {
        clinicId,
        publicSnapshot: { not: Prisma.DbNull },
        publishedAt: { not: null },
        membership: { status: "ACTIVE", user: { status: "ACTIVE" } },
        clinic: { status: "ACTIVE" },
      },
      select: { publicSnapshot: true, publicOrder: true, membershipId: true },
      orderBy: [{ publicOrder: "asc" }, { membershipId: "asc" }],
    });
    // Re-allowlist even stored JSON; drafts, contacts, credentials and membership IDs never leave this endpoint.
    return {
      items: profiles.map((p) => {
        const v = p.publicSnapshot as Record<string, string>;
        return {
          displayName: v.displayName,
          job: v.job,
          specialty: v.specialty,
          biography: v.biography,
          photoKey: v.photoKey,
        };
      }),
    };
  }
  private async invitation(token: string) {
    const invitation = await this.prisma.staffInvitation.findUnique({
      where: { tokenHash: hash(token) },
      include: {
        membership: {
          include: {
            user: { select: { status: true } },
            clinic: { select: { name: true, status: true } },
          },
        },
      },
    });
    if (
      !invitation ||
      invitation.consumedAt ||
      invitation.revokedAt ||
      invitation.expiresAt <= new Date() ||
      invitation.membership.status !== "INVITED" ||
      invitation.membership.user.status !== "ACTIVE" ||
      invitation.membership.clinic.status !== "ACTIVE"
    )
      throw new BadRequestException("Invitación no disponible.");
    return invitation;
  }
  async inspectInvitation(token: string) {
    const i = await this.invitation(token);
    return {
      clinicName: i.membership.clinic.name,
      expiresAt: i.expiresAt,
      mode: i.accountCreated ? "CREATE_PASSWORD" : "EXISTING_PASSWORD",
    };
  }
  async accept(dto: AcceptInvitationDto) {
    const i = await this.invitation(dto.token);
    if (i.accountCreated && dto.password.length < 15)
      throw new BadRequestException("Usa al menos 15 caracteres.");
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: i.membership.userId },
      select: { passwordHash: true },
    });
    const valid =
      i.accountCreated ||
      (await this.passwords.verify(user.passwordHash, dto.password));
    if (!valid) throw new BadRequestException("No se pudo activar el acceso.");
    const passwordHash = i.accountCreated
      ? await this.passwords.hash(dto.password)
      : undefined;
    return this.prisma.$transaction(
      async (tx) => {
        await lockClinic(tx, i.clinicId);
        // One global identity may hold invitations for several clinics. Serialize
        // first-password activation across those clinics as well as within one.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`staff-user:${i.membership.userId}`}, 0))::text`;
        const fresh = await tx.staffInvitation.findUnique({
          where: { id: i.id },
          include: {
            membership: {
              include: {
                user: { select: { status: true, passwordHash: true } },
                clinic: { select: { status: true } },
              },
            },
          },
        });
        if (
          !fresh ||
          fresh.consumedAt ||
          fresh.revokedAt ||
          fresh.expiresAt <= new Date() ||
          fresh.membership.status !== "INVITED" ||
          fresh.membership.user.status !== "ACTIVE" ||
          fresh.membership.clinic.status !== "ACTIVE" ||
          fresh.membership.user.passwordHash !== user.passwordHash
        )
          throw new ConflictException();
        if (i.accountCreated) {
          // Never reset a password if this global user has since acquired another active membership.
          if (
            await tx.clinicMembership.count({
              where: { userId: i.membership.userId, status: "ACTIVE" },
            })
          )
            throw new ConflictException(
              "Inicia sesión y solicita un nuevo enlace.",
            );
          if (!passwordHash) throw new ConflictException();
          await tx.user.update({
            where: { id: i.membership.userId },
            data: { passwordHash },
          });
        }
        await tx.staffInvitation.update({
          where: { id: i.id },
          data: { consumedAt: new Date() },
        });
        await tx.staffInvitation.updateMany({
          where: {
            membershipId: i.membershipId,
            id: { not: i.id },
            consumedAt: null,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
        await tx.clinicMembership.update({
          where: { id: i.membershipId },
          data: { status: "ACTIVE", accessVersion: { increment: 1 } },
        });
        const actor = await tx.clinicMembership.findUniqueOrThrow({
          where: { id: i.membershipId },
          include: memberInclude,
        });
        await this.audit(
          tx,
          actor,
          actor.id,
          "INVITATION_ACCEPTED",
          "Activación mediante enlace de invitación",
          { status: "INVITED" },
          { status: "ACTIVE" },
        );
        return { activated: true };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );
  }
}
