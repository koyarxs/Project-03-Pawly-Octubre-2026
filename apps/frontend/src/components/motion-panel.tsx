"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function MotionPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={false}
      whileInView={reduced ? undefined : { y: [8, 0] }}
      viewport={{ once: true, amount: 0.25 }}
      whileHover={reduced ? undefined : { y: -4 }}
      transition={{ duration: reduced ? 0 : 0.25, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
