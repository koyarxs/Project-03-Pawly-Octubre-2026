"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import styles from "./clinic-faq.module.css";
import { clinicWhatsAppNumber, clinicWhatsAppUrl, WhatsAppIcon } from "./clinic-whatsapp";
import { FaqAnswer } from "./faq-answer";

const questions = [
  {
    question: "¿Cómo puedo agendar una cita?",
    answer: <>Entra en <Link href="/agendar-cita">Agendar cita</Link>, selecciona la atención y revisa los horarios disponibles. Completa los datos solicitados y sigue las indicaciones para enviar tu reserva. Al terminar podrás revisar su estado y guardar el comprobante.</>,
  },
  {
    question: "¿Cómo consulto, cambio o cancelo mi reserva?",
    answer: <>Conserva el comprobante de tu reserva: desde él puedes consultar su estado y acceder a las opciones disponibles para reprogramar o cancelar.</>,
  },
  {
    question: "¿Dónde encuentro la ubicación y los horarios?",
    answer: <>Puedes revisar la dirección en <a href="#ubicacion">Nuestra ubicación</a> y los <a href="#horario-atencion">horarios de atención</a> tanto en la franja superior como al pie de esta página.</>,
  },
  {
    question: "¿Qué es Pawly y cómo se relaciona con la clínica?",
    answer: <>Pawly es el sistema que reúne la gestión de pacientes, tutores, citas e historias clínicas. Su propósito es conectar la información del trabajo diario para acompañar a quienes cuidan de las mascotas.</>,
  },
  {
    question: "¿Puedo acceder desde mi celular?",
    answer: <>Sí. El sitio y el sistema se adaptan a celulares, tablets y computadores. Puedes entrar desde tu navegador, sin instalar una aplicación.</>,
  },
  {
    question: "¿Cómo puedo resolver otra duda?",
    answer: <>Usa el botón de WhatsApp de esta sección o el botón flotante para consultar por una atención, los servicios disponibles o tu próxima visita.</>,
  },
];

export function ClinicFaq() {
  const [opened, setOpened] = useState<number | null>(null);
  const id = useId();
  return (
    <section id="preguntas-frecuentes" className={styles.section} aria-labelledby="faq-title">
      <div className={styles.inner}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>INFORMACIÓN ÚTIL</span>
          <h2 id="faq-title">Preguntas frecuentes</h2>
          <p>Información práctica para reservar, preparar tu visita y conocer mejor Pawly.</p>
          <div className={styles.help}>
          <span className={styles.helpLabel}>¿Prefieres hablar con nosotros?</span>
          <a href={clinicWhatsAppUrl} target="_blank" rel="noopener noreferrer" className={styles.contact}>
            <WhatsAppIcon size={21} />
            <span><strong>Escríbenos por WhatsApp</strong><span>{clinicWhatsAppNumber}</span></span>
            <span className="sr-only"> (abre otra pestaña)</span>
            <ArrowUpRight className={styles.contactArrow} size={21} aria-hidden="true" />
          </a>
          </div>
        </div>
        <div className={styles.questions}>
          {questions.map(({ question, answer }, index) => {
            const isOpen = opened === index;
            const panelId = `${id}-answer-${index}`;
            const triggerId = `${id}-question-${index}`;
            return (
              <div key={question} className={styles.item} data-open={isOpen}>
                <h3 className={styles.questionHeading}>
                  <button id={triggerId} className={styles.trigger} type="button" aria-expanded={isOpen} aria-controls={panelId} onClick={() => setOpened(isOpen ? null : index)}>
                    <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <span className={styles.questionText}>{question}</span>
                    <ChevronDown className={styles.toggle} size={17} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={triggerId} aria-hidden={!isOpen} inert={!isOpen} className={styles.reveal}>
                  <div className={styles.revealInner}><FaqAnswer key={`${index}-${isOpen}`} active={isOpen}>{answer}</FaqAnswer></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
