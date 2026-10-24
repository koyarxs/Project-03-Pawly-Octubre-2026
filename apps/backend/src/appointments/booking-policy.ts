import { BadRequestException } from "@nestjs/common";
export type Opening = { weekday: number; opens: string; closes: string };
export type BookingBlock = {
  id: string;
  professionalId: string | null;
  resourceKey: string | null;
  startsAt: string;
  endsAt: string;
  reason: string;
  kind: "BLOCK" | "HOLIDAY" | "VACATION" | "ABSENCE";
};
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
  blocks: BookingBlock[];
};
export const defaultBookingPolicy: BookingPolicy = {
  publicEnabled: false,
  autoConfirm: false,
  autoAssign: false,
  minNoticeMinutes: 120,
  maxAdvanceDays: 60,
  stepMinutes: 15,
  cancellationNoticeMinutes: 120,
  message:
    "La atención está sujeta a los servicios y horarios habilitados por la clínica.",
  hours: [],
  professionals: [],
  blocks: [],
};
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const time = /^([01]\d|2[0-3]):[0-5]\d$/;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const keys = (v: Record<string, unknown>, allowed: string[]) =>
  Object.keys(v).every((key) => allowed.includes(key));
function openings(v: unknown): v is Opening[] {
  return (
    Array.isArray(v) &&
    v.length <= 28 &&
    v.every(
      (r) =>
        object(r) &&
        keys(r, ["weekday", "opens", "closes"]) &&
        Number.isInteger(r.weekday) &&
        Number(r.weekday) >= 0 &&
        Number(r.weekday) <= 6 &&
        typeof r.opens === "string" &&
        typeof r.closes === "string" &&
        time.test(r.opens) &&
        time.test(r.closes) &&
        r.opens < r.closes,
    ) &&
    !v.some((r, i) =>
      v.some(
        (other, j) =>
          j > i &&
          r.weekday === other.weekday &&
          r.opens < other.closes &&
          r.closes > other.opens,
      ),
    )
  );
}
export function validateBookingPolicy(input: unknown): BookingPolicy {
  const fail = () => {
    throw new BadRequestException("Configuración de agendamiento inválida.");
  };
  if (!object(input) || !keys(input, Object.keys(defaultBookingPolicy)))
    return fail();
  const p = input as unknown as BookingPolicy;
  if (
    typeof p.publicEnabled !== "boolean" ||
    typeof p.autoConfirm !== "boolean" ||
    typeof p.autoAssign !== "boolean" ||
    !openings(p.hours) ||
    typeof p.message !== "string" ||
    p.message.length > 1000
  )
    return fail();
  for (const [value, minimum, maximum] of [
    [p.minNoticeMinutes, 0, 43200],
    [p.maxAdvanceDays, 1, 180],
    [p.stepMinutes, 5, 60],
    [p.cancellationNoticeMinutes, 0, 43200],
  ])
    if (!Number.isInteger(value) || value! < minimum! || value! > maximum!)
      return fail();
  if (
    !Array.isArray(p.professionals) ||
    p.professionals.length > 100 ||
    p.professionals.some(
      (r) =>
        !object(r) ||
        !keys(r, ["membershipId", "hours"]) ||
        typeof r.membershipId !== "string" ||
        !uuid.test(r.membershipId) ||
        !openings(r.hours),
    ) ||
    new Set(p.professionals.map((r) => r.membershipId)).size !==
      p.professionals.length
  )
    return fail();
  if (
    !Array.isArray(p.blocks) ||
    p.blocks.length > 300 ||
    p.blocks.some(
      (r) =>
        !object(r) ||
        !keys(r, [
          "id",
          "professionalId",
          "resourceKey",
          "startsAt",
          "endsAt",
          "reason",
          "kind",
        ]) ||
        typeof r.id !== "string" ||
        !uuid.test(r.id) ||
        (r.professionalId !== null &&
          (typeof r.professionalId !== "string" ||
            !uuid.test(r.professionalId))) ||
        (r.resourceKey !== null &&
          (typeof r.resourceKey !== "string" ||
            !r.resourceKey.trim() ||
            r.resourceKey.length > 80)) ||
        typeof r.reason !== "string" ||
        !r.reason.trim() ||
        r.reason.length > 300 ||
        !["BLOCK", "HOLIDAY", "VACATION", "ABSENCE"].includes(r.kind) ||
        !validInstant(r.startsAt) ||
        !validInstant(r.endsAt) ||
        r.endsAt <= r.startsAt,
    ) ||
    new Set(p.blocks.map((r) => r.id)).size !== p.blocks.length
  )
    return fail();
  return p;
}
export function validInstant(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value
  );
}
const formatters = new Map<string, Intl.DateTimeFormat>();
export function civil(instant: Date, timezone: string) {
  if (!formatters.has(timezone)) {
    if (formatters.size >= 100)
      formatters.delete(formatters.keys().next().value!);
    formatters.set(
      timezone,
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }),
    );
  }
  const parts = formatters.get(timezone)!.formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  return {
    date,
    minute: Number(get("hour")) * 60 + Number(get("minute")),
    weekday: new Date(`${date}T12:00:00Z`).getUTCDay(),
  };
}
export type Occupancy = {
  startsAt: Date;
  blockedUntil: Date;
  professionalId: string | null;
  resourceKey: string | null;
};
export type SlotService = {
  durationMinutes: number;
  bufferMinutes: number;
  resourceKey: string | null;
};
const minutes = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export function canBook(input: {
  startsAt: Date;
  professionalId: string;
  timezone: string;
  policy: BookingPolicy;
  service: SlotService;
  occupied: Occupancy[];
  now: Date;
  enforceLead?: boolean;
}) {
  const { startsAt, professionalId, timezone, policy, service, occupied, now } =
    input;
  const end = new Date(
    startsAt.valueOf() +
      (service.durationMinutes + service.bufferMinutes) * 60000,
  );
  if (
    input.enforceLead !== false &&
    (startsAt.valueOf() < now.valueOf() + policy.minNoticeMinutes * 60000 ||
      startsAt.valueOf() > now.valueOf() + policy.maxAdvanceDays * 86400000)
  )
    return false;
  const start = civil(startsAt, timezone),
    last = civil(new Date(end.valueOf() - 1), timezone);
  if (
    start.date !== last.date ||
    startsAt.getUTCSeconds() ||
    startsAt.getUTCMilliseconds() ||
    start.minute % policy.stepMinutes
  )
    return false;
  const within = (hours: Opening[]) =>
    hours.some(
      (h) =>
        h.weekday === start.weekday &&
        start.minute >= minutes(h.opens) &&
        last.minute < minutes(h.closes),
    );
  if (
    !within(policy.hours) ||
    !within(
      policy.professionals.find((p) => p.membershipId === professionalId)
        ?.hours || [],
    )
  )
    return false;
  if (
    policy.blocks.some(
      (b) =>
        ((!b.professionalId && !b.resourceKey) ||
          b.professionalId === professionalId ||
          (!!service.resourceKey && b.resourceKey === service.resourceKey)) &&
        new Date(b.startsAt) < end &&
        new Date(b.endsAt) > startsAt,
    )
  )
    return false;
  return !occupied.some(
    (o) =>
      (o.professionalId === professionalId ||
        (!!service.resourceKey && o.resourceKey === service.resourceKey)) &&
      o.startsAt < end &&
      o.blockedUntil > startsAt,
  );
}
export function daySlots(
  date: string,
  input: Omit<Parameters<typeof canBook>[0], "startsAt">,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(`${date}T12:00:00Z`)) ||
    new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date
  )
    throw new BadRequestException("Fecha inválida.");
  const naive = Date.parse(`${date}T00:00:00Z`),
    result: string[] = [];
  // Walk instants, not local timestamps: nonexistent Chilean hours are never made up.
  // Repeated DST times remain distinct UTC instants and receive offset labels in UI.
  for (let t = naive - 14 * 3600000; t < naive + 38 * 3600000; t += 60000) {
    const startsAt = new Date(t);
    if (
      civil(startsAt, input.timezone).date === date &&
      canBook({ ...input, startsAt })
    )
      result.push(startsAt.toISOString());
  }
  return result;
}
