"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  CalendarDays,
  Check,
  ClipboardList,
  LayoutDashboard,
  PawPrint,
  Stethoscope,
  Users,
} from "lucide-react";
import { PawlyMark } from "@/components/brand";

const views = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "pacientes", label: "Pacientes", icon: PawPrint },
  { id: "ficha", label: "Ficha clínica", icon: ClipboardList },
] as const;
type View = (typeof views)[number]["id"];

const patients = [
  {
    name: "Luna",
    initials: "LU",
    detail: "Canina · 4 años",
    tutor: "Valentina A.",
    color: "mint",
    time: "09:00",
    reason: "Control preventivo",
    status: "Confirmada",
  },
  {
    name: "Simón",
    initials: "SI",
    detail: "Felino · 2 años",
    tutor: "Diego M.",
    color: "amber",
    time: "09:30",
    reason: "Consulta general",
    status: "En espera",
  },
  {
    name: "Milo",
    initials: "MI",
    detail: "Canino · 6 años",
    tutor: "Camila R.",
    color: "blue",
    time: "10:15",
    reason: "Seguimiento clínico",
    status: "Confirmada",
  },
] as const;

function DemoMetrics({ compact = false }: { compact?: boolean }) {
  return (
    <div className="demo-metrics">
      {(
        [
          ["Citas del día", "08", CalendarDays],
          ["Pacientes", "124", PawPrint],
          ["Por revisar", "03", ClipboardList],
        ] as const
      ).map(([label, value, Icon]) => {
        return (
          <div key={label}>
            <span>{label}</span>
            <strong>
              {value}
              <Icon size={compact ? 14 : 17} />
            </strong>
            {!compact && <small>Datos de ejemplo</small>}
          </div>
        );
      })}
    </div>
  );
}

function AppointmentRows({ compact = false }: { compact?: boolean }) {
  return (
    <div className="demo-appointments">
      {patients.slice(0, compact ? 2 : 3).map((patient) => (
        <div className="demo-appointment" key={patient.name}>
          <span className="demo-time">{patient.time}</span>
          <span className={`patient-avatar avatar-${patient.color}`}>
            {patient.initials}
          </span>
          <div>
            <strong>{patient.name}</strong>
            <small>{patient.reason}</small>
          </div>
          <span
            className={
              patient.status === "En espera"
                ? "demo-status demo-status-waiting"
                : "demo-status"
            }
          >
            {patient.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function DashboardView() {
  return (
    <>
      <DemoMetrics />
      <div className="dashboard-columns">
        <figure className="demo-chart">
          <figcaption>
            <strong>La semana, en perspectiva</strong>
            <span>Atenciones ficticias</span>
          </figcaption>
          <div
            className="chart-bars"
            role="img"
            aria-label="Atenciones ficticias: lunes 4, martes 6, miércoles 8, jueves 5 y viernes 7."
          >
            {[4, 6, 8, 5, 7].map((value, index) => (
              <div key={index}>
                <span
                  className={index === 2 ? "bar-highlight" : ""}
                  style={{ height: `${value * 12}px` }}
                >
                  <span>{value}</span>
                </span>
                <small>{["Lun", "Mar", "Mié", "Jue", "Vie"][index]}</small>
              </div>
            ))}
          </div>
        </figure>
        <div className="demo-followups">
          <span className="demo-panel-label">A LA VISTA</span>
          <h4>El próximo paso.</h4>
          <div>
            <span className="followup-icon">
              <ClipboardList size={16} />
            </span>
            <span>
              <strong>Luna</strong>
              <small>Revisar registro de control</small>
            </span>
          </div>
          <div>
            <span className="followup-icon">
              <PawPrint size={16} />
            </span>
            <span>
              <strong>Milo</strong>
              <small>Preparar seguimiento</small>
            </span>
          </div>
          <p>Ejemplos de tareas, sin registros reales.</p>
        </div>
      </div>
      <div className="demo-list-header">
        <strong>Próximas atenciones</strong>
        <span>Agenda de ejemplo</span>
      </div>
      <AppointmentRows />
    </>
  );
}

function AgendaView() {
  return (
    <>
      <div className="agenda-heading">
        <div>
          <span className="demo-panel-label">MIÉRCOLES</span>
          <h4>14 de octubre</h4>
        </div>
        <span className="demo-small-badge">Jornada de ejemplo</span>
      </div>
      <div className="agenda-days">
        {["Lun", "Mar", "Mié", "Jue", "Vie"].map((day, i) => (
          <span key={day} className={i === 2 ? "agenda-selected" : ""}>
            <small>{day}</small>
            <strong>{12 + i}</strong>
          </span>
        ))}
      </div>
      <div className="demo-list-header">
        <strong>Atenciones de la mañana</strong>
        <span>Consulta 01</span>
      </div>
      <AppointmentRows />
      <div className="agenda-context">
        <Check size={16} />
        <p>
          Cada cita, junto a su paciente y el motivo de atención.
          <br />
          <span>Así imaginamos una jornada con contexto.</span>
        </p>
      </div>
    </>
  );
}

function PatientsView() {
  return (
    <>
      <div className="demo-list-header">
        <strong>Pacientes de ejemplo</strong>
        <span>3 registros ficticios</span>
      </div>
      <div className="demo-patient-grid">
        {patients.map((patient, index) => (
          <article key={patient.name}>
            <div className="demo-patient-top">
              <span className={`patient-avatar avatar-${patient.color}`}>
                {patient.initials}
              </span>
              <span>#{String(index + 1).padStart(3, "0")}</span>
            </div>
            <h4>{patient.name}</h4>
            <p>{patient.detail}</p>
            <div className="demo-patient-tutor">
              <Users size={15} />
              <div>
                <small>Tutor/a ficticio/a</small>
                <strong>{patient.tutor}</strong>
              </div>
            </div>
            <span className="demo-patient-footer">
              Antecedentes · Atenciones · Seguimiento
            </span>
          </article>
        ))}
      </div>
      <div className="agenda-context">
        <PawPrint size={17} />
        <p>
          Una identidad para cada historia.
          <br />
          <span>Los registros de esta vista son solo demostrativos.</span>
        </p>
      </div>
    </>
  );
}

function ClinicalView() {
  return (
    <>
      <div className="clinical-demo-patient">
        <span className="patient-avatar avatar-mint">LU</span>
        <div>
          <h4>
            Luna <span>#P-001</span>
          </h4>
          <p>Canina · 4 años · Tutora ficticia: Valentina A.</p>
        </div>
        <span className="demo-small-badge">Paciente de ejemplo</span>
      </div>
      <div className="clinical-demo-grid">
        <div className="clinical-demo-note">
          <span className="demo-panel-label">ATENCIÓN · 14 OCTUBRE</span>
          <h4>Control preventivo</h4>
          <dl>
            <div>
              <dt>Motivo de consulta</dt>
              <dd>Ejemplo de visita de control.</dd>
            </div>
            <div>
              <dt>Antecedentes</dt>
              <dd>Espacio conceptual para reunir la historia del paciente.</dd>
            </div>
            <div>
              <dt>Registro de atención</dt>
              <dd>
                Ejemplo de cómo se organizarían hallazgos e indicaciones. Sin
                contenido clínico real.
              </dd>
            </div>
          </dl>
        </div>
        <aside className="clinical-demo-history">
          <span className="demo-panel-label">HISTORIAL ILUSTRATIVO</span>
          <div>
            <span className="timeline-point" />
            <span>
              <strong>14 oct.</strong>
              <small>Control de ejemplo</small>
            </span>
          </div>
          <div>
            <span className="timeline-point" />
            <span>
              <strong>20 sept.</strong>
              <small>Consulta de ejemplo</small>
            </span>
          </div>
          <div className="clinical-vaccination">
            <Stethoscope size={18} />
            <strong>Continuidad del cuidado</strong>
            <p>Antecedentes, vacunas y próximos controles en perspectiva.</p>
          </div>
        </aside>
      </div>
    </>
  );
}

export function ProductPreview({ compact = false }: { compact?: boolean }) {
  const [view, setView] = useState<View>("dashboard");
  const id = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const reduced = useReducedMotion();
  function navigateTabs(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % views.length;
    else if (event.key === "ArrowLeft")
      next = (index + views.length - 1) % views.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = views.length - 1;
    else return;
    event.preventDefault();
    setView(views[next].id);
    tabRefs.current[next]?.focus();
  }
  if (compact)
    return (
      <div className="product-window compact-workspace">
        <div className="window-bar">
          <span className="window-mark">
            <PawlyMark /> Pawly Workspace
          </span>
          <span className="demo-label">Demostración conceptual</span>
        </div>
        <div className="compact-main">
          <div className="compact-heading">
            <span>MIÉ. 14 OCTUBRE</span>
            <strong>Una jornada más clara.</strong>
          </div>
          <DemoMetrics compact />
          <div className="compact-agenda-label">
            <CalendarDays size={13} /> Próximas atenciones
          </div>
          <AppointmentRows compact />
          <p className="compact-disclaimer">
            Demostración conceptual · Datos ficticios
          </p>
        </div>
      </div>
    );
  const title = views.find((item) => item.id === view)!.label;
  return (
    <div className="product-window showcase-workspace">
      <div className="window-bar">
        <span className="window-mark">
          <PawlyMark /> Pawly Workspace
        </span>
        <span className="demo-label">Demostración conceptual</span>
      </div>
      <div className="showcase-toolbar">
        <div>
          <span className="demo-panel-label">CLÍNICA DE EJEMPLO</span>
          <h3>Tu práctica, conectada.</h3>
        </div>
        <span className="workspace-user" aria-label="Usuario ficticio">
          VP
        </span>
      </div>
      <div
        className="showcase-tabs"
        role="tablist"
        aria-label="Vistas de la demostración"
      >
        {views.map(({ id: tab, label, icon: Icon }, index) => (
          <button
            key={tab}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`${id}-${tab}`}
            type="button"
            role="tab"
            aria-selected={view === tab}
            aria-controls={`${id}-panel`}
            tabIndex={view === tab ? 0 : -1}
            onClick={() => setView(tab)}
            onKeyDown={(event) => navigateTabs(event, index)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${view}`}
        tabIndex={0}
        className="showcase-panel"
      >
        <motion.div
          key={view}
          initial={reduced ? false : { opacity: 0.65, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.18 }}
          aria-label={`Vista conceptual: ${title}`}
          className="showcase-panel-content"
        >
          {view === "dashboard" && <DashboardView />}
          {view === "agenda" && <AgendaView />}
          {view === "pacientes" && <PatientsView />}
          {view === "ficha" && <ClinicalView />}
        </motion.div>
      </div>
      <div className="showcase-disclaimer">
        <Stethoscope size={15} />
        <span>
          Datos ficticios. Módulos planificados, sin conexión al sistema
          clínico.
        </span>
      </div>
    </div>
  );
}
