import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import "./auth.css";
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="pawly-auth">
      <a className="skip-link" href="#contenido">
        Saltar al formulario
      </a>
      <aside className="auth-story" aria-label="Bienvenido a Pawly">
        <Brand inverse />
        <div className="auth-story-copy">
          <span className="auth-kicker">DISEÑADO PARA QUIENES CUIDAN</span>
          <h2>
            Tu equipo.
            <br />
            Un mismo espacio.
          </h2>
          <p>
            Una forma más clara de conectar a las personas que hacen posible el
            cuidado veterinario.
          </p>
          <div className="auth-story-photo">
            <Image
              src="/images/pawly-2/auth-cat-examination.webp"
              alt="Una veterinaria examina cuidadosamente a un gato en la clínica."
              fill
              sizes="(min-width: 900px) 40vw, 1px"
              priority
            />
          </div>
        </div>
        <div className="auth-story-footer">
          <ShieldCheck size={19} aria-hidden="true" />
          <span>Tu cuenta. Tus clínicas. Un acceso privado.</span>
        </div>
      </aside>
      <div className="auth-main">
        <Link href="/" className="auth-back">
          <ArrowLeft size={16} aria-hidden="true" /> Volver a Pawly
        </Link>
        <main className="auth-form-area" id="contenido" tabIndex={-1}>
          {children}
        </main>
        <footer className="auth-footer">
          Pawly Workspace · Más tiempo para cuidar.
        </footer>
      </div>
    </div>
  );
}
