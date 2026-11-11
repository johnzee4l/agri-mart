import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/cn.js";

/* Centred dialog. Base UI supplies the behaviour the design system requires:
   focus trap, Escape, outside press, focus restore and aria labelling.
   The visual layer is tokens only (designtokens.md 8, 11). */
export default function Dialog({ open, onClose, title, children, className, ...rest }) {
  return (
    <BaseDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose?.();
      }}
    >
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--overlay)]" />
        <BaseDialog.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-[var(--z-sheet)] w-[calc(100%-2rem)] max-w-[35rem]",
            "-translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-6 shadow-float",
            className,
          )}
          {...rest}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <BaseDialog.Title className="text-heading-sm text-fg">{title}</BaseDialog.Title>
            <BaseDialog.Close
              aria-label="Close dialog"
              className="rounded-full p-2 text-fg-muted hover:bg-muted"
            >
              <X size={20} aria-hidden="true" />
            </BaseDialog.Close>
          </div>
          {children}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
