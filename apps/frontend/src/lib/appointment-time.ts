// Calendar arithmetic uses civil dates, never the browser's timezone.
export function localStamp(instant: Date | string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const get = (key: string) => parts.find((p) => p.type === key)!.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
export function shiftDate(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function weekStart(date: string): string {
  return shiftDate(
    date,
    -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7),
  );
}
export function localToUtc(value: string, timeZone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw new Error("Fecha u hora inválida.");
  const naive = Date.parse(`${value}:00Z`);
  if (
    !Number.isFinite(naive) ||
    new Date(naive).toISOString().slice(0, 16) !== value
  )
    throw new Error("Fecha u hora inválida.");
  const offsets = new Set<number>();
  for (let h = -36; h <= 36; h += 6) {
    const probe = naive + h * 3600000;
    offsets.add(
      Date.parse(localStamp(new Date(probe), timeZone) + ":00Z") - probe,
    );
  }
  const candidates = [...offsets]
    .map((offset) => new Date(naive - offset))
    .filter((date) => localStamp(date, timeZone) === value);
  if (candidates.length !== 1)
    throw new Error(
      "Esta hora no existe o se repite por el cambio de horario. Elige otra hora.",
    );
  return candidates[0].toISOString();
}
export function calendarRange(date: string, weekly: boolean, timeZone: string) {
  const start = weekly ? weekStart(date) : date;
  // Midnight may not exist on Chilean DST change days: use the first valid minute.
  const boundary = (day: string) => {
    for (let minute = 0; minute < 180; minute++) {
      try {
        return localToUtc(
          `${day}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
          timeZone,
        );
      } catch {
        /* Find first valid civil instant. */
      }
    }
    throw new Error("No fue posible determinar el inicio del día.");
  };
  return {
    start,
    from: boundary(start),
    to: boundary(shiftDate(start, weekly ? 7 : 1)),
  };
}

export function shiftMonth(date: string, months: number): string {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + months, 1, 12))
    .toISOString()
    .slice(0, 10);
}
export function monthRange(date: string, timeZone: string) {
  const start = date.slice(0, 7) + "-01",
    next = shiftMonth(start, 1);
  return {
    start,
    from: calendarRange(start, false, timeZone).from,
    to: calendarRange(next, false, timeZone).from,
    days: Math.round((Date.parse(next) - Date.parse(start)) / 86400000),
  };
}

// Preserve seconds/precision of API-created appointments when only their state changes.
export function appointmentInstant(
  value: string,
  timeZone: string,
  original?: string,
): string {
  return original && localStamp(original, timeZone) === value
    ? original
    : localToUtc(value, timeZone);
}
