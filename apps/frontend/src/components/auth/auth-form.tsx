"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { authErrorMessage, login, registerClinic } from "@/lib/auth";
type Values = {
  name: string;
  email: string;
  password: string;
  confirmation: string;
  clinicName: string;
};
type Errors = Partial<Record<keyof Values, string>>;
const length = (text: string) => Array.from(text).length;
export function AuthForm({ mode }: { mode: "register" | "login" }) {
  const registering = mode === "register";
  const router = useRouter();
  const [values, setValues] = useState<Values>({
    name: "",
    email: "",
    password: "",
    confirmation: "",
    clinicName: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [visible, setVisible] = useState(false);
  const [created, setCreated] = useState("");
  const alert = useRef<HTMLDivElement>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget;
    const next: Errors = {};
    const email = values.email.trim();
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      length(email) > 254 ||
      Array.from(email.split("@")[0]).some((char) => char.charCodeAt(0) > 127)
    )
      next.email = "Ingresa un correo electrónico válido.";
    if (
      length(values.password) < (registering ? 15 : 1) ||
      length(values.password) > 128
    )
      next.password = registering
        ? "Usa entre 15 y 128 caracteres. Una frase larga es una buena opción."
        : "Ingresa tu contraseña (máximo 128 caracteres).";
    if (registering) {
      if (!values.name.trim() || length(values.name.trim()) > 120)
        next.name = "Ingresa tu nombre (máximo 120 caracteres).";
      if (!values.clinicName.trim() || length(values.clinicName.trim()) > 160)
        next.clinicName =
          "Ingresa el nombre de tu clínica (máximo 160 caracteres).";
      if (values.confirmation !== values.password || !values.confirmation)
        next.confirmation = "Las contraseñas deben coincidir.";
    }
    setErrors(next);
    setMessage("");
    if (Object.keys(next).length) {
      form
        .querySelector<HTMLInputElement>(`[name="${Object.keys(next)[0]}"]`)
        ?.focus();
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      if (registering) {
        const result = await registerClinic({
          name: values.name.trim(),
          email,
          password: values.password,
          clinicName: values.clinicName.trim(),
        });
        setCreated(result.clinic.name);
        setValues({
          name: "",
          email: "",
          password: "",
          confirmation: "",
          clinicName: "",
        });
      } else {
        await login(email, values.password);
        setValues((v) => ({ ...v, password: "" }));
        router.replace("/app");
      }
    } catch (error) {
      setMessage(authErrorMessage(error, mode));
      requestAnimationFrame(() => alert.current?.focus());
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function field(
    key: keyof Values,
    label: string,
    autoComplete: string,
    placeholder: string,
    password = false,
  ) {
    return (
      <div className="auth-field">
        <label htmlFor={key}>{label}</label>
        <div className="auth-input-wrap">
          <input
            id={key}
            name={key}
            type={
              password
                ? visible
                  ? "text"
                  : "password"
                : key === "email"
                  ? "email"
                  : "text"
            }
            autoComplete={autoComplete}
            value={values[key]}
            onChange={(e) => {
              setValues((v) => ({ ...v, [key]: e.target.value }));
              setErrors((v) => ({ ...v, [key]: undefined }));
            }}
            disabled={busy}
            required
            aria-invalid={Boolean(errors[key])}
            aria-describedby={
              errors[key]
                ? `${key}-error`
                : key === "password" && registering
                  ? "password-hint"
                  : undefined
            }
            placeholder={placeholder}
            autoCapitalize={key === "email" ? "none" : undefined}
            spellCheck={password || key === "email" ? false : undefined}
          />
          {password && (
            <button
              className="auth-eye"
              type="button"
              disabled={busy}
              aria-label={`${visible ? "Ocultar" : "Mostrar"} ${key === "confirmation" ? "confirmación de contraseña" : "contraseña"}`}
              aria-pressed={visible}
              onClick={() => setVisible((v) => !v)}
            >
              {visible ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          )}
        </div>
        {errors[key] && (
          <p className="auth-field-error" id={`${key}-error`}>
            {errors[key]}
          </p>
        )}
        {key === "password" && registering && !errors[key] && (
          <p className="auth-hint" id="password-hint">
            Al menos 15 caracteres. Sin necesidad de complicarla.
          </p>
        )}
      </div>
    );
  }
  if (created)
    return (
      <div className="auth-success" role="status">
        <span className="auth-success-icon">
          <Check size={28} aria-hidden="true" />
        </span>
        <span className="auth-kicker">TU ESPACIO ESTÁ LISTO</span>
        <h1>Bienvenido a Pawly.</h1>
        <p>
          <strong>{created}</strong> se registró correctamente. Inicia sesión
          con tu correo y contraseña para entrar a tu espacio de trabajo.
        </p>
        <Link href="/iniciar-sesion" className="auth-submit">
          Ir a iniciar sesión <ArrowRight size={18} />
        </Link>
      </div>
    );
  return (
    <>
      <span className="auth-kicker">PAWLY WORKSPACE</span>
      <h1>
        {registering
          ? "El cuidado comienza con tu equipo."
          : "Qué bueno verte de nuevo."}
      </h1>
      <p className="auth-intro">
        {registering
          ? "Crea tu cuenta y el espacio de tu clínica veterinaria."
          : "Inicia sesión para acceder a tus clínicas y continuar donde lo dejaste."}
      </p>
      <form
        onSubmit={submit}
        noValidate
        aria-label={registering ? "Registro de clínica" : "Inicio de sesión"}
        aria-busy={busy}
      >
        {message && (
          <div className="auth-alert" role="alert" tabIndex={-1} ref={alert}>
            {message}
          </div>
        )}
        {registering &&
          field("name", "Nombre del responsable", "name", "Tu nombre completo")}
        {field("email", "Correo electrónico", "email", "nombre@tuclinica.cl")}
        {field(
          "password",
          "Contraseña",
          registering ? "new-password" : "current-password",
          registering ? "Una frase que puedas recordar" : "Tu contraseña",
          true,
        )}
        {registering &&
          field(
            "confirmation",
            "Confirmar contraseña",
            "new-password",
            "Escribe nuevamente tu contraseña",
            true,
          )}
        {registering &&
          field(
            "clinicName",
            "Nombre de la clínica veterinaria",
            "organization",
            "El nombre de tu clínica",
          )}
        <button className="auth-submit" type="submit" disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle
                className="auth-spinner"
                size={18}
                aria-hidden="true"
              />
              {registering ? "Creando tu cuenta…" : "Iniciando sesión…"}
            </>
          ) : (
            <>
              {registering ? "Crear cuenta y clínica" : "Iniciar sesión"}
              <ArrowRight size={18} aria-hidden="true" />
            </>
          )}
        </button>
        <p className="auth-security-note">
          <ShieldCheck size={15} aria-hidden="true" />
          {registering
            ? "Tu contraseña protege el acceso a tu clínica."
            : "Un acceso privado para ti y tu equipo."}
        </p>
      </form>
      <p className="auth-switch">
        {registering
          ? "¿Ya tienes una cuenta?"
          : "¿Tu clínica aún no tiene cuenta?"}{" "}
        <Link href={registering ? "/iniciar-sesion" : "/registrarse"}>
          {registering ? "Inicia sesión" : "Registra tu clínica"}
        </Link>
      </p>
    </>
  );
}
