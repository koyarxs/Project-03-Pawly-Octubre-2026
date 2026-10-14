"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowDownToLine, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DemoRequest() {
  const [prepared, setPrepared] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const content = [
      "Solicitud de demostración · Pawly",
      "",
      `Nombre: ${values.get("name")}`,
      `Correo: ${values.get("email")}`,
      `Clínica / consulta: ${values.get("clinic")}`,
      `Tipo de práctica: ${values.get("practice")}`,
      `Interés: ${values.get("message") || "Conocer Pawly"}`,
      "",
      "Solicitud preparada localmente. No ha sido enviada ni registrada por Pawly.",
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "solicitud-demo-pawly.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setPrepared(true);
    requestAnimationFrame(() => statusRef.current?.focus());
  }

  return (
    <form className="demo-form" onSubmit={submit}>
      <div className="form-heading">
        <span className="eyebrow">CONVERSEMOS SOBRE TU CLÍNICA</span>
        <h3>Prepara tu solicitud</h3>
        <p>Cuéntanos qué te gustaría resolver con Pawly.</p>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="demo-name">
            Nombre <span>(requerido)</span>
          </label>
          <input
            id="demo-name"
            name="name"
            autoComplete="name"
            required
            maxLength={120}
            placeholder="Tu nombre"
          />
        </div>
        <div className="field">
          <label htmlFor="demo-email">
            Correo <span>(requerido)</span>
          </label>
          <input
            id="demo-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={200}
            placeholder="nombre@tuclinica.cl"
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="demo-clinic">
          Clínica o consulta <span>(requerido)</span>
        </label>
        <input
          id="demo-clinic"
          name="clinic"
          autoComplete="organization"
          required
          maxLength={160}
          placeholder="Nombre de tu práctica"
        />
      </div>
      <div className="field">
        <label htmlFor="demo-practice">¿Cómo trabajas?</label>
        <select
          id="demo-practice"
          name="practice"
          defaultValue="Clínica veterinaria"
        >
          <option>Clínica veterinaria</option>
          <option>Consulta independiente</option>
          <option>Equipo en crecimiento</option>
          <option>Otra modalidad</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="demo-message">
          ¿Qué necesitas ordenar? <span>(opcional)</span>
        </label>
        <textarea
          id="demo-message"
          name="message"
          rows={3}
          maxLength={1000}
          placeholder="Agenda, fichas clínicas, inventario…"
        />
      </div>
      <p className="form-disclosure" id="request-disclosure">
        <ShieldCheck size={16} />
        <span>
          El canal de envío aún no está habilitado. Tus datos se usan solo para
          descargar esta solicitud en tu dispositivo; no se envían a Pawly.
        </span>
      </p>
      <Button
        type="submit"
        className="w-full"
        size="lg"
        aria-describedby="request-disclosure"
      >
        <ArrowDownToLine /> Descargar solicitud de demo
      </Button>
      <div
        ref={statusRef}
        tabIndex={-1}
        role="status"
        className={prepared ? "form-success" : "sr-only"}
      >
        {prepared && (
          <>
            <CheckCircle2 size={18} />
            <span>
              Solicitud preparada para descargar. No ha sido enviada ni
              registrada.
            </span>
          </>
        )}
      </div>
    </form>
  );
}
