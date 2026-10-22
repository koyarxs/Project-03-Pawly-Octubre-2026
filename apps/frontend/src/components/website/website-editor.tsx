"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Eye,
  Globe,
  LoaderCircle,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  WorkspaceShell,
  type WorkspaceContext,
} from "@/components/workspace/workspace-shell";
import {
  EmptyState,
  LoadingState,
  PageHeader,
  StatusBadge,
} from "@/components/ui/workspace-ui";
import { AuthError } from "@/lib/auth";
import {
  getWebsite,
  publishWebsite,
  saveWebsite,
  websiteError,
  websitePhotos,
  type WebsiteContent,
  type WebsiteState,
} from "@/lib/website";
import { ClinicWebsite } from "./clinic-website";
import "./website-editor.css";

export function WebsiteEditor({ clinicId }: { clinicId: string }) {
  return (
    <WorkspaceShell clinicId={clinicId} section="sitio-web">
      {(context) =>
        context.access.role === "OWNER" || context.access.role === "ADMIN" ? (
          <EditorContent
            key={`${clinicId}:${context.session.id}:${context.revision}`}
            context={context}
          />
        ) : (
          <EmptyState
            error
            icon={ShieldCheck}
            title="Administración del sitio restringida"
            description="El contenido público solo puede ser administrado por el propietario o la administración de la veterinaria."
          />
        )
      }
    </WorkspaceShell>
  );
}

type TextKey = {
  [K in keyof WebsiteContent]-?: WebsiteContent[K] extends string ? K : never;
}[keyof WebsiteContent];
function EditorContent({ context }: { context: WorkspaceContext }) {
  const { clinicId, endSession, refresh } = context;
  const [baseline, setBaseline] = useState<WebsiteState | null>(null);
  const [values, setValues] = useState<WebsiteContent | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);
  const [retry, setRetry] = useState(0);
  const [confirmation, setConfirmation] = useState<"publish" | "unpublish">(
    "publish",
  );
  const pending = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const confirmDialog = useRef<HTMLDialogElement>(null);
  const previewDialog = useRef<HTMLDialogElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    void getWebsite(clinicId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setBaseline(result);
          setValues(result.content);
          setError("");
        }
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        if (failure instanceof AuthError && failure.status === 401)
          endSession();
        else {
          setError(websiteError(failure));
          if (failure instanceof AuthError && failure.status === 403)
            setDenied(true);
        }
      });
    return () => {
      controller.abort();
      pending.current?.abort();
    };
  }, [clinicId, retry, endSession]);
  const dirty = Boolean(
    values &&
    baseline &&
    JSON.stringify(values) !== JSON.stringify(baseline.content),
  );
  useEffect(() => {
    if (!dirty) return;
    const beforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeLeave);
    return () => window.removeEventListener("beforeunload", beforeLeave);
  }, [dirty]);
  function update<K extends keyof WebsiteContent>(
    key: K,
    value: WebsiteContent[K],
  ) {
    setValues((current) => (current ? { ...current, [key]: value } : current));
    setNotice("");
  }
  function showFailure(failure: unknown) {
    if (failure instanceof AuthError && failure.status === 401) {
      endSession();
      return;
    }
    if (failure instanceof AuthError && failure.status === 403) setDenied(true);
    setError(websiteError(failure));
    requestAnimationFrame(() => alert.current?.focus());
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current || !values || !baseline) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const controller = new AbortController();
    pending.current = controller;
    try {
      const result = await saveWebsite(
        clinicId,
        baseline.version,
        values,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setBaseline(result);
        setValues(result.content);
        setNotice(
          "Borrador guardado. El sitio público todavía no ha cambiado.",
        );
      }
    } catch (failure) {
      if (!controller.signal.aborted) showFailure(failure);
    } finally {
      lock.current = false;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  async function confirmPublication() {
    if (lock.current || !baseline || dirty) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const controller = new AbortController();
    pending.current = controller;
    try {
      const result = await publishWebsite(
        clinicId,
        baseline.version,
        controller.signal,
        confirmation === "unpublish",
      );
      if (!controller.signal.aborted) {
        setBaseline(result);
        setValues(result.content);
        setNotice(
          confirmation === "unpublish"
            ? "El sitio dejó de estar publicado. El borrador se conserva."
            : "Contenido publicado correctamente. Ya puedes revisar el sitio público.",
        );
      }
    } catch (failure) {
      if (!controller.signal.aborted) showFailure(failure);
    } finally {
      lock.current = false;
      if (!controller.signal.aborted) {
        setBusy(false);
        confirmDialog.current?.close();
      }
    }
  }
  function openConfirmation(
    kind: "publish" | "unpublish",
    trigger: HTMLButtonElement,
  ) {
    setConfirmation(kind);
    lastTrigger.current = trigger;
    confirmDialog.current?.showModal();
  }
  function restoreFocus() {
    lastTrigger.current?.focus();
  }
  if (denied)
    return (
      <EmptyState
        error
        icon={ShieldCheck}
        title="No tienes permiso para administrar este sitio."
        description={error}
        actions={
          <button className="website-secondary" onClick={refresh}>
            Volver a verificar mi acceso
          </button>
        }
      />
    );
  if (!baseline || !values)
    return error ? (
      <EmptyState
        error
        title="No pudimos cargar el editor del sitio."
        description={error}
        actions={
          <button
            className="website-secondary"
            onClick={() => setRetry((value) => value + 1)}
          >
            Reintentar
          </button>
        }
      />
    ) : (
      <LoadingState label="Cargando el contenido del sitio…" />
    );
  function field(
    key: TextKey,
    label: string,
    maxLength: number,
    options: {
      required?: boolean;
      multiline?: boolean;
      type?: string;
      hint?: string;
    } = {},
  ) {
    if (!values) return null;
    const props = {
      id: `website-${key}`,
      name: key,
      value: values[key],
      maxLength,
      required: options.required,
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => update(key, event.target.value),
      "aria-describedby": options.hint ? `website-${key}-hint` : undefined,
    };
    return (
      <div className="website-field">
        <label htmlFor={`website-${key}`}>
          {label}
          {!options.required && <span>Opcional</span>}
        </label>
        {options.multiline ? (
          <textarea {...props} rows={key === "aboutText" ? 6 : 3} />
        ) : (
          <input
            {...props}
            type={options.type || "text"}
            {...(key === "phone"
              ? {
                  pattern:
                    "^$|(?=(?:\\D*\\d){7,15}\\D*$)\\+?[\\d\\s\\(\\).\\-]{7,32}",
                }
              : key === "whatsapp"
                ? { pattern: "^$|[1-9][0-9]{7,14}", inputMode: "tel" as const }
                : {})}
          />
        )}{" "}
        {options.hint && (
          <small id={`website-${key}-hint`}>{options.hint}</small>
        )}
      </div>
    );
  }
  const published = Boolean(baseline.publishedAt);
  return (
    <div className="website-workspace">
      <PageHeader
        eyebrow="ADMINISTRACIÓN DEL SITIO"
        title="Tu veterinaria, en la web."
        description="Edita la información de Porvenir, revisa el borrador y decide cuándo publicarlo."
        actions={
          <>
            <button
              className="website-secondary"
              type="button"
              onClick={(event) => {
                lastTrigger.current = event.currentTarget;
                previewDialog.current?.showModal();
              }}
            >
              <Eye size={17} aria-hidden="true" />
              Vista previa
            </button>
            {published && (
              <Link
                className="website-secondary"
                href="/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver sitio público <ArrowUpRight size={16} aria-hidden="true" />
                <span className="sr-only"> (abre otra pestaña)</span>
              </Link>
            )}
          </>
        }
      />
      {error && (
        <div className="website-alert" role="alert" ref={alert} tabIndex={-1}>
          {error}
        </div>
      )}
      {notice && (
        <div className="website-notice" role="status">
          {notice}
        </div>
      )}
      <div className="website-editor-layout">
        <form
          onSubmit={save}
          aria-label="Contenido del sitio de la veterinaria"
          aria-busy={busy}
        >
          <fieldset disabled={busy} className="website-fieldset">
            <section
              className="website-editor-section"
              aria-labelledby="website-cover-heading"
            >
              <div className="website-section-heading">
                <span>01</span>
                <div>
                  <h2 id="website-cover-heading">Portada e identidad</h2>
                  <p>La primera impresión de tu veterinaria.</p>
                </div>
              </div>
              {field("clinicName", "Nombre público de la veterinaria", 160, {
                required: true,
                hint: "Este nombre aparece en el sitio. No cambia el nombre de los registros internos.",
              })}
              {field("tagline", "Frase de presentación", 80, {
                required: true,
              })}
              {field("heroTitle", "Título principal", 140, { required: true })}
              {field("heroDescription", "Descripción de la portada", 600, {
                required: true,
                multiline: true,
              })}
              <fieldset className="website-photo-fieldset">
                <legend>Fotografías de la portada</legend>
                <p>
                  Selecciona al menos una fotografía ilustrativa con licencia
                  documentada. No representan al equipo real de la clínica.
                </p>
                <div className="website-photo-options">
                  {websitePhotos.map((photo) => (
                    <label key={photo.id}>
                      <Image
                        src={photo.image}
                        alt={photo.label}
                        width={320}
                        height={210}
                        sizes="(max-width:639px) 40vw, 220px"
                      />
                      <span>
                        <input
                          type="checkbox"
                          checked={values.heroPhotos.includes(photo.id)}
                          disabled={
                            values.heroPhotos.includes(photo.id) &&
                            values.heroPhotos.length === 1
                          }
                          onChange={(event) =>
                            update(
                              "heroPhotos",
                              event.target.checked
                                ? [...values.heroPhotos, photo.id]
                                : values.heroPhotos.filter(
                                    (id) => id !== photo.id,
                                  ),
                            )
                          }
                        />
                        {photo.label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </section>
            <section
              className="website-editor-section"
              aria-labelledby="website-services-heading"
            >
              <div className="website-section-heading">
                <span>02</span>
                <div>
                  <h2 id="website-services-heading">Servicios</h2>
                  <p>
                    Publica únicamente prestaciones que ofrece tu veterinaria.
                  </p>
                </div>
              </div>
              <label className="website-toggle">
                <input
                  type="checkbox"
                  checked={values.showServices}
                  onChange={(event) =>
                    update("showServices", event.target.checked)
                  }
                />
                Mostrar la sección de servicios
              </label>
              <div className="website-services-editor">
                {values.services.map((service, index) => (
                  <fieldset key={index} className="website-service-editor">
                    <legend>Servicio {index + 1}</legend>
                    <div className="website-field">
                      <label htmlFor={`website-service-${index}-title`}>
                        Nombre del servicio
                      </label>
                      <input
                        id={`website-service-${index}-title`}
                        value={service.title}
                        maxLength={100}
                        required
                        onChange={(event) =>
                          update(
                            "services",
                            values.services.map((item, position) =>
                              position === index
                                ? { ...item, title: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="website-field">
                      <label htmlFor={`website-service-${index}-description`}>
                        Descripción del servicio
                      </label>
                      <textarea
                        id={`website-service-${index}-description`}
                        value={service.description}
                        maxLength={500}
                        rows={3}
                        required
                        onChange={(event) =>
                          update(
                            "services",
                            values.services.map((item, position) =>
                              position === index
                                ? { ...item, description: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <button
                      type="button"
                      className="website-remove"
                      onClick={() =>
                        update(
                          "services",
                          values.services.filter(
                            (_, position) => position !== index,
                          ),
                        )
                      }
                      aria-label={`Quitar servicio ${index + 1} del borrador`}
                    >
                      <Trash2 size={16} aria-hidden="true" />
                      Quitar del borrador
                    </button>
                  </fieldset>
                ))}
              </div>
              <button
                type="button"
                className="website-secondary"
                disabled={values.services.length >= 12}
                onClick={() =>
                  update("services", [
                    ...values.services,
                    { title: "", description: "" },
                  ])
                }
              >
                <Plus size={17} aria-hidden="true" />
                Añadir servicio
              </button>
              <p className="website-help">
                Hasta 12 servicios. Quitar un servicio del borrador solo
                modifica el sitio al volver a publicar.
              </p>
            </section>
            <section
              className="website-editor-section"
              aria-labelledby="website-about-heading"
            >
              <div className="website-section-heading">
                <span>03</span>
                <div>
                  <h2 id="website-about-heading">Nuestra veterinaria</h2>
                  <p>
                    Cuenta quiénes son y cómo trabajan, con información
                    verificable.
                  </p>
                </div>
              </div>
              <label className="website-toggle">
                <input
                  type="checkbox"
                  checked={values.showAbout}
                  onChange={(event) =>
                    update("showAbout", event.target.checked)
                  }
                />
                Mostrar la presentación de la veterinaria
              </label>
              {field("aboutTitle", "Título de la presentación", 140, {
                required: values.showAbout,
              })}
              {field("aboutText", "Presentación de la veterinaria", 2000, {
                required: values.showAbout,
                multiline: true,
              })}
            </section>
            <section
              className="website-editor-section"
              aria-labelledby="website-testimonials-heading"
            >
              <div className="website-section-heading">
                <span>04</span>
                <div>
                  <h2 id="website-testimonials-heading">Testimonios reales</h2>
                  <p>
                    Añade únicamente opiniones auténticas que tengas permiso
                    para publicar. No incluyas información clínica privada.
                  </p>
                </div>
              </div>
              {(values.testimonials ?? []).map((item, index) => (
                <div className="website-service-editor" key={index}>
                  <h3>Testimonio {index + 1}</h3>
                  {(
                    [
                      ["author", "Nombre para mostrar", 100],
                      ["companion", "Mascota o contexto", 100],
                      ["quote", "Opinión del cliente", 600],
                    ] as const
                  ).map(([key, label, max]) => (
                    <div className="website-field" key={key}>
                      <label htmlFor={`website-testimonial-${index}-${key}`}>
                        {label} {index + 1}
                      </label>
                      {key === "quote" ? (
                        <textarea
                          id={`website-testimonial-${index}-${key}`}
                          rows={4}
                          maxLength={max}
                          required
                          value={item[key]}
                          onChange={(event) =>
                            update(
                              "testimonials",
                              (values.testimonials ?? []).map((current, i) =>
                                i === index
                                  ? { ...current, [key]: event.target.value }
                                  : current,
                              ),
                            )
                          }
                        />
                      ) : (
                        <input
                          id={`website-testimonial-${index}-${key}`}
                          maxLength={max}
                          required={key === "author"}
                          value={item[key]}
                          onChange={(event) =>
                            update(
                              "testimonials",
                              (values.testimonials ?? []).map((current, i) =>
                                i === index
                                  ? { ...current, [key]: event.target.value }
                                  : current,
                              ),
                            )
                          }
                        />
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="website-remove"
                    onClick={() =>
                      update(
                        "testimonials",
                        (values.testimonials ?? []).filter(
                          (_, i) => i !== index,
                        ),
                      )
                    }
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    Quitar testimonio {index + 1}
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="website-secondary"
                disabled={(values.testimonials?.length ?? 0) >= 12}
                onClick={() =>
                  update("testimonials", [
                    ...(values.testimonials ?? []),
                    { author: "", companion: "", quote: "" },
                  ])
                }
              >
                <Plus size={17} aria-hidden="true" />
                Añadir testimonio
              </button>
              <p className="website-help">
                Sin opiniones publicadas, se muestran ejemplos claramente
                rotulados como ficticios. Al publicar testimonios reales, estos
                reemplazan la demostración. No se generan puntuaciones
                automáticas.
              </p>
            </section>
            <section
              className="website-editor-section"
              aria-labelledby="website-contact-heading"
            >
              <div className="website-section-heading">
                <span>05</span>
                <div>
                  <h2 id="website-contact-heading">Contacto y horarios</h2>
                  <p>
                    Para publicar, configura al menos un teléfono, correo o
                    WhatsApp.
                  </p>
                </div>
              </div>
              <div className="website-field-grid">
                {field("phone", "Teléfono", 32, { type: "tel" })}
                {field("whatsapp", "WhatsApp", 15, {
                  hint: "Solo dígitos, con código de país. Sin +, espacios ni enlaces.",
                })}
              </div>
              {field("email", "Correo de contacto público", 254, {
                type: "email",
                hint: "Se mostrará en el sitio. No tiene que ser el correo privado de tu cuenta.",
              })}
              {field("address", "Dirección de la veterinaria", 300, {
                hint: "Incluye calle, número, comuna y ciudad. El mapa usará exactamente esta dirección; se carga solo al elegir explorarlo.",
              })}
              <label className="website-toggle">
                <input
                  type="checkbox"
                  checked={values.showHours}
                  onChange={(event) =>
                    update("showHours", event.target.checked)
                  }
                />
                Mostrar horarios de atención
              </label>
              {field("hours", "Horarios de atención", 500, {
                required: values.showHours,
                multiline: true,
                hint: "Indica días, horarios y excepciones reales. Este texto no configura disponibilidad de la agenda interna.",
              })}
            </section>
            <div className="website-save-bar">
              <p role="status">
                {dirty
                  ? "Tienes cambios sin guardar."
                  : "El borrador está guardado."}
              </p>
              <button
                type="submit"
                className="website-primary"
                disabled={busy || (!dirty && baseline.version > 0)}
              >
                {busy ? (
                  <LoaderCircle
                    size={17}
                    className="auth-spinner"
                    aria-hidden="true"
                  />
                ) : (
                  <Save size={17} aria-hidden="true" />
                )}
                Guardar borrador
              </button>
            </div>
          </fieldset>
        </form>
        <aside
          className="website-publication"
          aria-labelledby="website-publication-heading"
        >
          <Globe size={26} strokeWidth={1.5} aria-hidden="true" />
          <h2 id="website-publication-heading">Estado del sitio</h2>
          <StatusBadge tone={published ? "positive" : "neutral"}>
            {published ? "Sitio publicado" : "Sin publicar"}
          </StatusBadge>
          <p>
            {published
              ? "Las personas ven la última versión que publicaste. Guardar un borrador no cambia el sitio público."
              : "El borrador es privado. La portada muestra únicamente el diseño editorial de preparación, sin tus contactos ni servicios, hasta que publiques."}
          </p>
          {baseline.publishedAt && (
            <p className="website-published-time">
              Última publicación:{" "}
              {new Intl.DateTimeFormat("es-CL", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "America/Santiago",
              }).format(new Date(baseline.publishedAt))}
            </p>
          )}
          {(dirty || baseline.hasUnpublishedChanges) && (
            <span className="website-draft-note">
              Hay contenido pendiente de publicar.
            </span>
          )}
          <button
            type="button"
            className="website-primary"
            disabled={
              busy ||
              dirty ||
              baseline.version === 0 ||
              !baseline.hasUnpublishedChanges
            }
            onClick={(event) =>
              openConfirmation("publish", event.currentTarget)
            }
          >
            {published ? "Publicar cambios" : "Publicar sitio"}
            <ArrowUpRight size={17} aria-hidden="true" />
          </button>
          {dirty && (
            <p className="website-help">
              Guarda el borrador antes de publicar.
            </p>
          )}
          {published && (
            <button
              type="button"
              className="website-unpublish"
              disabled={busy || dirty}
              onClick={(event) =>
                openConfirmation("unpublish", event.currentTarget)
              }
            >
              Retirar publicación
            </button>
          )}
          <div className="website-privacy-note">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              No publiques datos de pacientes, tutores ni información clínica.
              El editor administra únicamente el contenido público.
            </p>
          </div>
        </aside>
      </div>
      <dialog
        ref={confirmDialog}
        className="website-confirm-dialog"
        aria-labelledby="website-confirm-title"
        onClose={restoreFocus}
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <h2 id="website-confirm-title">
          {confirmation === "unpublish"
            ? "¿Retirar la publicación?"
            : "¿Publicar el contenido del sitio?"}
        </h2>
        <p>
          {confirmation === "unpublish"
            ? "La página pública volverá al estado de preparación. El borrador y los registros internos se conservan."
            : "Los textos, servicios, fotografías y datos de contacto del borrador serán visibles públicamente. Revisa que sean correctos y no incluyan información clínica privada."}
        </p>
        <div>
          <button
            type="button"
            className="website-secondary"
            disabled={busy}
            onClick={() => confirmDialog.current?.close()}
          >
            Volver al editor
          </button>
          <button
            type="button"
            className="website-primary"
            disabled={busy}
            onClick={() => void confirmPublication()}
          >
            {busy
              ? "Procesando…"
              : confirmation === "unpublish"
                ? "Confirmar retirada"
                : "Confirmar publicación"}
          </button>
        </div>
      </dialog>
      <dialog
        ref={previewDialog}
        className="website-preview-dialog"
        aria-labelledby="website-preview-title"
        onClose={restoreFocus}
      >
        <header>
          <div>
            <span>VISTA PREVIA PRIVADA</span>
            <h2 id="website-preview-title">Así se verá tu sitio</h2>
          </div>
          <button
            type="button"
            className="website-secondary"
            onClick={() => previewDialog.current?.close()}
            aria-label="Cerrar vista previa"
          >
            <X size={20} aria-hidden="true" />
            Cerrar
          </button>
        </header>
        <p className="website-preview-disclosure">
          Esta vista incluye tus cambios sin guardar. No publica ni modifica la
          información clínica.
        </p>
        <div className="website-preview-content">
          <ClinicWebsite content={values} preview />
        </div>
      </dialog>
    </div>
  );
}
