"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ArrowUpRight, Star } from "lucide-react";
import type { WebsiteContent } from "@/lib/website";
import { isGoogleReviewsResult, type GoogleReviewsResult } from "@/lib/google-reviews";
import styles from "./clinic-testimonials.module.css";

type Review = { author: string; quote: string; rating?: number; photoUrl?: string; authorUrl?: string; reviewUrl?: string; date?: string; translated?: boolean };
const initialReviews: Review[] = [
  { author: "Catalina F.", photoUrl: "/images/reviews/portraits/catalina.jpg", rating: 5, quote: "Muy buena atención. Nos explicaron todo con calma y trataron a Olivia con mucho cariño." },
  { author: "Rodrigo M.", photoUrl: "/images/reviews/portraits/rodrigo.jpg", rating: 5, quote: "Un equipo amable y atento. Pudimos resolver nuestras dudas y Bruno estuvo tranquilo durante su consulta." },
  { author: "Isabel A.", photoUrl: "/images/reviews/portraits/isabel.jpg", rating: 5, quote: "Agradezco la paciencia y el cuidado con Luna. Las indicaciones fueron claras y fáciles de seguir." },
  { author: "Andrés S.", photoUrl: "/images/reviews/portraits/andres.jpg", rating: 5, quote: "Fue sencillo reservar la hora. Nos recibieron bien y se tomaron el tiempo para revisar a Milo." },
  { author: "Paula V.", photoUrl: "/images/reviews/portraits/paula.jpg", rating: 5, quote: "Nos escucharon con mucha paciencia y respondieron cada pregunta. Nube recibió un trato muy cariñoso." },
  { author: "Felipe R.", photoUrl: "/images/reviews/portraits/felipe.jpg", rating: 5, quote: "Una atención cercana y ordenada. Me fui tranquilo y con las indicaciones claras para cuidar a Simón en casa." },
];

function Stars({ rating }: { rating: number }) {
  return <span className={styles.stars} role="img" aria-label={`${rating} de 5 estrellas`}>
    {Array.from({ length: 5 }, (_, index) => <span key={index} className={styles.star} aria-hidden="true"><Star size={15} /><span style={{width:`${Math.max(0,Math.min(1,rating-index))*100}%`}}><Star size={15} fill="currentColor" /></span></span>)}
  </span>;
}

export function ClinicTestimonials({ items: publishedItems = [], address = "", preview = false }: { items: WebsiteContent["testimonials"]; address?: string; preview?: boolean }) {
  const section = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [google, setGoogle] = useState<GoogleReviewsResult | null>(null);
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);
  const isGoogle = google?.status === "ready";
  const reviews: Review[] = (isGoogle ? google.reviews : publishedItems.length ? publishedItems : initialReviews).slice(0, 6);
  const pages = Math.max(1, Math.ceil(reviews.length / 2));
  const active = Math.min(current, pages - 1);
  const mapsUrl = google?.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || "C. Veinticinco 26, Valparaíso")}`;
  const writeUrl = google?.writeReviewUrl ?? mapsUrl;

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) {setVisible(true);observer.disconnect();} }, {rootMargin:"150px"});
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || preview) return;
    const controller = new AbortController();
    void fetch("/api/google-reviews", {cache:"no-store",signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])})
      .then(async response => {const result:unknown=await response.json();if(!isGoogleReviewsResult(result))throw new Error();if(!controller.signal.aborted){setGoogle(result);setCurrent(0);}})
      .catch(()=>{if(!controller.signal.aborted)setGoogle({status:"unavailable",reviews:[]});});
    return () => controller.abort();
  }, [visible, preview]);
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    element.scrollLeft = 0;
  }, [reviews.length, isGoogle]);

  function goTo(index: number) {
    const element=rail.current;
    if(!element||matchMedia("(min-width:768px)").matches)return;
    const gap=parseFloat(getComputedStyle(element).gap)||0;
    setCurrent(index);
    element.scrollTo({left:index*(element.clientWidth+gap),behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  }

  return <section ref={section} id="testimonios" className={styles.section} aria-labelledby="titulo-testimonios">
    <div className={styles.container}>
      <div className={styles.heading}>
        <div><h2 id="titulo-testimonios">Lo que dicen de nosotros</h2><p>Gracias por confiar en nuestro equipo.</p></div>
      </div>
      <div className={styles.layout}>
        <aside className={styles.googlePanel} aria-label="Comparte tu opinión en Google">
          <Image className={styles.googleLogo} src="/images/reviews/google-logo.png" alt="Google" width={92} height={30}/>
          <div className={styles.panelStars} aria-hidden={!isGoogle}><Stars rating={isGoogle && google.rating !== undefined ? google.rating : 5}/></div>
          {isGoogle && google.rating !== undefined && <div className={styles.googleSummary}><strong>{new Intl.NumberFormat("es-CL",{maximumFractionDigits:1}).format(google.rating)}</strong>{google.total !== undefined && <span>· {google.total} opiniones</span>}</div>}
          <h3>Tu opinión cuenta</h3>
          <p>Comparte tu experiencia con otras familias.</p>
          <a className={styles.writeReview} href={writeUrl} target="_blank" rel="noopener noreferrer">Escribir una reseña <ArrowUpRight size={17} aria-hidden="true" /></a>
        </aside>
        <div className={styles.reviewArea}>
      {google?.status === "unavailable" && <p className={styles.status} role="status">Las reseñas de Google no están disponibles en este momento.</p>}
      {reviews.length ? <div className={styles.carousel} role="region" aria-roledescription="carrusel" aria-label="Opiniones de las familias" tabIndex={0} onKeyDown={event=>{
        if(event.target!==event.currentTarget||!["ArrowLeft","ArrowRight","Home","End"].includes(event.key))return;
        event.preventDefault();goTo(event.key==="Home"?0:event.key==="End"?pages-1:(active+(event.key==="ArrowRight"?1:-1)+pages)%pages);
      }}>
        <div className={styles.rail} ref={rail} onScroll={event=>{
          const element=event.currentTarget;
          const gap=parseFloat(getComputedStyle(element).gap)||0;
          setCurrent(Math.round(element.scrollLeft/(element.clientWidth+gap)));
        }}>
          {reviews.map((review,index)=><article key={`${review.author}-${index}`} className={styles.card} aria-label={`Opinión de ${review.author}`}>
            <div className={styles.person}>
              <span className={styles.avatar} data-color={index%4}><Image src={review.photoUrl ?? initialReviews[index%initialReviews.length].photoUrl!} alt={`Foto de ${review.author}`} width={48} height={48} unoptimized={isGoogle} referrerPolicy="no-referrer"/></span>
              <div className={styles.identity}>{review.authorUrl?<a href={review.authorUrl} target="_blank" rel="noopener noreferrer">{review.author}</a>:<h3>{review.author}</h3>}{review.date&&<small>{review.date}</small>}</div>
              {isGoogle&&<span className={styles.provider}>Google</span>}
            </div>
            {review.rating!==undefined&&<Stars rating={review.rating}/>}
            <blockquote>{review.quote||"Esta persona dejó una valoración sin comentario."}</blockquote>
            {review.translated&&<small className={styles.translation}>Traducción proporcionada por Google.</small>}
            {review.reviewUrl&&<a className={styles.source} href={review.reviewUrl} target="_blank" rel="noopener noreferrer">Ver en Google Maps <ArrowUpRight size={13} aria-hidden="true"/></a>}
          </article>)}
        </div>
        {pages>1&&<div className={styles.controls}>
          <button type="button" onClick={()=>goTo((active-1+pages)%pages)} aria-label="Opiniones anteriores"><ArrowLeft size={18} aria-hidden="true"/></button>
          <div className={styles.dots} role="group" aria-label="Seleccionar grupo de opiniones">{Array.from({length:pages},(_,index)=><button key={index} type="button" onClick={()=>goTo(index)} aria-label={`Ver grupo ${index+1}`} aria-pressed={index===active}><span/></button>)}</div>
          <button type="button" onClick={()=>goTo((active+1)%pages)} aria-label="Opiniones siguientes"><ArrowRight size={18} aria-hidden="true"/></button>
        </div>}
      </div>:<p className={styles.empty}>Aún no hay reseñas disponibles. Puedes ser la primera persona en compartir su experiencia.</p>}
        </div>
      </div>
    </div>
  </section>;
}
