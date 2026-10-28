import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import {
  AuthenticatedRequest,
  SessionsService,
} from "../sessions/sessions.service";
import { SessionGuard } from "../sessions/session.guard";
import { AuthService } from "./auth.service";
import { LoginDto, RegisterClinicDto, RegisterUserDto } from "./dto/auth.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionsService,
  ) {}

  @Post("register-clinic")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterClinicDto) {
    return this.auth.register(dto);
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.auth.login(dto, response);
  }

  @Post("register-user")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  registerUser(
    @Body() dto: RegisterUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.registerUser(dto, response);
  }

  @Get("me")
  @UseGuards(SessionGuard)
  me(@Req() request: AuthenticatedRequest) {
    return this.auth.me(request.principal.userId);
  }

  @Post("logout")
  @HttpCode(204)
  @UseGuards(SessionGuard)
  logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.sessions.revoke(request.principal, response);
  }
}
