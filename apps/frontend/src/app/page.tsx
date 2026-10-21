import type { Metadata } from "next";
import { MarketingLanding } from "@/components/marketing/marketing-landing";

export const metadata: Metadata = {
  title: { absolute: "Pawly · Tu clínica conectada. Más tiempo para cuidar." },
  description:
    "Conecta pacientes, tutores, agenda, consultas e historia clínica con Pawly. Software veterinario para clínicas en Chile, en desarrollo.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Pawly · Tu clínica conectada. Más tiempo para cuidar.",
    description:
      "De la primera cita a la historia de cada paciente. Conoce el espacio de gestión veterinaria que estamos construyendo para clínicas en Chile.",
    type: "website",
    locale: "es_CL",
    siteName: "Pawly",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pawly · Tu clínica conectada. Más tiempo para cuidar.",
    description:
      "Pacientes, agenda y atención clínica en un mismo espacio. Una plataforma veterinaria en desarrollo para Chile.",
  },
};

export default function Home() {
  return <MarketingLanding />;
}
