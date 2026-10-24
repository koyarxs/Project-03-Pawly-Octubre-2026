import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import styles from "./brand.module.css";

/** Shared identity for the clinic website and private workspace. */
export function PorvenirLogo({ className }: { className?: string }) {
  return (
    <Image
      src="/images/brand/porvenir-logo.png"
      alt="Clínica Veterinaria Porvenir"
      width={750}
      height={250}
      sizes="(max-width: 767px) 220px, 280px"
      className={cn(styles.logo, className)}
    />
  );
}

/** Separate presentation layers let the wordmark scale without moving the emblem. */
export function PorvenirHeaderLogo({ className }: { className?: string }) {
  return (
    <span className={cn(styles.headerIdentity, className)}>
      <PawlyMark className={styles.headerEmblem} />
      <span className={styles.headerWordmark}>
        <Image
          src="/images/brand/porvenir-logo.png"
          alt="Clínica Veterinaria Porvenir"
          width={750}
          height={250}
          sizes="250px"
          className={styles.wordmarkImage}
        />
      </span>
    </span>
  );
}

/** Compact emblem; keeps the existing shared export compatible. */
export function PawlyMark({ className }: { className?: string }) {
  return (
    <Image
      src="/images/brand/porvenir-emblem.png"
      alt=""
      aria-hidden="true"
      width={48}
      height={48}
      className={cn("size-9 object-contain", className)}
    />
  );
}

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Clínica Veterinaria Porvenir, inicio"
      className={cn("brand", styles.brand, inverse && styles.inverse)}
    >
      <PorvenirLogo />
    </Link>
  );
}
