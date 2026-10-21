"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  FileHeart,
  Maximize2,
  X,
} from "lucide-react";
import styles from "./product-tour.module.css";

const views = [
  {
    id: "agenda",
    label: "Agenda veterinaria",
    icon: CalendarDays,
    image: "/images/product-agenda.webp",
    width: 1130,
    height: 932,
    alt: "Interfaz real de la agenda de Pawly con citas y pacientes ficticios de una clínica de ejemplo.",
    title: "Tu jornada, con perspectiva.",
    description:
      "Revisa el día o la semana. Encuentra al paciente, identifica al profesional y consulta el estado de cada cita.",
    detail: "Vistas diaria y semanal · Filtros · Reprogramación",
  },
  {
    id: "consultas",
    label: "Consulta e historia",
    icon: FileHeart,
    image: "/images/product-clinical.webp",
    width: 1130,
    height: 978,
    alt: "Interfaz real de una consulta de Pawly con antecedentes e información clínica completamente ficticios.",
    title: "Cada atención deja contexto.",
    description:
      "Documenta la consulta, revisa las atenciones anteriores y conserva el registro original al finalizar.",
    detail: "Borradores · Historia clínica · Rectificaciones",
  },
] as const;

export function ProductTour() {
  const [selected, setSelected] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);
  const current = views[selected];
  useEffect(() => {
    if (expanded && !dialog.current?.open) dialog.current?.showModal();
  }, [expanded]);
  function closeCapture() {
    dialog.current?.close();
  }
  function restoreFocus() {
    setExpanded(false);
    expandButton.current?.focus();
  }
  return (
    <div className={styles.productTour}>
      <div className={styles.tourToolbar}>
        <div
          className={styles.tourTabs}
          role="tablist"
          aria-label="Vistas del producto"
        >
          {views.map(({ id, label, icon: Icon }, index) => (
            <button
              key={id}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              type="button"
              id={`tour-tab-${id}`}
              role="tab"
              aria-selected={selected === index}
              aria-controls={`tour-panel-${id}`}
              tabIndex={selected === index ? 0 : -1}
              onClick={() => setSelected(index)}
              onKeyDown={(event) => {
                let next: number;
                if (event.key === "ArrowRight")
                  next = (index + 1) % views.length;
                else if (event.key === "ArrowLeft")
                  next = (index + views.length - 1) % views.length;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = views.length - 1;
                else return;
                event.preventDefault();
                setSelected(next);
                buttons.current[next]?.focus();
              }}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <span className={styles.tourLabel}>
          INTERFAZ REAL · DATOS DE EJEMPLO
        </span>
      </div>
      <div className={styles.previewHeading} aria-hidden="true">
        <span className={styles.previewBrand}>Pawly</span>
        <span className={styles.previewDivider}>/</span>
        <span>{current.label}</span>
        <span className={styles.previewType}>Vista del producto</span>
      </div>
      {views.map(({ id, image, alt, width, height }, index) => (
        <div
          key={id}
          id={`tour-panel-${id}`}
          role="tabpanel"
          aria-labelledby={`tour-tab-${id}`}
          hidden={selected !== index}
          className={styles.tourPanel}
          tabIndex={0}
        >
          <div className={styles.screenshotFrame}>
            <Image
              src={image}
              alt={alt}
              width={width}
              height={height}
              sizes="(max-width: 767px) 900px, (max-width: 1399px) 88vw, 1130px"
            />
          </div>
        </div>
      ))}
      <div className={styles.tourCaption}>
        <div>
          <h3>{current.title}</h3>
          <p>{current.description}</p>
        </div>
        <div className={styles.tourActions}>
          <button
            ref={expandButton}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setExpanded(true)}
          >
            <Maximize2 size={16} aria-hidden="true" />
            Ampliar captura
          </button>
          <a href="#funcionalidades">
            Conocer las funciones <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
      <p className={styles.mobilePanHint}>
        Desliza la captura para explorarla o ábrela en tamaño ampliado.
      </p>
      <p className={styles.tourFootnote}>
        {current.detail}. Capturas ilustrativas; para trabajar con tus
        registros, ingresa a tu cuenta.
      </p>
      <dialog
        ref={dialog}
        className={styles.captureDialog}
        aria-labelledby="tour-capture-title"
        aria-describedby="tour-capture-description"
        onClose={restoreFocus}
      >
        <div className={styles.dialogHeading}>
          <div>
            <span className={styles.dialogEyebrow}>
              INTERFAZ REAL · DATOS DE EJEMPLO
            </span>
            <h2 id="tour-capture-title">Captura ampliada: {current.label}</h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar captura"
            onClick={closeCapture}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <p id="tour-capture-description" className={styles.dialogDescription}>
          Captura estática con datos ficticios. Desliza para explorar todos los
          detalles; puedes cerrar con Escape.
        </p>
        <div className={styles.dialogImageFrame} tabIndex={0}>
          {expanded && (
            <Image
              className={styles.expandedImage}
              src={current.image}
              alt={current.alt}
              width={current.width}
              height={current.height}
              sizes="1130px"
            />
          )}
        </div>
      </dialog>
    </div>
  );
}
