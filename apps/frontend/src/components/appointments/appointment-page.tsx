"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
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
} from "@/lib/appointment-time";
import "./appointments.css";

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
        <Agenda key={`${clinicId}:${context.revision}`} context={context} />
      )}
    </WorkspaceShell>
  );
}
function Agenda({ context }: { context: WorkspaceContext }) {
  const clinicId = context.clinicId;
  const timezone =
    context.session.memberships.find((m) => m.clinic.id === context.clinicId)!
      .clinic.timezone || "America/Santiago";
  const [date, setDate] = useState(() =>
    localStamp(new Date(), timezone).slice(0, 10),
  );
  const [weekly, setWeekly] = useState(true),
    [status, setStatus] = useState(""),
    [professional, setProfessional] = useState(""),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<Appointment | "new" | null>(null),
    [notice, setNotice] = useState("");
  const trigger = useRef<HTMLButtonElement | null>(null);
  const range = calendarRange(date, weekly, timezone);
  const query = `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}&page=${page}${status ? `&status=${encodeURIComponent(status)}` : ""}${professional ? `&professionalMembershipId=${encodeURIComponent(professional)}` : ""}`;
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [appointments, professionals] = await Promise.all([
        getAppointments(clinicId, query, signal),
        getProfessionals(clinicId, signal),
      ]);
      return { appointments, professionals };
    },
    [clinicId, query],
  );
  const result = useAgendaLoad(`${query}:${revision}`, load, context);
  const days = Array.from({ length: weekly ? 7 : 1 }, (_, i) =>
    shiftDate(range.start, i),
  );
  function open(value: Appointment | "new", button: HTMLButtonElement) {
    trigger.current = button;
    setEditor(value);
  }
  function close() {
    setEditor(null);
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
      <header className="agenda-heading">
        <div>
          <span className="dashboard-eyebrow">PLANIFICA LA ATENCIÓN</span>
          <h1>Agenda veterinaria</h1>
          <p>Las citas de tu equipo, en un mismo lugar.</p>
        </div>
        <button
          className="agenda-primary"
          disabled={!result.data}
          onClick={(e) => open("new", e.currentTarget)}
        >
          <Plus size={18} />
          Nueva cita
        </button>
      </header>
      <div className="agenda-toolbar">
        <div className="agenda-date-nav">
          <button
            aria-label="Periodo anterior"
            onClick={() => changeDate(shiftDate(date, weekly ? -7 : -1))}
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
            onClick={() => changeDate(shiftDate(date, weekly ? 7 : 1))}
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
            aria-pressed={!weekly}
            onClick={() => {
              setWeekly(false);
              setPage(1);
            }}
          >
            Día
          </button>
          <button
            aria-pressed={weekly}
            onClick={() => {
              setWeekly(true);
              setPage(1);
            }}
          >
            Semana
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
                {p.user.name}
              </option>
            ))}
          </select>
        </label>
        <span className="agenda-timezone">
          Horario de la clínica · {timezone}
        </span>
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
        <div className="agenda-empty" role="status">
          Cargando agenda…
        </div>
      ) : (
        <>
          <p className="agenda-count" aria-live="polite">
            {result.data.appointments.total} citas en el periodo
            {result.data.appointments.totalPages > 1
              ? ` · página ${page} de ${result.data.appointments.totalPages}`
              : ""}
          </p>
          {result.data.appointments.total === 0 && (
            <div className="agenda-empty">
              <CalendarDays size={30} />
              <h2>Un espacio para las próximas atenciones.</h2>
              <p>
                No hay citas con estos filtros. Crea una cita para un paciente
                registrado.
              </p>
            </div>
          )}
          <div
            className={`agenda-calendar ${weekly ? "agenda-week" : "agenda-day"}`}
          >
            {days.map((day) => {
              const events = result.data!.appointments.items.filter(
                (a) =>
                  localStamp(a.startsAt, timezone).slice(0, 10) <= day &&
                  localStamp(
                    new Date(Date.parse(a.endsAt) - 1),
                    timezone,
                  ).slice(0, 10) >= day,
              );
              return (
                <section
                  className="agenda-column"
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
                  </h2>
                  <div className="agenda-events">
                    {events.length === 0 ? (
                      <p className="agenda-no-events">Sin citas</p>
                    ) : (
                      events.map((a) => (
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
                          <strong>{a.patient.name}</strong>
                          <span>{a.reason}</span>
                          <small>
                            {a.professional?.user.name ||
                              "Sin profesional asignado"}
                          </small>
                          <span className="agenda-badge">
                            {appointmentStates[a.status]}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          {result.data.appointments.totalPages > 1 && (
            <div className="agenda-pagination">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>Página {page}</span>
              <button
                disabled={page >= result.data.appointments.totalPages}
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
  onClose,
  onSaved,
}: {
  context: WorkspaceContext;
  timezone: string;
  date: string;
  appointment: Appointment | null;
  professionals: Professional[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    pending = useRef<AbortController | null>(null),
    lock = useRef(false);
  const [patient, setPatient] = useState<PatientSummary | null>(null),
    [tutorId, setTutorId] = useState(appointment?.tutorId || "");
  const [professional, setProfessional] = useState(
      appointment?.professionalMembershipId || "",
    ),
    [start, setStart] = useState(
      appointment
        ? localStamp(appointment.startsAt, timezone)
        : `${date}T09:00`,
    ),
    [duration, setDuration] = useState(
      appointment
        ? (Date.parse(appointment.endsAt) - Date.parse(appointment.startsAt)) /
            60000
        : 30,
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
  const terminal =
    appointment?.status === "COMPLETED" || appointment?.status === "CANCELLED";
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
      if (!patient && !cancelling)
        throw new Error("Selecciona un paciente y un tutor responsable.");
      const startsAt = cancelling
        ? appointment.startsAt
        : appointmentInstant(start, timezone, appointment?.startsAt);
      await saveAppointment(
        context.clinicId,
        {
          patientId: cancelling ? appointment.patientId : patient!.id,
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
      : ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "CANCELLED"];
  return (
    <dialog
      ref={dialog}
      className="agenda-dialog"
      aria-labelledby="appointment-title"
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
      <form onSubmit={submit}>
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
              <strong>{appointment.patient.name}</strong>
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
                  {p.user.name}
                </option>
              ))}
              {appointment?.professional &&
                !professionals.some(
                  (p) => p.id === appointment.professional!.id,
                ) && (
                  <option value={appointment.professional.id}>
                    {appointment.professional.user.name} (no disponible)
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
                      context.access.role !== "RECEPTIONIST" ||
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
        {terminal && (
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
          {!terminal && (
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
                  · {e.actor.user.name}
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
          Paciente seleccionado: <strong>{selected.name}</strong>
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
                    {selected.name} (seleccionado)
                  </option>
                )}
              {result.data.items.map((p) => (
                <option key={p.id} value={p.id}>
                  {(p as PatientSummary).name}
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
