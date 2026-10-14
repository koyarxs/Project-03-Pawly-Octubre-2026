import Image from "next/image";
import veterinaryTeam from "../../public/images/landing-team-care.webp";
import { HeroEntrance } from "@/components/hero-entrance";
import { ArrowUpRight, Check, Stethoscope, Users } from "lucide-react";

export function PracticeSolutions() {
  return (
    <section
      id="soluciones"
      className="section section-anchor solutions-section"
    >
      <div className="container">
        <HeroEntrance className="section-heading split-heading lower-heading lower-heading-split">
          <div>
            <span className="eyebrow">
              DISTINTAS PRÁCTICAS. EL MISMO CUIDADO.
            </span>
            <h2>
              Tu forma de trabajar
              <br />
              <em>es el punto de partida.</em>
            </h2>
          </div>
          <p>
            Una consulta independiente y un equipo clínico comparten algo
            esencial: la necesidad de encontrar la información correcta cuando
            importa.
          </p>
        </HeroEntrance>
        <HeroEntrance className="solutions-layout" delay={0.08}>
          <figure className="practice-photo">
            <div className="practice-photo-image">
              <Image
                src={veterinaryTeam}
                alt="Dos profesionales coordinan la atención de un perro en una consulta veterinaria."
                fill
                placeholder="blur"
                sizes="(max-width: 900px) 90vw, 43vw"
              />
            </div>
            <figcaption>
              <div>
                <strong>El cuidado es un trabajo compartido.</strong>
                <span>Y el contexto también debería serlo.</span>
              </div>
              <a
                href="https://www.pexels.com/photo/a-woman-bringing-her-pet-to-a-veterinarian-6234611/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Fotografía referencial{" "}
                <ArrowUpRight size={12} aria-hidden="true" />
              </a>
            </figcaption>
          </figure>
          <div className="solutions-grid">
            <article className="solution-clinic">
              <div className="solution-title">
                <Users size={24} />
                <span className="eyebrow light-eyebrow">
                  CLÍNICAS VETERINARIAS
                </span>
              </div>
              <h3>Más contexto para todo el equipo.</h3>
              <p>
                Una propuesta para coordinar personas, agenda y registros cuando
                la atención es un esfuerzo compartido.
              </p>
              <ul>
                <li>
                  <Check /> Jornada compartida
                </li>
                <li>
                  <Check /> Continuidad entre atenciones
                </li>
              </ul>
              <a href="#contacto" className="text-action">
                Conversemos sobre tu clínica <ArrowUpRight size={17} />
              </a>
            </article>
            <article className="solution-practice">
              <div className="solution-title">
                <Stethoscope size={24} />
                <span className="eyebrow">PROFESIONALES INDEPENDIENTES</span>
              </div>
              <h3>Tu consulta, con espacio para crecer.</h3>
              <p>
                Una base ordenada para quienes gestionan y atienden, sin perder
                de vista la historia de cada paciente.
              </p>
              <ul>
                <li>
                  <Check /> Pacientes y tutores vinculados
                </li>
                <li>
                  <Check /> Registros en perspectiva
                </li>
              </ul>
              <a href="#contacto" className="text-action">
                Cuéntanos cómo trabajas <ArrowUpRight size={17} />
              </a>
            </article>
          </div>
        </HeroEntrance>
      </div>
    </section>
  );
}
