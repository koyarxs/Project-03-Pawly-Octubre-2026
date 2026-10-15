import type { Metadata } from "next";
import { ClinicalPage } from "@/components/clinical/clinical-page";
export const metadata: Metadata = {
  title: "Pacientes | Pawly Workspace",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  return (
    <ClinicalPage
      key={clinicId}
      clinicId={clinicId}
      kind="pacientes"
      view="list"
    />
  );
}
