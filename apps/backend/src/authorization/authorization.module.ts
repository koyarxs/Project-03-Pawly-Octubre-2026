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
import { Role, PatientScope } from "@prisma/client";
import { requireMember, type Permission } from "./permission-policy";
export type { Permission } from "./permission-policy";
import { isUUID } from "class-validator";
import { PrismaService } from "../prisma/prisma.service";
import { SessionGuard } from "../sessions/session.guard";
import { SessionsModule } from "../sessions/sessions.module";
import { AuthenticatedRequest } from "../sessions/sessions.service";

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata("clinic-permissions", permissions);
export type ClinicContext = {
  id: string;
  name: string;
  slug: string;
  role: Role;
  membershipId: string;
  permissions: Permission[];
  accessVersion: number;
  patientScope: PatientScope;
  job: string | null;
  medicalPracticeEnabled: boolean;
};
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
    const membership = await requireMember(
      this.prisma,
      clinicId,
      userId,
      required,
    );
    const { effectivePermissions } = await import("./permission-policy");
    const { id, name, slug } = membership.clinic;
    return {
      id,
      name,
      slug,
      role: membership.role,
      membershipId: membership.id,
      permissions: effectivePermissions(membership),
      accessVersion: membership.accessVersion,
      patientScope: membership.patientScope,
      job: membership.staffProfile?.job ?? null,
      medicalPracticeEnabled:
        effectivePermissions(membership).includes("consultation:write"),
    };
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
