import Image from "next/image";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  PawPrint,
} from "lucide-react";
import { HeroEntrance } from "@/components/hero-entrance";
import "@/app/care-flow.css";

const steps = [
  {
    icon: CalendarDays,
    title: "Una cita organizada",
    detail: "El inicio de cada atención.",
  },
  {
    icon: PawPrint,
    title: "Un paciente reconocido",
    detail: "Su información, a mano.",
  },
  {
    icon: ClipboardList,
    title: "Una historia que continúa",
    detail: "Contexto para el próximo control.",
  },
];

function FlowScene({ step }: { step: number }) {
  if (step === 0)
    return (
      <div className="care-scene care-agenda" aria-hidden="true">
        <div className="care-agenda-slots">
          <span>AGENDA</span>
          {["09:00", "10:00", "11:00"].map((time) => (
            <div key={time}>
              <small>{time}</small>
              <span>
                <i />
                <i />
              </span>
            </div>
          ))}
        </div>
        <div className="care-photo">
          <Image
            src="/images/hero-retriever.webp"
            alt=""
            fill
            sizes="(max-width: 599px) 140px, 120px"
          />
        </div>
      </div>
    );
  if (step === 1)
    return (
      <div className="care-scene care-patient" aria-hidden="true">
        <div className="care-patient-heading">
          <div className="care-avatar">
            <Image src="/images/hero-cat.webp" alt="" fill sizes="64px" />
          </div>
          <div>
            <strong>Simón</strong>
            <span>Felino · Paciente de ejemplo</span>
            <i />
          </div>
        </div>
        <div className="care-patient-fields">
          {["Paciente", "Tutor", "Controles"].map((label) => (
            <div key={label}>
              <PawPrint size={14} />
              <span>{label}</span>
              <i />
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <div className="care-scene care-history" aria-hidden="true">
      <div className="care-record">
        <ClipboardList size={20} />
        <span>HISTORIA CLÍNICA</span>
        <strong>Control preventivo</strong>
        <div className="care-record-lines">
          <i />
          <i />
          <i />
        </div>
        <span className="care-record-tag">Seguimiento planificado</span>
      </div>
      <div className="care-photo">
        <Image
          src="/images/veterinary-care.webp"
          alt=""
          fill
          sizes="(max-width: 599px) 140px, 120px"
        />
      </div>
    </div>
  );
}

export function CareFlow() {
  return (
    <section className="care-flow" aria-labelledby="care-flow-title">
      <div className="container care-flow-layout">
        <div className="care-flow-copy">
          <span className="care-flow-eyebrow">LA IDEA ES SIMPLE</span>
          <h2 id="care-flow-title">
            Cada atención,
            <br />
            <em>mejor conectada.</em>
          </h2>
          <p>
            Un flujo pensado para conectar la agenda, los pacientes y su
            historia clínica, en un solo lugar.
          </p>
          <small>Flujo conceptual · Datos e imágenes referenciales</small>
        </div>
        <ol className="care-flow-steps">
          {steps.map(({ icon: Icon, title, detail }, index) => (
            <li key={title}>
              <HeroEntrance className="care-flow-step" delay={index * 0.06}>
                <span className="care-step-number">0{index + 1}</span>
                <FlowScene step={index} />
                <span className="care-step-icon">
                  <Icon size={23} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{detail}</p>
                {index < 2 && (
                  <ArrowRight
                    className="care-step-arrow"
                    size={23}
                    aria-hidden="true"
                  />
                )}
              </HeroEntrance>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
