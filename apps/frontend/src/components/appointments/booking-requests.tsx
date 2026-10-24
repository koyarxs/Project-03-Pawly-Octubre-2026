"use client";
import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Check, History, Link2, X } from "lucide-react";
import type { WorkspaceContext } from "@/components/workspace/workspace-shell";
import {
  privateBooking,
  bookingError,
  bookingStates,
  bookingDate,
  bookingTime,
  type BookingIntake,
  type BookingSlot,
} from "@/lib/booking";
import { calendarRange, localStamp, shiftDate } from "@/lib/appointment-time";
import {
  listRecords,
  getRecord,
  fullName,
  type Patient,
  type PatientSummary,
} from "@/lib/clinical";
import styles from "./booking-workspace.module.css";
type HistoryItem = {
  action: string;
  snapshot: { startsAt: string; status: string };
  createdAt: string;
  actor: { user: { name: string } } | null;
};
export function BookingRequestsPanel({
  context,
  initialDate,
  initialStatus,
}: {
  context: WorkspaceContext;
  initialDate?: string;
  initialStatus?: string;
}) {
  const { clinicId, endSession } = context;
  const timezone =
    context.session.memberships.find((m) => m.clinic.id === clinicId)?.clinic
      .timezone || "America/Santiago";
  const [date, setDate] = useState(
      () => initialDate || localStamp(new Date(), timezone).slice(0, 10),
    ),
    [status, setStatus] = useState(initialStatus ?? "PENDING"),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0);
  const [data, setData] = useState<{
      key: string;
      items: BookingIntake[];
      totalPages: number;
      total: number;
    } | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [edit, setEdit] = useState<{
      row: BookingIntake;
      action: string;
    } | null>(null),
    [history, setHistory] = useState<{
      id: string;
      items: HistoryItem[];
    } | null>(null);
  const key = `${date}:${status}:${page}:${revision}`;
  const from = calendarRange(date, false, timezone).from,
    to = calendarRange(shiftDate(date, 31), false, timezone).from;
  useEffect(() => {
    const abort = new AbortController(),
      query = new URLSearchParams({
        from,
        to,
        page: String(page),
        ...(status ? { status } : {}),
      });
    privateBooking<{
      items: BookingIntake[];
      totalPages: number;
      total: number;
    }>(clinicId, `/requests?${query}`, undefined, undefined, abort.signal)
      .then((result) => {
        if (!abort.signal.aborted) {
          setData({ ...result, key });
          setError("");
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) {
          if (e.status === 401) endSession();
          else setError(bookingError(e));
        }
      });
    return () => abort.abort();
  }, [clinicId, from, to, page, status, key, endSession]);
  async function showHistory(row: BookingIntake) {
    try {
      const items = await privateBooking<HistoryItem[]>(
        clinicId,
        `/requests/${row.id}/history`,
      );
      setHistory({ id: row.id, items });
      setError("");
    } catch (e) {
      setError(bookingError(e));
    }
  }
  const current = data?.key === key ? data : null;
  return (
    <section className={styles.panel} aria-label="Solicitudes de agendamiento">
      <header className={styles.sectionHeader}>
        <div>
          <span>DEL PORTAL A LA CLÍNICA</span>
          <h1>Solicitudes y reservas públicas</h1>
          <p>
            Revisa cada solicitud, confirma su horario y vincula un paciente
            existente después de verificar su identidad.
          </p>
        </div>
        <button onClick={() => setRevision((n) => n + 1)}>
          Actualizar solicitudes
        </button>
      </header>
      <div className={styles.filterRow}>
        <label>
          Desde
          <input
            type="date"
            value={date}
            onChange={(e) => {
              if (e.target.value) {
                setDate(e.target.value);
                setPage(1);
              }
            }}
          />
        </label>
        <label>
          Estado de solicitud
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos los estados</option>
            {Object.entries(bookingStates).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p className={styles.help}>
          Se consultan 31 días desde la fecha elegida · {timezone}.
        </p>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {!current ? (
        !error && <p role="status">Cargando solicitudes…</p>
      ) : (
        <>
          <p className={styles.help}>
            {current.total} solicitudes encontradas.
          </p>
          {!current.items.length && (
            <div className={styles.empty}>
              <CalendarDays size={28} />
              <h2>No hay solicitudes con estos filtros.</h2>
              <p>
                Las reservas del portal aparecerán aquí. No se crean tutores ni
                pacientes automáticamente.
              </p>
            </div>
          )}
          <div className={styles.requestList}>
            {current.items.map((row) => (
              <article key={row.id} className={styles.request}>
                <div>
                  <span className={styles.status}>
                    {bookingStates[row.status] || row.status}
                  </span>
                  <h2>
                    {row.petName} · {row.service.name}
                  </h2>
                  <p>
                    {bookingDate(row.startsAt, timezone)} ·{" "}
                    <strong>{bookingTime(row.startsAt, timezone)}</strong>
                    <br />
                    {row.professional.user.name}
                  </p>
                  <p>
                    Tutor: {row.ownerName}
                    <br />
                    {row.email} · {row.phone}
                  </p>
                  <p>{row.reason}</p>
                </div>
                <div className={styles.requestActions}>
                  {context.access.permissions.includes("appointment:write") &&
                    ["PENDING", "CONFIRMED"].includes(row.status) && (
                      <>
                        {row.status === "PENDING" && (
                          <button
                            onClick={() => setEdit({ row, action: "CONFIRM" })}
                          >
                            <Check size={14} />
                            Confirmar
                          </button>
                        )}
                        <button
                          onClick={() => setEdit({ row, action: "RESCHEDULE" })}
                        >
                          Reprogramar
                        </button>
                        {context.access.permissions.includes(
                          "patient:read",
                        ) && (
                          <button
                            onClick={() =>
                              setEdit({ row, action: "LINK_PATIENT" })
                            }
                          >
                            <Link2 size={14} />
                            Vincular paciente
                          </button>
                        )}
                        <button
                          onClick={() => setEdit({ row, action: "CANCEL" })}
                        >
                          <X size={14} />
                          Cancelar
                        </button>
                        {row.status === "PENDING" && (
                          <button
                            onClick={() => setEdit({ row, action: "REJECT" })}
                          >
                            Rechazar
                          </button>
                        )}
                      </>
                    )}
                  <button onClick={() => void showHistory(row)}>
                    <History size={14} />
                    Historial
                  </button>
                </div>
                {row.additionalInfo && (
                  <p className={styles.requestDetails}>{row.additionalInfo}</p>
                )}
                {edit?.row.id === row.id && (
                  <BookingRequestEditor
                    key={`${row.id}:${edit.action}:${row.version}`}
                    context={context}
                    row={row}
                    action={edit.action}
                    timezone={timezone}
                    onClose={() => setEdit(null)}
                    onSaved={() => {
                      setEdit(null);
                      setHistory(null);
                      setNotice("Reserva actualizada correctamente.");
                      setRevision((n) => n + 1);
                    }}
                  />
                )}
                {history?.id === row.id && (
                  <div className={styles.requestDetails}>
                    <h3>Historial de la reserva</h3>
                    <ul className={styles.historyList}>
                      {history.items.map((e, i) => (
                        <li key={`${e.createdAt}:${i}`}>
                          <strong>{e.action}</strong> ·{" "}
                          {bookingStates[e.snapshot.status] ||
                            e.snapshot.status}
                          <small>
                            {bookingDate(e.createdAt, timezone)} ·{" "}
                            {bookingTime(e.createdAt, timezone)} ·{" "}
                            {e.actor?.user.name || "Portal público"}
                          </small>
                        </li>
                      ))}
                    </ul>
                    <button onClick={() => setHistory(null)}>
                      Cerrar historial
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
          {current.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                disabled={page === 1}
                onClick={() => setPage((n) => n - 1)}
              >
                Anteriores
              </button>
              <span>
                {page} / {current.totalPages}
              </span>
              <button
                disabled={page >= current.totalPages}
                onClick={() => setPage((n) => n + 1)}
              >
                Siguientes
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
function BookingRequestEditor({
  context,
  row,
  action,
  timezone,
  onClose,
  onSaved,
}: {
  context: WorkspaceContext;
  row: BookingIntake;
  action: string;
  timezone: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState(""),
    [date, setDate] = useState(localStamp(row.startsAt, timezone).slice(0, 10)),
    [startsAt, setStartsAt] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [search, setSearch] = useState(""),
    [patients, setPatients] = useState<PatientSummary[]>([]),
    [patientId, setPatientId] = useState(""),
    [patient, setPatient] = useState<Patient | null>(null),
    [tutorId, setTutorId] = useState("");
  const [slots, setSlots] = useState<{
    key: string;
    items: BookingSlot[];
  } | null>(null);
  const { clinicId } = context;
  useEffect(() => {
    if (action !== "LINK_PATIENT") return;
    const abort = new AbortController(),
      timer = setTimeout(() => {
        listRecords(
          clinicId,
          "pacientes",
          new URLSearchParams({
            q: search,
            status: "ACTIVE",
            page: "1",
          }).toString(),
          abort.signal,
        )
          .then((value) => {
            if (!abort.signal.aborted)
              setPatients(value.items as PatientSummary[]);
          })
          .catch((e) => {
            if (!abort.signal.aborted) setError(bookingError(e));
          });
      }, 250);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [clinicId, search, action]);
  useEffect(() => {
    if (!patientId) return;
    const abort = new AbortController();
    getRecord(clinicId, "pacientes", patientId, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) setPatient(value as Patient);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(bookingError(e));
      });
    return () => abort.abort();
  }, [clinicId, patientId]);
  useEffect(() => {
    if (action !== "RESCHEDULE" || !date) return;
    const abort = new AbortController(),
      q = new URLSearchParams({
        serviceId: row.serviceId,
        professionalId: row.professionalMembershipId,
        date,
      });
    privateBooking<{ slots: BookingSlot[] }>(
      clinicId,
      `/availability?${q}`,
      undefined,
      undefined,
      abort.signal,
    )
      .then((value) => {
        if (!abort.signal.aborted) setSlots({ key: date, items: value.slots });
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(bookingError(e));
      });
    return () => abort.abort();
  }, [clinicId, row.serviceId, row.professionalMembershipId, date, action]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await privateBooking(
        clinicId,
        `/requests/${row.id}`,
        {
          action,
          version: row.version,
          ...(["CANCEL", "REJECT"].includes(action) ? { reason } : {}),
          ...(action === "RESCHEDULE" ? { startsAt } : {}),
          ...(action === "LINK_PATIENT" ? { patientId, tutorId } : {}),
        },
        "PATCH",
      );
      onSaved();
    } catch (e) {
      setError(bookingError(e));
    } finally {
      setBusy(false);
    }
  }
  const titles: Record<string, string> = {
    CONFIRM: "Confirmar la reserva",
    CANCEL: "Cancelar con motivo",
    REJECT: "Rechazar la solicitud",
    RESCHEDULE: "Elegir otro horario",
    LINK_PATIENT: "Vincular registros existentes",
  };
  return (
    <div className={styles.requestEditor}>
      <form onSubmit={submit}>
        <h3>{titles[action]}</h3>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <fieldset disabled={busy}>
          {action === "CONFIRM" && (
            <p>
              Se confirmará el horario de la reserva. Esta acción no crea ni
              identifica pacientes automáticamente.
            </p>
          )}
          {["CANCEL", "REJECT"].includes(action) && (
            <label>
              Motivo
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                maxLength={500}
              />
            </label>
          )}
          {action === "RESCHEDULE" && (
            <>
              <label>
                Nueva fecha
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setStartsAt("");
                  }}
                  required
                />
              </label>
              {slots?.key !== date ? (
                <p role="status">Consultando disponibilidad…</p>
              ) : (
                <label>
                  Nuevo horario
                  <select
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  >
                    <option value="">Selecciona un cupo disponible</option>
                    {slots.items.map((s) => (
                      <option value={s.startsAt} key={s.startsAt}>
                        {bookingTime(s.startsAt, timezone)}
                      </option>
                    ))}
                  </select>
                  {!slots.items.length && <p>No hay cupos para esta fecha.</p>}
                </label>
              )}
            </>
          )}
          {action === "LINK_PATIENT" && (
            <>
              <p className={styles.help}>
                Verifica la identidad con el tutor antes de vincular. Si es un
                paciente nuevo, regístralo primero desde Tutores y Pacientes.
              </p>
              <label>
                Buscar paciente existente
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  maxLength={100}
                  placeholder="Nombre o tutor"
                />
              </label>
              <label>
                Paciente de la reserva
                <select
                  required
                  value={patientId}
                  onChange={(e) => {
                    setPatientId(e.target.value);
                    setPatient(null);
                    setTutorId("");
                  }}
                >
                  <option value="">Selecciona paciente</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tutor vinculado
                <select
                  required
                  value={tutorId}
                  onChange={(e) => setTutorId(e.target.value)}
                >
                  <option value="">Selecciona tutor verificado</option>
                  {patient?.tutors.map((t) => (
                    <option key={t.id} value={t.id}>
                      {fullName(t)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.check}>
                <input type="checkbox" required />
                Verifiqué que estos registros corresponden al tutor y mascota de
                la reserva.
              </label>
            </>
          )}
          <div className={styles.inlineActions}>
            <button type="button" onClick={onClose}>
              Volver
            </button>
            <button className={styles.primary}>
              {busy ? "Guardando…" : "Aplicar cambio"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
