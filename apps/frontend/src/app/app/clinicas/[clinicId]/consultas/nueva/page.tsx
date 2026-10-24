import type { Metadata } from "next";
import { ConsultationPage } from "@/components/consultations/consultation-page";
export const metadata: Metadata = {
  title: "Consultas | Pawly Workspace",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ clinicId: string }>;
  searchParams: Promise<{ patientId?: string; appointmentId?: string }>;
}) {
  const { clinicId } = await params;
  const { patientId, appointmentId } = await searchParams;
  return (
    <ConsultationPage
      key={`${clinicId}:${patientId}:${appointmentId}`}
      clinicId={clinicId}
      newRecord
      patientId={typeof patientId === "string" ? patientId : undefined}
      appointmentId={
        typeof appointmentId === "string" ? appointmentId : undefined
      }
    />
  );
}
