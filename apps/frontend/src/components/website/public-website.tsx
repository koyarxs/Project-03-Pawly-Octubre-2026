"use client";
import { useEffect, useState } from "react";
import { getPublicWebsite, type WebsiteContent } from "@/lib/website";
import { ClinicWebsite } from "./clinic-website";

// Public editorial shell, independent of all saved drafts and clinical data.
const editorialShell: WebsiteContent = {
  clinicName: "Clínica Veterinaria Porvenir",
  tagline: "Cerca de ti. Cerca de quienes quieres.",
  heroTitle: "Su bienestar empieza con una buena decisión.",
  heroDescription:
    "Dale a tu compañero la atención que merece. Contacta a Clínica Veterinaria Porvenir y conversemos sobre cómo cuidar su salud.",
  heroPhotos: ["consultation", "pets", "care"],
  aboutTitle: "",
  aboutText: "",
  phone: "",
  email: "",
  whatsapp: "",
  address: "C. Veinticinco 26, Valparaíso",
  hours: "",
  showServices: false,
  showAbout: false,
  showHours: false,
  services: [],
  testimonials: [],
};

export function PublicWebsite({ initial }: { initial: WebsiteContent | null }) {
  const [content, setContent] = useState(initial);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void getPublicWebsite(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setContent(value.content);
          setUnavailable(false);
        }
      })
      // Retain only the last public response; never fall back to a draft.
      .catch(() => {
        if (!controller.signal.aborted) setUnavailable(true);
      });
    return () => controller.abort();
  }, [initial]);
  return (
    <ClinicWebsite
      content={content ?? editorialShell}
      unpublished={!content}
      availabilityError={unavailable}
    />
  );
}
