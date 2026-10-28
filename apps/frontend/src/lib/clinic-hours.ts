import type { WebsiteContent } from "./website";

// Matches the example booking schedule in apps/backend/scripts/booking-demo.cjs.
const exampleHours = "Lunes a viernes: 09:00–14:00 y 15:00–19:00\nSábados: 09:00–14:00";

export function clinicHours(content: Pick<WebsiteContent, "showHours" | "hours">): string {
  return content.showHours && content.hours.trim() ? content.hours.trim() : exampleHours;
}
