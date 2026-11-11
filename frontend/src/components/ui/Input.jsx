import { useId } from "react";
import { cn } from "@/lib/cn.js";

/* Field wrapper. The field edge is the only permitted border (designtokens.md 8.4). */
export default function Input({ label, hint, error, className, id, ...rest }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="flex flex-col gap-2">
      {label ? (
        <label htmlFor={inputId} className="text-label font-semibold text-fg">
          {label}
        </label>
      ) : null}

      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "h-[var(--control-md)] w-full rounded-md bg-surface px-3.5 text-base text-fg",
          "ring-1 ring-inset ring-field-edge",
          "placeholder:text-fg-subtle",
          "disabled:pointer-events-none disabled:opacity-40",
          error && "ring-2 ring-danger-fill",
          className,
        )}
        {...rest}
      />

      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-caption text-danger-text">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-caption text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
