import type { Metadata } from "next";
import { ActivateStaff } from "@/components/staff/activate-staff";
export const metadata: Metadata = {
  title: "Activar acceso al equipo",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return <ActivateStaff />;
}
