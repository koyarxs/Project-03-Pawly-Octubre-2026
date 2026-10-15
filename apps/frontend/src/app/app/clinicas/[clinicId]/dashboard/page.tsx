import type { Metadata } from "next";
import { VeterinaryDashboard } from "@/components/workspace/veterinary-dashboard";
export const metadata: Metadata = {
  title: "Dashboard veterinario",
  robots: { index: false, follow: false },
};
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  return <VeterinaryDashboard key={clinicId} clinicId={clinicId} />;
}
