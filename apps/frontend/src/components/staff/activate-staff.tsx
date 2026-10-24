"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { request } from "@/lib/auth";
import { staffError } from "@/lib/staff";
import "./staff.css";
export function ActivateStaff() {
  const token = useRef(""),
    lock = useRef(false);
  const [invitation, setInvitation] = useState<{
      clinicName: string;
      mode: string;
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState(false);
  useEffect(() => {
    if (!token.current)
      token.current =
        new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
    window.history.replaceState(null, "", window.location.pathname);
    const controller = new AbortController();
    if (!/^[A-Za-z0-9_-]{43}$/.test(token.current)) {
      setError(
        "El enlace está incompleto. Solicita una nueva invitación a tu clínica.",
      );
      return;
    }
    void request(
      "/auth/staff-invitations/inspect",
      { token: token.current },
      controller.signal,
    )
      .then((value) => {
        if (!controller.signal.aborted)
          setInvitation(value as { clinicName: string; mode: string });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Esta invitación expiró o ya fue utilizada. Solicita un nuevo enlace.",
          );
      });
    return () => controller.abort();
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current) return;
    const d = new FormData(e.currentTarget);
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await request("/auth/staff-invitations/accept", {
        token: token.current,
        password: String(d.get("password") ?? ""),
      });
      token.current = "";
      setDone(true);
    } catch (e) {
      setError(staffError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className="staff-activation staff-form">
      <span className="pw-eyebrow">PAWLY · ACCESO AL EQUIPO</span>
      <h1>{done ? "Tu acceso está activado" : "Te damos la bienvenida"}</h1>
      {error && <p role="alert">{error}</p>}
      {done ? (
        <>
          <p>
            Ya puedes iniciar sesión con tu correo y contraseña para entrar a
            las clínicas autorizadas.
          </p>
          <Link href="/iniciar-sesion">Iniciar sesión</Link>
        </>
      ) : invitation ? (
        <form className="staff-form" onSubmit={(e) => void submit(e)}>
          <p>
            Invitación a <strong>{invitation.clinicName}</strong>.
          </p>
          <p>
            {invitation.mode === "CREATE_PASSWORD"
              ? "Crea tu contraseña de al menos 15 caracteres. El enlace se puede utilizar una sola vez."
              : "Ya tienes una cuenta de Pawly. Confirma tu contraseña actual; no se modificará."}
          </p>
          <label>
            {invitation.mode === "CREATE_PASSWORD"
              ? "Nueva contraseña"
              : "Contraseña actual"}
            <input
              name="password"
              type="password"
              autoComplete={
                invitation.mode === "CREATE_PASSWORD"
                  ? "new-password"
                  : "current-password"
              }
              minLength={invitation.mode === "CREATE_PASSWORD" ? 15 : 1}
              maxLength={128}
              required
            />
          </label>
          <button className="staff-primary" disabled={busy}>
            {busy ? "Activando…" : "Activar acceso"}
          </button>
        </form>
      ) : !error ? (
        <p role="status">Verificando invitación…</p>
      ) : (
        <Link href="/iniciar-sesion">Volver al inicio de sesión</Link>
      )}
    </main>
  );
}
