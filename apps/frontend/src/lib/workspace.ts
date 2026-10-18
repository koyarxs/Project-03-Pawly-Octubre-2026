import type { ClinicRole } from "./auth";
export const roleNames: Record<ClinicRole, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  VETERINARIAN: "Veterinario",
  RECEPTIONIST: "Recepción",
};
export function dashboardPath(clinicId: string): string {
  return `/app/clinicas/${encodeURIComponent(clinicId)}/dashboard`;
}
export type WorkspaceSection = "dashboard" | "tutores" | "pacientes" | "agenda";
export function workspacePath(
  clinicId: string,
  section: WorkspaceSection,
): string {
  return `/app/clinicas/${encodeURIComponent(clinicId)}/${section}`;
}
