import { Module } from "@nestjs/common";
import { SessionGuard } from "./session.guard";
import { SessionsService } from "./sessions.service";

@Module({
  providers: [SessionsService, SessionGuard],
  exports: [SessionsService, SessionGuard],
})
export class SessionsModule {}
