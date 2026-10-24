import type { Metadata } from "next";
import { MyProfilePage } from "@/components/staff/my-profile-page";
export const metadata: Metadata = {
  title: "Mi perfil público",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ clinicId: string }>;
}) {
  const { clinicId } = await params;
  return <MyProfilePage clinicId={clinicId} />;
}
