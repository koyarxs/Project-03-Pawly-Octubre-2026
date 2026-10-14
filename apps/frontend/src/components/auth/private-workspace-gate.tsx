import Link from "next/link";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import type { WorkspaceState } from "./use-private-workspace";
export function PrivateWorkspaceGate({
  state,
  onRetry,
  changing = false,
}: {
  state: Exclude<WorkspaceState, { kind: "ready" }>;
  onRetry?: () => void;
  changing?: boolean;
}) {
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
            <h1>
              {changing ? "Cambiando de clínica…" : "Preparando tu espacio…"}
            </h1>
            <p>Estamos comprobando tu sesión y tu acceso.</p>
          </>
        ) : (
          <>
            <ShieldCheck size={30} aria-hidden="true" />
            <h1>
              {state.denied
                ? "No tienes acceso a esta clínica."
                : "No pudimos abrir tu espacio."}
            </h1>
            <p>{state.message}</p>
            {onRetry && (
              <button className="auth-submit" onClick={onRetry}>
                Volver a intentar <ArrowRight size={18} />
              </button>
            )}
            <Link className="workspace-refresh" href="/app">
              Volver a mis clínicas
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
