import type { Metadata } from "next";
import { StaffPage } from "@/components/staff/staff-page";
export const metadata: Metadata = {
  title: "Personal y Accesos",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  return <StaffPage clinicId={clinicId} />;
}
