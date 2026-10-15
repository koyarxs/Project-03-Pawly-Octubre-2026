"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { AuthError } from "@/lib/auth";
import {
  clinicalError,
  clinicalPath,
  fullName,
  listRecords,
  saveRecord,
  sexNames,
  speciesNames,
  type ClinicalKind,
  type Patient,
  type PatientInput,
  type Tutor,
  type TutorInput,
  type TutorSummary,
} from "@/lib/clinical";
import type { WorkspaceContext } from "@/components/workspace/workspace-shell";
import { useClinicalLoad } from "./use-clinical-load";

type Fields = Record<string, string>;
const optional = (value: string | undefined) => value?.trim() || null;
function InputField({
  id,
  label,
  values,
  update,
  errors,
  type = "text",
  required = false,
  maxLength = 100,
  multiline = false,
  hint,
}: {
  id: string;
  label: string;
  values: Fields;
  update: (key: string, value: string) => void;
  errors: Fields;
  type?: string;
  required?: boolean;
  maxLength?: number;
  multiline?: boolean;
  hint?: string;
}) {
  const props = {
    id: `clinical-${id}`,
    name: id,
    value: values[id] ?? "",
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => update(id, event.target.value),
    maxLength,
    required,
    "aria-invalid": Boolean(errors[id]),
    "aria-describedby": errors[id]
      ? `clinical-${id}-error`
      : hint
        ? `clinical-${id}-hint`
        : undefined,
  };
  return (
    <div className={`clinical-field ${multiline ? "clinical-field-wide" : ""}`}>
      <label htmlFor={`clinical-${id}`}>
        {label}
        {!required && <span>Opcional</span>}
      </label>
      {multiline ? (
        <textarea {...props} rows={4} />
      ) : (
        <input
          {...props}
          type={type}
          {...(type === "number"
            ? { step: "0.001", min: "0.001", max: "10000" }
            : {})}
        />
      )}
      {hint && !errors[id] && <small id={`clinical-${id}-hint`}>{hint}</small>}
      {errors[id] && (
        <small className="clinical-field-error" id={`clinical-${id}-error`}>
          {errors[id]}
        </small>
      )}
    </div>
  );
}

function TutorPicker({
  context,
  selected,
  onSelect,
  error,
}: {
  context: WorkspaceContext;
  selected: { id: string; firstName: string; lastName: string }[];
  onSelect: (
    value: { id: string; firstName: string; lastName: string }[],
  ) => void;
  error?: string;
}) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({
    page: String(page),
    limit: "20",
    q: query,
  }).toString();
  const load = useCallback(
    (signal: AbortSignal) =>
      listRecords(context.clinicId, "tutores", params, signal),
    [context.clinicId, params],
  );
  const { state, retry } = useClinicalLoad(`picker:${params}`, load, context);
  return (
    <fieldset
      className="clinical-tutor-picker"
      id="clinical-tutorIds"
      tabIndex={-1}
      aria-describedby={
        error ? "clinical-tutors-error" : "clinical-tutors-hint"
      }
    >
      <legend>Responsables asociados</legend>
      <p id="clinical-tutors-hint">
        Selecciona entre 1 y 10 tutores activos de esta clínica.
      </p>
      <div className="clinical-picker-search">
        <input
          aria-label="Buscar responsables"
          placeholder="Buscar por nombre o contacto"
          value={search}
          maxLength={100}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              setPage(1);
              setQuery(search.trim());
            }
          }}
        />
        <button
          type="button"
          className="clinical-secondary"
          onClick={() => {
            setPage(1);
            setQuery(search.trim());
          }}
        >
          Buscar responsables
        </button>
      </div>
      {selected.length > 0 && (
        <div
          className="clinical-selected-tutors"
          aria-label="Responsables seleccionados"
        >
          {selected.map((tutor) => (
            <button
              type="button"
              key={tutor.id}
              onClick={() =>
                onSelect(selected.filter((item) => item.id !== tutor.id))
              }
              aria-label={`Quitar a ${fullName(tutor)}`}
            >
              {fullName(tutor)} <span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
      {state.kind === "loading" ? (
        <p role="status">Cargando responsables…</p>
      ) : state.kind === "error" ? (
        <div role="alert">
          <p>{state.message}</p>
          <button type="button" className="clinical-secondary" onClick={retry}>
            Volver a intentar
          </button>
        </div>
      ) : (
        <>
          <div className="clinical-picker-options">
            {state.data.items.length === 0 ? (
              <p>
                No hay tutores disponibles con esta búsqueda. Registra un tutor
                antes de asociarlo.
              </p>
            ) : (
              (state.data.items as TutorSummary[]).map((tutor) => (
                <label key={tutor.id}>
                  <input
                    type="checkbox"
                    checked={selected.some((item) => item.id === tutor.id)}
                    disabled={
                      selected.length >= 10 &&
                      !selected.some((item) => item.id === tutor.id)
                    }
                    onChange={(event) =>
                      onSelect(
                        event.target.checked
                          ? [...selected, tutor]
                          : selected.filter((item) => item.id !== tutor.id),
                      )
                    }
                  />
                  <span>
                    <strong>{fullName(tutor)}</strong>
                    <small>{tutor.phone}</small>
                  </span>
                </label>
              ))
            )}
          </div>
          <div className="clinical-picker-pagination">
            <button
              type="button"
              className="clinical-secondary"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Anteriores
            </button>
            <span>Página {page}</span>
            <button
              type="button"
              className="clinical-secondary"
              disabled={page >= state.data.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Siguientes
            </button>
          </div>
        </>
      )}
      {error && (
        <p
          id="clinical-tutors-error"
          className="clinical-field-error"
          role="alert"
        >
          {error}
        </p>
      )}
      <Link
        className="clinical-record-link"
        href={`${clinicalPath(context.clinicId, "tutores")}/nuevo`}
      >
        Registrar un tutor <ArrowRight size={15} />
      </Link>
    </fieldset>
  );
}

export function ClinicalForm({
  context,
  kind,
  initial,
}: {
  context: WorkspaceContext;
  kind: ClinicalKind;
  initial?: Tutor | Patient;
}) {
  const tutor = kind === "tutores" ? (initial as Tutor | undefined) : undefined;
  const patient =
    kind === "pacientes" ? (initial as Patient | undefined) : undefined;
  const [values, setValues] = useState<Fields>(
    kind === "tutores"
      ? {
          firstName: tutor?.firstName ?? "",
          lastName: tutor?.lastName ?? "",
          phone: tutor?.phone ?? "",
          email: tutor?.email ?? "",
          address: tutor?.address ?? "",
          notes: tutor?.notes ?? "",
        }
      : {
          name: patient?.name ?? "",
          species: patient?.species ?? "",
          sex: patient?.sex ?? "UNKNOWN",
          breed: patient?.breed ?? "",
          birthDate: patient?.birthDate ?? "",
          weightKg: patient?.weightKg?.toString() ?? "",
          color: patient?.color ?? "",
          microchip: patient?.microchip ?? "",
          status: patient?.status === "DECEASED" ? "DECEASED" : "ACTIVE",
          notes: patient?.notes ?? "",
        },
  );
  const [selected, setSelected] = useState(patient?.tutors ?? []);
  const [errors, setErrors] = useState<Fields>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Tutor | Patient | null>(null);
  const pending = useRef<AbortController | null>(null);
  const lock = useRef(false);
  useEffect(() => () => pending.current?.abort(), []);
  const update = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setMessage("");
  };
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    const invalid: Fields = {};
    for (const key of kind === "tutores"
      ? ["firstName", "lastName", "phone"]
      : ["name"])
      if (!values[key]?.trim()) invalid[key] = "Completa este campo.";
    if (kind === "tutores") {
      if (
        values.phone &&
        !/^(?=(?:\D*\d){7,15}\D*$)\+?[\d\s().-]{7,32}$/.test(
          values.phone.trim(),
        )
      )
        invalid.phone = "Ingresa un teléfono de contacto válido.";
      if (
        values.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())
      )
        invalid.email = "Ingresa un correo válido o deja el campo vacío.";
    } else {
      if (!Object.hasOwn(speciesNames, values.species ?? ""))
        invalid.species = "Selecciona una especie.";
      if (selected.length === 0 || selected.length > 10)
        invalid.tutorIds =
          "Selecciona al menos un responsable de esta clínica.";
      if (values.birthDate) {
        const date = new Date(`${values.birthDate}T00:00:00.000Z`);
        if (
          Number.isNaN(date.valueOf()) ||
          date.toISOString().slice(0, 10) !== values.birthDate ||
          values.birthDate < "1900-01-01" ||
          values.birthDate > new Date().toISOString().slice(0, 10)
        )
          invalid.birthDate =
            "Ingresa una fecha válida que no esté en el futuro.";
      }
      if (
        values.weightKg &&
        (!Number.isFinite(Number(values.weightKg)) ||
          Number(values.weightKg) <= 0 ||
          Number(values.weightKg) > 10000 ||
          !/^\d+(\.\d{1,3})?$/.test(values.weightKg))
      )
        invalid.weightKg =
          "Ingresa un peso positivo en kg, con hasta 3 decimales.";
      if (
        values.microchip &&
        !/^[A-Za-z0-9-]{1,64}$/.test(values.microchip.trim())
      )
        invalid.microchip = "Usa solo letras, números o guiones.";
    }
    setErrors(invalid);
    setMessage("");
    if (Object.keys(invalid).length) {
      document.getElementById(`clinical-${Object.keys(invalid)[0]}`)?.focus();
      return;
    }
    const input: TutorInput | PatientInput =
      kind === "tutores"
        ? {
            firstName: values.firstName!.trim(),
            lastName: values.lastName!.trim(),
            phone: values.phone!.trim(),
            email: optional(values.email),
            address: optional(values.address),
            notes: optional(values.notes),
          }
        : {
            name: values.name!.trim(),
            species: values.species as Patient["species"],
            sex: values.sex as Patient["sex"],
            breed: optional(values.breed),
            birthDate: optional(values.birthDate),
            weightKg: values.weightKg ? Number(values.weightKg) : null,
            color: optional(values.color),
            microchip: optional(values.microchip),
            status: values.status as "ACTIVE" | "DECEASED",
            notes: optional(values.notes),
            tutorIds: selected.map((item) => item.id),
          };
    const controller = new AbortController();
    pending.current = controller;
    lock.current = true;
    setBusy(true);
    try {
      const result = await saveRecord(
        context.clinicId,
        kind,
        input,
        initial?.id,
        controller.signal,
      );
      if (!controller.signal.aborted) setSaved(result);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof AuthError && error.status === 401)
        context.endSession();
      else if (error instanceof AuthError && error.status === 403)
        context.refresh();
      else setMessage(clinicalError(error, "save"));
    } finally {
      if (!controller.signal.aborted) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  if (saved)
    return (
      <section className="clinical-success" role="status">
        <span>
          <Check size={26} />
        </span>
        <h1>
          {kind === "tutores"
            ? initial
              ? "Tutor actualizado."
              : "Tutor registrado."
            : initial
              ? "Paciente actualizado."
              : "Paciente registrado."}
        </h1>
        <p>
          {kind === "tutores"
            ? fullName(saved as Tutor)
            : (saved as Patient).name}{" "}
          ya está disponible en {context.access.name}.
        </p>
        <Link
          className="clinical-primary"
          href={clinicalPath(context.clinicId, kind, saved.id)}
        >
          Ver ficha <ArrowRight size={17} />
        </Link>
        <Link
          className="clinical-record-link"
          href={clinicalPath(context.clinicId, kind)}
        >
          Volver al listado
        </Link>
      </section>
    );
  return (
    <>
      <div className="clinical-heading">
        <div>
          <span className="dashboard-eyebrow">{context.access.name}</span>
          <h1>
            {initial
              ? kind === "tutores"
                ? "Editar tutor"
                : "Editar paciente"
              : kind === "tutores"
                ? "Registrar tutor"
                : "Registrar paciente"}
          </h1>
          <p>
            {kind === "tutores"
              ? "Completa los datos de contacto del responsable."
              : "Crea una ficha y vincula a sus responsables."}
          </p>
        </div>
        <Link
          className="clinical-record-link"
          href={
            initial
              ? clinicalPath(context.clinicId, kind, initial.id)
              : clinicalPath(context.clinicId, kind)
          }
        >
          Cancelar
        </Link>
      </div>
      <form
        className="clinical-form"
        noValidate
        onSubmit={submit}
        aria-busy={busy}
      >
        <fieldset disabled={busy}>
          <legend className="clinical-form-legend">
            {kind === "tutores"
              ? "Información del tutor"
              : "Información del paciente"}
          </legend>
          <div className="clinical-form-grid">
            {kind === "tutores" ? (
              <>
                <InputField
                  id="firstName"
                  label="Nombre"
                  values={values}
                  update={update}
                  errors={errors}
                  required
                />
                <InputField
                  id="lastName"
                  label="Apellidos"
                  values={values}
                  update={update}
                  errors={errors}
                  required
                />
                <InputField
                  id="phone"
                  label="Teléfono de contacto"
                  values={values}
                  update={update}
                  errors={errors}
                  type="tel"
                  required
                  maxLength={32}
                  hint="Incluye el código de país cuando corresponda."
                />
                <InputField
                  id="email"
                  label="Correo electrónico"
                  values={values}
                  update={update}
                  errors={errors}
                  type="email"
                  maxLength={254}
                />
                <InputField
                  id="address"
                  label="Dirección"
                  values={values}
                  update={update}
                  errors={errors}
                  maxLength={500}
                  multiline
                />
              </>
            ) : (
              <>
                <InputField
                  id="name"
                  label="Nombre de la mascota"
                  values={values}
                  update={update}
                  errors={errors}
                  required
                />
                <div className="clinical-field">
                  <label htmlFor="clinical-species">Especie</label>
                  <select
                    id="clinical-species"
                    required
                    aria-invalid={Boolean(errors.species)}
                    aria-describedby={
                      errors.species ? "clinical-species-error" : undefined
                    }
                    value={values.species}
                    onChange={(event) => update("species", event.target.value)}
                  >
                    <option value="">Selecciona una especie</option>
                    {Object.entries(speciesNames).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {errors.species && (
                    <small
                      className="clinical-field-error"
                      id="clinical-species-error"
                    >
                      {errors.species}
                    </small>
                  )}
                </div>
                <InputField
                  id="breed"
                  label="Raza"
                  values={values}
                  update={update}
                  errors={errors}
                />
                <div className="clinical-field">
                  <label htmlFor="clinical-sex">Sexo</label>
                  <select
                    id="clinical-sex"
                    value={values.sex}
                    onChange={(event) => update("sex", event.target.value)}
                  >
                    {Object.entries(sexNames).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <InputField
                  id="birthDate"
                  label="Fecha de nacimiento"
                  values={values}
                  update={update}
                  errors={errors}
                  type="date"
                  hint="Si la fecha es desconocida, deja este campo vacío."
                />
                <InputField
                  id="weightKg"
                  label="Peso (kg)"
                  values={values}
                  update={update}
                  errors={errors}
                  type="number"
                  hint="Kilogramos, con hasta 3 decimales."
                />
                <InputField
                  id="color"
                  label="Color"
                  values={values}
                  update={update}
                  errors={errors}
                />
                <InputField
                  id="microchip"
                  label="Microchip"
                  values={values}
                  update={update}
                  errors={errors}
                  maxLength={64}
                />
                <div className="clinical-field">
                  <label htmlFor="clinical-status">Estado del paciente</label>
                  <select
                    id="clinical-status"
                    value={values.status}
                    onChange={(event) => update("status", event.target.value)}
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="DECEASED">Fallecido</option>
                  </select>
                </div>
              </>
            )}
            <InputField
              id="notes"
              label="Observaciones"
              values={values}
              update={update}
              errors={errors}
              maxLength={2000}
              multiline
            />
          </div>
          {kind === "pacientes" && (
            <TutorPicker
              context={context}
              selected={selected}
              onSelect={setSelected}
              error={errors.tutorIds}
            />
          )}
        </fieldset>
        {Object.values(errors).some(Boolean) && (
          <div className="clinical-alert" role="alert">
            Revisa los campos indicados antes de guardar.
          </div>
        )}
        {message && (
          <div className="clinical-alert" role="alert">
            {message}
            <button type="button" onClick={context.refresh}>
              Verificar mi acceso
            </button>
          </div>
        )}
        <div className="clinical-form-footer">
          <p>Los campos sin la indicación «Opcional» son obligatorios.</p>
          <button className="clinical-primary" disabled={busy} type="submit">
            {busy && <LoaderCircle className="auth-spinner" size={17} />}
            {busy
              ? "Guardando…"
              : initial
                ? "Guardar cambios"
                : kind === "tutores"
                  ? "Registrar tutor"
                  : "Registrar paciente"}
          </button>
        </div>
      </form>
    </>
  );
}
