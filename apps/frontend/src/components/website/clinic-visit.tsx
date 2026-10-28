import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Clock3, Heart, MapPin, PawPrint, Star, Stethoscope, Syringe } from "lucide-react";
import { shiftDate, weekStart } from "@/lib/appointment-time";
import styles from "./clinic-visit.module.css";

const steps = [
  {icon:CalendarDays,title:"Reserva tu atención",text:"Selecciona el día, la hora y el tipo de atención que necesitas."},
  {icon:ClipboardList,title:"Prepara su visita",text:"Revisa qué antecedentes y documentos tener a mano."},
  {icon:Heart,title:"Continúa su cuidado",text:"Después de la consulta, te acompañamos con indicaciones y próximos pasos."},
];
// Fixed presentation, just like a calendar shown in a photograph.
// Actual availability is selected only after following the booking link.
const illustratedDate="2026-10-28";
const illustratedMonth=illustratedDate.slice(0,7);
const firstCell=weekStart(`${illustratedMonth}-01`);
const days=Array.from({length:42},(_,index)=>shiftDate(firstCell,index));
const times=["09:00","10:00","11:00","12:00","13:00","15:00","16:00","17:00","18:00"];
const services=[
  {name:"Consulta veterinaria general",duration:30,icon:PawPrint},
  {name:"Vacunación",duration:20,icon:Syringe},
  {name:"Control médico",duration:30,icon:PawPrint},
  {name:"Control postoperatorio",duration:30,icon:PawPrint},
];

export function ClinicVisit() {
  return <section id="tu-visita" className={styles.section} aria-labelledby="visit-title">
    <div className={styles.reception} aria-hidden="true"><Image src="/images/porvenir/visit/reception.png" alt="" fill sizes="(max-width:1199px) 100vw,65vw"/></div>
    <div className={styles.inner}>
      <div className={styles.copy}>
        <h2 id="visit-title">Tu próxima visita,<br/><span>paso a paso.</span></h2>
        <div className={styles.steps}>{steps.map(({icon:Icon,title,text},index)=><article className={styles.step} data-active={index===0} key={title}>
          <span className={styles.stepIcon}><Icon size={28} strokeWidth={1.7} aria-hidden="true"/>{index===2&&<PawPrint className={styles.heartPaw} size={13} aria-hidden="true"/>}</span>
          <span className={styles.stepNumber}>0{index+1}</span>
          <div className={styles.stepText}><h3>{title}</h3><p>{text}</p></div>
          <span className={styles.stepArrow} aria-hidden="true"><ArrowRight size={19}/></span>
        </article>)}</div>
      </div>
      <div className={styles.companions}><Image src="/images/porvenir/visit/companions.png" alt="Un perro golden retriever junto a un gato" width={650} height={870} sizes="(max-width:600px) 150px,(max-width:1199px) 220px,18vw"/></div>
      <div className={styles.bookingStage}>
        <div className={styles.agendaHeading}><span><CalendarDays size={32} strokeWidth={1.7} aria-hidden="true"/></span><div><h3>Agenda online</h3><p>En pocos pasos, sin complicaciones</p></div></div>
        <div className={styles.board}>
          <div role="img" aria-label="Ilustración de una agenda veterinaria con calendario, horarios y tipos de atención">
            <div className={styles.fields} aria-hidden="true">
              <div className={styles.calendarColumn}>
                <h4><CalendarDays size={20}/>1. Selecciona una fecha</h4>
                <div className={styles.calendarBox}>
                  <div className={styles.monthNav}><span><ChevronLeft size={18}/></span><strong>Octubre 2026</strong><span><ChevronRight size={18}/></span></div>
                  <div className={styles.weekdays}>{["LUN","MAR","MIÉ","JUE","VIE","SÁB","DOM"].map(day=><span key={day}>{day}</span>)}</div>
                  <div className={styles.days}>{days.map(day=><span key={day} data-selected={day===illustratedDate} data-muted={day.slice(0,7)!==illustratedMonth||day<"2026-10-27"}><span>{Number(day.slice(-2))}</span>{day.slice(0,7)===illustratedMonth&&day>="2026-10-27"&&<i/>}</span>)}</div>
                </div>
              </div>
              <div className={styles.timeColumn}>
                <h4><Clock3 size={20}/>2. Elige un horario</h4>
                <p className={styles.selectedDate}>Miércoles, 28 de octubre</p>
                <div className={styles.times}>{times.map((time,index)=><span key={time} data-selected={index===0}>{time}</span>)}</div>
              </div>
              <div className={styles.serviceColumn}>
                <h4><Stethoscope size={21}/>3. Tipo de atención</h4>
                <div className={styles.serviceChoices}>{services.map(({name,duration,icon:Icon},index)=><div key={name} className={styles.service} data-selected={index===0}><Icon size={27} strokeWidth={1.6}/><div><strong>{name}</strong><small>{duration} min</small></div><span className={styles.serviceIndicator}/></div>)}</div>
              </div>
            </div>
          </div>
          <div className={styles.summary}>
            <div className={styles.professional}><Image src="/images/staff/surgeon-demo-v2.webp" alt="" width={48} height={58}/><div><strong>Dr. Matías Herrera</strong><span>Médico veterinario</span><small><span className={styles.careStars} aria-hidden="true">{Array.from({length:5},(_,index)=><Star key={index} size={12} fill="currentColor"/>)}</span> Atención cercana</small></div></div>
            <div className={styles.summaryDetail}><Clock3 size={19} aria-hidden="true"/><div><strong>30 min</strong><small>Duración</small></div></div>
            <div className={`${styles.summaryDetail} ${styles.serviceSummary}`}><MapPin size={19} aria-hidden="true"/><div><strong>Consulta general</strong><small>Tipo de atención</small></div></div>
            <Link className={styles.bookingAction} href="/agendar-cita">Agenda tu cita <ArrowRight size={18} aria-hidden="true"/></Link>
          </div>
        </div>
      </div>
    </div>
  </section>;
}
