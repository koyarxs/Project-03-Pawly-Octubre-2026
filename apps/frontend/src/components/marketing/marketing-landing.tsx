import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  Check,
  ClipboardPlus,
  FileHeart,
  Heart,
  MapPin,
  PawPrint,
  Plus,
  Stethoscope,
  UsersRound,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { HeroEntrance } from "@/components/hero-entrance";
import { MarketingHeader } from "./marketing-header";
import { ProductTour } from "./product-tour";
import styles from "./marketing.module.css";

const features = [
  {
    number: "01",
    icon: CalendarDays,
    title: "Una agenda con perspectiva.",
    text: "Organiza el día o la semana, asigna profesionales y reprograma citas. Detecta cruces de horario cuando hay un profesional asignado.",
    tags: ["Vista diaria y semanal", "Estados y filtros"],
  },
  {
    number: "02",
    icon: PawPrint,
    title: "Cada paciente, bien conectado.",
    text: "Mantén sus datos y los de sus tutores relacionados. Encuentra su ficha y consulta la información de contacto en un mismo espacio.",
    tags: ["Pacientes", "Tutores"],
  },
  {
    number: "03",
    icon: Stethoscope,
    title: "La consulta, con todo su contexto.",
    text: "Registra antecedentes, examen, diagnóstico, tratamiento e indicaciones. Inicia la atención desde una cita o sin una reserva previa.",
    tags: ["Borradores editables", "Atención sin cita"],
  },
  {
    number: "04",
    icon: FileHeart,
    title: "Una historia que continúa.",
    text: "Revisa las atenciones anteriores de cada paciente. Al finalizar una consulta, conserva el original y añade rectificaciones con autoría y fecha.",
    tags: ["Historia cronológica", "Trazabilidad"],
  },
] as const;

const capabilities = [
  { icon: CalendarDays, label: "Agenda" },
  { icon: UsersRound, label: "Pacientes y tutores" },
  { icon: Stethoscope, label: "Consultas" },
  { icon: FileHeart, label: "Historia clínica" },
] as const;

const faqs = [
  [
    "¿Qué puedo gestionar actualmente con Pawly?",
    "Puedes gestionar clínicas, tutores, pacientes, citas y consultas con historia clínica. Vacunación, inventario, reportes y facturación corresponden a etapas futuras del producto.",
  ],
  [
    "¿Ya puedo registrar mi clínica?",
    "Pawly sigue en desarrollo. El registro y el acceso están habilitados en el entorno local de desarrollo; el lanzamiento comercial y la apertura del registro público en producción siguen en preparación.",
  ],
  [
    "¿Puedo registrar una consulta sin una cita previa?",
    "Sí. Puedes iniciar una consulta desde el módulo Consultas o desde la ficha del paciente, sin vincularla a una cita. El paciente debe estar registrado en la clínica.",
  ],
  [
    "¿Cada clínica tiene su propio espacio?",
    "Sí. Los registros pertenecen a una clínica y el acceso requiere una membresía activa. Los permisos de cada rol determinan qué información y acciones están disponibles.",
  ],
  [
    "¿Qué pasa si necesito corregir una consulta finalizada?",
    "La consulta finalizada conserva su contenido original. Puedes añadir una rectificación con el motivo, la corrección, la autoría y la fecha, manteniendo el historial de la atención.",
  ],
  [
    "¿Puedo usar Pawly desde mi celular?",
    "Pawly es una aplicación web con una interfaz que se adapta a escritorio, tablet y celular. Por ahora no existe una aplicación móvil independiente.",
  ],
  [
    "¿Cuánto cuesta Pawly?",
    "Los planes, precios y condiciones comerciales están en preparación. La contratación de suscripciones y los pagos todavía no están habilitados.",
  ],
] as const;

function SignupLink({
  children = "Registrar mi clínica",
  light = false,
}: {
  children?: React.ReactNode;
  light?: boolean;
}) {
  return (
    <Link
      className={`${styles.primaryButton}${light ? ` ${styles.lightButton}` : ""}`}
      href="/registrarse"
    >
      {children}
      <ArrowUpRight size={19} aria-hidden="true" />
    </Link>
  );
}

function FeatureGraphic({ number }: { number: string }) {
  if (number === "01") {
    return (
      <div className={styles.scheduleDiagram} aria-hidden="true">
        <div className={styles.diagramHeading}>
          <CalendarDays size={17} />
          <span>Un lugar para cada atención</span>
          <span className={styles.diagramDot} />
        </div>
        <div className={styles.diagramDays}>
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className={styles.diagramAppointments}>
          <span>Programada</span>
          <span>Confirmada</span>
          <span>En atención</span>
        </div>
      </div>
    );
  }
  if (number === "02") {
    return (
      <figure className={styles.featurePhoto}>
        <Image
          src="/images/landing-cat-care.webp"
          alt="Un gato blanco recibe atención cuidadosa durante una revisión veterinaria."
          fill
          sizes="(max-width: 767px) calc(100vw - 80px), (max-width: 1199px) 40vw, 450px"
        />
        <figcaption>
          <PawPrint size={15} aria-hidden="true" /> El paciente, siempre al
          centro.
        </figcaption>
      </figure>
    );
  }
  if (number === "03") {
    return (
      <div className={styles.recordDiagram} aria-hidden="true">
        <span className={styles.recordSymbol}>
          <ClipboardPlus size={26} strokeWidth={1.5} />
        </span>
        <div>
          <span>La atención, bien documentada</span>
          <div className={styles.recordLines}>
            <span>Antecedentes</span>
            <span>Examen y diagnóstico</span>
            <span>Tratamiento e indicaciones</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={styles.historyDiagram} aria-hidden="true">
      {[
        {
          icon: Stethoscope,
          title: "Consulta",
          text: "El contexto de la atención",
        },
        {
          icon: FileHeart,
          title: "Registro finalizado",
          text: "El original se conserva",
        },
        {
          icon: ClipboardPlus,
          title: "Rectificación",
          text: "Una aclaración con autoría",
        },
      ].map(({ icon: Icon, title, text }) => (
        <div key={String(title)}>
          <span>
            <Icon size={18} strokeWidth={1.6} />
          </span>
          <div>
            <strong>{title}</strong>
            <span>{text}</span>
          </div>
          <Check size={15} />
        </div>
      ))}
    </div>
  );
}

export function MarketingLanding() {
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#contenido">
        Saltar al contenido
      </a>
      <MarketingHeader />
      <main id="contenido" tabIndex={-1}>
        <section
          id="inicio"
          className={styles.hero}
          aria-labelledby="hero-title"
        >
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>
                <span className={styles.liveDot} /> TU CLÍNICA. UN MISMO
                ESPACIO.
              </span>
              <h1 id="hero-title">
                Más tiempo
                <br />
                para <em>cuidar.</em>
              </h1>
              <p className={styles.heroDescription}>
                Conecta pacientes, tutores, agenda e historia clínica. Una
                experiencia más clara para quienes cuidan.
              </p>
              <div className={styles.heroActions}>
                <SignupLink />
                <a className={styles.secondaryLink} href="#plataforma">
                  Conocer Pawly <ArrowDown size={18} aria-hidden="true" />
                </a>
              </div>
              <span className={styles.developmentNote}>
                Versión en desarrollo · Lanzamiento comercial en preparación
              </span>
              <ul className={styles.heroFacts}>
                {[
                  "Agenda diaria y semanal",
                  "Historia por paciente",
                  "Accesos por clínica",
                ].map((fact) => (
                  <li key={fact}>
                    <Check size={14} aria-hidden="true" />
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          id="plataforma"
          className={`${styles.section} ${styles.productSection}`}
          aria-labelledby="product-title"
          tabIndex={-1}
        >
          <div className={styles.container}>
            <div className={styles.productHeading}>
              <h2 id="product-title">
                Tu jornada, con <em>perspectiva.</em>
              </h2>
              <p>De la primera cita a la historia de cada paciente.</p>
            </div>
            <ProductTour />
          </div>
        </section>

        <div className={styles.capabilitiesBand}>
          <div className={`${styles.container} ${styles.capabilitiesInner}`}>
            <p>
              Lo esencial de tu clínica.
              <br />
              <strong>En un mismo lugar.</strong>
            </p>
            <ul>
              {capabilities.map(({ icon: Icon, label }) => (
                <li key={label}>
                  <Icon size={21} strokeWidth={1.5} aria-hidden="true" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <section
          id="funcionalidades"
          className={`${styles.section} ${styles.featuresSection}`}
          aria-labelledby="features-title"
          tabIndex={-1}
        >
          <div className={styles.container}>
            <div className={styles.splitHeading}>
              <div>
                <span className={styles.eyebrow}>
                  MENOS INFORMACIÓN DISPERSA
                </span>
                <h2 id="features-title">
                  Cada parte del cuidado.
                  <br />
                  <em>Mejor conectada.</em>
                </h2>
              </div>
              <p>
                Cada módulo acompaña una parte de la atención. Juntos, reúnen la
                información que necesitas para continuar con el cuidado.
              </p>
            </div>
            <HeroEntrance className={styles.featureGrid}>
              {features.map(({ number, icon: Icon, title, text, tags }) => (
                <article key={number} className={styles.feature}>
                  <div className={styles.featureTop}>
                    <span className={styles.featureIcon}>
                      <Icon size={26} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <span className={styles.featureNumber}>{number} /</span>
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <ul>
                    {tags.map((tag) => (
                      <li key={tag}>
                        <Check size={14} aria-hidden="true" />
                        {tag}
                      </li>
                    ))}
                  </ul>
                  <FeatureGraphic number={number} />
                </article>
              ))}
            </HeroEntrance>
            <div className={styles.clinicNote}>
              <Building2 size={24} strokeWidth={1.5} aria-hidden="true" />
              <div>
                <h3>Una clínica, su propio espacio.</h3>
                <p>
                  Accede a cada clínica con una membresía activa y permisos
                  según tu rol.
                </p>
              </div>
              <span>Gestión multi-clínica</span>
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className={styles.careSection}
          aria-labelledby="care-title"
          tabIndex={-1}
        >
          <div className={`${styles.container} ${styles.careGrid}`}>
            <figure className={styles.carePhoto}>
              <Image
                src="/images/landing-clinical-care.webp"
                alt="Un profesional veterinario acompaña a un perro negro en una sala de atención."
                fill
                sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1399px) 44vw, 550px"
              />
              <figcaption>
                <Heart size={17} aria-hidden="true" /> Cada visita es parte de
                una historia.
              </figcaption>
            </figure>
            <div className={styles.careCopy}>
              <span className={styles.eyebrow}>
                DE LA CITA A LA HISTORIA CLÍNICA
              </span>
              <h2 id="care-title">
                El cuidado sigue.
                <br />
                <em>El contexto también.</em>
              </h2>
              <p className={styles.careIntro}>
                Un recorrido conectado para acompañar cada atención, paso a
                paso.
              </p>
              <ol className={styles.careSteps}>
                {[
                  [
                    "Organiza la cita",
                    "Elige al paciente, su tutor, el horario y un profesional cuando corresponda.",
                  ],
                  [
                    "Registra la atención",
                    "Documenta la consulta y sus indicaciones, desde una cita o sin reserva previa.",
                  ],
                  [
                    "Continúa con su historia",
                    "Revisa las atenciones anteriores y conserva el contexto para la próxima visita.",
                  ],
                ].map(([title, text], index) => (
                  <li key={title}>
                    <span>0{index + 1}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <a className={styles.secondaryLink} href="#plataforma">
                Ver las pantallas de Pawly{" "}
                <ArrowRight size={18} aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>

        <section
          id="nosotros"
          className={`${styles.section} ${styles.aboutSection}`}
          aria-labelledby="about-title"
          tabIndex={-1}
        >
          <div className={`${styles.container} ${styles.aboutGrid}`}>
            <div className={styles.aboutCopy}>
              <span className={styles.eyebrow}>HECHO CON UNA IDEA CLARA</span>
              <h2 id="about-title">
                Detrás de cada paciente,
                <br />
                <em>hay personas que cuidan.</em>
              </h2>
              <p>
                Por eso estamos creando Pawly: para que la información acompañe
                el trabajo de clínicas y profesionales veterinarios en Chile.
              </p>
              <p>
                Una plataforma que sigue creciendo con la práctica, las
                preguntas y la retroalimentación de quienes la usan.
              </p>
              <span className={styles.location}>
                <MapPin size={16} aria-hidden="true" /> Pensado para la práctica
                veterinaria en Chile.
              </span>
            </div>
            <figure className={styles.teamPhoto}>
              <Image
                src="/images/landing-team-care.webp"
                alt="Dos personas atienden a un perro en una clínica veterinaria."
                fill
                sizes="(max-width: 767px) calc(100vw - 40px), 40vw"
              />
              <figcaption>
                La práctica veterinaria inspira lo que construimos.
              </figcaption>
            </figure>
          </div>
        </section>

        <section
          id="preguntas"
          className={`${styles.section} ${styles.faqSection}`}
          aria-labelledby="faq-title"
          tabIndex={-1}
        >
          <div className={`${styles.container} ${styles.faqGrid}`}>
            <div className={styles.faqHeading}>
              <span className={styles.eyebrow}>ANTES DE COMENZAR</span>
              <h2 id="faq-title">
                Todo claro.
                <br />
                <em>Desde el principio.</em>
              </h2>
              <p>Las respuestas para conocer Pawly y su etapa actual.</p>
              <a className={styles.secondaryLink} href="#comenzar">
                Conoce el siguiente paso{" "}
                <ArrowDown size={17} aria-hidden="true" />
              </a>
            </div>
            <div className={styles.faqList}>
              {faqs.map(([question, answer]) => (
                <details className={styles.faqItem} key={question}>
                  <summary>
                    <span>{question}</span>
                    <Plus size={19} aria-hidden="true" />
                  </summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          id="comenzar"
          className={styles.startSection}
          aria-labelledby="start-title"
          tabIndex={-1}
        >
          <div className={`${styles.container} ${styles.startInner}`}>
            <span className={styles.startIcon}>
              <ClipboardPlus size={29} strokeWidth={1.4} aria-hidden="true" />
            </span>
            <span className={styles.eyebrow}>TU PRÓXIMO PASO, CON PAWLY</span>
            <h2 id="start-title">
              Dale un lugar
              <br />a <em>cada historia.</em>
            </h2>
            <p>
              Un espacio para organizar tu clínica.
              <br />
              Más contexto para acompañar a cada paciente.
            </p>
            <div className={styles.startActions}>
              <SignupLink light />
              <Link className={styles.startLogin} href="/iniciar-sesion">
                Ya tengo una cuenta <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
            <span className={styles.startNote}>
              Versión en desarrollo · Planes y contratación comercial en
              preparación.
            </span>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <div className={`${styles.container} ${styles.footerGrid}`}>
          <div className={styles.footerBrand}>
            <Brand />
            <p>
              Menos gestión.
              <br />
              Más tiempo para cuidar.
            </p>
          </div>
          <nav aria-label="Producto">
            <h2>Producto</h2>
            <a href="#plataforma">La plataforma</a>
            <a href="#funcionalidades">Funcionalidades</a>
            <a href="#como-funciona">Cómo funciona</a>
          </nav>
          <nav aria-label="Conoce Pawly">
            <h2>Conoce Pawly</h2>
            <a href="#nosotros">Nuestra visión</a>
            <a href="#preguntas">Preguntas frecuentes</a>
            <a href="#comenzar">Comenzar</a>
          </nav>
          <nav aria-label="Tu cuenta">
            <h2>Tu cuenta</h2>
            <Link href="/registrarse">
              Registrar mi clínica <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <Link href="/iniciar-sesion">
              Iniciar sesión <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <span className={styles.footerStage}>Producto en desarrollo</span>
          </nav>
        </div>
        <div className={`${styles.container} ${styles.footerBottom}`}>
          <span>© {new Date().getFullYear()} Pawly.</span>
          <span>Creado para conectar la gestión y el cuidado veterinario.</span>
          <a href="#inicio">
            Volver arriba <ArrowUpRight size={14} aria-hidden="true" />
          </a>
        </div>
      </footer>
    </div>
  );
}
