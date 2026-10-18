"use client";
import { ClinicalHistory } from "@/components/consultations/consultation-list";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Archive, ArrowLeft, LoaderCircle, Pencil } from "lucide-react";
import { AuthError } from "@/lib/auth";
import {
  archiveRecord,
  calendarDate,
  canArchive,
  canWrite,
  clinicalError,
  clinicalPath,
  fullName,
  getRecord,
  sexNames,
  speciesNames,
  statusNames,
  type ClinicalKind,
  type Patient,
  type Tutor,
} from "@/lib/clinical";
import {
  WorkspaceShell,
  type WorkspaceContext,
} from "@/components/workspace/workspace-shell";
import { ClinicalForm } from "./clinical-form";
import { ClinicalList } from "./clinical-list";
import { useClinicalLoad } from "./use-clinical-load";
import "./clinical.css";

export type ClinicalView = "list" | "new" | "detail" | "edit";
export function ClinicalPage({
  clinicId,
  kind,
  view = "list",
  id,
}: {
  clinicId: string;
  kind: ClinicalKind;
  view?: ClinicalView;
  id?: string;
}) {
  return (
    <WorkspaceShell clinicId={clinicId} section={kind}>
      {(context) => (
        <ClinicalContent
          key={`${clinicId}:${kind}:${view}:${id ?? ""}:${context.revision}`}
          context={context}
          kind={kind}
          view={view}
          id={id}
        />
      )}
    </WorkspaceShell>
  );
}
function ClinicalContent({
  context,
  kind,
  view,
  id,
}: {
  context: WorkspaceContext;
  kind: ClinicalKind;
  view: ClinicalView;
  id?: string;
}) {
  if (view === "list") return <ClinicalList context={context} kind={kind} />;
  if (
    (view === "new" || view === "edit") &&
    !canWrite(kind, context.access.role)
  )
    return (
      <section className="clinical-state" role="alert">
        <h1>No tienes permiso para editar pacientes.</h1>
        <p>
          Tu rol permite consultar las fichas. Solicita la gestión a un
          integrante autorizado de la clínica.
        </p>
        <Link
          className="clinical-record-link"
          href={clinicalPath(context.clinicId, kind)}
        >
          Volver al listado
        </Link>
      </section>
    );
  if (view === "new") return <ClinicalForm context={context} kind={kind} />;
  return (
    <RecordPage context={context} kind={kind} id={id!} edit={view === "edit"} />
  );
}
function RecordPage({
  context,
  kind,
  id,
  edit,
}: {
  context: WorkspaceContext;
  kind: ClinicalKind;
  id: string;
  edit: boolean;
}) {
  const load = useCallback(
    (signal: AbortSignal) => getRecord(context.clinicId, kind, id, signal),
    [context.clinicId, kind, id],
  );
  const { state, retry } = useClinicalLoad(`${kind}:${id}`, load, context);
  if (state.kind === "loading")
    return (
      <div className="clinical-state" role="status">
        <LoaderCircle className="auth-spinner" size={25} />
        <p>Cargando ficha…</p>
      </div>
    );
  if (state.kind === "error")
    return (
      <div className="clinical-state" role="alert">
        <h1>No pudimos abrir la ficha.</h1>
        <p>{state.message}</p>
        <button className="clinical-secondary" onClick={retry}>
          Volver a intentar
        </button>
        <button className="clinical-record-link" onClick={context.refresh}>
          Verificar mi acceso
        </button>
        <Link
          className="clinical-record-link"
          href={clinicalPath(context.clinicId, kind)}
        >
          Volver al listado
        </Link>
      </div>
    );
  if (edit && state.data.status !== "ARCHIVED")
    return <ClinicalForm context={context} kind={kind} initial={state.data} />;
  return (
    <ClinicalDetail
      key={state.data.updatedAt}
      context={context}
      kind={kind}
      record={state.data}
      onArchived={retry}
    />
  );
}
function ClinicalDetail({
  context,
  kind,
  record,
  onArchived,
}: {
  context: WorkspaceContext;
  kind: ClinicalKind;
  record: Tutor | Patient;
  onArchived: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [archived, setArchived] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<AbortController | null>(null);
  const archiveButton = useRef<HTMLButtonElement>(null);
  const lock = useRef(false);
  useEffect(() => () => pending.current?.abort(), []);
  const name =
    kind === "tutores" ? fullName(record as Tutor) : (record as Patient).name;
  async function archive() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    const controller = new AbortController();
    pending.current = controller;
    try {
      await archiveRecord(context.clinicId, kind, record.id, controller.signal);
      if (!controller.signal.aborted) {
        dialog.current?.close();
        setArchived(true);
        onArchived();
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof AuthError && error.status === 401)
        context.endSession();
      else if (error instanceof AuthError && error.status === 403)
        context.refresh();
      else setMessage(clinicalError(error, "archive"));
    } finally {
      if (!controller.signal.aborted) {
        setBusy(false);
        lock.current = false;
      }
    }
  }
  const values: [string, string | null][] =
    kind === "tutores"
      ? [
          ["Nombre", (record as Tutor).firstName],
          ["Apellidos", (record as Tutor).lastName],
          ["Teléfono", (record as Tutor).phone],
          ["Correo", (record as Tutor).email],
          ["Dirección", (record as Tutor).address],
        ]
      : [
          ["Especie", speciesNames[(record as Patient).species]],
          ["Raza", (record as Patient).breed],
          ["Sexo", sexNames[(record as Patient).sex]],
          ["Fecha de nacimiento", calendarDate((record as Patient).birthDate)],
          [
            "Peso",
            (record as Patient).weightKg === null
              ? null
              : `${new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format((record as Patient).weightKg!)} kg`,
          ],
          ["Color", (record as Patient).color],
          ["Microchip", (record as Patient).microchip],
        ];
  return (
    <>
      <Link
        className="clinical-back"
        href={clinicalPath(context.clinicId, kind)}
      >
        <ArrowLeft size={16} />
        Volver a {kind}
      </Link>
      <div className="clinical-heading">
        <div>
          <span className="dashboard-eyebrow">
            FICHA DE {kind === "tutores" ? "TUTOR" : "PACIENTE"}
          </span>
          <h1>{name}</h1>
          <p>{context.access.name}</p>
        </div>
        <div className="clinical-detail-actions">
          <span className={`clinical-status ${record.status.toLowerCase()}`}>
            {statusNames[record.status]}
          </span>
          {record.status !== "ARCHIVED" &&
            canWrite(kind, context.access.role) && (
              <Link
                className="clinical-secondary"
                href={clinicalPath(context.clinicId, kind, record.id, true)}
              >
                <Pencil size={15} />
                Editar {kind === "tutores" ? "tutor" : "paciente"}
              </Link>
            )}
        </div>
      </div>
      {archived && (
        <div className="clinical-notice" role="status">
          Registro archivado.
        </div>
      )}
      <section
        className="clinical-detail-card"
        aria-label="Información registrada"
      >
        <h2>
          Información {kind === "tutores" ? "de contacto" : "del paciente"}
        </h2>
        <dl className="clinical-detail-grid">
          {values.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value ?? "Sin registrar"}</dd>
            </div>
          ))}
        </dl>
        <div className="clinical-notes">
          <h3>Observaciones</h3>
          <p>{record.notes || "Sin observaciones registradas."}</p>
        </div>
        <div className="clinical-dates">
          <span>
            Creado:{" "}
            {new Date(record.createdAt).toLocaleDateString("es-CL", {
              timeZone: "UTC",
            })}
          </span>
          <span>
            Actualizado:{" "}
            {new Date(record.updatedAt).toLocaleDateString("es-CL", {
              timeZone: "UTC",
            })}
          </span>
        </div>
      </section>
      {kind === "pacientes" && (
        <section
          className="clinical-detail-card"
          aria-label="Responsables del paciente"
        >
          <h2>Responsables asociados</h2>
          <div className="clinical-related">
            {(record as Patient).tutors.map((tutor) => (
              <Link
                key={tutor.id}
                href={clinicalPath(context.clinicId, "tutores", tutor.id)}
              >
                <span className="clinical-avatar" aria-hidden="true">
                  {tutor.firstName.slice(0, 1).toUpperCase()}
                </span>
                <strong>{fullName(tutor)}</strong>
                <span>Ver ficha</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {kind === "pacientes" && (
        <ClinicalHistory
          context={context}
          patientId={record.id}
          active={record.status === "ACTIVE"}
        />
      )}
      {kind === "tutores" && (
        <ClinicalList context={context} kind="pacientes" tutorId={record.id} />
      )}
      {record.status !== "ARCHIVED" && canArchive(context.access.role) && (
        <section className="clinical-archive">
          <div>
            <h2>Archivar registro</h2>
            <p>
              {kind === "tutores"
                ? "Solo es posible si no tiene pacientes sin archivar asociados."
                : "La ficha y sus responsables se conservan para consulta."}{" "}
              No elimina información.
            </p>
          </div>
          <button
            ref={archiveButton}
            className="clinical-secondary"
            onClick={() => dialog.current?.showModal()}
          >
            <Archive size={15} />
            Archivar {kind === "tutores" ? "tutor" : "paciente"}
          </button>
        </section>
      )}
      <dialog
        ref={dialog}
        className="clinical-confirm"
        aria-labelledby="archive-heading"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <h2 id="archive-heading">¿Archivar a {name}?</h2>
        <p>
          El registro se conservará para consulta y dejará de estar disponible
          para nuevas ediciones.
        </p>
        {message && (
          <div className="clinical-alert" role="alert">
            {message}
          </div>
        )}
        <div>
          <button
            className="clinical-secondary"
            disabled={busy}
            onClick={() => {
              dialog.current?.close();
              archiveButton.current?.focus();
            }}
          >
            Cancelar
          </button>
          <button
            className="clinical-primary"
            disabled={busy}
            onClick={() => void archive()}
          >
            {busy ? "Archivando…" : "Confirmar archivado"}
          </button>
        </div>
      </dialog>
    </>
  );
}
