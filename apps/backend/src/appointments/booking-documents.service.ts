import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import type { BookingLookupDto } from "./booking.dto";
import { emailManagementKey, reservationCredential, type ReservationDocument } from "./booking-documents";

@Injectable()
export class BookingDocumentsService {
  constructor(private readonly db: PrismaService, private readonly config: ConfigService) {}

  async data(reference: string, credentials?: { slug: string; token: string }): Promise<ReservationDocument> {
    const row = await this.db.bookingRequest.findFirst({
      where: { id: reference, ...(credentials ? { clinic: { slug: credentials.slug, status: "ACTIVE" } } : {}) },
      include: {
        clinic: { include: { website: { select: { published: true } } } },
        service: { select: { name: true } },
        professional: { select: { user: { select: { name: true } } } },
        appointment: { select: { startsAt: true, endsAt: true, status: true } },
      },
    });
    const secret = this.config.get<string>("BOOKING_LINK_SECRET");
    if (!row || (credentials && !reservationCredential(row, credentials.token, secret))) throw new NotFoundException("Reserva no encontrada.");
    const content = row.clinic.website?.published as Record<string, unknown> | null;
    const field = (key: string) => typeof content?.[key] === "string" ? content[key] as string : "";
    const siteClinic = row.clinicId === this.config.get<string>("WEBSITE_CLINIC_ID");
    const name = field("clinicName") || (siteClinic ? this.config.get<string>("WEBSITE_PUBLIC_NAME") : "") || row.clinic.name;
    const key = emailManagementKey(row, secret) || credentials?.token;
    const base = (this.config.get<string>("PUBLIC_SITE_URL") || "http://localhost:3000").replace(/\/$/, "");
    const link = new URL(`/reservar/${encodeURIComponent(row.clinic.slug)}`, base);
    if (key) link.hash = new URLSearchParams({ reference: row.id, key }).toString();
    const labels: Record<string, string> = { DOG: "Perro", CAT: "Gato", BIRD: "Ave", RABBIT: "Conejo", RODENT: "Roedor", REPTILE: "Reptil", HORSE: "Caballo", OTHER: "Otra especie" };
    return {
      reference: row.id, version: row.version, status: row.appointment ? (["SCHEDULED", "CONFIRMED"].includes(row.appointment.status) ? "CONFIRMED" : row.appointment.status) : row.status,
      clinicName: name.replace(/\s*·?\s*DEMOSTRACIÓN.*$/u, "").trim(), clinicSlug: row.clinic.slug,
      address: field("address") || (siteClinic ? this.config.get<string>("WEBSITE_PUBLIC_ADDRESS") || "" : ""), phone: field("phone") || (siteClinic ? this.config.get<string>("WEBSITE_PUBLIC_PHONE") || "" : ""), timezone: row.clinic.timezone,
      service: row.service.name, professional: row.professional.user.name.replace(/^\[DEMO\]\s*/u, ""),
      startsAt: row.appointment?.startsAt || row.startsAt, endsAt: row.appointment?.endsAt || row.endsAt,
      ownerName: row.ownerName, email: row.email, petName: row.petName, species: labels[row.species] || row.species,
      managementUrl: link.toString(), ...(key ? { managementKey: key } : {}),
    };
  }
  download(slug: string, dto: BookingLookupDto) { return this.data(dto.reference, { slug, token: dto.managementToken }); }
}
