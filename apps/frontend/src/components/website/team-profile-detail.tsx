"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, BookOpen, GraduationCap, Heart, MapPin, PawPrint, ShieldCheck } from "lucide-react";
import { teamProfileStories } from "@/lib/team-profile-stories";
import styles from "./team-profile-detail.module.css";

type Props = {
  name: string;
  job: string;
  biography: string;
  photoKey: string;
  portraitSrc?: string;
  demo: boolean;
  quote?: string;
  areas: string[];
};

export function TeamProfileDetail({ name, job, biography, photoKey, portraitSrc, demo, quote, areas }: Props) {
  const [photo, setPhoto] = useState(0);
  const story = demo ? teamProfileStories[photoKey] : undefined;
  const galleryBase = `/images/staff/stories/${photoKey.replace(/-demo$/, "")}`;
  const move = (direction: number) => setPhoto((current) => (current + direction + 3) % 3);

  return <div className={styles.detail}>
    <header className={styles.hero}>
      <div className={styles.portraitWrap}>
        <div className={styles.portrait}>
          {portraitSrc ? <Image src={portraitSrc} alt={`Retrato de ${name}`} fill sizes="(max-width: 650px) 230px, 270px" /> : <PawPrint size={56} aria-hidden="true" />}
        </div>
        {portraitSrc && <span className={styles.imageNote}>Imagen generada · ilustrativa</span>}
      </div>
      <div className={styles.heroText}>
        <span className={styles.eyebrow}><PawPrint size={15} aria-hidden="true" />La historia detrás del cuidado</span>
        <h2 id="team-profile-title">{name}</h2>
        <p className={styles.job}>{job}</p>
        {story && <span className={styles.location}><MapPin size={14} aria-hidden="true" />{story.hometown}</span>}
        {quote && <blockquote className={styles.quote}>“{quote}”</blockquote>}
        <span className={styles.identity}>Perfil del equipo</span>
      </div>
    </header>

    <div className={styles.content}>
      <div className={styles.storyGrid}>
        <section className={styles.history} aria-labelledby="team-history-title">
          <span className={styles.kicker}><BookOpen size={16} aria-hidden="true" />Mi historia</span>
          <h3 id="team-history-title">{story?.introduction ?? "Un poco más sobre mí"}</h3>
          {(story?.history ?? [biography]).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          {story && <div className={styles.outside}><Heart size={18} aria-hidden="true" /><div><h4>Fuera de la clínica</h4><p>{story.outside}</p></div></div>}
        </section>

        {story && <section className={styles.education} aria-labelledby="team-education-title">
          <span className={styles.kicker}><GraduationCap size={17} aria-hidden="true" />Formación y aprendizaje</span>
          <h3 id="team-education-title">Un camino de vocación.</h3>
          <p className={styles.educationNote}>Recorrido de ejemplo en Chile. No acredita títulos ni vínculos con instituciones reales.</p>
          <ol className={styles.timeline}>
            {story.education.map((step, index) => <li key={step.title}><span className={styles.step}>{String(index + 1).padStart(2, "0")}</span><div><h4>{step.title}</h4><span className={styles.studyLocation}>{step.location}</span><p>{step.description}</p></div></li>)}
          </ol>
        </section>}
      </div>

      <section className={styles.approach} aria-labelledby="team-approach-title">
        <div><span className={styles.kicker}><Heart size={16} aria-hidden="true" />Mi manera de cuidar</span><h3 id="team-approach-title">{story ? "Cercanía en cada detalle." : "Áreas de dedicación"}</h3>{story && <p>{story.approach}</p>}</div>
        <ul>{areas.map((area) => <li key={area}><ShieldCheck size={18} aria-hidden="true" /><span>{area}</span></li>)}</ul>
      </section>

      {story && <section className={styles.gallery} aria-labelledby="team-gallery-title">
        <div className={styles.galleryHeading}><div><span className={styles.kicker}>En primera persona</span><h3 id="team-gallery-title">Momentos de mi día a día.</h3></div><span className={styles.galleryNote}>3 escenas generadas · ambientación chilena</span></div>
        <figure className={styles.featured}>
          <div className={styles.featuredImage}><Image key={photo} src={`${galleryBase}-${photo + 1}.webp`} alt={`${name}: ${story.gallery[photo].detail}`} fill sizes="(max-width: 650px) 92vw, 870px" /></div>
          <figcaption><div aria-live="polite" aria-atomic="true"><span className={styles.photoCount}>0{photo + 1} / 03</span><h4>{story.gallery[photo].caption}</h4><p>{story.gallery[photo].detail}</p></div><div className={styles.galleryControls}><button type="button" aria-label="Fotografía anterior del perfil" onClick={() => move(-1)}><ArrowLeft size={18} aria-hidden="true" /></button><button type="button" aria-label="Fotografía siguiente del perfil" onClick={() => move(1)}><ArrowRight size={18} aria-hidden="true" /></button></div></figcaption>
        </figure>
        <div className={styles.thumbnails} role="group" aria-label={`Galería de ${name}`}>
          {story.gallery.map((image, index) => <button key={image.caption} type="button" aria-label={`Ver fotografía ${index + 1}: ${image.caption}`} aria-pressed={photo === index} onClick={() => setPhoto(index)}><span className={styles.thumbImage}><Image src={`${galleryBase}-${index + 1}.webp`} alt="" fill sizes="(max-width: 650px) 28vw, 270px" /></span><span className={styles.thumbCaption}><span>0{index + 1}</span>{image.caption}</span></button>)}
        </div>
      </section>}

    </div>
  </div>;
}
