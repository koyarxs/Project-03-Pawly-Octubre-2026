"use client";
import { useEffect, useState, useCallback } from "react";
import { AuthError } from "@/lib/auth";
import { consultationError } from "@/lib/consultations";
import type { WorkspaceContext } from "@/components/workspace/workspace-shell";
export function useClinicalResource<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
  context: WorkspaceContext,
): { data?: T; error?: string; retry: () => void } {
  const [revision, setRevision] = useState(0),
    [snapshot, setSnapshot] = useState<{
      key: string;
      data?: T;
      error?: string;
    }>({ key: "" });
  const lookup = `${key}:${revision}`;
  const { endSession } = context;
  useEffect(() => {
    const c = new AbortController();
    load(c.signal)
      .then((data) => {
        if (!c.signal.aborted) setSnapshot({ key: lookup, data });
      })
      .catch((e) => {
        if (c.signal.aborted) return;
        if (e instanceof AuthError && e.status === 401) endSession();
        else setSnapshot({ key: lookup, error: consultationError(e) });
      });
    return () => c.abort();
  }, [lookup, load, endSession]);
  const retry = useCallback(() => setRevision((v) => v + 1), []);
  return { ...(snapshot.key === lookup ? snapshot : {}), retry };
}
