import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, ArrowUp, CalendarDays, Check,
  Download, HeartHandshake, Layers3, MapPin, MessageCircle,
  PawPrint, Plus, Stethoscope,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { DemoRequest } from "@/components/demo-request";
import { FeatureBento } from "@/components/feature-bento";
import { HeroEntrance } from "@/components/hero-entrance";
import { LandingShortcuts } from "@/components/landing-shortcuts";
import { PracticeSolutions } from "@/components/practice-solutions";
import { ProductPreview, WorkflowVisual } from "@/components/product-preview";
import "@/app/landing-continuation.css";
import "@/app/redsalud-adaptations.css";

const faqs = [
  ["¿Pawly ya está disponible para mi clínica?", "Pawly está en desarrollo. Esta demostración presenta la visión del producto; los módulos todavía no están disponibles para uso clínico. Comunicaremos la disponibilidad cuando esté definida."],
  ["¿La vista del dashboard muestra datos reales?", "No. Los pacientes, citas, nombres y cifras son ficticios. Puedes explorar Dashboard, Agenda, Pacientes y Ficha clínica sin crear ni modificar registros reales."],
  ["¿Qué funcionalidades están planificadas?", "La propuesta contempla pacientes, tutores, agenda, fichas clínicas, vacunación e inventario. El alcance y el orden de lanzamiento se definirán durante el desarrollo."],
  ["¿Cuánto costará Pawly?", "La oferta comercial está en definición. Aún no hay precios, planes ni condiciones de contratación aprobados. Compartiremos esa información antes de habilitar contrataciones."],
  ["¿Podré importar los datos que ya tengo?", "La importación de datos y sus formatos deben evaluarse. Todavía no existe una herramienta de migración disponible. Conocer cómo mantienes tus registros ayudará a definir este proceso."],
  ["¿Cómo puedo solicitar una demostración?", "Puedes preparar y descargar tu solicitud en Contacto. Por ahora no se envía ni queda registrada: el canal de recepción todavía no está habilitado. No se te asignará una cita automáticamente."],
] as const;

const steps = [
  { icon: CalendarDays, title: "Prepara la jornada", detail: "Una cita vinculada al paciente y su tutor, con el contexto listo para atender." },
  { icon: Stethoscope, title: "Registra lo que importa", detail: "Antecedentes, hallazgos e indicaciones que pasan a ser parte de una misma historia." },
  { icon: HeartHandshake, title: "Acompaña el próximo paso", detail: "Seguimientos y controles a la vista para dar continuidad más allá de la consulta." },
] as const;

export function LandingSections() {
  return (
    <div className="landing-continuation">
      <LandingShortcuts />
      <section id="demostracion" className="section section-anchor demo-section lower-demo" aria-labelledby="demo-title">
        <div className="container">
          <HeroEntrance className="lower-heading lower-heading-centered">
            <span className="eyebrow">EL PRODUCTO, EN PERSPECTIVA</span>
            <h2 id="demo-title">Una vista más clara.<br /><em>Un día mejor conectado.</em></h2>
            <p>Del resumen de tu jornada a la historia de cada paciente.<br className="desktop-break" /> Explora cómo imaginamos el espacio de trabajo de tu clínica.</p>
          </HeroEntrance>
          <HeroEntrance className="lower-demo-frame" delay={0.08}>
            <div className="lower-demo-caption"><span><span className="status-dot" /> ESPACIO DE TRABAJO PAWLY</span><span>Demostración interactiva</span></div>
            <div className="demo-stage"><ProductPreview /></div>
          </HeroEntrance>
          <div className="lower-demo-footnote"><span><Layers3 size={15} aria-hidden="true" /> Cuatro vistas, un mismo contexto</span><p>Demostración conceptual · Datos ficticios · Funcionalidades planificadas</p></div>
        </div>
      </section>

      <section id="funcionalidades" className="section section-anchor features-section lower-features" aria-labelledby="features-title">
        <div className="container">
          <HeroEntrance className="lower-heading lower-heading-catalog">
            <div><span className="eyebrow">CONECTAR LO ESENCIAL</span><h2 id="features-title">Cada parte de tu clínica.<br /><em>En una misma historia.</em></h2></div>
            <div><p>Seis módulos pensados para reunir lo que hoy vive entre agendas, fichas y mensajes.</p><span className="lower-status"><span className="status-dot" /> Módulos en desarrollo</span></div>
          </HeroEntrance>
          <HeroEntrance className="lower-modules" delay={0.08}><FeatureBento /></HeroEntrance>
        </div>
      </section>

      <section id="como-funciona" className="section section-anchor workflow-section lower-workflow" aria-labelledby="workflow-title">
        <div className="container lower-workflow-layout">
          <HeroEntrance className="lower-workflow-copy">
            <span className="eyebrow">DEL PRIMER CONTACTO AL SEGUIMIENTO</span>
            <h2 id="workflow-title">El cuidado avanza.<br /><em>El contexto lo acompaña.</em></h2>
            <p className="lower-intro">Un recorrido pensado para que cada atención aporte a la siguiente.</p>
            <ol className="lower-workflow-steps">
              {steps.map(({ icon: Icon, title, detail }, index) => <li key={title}><span className="lower-step-icon"><Icon size={22} strokeWidth={1.6} aria-hidden="true" /><small>0{index + 1}</small></span><div><h3>{title}</h3><p>{detail}</p></div></li>)}
            </ol>
            <a className="lower-text-link" href="#demostracion">Ver el recorrido en la demo <ArrowRight size={17} aria-hidden="true" /></a>
          </HeroEntrance>
          <HeroEntrance className="lower-workflow-scene" delay={0.08}>
            <figure className="lower-workflow-photo"><Image src="/images/landing-clinical-care.webp" alt="Un veterinario acompaña a un perro durante su atención en una clínica." fill sizes="(max-width: 899px) 100vw, 45vw" /><figcaption><Stethoscope size={16} aria-hidden="true" /> El paciente, siempre al centro.</figcaption></figure>
            <WorkflowVisual />
            <small className="lower-photo-note">Fotografía referencial · Recorrido conceptual con datos ficticios</small>
          </HeroEntrance>
        </div>
      </section>

      <PracticeSolutions />

      <section id="nosotros" className="section section-anchor about-section lower-about" aria-labelledby="about-title">
        <div className="container lower-about-layout">
          <HeroEntrance className="lower-about-scene">
            <figure className="lower-about-photo"><Image src="/images/landing-cat-care.webp" alt="Un gato blanco recibe atención cuidadosa de un profesional veterinario y su acompañante." fill sizes="(max-width: 899px) 100vw, 45vw" /><figcaption>La práctica veterinaria inspira lo que estamos construyendo.</figcaption></figure>
            <span className="lower-about-stamp"><HeartHandshake size={23} strokeWidth={1.6} aria-hidden="true" /><span>Diseñar desde<br /><strong>el cuidado.</strong></span></span>
          </HeroEntrance>
          <HeroEntrance className="lower-about-copy" delay={0.08}>
            <span className="eyebrow">POR QUÉ PAWLY</span>
            <h2 id="about-title">La tecnología detrás.<br /><em>El cuidado al centro.</em></h2>
            <p className="lower-about-lead">Un buen sistema debe acompañar la práctica veterinaria, sin interrumpirla.</p>
            <p>Estamos construyendo Pawly para acercar la operación al cuidado. Queremos entender las necesidades de clínicas y profesionales en Chile y dar forma a una experiencia útil, clara y cercana.</p>
            <div className="lower-values"><div><HeartHandshake size={21} aria-hidden="true" /><h3>Desde la práctica</h3><p>Escuchar antes de construir.</p></div><div><Layers3 size={21} aria-hidden="true" /><h3>Con claridad</h3><p>Lo importante, fácil de encontrar.</p></div></div>
            <span className="lower-status"><MapPin size={14} aria-hidden="true" /> Pensado para la práctica veterinaria en Chile</span>
          </HeroEntrance>
        </div>
      </section>

      <section id="precios" className="section section-anchor pricing-section lower-pricing" aria-labelledby="pricing-title">
        <div className="container pricing-grid">
          <HeroEntrance className="lower-pricing-copy"><span className="eyebrow">UNA PROPUESTA QUE ESTÁ TOMANDO FORMA</span><h2 id="pricing-title">Primero, entender<br /><em>lo que necesitas.</em></h2><p className="lower-intro">Cada práctica tiene su propio ritmo. La oferta comercial se definirá junto al alcance del producto, con información clara para que puedas evaluar Pawly.</p><a className="lower-text-link" href="#contacto">Cuéntanos sobre tu clínica <ArrowRight size={17} aria-hidden="true" /></a></HeroEntrance>
          <HeroEntrance className="pricing-panel" delay={0.08}>
            <div className="lower-pricing-top"><span className="lower-pricing-icon"><PawPrint size={25} aria-hidden="true" /></span><span className="lower-status"><span className="status-dot" /> En desarrollo</span></div>
            <h3>Pawly para tu práctica</h3><p>Pacientes, agenda y operación conectados alrededor de una misma historia.</p>
            <div className="pricing-status"><span>Planes y precios</span><strong>Por definir</strong></div>
            <ul><li><Check size={17} aria-hidden="true" /> Alcance y módulos en desarrollo</li><li><Check size={17} aria-hidden="true" /> Oferta comercial aún no disponible</li><li><Check size={17} aria-hidden="true" /> Disponibilidad por comunicar</li></ul>
            <Button asChild className="w-full" size="lg"><a href="#contacto">Me interesa conocer Pawly <ArrowUpRight size={18} aria-hidden="true" /></a></Button>
            <small className="lower-pricing-note">Sin contratación ni pagos habilitados por ahora.</small>
          </HeroEntrance>
        </div>
      </section>

      <section id="preguntas" className="section section-anchor faq-section lower-faq" aria-labelledby="faq-title">
        <div className="container faq-grid">
          <HeroEntrance className="lower-faq-copy"><span className="lower-faq-icon"><MessageCircle size={26} strokeWidth={1.6} aria-hidden="true" /></span><span className="eyebrow">HABLEMOS CON CLARIDAD</span><h2 id="faq-title">Buenas preguntas.<br /><em>Respuestas honestas.</em></h2><p className="lower-intro">Lo que puedes esperar de Pawly en esta etapa.</p><a className="lower-text-link" href="#contacto">Cuéntanos tu pregunta <ArrowUpRight size={17} aria-hidden="true" /></a></HeroEntrance>
          <HeroEntrance className="faq-list" delay={0.08}>{faqs.map(([question, answer], index) => <details key={question} className="faq-item" open={index === 0}><summary><span>{question}</span><span className="lower-faq-toggle" aria-hidden="true"><Plus size={18} /></span></summary><p>{answer}</p></details>)}</HeroEntrance>
        </div>
      </section>

      <section id="contacto" className="section section-anchor contact-section lower-contact" aria-labelledby="contact-title">
        <div className="container contact-grid">
          <HeroEntrance className="contact-copy">
            <span className="eyebrow light-eyebrow">LA PRÓXIMA CONVERSACIÓN</span><h2 id="contact-title">Hagamos espacio<br />para <span>más cuidado.</span></h2>
            <p>Cuéntanos cómo trabajas y qué te gustaría ordenar. Tu contexto es el punto de partida para imaginar una mejor forma de gestionar tu clínica.</p>
            <div className="lower-contact-photo"><Image src="/images/landing-clinical-care.webp" alt="Atención veterinaria de un perro en una clínica, fotografía referencial." fill sizes="(max-width: 899px) 100vw, 42vw" /><span><HeartHandshake size={20} aria-hidden="true" /><strong>Una demo empieza<br />por tu contexto.</strong></span></div>
            <div className="lower-contact-note"><Download size={19} aria-hidden="true" /><p>Por ahora, prepara y descarga tu solicitud. El canal de envío todavía está en preparación.</p></div>
            <span className="contact-status"><span className="status-dot" /> Producto en desarrollo · Disponibilidad por definir</span>
          </HeroEntrance>
          <HeroEntrance className="lower-form-entrance" delay={0.08}><DemoRequest /></HeroEntrance>
        </div>
      </section>
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer className="site-footer lower-footer">
      <div className="container">
        <div className="lower-footer-top"><Brand inverse /><p>Menos gestión.<br /><span>Más cuidado.</span></p><a href="#contacto" className="lower-footer-action">Conozcamos tu práctica <ArrowUpRight size={19} aria-hidden="true" /></a></div>
        <div className="footer-main">
          <div className="footer-brand"><p>Un espacio pensado para conectar<br />la gestión con el cuidado veterinario.</p><span><MapPin size={13} aria-hidden="true" /> Diseñado con foco en Chile</span><span className="footer-stage"><span className="status-dot" /> Producto en desarrollo</span></div>
          <nav className="footer-column" aria-label="La plataforma"><h3>La plataforma</h3><a href="#demostracion">Explorar la demostración</a><a href="#funcionalidades">Módulos planificados</a><a href="#como-funciona">El recorrido de atención</a><a href="#precios">Oferta comercial</a></nav>
          <nav className="footer-column" aria-label="Sobre Pawly"><h3>Pawly</h3><a href="#nosotros">Por qué Pawly</a><a href="#soluciones">Para tu práctica</a><a href="#preguntas">Preguntas frecuentes</a><a href="#contacto">Contacto</a></nav>
          <nav className="footer-column" aria-label="Próximos pasos"><h3>Sigamos conversando</h3><a href="#contacto">Preparar solicitud de demo <ArrowUpRight size={14} aria-hidden="true" /></a><Link href="/iniciar-sesion">Acceso próximamente</Link><span className="lower-footer-small">Disponibilidad y condiciones<br />por definir.</span></nav>
        </div>
        <div className="footer-bottom"><span>© {new Date().getUTCFullYear()} Pawly.</span><span>Hecho con foco en la práctica veterinaria en Chile.</span><a href="#inicio">Volver arriba <ArrowUp size={15} aria-hidden="true" /></a></div>
      </div>
    </footer>
  );
}
