"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AuthError,
  authErrorMessage,
  checkClinicAccess,
  getSession,
  logout,
  type Session,
} from "@/lib/auth";
export type WorkspaceState =
  | { kind: "loading" }
  | { kind: "error"; message: string; denied: boolean }
  | {
      kind: "ready";
      session: Session;
      access: Awaited<ReturnType<typeof checkClinicAccess>> | null;
    };
export function usePrivateWorkspace(clinicId?: string) {
  const router = useRouter();
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{
    key: string | undefined;
    revision: number;
    value: WorkspaceState;
  }>({ key: clinicId, revision: 0, value: { kind: "loading" } });
  const [ending, setEnding] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [revalidationError, setRevalidationError] = useState("");
  const verifiedUser = useRef<string | null>(null);
  const verifiedAccess = useRef<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const logoutLock = useRef(false);
  const endSession = useCallback(() => {
    pending.current?.abort();
    setEnding(true);
    router.replace("/iniciar-sesion");
  }, [router]);
  useEffect(() => {
    let controller = new AbortController();
    let checking = false;
    async function verify(background = false) {
      if (checking) return;
      checking = true;
      controller = new AbortController();
      pending.current = controller;
      try {
        const session = await getSession(controller.signal);
        if (controller.signal.aborted) return;
        // Clear the previous account's UI before requesting any new access.
        if (
          background &&
          verifiedUser.current &&
          verifiedUser.current !== session.id
        ) {
          setRevision((value) => value + 1);
          return;
        }
        if (
          clinicId &&
          !session.memberships.some(({ clinic }) => clinic.id === clinicId)
        )
          throw new AuthError(403);
        const access = clinicId
          ? await checkClinicAccess(clinicId, controller.signal)
          : null;
        if (!controller.signal.aborted) {
          const fingerprint = JSON.stringify(
            access && {
              id: access.id,
              membershipId: access.membershipId,
              role: access.role,
              permissions: access.permissions,
              accessVersion: access.accessVersion,
              patientScope: access.patientScope,
              medicalPracticeEnabled: access.medicalPracticeEnabled,
            },
          );
          if (
            background &&
            verifiedAccess.current !== null &&
            verifiedAccess.current !== fingerprint
          ) {
            verifiedAccess.current = fingerprint;
            setRevision((value) => value + 1);
            return;
          }
          verifiedAccess.current = fingerprint;
          verifiedUser.current = session.id;
          setRevalidationError("");
          setSnapshot({
            key: clinicId,
            revision,
            value: { kind: "ready", session, access },
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof AuthError && error.status === 401) {
          setEnding(true);
          router.replace("/iniciar-sesion");
          return;
        }
        const denied = Boolean(
          error instanceof AuthError &&
          (error.status === 403 ||
            (clinicId && [400, 404].includes(error.status))),
        );
        if (background && verifiedUser.current && !denied) {
          setRevalidationError(
            "No pudimos volver a verificar tu sesión. Conservamos lo que estás escribiendo; vuelve a la pestaña para reintentar.",
          );
          return;
        }
        setSnapshot({
          key: clinicId,
          revision,
          value: {
            kind: "error",
            denied,
            message: denied
              ? "La clínica solicitada no está disponible para tu cuenta. Selecciona una clínica autorizada."
              : authErrorMessage(error, "workspace"),
          },
        });
      } finally {
        checking = false;
      }
    }
    void verify();
    const refresh = () => {
      if (document.visibilityState === "visible") {
        // Recheck permissions without unmounting the current form or changing
        // its revision. Initial entry and explicit refresh still fail closed.
        void verify(true);
      }
    };
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", restore);
    const accessTimer = window.setInterval(refresh, 30_000);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pageshow", restore);
      window.clearInterval(accessTimer);
    };
  }, [clinicId, revision, router]);
  function refresh() {
    pending.current?.abort();
    setLogoutError("");
    setRevision((v) => v + 1);
  }
  async function signOut() {
    if (logoutLock.current) return;
    logoutLock.current = true;
    setLeaving(true);
    setLogoutError("");
    try {
      await logout();
      endSession();
    } catch (error) {
      if (error instanceof AuthError && error.status === 401) endSession();
      else setLogoutError(authErrorMessage(error, "logout"));
    } finally {
      logoutLock.current = false;
      setLeaving(false);
    }
  }
  const state: WorkspaceState =
    ending || snapshot.key !== clinicId || snapshot.revision !== revision
      ? { kind: "loading" }
      : snapshot.value;
  return {
    state,
    revision,
    refresh,
    endSession,
    signOut,
    leaving,
    logoutError,
    revalidationError,
  };
}
