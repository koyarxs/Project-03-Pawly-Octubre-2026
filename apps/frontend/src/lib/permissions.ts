import type { ClinicAccess } from "./auth";
export const hasPermission = (
  access: Pick<ClinicAccess, "permissions">,
  permission: string,
) => access.permissions.includes(permission);
export const sectionPermissions = {
  tutores: "tutor:read",
  pacientes: "patient:read",
  agenda: "appointment:read",
  consultas: "consultation:read",
  "sitio-web": "clinic:manage",
  personal: "staff:read",
  "mi-perfil": "clinic:read",
  dashboard: "clinic:read",
} as const;
export const jobNames: Record<string, string> = {
  CLINIC_DIRECTOR: "Director Médico & Administrador General",
  VETERINARIAN: "Médico Veterinario Principal",
  VET_TECHNICIAN: "Técnico en Enfermería Veterinaria",
  RECEPTIONIST: "Coordinador de Experiencia y Recepción",
  PET_GROOMER: "Estilista y Peluquera Canina Profesional",
};
