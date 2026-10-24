"use client";
import Link from "next/link";
import Image from "next/image";
import { PorvenirLogo } from "@/components/brand";
import { ServiceVisual, serviceCaption } from "./service-visual";
import { AuthError } from "@/lib/auth";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  PawPrint,
  ShieldCheck,
  Stethoscope,
  Heart,
  Syringe,
  HeartPulse,
} from "lucide-react";
import {
  publicBooking,
  bookingError,
  bookingTime,
  bookingDate,
  managementToken,
  bookingStates,
  type BookingCatalog,
  type BookingReceipt,
  type BookingSlot,
} from "@/lib/booking";
import { localStamp, shiftDate } from "@/lib/appointment-time";
import styles from "./public-booking.module.css";
const steps = [
  "Servicio",
  "Profesional",
  "Fecha y hora",
  "Tus datos",
  "Revisar",
];
const species = {
  DOG: "Perro",
  CAT: "Gato",
  BIRD: "Ave",
  RABBIT: "Conejo",
  RODENT: "Roedor",
  REPTILE: "Reptil",
  HORSE: "Caballo",
  OTHER: "Otra especie",
};
// Portraits belong only to the fictional booking profiles, never to real staff.
const projectProfessionals: Record<string, { photo: string; specialty: string }> = {
  "Dra. Camila Rojas": {
    photo: "/images/staff/veterinarian-demo-v2.webp",
    specialty: "Medicina veterinaria general",
  },
  "Dr. Matías Herrera": {
    photo: "/images/staff/surgeon-demo-v2.webp",
    specialty: "Cirugía y procedimientos",
  },
  "Dra. Valentina Morales": {
    photo: "/images/staff/internist-demo-v2.webp",
    specialty: "Medicina preventiva y controles",
  },
};
type Identity = { reference: string; managementToken: string };
export function PublicBookingPage({ clinicSlug }: { clinicSlug?: string }) {
  const [catalog, setCatalog] = useState<BookingCatalog | null>(null),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  const [step, setStep] = useState(0),
    [serviceId, setServiceId] = useState(""),
    [professionalId, setProfessionalId] = useState(""),
    [date, setDate] = useState(""),
    [selected, setSelected] = useState<BookingSlot | null>(null);
  const [slotState, setSlotState] = useState<{
    key: string;
    slots?: BookingSlot[];
    error?: string;
  }>({ key: "" });
  const [details, setDetails] = useState({
    ownerName: "",
    email: "",
    phone: "",
    petName: "",
    species: "DOG",
    reason: "",
    additionalInfo: "",
    website: "",
  });
  const [busy, setBusy] = useState(false),
    [receipt, setReceipt] = useState<BookingReceipt | null>(null),
    [identity, setIdentity] = useState<Identity | null>(null),
    [manage, setManage] = useState(false),
    [cancelReason, setCancelReason] = useState("");
  const [lookup, setLookup] = useState<Identity>({
      reference: "",
      managementToken: "",
    }),
    [reschedule, setReschedule] = useState(false);
  const submission = useRef<{
      signature: string;
      requestId: string;
      managementToken: string;
    } | null>(null),
    inFlight = useRef(false);
  const header = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const abort = new AbortController();
    void (async () => {
      try {
        const slug =
          clinicSlug ||
          (
            await publicBooking<{ slug: string | null }>(
              "/site",
              undefined,
              abort.signal,
            )
          ).slug;
        if (!slug) throw new Error();
        const data = await publicBooking<BookingCatalog>(
          `/${encodeURIComponent(slug)}`,
          undefined,
          abort.signal,
        );
        if (!abort.signal.aborted) {
          setCatalog(
            data.demo
              ? {
                  ...data,
                  clinic: {
                    ...data.clinic,
                    name: data.clinic.name.replace(/\s*·?\s*DEMOSTRACIÓN.*$/u, "").trim(),
                  },
                  professionals: data.professionals.map((p) => ({
                    ...p,
                    name: p.name.replace(/^\[DEMO\]\s*/u, ""),
                  })),
                  services: data.services.map((s) => ({
                    ...s,
                    description: s.description.startsWith("DEMOSTRACIÓN:")
                      ? `${serviceCaption(s.name)}${s.name === "Cirugía veterinaria" ? " Requiere confirmación previa." : ""}`
                      : s.description,
                  })),
                  policy: {
                    ...data.policy,
                    message: data.policy.message.startsWith("DEMOSTRACIÓN LOCAL")
                      ? "Las solicitudes requieren confirmación del equipo. Puedes consultar, reprogramar o cancelar tu reserva con tu comprobante."
                      : data.policy.message,
                  },
                }
              : data,
          );
        }
      } catch (e) {
        if (!abort.signal.aborted) setError(bookingError(e));
      }
    })();
    return () => abort.abort();
  }, [clinicSlug, reload]);
  const timezone = catalog?.clinic.timezone || "America/Santiago";
  const slug = catalog?.clinic.slug || "";
  const service = catalog?.services.find((s) => s.id === serviceId);
  const eligibleProfessionals = catalog?.professionals.filter((p) =>
    service?.professionalIds.includes(p.id),
  ) || [];
  const selectedProfessional = catalog?.professionals.find((p) => p.id === professionalId);
  const selectedPortrait = catalog?.demo && selectedProfessional
    ? projectProfessionals[selectedProfessional.name]?.photo
    : undefined;
  const effectiveService = receipt?.serviceId || serviceId;
  const effectiveProfessional = reschedule
    ? receipt?.professionalId || professionalId
    : professionalId;
  const slotKey = `${slug}:${effectiveService}:${effectiveProfessional}:${date}:${reload}`;
  const needsSlots =
    !!catalog?.available &&
    !!effectiveService &&
    !!date &&
    (!!effectiveProfessional || !!catalog.policy.autoAssign) &&
    (step === 2 || reschedule);
  useEffect(() => {
    if (!needsSlots) return;
    const abort = new AbortController();
    const q = new URLSearchParams({
      serviceId: effectiveService,
      date,
      ...(effectiveProfessional
        ? { professionalId: effectiveProfessional }
        : {}),
    });
    publicBooking<{ slots: BookingSlot[] }>(
      `/${encodeURIComponent(slug)}/availability?${q}`,
      undefined,
      abort.signal,
    )
      .then((data) => {
        if (!abort.signal.aborted)
          setSlotState({
            key: slotKey,
            slots: [
              ...new Map(data.slots.map((s) => [s.startsAt, s])).values(),
            ],
          });
      })
      .catch((e) => {
        if (!abort.signal.aborted)
          setSlotState({ key: slotKey, error: bookingError(e) });
      });
    return () => abort.abort();
  }, [
    needsSlots,
    effectiveService,
    effectiveProfessional,
    date,
    slug,
    slotKey,
  ]);
  function navigate(next: number) {
    setStep(next);
    setError("");
    requestAnimationFrame(() => header.current?.focus());
  }
  function saveReceipt(row: BookingReceipt, key: Identity) {
    setReceipt(row);
    setIdentity(key);
    setError("");
    try {
      sessionStorage.setItem(`pawly-booking:${slug}`, JSON.stringify(key));
    } catch {}
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected || !service || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    const payload = {
      serviceId,
      ...(professionalId ? { professionalId } : {}),
      startsAt: selected.startsAt,
      ...details,
      consent: true,
    };
    const signature = JSON.stringify(payload);
    if (submission.current?.signature !== signature)
      submission.current = {
        signature,
        requestId: crypto.randomUUID(),
        managementToken: managementToken(),
      };
    const token = submission.current;
    try {
      const row = await publicBooking<BookingReceipt>(
        `/${encodeURIComponent(slug)}`,
        {
          ...payload,
          requestId: token.requestId,
          managementToken: token.managementToken,
        },
      );
      saveReceipt(row, {
        reference: row.reference,
        managementToken: token.managementToken,
      });
    } catch (e) {
      setError(bookingError(e));
      if (e instanceof AuthError && e.status === 409) {
        setStep(2);
        setSelected(null);
      }
      setReload((n) => n + 1);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function find(event: FormEvent) {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const row = await publicBooking<BookingReceipt>(
        `/${encodeURIComponent(slug)}/lookup`,
        lookup,
      );
      saveReceipt(row, lookup);
      setManage(false);
    } catch (e) {
      setError(bookingError(e));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  async function changeBooking(event: FormEvent, cancel: boolean) {
    event.preventDefault();
    if (!identity || !receipt || inFlight.current || (!cancel && !selected))
      return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const row = await publicBooking<BookingReceipt>(
        `/${encodeURIComponent(slug)}/${cancel ? "cancel" : "reschedule"}`,
        cancel
          ? { ...identity, reason: cancelReason }
          : {
              ...identity,
              version: receipt.version,
              startsAt: selected!.startsAt,
            },
      );
      saveReceipt(row, identity);
      setReschedule(false);
      setSelected(null);
      setReload((n) => n + 1);
    } catch (e) {
      setError(bookingError(e));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  function download() {
    if (!receipt || !identity) return;
    const blob = new Blob(
      [
        `Comprobante de reserva\nClínica: ${catalog?.clinic.name}\nReferencia: ${receipt.reference}\nEstado: ${bookingStates[receipt.status]}\nFecha: ${bookingDate(receipt.startsAt, timezone)} ${bookingTime(receipt.startsAt, timezone)}\nClave privada de gestión: ${identity.managementToken}\nGestionar desde: ${window.location.origin}/reservar/${slug}\nGuarda este comprobante para consultar o modificar tu reserva. No compartas la clave de gestión.`,
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `reserva-${receipt.reference}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
  function manageExisting() {
    try {
      const saved = sessionStorage.getItem(`pawly-booking:${slug}`);
      if (saved) setLookup(JSON.parse(saved));
    } catch {}
    setManage(true);
    setReceipt(null);
    setError("");
  }
  const currentSlots: { slots?: BookingSlot[]; error?: string } =
    slotState.key === slotKey ? slotState : {};
  const slotsPanel = (
    <div className={styles.slotsPanel}>
      <label>
        Fecha de la cita
        <input
          type="date"
          required
          value={date}
          min={localStamp(new Date(), timezone).slice(0, 10)}
          max={shiftDate(
            localStamp(new Date(), timezone).slice(0, 10),
            catalog?.policy.maxAdvanceDays || 60,
          )}
          onChange={(e) => {
            setDate(e.target.value);
            setSelected(null);
          }}
        />
      </label>
      <p className={styles.help}>
        Horario local de la clínica · {timezone}. Los horarios se vuelven a
        validar al reservar.
      </p>
      {date &&
        (currentSlots.error ? (
          <p role="alert">{currentSlots.error}</p>
        ) : !currentSlots.slots ? (
          <p role="status">Consultando disponibilidad real…</p>
        ) : currentSlots.slots.length === 0 ? (
          <div className={styles.empty}>
            <CalendarDays size={26} />
            <h3>No hay horas disponibles para esta fecha.</h3>
            <p>Prueba otro día o profesional.</p>
          </div>
        ) : (
          <fieldset>
            <legend>Horas disponibles</legend>
            <div className={styles.slots}>
              {currentSlots.slots.map((slot) => (
                <label
                  key={slot.startsAt}
                  className={
                    selected?.startsAt === slot.startsAt
                      ? styles.selectedSlot
                      : ""
                  }
                >
                  <input
                    type="radio"
                    name="slot"
                    checked={selected?.startsAt === slot.startsAt}
                    onChange={() => setSelected(slot)}
                  />
                  <span>{bookingTime(slot.startsAt, timezone)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
    </div>
  );
  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.identity}>
          <PorvenirLogo className={styles.logo} />
        </Link>
        <Link href="/">
          <ArrowLeft size={15} /> Volver al sitio
        </Link>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <Image src="/images/booking/veterinary-dog.jpg" alt="Un veterinario revisa a un perro con su estetoscopio" fill sizes="(max-width: 900px) 100vw, 1400px" className={styles.featurePhoto} priority />
          <div className={styles.photoLabel}><Heart size={16} aria-hidden="true" /> CERCA EN CADA ETAPA</div>
          <div className={styles.photoDoodles} aria-hidden="true">
            <PawPrint size={38} /><Heart size={30} />
          </div>
          <div className={styles.photoCaption}>
            <span>PEQUEÑAS PATAS. GRANDES HISTORIAS.</span>
            <h2>Su próxima aventura<br />empieza <em>con bienestar.</em></h2>
            <div className={styles.welcomeCard}>
              <Image src="/images/booking/veterinary-cat.jpg" alt="Atención veterinaria de un gato" width={60} height={60} sizes="100px" className={styles.catThumbnail} />
              <div><strong>Nos encanta acompañarlos.</strong><p>Elige su atención y encuentra un momento para cuidarlo.</p></div>
            </div>
          </div>
        </aside>
        <div className={styles.workspace}>
          {catalog?.available && !receipt && !manage && (
            <nav className={styles.quickServices} aria-label="Atenciones frecuentes">
              {[
                { match: "general", label: "Consulta general", Icon: Stethoscope },
                { match: "vacun", label: "Vacunas al día", Icon: Syringe },
                { match: "control médico", label: "Control y bienestar", Icon: HeartPulse },
              ].map(({ match, label, Icon }) => {
                const attention = catalog.services.find((s) => s.name.toLocaleLowerCase("es").includes(match) && s.professionalIds.length);
                return attention ? <button key={match} type="button" disabled={busy} onClick={() => {
                  setServiceId(attention.id);
                  setProfessionalId("");
                  setSelected(null);
                  navigate(1);
                }}><span className={styles.quickIcon}><Icon size={23} aria-hidden="true" /></span><span>{label}</span><CalendarDays size={17} aria-hidden="true" /></button> : null;
              })}
            </nav>
          )}
          <header className={styles.bookingHeading}>
            <div><span className={styles.eyebrow}>PORVENIR · AGENDA VETERINARIA</span><h1>Agendar cita</h1><p>Un momento para ti. Toda una vida para ellos.</p></div>
            <Image src="/images/booking/pawly-companions.webp" alt="" width={132} height={104} className={styles.mascot} sizes="132px" />
          </header>
          {catalog && <button type="button" className={`${styles.textButton} ${styles.manageLink}`} onClick={manageExisting}>Tengo una reserva <ArrowRight size={14} aria-hidden="true" /></button>}
          {service && !receipt && !manage && (
            <div className={styles.summary} aria-label="Tu selección">
              <small>Tu selección</small>
              <h3>{service.name}</h3>
              <p>
                <Clock3 size={15} />
                {service.durationMinutes} minutos
              </p>
              {professionalId && (
                <p>
                  {selectedPortrait && <Image src={selectedPortrait} alt="" width={30} height={30} className={styles.summaryPortrait} />}
                  {selectedProfessional?.name}
                </p>
              )}
              {selected && (
                <p>
                  {bookingDate(selected.startsAt, timezone)}
                  <br />
                  {bookingTime(selected.startsAt, timezone)}
                </p>
              )}
            </div>
          )}
        <section className={styles.card} aria-label="Agendamiento veterinario">
          {error && (
            <div role="alert" className={styles.error}>
              {error}
              <button type="button" onClick={() => setReload((n) => n + 1)}>
                Actualizar
              </button>
            </div>
          )}
          {!catalog ? (
            <p role="status">
              {error
                ? "No pudimos preparar el agendamiento."
                : "Preparando agendamiento…"}
            </p>
          ) : manage ? (
            <form onSubmit={find}>
              <span className={styles.eyebrow}>GESTIONA TU RESERVA</span>
              <h2>Tu cita, a mano.</h2>
              <p>
                Ingresa los datos de tu comprobante. No buscamos reservas por
                nombre ni por correo.
              </p>
              <label>
                Referencia de reserva
                <input
                  value={lookup.reference}
                  onChange={(e) =>
                    setLookup({ ...lookup, reference: e.target.value.trim() })
                  }
                  required
                  autoComplete="off"
                  maxLength={36}
                />
              </label>
              <label>
                Clave de gestión
                <input
                  type="password"
                  value={lookup.managementToken}
                  onChange={(e) =>
                    setLookup({
                      ...lookup,
                      managementToken: e.target.value.trim(),
                    })
                  }
                  required
                  autoComplete="off"
                  minLength={43}
                  maxLength={43}
                />
              </label>
              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={() => {
                    setManage(false);
                    setError("");
                  }}
                >
                  Volver
                </button>
                <button className={styles.primary} disabled={busy}>
                  {busy ? "Consultando…" : "Consultar reserva"}
                </button>
              </div>
            </form>
          ) : receipt ? (
            <div className={styles.receipt}>
              <CheckCircle2 size={44} />
              <span className={styles.eyebrow}>
                {bookingStates[receipt.status]}
              </span>
              <h2>
                {receipt.confirmed
                  ? "Tu reserva está confirmada."
                  : receipt.status === "PENDING"
                    ? "Recibimos tu solicitud."
                    : "Reserva actualizada."}
              </h2>
              <p role="status">{receipt.message}</p>
              <dl>
                <div>
                  <dt>Referencia</dt>
                  <dd className={styles.reference}>{receipt.reference}</dd>
                </div>
                <div>
                  <dt>Fecha y hora</dt>
                  <dd>
                    {bookingDate(receipt.startsAt, timezone)}
                    <br />
                    {bookingTime(receipt.startsAt, timezone)}
                  </dd>
                </div>
                <div>
                  <dt>Servicio</dt>
                  <dd>
                    {catalog.services.find((s) => s.id === receipt.serviceId)
                      ?.name || "Servicio de la reserva"}
                  </dd>
                </div>
              </dl>
              <button type="button" onClick={download}>
                <Download size={16} />
                Guardar comprobante y clave de gestión
              </button>
              <p className={styles.help}>
                Guarda el comprobante para volver a gestionar tu reserva. No se
                ha verificado la identidad del tutor ni se han modificado fichas
                clínicas.
              </p>
              {["PENDING", "CONFIRMED"].includes(receipt.status) && (
                <>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      disabled={!catalog.available}
                      onClick={() => {
                        setReschedule(!reschedule);
                        setDate(
                          localStamp(receipt.startsAt, timezone).slice(0, 10),
                        );
                        setSelected(null);
                      }}
                    >
                      Reprogramar
                    </button>
                  </div>
                  {reschedule && (
                    <form onSubmit={(e) => void changeBooking(e, false)}>
                      {slotsPanel}
                      <button
                        className={styles.primary}
                        disabled={busy || !selected}
                      >
                        Guardar nueva fecha
                      </button>
                    </form>
                  )}
                  <form
                    className={styles.cancel}
                    onSubmit={(e) => void changeBooking(e, true)}
                  >
                    <label>
                      Motivo de cancelación
                      <input
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        required
                        maxLength={500}
                      />
                    </label>
                    <button disabled={busy}>Cancelar reserva</button>
                  </form>
                </>
              )}
              {receipt.status === "CONVERTED" && (
                <p>
                  La clínica ya vinculó esta reserva a tu paciente. Contacta al
                  equipo para modificarla.
                </p>
              )}
            </div>
          ) : !catalog.available ? (
            <div className={styles.empty}>
              <CalendarDays size={34} />
              <h2>Estamos preparando nuestra agenda.</h2>
              <p>{catalog.policy.message}</p>
              <Link href="/#ubicacion">Ver ubicación y contacto</Link>
            </div>
          ) : (
            <>
              <ol className={styles.steps} aria-label="Pasos de reserva">
                {steps.map((label, i) => (
                  <li
                    key={label}
                    aria-current={step === i ? "step" : undefined}
                  >
                    <span>{step > i ? <Check size={14} /> : i + 1}</span>
                    <small>{label}</small>
                  </li>
                ))}
              </ol>
              <h2 ref={header} tabIndex={-1}>
                {
                  [
                    "¿Qué atención necesita?",
                    "¿Con quién te gustaría atenderte?",
                    "Elige un momento para su cuidado.",
                    "Cuéntanos sobre ustedes.",
                    "Todo listo para revisar.",
                  ][step]
                }
              </h2>
              {step === 0 && (
                <>
                  <p>
                    Elige el cuidado que necesita tu compañero. Te guiaremos paso a paso.
                  </p>
                  <div className={`${styles.choices} ${styles.serviceGrid}`}>
                    {catalog.services.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        disabled={!s.professionalIds.length}
                        className={serviceId === s.id ? styles.chosen : ""}
                        aria-pressed={serviceId === s.id}
                        onClick={() => {
                          setServiceId(s.id);
                          setProfessionalId("");
                          setSelected(null);
                          navigate(1);
                        }}
                      >
                        <ServiceVisual name={s.name} className={styles.serviceIcon} />
                        <span className={styles.serviceInfo}>
                          <strong>{s.name}</strong>
                          <small>
                            {s.description || "Atención veterinaria"}
                          </small>
                        </span>
                        <span className={styles.serviceMeta}>
                          <Clock3 size={13} aria-hidden="true" /> {s.durationMinutes} min
                          <ArrowRight size={17} />
                        </span>
                        {!s.professionalIds.length && (
                          <small>Sin profesional público habilitado</small>
                        )}
                      </button>
                    ))}
                  </div>
                  {!catalog.services.length && (
                    <p className={styles.empty}>
                      La clínica todavía no ha habilitado servicios reservables.
                    </p>
                  )}
                </>
              )}
              {step === 1 && (
                <>
                  <p>
                    {eligibleProfessionals.length === 1
                      ? "Este es el profesional encargado del servicio. Selecciónalo para consultar sus horarios."
                      : "Conoce al equipo de esta atención y elige con quién agendar."}
                  </p>
                  <div className={`${styles.choices} ${styles.professionalGrid}`}>
                    {eligibleProfessionals.map((p) => {
                      const appearance = catalog.demo ? projectProfessionals[p.name] : undefined;
                      return (
                        <button
                          type="button"
                          key={p.id}
                          aria-label={p.name}
                          aria-pressed={professionalId === p.id}
                          onClick={() => {
                            setProfessionalId(p.id);
                            setSelected(null);
                            navigate(2);
                          }}
                        >
                          {appearance ? (
                            <Image src={appearance.photo} alt="" width={88} height={100} className={styles.professionalPortrait} sizes="88px" />
                          ) : (
                            <span className={styles.avatar}><Stethoscope size={23} aria-hidden="true" /></span>
                          )}
                          <span className={styles.professionalInfo}>
                            <small>EQUIPO VETERINARIO</small>
                            <strong>{p.name}</strong>
                            <span>{appearance?.specialty || "Atención veterinaria"}</span>
                            <span className={styles.professionalAction}>Ver horarios <ArrowRight size={15} aria-hidden="true" /></span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {step === 2 && (
                <>
                  {slotsPanel}
                  <div className={styles.actions}>
                    <button type="button" onClick={() => navigate(1)}>
                      Atrás
                    </button>
                    <button
                      type="button"
                      className={styles.primary}
                      disabled={!selected}
                      onClick={() => navigate(3)}
                    >
                      Continuar
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </>
              )}
              {step === 3 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    navigate(4);
                  }}
                >
                  <p>
                    Solicitamos lo necesario para coordinar la cita. No ingreses
                    antecedentes clínicos sensibles.
                  </p>
                  <div className={styles.fields}>
                    {(
                      [
                        ["ownerName", "Nombre del tutor", "text", 120],
                        ["email", "Correo electrónico", "email", 254],
                        ["phone", "Teléfono de contacto", "tel", 24],
                        ["petName", "Nombre de tu mascota", "text", 100],
                      ] as const
                    ).map(([key, label, type, maxLength]) => (
                      <label key={key}>
                        {label}
                        <input
                          type={type}
                          value={details[key]}
                          onChange={(e) =>
                            setDetails({ ...details, [key]: e.target.value })
                          }
                          required
                          maxLength={maxLength}
                          autoComplete={
                            key === "email"
                              ? "email"
                              : key === "phone"
                                ? "tel"
                                : key === "ownerName"
                                  ? "name"
                                  : "off"
                          }
                        />
                      </label>
                    ))}
                    <label>
                      Especie
                      <select
                        value={details.species}
                        onChange={(e) =>
                          setDetails({ ...details, species: e.target.value })
                        }
                      >
                        {Object.entries(species).map(([id, label]) => (
                          <option key={id} value={id}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label>
                    Motivo de la cita
                    <textarea
                      value={details.reason}
                      onChange={(e) =>
                        setDetails({ ...details, reason: e.target.value })
                      }
                      required
                      maxLength={1000}
                      rows={2}
                    />
                  </label>
                  <label>
                    Información adicional (opcional)
                    <textarea
                      value={details.additionalInfo}
                      onChange={(e) =>
                        setDetails({
                          ...details,
                          additionalInfo: e.target.value,
                        })
                      }
                      maxLength={1000}
                      rows={2}
                    />
                  </label>
                  <label className={styles.honeypot} aria-hidden="true">
                    Sitio web
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      value={details.website}
                      onChange={(e) =>
                        setDetails({ ...details, website: e.target.value })
                      }
                    />
                  </label>
                  <div className={styles.actions}>
                    <button type="button" onClick={() => navigate(2)}>
                      Atrás
                    </button>
                    <button className={styles.primary}>
                      Revisar solicitud
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>
              )}
              {step === 4 && (
                <form onSubmit={submit}>
                  <fieldset disabled={busy}>
                    <dl className={styles.review}>
                      <div>
                        <dt>Servicio</dt>
                        <dd>
                          {service?.name} · {service?.durationMinutes} minutos
                        </dd>
                      </div>
                      <div>
                        <dt>Profesional</dt>
                        <dd>
                          {professionalId
                            ? catalog.professionals.find(
                                (p) => p.id === professionalId,
                              )?.name
                            : "Asignación automática según disponibilidad"}
                        </dd>
                      </div>
                      <div>
                        <dt>Fecha y hora</dt>
                        <dd>
                          {selected && (
                            <>
                              {bookingDate(selected.startsAt, timezone)} ·{" "}
                              {bookingTime(selected.startsAt, timezone)}
                            </>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Tutor y mascota</dt>
                        <dd>
                          {details.ownerName} · {details.petName}
                        </dd>
                      </div>
                      <div>
                        <dt>Contacto</dt>
                        <dd>
                          {details.email}
                          <br />
                          {details.phone}
                        </dd>
                      </div>
                      <div>
                        <dt>Motivo</dt>
                        <dd>{details.reason}</dd>
                      </div>
                    </dl>
                    <p className={styles.policy}>{catalog.policy.message}</p>
                    <p>
                      {catalog.policy.autoConfirm
                        ? "Si el horario sigue disponible, la reserva se confirmará al enviarla."
                        : "La solicitud quedará pendiente hasta que el equipo la apruebe."}
                    </p>
                    <label className={styles.consent}>
                      <input type="checkbox" required />
                      Autorizo el uso de estos datos para gestionar esta reserva
                      y sus notificaciones. Entiendo que no es un canal de
                      urgencias.
                    </label>
                    <div className={styles.actions}>
                      <button type="button" onClick={() => navigate(3)}>
                        Corregir datos
                      </button>
                      <button className={styles.primary} disabled={busy}>
                        {busy
                          ? "Validando horario…"
                          : catalog.policy.autoConfirm
                            ? "Confirmar reserva"
                            : "Enviar solicitud"}
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </fieldset>
                </form>
              )}
              {step < 2 && step > 0 && (
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() => navigate(step - 1)}
                >
                  Atrás
                </button>
              )}
            </>
          )}
        </section>
          <p className={styles.trust}><ShieldCheck size={15} aria-hidden="true" /> Tus datos se usan para gestionar la atención de tu mascota.</p>
        </div>
      </div>
      <footer className={styles.footer}>
        <span><PawPrint size={14} aria-hidden="true" /> {catalog?.clinic.name || "Clínica Veterinaria Porvenir"} · Agendamiento</span>
        <span>Ante una urgencia, busca atención veterinaria inmediata.</span>
        {catalog?.demo && <small role="note">Proyecto personal · Perfiles y reservas ficticios. Utiliza datos de prueba.</small>}
      </footer>
    </main>
  );
}
