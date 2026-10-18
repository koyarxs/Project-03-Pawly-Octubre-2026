"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
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
import {
  dashboardPath,
  workspacePath,
  roleNames,
  type WorkspaceSection,
} from "@/lib/workspace";
import type { Session } from "@/lib/auth";
import type { WorkspaceState } from "@/components/auth/use-private-workspace";
export type WorkspaceContext = {
  clinicId: string;
  session: Session;
  access: NonNullable<Extract<WorkspaceState, { kind: "ready" }>["access"]>;
  refresh: () => void;
  endSession: () => void;
  revision: number;
};
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

function Navigation({
  clinicId,
  section,
  clinical,
}: {
  clinicId: string;
  section: WorkspaceSection;
  clinical: boolean;
}) {
  return (
    <nav aria-label="Navegación de la clínica">
      <Link
        href={dashboardPath(clinicId)}
        aria-current={section === "dashboard" ? "page" : undefined}
      >
        <LayoutDashboard size={19} aria-hidden="true" />
        Dashboard
      </Link>
      {modules.map(([name, Icon]) =>
        name === "Tutores" ||
        name === "Pacientes" ||
        name === "Agenda" ||
        (name === "Consultas" && clinical) ? (
          <Link
            key={name}
            href={workspacePath(
              clinicId,
              name === "Consultas"
                ? "consultas"
                : name === "Agenda"
                  ? "agenda"
                  : name === "Tutores"
                    ? "tutores"
                    : "pacientes",
            )}
            aria-current={
              section ===
              (name === "Consultas"
                ? "consultas"
                : name === "Agenda"
                  ? "agenda"
                  : name === "Tutores"
                    ? "tutores"
                    : "pacientes")
                ? "page"
                : undefined
            }
          >
            <Icon size={19} aria-hidden="true" />
            {name}
          </Link>
        ) : (
          <button key={name} disabled>
            <Icon size={19} aria-hidden="true" />
            <span>{name}</span>
            <small>
              {name === "Consultas" ? "Acceso clínico" : "Próximamente"}
            </small>
          </button>
        ),
      )}
    </nav>
  );
}

export function WorkspaceShell({
  clinicId,
  section = "dashboard",
  children,
}: {
  clinicId: string;
  section?: WorkspaceSection;
  children: (context: WorkspaceContext) => ReactNode;
}) {
  const router = useRouter();
  const {
    state,
    refresh,
    signOut,
    leaving,
    logoutError,
    revalidationError,
    endSession,
    revision,
  } = usePrivateWorkspace(clinicId);
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
  function closeMenu() {
    dialog.current?.close();
    menuButton.current?.focus();
  }
  return (
    <div className="pawly-dashboard">
      <aside className="dashboard-sidebar">
        <Brand inverse />
        <span className="dashboard-eyebrow">WORKSPACE</span>
        <Navigation
          clinicId={clinicId}
          section={section}
          clinical={access.role !== "RECEPTIONIST"}
        />
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
        <Navigation
          clinicId={clinicId}
          section={section}
          clinical={access.role !== "RECEPTIONIST"}
        />
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
                  router.push(workspacePath(event.target.value, section));
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
          {revalidationError && (
            <div role="status" className="auth-alert">
              {revalidationError}
            </div>
          )}
          {children({
            clinicId,
            access,
            session,
            refresh,
            endSession,
            revision,
          })}
          <footer className="dashboard-footer">
            Pawly Workspace <span>Más tiempo para cuidar.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
