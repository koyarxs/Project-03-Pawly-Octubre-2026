import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "node:crypto";
import { parse } from "cookie";
import type { CookieOptions, Request, Response } from "express";
import { PrismaService } from "../prisma/prisma.service";

export interface SessionPrincipal {
  sessionId: string;
  userId: string;
}
export type AuthenticatedRequest = Request & { principal: SessionPrincipal };

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get production(): boolean {
    return this.config.get<string>("NODE_ENV") === "production";
  }
  get cookieName(): string {
    return this.production ? "__Host-pawly_session" : "pawly_session";
  }
  private get options(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.production,
      sameSite: "lax",
      path: "/",
    };
  }

  async create(userId: string, response: Response): Promise<void> {
    const token = randomBytes(32).toString("base64url");
    const ttl = this.config.getOrThrow<number>("SESSION_TTL_SECONDS");
    const expiresAt = new Date(Date.now() + ttl * 1000);
    await this.prisma.session.create({
      data: { userId, tokenHash: this.digest(token), expiresAt },
    });
    response.cookie(this.cookieName, token, {
      ...this.options,
      expires: expiresAt,
      maxAge: ttl * 1000,
    });
  }

  async authenticate(request: Request): Promise<SessionPrincipal> {
    const token = parse(request.headers.cookie ?? "")[this.cookieName];
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new UnauthorizedException();
    const now = new Date();
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.digest(token) },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        revokedAt: true,
        user: { select: { status: true, emailVerifiedAt: true } },
      },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== "ACTIVE" ||
      (this.production && !session.user.emailVerifiedAt)
    )
      throw new UnauthorizedException();
    const touched = await this.prisma.session.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
        expiresAt: { gt: now },
        user: { status: "ACTIVE" },
      },
      data: { lastSeenAt: now },
    });
    if (touched.count !== 1) throw new UnauthorizedException();
    return { sessionId: session.id, userId: session.userId };
  }

  async revoke(principal: SessionPrincipal, response: Response): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        id: principal.sessionId,
        userId: principal.userId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    response.clearCookie(this.cookieName, this.options);
  }

  private digest(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
