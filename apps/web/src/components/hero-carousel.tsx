"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Image, { getImageProps } from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight, Pause, Play } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from "motion/react";
import dog from "../../public/images/hero-dog.webp";
import cat from "../../public/images/hero-cat.webp";
import rabbit from "../../public/images/hero-rabbit.webp";
import retriever from "../../public/images/hero-retriever.webp";

import extra1 from "../../public/images/hero-extra-01.webp";
import extra2 from "../../public/images/hero-extra-02.webp";
import extra3 from "../../public/images/hero-extra-03.webp";
import extra4 from "../../public/images/hero-extra-04.webp";
import extra5 from "../../public/images/hero-extra-05.webp";
import extra6 from "../../public/images/hero-extra-06.webp";
import extra7 from "../../public/images/hero-extra-07.webp";
import extra8 from "../../public/images/hero-extra-08.webp";
import extra9 from "../../public/images/hero-extra-09.webp";
import extra10 from "../../public/images/hero-extra-10.webp";
import extra11 from "../../public/images/hero-extra-11.webp";

const slides = [
  {
    id: "dog",
    image: dog,
    alt: "Perro de pelaje café en un bosque iluminado por luz natural.",
    first: "Menos gestión.",
    second: "Más cuidado.",
    description:
      "Organiza pacientes, citas e historiales clínicos en un solo lugar. Más claridad para tu equipo, más tiempo para cuidar.",
    label: "GESTIÓN VETERINARIA · EN DESARROLLO",
  },
  {
    id: "cat",
    image: cat,
    alt: "Retrato de un gato gris con ojos verdes al aire libre.",
    first: "Cada paciente.",
    second: "Una historia conectada.",
    description:
      "Estamos diseñando Pawly para reunir pacientes, tutores y antecedentes clínicos. Una visión compartida para dar continuidad al cuidado.",
    label: "UNA PROPUESTA PARA TU CLÍNICA · EN DESARROLLO",
  },
] as const;

const extraSlides = [
  {
    id: "rabbit",
    image: rabbit,
    alt: "Conejo de pelaje gris sobre pasto, iluminado por luz natural.",
    first: "Más orden.",
    second: "Más tranquilidad.",
    description:
      "Agenda, pacientes y tutores conectados: así imaginamos una jornada con información a mano para tu equipo.",
    label: "UNA JORNADA CON CONTEXTO · EN DESARROLLO",
  },
  {
    id: "retriever",
    image: retriever,
    alt: "Golden retriever al aire libre con luz cálida de atardecer.",
    first: "Tu equipo.",
    second: "El mismo contexto.",
    description:
      "Una propuesta para compartir antecedentes y preparar cada atención, cuidando la continuidad de la historia de cada paciente.",
    label: "CONTINUIDAD DEL CUIDADO · EN DESARROLLO",
  },
] as const;
const focalPoints = [
  [0.48, 0.42],
  [0.5, 0.43],
  [0.62, 0.3],
  [0.5, 0.7],
  [0.62, 0.53],
  [0.46, 0.43],
  [0.53, 0.29],
  [0.59, 0.46],
  [0.51, 0.4],
  [0.76, 0.4],
  [0.47, 0.5],
  [0.46, 0.5],
  [0.37, 0.4],
  [0.46, 0.38],
  [0.44, 0.44],
] as const;
const allSlides = [
  ...slides,
  ...extraSlides,
  {
    ...[...slides, ...extraSlides][0],
    id: "photo-5",
    image: extra1,
    alt: "Gato tricolor al aire libre.",
  },
  {
    ...[...slides, ...extraSlides][1],
    id: "photo-6",
    image: extra2,
    alt: "Gato de pelaje claro bajo luz natural.",
  },
  {
    ...[...slides, ...extraSlides][2],
    id: "photo-7",
    image: extra3,
    alt: "Gato blanco y negro en un entorno exterior.",
  },
  {
    ...[...slides, ...extraSlides][3],
    id: "photo-8",
    image: extra4,
    alt: "Gato de pelo largo al aire libre.",
  },
  {
    ...[...slides, ...extraSlides][0],
    id: "photo-9",
    image: extra5,
    alt: "Gato de pelaje negro y blanco.",
  },
  {
    ...[...slides, ...extraSlides][1],
    id: "photo-10",
    image: extra6,
    alt: "Retrato de un conejo de pelaje oscuro.",
  },
  {
    ...[...slides, ...extraSlides][2],
    id: "photo-11",
    image: extra7,
    alt: "Border collie en un parque.",
  },
  {
    ...[...slides, ...extraSlides][3],
    id: "photo-12",
    image: extra8,
    alt: "Perro en un bosque con luz natural.",
  },
  {
    ...[...slides, ...extraSlides][0],
    id: "photo-13",
    image: extra9,
    alt: "Perro sobre un tronco en un bosque.",
  },
  {
    ...[...slides, ...extraSlides][1],
    id: "photo-14",
    image: extra10,
    alt: "Golden retriever durante un paseo.",
  },
  {
    ...[...slides, ...extraSlides][2],
    id: "photo-15",
    image: extra11,
    alt: "Retrato de un golden retriever con luz natural.",
  },
].map((slide, index) => ({ ...slide, focal: focalPoints[index] }));

function CarouselPhoto({
  slide,
  reduced,
  direction,
}: {
  slide: (typeof allSlides)[number];
  reduced: boolean;
  direction: number;
}) {
  const present = useIsPresent();
  const layerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(
    `${slide.focal[0] * 100}% ${slide.focal[1] * 100}%`,
  );
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const update = () => {
      const width = layer.clientWidth,
        height = layer.clientHeight;
      if (!width || !height) return;
      const scale = Math.max(
        width / slide.image.width,
        height / slide.image.height,
      );
      const overflowX = slide.image.width * scale - width;
      const overflowY = slide.image.height * scale - height;
      const clamp = (value: number) => Math.max(0, Math.min(100, value));
      const x =
        overflowX > 1
          ? clamp(
              ((slide.focal[0] * slide.image.width * scale - width * 0.55) /
                overflowX) *
                100,
            )
          : 50;
      const y =
        overflowY > 1
          ? clamp(
              ((slide.focal[1] * slide.image.height * scale - height * 0.45) /
                overflowY) *
                100,
            )
          : 50;
      setPosition(`${x}% ${y}%`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(layer);
    return () => observer.disconnect();
  }, [slide]);
  return (
    <motion.div
      className="carousel-photo-layer"
      aria-hidden={!present}
      ref={layerRef}
      custom={direction}
      variants={{
        enter: (travel: number) => ({
          opacity: 0,
          x: reduced ? 0 : travel * 14,
        }),
        visible: { opacity: 1, x: 0 },
        leave: (travel: number) => ({
          opacity: 0,
          x: reduced ? 0 : -travel * 10,
        }),
      }}
      initial={reduced ? false : "enter"}
      animate="visible"
      exit="leave"
      transition={{ duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
      style={{ zIndex: present ? 1 : 0 }}
    >
      <Image
        src={slide.image}
        alt={slide.alt}
        style={{ objectPosition: position }}
        fill
        preload={slide.id === "dog"}
        placeholder="blur"
        sizes="(max-width: 899px) 100vw, 78vw"
      />
    </motion.div>
  );
}

export function HeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState(1);
  const [focusWithin, setFocusWithin] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const regionRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const slide = allSlides[active];
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => setVisible((entries[0]?.intersectionRatio ?? 0) >= 0.25),
      { threshold: 0.25 },
    );
    if (regionRef.current) observer.observe(regionRef.current);
    const visibility = () => setPageVisible(!document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (paused || focusWithin || !visible || !pageVisible || reduced) return;
    const timer = window.setTimeout(() => {
      setDirection(1);
      setActive((current) => (current + 1) % allSlides.length);
    }, 7000);
    return () => window.clearTimeout(timer);
  }, [active, paused, focusWithin, visible, pageVisible, reduced]);
  useEffect(() => {
    const images = [1, -1].map((direction) => {
      const next =
        allSlides[(active + direction + allSlides.length) % allSlides.length];
      const { props } = getImageProps({
        src: next.image,
        alt: "",
        fill: true,
        sizes: "(max-width: 899px) 100vw, 78vw",
      });
      const image = new window.Image();
      image.decoding = "async";
      if (props.srcSet) image.srcset = props.srcSet;
      if (props.sizes) image.sizes = props.sizes;
      image.src = props.src;
      return image;
    });
    return () => {
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, [active]);
  function move(direction: number) {
    setDirection(direction);
    setActive(
      (current) => (current + direction + allSlides.length) % allSlides.length,
    );
  }
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    }
  }
  return (
    <div
      ref={regionRef}
      className="animal-carousel"
      onFocusCapture={(event) =>
        setFocusWithin((event.target as HTMLElement).matches(":focus-visible"))
      }
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocusWithin(false);
      }}
      role="region"
      aria-roledescription="carrusel"
      aria-label="La propuesta de Pawly"
      onKeyDown={onKeyDown}
    >
      <div
        className={`animal-slide slide-${slide.id}`}
        role="group"
        aria-roledescription="diapositiva"
        aria-label={`${active + 1} de ${allSlides.length}`}
      >
        <figure className="hero-photo animal-photo">
          <AnimatePresence initial={false} custom={direction}>
            <CarouselPhoto
              key={slide.id}
              slide={slide}
              reduced={!!reduced}
              direction={direction}
            />
          </AnimatePresence>
        </figure>
        <div className="container animal-slide-inner">
          <motion.div
            key={slide.id}
            className="animal-slide-copy"
            initial={false}
            whileInView={reduced ? undefined : { opacity: [0.92, 1] }}
            viewport={{ once: true, amount: 0.2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: "easeOut" }}
          >
            <span className="animal-eyebrow">{slide.label}</span>
            {active === 0 ? (
              <h1>
                {slide.first}
                <br />
                <span>{slide.second}</span>
              </h1>
            ) : (
              <h2>
                {slide.first}
                <br />
                <span>{slide.second}</span>
              </h2>
            )}
            <p className="hero-description">{slide.description}</p>
            <div className="hero-actions">
              <a className="animal-primary-cta" href="#contacto">
                Solicitar demostración{" "}
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <a className="animal-secondary-cta" href="#funcionalidades">
                Explorar funcionalidades{" "}
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>
      <button
        className="carousel-arrow carousel-previous"
        type="button"
        aria-label="Diapositiva anterior"
        onClick={() => move(-1)}
      >
        <ArrowLeft aria-hidden="true" />
      </button>
      <button
        className="carousel-arrow carousel-next"
        type="button"
        aria-label="Diapositiva siguiente"
        onClick={() => move(1)}
      >
        <ArrowRight aria-hidden="true" />
      </button>
      <span
        className="sr-only"
        role="status"
        aria-live={focusWithin ? "polite" : "off"}
      >
        Imagen {active + 1} de {allSlides.length}
      </span>
      {!reduced && (
        <button
          className="carousel-toggle"
          type="button"
          aria-label={
            paused
              ? "Activar rotación automática"
              : "Pausar rotación automática"
          }
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? (
            <Play size={16} aria-hidden="true" />
          ) : (
            <Pause size={16} aria-hidden="true" />
          )}
        </button>
      )}
    </div>
  );
}
