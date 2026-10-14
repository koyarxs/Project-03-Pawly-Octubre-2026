"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function HeroEntrance({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={reduced ? undefined : { opacity: [0.85, 1], y: [8, 0] }}
      viewport={{ once: true }}
      transition={{
        duration: reduced ? 0 : 0.4,
        delay: reduced ? 0 : delay,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}
