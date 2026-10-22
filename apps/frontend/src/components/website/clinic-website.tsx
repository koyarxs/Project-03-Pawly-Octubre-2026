"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Heart,
  Mail,
  MapPin,
  Menu,
  PawPrint,
  Phone,
  X,
  Sparkles,
} from "lucide-react";
import { PawlyMark } from "@/components/brand";
import { PhotoCarousel } from "@/components/marketing/photo-carousel";
import type { WebsiteContent } from "@/lib/website";
import styles from "./clinic-website.module.css";
import { PetGallery } from "./pet-gallery";
import { ClinicLocation } from "./clinic-location";
import { ClinicTestimonials } from "./clinic-testimonials";

export function ClinicWebsite({
  content,
  preview = false,
  unpublished = false,
  availabilityError = false,
}: {
  content: WebsiteContent;
  preview?: boolean;
  unpublished?: boolean;
  availabilityError?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        trigger.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 901px)");
    const resize = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    document.addEventListener("keydown", close);
    desktop.addEventListener("change", resize);
    return () => {
      document.removeEventListener("keydown", close);
      desktop.removeEventListener("change", resize);
    };
  }, [menuOpen]);
  const services = content.showServices && content.services.length > 0;
  const about = content.showAbout && Boolean(content.aboutText);
  const links = [
    ...(services ? [["Servicios", "#servicios"]] : []),
    ...(about ? [["Nuestra veterinaria", "#nosotros"]] : []),
    ["Compañeros", "#companeros"],
    ["Contacto y horarios", "#contacto"],
  ];
  const Main = preview ? "div" : "main";
  return (
    <div className={`${styles.site}${preview ? ` ${styles.preview}` : ""}`}>
      {!preview && (
        <a className={styles.skip} href="#contenido-veterinaria">
          Saltar al contenido
        </a>
      )}
      <div className={styles.topline}>
        <span>
          <Heart size={13} aria-hidden="true" /> Un mundo mejor empieza por
          cuidarlos.
        </span>
        <a href="#ubicacion">
          Encuéntranos <ArrowUpRight size={13} aria-hidden="true" />
        </a>
      </div>
      <header
        className={styles.header}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null))
            setMenuOpen(false);
        }}
      >
        <div className={`${styles.container} ${styles.headerInner}`}>
          <a
            className={styles.brand}
            href="#inicio"
            aria-label={`${content.clinicName}, inicio`}
          >
            <PawlyMark />
            <span>{content.clinicName}</span>
          </a>
          <nav className={styles.desktopNav} aria-label="Navegación principal">
            {links.map(([label, href]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          <button
            ref={trigger}
            type="button"
            className={styles.menu}
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            aria-controls="navegacion-veterinaria"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <X size={23} aria-hidden="true" />
            ) : (
              <Menu size={23} aria-hidden="true" />
            )}
          </button>
        </div>
        <nav
          id="navegacion-veterinaria"
          className={styles.mobileNav}
          aria-label="Navegación móvil"
          hidden={!menuOpen}
        >
          {links.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setMenuOpen(false)}>
              {label}
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          ))}
        </nav>
      </header>
      <Main id="contenido-veterinaria" tabIndex={-1}>
        {(unpublished || availabilityError) && (
          <p className={styles.preparationNotice} role="status">
            {availabilityError
              ? "No pudimos actualizar el contenido del sitio. Intenta recargar la página; no se muestran borradores privados."
              : "El sitio público está en preparación. Los servicios, contactos y horarios se publicarán cuando estén confirmados."}
          </p>
        )}
        <section
          id="inicio"
          className={styles.hero}
          aria-labelledby="titulo-veterinaria"
        >
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <span className={`${styles.eyebrow} ${styles.heroEyebrow}`}>
                <span />
                {content.tagline}
              </span>
              <h1 id="titulo-veterinaria">{content.heroTitle}</h1>
              <p>{content.heroDescription}</p>
              <div className={styles.actions}>
                <a className={styles.primary} href="#contacto">
                  Conversemos sobre su cuidado{" "}
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
                {services && (
                  <a className={styles.textLink} href="#servicios">
                    Conocer los servicios{" "}
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </a>
                )}
              </div>
              <div className={styles.heroNote}>
                <div className={styles.miniPortraits}>
                  <Image
                    src="/images/porvenir/dog.webp"
                    alt=""
                    width={42}
                    height={42}
                  />
                  <Image
                    src="/images/porvenir/cat.webp"
                    alt=""
                    width={42}
                    height={42}
                  />
                  <span>
                    <Heart size={18} aria-hidden="true" />
                  </span>
                </div>
                <span>
                  No son solo mascotas.
                  <br />
                  <strong>Son parte de tu familia.</strong>
                </span>
              </div>
            </div>
            <div className={styles.heroVisual}>
              <PhotoCarousel
                key={content.heroPhotos.join(":")}
                photoIds={content.heroPhotos}
                variant="cover"
              />
              <p className={styles.photoNote}>
                Fotografías ilustrativas de cuidado veterinario.
              </p>
              <div className={styles.heroSticker}>
                <Sparkles size={22} strokeWidth={1.4} aria-hidden="true" />
                <span>
                  Pequeñas vidas.
                  <br />
                  <strong>Grandes vínculos.</strong>
                </span>
              </div>
            </div>
          </div>
        </section>
        <div className={styles.valuesRibbon} aria-label="Compañeros de vida">
          <span>Más que compañía</span>
          <PawPrint aria-hidden="true" />
          <span>Una historia juntos</span>
          <Heart aria-hidden="true" />
          <span>Un cariño inmenso</span>
          <PawPrint aria-hidden="true" />
          <span>Parte de la familia</span>
        </div>
        {services && (
          <section
            id="servicios"
            className={styles.services}
            aria-labelledby="titulo-servicios"
          >
            <div className={styles.container}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.eyebrow}>CERCA EN CADA ETAPA</span>
                  <h2>
                    Un cuidado con <em>propósito.</em>
                  </h2>
                </div>
                <p id="titulo-servicios">Servicios de {content.clinicName}</p>
              </div>
              <div className={styles.serviceGrid}>
                {content.services.map((service, index) => (
                  <article key={index}>
                    <div className={styles.serviceTop}>
                      <PawPrint
                        size={24}
                        strokeWidth={1.4}
                        aria-hidden="true"
                      />
                      <span>{String(index + 1).padStart(2, "0")}</span>
                    </div>
                    <h3>{service.title}</h3>
                    <p>{service.description}</p>
                    <a className={styles.textLink} href="#contacto">
                      Consultar por este servicio{" "}
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
        <PetGallery />
        {about && (
          <section
            id="nosotros"
            className={styles.about}
            aria-labelledby="titulo-nosotros"
          >
            <div className={`${styles.container} ${styles.aboutGrid}`}>
              <figure className={styles.aboutPhoto}>
                <Image
                  src="/images/pawly-2/auth-cat-examination.webp"
                  alt="Una profesional veterinaria examina cuidadosamente a un gato; fotografía ilustrativa."
                  fill
                  sizes="(max-width:767px) calc(100vw - 40px), 40vw"
                />
                <figcaption>El cuidado inspira lo que hacemos.</figcaption>
              </figure>
              <div>
                <span className={styles.eyebrow}>NUESTRA VETERINARIA</span>
                <h2 id="titulo-nosotros">{content.aboutTitle}</h2>
                <p className={styles.longText}>{content.aboutText}</p>
                <a className={styles.textLink} href="#contacto">
                  Encuéntranos <ArrowRight size={18} aria-hidden="true" />
                </a>
              </div>
            </div>
          </section>
        )}
        <ClinicTestimonials
          key={JSON.stringify(content.testimonials)}
          items={content.testimonials}
        />
        <section
          id="ubicacion"
          className={styles.location}
          aria-labelledby="titulo-ubicacion"
        >
          <div className={styles.container}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.eyebrow}>
                  HAGAMOS MÁS FÁCIL ENCONTRARNOS
                </span>
                <h2 id="titulo-ubicacion">
                  Cerca de ti.
                  <br />
                  <em>Cerca de su mundo.</em>
                </h2>
              </div>
              <p>
                {content.address ||
                  "Estamos preparando la información para tu próxima visita. Aquí encontrarás nuestra ubicación cuando esté confirmada."}
              </p>
            </div>
            <ClinicLocation key={content.address} address={content.address} />
          </div>
        </section>
        <section
          id="contacto"
          className={styles.contact}
          aria-labelledby="titulo-contacto"
        >
          <div className={`${styles.container} ${styles.contactGrid}`}>
            <div>
              <span className={styles.eyebrow}>
                HABLEMOS DE QUIEN MÁS QUIERES
              </span>
              <h2 id="titulo-contacto">
                Estamos para <em>acompañarte.</em>
              </h2>
              <p>
                Contacta directamente con {content.clinicName} para consultar
                por atención y coordinar una visita.
              </p>
              <div className={styles.contactActions}>
                {content.whatsapp && (
                  <a
                    className={styles.lightButton}
                    href={`https://wa.me/${content.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Escribir por WhatsApp{" "}
                    <ArrowUpRight size={18} aria-hidden="true" />
                    <span className="sr-only"> (abre otra pestaña)</span>
                  </a>
                )}
                {content.phone && (
                  <a
                    className={styles.contactLink}
                    href={`tel:${content.phone.replace(/[^\d+]/g, "")}`}
                  >
                    <Phone size={19} aria-hidden="true" />
                    {content.phone}
                  </a>
                )}
                {content.email && (
                  <a
                    className={styles.contactLink}
                    href={`mailto:${encodeURIComponent(content.email)}`}
                  >
                    <Mail size={19} aria-hidden="true" />
                    {content.email}
                  </a>
                )}
                {preview &&
                  !content.whatsapp &&
                  !content.phone &&
                  !content.email && (
                    <p className={styles.previewHint}>
                      Añade un teléfono, WhatsApp o correo antes de publicar.
                    </p>
                  )}
              </div>
            </div>
            <div className={styles.contactDetails}>
              {content.address && (
                <div>
                  <MapPin size={24} strokeWidth={1.5} aria-hidden="true" />
                  <div>
                    <h3>Cómo llegar</h3>
                    <p>{content.address}</p>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(content.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver ubicación en el mapa{" "}
                      <ArrowUpRight size={15} aria-hidden="true" />
                      <span className="sr-only"> (abre otra pestaña)</span>
                    </a>
                  </div>
                </div>
              )}
              {content.showHours && content.hours && (
                <div>
                  <Clock3 size={24} strokeWidth={1.5} aria-hidden="true" />
                  <div>
                    <h3>Horarios de atención</h3>
                    <p className={styles.longText}>{content.hours}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </Main>
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerTop}`}>
          <div className={styles.footerBrand}>
            <PawlyMark />
            <span>{content.clinicName}</span>
            <p>
              Un lugar en la web para quienes ocupan un lugar enorme en tu vida.
            </p>
          </div>
          <div>
            <h3>Explora Porvenir</h3>
            <a href="#inicio">Inicio</a>
            <a href="#companeros">Nuestros compañeros</a>
            {services && <a href="#servicios">Servicios</a>}
            {about && <a href="#nosotros">Nuestra veterinaria</a>}
            <a href="#testimonios">Testimonios</a>
          </div>
          <div>
            <h3>Hablemos</h3>
            <a href="#contacto">Contacto y horarios</a>
            <a href="#ubicacion">Ubicación</a>
            {content.phone && (
              <a href={`tel:${content.phone.replace(/[^\d+]/g, "")}`}>
                {content.phone}
              </a>
            )}
            {content.email && (
              <a href={`mailto:${encodeURIComponent(content.email)}`}>
                {content.email}
              </a>
            )}
          </div>
          <div className={styles.footerMessage}>
            <Heart size={24} strokeWidth={1.4} aria-hidden="true" />
            <p>
              Hay huellas que
              <br />
              se quedan <em>para siempre.</em>
            </p>
            <a href="#inicio">
              Volver arriba <ArrowUpRight size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
        <div className={`${styles.container} ${styles.footerInner}`}>
          <div>
            <PawlyMark />
            <span>
              © {new Date().getFullYear()} {content.clinicName}
            </span>
          </div>
          {!preview && (
            <Link href="/iniciar-sesion">
              Acceso del equipo <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          )}
          <span>Administrado con Pawly.</span>
        </div>
      </footer>
    </div>
  );
}
