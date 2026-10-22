import type { Page } from "@playwright/test";
import type { WebsiteContent } from "../../src/lib/website";
export const publicWebsiteFixture: WebsiteContent = {
  clinicName: "Clínica Veterinaria Porvenir",
  tagline: "Sitio de ejemplo para pruebas de interfaz",
  heroTitle: "Cada historia merece cuidado.",
  heroDescription:
    "Contenido completamente ficticio para probar el sitio sin modificar datos de la veterinaria.",
  heroPhotos: ["consultation", "pets", "care"],
  aboutTitle: "Una veterinaria cerca de ti.",
  aboutText:
    "Presentación ficticia de la veterinaria, utilizada únicamente en pruebas de navegador.",
  phone: "+56 9 1234 5678",
  email: "contact@example.invalid",
  whatsapp: "56912345678",
  address: "Dirección de ejemplo 123, Chile",
  hours:
    "Lunes a viernes: horario de ejemplo\nNo corresponde a un horario real.",
  showServices: true,
  showAbout: true,
  showHours: true,
  services: [
    {
      title: "Servicio de ejemplo A",
      description: "Descripción ficticia para comprobar un servicio publicado.",
    },
    {
      title: "Servicio de ejemplo B",
      description:
        "Otra descripción ficticia para revisar la composición de servicios.",
    },
    {
      title: "Servicio de ejemplo C",
      description:
        "Información de prueba sin afirmaciones sobre prestaciones reales.",
    },
  ],
};
export async function mockPublicWebsite(
  page: Page,
  content: WebsiteContent | null = publicWebsiteFixture,
) {
  await page.route("**/api/website", (route) =>
    route.fulfill({
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
      contentType: "application/json",
      body: JSON.stringify({
        content,
        publishedAt: content ? "2026-10-21T12:00:00.000Z" : null,
      }),
    }),
  );
}
