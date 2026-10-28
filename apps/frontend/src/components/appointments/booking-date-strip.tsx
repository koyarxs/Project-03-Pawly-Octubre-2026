"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { shiftDate } from "@/lib/appointment-time";
import styles from "./public-booking.module.css";

export function BookingDateStrip({ value, min, max, onChange }: { value: string; min: string; max: string; onChange: (date: string) => void }) {
  const [anchor, setAnchor] = useState("");
  const start = anchor || value || min;
  const civil = (date: string) => new Date(`${date}T12:00:00.000Z`);
  const month = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" }).format(civil(start));
  return <div className={styles.datePicker}>
    <div className={styles.datePickerHeading}><span>{month}</span><div>
      <button type="button" aria-label="Ver semana anterior" disabled={start <= min} onClick={() => setAnchor(shiftDate(start, -7) < min ? min : shiftDate(start, -7))}><ChevronLeft size={17} /></button>
      <button type="button" aria-label="Ver semana siguiente" disabled={shiftDate(start, 7) > max} onClick={() => setAnchor(shiftDate(start, 7))}><ChevronRight size={17} /></button>
    </div></div>
    <div className={styles.dateStrip} role="group" aria-label="Selecciona un día">
      {Array.from({ length: 7 }, (_, index) => shiftDate(start, index)).filter(date => date <= max).map(date => <button key={date} type="button" aria-pressed={value === date} aria-label={new Intl.DateTimeFormat("es-CL", { dateStyle: "full", timeZone: "UTC" }).format(civil(date))} onClick={() => onChange(date)}>
        <span>{new Intl.DateTimeFormat("es-CL", { weekday: "short", timeZone: "UTC" }).format(civil(date)).replace(".", "")}</span><strong>{civil(date).getUTCDate()}</strong>
      </button>)}
    </div>
  </div>;
}
