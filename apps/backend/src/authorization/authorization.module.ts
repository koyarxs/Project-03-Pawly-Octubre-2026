import {
  BadRequestException,
  CanActivate,
  Controller,
  ExecutionContext,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  Req,
  SetMetadata,
  UseGuards,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { isUUID } from "class-validator";
import { PrismaService } from "../prisma/prisma.service";
import { SessionGuard } from "../sessions/session.guard";
import { SessionsModule } from "../sessions/sessions.module";
import { AuthenticatedRequest } from "../sessions/sessions.service";

export type Permission =
  | "consultation:read"
  | "consultation:write"
  | "appointment:read"
  | "appointment:write"
  | "clinic:read"
  | "clinic:manage"
  | "tutor:read"
  | "tutor:write"
  | "patient:read"
  | "patient:write"
  | "clinical:archive";
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata("clinic-permissions", permissions);
const permissions: Record<Role, readonly Permission[]> = {
  OWNER: [
    "consultation:read",
    "consultation:write",
    "appointment:read",
    "appointment:write",
    "clinic:read",
    "clinic:manage",
    "tutor:read",
    "tutor:write",
    "patient:read",
    "patient:write",
    "clinical:archive",
  ],
  ADMIN: [
    "consultation:read",
    "consultation:write",
    "appointment:read",
    "appointment:write",
    "clinic:read",
    "clinic:manage",
    "tutor:read",
    "tutor:write",
    "patient:read",
    "patient:write",
    "clinical:archive",
  ],
  VETERINARIAN: [
    "consultation:read",
    "consultation:write",
    "appointment:read",
    "appointment:write",
    "clinic:read",
    "tutor:read",
    "tutor:write",
    "patient:read",
    "patient:write",
  ],
  RECEPTIONIST: [
    "clinic:read",
    "tutor:read",
    "tutor:write",
    "patient:read",
    "appointment:read",
    "appointment:write",
  ],
};
type ClinicContext = { id: string; name: string; slug: string; role: Role };
export type ClinicRequest = AuthenticatedRequest & { clinic: ClinicContext };

@Injectable()
export class ClinicAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}
  async authorize(
    userId: string,
    clinicId: string,
    required: Permission[],
  ): Promise<ClinicContext> {
    if (!required.length)
      throw new ForbiddenException("Permisos no definidos.");
    if (!isUUID(clinicId)) throw new BadRequestException("Clínica inválida.");
    const membership = await this.prisma.clinicMembership.findFirst({
      where: {
        userId,
        clinicId,
        status: "ACTIVE",
        clinic: { status: "ACTIVE" },
        user: { status: "ACTIVE" },
      },
      select: {
        role: true,
        clinic: { select: { id: true, name: true, slug: true } },
      },
    });
    if (
      !membership ||
      !required.every((permission) =>
        permissions[membership.role].includes(permission),
      )
    )
      throw new ForbiddenException("Acceso no permitido.");
    return { ...membership.clinic, role: membership.role };
  }
}

@Injectable()
export class ClinicGuard implements CanActivate {
  constructor(
    private readonly authorization: ClinicAuthorizationService,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ClinicRequest>();
    if (!request.principal)
      throw new ForbiddenException("Acceso no permitido.");
    const required = this.reflector.getAllAndOverride<Permission[]>(
      "clinic-permissions",
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length)
      throw new ForbiddenException("Permisos no definidos.");
    request.clinic = await this.authorization.authorize(
      request.principal.userId,
      String(request.params.clinicId ?? ""),
      required,
    );
    return true;
  }
}

@Controller("clinics")
@UseGuards(SessionGuard, ClinicGuard)
class ClinicAccessController {
  @Get(":clinicId/access")
  @RequirePermissions("clinic:read")
  access(@Req() request: ClinicRequest) {
    return { clinic: request.clinic };
  }
}

@Module({
  imports: [SessionsModule],
  controllers: [ClinicAccessController],
  providers: [ClinicAuthorizationService, ClinicGuard],
  exports: [ClinicAuthorizationService, ClinicGuard],
})
export class AuthorizationModule {}
