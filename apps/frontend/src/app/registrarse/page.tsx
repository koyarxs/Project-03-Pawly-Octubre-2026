import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { StaffRegistration } from "@/components/auth/staff-registration";
export const metadata: Metadata = {
  title: "Registro de usuarios · Porvenir",
  robots: { index: false, follow: false },
};
export default function RegistrationPage() {
  return (
    <AuthShell>
      <StaffRegistration />
    </AuthShell>
  );
}
