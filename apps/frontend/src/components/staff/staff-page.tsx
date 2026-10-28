"use client";
import { displayName } from "@/lib/display-name";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Users, ShieldCheck, UserPlus, ArrowRight, X } from "lucide-react";
import {
  WorkspaceShell,
  type WorkspaceContext,
} from "@/components/workspace/workspace-shell";
import {
  PageHeader,
  LoadingState,
  EmptyState,
  StatusBadge,
} from "@/components/ui/workspace-ui";
import { AuthError, request } from "@/lib/auth";
import {
  getStaff,
  staffError,
  staffMutation,
  type AuditEntry,
  type StaffCatalog,
  type StaffMember,
} from "@/lib/staff";
import { hasPermission, jobNames } from "@/lib/permissions";
import { roleNames, workspacePath } from "@/lib/workspace";
import "./staff.css";

const statusNames = {
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
  INVITED: "Invitación pendiente",
};
const ownerOnlyPermissions = [
  "CLINIC_MANAGE",
  "STAFF_CREATE",
  "STAFF_UPDATE",
  "STAFF_DEACTIVATE",
  "PERMISSIONS_MANAGE",
  "CREDENTIALS_VERIFY",
  "PUBLIC_PROFILES_MANAGE",
  "AUDIT_READ",
];
const auditNames: Record<string, string> = {
  INVITED: "Invitación creada",
  INVITATION_ROTATED: "Enlace renovado",
  INVITATION_ACCEPTED: "Acceso activado",
  PROFILE_UPDATED: "Perfil editado",
  ACCESS_UPDATED: "Permisos actualizados",
  SUSPENDED: "Acceso suspendido",
  ACTIVATED: "Acceso reactivado",
  CREDENTIAL_VERIFIED: "Credencial verificada",
  CREDENTIAL_REVOKED: "Credencial revocada",
  PUBLIC_CONSENT_GIVEN: "Consentimiento otorgado",
  PUBLIC_CONSENT_WITHDRAWN: "Consentimiento retirado",
  PROFILE_PUBLISHED: "Perfil publicado",
  PROFILE_HIDDEN: "Perfil ocultado",
  PATIENT_ASSIGNED: "Paciente asignado",
  PATIENT_UNASSIGNED: "Asignación retirada",
};
export function StaffPage({ clinicId }: { clinicId: string }) {
  return (
    <WorkspaceShell clinicId={clinicId} section="personal">
      {(context) => (
        <StaffDirectory
          key={`${clinicId}:${context.revision}`}
          context={context}
        />
      )}
    </WorkspaceShell>
  );
}
function StaffDirectory({ context }: { context: WorkspaceContext }) {
  const { clinicId, endSession } = context;
  const [data, setData] = useState<Awaited<ReturnType<typeof getStaff>> | null>(
      null,
    ),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [job, setJob] = useState(""),
    [status, setStatus] = useState("");
  const [selected, setSelected] = useState<StaffMember | null>(null),
    [invite, setInvite] = useState(false),
    [reload, setReload] = useState(0),
    [audit, setAudit] = useState<AuditEntry[] | null>(null);
  const dialog = useRef<HTMLDialogElement>(null),
    lastTrigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    void getStaff(clinicId, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setData(value);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (!controller.signal.aborted) {
          if (e instanceof AuthError && e.status === 401) endSession();
          else setError(staffError(e));
        }
      });
    return () => controller.abort();
  }, [clinicId, endSession, reload]);
  function close() {
    dialog.current?.close();
    setInvite(false);
    setSelected(null);
    lastTrigger.current?.focus();
  }
  function open(member: StaffMember | null, trigger: HTMLElement) {
    lastTrigger.current = trigger;
    setSelected(member);
    setInvite(!member);
    dialog.current?.showModal();
  }
  function saved() {
    close();
    setReload((v) => v + 1);
    setAudit(null);
  }
  async function loadAudit() {
    try {
      const value = (await request(
        `/clinics/${context.clinicId}/staff/audit`,
      )) as { items: AuditEntry[] };
      setAudit(value.items);
    } catch (e) {
      setError(staffError(e));
    }
  }
  const items =
    data?.items.filter(
      (m) =>
        (m.staffProfile?.displayName ?? m.user.name)
          .toLocaleLowerCase("es")
          .includes(query.toLocaleLowerCase("es")) &&
        (!job || m.staffProfile?.job === job) &&
        (!status || m.status === status),
    ) ?? [];
  return (
    <section className="staff-workspace">
      <PageHeader
        eyebrow="EQUIPO DE LA CLÍNICA"
        title="Personal y Accesos"
        description="Personas, responsabilidades y permisos. Cada cambio sensible conserva su autor y motivo."
        actions={
          hasPermission(context.access, "staff:create") && (
            <button
              className="staff-primary"
              onClick={(e) => open(null, e.currentTarget)}
            >
              <UserPlus size={18} />
              Invitar trabajador
            </button>
          )
        }
      />
      <div className="staff-explainer">
        <ShieldCheck size={20} />
        <p>
          El cargo público no otorga permisos. La propiedad, el acceso
          administrativo y la autorización médica se gestionan por separado.{" "}
          <Link href={workspacePath(context.clinicId, "mi-perfil")}>
            Revisar mi consentimiento <ArrowRight size={14} />
          </Link>
        </p>
      </div>
      {error && (
        <div role="alert" className="auth-alert">
          {error}{" "}
          <button onClick={() => setReload((v) => v + 1)}>Reintentar</button>
        </div>
      )}
      {!data && !error ? (
        <LoadingState label="Cargando el equipo…" />
      ) : (
        data && (
          <>
            <div className="staff-filters">
              <label>
                Buscar por nombre
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nombre del trabajador"
                />
              </label>
              <label>
                Cargo
                <select value={job} onChange={(e) => setJob(e.target.value)}>
                  <option value="">Todos los cargos</option>
                  {data.catalog.jobs.map((j) => (
                    <option key={j} value={j}>
                      {jobNames[j]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Acceso
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="">Todos los estados</option>
                  {Object.entries(statusNames).map(([s, n]) => (
                    <option key={s} value={s}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {items.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No hay trabajadores con estos filtros"
                description="Ajusta la búsqueda o invita a un integrante de tu clínica."
              />
            ) : (
              <div className="staff-table-wrap">
                <table className="staff-table">
                  <caption>
                    {items.length} integrantes · {context.access.name}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Profesional</th>
                      <th scope="col">Rol y cargo</th>
                      <th scope="col">Acceso</th>
                      <th scope="col">Perfil público</th>
                      <th scope="col">Gestión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((m) => (
                      <tr key={m.id}>
                        <th scope="row">
                          <span className="staff-avatar" aria-hidden="true">
                            {(m.staffProfile?.displayName ?? m.user.name).slice(
                              0,
                              1,
                            )}
                          </span>
                          <span>
                            {displayName(m.staffProfile?.displayName ?? m.user.name)}
                            <small>{m.user.email}</small>
                          </span>
                        </th>
                        <td>
                          {roleNames[m.role]}
                          <small>
                            {m.staffProfile
                              ? jobNames[m.staffProfile.job]
                              : "Cargo sin configurar"}
                          </small>
                        </td>
                        <td>
                          <StatusBadge
                            tone={
                              m.status === "ACTIVE"
                                ? "positive"
                                : m.status === "SUSPENDED"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {statusNames[m.status]}
                          </StatusBadge>
                          <small>
                            {m.staffProfile?.credentialStatus === "VERIFIED"
                              ? "Credencial verificada"
                              : "Sin autorización médica verificada"}
                          </small>
                        </td>
                        <td>
                          {m.staffProfile?.publishedAt
                            ? "Publicado"
                            : "No publicado"}
                          <small>
                            {m.staffProfile?.publicConsentAt
                              ? "Borrador autorizado"
                              : "Requiere consentimiento"}
                          </small>
                        </td>
                        <td>
                          <button
                            className="staff-secondary"
                            onClick={(e) => open(m, e.currentTarget)}
                            aria-label={`Administrar a ${displayName(m.staffProfile?.displayName ?? m.user.name)}`}
                          >
                            Administrar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {hasPermission(context.access, "audit:read") && (
              <section className="staff-panel">
                <div className="staff-panel-heading">
                  <h2>Historial de accesos y cambios</h2>
                  <button
                    className="staff-secondary"
                    onClick={() => void loadAudit()}
                  >
                    Consultar auditoría
                  </button>
                </div>
                {audit !== null &&
                  (audit.length ? (
                    <ol className="staff-audit">
                      {audit.map((entry) => (
                        <li key={entry.id}>
                          <strong>
                            {auditNames[entry.action] ?? entry.action}
                          </strong>
                          <span>
                            {displayName(entry.actor.user.name)} ·{" "}
                            {new Date(entry.createdAt).toLocaleString("es-CL")}
                          </span>
                          <p>{entry.reason}</p>
                          <details>
                            <summary>Ver cambio registrado</summary>
                            <pre>
                              {JSON.stringify(
                                { antes: entry.before, después: entry.after },
                                null,
                                2,
                              )}
                            </pre>
                          </details>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p>No hay cambios registrados.</p>
                  ))}
                <p className="staff-hint">
                  Se muestran los últimos 100 eventos. La auditoría no puede
                  editarse ni eliminarse desde Pawly.
                </p>
              </section>
            )}
          </>
        )
      )}
      <dialog
        ref={dialog}
        className="staff-dialog"
        onCancel={close}
        onClose={() => {
          setInvite(false);
          setSelected(null);
        }}
      >
        <div className="staff-dialog-heading">
          <h2>{invite ? "Invitar trabajador" : "Administrar trabajador"}</h2>
          <button aria-label="Cerrar administración" onClick={close}>
            <X size={21} />
          </button>
        </div>
        {data &&
          (invite ? (
            <InviteForm
              context={context}
              catalog={data.catalog}
              onDone={saved}
            />
          ) : (
            selected && (
              <WorkerEditor
                key={selected.id}
                context={context}
                member={selected}
                catalog={data.catalog}
                onDone={saved}
              />
            )
          ))}
      </dialog>
    </section>
  );
}
function useMutation(context: WorkspaceContext, onDone: () => void) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  async function run(
    path: string,
    body: object,
    method: "POST" | "PATCH" = "PATCH",
    finish = true,
  ) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await staffMutation(context.clinicId, path, body, method);
      if (finish) onDone();
      return result;
    } catch (e) {
      if (e instanceof AuthError && e.status === 401) context.endSession();
      else setError(staffError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { busy, error, run };
}
function ReasonField() {
  return (
    <label>
      Motivo del cambio
      <textarea
        name="reason"
        required
        minLength={3}
        maxLength={500}
        rows={2}
        placeholder="Explica por qué realizas esta acción"
      />
    </label>
  );
}
const text = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
function InviteForm({
  context,
  catalog,
  onDone,
}: {
  context: WorkspaceContext;
  catalog: StaffCatalog;
  onDone: () => void;
}) {
  const { busy, error, run } = useMutation(context, onDone),
    [link, setLink] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const result = (await run(
      "",
      {
        name: text(d, "name"),
        email: text(d, "email"),
        role: text(d, "role"),
        job: text(d, "job"),
        reason: text(d, "reason"),
      },
      "POST",
      false,
    )) as { activationToken?: string } | undefined;
    if (result?.activationToken)
      setLink(
        `${window.location.origin}/activar-acceso#token=${result.activationToken}`,
      );
  }
  if (link)
    return (
      <div className="staff-form">
        <h3>Invitación creada</h3>
        <p>
          Comparte este enlace de forma privada con el trabajador. Caduca en 48
          horas y se utiliza una sola vez. Pawly no ha enviado un correo.
        </p>
        <label>
          Enlace de activación
          <input
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
        <p className="staff-hint">
          Una cuenta existente conserva su contraseña; una nueva elige su
          contraseña al activar el acceso.
        </p>
        <button className="staff-primary" onClick={onDone}>
          Listo
        </button>
      </div>
    );
  return (
    <form className="staff-form" onSubmit={(e) => void submit(e)}>
      <p>
        El trabajador recibirá acceso solo después de aceptar la invitación. No
        se publicará su perfil.
      </p>
      <label>
        Nombre completo
        <input
          name="name"
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
        />
      </label>
      <label>
        Correo de acceso
        <input
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
        />
      </label>
      <label>
        Rol de membresía
        <select name="role" defaultValue="RECEPTIONIST">
          {catalog.roles
            .filter(
              (r) =>
                r !== "OWNER" &&
                (context.access.role === "OWNER" ||
                  !["ADMIN", "CLINIC_DIRECTOR"].includes(r)),
            )
            .map((r) => (
              <option key={r} value={r}>
                {roleNames[r]}
              </option>
            ))}
        </select>
      </label>
      <label>
        Cargo profesional
        <select name="job" defaultValue="RECEPTIONIST">
          {catalog.jobs.map((j) => (
            <option key={j} value={j}>
              {jobNames[j]}
            </option>
          ))}
        </select>
      </label>
      <ReasonField />
      {error && <p role="alert">{error}</p>}
      <button className="staff-primary" disabled={busy}>
        {busy ? "Creando invitación…" : "Crear enlace de invitación"}
      </button>
    </form>
  );
}
function WorkerEditor({
  context,
  member: m,
  catalog,
  onDone,
}: {
  context: WorkspaceContext;
  member: StaffMember;
  catalog: StaffCatalog;
  onDone: () => void;
}) {
  const { busy, error, run } = useMutation(context, onDone),
    [tab, setTab] = useState("profile"),
    [activation, setActivation] = useState("");
  const p = m.staffProfile;
  const protectedAccess =
    m.id === context.access.membershipId ||
    m.role === "OWNER" ||
    (context.access.role !== "OWNER" &&
      ["ADMIN", "CLINIC_DIRECTOR"].includes(m.role));
  const [grants, setGrants] = useState(m.permissionGrants),
    [denials, setDenials] = useState(m.permissionDenials);
  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    await run(`/${m.id}/profile`, {
      displayName: text(d, "displayName"),
      job: text(d, "job"),
      specialty: text(d, "specialty"),
      biography: text(d, "biography"),
      photoKey: text(d, "photoKey"),
      professionalPhone: text(d, "professionalPhone"),
      publicOrder: Number(d.get("publicOrder")),
      version: p?.version ?? 1,
      reason: text(d, "reason"),
    });
  }
  async function saveAccess(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    if (
      !window.confirm(
        `¿Confirmas cambiar el acceso de ${m.user.name}? Se aplicará también a sus sesiones abiertas.`,
      )
    )
      return;
    await run(`/${m.id}/access`, {
      role: text(d, "role"),
      patientScope: text(d, "scope"),
      grants,
      denials,
      version: m.accessVersion,
      reason: text(d, "reason"),
    });
  }
  async function saveCredential(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    if (
      !window.confirm(
        "¿Confirmas el resultado de la revisión documental? Esta acción quedará auditada.",
      )
    )
      return;
    await run(`/${m.id}/credential`, {
      verified: text(d, "verified") === "yes",
      credentialNumber: text(d, "number"),
      evidence: text(d, "evidence"),
      version: p?.version ?? 1,
      reason: text(d, "reason"),
    });
  }
  async function stateAction(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    if (
      !window.confirm(
        `¿Confirmas ${m.status === "ACTIVE" ? "suspender" : "reactivar"} este acceso?`,
      )
    )
      return;
    await run(`/${m.id}/status`, {
      status: m.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
      version: m.accessVersion,
      reason: text(d, "reason"),
    });
  }
  const tabs = [
    ["profile", "Perfil", true],
    [
      "access",
      "Acceso",
      hasPermission(context.access, "permissions:manage") && !protectedAccess,
    ],
    [
      "credential",
      "Credencial",
      hasPermission(context.access, "credentials:verify") &&
        context.access.membershipId !== m.id &&
        ["OWNER", "ADMIN", "CLINIC_DIRECTOR", "VETERINARIAN"].includes(m.role),
    ],
    [
      "public",
      "Publicación",
      hasPermission(context.access, "public-profiles:manage"),
    ],
    ["assign", "Pacientes", hasPermission(context.access, "patient:assign")],
    [
      "status",
      "Estado",
      hasPermission(context.access, "staff:deactivate") && !protectedAccess,
    ],
  ] as const;
  return (
    <div className="staff-form">
      <p>
        <strong>{displayName(p?.displayName ?? m.user.name)}</strong> · {roleNames[m.role]}
      </p>
      <div
        className="staff-tabs"
        role="group"
        aria-label="Administración del trabajador"
      >
        {tabs
          .filter(([, , show]) => show)
          .map(([key, label]) => (
            <button
              type="button"
              key={key}
              aria-pressed={tab === key}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
      </div>
      {error && (
        <p role="alert" className="auth-alert">
          {error}
        </p>
      )}
      {tab === "profile" && (
        <form onSubmit={(e) => void saveProfile(e)} className="staff-form">
          <label>
            Nombre público
            <input
              name="displayName"
              required
              minLength={2}
              maxLength={120}
              defaultValue={displayName(p?.displayName ?? m.user.name)}
            />
          </label>
          <label>
            Cargo
            <select name="job" defaultValue={p?.job ?? "RECEPTIONIST"}>
              {catalog.jobs.map((j) => (
                <option key={j} value={j}>
                  {jobNames[j]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Especialidad
            <input
              name="specialty"
              maxLength={160}
              defaultValue={p?.specialty ?? ""}
            />
          </label>
          <label>
            Descripción profesional
            <textarea
              name="biography"
              rows={3}
              maxLength={1500}
              defaultValue={p?.biography ?? ""}
            />
          </label>
          <label>
            Fotografía
            <select name="photoKey" defaultValue={p?.photoKey ?? "initials"}>
              <option value="initials">Avatar con iniciales</option>
              {[
                "director",
                "veterinarian",
                "technician",
                "reception",
                "groomer",
              ].map((key, index) => (
                <option value={`${key}-demo`} key={key}>
                  Fotografía del perfil {index + 1}
                </option>
              ))}
            </select>
          </label>
          <p className="staff-hint">
            Las fotografías de muestra se identifican como ilustrativas. La
            carga de retratos propios está pendiente.
          </p>
          <label>
            Teléfono profesional interno
            <input
              name="professionalPhone"
              maxLength={32}
              defaultValue={p?.professionalPhone ?? ""}
            />
          </label>
          <label>
            Orden público
            <input
              name="publicOrder"
              type="number"
              min={0}
              max={9999}
              defaultValue={p?.publicOrder ?? 0}
            />
          </label>
          {hasPermission(context.access, "staff:update") &&
            (m.role !== "OWNER" || m.id === context.access.membershipId) && (
              <>
                <ReasonField />
                <button className="staff-primary" disabled={busy}>
                  Guardar borrador del perfil
                </button>
              </>
            )}
          <p className="staff-hint">
            Editar el borrador requiere un nuevo consentimiento para volver a
            publicarlo. La versión ya publicada conserva su consentimiento
            anterior.
          </p>
        </form>
      )}
      {tab === "access" && (
        <form onSubmit={(e) => void saveAccess(e)} className="staff-form">
          <p>
            Los permisos se calculan desde el rol y estas excepciones. Una
            credencial sin verificar bloquea las facultades médicas aunque se
            conceda el permiso.
          </p>
          <details>
            <summary>Permisos efectivos actuales</summary>
            <ul>
              {m.permissions.map((permission) => (
                <li key={permission}>
                  {catalog.permissions.find((item) => item.name === permission)
                    ?.label ?? permission}
                </li>
              ))}
            </ul>
          </details>
          <label>
            Rol
            <select name="role" defaultValue={m.role}>
              {catalog.roles
                .filter(
                  (r) =>
                    r !== "OWNER" &&
                    (context.access.role === "OWNER" ||
                      !["ADMIN", "CLINIC_DIRECTOR"].includes(r)),
                )
                .map((r) => (
                  <option value={r} key={r}>
                    {roleNames[r]}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Alcance de pacientes
            <select name="scope" defaultValue={m.patientScope}>
              <option value="CLINIC">Toda la clínica</option>
              <option value="ASSIGNED">Solo pacientes asignados</option>
            </select>
          </label>
          <fieldset>
            <legend>Excepciones de permisos</legend>
            {catalog.permissions.map((item) => (
              <label className="staff-permission" key={item.key}>
                <span>{item.label}</span>
                <select
                  aria-label={`Excepción ${item.label}`}
                  disabled={
                    context.access.role !== "OWNER" &&
                    ownerOnlyPermissions.includes(item.key)
                  }
                  value={
                    grants.includes(item.key)
                      ? "grant"
                      : denials.includes(item.key)
                        ? "deny"
                        : "role"
                  }
                  onChange={(e) => {
                    setGrants((v) => [
                      ...v.filter((k) => k !== item.key),
                      ...(e.target.value === "grant" ? [item.key] : []),
                    ]);
                    setDenials((v) => [
                      ...v.filter((k) => k !== item.key),
                      ...(e.target.value === "deny" ? [item.key] : []),
                    ]);
                  }}
                >
                  <option value="role">Según rol</option>
                  <option
                    value="grant"
                    disabled={
                      context.access.role !== "OWNER" &&
                      !hasPermission(context.access, item.name)
                    }
                  >
                    Conceder
                  </option>
                  <option value="deny">Denegar</option>
                </select>
              </label>
            ))}
          </fieldset>
          <ReasonField />
          <button className="staff-primary" disabled={busy}>
            Confirmar permisos
          </button>
        </form>
      )}
      {tab === "credential" && (
        <form onSubmit={(e) => void saveCredential(e)} className="staff-form">
          <p>
            Revisión documental manual e independiente. Pawly no está conectado
            a un registro profesional oficial. Nunca verifiques una credencial
            sin comprobar su evidencia.
          </p>
          <label>
            Resultado
            <select
              name="verified"
              defaultValue={p?.credentialStatus === "VERIFIED" ? "yes" : "no"}
            >
              <option value="no">No autorizar / revocar</option>
              <option value="yes">Verificada y práctica autorizada</option>
            </select>
          </label>
          <label>
            Número de registro
            <input
              name="number"
              maxLength={120}
              defaultValue={p?.credentialNumber ?? ""}
            />
          </label>
          <label>
            Evidencia de revisión
            <textarea
              name="evidence"
              maxLength={500}
              defaultValue={p?.credentialEvidence ?? ""}
              placeholder="Documento revisado, fuente y fecha de comprobación"
            />
          </label>
          <ReasonField />
          <button className="staff-primary" disabled={busy}>
            Guardar revisión
          </button>
        </form>
      )}
      {tab === "public" && (
        <form
          className="staff-form"
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            void run(
              `/${m.id}/publication`,
              {
                visible: !p?.publishedAt,
                version: p?.version ?? 1,
                reason: text(d, "reason"),
              },
              "POST",
            );
          }}
        >
          <p>
            {p?.publishedAt
              ? "Hay una versión pública de este perfil."
              : "Este trabajador no se muestra en el sitio público."}
          </p>
          <p>
            Para publicar, el trabajador debe revisar el borrador y autorizarlo
            desde «Mi perfil público» con su propia cuenta.
          </p>
          <ReasonField />
          <button
            className="staff-primary"
            disabled={busy || !p || (!p.publishedAt && !p.publicConsentAt)}
          >
            {p?.publishedAt ? "Ocultar perfil" : "Publicar perfil autorizado"}
          </button>
        </form>
      )}
      {tab === "assign" && (
        <AssignmentForm context={context} member={m} run={run} busy={busy} />
      )}
      {tab === "status" &&
        (m.status === "INVITED" ? (
          <form
            className="staff-form"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              void run(
                `/${m.id}/invitation`,
                { version: m.accessVersion, reason: text(d, "reason") },
                "POST",
                false,
              ).then((value) => {
                const result = value as
                  { activationToken?: string } | undefined;
                if (result?.activationToken)
                  setActivation(
                    `${window.location.origin}/activar-acceso#token=${result.activationToken}`,
                  );
              });
            }}
          >
            <p>
              El acceso está pendiente de aceptación. Renovar el enlace invalida
              los anteriores.
            </p>
            <ReasonField />
            {activation ? (
              <label>
                Nuevo enlace privado
                <input
                  readOnly
                  value={activation}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </label>
            ) : (
              <button className="staff-primary" disabled={busy}>
                Renovar enlace
              </button>
            )}
          </form>
        ) : (
          <form className="staff-form" onSubmit={(e) => void stateAction(e)}>
            <p>
              La suspensión revoca el acceso a esta clínica en las sesiones
              existentes. Conserva las atenciones, la auditoría y las otras
              membresías.
            </p>
            <ReasonField />
            <button className="staff-primary" disabled={busy}>
              {m.status === "ACTIVE" ? "Suspender acceso" : "Reactivar acceso"}
            </button>
          </form>
        ))}
    </div>
  );
}
function AssignmentForm({
  context,
  member,
  run,
  busy,
}: {
  context: WorkspaceContext;
  member: StaffMember;
  run: (
    path: string,
    body: object,
    method?: "POST" | "PATCH",
    finish?: boolean,
  ) => Promise<unknown>;
  busy: boolean;
}) {
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]),
    [search, setSearch] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void request(
        `/clinics/${context.clinicId}/patients?limit=20&page=1&q=${encodeURIComponent(search)}`,
        undefined,
        controller.signal,
      )
        .then((v) => {
          if (!controller.signal.aborted)
            setPatients((v as { items: { id: string; name: string }[] }).items);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(staffError(e));
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [context.clinicId, search]);
  return (
    <form
      className="staff-form"
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        void run(
          `/${member.id}/patients`,
          {
            patientId: text(d, "patientId"),
            assigned: text(d, "assigned") === "yes",
            reason: text(d, "reason"),
          },
          "POST",
        );
      }}
    >
      <p>
        Las asignaciones limitan la información disponible cuando el alcance es
        «Solo pacientes asignados». Las citas y consultas a cargo también
        establecen una relación de atención.
      </p>
      <label>
        Buscar paciente
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <label>
        Paciente
        <select name="patientId" required>
          <option value="">Selecciona un paciente</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {displayName(p.name)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Acción
        <select name="assigned">
          <option value="yes">Asignar</option>
          <option value="no">Retirar asignación explícita</option>
        </select>
      </label>
      <ReasonField />
      <button className="staff-primary" disabled={busy || !patients.length}>
        Guardar asignación
      </button>
    </form>
  );
}
