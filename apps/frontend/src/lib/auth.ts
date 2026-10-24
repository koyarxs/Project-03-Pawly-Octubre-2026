export type ClinicRole =
  | "OWNER"
  | "ADMIN"
  | "VETERINARIAN"
  | "RECEPTIONIST"
  | "CLINIC_DIRECTOR"
  | "VET_TECHNICIAN"
  | "PET_GROOMER";
export interface ClinicAccess {
  id: string;
  name: string;
  slug: string;
  role: ClinicRole;
  membershipId: string;
  permissions: string[];
  accessVersion: number;
  patientScope: "CLINIC" | "ASSIGNED";
  job: string | null;
  medicalPracticeEnabled: boolean;
}
export interface Clinic {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
}
export interface Session extends PublicUser {
  memberships: { role: ClinicRole; clinic: Clinic }[];
}
export interface Registration {
  name: string;
  email: string;
  password: string;
  clinicName: string;
}
export class AuthError extends Error {
  constructor(public readonly status: number) {
    super("Pawly request failed");
    this.name = "AuthError";
  }
}
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const roles: readonly string[] = [
  "OWNER",
  "ADMIN",
  "VETERINARIAN",
  "RECEPTIONIST",
  "CLINIC_DIRECTOR",
  "VET_TECHNICIAN",
  "PET_GROOMER",
];
const user = (value: unknown): value is PublicUser =>
  record(value) &&
  [value.id, value.name, value.email].every((v) => typeof v === "string") &&
  (value.emailVerifiedAt === null || typeof value.emailVerifiedAt === "string");
const clinic = (value: unknown): value is Clinic =>
  record(value) &&
  [value.id, value.name, value.slug, value.timezone].every(
    (v) => typeof v === "string",
  );
const membership = (value: unknown): value is Session["memberships"][number] =>
  record(value) &&
  typeof value.role === "string" &&
  roles.includes(value.role) &&
  clinic(value.clinic);
export async function request(
  path: string,
  body?: object,
  signal?: AbortSignal,
  method?: "GET" | "POST" | "PATCH",
): Promise<unknown> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) throw new AuthError(0);
  let response: Response;
  try {
    response = await fetch(`${base.replace(/\/$/, "")}${path}`, {
      method: method ?? (body ? "POST" : "GET"),
      credentials: "include",
      cache: "no-store",
      headers: body
        ? { "Content-Type": "application/json", "X-Pawly-CSRF": "1" }
        : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
    });
  } catch {
    throw new AuthError(0);
  }
  if (!response.ok) throw new AuthError(response.status);
  if (response.status === 204) return undefined;
  try {
    return await response.json();
  } catch {
    throw new AuthError(502);
  }
}
export async function registerClinic(
  input: Registration,
): Promise<{ user: PublicUser; clinic: Clinic }> {
  const value = await request("/auth/register-clinic", input);
  if (
    !record(value) ||
    !user(value.user) ||
    !clinic(value.clinic) ||
    value.role !== "OWNER"
  )
    throw new AuthError(502);
  return { user: value.user, clinic: value.clinic };
}
export async function login(email: string, password: string): Promise<void> {
  const value = await request("/auth/login", { email, password });
  if (!record(value) || !user(value.user)) throw new AuthError(502);
}
export async function getSession(signal?: AbortSignal): Promise<Session> {
  const value = await request("/auth/me", undefined, signal);
  if (
    !user(value) ||
    !record(value) ||
    !Array.isArray(value.memberships) ||
    !value.memberships.every(membership)
  )
    throw new AuthError(502);
  return {
    id: value.id,
    name: value.name,
    email: value.email,
    emailVerifiedAt: value.emailVerifiedAt,
    memberships: value.memberships,
  };
}
export async function checkClinicAccess(
  id: string,
  signal?: AbortSignal,
): Promise<ClinicAccess> {
  const value = await request(
    `/clinics/${encodeURIComponent(id)}/access`,
    undefined,
    signal,
  );
  if (
    !record(value) ||
    !record(value.clinic) ||
    value.clinic.id !== id ||
    typeof value.clinic.name !== "string" ||
    typeof value.clinic.slug !== "string" ||
    typeof value.clinic.role !== "string" ||
    !roles.includes(value.clinic.role) ||
    typeof value.clinic.membershipId !== "string" ||
    !Array.isArray(value.clinic.permissions) ||
    !value.clinic.permissions.every((p) => typeof p === "string") ||
    !Number.isInteger(value.clinic.accessVersion) ||
    !["CLINIC", "ASSIGNED"].includes(String(value.clinic.patientScope)) ||
    !(value.clinic.job === null || typeof value.clinic.job === "string") ||
    typeof value.clinic.medicalPracticeEnabled !== "boolean"
  )
    throw new AuthError(502);
  return value.clinic as unknown as ClinicAccess;
}
export async function logout(): Promise<void> {
  await request("/auth/logout", {});
}
export function authErrorMessage(
  error: unknown,
  action: "register" | "login" | "workspace" | "access" | "logout",
): string {
  const status = error instanceof AuthError ? error.status : 0;
  if (status === 429)
    return "Has realizado varios intentos. Espera un minuto antes de volver a intentarlo.";
  if (status === 503 && action === "register")
    return "El registro de nuevas clínicas no está disponible por el momento. Si ya tienes una cuenta, inicia sesión.";
  if (status === 409)
    return "No pudimos completar el registro con estos datos. Revisa tu correo o intenta iniciar sesión.";
  if (status === 401)
    return "No pudimos iniciar sesión. Revisa tu correo y contraseña.";
  if (status === 403 && action === "access")
    return "Ya no tienes acceso a esta clínica. Actualiza tus clínicas disponibles.";
  if (status === 403)
    return "No pudimos completar la solicitud de forma segura. Recarga la página e inténtalo nuevamente.";
  if (status === 400)
    return "Revisa los datos del formulario e inténtalo nuevamente.";
  return action === "logout"
    ? "No pudimos cerrar la sesión. Inténtalo nuevamente antes de salir."
    : "No pudimos conectar con Pawly. Inténtalo nuevamente en unos momentos.";
}
