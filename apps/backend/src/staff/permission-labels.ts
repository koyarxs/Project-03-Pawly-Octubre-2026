import type { implementedKeys } from "../authorization/permission-policy";
export const permissionLabels: Record<
  (typeof implementedKeys)[number],
  string
> = {
  CLINIC_READ: "Acceder a la clínica",
  CLINIC_MANAGE: "Administrar el sitio y la clínica",
  STAFF_READ: "Consultar personal",
  STAFF_CREATE: "Invitar trabajadores",
  STAFF_UPDATE: "Editar perfiles del equipo",
  STAFF_DEACTIVATE: "Suspender y reactivar accesos",
  PERMISSIONS_MANAGE: "Administrar permisos",
  CREDENTIALS_VERIFY: "Verificar credenciales profesionales",
  PUBLIC_PROFILES_MANAGE: "Publicar perfiles autorizados",
  AUDIT_READ: "Consultar auditoría",
  TUTOR_READ: "Consultar tutores",
  TUTOR_WRITE: "Registrar y editar tutores",
  PATIENT_READ: "Consultar pacientes",
  PATIENT_CREATE: "Registrar pacientes",
  PATIENT_UPDATE: "Editar datos de pacientes",
  PATIENT_NOTES: "Consultar y editar notas clínicas",
  PATIENT_ASSIGN: "Asignar pacientes al equipo",
  CLINICAL_ARCHIVE: "Archivar tutores y pacientes",
  APPOINTMENT_READ: "Consultar agenda",
  APPOINTMENT_WRITE: "Crear y reprogramar citas",
  APPOINTMENT_CLINICAL: "Gestionar estados de atención médica",
  CONSULTATION_READ: "Consultar historia clínica",
  CONSULTATION_WRITE: "Registrar y modificar consultas",
};
