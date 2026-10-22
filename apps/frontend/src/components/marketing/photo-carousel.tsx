"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type TouchEvent,
} from "react";
import styles from "./photo-carousel.module.css";

const availablePhotographs = [
  {
    id: "consultation",
    image: "/images/pawly-2/hero-consultation.webp",
    alt: "Un veterinario conversa con una tutora que sostiene a su perro en la consulta.",
    title: "El cuidado comienza con una conexión.",
    description: "Personas, pacientes y un equipo que los acompaña.",
    position: "50% 52%",
  },
  {
    id: "pets",
    image: "/images/pawly-2/pets-and-family.webp",
    alt: "Una persona sostiene en sus brazos a un perro salchicha y a un gato tricolor.",
    title: "Detrás de cada ficha, una vida.",
    description: "Y una familia que confía en tu equipo.",
    position: "50% 44%",
  },
  {
    id: "care",
    image: "/images/landing-clinical-care.webp",
    alt: "Un veterinario acompaña a un perro de pelaje oscuro sobre la mesa de examen de una clínica.",
    title: "Más atención para lo que importa.",
    description: "La práctica veterinaria, siempre en el centro.",
    position: "50% 40%",
  },
] as const;

const motionQuery = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
  const preference = window.matchMedia(motionQuery);
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia(motionQuery).matches;
}

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function getVisibleDocument() {
  return document.visibilityState === "visible";
}

/** Editorial photographs only. This carousel never reads clinical records. */
export function PhotoCarousel({
  intervalMs = 6000,
  photoIds,
  variant,
}: {
  intervalMs?: number;
  photoIds?: readonly string[];
  variant?: "cover";
}) {
  const chosen = photoIds
    ?.map((id) => availablePhotographs.find((photo) => photo.id === id))
    .filter((photo): photo is (typeof availablePhotographs)[number] =>
      Boolean(photo),
    );
  const photographs = chosen?.length ? chosen : availablePhotographs;
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    getReducedMotion,
    () => true,
  );
  const documentVisible = useSyncExternalStore(
    subscribeToVisibility,
    getVisibleDocument,
    () => false,
  );
  const carousel = useRef<HTMLDivElement>(null);
  const playbackPointerIntent = useRef<boolean | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const id = useId();
  const frameId = `${id}-photographs`;
  const interval = Number.isFinite(intervalMs)
    ? Math.min(7000, Math.max(5000, intervalMs))
    : 6000;
  const canAdvance =
    !paused && !hovered && !reducedMotion && documentVisible && inView;

  useEffect(() => {
    const element = carousel.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setInView(entry.isIntersecting && entry.intersectionRatio >= 0.15),
      { threshold: [0, 0.15] },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!canAdvance) return;
    const timer = window.setInterval(() => {
      setSelected((current) => (current + 1) % photographs.length);
    }, interval);
    return () => window.clearInterval(timer);
  }, [canAdvance, interval, photographs.length]);

  function selectManually(index: number) {
    const next = (index + photographs.length) % photographs.length;
    setPaused(true);
    setSelected(next);
    setAnnouncement(
      `${next + 1} de ${photographs.length}. ${photographs[next].title}`,
    );
  }

  function handleKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    let next: number;
    if (event.key === "ArrowRight") next = selected + 1;
    else if (event.key === "ArrowLeft") next = selected - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = photographs.length - 1;
    else return;
    event.preventDefault();
    selectManually(next);
  }

  function beginTouch(event: TouchEvent<HTMLDivElement>) {
    setPaused(true);
    const touch = event.touches.length === 1 ? event.touches[0] : null;
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function endTouch(event: TouchEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    const end = event.changedTouches[0];
    if (!start || !end) return;
    const horizontal = end.clientX - start.x;
    const vertical = end.clientY - start.y;
    // Never prevent the default gesture: vertical scrolling and pinch zoom remain native.
    if (
      Math.abs(horizontal) >= 48 &&
      Math.abs(horizontal) > Math.abs(vertical) * 1.5
    ) {
      selectManually(selected + (horizontal < 0 ? 1 : -1));
    }
  }

  function togglePlayback() {
    const pointerIntent = playbackPointerIntent.current;
    playbackPointerIntent.current = null;
    setPaused((current) => pointerIntent ?? !current);
    setAnnouncement("");
  }

  return (
    <div
      ref={carousel}
      className={`${styles.carousel}${variant === "cover" ? ` ${styles.cover}` : ""}`}
      role="region"
      aria-roledescription="carrusel"
      aria-label="Carrusel de cuidado veterinario"
      aria-describedby={`${id}-instructions`}
      tabIndex={0}
      onKeyDown={handleKeyboard}
      onFocusCapture={() => setPaused(true)}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
    >
      <p id={`${id}-instructions`} className={styles.visuallyHidden}>
        {photographs.length} fotografías de cuidado veterinario. Usa las flechas
        del teclado o los controles para cambiar de imagen. Al interactuar, la
        reproducción se detiene hasta que decidas reanudarla.
      </p>
      <div
        id={frameId}
        className={styles.frame}
        aria-live="off"
        onTouchStart={beginTouch}
        onTouchEnd={endTouch}
        onTouchCancel={() => {
          touchStart.current = null;
        }}
      >
        {photographs.map((photograph, index) => (
          <figure
            key={photograph.image}
            className={styles.slide}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${index + 1} de ${photographs.length}`}
            hidden={selected !== index}
          >
            <div className={styles.photoCanvas}>
              <Image
                src={photograph.image}
                alt={photograph.alt}
                fill
                preload={index === 0}
                loading={index === 0 ? undefined : "lazy"}
                sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1199px) 48vw, 650px"
                className={styles.photograph}
                style={{ objectPosition: photograph.position }}
              />
            </div>
            <figcaption className={styles.caption}>
              <span className={styles.eyebrow}>Para quienes cuidan</span>
              <strong>{photograph.title}</strong>
              <span className={styles.description}>
                {photograph.description}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      <div
        className={styles.toolbar}
        role="group"
        aria-label="Controles del carrusel"
      >
        <button
          className={styles.playback}
          type="button"
          aria-controls={frameId}
          aria-label={
            reducedMotion
              ? "Reproducción automática desactivada por movimiento reducido"
              : paused
                ? "Reanudar presentación automática"
                : "Pausar presentación automática"
          }
          title={
            reducedMotion
              ? "Tu preferencia de movimiento reducido está activa"
              : undefined
          }
          disabled={reducedMotion}
          onPointerDown={() => {
            playbackPointerIntent.current = !paused;
          }}
          onPointerCancel={() => {
            playbackPointerIntent.current = null;
          }}
          onKeyDown={() => {
            playbackPointerIntent.current = null;
          }}
          onClick={togglePlayback}
        >
          {paused || reducedMotion ? (
            <Play size={17} aria-hidden="true" />
          ) : (
            <Pause size={17} aria-hidden="true" />
          )}
        </button>
        <div
          className={styles.indicators}
          role="group"
          aria-label="Elegir fotografía"
        >
          {photographs.map((photograph, index) => (
            <button
              key={photograph.image}
              className={styles.indicator}
              type="button"
              aria-controls={frameId}
              aria-pressed={selected === index}
              aria-label={`Ver fotografía ${index + 1}: ${photograph.title}`}
              onClick={() => selectManually(index)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className={styles.navigation}>
          <button
            type="button"
            aria-label="Fotografía anterior"
            aria-controls={frameId}
            onClick={() => selectManually(selected - 1)}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Fotografía siguiente"
            aria-controls={frameId}
            onClick={() => selectManually(selected + 1)}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
      <p
        className={styles.visuallyHidden}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>
    </div>
  );
}
