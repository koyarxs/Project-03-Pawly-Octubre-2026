import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import "./workspace-ui.css";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  level = 1,
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  level?: 1 | 2;
  className?: string;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return (
    <header className={`pw-page-header ${className}`}>
      <div className="pw-page-heading">
        {eyebrow && <span className="pw-eyebrow">{eyebrow}</span>}
        <Heading>{title}</Heading>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="pw-page-actions">{actions}</div>}
    </header>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "info" | "warning" | "danger";
  className?: string;
}) {
  return (
    <span className={`pw-status pw-status-${tone} ${className}`}>
      <span className="pw-status-dot" aria-hidden="true" />
      {children}
    </span>
  );
}

export function EmptyState({
  icon: Icon = CircleAlert,
  title,
  description,
  actions,
  error = false,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`pw-empty${error ? " pw-empty-error" : ""}`}
      role={error ? "alert" : undefined}
    >
      <span className="pw-empty-icon">
        <Icon size={26} aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {actions && <div className="pw-empty-actions">{actions}</div>}
    </div>
  );
}

export function LoadingState({
  label,
  rows = 3,
}: {
  label: string;
  rows?: number;
}) {
  return (
    <div className="pw-loading" role="status" aria-live="polite">
      <p>
        <LoaderCircle
          size={18}
          className="pw-loading-spinner"
          aria-hidden="true"
        />
        {label}
      </p>
      <div className="pw-skeleton-group" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div className="pw-skeleton-row" key={index}>
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecordIdentity({
  name,
  subtitle,
  kind = "patient",
}: {
  name: string;
  subtitle?: string;
  kind?: "patient" | "person";
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join("")
    .toLocaleUpperCase("es-CL");
  return (
    <span className={`pw-record-identity pw-record-${kind}`}>
      <span className="pw-record-avatar" aria-hidden="true">
        {initials}
      </span>
      <span>
        <strong>{name}</strong>
        {subtitle && <small>{subtitle}</small>}
      </span>
    </span>
  );
}
