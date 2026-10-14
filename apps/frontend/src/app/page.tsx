import { PanelsTopLeft, Stethoscope, TrendingUp } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { LandingHero } from "@/components/landing-hero";
import { PracticeChallenges } from "@/components/practice-challenges";
import { LandingSections, LandingFooter } from "@/components/landing-continuation";

export default function Home() {
  return (
    <>
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <SiteHeader />
      <main id="contenido">
        <LandingHero />
        <PracticeChallenges />
        <section className="benefits-band">
          <div className="container benefits-grid">
            <div>
              <span className="eyebrow light-eyebrow">LA VISIÓN PAWLY</span>
              <h2>
                Un equipo alineado.
                <br />
                <span>Una atención con contexto.</span>
              </h2>
              <p>
                La propuesta es simple: acercar la operación al cuidado, para
                que la información acompañe cada decisión.
              </p>
            </div>
            <div className="benefit-items">
              {([
                [
                  "Continuidad clínica",
                  "Una historia conectada, desde la primera visita hasta el próximo control.",
                  Stethoscope,
                ],
                [
                  "Claridad operativa",
                  "Agenda y registros en un mismo lugar, con una visión compartida del trabajo.",
                  PanelsTopLeft,
                ],
                [
                  "Espacio para crecer",
                  "Una base ordenada para acompañar la evolución de tu práctica.",
                  TrendingUp,
                ],
              ] as const).map(([title, text, Icon]) => (
                <div key={title}>
                  <span className="benefit-icon">
                    <Icon size={23} strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <LandingSections />
      </main>
      <LandingFooter />
    </>
  );
}
