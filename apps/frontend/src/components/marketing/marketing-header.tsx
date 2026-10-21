"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "@/components/brand";
import styles from "./marketing.module.css";

const links = [
  ["La plataforma", "#plataforma"],
  ["Funcionalidades", "#funcionalidades"],
  ["Cómo funciona", "#como-funciona"],
  ["Preguntas", "#preguntas"],
] as const;

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    const query = window.matchMedia("(min-width: 1080px)");
    const onDesktop = () => {
      if (query.matches) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    query.addEventListener("change", onDesktop);
    return () => {
      document.removeEventListener("keydown", onKey);
      query.removeEventListener("change", onDesktop);
    };
  }, [open]);

  return (
    <header
      className={styles.header}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setOpen(false);
      }}
    >
      <div className={`${styles.container} ${styles.headerInner}`}>
        <div className={styles.logo}>
          <Brand />
        </div>
        <nav className={styles.desktopNav} aria-label="Navegación principal">
          {links.map(([label, href]) => (
            <a key={href} href={href}>
              {label}
            </a>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <Link className={styles.login} href="/iniciar-sesion">
            Iniciar sesión
          </Link>
          <Link className={styles.smallButton} href="/registrarse">
            Crear cuenta <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <button
          className={styles.menuTrigger}
          ref={trigger}
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="marketing-mobile-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <X size={22} aria-hidden="true" />
          ) : (
            <Menu size={22} aria-hidden="true" />
          )}
        </button>
      </div>
      <nav
        id="marketing-mobile-navigation"
        className={styles.mobileNav}
        aria-label="Navegación móvil"
        hidden={!open}
      >
        {links.map(([label, href]) => (
          <a key={href} href={href} onClick={() => setOpen(false)}>
            {label}
            <ArrowUpRight size={17} aria-hidden="true" />
          </a>
        ))}
        <Link href="/iniciar-sesion" onClick={() => setOpen(false)}>
          Iniciar sesión
        </Link>
        <Link
          className={styles.mobileSignup}
          href="/registrarse"
          onClick={() => setOpen(false)}
        >
          Crear cuenta <ArrowUpRight size={17} aria-hidden="true" />
        </Link>
      </nav>
    </header>
  );
}
