"use client";
import { useCallback, useState, type FormEvent } from "react";
import Link from "next/link";
import { Plus, ClipboardList } from "lucide-react";
import type { WorkspaceContext } from "@/components/workspace/workspace-shell";
import {
  canReadClinical,
  getConsultations,
  consultationPath,
  consultationStates,
} from "@/lib/consultations";
import { calendarRange } from "@/lib/appointment-time";
import { useClinicalResource } from "./use-clinical-resource";
import "./consultations.css";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  RecordIdentity,
  StatusBadge,
} from "@/components/ui/workspace-ui";
export function ClinicalHistory({
  context,
  patientId,
  active = true,
}: {
  context: WorkspaceContext;
  patientId: string;
  active?: boolean;
}) {
  return canReadClinical(context.access.role) ? (
    <ConsultationList
      context={context}
      patientId={patientId}
      canCreate={active}
    />
  ) : (
    <section className="medical-panel">
      <h2>Historia clínica</h2>
      <p>
        El contenido clínico está reservado a los roles clínicos autorizados.
      </p>
    </section>
  );
}
export function ConsultationList({
  context,
  patientId,
  canCreate = true,
}: {
  context: WorkspaceContext;
  patientId?: string;
  canCreate?: boolean;
}) {
  const clinicId = context.clinicId,
    timezone =
      context.session.memberships.find((m) => m.clinic.id === clinicId)!.clinic
        .timezone || "America/Santiago";
  const [status, setStatus] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [filter, setFilter] = useState(""),
    [filterError, setFilterError] = useState(""),
    [page, setPage] = useState(1);
  const query = `page=${page}${patientId ? `&patientId=${encodeURIComponent(patientId)}` : ""}${status ? `&status=${status}` : ""}${filter}`;
  const load = useCallback(
    (signal: AbortSignal) => getConsultations(clinicId, query, signal),
    [clinicId, query],
  );
  const result = useClinicalResource(query, load, context);
  function apply(event: FormEvent) {
    event.preventDefault();
    setFilterError("");
    if (Boolean(from) !== Boolean(to) || from > to) {
      setFilterError("Selecciona una fecha inicial y final válidas.");
      return;
    }
    try {
      setFilter(
        from
          ? `&from=${encodeURIComponent(calendarRange(from, false, timezone).from)}&to=${encodeURIComponent(calendarRange(to, false, timezone).to)}`
          : "",
      );
      setPage(1);
    } catch {
      setFilterError(
        "No fue posible interpretar las fechas en la zona de la clínica.",
      );
    }
  }
  const newPath = `${consultationPath(clinicId)}/nueva${patientId ? `?patientId=${encodeURIComponent(patientId)}` : ""}`;
  return (
    <section
      className="medical-records"
      id={patientId ? "historia-clinica" : undefined}
      aria-label={
        patientId ? "Historia clínica del paciente" : "Consultas veterinarias"
      }
    >
      <PageHeader
        eyebrow={patientId ? "CONTINUIDAD DE LA ATENCIÓN" : "REGISTRO CLÍNICO"}
        title={patientId ? "Historia clínica" : "Consultas veterinarias"}
        level={patientId ? 2 : 1}
        description="Cada atención forma parte de una historia. Consulta los registros más recientes de tu clínica."
        actions={
          canCreate && (
            <Link className="medical-primary" href={newPath}>
              <Plus size={17} aria-hidden="true" />
              Nueva consulta
            </Link>
          )
        }
      />
      <form className="medical-filters" onSubmit={apply}>
        <label>
          Estado clínico
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="DRAFT">Borradores</option>
            <option value="FINALIZED">Finalizadas</option>
          </select>
        </label>
        <label>
          Desde
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button type="submit">Filtrar fechas</button>
        <button
          type="button"
          onClick={() => {
            setFrom("");
            setTo("");
            setFilter("");
            setFilterError("");
            setPage(1);
            result.retry();
          }}
        >
          Limpiar filtros
        </button>
        <span>{timezone}</span>
      </form>
      {filterError && (
        <p role="alert" className="medical-alert">
          {filterError}
        </p>
      )}
      {result.error ? (
        <div role="alert" className="medical-empty">
          <h3>No pudimos cargar las consultas.</h3>
          <p>{result.error}</p>
          <button onClick={result.retry}>Reintentar</button>
          <button onClick={context.refresh}>Verificar mi acceso</button>
        </div>
      ) : !result.data ? (
        <LoadingState label="Cargando historia clínica…" />
      ) : (
        <>
          <p className="medical-count" aria-live="polite">
            {result.data.total}{" "}
            {result.data.total === 1
              ? "atención registrada"
              : "atenciones registradas"}
          </p>
          {result.data.items.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Aún no hay atenciones con estos filtros."
              description="Crea una consulta o inicia la atención desde una cita de la agenda."
            />
          ) : (
            <ol className="medical-timeline">
              {result.data.items.map((r) => (
                <li key={r.id}>
                  <article className="medical-entry">
                    <div className="medical-entry-top">
                      <time dateTime={r.attendedAt}>
                        {new Intl.DateTimeFormat("es-CL", {
                          timeZone: timezone,
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(r.attendedAt))}
                      </time>
                      <StatusBadge
                        tone={r.status === "DRAFT" ? "warning" : "positive"}
                      >
                        {consultationStates[r.status]}
                      </StatusBadge>
                    </div>
                    <h3>
                      <Link href={consultationPath(clinicId, r.id)}>
                        {r.reason}
                      </Link>
                    </h3>
                    <div className="medical-entry-patient">
                      <RecordIdentity
                        name={r.patient.name}
                        subtitle={r.professional.user.name}
                      />
                    </div>
                    <div className="medical-entry-summary">
                      {r.diagnosis && (
                        <p className="medical-preview">
                          <strong>Diagnóstico:</strong> {r.diagnosis}
                        </p>
                      )}
                      {r.treatment && (
                        <p className="medical-preview">
                          <strong>Tratamiento:</strong> {r.treatment}
                        </p>
                      )}
                    </div>
                    <div className="medical-entry-footer">
                      <span>
                        {r.appointmentId
                          ? "Atención con cita"
                          : "Sin cita previa"}
                      </span>
                      <Link href={consultationPath(clinicId, r.id)}>
                        Ver atención →
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          )}
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
