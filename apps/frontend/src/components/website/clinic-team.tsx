"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { jobNames } from "@/lib/permissions";
import styles from "./clinic-team.module.css";
type PublicProfile = {
  displayName: string;
  job: string;
  specialty: string;
  biography: string;
  photoKey: string;
  demoTitle?: string;
};
const photos = [
  "director-demo",
  "veterinarian-demo",
  "technician-demo",
  "reception-demo",
  "groomer-demo",
  "surgeon-demo",
  "internist-demo",
  "trauma-demo",
  "exotics-demo",
];
const demoProfiles: PublicProfile[] = [
  {
    displayName: "Dr. Sebastián Morales",
    job: "CLINIC_DIRECTOR",
    specialty: "Dirección Clínica y Gestión Veterinaria",
    biography:
      "Líder del equipo encargado de coordinar la excelencia médica y la gestión operativa de la clínica.",
    photoKey: photos[0],
  },
  {
    displayName: "Dra. Valentina Rojas",
    job: "VETERINARIAN",
    specialty: "Medicina Interna y Preventiva",
    biography:
      "Profesional dedicada al diagnóstico, tratamiento y prevención de enfermedades de animales de compañía.",
    photoKey: photos[1],
  },
  {
    displayName: "Dr. Matías Torres",
    job: "VETERINARIAN",
    demoTitle: "Médico Veterinario · Cirugía",
    specialty: "Cirugía y Recuperación",
    biography: "Un enfoque cuidadoso en cada procedimiento y en el acompañamiento durante la recuperación.",
    photoKey: "surgeon-demo",
  },
  {
    displayName: "Dra. Fernanda López",
    job: "VETERINARIAN",
    demoTitle: "Médica Veterinaria · Medicina Interna",
    specialty: "Diagnóstico y Seguimiento",
    biography: "Atención cercana para comprender cada caso y acompañar a pacientes que necesitan seguimiento.",
    photoKey: "internist-demo",
  },
  {
    displayName: "Dr. Ignacio Rivas",
    job: "VETERINARIAN",
    demoTitle: "Médico Veterinario · Traumatología",
    specialty: "Movilidad y Rehabilitación",
    biography: "Dedicado al bienestar y la movilidad, con una mirada atenta a las necesidades de cada paciente.",
    photoKey: "trauma-demo",
  },
  {
    displayName: "Camila Fernández",
    job: "VET_TECHNICIAN",
    specialty: "Hospitalización y Cuidados Clínicos",
    biography:
      "Encargada del acompañamiento, monitoreo y cuidado diario de pacientes veterinarios.",
    photoKey: photos[2],
  },
  {
    displayName: "Nicolás Herrera",
    job: "RECEPTIONIST",
    specialty: "Atención y Gestión de Pacientes",
    biography:
      "Responsable de coordinar citas y facilitar una experiencia de atención organizada y cercana.",
    photoKey: photos[3],
  },
  {
    displayName: "Daniela Castillo",
    job: "PET_GROOMER",
    specialty: "Estética y Bienestar Animal",
    biography:
      "Especialista en servicios de higiene y estética adaptados a las necesidades de cada mascota.",
    photoKey: photos[4],
  },
  {
    displayName: "Dra. Constanza Vega",
    job: "VETERINARIAN",
    demoTitle: "Médica Veterinaria · Animales Exóticos",
    specialty: "Animales Exóticos y Prevención",
    biography: "Una mirada especial para pequeños compañeros, sus hábitos y el cuidado de cada especie.",
    photoKey: "exotics-demo",
  },
];
function validProfile(value: unknown): value is PublicProfile {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    ["displayName", "job", "specialty", "biography", "photoKey"].every(
      (k) => typeof p[k] === "string",
    ) && String(p.job) in jobNames
  );
}
export function ClinicTeam({ preview = false }: { preview?: boolean }) {
  const [profiles, setProfiles] = useState<PublicProfile[] | null>(null),
    [unavailable, setUnavailable] = useState(!process.env.NEXT_PUBLIC_API_URL);
  useEffect(() => {
    if (preview) return;
    const controller = new AbortController();
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return;
    void fetch(`${base.replace(/\/$/, "")}/website/team`, {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const value: unknown = await response.json();
        if (
          typeof value !== "object" ||
          value === null ||
          !("items" in value) ||
          !Array.isArray(value.items) ||
          !value.items.every(validProfile)
        )
          throw new Error();
        if (!controller.signal.aborted) setProfiles(value.items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true);
      });
    return () => controller.abort();
  }, [preview]);
  const demo = preview || profiles === null || profiles.length === 0,
    items = demo ? demoProfiles : profiles;
  return (
    <section
      className={styles.section}
      id="equipo"
      aria-labelledby="equipo-title"
    >
      <div className={styles.container}>
        <div className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>
              NUESTRO EQUIPO
            </span>
            <h2 id="equipo-title">Conoce a <span>nuestro equipo.</span></h2>
          </div>
          <p className={styles.introduction}>Un equipo que escucha, acompaña y cuida. Conoce a las personas detrás de cada atención en Porvenir.</p>
        </div>
        {unavailable && (
          <p className={styles.unavailable} role="status">
            La información del equipo publicado no está disponible en este
            momento. Inténtalo nuevamente más tarde.
          </p>
        )}
        <div className={styles.grid}>
          {items.map((p, index) => {
            return <article key={`${p.displayName}:${index}`} className={styles.card}>
              <div className={styles.portraitFrame}>
              <div className={styles.portrait}>
                {photos.includes(p.photoKey) ? (
                  <Image
                    src={`/images/staff/${p.photoKey}-v2.webp`}
                    alt={`Retrato de ${p.displayName}`}
                    fill
                    sizes="(max-width:600px) 110px, 104px"
                  />
                ) : (
                  <span aria-hidden="true">
                    {p.displayName
                      .split(" ")
                      .slice(0, 2)
                      .map((v) => v[0])
                      .join("")}
                  </span>
                )}
              </div>
              </div>
              <div className={styles.body}>
                <h3>{p.displayName}</h3>
                <p className={styles.job}>{demo && p.demoTitle ? p.demoTitle : jobNames[p.job]}</p>
              </div>
            </article>;
          })}
        </div>
      </div>
    </section>
  );
}
