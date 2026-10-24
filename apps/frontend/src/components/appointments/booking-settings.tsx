"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CalendarDays, Clock3, Plus, Save, Trash2 } from "lucide-react";
import type { WorkspaceContext } from "@/components/workspace/workspace-shell";
import {
  privateBooking,
  bookingError,
  bookingTime,
  type BookingSettings,
  type BookingPolicy,
  type Opening,
  type BookingSlot,
} from "@/lib/booking";
import { localStamp, localToUtc } from "@/lib/appointment-time";
import styles from "./booking-workspace.module.css";
import { ServiceVisual } from "./service-visual";
export type AppointmentDraft = {
  serviceId: string;
  professionalId: string;
  startsAt: string;
};
export type BookingSettingsView = "availability" | "services" | "settings";
const weekdays = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];
function OpeningEditor({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: Opening[];
  onChange: (next: Opening[]) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <fieldset className={styles.openings} disabled={disabled}>
      <legend>{label}</legend>
      {value.map((row, index) => (
        <div className={styles.openingRow} key={index}>
          <label>
            Día
            <select
              value={row.weekday}
              onChange={(e) =>
                onChange(
                  value.map((r, i) =>
                    i === index ? { ...r, weekday: Number(e.target.value) } : r,
                  ),
                )
              }
            >
              {weekdays.map((day, i) => (
                <option value={i} key={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <label>
            Desde
            <input
              type="time"
              value={row.opens}
              required
              onChange={(e) =>
                onChange(
                  value.map((r, i) =>
                    i === index ? { ...r, opens: e.target.value } : r,
                  ),
                )
              }
            />
          </label>
          <label>
            Hasta
            <input
              type="time"
              value={row.closes}
              required
              onChange={(e) =>
                onChange(
                  value.map((r, i) =>
                    i === index ? { ...r, closes: e.target.value } : r,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            aria-label={`Quitar horario ${index + 1} de ${label}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
      {!value.length && (
        <p className={styles.help}>
          Sin horarios configurados: no se ofrecen cupos.
        </p>
      )}
      <button
        type="button"
        disabled={value.length >= 28}
        onClick={() =>
          onChange([...value, { weekday: 1, opens: "09:00", closes: "18:00" }])
        }
      >
        <Plus size={14} />
        Añadir franja
      </button>
    </fieldset>
  );
}
export function BookingSettingsPanel({
  context,
  view,
  onSlot,
}: {
  context: WorkspaceContext;
  view: BookingSettingsView;
  onSlot: (draft: AppointmentDraft) => void;
}) {
  const { clinicId, endSession } = context;
  const canManage = context.access.permissions.includes("clinic:manage");
  const canOwn =
    context.access.permissions.includes("consultation:write") &&
    context.access.permissions.includes("appointment:write");
  const [zone, setZone] = useState("America/Santiago");
  const [data, setData] = useState<BookingSettings | null>(null),
    [draft, setDraft] = useState<BookingPolicy | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  const [service, setService] = useState({
    id: "",
    version: 0,
    name: "",
    description: "",
    durationMinutes: 30,
    bufferMinutes: 0,
    resourceKey: "",
    enabled: false,
    professionalIds: [] as string[],
  });
  const [professional, setProfessional] = useState(""),
    [serviceId, setServiceId] = useState(""),
    [date, setDate] = useState(""),
    [slots, setSlots] = useState<{
      key: string;
      items?: BookingSlot[];
      error?: string;
    }>({ key: "" });
  const [block, setBlock] = useState({
    professionalId: "",
    resourceKey: "",
    startsAt: "",
    endsAt: "",
    reason: "",
    kind: "BLOCK" as BookingPolicy["blocks"][number]["kind"],
  });
  useEffect(() => {
    const abort = new AbortController();
    privateBooking<BookingSettings>(
      clinicId,
      "/settings",
      undefined,
      undefined,
      abort.signal,
    )
      .then((value) => {
        if (!abort.signal.aborted) {
          setData(value);
          setZone(value.clinic.timezone);
          setDraft(structuredClone(value.configuration));
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
  }, [clinicId, endSession, revision]);
  const key = `${serviceId}:${professional}:${date}:${revision}`;
  useEffect(() => {
    if (!serviceId || !professional || !date || view !== "availability") return;
    const abort = new AbortController(),
      query = new URLSearchParams({
        serviceId,
        professionalId: professional,
        date,
      });
    privateBooking<{ slots: BookingSlot[] }>(
      clinicId,
      `/availability?${query}`,
      undefined,
      undefined,
      abort.signal,
    )
      .then((value) => {
        if (!abort.signal.aborted) setSlots({ key, items: value.slots });
      })
      .catch((e) => {
        if (!abort.signal.aborted) setSlots({ key, error: bookingError(e) });
      });
    return () => abort.abort();
  }, [clinicId, serviceId, professional, date, view, key]);
  const timezone = data?.clinic.timezone || "America/Santiago";
  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    if (!data || !draft || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const value = await privateBooking<{ version: number }>(
        clinicId,
        "/settings",
        { version: data.version, configuration: draft, timezone: zone },
        "PATCH",
      );
      setData({
        ...data,
        configuration: structuredClone(draft),
        version: value.version,
      });
      setNotice("Configuración de agendamiento guardada.");
      if (zone !== data.clinic.timezone) context.refresh();
    } catch (e) {
      setError(bookingError(e));
    } finally {
      setBusy(false);
    }
  }
  async function saveService(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await privateBooking(
        clinicId,
        "/services",
        {
          ...service,
          id: service.id || undefined,
          ...(service.id ? { id: service.id } : {}),
          resourceKey: service.resourceKey.trim() || null,
        },
        "POST",
      );
      setNotice(
        "Servicio guardado. Sus citas anteriores conservan su horario y preparación.",
      );
      setService({
        id: "",
        version: 0,
        name: "",
        description: "",
        durationMinutes: 30,
        bufferMinutes: 0,
        resourceKey: "",
        enabled: false,
        professionalIds: [],
      });
      setRevision((n) => n + 1);
    } catch (e) {
      setError(bookingError(e));
    } finally {
      setBusy(false);
    }
  }
  async function saveOwn(event: FormEvent) {
    event.preventDefault();
    if (!data || !draft || busy) return;
    setBusy(true);
    setError("");
    try {
      const value = await privateBooking<{ version: number }>(
        clinicId,
        "/my-availability",
        {
          version: data.version,
          hours:
            draft.professionals.find(
              (p) => p.membershipId === context.access.membershipId,
            )?.hours || [],
        },
        "PATCH",
      );
      setData({ ...data, version: value.version });
      setNotice("Horario propio guardado.");
    } catch (e) {
      setError(bookingError(e));
    } finally {
      setBusy(false);
    }
  }
  function addBlock(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    try {
      const startsAt = localToUtc(block.startsAt, timezone),
        endsAt = localToUtc(block.endsAt, timezone);
      if (endsAt <= startsAt) throw new Error();
      setDraft({
        ...draft,
        blocks: [
          ...draft.blocks,
          {
            ...block,
            id: crypto.randomUUID(),
            professionalId: block.professionalId || null,
            resourceKey: block.resourceKey.trim().toLowerCase() || null,
            startsAt,
            endsAt,
          },
        ],
      });
      setBlock({
        professionalId: "",
        resourceKey: "",
        startsAt: "",
        endsAt: "",
        reason: "",
        kind: "BLOCK",
      });
      setNotice(
        "Bloqueo preparado. Pulsa Guardar horarios y bloqueos para aplicarlo.",
      );
      setError("");
    } catch {
      setError(
        "Revisa el inicio y término del bloqueo; las horas repetidas o inexistentes por cambio de horario no se aceptan.",
      );
    }
  }
  async function removeService() {
    if (
      !service.id ||
      busy ||
      !window.confirm(
        "¿Eliminar este servicio? Solo se permite si no tiene reservas ni citas. Si tiene historial, desactívalo.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await privateBooking(
        clinicId,
        `/services/${encodeURIComponent(service.id)}/remove`,
        { version: service.version },
      );
      setService({
        id: "",
        version: 0,
        name: "",
        description: "",
        durationMinutes: 30,
        bufferMinutes: 0,
        resourceKey: "",
        enabled: false,
        professionalIds: [],
      });
      setNotice("Servicio eliminado sin afectar historial.");
      setRevision((n) => n + 1);
    } catch (e) {
      setError(bookingError(e));
    } finally {
      setBusy(false);
    }
  }
  const current: { items?: BookingSlot[]; error?: string } =
    slots.key === key ? slots : {};
  return (
    <section
      className={styles.panel}
      aria-label={
        view === "services"
          ? "Servicios reservables"
          : view === "availability"
            ? "Disponibilidad profesional"
            : "Configuración de agendamiento"
      }
    >
      <header className={styles.sectionHeader}>
        <div>
          <span>AGENDAMIENTO</span>
          <h1>
            {view === "services"
              ? "Servicios y duración"
              : view === "availability"
                ? "Disponibilidad profesional"
                : "Configuración de reservas"}
          </h1>
          <p>
            {view === "services"
              ? "Atenciones reales, profesionales habilitados y tiempo suficiente para cada paciente."
              : view === "availability"
                ? "Consulta los cupos calculados por el servidor y organiza horarios y excepciones."
                : "Define cómo recibe y confirma las reservas tu clínica."}
          </p>
        </div>
        {data && (
          <Link
            href={`/reservar/${data.clinic.slug}`}
            target="_blank"
            rel="noreferrer"
          >
            Abrir portal público
            <CalendarDays size={16} />
          </Link>
        )}
      </header>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
          <button type="button" onClick={() => setRevision((n) => n + 1)}>
            Recargar
          </button>
        </p>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {data?.demo && (
        <p className={styles.projectNote}>
          Proyecto personal · Personal y reservas ficticios. Las credenciales de estos perfiles no están verificadas.
        </p>
      )}
      {!data || !draft ? (
        !error && <p role="status">Cargando configuración…</p>
      ) : (
        <>
          {!data.professionals.length && (
            <p className={styles.warning}>
              No hay profesionales médicos habilitados. Revisa credenciales y
              permisos en Personal y Accesos. Los perfiles ilustrativos de la
              landing no se pueden reservar.
            </p>
          )}
          {view === "services" && (
            <div className={styles.split}>
              <div className={styles.card}>
                <h2>Catálogo de servicios</h2>
                {!data.services.length && (
                  <p className={styles.help}>
                    Todavía no hay servicios. Crea el primero con su duración y
                    profesionales reales.
                  </p>
                )}
                {data.services.map((s) => (
                  <button
                    className={styles.serviceRow}
                    key={s.id}
                    aria-pressed={service.id === s.id}
                    onClick={() =>
                      setService({
                        id: s.id,
                        version: s.version,
                        name: s.name,
                        description: s.description,
                        durationMinutes: s.durationMinutes,
                        bufferMinutes: s.bufferMinutes,
                        resourceKey: s.resourceKey || "",
                        enabled: s.enabled,
                        professionalIds: s.professionals.map(
                          (p) => p.membershipId,
                        ),
                      })
                    }
                  >
                    <ServiceVisual name={s.name} className={styles.serviceIcon} />
                    <span>
                      <strong>{s.name}</strong>
                      <small>
                        {s.durationMinutes} min · preparación {s.bufferMinutes}{" "}
                        min · {s.professionals.length} profesionales
                      </small>
                    </span>
                    <span>{s.enabled ? "Habilitado" : "Deshabilitado"}</span>
                  </button>
                ))}
              </div>
              <form className={styles.card} onSubmit={saveService}>
                <h2>{service.id ? "Editar servicio" : "Nuevo servicio"}</h2>
                <fieldset disabled={!canManage || busy}>
                  <label>
                    Nombre del servicio
                    <input
                      value={service.name}
                      onChange={(e) =>
                        setService({ ...service, name: e.target.value })
                      }
                      required
                      maxLength={100}
                    />
                  </label>
                  <label>
                    Descripción pública
                    <textarea
                      value={service.description}
                      onChange={(e) =>
                        setService({ ...service, description: e.target.value })
                      }
                      maxLength={500}
                      rows={2}
                    />
                  </label>
                  <div className={styles.fields}>
                    <label>
                      Duración (minutos)
                      <input
                        type="number"
                        min={5}
                        max={480}
                        required
                        value={service.durationMinutes}
                        onChange={(e) =>
                          setService({
                            ...service,
                            durationMinutes: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Preparación posterior (minutos)
                      <input
                        type="number"
                        min={0}
                        max={120}
                        required
                        value={service.bufferMinutes}
                        onChange={(e) =>
                          setService({
                            ...service,
                            bufferMinutes: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Recurso compartido (opcional)
                    <input
                      value={service.resourceKey}
                      maxLength={80}
                      onChange={(e) =>
                        setService({ ...service, resourceKey: e.target.value })
                      }
                      placeholder="Por ejemplo: sala-consulta-1"
                    />
                  </label>
                  <p className={styles.help}>
                    Usa el mismo identificador en servicios que comparten una
                    sala o equipo exclusivo. Se evita su uso simultáneo incluso
                    entre profesionales distintos.
                  </p>
                  <fieldset className={styles.checkboxList}>
                    <legend>Profesionales que realizan el servicio</legend>
                    {data.professionals.map((p) => (
                      <label key={p.id}>
                        <input
                          type="checkbox"
                          checked={service.professionalIds.includes(p.id)}
                          onChange={(e) =>
                            setService({
                              ...service,
                              professionalIds: e.target.checked
                                ? [...service.professionalIds, p.id]
                                : service.professionalIds.filter(
                                    (id) => id !== p.id,
                                  ),
                            })
                          }
                        />
                        {p.name}
                      </label>
                    ))}
                  </fieldset>
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={service.enabled}
                      onChange={(e) =>
                        setService({ ...service, enabled: e.target.checked })
                      }
                    />
                    Habilitar servicio para reservas
                  </label>
                  <button className={styles.primary}>
                    <Save size={15} />
                    {busy ? "Guardando…" : "Guardar servicio"}
                  </button>
                  {service.id && canManage && (
                    <button type="button" onClick={() => void removeService()}>
                      <Trash2 size={15} />
                      Eliminar servicio sin historial
                    </button>
                  )}
                </fieldset>
                {!canManage && (
                  <p className={styles.help}>
                    La administración de servicios requiere permiso de gestión
                    de clínica.
                  </p>
                )}
              </form>
            </div>
          )}
          {view === "settings" && (
            <form onSubmit={saveSettings} className={styles.card}>
              <h2>Políticas de agendamiento</h2>
              <fieldset disabled={!canManage || busy}>
                <div className={styles.checks}>
                  {(
                    [
                      ["publicEnabled", "Habilitar reservas públicas"],
                      [
                        "autoConfirm",
                        "Confirmar automáticamente cuando el cupo esté disponible",
                      ],
                      [
                        "autoAssign",
                        "Permitir selección automática del profesional",
                      ],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className={styles.check}>
                      <input
                        type="checkbox"
                        checked={draft[key]}
                        onChange={(e) =>
                          setDraft({ ...draft, [key]: e.target.checked })
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>
                <p className={styles.help}>
                  Sin confirmación automática, la solicitud ocupa el cupo y
                  queda pendiente de revisión por el equipo. El portal no
                  modifica ni busca fichas clínicas.
                </p>
                <div className={styles.fields}>
                  {(
                    [
                      [
                        "minNoticeMinutes",
                        "Anticipación mínima (minutos)",
                        0,
                        43200,
                      ],
                      ["maxAdvanceDays", "Días máximos reservables", 1, 180],
                      [
                        "stepMinutes",
                        "Intervalo entre inicios (minutos)",
                        5,
                        60,
                      ],
                      [
                        "cancellationNoticeMinutes",
                        "Anticipación para cambios del cliente (minutos)",
                        0,
                        43200,
                      ],
                    ] as const
                  ).map(([key, label, min, max]) => (
                    <label key={key}>
                      {label}
                      <input
                        type="number"
                        min={min}
                        max={max}
                        required
                        value={draft[key]}
                        onChange={(e) =>
                          setDraft({ ...draft, [key]: Number(e.target.value) })
                        }
                      />
                    </label>
                  ))}
                </div>
                <label>
                  Información y condiciones públicas
                  <textarea
                    value={draft.message}
                    onChange={(e) =>
                      setDraft({ ...draft, message: e.target.value })
                    }
                    maxLength={1000}
                    rows={3}
                  />
                </label>
                <p className={styles.help}>
                  Zona horaria actual: {timezone}. Los instantes se conservan en
                  UTC. Las horas de inicio repetidas por cambios de horario se
                  identifican con su desplazamiento UTC en el portal.
                </p>
                <label>
                  Zona horaria de la clínica
                  <input
                    list="booking-timezones"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    required
                    maxLength={100}
                  />
                  <datalist id="booking-timezones">
                    <option value="America/Santiago" />
                    <option value="America/Punta_Arenas" />
                    <option value="Pacific/Easter" />
                  </datalist>
                </label>
                <button className={styles.primary}>
                  <Save size={15} />
                  {busy ? "Guardando…" : "Guardar configuración"}
                </button>
              </fieldset>
              {!canManage && (
                <p>
                  Solo un usuario con permiso de gestión de clínica puede
                  cambiar estas políticas.
                </p>
              )}
            </form>
          )}
          {view === "availability" && (
            <>
              <div className={styles.card}>
                <h2>
                  <Clock3 size={18} />
                  Cupos disponibles
                </h2>
                <div className={styles.fields}>
                  <label>
                    Servicio
                    <select
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                    >
                      <option value="">Selecciona servicio</option>
                      {data.services
                        .filter((s) => s.enabled)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Profesional
                    <select
                      value={professional}
                      onChange={(e) => setProfessional(e.target.value)}
                    >
                      <option value="">Selecciona profesional</option>
                      {data.professionals
                        .filter(
                          (p) =>
                            !serviceId ||
                            data.services
                              .find((s) => s.id === serviceId)
                              ?.professionals.some(
                                (m) => m.membershipId === p.id,
                              ),
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Fecha
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      min={localStamp(new Date(), timezone).slice(0, 10)}
                    />
                  </label>
                </div>
                {serviceId &&
                  professional &&
                  date &&
                  (current.error ? (
                    <p role="alert">{current.error}</p>
                  ) : !current.items ? (
                    <p role="status">Calculando disponibilidad…</p>
                  ) : (
                    <div className={styles.slotGrid}>
                      {!current.items.length && (
                        <p>
                          No hay cupos. Revisa los horarios de clínica y
                          profesional, los bloqueos y las citas existentes.
                        </p>
                      )}
                      {current.items.map((s) => (
                        <button
                          type="button"
                          key={`${s.professionalId}:${s.startsAt}`}
                          disabled={
                            !context.access.permissions.includes(
                              "appointment:write",
                            )
                          }
                          onClick={() =>
                            onSlot({
                              serviceId,
                              professionalId: s.professionalId,
                              startsAt: s.startsAt,
                            })
                          }
                        >
                          {bookingTime(s.startsAt, timezone)}
                          <Plus size={14} />
                        </button>
                      ))}
                    </div>
                  ))}
                <p className={styles.help}>
                  Selecciona una franja para abrir una cita privada con su
                  servicio, hora y profesional preseleccionados.
                </p>
              </div>
              <form onSubmit={saveSettings} className={styles.card}>
                <h2>Horarios de atención</h2>
                <fieldset disabled={!canManage || busy}>
                  <OpeningEditor
                    label="Horario de la clínica"
                    value={draft.hours}
                    onChange={(hours) => setDraft({ ...draft, hours })}
                  />
                  <div className={styles.professionalSchedules}>
                    {data.professionals.map((p) => (
                      <OpeningEditor
                        key={p.id}
                        label={`Horario de ${p.name}`}
                        value={
                          draft.professionals.find(
                            (r) => r.membershipId === p.id,
                          )?.hours || []
                        }
                        onChange={(hours) =>
                          setDraft({
                            ...draft,
                            professionals: [
                              ...draft.professionals.filter(
                                (r) => r.membershipId !== p.id,
                              ),
                              { membershipId: p.id, hours },
                            ],
                          })
                        }
                      />
                    ))}
                  </div>
                  <h3>Bloqueos y excepciones guardados</h3>
                  {!draft.blocks.length && (
                    <p className={styles.help}>
                      No hay bloqueos. Los días sin horario laboral ya están
                      cerrados.
                    </p>
                  )}
                  {draft.blocks.map((b) => (
                    <div className={styles.blockRow} key={b.id}>
                      <span>
                        <strong>{b.reason}</strong>
                        <small>
                          {localStamp(b.startsAt, timezone).replace("T", " ")} —{" "}
                          {localStamp(b.endsAt, timezone).replace("T", " ")} ·{" "}
                          {data.professionals.find(
                            (p) => p.id === b.professionalId,
                          )?.name ||
                            b.resourceKey ||
                            "Toda la clínica"}
                        </small>
                      </span>
                      <button
                        type="button"
                        aria-label={`Quitar bloqueo ${b.reason}`}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            blocks: draft.blocks.filter((r) => r.id !== b.id),
                          })
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  <button className={styles.primary}>
                    <Save size={15} />
                    {busy ? "Guardando…" : "Guardar horarios y bloqueos"}
                  </button>
                </fieldset>
              </form>
              {!canManage && canOwn && (
                <form onSubmit={saveOwn} className={styles.card}>
                  <h2>Mi disponibilidad profesional</h2>
                  <p className={styles.help}>
                    Puedes modificar tus propias franjas. Los horarios
                    generales, servicios y bloqueos los administra la clínica.
                  </p>
                  <OpeningEditor
                    disabled={busy}
                    label="Mi horario"
                    value={
                      draft.professionals.find(
                        (p) => p.membershipId === context.access.membershipId,
                      )?.hours || []
                    }
                    onChange={(hours) =>
                      setDraft({
                        ...draft,
                        professionals: [
                          ...draft.professionals.filter(
                            (p) =>
                              p.membershipId !== context.access.membershipId,
                          ),
                          { membershipId: context.access.membershipId, hours },
                        ],
                      })
                    }
                  />
                  <button className={styles.primary} disabled={busy}>
                    Guardar mi disponibilidad
                  </button>
                </form>
              )}
              {canManage && (
                <form onSubmit={addBlock} className={styles.card}>
                  <h2>Añadir bloqueo o ausencia</h2>
                  <p className={styles.help}>
                    Los horarios se interpretan en {timezone}. El bloqueo impide
                    nuevas reservas; no cancela citas existentes.
                  </p>
                  <fieldset disabled={busy}>
                    <div className={styles.fields}>
                      <label>
                        Tipo
                        <select
                          value={block.kind}
                          onChange={(e) =>
                            setBlock({
                              ...block,
                              kind: e.target.value as typeof block.kind,
                            })
                          }
                        >
                          <option value="BLOCK">Bloqueo administrativo</option>
                          <option value="HOLIDAY">Feriado o cierre</option>
                          <option value="VACATION">Vacaciones</option>
                          <option value="ABSENCE">Licencia o ausencia</option>
                        </select>
                      </label>
                      <label>
                        Profesional
                        <select
                          value={block.professionalId}
                          onChange={(e) =>
                            setBlock({
                              ...block,
                              professionalId: e.target.value,
                            })
                          }
                        >
                          <option value="">Toda la clínica o recurso</option>
                          {data.professionals.map((p) => (
                            <option value={p.id} key={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Desde
                        <input
                          type="datetime-local"
                          required
                          value={block.startsAt}
                          onChange={(e) =>
                            setBlock({ ...block, startsAt: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Hasta
                        <input
                          type="datetime-local"
                          required
                          value={block.endsAt}
                          onChange={(e) =>
                            setBlock({ ...block, endsAt: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Recurso compartido (opcional)
                        <input
                          maxLength={80}
                          value={block.resourceKey}
                          onChange={(e) =>
                            setBlock({ ...block, resourceKey: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Motivo
                        <input
                          maxLength={300}
                          required
                          value={block.reason}
                          onChange={(e) =>
                            setBlock({ ...block, reason: e.target.value })
                          }
                        />
                      </label>
                    </div>
                    <button>
                      <Plus size={15} />
                      Preparar bloqueo
                    </button>
                  </fieldset>
                </form>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
