"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Package,
  PawPrint,
  Settings,
  ShieldCheck,
  Syringe,
  Users,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { PrivateWorkspaceGate } from "@/components/auth/private-workspace-gate";
import { usePrivateWorkspace } from "@/components/auth/use-private-workspace";
import { dashboardPath, roleNames } from "@/lib/workspace";
import "@/components/auth/auth.css";
import "./dashboard.css";

const modules = [
  ["Agenda", CalendarDays],
  ["Tutores", Users],
  ["Pacientes", PawPrint],
  ["Consultas", ClipboardList],
  ["Vacunación", Syringe],
  ["Inventario", Package],
  ["Reportes", ChartNoAxesCombined],
  ["Configuración", Settings],
] as const;

function Navigation({ clinicId }: { clinicId: string }) {
  return (
    <nav aria-label="Navegación de la clínica">
      <Link href={dashboardPath(clinicId)} aria-current="page">
        <LayoutDashboard size={19} aria-hidden="true" />
        Dashboard
      </Link>
      {modules.map(([name, Icon]) => (
        <button key={name} disabled>
          <Icon size={19} aria-hidden="true" />
          <span>{name}</span>
          <small>Próximamente</small>
        </button>
      ))}
    </nav>
  );
}

export function VeterinaryDashboard({ clinicId }: { clinicId: string }) {
  const router = useRouter();
  const { state, refresh, signOut, leaving, logoutError } =
    usePrivateWorkspace(clinicId);
  const [changing, setChanging] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1001px)");
    const closeOnDesktop = () => {
      if (desktop.matches) dialog.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  if (changing)
    return (
      <PrivateWorkspaceGate
        state={{ kind: "loading" }}
        changing
        onRetry={refresh}
      />
    );
  if (state.kind !== "ready")
    return <PrivateWorkspaceGate state={state} onRetry={refresh} />;
  // Only the backend's clinic access response grants entry or supplies the role.
  const { session, access } = state;
  if (!access)
    return (
      <PrivateWorkspaceGate
        state={{
          kind: "error",
          denied: true,
          message: "No fue posible verificar el acceso a esta clínica.",
        }}
        onRetry={refresh}
      />
    );
  const membership = session.memberships.find(
    (item) => item.clinic.id === access.id,
  );
  function closeMenu() {
    dialog.current?.close();
    menuButton.current?.focus();
  }
  return (
    <div className="pawly-dashboard">
      <aside className="dashboard-sidebar">
        <Brand inverse />
        <span className="dashboard-eyebrow">WORKSPACE</span>
        <Navigation clinicId={clinicId} />
        <div className="dashboard-sidebar-note">
          <ShieldCheck size={21} />
          <p>
            Tu clínica.
            <br />
            Un espacio conectado.
          </p>
        </div>
        <Link className="dashboard-back" href="/app">
          Cambiar de clínica <ArrowRight size={16} />
        </Link>
      </aside>
      <dialog
        ref={dialog}
        className="dashboard-mobile-menu"
        aria-label="Navegación móvil"
        onCancel={closeMenu}
      >
        <div className="dashboard-menu-heading">
          <Brand inverse />
          <button aria-label="Cerrar navegación" onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <Navigation clinicId={clinicId} />
        <Link className="dashboard-back" href="/app">
          Mis clínicas <ArrowRight size={16} />
        </Link>
      </dialog>
      <div className="dashboard-shell">
        <header className="dashboard-topbar">
          <button
            ref={menuButton}
            className="dashboard-menu-toggle"
            aria-label="Abrir navegación"
            onClick={() => dialog.current?.showModal()}
          >
            <Menu size={22} />
          </button>
          <div className="dashboard-clinic-picker">
            <Building2 size={21} aria-hidden="true" />
            <label>
              <span>CLÍNICA ACTIVA</span>
              <select
                aria-label="Cambiar clínica"
                value={clinicId}
                disabled={leaving}
                onChange={(event) => {
                  if (event.target.value === clinicId) return;
                  setChanging(true);
                  router.push(dashboardPath(event.target.value));
                }}
              >
                {session.memberships.map(({ clinic }) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="dashboard-user">
            <span className="dashboard-avatar" aria-hidden="true">
              {session.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{session.name}</strong>
              <span>{roleNames[access.role]}</span>
            </div>
          </div>
          <button
            className="dashboard-logout"
            onClick={() => void signOut()}
            disabled={leaving}
          >
            {leaving ? (
              <LoaderCircle className="auth-spinner" size={18} />
            ) : (
              <LogOut size={18} aria-hidden="true" />
            )}
            <span>{leaving ? "Cerrando sesión…" : "Cerrar sesión"}</span>
          </button>
        </header>
        <main className="dashboard-content">
          {logoutError && (
            <div className="auth-alert" role="alert">
              {logoutError}
            </div>
          )}
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
                "El registro de pacientes aún no está habilitado.",
              ],
              [
                "Agenda",
                CalendarDays,
                "Las citas estarán disponibles con el módulo de agenda.",
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
                  <strong>No disponible</strong>
                  <p>{String(description)}</p>
                </article>
              );
            })}
          </section>
          <div className="dashboard-panels">
            <section className="dashboard-panel" aria-labelledby="agenda-title">
              <div className="dashboard-panel-title">
                <h2 id="agenda-title">Tu próxima jornada</h2>
                <span>Agenda</span>
              </div>
              <div className="dashboard-empty">
                <CalendarDays size={30} aria-hidden="true" />
                <h3>La agenda está por llegar.</h3>
                <p>
                  Aquí podrás organizar las citas de tu clínica cuando el módulo
                  esté disponible.
                </p>
                <span className="dashboard-soon">Próximo desarrollo</span>
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
                    "Agenda y consultas",
                    "Organiza el día y el seguimiento clínico.",
                  ],
                ].map(([name, description]) => (
                  <div key={name}>
                    <PawPrint size={18} aria-hidden="true" />
                    <div>
                      <h3>{name}</h3>
                      <p>{description}</p>
                    </div>
                    <span>Próximamente</span>
                  </div>
                ))}
              </div>
              <button className="dashboard-refresh" onClick={refresh}>
                Volver a verificar mi acceso <ArrowRight size={16} />
              </button>
            </section>
          </div>
          <footer className="dashboard-footer">
            Pawly Workspace <span>Más tiempo para cuidar.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
