import {
  Activity, Bandage, HeartPulse, Microscope, ScanLine,
  ShieldPlus, Sparkles, Stethoscope, Syringe, Waves,
} from "lucide-react";

function visual(name: string) {
  const value = name.toLocaleLowerCase("es");
  if (value.includes("vacun")) return { Icon: Syringe, tone: "lilac", detail: "Protección para cada etapa de su vida." };
  if (value.includes("desparas")) return { Icon: ShieldPlus, tone: "mint", detail: "Prevención que cuida su bienestar." };
  if (value.includes("dermat")) return { Icon: Sparkles, tone: "peach", detail: "Cuidado de su piel y su pelaje." };
  if (value.includes("laboratorio")) return { Icon: Microscope, tone: "blue", detail: "Información para orientar su atención." };
  if (value.includes("ecograf")) return { Icon: Waves, tone: "lilac", detail: "Una mirada más cercana a su salud." };
  if (value.includes("radiograf")) return { Icon: ScanLine, tone: "blue", detail: "Imágenes que ayudan al diagnóstico." };
  if (value.includes("postoperator")) return { Icon: Bandage, tone: "peach", detail: "Acompañamos su recuperación." };
  if (value.includes("cirug") || value.includes("procedimiento")) return { Icon: Activity, tone: "peach", detail: "Evaluación y preparación para su cuidado." };
  if (value.includes("control")) return { Icon: HeartPulse, tone: "mint", detail: "Seguimiento para seguir cuidándolo." };
  return { Icon: Stethoscope, tone: "mint", detail: "Un espacio para conocer cómo se siente." };
}

export function ServiceVisual({ name, className }: { name: string; className?: string }) {
  const { Icon, tone } = visual(name);
  return <span className={className} data-tone={tone} aria-hidden="true"><Icon size={25} strokeWidth={1.65} /></span>;
}

export function serviceCaption(name: string) {
  return visual(name).detail;
}
