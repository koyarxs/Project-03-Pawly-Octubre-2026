import { ArrowUpRight, FileDown, Layers3, Play, Stethoscope } from "lucide-react";
import { HeroEntrance } from "@/components/hero-entrance";

const shortcuts = [
  { title: "Explorar la demo", detail: "Conoce el espacio de trabajo", href: "#demostracion", icon: Play },
  { title: "Ver los módulos", detail: "Lo esencial, conectado", href: "#funcionalidades", icon: Layers3 },
  { title: "Para mi práctica", detail: "Clínicas y profesionales", href: "#soluciones", icon: Stethoscope },
  { title: "Preparar solicitud", detail: "Descarga tu solicitud de demo", href: "#contacto", icon: FileDown },
] as const;

export function LandingShortcuts() {
  return (
    <div className="landing-shortcuts">
      <div className="container">
        <div className="shortcuts-heading"><span>CONOCE PAWLY A TU RITMO</span><p>¿Por dónde quieres empezar?</p></div>
        <nav className="shortcuts-grid" aria-label="Accesos rápidos a Pawly">
          {shortcuts.map(({ title, detail, href, icon: Icon }, index) => (
            <HeroEntrance className="shortcut-entrance" delay={index * 0.06} key={href}>
              <a className={`shortcut-card${index === 0 ? " shortcut-card-primary" : ""}`} href={href}>
                <span className="shortcut-icon"><Icon size={27} strokeWidth={1.6} aria-hidden="true" /></span>
                <span className="shortcut-copy"><strong>{title}</strong><small>{detail}</small></span>
                <ArrowUpRight className="shortcut-arrow" size={18} aria-hidden="true" />
              </a>
            </HeroEntrance>
          ))}
        </nav>
      </div>
    </div>
  );
}
