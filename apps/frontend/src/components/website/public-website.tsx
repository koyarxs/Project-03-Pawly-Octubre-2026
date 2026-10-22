"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PawlyMark } from "@/components/brand";
import { getPublicWebsite, type WebsiteContent } from "@/lib/website";
import { ClinicWebsite } from "./clinic-website";
import styles from "./clinic-website.module.css";

export function PublicWebsite({ initial }: { initial: WebsiteContent | null }) {
  const [content, setContent] = useState(initial);
  const [loading, setLoading] = useState(!initial);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void getPublicWebsite(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setContent(value.content);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setUnavailable(true);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [initial]);
  if (content) return <ClinicWebsite content={content} />;
  return (
    <main className={styles.preparing} aria-busy={loading}>
      <PawlyMark className="size-14" />
      <span className={styles.eyebrow}>CLÍNICA VETERINARIA PORVENIR</span>
      <h1>
        Estamos preparando
        <br />
        <em>un espacio para cuidar.</em>
      </h1>
      <p role="status">
        {loading
          ? "Cargando el sitio de la veterinaria…"
          : unavailable
            ? "El sitio no está disponible en este momento. Intenta nuevamente más tarde."
            : "El sitio público está en preparación. El equipo podrá publicar aquí la información y los canales de atención de la veterinaria."}
      </p>
      <Link className={styles.primary} href="/iniciar-sesion">
        Acceso del equipo <ArrowIcon />
      </Link>
    </main>
  );
}
function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}
