import { useId } from "react";
import { cn } from "@/lib/cn.js";

/* Field wrapper. Fields are borderless: a muted fill carries the shape, so nothing
   on the page draws a line around a control. */
export default function Input({ label, hint, error, className, id, endAdornment, ...rest }) {
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

      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "h-[var(--control-md)] w-full rounded-md bg-muted px-3.5 text-base text-fg",
            "transition-colors duration-[var(--duration-fast)] ease-standard",
            "placeholder:text-fg-subtle",
            "focus:outline-none",
            "disabled:pointer-events-none disabled:opacity-40",
            endAdornment && "pr-12",
            error && "bg-danger-subtle",
            className,
          )}
          {...rest}
        />

        {endAdornment ? (
          <span className="absolute inset-y-0 right-1 flex items-center">{endAdornment}</span>
        ) : null}
      </div>

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
