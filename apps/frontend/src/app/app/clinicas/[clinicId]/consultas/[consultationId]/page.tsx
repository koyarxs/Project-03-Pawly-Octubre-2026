import type { Metadata } from "next";
import { ConsultationPage } from "@/components/consultations/consultation-page";
export const metadata: Metadata = {
  title: "Consultas | Pawly Workspace",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ clinicId: string; consultationId: string }>;
}) {
  const { clinicId, consultationId } = await params;
  return (
    <ConsultationPage
      key={`${clinicId}:${consultationId}`}
      clinicId={clinicId}
      id={consultationId}
    />
  );
}
