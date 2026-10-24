"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  PawPrint,
  Plus,
  Search,
  Users,
} from "lucide-react";
import {
  canWrite,
  clinicalPath,
  fullName,
  listRecords,
  speciesNames,
  statusNames,
  type ClinicalKind,
  type PatientSummary,
  type TutorSummary,
} from "@/lib/clinical";
import type { WorkspaceContext } from "@/components/workspace/workspace-shell";
import { useClinicalLoad } from "./use-clinical-load";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  RecordIdentity,
  StatusBadge,
} from "@/components/ui/workspace-ui";

export function ClinicalList({
  context,
  kind,
  tutorId,
}: {
  context: WorkspaceContext;
  kind: ClinicalKind;
  tutorId?: string;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    ...(query ? { q: query } : {}),
    ...(status ? { status } : {}),
  }).toString();
  const load = useCallback(
    (signal: AbortSignal) =>
      listRecords(context.clinicId, kind, params, signal, tutorId),
    [context.clinicId, kind, params, tutorId],
  );
  const { state, retry } = useClinicalLoad(
    `${kind}:${tutorId ?? "all"}:${params}`,
    load,
    context,
  );
  const Icon = kind === "tutores" ? Users : PawPrint;
  const heading = tutorId
    ? "Mascotas asociadas"
    : kind === "tutores"
      ? "Tutores"
      : "Pacientes";
  return (
    <section className="clinical-list" aria-label={heading}>
      <PageHeader
        eyebrow={tutorId ? "RESPONSABLES Y MASCOTAS" : "GESTIÓN DE LA CLÍNICA"}
        title={heading}
        level={tutorId ? 2 : 1}
        description={
          kind === "tutores"
            ? "Una relación cercana empieza con sus datos al día."
            : "Cada paciente, su información y las personas que lo cuidan."
        }
        actions={
          !tutorId &&
          canWrite(kind, context.access) && (
            <Link
              className="clinical-primary"
              href={`${clinicalPath(context.clinicId, kind)}/nuevo`}
            >
              <Plus size={17} aria-hidden="true" />
              {kind === "tutores" ? "Nuevo tutor" : "Nuevo paciente"}
            </Link>
          )
        }
      />
      <div className="clinical-directory">
        <div className="clinical-directory-heading">
          <h2>
            {tutorId
              ? "Pacientes vinculados"
              : kind === "tutores"
                ? "Directorio de tutores"
                : "Directorio de pacientes"}
          </h2>
          <span>Solo registros de {context.access.name}</span>
        </div>
        <form
          className="clinical-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            setQuery(search.trim());
          }}
        >
          <label className="clinical-search-input">
            <Search size={18} aria-hidden="true" />
            <input
              aria-label={
                kind === "tutores" ? "Buscar tutores" : "Buscar pacientes"
              }
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              maxLength={100}
              placeholder={
                kind === "tutores"
                  ? "Nombre, correo o teléfono"
                  : "Nombre, raza, microchip o tutor"
              }
            />
          </label>
          <label className="clinical-filter">
            <span>Estado</span>
            <select
              aria-label={`Estado de ${kind}`}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">
                {kind === "tutores" ? "Activos" : "Sin archivar"}
              </option>
              {kind === "pacientes" && (
                <>
                  <option value="ACTIVE">Activos</option>
                  <option value="DECEASED">Fallecidos</option>
                </>
              )}
              <option value="ARCHIVED">Archivados</option>
            </select>
          </label>
          <button className="clinical-secondary" type="submit">
            Buscar
          </button>
        </form>
        {state.kind === "loading" ? (
          <LoadingState label={`Cargando ${heading.toLowerCase()}…`} />
        ) : state.kind === "error" ? (
          <div className="clinical-state" role="alert">
            <h2>No pudimos cargar los registros.</h2>
            <p>{state.message}</p>
            <button className="clinical-secondary" onClick={retry}>
              Volver a intentar
            </button>
            <button className="clinical-record-link" onClick={context.refresh}>
              Verificar mi acceso
            </button>
          </div>
        ) : (
          <>
            {state.data.items.length === 0 ? (
              <EmptyState
                icon={Icon}
                title={
                  query
                    ? "No encontramos coincidencias."
                    : status === "ARCHIVED"
                      ? "No hay registros archivados."
                      : tutorId
                        ? "Este tutor aún no tiene mascotas asociadas."
                        : kind === "tutores"
                          ? "Tu primer tutor empieza aquí."
                          : "Tu primera ficha está por llegar."
                }
                description={
                  query
                    ? "Prueba con otro nombre o dato de contacto."
                    : kind === "tutores"
                      ? "Registra a un responsable para comenzar a vincular sus mascotas."
                      : "Al registrar una mascota, podrás consultar su información desde este espacio."
                }
              />
            ) : (
              <div className="clinical-table-wrap">
                <table className="clinical-table">
                  <caption className="clinical-sr-only">
                    {heading} de la clínica activa
                  </caption>
                  <thead>
                    <tr>
                      {kind === "tutores" ? (
                        <>
                          <th>Nombre</th>
                          <th>Teléfono</th>
                          <th>Correo</th>
                        </>
                      ) : (
                        <>
                          <th>Paciente</th>
                          <th>Especie</th>
                          <th>Responsables</th>
                        </>
                      )}
                      <th>Estado</th>
                      <th>
                        <span className="clinical-sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.items.map((record) => (
                      <tr key={record.id}>
                        {kind === "tutores" ? (
                          <>
                            <td data-label="Nombre">
                              <RecordIdentity
                                name={fullName(record as TutorSummary)}
                                kind="person"
                              />
                            </td>
                            <td data-label="Teléfono">
                              {(record as TutorSummary).phone}
                            </td>
                            <td data-label="Correo">
                              {(record as TutorSummary).email ??
                                "Sin registrar"}
                            </td>
                          </>
                        ) : (
                          <>
                            <td data-label="Paciente">
                              <RecordIdentity
                                name={(record as PatientSummary).name}
                              />
                            </td>
                            <td data-label="Especie">
                              {speciesNames[(record as PatientSummary).species]}
                            </td>
                            <td data-label="Responsables">
                              {(record as PatientSummary).tutors
                                .map(fullName)
                                .join(", ")}
                            </td>
                          </>
                        )}
                        <td data-label="Estado">
                          <StatusBadge
                            tone={
                              record.status === "ACTIVE"
                                ? "positive"
                                : "neutral"
                            }
                          >
                            {statusNames[record.status]}
                          </StatusBadge>
                        </td>
                        <td>
                          <Link
                            className="clinical-record-link"
                            href={clinicalPath(
                              context.clinicId,
                              kind,
                              record.id,
                            )}
                            aria-label={`Ver ficha de ${kind === "tutores" ? fullName(record as TutorSummary) : (record as PatientSummary).name}`}
                          >
                            Ver ficha{" "}
                            <ArrowRight size={15} aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="clinical-pagination">
              <span>
                {state.data.total === 0
                  ? "0 registros"
                  : `${state.data.total} ${state.data.total === 1 ? "registro" : "registros"}`}{" "}
                · Página {page}
                {state.data.totalPages > 0 && ` de ${state.data.totalPages}`}
              </span>
              <div>
                <button
                  className="clinical-page-button"
                  aria-label="Página anterior"
                  onClick={() => setPage((value) => value - 1)}
                  disabled={page <= 1}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  className="clinical-page-button"
                  aria-label="Página siguiente"
                  onClick={() => setPage((value) => value + 1)}
                  disabled={page >= state.data.totalPages}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
