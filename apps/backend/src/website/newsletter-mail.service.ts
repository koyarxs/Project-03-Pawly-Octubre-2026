import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

/** Local capture only. Real delivery requires a separately configured provider. */
@Injectable()
export class NewsletterMailService {
  constructor(private readonly config: ConfigService) {}

  async acknowledge(email: string): Promise<void> {
    if (this.config.get<string>("MAIL_MODE") !== "local") return;
    const host = this.config.get<string>("MAIL_HOST") || "127.0.0.1";
    if (
      this.config.get<string>("NODE_ENV") === "production" ||
      !["127.0.0.1", "localhost", "::1"].includes(host)
    ) {
      throw new ServiceUnavailableException();
    }
    const transport = nodemailer.createTransport({
      host,
      port: Number(this.config.get("MAIL_PORT") || 1025),
      secure: false,
      ignoreTLS: true,
      connectionTimeout: 2000,
      greetingTimeout: 2000,
      socketTimeout: 3000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    try {
      const info = await transport.sendMail({
        from: {
          name:
            this.config.get<string>("WEBSITE_PUBLIC_NAME") ||
            "Clínica Veterinaria Porvenir",
          address: "novedades@porvenir.example.invalid",
        },
        to: email,
        subject: "Recibimos tu solicitud de novedades · Porvenir",
        text: "Gracias por querer ser parte de nuestras novedades. Registramos tu solicitud para recibir consejos sobre salud animal y bienestar.\n\nEste mensaje es una prueba local de Pawly: fue capturado en Mailpit y no se entregó a una bandeja real. No se han activado campañas ni confirmado la propiedad de esta dirección.",
        html: '<!doctype html><html lang="es"><body style="margin:0;background:#f3f7f2;font-family:Arial,sans-serif;color:#174f43"><main style="max-width:560px;margin:32px auto;padding:36px;background:white;border-radius:20px"><p style="letter-spacing:3px;font-size:11px">CLÍNICA VETERINARIA PORVENIR</p><h1 style="font-size:28px">El cariño también se comparte.</h1><p style="line-height:1.7">Gracias por querer ser parte de nuestras novedades. Registramos tu solicitud para recibir consejos sobre salud animal y bienestar.</p><hr style="border:0;border-top:1px solid #d8e6dc;margin:28px 0"><p style="font-size:12px;line-height:1.7">Prueba local de Pawly: este mensaje se capturó en Mailpit y no se entregó a una bandeja real. No se han activado campañas ni confirmado la propiedad de esta dirección.</p></main></body></html>',
      });
      if (!info.accepted?.length) throw new Error("Mail not accepted");
    } catch {
      throw new ServiceUnavailableException();
    } finally {
      transport.close();
    }
  }
}
