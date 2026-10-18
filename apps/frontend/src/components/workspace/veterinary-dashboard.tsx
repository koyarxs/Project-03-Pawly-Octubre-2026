"use client";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarDays,
  PawPrint,
  ShieldCheck,
} from "lucide-react";
import { WorkspaceShell } from "./workspace-shell";
import { roleNames, workspacePath } from "@/lib/workspace";
export function VeterinaryDashboard({ clinicId }: { clinicId: string }) {
  return (
    <WorkspaceShell clinicId={clinicId}>
      {({ access, session, refresh }) => {
        const membership = session.memberships.find(
          (item) => item.clinic.id === access.id,
        );
        return (
          <>
            <div className="dashboard-welcome">
              <div>
                <span className="dashboard-eyebrow">VISTA GENERAL</span>
                <h1>Hola, {session.name}.</h1>
                <p>Un espacio para cuidar mejor, juntos.</p>
              </div>
              <span className="dashboard-verified">
                <ShieldCheck size={16} />
                Acceso verificado
              </span>
            </div>
            <section
              className="dashboard-clinic-card"
              aria-labelledby="active-clinic"
            >
              <div className="dashboard-clinic-symbol">
                <Building2 size={28} aria-hidden="true" />
              </div>
              <div>
                <span>ESTÁS EN</span>
                <h2 id="active-clinic">{access.name}</h2>
                <p>
                  {roleNames[access.role]}
                  {membership && <> · {membership.clinic.timezone}</>}
                </p>
              </div>
              <Link href="/app">
                Mis clínicas <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </section>
            <section
              aria-label="Indicadores operativos"
              className="dashboard-indicators"
            >
              {[
                [
                  "Pacientes",
                  PawPrint,
                  "Consulta y administra las fichas de tu clínica.",
                ],
                [
                  "Agenda",
                  CalendarDays,
                  "Organiza las citas y la disponibilidad de tu equipo.",
                ],
                [
                  "Consultas",
                  Activity,
                  "La actividad clínica se incorporará en una próxima etapa.",
                ],
              ].map(([name, Icon, description]) => {
                const IndicatorIcon = Icon as typeof PawPrint;
                return (
                  <article className="dashboard-indicator" key={String(name)}>
                    <div>
                      <h2>{String(name)}</h2>
                      <IndicatorIcon size={20} aria-hidden="true" />
                    </div>
                    <strong>
                      {name !== "Consultas" ? "Disponible" : "No disponible"}
                    </strong>
                    <p>{String(description)}</p>
                    {name === "Pacientes" && (
                      <Link
                        className="dashboard-refresh"
                        href={workspacePath(clinicId, "pacientes")}
                      >
                        Ver pacientes <ArrowRight size={15} />
                      </Link>
                    )}
                    {name === "Agenda" && (
                      <Link
                        className="dashboard-refresh"
                        href={workspacePath(clinicId, "agenda")}
                      >
                        Abrir agenda <ArrowRight size={15} />
                      </Link>
                    )}
                  </article>
                );
              })}
            </section>
            <div className="dashboard-panels">
              <section
                className="dashboard-panel"
                aria-labelledby="agenda-title"
              >
                <div className="dashboard-panel-title">
                  <h2 id="agenda-title">Tu próxima jornada</h2>
                  <span>Agenda</span>
                </div>
                <div className="dashboard-empty">
                  <CalendarDays size={30} aria-hidden="true" />
                  <h3>Planifica las próximas atenciones.</h3>
                  <p>
                    Consulta el día o la semana y coordina las citas de tu
                    clínica.
                  </p>
                  <Link
                    className="dashboard-available"
                    href={workspacePath(clinicId, "agenda")}
                  >
                    Ver agenda
                  </Link>
                </div>
              </section>
              <section
                className="dashboard-panel"
                aria-labelledby="workspace-title"
              >
                <div className="dashboard-panel-title">
                  <h2 id="workspace-title">Tu espacio, preparado</h2>
                  <ShieldCheck size={19} aria-hidden="true" />
                </div>
                <p className="dashboard-panel-intro">
                  Tu sesión y el acceso a esta clínica están verificados. Las
                  herramientas clínicas se habilitarán de forma progresiva.
                </p>
                <div className="dashboard-roadmap">
                  {[
                    [
                      "Tutores y pacientes",
                      "La base para conocer a cada familia.",
                    ],
                    [
                      "Consultas clínicas",
                      "Registra la atención y el seguimiento clínico.",
                    ],
                  ].map(([name, description]) => (
                    <div key={name}>
                      <PawPrint size={18} aria-hidden="true" />
                      <div>
                        <h3>{name}</h3>
                        <p>{description}</p>
                      </div>
                      {name === "Tutores y pacientes" ? (
                        <Link
                          className="dashboard-available"
                          href={workspacePath(clinicId, "tutores")}
                        >
                          Disponible <ArrowRight size={14} />
                        </Link>
                      ) : (
                        <span>Próximamente</span>
                      )}
                    </div>
                  ))}
                </div>
                <button className="dashboard-refresh" onClick={refresh}>
                  Volver a verificar mi acceso <ArrowRight size={16} />
                </button>
              </section>
            </div>
          </>
        );
      }}
    </WorkspaceShell>
  );
}
