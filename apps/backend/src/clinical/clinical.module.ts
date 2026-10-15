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
  RequirePermissions,
  type ClinicRequest,
} from "../authorization/authorization.module";
import { SessionGuard } from "../sessions/session.guard";
import { SessionsModule } from "../sessions/sessions.module";
import { ClinicalService } from "./clinical.service";
import {
  CreatePatientDto,
  CreateTutorDto,
  PatientQueryDto,
  TutorQueryDto,
  UpdatePatientDto,
  UpdateTutorDto,
} from "./clinical.dto";
class ArchiveDto {}

@Controller("clinics/:clinicId/tutors")
@UseGuards(SessionGuard, ClinicGuard)
class TutorsController {
  constructor(private readonly clinical: ClinicalService) {}
  @Get()
  @RequirePermissions("tutor:read")
  list(@Req() req: ClinicRequest, @Query() query: TutorQueryDto) {
    return this.clinical.listTutors(req.clinic.id, query);
  }
  @Post()
  @RequirePermissions("tutor:write")
  create(@Req() req: ClinicRequest, @Body() dto: CreateTutorDto) {
    return this.clinical.createTutor(req.clinic.id, dto);
  }
  @Get(":id/patients")
  @RequirePermissions("tutor:read", "patient:read")
  patients(
    @Req() req: ClinicRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Query() query: PatientQueryDto,
  ) {
    return this.clinical.listPatients(req.clinic.id, query, id);
  }
  @Get(":id")
  @RequirePermissions("tutor:read")
  detail(
    @Req() req: ClinicRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    return this.clinical.getTutor(req.clinic.id, id);
  }
  @Patch(":id")
  @RequirePermissions("tutor:write")
  update(
    @Req() req: ClinicRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdateTutorDto,
  ) {
    return this.clinical.updateTutor(req.clinic.id, id, dto);
  }
  @Patch(":id/archive")
  @RequirePermissions("clinical:archive")
  archive(
    @Req() req: ClinicRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: ArchiveDto,
  ) {
    void dto;
    return this.clinical.archiveTutor(req.clinic.id, id);
  }
}

@Controller("clinics/:clinicId/patients")
@UseGuards(SessionGuard, ClinicGuard)
class PatientsController {
  constructor(private readonly clinical: ClinicalService) {}
  @Get()
  @RequirePermissions("patient:read")
  list(@Req() req: ClinicRequest, @Query() query: PatientQueryDto) {
    return this.clinical.listPatients(req.clinic.id, query);
  }
  @Post()
  @RequirePermissions("patient:write")
  create(@Req() req: ClinicRequest, @Body() dto: CreatePatientDto) {
    return this.clinical.createPatient(req.clinic.id, dto);
  }
  @Get(":id")
  @RequirePermissions("patient:read")
  detail(
    @Req() req: ClinicRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    return this.clinical.getPatient(req.clinic.id, id);
  }
  @Patch(":id")
  @RequirePermissions("patient:write")
  update(
    @Req() req: ClinicRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.clinical.updatePatient(req.clinic.id, id, dto);
  }
  @Patch(":id/archive")
  @RequirePermissions("clinical:archive")
  archive(
    @Req() req: ClinicRequest,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: ArchiveDto,
  ) {
    void dto;
    return this.clinical.archivePatient(req.clinic.id, id);
  }
}
@Module({
  imports: [SessionsModule, AuthorizationModule],
  controllers: [TutorsController, PatientsController],
  providers: [ClinicalService],
})
export class ClinicalModule {}
