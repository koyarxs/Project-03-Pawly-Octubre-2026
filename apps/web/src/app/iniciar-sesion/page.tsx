import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, LockKeyhole } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Acceso próximamente",
  robots: { index: false, follow: true },
};

export default function SignInInformation() {
  return (
    <main className="access-page">
      <div className="container">
        <Brand />
        <div className="access-content">
          <span className="access-icon">
            <LockKeyhole size={32} strokeWidth={1.5} />
          </span>
          <span className="eyebrow">ESPACIO PRIVADO PAWLY</span>
          <h1>
            Tu próxima forma
            <br />
            de trabajar.
          </h1>
          <p>
            El acceso al sistema veterinario estará disponible próximamente. La
            autenticación y los módulos de gestión aún están en desarrollo.
          </p>
          <p className="access-note">
            Esta pantalla es informativa. No permite iniciar sesión ni crear
            cuentas.
          </p>
          <div className="access-actions">
            <Button asChild>
              <Link href="/#contacto">
                Me interesa conocer Pawly <ArrowUpRight />
              </Link>
            </Button>
            <Link href="/" className="text-action">
              <ArrowLeft size={16} /> Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
