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

export type Permission = "clinic:read" | "clinic:manage";
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata("clinic-permissions", permissions);
const permissions: Record<Role, readonly Permission[]> = {
  OWNER: ["clinic:read", "clinic:manage"],
  ADMIN: ["clinic:read", "clinic:manage"],
  VETERINARIAN: ["clinic:read"],
  RECEPTIONIST: ["clinic:read"],
};
type ClinicContext = { id: string; name: string; slug: string; role: Role };
type ClinicRequest = AuthenticatedRequest & { clinic: ClinicContext };

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
