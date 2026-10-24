"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  ClipboardList,
  Globe,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  PawPrint,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { PrivateWorkspaceGate } from "@/components/auth/private-workspace-gate";
import { usePrivateWorkspace } from "@/components/auth/use-private-workspace";
import {
  workspacePath,
  roleNames,
  type WorkspaceSection,
} from "@/lib/workspace";
import type { Session, ClinicAccess } from "@/lib/auth";
import { hasPermission, sectionPermissions } from "@/lib/permissions";
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
  ["dashboard", "Dashboard", LayoutDashboard],
  ["agenda", "Agendamiento", CalendarDays],
  ["tutores", "Tutores", Users],
  ["pacientes", "Pacientes", PawPrint],
  ["consultas", "Consultas", ClipboardList],
  ["personal", "Personal y Accesos", ShieldCheck],
  ["sitio-web", "Sitio web", Globe],
  ["mi-perfil", "Mi perfil público", Users],
] as const;
function Navigation({
  clinicId,
  section,
  access,
}: {
  clinicId: string;
  section: WorkspaceSection;
  access: ClinicAccess;
}) {
  return (
    <nav aria-label="Navegación de la clínica">
      {modules
        .filter(([key]) => hasPermission(access, sectionPermissions[key]))
        .map(([key, label, Icon]) => (
          <Link
            key={key}
            href={workspacePath(clinicId, key)}
            aria-current={section === key ? "page" : undefined}
          >
            <Icon size={19} aria-hidden="true" />
            {label}
          </Link>
        ))}
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
  const [menuOpen, setMenuOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1001px)");
    const closeOnDesktop = () => {
      if (desktop.matches) {
        dialog.current?.close();
        setMenuOpen(false);
      }
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
  const sectionAllowed = hasPermission(access, sectionPermissions[section]);
  function closeMenu() {
    dialog.current?.close();
    setMenuOpen(false);
    menuButton.current?.focus();
  }
  return (
    <div className="pawly-dashboard">
      <a className="dashboard-skip-link" href="#contenido-clinica">
        Saltar al contenido de la clínica
      </a>
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-brand">
          <Brand inverse />
          <span>GESTIÓN VETERINARIA</span>
        </div>
        <span className="dashboard-eyebrow">ESPACIO CLÍNICO</span>
        <Navigation clinicId={clinicId} section={section} access={access} />
        <div className="dashboard-sidebar-note">
          <ShieldCheck size={21} />
          <p>
            Cada cuidado, conectado.
            <br />
            Tu equipo en un mismo lugar.
          </p>
        </div>
        <Link className="dashboard-back" href="/app">
          Cambiar de clínica <ArrowRight size={16} />
        </Link>
      </aside>
      <dialog
        ref={dialog}
        id="navegacion-clinica-movil"
        className="dashboard-mobile-menu"
        aria-label="Navegación móvil"
        onCancel={closeMenu}
        onClose={() => setMenuOpen(false)}
      >
        <div className="dashboard-menu-heading">
          <Brand inverse />
          <button aria-label="Cerrar navegación" onClick={closeMenu}>
            <X size={22} />
          </button>
        </div>
        <Navigation clinicId={clinicId} section={section} access={access} />
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
            aria-expanded={menuOpen}
            aria-controls="navegacion-clinica-movil"
            onClick={() => {
              dialog.current?.showModal();
              setMenuOpen(true);
            }}
          >
            <Menu size={22} />
          </button>
          <div className="dashboard-clinic-picker">
            <Building2 size={21} aria-hidden="true" />
            <label>
              <span>TU CLÍNICA</span>
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
                    {clinic.name.replace(/\s*·?\s*DEMOSTRACIÓN.*$/u, "").trim()}
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
        <main
          className="dashboard-content"
          id="contenido-clinica"
          tabIndex={-1}
        >
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
          {sectionAllowed ? (
            <>
              {session.memberships
                .find((m) => m.clinic.id === clinicId)
                ?.clinic.name.includes("DEMOSTRACIÓN") && (
                <p role="note" style={{ fontSize: 11, color: "#637b70", margin: "0 0 18px", lineHeight: 1.6 }}>
                  Proyecto personal · Personas, pacientes y atenciones ficticios.
                </p>
              )}
              {children({
                clinicId,
                access,
                session,
                refresh,
                endSession,
                revision,
              })}
            </>
          ) : (
            <section className="dashboard-panel" role="alert">
              <h1>
                {section === "consultas"
                  ? "Acceso clínico restringido"
                  : section === "sitio-web"
                    ? "Administración del sitio restringida"
                    : "No tienes permiso para este módulo."}
              </h1>
              <p>
                Tu cuenta mantiene acceso a esta clínica, pero no a este módulo.
                Solicita los permisos correspondientes a un administrador.
              </p>
              <Link
                className="dashboard-available"
                href={workspacePath(clinicId, "dashboard")}
              >
                Volver al dashboard <ArrowRight size={16} />
              </Link>
            </section>
          )}
          <footer className="dashboard-footer">
            Pawly <span>Más tiempo para cuidar.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
