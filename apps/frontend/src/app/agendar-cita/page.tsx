import type { Metadata } from "next";
import { PublicBookingPage } from "@/components/appointments/public-booking-page";
export const metadata: Metadata = {
  title: "Agendar cita",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <PublicBookingPage />;
}
