import {
  ArrowRight,
  CalendarDays,
  Heart,
  House,
  PawPrint,
  Sprout,
} from "lucide-react";
import styles from "./clinic-welcome.module.css";

const values = [
  {
    icon: PawPrint,
    title: "Más que compañía",
    detail: "Son parte de nuestra vida.",
  },
  {
    icon: Heart,
    title: "Una historia juntos",
    detail: "En cada etapa, a tu lado.",
  },
  {
    icon: Sprout,
    title: "Un cariño inmenso",
    detail: "Porque su bienestar importa.",
  },
  {
    icon: House,
    title: "Parte de la familia",
    detail: "Un vínculo para toda la vida.",
  },
];

/** Stays below the artwork so the transition cannot crop an animal's paws. */
export function ClinicWelcome() {
  return (
    <section className={styles.welcome} aria-labelledby="bienvenida-porvenir">
      <svg
        className={styles.wave}
        viewBox="0 0 1440 70"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 0H1440V10C1190 100 1100 12 830 36S310 52 0 12Z"
          fill="#dfe6d6"
        />
        <path
          d="M0 0C310 18 420 74 760 34S1180 2 1440 10"
          fill="none"
          stroke="#aebd9b"
          strokeWidth="1.5"
          opacity=".6"
        />
      </svg>
      <div className={styles.inner}>
        <div className={styles.introduction}>
          <div>
            <span className={styles.eyebrow}>
              <PawPrint size={14} aria-hidden="true" />
              Siempre a su lado
            </span>
            <h2 id="bienvenida-porvenir">
              Más que compañía,
              <br />
              <em>una vida más feliz.</em>
            </h2>
            <p>
              Cuidar de su bienestar empieza por conocernos. Conversemos sobre
              lo que necesita tu compañero.
            </p>
          </div>
          <a className={styles.action} href="/agendar-cita">
            <CalendarDays size={20} aria-hidden="true" />
            Agendar cita
            <ArrowRight size={20} aria-hidden="true" />
          </a>
        </div>
        <ul className={styles.values} aria-label="Compañeros de vida">
          {values.map(({ icon: Icon, title, detail }) => (
            <li key={title}>
              <span className={styles.icon}>
                <Icon size={28} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
