"use client";
import Link from "next/link";
import Image from "next/image";
import { PorvenirLogo } from "@/components/brand";
import { serviceCaption, ServiceVisual } from "./service-visual";
import { BookingDateStrip } from "./booking-date-strip";
import { BookingCancellation } from "./booking-cancellation";
import { isValidRut, normalizeRut } from "@/lib/rut";
import { readBookingIntent, type BookingIntent } from "@/lib/booking-intent";
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
  MapPin,
  Mail,
  Search,
} from "lucide-react";
import {
  publicBooking,
  bookingError,
  bookingTime,
  bookingDate,
  managementToken,
  bookingStates,
  bookingDocument,
  type BookingCatalog,
  type BookingReceipt,
  type BookingSlot,
} from "@/lib/booking";
import { localStamp, shiftDate } from "@/lib/appointment-time";
import styles from "./public-booking.module.css";
const steps = [
  "Tutor",
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
  const [step, setStep] = useState(-1),
    [serviceId, setServiceId] = useState(""),
    [professionalId, setProfessionalId] = useState(""),
    [date, setDate] = useState(""),
    [selected, setSelected] = useState<BookingSlot | null>(null);
  const [slotState, setSlotState] = useState<{
    key: string;
    slots?: BookingSlot[];
    error?: string;
  }>({ key: "" });
  const [searchMode, setSearchMode] = useState<"service" | "professional">("service");
  const [professionalQuery, setProfessionalQuery] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [details, setDetails] = useState({
    ownerRut: "",
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
    [cancellationOpen, setCancellationOpen] = useState(false);
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
  const incomingSelection = useRef<BookingIntent | null>(null);
  const selectionRead = useRef(false);
  const emailLinkRead = useRef(false);
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
          if(!selectionRead.current){
            selectionRead.current=true;
            const intent=readBookingIntent(window.location.search,data);
            if(intent){incomingSelection.current=intent;setServiceId(intent.serviceId);setProfessionalId(intent.professionalId);setDate(intent.date);}
          }
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
  const visibleProfessionals = eligibleProfessionals.filter(person => searchMode !== "professional" || person.name.toLocaleLowerCase("es").includes(professionalQuery.trim().toLocaleLowerCase("es")));
  useEffect(() => {
    if (!catalog || emailLinkRead.current) return;
    emailLinkRead.current = true;
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const reference = fragment.get("reference"), managementToken = fragment.get("key");
    if (!reference || !managementToken || !/^[0-9a-f-]{36}$/i.test(reference) || !/^[A-Za-z0-9_-]{43}$/.test(managementToken)) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    const abort = new AbortController();
    const access = { reference, managementToken };
    void publicBooking<BookingReceipt>(`/${encodeURIComponent(catalog.clinic.slug)}/lookup`, access, abort.signal).then(row => { if (!abort.signal.aborted) { saveReceipt(row, access); setManage(false); } }).catch(e => { if (!abort.signal.aborted) { setLookup(access); setManage(true); setError(bookingError(e)); } });
    return () => abort.abort();
    // This capability is read once when the public catalog is ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog?.clinic.slug]);
  const selectedPortrait = catalog?.demo && selectedProfessional
    ? projectProfessionals[selectedProfessional.name]?.photo
    : undefined;
  useEffect(() => {
    if (!receipt || !identity || !["queued", "failed"].includes(receipt.emailDelivery || "") || !slug) return;
    const abort = new AbortController();
    let attempts = 0;
    let checking = false;
    const timer = window.setInterval(() => {
      if (checking) return;
      if (++attempts >= 64) window.clearInterval(timer);
      checking = true;
      void publicBooking<BookingReceipt>(`/${encodeURIComponent(slug)}/lookup`, identity, abort.signal).then(row => {
        if (!abort.signal.aborted) setReceipt(current => current?.reference === row.reference && row.version >= current.version ? row : current);
      }).catch(() => { /* Download remains available even if mail status cannot be refreshed. */ }).finally(() => { checking = false; });
    }, 10000);
    return () => { window.clearInterval(timer); abort.abort(); };
    // Poll only while this receipt is awaiting a delivery result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt?.reference, receipt?.emailDelivery, identity?.managementToken, slug]);
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
        if (!abort.signal.aborted) {
          setSlotState({
            key: slotKey,
            slots: [
              ...new Map(data.slots.map((s) => [`${s.professionalId}:${s.startsAt}`, s])).values(),
            ],
          });
          const intent=incomingSelection.current;
          if(intent && intent.serviceId===effectiveService && intent.professionalId===effectiveProfessional && intent.date===date){
            const match=data.slots.find(slot=>slot.startsAt===intent.startsAt && slot.professionalId===intent.professionalId);
            incomingSelection.current=null;
            setSelected(match ?? null);
            if(!match)setError("El horario elegido ya no está disponible. Selecciona otro horario para continuar.");
          }
        }
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
    setReceipt(previous => previous?.reference === row.reference ? { ...previous, ...row } : row);
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
  async function changeBooking(event: FormEvent, cancel: boolean, reason = "") {
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
          ? { ...identity, reason }
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
      setError(cancel && e instanceof AuthError && e.status === 409 ? "No pudimos anular la reserva. El estado o el plazo de modificación cambió. Contacta al equipo de la clínica para revisarla." : bookingError(e));
    } finally {
      setBusy(false);
      inFlight.current = false;
    }
  }
  async function download(kind: "receipt" | "calendar" = "receipt") {
    if (!receipt || !identity) return;
    if (downloading) return;
    setDownloading(true);
    try {
    const blob = await bookingDocument(slug, kind, identity);
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `${kind === "receipt" ? "comprobante" : "cita"}-porvenir-${receipt.reference}.${kind === "receipt" ? "pdf" : "ics"}`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(bookingError(e)); } finally { setDownloading(false); }
  }
  function manageExisting() {
    setCancellationOpen(false);
    try {
      const saved = sessionStorage.getItem(`pawly-booking:${slug}`);
      if (saved) setLookup(JSON.parse(saved));
    } catch {}
    setManage(true);
    setReceipt(null);
    setError("");
  }
  function bookAnother() {
    setDetails(previous => ({ ...previous, petName: "", reason: "", additionalInfo: "", website: "" }));
    setReceipt(null); setIdentity(null); setCancellationOpen(false); setReschedule(false); setManage(false);
    setSelected(null); setServiceId(""); setProfessionalId(""); setDate(""); submission.current = null;
    navigate(isValidRut(details.ownerRut) ? 0 : -1);
  }
  const currentSlots: { slots?: BookingSlot[]; error?: string } =
    slotState.key === slotKey ? slotState : {};
  const firstDay = localStamp(new Date(), timezone).slice(0, 10);
  const lastDay = shiftDate(firstDay, catalog?.policy.maxAdvanceDays || 60);
  const slotsPanel = (
    <div className={styles.slotsPanel}>
      <BookingDateStrip value={date} min={firstDay} max={lastDay} onChange={value => { setDate(value); setSelected(null); }} />
      <div className={styles.dateInputRow}>
      <label>
        Fecha de la cita
        <input
          type="date"
          required
          value={date}
          min={firstDay}
          max={lastDay}
          onChange={(e) => {
            setDate(e.target.value);
            setSelected(null);
          }}
        />
      </label>
      <p className={styles.help}>
        Horario local de la clínica · {timezone}.
      </p>
      </div>
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
          <fieldset className={styles.availabilityResult}>
            <div className={styles.availableProfessional}><span className={styles.avatar}><Stethoscope size={23} aria-hidden="true" /></span><div><strong>{catalog?.professionals.find(person => person.id === effectiveProfessional)?.name || "Equipo de la clínica"}</strong><span>{service?.name || "Atención veterinaria"}</span></div><small>{currentSlots.slots.length} horas</small></div>
            <legend>Horas disponibles</legend>
            <div className={styles.slots}>
              {currentSlots.slots.map((slot) => (
                <label
                  key={`${slot.professionalId}:${slot.startsAt}`}
                  className={
                    selected?.startsAt === slot.startsAt && selected.professionalId === slot.professionalId
                      ? styles.selectedSlot
                      : ""
                  }
                >
                  <input
                    type="radio"
                    name="slot"
                    checked={selected?.startsAt === slot.startsAt && selected.professionalId === slot.professionalId}
                    onChange={() => setSelected(slot)}
                  />
                  <span>{bookingTime(slot.startsAt, timezone).split(" GMT")[0]}</span>
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
          <div className={styles.photoCaption}>
            <span>PEQUEÑAS PATAS. GRANDES HISTORIAS.</span>
            <h2>Su próxima aventura<br />empieza <em>con bienestar.</em></h2>
            <p>Una atención a su medida. Un equipo para acompañarte.</p>
          </div>
        </aside>
        <div className={styles.workspace}>
          <header className={styles.bookingHeading}>
            <div><span className={styles.eyebrow}>CLÍNICA VETERINARIA PORVENIR</span><h1>{cancellationOpen || receipt?.status === "CANCELLED" ? "Anular hora" : "Reserva de hora"}</h1><p>{cancellationOpen || receipt?.status === "CANCELLED" ? "Tu reserva, con toda la información a mano." : receipt ? "Los detalles de su próxima visita." : manage ? "Consulta o modifica una reserva existente." : `Paso ${step + 2} de ${steps.length} · ${steps[step + 1]}`}</p></div>
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
          ) : receipt && (cancellationOpen || receipt.status === "CANCELLED") ? (
            <BookingCancellation receipt={receipt} clinicName={catalog.clinic.name} address={catalog.clinic.address || ""} serviceName={catalog.services.find(item => item.id === receipt.serviceId)?.name || "Atención veterinaria"} professionalName={catalog.professionals.find(person => person.id === receipt.professionalId)?.name || "Equipo de la clínica"} petName={receipt.petName || details.petName} ownerName={receipt.ownerName || details.ownerName} deadline={new Date(Date.parse(receipt.startsAt) - (catalog.policy.cancellationNoticeMinutes || 0) * 60000).toISOString()} busy={busy} downloading={downloading} onConfirm={(event, reason) => void changeBooking(event, true, reason)} onKeep={() => { setCancellationOpen(false); setError(""); }} onBookAnother={bookAnother} onDownload={() => void download()} />
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
              <div className={styles.receiptHero}><CalendarDays size={30} strokeWidth={1.5} aria-hidden="true" /><div><span>{catalog.services.find(item => item.id === receipt.serviceId)?.name || "Atención veterinaria"}</span><strong>{bookingDate(receipt.startsAt, timezone)}</strong><span>{bookingTime(receipt.startsAt, timezone)} · {catalog.professionals.find(person => person.id === receipt.professionalId)?.name}</span></div></div>
              {(receipt.petName || details.petName) && <p><strong>Paciente:</strong> {receipt.petName || details.petName}{(receipt.ownerName || details.ownerName) ? ` · Tutor: ${receipt.ownerName || details.ownerName}` : ""}</p>}
              {catalog.clinic.address && <p className={styles.clinicAddress}><MapPin size={17} aria-hidden="true" />{catalog.clinic.address}</p>}
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
              <div className={styles.receiptDownloads}>
              <button type="button" className={styles.primary} disabled={downloading} onClick={() => void download()}>
                <Download size={16} />
                {downloading ? "Preparando documento…" : "Descargar comprobante PDF"}
              </button>
              {receipt.confirmed && <button type="button" disabled={downloading} onClick={() => void download("calendar")}><CalendarDays size={16} aria-hidden="true" /> Añadir al calendario</button>}
              </div>
              <p className={styles.deliveryNote}><Mail size={16} aria-hidden="true" />{receipt.emailDelivery === "sent" ? `Comprobante enviado a ${receipt.email || details.email}.` : receipt.emailDelivery === "queued" ? `Enviaremos el comprobante a ${receipt.email || details.email}.` : receipt.emailDelivery === "failed" ? "No pudimos entregar el correo. Puedes descargar tu comprobante aquí." : "Tu comprobante está disponible para descargar. El envío por correo todavía no está activado."}</p>
              <p className={styles.help}>
                Conserva el documento y su clave privada para consultar o gestionar tu reserva.
              </p>
              {["PENDING", "CONFIRMED"].includes(receipt.status) && (
                <>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      disabled={!catalog.available}
                      onClick={() => {
                        setReschedule(!reschedule);
                        setCancellationOpen(false);
                        setDate(
                          localStamp(receipt.startsAt, timezone).slice(0, 10),
                        );
                        setSelected(null);
                      }}
                    >
                      Reprogramar
                    </button>
                    <button type="button" onClick={() => { setCancellationOpen(true); setReschedule(false); setError(""); }}>Anular hora</button>
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
                    aria-current={step === i - 1 ? "step" : undefined}
                    data-complete={step > i - 1}
                  >
                    <span>{step > i - 1 ? <Check size={14} /> : i + 1}</span>
                    <small>{label}</small>
                  </li>
                ))}
              </ol>
              <h2 ref={header} tabIndex={-1}>
                {
                  [
                    "Comencemos con el tutor.",
                    "¿Qué atención necesita?",
                    "¿Con quién te gustaría atenderte?",
                    "Elige un momento para su cuidado.",
                    "Cuéntanos sobre ustedes.",
                    "Todo listo para revisar.",
                  ][step + 1]
                }
              </h2>
              {step === -1 && <form className={styles.identityForm} onSubmit={(event) => {
                event.preventDefault();
                if (!isValidRut(details.ownerRut)) { setError("Revisa el RUT y su dígito verificador."); return; }
                setDetails((previous) => ({ ...previous, ownerRut: normalizeRut(previous.ownerRut) }));
                setError(""); navigate(incomingSelection.current ? 2 : 0);
              }}>
                <p>Ingresa el RUT de la persona responsable de la mascota.</p>
                <label htmlFor="booking-owner-rut">RUT del tutor</label>
                <input id="booking-owner-rut" value={details.ownerRut} maxLength={12} placeholder="12.345.678-5" autoComplete="off" required onChange={(event) => { setDetails((previous) => ({ ...previous, ownerRut: event.target.value })); setError(""); }} />
                <small>Validamos el formato y el dígito verificador. Tus datos se completan al final de la reserva.</small>
                <button type="submit">Continuar a servicios <ArrowRight size={18} /></button>
              </form>}
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
                        aria-pressed={serviceId === s.id}
                        onClick={() => {
                          setServiceId(s.id);
                          setProfessionalId("");
                          setSelected(null);
                        }}
                      >
                        <span className={styles.serviceArtwork}><ServiceVisual name={s.name} className={styles.serviceIcon} /><span className={styles.choiceCheck} aria-hidden="true">{serviceId === s.id && <Check size={13} />}</span></span>
                        <span className={styles.serviceInfo}>
                          <strong>{s.name}</strong>
                          <small>
                            {s.description || serviceCaption(s.name)}
                          </small>
                        </span>
                        <span className={styles.serviceMeta}>
                          <Clock3 size={13} aria-hidden="true" /> {s.durationMinutes} min
                        </span>
                        {!s.professionalIds.length && (
                          <small>Sin profesional público habilitado</small>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className={styles.actions}><button type="button" onClick={() => navigate(-1)}><ArrowLeft size={17} aria-hidden="true" /> Atrás</button><button className={styles.primary} type="button" disabled={!serviceId} onClick={() => navigate(1)}>Continuar <ArrowRight size={18} /></button></div>
                  {!catalog.services.length && (
                    <p className={styles.empty}>
                      La clínica todavía no ha habilitado servicios reservables.
                    </p>
                  )}
                </>
              )}
              {step === 1 && (
                <>
                  <p>Busca por la atención que necesita tu mascota o por el nombre del profesional.</p>
                  <div className={styles.searchTabs} role="group" aria-label="Cómo quieres buscar"><button type="button" aria-pressed={searchMode === "service"} onClick={() => setSearchMode("service")}>Por atención</button><button type="button" aria-pressed={searchMode === "professional"} onClick={() => setSearchMode("professional")}>Por profesional</button></div>
                  <div className={styles.searchFields}>
                    <label>Atención veterinaria<select value={serviceId} onChange={event => { setServiceId(event.target.value); setProfessionalId(""); setSelected(null); }}>{catalog.services.filter(item => item.professionalIds.length).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                    {searchMode === "professional" && <label>Buscar profesional<input type="search" placeholder="Nombre del profesional" value={professionalQuery} onChange={event => setProfessionalQuery(event.target.value)} /></label>}
                  </div>
                  <div className={styles.clinicPlace}><MapPin size={20} aria-hidden="true" /><div><strong>{catalog.clinic.name}</strong>{catalog.clinic.address && <span>{catalog.clinic.address}</span>}</div></div>
                  <div className={`${styles.choices} ${styles.professionalGrid}`}>
                    {visibleProfessionals.map((p) => {
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
                            <span className={styles.professionalAction}>{professionalId === p.id ? "Profesional seleccionado" : "Seleccionar profesional"}{professionalId === p.id && <Check size={15} aria-hidden="true" />}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {!visibleProfessionals.length && <p className={styles.empty}>No encontramos profesionales con ese nombre para esta atención.</p>}
                  <div className={styles.actions}><button type="button" onClick={() => navigate(0)}><ArrowLeft size={17} aria-hidden="true" /> Atrás</button><button type="button" className={styles.primary} disabled={!professionalId} onClick={() => navigate(2)}><Search size={17} aria-hidden="true" /> Buscar horas</button></div>
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
                          <br />RUT del tutor: {details.ownerRut}
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

            </>
          )}
        </section>
          <p className={styles.trust}><ShieldCheck size={15} aria-hidden="true" /> Tus datos se usan para gestionar la atención de tu mascota.</p>
        </div>
      </div>
      <footer className={styles.footer}>
        <span><PawPrint size={14} aria-hidden="true" /> {catalog?.clinic.name || "Clínica Veterinaria Porvenir"} · Agendamiento</span>
        <span>Ante una urgencia, busca atención veterinaria inmediata.</span>
      </footer>
    </main>
  );
}
