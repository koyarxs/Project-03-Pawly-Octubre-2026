import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Module,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import type { Request, Response } from "express";

@Injectable()
export class BrowserRequestGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    // Express routes are case-insensitive by default; security must match that behavior.
    const pathname = request.path.toLowerCase();
    if (
      !pathname.startsWith("/api/auth") &&
      !pathname.startsWith("/api/clinics") &&
      !pathname.startsWith("/api/bookings") &&
      !pathname.startsWith("/api/website/newsletter")
    )
      return true;
    http.getResponse<Response>().setHeader("Cache-Control", "no-store");
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
    const allowed = this.config
      .getOrThrow<string>("CORS_ORIGINS")
      .split(",")
      .map((origin) => origin.trim());
    // A non-simple custom header plus exact Origin validation also protects login CSRF.
    // Missing/opaque origins fail closed. CORS never allows arbitrary origins.
    const documentUpload =
      request.method === "POST" &&
      /^\/api\/clinics\/[0-9a-f-]{36}\/patients\/[0-9a-f-]{36}\/documents\/?$/.test(
        pathname,
      ) &&
      request.is("multipart/form-data");
    if (
      !allowed.includes(request.get("origin") ?? "") ||
      request.get("x-pawly-csrf") !== "1" ||
      (!request.is("application/json") && !documentUpload)
    ) {
      throw new ForbiddenException("Solicitud no permitida.");
    }
    return true;
  }
}

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }])],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: BrowserRequestGuard },
  ],
})
export class HttpSecurityModule {}
