import Link from "next/link";
import { cn } from "@/lib/utils";

export function PawlyMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={cn("size-9", className)}
    >
      <path
        d="M10 24c0-5 5-10 10-10s10 5 10 10c0 4-3 7-6 7-2 0-3-1-4-1s-2 1-4 1c-3 0-6-3-6-7Z"
        fill="currentColor"
      />
      <ellipse
        cx="8"
        cy="13"
        rx="3.5"
        ry="4.8"
        transform="rotate(-25 8 13)"
        fill="currentColor"
      />
      <ellipse
        cx="17"
        cy="8"
        rx="3.5"
        ry="4.8"
        transform="rotate(-8 17 8)"
        fill="currentColor"
      />
      <ellipse
        cx="26"
        cy="9"
        rx="3.5"
        ry="4.8"
        transform="rotate(16 26 9)"
        fill="currentColor"
      />
      <ellipse
        cx="33"
        cy="16"
        rx="3"
        ry="4.3"
        transform="rotate(30 33 16)"
        fill="currentColor"
      />
      <path
        d="m16 23 3 3 6-6"
        stroke="var(--mark-check, #F7F9F7)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Pawly, inicio"
      className={cn("brand", inverse && "brand-inverse")}
    >
      <PawlyMark />
      <span>
        pawly<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
