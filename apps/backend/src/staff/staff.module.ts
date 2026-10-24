import {
  Body,
  Controller,
  Get,
  Header,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  AuthorizationModule,
  ClinicGuard,
  type ClinicRequest,
  RequirePermissions,
} from "../authorization/authorization.module";
import { SessionGuard } from "../sessions/session.guard";
import { SessionsModule } from "../sessions/sessions.module";
import { PasswordService } from "../auth/password.service";
import {
  AcceptInvitationDto,
  AssignmentDto,
  ConsentDto,
  CredentialDto,
  InvitationTokenDto,
  InviteStaffDto,
  PublicationDto,
  StaffAccessDto,
  StaffProfileDto,
  StaffStatusDto,
  VersionDto,
} from "./staff.dto";
import { StaffService } from "./staff.service";
const uuid = new ParseUUIDPipe({ version: "4" });

@Controller("clinics/:clinicId/staff")
@UseGuards(SessionGuard, ClinicGuard)
class StaffController {
  constructor(private readonly staff: StaffService) {}
  @Get()
  @RequirePermissions("staff:read")
  list(@Req() r: ClinicRequest) {
    return this.staff.list(r.clinic.id, r.principal.userId);
  }
  @Get("me")
  @RequirePermissions("clinic:read")
  me(@Req() r: ClinicRequest) {
    return this.staff.me(r.clinic.id, r.principal.userId);
  }
  @Post("me/consent")
  @RequirePermissions("clinic:read")
  consent(@Req() r: ClinicRequest, @Body() dto: ConsentDto) {
    return this.staff.consent(r.clinic.id, r.principal.userId, dto);
  }
  @Get("audit")
  @RequirePermissions("audit:read")
  audit(
    @Req() r: ClinicRequest,
    @Query("membershipId", new ParseUUIDPipe({ version: "4", optional: true }))
    id?: string,
  ) {
    return this.staff.auditList(r.clinic.id, r.principal.userId, id);
  }
  @Post()
  @RequirePermissions("staff:create")
  invite(@Req() r: ClinicRequest, @Body() dto: InviteStaffDto) {
    return this.staff.invite(r.clinic.id, r.principal.userId, dto);
  }
  @Post(":id/invitation")
  @RequirePermissions("staff:create")
  rotate(
    @Req() r: ClinicRequest,
    @Param("id", uuid) id: string,
    @Body() dto: VersionDto,
  ) {
    return this.staff.rotate(r.clinic.id, r.principal.userId, id, dto);
  }
  @Patch(":id/profile")
  @RequirePermissions("staff:update")
  profile(
    @Req() r: ClinicRequest,
    @Param("id", uuid) id: string,
    @Body() dto: StaffProfileDto,
  ) {
    return this.staff.updateProfile(r.clinic.id, r.principal.userId, id, dto);
  }
  @Patch(":id/access")
  @RequirePermissions("permissions:manage")
  access(
    @Req() r: ClinicRequest,
    @Param("id", uuid) id: string,
    @Body() dto: StaffAccessDto,
  ) {
    return this.staff.access(r.clinic.id, r.principal.userId, id, dto);
  }
  @Patch(":id/status")
  @RequirePermissions("staff:deactivate")
  status(
    @Req() r: ClinicRequest,
    @Param("id", uuid) id: string,
    @Body() dto: StaffStatusDto,
  ) {
    return this.staff.status(r.clinic.id, r.principal.userId, id, dto);
  }
  @Patch(":id/credential")
  @RequirePermissions("credentials:verify")
  credential(
    @Req() r: ClinicRequest,
    @Param("id", uuid) id: string,
    @Body() dto: CredentialDto,
  ) {
    return this.staff.credential(r.clinic.id, r.principal.userId, id, dto);
  }
  @Post(":id/publication")
  @RequirePermissions("public-profiles:manage")
  publish(
    @Req() r: ClinicRequest,
    @Param("id", uuid) id: string,
    @Body() dto: PublicationDto,
  ) {
    return this.staff.publish(r.clinic.id, r.principal.userId, id, dto);
  }
  @Post(":id/patients")
  @RequirePermissions("patient:assign")
  assign(
    @Req() r: ClinicRequest,
    @Param("id", uuid) id: string,
    @Body() dto: AssignmentDto,
  ) {
    return this.staff.assign(r.clinic.id, r.principal.userId, id, dto);
  }
}
@Controller("auth/staff-invitations")
@Throttle({ default: { limit: 10, ttl: 60_000 } })
class StaffActivationController {
  constructor(private readonly staff: StaffService) {}
  @Post("inspect") inspect(@Body() dto: InvitationTokenDto) {
    return this.staff.inspectInvitation(dto.token);
  }
  @Post("accept") accept(@Body() dto: AcceptInvitationDto) {
    return this.staff.accept(dto);
  }
}
@Controller("website/team")
class PublicTeamController {
  constructor(private readonly staff: StaffService) {}
  @Get()
  @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  read() {
    return this.staff.publicTeam();
  }
}
@Module({
  imports: [SessionsModule, AuthorizationModule],
  controllers: [
    StaffController,
    StaffActivationController,
    PublicTeamController,
  ],
  providers: [StaffService, PasswordService],
})
export class StaffModule {}
