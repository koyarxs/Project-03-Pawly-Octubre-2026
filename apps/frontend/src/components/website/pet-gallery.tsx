"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Eye, Heart, PawPrint, ShieldCheck, X } from "lucide-react";
import styles from "./pet-gallery.module.css";

const companions = [
  {
    name: "Perros",
    breed: "Golden retriever",
    image: "dog",
    line: "Amor que siempre sale a tu encuentro.",
    detail:
      "Compañeros de paseos, juegos y de esos días que terminan mejor con una cola moviéndose.",
    variety: "Raza destacada",
    position: "50% 40%",
  },
  {
    name: "Gatos",
    breed: "Persa",
    image: "cat",
    line: "Un pequeño universo de personalidad.",
    detail:
      "Ronroneos, miradas curiosas y una manera muy propia de hacerse parte de la familia.",
    variety: "Raza destacada",
    position: "50% 40%",
  },
  {
    name: "Conejos",
    breed: "Enano · Bélier",
    image: "rabbit",
    line: "Pequeñas orejas, grandes historias.",
    detail:
      "Silenciosos protagonistas que llenan la casa de curiosidad y momentos inesperados.",
    variety: "Razas para conocer",
    position: "50% 50%",
  },
  {
    name: "Cobayos",
    breed: "Americano · Abisinio",
    image: "guinea-pig",
    line: "La ternura también viene en pequeño.",
    detail:
      "Bigotes inquietos y una presencia entrañable: cada compañero tiene su propia forma de conectar.",
    variety: "Razas para conocer",
    position: "50% 50%",
  },
  {
    name: "Aves",
    breed: "Ninfa / carolina",
    image: "cockatiel",
    line: "Una compañía que le pone alas al día.",
    detail:
      "Plumas, sonidos y mucha personalidad para descubrir una forma distinta de compartir la vida.",
    variety: "Especie destacada",
    position: "50% 10%",
  },
] as const;

const personalities = [
  ["Leales y únicos", "Leales", "y cariñosos"],
  ["Independientes y cariñosos", "Curiosos", "a su manera"],
  ["Tiernos y curiosos", "Tiernos", "y observadores"],
  ["Tranquilos y simpáticos", "Pequeños", "con personalidad"],
  ["Inteligentes y sociables", "Curiosas", "y expresivas"],
] as const;

export function PetGallery() {
  const [selected, setSelected] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const photoButton = useRef<HTMLButtonElement>(null);
  const pet = companions[selected];
  const image = selected === 0 ? "/images/porvenir/gallery/gallery-dog-running.webp" : `/images/porvenir/${pet.image}.webp`;
  const portrait = `/images/porvenir/gallery/portrait-${pet.image}.webp`;
  const move = (delta: number) => setSelected((index) => (index + delta + companions.length) % companions.length);
  return (
    <section id="companeros" className={styles.gallery} aria-labelledby="titulo-companeros">
      <div className={styles.headerPhoto} aria-hidden="true">
        <Image src="/images/porvenir/gallery/gallery-header.webp" alt="" fill sizes="(max-width: 767px) 100vw, 60vw" />
      </div>
      <div className={styles.container}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>ELLOS HACEN MÁS GRANDE NUESTRA VIDA</span>
          <h2 id="titulo-companeros">Cinco formas de <em>querer sin medida.</em></h2>
          <p>Distintos tamaños, distintas personalidades.<br />El mismo lugar especial en tu familia.</p>
          <PawPrint className={styles.headingPaw} size={26} aria-hidden="true" />
        </div>
        <div className={styles.choices} role="group" aria-label="Elegir tipo de mascota">
          {companions.map((item, index) => (
            <button key={item.image} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}>
              <Image src={`/images/porvenir/gallery/portrait-${item.image}.webp`} alt="" width={100} height={108} sizes="(max-width: 767px) 64px, 100px" />
              <span className={styles.choiceText}><strong>{item.name}</strong><span>{personalities[index][0]}</span></span>
              <span className={styles.choiceArrow}><ArrowRight size={18} aria-hidden="true" /></span>
            </button>
          ))}
        </div>
        <div className={styles.feature}>
          <div className={styles.photo}>
            <Image key={pet.image} src={image} alt={`Fotografía ilustrativa: ${pet.name.toLowerCase()}.`} fill sizes="(max-width: 767px) 100vw, 58vw" style={{ objectPosition: selected === 0 ? "50% 50%" : pet.position }} />
            <div className={styles.photoOverlay}>
              <span className={styles.photoKicker}>Una vida,<br />una historia.</span>
              <button ref={photoButton} type="button" aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}><span><Eye size={22} aria-hidden="true" /></span>Ver fotografía</button>
            </div>
            <div className={styles.dots} role="group" aria-label="Cambiar fotografía">
              {companions.map((item, index) => <button key={item.image} type="button" aria-label={`Seleccionar ${item.name.toLowerCase()}`} aria-current={selected === index ? "true" : undefined} onClick={() => setSelected(index)}><span /></button>)}
            </div>
          </div>
          <div className={styles.story} aria-live="polite" aria-atomic="true">
            <div className={styles.counter}><span>0{selected + 1} / 05</span><span className={styles.progress}><span style={{ width: `${(selected + 1) * 20}%` }} /></span></div>
            <span className={styles.species}><PawPrint size={24} aria-hidden="true" />{pet.name}</span>
            <h3>{selected === 0 ? <>Amor que <em>siempre</em><br />sale a tu encuentro.</> : pet.line}</h3>
            <p className={styles.detail}>{pet.detail}</p>
            <ul className={styles.traits}>
              <li><Heart aria-hidden="true" /><span><strong>{personalities[selected][1]}</strong>{personalities[selected][2]}</span></li>
              <li><PawPrint aria-hidden="true" /><span><strong>Un vínculo</strong>que nos une</span></li>
              <li><ShieldCheck aria-hidden="true" /><span><strong>Su bienestar</strong>nos importa</span></li>
            </ul>
            <div className={styles.breed}>
              <div><span>{pet.variety}</span><strong>{pet.breed}</strong></div>
              <div className={styles.navigation}>
                <button type="button" aria-label="Mascota anterior" onClick={() => move(-1)}><ArrowLeft size={18} aria-hidden="true" /></button>
                <button type="button" aria-label="Mascota siguiente" onClick={() => move(1)}><ArrowRight size={18} aria-hidden="true" /></button>
              </div>
              <Image src={portrait} alt="" width={90} height={96} sizes="90px" className={styles.breedPortrait} />
            </div>
          </div>
        </div>
        <p className={styles.note}>Galería ilustrativa de especies y razas. Consulta con la clínica la disponibilidad de atención para cada especie.</p>
      </div>
      <dialog ref={dialog} className={styles.dialog} aria-label={`Fotografía de ${pet.name.toLowerCase()}`} onClose={() => photoButton.current?.focus()} onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
        <div className={styles.dialogHeading}><span>{pet.name} · {pet.breed}</span><button type="button" aria-label="Cerrar fotografía" onClick={() => dialog.current?.close()}><X size={22} aria-hidden="true" /></button></div>
        <div className={styles.expandedPhoto}><Image src={image} alt={`Vista ampliada ilustrativa de ${pet.name.toLowerCase()}`} fill sizes="90vw" /></div>
      </dialog>
    </section>
  );
}
