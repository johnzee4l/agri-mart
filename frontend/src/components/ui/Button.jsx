import { m } from "motion/react";
import { CircleNotch } from "@phosphor-icons/react";
import { cn } from "@/lib/cn.js";
import { useSpringPreset } from "@/styles/tokens/motion.js";

/* The only button import point (designtokens.md 11.2). */
const variants = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed",
  accent: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "bg-primary-subtle text-primary-text hover:bg-primary-subtle/70",
  ghost: "bg-transparent text-fg hover:bg-muted",
  danger: "bg-danger-fill text-on-danger hover:bg-danger-hover",
};

const sizes = {
  md: "h-[var(--control-md)] px-5",
  sm: "h-[var(--control-sm)] px-4 text-caption",
  lg: "h-[var(--control-lg)] px-6",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...rest
}) {
  const press = useSpringPreset("snappy");

  return (
    <m.button
      whileTap={{ scale: 0.98 }}
      transition={press}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-sans text-label font-semibold",
        "transition-colors duration-[var(--duration-fast)] ease-standard",
        "disabled:pointer-events-none disabled:opacity-40",
        sizes[size],
        variants[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <CircleNotch size={20} weight="bold" className="animate-spin" aria-hidden="true" /> : children}
    </m.button>
  );
}
