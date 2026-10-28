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
  StreamableFile,
  ConflictException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Throttle } from "@nestjs/throttler";
import {
  AuthorizationModule,
  ClinicGuard,
  type ClinicRequest,
  RequirePermissions,
} from "../authorization/authorization.module";
import { SessionGuard } from "../sessions/session.guard";
import { SessionsModule } from "../sessions/sessions.module";
import { AppointmentsModule } from "./appointments.module";
import { BookingEngine } from "./booking-engine";
import { PublicBookingService } from "./public-booking.service";
import {
  BookingListDto,
  OwnBookingAvailabilityDto,
  BookingLookupDto,
  BookingServiceDto,
  BookingServiceRemovalDto,
  BookingSettingsDto,
  BookingSlotsDto,
  ManageBookingDto,
  PublicBookingDto,
  PublicCancelBookingDto,
  PublicRescheduleBookingDto,
} from "./booking.dto";
import { BookingNotificationWorker } from "./booking-notification-worker";
import { BookingDocumentsService } from "./booking-documents.service";
import { reservationPdf, reservationCalendar, confirmedReservation } from "./booking-documents";

@Controller("bookings")
class PublicBookingController {
  constructor(
    private readonly bookings: PublicBookingService,
    private readonly env: ConfigService,
    private readonly documents: BookingDocumentsService,
  ) {}
  @Get("site")
  @Header("Cache-Control", "no-store")
  async site() {
    const id =
      this.env.get<string>("BOOKING_DEMO_CLINIC_ID") &&
      this.env.get("NODE_ENV") !== "production"
        ? this.env.get<string>("BOOKING_DEMO_CLINIC_ID")
        : this.env.get<string>("WEBSITE_CLINIC_ID");
    if (!id) return { slug: null };
    const clinic = await this.bookings.engine.clinic(
      this.bookings.engine.prisma,
      id,
    );
    return { slug: clinic.slug };
  }
  @Get(":slug")
  @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  catalog(@Param("slug") slug: string) {
    return this.bookings.catalog(slug);
  }
  @Get(":slug/availability")
  @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 40, ttl: 60000 } })
  slots(@Param("slug") slug: string, @Query() query: BookingSlotsDto) {
    return this.bookings.slots(slug, query);
  }
  @Post(":slug")
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  create(@Param("slug") slug: string, @Body() dto: PublicBookingDto) {
    return this.bookings.create(slug, dto);
  }
  @Post(":slug/lookup")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  lookup(@Param("slug") slug: string, @Body() dto: BookingLookupDto) {
    return this.bookings.lookup(slug, dto);
  }
  @Post(":slug/receipt")
  @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async receipt(@Param("slug") slug: string, @Body() dto: BookingLookupDto) {
    const data = await this.documents.download(slug, dto);
    return new StreamableFile(await reservationPdf(data), { type: "application/pdf", disposition: `attachment; filename="comprobante-porvenir-${data.reference}.pdf"` });
  }
  @Post(":slug/calendar")
  @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async calendar(@Param("slug") slug: string, @Body() dto: BookingLookupDto) {
    const data = await this.documents.download(slug, dto);
    if (!confirmedReservation(data.status)) throw new ConflictException("La cita todavía no está confirmada.");
    return new StreamableFile(Buffer.from(reservationCalendar(data)), { type: "text/calendar; charset=utf-8", disposition: `attachment; filename="cita-porvenir-${data.reference}.ics"` });
  }
  @Post(":slug/cancel")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  cancel(@Param("slug") slug: string, @Body() dto: PublicCancelBookingDto) {
    return this.bookings.visitorChange(slug, dto, true);
  }
  @Post(":slug/reschedule")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  reschedule(
    @Param("slug") slug: string,
    @Body() dto: PublicRescheduleBookingDto,
  ) {
    return this.bookings.visitorChange(slug, dto, false);
  }
}
@Controller("clinics/:clinicId/booking")
@UseGuards(SessionGuard, ClinicGuard)
class BookingAdminController {
  constructor(
    private readonly engine: BookingEngine,
    private readonly bookings: PublicBookingService,
  ) {}
  @Get("settings")
  @RequirePermissions("appointment:read")
  settings(@Req() req: ClinicRequest) {
    return this.engine.readSettings(req.clinic.id, req.principal.userId);
  }
  @Patch("settings")
  @RequirePermissions("clinic:manage")
  save(@Req() req: ClinicRequest, @Body() dto: BookingSettingsDto) {
    return this.engine.saveSettings(req.clinic.id, req.principal.userId, dto);
  }
  @Patch("my-availability")
  @RequirePermissions("appointment:write", "consultation:write")
  own(@Req() req: ClinicRequest, @Body() dto: OwnBookingAvailabilityDto) {
    return this.engine.saveOwnSchedule(
      req.clinic.id,
      req.principal.userId,
      dto.version,
      dto.hours,
    );
  }
  @Post("services")
  @RequirePermissions("clinic:manage")
  service(@Req() req: ClinicRequest, @Body() dto: BookingServiceDto) {
    return this.engine.saveService(req.clinic.id, req.principal.userId, dto);
  }
  @Get("availability")
  @RequirePermissions("appointment:read")
  slots(@Req() req: ClinicRequest, @Query() query: BookingSlotsDto) {
    return this.engine.slots(req.clinic.id, query, false);
  }
  @Post("services/:id/remove")
  @RequirePermissions("clinic:manage")
  remove(
    @Req() req: ClinicRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: BookingServiceRemovalDto,
  ) {
    return this.engine.removeService(
      req.clinic.id,
      req.principal.userId,
      id,
      dto.version,
    );
  }
  @Get("requests")
  @RequirePermissions("appointment:read")
  requests(@Req() req: ClinicRequest, @Query() q: BookingListDto) {
    return this.bookings.list(req.clinic.id, req.principal.userId, q);
  }
  @Get("requests/:id/history")
  @RequirePermissions("appointment:read")
  history(@Req() req: ClinicRequest, @Param("id", ParseUUIDPipe) id: string) {
    return this.bookings.history(req.clinic.id, req.principal.userId, id);
  }
  @Patch("requests/:id")
  @RequirePermissions("appointment:write")
  manage(
    @Req() req: ClinicRequest,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ManageBookingDto,
  ) {
    return this.bookings.manage(req.clinic.id, req.principal.userId, id, dto);
  }
}
@Module({
  imports: [AppointmentsModule, SessionsModule, AuthorizationModule],
  controllers: [PublicBookingController, BookingAdminController],
  providers: [PublicBookingService, BookingNotificationWorker, BookingDocumentsService],
})
export class BookingModule {}
