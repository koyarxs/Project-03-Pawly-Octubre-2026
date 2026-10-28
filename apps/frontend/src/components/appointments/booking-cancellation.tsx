"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, CalendarX2, Check, Clock3, Download, Mail, MapPin, PawPrint, Stethoscope } from "lucide-react";
import { bookingDate, bookingTime, type BookingReceipt } from "@/lib/booking";
import styles from "./booking-cancellation.module.css";

const reasons = ["No puedo asistir en ese horario", "Quiero reservar para otro día", "Ya no necesito esta atención", "Otro motivo"];

export function BookingCancellation({ receipt, clinicName, address, serviceName, professionalName, petName, ownerName, deadline, busy, downloading, onConfirm, onKeep, onBookAnother, onDownload }: {
  receipt: BookingReceipt; clinicName: string; address: string; serviceName: string; professionalName: string;
  petName: string; ownerName: string; deadline: string; busy: boolean; downloading: boolean;
  onConfirm: (event: FormEvent, reason: string) => void; onKeep: () => void; onBookAnother: () => void; onDownload: () => void;
}) {
  const cancelled = receipt.status === "CANCELLED";
  const [reason, setReason] = useState("");
  const [other, setOther] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const [canCancel, setCanCancel] = useState(() => Date.parse(deadline) > Date.now());
  useEffect(() => { heading.current?.focus(); }, [cancelled]);
  useEffect(() => {
    if (cancelled) return;
    let timer: ReturnType<typeof setTimeout>;
    const checkDeadline = () => {
      const remaining = Date.parse(deadline) - Date.now();
      setCanCancel(remaining > 0);
      if (remaining > 0) timer = setTimeout(checkDeadline, Math.min(remaining, 2147483647));
    };
    timer = setTimeout(checkDeadline, 0);
    return () => clearTimeout(timer);
  }, [deadline, cancelled]);

  return <div className={styles.cancellation}>
    <div className={styles.heading}>
      <span className={cancelled ? styles.successIcon : styles.cancelIcon} aria-hidden="true">{cancelled ? <Check size={25} strokeWidth={1.5} /> : <CalendarX2 size={25} strokeWidth={1.5} />}</span>
      <div><span className={styles.eyebrow}>{cancelled ? "ANULACIÓN REGISTRADA" : "GESTIONA SU PRÓXIMA VISITA"}</span>
        <h2 ref={heading} tabIndex={-1}>{cancelled ? "Tu hora quedó anulada." : "¿Necesitas anular su hora?"}</h2>
        <p>{cancelled ? "Registramos la anulación de esta reserva. Cuando lo necesites, puedes encontrar un nuevo momento para su cuidado." : "Revisa los detalles de la reserva antes de confirmar la anulación."}</p>
      </div>
    </div>

    <div className={styles.reservation}>
      <div className={styles.details}>
        <span className={styles.detailLabel}>LA RESERVA</span><h3>{serviceName}</h3>
        {petName && <p><PawPrint size={17} aria-hidden="true" /><span><strong>{petName}</strong>{ownerName && <small>Tutor: {ownerName}</small>}</span></p>}
        <p><Stethoscope size={17} aria-hidden="true" /><span>{professionalName}</span></p>
        <p><MapPin size={17} aria-hidden="true" /><span>{clinicName}{address && <small>{address}</small>}</span></p>
      </div>
      <div className={styles.date}>
        <span className={styles.detailLabel}>{cancelled ? "HORA ANULADA" : "FECHA Y HORA"}</span>
        <p><CalendarDays size={18} aria-hidden="true" /><strong>{bookingDate(receipt.startsAt, receipt.timezone)}</strong></p>
        <p><Clock3 size={18} aria-hidden="true" /><span>{bookingTime(receipt.startsAt, receipt.timezone)}</span></p>
        <span className={styles.status} data-cancelled={cancelled}>{cancelled ? "Anulada" : receipt.confirmed ? "Confirmada" : "Pendiente de confirmación"}</span>
      </div>
    </div>

    {cancelled ? <>
      <p className={styles.receiptNote} role="status">La anulación se realizó correctamente. Conserva el comprobante actualizado de esta reserva.</p>
      {receipt.emailDelivery === "queued" && <p className={styles.emailNote}><Mail size={16} aria-hidden="true" /> El comprobante actualizado se enviará al correo registrado.</p>}
      <div className={styles.actions}><button type="button" className={styles.secondary} disabled={downloading} onClick={onDownload}><Download size={16} aria-hidden="true" />{downloading ? "Preparando documento…" : "Comprobante de anulación"}</button><button type="button" className={styles.bookAgain} onClick={onBookAnother}>Reservar otra hora <ArrowRight size={17} aria-hidden="true" /></button></div>
    </> : <form onSubmit={event => { event.preventDefault(); if (canCancel && reason && (reason !== "Otro motivo" || other.trim())) onConfirm(event, reason === "Otro motivo" ? other.trim() : reason); }}>
      <fieldset disabled={busy}>
        <div className={styles.reasonArea}><label htmlFor="cancellation-reason">¿Por qué necesitas anular?</label><select id="cancellation-reason" required value={reason} onChange={event => setReason(event.target.value)}><option value="">Selecciona un motivo</option>{reasons.map(item => <option key={item} value={item}>{item}</option>)}</select>
          {reason === "Otro motivo" && <><label htmlFor="cancellation-other">Cuéntanos el motivo</label><textarea id="cancellation-other" required maxLength={500} rows={3} value={other} onChange={event => setOther(event.target.value)} /></>}
          <p>{canCancel ? "La anulación se realiza al confirmar. Si solo necesitas otro horario, puedes volver y reprogramar tu reserva." : "El plazo para anular por internet terminó. Contacta al equipo de la clínica para revisar tu reserva."}</p>
        </div>
        <div className={styles.actions}><button type="button" className={styles.secondary} onClick={onKeep}><ArrowLeft size={16} aria-hidden="true" /> Conservar mi hora</button><button type="submit" className={styles.confirmCancellation} disabled={busy || !canCancel || !reason || (reason === "Otro motivo" && !other.trim())}>{busy ? "Anulando tu hora…" : "Confirmar anulación"}<CalendarX2 size={17} aria-hidden="true" /></button></div>
      </fieldset>
    </form>}
    <p className={styles.reference}>Referencia de reserva <span>{receipt.reference}</span></p>
  </div>;
}
