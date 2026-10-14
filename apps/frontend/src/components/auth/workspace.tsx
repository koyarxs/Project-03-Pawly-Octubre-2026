"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import {
  AuthError,
  authErrorMessage,
  checkClinicAccess,
  getSession,
  logout,
  type Session,
  type ClinicRole,
} from "@/lib/auth";
const roleNames: Record<ClinicRole, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  VETERINARIAN: "Veterinario",
  RECEPTIONIST: "Recepción",
};
type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; session: Session };
export function Workspace() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<Awaited<
    ReturnType<typeof checkClinicAccess>
  > | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [leaving, setLeaving] = useState(false);
  const selection = useRef<AbortController | null>(null);
  const logoutLock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    getSession(controller.signal)
      .then((session) => {
        if (!controller.signal.aborted) setState({ kind: "ready", session });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof AuthError && error.status === 401)
          router.replace("/iniciar-sesion");
        else
          setState({
            kind: "error",
            message: authErrorMessage(error, "workspace"),
          });
      });
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      selection.current?.abort();
      setSelected(null);
      setChecking(null);
      setMessage("");
      setState({ kind: "loading" });
      setRetry((v) => v + 1);
    };
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    window.addEventListener("pageshow", restored);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      controller.abort();
      selection.current?.abort();
      window.removeEventListener("pageshow", restored);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [retry, router]);
  function refresh() {
    selection.current?.abort();
    setSelected(null);
    setChecking(null);
    setMessage("");
    setState({ kind: "loading" });
    setRetry((v) => v + 1);
  }
  function expired() {
    selection.current?.abort();
    setSelected(null);
    setState({ kind: "loading" });
    router.replace("/iniciar-sesion");
  }
  async function selectClinic(id: string) {
    selection.current?.abort();
    const controller = new AbortController();
    selection.current = controller;
    setSelected(null);
    setChecking(id);
    setMessage("");
    try {
      const access = await checkClinicAccess(id, controller.signal);
      if (!controller.signal.aborted) setSelected(access);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof AuthError && error.status === 401) expired();
      else setMessage(authErrorMessage(error, "access"));
    } finally {
      if (!controller.signal.aborted) setChecking(null);
    }
  }
  async function signOut() {
    if (logoutLock.current) return;
    logoutLock.current = true;
    selection.current?.abort();
    setChecking(null);
    setLeaving(true);
    setMessage("");
    try {
      await logout();
      expired();
    } catch (error) {
      if (error instanceof AuthError && error.status === 401) expired();
      else setMessage(authErrorMessage(error, "logout"));
    } finally {
      logoutLock.current = false;
      setLeaving(false);
    }
  }
  if (state.kind !== "ready")
    return (
      <main className="pawly-workspace workspace-gate">
        <Brand />
        <div role={state.kind === "loading" ? "status" : "alert"}>
          {state.kind === "loading" ? (
            <>
              <LoaderCircle
                className="auth-spinner"
                size={28}
                aria-hidden="true"
              />
              <h1>Preparando tu espacio…</h1>
              <p>Estamos comprobando tu sesión.</p>
            </>
          ) : (
            <>
              <h1>No pudimos abrir tu espacio.</h1>
              <p>{state.message}</p>
              <button className="auth-submit" onClick={refresh}>
                Volver a intentar <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>
      </main>
    );
  const { session } = state;
  return (
    <div className="pawly-workspace workspace-layout">
      <aside className="workspace-sidebar">
        <Brand />
        <span className="workspace-label">WORKSPACE</span>
        <nav aria-label="Espacio de trabajo">
          <span className="workspace-nav-current">
            <LayoutDashboard size={19} aria-hidden="true" /> Mi espacio
          </span>
        </nav>
        <div className="workspace-sidebar-bottom">
          <ShieldCheck size={20} aria-hidden="true" />
          <p>
            Un espacio privado,
            <br />
            conectado a tu equipo.
          </p>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-topbar">
          <span>
            Workspace <ChevronRight size={15} aria-hidden="true" /> Mi espacio
          </span>
          <button
            onClick={signOut}
            disabled={leaving}
            className="workspace-logout"
          >
            {leaving ? (
              <LoaderCircle size={17} className="auth-spinner" />
            ) : (
              <LogOut size={17} aria-hidden="true" />
            )}
            {leaving ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </header>
        <main className="workspace-content">
          <div className="workspace-welcome">
            <span className="auth-kicker">TU ESPACIO DE TRABAJO</span>
            <h1>Hola, {session.name}.</h1>
            <p>Tu equipo y tus clínicas, en un mismo lugar.</p>
          </div>
          {message && (
            <div role="alert" className="auth-alert">
              {message}
              {message.includes("clínica") && (
                <button onClick={refresh} className="workspace-refresh">
                  Actualizar clínicas
                </button>
              )}
            </div>
          )}
          <section aria-labelledby="clinics-heading">
            <div className="workspace-section-heading">
              <div>
                <h2 id="clinics-heading">Tus clínicas</h2>
                <p>Selecciona la clínica con la que quieres trabajar.</p>
              </div>
              <span>
                {session.memberships.length}{" "}
                {session.memberships.length === 1
                  ? "clínica disponible"
                  : "clínicas disponibles"}
              </span>
            </div>
            {session.memberships.length === 0 ? (
              <div className="workspace-empty">
                <Building2 size={30} aria-hidden="true" />
                <h3>Aún no tienes clínicas disponibles.</h3>
                <p>
                  Tu cuenta está activa, pero no tiene una membresía de clínica
                  activa. Contacta al responsable de tu clínica.
                </p>
                <button onClick={refresh} className="workspace-refresh">
                  Actualizar clínicas
                </button>
              </div>
            ) : (
              <div className="workspace-clinics">
                {session.memberships.map(({ clinic, role }) => (
                  <button
                    key={clinic.id}
                    className={`workspace-clinic ${selected?.id === clinic.id ? "is-selected" : ""}`}
                    onClick={() => void selectClinic(clinic.id)}
                    disabled={leaving}
                    aria-pressed={selected?.id === clinic.id}
                    aria-busy={checking === clinic.id}
                  >
                    <span className="workspace-clinic-icon">
                      <Building2 size={24} aria-hidden="true" />
                    </span>
                    <span className="workspace-clinic-detail">
                      <strong>{clinic.name}</strong>
                      <span>{roleNames[role]}</span>
                    </span>
                    <span className="workspace-clinic-action">
                      {checking === clinic.id ? (
                        <LoaderCircle className="auth-spinner" size={20} />
                      ) : selected?.id === clinic.id ? (
                        <Check size={20} />
                      ) : (
                        <ArrowRight size={20} />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
          {selected && (
            <section
              className="workspace-active"
              aria-label="Clínica seleccionada"
              role="status"
            >
              <span className="workspace-active-badge">
                <ShieldCheck size={17} /> Acceso verificado
              </span>
              <h2>{selected.name}</h2>
              <p>
                Estás trabajando con el rol de{" "}
                <strong>{roleNames[selected.role].toLowerCase()}</strong>. Este
                es el espacio inicial de tu clínica; las herramientas de gestión
                estarán disponibles en próximas etapas.
              </p>
            </section>
          )}
          <footer className="workspace-footer">
            Pawly Workspace <span>Más tiempo para cuidar.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
