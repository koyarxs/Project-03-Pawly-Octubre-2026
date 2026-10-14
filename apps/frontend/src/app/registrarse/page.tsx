import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
export const metadata: Metadata = {
  title: "Registrar mi clínica",
  robots: { index: false, follow: false },
};
export default function RegistrationPage() {
  return (
    <AuthShell>
      <AuthForm mode="register" />
    </AuthShell>
  );
}
