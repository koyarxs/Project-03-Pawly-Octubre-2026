import type { Metadata } from "next";
import { ClinicalPage } from "@/components/clinical/clinical-page";
export const metadata: Metadata = {
  title: "Tutores | Pawly Workspace",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ clinicId: string; recordId: string }>;
}) {
  const { clinicId, recordId } = await params;
  return (
    <ClinicalPage
      key={clinicId + recordId}
      clinicId={clinicId}
      kind="tutores"
      view="detail"
      id={recordId}
    />
  );
}
