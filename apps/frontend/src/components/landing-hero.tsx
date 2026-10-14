import { HeroCarousel } from "@/components/hero-carousel";
import { ProductIntroduction } from "@/components/product-introduction";
import "@/app/hero-reference.css";

export function LandingHero() {
  return (
    <section id="inicio" className="hero hero-reference section-anchor">
      <HeroCarousel />
      <ProductIntroduction />
    </section>
  );
}
