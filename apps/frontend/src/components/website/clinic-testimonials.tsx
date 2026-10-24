"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight, Heart, MapPin, Pause, PawPrint, Play, Quote, Star, UsersRound } from "lucide-react";
import type { WebsiteContent } from "@/lib/website";
import { isGoogleReviewsResult, type GoogleReviewsResult } from "@/lib/google-reviews";
import styles from "./clinic-testimonials.module.css";

type Review = { author: string; companion: string; quote: string; photo?: string; rating?: number; role?: string; city?: string; authorUrl?: string; reviewUrl?: string; date?: string; translated?: boolean };
const demoTestimonials: Review[] = [
  { author: "Catalina Fuentes", role: "Arquitecta · Directora de proyectos", city: "Viña del Mar", companion: "Compañera de Olivia, una gata mestiza", photo: "catalina", rating: 5, quote: "Valoro los espacios donde se escucha con atención y se explica cada decisión. Así imagino una experiencia de cuidado cercana para Olivia." },
  { author: "Rodrigo Mella", role: "Gerente de operaciones", city: "Valparaíso", companion: "Compañero de Bruno, un labrador", photo: "rodrigo", rating: 5, quote: "Organización, claridad y un trato amable. Son los detalles que buscaría al elegir a quienes acompañarán a Bruno en cada etapa de su vida." },
  { author: "Isabel Arancibia", role: "Abogada · Directora jurídica", city: "Concón", companion: "Compañera de Luna, una gata rescatada", photo: "isabel", rating: 5, quote: "Para mí, la confianza empieza cuando hay tiempo para las preguntas. Quisiera que cada visita con Luna se sintiera tranquila y bien acompañada." },
  { author: "Andrés Salinas", role: "Ingeniero comercial · Director ejecutivo", city: "Quilpué", companion: "Compañero de Milo, un perro mestizo", photo: "andres", rating: 5, quote: "Milo es parte de nuestra familia. Buscamos una atención que combine una comunicación clara con ese cariño que se nota en los pequeños gestos." },
  { author: "Paula Vergara", role: "Profesora universitaria · Investigadora", city: "Villa Alemana", companion: "Compañera de Nube, una coneja", photo: "paula", rating: 5, quote: "Me importa comprender los cuidados y participar de ellos. Un lugar que explique con paciencia sería una gran compañía para nuestra historia con Nube." },
  { author: "Felipe Rojas", role: "Ingeniero civil · Líder de tecnología", city: "Viña del Mar", companion: "Compañero de Simón, un gato adulto", photo: "felipe", rating: 5, quote: "Agradezco la información sencilla y los procesos ordenados. Eso es lo que me gustaría encontrar para cuidar a Simón con tranquilidad y confianza." },
];

function Stars({ rating, demo = false }: { rating: number; demo?: boolean }) {
  return <span className={styles.stars} role="img" aria-label={`${demo ? "Valoración ilustrativa: " : ""}${rating} de 5 estrellas`}>{Array.from({ length: 5 }, (_, i) => <span key={i} className={styles.star} aria-hidden="true"><Star size={16} /><span style={{ width: `${Math.max(0, Math.min(1, rating - i)) * 100}%` }}><Star size={16} fill="currentColor" /></span></span>)}</span>;
}

export function ClinicTestimonials({ items: publishedItems = [], address = "", preview = false }: { items: WebsiteContent["testimonials"]; address?: string; preview?: boolean }) {
  const section = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [google, setGoogle] = useState<GoogleReviewsResult | null>(null);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [visible, setVisible] = useState(false);
  const isGoogle = google?.status === "ready";
  const isDemo = !isGoogle && !publishedItems.length;
  const items: Review[] = isGoogle ? google.reviews.map((r) => ({ ...r, companion: "Reseña en Google Maps", photo: r.photoUrl })) : isDemo ? demoTestimonials : publishedItems;
  const count = items.length;
  const current = selected % Math.max(count, 1);
  const mapsUrl = google?.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "C. Veinticinco 26, Valparaíso")}`;

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!section.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .15 });
    observer.observe(section.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || preview || google !== null) return;
    const controller = new AbortController();
    void fetch("/api/google-reviews", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]) })
      .then(async (response) => { const value: unknown = await response.json(); if (!isGoogleReviewsResult(value)) throw new Error(); if (!controller.signal.aborted) { setGoogle(value); setSelected(0); } })
      .catch(() => { if (!controller.signal.aborted) setGoogle({ status: "unavailable", reviews: [] }); });
    return () => controller.abort();
  }, [visible, preview, google]);
  useEffect(() => {
    if (!playing || reduced || interacting || !visible || count < 2) return;
    const timer = setInterval(() => { if (!document.hidden) setSelected((v) => (v + 1) % count); }, 7000);
    return () => clearInterval(timer);
  }, [playing, reduced, interacting, visible, count]);
  useEffect(() => {
    const container = rail.current;
    const card = container?.children[current] as HTMLElement | undefined;
    if (container && card) container.scrollTo({ left: card.offsetLeft, behavior: reduced ? "instant" : "smooth" });
  }, [current, reduced, count]);
  const move = (delta: number) => { setPlaying(false); setSelected((v) => (v + delta + count) % count); };

  return <section ref={section} id="testimonios" className={styles.section} aria-labelledby="titulo-testimonios">
    <div className={styles.hero}>
      <div className={styles.heroImage}><Image src="/images/reviews/stories-header.webp" alt="Escena ilustrativa generada de una mujer junto a su perro en un hogar de Chile." fill sizes="100vw" /></div>
      <div className={styles.heroShade} />
      <div className={`${styles.container} ${styles.heading}`}>
        <div className={styles.introduction}><span className={styles.eyebrow}>HISTORIAS QUE NOS CONECTAN</span><h2 id="titulo-testimonios">El cariño tiene<br /><em>mucho que contar.</em></h2><p>Detrás de cada compañero hay una familia y una historia que merece ser escuchada.</p>
          <div className={styles.values}><span><Heart size={26} strokeWidth={1.4} aria-hidden="true" /><span>Vínculos<br />que importan</span></span><span><UsersRound size={26} strokeWidth={1.4} aria-hidden="true" /><span>Familias<br />y compañeros</span></span><span><PawPrint size={26} strokeWidth={1.4} aria-hidden="true" /><span>Historias<br />que nos inspiran</span></span></div>
        </div>
        <div className={styles.memories} aria-hidden="true">
          <span className={styles.thankYou}>Pequeños vínculos,<br />grandes historias. ♡</span>
          <figure className={styles.catMemory}><div><Image src="/images/porvenir/cat.webp" alt="" fill sizes="180px" /></div><figcaption>Compañía que deja huella ♡</figcaption></figure>
          <figure className={styles.dogMemory}><div><Image src="/images/porvenir/dog.webp" alt="" fill sizes="180px" /></div><figcaption>Un cariño para siempre.</figcaption></figure>
          <span className={styles.memoryNote}>Personas, vínculos<br />y mucho amor<br />por los animales.<small>Escenas ilustrativas</small></span>
        </div>
      </div>
    </div>
    <PawPrint className={styles.pawDecoration} size={105} aria-hidden="true" />
    <div className={`${styles.container} ${styles.content}`}>
      {isDemo && <p className={styles.disclosure}><strong>DEMOSTRACIÓN · TESTIMONIOS FICTICIOS</strong><span>No corresponden a clientes ni atenciones reales. Nombres, cargos, retratos y estrellas son ilustrativos; no son reseñas de Google.</span></p>}
      {google?.status === "unavailable" && <p className={styles.status} role="status">No pudimos cargar las reseñas de Google. {isDemo ? "Se muestra la demostración identificada." : "Se muestran los testimonios publicados por la clínica."}</p>}
      {isGoogle && count === 0 && <p className={styles.empty}>Esta ficha todavía no tiene reseñas disponibles. Puedes visitar su perfil en Google Maps.</p>}
      {count > 0 && <div className={styles.carousel} role="region" aria-roledescription="carrusel" aria-label="Testimonios de las familias" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }} onKeyDown={(event) => { if (count > 1 && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) { event.preventDefault(); setPlaying(false); if (event.key === "Home") setSelected(0); else if (event.key === "End") setSelected(count - 1); else move(event.key === "ArrowRight" ? 1 : -1); } }} tabIndex={0}>
        <div ref={rail} className={styles.rail} onPointerDown={() => setPlaying(false)}>
          {items.map((review, index) => <article key={`${review.author}-${index}`} className={`${styles.card} ${index === current ? styles.active : ""}`} aria-label={`Testimonio de ${review.author}`}>
            {isDemo && <div className={styles.storyPhoto}><Image src={`/images/reviews/${review.photo}-story.webp`} alt={`Escena ficticia de ${review.author} junto a su mascota en Chile`} fill sizes="(max-width:767px) 90vw, (max-width:1000px) 45vw, 420px" /><span className={styles.cityBadge}><MapPin size={14} aria-hidden="true" />{review.city}</span><span className={styles.photoQuote}><Quote size={24} strokeWidth={1.4} aria-hidden="true" /></span></div>}
            <div className={styles.cardBody}>
            <div className={styles.cardTop}>{review.rating !== undefined ? <Stars rating={review.rating} demo={isDemo} /> : <span className={styles.published}>Experiencia compartida</span>}{!isDemo && <Quote size={22} aria-hidden="true" />}</div>
            <blockquote>{review.quote || "Esta persona dejó una valoración sin comentario."}</blockquote>
            {review.translated && <small className={styles.translated}>Traducción proporcionada por Google.</small>}
            <div className={styles.person}>
              <span className={styles.avatar}>{review.photo ? isDemo ? <Image src={`/images/reviews/${review.photo}.webp`} alt={`Retrato ficticio de ${review.author}`} fill sizes="52px" /> : <Image src={review.photo} alt={`Foto de ${review.author}`} fill sizes="52px" unoptimized referrerPolicy="no-referrer" /> : <span aria-hidden="true">{review.author.slice(0, 1)}</span>}</span>
              <div>{review.authorUrl ? <a href={review.authorUrl} target="_blank" rel="noopener noreferrer">{review.author}</a> : <h3>{review.author}</h3>}{isDemo && <span className={styles.role}>{review.role}</span>}<span className={styles.companion}>{review.companion}</span></div>
            </div>
            <footer className={styles.cardFooter}>{isDemo ? <><span><PawPrint size={12} aria-hidden="true" />{review.city}, Chile</span><span>Perfil ficticio</span></> : isGoogle ? <><span className={styles.provider}>Google Maps</span>{review.date && <span>{review.date}</span>}</> : <span>Testimonio de la clínica</span>}</footer>
            {isGoogle && review.reviewUrl && <a className={styles.source} href={review.reviewUrl} target="_blank" rel="noopener noreferrer">Ver reseña original<ArrowUpRight size={13} aria-hidden="true" /></a>}
            </div>
          </article>)}
        </div>
        {count > 1 && <div className={styles.controls}>
          <div className={styles.dots} role="group" aria-label="Seleccionar testimonio">{items.map((r, i) => <button key={i} type="button" aria-label={`Ir al testimonio de ${r.author}`} aria-pressed={i === current} onClick={() => { setPlaying(false); setSelected(i); }}><span /></button>)}</div>
          <span className={styles.counter} aria-live={playing && !reduced ? "off" : "polite"}>{String(current + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</span>
          <div className={styles.buttons}>{!reduced && <button type="button" aria-label={playing ? "Pausar testimonios" : "Reproducir testimonios"} onClick={() => setPlaying((v) => !v)}>{playing ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}</button>}<button type="button" aria-label="Testimonio anterior" onClick={() => move(-1)}><ArrowLeft size={19} aria-hidden="true" /></button><button type="button" aria-label="Testimonio siguiente" onClick={() => move(1)}><ArrowRight size={19} aria-hidden="true" /></button></div>
        </div>}
      </div>}
      <div className={styles.closingRow}><p className={styles.handwritten}>Historias que<br />nos inspiran. <Heart size={25} strokeWidth={1.2} aria-hidden="true" /></p>
        <aside className={styles.summary}>
          <span className={styles.summaryIcon}><Quote size={25} aria-hidden="true" /></span>
          {isGoogle ? <><span className={styles.provider}>Google Maps</span>{google.rating !== undefined && <div className={styles.rating}><strong>{new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(google.rating)}</strong><Stars rating={google.rating} /></div>}<p>{google.total !== undefined ? `${google.total} opiniones en Google Maps` : "Opiniones en Google Maps"}</p><small>Ordenadas por relevancia de Google. Sin filtro por puntuación.</small></> : <><span className={styles.summaryTitle}>{isDemo ? "Personas, vínculos e historias." : "Experiencias compartidas."}</span><p>{isDemo ? "Seis miradas para imaginar este espacio." : "Palabras de quienes nos acompañan."}</p><small>{isDemo ? "Ejemplos, no clientes reales." : "Testimonios publicados por la clínica."}</small></>}
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">{isGoogle ? "Ver en Google Maps" : "Encontrarnos en Google Maps"}<ArrowUpRight size={15} aria-hidden="true" /></a>
        </aside>
      </div>
    </div>
  </section>;
}
