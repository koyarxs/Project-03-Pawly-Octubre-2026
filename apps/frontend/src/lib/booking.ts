import { AuthError, request } from "./auth";
export type Opening = { weekday: number; opens: string; closes: string };
export type BookingPolicy = {
  publicEnabled: boolean;
  autoConfirm: boolean;
  autoAssign: boolean;
  minNoticeMinutes: number;
  maxAdvanceDays: number;
  stepMinutes: number;
  cancellationNoticeMinutes: number;
  message: string;
  hours: Opening[];
  professionals: { membershipId: string; hours: Opening[] }[];
  blocks: {
    id: string;
    professionalId: string | null;
    resourceKey: string | null;
    startsAt: string;
    endsAt: string;
    reason: string;
    kind: "BLOCK" | "HOLIDAY" | "VACATION" | "ABSENCE";
  }[];
};
export type BookableService = {
  id: string;
  name: string;
  description: string;
  durationMinutes: number;
  professionalIds: string[];
};
export type BookingCatalog = {
  demo?: boolean;
  available: boolean;
  clinic: { name: string; slug: string; timezone: string; address?: string };
  services: BookableService[];
  professionals: { id: string; name: string }[];
  policy: Partial<BookingPolicy> & { message: string };
};
export type BookingSlot = {
  startsAt: string;
  endsAt: string;
  professionalId: string;
};
export type BookingReceipt = {
  reference: string;
  status: string;
  version: number;
  startsAt: string;
  endsAt: string;
  serviceId: string;
  professionalId: string;
  timezone: string;
  confirmed: boolean;
  message: string;
  ownerName?: string;
  petName?: string;
  reason?: string;
  email?: string;
  emailDelivery?: "queued" | "sent" | "unavailable" | "failed";
};
export type BookingSettings = {
  demo?: boolean;
  configuration: BookingPolicy;
  version: number;
  clinic: { id: string; name: string; slug: string; timezone: string };
  professionals: { id: string; name: string }[];
  services: (Omit<BookableService, "professionalIds"> & {
    enabled: boolean;
    version: number;
    bufferMinutes: number;
    resourceKey: string | null;
    professionals: { membershipId: string }[];
  })[];
};
export type BookingIntake = {
  id: string;
  version: number;
  startsAt: string;
  endsAt: string;
  status: string;
  ownerName: string;
  ownerRut?: string | null;
  email: string;
  phone: string;
  petName: string;
  species: string;
  reason: string;
  additionalInfo: string;
  serviceId: string;
  professionalMembershipId: string;
  appointmentId: string | null;
  service: { name: string };
  professional: { user: { name: string } };
};
export const bookingStates: Record<string, string> = {
  PENDING: "Pendiente de aprobación",
  CONFIRMED: "Confirmada",
  CONVERTED: "Vinculada a la agenda",
  CANCELLED: "Cancelada",
  REJECTED: "Rechazada",
};
export function bookingError(error: unknown) {
  const status = error instanceof AuthError ? error.status : 0;
  if (status === 409)
    return "El horario o registro cambió. Actualiza la disponibilidad antes de intentar nuevamente.";
  if (status === 429)
    return "Alcanzaste el límite de solicitudes. Espera un momento o contacta a la clínica.";
  if (status === 404)
    return "No encontramos esa reserva o el servicio no está disponible. Revisa la referencia y clave de gestión.";
  if (status === 403)
    return "No tienes permiso para completar esta operación. Verifica tu acceso.";
  if (status === 400)
    return "Revisa los datos, la fecha y el profesional seleccionado.";
  return "No pudimos conectar con el agendamiento. Intenta nuevamente.";
}
export async function publicBooking<T>(
  path: string,
  body?: object,
  signal?: AbortSignal,
): Promise<T> {
  const base = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"
  ).replace(/\/$/, "");
  const response = await fetch(`${base}/bookings${path}`, {
    method: body ? "POST" : "GET",
    credentials: "omit",
    cache: "no-store",
    ...(body
      ? {
          headers: { "Content-Type": "application/json", "X-Pawly-CSRF": "1" },
          body: JSON.stringify(body),
        }
      : {}),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new AuthError(response.status);
  return response.json() as Promise<T>;
}
export async function bookingDocument(slug: string, kind: "receipt" | "calendar", identity: { reference: string; managementToken: string }): Promise<Blob> {
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api").replace(/\/$/, "");
  const response = await fetch(`${base}/bookings/${encodeURIComponent(slug)}/${kind}`, { method: "POST", credentials: "omit", cache: "no-store", headers: { "Content-Type": "application/json", "X-Pawly-CSRF": "1" }, body: JSON.stringify(identity), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new AuthError(response.status);
  const type = response.headers.get("content-type") || "";
  if (!type.includes(kind === "receipt" ? "application/pdf" : "text/calendar")) throw new AuthError(0);
  return response.blob();
}
export const privateBooking = async <T>(
  clinicId: string,
  path: string,
  body?: object,
  method?: "POST" | "PATCH",
  signal?: AbortSignal,
) =>
  (await request(
    `/clinics/${encodeURIComponent(clinicId)}/booking${path}`,
    body,
    signal,
    method,
  )) as T;
export function managementToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
export function bookingTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "shortOffset",
  }).format(new Date(value));
}
export function bookingDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: timezone,
    dateStyle: "full",
  }).format(new Date(value));
}
