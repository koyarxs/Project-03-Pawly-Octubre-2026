import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  AuthorizationModule,
  ClinicGuard,
  type ClinicRequest,
  RequirePermissions,
} from "../authorization/authorization.module";
import { SessionGuard } from "../sessions/session.guard";
import { SessionsModule } from "../sessions/sessions.module";
import {
  AmendmentDto,
  ConsultationPageDto,
  ConsultationQueryDto,
  CreateConsultationDto,
  UpdateConsultationDto,
} from "./consultations.dto";
import { ConsultationsService } from "./consultations.service";
@Controller("clinics/:clinicId/consultations")
@UseGuards(SessionGuard, ClinicGuard)
class ConsultationsController {
  constructor(private readonly consultations: ConsultationsService) {}
  @Get()
  @RequirePermissions("consultation:read")
  list(@Req() r: ClinicRequest, @Query() q: ConsultationQueryDto) {
    return this.consultations.list(r.clinic.id, q);
  }
  @Get(":id")
  @RequirePermissions("consultation:read")
  detail(
    @Req() r: ClinicRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    return this.consultations.detail(r.clinic.id, id);
  }
  @Get(":id/history")
  @RequirePermissions("consultation:read")
  history(
    @Req() r: ClinicRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Query() q: ConsultationPageDto,
  ) {
    return this.consultations.history(r.clinic.id, id, q.page);
  }
  @Get(":id/amendments")
  @RequirePermissions("consultation:read")
  amendments(
    @Req() r: ClinicRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Query() q: ConsultationPageDto,
  ) {
    return this.consultations.amendments(r.clinic.id, id, q.page);
  }
  @Post()
  @RequirePermissions("consultation:write")
  create(@Req() r: ClinicRequest, @Body() dto: CreateConsultationDto) {
    return this.consultations.create(r.clinic.id, r.principal.userId, dto);
  }
  @Patch(":id")
  @RequirePermissions("consultation:write")
  update(
    @Req() r: ClinicRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateConsultationDto,
  ) {
    return this.consultations.update(r.clinic.id, r.principal.userId, id, dto);
  }
  @Post(":id/amendments")
  @RequirePermissions("consultation:write")
  amend(
    @Req() r: ClinicRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: AmendmentDto,
  ) {
    return this.consultations.amend(r.clinic.id, r.principal.userId, id, dto);
  }
}
@Module({
  imports: [SessionsModule, AuthorizationModule],
  controllers: [ConsultationsController],
  providers: [ConsultationsService],
})
export class ConsultationsModule {}
