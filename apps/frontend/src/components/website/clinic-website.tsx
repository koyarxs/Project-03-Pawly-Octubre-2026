"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Heart,
  MapPin,
  Menu,
  PawPrint,
  Phone,
  X,
  CalendarDays,
} from "lucide-react";
import { PorvenirHeaderLogo } from "@/components/brand";
import { PhotoCarousel } from "@/components/marketing/photo-carousel";
import type { WebsiteContent } from "@/lib/website";
import styles from "./clinic-website.module.css";
import { PetGallery } from "./pet-gallery";
import { ClinicLocation } from "./clinic-location";
import { ClinicTestimonials } from "./clinic-testimonials";
import { ClinicTeam } from "./clinic-team";
import { ClinicWelcome } from "./clinic-welcome";
import { ClinicFooter } from "./clinic-footer";

export function ClinicWebsite({
  content,
  preview = false,
  availabilityError = false,
}: {
  content: WebsiteContent;
  preview?: boolean;
  unpublished?: boolean;
  availabilityError?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (preview) return;
    const update = () => setScrolled(window.scrollY > 72);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [preview]);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        trigger.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 1201px)");
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
    ["Inicio", "#inicio"],
    ...(services ? [["Servicios", "#servicios"]] : []),
    ...(about ? [["Nuestra veterinaria", "#nosotros"]] : []),
    ["Compañeros", "#companeros"],
    ["Equipo", "#equipo"],
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
        <div className={styles.contactStrip}>
          {content.address && (
            <a href="#ubicacion">
              <MapPin size={15} aria-hidden="true" />
              {content.address}
            </a>
          )}
          {content.phone && (
            <a href={`tel:${content.phone.replace(/[^+\d]/g, "")}`}>
              <Phone size={15} aria-hidden="true" />
              {content.phone}
            </a>
          )}
          {content.showHours && content.hours && (
            <a href="#contacto">
              <Clock3 size={15} aria-hidden="true" />
              Ver horarios
            </a>
          )}
        </div>
        <span className={styles.toplineMessage}>
          <Heart size={13} aria-hidden="true" /> Un mundo mejor empieza por
          cuidarlos.
        </span>
      </div>
      <header
        className={styles.header}
        data-scrolled={scrolled}
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
            <PorvenirHeaderLogo className={styles.headerIdentity} />
          </a>
          <nav className={styles.desktopNav} aria-label="Navegación principal">
            {links.map(([label, href]) => (
              <a key={href} href={href}>
                {label}
              </a>
            ))}
          </nav>
          {!preview && (
            <nav className={styles.authActions} aria-label="Acceso a Pawly">
              <Link href="/agendar-cita" className={styles.bookingAction}>
                <CalendarDays size={18} aria-hidden="true" />
                Agendar cita
              </Link>
              <Link href="/iniciar-sesion" className={styles.registerAction}>
                <PawPrint size={18} aria-hidden="true" />
                Iniciar sesión
              </Link>
              <Link href="/registrarse">Registrarse</Link>
            </nav>
          )}
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
          {!preview && (
            <Link href="/agendar-cita" onClick={() => setMenuOpen(false)}>
              Agendar cita
              <CalendarDays size={18} aria-hidden="true" />
            </Link>
          )}
        </nav>
      </header>
      <Main id="contenido-veterinaria" tabIndex={-1}>
        {availabilityError && (
          <p className={styles.preparationNotice} role="status">
            No pudimos actualizar el contenido del sitio. Intenta recargar la
            página; no se muestran borradores privados.
          </p>
        )}
        <section
          id="inicio"
          className={styles.hero}
          aria-labelledby="titulo-veterinaria"
        >
          <h1 id="titulo-veterinaria" className={styles.srOnly}>
            {content.heroTitle}
          </h1>
          <p className={styles.srOnly}>{content.heroDescription}</p>
          <PhotoCarousel
            key={content.heroPhotos.join(":")}
            photoIds={content.heroPhotos}
            variant="banner"
          />
        </section>
        <ClinicWelcome />
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
        <ClinicTeam preview={preview} />
        <ClinicTestimonials
          key={JSON.stringify(content.testimonials)}
          items={content.testimonials}
          address={content.address}
          preview={preview}
        />
        <ClinicLocation key={content.address} address={content.address} />
      </Main>
      <ClinicFooter content={content} preview={preview} />
    </div>
  );
}
