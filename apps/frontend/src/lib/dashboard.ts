import { AuthError } from "./auth";
import { calendarRange } from "./appointment-time";
import { getAppointments, type Appointment } from "./appointments";
import { listRecords } from "./clinical";
import { getConsultations } from "./consultations";

export type OverviewValue =
  { kind: "ready"; total: number } | { kind: "error" };
export interface DashboardOverview {
  appointments: OverviewValue;
  patients: OverviewValue;
  tutors: OverviewValue;
  drafts: OverviewValue | undefined;
  upcoming: Appointment[];
  updatedAt: string;
}

async function todayAppointments(
  clinicId: string,
  date: string,
  timezone: string,
  now: Date,
  signal: AbortSignal,
) {
  const range = calendarRange(date, false, timezone);
  const query = new URLSearchParams({ from: range.from, to: range.to });
  const first = await getAppointments(clinicId, `${query}&page=1`, signal);
  if (first.totalPages > 10_000) throw new AuthError(502);
  const upcoming: Appointment[] = [];
  let result = first;
  for (let page = 1; ; page++) {
    for (const appointment of result.items) {
      if (
        appointment.status !== "CANCELLED" &&
        appointment.status !== "COMPLETED" &&
        Date.parse(appointment.endsAt) > now.valueOf()
      ) {
        upcoming.push(appointment);
        if (upcoming.length === 5) break;
      }
    }
    if (upcoming.length === 5 || page >= first.totalPages) break;
    if (result.items.length === 0) throw new AuthError(502);
    if (signal.aborted) throw new AuthError(0);
    result = await getAppointments(
      clinicId,
      `${query}&page=${page + 1}`,
      signal,
    );
  }
  return { total: first.total, upcoming };
}

// Failed sources stay unavailable; they are never represented as zero counts.
// Existing API clients validate every clinic-scoped response before rendering.
export async function getDashboardOverview(
  clinicId: string,
  date: string,
  timezone: string,
  clinical: boolean,
  signal: AbortSignal,
): Promise<DashboardOverview> {
  const now = new Date();
  const [appointments, patients, tutors, drafts] = await Promise.allSettled([
    todayAppointments(clinicId, date, timezone, now, signal),
    listRecords(clinicId, "pacientes", "page=1&limit=1&status=ACTIVE", signal),
    listRecords(clinicId, "tutores", "page=1&limit=1&status=ACTIVE", signal),
    clinical
      ? getConsultations(clinicId, "page=1&status=DRAFT", signal)
      : Promise.resolve(null),
  ]);
  for (const result of [appointments, patients, tutors, drafts]) {
    if (
      result.status === "rejected" &&
      result.reason instanceof AuthError &&
      [401, 403].includes(result.reason.status)
    )
      throw result.reason;
  }
  const count = (
    result: PromiseSettledResult<{ total: number } | null>,
  ): OverviewValue =>
    result.status === "fulfilled" && result.value
      ? { kind: "ready", total: result.value.total }
      : { kind: "error" };
  return {
    appointments: count(appointments),
    patients: count(patients),
    tutors: count(tutors),
    drafts: clinical ? count(drafts) : undefined,
    upcoming:
      appointments.status === "fulfilled" ? appointments.value.upcoming : [],
    updatedAt: now.toISOString(),
  };
}
