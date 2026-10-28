import {
  BadRequestException,
  Controller,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import {
  AuthorizationModule,
  ClinicGuard,
  RequirePermissions,
  type ClinicRequest,
} from "../authorization/authorization.module";
import {
  requireMember,
  requirePatient,
  lockClinic,
} from "../authorization/permission-policy";
import { SessionGuard } from "../sessions/session.guard";
import { SessionsModule } from "../sessions/sessions.module";
import { PrismaService } from "../prisma/prisma.service";

export function documentMime(buffer: Buffer): string | null {
  if (buffer.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  if (
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return "image/png";
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255)
    return "image/jpeg";
  return null;
}
const metadata = {
  id: true,
  name: true,
  mimeType: true,
  size: true,
  createdAt: true,
} as const;
@Controller("clinics/:clinicId/patients/:patientId/documents")
@UseGuards(SessionGuard, ClinicGuard)
class PatientDocumentsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  @RequirePermissions("consultation:read")
  async list(
    @Req() req: ClinicRequest,
    @Param("patientId", new ParseUUIDPipe({ version: "4" })) patientId: string,
  ) {
    const member = await requireMember(
      this.prisma,
      req.clinic.id,
      req.principal.userId,
      ["consultation:read"],
    );
    await requirePatient(this.prisma, member, patientId);
    return this.prisma.patientDocument.findMany({
      where: { clinicId: req.clinic.id, patientId },
      select: metadata,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  @Post()
  @RequirePermissions("consultation:write")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
    }),
  )
  async upload(
    @Req() req: ClinicRequest,
    @Param("patientId", new ParseUUIDPipe({ version: "4" })) patientId: string,
    @UploadedFile()
    file?: { buffer: Buffer; originalname: string; size: number },
  ) {
    const mimeType = file && documentMime(file.buffer);
    if (!file || !mimeType || !file.size)
      throw new BadRequestException(
        "Selecciona un PDF, JPG o PNG de hasta 5 MB.",
      );
    const name = file.originalname
      // Control characters are deliberately removed from downloaded filenames.
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f\x7f/\\]/g, "_")
      .slice(0, 180);
    return this.prisma.$transaction(async (tx) => {
      await lockClinic(tx, req.clinic.id);
      const member = await requireMember(
        tx,
        req.clinic.id,
        req.principal.userId,
        ["consultation:write"],
      );
      await requirePatient(tx, member, patientId);
      const patient = await tx.patient.findUnique({
        where: { id_clinicId: { id: patientId, clinicId: req.clinic.id } },
        select: { status: true },
      });
      if (patient?.status === "ARCHIVED")
        throw new BadRequestException("El paciente está archivado.");
      if (
        (await tx.patientDocument.count({
          where: { clinicId: req.clinic.id, patientId },
        })) >= 100
      )
        throw new BadRequestException("Límite de 100 documentos por paciente.");
      return tx.patientDocument.create({
        data: {
          clinicId: req.clinic.id,
          patientId,
          uploadedById: member.id,
          name,
          mimeType,
          size: file.size,
          content: new Uint8Array(file.buffer),
        },
        select: metadata,
      });
    });
  }
  @Get(":id")
  @RequirePermissions("consultation:read")
  async download(
    @Req() req: ClinicRequest,
    @Param("patientId", new ParseUUIDPipe({ version: "4" })) patientId: string,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Res() res: Response,
  ) {
    const member = await requireMember(
      this.prisma,
      req.clinic.id,
      req.principal.userId,
      ["consultation:read"],
    );
    await requirePatient(this.prisma, member, patientId);
    const file = await this.prisma.patientDocument.findFirst({
      where: { id, patientId, clinicId: req.clinic.id },
    });
    if (!file) {
      res.sendStatus(404);
      return;
    }
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="document"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
    );
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(Buffer.from(file.content));
  }
}
@Module({
  imports: [SessionsModule, AuthorizationModule],
  controllers: [PatientDocumentsController],
})
export class PatientDocumentsModule {}
