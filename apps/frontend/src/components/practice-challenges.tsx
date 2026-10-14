import Image from "next/image";
import { ArrowRight, CalendarDays, ClipboardList, Clock3, MessageCircle } from "lucide-react";
import { HeroEntrance } from "@/components/hero-entrance";
import "@/app/practice-challenges.css";

const challenges = [
  { category: "INFORMACIÓN CLÍNICA", title: "La información,", emphasis: "repartida.", description: "Fichas, contactos e indicaciones en distintos lugares. Encontrarlos interrumpe la atención.", photo: "/images/challenges-care.png", icon: ClipboardList },
  { category: "COORDINACIÓN DEL EQUIPO", title: "La agenda,", emphasis: "desconectada.", description: "Distintas versiones del día. Coordinar al equipo se vuelve una tarea extra.", photo: "/images/challenges-team.png", icon: CalendarDays },
  { category: "CONTINUIDAD DEL CUIDADO", title: "El seguimiento,", emphasis: "pendiente.", description: "Después de la consulta, los próximos pasos necesitan un lugar claro para continuar el cuidado.", photo: "/images/challenges-record.png", icon: Clock3 },
] as const;

function SceneDetail({ index }: { index: number }) {
  const Icon = index === 0 ? MessageCircle : index === 1 ? CalendarDays : Clock3;
  const titles = ["Una consulta. Varios lugares.", "09:30 · Control de Luna", "La atención continúa"];
  const details = ["Ficha · Indicaciones · Mensajes", "¿Qué versión tiene el equipo?", "Próximo control por coordinar"];
  return <div className="challenge-detail" aria-hidden="true"><span className="challenge-detail-icon"><Icon size={18} /></span><div><strong>{titles[index]}</strong><span>{details[index]}</span></div><span className="challenge-detail-arrow"><ArrowRight size={16} /></span></div>;
}

export function PracticeChallenges() {
  return (
    <section id="desafios" className="section section-anchor practice-challenges challenges-reference" aria-labelledby="challenges-title">
      <div className="container">
        <div className="challenges-corner-visual" aria-hidden="true"><Image src="/images/challenges-corner.png" alt="" fill sizes="(max-width: 1099px) 360px, 560px" /><span className="challenges-care-rays"><i /><i /><i /></span></div>
        <HeroEntrance className="practice-challenges-heading">
          <span className="eyebrow">EL DÍA A DÍA NO ESPERA</span>
          <h2 id="challenges-title">El cuidado es complejo.<br /><em>La gestión no debería serlo.</em></h2>
          <p>Entre consultas, todo esto también necesita atención. Pawly nace para dar orden al trabajo que queda entre sistemas, papeles y mensajes.</p>
        </HeroEntrance>
        <div className="practice-challenges-grid">
          {challenges.map(({ category, title, emphasis, description, photo, icon: Icon }, index) => (
            <HeroEntrance className="practice-challenge-entrance" delay={index * 0.12} key={category}>
              <article className={`practice-challenge practice-challenge-${index}${index === 2 ? " practice-challenge-dark" : ""}`}>
                <div className="challenge-scene">
                  <Image src={photo} alt="" fill sizes="(max-width: 699px) 100vw, 33vw" className="challenge-photo" />
                  <span className="challenge-photo-shade" aria-hidden="true" />
                  <span className="practice-challenge-number">0{index + 1}</span>
                  <SceneDetail index={index} />
                </div>
                <div className="practice-challenge-copy">
                  <span className="practice-challenge-category"><Icon size={15} aria-hidden="true" />{category}</span>
                  <h3>{title}<br /><em>{emphasis}</em></h3>
                  <p>{description}</p>
                  <a href="#demostracion" className="challenge-explore" aria-label={`Explorar la demostración: ${category.toLocaleLowerCase("es")}`}><ArrowRight size={22} /></a>
                </div>
              </article>
            </HeroEntrance>
          ))}
        </div>
      </div>
    </section>
  );
}
