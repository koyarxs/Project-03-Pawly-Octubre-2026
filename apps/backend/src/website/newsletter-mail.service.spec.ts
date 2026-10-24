import { ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";
import { NewsletterMailService } from "./newsletter-mail.service";

jest.mock("nodemailer", () => ({
  __esModule: true,
  default: { createTransport: jest.fn() },
}));

describe("Local newsletter mail", () => {
  const settings: Record<string, unknown> = {};
  const config = {
    get: (key: string) => settings[key],
  } as unknown as ConfigService;
  const sendMail = jest.fn();
  const close = jest.fn();
  const service = new NewsletterMailService(config);
  beforeEach(() => {
    jest.resetAllMocks();
    for (const key of Object.keys(settings)) delete settings[key];
    Object.assign(settings, {
      MAIL_MODE: "local",
      MAIL_HOST: "127.0.0.1",
      MAIL_PORT: 1025,
      NODE_ENV: "development",
    });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail,
      close,
    });
    sendMail.mockResolvedValue({ accepted: ["qa@example.invalid"] });
  });
  it("sends an explicitly marked test message to local SMTP without logging", async () => {
    await service.acknowledge("qa@example.invalid");
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "127.0.0.1",
        port: 1025,
        logger: false,
        debug: false,
        disableFileAccess: true,
        disableUrlAccess: true,
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "qa@example.invalid",
        text: expect.stringContaining("no se entregó a una bandeja real"),
      }),
    );
    expect(close).toHaveBeenCalled();
  });
  it("does not send when mail is disabled", async () => {
    settings.MAIL_MODE = "disabled";
    await service.acknowledge("qa@example.invalid");
    expect(sendMail).not.toHaveBeenCalled();
  });
  it("refuses production and non-loopback SMTP hosts", async () => {
    settings.NODE_ENV = "production";
    await expect(
      service.acknowledge("qa@example.invalid"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    settings.NODE_ENV = "development";
    settings.MAIL_HOST = "smtp.external.example";
    await expect(
      service.acknowledge("qa@example.invalid"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(sendMail).not.toHaveBeenCalled();
  });
  it("hides SMTP details and always closes the transport after failure", async () => {
    sendMail.mockRejectedValue(new Error("secret SMTP detail"));
    await expect(
      service.acknowledge("qa@example.invalid"),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(close).toHaveBeenCalled();
  });
});
