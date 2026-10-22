"use client";
import { useState } from "react";
import { ArrowUpRight, MapPin, Navigation } from "lucide-react";
import styles from "./clinic-website.module.css";
export function ClinicLocation({ address }: { address: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={styles.mapCanvas}>
      {loaded && address ? (
        <>
          <iframe
            title="Mapa de ubicación de la veterinaria"
            src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed`}
            referrerPolicy="no-referrer"
            loading="lazy"
            allowFullScreen
          />
          <a
            className={styles.mapExternal}
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir en Google Maps <ArrowUpRight size={16} aria-hidden="true" />
            <span className="sr-only"> (abre otra pestaña)</span>
          </a>
        </>
      ) : (
        <>
          <div className={styles.mapRoads} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className={styles.mapMarker}>
            <MapPin size={30} aria-hidden="true" />
            <strong>
              {address
                ? "Tu próxima visita empieza aquí."
                : "Pronto, más cerca de ti."}
            </strong>
            <p>
              {address || "La dirección de la veterinaria está por confirmar."}
            </p>
            {address ? (
              <button type="button" onClick={() => setLoaded(true)}>
                <Navigation size={16} aria-hidden="true" />
                Explorar mapa
                <ArrowUpRight size={16} aria-hidden="true" />
              </button>
            ) : (
              <span>Ubicación por confirmar</span>
            )}
          </div>
          {address && (
            <p className={styles.mapPrivacy}>
              El mapa de Google se carga cuando eliges explorarlo.
            </p>
          )}
        </>
      )}
    </div>
  );
}
