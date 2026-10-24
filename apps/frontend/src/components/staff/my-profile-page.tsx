"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  WorkspaceShell,
  type WorkspaceContext,
} from "@/components/workspace/workspace-shell";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from "@/components/ui/workspace-ui";
import { getMyProfile, staffError, staffMutation } from "@/lib/staff";
import { AuthError } from "@/lib/auth";
import { jobNames } from "@/lib/permissions";
import "./staff.css";
export function MyProfilePage({ clinicId }: { clinicId: string }) {
  return (
    <WorkspaceShell clinicId={clinicId} section="mi-perfil">
      {(context) => (
        <ProfileConsent
          key={`${clinicId}:${context.revision}`}
          context={context}
        />
      )}
    </WorkspaceShell>
  );
}
function ProfileConsent({ context }: { context: WorkspaceContext }) {
  const { clinicId, endSession } = context;
  const [data, setData] = useState<Awaited<
      ReturnType<typeof getMyProfile>
    > | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    void getMyProfile(clinicId, controller.signal)
      .then((v) => {
        if (!controller.signal.aborted) setData(v);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          if (e instanceof AuthError && e.status === 401) endSession();
          else setError(staffError(e));
        }
      });
    return () => controller.abort();
  }, [clinicId, endSession]);
  async function consent(e: FormEvent<HTMLFormElement>, value: boolean) {
    e.preventDefault();
    if (lock.current || !data?.profile) return;
    const d = new FormData(e.currentTarget);
    lock.current = true;
    setBusy(true);
    try {
      await staffMutation(
        context.clinicId,
        "/me/consent",
        {
          version: data.profile.version,
          consent: value,
          reason: String(d.get("reason") ?? "").trim(),
        },
        "POST",
      );
      context.refresh();
    } catch (e) {
      setError(staffError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const p = data?.profile;
  return (
    <section className="staff-workspace">
      <PageHeader
        eyebrow="TU PRESENTACIÓN PROFESIONAL"
        title="Mi perfil público"
        description="Revisa el contenido exacto antes de autorizar su publicación. Tu cuenta interna nunca se publica automáticamente."
      />
      {error && (
        <p role="alert" className="auth-alert">
          {error}
        </p>
      )}
      {!data && !error ? (
        <LoadingState label="Cargando tu perfil…" />
      ) : !data ? (
        <button className="staff-secondary" onClick={context.refresh}>
          Reintentar
        </button>
      ) : !p ? (
        <EmptyState
          title="Tu perfil aún no está preparado"
          description="Solicita al administrador que complete tu presentación desde Personal y Accesos. Después podrás revisarla aquí."
        />
      ) : (
        <>
          <article className="staff-consent-preview">
            <StatusBadge tone={p.publishedAt ? "positive" : "neutral"}>
              {p.publishedAt ? "Existe una versión publicada" : "No publicado"}
            </StatusBadge>
            <h2>{p.displayName}</h2>
            <strong>{jobNames[p.job]}</strong>
            <p>{p.specialty}</p>
            <p>{p.biography || "Sin descripción."}</p>
            <p>
              Fotografía:{" "}
              {p.photoKey === "initials"
                ? "Avatar con iniciales"
                : "Imagen ilustrativa de demostración"}
              .
            </p>
            <p className="staff-hint">
              Solo se publican nombre, cargo, especialidad, descripción y
              fotografía. Tu correo de acceso, teléfono interno, número de
              registro y credenciales permanecen privados.
            </p>
          </article>
          <form
            className="staff-panel staff-form"
            onSubmit={(e) => void consent(e, true)}
          >
            <h2>Autorizar este borrador</h2>
            <p>
              Al autorizar, confirmas que revisaste el contenido anterior y
              permites que la clínica publique esa versión en su sitio. El
              administrador deberá publicarla por separado. Una modificación
              posterior requiere una nueva autorización.
            </p>
            <label>
              Motivo o constancia
              <textarea
                name="reason"
                required
                minLength={3}
                maxLength={500}
                defaultValue="Revisé mi perfil y autorizo esta presentación pública."
              />
            </label>
            <button className="staff-primary" disabled={busy}>
              Autorizar contenido revisado
            </button>
          </form>
          <form
            className="staff-panel staff-form"
            onSubmit={(e) => void consent(e, false)}
          >
            <h2>Retirar mi consentimiento</h2>
            <p>
              El perfil público se ocultará inmediatamente y se conservará la
              constancia en la auditoría.
            </p>
            <label>
              Motivo del retiro
              <textarea name="reason" required minLength={3} maxLength={500} />
            </label>
            <button
              className="staff-secondary"
              disabled={busy || (!p.publicConsentAt && !p.publishedAt)}
            >
              Retirar consentimiento y ocultar
            </button>
          </form>
        </>
      )}
    </section>
  );
}
