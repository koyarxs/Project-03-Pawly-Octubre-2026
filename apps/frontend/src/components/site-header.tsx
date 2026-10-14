"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Menu,
  X,
  House,
  LayoutGrid,
  Layers,
  Tag,
  Users,
  Mail,
  BookOpen,
  Headphones,
  UserRound,
  Play,
  CalendarCheck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

export const navigation = [
  ["Inicio", "#inicio"],
  ["Funcionalidades", "#funcionalidades"],
  ["Soluciones", "#soluciones"],
  ["Precios", "#precios"],
  ["Nosotros", "#nosotros"],
  ["Contacto", "#contacto"],
] as const;
const navigationIcons = [House, LayoutGrid, Layers, Tag, Users, Mail] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("#inicio");
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(`#${visible[0].target.id}`);
      },
      { rootMargin: "-10% 0px -65% 0px", threshold: 0 },
    );
    for (const [, href] of navigation) {
      const section = document.getElementById(href.slice(1));
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    const onResize = () => {
      if (window.innerWidth >= 1100) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className="site-header reference-header">
      <div className="announcement-bar">
        <p>
          Pawly está en desarrollo. Estamos creando una nueva forma de conectar
          la gestión y el cuidado veterinario.{" "}
          <a href="#contacto">
            Conoce nuestra propuesta{" "}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </p>
      </div>
      <div className="container header-inner">
        <div className="header-context">
          <span>Gestión veterinaria, con más claridad.</span>
          <a href="#soluciones">Para clínicas y profesionales en Chile</a>
        </div>
        <Brand />
        <div className="header-utility">
          <a href="#nosotros">
            <BookOpen size={15} aria-hidden="true" />
            Conoce Pawly
          </a>
          <a href="#contacto">
            <Headphones size={15} aria-hidden="true" />
            Contacto
          </a>
          <Link className="login-link" href="/iniciar-sesion">
            <UserRound size={15} aria-hidden="true" /> Iniciar sesión
          </Link>
        </div>
        <button
          ref={trigger}
          className="menu-trigger"
          type="button"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      <div className="header-navigation-row">
        <div className="container header-navigation-inner">
          <nav aria-label="Navegación principal" className="desktop-nav">
            {navigation.map(([label, href], index) => {
              const Icon = navigationIcons[index];
              return (
                <a
                  key={href}
                  href={href}
                  aria-current={active === href ? "location" : undefined}
                  onClick={() => setActive(href)}
                >
                  <Icon size={17} aria-hidden="true" />
                  {label}
                </a>
              );
            })}
          </nav>
          <div className="header-actions">
            <a className="header-demo-preview" href="#demostracion">
              <Play size={15} aria-hidden="true" /> Explorar demo
            </a>
            <Button asChild size="lg">
              <a href="#contacto">
                <CalendarCheck size={17} aria-hidden="true" /> Solicitar demo{" "}
                <ArrowUpRight aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
      </div>
      <nav
        id="mobile-navigation"
        aria-label="Navegación móvil"
        className="mobile-nav"
        hidden={!open}
      >
        {navigation.map(([label, href], index) => {
          const Icon = navigationIcons[index];
          return (
            <a
              key={href}
              href={href}
              aria-current={active === href ? "location" : undefined}
              onClick={() => {
                setActive(href);
                setOpen(false);
              }}
            >
              <span className="mobile-nav-label">
                <Icon size={18} aria-hidden="true" />
                {label}
              </span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          );
        })}
        <Link href="/iniciar-sesion" onClick={() => setOpen(false)}>
          Iniciar sesión <span>Próximamente</span>
        </Link>
        <a
          className="mobile-demo-link"
          href="#contacto"
          onClick={() => setOpen(false)}
        >
          Solicitar demo <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </nav>
    </header>
  );
}
