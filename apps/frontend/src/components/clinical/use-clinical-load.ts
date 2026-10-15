"use client";
import { useEffect, useState } from "react";
import { AuthError } from "@/lib/auth";
import { clinicalError } from "@/lib/clinical";
import type { WorkspaceContext } from "@/components/workspace/workspace-shell";

type Result<T> =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; data: T };
export function useClinicalLoad<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  context: WorkspaceContext,
) {
  const [revision, setRevision] = useState(0);
  const lookup = `${key}:${revision}`;
  const [snapshot, setSnapshot] = useState<{ key: string; result: Result<T> }>({
    key: "",
    result: { kind: "loading" },
  });
  const { endSession } = context;
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setSnapshot({ key: lookup, result: { kind: "ready", data } });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof AuthError && error.status === 401) {
          endSession();
          return;
        }
        setSnapshot({
          key: lookup,
          result: { kind: "error", message: clinicalError(error) },
        });
      });
    return () => controller.abort();
  }, [lookup, load, endSession]);
  return {
    state:
      snapshot.key === lookup
        ? snapshot.result
        : ({ kind: "loading" } as Result<T>),
    retry: () => setRevision((value) => value + 1),
  };
}
