import Image from "next/image";
import { ArrowUpRight, Heart, MapPin, Navigation } from "lucide-react";
import styles from "./clinic-location.module.css";
export function ClinicLocation({ address }: { address: string }) {
  const inValparaiso = /valpara[ií]so/i.test(address);
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  return (
    <section id="ubicacion" className={styles.section} aria-labelledby="titulo-ubicacion">
    <div className={styles.container}>
      <div className={styles.introduction}>
        <span className={styles.eyebrow}>NUESTRA UBICACIÓN</span>
        <div className={styles.introText}>
          <span className={styles.kicker}>{inValparaiso ? "TE ESPERAMOS EN VALPARAÍSO" : "UN ESPACIO PARA ENCONTRARNOS"}</span>
          <h2 id="titulo-ubicacion">Un lugar pensado<br />para <em>su bienestar.</em></h2>
          <p>{address ? "Encuentra nuestra dirección, revisa cómo llegar y coordina tu próxima visita con el equipo de la veterinaria." : "Estamos preparando la información de ubicación. Publicaremos la dirección cuando esté confirmada."}</p>
          {address && <div className={styles.actions}><a className={styles.mapsButton} href={maps} target="_blank" rel="noopener noreferrer">Ver en Google Maps<ArrowUpRight size={16} aria-hidden="true" /></a><a className={styles.directionButton} href={directions} target="_blank" rel="noopener noreferrer" aria-label="Cómo llegar a la veterinaria"><Navigation size={20} aria-hidden="true" /></a></div>}
          <span className={styles.handwritten}>Cerca de<br />quienes amas. <Heart size={21} strokeWidth={1.3} aria-hidden="true" /></span>
        </div>
        <div className={styles.companions}><Image src="/images/porvenir/location-companions.webp" alt="Imagen ilustrativa generada de un perro y un gato descansando juntos." width={900} height={600} sizes="(max-width:767px) 90vw, 400px" /></div>
      </div>
      <div className={styles.locationContent}>
      <div className={styles.mapCanvas}>
      {address ? <iframe
        title="Mapa de ubicación de la veterinaria"
        src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&hl=es&t=m&z=15&output=embed`}
        referrerPolicy="no-referrer"
        loading="lazy"
        allowFullScreen
      /> : <div className={styles.mapMarker}><MapPin size={30} aria-hidden="true" /><strong>Ubicación por confirmar</strong><p>La dirección de la veterinaria está por confirmar.</p></div>}
      </div>
      </div>
    </div>
    </section>
  );
}
