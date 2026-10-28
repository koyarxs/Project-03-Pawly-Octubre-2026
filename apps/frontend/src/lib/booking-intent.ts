import { localStamp } from "./appointment-time";
import type { BookingCatalog, BookingSlot } from "./booking";

export type BookingIntent = { serviceId: string; professionalId: string; date: string; startsAt: string };

export function bookingIntentHref(slug: string, serviceId: string, slot: BookingSlot, timezone: string) {
  const query = new URLSearchParams({service:serviceId,professional:slot.professionalId,date:localStamp(slot.startsAt,timezone).slice(0,10),startsAt:slot.startsAt});
  return `/reservar/${encodeURIComponent(slug)}?${query}`;
}

export function readBookingIntent(search: string, catalog: BookingCatalog, now = Date.now()): BookingIntent | null {
  try {
    const query = new URLSearchParams(search);
    const serviceId=query.get("service") ?? "", professionalId=query.get("professional") ?? "", date=query.get("date") ?? "", startsAt=query.get("startsAt") ?? "";
    const service=catalog.services.find(item=>item.id===serviceId);
    if(!catalog.available || !service || !service.professionalIds.includes(professionalId) || !catalog.professionals.some(item=>item.id===professionalId))return null;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(startsAt))return null;
    if(!Number.isFinite(Date.parse(startsAt)) || Date.parse(startsAt)<=now || localStamp(startsAt,catalog.clinic.timezone).slice(0,10)!==date)return null;
    return {serviceId,professionalId,date,startsAt};
  } catch {return null;}
}
