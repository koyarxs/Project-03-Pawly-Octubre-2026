"use client";
import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Heart, PawPrint } from "lucide-react";
import styles from "./clinic-website.module.css";

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

export function PetGallery() {
  const [selected, setSelected] = useState(0);
  const pet = companions[selected];
  const move = (delta: number) =>
    setSelected(
      (index) => (index + delta + companions.length) % companions.length,
    );
  return (
    <section
      id="companeros"
      className={styles.companions}
      aria-labelledby="titulo-companeros"
    >
      <div className={styles.container}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>
              ELLOS HACEN MÁS GRANDE NUESTRA VIDA
            </span>
            <h2 id="titulo-companeros">
              Cinco formas de <em>querer sin medida.</em>
            </h2>
          </div>
          <p>
            Distintos tamaños, distintas personalidades. El mismo lugar especial
            en tu familia.
          </p>
        </div>
        <div
          className={styles.petChoices}
          role="group"
          aria-label="Elegir tipo de mascota"
        >
          {companions.map((item, index) => (
            <button
              key={item.image}
              type="button"
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
            >
              <Image
                src={`/images/porvenir/${item.image}.webp`}
                alt=""
                width={56}
                height={56}
                sizes="56px"
              />
              <span>{item.name}</span>
              <span className={styles.petChoiceNumber}>0{index + 1}</span>
            </button>
          ))}
        </div>
        <div className={styles.petFeature}>
          <div className={styles.petPhoto} key={pet.image}>
            <Image
              src={`/images/porvenir/${pet.image}.webp`}
              alt={`Fotografía ilustrativa: ${pet.name.toLowerCase()}.`}
              fill
              sizes="(max-width:767px) 90vw, 48vw"
              style={{ objectPosition: pet.position }}
            />
            <span>
              <PawPrint size={18} aria-hidden="true" /> Una vida, una historia.
            </span>
          </div>
          <div
            className={styles.petStory}
            aria-live="polite"
            aria-atomic="true"
          >
            <span className={styles.petCounter}>
              COMPAÑEROS DE VIDA <span>0{selected + 1} / 05</span>
            </span>
            <span className={styles.petSpecies}>{pet.name}</span>
            <h3>{pet.line}</h3>
            <p>{pet.detail}</p>
            <div className={styles.breed}>
              <span>{pet.variety}</span>
              <strong>{pet.breed}</strong>
            </div>
            <div className={styles.petBottom}>
              <span>
                <Heart size={17} aria-hidden="true" /> Cada compañero es único.
              </span>
              <div>
                <button
                  type="button"
                  aria-label="Mascota anterior"
                  onClick={() => move(-1)}
                >
                  <ArrowLeft size={20} />
                </button>
                <button
                  type="button"
                  aria-label="Mascota siguiente"
                  onClick={() => move(1)}
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
        <p className={styles.editorialNote}>
          Galería ilustrativa de especies y razas. Consulta con la clínica la
          disponibilidad de atención para cada especie.
        </p>
      </div>
    </section>
  );
}
