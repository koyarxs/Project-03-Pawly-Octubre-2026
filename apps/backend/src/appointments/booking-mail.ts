import type { ConfigService } from "@nestjs/config";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

export function bookingMailSettings(config: ConfigService): { from: string; options: SMTPTransport.Options } | null {
  const mode = config.get<string>("MAIL_MODE");
  const host = config.get<string>("MAIL_HOST") || "127.0.0.1";
  const common = { host, logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true, connectionTimeout: 6000, greetingTimeout: 6000, socketTimeout: 12000 };
  if (mode === "local" && config.get("NODE_ENV") !== "production" && ["127.0.0.1", "localhost", "::1"].includes(host)) {
    return { from: "agenda@porvenir.example.invalid", options: { ...common, port: Number(config.get("MAIL_PORT") || 1025), secure: false, ignoreTLS: true } };
  }
  const user = config.get<string>("MAIL_USER"), password = config.get<string>("MAIL_PASSWORD"), from = config.get<string>("MAIL_FROM") || user;
  if (mode !== "smtp" || !user || !password || !from || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(from)) return null;
  const secure = String(config.get("MAIL_SECURE")) === "true";
  return { from, options: { ...common, port: Number(config.get("MAIL_PORT") || (secure ? 465 : 587)), secure, requireTLS: !secure, auth: { user, pass: password }, tls: { minVersion: "TLSv1.2" } } };
}
