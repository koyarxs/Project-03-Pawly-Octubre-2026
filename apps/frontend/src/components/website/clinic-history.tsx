import Image from "next/image";
import { Heart, PawPrint, Sprout } from "lucide-react";
import styles from "./clinic-history.module.css";

export function ClinicHistory() {
  return (
    <section id="historia" className={styles.section} aria-labelledby="historia-title">
      <div className={styles.inner}>
        <div className={styles.visual}>
          <Image
            className={styles.photo}
            src="/images/porvenir/history-companionship.jpg"
            alt="Una persona abraza a su golden retriever al atardecer."
            fill
            sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1392px) 46vw, 640px"
          />
        </div>
        <div className={styles.content}>
          <div className={styles.decoration} aria-hidden="true">
            <Heart className={styles.heart} strokeWidth={1.2} />
            <svg className={styles.trail} viewBox="0 0 70 210" fill="none"><path d="M37 2C95 72 52 96 23 127S4 174 30 208" stroke="currentColor" strokeWidth="1.5" strokeDasharray="7 7" strokeLinecap="round" /></svg>
            <PawPrint className={styles.paw} strokeWidth={1} />
          </div>
          <div className={styles.story}>
            <span className={styles.eyebrow}>NUESTRA HISTORIA</span>
            <h2 id="historia-title">El cuidado nos inspira.<br /><span>Clínica Veterinaria <span className={styles.underlined}>Porvenir nos conecta.</span></span></h2>
            <p className={styles.lead}>Detrás de cada atención hay una mascota, una familia y un equipo que necesita <mark>trabajar conectado.</mark></p>
            <p>Esa es la idea que da sentido a <strong>Clínica Veterinaria Porvenir:</strong> reunir la gestión veterinaria en un mismo espacio, para que la información acompañe el cuidado y cada nueva consulta tenga una historia detrás.</p>
            <p>Conectamos pacientes, tutores, citas e historias clínicas. Desde organizar la agenda hasta registrar una atención, buscamos que el trabajo diario sea más claro y que el equipo encuentre el contexto que necesita.</p>
            <div className={styles.nextChapter}><span className={styles.sprout} aria-hidden="true"><Sprout strokeWidth={1.5} /></span><div><strong>Una historia en construcción</strong><p>El sistema de Clínica Veterinaria Porvenir sigue en desarrollo, con un propósito que guía cada paso: acercar la tecnología a quienes cuidan.</p></div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
