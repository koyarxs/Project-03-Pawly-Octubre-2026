import { ArrowUpRight, CalendarDays, Clock3 } from "lucide-react";
import { clinicWhatsAppUrl, WhatsAppIcon } from "./clinic-whatsapp";
import styles from "./clinic-welcome.module.css";

export function ClinicWelcome() {
  return (
    <section className={styles.welcome} aria-labelledby="bienvenida-porvenir">
      <div className={styles.inner}>
        <div className={styles.introduction}>
          <h2 id="bienvenida-porvenir">¿Qué necesitas hoy?</h2>
          <p>Estamos para ayudarte a cuidar de tu compañero.</p>
        </div>
        <div className={styles.links}>
          <a className={styles.link} href="/agendar-cita">
            <span className={styles.icon}><CalendarDays size={24} strokeWidth={1.6} aria-hidden="true" /></span>
            <span className={styles.label}><strong>Reserva una atención</strong><span>Encuentra un día y una hora para su visita.</span></span>
            <ArrowUpRight className={styles.arrow} size={20} aria-hidden="true" />
          </a>
          <a className={styles.link} href="#horario-atencion">
            <span className={styles.icon}><Clock3 size={24} strokeWidth={1.6} aria-hidden="true" /></span>
            <span className={styles.label}><strong>Planifica tu visita</strong><span>Consulta nuestros horarios de atención.</span></span>
            <ArrowUpRight className={styles.arrow} size={20} aria-hidden="true" />
          </a>
          <a className={styles.link} href={clinicWhatsAppUrl} target="_blank" rel="noopener noreferrer" aria-label="Habla con la clínica por WhatsApp (abre otra pestaña)">
            <span className={styles.icon}><WhatsAppIcon size={25} /></span>
            <span className={styles.label}><strong>¿Tienes una pregunta?</strong><span>Escríbenos directamente por WhatsApp.</span></span>
            <ArrowUpRight className={styles.arrow} size={20} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
