"use client";
import { useEffect, useRef, useState } from "react";
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
  const pending = useRef<AbortController | null>(null);
  const logoutLock = useRef(false);
  function endSession() {
    pending.current?.abort();
    setEnding(true);
    router.replace("/iniciar-sesion");
  }
  useEffect(() => {
    const controller = new AbortController();
    pending.current = controller;
    async function verify() {
      try {
        const session = await getSession(controller.signal);
        const access = clinicId
          ? await checkClinicAccess(clinicId, controller.signal)
          : null;
        if (!controller.signal.aborted)
          setSnapshot({
            key: clinicId,
            revision,
            value: { kind: "ready", session, access },
          });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (error instanceof AuthError && error.status === 401) {
          setEnding(true);
          router.replace("/iniciar-sesion");
          return;
        }
        const denied = Boolean(
          clinicId &&
          error instanceof AuthError &&
          [400, 403, 404].includes(error.status),
        );
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
      }
    }
    void verify();
    const refresh = () => {
      if (document.visibilityState === "visible") {
        controller.abort();
        setLogoutError("");
        setRevision((v) => v + 1);
      }
    };
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", restore);
    return () => {
      controller.abort();
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("pageshow", restore);
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
  };
}
