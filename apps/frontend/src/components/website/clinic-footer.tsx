import Link from "next/link";
import { ArrowRight, ArrowUp, ArrowUpRight, Clock3, MapPin, PawPrint } from "lucide-react";
import { PorvenirLogo } from "@/components/brand";
import type { WebsiteContent } from "@/lib/website";
import { clinicHours } from "@/lib/clinic-hours";
import styles from "./clinic-footer.module.css";
import { NewsletterForm } from "./newsletter-form";
import { clinicWhatsAppNumber, clinicWhatsAppUrl, WhatsAppIcon } from "./clinic-whatsapp";

function SocialIcon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      {name === "Instagram" ? <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none" /></>
        : name === "Facebook" ? <path d="M14 22v-9h3l.5-4H14V7c0-1.2.4-2 2-2h2V1.5C17.3 1.3 16.1 1 14.7 1 11.4 1 9 3 9 6.7V9H6v4h3v9" />
          : name === "X" ? <path d="M4 3h4l12 18h-4L4 3Zm16 0L4 21" />
          : <><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 6 3-6 3Z" fill="currentColor" stroke="none" /></>}
    </svg>
  );
}

export function ClinicFooter({ content, preview }: { content: WebsiteContent; preview: boolean }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.invitation}>
          <div>
            <span className={styles.eyebrow}>SUSCRÍBETE A NUESTRO BOLETÍN</span>
            <h2>Consejos, cuidados<br />{" "}<em>y más.</em></h2>
          </div>
          <NewsletterForm preview={preview} />

        </div>

        <div className={styles.columns}>
          <div className={styles.identity}>
            <a className={styles.logo} href="#inicio" aria-label="Porvenir, volver al inicio"><PorvenirLogo /></a>
            <p>Para los que llenan tu casa de vida.<br />Y tu vida de historias.</p>
            <span className={styles.signature}>El bienestar de quienes más quieres,<br />siempre cerca de ti.</span>
          <div className={styles.community}>
            <h3>Síguenos en redes</h3>
            <ul className={styles.socials} aria-label="Redes sociales, enlaces pendientes">
              {["Instagram", "Facebook", "YouTube", "X"].map((name) => <li key={name}><span className={styles.socialIcon} data-network={name}><SocialIcon name={name} /></span><span>{name}</span></li>)}
            </ul>
            <p className={styles.socialNote}>Próximamente compartiremos<br />nuestros perfiles contigo.</p>
          </div>
          </div>
          <div className={styles.navigationGroup}>
          <nav className={styles.navigation} aria-label="Explorar la veterinaria">
            <h3>Conoce Porvenir</h3>
            <a href="#inicio">Inicio</a>
            {content.showServices && content.services.length > 0 && <a href="#servicios">Nuestros servicios</a>}
            <a href="#tu-visita">Prepara tu visita</a>
            <a href="#equipo">El equipo</a>
          </nav>
          <nav className={styles.navigation} aria-label="Información de la veterinaria">
            <h3>Información útil</h3>
            <a href="#ubicacion">Ubicación y cómo llegar</a>
            <a href="#horario-atencion">Horario de atención</a>
            <a href="#preguntas-frecuentes">Preguntas frecuentes</a>
            {content.showAbout && content.aboutText && <a href="#nosotros">Nuestra veterinaria</a>}
            <a href="#testimonios">Historias que nos conectan</a>
          </nav>
          </div>
          <div id="contacto" className={styles.details}>
            <h3>Estamos en Valparaíso</h3>
            {content.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(content.address)}`} target="_blank" rel="noopener noreferrer"><MapPin size={17} aria-hidden="true" /><span>{content.address}<small>Ver en Google Maps <ArrowUpRight size={12} aria-hidden="true" /><span className="sr-only"> (abre otra pestaña)</span></small></span></a>}
            <a href={clinicWhatsAppUrl} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={22} /><span>WhatsApp<small>{clinicWhatsAppNumber} <ArrowUpRight size={15} aria-hidden="true" /><span className="sr-only"> (abre otra pestaña)</span></small></span></a>
          <div id="horario-atencion" className={styles.opening}><Clock3 size={25} aria-hidden="true" /><div><h3>Horario de atención</h3><p>{clinicHours(content)}</p></div><PawPrint className={styles.hoursPaw} size={27} aria-hidden="true" /></div>
            <a className={styles.allContact} href="#ubicacion">Ver ubicación <ArrowRight size={15} aria-hidden="true" /></a>
          </div>

        </div>

        <div className={styles.bottom}>
          <div className={styles.legal}><span>© {new Date().getFullYear()} {content.clinicName}</span><small className={styles.rights}>Todos los derechos reservados.</small><span className={styles.credits}><strong>Desarrollado por YB Veltrix Solutions</strong></span></div>
          <div>{!preview && <Link href="/iniciar-sesion">Acceso del equipo <ArrowUpRight size={14} aria-hidden="true" /></Link>}<a className={styles.backTop} href="#inicio" aria-label="Volver arriba"><ArrowUp size={17} aria-hidden="true" /></a></div>
        </div>
      </div>
    </footer>
  );
}
