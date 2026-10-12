import {
  CalendarDays,
  ClipboardList,
  Package,
  PawPrint,
  Syringe,
  Users,
  Check,
  ArrowUpRight,
} from "lucide-react";

export function FeatureBento() {
  return (
    <div className="features-grid bento-grid">
      <article className="bento bento-agenda">
        <div className="bento-copy">
          <span className="bento-category">
            <CalendarDays size={18} /> AGENDA
          </span>
          <h3>
            El día, en orden.
            <br />
            El equipo, en sintonía.
          </h3>
          <p>
            Citas vinculadas a cada paciente para preparar la atención con
            contexto.
          </p>
        </div>
        <div className="bento-calendar mini-interface">
          <div className="mini-heading">
            <strong>Octubre · Semana de ejemplo</strong>
            <span>Concepto</span>
          </div>
          <div className="calendar-days">
            {["Lun", "Mar", "Mié", "Jue", "Vie"].map((day, i) => (
              <div key={day} className={i === 2 ? "calendar-day-selected" : ""}>
                <span>{day}</span>
                <strong>{12 + i}</strong>
              </div>
            ))}
          </div>
          <div className="calendar-appointment">
            <span>09:00</span>
            <div>
              <strong>Luna · Control preventivo</strong>
              <small>Consulta 01 · Paciente ficticia</small>
            </div>
            <span className="calendar-confirmed">
              <Check size={14} />
            </span>
          </div>
        </div>
      </article>
      <article className="bento bento-record">
        <span className="bento-category">
          <ClipboardList size={18} /> FICHAS CLÍNICAS
        </span>
        <h3>
          Cada atención
          <br />
          suma a su historia.
        </h3>
        <p>Antecedentes, hallazgos e indicaciones en un registro conectado.</p>
        <div className="mini-record">
          <div>
            <span className="patient-avatar avatar-mint">LU</span>
            <span>
              <strong>Luna</strong>
              <small>Ficha ilustrativa · Paciente ficticia</small>
            </span>
            <span className="mini-record-id">#P-001</span>
          </div>
          <p>Motivo de consulta</p>
          <strong>Control preventivo</strong>
          <div className="record-timeline">
            <span />
            <span>Consulta de ejemplo</span>
            <span>14 oct.</span>
          </div>
        </div>
      </article>
      <article className="bento bento-patients">
        <span className="bento-category">
          <PawPrint size={18} /> PACIENTES
        </span>
        <h3>
          Historias únicas.
          <br />
          Cuidado conectado.
        </h3>
        <p>Una identidad y antecedentes propios para cada paciente.</p>
        <div className="mini-patients">
          {[
            ["LU", "Luna", "Canina · 4 años", "mint"],
            ["SI", "Simón", "Felino · 2 años", "amber"],
          ].map(([initials, name, detail, color]) => (
            <div key={name}>
              <span className={`patient-avatar avatar-${color}`}>
                {initials}
              </span>
              <div>
                <strong>{name}</strong>
                <small>{detail} · Ficticio</small>
              </div>
              <span className="mini-patient-id">
                #{initials === "LU" ? "001" : "002"}
              </span>
            </div>
          ))}
        </div>
      </article>
      <article className="bento bento-tutors">
        <span className="bento-category">
          <Users size={18} /> TUTORES
        </span>
        <h3>
          Una persona detrás
          <br />
          de cada paciente.
        </h3>
        <p>Contactos y vínculos a la vista, sin buscar entre mensajes.</p>
        <div className="mini-tutor">
          <span className="tutor-initials">VA</span>
          <div>
            <strong>Valentina A.</strong>
            <small>Tutora ficticia</small>
            <span className="tutor-link">
              <PawPrint size={12} /> Luna · Paciente vinculada
            </span>
          </div>
        </div>
      </article>
      <article className="bento bento-vaccines">
        <span className="bento-category">
          <Syringe size={18} /> VACUNACIÓN
        </span>
        <h3>
          El próximo cuidado,
          <br />
          en perspectiva.
        </h3>
        <p>
          Una propuesta para ordenar registros de vacunación y próximos
          controles.
        </p>
        <div className="mini-vaccine">
          <span className="vaccine-symbol">
            <Syringe size={21} />
          </span>
          <div>
            <strong>Registro de ejemplo</strong>
            <small>Luna · Historial ilustrativo</small>
          </div>
          <span className="vaccine-marker">Planificado</span>
        </div>
      </article>
      <article className="bento bento-inventory">
        <div className="inventory-copy">
          <span className="bento-category">
            <Package size={18} /> INVENTARIO
          </span>
          <h3>
            Lo que tu clínica necesita.
            <br />
            Antes de que falte.
          </h3>
          <p>Existencias e insumos visibles para planificar la operación.</p>
        </div>
        <div className="mini-stock">
          <span className="mini-heading">
            <strong>Existencias de ejemplo</strong>
            <span>Datos ficticios</span>
          </span>
          {[
            ["Guantes de examen", "18 cajas", 75],
            ["Material de curación", "06 unidades", 30],
          ].map(([name, count, width]) => (
            <div key={name}>
              <div>
                <span>{name}</span>
                <strong>{count}</strong>
              </div>
              <span className="stock-track">
                <span style={{ width: `${width}%` }} />
              </span>
            </div>
          ))}
        </div>
        <ArrowUpRight
          className="inventory-arrow"
          size={24}
          aria-hidden="true"
        />
      </article>
      <p className="bento-disclaimer">
        Vistas ilustrativas con datos ficticios. Los seis módulos están
        planificados y sujetos al alcance de desarrollo.
      </p>
    </div>
  );
}
