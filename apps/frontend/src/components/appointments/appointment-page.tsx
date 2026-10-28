"use client";
import { displayName } from "@/lib/display-name";
import Link from "next/link";
import { canReadClinical, consultationPath } from "@/lib/consultations";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import {
  BookingSettingsPanel,
  type AppointmentDraft,
} from "./booking-settings";
import { BookingRequestsPanel } from "./booking-requests";
import {
  privateBooking,
  bookingTime,
  bookingStates,
  type BookingIntake,
  type BookingSettings,
} from "@/lib/booking";
import bookingStyles from "./booking-workspace.module.css";
import {
  WorkspaceShell,
  type WorkspaceContext,
} from "@/components/workspace/workspace-shell";
import { AuthError } from "@/lib/auth";
import {
  listRecords,
  getRecord,
  fullName,
  type Patient,
  type PatientSummary,
} from "@/lib/clinical";
import {
  appointmentError,
  appointmentStates,
  getAppointments,
  getProfessionals,
  saveAppointment,
  getAppointmentHistory,
  type Appointment,
  type AppointmentStatus,
  type Professional,
  type AppointmentEvent,
} from "@/lib/appointments";
import {
  calendarRange,
  localStamp,
  appointmentInstant,
  shiftDate,
  monthRange,
  shiftMonth,
} from "@/lib/appointment-time";
import "./appointments.css";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from "@/components/ui/workspace-ui";

function useAgendaLoad<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  context: WorkspaceContext,
): { data?: T; error?: string } {
  const [snapshot, setSnapshot] = useState<{
    key: string;
    data?: T;
    error?: string;
  }>({ key: "" });
  const { endSession } = context;
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setSnapshot({ key, data });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof AuthError && error.status === 401) endSession();
        else setSnapshot({ key, error: appointmentError(error) });
      });
    return () => controller.abort();
  }, [key, load, endSession]);
  return snapshot.key === key ? snapshot : {};
}
export function AppointmentPage({ clinicId }: { clinicId: string }) {
  return (
    <WorkspaceShell clinicId={clinicId} section="agenda">
      {(context) => (
        <SchedulingWorkspace
          key={`${clinicId}:${context.revision}`}
          context={context}
        />
      )}
    </WorkspaceShell>
  );
}
function SchedulingWorkspace({ context }: { context: WorkspaceContext }) {
  const [bookingFocus, setBookingFocus] = useState<{
    date: string;
    status: string;
  } | null>(null);
  const [tab, setTab] = useState("calendar"),
    [draft, setDraft] = useState<AppointmentDraft | null>(null);
  const tabs = [
    ["calendar", "Calendario"],
    ["day", "Citas del día"],
    ["upcoming", "Próximas citas"],
    ["requests", "Solicitudes pendientes"],
    ["history", "Historial"],
    ["availability", "Disponibilidad"],
    ["services", "Servicios"],
    ["settings", "Configuración"],
  ] as const;
  return (
    <div className={bookingStyles.workspace}>
      <nav
        className={bookingStyles.tabs}
        aria-label="Navegación de agendamiento"
      >
        {tabs.map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              setDraft(null);
              setBookingFocus(null);
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {tab === "requests" ? (
        <BookingRequestsPanel
          context={context}
          initialDate={bookingFocus?.date}
          initialStatus={bookingFocus?.status}
        />
      ) : ["availability", "services", "settings"].includes(tab) ? (
        <BookingSettingsPanel
          context={context}
          key={tab}
          view={tab as "availability" | "services" | "settings"}
          onSlot={(value) => {
            setDraft(value);
            setTab("calendar");
          }}
        />
      ) : (
        <Agenda
          key={tab}
          context={context}
          initialView={
            tab === "day"
              ? "day"
              : tab === "upcoming"
                ? "upcoming"
                : tab === "history"
                  ? "history"
                  : "week"
          }
          draft={draft}
          onDraftClosed={() => setDraft(null)}
          onBookingClick={(row) => {
            const tz =
              context.session.memberships.find(
                (m) => m.clinic.id === context.clinicId,
              )?.clinic.timezone || "America/Santiago";
            setBookingFocus({
              date: localStamp(row.startsAt, tz).slice(0, 10),
              status: row.status,
            });
            setTab("requests");
          }}
        />
      )}
    </div>
  );
}
type AgendaView = "day" | "week" | "month" | "upcoming" | "history";
function Agenda({
  context,
  initialView = "week",
  draft,
  onDraftClosed,
  onBookingClick,
}: {
  context: WorkspaceContext;
  initialView?: AgendaView;
  draft?: AppointmentDraft | null;
  onDraftClosed?: () => void;
  onBookingClick?: (row: BookingIntake) => void;
}) {
  const clinicId = context.clinicId;
  const timezone =
    context.session.memberships.find((m) => m.clinic.id === context.clinicId)!
      .clinic.timezone || "America/Santiago";
  const [date, setDate] = useState(() =>
    localStamp(draft?.startsAt || new Date(), timezone).slice(0, 10),
  );
  const [view, setView] = useState<AgendaView>(initialView),
    [status, setStatus] = useState(""),
    [professional, setProfessional] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [serviceFilter, setServiceFilter] = useState("");
  const [editor, setEditor] = useState<Appointment | "new" | null>(
      draft ? "new" : null,
    ),
    [notice, setNotice] = useState("");
  const trigger = useRef<HTMLButtonElement | null>(null);
  const weekly = view === "week",
    monthly = view === "month",
    list = view === "upcoming" || view === "history";
  const month = monthRange(date, timezone),
    listStart = view === "history" ? shiftDate(date, -30) : date;
  const range = monthly
    ? month
    : list
      ? {
          start: listStart,
          from: calendarRange(listStart, false, timezone).from,
          to: calendarRange(shiftDate(listStart, 31), false, timezone).from,
        }
      : calendarRange(date, weekly, timezone);
  const query = `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}&page=${page}${status ? `&status=${encodeURIComponent(status)}` : ""}${professional ? `&professionalMembershipId=${encodeURIComponent(professional)}` : ""}${serviceFilter ? `&serviceId=${serviceFilter}` : ""}${view === "upcoming" ? "&scope=upcoming" : ""}`;
  const load = useCallback(
    async (signal: AbortSignal) => {
      const bookingQuery = new URLSearchParams({
        from: range.from,
        to: range.to,
        page: String(page),
        calendar: "1",
        ...(status === "SCHEDULED"
          ? { status: "PENDING" }
          : status === "CONFIRMED"
            ? { status: "CONFIRMED" }
            : {}),
        ...(professional ? { professionalId: professional } : {}),
        ...(serviceFilter ? { serviceId: serviceFilter } : {}),
      });
      const [appointments, professionals, settings, bookingResult] =
        await Promise.all([
          getAppointments(clinicId, query, signal),
          getProfessionals(clinicId, signal),
          privateBooking<BookingSettings>(
            clinicId,
            "/settings",
            undefined,
            undefined,
            signal,
          ).catch((e) => {
            if (e instanceof AuthError && e.status === 404) return null;
            throw e;
          }),
          status && !["SCHEDULED", "CONFIRMED"].includes(status)
            ? Promise.resolve({ items: [], total: 0, totalPages: 0 })
            : privateBooking<{
                items: BookingIntake[];
                total: number;
                totalPages: number;
              }>(
                clinicId,
                `/requests?${bookingQuery}`,
                undefined,
                undefined,
                signal,
              ).catch((e) => {
                if (e instanceof AuthError && e.status === 404)
                  return { items: [], total: 0, totalPages: 0 };
                throw e;
              }),
        ]);
      const bookings = Array.isArray(bookingResult.items)
        ? bookingResult
        : { items: [], total: 0, totalPages: 0 };
      return {
        appointments,
        professionals,
        settings,
        bookings,
        totalPages: Math.max(appointments.totalPages, bookings.totalPages),
        total: appointments.total + bookings.total,
      };
    },
    [
      clinicId,
      query,
      range.from,
      range.to,
      page,
      status,
      professional,
      serviceFilter,
    ],
  );
  const result = useAgendaLoad(`${query}:${revision}`, load, context);
  const days = Array.from(
    { length: monthly ? month.days : list ? 31 : weekly ? 7 : 1 },
    (_, i) => shiftDate(range.start, i),
  );
  function open(value: Appointment | "new", button: HTMLButtonElement) {
    trigger.current = button;
    setEditor(value);
  }
  function close() {
    setEditor(null);
    onDraftClosed?.();
    requestAnimationFrame(() => trigger.current?.focus());
  }
  function changeDate(value: string) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setDate(value);
      setPage(1);
    }
  }
  return (
    <section className="appointments" aria-label="Agenda veterinaria">
      <PageHeader
        eyebrow="PLANIFICA LA ATENCIÓN"
        title="Agenda veterinaria"
        description="Organiza la jornada y acompaña cada atención, de principio a fin."
        actions={
          context.access.permissions.includes("appointment:write") && (
            <button
              className="agenda-primary"
              disabled={!result.data}
              onClick={(e) => open("new", e.currentTarget)}
            >
              <Plus size={18} aria-hidden="true" />
              Nueva cita
            </button>
          )
        }
      />
      <div className="agenda-toolbar">
        <div className="agenda-date-nav">
          <button
            aria-label="Periodo anterior"
            onClick={() =>
              changeDate(
                monthly
                  ? shiftMonth(date, -1)
                  : shiftDate(date, list ? -31 : weekly ? -7 : -1),
              )
            }
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() =>
              changeDate(localStamp(new Date(), timezone).slice(0, 10))
            }
          >
            Hoy
          </button>
          <button
            aria-label="Periodo siguiente"
            onClick={() =>
              changeDate(
                monthly
                  ? shiftMonth(date, 1)
                  : shiftDate(date, list ? 31 : weekly ? 7 : 1),
              )
            }
          >
            <ChevronRight size={18} />
          </button>
          <label>
            Fecha
            <input
              type="date"
              value={date}
              onChange={(e) => changeDate(e.target.value)}
              required
            />
          </label>
        </div>
        <div className="agenda-view" role="group" aria-label="Vista de agenda">
          <button
            aria-pressed={view === "day"}
            onClick={() => {
              setView("day");
              setPage(1);
            }}
          >
            Día
          </button>
          <button
            aria-pressed={weekly}
            onClick={() => {
              setView("week");
              setPage(1);
            }}
          >
            Semana
          </button>
          <button
            aria-pressed={monthly}
            onClick={() => {
              setView("month");
              setPage(1);
            }}
          >
            Mes
          </button>
        </div>
      </div>
      <div className="agenda-filters">
        <label>
          Estado
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            {Object.entries(appointmentStates).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Profesional
          <select
            value={professional}
            onChange={(e) => {
              setProfessional(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los profesionales</option>
            {result.data?.professionals.map((p) => (
              <option key={p.id} value={p.id}>
                {displayName(p.user.name)}
              </option>
            ))}
          </select>
        </label>
        <span className="agenda-timezone">
          Horario de la clínica · {timezone}
        </span>
        <label>
          Servicio
          <select
            value={serviceFilter}
            onChange={(e) => {
              setServiceFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los servicios</option>
            {result.data?.settings?.services?.map((s) => (
              <option key={s.id} value={s.id}>
                {displayName(s.name)}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => setRevision((r) => r + 1)}>Actualizar</button>
      </div>
      {notice && (
        <p className="agenda-notice" role="status">
          {notice}
        </p>
      )}
      {result.error ? (
        <div className="agenda-empty" role="alert">
          <h2>No pudimos cargar la agenda.</h2>
          <p>{result.error}</p>
          <button onClick={() => setRevision((r) => r + 1)}>Reintentar</button>
          <button onClick={context.refresh}>Verificar mi acceso</button>
        </div>
      ) : !result.data ? (
        <LoadingState label="Cargando agenda…" rows={4} />
      ) : (
        <>
          <div className="agenda-period-heading">
            <div>
              <span className="pw-eyebrow">
                {monthly
                  ? "VISTA MENSUAL"
                  : view === "upcoming"
                    ? "PRÓXIMAS CITAS"
                    : view === "history"
                      ? "HISTORIAL DE CITAS"
                      : weekly
                        ? "VISTA SEMANAL"
                        : "VISTA DIARIA"}
              </span>
              <h2>
                {new Intl.DateTimeFormat("es-CL", {
                  timeZone: "UTC",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date(`${range.start}T12:00:00Z`))}
                {weekly &&
                  ` — ${new Intl.DateTimeFormat("es-CL", { timeZone: "UTC", day: "numeric", month: "long" }).format(new Date(`${shiftDate(range.start, 6)}T12:00:00Z`))}`}
              </h2>
            </div>
            <p className="agenda-count" aria-live="polite">
              {result.data.appointments.total} citas y{" "}
              {result.data.bookings.total} reservas públicas en el periodo
              {result.data.totalPages > 1
                ? ` · página ${page} de ${result.data.totalPages}`
                : ""}
            </p>
          </div>
          {result.data.total === 0 && (
            <EmptyState
              icon={CalendarDays}
              title="Un espacio para las próximas atenciones."
              description="No hay citas con estos filtros. Crea una cita para un paciente registrado."
            />
          )}
          <div
            className="agenda-calendar-wrap"
            role="region"
            aria-label={
              monthly
                ? "Calendario mensual de citas"
                : weekly
                  ? "Calendario semanal de citas"
                  : "Calendario diario de citas"
            }
            tabIndex={0}
          >
            <div
              className={`agenda-calendar ${monthly ? "agenda-month" : list ? "agenda-list" : weekly ? "agenda-week" : "agenda-day"}`}
            >
              {monthly &&
                Array.from(
                  {
                    length:
                      (new Date(`${range.start}T12:00:00Z`).getUTCDay() + 6) %
                      7,
                  },
                  (_, i) => (
                    <div
                      className="agenda-month-padding"
                      aria-hidden="true"
                      key={`padding-${i}`}
                    />
                  ),
                )}
              {days.map((day) => {
                const events = result.data!.appointments.items.filter(
                  (a) =>
                    localStamp(a.startsAt, timezone).slice(0, 10) <= day &&
                    localStamp(
                      new Date(Date.parse(a.endsAt) - 1),
                      timezone,
                    ).slice(0, 10) >= day,
                );
                const reservations = result.data!.bookings.items.filter(
                  (b) => localStamp(b.startsAt, timezone).slice(0, 10) === day,
                );
                const cards = [
                  ...events.map((value) => ({
                    kind: "appointment" as const,
                    value,
                  })),
                  ...reservations.map((value) => ({
                    kind: "booking" as const,
                    value,
                  })),
                ].sort(
                  (a, b) =>
                    a.value.startsAt.localeCompare(b.value.startsAt) ||
                    a.value.id.localeCompare(b.value.id),
                );
                if (list && !cards.length) return null;
                return (
                  <section
                    className={`agenda-column${day === localStamp(new Date(), timezone).slice(0, 10) ? " agenda-today" : ""}`}
                    key={day}
                    aria-label={`Citas ${day}`}
                  >
                    <h2>
                      <span>
                        {new Intl.DateTimeFormat("es-CL", {
                          weekday: "short",
                          timeZone: "UTC",
                        }).format(new Date(`${day}T12:00:00Z`))}
                      </span>
                      {day.slice(8, 10)}
                      <small>
                        {new Intl.DateTimeFormat("es-CL", {
                          month: "short",
                          timeZone: "UTC",
                        }).format(new Date(`${day}T12:00:00Z`))}
                      </small>
                      {monthly && (
                        <button
                          className="agenda-open-day"
                          aria-label={`Ver citas del ${day}`}
                          onClick={() => {
                            changeDate(day);
                            setView("day");
                          }}
                        >
                          Ver día
                        </button>
                      )}
                    </h2>
                    <div className="agenda-events">
                      {cards.length === 0 ? (
                        <p className="agenda-no-events">Sin citas</p>
                      ) : (
                        cards.map((entry) => {
                          if (entry.kind === "booking") {
                            const b = entry.value;
                            return (
                              <button
                                type="button"
                                key={`booking-${b.id}`}
                                className="agenda-card agenda-public-reservation"
                                onClick={() => onBookingClick?.(b)}
                              >
                                <span className="agenda-time">
                                  {bookingTime(b.startsAt, timezone)}
                                </span>
                                <strong>{displayName(b.petName)}</strong>
                                <span>{displayName(b.service.name)}</span>
                                <small>{displayName(b.professional.user.name)}</small>
                                <StatusBadge
                                  tone={
                                    b.status === "PENDING" ? "warning" : "info"
                                  }
                                  className="agenda-badge"
                                >
                                  {bookingStates[b.status]}
                                </StatusBadge>
                                <small>
                                  Reserva pública · revisar solicitud
                                </small>
                              </button>
                            );
                          }
                          const a = entry.value;
                          return (
                            <button
                              className={`agenda-card agenda-${a.status.toLowerCase()}`}
                              key={a.id}
                              onClick={(e) => open(a, e.currentTarget)}
                            >
                              <span className="agenda-time">
                                {new Intl.DateTimeFormat("es-CL", {
                                  timeZone: timezone,
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hourCycle: "h23",
                                }).format(new Date(a.startsAt))}{" "}
                                –{" "}
                                {new Intl.DateTimeFormat("es-CL", {
                                  timeZone: timezone,
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hourCycle: "h23",
                                }).format(new Date(a.endsAt))}
                              </span>
                              <strong>{displayName(a.patient.name)}</strong>
                              <span>{a.reason}</span>
                              <small>
                                {a.professional?.user.name ||
                                  "Sin profesional asignado"}
                              </small>
                              <StatusBadge
                                className="agenda-badge"
                                tone={
                                  a.status === "IN_PROGRESS"
                                    ? "warning"
                                    : a.status === "CONFIRMED"
                                      ? "info"
                                      : ["CANCELLED", "NO_SHOW"].includes(
                                            a.status,
                                          )
                                        ? "danger"
                                        : a.status === "SCHEDULED"
                                          ? "positive"
                                          : "neutral"
                                }
                              >
                                {appointmentStates[a.status]}
                              </StatusBadge>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
          {result.data.totalPages > 1 && (
            <div className="agenda-pagination">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>Página {page}</span>
              <button
                disabled={page >= result.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
      {editor && result.data && (
        <AppointmentEditor
          context={context}
          timezone={timezone}
          date={date}
          draft={draft}
          services={result.data.settings?.services || []}
          appointment={editor === "new" ? null : editor}
          professionals={result.data.professionals}
          onClose={close}
          onSaved={() => {
            close();
            setNotice("Cita guardada correctamente.");
            setRevision((r) => r + 1);
          }}
        />
      )}
    </section>
  );
}
function AppointmentEditor({
  context,
  timezone,
  date,
  appointment,
  professionals,
  services,
  draft,
  onClose,
  onSaved,
}: {
  context: WorkspaceContext;
  timezone: string;
  date: string;
  appointment: Appointment | null;
  professionals: Professional[];
  services: BookingSettings["services"];
  draft?: AppointmentDraft | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    pending = useRef<AbortController | null>(null),
    lock = useRef(false);
  const [patient, setPatient] = useState<PatientSummary | null>(null),
    [tutorId, setTutorId] = useState(appointment?.tutorId || "");
  const [professional, setProfessional] = useState(
      appointment?.professionalMembershipId || draft?.professionalId || "",
    ),
    [start, setStart] = useState(
      appointment
        ? localStamp(appointment.startsAt, timezone)
        : draft
          ? localStamp(draft.startsAt, timezone)
          : `${date}T09:00`,
    ),
    [duration, setDuration] = useState(
      appointment
        ? (Date.parse(appointment.endsAt) - Date.parse(appointment.startsAt)) /
            60000
        : services.find((s) => s.id === draft?.serviceId)?.durationMinutes ||
            30,
    ),
    [reason, setReason] = useState(appointment?.reason || ""),
    [status, setStatus] = useState<AppointmentStatus>(
      appointment?.status || "SCHEDULED",
    ),
    [cancellation, setCancellation] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [events, setEvents] = useState<AppointmentEvent[] | null>(null),
    [historyError, setHistoryError] = useState("");
  const [serviceId, setServiceId] = useState(
    appointment?.serviceId || draft?.serviceId || "",
  );
  const [openedAt] = useState(() => Date.now());
  const terminal =
    appointment?.status === "COMPLETED" ||
    appointment?.status === "CANCELLED" ||
    appointment?.status === "NO_SHOW" ||
    Boolean(appointment?.consultation);
  useEffect(() => {
    dialog.current?.showModal();
    return () => pending.current?.abort();
  }, []);
  const originalId = appointment?.id,
    originalPatientId = appointment?.patientId;
  const { clinicId, endSession } = context;
  useEffect(() => {
    if (!originalPatientId) return;
    const c = new AbortController();
    getRecord(clinicId, "pacientes", originalPatientId, c.signal)
      .then((p) => {
        if (!c.signal.aborted) setPatient(p as Patient);
      })
      .catch((e) => {
        if (!c.signal.aborted) {
          if (e instanceof AuthError && e.status === 401) endSession();
          else setError(appointmentError(e));
        }
      });
    return () => c.abort();
  }, [originalPatientId, clinicId, endSession]);
  async function history() {
    if (!originalId) return;
    const c = new AbortController();
    pending.current = c;
    setHistoryError("");
    try {
      const value = await getAppointmentHistory(
        context.clinicId,
        originalId,
        c.signal,
      );
      if (!c.signal.aborted) setEvents(value);
    } catch (e) {
      if (!c.signal.aborted) {
        if (e instanceof AuthError && e.status === 401) endSession();
        else setHistoryError(appointmentError(e));
      }
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || terminal) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const c = new AbortController();
    pending.current = c;
    try {
      const cancelling = status === "CANCELLED" && appointment;
      if (!patient && !appointment && !cancelling)
        throw new Error("Selecciona un paciente y un tutor responsable.");
      const startsAt = cancelling
        ? appointment.startsAt
        : appointmentInstant(start, timezone, appointment?.startsAt);
      await saveAppointment(
        context.clinicId,
        {
          ...(serviceId ? { serviceId } : {}),
          patientId: cancelling
            ? appointment.patientId
            : patient?.id || appointment!.patientId,
          tutorId: cancelling ? appointment.tutorId : tutorId,
          professionalMembershipId: cancelling
            ? appointment.professionalMembershipId
            : professional || null,
          startsAt,
          durationMinutes: cancelling
            ? (Date.parse(appointment.endsAt) -
                Date.parse(appointment.startsAt)) /
              60000
            : duration,
          reason: cancelling ? appointment.reason : reason,
          ...(appointment
            ? {
                version: appointment.version,
                status,
                cancellationReason: cancellation,
              }
            : {}),
        },
        appointment?.id,
        c.signal,
      );
      if (!c.signal.aborted) onSaved();
    } catch (e) {
      if (!c.signal.aborted) {
        if (e instanceof AuthError && e.status === 401) context.endSession();
        else setError(appointmentError(e));
      }
    } finally {
      if (!c.signal.aborted) setBusy(false);
      lock.current = false;
    }
  }
  const available: AppointmentStatus[] = !appointment
    ? ["SCHEDULED"]
    : appointment.status === "IN_PROGRESS"
      ? ["IN_PROGRESS", "COMPLETED", "CANCELLED"]
      : appointment.status === "ARRIVED"
        ? ["ARRIVED", "IN_PROGRESS", "CANCELLED"]
        : [
            "SCHEDULED",
            "CONFIRMED",
            "ARRIVED",
            "IN_PROGRESS",
            "CANCELLED",
            ...(Date.parse(appointment.startsAt) <= openedAt
              ? ["NO_SHOW" as const]
              : []),
          ];
  return (
    <dialog
      ref={dialog}
      className="agenda-dialog"
      aria-labelledby="appointment-title"
      aria-describedby="appointment-description"
      onCancel={(e) => {
        if (busy) e.preventDefault();
        else onClose();
      }}
    >
      <div className="agenda-dialog-header">
        <div>
          <span className="dashboard-eyebrow">{timezone}</span>
          <h2 id="appointment-title">
            {appointment ? "Detalle de cita" : "Nueva cita"}
          </h2>
        </div>
        <button aria-label="Cerrar cita" disabled={busy} onClick={onClose}>
          <X size={22} />
        </button>
      </div>
      <p className="agenda-dialog-intro" id="appointment-description">
        {appointment
          ? "Consulta los datos y la trazabilidad de esta atención."
          : "Vincula un paciente y su tutor para reservar una atención."}
      </p>
      <form onSubmit={submit} aria-busy={busy}>
        <fieldset disabled={busy || terminal}>
          <legend className="sr-only">Datos de la cita</legend>
          {!appointment ? (
            <PatientPicker
              context={context}
              selected={patient}
              onSelect={(p) => {
                setPatient(p);
                setTutorId("");
              }}
            />
          ) : (
            <p className="agenda-patient">
              <strong>{displayName(appointment.patient.name)}</strong>
              <br />
              Tutor registrado: {fullName(appointment.tutor)}
            </p>
          )}
          <label>
            Tutor responsable
            <select
              required
              value={tutorId}
              onChange={(e) => setTutorId(e.target.value)}
            >
              <option value="">Selecciona un tutor vinculado</option>
              {patient?.tutors.map((t) => (
                <option value={t.id} key={t.id}>
                  {fullName(t)}
                </option>
              ))}
              {appointment &&
                !patient?.tutors.some((t) => t.id === appointment.tutorId) && (
                  <option value={appointment.tutorId}>
                    {fullName(appointment.tutor)} (registrado)
                  </option>
                )}
            </select>
          </label>
          <div className="agenda-form-row">
            <label>
              Servicio de la cita
              <select
                value={serviceId}
                onChange={(e) => {
                  setServiceId(e.target.value);
                  const s = services.find((item) => item.id === e.target.value);
                  if (s) {
                    setDuration(s.durationMinutes);
                    if (
                      !s.professionals.some(
                        (p) => p.membershipId === professional,
                      )
                    )
                      setProfessional("");
                  }
                }}
              >
                <option value="">Sin servicio configurado</option>
                {services
                  .filter((s) => s.enabled || s.id === appointment?.serviceId)
                  .map((s) => (
                    <option value={s.id} key={s.id}>
                      {displayName(s.name)} · {s.durationMinutes} min
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Fecha y hora de inicio
              <input
                type="datetime-local"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label>
              Duración (minutos)
              <input
                type="number"
                required
                min={5}
                max={480}
                step={1}
                value={duration}
                disabled={!!serviceId}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </label>
          </div>
          <label>
            Profesional responsable
            <select
              value={professional}
              onChange={(e) => setProfessional(e.target.value)}
            >
              <option value="">Sin asignar</option>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {displayName(p.user.name)}
                </option>
              ))}
              {appointment?.professional &&
                !professionals.some(
                  (p) => p.id === appointment.professional!.id,
                ) && (
                  <option value={appointment.professional.id}>
                    {displayName(appointment.professional.user.name)} (no disponible)
                  </option>
                )}
            </select>
          </label>
          <p className="agenda-hint">
            Solo miembros activos habilitados. El control de solapamiento se
            aplica al asignar un profesional.
          </p>
          <label>
            Motivo
            <textarea
              required
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </label>
          {appointment && (
            <label>
              Estado de la cita
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
              >
                {(terminal ? [appointment.status] : available)
                  .filter(
                    (s) =>
                      context.access.permissions.includes(
                        "appointment:clinical",
                      ) ||
                      !["IN_PROGRESS", "COMPLETED"].includes(s) ||
                      s === appointment.status,
                  )
                  .map((s) => (
                    <option key={s} value={s}>
                      {appointmentStates[s]}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {status === "CANCELLED" && !terminal && (
            <label>
              Motivo de cancelación
              <textarea
                required
                maxLength={500}
                value={cancellation}
                onChange={(e) => setCancellation(e.target.value)}
              />
              <span className="agenda-hint">
                Se conservarán la cita y su historial. Los cambios de horario
                del formulario no se aplican al cancelar.
              </span>
            </label>
          )}
        </fieldset>
        {appointment?.consultation && (
          <p className="agenda-notice">
            Atención vinculada: el estado y profesional se gestionan desde la
            consulta clínica.
          </p>
        )}
        {appointment &&
          canReadClinical(context.access) &&
          (appointment.consultation || !terminal) && (
            <p className="agenda-notice">
              <Link
                href={
                  appointment.consultation
                    ? consultationPath(
                        context.clinicId,
                        appointment.consultation.id,
                      )
                    : `${consultationPath(context.clinicId)}/nueva?appointmentId=${appointment.id}`
                }
              >
                {appointment.consultation
                  ? "Abrir consulta clínica"
                  : "Iniciar consulta clínica"}
              </Link>
            </p>
          )}
        {terminal && !appointment?.consultation && (
          <p className="agenda-notice">
            {appointmentStates[appointment!.status]}. La cita y su historial se
            conservan y no admiten edición.
            {appointment?.cancellationReason &&
              ` Motivo: ${appointment.cancellationReason}`}
          </p>
        )}
        {error && (
          <div role="alert" className="auth-alert">
            {error}
            <button type="button" onClick={context.refresh}>
              Verificar mi acceso
            </button>
          </div>
        )}
        <div className="agenda-form-actions">
          <button type="button" disabled={busy} onClick={onClose}>
            Cerrar
          </button>
          {!terminal &&
            context.access.permissions.includes("appointment:write") && (
              <button className="agenda-primary" disabled={busy} type="submit">
                {busy
                  ? "Guardando…"
                  : status === "CANCELLED"
                    ? "Confirmar cancelación"
                    : appointment
                      ? "Guardar cambios"
                      : "Crear cita"}
              </button>
            )}
        </div>
      </form>
      {appointment && (
        <section className="agenda-history" aria-label="Historial de la cita">
          <h3>Historial de cambios</h3>
          <p>La cita conserva sus modificaciones, con autor y fecha.</p>
          <button type="button" disabled={busy} onClick={() => void history()}>
            Ver historial
          </button>
          {historyError && <p role="alert">{historyError}</p>}
          {events && (
            <ol>
              {events.map((e) => (
                <li key={e.id}>
                  <strong>
                    {typeof e.after.status === "string" &&
                    Object.hasOwn(appointmentStates, e.after.status)
                      ? appointmentStates[e.after.status as AppointmentStatus]
                      : "Cambio registrado"}
                  </strong>{" "}
                  · {displayName(e.actor.user.name)}
                  <br />
                  <time>
                    {new Intl.DateTimeFormat("es-CL", {
                      timeZone: timezone,
                      dateStyle: "short",
                      timeStyle: "short",
                    }).format(new Date(e.createdAt))}
                  </time>
                  <p>
                    {typeof e.after.startsAt === "string"
                      ? localStamp(e.after.startsAt, timezone).replace("T", " ")
                      : ""}{" "}
                    · {String(e.after.reason || "")}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </dialog>
  );
}
function PatientPicker({
  context,
  selected,
  onSelect,
}: {
  context: WorkspaceContext;
  selected: PatientSummary | null;
  onSelect: (patient: PatientSummary) => void;
}) {
  const [q, setQ] = useState(""),
    [page, setPage] = useState(1);
  const load = useCallback(
    (signal: AbortSignal) =>
      listRecords(
        context.clinicId,
        "pacientes",
        new URLSearchParams({
          q,
          page: String(page),
          status: "ACTIVE",
        }).toString(),
        signal,
      ),
    [context.clinicId, q, page],
  );
  const result = useAgendaLoad(`${q}:${page}`, load, context);
  return (
    <div className="agenda-patient-picker">
      <label>
        Buscar paciente
        <input
          value={q}
          maxLength={100}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Nombre, tutor o microchip"
        />
      </label>
      {selected && (
        <p role="status">
          Paciente seleccionado: <strong>{displayName(selected.name)}</strong>
        </p>
      )}
      {result.error ? (
        <p role="alert">{result.error}</p>
      ) : !result.data ? (
        <p role="status">Buscando pacientes…</p>
      ) : (
        <>
          <label>
            Paciente
            <select
              required
              value={selected?.id || ""}
              onChange={(e) => {
                const value = result.data!.items.find(
                  (p) => p.id === e.target.value,
                );
                if (value) onSelect(value as PatientSummary);
              }}
            >
              <option value="">Selecciona un paciente</option>
              {selected &&
                !result.data.items.some((p) => p.id === selected.id) && (
                  <option value={selected.id}>
                    {displayName(selected.name)} (seleccionado)
                  </option>
                )}
              {result.data.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {displayName((p as PatientSummary).name)}
                </option>
              ))}
            </select>
          </label>
          {result.data.total === 0 && (
            <p>No hay pacientes activos. Regístralos primero en Pacientes.</p>
          )}
          {result.data.totalPages > 1 && (
            <div className="agenda-pagination">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Pacientes anteriores
              </button>
              <span>
                {page} / {result.data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= result.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Más pacientes
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
