"use client";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Heart, Quote } from "lucide-react";
import type { WebsiteContent } from "@/lib/website";
import styles from "./clinic-website.module.css";
const demoTestimonials = [
  {
    author: "Camila · ejemplo",
    companion: "Familia ficticia de un golden retriever",
    quote:
      "Para nosotros, una buena atención empieza por escuchar. Eso es lo que nos gustaría encontrar en cada visita.",
  },
  {
    author: "Tomás · ejemplo",
    companion: "Familia ficticia de una gata persa",
    quote:
      "Que nos expliquen con calma y nos hagan parte de su cuidado marca una gran diferencia.",
  },
  {
    author: "Valentina · ejemplo",
    companion: "Familia ficticia de un conejo",
    quote:
      "Buscamos un lugar donde cada pregunta tenga espacio y cada compañero sea tratado con cariño.",
  },
];
export function ClinicTestimonials({
  items: publishedItems = [],
}: {
  items: WebsiteContent["testimonials"];
}) {
  const [selected, setSelected] = useState(0);
  const isDemo = !publishedItems.length;
  const items = isDemo ? demoTestimonials : publishedItems;
  const review = items[selected % Math.max(items.length, 1)];
  return (
    <section
      id="testimonios"
      className={styles.testimonials}
      aria-labelledby="titulo-testimonios"
    >
      <div className={`${styles.container} ${styles.testimonialGrid}`}>
        <div>
          <span className={styles.eyebrow}>HISTORIAS QUE NOS CONECTAN</span>
          <h2 id="titulo-testimonios">
            El cariño tiene
            <br />
            <em>mucho que contar.</em>
          </h2>
          <p>
            Detrás de cada compañero hay una familia y una historia que merece
            ser escuchada.
          </p>
          <div className={styles.reviewSignature}>
            <Heart size={20} aria-hidden="true" />
            <span>
              {isDemo ? "Una muestra del diseño." : "Experiencias compartidas."}
              <br />
              <strong>
                {isDemo
                  ? "Ejemplos, no clientes reales."
                  : "Vínculos que importan."}
              </strong>
            </span>
          </div>
        </div>
        <div className={styles.reviewCard}>
          {isDemo && (
            <p className={styles.demoLabel}>
              DEMOSTRACIÓN · TESTIMONIOS FICTICIOS
              <span>No corresponden a clientes ni atenciones reales.</span>
            </p>
          )}
          <Quote size={36} strokeWidth={1.3} aria-hidden="true" />
          {review ? (
            <>
              <figure aria-live="polite" aria-atomic="true">
                <blockquote>{review.quote}</blockquote>
                <figcaption>
                  <span className={styles.reviewAvatar} aria-hidden="true">
                    {review.author.slice(0, 1)}
                  </span>
                  <div>
                    <strong>{review.author}</strong>
                    {review.companion && <span>{review.companion}</span>}
                  </div>
                </figcaption>
              </figure>
              {items.length > 1 && (
                <div className={styles.reviewControls}>
                  <span>
                    {String((selected % items.length) + 1).padStart(2, "0")} /{" "}
                    {String(items.length).padStart(2, "0")}
                  </span>
                  <div>
                    <button
                      type="button"
                      aria-label="Testimonio anterior"
                      onClick={() =>
                        setSelected(
                          (v) => (v - 1 + items.length) % items.length,
                        )
                      }
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <button
                      type="button"
                      aria-label="Testimonio siguiente"
                      onClick={() => setSelected((v) => (v + 1) % items.length)}
                    >
                      <ArrowRight size={20} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.reviewEmpty}>
              <span>ESTE ESPACIO ES PARA USTEDES</span>
              <h3>
                Las mejores historias
                <br />
                llevan su nombre.
              </h3>
              <p>
                Pronto compartiremos aquí experiencias reales de las familias
                que nos acompañan.
              </p>
              <span>Testimonios aún no publicados.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
