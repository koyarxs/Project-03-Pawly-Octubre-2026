import {
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  PawPrint,
} from "lucide-react";
import { HeroEntrance } from "@/components/hero-entrance";
import { ProductPreview } from "@/components/product-preview";
import { PawlyMark } from "@/components/brand";
import "@/app/product-introduction.css";
import { CareFlow } from "@/components/care-flow";

export function ProductIntroduction() {
  return (
    <div className="product-introduction">
      <div className="container hero-product-strip">
        <HeroEntrance className="intro-copy">
          <h2>
            Menos información dispersa.
            <br />
            <em>Más claridad para cuidar.</em>
          </h2>
          <p>
            De la primera cita al próximo control. Así imaginamos Pawly: un
            espacio donde tu equipo pueda conectar la agenda, los pacientes y su
            historia clínica.
          </p>
          <a className="intro-action" href="#demostracion">
            Explorar la demostración conceptual{" "}
            <ArrowUpRight size={19} aria-hidden="true" />
          </a>
          <span className="intro-development">
            En desarrollo · Diseñado para la práctica veterinaria en Chile
          </span>
        </HeroEntrance>
        <HeroEntrance className="hero-interface intro-scene" delay={0.08}>
          <div className="intro-laptop-screen">
            <aside
              className="intro-workspace-sidebar"
              aria-label="Módulos planificados, vista conceptual"
            >
              <span className="intro-workspace-brand">
                <PawlyMark /> Pawly
              </span>
              {[
                { icon: LayoutDashboard, label: "Inicio" },
                { icon: CalendarDays, label: "Agenda" },
                { icon: PawPrint, label: "Pacientes" },
                { icon: ClipboardList, label: "Historia clínica" },
              ].map(({ icon: Icon, label }, index) => (
                <span
                  className={index === 0 ? "intro-sidebar-current" : ""}
                  key={label}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </span>
              ))}
              <small>Vista conceptual</small>
            </aside>
            <div className="intro-workspace-content">
              <ProductPreview compact />
              <div className="intro-patient-story">
                <span className="intro-patient-icon">
                  <PawPrint size={22} aria-hidden="true" />
                </span>
                <div>
                  <span>EL CONTEXTO ACOMPAÑA A CADA PACIENTE</span>
                  <strong>
                    Luna <small>· Control preventivo</small>
                  </strong>
                  <p>Paciente → Tutor → Historia clínica</p>
                </div>
                <ClipboardList size={21} aria-hidden="true" />
              </div>
            </div>
          </div>
          <div className="intro-laptop-base" aria-hidden="true" />
        </HeroEntrance>
      </div>
      <CareFlow />
    </div>
  );
}
