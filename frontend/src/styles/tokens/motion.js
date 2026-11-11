import { useReducedMotion } from "motion/react";

// Durations in seconds (Motion's unit). Mirrors --duration-* in semantic.css.
export const duration = {
  instant: 0.09,
  fast: 0.16,
  base: 0.24,
  moderate: 0.36,
  slow: 0.52,
  morph: 0.64,
  stockFlash: 0.9,
};

// Mirrors --ease-* in theme.css.
export const ease = {
  standard: [0.2, 0, 0, 1],
  enter: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
  breathe: [0.65, 0, 0.35, 1],
};

export const spring = {
  snappy: { type: "spring", stiffness: 420, damping: 34, mass: 0.9 },
  organic: { type: "spring", stiffness: 260, damping: 24, mass: 1 },
  gentle: { type: "spring", stiffness: 160, damping: 26, mass: 1.1 },
};

const reduced = { duration: duration.fast, ease: ease.standard };

// Use inside components: respects prefers-reduced-motion automatically.
export function useSpringPreset(name) {
  const reduce = useReducedMotion();
  return reduce ? reduced : spring[name] ?? spring.snappy;
}
