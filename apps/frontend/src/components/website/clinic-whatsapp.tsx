import styles from "./clinic-whatsapp.module.css";

// Temporary landing contact, independent of the clinic's saved settings.
const clinicWhatsAppMessage = "Hola, Clínica Veterinaria Porvenir. Me gustaría recibir información sobre sus servicios y la disponibilidad para agendar una cita. Muchas gracias.";
export const clinicWhatsAppUrl = `https://wa.me/56982100670?text=${encodeURIComponent(clinicWhatsAppMessage)}`;
export const clinicWhatsAppNumber = "+56 9 8210 0670";

export function WhatsAppIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 11.6a8.5 8.5 0 0 1-12.7 7.5L3 20.5l1.4-4.7a8.5 8.5 0 1 1 16.1-4.2Z" />
      <path d="m8.1 7.2 1.5-.2 1.1 2.5-1.1 1.1a8 8 0 0 0 3.7 3.7l1.1-1.1 2.5 1.1-.2 1.5c-.2 1-1.3 1.4-2.2 1.1-4.2-1.2-7.1-4.1-8.3-8.3-.3-.9.1-2 1.1-2.2" transform="translate(1 0) scale(.9)" />
    </svg>
  );
}

export function ClinicWhatsApp() {
  return (
    <a className={styles.floating} href={clinicWhatsAppUrl} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp al ${clinicWhatsAppNumber} (abre otra pestaña)`}>
      <WhatsAppIcon size={28} />
      <span>WhatsApp</span>
    </a>
  );
}
