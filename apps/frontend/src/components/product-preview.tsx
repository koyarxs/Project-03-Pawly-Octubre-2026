import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  PawPrint,
  Stethoscope,
} from "lucide-react";

export { ProductPreview } from "./product-showcase";

export function ClinicalSnapshot() {
  return (
    <div className="clinical-snapshot">
      <div className="snapshot-title">
        <span className="snapshot-icon">
          <Stethoscope size={17} />
        </span>
        <span>
          El contexto que importa<small>Concepto de ficha clínica</small>
        </span>
        <Check size={16} />
      </div>
      <div className="snapshot-patient">
        <span className="patient-avatar avatar-mint">LU</span>
        <div>
          <strong>Luna</strong>
          <span>Canina · 4 años · Paciente ficticia</span>
        </div>
      </div>
      <div className="snapshot-tags">
        <span>Historial clínico</span>
        <span>Próximo control</span>
      </div>
    </div>
  );
}

export function WorkflowVisual() {
  return (
    <div
      className="workflow-visual"
      aria-label="Ejemplo conceptual de una atención conectada"
    >
      <div className="workflow-topline">
        <span>UNA ATENCIÓN, UN RECORRIDO</span>
        <span>Concepto</span>
      </div>
      <div className="workflow-patient">
        <span className="patient-avatar avatar-mint">LU</span>
        <div>
          <strong>Luna</strong>
          <span>Paciente de ejemplo</span>
        </div>
        <PawPrint />
      </div>
      <ol>
        {(
          [
            [
              CalendarDays,
              "09:00",
              "Una cita con contexto",
              "Paciente y tutor vinculados.",
            ],
            [
              Stethoscope,
              "09:15",
              "Una atención documentada",
              "Hallazgos e indicaciones en su ficha.",
            ],
            [
              ClipboardList,
              "09:40",
              "Un seguimiento claro",
              "El próximo paso, a la vista.",
            ],
          ] as const
        ).map(([Icon, time, title, text], index) => {
          return (
            <li key={index}>
              <span className="workflow-icon">
                <Icon />
              </span>
              <div>
                <small>{time}</small>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
              <Check size={16} aria-hidden="true" />
            </li>
          );
        })}
      </ol>
      <div className="workflow-bottom">
        <ChevronLeft size={14} />
        <span>Así imaginamos una atención en Pawly</span>
        <ChevronRight size={14} />
      </div>
    </div>
  );
}
