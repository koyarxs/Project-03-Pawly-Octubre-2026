import type { Metadata } from "next";
import { WebsiteEditor } from "@/components/website/website-editor";
export const metadata: Metadata = {
  title: "Administrar sitio web",
  robots: { index: false, follow: false },
};
export default async function WebsitePage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  return <WebsiteEditor key={clinicId} clinicId={clinicId} />;
}
