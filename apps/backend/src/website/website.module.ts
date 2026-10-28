import {
  Body,
  Controller,
  Get,
  Header,
  Module,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  AuthorizationModule,
  ClinicGuard,
  RequirePermissions,
  type ClinicRequest,
} from "../authorization/authorization.module";
import { SessionGuard } from "../sessions/session.guard";
import { SessionsModule } from "../sessions/sessions.module";
import { SaveWebsiteDto, WebsiteVersionDto } from "./website.dto";
import { WebsiteService } from "./website.service";
import { NewsletterService } from "./newsletter.service";
import { SubscribeNewsletterDto } from "./newsletter.dto";
import { NewsletterMailService } from "./newsletter-mail.service";

@Controller("website")
class PublicWebsiteController {
  constructor(
    private readonly website: WebsiteService,
    private readonly newsletter: NewsletterService,
  ) {}
  @Post("newsletter")
  @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  subscribe(@Body() input: SubscribeNewsletterDto) {
    return this.newsletter.subscribe(input.email);
  }
  @Get()
  @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  read() {
    return this.website.publicSite();
  }
}

@Controller("clinics/:clinicId/website")
@UseGuards(SessionGuard, ClinicGuard)
@RequirePermissions("website:manage")
class WebsiteAdminController {
  constructor(private readonly website: WebsiteService) {}
  @Get()
  read(@Req() req: ClinicRequest) {
    return this.website.read(req.clinic.id, req.clinic.name);
  }
  @Patch()
  save(@Req() req: ClinicRequest, @Body() input: SaveWebsiteDto) {
    return this.website.save(
      req.clinic.id,
      req.clinic.name,
      req.principal!.userId,
      input,
    );
  }
  @Post("publish")
  publish(@Req() req: ClinicRequest, @Body() input: WebsiteVersionDto) {
    return this.website.publish(
      req.clinic.id,
      req.clinic.name,
      req.principal!.userId,
      input,
    );
  }
  @Post("unpublish")
  unpublish(@Req() req: ClinicRequest, @Body() input: WebsiteVersionDto) {
    return this.website.unpublish(
      req.clinic.id,
      req.clinic.name,
      req.principal!.userId,
      input,
    );
  }
}

@Module({
  imports: [SessionsModule, AuthorizationModule],
  controllers: [PublicWebsiteController, WebsiteAdminController],
  providers: [WebsiteService, NewsletterService, NewsletterMailService],
})
export class WebsiteModule {}
