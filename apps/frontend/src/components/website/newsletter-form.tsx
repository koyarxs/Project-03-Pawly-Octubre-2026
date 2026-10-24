"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle, Mail } from "lucide-react";
import styles from "./clinic-footer.module.css";

export function NewsletterForm({ preview }: { preview: boolean }) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  async function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || busy.current) return;
    busy.current = true;
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus("sending");
    setMessage("");
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
      const response = await fetch(`${base.replace(/\/$/, "")}/website/newsletter`, {
        method: "POST", credentials: "omit", cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Pawly-CSRF": "1" },
        body: JSON.stringify({ email: String(data.get("email") || "").trim(), consent: data.get("consent") === "on" }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        setMessage(response.status === 429 ? "Has realizado varios intentos. Espera un minuto para volver a intentarlo." : response.status === 400 ? "Revisa tu correo y acepta recibir novedades." : "No pudimos registrar tu suscripción. Inténtalo de nuevo más tarde.");
        setStatus("error");
        return;
      }
      const result = await response.json();
      if (result?.status !== "accepted") throw new Error("Invalid response");
      setStatus("success");
      setMessage("Tu solicitud quedó registrada. Gracias por querer ser parte de nuestras novedades.");
      form.reset();
    } catch {
      setStatus("error");
      setMessage("No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally { busy.current = false; }
  }

  return (
    <form onSubmit={subscribe} aria-label="Suscripción a novedades" className={styles.newsletter}>
      <p>Un espacio para compartir consejos sobre salud animal, bienestar y novedades de nuestra veterinaria.</p>
      <fieldset disabled={preview || status === "sending"} className={styles.subscribe}>
        <legend className="sr-only">Suscríbete a nuestras novedades</legend>
        <Mail size={19} aria-hidden="true" />
        <label className="sr-only" htmlFor="boletin-correo">Tu correo electrónico</label>
        <input id="boletin-correo" name="email" type="email" required maxLength={254} placeholder="Tu correo electrónico" autoComplete="email" aria-describedby="boletin-estado" />
        <button type="submit">{status === "sending" ? "Registrando…" : "Suscribirme"}{status === "sending" ? <LoaderCircle size={18} className={styles.spinner} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}</button>
      </fieldset>
      <label className={styles.consent}><input name="consent" type="checkbox" required disabled={preview || status === "sending"} />Quiero recibir consejos y novedades de la veterinaria por correo electrónico.</label>
      <p id="boletin-estado" role={status === "error" ? "alert" : "status"} className={styles.formMessage}>{preview ? "El formulario está desactivado en la vista previa." : message || "Usaremos tu correo para las novedades que has solicitado."}</p>
    </form>
  );
}
