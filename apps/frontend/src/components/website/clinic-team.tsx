"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, CalendarDays, Heart, HeartHandshake, HeartPulse, PawPrint, Scissors, ShieldCheck, Stethoscope, X } from "lucide-react";
import { jobNames } from "@/lib/permissions";
import { TeamProfileDetail } from "./team-profile-detail";
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
const jobIcons: Record<string, typeof HeartHandshake> = {
  CLINIC_DIRECTOR: Stethoscope,
  VETERINARIAN: HeartPulse,
  VET_TECHNICIAN: HeartHandshake,
  RECEPTIONIST: CalendarDays,
  PET_GROOMER: Scissors,
};
const demoIntroductions: Record<string, { quote: string; areas: string[] }> = {
  "director-demo": { quote: "Un equipo que escucha, un cuidado que se siente.", areas: ["Dirección clínica", "Gestión y administración", "Coordinación del equipo"] },
  "veterinarian-demo": { quote: "Prevenir también es una forma de querer.", areas: ["Consulta y diagnóstico", "Medicina preventiva", "Seguimiento del paciente"] },
  "surgeon-demo": { quote: "Cuidar cada detalle, acompañar cada recuperación.", areas: ["Evaluación quirúrgica", "Procedimientos y cirugía", "Cuidados posoperatorios"] },
  "internist-demo": { quote: "Cada historia merece tiempo y una mirada atenta.", areas: ["Medicina interna", "Evaluación diagnóstica", "Seguimiento clínico"] },
  "trauma-demo": { quote: "Que vuelvan a moverse, jugar y disfrutar.", areas: ["Evaluación de movilidad", "Cuidado musculoesquelético", "Rehabilitación y seguimiento"] },
  "technician-demo": { quote: "A su lado, en cada pequeño paso de su cuidado.", areas: ["Hospitalización", "Cuidados clínicos", "Monitoreo y bienestar"] },
  "reception-demo": { quote: "Una bienvenida cercana hace toda la diferencia.", areas: ["Coordinación de citas", "Atención a las familias", "Orientación y recepción"] },
  "groomer-demo": { quote: "Que se vean bien, que se sientan aún mejor.", areas: ["Peluquería canina", "Higiene y estética", "Cuidado y bienestar"] },
  "exotics-demo": { quote: "Pequeños compañeros, grandes formas de cuidar.", areas: ["Cuidado de animales exóticos", "Orientación por especie", "Prevención y bienestar"] },
};
function specialties(profile: PublicProfile) {
  return profile.specialty.split(/\s+y\s+|\s+&\s+/i).filter(Boolean);
}
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
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<PublicProfile | null>(null);
  useEffect(() => {
    if (!selected) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [selected]);
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
      <svg className={styles.botanical} viewBox="0 0 180 320" aria-hidden="true">
        <path d="M25 310C95 230 75 130 151 15M69 243C12 239 9 196 13 178C53 180 74 202 69 243ZM86 193C132 195 158 163 159 139C121 138 91 157 86 193ZM100 135C62 126 53 95 58 74C89 81 104 105 100 135ZM126 77C159 73 174 45 170 27C142 32 124 52 126 77Z" />
      </svg>
      <PawPrint className={styles.cornerPaw} size={75} aria-hidden="true" />
      <div className={styles.container}>
        <div className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>
              <HeartHandshake size={16} aria-hidden="true" />
              NUESTRO EQUIPO
            </span>
            <h2 id="equipo-title">Conoce a <span>nuestro equipo</span></h2>
            <p>
              Profesionales comprometidos con la salud, el bienestar y el
              cuidado de quienes forman parte de tu familia.
            </p>
          </div>
          <aside className={styles.headingAside}>
            <PawPrint className={styles.decorativePaw} size={52} aria-hidden="true" />
            <p className={styles.handwritten}>Distintas historias,<br />una misma forma<br />de cuidar. <Heart size={22} aria-hidden="true" /></p>
            <span className={styles.note}>{demo ? "Vista demostrativa" : "Equipo de la clínica"}</span>
          </aside>
        </div>
        {demo && (
          <p className={styles.disclosure}>
            Ejemplo de equipo para una página de clínica creada con Pawly. Los
            nombres, cargos e identidades son ficticios; las imágenes
            fueron generadas para esta demostración. No representan trabajadores
            reales ni acreditan servicios disponibles.
          </p>
        )}
        {unavailable && (
          <p className={styles.unavailable} role="status">
            La información del equipo publicado no está disponible en este
            momento. Mostramos el ejemplo demostrativo.
          </p>
        )}
        <div className={styles.grid}>
          {items.map((p, index) => {
            const JobIcon = jobIcons[p.job] ?? HeartHandshake;
            const introduction = demo ? demoIntroductions[p.photoKey] : undefined;
            const areas = introduction?.areas ?? specialties(p);
            return <article key={`${p.displayName}:${index}`} className={styles.card}>
              <div className={styles.portraitFrame}>
                <svg className={styles.sketchRing} viewBox="0 0 240 240" aria-hidden="true">
                  <path className={styles.outerStroke} d="M120 5C181 3 233 55 234 117C237 181 184 234 122 235C59 238 5 187 5 123C3 60 55 7 120 5Z" />
                  <path className={styles.movingStroke} d="M118 9C179 6 230 59 230 121C230 180 180 231 119 230C58 230 8 180 10 118C11 58 60 8 118 9Z" />
                </svg>
              <div className={styles.portrait}>
                {photos.includes(p.photoKey) ? (
                  <Image
                    src={`/images/staff/${p.photoKey}-v2.webp`}
                    alt={
                      demo
                        ? `Retrato ficticio de demostración ${index + 1}`
                        : "Fotografía ilustrativa de demostración; no retrato del profesional"
                    }
                    fill
                    sizes="(max-width:600px) 160px, 210px"
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
                <span className={styles.jobBadge}><JobIcon size={23} strokeWidth={1.6} aria-hidden="true" /></span>
              </div>
              <div className={styles.body}>
                <h3>{p.displayName}</h3>
                <p className={styles.job}>{demo && p.demoTitle ? p.demoTitle : jobNames[p.job]}</p>
                <div className={styles.presentation}>
                  {introduction ? <blockquote className={styles.quote}>“{introduction.quote}”</blockquote> : <p className={styles.biography}>{p.biography}</p>}
                  <ul className={styles.areas} aria-label={`Áreas de ${p.displayName}`}>
                    {areas.map((area, areaIndex) => {
                      const AreaIcon = [JobIcon, HeartPulse, ShieldCheck][areaIndex % 3];
                      return <li key={area}><AreaIcon size={15} aria-hidden="true" /><span>{area}</span></li>;
                    })}
                  </ul>
                  <div className={styles.specialtyGroup}>
                    <span className={styles.specialtyLabel}>Especialidades</span>
                    <ul className={styles.specialties} aria-label="Áreas del perfil">
                      {specialties(p).map((specialty) => <li key={specialty}>{specialty}</li>)}
                    </ul>
                  </div>
                  <button className={styles.profileButton} type="button" aria-label={`Ver perfil de ${p.displayName}`} aria-haspopup="dialog" onClick={() => { setSelected(p); if (dialog.current) { dialog.current.showModal(); dialog.current.scrollTop = 0; } }}>Ver perfil <ArrowUpRight size={15} aria-hidden="true" /></button>
                </div>
                {photos.includes(p.photoKey) && <small className={styles.illustration}>Imagen generada · ilustrativa</small>}
                {demo && (
                  <span className={styles.demo}>
                    Perfil ficticio de demostración
                  </span>
                )}
              </div>
            </article>;
          })}
        </div>
      </div>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby="team-profile-title" onClose={() => setSelected(null)} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        <div className={styles.dialogTop}><span>{demo ? "Perfil de demostración" : "Nuestro equipo"}</span><button type="button" aria-label="Cerrar perfil" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button></div>
        {selected && <TeamProfileDetail key={selected.photoKey + selected.displayName} name={selected.displayName} job={demo && selected.demoTitle ? selected.demoTitle : jobNames[selected.job]} biography={selected.biography} photoKey={selected.photoKey} portraitSrc={photos.includes(selected.photoKey) ? `/images/staff/${selected.photoKey}-v2.webp` : undefined} demo={demo} quote={demo ? demoIntroductions[selected.photoKey]?.quote : undefined} areas={demo ? demoIntroductions[selected.photoKey]?.areas ?? specialties(selected) : specialties(selected)} />}
      </dialog>
    </section>
  );
}
