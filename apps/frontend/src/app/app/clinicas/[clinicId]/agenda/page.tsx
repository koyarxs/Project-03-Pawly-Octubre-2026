import type { Metadata } from "next";
import { AppointmentPage } from "@/components/appointments/appointment-page";
export const metadata: Metadata = {
  title: "Agenda | Pawly Workspace",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  return <AppointmentPage key={clinicId} clinicId={clinicId} />;
}
