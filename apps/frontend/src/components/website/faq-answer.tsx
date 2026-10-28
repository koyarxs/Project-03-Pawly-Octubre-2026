"use client";

import { Children, cloneElement, isValidElement, useEffect, useState, type ReactNode } from "react";
import styles from "./clinic-faq.module.css";

function answerText(node: ReactNode): string {
  return Children.toArray(node).map(child => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    return isValidElement<{ children?: ReactNode }>(child) ? answerText(child.props.children) : "";
  }).join("");
}

/** Preserve the original links while clipping the visual copy at a character boundary. */
function visibleAnswer(node: ReactNode, remaining: { count: number }): ReactNode {
  return Children.map(node, child => {
    if (remaining.count <= 0) return null;
    if (typeof child === "string" || typeof child === "number") {
      const characters = Array.from(String(child));
      const visible = characters.slice(0, remaining.count).join("");
      remaining.count -= characters.length;
      return visible;
    }
    if (isValidElement<{ children?: ReactNode }>(child)) {
      return cloneElement(child, {}, visibleAnswer(child.props.children, remaining));
    }
    return child;
  });
}

export function FaqAnswer({ children, active }: { children: ReactNode; active: boolean }) {
  const text = answerText(children);
  const characters = Array.from(text);
  const total = characters.length;
  const [count, setCount] = useState(active ? 0 : total);
  const complete = count >= total;

  useEffect(() => {
    if (!active || complete) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timings: number[] = [];
    let duration = 260;
    for (const character of Array.from(text)) {
      duration += /[.!?]/.test(character) ? 160 : /[,;:]/.test(character) ? 90 : 24;
      timings.push(duration);
    }
    const start = performance.now();
    let position = 0;
    const timer = window.setInterval(() => {
      if (preference.matches) position = total;
      else while (position < total && timings[position] <= performance.now() - start) position++;
      setCount(current => Math.max(current, position));
      if (position >= total) window.clearInterval(timer);
    }, 32);
    const reveal = () => { if (preference.matches) { setCount(total); window.clearInterval(timer); } };
    preference.addEventListener("change", reveal);
    return () => { window.clearInterval(timer); preference.removeEventListener("change", reveal); };
  }, [active, complete, text, total]);

  return (
    <div className={styles.answer} data-typing={!complete} onFocusCapture={() => setCount(total)} onPointerDownCapture={() => setCount(total)}>
      <div className={styles.answerCopy}>
        {/* Screen readers receive the complete answer once, never a stream of characters. */}
        <p className={styles.fullAnswer}>{children}</p>
        {!complete && <p className={styles.typedAnswer} aria-hidden="true" inert>{visibleAnswer(children, { count })}<span className={styles.cursor} /></p>}
      </div>
      <div className={styles.answerFooter}>
        <span className={styles.readingLine} aria-hidden="true"><span style={{ transform: `scaleX(${total ? count / total : 1})` }} /></span>
        <button type="button" className={styles.showAnswer} disabled={complete} hidden={complete} onClick={() => setCount(total)}>Ver respuesta completa</button>
      </div>
    </div>
  );
}
