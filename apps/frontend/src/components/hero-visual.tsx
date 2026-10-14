import Image from "next/image";
import veterinaryCare from "../../public/images/veterinary-care.webp";
import { ProductPreview } from "@/components/product-preview";
import { HeroEntrance } from "@/components/hero-entrance";

export function HeroVisual() {
  return (
    <div className="hero-visual">
      <figure className="hero-photo">
        <Image
          src={veterinaryCare}
          alt="Veterinario junto a un perro en una sala de consulta."
          fill
          preload
          placeholder="blur"
          sizes="(max-width: 899px) 100vw, 78vw"
        />
      </figure>
      <div className="container hero-workspace">
        <HeroEntrance className="hero-interface" delay={0.08}>
          <ProductPreview compact />
        </HeroEntrance>
      </div>
    </div>
  );
}
