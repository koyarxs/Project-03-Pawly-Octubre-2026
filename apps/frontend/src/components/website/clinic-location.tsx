import { ArrowUpRight, MapPin, Navigation } from "lucide-react";
import styles from "./clinic-location.module.css";

export function ClinicLocation({ address }: { address: string }) {
  const confirmedAddress = address.trim();
  const inValparaiso = /valpara[ií]so/i.test(confirmedAddress);
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(confirmedAddress)}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(confirmedAddress)}`;

  return (
    <section id="ubicacion" className={styles.section} aria-labelledby="titulo-ubicacion">
      <div className={styles.container}>
        <div className={styles.heading}>
          <div>
            <span className={styles.eyebrow}>NUESTRA UBICACIÓN</span>
            <h2 id="titulo-ubicacion">El cuidado tiene<br /><em>un lugar.</em></h2>
          </div>
          <p>{confirmedAddress ? "Un espacio para escucharte y acompañar a tu compañero. Encuentra la clínica y prepara tu próxima visita." : "Pronto compartiremos nuestra dirección para que puedas preparar tu próxima visita."}</p>
        </div>

        <div className={styles.location}>
          <div className={styles.details}>
            <span className={styles.marker} aria-hidden="true"><MapPin size={27} strokeWidth={1.3} /></span>
            <div className={styles.addressBlock}>
              <span className={styles.city}>{inValparaiso ? "VALPARAÍSO, CHILE" : "ENCUÉNTRANOS"}</span>
              <h3>Clínica Veterinaria<br />Porvenir</h3>
              {confirmedAddress ? <address>{confirmedAddress}</address> : <p className={styles.pending}>Ubicación por confirmar</p>}
            </div>
            {confirmedAddress && (
              <div className={styles.actions}>
                <a className={styles.directions} href={directions} target="_blank" rel="noopener noreferrer" aria-label="Cómo llegar a la veterinaria"><Navigation size={18} aria-hidden="true" /> Cómo llegar <ArrowUpRight size={18} aria-hidden="true" /></a>
                <a className={styles.mapsLink} href={maps} target="_blank" rel="noopener noreferrer">Ver en Google Maps <ArrowUpRight size={16} aria-hidden="true" /></a>
              </div>
            )}
            <p className={styles.note}>{confirmedAddress ? "Revisa el recorrido antes de salir y llega con tiempo para su atención." : "Publicaremos la dirección cuando esté confirmada."}</p>
          </div>
          <div className={styles.mapCanvas}>
            {confirmedAddress ? (
              <iframe title="Mapa de ubicación de la veterinaria" src={`https://maps.google.com/maps?q=${encodeURIComponent(confirmedAddress)}&hl=es&t=m&z=15&output=embed`} referrerPolicy="no-referrer" loading="lazy" allowFullScreen />
            ) : (
              <div className={styles.mapPending}><MapPin size={32} strokeWidth={1.3} aria-hidden="true" /><strong>Ubicación por confirmar</strong><p>La dirección de la veterinaria estará disponible aquí.</p></div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
