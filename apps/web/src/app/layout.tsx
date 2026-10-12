import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./landing.css";
import "./product-preview.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pawly · Menos gestión. Más cuidado.",
    template: "%s | Pawly",
  },
  description:
    "Conoce Pawly, una plataforma de gestión veterinaria en desarrollo para clínicas y profesionales en Chile. Pacientes, agenda y cuidado conectados.",
  applicationName: "Pawly",
  openGraph: {
    title: "Pawly · Menos gestión. Más cuidado.",
    description:
      "Una nueva visión para organizar tu clínica veterinaria. Explora la propuesta de Pawly y su demostración conceptual.",
    type: "website",
    locale: "es_CL",
    siteName: "Pawly",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pawly · Menos gestión. Más cuidado.",
    description:
      "Plataforma de gestión veterinaria en desarrollo. Diseñada para quienes cuidan.",
  },
  icons: { icon: "/pawly-icon.svg" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
