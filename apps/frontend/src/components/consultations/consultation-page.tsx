"use client";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { canReadClinical } from "@/lib/consultations";
import { ConsultationList } from "./consultation-list";
import { ConsultationDetail } from "./consultation-detail";
import { NewConsultation } from "./consultation-form";
import "./consultations.css";
export function ConsultationPage({
  clinicId,
  id,
  newRecord,
  patientId,
  appointmentId,
}: {
  clinicId: string;
  id?: string;
  newRecord?: boolean;
  patientId?: string;
  appointmentId?: string;
}) {
  return (
    <WorkspaceShell clinicId={clinicId} section="consultas">
      {(context) => (
        <div
          className="medical-workspace"
          key={`${clinicId}:${context.revision}`}
        >
          {!canReadClinical(context.access) ? (
            <section className="medical-panel">
              <h1>Acceso clínico restringido</h1>
              <p>
                Tu rol permite gestionar datos administrativos. Las consultas
                requieren un rol clínico autorizado.
              </p>
            </section>
          ) : id ? (
            <ConsultationDetail context={context} id={id} />
          ) : newRecord &&
            !context.access.permissions.includes("consultation:write") ? (
            <section role="alert">
              <h1>No tienes permiso para registrar consultas.</h1>
            </section>
          ) : newRecord ? (
            <NewConsultation
              context={context}
              patientId={patientId}
              appointmentId={appointmentId}
            />
          ) : (
            <ConsultationList context={context} />
          )}
        </div>
      )}
    </WorkspaceShell>
  );
}
