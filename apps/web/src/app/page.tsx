import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  HeartHandshake,
  Layers3,
  Package,
  Plus,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { ProductPreview, WorkflowVisual } from "@/components/product-preview";
import { DemoRequest } from "@/components/demo-request";
import { LandingHero } from "@/components/landing-hero";
import { PracticeSolutions } from "@/components/practice-solutions";
import { FeatureBento } from "@/components/feature-bento";

const faqs = [
  [
    "¿Pawly ya está disponible para mi clínica?",
    "Pawly está en desarrollo. Esta landing presenta la visión del producto y una demostración conceptual; los módulos de gestión todavía no están disponibles para uso clínico. La disponibilidad se comunicará cuando esté definida.",
  ],
  [
    "¿La vista del dashboard muestra datos reales?",
    "No. Todos los pacientes, citas, nombres y cifras de la demostración son ficticios. Puedes explorar Dashboard, Agenda, Pacientes y Ficha clínica sin crear ni modificar registros reales.",
  ],
  [
    "¿Qué funcionalidades están planificadas?",
    "La propuesta contempla pacientes, tutores, agenda, fichas clínicas, vacunación e inventario. El alcance y el orden de lanzamiento se definirán durante el desarrollo; la presentación no garantiza que todos los módulos estén disponibles al mismo tiempo.",
  ],
  [
    "¿Cuánto costará Pawly?",
    "La oferta comercial está en definición. Aún no hay precios, planes ni condiciones de contratación aprobados. Compartiremos esa información de forma transparente antes de habilitar contrataciones.",
  ],
  [
    "¿Podré importar los datos que ya tengo?",
    "La importación de datos y sus formatos deben evaluarse. Todavía no existe una herramienta de migración disponible. Conocer cómo mantienes tus registros ayudará a definir este proceso.",
  ],
  [
    "¿Cómo puedo solicitar una demostración?",
    "Puedes preparar y descargar tu solicitud en la sección Contacto. Por ahora no se envía ni queda registrada: el canal de recepción todavía no está habilitado. No se te asignará una cita automáticamente.",
  ],
];

export default function Home() {
  return (
    <>
      <a href="#contenido" className="skip-link">
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido">
        <LandingHero />

        <section id="desafios" className="section section-anchor challenges">
          <div className="container">
            <div className="section-heading split-heading">
              <div>
                <span className="eyebrow">EL DÍA A DÍA NO ESPERA</span>
                <h2>
                  El cuidado es complejo.
                  <br />
                  La gestión no debería serlo.
                </h2>
              </div>
              <p>
                Entre una consulta y la siguiente, hay mucho más que atender.
                Pawly nace para dar orden a ese trabajo que suele quedar entre
                sistemas, papeles y mensajes.
              </p>
            </div>
            <div className="challenge-list">
              {(
                [
                  [
                    "01",
                    "La información, repartida.",
                    "Buscar una ficha, un contacto o la última indicación interrumpe el ritmo de atención.",
                    Layers3,
                  ],
                  [
                    "02",
                    "La agenda, desconectada.",
                    "Cuando el equipo trabaja con versiones distintas del día, coordinar se vuelve una tarea extra.",
                    CalendarDays,
                  ],
                  [
                    "03",
                    "El seguimiento, pendiente.",
                    "Los próximos pasos necesitan un lugar claro, para acompañar al paciente más allá de la consulta.",
                    HeartHandshake,
                  ],
                ] as const
              ).map(([number, title, text, Icon]) => {
                return (
                  <article className="challenge-item" key={number}>
                    <span className="challenge-number">{number}</span>
                    <Icon size={24} strokeWidth={1.5} />
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

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
              {[
                [
                  "Continuidad clínica",
                  "Una historia conectada, desde la primera visita hasta el próximo control.",
                ],
                [
                  "Claridad operativa",
                  "Agenda y registros en un mismo lugar, con una visión compartida del trabajo.",
                ],
                [
                  "Espacio para crecer",
                  "Una base ordenada para acompañar la evolución de tu práctica.",
                ],
              ].map(([title, text]) => (
                <div key={title}>
                  <span className="benefit-check">
                    <Check size={18} />
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

        <section
          id="demostracion"
          className="section section-anchor demo-section"
        >
          <div className="container">
            <div className="section-heading centered-heading">
              <span className="eyebrow">EL PRODUCTO, EN PERSPECTIVA</span>
              <h2>
                Todo empieza con
                <br />
                una vista más clara.
              </h2>
              <p>
                Así imaginamos el espacio de trabajo de tu clínica.
                <br />
                Cuatro vistas, un mismo recorrido: del resumen de la jornada a
                la historia de cada paciente.
              </p>
            </div>
            <div className="demo-stage">
              <ProductPreview />
            </div>
            <p className="demo-disclaimer">
              <span className="status-dot" /> Demostración conceptual · Datos
              ficticios · Funcionalidades planificadas
            </p>
          </div>
        </section>

        <section
          id="funcionalidades"
          className="section section-anchor features-section"
        >
          <div className="container">
            <div className="section-heading split-heading">
              <div>
                <span className="eyebrow">CONECTAR LO ESENCIAL</span>
                <h2>
                  Lo esencial, conectado.
                  <br />
                  Una misma historia.
                </h2>
              </div>
              <div>
                <p>
                  Estos son los módulos que estamos planificando para reunir lo
                  esencial de la gestión veterinaria.
                </p>
                <span className="planned-label">
                  En desarrollo · No disponibles aún
                </span>
              </div>
            </div>
            <FeatureBento />
          </div>
        </section>

        <section
          id="como-funciona"
          className="section section-anchor workflow-section"
        >
          <div className="container workflow-grid">
            <div>
              <span className="eyebrow">
                DEL PRIMER CONTACTO AL SEGUIMIENTO
              </span>
              <h2>
                Una atención fluida.
                <br />
                Paso a paso.
              </h2>
              <p className="section-intro">
                Un recorrido planificado para que cada parte del trabajo aporte
                contexto a la siguiente.
              </p>
              <ol className="workflow-steps">
                {[
                  [
                    "Organiza la jornada",
                    "Vincula la cita con el paciente y su tutor para preparar la atención.",
                  ],
                  [
                    "Documenta el cuidado",
                    "Reúne los antecedentes y registra lo relevante de cada consulta.",
                  ],
                  [
                    "Da continuidad",
                    "Mantén el seguimiento y las necesidades de la clínica a la vista.",
                  ],
                ].map(([title, text], i) => (
                  <li key={title}>
                    <span>0{i + 1}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <WorkflowVisual />
          </div>
        </section>

        <PracticeSolutions />

        <section id="nosotros" className="section section-anchor about-section">
          <div className="container about-grid">
            <div>
              <span className="eyebrow">POR QUÉ PAWLY</span>
              <h2>
                La tecnología detrás.
                <br />
                <span>El cuidado al centro.</span>
              </h2>
            </div>
            <div>
              <p className="about-lead">
                Estamos construyendo Pawly con una convicción: un buen sistema
                debe acompañar la práctica veterinaria, no interrumpirla.
              </p>
              <p>
                El producto está en una etapa inicial de desarrollo. Queremos
                entender las necesidades de clínicas y profesionales en Chile
                para dar forma a una experiencia útil, clara y cercana.
              </p>
              <div className="about-principles">
                <span>
                  <HeartHandshake size={20} /> Diseñar desde la práctica
                </span>
                <span>
                  <Layers3 size={20} /> Construir con claridad
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          id="precios"
          className="section section-anchor pricing-section"
        >
          <div className="container pricing-grid">
            <div>
              <span className="eyebrow">
                UNA PROPUESTA QUE ESTÁ TOMANDO FORMA
              </span>
              <h2>
                Primero, entender
                <br />
                lo que necesitas.
              </h2>
              <p className="section-intro">
                La oferta comercial se definirá junto al alcance del producto.
                Queremos que puedas evaluar Pawly con información clara, antes
                de tomar una decisión.
              </p>
            </div>
            <div className="pricing-panel">
              <div className="pricing-heading">
                <span className="planned-label">
                  Oferta comercial en definición
                </span>
                <Package size={26} strokeWidth={1.5} />
              </div>
              <h3>Pawly para tu práctica</h3>
              <p>
                Una futura plataforma de gestión veterinaria con pacientes,
                agenda, fichas clínicas y operación conectados.
              </p>
              <div className="pricing-status">
                <span>Planes y precios</span>
                <strong>Por definir</strong>
              </div>
              <ul>
                <li>
                  <Check size={17} /> Sin precios definitivos publicados
                </li>
                <li>
                  <Check size={17} /> Sin contratación habilitada todavía
                </li>
                <li>
                  <Check size={17} /> Alcance sujeto al desarrollo del producto
                </li>
              </ul>
              <Button asChild variant="outline" className="w-full">
                <a href="#contacto">
                  Me interesa conocer Pawly <ArrowUpRight />
                </a>
              </Button>
            </div>
          </div>
        </section>

        <section id="preguntas" className="section section-anchor faq-section">
          <div className="container faq-grid">
            <div>
              <span className="eyebrow">HABLEMOS CON CLARIDAD</span>
              <h2>
                Buenas preguntas.
                <br />
                Respuestas honestas.
              </h2>
              <p>Lo que puedes esperar de Pawly en esta etapa.</p>
              <a href="#contacto" className="text-action">
                ¿Tienes otra pregunta? <ArrowUpRight size={17} />
              </a>
            </div>
            <div className="faq-list">
              {faqs.map(([question, answer], i) => (
                <details key={question} className="faq-item" open={i === 0}>
                  <summary>
                    {question}
                    <Plus className="faq-plus" size={20} aria-hidden="true" />
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          id="contacto"
          className="section section-anchor contact-section"
        >
          <div className="container contact-grid">
            <div className="contact-copy">
              <span className="eyebrow light-eyebrow">
                LA PRÓXIMA CONVERSACIÓN
              </span>
              <h2>
                Hagamos espacio
                <br />
                para <span>más cuidado.</span>
              </h2>
              <p>
                ¿Qué cambiaría en tu día si la información de tu clínica
                estuviera conectada? Cuéntanos cómo trabajas y qué te gustaría
                resolver.
              </p>
              <div className="contact-next">
                <span className="contact-arrow">
                  <ArrowUpRight size={30} />
                </span>
                <div>
                  <h3>Una demo empieza por tu contexto.</h3>
                  <p>
                    Estamos preparando el canal de contacto. Mientras tanto,
                    puedes descargar tu solicitud; no se enviará
                    automáticamente.
                  </p>
                </div>
              </div>
              <span className="contact-status">
                Pawly está en desarrollo. Disponibilidad por definir.
              </span>
            </div>
            <DemoRequest />
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="container">
          <div className="footer-main">
            <div className="footer-brand">
              <Brand inverse />
              <p>Menos gestión. Más cuidado.</p>
              <span>Veterinary Management Platform</span>
            </div>
            <div className="footer-column">
              <h3>La plataforma</h3>
              <a href="#funcionalidades">Funcionalidades</a>
              <a href="#demostracion">Demostración conceptual</a>
              <a href="#como-funciona">Cómo funcionaría</a>
              <a href="#precios">Oferta comercial</a>
            </div>
            <div className="footer-column">
              <h3>Pawly</h3>
              <a href="#nosotros">Nosotros</a>
              <a href="#soluciones">Para quiénes</a>
              <a href="#preguntas">Preguntas frecuentes</a>
              <a href="#contacto">Contacto</a>
            </div>
            <div className="footer-column">
              <h3>Tu próximo paso</h3>
              <a href="#contacto">
                Preparar solicitud de demo <ArrowUpRight size={14} />
              </a>
              <Link href="/iniciar-sesion">Acceso próximamente</Link>
              <span className="footer-stage">Producto en desarrollo</span>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getUTCFullYear()} Pawly.</span>
            <span>Hecho con foco en la práctica veterinaria en Chile.</span>
            <a href="#inicio">
              Volver arriba <ChevronDown size={14} className="rotate-180" />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
