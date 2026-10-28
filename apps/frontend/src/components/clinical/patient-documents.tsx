"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FileText, Upload } from "lucide-react";
import { request } from "@/lib/auth";
import type { WorkspaceContext } from "@/components/workspace/workspace-shell";
type Document = { id: string; name: string; size: number; createdAt: string };
export function PatientDocuments({ context, patientId, active }: { context: WorkspaceContext; patientId: string; active: boolean }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const path = `/clinics/${encodeURIComponent(context.clinicId)}/patients/${encodeURIComponent(patientId)}/documents`;
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  useEffect(() => {
    const controller = new AbortController();
    void request(path, undefined, controller.signal).then((value) => {
      if (!controller.signal.aborted) setDocuments(value as Document[]);
    }).catch(() => { if (!controller.signal.aborted) setMessage("No se pudieron cargar los documentos. Actualiza la ficha para reintentar."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [path]);
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024) { setMessage("Selecciona un PDF, JPG o PNG de hasta 5 MB."); return; }
    lock.current = true; setBusy(true); setMessage("");
    try {
      const response = await fetch(`${base}${path}`, { method:"POST", credentials:"include", headers:{"X-Pawly-CSRF":"1"}, body:data, signal:AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error();
      const document = await response.json() as Document;
      setDocuments((current) => [document, ...current]); form.reset(); setMessage("Documento guardado en la ficha.");
    } catch { setMessage("No se pudo guardar. Comprueba el formato, tamaño y tus permisos antes de reintentar."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function download(document: Document) {
    try {
      const response = await fetch(`${base}${path}/${document.id}`, {credentials:"include",cache:"no-store",signal:AbortSignal.timeout(30000)});
      if (!response.ok) throw new Error();
      const url=URL.createObjectURL(await response.blob());
      const link=window.document.createElement("a"); link.href=url; link.download=document.name; link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch {setMessage("No se pudo descargar el documento. Verifica tu acceso.");}
  }
  return <section className="clinical-detail-card" style={{marginTop:24}} aria-labelledby="patient-documents-title">
    <h2 id="patient-documents-title"><FileText size={20} aria-hidden="true" /> Documentos clínicos</h2>
    <p>Exámenes, resultados e indicaciones asociados a esta mascota.</p>
    {message && <p role="status">{message}</p>}
    {loading ? <p>Cargando documentos…</p> : documents.length ? <ul>{documents.map((document) => <li key={document.id} style={{paddingBlock:10}}><button type="button" className="clinical-secondary" onClick={()=>void download(document)}>{document.name} · {Math.ceil(document.size/1024)} KB</button> <small>{new Date(document.createdAt).toLocaleDateString("es-CL")}</small></li>)}</ul> : <p>Aún no hay documentos adjuntos.</p>}
    {active && context.access.permissions.includes("consultation:write") && <form onSubmit={(event)=>void upload(event)} style={{display:"grid",gap:12,marginTop:20}}>
      <label htmlFor="patient-file">Adjuntar documento · PDF, JPG o PNG · Máximo 5 MB</label>
      <input id="patient-file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required disabled={busy} />
      <button className="clinical-secondary" disabled={busy || loading || !base}><Upload size={16} />{busy ? "Guardando…" : "Guardar documento"}</button>
    </form>}
  </section>;
}
