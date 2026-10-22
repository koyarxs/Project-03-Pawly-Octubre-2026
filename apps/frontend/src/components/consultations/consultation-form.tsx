"use client";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthError } from "@/lib/auth";
import {
  getProfessionals,
  type Professional,
  type Appointment,
} from "@/lib/appointments";
import { getRecord, listRecords, type PatientSummary } from "@/lib/clinical";
import { appointmentInstant, localStamp } from "@/lib/appointment-time";
import {
  clinicalTextFields,
  clinicalLabels,
  consultationError,
  consultationPath,
  getClinicalAppointment,
  saveConsultation,
  type ClinicalInput,
  type ClinicalTextField,
  type Consultation,
} from "@/lib/consultations";
import type { WorkspaceContext } from "@/components/workspace/workspace-shell";
import { useClinicalResource } from "./use-clinical-resource";
import { LoadingState, PageHeader } from "@/components/ui/workspace-ui";

export function NewConsultation({
  context,
  patientId,
  appointmentId,
}: {
  context: WorkspaceContext;
  patientId?: string;
  appointmentId?: string;
}) {
  const router = useRouter(),
    clinicId = context.clinicId;
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [professionals, appointment] = await Promise.all([
        getProfessionals(clinicId, signal),
        appointmentId
          ? getClinicalAppointment(clinicId, appointmentId, signal)
          : Promise.resolve(null),
      ]);
      const id = appointment?.patientId || patientId;
      const patient = id
        ? ((await getRecord(
            clinicId,
            "pacientes",
            id,
            signal,
          )) as PatientSummary)
        : null;
      return { professionals, appointment, patient };
    },
    [clinicId, patientId, appointmentId],
  );
  const result = useClinicalResource(
    `${patientId || ""}:${appointmentId || ""}`,
    load,
    context,
  );
  if (result.error)
    return (
      <div className="medical-empty" role="alert">
        <h2>No pudimos preparar la consulta.</h2>
        <p>{result.error}</p>
        <button onClick={result.retry}>Reintentar</button>
        <button onClick={context.refresh}>Verificar mi acceso</button>
      </div>
    );
  if (!result.data) return <LoadingState label="Preparando consulta…" />;
  if (result.data.appointment?.consultation)
    return (
      <div className="medical-panel">
        <h1>Esta cita ya tiene una consulta.</h1>
        <Link
          href={consultationPath(
            clinicId,
            result.data.appointment.consultation.id,
          )}
        >
          Abrir consulta existente
        </Link>
      </div>
    );
  if (
    result.data.appointment &&
    ["CANCELLED", "COMPLETED"].includes(result.data.appointment.status)
  )
    return (
      <div role="alert" className="medical-panel">
        <h1>La cita ya está cerrada.</h1>
        <p>
          No se puede iniciar una consulta desde una cita cancelada o
          completada.
        </p>
      </div>
    );
  if (result.data.patient?.status === "ARCHIVED")
    return (
      <div className="medical-panel" role="alert">
        <h1>El paciente está archivado.</h1>
        <p>
          Su historia se conserva, pero no se pueden crear nuevas consultas
          mientras esté archivado.
        </p>
      </div>
    );
  return (
    <ConsultationForm
      context={context}
      patient={result.data.patient}
      appointment={result.data.appointment}
      professionals={result.data.professionals}
      onSaved={(record) =>
        router.replace(consultationPath(clinicId, record.id))
      }
    />
  );
}
const vitals = {
  weightKg: { label: "Peso (kg)", min: 0.001, max: 10000, step: 0.001 },
  temperatureC: { label: "Temperatura (°C)", min: 20, max: 50, step: 0.1 },
  heartRate: { label: "Frecuencia cardíaca (lpm)", min: 1, max: 500, step: 1 },
  respiratoryRate: {
    label: "Frecuencia respiratoria (rpm)",
    min: 1,
    max: 300,
    step: 1,
  },
} as const;
type Vital = keyof typeof vitals;
export function ConsultationForm({
  context,
  initial,
  patient: initialPatient,
  appointment,
  professionals,
  onSaved,
  onCancel,
}: {
  context: WorkspaceContext;
  initial?: Consultation;
  patient?: PatientSummary | null;
  appointment?: Appointment | null;
  professionals: Professional[];
  onSaved: (record: Consultation) => void;
  onCancel?: () => void;
}) {
  const id = useId(),
    timezone =
      context.session.memberships.find((m) => m.clinic.id === context.clinicId)!
        .clinic.timezone || "America/Santiago";
  const [patient, setPatient] = useState<PatientSummary | null>(
      initialPatient || null,
    ),
    [professional, setProfessional] = useState(
      initial?.professionalMembershipId ||
        appointment?.professionalMembershipId ||
        (professionals.length === 1 ? professionals[0].id : ""),
    ),
    [attended, setAttended] = useState(() =>
      localStamp(initial?.attendedAt || new Date(), timezone),
    ),
    [next, setNext] = useState(
      initial?.nextControlAt ? localStamp(initial.nextControlAt, timezone) : "",
    );
  const [text, setText] = useState(
    () =>
      Object.fromEntries(
        clinicalTextFields.map((f) => [
          f,
          initial?.[f] || (f === "reason" ? appointment?.reason : "") || "",
        ]),
      ) as Record<ClinicalTextField, string>,
  );
  const [measurements, setMeasurements] = useState(
      () =>
        Object.fromEntries(
          Object.keys(vitals).map((k) => [
            k,
            initial?.[k as Vital]?.toString() || "",
          ]),
        ) as Record<Vital, string>,
    ),
    [diagnosisType, setDiagnosisType] = useState<
      ClinicalInput["diagnosisType"]
    >(initial?.diagnosisType || null);
  const [requestId] = useState(() => crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<AbortController | null>(null),
    lock = useRef(false),
    form = useRef<HTMLFormElement>(null),
    confirm = useRef<HTMLDialogElement>(null),
    alert = useRef<HTMLDivElement>(null);
  useEffect(() => () => pending.current?.abort(), []);
  function problem(message: string) {
    setError(message);
    requestAnimationFrame(() => alert.current?.focus());
  }
  function finalize() {
    if (!form.current?.reportValidity()) return;
    if (
      ![
        text.reason,
        text.anamnesis,
        text.physicalExam,
        text.diagnosis,
        text.treatment,
      ].every((v) => v.trim()) ||
      !diagnosisType
    ) {
      problem(
        "Para finalizar completa motivo, anamnesis, examen físico, diagnóstico, tipo de diagnóstico y tratamiento.",
      );
      return;
    }
    confirm.current?.showModal();
  }
  async function save(status: "DRAFT" | "FINALIZED") {
    if (lock.current) return;
    if (!initial && !patient) {
      problem("Selecciona un paciente activo antes de guardar.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    const c = new AbortController();
    pending.current = c;
    try {
      const data: ClinicalInput = {
        ...text,
        professionalMembershipId: professional,
        attendedAt: appointmentInstant(attended, timezone, initial?.attendedAt),
        nextControlAt: next
          ? appointmentInstant(
              next,
              timezone,
              initial?.nextControlAt || undefined,
            )
          : null,
        diagnosisType,
        weightKg: measurements.weightKg ? Number(measurements.weightKg) : null,
        temperatureC: measurements.temperatureC
          ? Number(measurements.temperatureC)
          : null,
        heartRate: measurements.heartRate
          ? Number(measurements.heartRate)
          : null,
        respiratoryRate: measurements.respiratoryRate
          ? Number(measurements.respiratoryRate)
          : null,
      };
      const r = await saveConsultation(
        context.clinicId,
        {
          ...data,
          ...(initial
            ? { version: initial.version, status }
            : {
                patientId: patient!.id,
                appointmentId: appointment?.id || null,
                requestId,
              }),
        },
        initial?.id,
        c.signal,
      );
      if (!c.signal.aborted) {
        confirm.current?.close();
        onSaved(r);
      }
    } catch (e) {
      if (!c.signal.aborted) {
        confirm.current?.close();
        if (e instanceof AuthError && e.status === 401) context.endSession();
        else if (e instanceof AuthError && e.status === 403) context.refresh();
        else problem(consultationError(e));
      }
    } finally {
      if (!c.signal.aborted) setBusy(false);
      lock.current = false;
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void save("DRAFT");
  }
  function field(name: ClinicalTextField, rows = 4) {
    return (
      <div className="medical-field" key={name}>
        <label htmlFor={`${id}-${name}`}>
          {clinicalLabels[name]}
          {name === "reason" ? " *" : ""}
        </label>
        <textarea
          id={`${id}-${name}`}
          required={name === "reason"}
          rows={rows}
          maxLength={
            name === "reason"
              ? 1000
              : ["diagnosis", "notes"].includes(name)
                ? 4000
                : 8000
          }
          value={text[name]}
          onChange={(e) => setText((v) => ({ ...v, [name]: e.target.value }))}
        />
      </div>
    );
  }
  return (
    <section className="medical-editor">
      <PageHeader
        eyebrow={initial ? "BORRADOR CLÍNICO" : "NUEVA ATENCIÓN"}
        title={initial ? "Editar consulta" : "Nueva consulta"}
        description="Una atención bien documentada conecta el cuidado de hoy con el de mañana."
        actions={
          <Link href={consultationPath(context.clinicId)}>
            Volver a consultas
          </Link>
        }
      />
      <div className="medical-editor-layout">
        <aside className="medical-editor-guide">
          <span className="pw-eyebrow">EN ESTA CONSULTA</span>
          <nav aria-label="Secciones de la consulta">
            {[
              ["patient", "Paciente y atención"],
              ["background", "Motivo y antecedentes"],
              ["vitals", "Signos vitales"],
              ["exam", "Examen y hallazgos"],
              ["diagnosis-section", "Diagnóstico"],
              ["plan", "Plan y seguimiento"],
            ].map(([section, label], index) => (
              <a key={section} href={`#${id}-${section}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {label}
              </a>
            ))}
          </nav>
          <div className="medical-editor-reminder">
            <strong>Tu registro, a tu ritmo.</strong>
            <p>
              Guarda explícitamente el avance como borrador. Finaliza cuando
              esté completo.
            </p>
          </div>
        </aside>
        <form ref={form} onSubmit={submit} aria-busy={busy}>
          <fieldset
            id={`${id}-patient`}
            disabled={busy}
            className="medical-patient-panel"
          >
            <legend>Paciente y atención</legend>
            {initial ? (
              <p>
                <strong>{initial.patient.name}</strong> ·{" "}
                {initial.appointmentId
                  ? "Vinculada a una cita"
                  : "Sin cita previa"}
              </p>
            ) : initialPatient ? (
              <p>
                <strong>{initialPatient.name}</strong>
                {appointment && " · Desde agenda"}
              </p>
            ) : (
              <PatientSelector
                context={context}
                selected={patient}
                onSelect={setPatient}
              />
            )}
            <div className="medical-form-grid">
              <div>
                <label htmlFor={`${id}-professional`}>
                  Profesional responsable *
                </label>
                <select
                  id={`${id}-professional`}
                  required
                  value={professional}
                  disabled={
                    !initial && Boolean(appointment?.professionalMembershipId)
                  }
                  onChange={(e) => setProfessional(e.target.value)}
                >
                  <option value="">Selecciona un profesional</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.user.name}
                    </option>
                  ))}
                  {initial &&
                    !professionals.some(
                      (p) => p.id === initial.professional.id,
                    ) && (
                      <option value={initial.professional.id}>
                        {initial.professional.user.name} (no disponible)
                      </option>
                    )}
                </select>
              </div>
              <div>
                <label htmlFor={`${id}-attended`}>
                  Fecha y hora de atención *
                </label>
                <input
                  id={`${id}-attended`}
                  type="datetime-local"
                  required
                  value={attended}
                  onChange={(e) => setAttended(e.target.value)}
                />
              </div>
            </div>
            <p className="medical-hint">
              Horario de la clínica: {timezone}. Los campos con * son
              obligatorios para guardar el borrador.
            </p>
          </fieldset>
          <fieldset
            id={`${id}-background`}
            disabled={busy}
            className="medical-section"
          >
            <legend>1. Motivo y antecedentes</legend>
            {field("reason", 2)}
            {field("anamnesis")}
          </fieldset>
          <fieldset
            id={`${id}-vitals`}
            disabled={busy}
            className="medical-section"
          >
            <legend>2. Signos vitales</legend>
            <p className="medical-hint">
              Opcionales. Deja en blanco las mediciones no realizadas.
            </p>
            <div className="medical-vitals">
              {(Object.keys(vitals) as Vital[]).map((k) => (
                <div key={k}>
                  <label htmlFor={`${id}-${k}`}>{vitals[k].label}</label>
                  <input
                    id={`${id}-${k}`}
                    type="number"
                    min={vitals[k].min}
                    max={vitals[k].max}
                    step={vitals[k].step}
                    value={measurements[k]}
                    onChange={(e) =>
                      setMeasurements((v) => ({ ...v, [k]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
          </fieldset>
          <fieldset
            id={`${id}-exam`}
            disabled={busy}
            className="medical-section"
          >
            <legend>3. Examen y hallazgos</legend>
            <div className="medical-form-grid">
              {field("physicalExam")}
              {field("findings")}
            </div>
          </fieldset>
          <fieldset
            id={`${id}-diagnosis-section`}
            disabled={busy}
            className="medical-section"
          >
            <legend>4. Diagnóstico</legend>
            {field("diagnosis")}
            <label htmlFor={`${id}-diagnosisType`}>Tipo de diagnóstico</label>
            <select
              id={`${id}-diagnosisType`}
              value={diagnosisType || ""}
              onChange={(e) =>
                setDiagnosisType(
                  (e.target.value as ClinicalInput["diagnosisType"]) || null,
                )
              }
            >
              <option value="">Sin definir</option>
              <option value="PRESUMPTIVE">Presuntivo</option>
              <option value="DEFINITIVE">Definitivo</option>
            </select>
          </fieldset>
          <fieldset
            id={`${id}-plan`}
            disabled={busy}
            className="medical-section"
          >
            <legend>5. Plan y seguimiento</legend>
            <div className="medical-form-grid">
              {field("treatment")}
              {field("instructions")}
            </div>
            {field("notes", 3)}
            <label htmlFor={`${id}-control`}>Próximo control</label>
            <input
              id={`${id}-control`}
              type="datetime-local"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
            <p className="medical-hint">
              Registrar el control no crea automáticamente una cita ni un
              recordatorio.
            </p>
          </fieldset>
          {error && (
            <div
              className="medical-alert"
              role="alert"
              ref={alert}
              tabIndex={-1}
            >
              {error}
              {initial && (
                <button type="button" onClick={context.refresh}>
                  Recargar registro
                </button>
              )}
            </div>
          )}
          <footer className="medical-savebar">
            <span>
              El borrador sigue editable; la finalización conserva el registro
              original.
            </span>
            <div>
              {onCancel && (
                <button type="button" disabled={busy} onClick={onCancel}>
                  Volver al detalle
                </button>
              )}
              <button className="medical-primary" type="submit" disabled={busy}>
                {busy ? "Guardando…" : "Guardar borrador"}
              </button>
              {initial && (
                <button type="button" disabled={busy} onClick={finalize}>
                  Finalizar consulta
                </button>
              )}
            </div>
          </footer>
        </form>
      </div>
      <dialog
        ref={confirm}
        className="medical-dialog"
        aria-labelledby={`${id}-finalize`}
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
      >
        <h2 id={`${id}-finalize`}>¿Finalizar esta consulta?</h2>
        <p>
          El contenido clínico quedará protegido. Las correcciones posteriores
          se agregarán como rectificaciones con autor y fecha.
        </p>
        {initial?.appointmentId && (
          <p>
            La cita vinculada se marcará como completada en la misma operación.
          </p>
        )}
        <div className="medical-actions">
          <button disabled={busy} onClick={() => confirm.current?.close()}>
            Seguir editando
          </button>
          <button
            className="medical-primary"
            disabled={busy}
            onClick={() => void save("FINALIZED")}
          >
            {busy ? "Finalizando…" : "Confirmar finalización"}
          </button>
        </div>
      </dialog>
    </section>
  );
}
function PatientSelector({
  context,
  selected,
  onSelect,
}: {
  context: WorkspaceContext;
  selected: PatientSummary | null;
  onSelect: (patient: PatientSummary) => void;
}) {
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(1);
  const clinicId = context.clinicId;
  const load = useCallback(
    (signal: AbortSignal) =>
      listRecords(
        clinicId,
        "pacientes",
        `status=ACTIVE&page=${page}&q=${encodeURIComponent(query)}`,
        signal,
      ),
    [clinicId, page, query],
  );
  const result = useClinicalResource(`${query}:${page}`, load, context);
  const id = useId();
  return (
    <div className="medical-patient-select">
      <label htmlFor={`${id}-search`}>Buscar paciente</label>
      <input
        id={`${id}-search`}
        value={query}
        maxLength={100}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(1);
        }}
        placeholder="Nombre, tutor o microchip"
      />
      {result.error ? (
        <p role="alert">{result.error}</p>
      ) : !result.data ? (
        <p role="status">Buscando pacientes…</p>
      ) : (
        <>
          <label htmlFor={`${id}-patient`}>Paciente *</label>
          <select
            id={`${id}-patient`}
            required
            value={selected?.id || ""}
            onChange={(e) => {
              const p = result.data!.items.find((p) => p.id === e.target.value);
              if (p) onSelect(p as PatientSummary);
            }}
          >
            <option value="">Selecciona un paciente</option>
            {selected &&
              !result.data.items.some((p) => p.id === selected.id) && (
                <option value={selected.id}>
                  {selected.name} (seleccionado)
                </option>
              )}
            {result.data.items.map((p) => (
              <option key={p.id} value={p.id}>
                {(p as PatientSummary).name}
              </option>
            ))}
          </select>
          {result.data.total === 0 && (
            <p>No hay pacientes activos. Regístralos primero en Pacientes.</p>
          )}
          {result.data.totalPages > 1 && (
            <div className="medical-pagination">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Pacientes anteriores
              </button>
              <span>
                {page} / {result.data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= result.data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Más pacientes
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
