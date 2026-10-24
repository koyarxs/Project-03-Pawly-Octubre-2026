"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ClipboardList,
  Clock3,
  LoaderCircle,
  PawPrint,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AuthError } from "@/lib/auth";
import { localStamp } from "@/lib/appointment-time";
import { appointmentStates } from "@/lib/appointments";
import { canReadClinical } from "@/lib/consultations";
import {
  getDashboardOverview,
  type DashboardOverview,
  type OverviewValue,
} from "@/lib/dashboard";
import { hasPermission, jobNames, sectionPermissions } from "@/lib/permissions";
import { roleNames, workspacePath } from "@/lib/workspace";
import { WorkspaceShell, type WorkspaceContext } from "./workspace-shell";

export function VeterinaryDashboard({ clinicId }: { clinicId: string }) {
  return (
    <WorkspaceShell clinicId={clinicId}>
      {(context) => (
        <DashboardOverviewContent
          key={`${clinicId}:${context.session.id}:${context.revision}`}
          context={context}
        />
      )}
    </WorkspaceShell>
  );
}

function DashboardOverviewContent({ context }: { context: WorkspaceContext }) {
  const { clinicId, access, session, refresh, endSession } = context;
  const timezone =
    session.memberships.find((item) => item.clinic.id === clinicId)?.clinic
      .timezone || "America/Santiago";
  const clinical = canReadClinical(access);
  const [today, setToday] = useState(() =>
    localStamp(new Date(), timezone).slice(0, 10),
  );
  const [revision, setRevision] = useState(0);
  const [blockedKey, setBlockedKey] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    data: DashboardOverview;
  } | null>(null);
  const key = `${today}:${revision}`;
  const overview = snapshot?.key === key ? snapshot.data : null;
  const partial =
    overview &&
    [
      overview.appointments,
      overview.patients,
      overview.tutors,
      overview.drafts,
    ].some((value) => value?.kind === "error");
  useEffect(() => {
    const updateDay = () =>
      setToday(localStamp(new Date(), timezone).slice(0, 10));
    const timer = window.setInterval(updateDay, 60_000);
    window.addEventListener("focus", updateDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateDay);
    };
  }, [timezone]);
  useEffect(() => {
    const controller = new AbortController();
    void getDashboardOverview(
      clinicId,
      today,
      timezone,
      clinical,
      controller.signal,
      access.permissions,
    )
      .then((data) => {
        if (!controller.signal.aborted) setSnapshot({ key, data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        if (error instanceof AuthError && error.status === 401) endSession();
        else if (error instanceof AuthError && error.status === 403)
          setBlockedKey(key);
      });
    return () => controller.abort();
  }, [
    clinicId,
    today,
    timezone,
    clinical,
    key,
    refresh,
    endSession,
    access.permissions,
  ]);
  if (blockedKey === key)
    return (
      <section
        className="dashboard-panel dashboard-summary-denied"
        role="alert"
      >
        <ShieldCheck size={27} aria-hidden="true" />
        <h1>No pudimos verificar el acceso al resumen.</h1>
        <p>
          Tu acceso puede haber cambiado. Verifica nuevamente tus permisos antes
          de continuar.
        </p>
        <button className="dashboard-refresh" onClick={refresh}>
          Volver a verificar mi acceso
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </section>
    );
  const metrics = [
    {
      label: "Citas de hoy",
      icon: CalendarDays,
      value: overview?.appointments,
      description: "Todos los estados de esta jornada.",
      href: workspacePath(clinicId, "agenda"),
      link: "Ver agenda",
    },
    {
      label: "Pacientes activos",
      icon: PawPrint,
      value: overview?.patients,
      description: "Fichas activas de tu clínica.",
      href: workspacePath(clinicId, "pacientes"),
      link: "Ver pacientes",
    },
    {
      label: "Tutores activos",
      icon: Users,
      value: overview?.tutors,
      description: "Responsables vinculados al cuidado.",
      href: workspacePath(clinicId, "tutores"),
      link: "Ver tutores",
    },
    ...(clinical
      ? [
          {
            label: "Consultas en borrador",
            icon: ClipboardList,
            value: overview?.drafts,
            description: "Registros pendientes de finalizar.",
            href: workspacePath(clinicId, "consultas"),
            link: "Ver consultas",
          },
        ]
      : []),
  ];
  const dateLabel = new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${today}T12:00:00Z`));
  const time = (instant: string) =>
    new Intl.DateTimeFormat("es-CL", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(instant));
  return (
    <>
      <div className="dashboard-welcome">
        <div>
          <span className="dashboard-eyebrow">VISTA GENERAL</span>
          <h1>Hola, {session.name.split(" ")[0]}.</h1>
          <p>Todo lo esencial para acompañar tu jornada.</p>
        </div>
        <div className="dashboard-date">
          <CalendarDays size={17} aria-hidden="true" />
          <time dateTime={today}>{dateLabel}</time>
        </div>
      </div>
      <section
        className="dashboard-clinic-card"
        aria-labelledby="active-clinic"
      >
        <div className="dashboard-clinic-symbol">
          <Building2 size={25} aria-hidden="true" />
        </div>
        <div>
          <span>TU CLÍNICA ACTIVA</span>
          <h2 id="active-clinic">{access.name}</h2>
          <p>
            {jobNames[access.job ?? access.role] ?? roleNames[access.role]} ·{" "}
            {timezone}
          </p>
        </div>
        <span className="dashboard-verified">
          <ShieldCheck size={15} aria-hidden="true" />
          Acceso verificado
        </span>
      </section>
      <div className="dashboard-access-note">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>
          {access.patientScope === "ASSIGNED"
            ? "Tu vista incluye solamente pacientes asignados y sus atenciones."
            : "Tu vista incluye los módulos autorizados de esta clínica."}{" "}
          {!access.medicalPracticeEnabled &&
            "Las acciones médicas requieren credenciales verificadas y autorización independiente."}
        </p>
      </div>
      <div className="dashboard-summary-heading">
        <h2>Tu clínica, en perspectiva</h2>
        <button
          className="dashboard-refresh"
          onClick={() => setRevision((value) => value + 1)}
          disabled={!overview}
        >
          <RefreshCw size={14} aria-hidden="true" />
          Actualizar resumen
        </button>
      </div>
      <section
        aria-label="Indicadores operativos"
        className={`dashboard-indicators ${clinical ? "dashboard-indicators-clinical" : ""}`}
        aria-busy={!overview}
      >
        {metrics
          .filter((m) =>
            hasPermission(
              access,
              sectionPermissions[
                m.href.split("/").at(-1) as keyof typeof sectionPermissions
              ],
            ),
          )
          .map(({ label, icon: Icon, value, description, href, link }) => (
            <article
              className="dashboard-indicator"
              key={label}
              aria-label={label}
            >
              <div>
                <h3>{label}</h3>
                <span className="dashboard-metric-icon">
                  <Icon size={18} aria-hidden="true" />
                </span>
              </div>
              <MetricValue value={value} />
              <p>{description}</p>
              <Link className="dashboard-metric-link" href={href}>
                {link}
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </article>
          ))}
      </section>
      <p className="dashboard-summary-note" role="status">
        {overview
          ? `${partial ? "Resumen parcial" : "Resumen actualizado"} a las ${time(overview.updatedAt)} · ${timezone}`
          : "Cargando los datos de tu clínica…"}
      </p>
      <div className="dashboard-panels">
        {hasPermission(access, "appointment:read") && (
          <section
            className="dashboard-panel dashboard-day-panel"
            aria-labelledby="agenda-title"
          >
            <div className="dashboard-panel-title">
              <div>
                <span className="dashboard-eyebrow">JORNADA DE HOY</span>
                <h2 id="agenda-title">En curso y próximas citas</h2>
              </div>
              <Link
                href={workspacePath(clinicId, "agenda")}
                className="dashboard-text-link"
              >
                Ver agenda
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
            {!overview ? (
              <div className="dashboard-empty" role="status">
                <LoaderCircle
                  className="auth-spinner"
                  size={25}
                  aria-hidden="true"
                />
                <p>Cargando las citas de hoy…</p>
              </div>
            ) : overview.appointments.kind === "error" ? (
              <div className="dashboard-empty" role="alert">
                <CalendarDays size={27} aria-hidden="true" />
                <h3>No pudimos cargar las citas.</h3>
                <p>Vuelve a actualizar el resumen para consultar tu jornada.</p>
              </div>
            ) : overview.upcoming.length === 0 ? (
              <div className="dashboard-empty">
                <CalendarDays size={29} aria-hidden="true" />
                <h3>Tu jornada tiene espacio.</h3>
                <p>
                  No hay citas en curso o pendientes para lo que queda de hoy.
                </p>
                <Link
                  className="dashboard-available"
                  href={workspacePath(clinicId, "agenda")}
                >
                  Abrir agenda
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            ) : (
              <ol className="dashboard-upcoming">
                {overview.upcoming.map((appointment) => (
                  <li key={appointment.id}>
                    <div className="dashboard-upcoming-time">
                      <time dateTime={appointment.startsAt}>
                        {time(appointment.startsAt)}
                      </time>
                      <span>{time(appointment.endsAt)}</span>
                    </div>
                    <div className="dashboard-upcoming-patient">
                      <Link
                        href={`${workspacePath(clinicId, "pacientes")}/${encodeURIComponent(appointment.patientId)}`}
                      >
                        {appointment.patient.name}
                      </Link>
                      <p>{appointment.reason}</p>
                      <span>
                        {appointment.professional?.user.name ||
                          "Sin profesional asignado"}
                      </span>
                    </div>
                    <span
                      className={`dashboard-appointment-status dashboard-status-${appointment.status.toLowerCase()}`}
                    >
                      {appointmentStates[appointment.status]}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <p className="dashboard-panel-footnote">
              <Clock3 size={13} aria-hidden="true" />
              Hasta 5 citas de la jornada. Horarios de {timezone}.
            </p>
          </section>
        )}
        <section
          className="dashboard-panel dashboard-actions-panel"
          aria-labelledby="workspace-title"
        >
          <div className="dashboard-panel-title">
            <div>
              <span className="dashboard-eyebrow">
                UN BUEN PUNTO DE PARTIDA
              </span>
              <h2 id="workspace-title">Continúa el cuidado</h2>
            </div>
          </div>
          <div className="dashboard-shortcuts">
            {[
              {
                name: "Registrar un tutor",
                description: "Conecta a cada paciente con su familia.",
                icon: Users,
                href: `${workspacePath(clinicId, "tutores")}/nuevo`,
              },
              {
                name: !hasPermission(access, "patient:create")
                  ? "Consultar pacientes"
                  : "Registrar un paciente",
                description: "La información que acompaña su cuidado.",
                icon: PawPrint,
                href: `${workspacePath(clinicId, "pacientes")}${hasPermission(access, "patient:create") ? "/nuevo" : ""}`,
              },
              ...(clinical
                ? [
                    {
                      name: "Nueva consulta",
                      description: "Registra la atención y su seguimiento.",
                      icon: ClipboardList,
                      href: `${workspacePath(clinicId, "consultas")}/nueva`,
                    },
                  ]
                : []),
            ]
              .filter((item) =>
                hasPermission(
                  access,
                  item.href.includes("tutores")
                    ? "tutor:write"
                    : item.href.includes("pacientes")
                      ? "patient:read"
                      : "consultation:write",
                ),
              )
              .map(({ name, description, icon: Icon, href }) => (
                <Link href={href} key={name}>
                  <span className="dashboard-shortcut-icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{name}</strong>
                    <small>{description}</small>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ))}
          </div>
          {hasPermission(access, "staff:read") && (
            <Link
              className="dashboard-available"
              href={workspacePath(clinicId, "personal")}
            >
              Personal y Accesos <ArrowRight size={15} />
            </Link>
          )}
          <p className="dashboard-panel-footnote">
            {access.role === "VET_TECHNICIAN"
              ? "Hospitalización, signos vitales y tareas de enfermería: pendientes de implementación."
              : access.role === "PET_GROOMER"
                ? "Agenda y servicios de peluquería: pendientes de implementación. Los pacientes asignados están disponibles en su directorio."
                : "Caja, pagos, inventario, vacunación y reportes financieros: pendientes de implementación."}
          </p>
          <div className="dashboard-access-note">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              Estás trabajando en <strong>{access.name}</strong>. Tu acceso y
              las acciones disponibles dependen de tu rol.
            </p>
          </div>
          <button className="dashboard-refresh" onClick={refresh}>
            Volver a verificar mi acceso
            <ArrowRight size={15} aria-hidden="true" />
          </button>
        </section>
      </div>
    </>
  );
}

function MetricValue({ value }: { value: OverviewValue | undefined }) {
  if (!value)
    return (
      <strong
        className="dashboard-metric-loading"
        aria-label="Cargando indicador"
      >
        —
      </strong>
    );
  if (value.kind === "error")
    return <strong className="dashboard-metric-error">No disponible</strong>;
  return (
    <strong className="dashboard-metric-value">
      {new Intl.NumberFormat("es-CL").format(value.total)}
    </strong>
  );
}
