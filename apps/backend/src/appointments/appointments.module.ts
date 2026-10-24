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
  ClinicRequest,
  RequirePermissions,
} from "../authorization/authorization.module";
import { SessionGuard } from "../sessions/session.guard";
import { SessionsModule } from "../sessions/sessions.module";
import {
  AppointmentInput,
  AppointmentQueryDto,
  UpdateAppointmentDto,
} from "./appointments.dto";
import { AppointmentsService } from "./appointments.service";
import { BookingEngine } from "./booking-engine";

@Controller("clinics/:clinicId/appointments")
@UseGuards(SessionGuard, ClinicGuard)
class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}
  @Get()
  @RequirePermissions("appointment:read")
  list(@Req() req: ClinicRequest, @Query() q: AppointmentQueryDto) {
    return this.appointments.list(req.clinic.id, q, req.principal.userId);
  }
  @Get("professionals")
  @RequirePermissions("appointment:read")
  professionals(@Req() req: ClinicRequest) {
    return this.appointments.professionals(req.clinic.id);
  }
  @Get(":id/history")
  @RequirePermissions("appointment:read")
  history(
    @Req() req: ClinicRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    return this.appointments.history(req.clinic.id, id, req.principal.userId);
  }
  @Get(":id")
  @RequirePermissions("appointment:read")
  detail(
    @Req() req: ClinicRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    return this.appointments.detail(req.clinic.id, id, req.principal.userId);
  }
  @Post()
  @RequirePermissions("appointment:write")
  create(@Req() req: ClinicRequest, @Body() dto: AppointmentInput) {
    return this.appointments.save(req.clinic.id, req.principal.userId, dto);
  }
  @Patch(":id")
  @RequirePermissions("appointment:write")
  update(
    @Req() req: ClinicRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointments.save(req.clinic.id, req.principal.userId, dto, id);
  }
}
@Module({
  imports: [SessionsModule, AuthorizationModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, BookingEngine],
  exports: [AppointmentsService, BookingEngine],
})
export class AppointmentsModule {}
