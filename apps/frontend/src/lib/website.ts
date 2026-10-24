import { AuthError, request } from "./auth";
import { websiteBanners } from "./website-banners";

export const websitePhotos = websiteBanners;
export interface WebsiteContent {
  clinicName: string;
  tagline: string;
  heroTitle: string;
  heroDescription: string;
  heroPhotos: string[];
  aboutTitle: string;
  aboutText: string;
  phone: string;
  email: string;
  whatsapp: string;
  address: string;
  hours: string;
  showServices: boolean;
  showAbout: boolean;
  showHours: boolean;
  services: { title: string; description: string }[];
  testimonials?: { author: string; companion: string; quote: string }[];
}
export interface WebsiteState {
  clinicId: string;
  version: number;
  content: WebsiteContent;
  publishedAt: string | null;
  updatedAt: string | null;
  hasUnpublishedChanges: boolean;
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const validTime = (value: unknown) =>
  value === null ||
  (typeof value === "string" && Number.isFinite(Date.parse(value)));
export function isWebsiteContent(value: unknown): value is WebsiteContent {
  if (!record(value)) return false;
  const limits: Record<string, number> = {
    clinicName: 160,
    tagline: 80,
    heroTitle: 140,
    heroDescription: 600,
    aboutTitle: 140,
    aboutText: 2000,
    phone: 32,
    email: 254,
    whatsapp: 15,
    address: 300,
    hours: 500,
  };
  if (
    !Object.entries(limits).every(
      ([key, max]) =>
        typeof value[key] === "string" &&
        Array.from(value[key] as string).length <= max,
    )
  )
    return false;
  return (
    (value.testimonials === undefined ||
      (Array.isArray(value.testimonials) &&
        value.testimonials.length <= 12 &&
        value.testimonials.every(
          (item) =>
            record(item) &&
            typeof item.author === "string" &&
            item.author.trim().length > 0 &&
            item.author.length <= 100 &&
            typeof item.companion === "string" &&
            item.companion.length <= 100 &&
            typeof item.quote === "string" &&
            item.quote.trim().length > 0 &&
            item.quote.length <= 600,
        ))) &&
    ["showServices", "showAbout", "showHours"].every(
      (key) => typeof value[key] === "boolean",
    ) &&
    Array.isArray(value.heroPhotos) &&
    value.heroPhotos.length >= 1 &&
    value.heroPhotos.length <= 3 &&
    new Set(value.heroPhotos).size === value.heroPhotos.length &&
    value.heroPhotos.every((photo) =>
      websitePhotos.some((item) => item.id === photo),
    ) &&
    Array.isArray(value.services) &&
    value.services.length <= 12 &&
    value.services.every(
      (service) =>
        record(service) &&
        typeof service.title === "string" &&
        service.title.length <= 100 &&
        typeof service.description === "string" &&
        service.description.length <= 500,
    ) &&
    typeof value.whatsapp === "string" &&
    /^$|^[1-9]\d{7,14}$/.test(value.whatsapp) &&
    typeof value.phone === "string" &&
    /^$|^(?=(?:\D*\d){7,15}\D*$)\+?[\d\s().-]{7,32}$/.test(value.phone) &&
    typeof value.email === "string" &&
    (!value.email || /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(value.email))
  );
}
function verifiedState(value: unknown, clinicId: string): WebsiteState {
  if (
    !record(value) ||
    value.clinicId !== clinicId ||
    !Number.isSafeInteger(value.version) ||
    Number(value.version) < 0 ||
    !isWebsiteContent(value.content) ||
    !validTime(value.publishedAt) ||
    !validTime(value.updatedAt) ||
    typeof value.hasUnpublishedChanges !== "boolean"
  )
    throw new AuthError(502);
  return value as unknown as WebsiteState;
}
const endpoint = (clinicId: string) =>
  `/clinics/${encodeURIComponent(clinicId)}/website`;
export async function getWebsite(clinicId: string, signal: AbortSignal) {
  return verifiedState(
    await request(endpoint(clinicId), undefined, signal),
    clinicId,
  );
}
export async function saveWebsite(
  clinicId: string,
  version: number,
  content: WebsiteContent,
  signal: AbortSignal,
) {
  return verifiedState(
    await request(endpoint(clinicId), { version, content }, signal, "PATCH"),
    clinicId,
  );
}
export async function publishWebsite(
  clinicId: string,
  version: number,
  signal: AbortSignal,
  unpublish = false,
) {
  return verifiedState(
    await request(
      `${endpoint(clinicId)}/${unpublish ? "unpublish" : "publish"}`,
      { version },
      signal,
    ),
    clinicId,
  );
}
export async function getPublicWebsite(
  signal?: AbortSignal,
): Promise<{ content: WebsiteContent | null; publishedAt: string | null }> {
  const base =
    typeof window === "undefined" && process.env.WEBSITE_SERVER_API_URL
      ? process.env.WEBSITE_SERVER_API_URL
      : process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new AuthError(0);
  let response: Response;
  try {
    response = await fetch(`${base.replace(/\/$/, "")}/website`, {
      credentials: "omit",
      cache: "no-store",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(5000)])
        : AbortSignal.timeout(5000),
    });
  } catch {
    throw new AuthError(0);
  }
  if (!response.ok) throw new AuthError(response.status);
  const value: unknown = await response.json();
  if (
    !record(value) ||
    (value.content !== null && !isWebsiteContent(value.content)) ||
    !validTime(value.publishedAt)
  )
    throw new AuthError(502);
  return {
    content: value.content as WebsiteContent | null,
    publishedAt: value.publishedAt as string | null,
  };
}
export function websiteError(error: unknown) {
  if (error instanceof AuthError) {
    if (error.status === 409)
      return "El contenido cambió en otra sesión. Recarga el editor antes de volver a guardar; conserva primero los textos que estás editando.";
    if (error.status === 400)
      return "Revisa los campos. Para publicar debes indicar al menos un contacto y completar las secciones que quieres mostrar.";
    if (error.status === 403)
      return "No tienes permiso para administrar este sitio. Vuelve a verificar tu acceso.";
    if (error.status === 503)
      return "La administración del sitio todavía necesita completar su configuración local.";
    if (error.status === 429)
      return "Espera un momento antes de volver a intentarlo.";
  }
  return "No pudimos completar la operación. Tus cambios no se han confirmado; intenta nuevamente.";
}
