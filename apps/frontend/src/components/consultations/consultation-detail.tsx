"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { AuthError } from "@/lib/auth";
import { getProfessionals } from "@/lib/appointments";
import {
  amendConsultation,
  clinicalLabels,
  clinicalTextFields,
  consultationError,
  consultationPath,
  consultationStates,
  getAmendments,
  getClinicalEvents,
  getConsultation,
  type Consultation,
} from "@/lib/consultations";
import type { WorkspaceContext } from "@/components/workspace/workspace-shell";
import { ConsultationForm } from "./consultation-form";
import { useClinicalResource } from "./use-clinical-resource";
import {
  LoadingState,
  PageHeader,
  StatusBadge,
} from "@/components/ui/workspace-ui";

export function ConsultationDetail({
  context,
  id,
}: {
  context: WorkspaceContext;
  id: string;
}) {
  const [editing, setEditing] = useState(false),
    [revision, setRevision] = useState(0),
    [auditRevision, setAuditRevision] = useState(0);
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [record, professionals] = await Promise.all([
        getConsultation(context.clinicId, id, signal),
        getProfessionals(context.clinicId, signal),
      ]);
      return { record, professionals };
    },
    [context.clinicId, id],
  );
  const result = useClinicalResource(`${id}:${revision}`, load, context);
  const timezone =
    context.session.memberships.find((m) => m.clinic.id === context.clinicId)!
      .clinic.timezone || "America/Santiago";
  const date = (s: string) =>
    new Intl.DateTimeFormat("es-CL", {
      timeZone: timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(s));
  if (result.error)
    return (
      <div role="alert" className="medical-empty">
        <h1>No pudimos abrir la consulta.</h1>
        <p>{result.error}</p>
        <button onClick={result.retry}>Reintentar</button>
        <button onClick={context.refresh}>Verificar mi acceso</button>
      </div>
    );
  if (!result.data) return <LoadingState label="Cargando consulta…" />;
  const { record, professionals } = result.data;
  if (editing && record.status === "DRAFT")
    return (
      <ConsultationForm
        key={record.version}
        context={context}
        initial={record}
        professionals={professionals}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          setRevision((v) => v + 1);
        }}
      />
    );
  return (
    <article className="medical-detail">
      <PageHeader
        eyebrow="ATENCIÓN VETERINARIA"
        title={record.patient.name}
        description={`${date(record.attendedAt)} · ${timezone}`}
        actions={
          <div className="medical-actions">
            <StatusBadge
              tone={record.status === "DRAFT" ? "warning" : "positive"}
            >
              {consultationStates[record.status]}
            </StatusBadge>
            <Link href={consultationPath(context.clinicId)}>
              Volver a consultas
            </Link>
            {record.status === "DRAFT" &&
              context.access.permissions.includes("consultation:write") && (
                <button
                  className="medical-primary"
                  onClick={() => setEditing(true)}
                >
                  Editar borrador
                </button>
              )}
          </div>
        }
      />
      <div className="medical-detail-layout">
        <section className="medical-panel medical-attention-summary">
          <h2>Datos de la atención</h2>
          <dl className="medical-metadata">
            <div>
              <dt>Profesional responsable</dt>
              <dd>{record.professional.user.name}</dd>
            </div>
            <div>
              <dt>Registrada por</dt>
              <dd>
                {record.creator.user.name} · {date(record.createdAt)}
              </dd>
            </div>
            <div>
              <dt>Origen</dt>
              <dd>
                {record.appointmentId ? "Cita de agenda" : "Sin cita previa"}
              </dd>
            </div>
            {record.finalizedAt && (
              <div>
                <dt>Finalizada por</dt>
                <dd>
                  {record.finalizer?.user.name} · {date(record.finalizedAt)}
                </dd>
              </div>
            )}
          </dl>
          <div className="medical-actions">
            <Link
              href={`/app/clinicas/${context.clinicId}/pacientes/${record.patientId}#historia-clinica`}
            >
              Historia del paciente
            </Link>
            {record.appointmentId && (
              <Link href={`/app/clinicas/${context.clinicId}/agenda`}>
                Ver agenda
              </Link>
            )}
          </div>
        </section>
        <section className="medical-panel">
          <h2>Registro clínico</h2>
          {record.status === "FINALIZED" && (
            <p className="medical-notice">
              Consulta finalizada. El registro original se conserva; cualquier
              corrección se agrega al final.
            </p>
          )}
          <dl className="medical-content">
            {clinicalTextFields.map((field) => (
              <div key={field} className={`medical-content-${field}`}>
                <dt>{clinicalLabels[field]}</dt>
                <dd>
                  {record[field] || "No registrado"}
                  {field === "diagnosis" && record.diagnosisType && (
                    <small>
                      Tipo:{" "}
                      {record.diagnosisType === "DEFINITIVE"
                        ? "Definitivo"
                        : "Presuntivo"}
                    </small>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <h3>Signos vitales</h3>
          <dl className="medical-metadata">
            {(
              [
                ["Peso", record.weightKg, "kg"],
                ["Temperatura", record.temperatureC, "°C"],
                ["Frecuencia cardíaca", record.heartRate, "lpm"],
                ["Frecuencia respiratoria", record.respiratoryRate, "rpm"],
              ] as const
            ).map(([label, value, unit]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value === null ? "No registrado" : `${value} ${unit}`}</dd>
              </div>
            ))}
          </dl>
          <p>
            <strong>Próximo control:</strong>{" "}
            {record.nextControlAt
              ? date(record.nextControlAt)
              : "No registrado"}
          </p>
        </section>
      </div>
      {record.status === "FINALIZED" && (
        <Rectifications
          key={revision}
          context={context}
          record={record}
          date={date}
          onSaved={() => setAuditRevision((v) => v + 1)}
        />
      )}
      <AuditTrail
        key={`audit:${revision}:${auditRevision}`}
        context={context}
        id={id}
        date={date}
      />
    </article>
  );
}
function Rectifications({
  context,
  record,
  date,
  onSaved,
}: {
  context: WorkspaceContext;
  record: Consultation;
  onSaved: () => void;
  date: (s: string) => string;
}) {
  const [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    [reason, setReason] = useState(""),
    [correction, setCorrection] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const pending = useRef<AbortController | null>(null),
    lock = useRef(false);
  useEffect(() => () => pending.current?.abort(), []);
  const load = useCallback(
    (signal: AbortSignal) =>
      getAmendments(context.clinicId, record.id, page, signal),
    [context.clinicId, record.id, page],
  );
  const result = useClinicalResource(`${page}:${revision}`, load, context);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const c = new AbortController();
    pending.current = c;
    try {
      await amendConsultation(
        context.clinicId,
        record.id,
        { reason, correction, requestId },
        c.signal,
      );
      if (!c.signal.aborted) {
        setReason("");
        setCorrection("");
        setRequestId(crypto.randomUUID());
        setPage(1);
        setRevision((v) => v + 1);
        onSaved();
      }
    } catch (e) {
      if (!c.signal.aborted) {
        if (e instanceof AuthError && e.status === 401) context.endSession();
        else setError(consultationError(e));
      }
    } finally {
      lock.current = false;
      if (!c.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="medical-panel">
      <h2>Rectificaciones</h2>
      <p>
        Se agregan con tu identidad y fecha. No sustituyen ni eliminan el
        registro original.
      </p>
      {result.error ? (
        <p role="alert">
          {result.error}
          <button onClick={result.retry}>Reintentar</button>
        </p>
      ) : !result.data ? (
        <p role="status">Cargando rectificaciones…</p>
      ) : (
        <>
          <ol className="medical-amendments">
            {result.data.items.map((r) => (
              <li key={r.id}>
                <h3>{r.reason}</h3>
                <p className="medical-preserve">{r.correction}</p>
                <small>
                  {r.actor.user.name} · {date(r.createdAt)}
                </small>
              </li>
            ))}
          </ol>
          {result.data.total === 0 && <p>No hay rectificaciones.</p>}
          {result.data.totalPages > 1 && (
            <div className="medical-pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anteriores
              </button>
              <span>
                {page} / {result.data.totalPages}
              </span>
              <button
                disabled={page >= result.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguientes
              </button>
            </div>
          )}
        </>
      )}
      {context.access.permissions.includes("consultation:write") && (
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="medical-section">
            <legend>Agregar rectificación</legend>
            <label>
              Motivo de la rectificación
              <textarea
                required
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <label>
              Corrección o información adicional
              <textarea
                required
                rows={5}
                maxLength={8000}
                value={correction}
                onChange={(e) => setCorrection(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="medical-alert">
                {error}
              </p>
            )}
            <button className="medical-primary" type="submit">
              {busy ? "Guardando…" : "Guardar rectificación"}
            </button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
function AuditTrail({
  context,
  id,
  date,
}: {
  context: WorkspaceContext;
  id: string;
  date: (s: string) => string;
}) {
  const [page, setPage] = useState(1);
  const load = useCallback(
    (signal: AbortSignal) =>
      getClinicalEvents(context.clinicId, id, page, signal),
    [context.clinicId, id, page],
  );
  const result = useClinicalResource(String(page), load, context);
  const labels: Record<string, string> = {
    CREATED: "Consulta creada",
    DRAFT_UPDATED: "Borrador actualizado",
    FINALIZED: "Consulta finalizada",
    RECTIFIED: "Rectificación agregada",
  };
  return (
    <section className="medical-panel">
      <h2>Trazabilidad</h2>
      {result.error ? (
        <p role="alert">
          {result.error}
          <button onClick={result.retry}>Reintentar</button>
        </p>
      ) : !result.data ? (
        <p role="status">Cargando historial…</p>
      ) : (
        <>
          <ol className="medical-audit">
            {result.data.items.map((e) => (
              <li key={e.id}>
                <strong>{labels[e.kind] || e.kind}</strong>
                <span>
                  {e.actor.user.name} · {date(e.createdAt)}
                </span>
                <details>
                  <summary>Ver contenido registrado en esta versión</summary>
                  <dl className="medical-content">
                    {e.kind === "RECTIFIED" ? (
                      <>
                        <div>
                          <dt>Motivo de la rectificación</dt>
                          <dd>{String(e.snapshot.reason || "")}</dd>
                        </div>
                        <div>
                          <dt>Corrección anexa</dt>
                          <dd>{String(e.snapshot.correction || "")}</dd>
                        </div>
                      </>
                    ) : (
                      <>
                        {clinicalTextFields
                          .filter((k) => typeof e.snapshot[k] === "string")
                          .map((k) => (
                            <div key={k}>
                              <dt>{clinicalLabels[k]}</dt>
                              <dd>
                                {String(e.snapshot[k] || "No registrado")}
                              </dd>
                            </div>
                          ))}
                        <div>
                          <dt>Versión</dt>
                          <dd>{String(e.snapshot.version || "")}</dd>
                        </div>
                        {typeof e.snapshot.attendedAt === "string" && (
                          <div>
                            <dt>Fecha de atención</dt>
                            <dd>{date(e.snapshot.attendedAt)}</dd>
                          </div>
                        )}
                        <div>
                          <dt>Tipo de diagnóstico</dt>
                          <dd>
                            {e.snapshot.diagnosisType === "DEFINITIVE"
                              ? "Definitivo"
                              : e.snapshot.diagnosisType === "PRESUMPTIVE"
                                ? "Presuntivo"
                                : "No registrado"}
                          </dd>
                        </div>
                        {(
                          [
                            ["Peso (kg)", "weightKg"],
                            ["Temperatura (°C)", "temperatureC"],
                            ["Frecuencia cardíaca (lpm)", "heartRate"],
                            [
                              "Frecuencia respiratoria (rpm)",
                              "respiratoryRate",
                            ],
                          ] as const
                        ).map(([label, k]) => (
                          <div key={k}>
                            <dt>{label}</dt>
                            <dd>
                              {e.snapshot[k] === null ||
                              e.snapshot[k] === undefined
                                ? "No registrado"
                                : String(e.snapshot[k])}
                            </dd>
                          </div>
                        ))}
                        <div>
                          <dt>Próximo control</dt>
                          <dd>
                            {typeof e.snapshot.nextControlAt === "string"
                              ? date(e.snapshot.nextControlAt)
                              : "No registrado"}
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>
                </details>
              </li>
            ))}
          </ol>
          {result.data.totalPages > 1 && (
            <div className="medical-pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              <span>
                {page} / {result.data.totalPages}
              </span>
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
    </section>
  );
}
