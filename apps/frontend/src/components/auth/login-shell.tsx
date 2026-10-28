import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, PawPrint, ShieldCheck } from "lucide-react";
import { PorvenirLogo } from "@/components/brand";
import styles from "./login-shell.module.css";

export function LoginShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`pawly-auth ${styles.shell}`}>
      <a className="skip-link" href="#contenido">Saltar al formulario</a>
      <aside className={styles.visual} aria-label="El cuidado nos conecta">
        <Image className={styles.photo} src="/images/porvenir/auth/companion-window.jpg" alt="Una persona sostiene a su gato junto a una ventana con luz natural." fill sizes="(max-width: 899px) 1px, 50vw" preload />
        <div className={styles.shade} aria-hidden="true" />
        <Link href="/" className={styles.photoBrand} aria-label="Clínica Veterinaria Porvenir, inicio">
          <svg className={styles.whiteLogo} viewBox="0 0 2172 724" width="252" height="84" aria-hidden="true">
            <defs>
              <filter id="porvenir-login-white" colorInterpolationFilters="sRGB">
                {/* Keep the original contours and turn light interior details into negative space. */}
                <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -.2126 -.7152 -.0722 1 0" />
                <feComponentTransfer><feFuncA type="linear" slope="2" /></feComponentTransfer>
              </filter>
            </defs>
            <image href="/images/brand/porvenir-logo.png" width="2172" height="724" filter="url(#porvenir-login-white)" />
          </svg>
        </Link>
        <div className={styles.story}>
          <span className={styles.storyLabel}><PawPrint size={17} aria-hidden="true" /> Clínica Veterinaria Porvenir</span>
          <h2>Detrás de cada cuidado,<br /><em>estamos juntos.</em></h2>
          <p>Un equipo conectado. Más tiempo para acompañar cada historia.</p>
        </div>
        <div className={styles.photoFooter}><span>Personas que cuidan.</span><span>Compañeros que nos inspiran.</span></div>
      </aside>
      <div className={styles.main}>
        <div className={styles.top}>
          <Link href="/" className={styles.back}><ArrowLeft size={17} aria-hidden="true" /> Volver al sitio</Link>
          <span className={styles.private}><ShieldCheck size={16} aria-hidden="true" /> Acceso privado</span>
        </div>
        <Link href="/" className={styles.mobileBrand} aria-label="Clínica Veterinaria Porvenir, inicio"><PorvenirLogo /></Link>
        <main className={`auth-form-area ${styles.formArea}`} id="contenido" tabIndex={-1}>{children}</main>
        <footer className={styles.footer}><PawPrint size={15} aria-hidden="true" /> Clínica Veterinaria Porvenir <span>Conectados por su bienestar.</span></footer>
      </div>
    </div>
  );
}
